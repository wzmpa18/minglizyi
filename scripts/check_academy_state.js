'use strict';
const D = require('better-sqlite3');
const db = new D('data/academy.db');
const mode = process.argv[2] || 'state';
if (mode === 'state') {
  const cats = db.prepare('SELECT track, name, sort FROM categories ORDER BY track, sort').all();
  console.log('categories:', cats.length);
  cats.forEach((c) => console.log('  ', c.track, '|', c.name));
  console.log('materials:', db.prepare('SELECT COUNT(*) c FROM materials').get().c);
  console.log('knowledge_points:', db.prepare('SELECT COUNT(*) c FROM knowledge_points').get().c);
  console.log('questions:', db.prepare('SELECT COUNT(*) c FROM questions').get().c);
} else if (mode === 'pending') {
  const ms = db.prepare("SELECT id, title, track, category, LENGTH(text_content) len, status FROM materials ORDER BY id").all();
  ms.forEach((m) => console.log(`#${m.id} [${m.status}] ${m.track}/${m.category} ${m.title} (${m.len} chars)`));
  console.log('total:', ms.length);
} else if (mode === 'kp') {
  const kps = db.prepare("SELECT id, material_id, chapter, title, status, category FROM knowledge_points ORDER BY id DESC LIMIT 20").all();
  kps.forEach((k) => console.log(`#${k.id} mat=${k.material_id} [${k.status}] ${k.category} ${k.chapter} :: ${k.title}`));
  console.log('total kp:', db.prepare('SELECT COUNT(*) c FROM knowledge_points').get().c);
  console.log('pending kp:', db.prepare("SELECT COUNT(*) c FROM knowledge_points WHERE status='pending'").get().c);
  console.log('approved kp:', db.prepare("SELECT COUNT(*) c FROM knowledge_points WHERE status='approved'").get().c);
} else if (mode === 'q') {
  const qs = db.prepare("SELECT id, track, category, type, substr(stem,1,40) stem, status FROM questions ORDER BY id DESC LIMIT 20").all();
  qs.forEach((q) => console.log(`#${q.id} [${q.status}] ${q.track}/${q.category} ${q.type} :: ${q.stem}`));
  console.log('total q:', db.prepare('SELECT COUNT(*) c FROM questions').get().c);
  console.log('approved q:', db.prepare("SELECT COUNT(*) c FROM questions WHERE status='approved'").get().c);
}
db.close();
