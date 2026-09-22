// ============================================================================
// 2026-09-23 批次终验：7篇草稿零重复 / 字数 / 风险词 / 推广词 / 钩子 / 医疗边界
// / digest安全 / 微信草稿箱实数与标题一致性
// ============================================================================
const { getDb } = require('/www/yandaoguoxue-backend/wechatOaDb');
const { getAccessToken } = require('/www/yandaoguoxue-backend/wechatTokenManager');

const WX_BASE = 'https://api.weixin.qq.com/cgi-bin';

function bigrams(s) {
  const t = String(s).replace(/\s/g, '');
  const set = new Set();
  for (let i = 0; i < t.length - 1; i++) set.add(t.slice(i, i + 2));
  return set;
}
function jac(a, b) {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

(async () => {
  const db = getDb();
  const drafts = db.prepare("SELECT article_id, title, digest, content_html, wechat_media_id FROM wechat_articles WHERE status = 'WECHAT_DRAFT' ORDER BY article_id").all();
  console.log(`DB待发草稿: ${drafts.length} 篇（应为7）`);
  if (drafts.length !== 7) console.log(`✗ 应为7篇，实际${drafts.length}篇`);

  // ① 标题重复检查（草稿两两 + 对已发布）
  const tbg = drafts.map((d) => ({ id: d.article_id, title: d.title, bg: bigrams(d.title) }));
  const published = db.prepare("SELECT title FROM wechat_articles WHERE status = 'PUBLISHED'").all();
  const pbg = published.map((p) => bigrams(p.title));
  let dup = 0;
  for (let i = 0; i < tbg.length; i++) {
    for (let j = i + 1; j < tbg.length; j++) {
      const s = jac(tbg[i].bg, tbg[j].bg);
      if (s > 0.35) { console.log(`✗ 标题重复 草稿#${tbg[i].id}“${tbg[i].title}” vs 草稿#${tbg[j].id}“${tbg[j].title}” sim=${s.toFixed(3)}`); dup++; }
    }
    for (let k = 0; k < pbg.length; k++) {
      const s = jac(tbg[i].bg, pbg[k]);
      if (s > 0.35) { console.log(`✗ 标题重复 草稿#${tbg[i].id}“${tbg[i].title}” vs 已发布“${published[k].title}” sim=${s.toFixed(3)}`); dup++; }
    }
  }
  console.log(dup === 0 ? `✓ 标题零重复（草稿两两+对${published.length}篇已发布，阈值0.35）` : `✗ 重复标题${dup}处`);

  // ② 逐篇内容检查
  const RISK = [/某高校|某大学|某研究|某房产|某学院/, /实验表明|调研显示|研究表明|统计显示/, /\d+(?:\.\d+)?%的/, /《日本书记》|张教授/];
  const AD = /APP|下载|会员|付费|课程|二维码|关注我们|言道/;
  let bad = 0;
  for (const d of drafts) {
    const text = d.content_html.replace(/<[^>]+>/g, '');
    const wc = text.replace(/\s/g, '').length;
    const issues = [];
    if (wc < 1500 || wc > 2500) issues.push(`字数${wc}越界`);
    for (const re of RISK) { const m = text.match(re); if (m) issues.push(`风险词:${m[0]}`); }
    const ad = text.match(AD); if (ad) issues.push(`疑似推广:${ad[0]}`);
    if (d.digest) {
      if (d.digest.length > 120) issues.push('digest超120字');
      const dm = d.digest.match(/某高校|某大学|某研究|某房产|调研显示|实验表明|\d+(?:\.\d+)?%/);
      if (dm) issues.push(`digest风险:${dm[0]}`);
    }
    if (d.title.includes('伤寒') && !/不构成医疗诊断/.test(text)) issues.push('缺医疗边界声明');
    if (!/到时候，接着聊/.test(text)) issues.push('缺结尾钩子');
    if (!d.wechat_media_id) issues.push('未同步微信草稿');
    console.log(`#${d.article_id} ${issues.length ? '✗[' + issues.join(' | ') + ']' : '✓'} 字数=${wc} ${d.title}`);
    if (issues.length) bad++;
  }

  // ③ 微信草稿箱实况
  const token = await getAccessToken();
  const batch = await (await fetch(`${WX_BASE}/draft/batchget?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ offset: 0, count: 20, no_content: 1 }),
  })).json();
  console.log(`微信草稿箱实际总数: ${batch.total_count}（应为7）`);
  const wxTitles = new Set();
  for (const it of (batch.item || [])) {
    for (const ni of (it.content.news_item || [])) { wxTitles.add(ni.title); console.log(`  [微信] ${ni.title}`); }
  }
  for (const d of drafts) {
    if (d.wechat_media_id && !wxTitles.has(d.title)) console.log(`✗ DB草稿#${d.article_id}“${d.title}”不在微信草稿箱`);
  }

  const ok = bad === 0 && dup === 0 && batch.total_count === 7 && drafts.length === 7;
  console.log(ok ? '=== 终验全部通过 ===' : `=== 存在问题（内容${bad}篇异常 / 重复${dup}处 / 草稿箱${batch.total_count}篇） ===`);
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
