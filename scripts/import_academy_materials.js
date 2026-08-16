#!/usr/bin/env node
/**
 * v25.0.20 倪海厦学习资料导入脚本（在服务器 backend 目录运行）
 *
 * 用法：node import_academy_materials.js <资料目录> [--dry]
 *
 * 行为：
 *   - 读取目录下 00-09 开头的整理版 .md 文件
 *   - 每份按 180,000 字符分片（后端 materials.text_content 上限 200,000）
 *   - 写入 materials 表：track/category 按文件名映射，status='pending'（待 AI 解析+人工审核）
 *   - 幂等：标题已存在（同 track+category+title）则跳过
 */
'use strict';

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const srcDir = args[0];
const dry = args.includes('--dry');
if (!srcDir || !fs.existsSync(srcDir)) {
  console.error('用法: node import_academy_materials.js <资料目录> [--dry]');
  process.exit(1);
}

const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, '..', 'data', 'academy.db'));
db.pragma('journal_mode = WAL');

// 文件名前缀 → [track, category, baseTitle]
const FILE_MAP = {
  '01': ['zhongyi', '倪海厦·黄帝内经', '黄帝内经（人纪系列）'],
  '02': ['zhongyi', '倪海厦·针灸', '针灸（人纪系列）'],
  '03': ['zhongyi', '倪海厦·伤寒论', '伤寒论（人纪系列）'],
  '04': ['zhongyi', '倪海厦·金匮要略', '金匮要略（人纪系列）'],
  '05': ['zhongyi', '倪海厦·神农本草经', '神农本草经（人纪系列）'],
  '06': ['zhongyi', '倪海厦·临床医案', '临床医案'],
  '07': ['zhongyi', '倪海厦·学生笔记', '学生笔记与跟诊记录'],
  '08': ['zhongyi', '倪海厦·方剂处方', '方剂与处方'],
  '09': ['yixue', '倪海厦·天纪人间道', '天纪·人间道'],
};

const CHUNK = 180000;

function splitChunks(text) {
  const chunks = [];
  let rest = text;
  while (rest.length > 0) {
    if (rest.length <= CHUNK) { chunks.push(rest); break; }
    // 在句读附近切，避免拦腰截断
    let cut = rest.lastIndexOf('\n', CHUNK);
    if (cut < CHUNK * 0.5) cut = rest.lastIndexOf('。', CHUNK);
    if (cut < CHUNK * 0.5) cut = CHUNK;
    chunks.push(rest.slice(0, cut + 1));
    rest = rest.slice(cut + 1).trimStart();
  }
  return chunks.filter(c => c.trim().length > 200);
}

const files = fs.readdirSync(srcDir).filter(f => /^\d{2}_.*\.md$/.test(f)).sort();
if (files.length === 0) {
  console.error('目录下未找到整理版资料（01-09 开头的 .md）');
  process.exit(1);
}

const existStmt = db.prepare('SELECT COUNT(*) AS c FROM materials WHERE track=? AND category=? AND title=?');
const insStmt = db.prepare(
  `INSERT INTO materials (title, track, category, format, file_path, text_content, grade, status, parse_note, uploader_id, uploader_name)
   VALUES (?,?,?,'text','',?,?,'pending','','system_import','倪海厦资料导入')`
);

let totalIn = 0, totalSkip = 0;
db.transaction(() => {
  for (const f of files) {
    const prefix = f.slice(0, 2);
    const m = FILE_MAP[prefix];
    if (!m) { console.log(`跳过（无映射）: ${f}`); continue; }
    const [track, category, baseTitle] = m;
    const text = fs.readFileSync(path.join(srcDir, f), 'utf8').replace(/\r\n/g, '\n');
    const chunks = splitChunks(text);
    if (chunks.length === 0) { console.log(`跳过（有效内容不足）: ${f}`); continue; }
    const partLabel = chunks.length > 1 ? (i) => `（第${i + 1}/${chunks.length}部）` : () => '';
    chunks.forEach((c, i) => {
      const title = `${baseTitle}${partLabel(i)}`;
      const exists = existStmt.get(track, category, title).c > 0;
      if (exists) { totalSkip++; console.log(`  已存在跳过: ${title}`); return; }
      if (!dry) {
        insStmt.run(title, track, category, c, 'S');
      }
      totalIn++;
      console.log(`  ${dry ? '[dry] ' : ''}导入: ${title} (${c.length.toLocaleString()} 字)`);
    });
  }
})();

console.log(`\n完成：新导入 ${totalIn} 片，跳过已存在 ${totalSkip} 片${dry ? '（dry run 未写库）' : ''}`);
const stats = db.prepare(`SELECT track, category, COUNT(*) AS c, SUM(LENGTH(text_content)) AS chars FROM materials GROUP BY track, category ORDER BY track, category`).all();
for (const s of stats) console.log(`  [${s.track}] ${s.category || '(无类目)'}: ${s.c} 份 / ${Number(s.chars || 0).toLocaleString()} 字`);
db.close();
