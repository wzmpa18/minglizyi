#!/bin/bash
set -u
node -e '
const Database = require("/www/yandaoguoxue-backend/node_modules/better-sqlite3");
const db = new Database("/www/yandaoguoxue-backend/data/academy.db", { readonly: true });
const q = (sql, ...a) => { try { return db.prepare(sql).all(...a); } catch (e) { return [{ err: e.message }]; } };

console.log("=== yixue materials 明细 ===");
q("SELECT id, title, category, status FROM materials WHERE track=? LIMIT 15", "yixue").forEach(r => console.log(JSON.stringify(r)));

console.log("=== yixue knowledge_points 学科分布 ===");
q("SELECT category, COUNT(*) n FROM knowledge_points WHERE track=? GROUP BY category ORDER BY n DESC", "yixue").forEach(r => console.log(JSON.stringify(r)));

console.log("=== yixue knowledge_points 抽样3条 ===");
q("SELECT id, title, category, substr(content,1,80) c FROM knowledge_points WHERE track=? LIMIT 3", "yixue").forEach(r => console.log(JSON.stringify(r)));

console.log("=== yixue questions 学科分布 ===");
q("SELECT category, COUNT(*) n FROM questions WHERE track=? GROUP BY category ORDER BY n DESC", "yixue").forEach(r => console.log(JSON.stringify(r)));

console.log("=== yixue questions 题型分布 ===");
q("SELECT type, COUNT(*) n FROM questions WHERE track=? GROUP BY type", "yixue").forEach(r => console.log(JSON.stringify(r)));
db.close();
'
