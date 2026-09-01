#!/bin/bash
# 管理接口真实调用测试（密钥不落日志）
cd /www/yandaoguoxue-backend
node <<'EOF'
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
// 从服务器配置取管理员密钥（与 adminRoles.js 同源逻辑）
const keys = [];
for (const [k, v] of Object.entries(process.env)) {
  if (/^ADMIN_(MASTER_)?KEY$|^ADMIN_KEY/.test(k) && v) keys.push(v);
}
const fs = require('fs');
// 常见密钥文件位置
for (const p of ['data/admin-keys.json', 'admin-keys.json']) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(__dirname, p), 'utf8'));
    if (typeof j === 'string') keys.push(j);
    else if (j.masterKey) keys.push(j.masterKey);
    else if (j.key) keys.push(j.key);
  } catch { }
}
(async () => {
  let key = keys[0];
  if (!key) { console.log('NO_ADMIN_KEY_FOUND（改用grep .env探测）'); return; }
  const base = 'http://127.0.0.1:3001/api/wechat/official';
  const r = await fetch(`${base}/admin/status`, { headers: { Authorization: `Bearer ${key}` } });
  const j = await r.json();
  console.log('admin/status HTTP', r.status);
  if (j.success && j.data) {
    const d = j.data;
    console.log('config:', JSON.stringify(d.config));
    console.log('switches:', JSON.stringify(d.switches));
    console.log('token:', JSON.stringify(d.token));
    console.log('stats: followers=%s todayNew=%s todayArticles=%s synced=%s riskBlocked=%s pendingReview=%s aiCostToday=%s',
      d.followers, d.todayNew, d.todayArticles, d.synced, d.riskBlocked, d.pendingReview, d.aiCostToday);
    console.log('callbackVerified:', d.callbackVerified, 'draftCount:', d.draftCount, 'lastJob:', d.lastJob ? d.lastJob.stage + '/' + d.lastJob.status : null);
  } else {
    console.log('RESP:', JSON.stringify(j).slice(0, 300));
  }
})();
EOF
