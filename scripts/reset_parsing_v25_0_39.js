#!/usr/bin/env node
/**
 * v25.0.39 复位脚本：
 * 1) SQL 占位符 bug 期间卡死的 parsing 材料复位 pending（解析任务已随后端崩溃丢失）
 * 2) #59/#60（倪海厦259实战方剂 一/二部，正文首行"经方派中医倪海厦259个实战方剂参考"）迁入倪海厦专区
 * 3) 死亡 gen_tasks 复位 failed
 */
'use strict';
const Database = require('/www/yandaoguoxue-backend/node_modules/better-sqlite3');
const D = new Database('/www/yandaoguoxue-backend/data/academy.db');
D.exec('PRAGMA busy_timeout = 10000');

console.log('===== 1) 卡死 parsing 材料复位 =====');
const stuck = D.prepare("SELECT id, substr(title,1,30) t, track FROM materials WHERE status='parsing'").all();
console.log(`卡死材料 ${stuck.length} 部: ${stuck.map(m => `#${m.id}`).join(',')}`);
if (stuck.length) {
  const r = D.prepare(`UPDATE materials SET status='pending', parse_note='v25.0.39 复位：SQL占位符bug导致解析任务崩溃丢失，重置待重新解析',
    updated_at=datetime('now','localtime') WHERE status='parsing'`).run();
  D.prepare(`INSERT INTO loc_op_logs (admin_id, action, target, detail) VALUES (?,?,?,?)`)
    .run('project_owner_authorized', 'reset_stuck_parsing', `materials×${r.changes}`,
      'v25.0.39 复位 SQL bug 期间卡死的 parsing 材料，重新触发解析');
  console.log(`已复位 ${r.changes} 部`);
}

console.log('\n===== 2) #59/#60 迁入倪海厦专区 =====');
const MAT_ZONE = { 59: '倪海厦·方剂处方', 60: '倪海厦·方剂处方' };
for (const [midStr, zoneCat] of Object.entries(MAT_ZONE)) {
  const mid = Number(midStr);
  const m = D.prepare('SELECT id, track, category, status FROM materials WHERE id=?').get(mid);
  if (!m) { console.log(`材料#${mid} 不存在`); continue; }
  const kp = D.prepare("SELECT status, count(*) n FROM knowledge_points WHERE material_id=? GROUP BY status").all(mid);
  const q = D.prepare(`SELECT q.status, count(*) n FROM questions q JOIN knowledge_points k ON q.knowledge_id=k.id WHERE k.material_id=? GROUP BY q.status`).all(mid);
  console.log(`材料#${mid} 迁移前: ${JSON.stringify(m)} KP=${JSON.stringify(kp)} Q=${JSON.stringify(q)}`);
}
const tx = D.transaction(() => {
  let kpN = 0, qN = 0;
  for (const [midStr, zoneCat] of Object.entries(MAT_ZONE)) {
    const mid = Number(midStr);
    const mr = D.prepare(`UPDATE materials SET track='zhongyi', category=?, status='parsed',
      updated_at=datetime('now','localtime') WHERE id=?`).run(zoneCat, mid);
    const kr = D.prepare(`UPDATE knowledge_points SET track='zhongyi', category=?,
      status=CASE WHEN status IN ('deprecated','rejected') THEN 'pending' ELSE status END
      WHERE material_id=? AND (track!='zhongyi' OR category!=? OR status IN ('deprecated','rejected'))`).run(zoneCat, mid, zoneCat);
    kpN += kr.changes;
    const qr = D.prepare(`UPDATE questions SET track='zhongyi',
      category=(SELECT category FROM knowledge_points WHERE knowledge_points.id=questions.knowledge_id),
      status=CASE WHEN status='rejected' THEN 'pending' ELSE status END
      WHERE track='yikao' AND status='rejected'
        AND knowledge_id IN (SELECT id FROM knowledge_points WHERE material_id=?)`).run(mid);
    qN += qr.changes;
    console.log(`材料#${mid}→${zoneCat}: 材料${mr.changes} 知识点${kr.changes} 题目${qr.changes}`);
  }
  D.prepare(`INSERT INTO loc_op_logs (admin_id, action, target, detail) VALUES (?,?,?,?)`)
    .run('project_owner_authorized', 'nhx_reuse_migrate', 'materials#59,#60',
      'v25.0.39 倪海厦259实战方剂（经方实战一/二部）迁入倪海厦·方剂处方专区复用');
  return { kpN, qN };
});
const { kpN, qN } = tx();
console.log(`#59/#60 迁移完成：知识点 ${kpN}，题目 ${qN} 置 pending`);

console.log('\n===== 3) gen_tasks 死亡任务复位 =====');
const running = D.prepare("SELECT id, track, category, status, done_groups, total_groups, created_q FROM gen_tasks WHERE status IN ('running','pending')").all();
console.log(`运行中任务: ${JSON.stringify(running)}`);
if (running.length) {
  const r = D.prepare(`UPDATE gen_tasks SET status='failed', error='v25.0.39 复位：SQL bug 期间任务异常中断',
    updated_at=datetime('now','localtime') WHERE status IN ('running','pending')`).run();
  console.log(`已复位 ${r.changes} 个任务`);
}

console.log('\n===== 4) 当前专区内容分布 =====');
const zoneKp = D.prepare(`SELECT category, status, count(*) n FROM knowledge_points WHERE track='zhongyi' AND category LIKE '倪海厦·%' GROUP BY category, status`).all();
console.log(`专区KP: ${JSON.stringify(zoneKp)}`);
const zoneQ = D.prepare(`SELECT category, status, count(*) n FROM questions WHERE track='zhongyi' AND category LIKE '倪海厦·%' GROUP BY category, status`).all();
console.log(`专区题目: ${JSON.stringify(zoneQ)}`);
const mat = D.prepare("SELECT status, count(*) n FROM materials WHERE track='zhongyi' GROUP BY status").all();
console.log(`zhongyi材料: ${JSON.stringify(mat)}`);
console.log('\n公版典籍材料:');
D.prepare("SELECT id, substr(title,1,24) t, status FROM materials WHERE title LIKE '公版典籍·%' ORDER BY id").all().forEach(m => console.log(`  #${m.id} ${m.t} ${m.status}`));
