#!/bin/bash
set +e
node -e '
const D = require("/www/yandaoguoxue-backend/node_modules/better-sqlite3");
const db = new D("/www/yandaoguoxue-backend/data/academy.db", { readonly: true });
console.log("== wechat_content_jobs 9月批次运行记录 ==");
const jobs = db.prepare("SELECT run_date, stage, status FROM wechat_content_jobs WHERE run_date >= ? GROUP BY run_date, stage ORDER BY run_date, stage").all("2026-09-01");
console.log(JSON.stringify(jobs, null, 1));
console.log("");
console.log("== 微信设置 ==");
const settings = db.prepare("SELECT key, substr(value_json,1,300) v FROM wechat_oa_settings").all();
console.log(JSON.stringify(settings, null, 1));
db.close();
'
