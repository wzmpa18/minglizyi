// ============================================================================
// #14 秋分篇收尾修复：
//   ① "后天早上"过时相对时间（明日9/24发布时秋分已过）→ 无时效锚点表述
//   ② 字数2530超出2500上限 → 删1句冗余支撑句+压缩1句，压到2500以内
//   ③ 电量"20%"→"两成"（与全文文风统一）
//   附带：#14/#18 正文ASCII直引号规范化为全角（与其余5篇排版统一）
// 流程：替换校验 → 写库 → draft/get取全字段 → draft/update同步微信草稿
// 安全：替换串未命中立即中止，先全部校验通过才写库
// ============================================================================
const { getDb } = require('/www/yandaoguoxue-backend/wechatOaDb');
const { getAccessToken } = require('/www/yandaoguoxue-backend/wechatTokenManager');
const draftService = require('/www/yandaoguoxue-backend/wechatDraftService');

const WX_BASE = 'https://api.weixin.qq.com/cgi-bin';

const PATCH14 = [
  ['而这场换季的中点站，就在后天早上：<strong style="color:#8b4a2b;">9月23日8点05分，秋分</strong>。',
   '而这场换季的中点站，就在刚过去的9月23日早上8点05分——<strong style="color:#8b4a2b;">秋分</strong>。'],
  ['每年入冬三五斤，春节再三五斤——不少人贴出来的，是这条轨迹。',
   ''],
  ['古人没有仪器，凭肉眼和圭表，把一个天文节点定到这个精度，是件了不起的事。',
   '古人没有仪器，全凭肉眼和圭表做到这个精度，很了不起。'],
  ['手机电量掉到20%以下，会自动调暗屏幕、限制性能',
   '手机电量掉到两成以下，会自动调暗屏幕、限制性能'],
];

function wordCount(html) {
  return html.replace(/<[^>]+>/g, '').replace(/\s/g, '').length;
}
function normalizeQuotes(html) {
  return html.split(/(<[^>]+>)/g).map((seg) => {
    if (seg.startsWith('<')) return seg;
    const dq = (seg.match(/"/g) || []).length;
    const sq = (seg.match(/'/g) || []).length;
    if (dq % 2 !== 0 || sq % 2 !== 0) return seg;
    let dOpen = true;
    let sOpen = true;
    let out = '';
    for (const ch of seg) {
      if (ch === '"') { out += dOpen ? '“' : '”'; dOpen = !dOpen; }
      else if (ch === "'") { out += sOpen ? '‘' : '’'; sOpen = !sOpen; }
      else out += ch;
    }
    return out;
  }).join('');
}

(async () => {
  const db = getDb();

  // ① #14 打补丁（引号规范化在前，替换串统一全角引号）
  const row14 = db.prepare('SELECT content_html FROM wechat_articles WHERE article_id = 14').get();
  let html14 = normalizeQuotes(row14.content_html);
  for (const [oldStr, newStr] of PATCH14) {
    if (html14.includes(oldStr)) {
      html14 = html14.split(oldStr).join(newStr);
    } else if (!newStr || html14.includes(newStr)) {
      // 已应用过（幂等重跑）
    } else {
      throw new Error(`#14 替换串未命中: ${oldStr.slice(0, 40)}…`);
    }
  }
  const wc14 = wordCount(html14);
  if (wc14 < 1500 || wc14 > 2500) throw new Error(`#14 字数${wc14}不在1500-2500区间`);
  console.log(`#14 补丁完成 字数=${wc14}`);

  // ② #18 仅引号规范化
  const row18 = db.prepare('SELECT content_html FROM wechat_articles WHERE article_id = 18').get();
  const html18 = normalizeQuotes(row18.content_html);
  const wc18 = wordCount(html18);
  if (wc18 < 1500 || wc18 > 2500) throw new Error(`#18 字数${wc18}不在1500-2500区间`);
  console.log(`#18 引号规范化完成 字数=${wc18}`);

  // ③ 风险词（针对伪调研数据模式）
  const RISK = [/某高校|某大学|某研究|某房产|某学院/, /实验表明|调研显示|研究表明|统计显示/, /\d+(?:\.\d+)?%的/, /《日本书记》|张教授/];
  for (const [id, html] of [[14, html14], [18, html18]]) {
    const text = html.replace(/<[^>]+>/g, '');
    for (const re of RISK) {
      const m = text.match(re);
      if (m) throw new Error(`#${id} 残留风险模式: ${m[0]}`);
    }
  }
  console.log('#14/#18 风险词检查通过');

  // ④ 写库
  db.prepare('UPDATE wechat_articles SET content_html = ? WHERE article_id = 14').run(html14);
  db.prepare('UPDATE wechat_articles SET content_html = ? WHERE article_id = 18').run(html18);
  console.log('#14/#18 DB已更新');

  // ⑤ 同步微信草稿
  const token = await getAccessToken();
  for (const [id, html] of [[14, html14], [18, html18]]) {
    const row = db.prepare('SELECT title, wechat_media_id FROM wechat_articles WHERE article_id = ?').get(id);
    if (!row.wechat_media_id) { console.log(`#${id} 无media_id，跳过微信同步`); continue; }
    const res = await fetch(`${WX_BASE}/draft/get?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ media_id: row.wechat_media_id }),
    });
    const data = await res.json();
    if (!data.news_item || !data.news_item.length) throw new Error(`#${id} draft/get失败: ${JSON.stringify(data).slice(0, 200)}`);
    const it = data.news_item[0];
    const article = {
      title: it.title,
      author: it.author,
      digest: (it.digest || '').slice(0, 110),
      content: html,
      thumb_media_id: it.thumb_media_id,
      need_open_comment: it.need_open_comment ? 1 : 0,
      only_fans_can_comment: it.only_fans_can_comment ? 1 : 0,
    };
    const upd = await draftService.updateDraft(row.wechat_media_id, 0, article);
    if (upd.errcode !== 0) throw new Error(`#${id} draft/update失败: ${JSON.stringify(upd)}`);
    console.log(`#${id} 微信草稿已同步: ${it.title}`);
  }

  console.log('=== #14/#18 修复完成 ===');
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
