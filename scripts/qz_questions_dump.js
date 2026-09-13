// 七政四余141题绑定数据导出（专题分组验证用）
const Database = require("/www/yandaoguoxue-backend/node_modules/better-sqlite3");
const db = new Database("/www/yandaoguoxue-backend/data/academy.db", { readonly: true });
const rows = db.prepare("SELECT id, knowledge_id, chapter, type, difficulty, status FROM questions WHERE track=? AND category=? ORDER BY id").all("yixue", "七政四余");
for (const r of rows) console.log(JSON.stringify(r));
console.error("total=" + rows.length);
db.close();
