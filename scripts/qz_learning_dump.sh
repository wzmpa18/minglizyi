#!/bin/bash
# 七政四余全量知识点标题导出（专题映射设计用）
node -e '
const Database = require("/www/yandaoguoxue-backend/node_modules/better-sqlite3");
const db = new Database("/www/yandaoguoxue-backend/data/academy.db", { readonly: true });
const rows = db.prepare("SELECT id, chapter, title, tags FROM knowledge_points WHERE track=? AND category=? ORDER BY id").all("yixue", "七政四余");
for (const r of rows) console.log(JSON.stringify(r));
console.error("total=" + rows.length);
db.close();
' > /tmp/qz_points.jsonl 2>/tmp/qz_points.err
cat /tmp/qz_points.jsonl | head -200
