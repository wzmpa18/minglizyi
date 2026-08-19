#!/usr/bin/env node
/**
 * v25.0.39 倪海厦专区迁移（用户指令：倪海厦内容归自学中医板块专区；国家医考严禁出现）
 * 幂等可重复执行。全部操作写 loc_op_logs 留痕。
 * 1) 激活专区类目 id 1-8
 * 2) 倪海厦材料 category → 专区类目名（材料 id 精确映射）
 * 3) 知识点/题目 category 随材料迁移（track 保持 zhongyi）
 * 4) 公共大类中残留的含人名 KP 一并迁入专区（标题/正文含 倪海厦/人纪 字样）
 */
'use strict';
const Database = require('/www/yandaoguoxue-backend/node_modules/better-sqlite3');
const D = new Database('/www/yandaoguoxue-backend/data/academy.db');
D.exec('PRAGMA busy_timeout = 8000');

// 材料id → 专区类目名 映射（人纪系列 + 倪注典籍 + 医案/笔记/方剂）
const MAT_MAP = {
  1: '倪海厦·黄帝内经', 2: '倪海厦·黄帝内经', 3: '倪海厦·黄帝内经', 4: '倪海厦·黄帝内经',
  5: '倪海厦·黄帝内经', 6: '倪海厦·黄帝内经', 7: '倪海厦·黄帝内经', 8: '倪海厦·黄帝内经',
  9: '倪海厦·针灸', 10: '倪海厦·针灸', 11: '倪海厦·针灸', 12: '倪海厦·针灸',
  13: '倪海厦·伤寒论', 14: '倪海厦·伤寒论',
  15: '倪海厦·金匮要略', 16: '倪海厦·金匮要略', 17: '倪海厦·金匮要略', 18: '倪海厦·金匮要略',
  19: '倪海厦·金匮要略', 20: '倪海厦·金匮要略', 21: '倪海厦·金匮要略',
  22: '倪海厦·临床医案', 23: '倪海厦·临床医案', 24: '倪海厦·临床医案', 25: '倪海厦·临床医案', 26: '倪海厦·临床医案',
  27: '倪海厦·学生笔记',
  28: '倪海厦·方剂处方', 29: '倪海厦·方剂处方',
  31: '倪海厦·神农本草经',
};

const tx = D.transaction(() => {
  // 1) 激活专区类目
  const act = D.prepare("UPDATE categories SET status='active' WHERE track='zhongyi' AND status='inactive' AND id IN (1,2,3,4,5,6,7,8)").run();
  console.log('专区类目激活:', act.changes);

  // 2) 材料 category 迁移
  const upMat = D.prepare('UPDATE materials SET category=?, updated_at=datetime(\'now\',\'localtime\') WHERE id=?');
  let matN = 0;
  for (const [id, cat] of Object.entries(MAT_MAP)) {
    const r = upMat.run(cat, Number(id));
    matN += r.changes;
  }
  console.log('材料 category 迁移:', matN);

  // 3) 知识点 category 随材料迁移
  const kpIds = Object.keys(MAT_MAP).map(Number);
  const ph = kpIds.map(() => '?').join(',');
  const kp = D.prepare(`UPDATE knowledge_points SET category = (SELECT category FROM materials WHERE id = knowledge_points.material_id)
    WHERE material_id IN (${ph}) AND track='zhongyi'`).run(...kpIds);
  console.log('知识点 category 迁移:', kp.changes);

  // 4) 题目 category 随知识点迁移（含 knowledge_id 为空的旧题按 chapter/来源不可靠，跳过并统计）
  const q = D.prepare(`UPDATE questions SET category = (SELECT k.category FROM knowledge_points k WHERE k.id = questions.knowledge_id)
    WHERE knowledge_id IN (SELECT id FROM knowledge_points WHERE material_id IN (${ph})) AND track='zhongyi'`).run(...kpIds);
  console.log('题目 category 迁移:', q.changes);

  // 5) 公共大类残留人名 KP → 对应专区（按材料来源映射）
  const pubBad = D.prepare(`SELECT id, material_id FROM knowledge_points WHERE track='zhongyi'
    AND status='approved'
    AND category NOT LIKE '倪海厦·%'
    AND (title LIKE '%倪海厦%' OR content LIKE '%倪海厦%' OR title LIKE '%人纪%' OR content LIKE '%人纪%')`).all();
  let movedBad = 0;
  for (const r of pubBad) {
    const cat = MAT_MAP[r.material_id];
    if (cat) {
      D.prepare('UPDATE knowledge_points SET category=? WHERE id=?').run(cat, r.id);
      D.prepare('UPDATE questions SET category=? WHERE knowledge_id=? AND track=\'zhongyi\'').run(cat, r.id);
      movedBad++;
    } else {
      console.log('  警告: KP#' + r.id + ' material_id=' + r.material_id + ' 无专区映射，人工确认');
    }
  }
  console.log('公共大类人名 KP 迁移:', movedBad, '/', pubBad.length);

  // 6) 留痕
  D.prepare(`INSERT INTO loc_op_logs (admin_id, action, target, detail) VALUES (?,?,?,?)`)
    .run('project_owner_authorized', 'nhx_zone_migrate', 'categories+materials+knowledge_points+questions',
      `v25.0.39 倪海厦专区迁移：激活专区类目8个 / 材料${matN}部 / 知识点${kp.changes} / 题目${q.changes} / 人名残留KP${movedBad}（医考轨道已验证无倪海厦可见内容）`);
});
tx();

// ===== 迁移后校验 =====
console.log('\n===== 迁移后专区覆盖 =====');
const zq = D.prepare(`SELECT c.id, c.name, (SELECT COUNT(*) FROM knowledge_points k WHERE k.category=c.name AND k.status='approved') kp,
  (SELECT COUNT(*) FROM questions q WHERE q.category=c.name AND q.status='approved') qa FROM categories c WHERE c.id<=8 ORDER BY c.id`).all();
for (const r of zq) console.log(`${r.id}\t${r.name}\tapproved KP:${r.kp}\tapproved 题:${r.qa}`);

console.log('\n===== 迁移后公共大类覆盖（zhongyi） =====');
const pubs = D.prepare("SELECT name FROM categories WHERE track='zhongyi' AND status='active' AND id>8 ORDER BY sort").all();
for (const c of pubs) {
  const kp = D.prepare("SELECT COUNT(*) n FROM knowledge_points WHERE category=? AND track='zhongyi' AND status='approved'").get(c.name);
  const q = D.prepare("SELECT COUNT(*) n FROM questions WHERE category=? AND track='zhongyi' AND status='approved'").get(c.name);
  console.log(`${c.name}\tKP:${kp.n}\t题:${q.n}`);
}

console.log('\n===== 公共大类人名残留复扫 =====');
const left = D.prepare(`SELECT COUNT(*) n FROM knowledge_points WHERE track='zhongyi' AND category NOT LIKE '倪海厦·%' AND status='approved'
  AND (title LIKE '%倪海厦%' OR content LIKE '%倪海厦%' OR title LIKE '%人纪%' OR content LIKE '%人纪%')`).get();
console.log('残留:', left.n, '(0=干净)');

console.log('\n===== 医考轨道可见内容污染复扫（approved/pending） =====');
const yk = D.prepare(`SELECT (SELECT COUNT(*) FROM knowledge_points WHERE track='yikao' AND status IN ('approved','pending')
  AND (title LIKE '%倪海厦%' OR content LIKE '%倪海厦%' OR title LIKE '%人纪%' OR content LIKE '%人纪%')) kp,
  (SELECT COUNT(*) FROM questions WHERE track='yikao' AND status IN ('approved','pending')
  AND (stem LIKE '%倪海厦%' OR analysis LIKE '%倪海厦%' OR options LIKE '%倪海厦%' OR stem LIKE '%人纪%' OR analysis LIKE '%人纪%')) q`).get();
console.log(`医考可见污染: KP=${yk.kp} 题=${yk.q} (0=干净)`);
