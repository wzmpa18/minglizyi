#!/bin/bash
# 七政四余学习专区现状查询（GAP G1：135 条知识点章节分布 + 141 题绑定）
node -e '
const Database = require("/www/yandaoguoxue-backend/node_modules/better-sqlite3");
const db = new Database("/www/yandaoguoxue-backend/data/academy.db", { readonly: true });
const q = (sql, ...a) => db.prepare(sql).all(...a);

console.log("=== 1. 七政四余 knowledge_points 章节分布（chapter → 条数）===");
q("SELECT chapter, COUNT(*) n FROM knowledge_points WHERE track=? AND category=? GROUP BY chapter ORDER BY chapter", "yixue", "七政四余").forEach(r => console.log(JSON.stringify(r)));

console.log("=== 2. 状态分布 ===");
q("SELECT status, COUNT(*) n FROM knowledge_points WHERE track=? AND category=? GROUP BY status", "yixue", "七政四余").forEach(r => console.log(JSON.stringify(r)));

console.log("=== 3. 抽样10条（id/chapter/title/tags前3）===");
q("SELECT id, chapter, title, substr(tags,1,60) t FROM knowledge_points WHERE track=? AND category=? ORDER BY id LIMIT 10", "yixue", "七政四余").forEach(r => console.log(JSON.stringify(r)));

console.log("=== 4. 七政四余 questions 章节分布 ===");
q("SELECT chapter, COUNT(*) n FROM questions WHERE track=? AND category=? GROUP BY chapter ORDER BY chapter", "yixue", "七政四余").forEach(r => console.log(JSON.stringify(r)));

console.log("=== 5. questions 知识点绑定状态（point_id 空/非空）===");
q("SELECT CASE WHEN point_id IS NULL OR point_id=0 THEN \"unbound\" ELSE \"bound\" END b, COUNT(*) n FROM questions WHERE track=? AND category=? GROUP BY b", "yixue", "七政四余").forEach(r => console.log(JSON.stringify(r)));

console.log("=== 6. questions 重复度抽查（同 stem 前30字）===");
q("SELECT substr(stem,1,30) s, COUNT(*) n FROM questions WHERE track=? AND category=? GROUP BY s HAVING n>1 ORDER BY n DESC LIMIT 8", "yixue", "七政四余").forEach(r => console.log(JSON.stringify(r)));

console.log("=== 7. questions 分层/题型分布 ===");
q("SELECT type, level, COUNT(*) n FROM questions WHERE track=? AND category=? GROUP BY type, level", "yixue", "七政四余").forEach(r => console.log(JSON.stringify(r)));

db.close();
'
