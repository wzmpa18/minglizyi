#!/bin/bash
set +e
node -e '
const D = require("/www/yandaoguoxue-backend/node_modules/better-sqlite3");
const fs = require("fs");
const dbs = fs.readdirSync("/www/yandaoguoxue-backend/data").filter(f => f.endsWith(".db"));
for (const f of dbs) {
  try {
    const db = new D("/www/yandaoguoxue-backend/data/" + f, { readonly: true });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type=?").all("table").map(r => r.name);
    const wx = tables.filter(t => /wechat|draft|article|topic|batch|content/i.test(t));
    if (!wx.length) { db.close(); continue; }
    console.log("### DB:", f, "表:", wx.join(", "));
    for (const t of wx) {
      try {
        const cols = db.prepare(`PRAGMA table_info(${t})`).all().map(c => c.name);
        const n = db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
        console.log(`  [${t}] 行数=${n} 列: ${cols.slice(0, 14).join(",")}`);
        if (/article|draft/i.test(t) && n > 0) {
          const stCol = cols.find(c => /status|state/i.test(c)) || "status";
          const rows = db.prepare(`SELECT ${stCol} s, COUNT(*) c FROM ${t} GROUP BY ${stCol}`).all();
          console.log("    状态分布:", JSON.stringify(rows));
          const timeCol = cols.find(c => /created|time|date/i.test(c)) || "created_at";
          const month = db.prepare(`SELECT substr(${timeCol},1,10) d, COUNT(*) c FROM ${t} WHERE ${timeCol} >= "2026-09-01" GROUP BY d ORDER BY d`).all();
          console.log("    9月按天:", JSON.stringify(month));
          const pend = db.prepare(`SELECT substr(${timeCol},1,10) d, substr(title,1,24) t FROM ${t} WHERE ${stCol} LIKE "%pending%" OR ${stCol} LIKE "%review%" OR ${stCol}="draft" ORDER BY ${timeCol} DESC LIMIT 12`).all();
          if (pend.length) console.log("    待审明细:", JSON.stringify(pend, null, 1));
        }
      } catch (e) { console.log("  ", t, "ERR", e.message); }
    }
    db.close();
  } catch (e) { console.log(f, "ERR", e.message); }
}
'
