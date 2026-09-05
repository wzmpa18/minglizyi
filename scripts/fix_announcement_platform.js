// v25.0.80: 给服务器公告数据加 platform 字段
// - a_v25_0_74_release（安卓返回手势/APK升级公告）→ 仅安卓
// - a_partner_plan_v2（合伙人佣金/多级收益，苹果审核3.2.2风险）→ 安卓+网页
// - 其余 → all
const fs = require('fs');
const f = '/www/yandaoguoxue-backend/data/announcements.json';
const items = JSON.parse(fs.readFileSync(f, 'utf-8'));
for (const it of items) {
  if (it.id === 'a_v25_0_74_release') it.platform = 'android';
  else if (it.id === 'a_partner_plan_v2') it.platform = 'android,web';
  else if (!it.platform) it.platform = 'all';
  it.updatedAt = new Date().toISOString();
}
fs.writeFileSync(f + '.bak_20260902', fs.readFileSync(f));
fs.writeFileSync(f, JSON.stringify(items, null, 2));
console.log(JSON.stringify(items.map(i => ({ id: i.id, platform: i.platform }))));
