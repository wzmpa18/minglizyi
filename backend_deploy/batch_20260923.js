// ============================================================================
// 2026-09-23 批次生成脚本（凌晨执行，早晨发布）
// 目标：草稿箱共7篇（秋分已在内）+ 6篇全新主题，零重复、系列连贯、产品布局：
//   - 易学研习②坤卦（延续已发布①乾卦）
//   - 伤寒论研习②太阳病（延续已发布①六经辨证）
//   - 语言研习①玄奘 + ②汉字文化圈（学外语产品布局，纯文化零广告）
//   - 数字研习①河图洛书 + ②老子数字断舍离（数字管家产品布局，纯文化零广告）
// 全程智谱glm-4.5-flash免费模型（限流退避重试，不轻易降级付费通道）
// 幂等：每选题若已有非删除文章则跳过；重跑安全
// ============================================================================
const RUN_DATE = '2026-09-23';
const { getDb, getSetting, setSetting } = require('/www/yandaoguoxue-backend/wechatOaDb');
const contentEngine = require('/www/yandaoguoxue-backend/wechatContentEngine');
const draftService = require('/www/yandaoguoxue-backend/wechatDraftService');

const HOOK_STYLE = 'font-size:14px;line-height:1.75;color:#9a8c6a;margin:32px 0 0;text-align:center;';
const MED_STYLE = 'font-size:14px;line-height:1.75;color:#9a8c6a;margin:20px 0 0;text-align:center;';
const PACE_MS = 15000; // 篇间隔15s，配合智谱免费额度限速

const PLAN = [
  {
    keyword: '易学研习②坤卦六爻：坤为地，读懂另一种节奏', cluster: 'bazi',
    hook: '易学研习③，聊屯卦：万事开头难，古人画了六条路。',
  },
  {
    keyword: '伤寒论研习②太阳病：外感第一课', cluster: 'zhongyi',
    hook: '伤寒论研习③，读阳明病：一场高热的身体逻辑。',
    medical: true,
  },
  {
    keyword: '语言研习①玄奘的语言课：一千三百年前的外语学习法', cluster: 'xuewaiyu',
    hook: '语言研习下一篇：汉字文化圈——汉字如何串起东亚两千年。',
  },
  {
    keyword: '语言研习②汉字文化圈：汉字如何串起东亚两千年', cluster: 'xuewaiyu',
    hook: '语言研习下一篇：严复的"信达雅"——三个字，定了一百年。',
  },
  {
    keyword: '数字研习①河图洛书：中国人数字观念的原点', cluster: 'shuziguanjia',
    hook: '数字研习下一篇："九五之尊"的九和五，到底从哪来。',
  },
  {
    keyword: '数字研习②为学日益，为道日损：老子的数字断舍离', cluster: 'shuziguanjia',
    hook: '数字研习下一篇：天一阁四百年——古人怎么做"备份"。',
  },
];

function log(msg) { console.log(`[${new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(11, 19)}] ${msg}`); }
// 系列前缀规范：如"易学研习②"，标题未含时前置（对齐已发布①的命名惯例）
function seriesPrefix(keyword) {
  const m = String(keyword).match(/^((?:易学|伤寒论|语言|数字)研习[①②③])/);
  return m ? m[1] : '';
}

(async () => {
  const db = getDb();
  const summary = [];
  let first = true;

  // ① 设置：正文token余量提到6000；批次上限对齐用户"单批不超过7篇"
  contentEngine.updateSettings({ maxArticleTokens: 6000, maxDraftsPerBatch: 7 }, 'agent_batch_20260923');
  log('设置已更新：maxArticleTokens=6000, maxDraftsPerBatch=7');

  // ② 幂等插入6个选题（run_date=2026-09-23, APPROVED）；历史误插的2026-09-24同选题改回
  db.prepare("UPDATE wechat_topic_candidates SET run_date = ? WHERE run_date = '2026-09-24' AND keyword LIKE '%研习%'").run(RUN_DATE);
  for (const p of PLAN) {
    const exists = db.prepare("SELECT topic_id FROM wechat_topic_candidates WHERE run_date = ? AND keyword = ? AND status != 'REJECTED'").get(RUN_DATE, p.keyword);
    if (!exists) {
      contentEngine.addManualTopic(p.keyword, p.cluster, RUN_DATE);
      log(`选题已插入: ${p.keyword}`);
    } else {
      log(`选题已存在: ${p.keyword}`);
    }
  }

  // ③ 逐篇生成（不合格自动删除重试，最多3次）
  for (const p of PLAN) {
    const topic = db.prepare("SELECT * FROM wechat_topic_candidates WHERE run_date = ? AND keyword = ?").get(RUN_DATE, p.keyword);
    if (!topic) { summary.push({ keyword: p.keyword, error: '选题缺失' }); continue; }
    let row = db.prepare("SELECT article_id, status FROM wechat_articles WHERE topic_id = ? AND status != 'DELETED'").get(topic.topic_id);

    if (row) {
      log(`已有文章 #${row.article_id}，跳过生成: ${p.keyword}`);
      summary.push({ keyword: p.keyword, articleId: row.article_id, skipped: true });
    } else {
      let done = null;
      let lastErr = '';
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          if (!first) await new Promise((r) => setTimeout(r, PACE_MS));
          first = false;
          db.prepare("UPDATE wechat_topic_candidates SET status = 'APPROVED' WHERE topic_id = ?").run(topic.topic_id);
          const r = await contentEngine.generateArticle(topic.topic_id);
          row = db.prepare("SELECT article_id, title, word_count, status, content_html FROM wechat_articles WHERE article_id = ?").get(r.articleId);
          const wc = row.word_count || 0;
          const bad = (row.status === 'DUPLICATE' || row.status === 'RISK_BLOCKED' || wc < 1500 || wc > 2500);
          if (bad) {
            lastErr = `status=${row.status} wordCount=${wc}`;
            log(`第${attempt}次不合格（${lastErr}），删除重试: ${p.keyword}`);
            db.prepare("DELETE FROM wechat_articles WHERE article_id = ?").run(row.article_id);
            continue;
          }
          done = { articleId: row.article_id, wordCount: wc, model: r.model };
          log(`生成成功 #${row.article_id}（${wc}字, ${r.model}）: ${row.title}`);
          break;
        } catch (e) {
          lastErr = e.message;
          log(`第${attempt}次失败: ${e.message}`);
        }
      }
      if (!done) { summary.push({ keyword: p.keyword, error: lastErr }); continue; }
      summary.push({ keyword: p.keyword, ...done });
    }

    // ④ 系列标题前缀规范 + 追加系列钩子（+医疗边界声明）——生成/跳过均执行（幂等）
    const art = db.prepare("SELECT article_id, title, content_html FROM wechat_articles WHERE article_id = ?").get(summary[summary.length - 1].articleId);
    if (art) {
      const prefix = seriesPrefix(p.keyword);
      let newTitle = art.title;
      if (prefix && !newTitle.includes(prefix)) {
        newTitle = prefix + newTitle;
        log(`标题补系列前缀: ${art.title} → ${newTitle}`);
      }
      let tail = '';
      if (p.medical && !/就医|看医生|找医生|遵医嘱/.test(art.content_html)) {
        tail += `<p style="${MED_STYLE}">本文为经典文化研习，不构成诊疗建议；身体不适请线下就医。</p>`;
      }
      if (!art.content_html.includes(p.hook)) {
        tail += `<p style="${HOOK_STYLE}">${p.hook}<br>到时候，接着聊。</p>`;
      }
      db.prepare("UPDATE wechat_articles SET title = ?, content_html = content_html || ?, updated_at = datetime('now','localtime') WHERE article_id = ?").run(newTitle, tail, art.article_id);
    }
  }

  // ⑤ 同步到微信草稿箱（按阅读顺序）
  const thumb = getSetting('wechat_cover_media_id', '');
  log(`封面thumb_media_id: ${thumb || '(缺失!)'}`);
  for (const s of summary) {
    if (!s.articleId || s.error) continue;
    const row = db.prepare("SELECT * FROM wechat_articles WHERE article_id = ?").get(s.articleId);
    if (row.status === 'WECHAT_DRAFT' && row.wechat_media_id) { log(`已同步过，跳过 #${s.articleId}`); continue; }
    if (row.safety_status !== 'PASS') { log(`安全状态异常(${row.safety_status})，跳过同步 #${s.articleId}`); s.syncError = 'safety'; continue; }
    try {
      const created = await draftService.createDraft({
        title: row.title, author: row.author || '言道国学',
        digest: (row.digest || '').slice(0, 110), // 微信digest超120字会报45004，截断保底
        content: row.content_html, thumb_media_id: thumb, need_open_comment: 0, only_fans_can_comment: 0,
      });
      db.prepare("UPDATE wechat_articles SET wechat_media_id = ?, status = 'WECHAT_DRAFT', updated_at = datetime('now','localtime') WHERE article_id = ?").run(created.media_id, s.articleId);
      s.synced = true;
      log(`草稿箱同步成功 #${s.articleId}: ${row.title}`);
    } catch (e) {
      s.syncError = e.message;
      log(`草稿箱同步失败 #${s.articleId}: ${e.message}`);
    }
  }

  // ⑥ 草稿箱最终数量
  try {
    const cnt = await draftService.getDraftCount();
    log(`微信草稿箱最终数量: ${JSON.stringify(cnt)}`);
    summary.push({ draftBox: cnt });
  } catch (e) { summary.push({ draftBoxError: e.message }); }

  console.log('===== FINAL_SUMMARY =====');
  console.log(JSON.stringify(summary, null, 1));
  process.exit(summary.some((s) => s.error || s.syncError) ? 1 : 0);
})().catch((e) => { console.error('FATAL:', e); process.exit(1); });
