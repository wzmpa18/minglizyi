// ============================================================================
// 言道国学 - 公众号内容调度器（指令书第七十三~七十八章 / FINAL-17 第十六~二十章）
// 批次规则：每月最多4个内容生产批次（1/8/15/22），每批最多5篇候选草稿，
//           AUTO_PUBLISH 恒 false，待审草稿≥5 暂停AI正文生成。
// cron 调度（每月批次日执行，非每日）：
//   40 6 1,8,15,22 * * node wechatContentScheduler.js --stage=topics     批次日06:40 生成选题+质量门禁自动批准
//   0  7 1,8,15,22 * * node wechatContentScheduler.js --stage=generate   批次日07:00 生成文章（≤5篇，质量优先）
//   30 7 1,8,15,22 * * node wechatContentScheduler.js --stage=safety     批次日07:30 Safety复检+同步草稿
//   50 7 1,8,15,22 * * node wechatContentScheduler.js --stage=notify     批次日07:50 审核提醒
//   node wechatContentScheduler.js --stage=full --force                  全链路手动（--force 跳过批次日门禁）
// 每阶段写 wechat_content_jobs（幂等：同日同stage成功则跳过）
// 邮件提醒：复用已配置的腾讯 SES（wuzhimin666@163.com，第七十章）
// ============================================================================
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { getDb } = require('./wechatOaDb');
const contentEngine = require('./wechatContentEngine');

function now8601() { return new Date(Date.now() + 8 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19); }
function today() { return now8601().slice(0, 10); }
const FORCED = process.argv.includes('--force');

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
// 批次日门禁（--force 可跳过批次日检查，用于手动补跑）
function batchDayGate() {
  if (FORCED) return null;
  if (!contentEngine.isBatchDay(today())) {
    return `非批次日（每月 ${contentEngine.settings().batchDays}），按4批/月规则跳过`;
  }
  return null;
}

async function stageTopics() {
  const gate = batchDayGate();
  if (gate) return gate;
  const r = contentEngine.generateTopics(today());
  const approved = contentEngine.autoApproveBatchTopics(today());
  return `选题 ${r.total} 条；质量门禁自动批准 ${approved} 条（每批上限 ${contentEngine.settings().maxDraftsPerBatch}，宁缺毋滥）`;
}

async function stageGenerate() {
  const s = contentEngine.settings();
  if (s.automation !== 'ON') return `自动化开关为 ${s.automation}，跳过`;
  const gate = batchDayGate();
  if (gate) return gate;
  const pending = contentEngine.pendingReviewCount();
  if (pending >= s.pendingReviewPause) {
    return `待审草稿 ${pending} 篇 ≥ ${s.pendingReviewPause}，暂停AI正文生成（FINAL-17 第十八章，请先在公众号后台处理待审草稿）`;
  }
  const used = contentEngine.monthlyBatchCount(today());
  if (used >= s.maxBatchesPerMonth) {
    return `本月批次已用 ${used}/${s.maxBatchesPerMonth}，跳过生成（FINAL-17 第十六章）`;
  }
  const approved = contentEngine.listTopics(today()).filter((t) => t.status === 'APPROVED');
  if (!approved.length) return '本批无质量达标选题，宁缺毋滥生成 0 篇（FINAL-17 第十七章）';
  const cap = Math.min(s.maxDraftsPerBatch, approved.length);
  const results = [];
  let okCount = 0;
  for (const t of approved.slice(0, cap)) {
    try {
      const r = await contentEngine.generateArticle(t.topic_id);
      okCount++;
      results.push(r);
    } catch (e) {
      console.error(`[generate] 选题#${t.topic_id} ${t.keyword} 失败: ${e.message}`);
      results.push({ error: e.message });
    }
  }
  return `生成成功 ${okCount} 篇 / 尝试 ${results.length} 篇（本批 ${cap} 篇上限，质量优先；本月已用批次将变为 ${used + (okCount > 0 ? 1 : 0)}/${s.maxBatchesPerMonth}）`;
}

async function stageSafetySync() {
  const gate = batchDayGate();
  if (gate) return gate;
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
  // 草稿同步（draftSync=ON 且凭据已配置时才尝试；失败不阻断）
  let synced = 0, syncNote = '无待同步';
  if (s.draftSync === 'ON' && process.env.WECHAT_OA_APP_SECRET) {
    const tokenManager = require('./wechatTokenManager');
    if (tokenManager.isConfigured()) {
      const draftService = require('./wechatDraftService');
      const fs = require('fs');
      const pending = db.prepare("SELECT article_id FROM wechat_articles WHERE created_at >= date('now','localtime') AND status = 'SAFETY_PASSED' AND wechat_media_id = ''").all();
      for (const p of pending) {
        try {
          await syncOne(db, draftService, fs, p.article_id);
          synced++;
        } catch (e) { syncNote = `部分失败: ${String(e.message).slice(0, 80)}`; break; }
      }
    } else {
      syncNote = 'AppSecret未配置';
    }
  }
  if (synced > 0) syncNote = '成功';
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

// 第七十~七十二章：审核提醒（批次日执行，站内计数 + 邮件）
async function stageNotify() {
  const gate = batchDayGate();
  if (gate) return gate;
  const db = getDb();
  const stats = contentEngine.dashboardStats();
  const todayArticles = stats.todayArticles;
  const syncedToday = db.prepare("SELECT COUNT(*) AS n FROM wechat_articles WHERE status = 'WECHAT_DRAFT' AND updated_at >= date('now','localtime')").get().n;
  const riskToday = db.prepare("SELECT COUNT(*) AS n FROM wechat_articles WHERE status = 'RISK_BLOCKED' AND created_at >= date('now','localtime')").get().n;
  const s = contentEngine.settings();
  const used = contentEngine.monthlyBatchCount(today());
  const text = `言道国学公众号批次任务已完成：\n本批生成 ${todayArticles} 篇，${syncedToday} 篇已同步微信草稿，${riskToday} 篇因内容风险进入人工审核。\n本月批次已用 ${used}/${s.maxBatchesPerMonth}；当前待审草稿 ${contentEngine.pendingReviewCount()} 篇（≥${s.pendingReviewPause} 将暂停AI正文生成）。\n请登录言道国学后台（/admin/wechat-oa）检查。`;
  let emailed = false;
  try {
    emailed = await sendNotifyEmail('言道国学公众号批次任务完成提醒', text);
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
