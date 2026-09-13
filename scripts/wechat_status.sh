#!/bin/bash
# 微信内容现状 v2（academy.db）
node -e '
const D = require("/www/yandaoguoxue-backend/node_modules/better-sqlite3");
const db = new D("/www/yandaoguoxue-backend/data/academy.db", { readonly: true });
const q = (sql, ...a) => db.prepare(sql).all(...a);

console.log("=== 1. 文章状态分布（全量）===");
q("SELECT status, COUNT(*) n FROM wechat_articles GROUP BY status").forEach(r => console.log(JSON.stringify(r)));

console.log("=== 2. 本月（2026-09）按日生成文章数 ===");
q("SELECT date(created_at) d, COUNT(*) n FROM wechat_articles WHERE created_at >= ? GROUP BY d ORDER BY d", "2026-09-01").forEach(r => console.log(JSON.stringify(r)));

console.log("=== 3. 近30天 generate job 记录 ===");
q("SELECT run_date, stage, status, substr(error,1,80) e FROM wechat_content_jobs WHERE stage = ? AND run_date >= ? ORDER BY run_date DESC LIMIT 15", "generate", "2026-08-14").forEach(r => console.log(JSON.stringify(r)));

console.log("=== 4. 待审口径计数 ===");
let total = 0;
q("SELECT status, COUNT(*) n FROM wechat_articles WHERE status IN (?,?,?) GROUP BY status", "WECHAT_DRAFT", "SAFETY_PASSED", "LOCAL_DRAFT").forEach(r => { total += r.n; console.log(JSON.stringify(r)); });
console.log("PENDING_REVIEW_TOTAL = " + total);

console.log("=== 5. 选题状态（近30天）===");
q("SELECT status, COUNT(*) n FROM wechat_topic_candidates WHERE created_at >= ? GROUP BY status", "2026-08-14").forEach(r => console.log(JSON.stringify(r)));

db.close();
'
echo ""
echo "=== 6. getDb 指向确认 ==="
grep -n "academy\|wechat_oa\|DB_PATH\|new Database" /www/yandaoguoxue-backend/wechatOaDb.js | head -8
