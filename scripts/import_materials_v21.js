#!/usr/bin/env node
/**
 * v25.0.21 易学+神农本草经资料导入脚本（在服务器 backend 目录运行）
 *
 * 用法：node import_materials_v21.js <资料目录> [--dry]
 *
 * 行为：
 *   - 按显式清单映射（文件名 → track/category/标题）导入 .md/.txt
 *   - 每份按 180,000 字符分片（后端 materials.text_content 上限 200,000）
 *   - status='pending'（待 AI 解析 + 人工审核后生成知识点与题目）
 *   - 幂等：同 track+category+title 已存在则跳过
 */
'use strict';

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const srcDir = args[0];
const dry = args.includes('--dry');
if (!srcDir || !fs.existsSync(srcDir)) {
  console.error('用法: node import_materials_v21.js <资料目录> [--dry]');
  process.exit(1);
}

const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, '..', 'data', 'academy.db'));
db.pragma('journal_mode = WAL');

// 文件名 → [track, category, 基础标题, 等级]
const MANIFEST = {
  // 神农本草经（用户上传完整版，v25.0.20 曾因源内容不足跳过，本次补齐）
  'shennong_bencao.md':    ['zhongyi', '倪海厦·神农本草经', '神农本草经（倪注完整版）', 'S'],
  // 易学·分门别类（E盘命理类核心文件 + 文档提取）
  '10_bazi_kb.md':         ['yixue', '八字命理', '八字命理标准知识库', 'S'],
  'ganzhi_mingli.txt':     ['yixue', '八字命理', '干支命理从入门到精通', 'A'],
  '11_ziwei_kb.md':        ['yixue', '紫微斗数', '紫微斗数标准知识库', 'S'],
  '12_qimen_kb.md':        ['yixue', '奇门遁甲', '奇门遁甲标准知识库', 'S'],
  'shantiandao_qimen.txt': ['yixue', '奇门遁甲', '道家奇门预测术（善天道82集）', 'A'],
  '13_daliuren_kb.md':     ['yixue', '大六壬', '大六壬标准知识库', 'S'],
  '14_xiaoliuren_kb.md':   ['yixue', '小六壬', '小六壬标准知识库', 'S'],
  'xiaoliuren_daochuan.txt': ['yixue', '小六壬', '道传小六壬完整版', 'A'],
  '15_meihua_kb.md':       ['yixue', '梅花易数', '梅花易数标准知识库', 'S'],
  '16_xuankong_kb.md':     ['yixue', '玄空风水', '玄空风水标准知识库', 'S'],
  'qizheng_siyu.txt':      ['yixue', '七政四余', '七政四余入门学习心得', 'A'],
  'yijing_tuiming.txt':    ['yixue', '易经推命', '易经推命批法', 'A'],
  'dimaidao.txt':          ['yixue', '堪舆地脉', '地脉道听课笔记', 'A'],
  'tianji_notes.txt':      ['yixue', '倪海厦·天纪人间道', '天纪笔记（jeff整理）', 'A'],
};

const CHUNK = 180000;

function splitChunks(text) {
  const chunks = [];
  let rest = text;
  while (rest.length > 0) {
    if (rest.length <= CHUNK) { chunks.push(rest); break; }
    let cut = rest.lastIndexOf('\n', CHUNK);
    if (cut < CHUNK * 0.5) cut = rest.lastIndexOf('。', CHUNK);
    if (cut < CHUNK * 0.5) cut = CHUNK;
    chunks.push(rest.slice(0, cut + 1));
    rest = rest.slice(cut + 1).trimStart();
  }
  return chunks.filter(c => c.trim().length > 200);
}

function cleanText(raw) {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\u0000/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

const existStmt = db.prepare('SELECT COUNT(*) AS c FROM materials WHERE track=? AND category=? AND title=?');
const insStmt = db.prepare(
  `INSERT INTO materials (title, track, category, format, file_path, text_content, grade, status, parse_note, uploader_id, uploader_name)
   VALUES (?,?,?,'text','',?,?,'pending','','system_import','v25.0.21资料导入')`
);

let totalIn = 0, totalSkip = 0, totalMiss = 0;
db.transaction(() => {
  for (const [file, m] of Object.entries(MANIFEST)) {
    const fp = path.join(srcDir, file);
    if (!fs.existsSync(fp)) { totalMiss++; console.log(`缺文件跳过: ${file}`); continue; }
    const [track, category, baseTitle, grade] = m;
    const text = cleanText(fs.readFileSync(fp, 'utf8'));
    const chunks = splitChunks(text);
    if (chunks.length === 0) { console.log(`有效内容不足跳过: ${file}`); continue; }
    const partLabel = chunks.length > 1 ? (i) => `（第${i + 1}/${chunks.length}部）` : () => '';
    chunks.forEach((c, i) => {
      const title = `${baseTitle}${partLabel(i)}`;
      const exists = existStmt.get(track, category, title).c > 0;
      if (exists) { totalSkip++; console.log(`  已存在跳过: ${title}`); return; }
      if (!dry) insStmt.run(title, track, category, c, grade);
      totalIn++;
      console.log(`  ${dry ? '[dry] ' : ''}导入: ${title} (${c.length.toLocaleString()} 字)`);
    });
  }
})();

console.log(`\n完成：新导入 ${totalIn} 片，跳过已存在 ${totalSkip} 片，缺文件 ${totalMiss} 个${dry ? '（dry run 未写库）' : ''}`);
const stats = db.prepare(`SELECT track, category, COUNT(*) AS c, SUM(LENGTH(text_content)) AS chars FROM materials GROUP BY track, category ORDER BY track, category`).all();
for (const s of stats) console.log(`  [${s.track}] ${s.category || '(无类目)'}: ${s.c} 份 / ${Number(s.chars || 0).toLocaleString()} 字`);
db.close();
