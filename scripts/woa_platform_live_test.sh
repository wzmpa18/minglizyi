#!/bin/bash
# v25.0.75 平台联调：推菜单 + 同步草稿 + 状态核验（密钥不落日志）
cd /www/yandaoguoxue-backend
node <<'EOF'
const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env') });
const keys = [];
for (const [k, v] of Object.entries(process.env)) {
  if (/^ADMIN_API_KEY$|^ADMIN_(MASTER_)?KEY$|^ADMIN_KEY/.test(k) && v) keys.push(v);
}
const fs = require('fs');
for (const p of ['data/admin-keys.json', 'admin-keys.json']) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(process.cwd(), p), 'utf8'));
    if (typeof j === 'string') keys.push(j);
    else if (j.masterKey) keys.push(j.masterKey);
    else if (j.key) keys.push(j.key);
    else if (j.keys && j.keys.length) keys.push(...j.keys.map(x => x.key || x).filter(Boolean));
  } catch { }
}
const base = 'http://127.0.0.1:3001/api/wechat/official';
(async () => {
  let ok = false;
  for (const key of keys) {
    const r = await fetch(`${base}/admin/status`, { headers: { Authorization: `Bearer ${key}` } });
    if (r.status === 200) { ok = true; break; }
  }
  if (!ok) { console.log('NO_VALID_ADMIN_KEY'); process.exit(1); }
  const key = keys[0];
  const H = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

  // 1) 推送默认菜单
  let r = await fetch(`${base}/admin/menu/publish`, { method: 'POST', headers: H, body: '{}' });
  let j = await r.json();
  console.log('menu/publish:', r.status, JSON.stringify(j));

  // 2) 同步文章1到草稿箱
  r = await fetch(`${base}/admin/articles/1/sync`, { method: 'POST', headers: H });
  j = await r.json();
  console.log('articles/1/sync:', r.status, JSON.stringify(j));

  // 3) 状态核验
  r = await fetch(`${base}/admin/status`, { headers: H });
  j = await r.json();
  if (j.success && j.data) {
    const d = j.data;
    console.log('token:', JSON.stringify(d.token));
    console.log('stats: followers=%s todayNew=%s todayArticles=%s synced=%s pendingReview=%s aiCostToday=%s',
      d.followers, d.todayNew, d.todayArticles, d.synced, d.pendingReview, d.aiCostToday);
    console.log('draftCount:', d.draftCount, 'callbackVerified:', d.callbackVerified);
  }

  // 4) 草稿箱列表真实拉取（证明草稿已在微信侧）
  const tm = require('./wechatTokenManager');
  try {
    const token = await tm.getAccessToken();
    const res = await fetch(`https://api.weixin.qq.com/cgi-bin/draft/batchget?access_token=${token}&offset=0&count=5&no_content=1`);
    const data = await res.json();
    if (data.total_count !== undefined) {
      console.log('微信侧草稿箱: total_count =', data.total_count, ', item_count =', data.item_count);
      for (const it of (data.item || [])) {
        const art = (it.content && it.content.news_item && it.content.news_item[0]) || {};
        console.log('  - media_id:', it.media_id, '| 标题:', art.title || '(空)');
      }
    } else {
      console.log('草稿箱拉取:', JSON.stringify(data).slice(0, 200));
    }
  } catch (e) { console.log('草稿箱拉取失败:', e.message); }
})();
EOF
