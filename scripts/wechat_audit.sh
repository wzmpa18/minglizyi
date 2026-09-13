#!/bin/bash
# 微信调度现状审计：cron/systemd/PM2 + 配置项 + 月度批次计数 + 待审草稿
echo "== 1. crontab =="
crontab -l 2>/dev/null | grep -v '^#' | grep -i -E 'wechat|weixin|draft|batch|content' || echo "(crontab 无微信相关)"

echo ""
echo "== 2. systemd timers =="
systemctl list-timers --all 2>/dev/null | grep -i -E 'wechat|content|draft' || echo "(无 systemd timer)"

echo ""
echo "== 3. PM2 进程列表 =="
pm2 list 2>/dev/null | head -20 || echo "(pm2 不可用)"

echo ""
echo "== 4. 后端微信调度代码中的 cron/interval 配置 =="
grep -rn "MONTHLY_BATCH\|MAX_WECHAT_BATCH\|MAX_DRAFTS_PER_BATCH\|AUTO_PUBLISH\|batch.*scheduler\|scheduler.*batch" /www/yandaoguoxue-backend/*.js 2>/dev/null | grep -v node_modules | head -20

echo ""
echo "== 5. .env 微信配置 =="
grep -i -E 'wechat|weixin|draft|batch|publish' /www/yandaoguoxue-backend/.env | sed 's/\(SECRET\|KEY\|TOKEN\|APPID\)=.*/\1=***/i' | head -20

echo ""
echo "== 6. 数据库：本月批次与草稿计数 =="
node -e '
const D = require("/www/yandaoguoxue-backend/node_modules/better-sqlite3");
const fs = require("fs");
const dbs = fs.readdirSync("/www/yandaoguoxue-backend/data").filter(f => f.endsWith(".db"));
console.log("db files:", dbs.join(", "));
for (const f of dbs) {
  try {
    const db = new D("/www/yandaoguoxue-backend/data/" + f, { readonly: true });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type=?").all("table").map(r => r.name);
    const wx = tables.filter(t => /wechat|draft|article|batch|content/i.test(t));
    if (wx.length) console.log(f, "→ 微信相关表:", wx.join(", "));
    db.close();
  } catch (e) { console.log(f, "ERR", e.message); }
}
'
