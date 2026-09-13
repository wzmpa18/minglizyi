#!/bin/bash
set +e
node -e '
const D = require("/www/yandaoguoxue-backend/node_modules/better-sqlite3");
const db = new D("/www/yandaoguoxue-backend/data/academy.db", { readonly: true });
console.log("== wechat_articles 全部10篇明细 ==");
const arts = db.prepare("SELECT article_id, substr(created_at,1,10) d, substr(title,1,22) t, status, wechat_draft_id IS NOT NULL AS has_draft FROM wechat_articles ORDER BY created_at DESC").all();
console.log(JSON.stringify(arts, null, 1));
console.log("");
console.log("== wechat_content_jobs 9月批次运行记录 ==");
const jobs = db.prepare("SELECT run_date, stage, status, substr(started_at,12,5) t FROM wechat_content_jobs WHERE run_date >= date(\"2026-09-01\") GROUP BY run_date, stage ORDER BY run_date, stage").all();
console.log(JSON.stringify(jobs, null, 1));
console.log("");
console.log("== 微信设置 ==");
const settings = db.prepare("SELECT key, substr(value_json,1,200) v FROM wechat_oa_settings").all();
console.log(JSON.stringify(settings, null, 1));
db.close();
'
