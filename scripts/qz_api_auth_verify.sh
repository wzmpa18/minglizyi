#!/bin/bash
# 登录态端到端验证：七政学习页数据通路（135条知识点 + 141题）
B=https://yandaoguoxue.yandao.vip

echo "== 找登录路由 =="
grep -rn "router.post.*login\|app.post.*login" /www/yandaoguoxue-backend/src/ 2>/dev/null | head -5

echo "== 用户表结构 =="
node -e '
const D = require("/www/yandaoguoxue-backend/node_modules/better-sqlite3");
const db = new D("/www/yandaoguoxue-backend/data/academy.db", { readonly: true });
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type=\"table\"").all().map(r => r.name);
console.log("tables:", tables.join(","));
for (const t of ["users", "user", "members"]) {
  if (tables.includes(t)) {
    const cols = db.prepare(`PRAGMA table_info(${t})`).all().map(c => c.name);
    console.log(t + ":", cols.join(","));
    const n = db.prepare(`SELECT COUNT(*) n FROM ${t}`).get();
    console.log(t, "count:", n.n);
  }
}
db.close();
'
