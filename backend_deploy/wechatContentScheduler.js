// ============================================================================
// 言道国学 - 公众号内容调度器（指令书第七十三~七十八章）
// 用法（cron 持久调度，非 setInterval——第七十五章）：
//   node wechatContentScheduler.js --stage=topics     06:40 生成选题
//   node wechatContentScheduler.js --stage=pick        06:50 选TOP8（已并入topics）
//   node wechatContentScheduler.js --stage=generate    07:00 生成文章
//   node wechatContentScheduler.js --stage=safety      07:30 Safety复检+同步草稿
//   node wechatContentScheduler.js --stage=notify      07:50 审核提醒
//   node wechatContentScheduler.js --stage=full        全链路（手动）
// 每阶段写 wechat_content_jobs（幂等：同日同stage成功则跳过）
// 邮件提醒：复用已配置的腾讯 SES（wuzhimin666@163.com，第七十章）
// ============================================================================
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { getDb } = require('./wechatOaDb');
const contentEngine = require('./wechatContentEngine');

function now8601() { return new Date(Date.now() + 8 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19); }
function today() { return now8601().slice(0, 10); }

function startJob(stage) {
  const r = getDb().prepare(`INSERT INTO wechat_content_jobs(run_date, stage, status, started_at) VALUES(?, ?, 'RUNNING', datetime('now','localtime'))`).run(today(), stage);
  return r.lastInsertRowid;
}
function finishJob(jobId, error) {
  getDb().prepare(`UPDATE wechat_content_jobs SET status = ?, finished_at = datetime('now','localtime'), error = ? WHERE job_id = ?`)
    .run(error ? 'FAILED' : 'SUCCESS', error ? String(error).slice(0, 500) : '', jobId);
}
function alreadySucceeded(stage) {
  const row = getDb().prepare("SELECT COUNT(*) AS n FROM wechat_content_jobs WHERE run_date = ? AND stage = ? AND status = 'SUCCESS'").get(today(), stage);
  return row.n > 0;
}

async function stageTopics() {
  const r = contentEngine.generateTopics(today());
  return `选题 ${r.total} 条（TOP ${contentEngine.settings().topicTopN}）`;
}

async function stageGenerate() {
  const s = contentEngine.settings();
  if (s.automation !== 'ON') return `自动化开关为 ${s.automation}，跳过`;
  const approved = contentEngine.listTopics(today()).filter((t) => t.status === 'APPROVED');
  const results = [];
  for (const t of approved.slice(0, s.dailyArticleLimit)) {
    try { results.push(await contentEngine.generateArticle(t.topic_id)); } catch (e) { results.push({ error: e.message }); }
  }
  return `生成 ${results.length} 篇（限额 ${s.dailyArticleLimit}）`;
}

async function stageSafetySync() {
  const s = contentEngine.settings();
  const db = getDb();
  const rows = db.prepare("SELECT article_id, title, digest, content_html, safety_status, status FROM wechat_articles WHERE created_at >= date('now','localtime') AND status IN ('LOCAL_DRAFT','SAFETY_PASSED','DUPLICATE')").all();
  let passed = 0, blocked = 0;
  for (const row of rows) {
    const text = `${row.title} ${row.digest} ${String(row.content_html).replace(/<[^>]+>/g, ' ')}`;
    const safety = contentEngine.safetyGate(text);
    if (safety.pass && row.safety_status !== 'PASS') {
      db.prepare("UPDATE wechat_articles SET safety_status = 'PASS', safety_reasons = '[]', status = 'SAFETY_PASSED', updated_at = datetime('now','localtime') WHERE article_id = ?").run(row.article_id);
    } else if (!safety.pass) {
      db.prepare("UPDATE wechat_articles SET safety_status = 'BLOCKED', safety_reasons = ?, status = 'RISK_BLOCKED', updated_at = datetime('now','localtime') WHERE article_id = ?").run(JSON.stringify(safety.reasons), row.article_id);
      blocked++;
    }
    if (safety.pass) passed++;
  }
  // 草稿同步（WECHAT_DRAFT_SYNC=ON 且凭据已配置时才尝试；失败不阻断）
  let synced = 0, syncNote = '未启用';
  if (s.draftSync === 'ON' && process.env.WECHAT_OA_APP_SECRET) {
    const tokenManager = require('./wechatTokenManager');
    if (tokenManager.isConfigured()) {
      const draftService = require('./wechatDraftService');
      const fs = require('fs');
      const pending = db.prepare("SELECT article_id FROM wechat_articles WHERE created_at >= date('now','localtime') AND status = 'SAFETY_PASSED' AND wechat_media_id = ''").all();
      for (const p of pending) {
        try {
          const { createRouter } = {}; // 不走HTTP，直接内部调用
          await syncOne(db, draftService, fs, p.article_id);
          synced++;
        } catch (e) { syncNote = `部分失败: ${String(e.message).slice(0, 80)}`; break; }
      }
    } else {
      syncNote = 'AppSecret未配置';
    }
  }
  return `Safety ${passed}过/${blocked}拦截；草稿同步 ${synced} 篇（${syncNote}）`;
}

async function syncOne(db, draftService, fs, articleId) {
  const { getSetting, setSetting } = require('./wechatOaDb');
  const row = db.prepare('SELECT * FROM wechat_articles WHERE article_id = ?').get(articleId);
  if (!row) return;
  let thumbMediaId = getSetting('wechat_cover_media_id', '');
  if (!thumbMediaId) {
    const coverPath = process.env.WECHAT_OA_COVER_PATH || path.join(__dirname, 'data', 'wechat-cover.png');
    if (!fs.existsSync(coverPath)) throw new Error('封面图缺失');
    thumbMediaId = await draftService.uploadCoverImage(coverPath);
    setSetting('wechat_cover_media_id', thumbMediaId, 'system');
  }
  const created = await draftService.createDraft({
    title: row.title, author: row.author || '言道国学', digest: row.digest || '',
    content: row.content_html, thumb_media_id: thumbMediaId, need_open_comment: 0, only_fans_can_comment: 0,
  });
  db.prepare("UPDATE wechat_articles SET wechat_media_id = ?, status = 'WECHAT_DRAFT', updated_at = datetime('now','localtime') WHERE article_id = ?").run(created.media_id, articleId);
}

// 第七十~七十二章：审核提醒（站内计数 + 邮件）
async function stageNotify() {
  const db = getDb();
  const stats = contentEngine.dashboardStats();
  const todayArticles = stats.todayArticles;
  const syncedToday = db.prepare("SELECT COUNT(*) AS n FROM wechat_articles WHERE status = 'WECHAT_DRAFT' AND updated_at >= date('now','localtime')").get().n;
  const riskToday = db.prepare("SELECT COUNT(*) AS n FROM wechat_articles WHERE status = 'RISK_BLOCKED' AND created_at >= date('now','localtime')").get().n;
  const subject = '言道国学公众号内容任务完成提醒';
  const text = `言道国学公众号内容任务已完成：\n今日生成 ${todayArticles} 篇，${syncedToday} 篇已同步微信草稿，${riskToday} 篇因内容风险进入人工审核。\n请登录言道国学后台（/admin/wechat-oa）检查。`;
  let emailed = false;
  try {
    emailed = await sendNotifyEmail(subject, text);
  } catch { }
  console.log(text + (emailed ? '\n邮件提醒已发送。' : '\n邮件未发送（站内红点已就绪）。'));
  return text;
}

async function sendNotifyEmail(subject, text) {
  const secretId = process.env.TENCENT_SES_SECRET_ID;
  const secretKey = process.env.TENCENT_SES_SECRET_KEY;
  const from = process.env.TENCENT_SES_FROM_EMAIL;
  const templateId = process.env.TENCENT_SES_TEMPLATE_ID;
  if (!secretId || !secretKey || !from || !templateId) return false;
  const tencentcloud = require('tencentcloud-sdk-nodejs-ses');
  const client = new tencentcloud.ses.v20201002.Client({
    credential: { secretId, secretKey },
    region: 'ap-hongkong', // 腾讯云SES仅支持香港区域（与emailService.js一致）
    profile: { httpProfile: { endpoint: 'ses.tencentcloudapi.com' } },
  });
  await client.SendEmail({
    FromEmailAddress: from,
    Destination: ['wuzhimin666@163.com'],
    Subject: subject,
    Template: { TemplateID: Number(templateId), TemplateData: JSON.stringify({ content: text.replace(/\n/g, '<br/>') }) },
  });
  return true;
}

async function main() {
  const arg = process.argv.find((a) => a.startsWith('--stage='));
  const stage = arg ? arg.split('=')[1] : 'full';
  const stages = stage === 'full' ? ['topics', 'generate', 'safety', 'notify'] : [stage];
  for (const st of stages) {
    if (st !== 'notify' && alreadySucceeded(st)) { console.log(`[${st}] 今日已成功，幂等跳过`); continue; }
    const jobId = startJob(st);
    try {
      let msg = '';
      if (st === 'topics') msg = await stageTopics();
      else if (st === 'generate') msg = await stageGenerate();
      else if (st === 'safety') msg = await stageSafetySync();
      else if (st === 'notify') msg = await stageNotify();
      else throw new Error(`未知stage: ${st}`);
      finishJob(jobId);
      console.log(`[${st}] SUCCESS: ${msg}`);
    } catch (e) {
      finishJob(jobId, e.message);
      console.error(`[${st}] FAILED: ${e.message}`);
      process.exitCode = 1;
    }
  }
}

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { stageTopics, stageGenerate, stageSafetySync, stageNotify };
