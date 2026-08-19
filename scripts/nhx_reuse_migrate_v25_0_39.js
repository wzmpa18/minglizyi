#!/usr/bin/env node
/**
 * v25.0.39 倪海厦内容复用迁移：医考轨道被隔离的倪海厦材料（#56 人纪黄帝内经 / #57 汉唐系列）
 * 用户指令：所有倪海厦的内容移入专区复用，不删除。
 * 动作：
 *   材料 #56 → track=zhongyi category=倪海厦·黄帝内经 status=parsed
 *   材料 #57 → track=zhongyi category=倪海厦·方剂处方 status=parsed
 *   关联知识点（deprecated→pending）与题目（rejected→pending）随材料迁移 track/category，
 *   后续由主管线 approveKps/approveQuestions 质量闸门批量审核上线。
 * #59/#60（经方实战方剂）仅检测报告，不迁移。
 * 幂等：可重复执行。
 */
'use strict';
const Database = require('/www/yandaoguoxue-backend/node_modules/better-sqlite3');
const D = new Database('/www/yandaoguoxue-backend/data/academy.db');
D.exec('PRAGMA busy_timeout = 10000');

const MAT_ZONE = { 56: '倪海厦·黄帝内经', 57: '倪海厦·方剂处方' };

console.log('===== 迁移前状态 =====');
for (const [mid] of Object.entries(MAT_ZONE)) {
  const m = D.prepare('SELECT id, track, category, status FROM materials WHERE id=?').get(Number(mid));
  const kp = D.prepare("SELECT status, count(*) n FROM knowledge_points WHERE material_id=? GROUP BY status").all(Number(mid));
  const q = D.prepare(`SELECT q.status, count(*) n FROM questions q JOIN knowledge_points k ON q.knowledge_id=k.id WHERE k.material_id=? GROUP BY q.status`).all(Number(mid));
  console.log(`材料#${mid} ${JSON.stringify(m)} KP=${JSON.stringify(kp)} Q=${JSON.stringify(q)}`);
}
console.log('\n===== #59/#60 检测报告（不迁移） =====');
for (const mid of [59, 60]) {
  const m = D.prepare('SELECT id, track, category, status, length(text_content) len FROM materials WHERE id=?').get(mid);
  if (!m) { console.log(`材料#${mid} 不存在`); continue; }
  const kp = D.prepare("SELECT status, count(*) n FROM knowledge_points WHERE material_id=? GROUP BY status").all(mid);
  const polluted = D.prepare(`SELECT count(*) n FROM knowledge_points WHERE material_id=? AND (title LIKE '%倪海厦%' OR content LIKE '%倪海厦%' OR title LIKE '%人纪%' OR content LIKE '%人纪%' OR title LIKE '%汉唐%' OR content LIKE '%汉唐%' OR content LIKE '%倪师%' OR title LIKE '%倪注%')`).get(mid).n;
  const samples = D.prepare('SELECT substr(title,1,30) t FROM knowledge_points WHERE material_id=? LIMIT 8').all(mid);
  console.log(`材料#${mid} ${JSON.stringify(m)} KP=${JSON.stringify(kp)} 污染KP=${polluted}`);
  console.log(`  样例: ${samples.map(s => s.t).join(' | ')}`);
}

console.log('\n===== 执行迁移 #56/#57 =====');
const tx = D.transaction(() => {
  let kpN = 0, qN = 0;
  for (const [midStr, zoneCat] of Object.entries(MAT_ZONE)) {
    const mid = Number(midStr);
    // 1) 材料迁移
    const mr = D.prepare(`UPDATE materials SET track='zhongyi', category=?, status='parsed',
      updated_at=datetime('now','localtime') WHERE id=? AND (track!='zhongyi' OR category!=? OR status!='parsed')`).run(zoneCat, mid, zoneCat);
    // 2) 知识点迁移：track→zhongyi，category→专区，deprecated/rejected→pending（待管线质量闸门审核）
    const kr = D.prepare(`UPDATE knowledge_points SET track='zhongyi', category=?,
      status=CASE WHEN status IN ('deprecated','rejected') THEN 'pending' ELSE status END
      WHERE material_id=? AND (track!='zhongyi' OR category!=? OR status IN ('deprecated','rejected'))`).run(zoneCat, mid, zoneCat);
    kpN += kr.changes;
    // 3) 题目迁移：跟随其知识点的新类目，rejected→pending
    const qr = D.prepare(`UPDATE questions SET track='zhongyi',
      category=(SELECT category FROM knowledge_points WHERE knowledge_points.id=questions.knowledge_id),
      status=CASE WHEN status='rejected' THEN 'pending' ELSE status END
      WHERE track='yikao' AND status='rejected'
        AND knowledge_id IN (SELECT id FROM knowledge_points WHERE material_id=?)`).run(mid);
    qN += qr.changes;
    console.log(`材料#${mid}→${zoneCat}: 材料${mr.changes} 知识点${kr.changes} 题目${qr.changes}`);
  }
  D.prepare(`INSERT INTO loc_op_logs (admin_id, action, target, detail) VALUES (?,?,?,?)`)
    .run('project_owner_authorized', 'nhx_reuse_migrate', 'materials#56,#57',
      'v25.0.39 用户指令：医考轨道隔离的倪海厦内容（人纪黄帝内经/汉唐系列）整体迁入倪海厦专区复用，知识点/题目置 pending 走质量闸门，不删除');
  return { kpN, qN };
});
const { kpN, qN } = tx();
console.log(`迁移完成：知识点 ${kpN} 个，题目 ${qN} 道置 pending`);

console.log('\n===== 迁移后状态 =====');
for (const [mid, zoneCat] of Object.entries(MAT_ZONE)) {
  const kp = D.prepare("SELECT status, count(*) n FROM knowledge_points WHERE material_id=? GROUP BY status").all(Number(mid));
  const q = D.prepare(`SELECT q.status, count(*) n FROM questions q JOIN knowledge_points k ON q.knowledge_id=k.id WHERE k.material_id=? GROUP BY q.status`).all(Number(mid));
  console.log(`#${mid} ${zoneCat}: KP=${JSON.stringify(kp)} Q=${JSON.stringify(q)}`);
}
const bad = D.prepare(`SELECT count(*) n FROM questions WHERE track='yikao' AND knowledge_id IN (SELECT id FROM knowledge_points WHERE material_id IN (56,57))`).get().n;
console.log(`医考轨道残留关联题目: ${bad}（须为0）`);
const zoneKp = D.prepare(`SELECT category, count(*) n FROM knowledge_points WHERE track='zhongyi' AND category LIKE '倪海厦·%' GROUP BY category`).all();
console.log(`专区知识点分布: ${JSON.stringify(zoneKp)}`);
const zoneQ = D.prepare(`SELECT category, status, count(*) n FROM questions WHERE track='zhongyi' AND category LIKE '倪海厦·%' GROUP BY category, status`).all();
console.log(`专区题目分布: ${JSON.stringify(zoneQ)}`);
const dup2 = D.prepare(`SELECT count(*) n FROM questions WHERE track='zhongyi' AND category LIKE '倪海厦·%' AND status='pending' AND IFNULL(dup_tier,0)=2`).get().n;
console.log(`专区 pending 题目中结构重复(dup_tier=2)留人工: ${dup2}`);
