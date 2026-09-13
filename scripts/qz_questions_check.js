// 七政四余141题质量核验 v4（独立 JS 文件，避免 shell 转义）
const Database = require("/www/yandaoguoxue-backend/node_modules/better-sqlite3");
const db = new Database("/www/yandaoguoxue-backend/data/academy.db", { readonly: true });
const q = (sql, ...a) => db.prepare(sql).all(...a);
const T = "yixue", C = "七政四余";

console.log("=== B. knowledge_id 绑定状态 ===");
q(`SELECT CASE WHEN knowledge_id IS NULL OR knowledge_id=0 THEN 'unbound' ELSE 'bound' END b, COUNT(*) n FROM questions WHERE track=? AND category=? GROUP BY b`, T, C).forEach(r => console.log(JSON.stringify(r)));

console.log("=== E. 题目章节 vs 知识点章节 不一致 ===");
q(`SELECT qu.id, qu.chapter qc, kp.chapter kc, qu.knowledge_id pid FROM questions qu JOIN knowledge_points kp ON qu.knowledge_id=kp.id WHERE qu.track=? AND qu.category=? AND qu.chapter != kp.chapter LIMIT 15`, T, C).forEach(r => console.log(JSON.stringify(r)));

console.log("=== F. 有题覆盖的知识点数 ===");
q(`SELECT COUNT(DISTINCT knowledge_id) n FROM questions WHERE track=? AND category=? AND knowledge_id>0`, T, C).forEach(r => console.log(JSON.stringify(r)));

console.log("=== C. 题干重复（同stem前40字）===");
q(`SELECT substr(stem,1,40) s, COUNT(*) n FROM questions WHERE track=? AND category=? GROUP BY s HAVING n>1 ORDER BY n DESC LIMIT 10`, T, C).forEach(r => console.log(JSON.stringify(r)));

console.log("=== C2. q_hash1 重复 ===");
q(`SELECT q_hash1, COUNT(*) n FROM questions WHERE track=? AND category=? GROUP BY q_hash1 HAVING n>1 LIMIT 10`, T, C).forEach(r => console.log(JSON.stringify(r)));

console.log("=== D. 题型/难度分布 ===");
q(`SELECT type, difficulty, COUNT(*) n FROM questions WHERE track=? AND category=? GROUP BY type, difficulty`, T, C).forEach(r => console.log(JSON.stringify(r)));

console.log("=== G. 状态分布 ===");
q(`SELECT status, COUNT(*) n FROM questions WHERE track=? AND category=? GROUP BY status`, T, C).forEach(r => console.log(JSON.stringify(r)));

console.log("=== H. 题干空 ===");
q(`SELECT COUNT(*) n FROM questions WHERE track=? AND category=? AND (stem IS NULL OR TRIM(stem)='')`, T, C).forEach(r => console.log(JSON.stringify(r)));

console.log("=== I. 绑定到不存在知识点 ===");
q(`SELECT COUNT(*) n FROM questions qu LEFT JOIN knowledge_points kp ON qu.knowledge_id=kp.id WHERE qu.track=? AND qu.category=? AND qu.knowledge_id>0 AND kp.id IS NULL`, T, C).forEach(r => console.log(JSON.stringify(r)));

console.log("=== J. 每知识点题数分布（覆盖率）===");
q(`SELECT kp.id, kp.title, COUNT(qu.id) n FROM knowledge_points kp LEFT JOIN questions qu ON qu.knowledge_id=kp.id AND qu.track=? AND qu.category=? WHERE kp.track=? AND kp.category=? GROUP BY kp.id HAVING n=0 ORDER BY kp.id`, T, C, T, C).forEach(r => console.log(JSON.stringify(r)));

db.close();
