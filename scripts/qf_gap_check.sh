#!/bin/bash
node -e '
const D = require("/www/yandaoguoxue-backend/node_modules/better-sqlite3");
const db = new D("/www/yandaoguoxue-backend/data/academy.db", { readonly: true });
console.log("=== 六爻相关知识点（按类目） ===");
db.prepare(`SELECT category, COUNT(*) n FROM knowledge_points WHERE track=? AND (title LIKE ? OR content LIKE ?) GROUP BY category`).all("yixue","%六爻%","%六爻%").forEach(r=>console.log(JSON.stringify(r)));
console.log("=== 历法/节气/干支相关（按类目） ===");
db.prepare(`SELECT category, COUNT(*) n FROM knowledge_points WHERE track=? AND (title LIKE ? OR content LIKE ? OR title LIKE ? OR content LIKE ?) GROUP BY category`).all("yixue","%节气%","%节气%","%历法%","%历法%").forEach(r=>console.log(JSON.stringify(r)));
console.log("=== 干支相关（按类目） ===");
db.prepare(`SELECT category, COUNT(*) n FROM knowledge_points WHERE track=? AND (title LIKE ? OR title LIKE ?) GROUP BY category`).all("yixue","%天干%","%干支%").forEach(r=>console.log(JSON.stringify(r)));
console.log("=== 易经推命 抽样5条标题 ===");
db.prepare(`SELECT title, chapter FROM knowledge_points WHERE track=? AND category=? LIMIT 5`).all("yixue","易经推命").forEach(r=>console.log(JSON.stringify(r)));
console.log("=== 天纪易理研修 抽样5条标题 ===");
db.prepare(`SELECT title, chapter FROM knowledge_points WHERE track=? AND category=? LIMIT 5`).all("yixue","天纪易理研修").forEach(r=>console.log(JSON.stringify(r)));
db.close();
'
