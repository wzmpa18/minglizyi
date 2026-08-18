'use strict';
const path = require('path');
const D = require('/www/yandaoguoxue-backend/node_modules/better-sqlite3');
const db = new D(path.join('/www/yandaoguoxue-backend', 'data/academy.db'));

for (const track of ['zhongyi', 'yixue', 'guoxue', 'yangsheng']) {
  const fmt = db.prepare("SELECT answer, COUNT(*) c FROM questions WHERE track=? AND type='single' AND status='approved' GROUP BY answer ORDER BY c DESC LIMIT 6").all(track);
  console.log(track, 'single答案分布:', JSON.stringify(fmt));
  const s = db.prepare("SELECT options FROM questions WHERE track=? AND type='single' AND status='approved' LIMIT 2").all(track);
  for (const x of s) console.log('  示例options:', x.options ? x.options.slice(0, 120) : 'null');
}
