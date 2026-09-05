/**
 * B3-3 易学九学科资料导入（IOS-4.3B-RECOVERY §九）
 * 建类目 → 插资料（pending）→ 调用线上解析 API 触发 AI 解析（真实知识工厂管线）
 * 幂等：按 content_hash 去重，重复执行不重复导入。
 * 用法：node /root/import_yixue_materials.js
 */
'use strict';
const fs = require('fs');
const crypto = require('crypto');
const D = require('/www/yandaoguoxue-backend/node_modules/better-sqlite3');

const DB_PATH = '/www/yandaoguoxue-backend/data/academy.db';
const MAT_DIR = '/root/yixue_materials';
const TRACK = 'yixue';
const VERSION_TAG = 'v25.0.80-yixue-import';

const MATERIALS = [
  { file: 'M_紫微斗数学习资料.md', category: '紫微斗数', title: '紫微斗数标准化知识库（七卷·AI整理学习版）' },
  { file: 'M_梅花易数学习资料.md', category: '梅花易数', title: '梅花易数标准化知识库（v2·七卷·学习版）' },
  { file: 'M_六爻学习资料.md', category: '六爻', title: '六爻经典解读知识库（四卷·典籍注疏学习版）' },
  { file: 'M_大六壬学习资料.md', category: '大六壬', title: '大六壬标准化知识库（v2.1·七卷·学习版）' },
  { file: 'M_传统历法学习资料.md', category: '传统历法', title: '传统历法知识库（干支·节气·时辰·学习版）' },
];

function sha256(s) { return crypto.createHash('sha256').update(String(s), 'utf8').digest('hex'); }
function materialHash(text) {
  const norm = String(text || '').replace(/\s+/g, '').toLowerCase();
  return sha256('mat:' + norm);
}

function envAdminKey() {
  const raw = fs.readFileSync('/www/yandaoguoxue-backend/.env', 'utf8');
  const m = raw.match(/^ADMIN_API_KEY=(.*)$/m);
  return m ? m[1].trim() : '';
}

const d = new D(DB_PATH);
d.pragma('journal_mode = WAL');

const parseTargets = [];

for (const m of MATERIALS) {
  const text = fs.readFileSync(`${MAT_DIR}/${m.file}`, 'utf8');
  if (!text || text.length < 500) { console.log(`[跳过] ${m.file} 内容过短`); continue; }

  // 1. 类目（幂等）
  let cat = d.prepare('SELECT id FROM categories WHERE track=? AND name=?').get(TRACK, m.category);
  if (!cat) {
    const maxSort = d.prepare('SELECT COALESCE(MAX(sort),0) s FROM categories WHERE track=?').get(TRACK).s;
    d.prepare('INSERT INTO categories (track, name, sort, status) VALUES (?,?,?,?)').run(TRACK, m.category, maxSort + 1, 'active');
    console.log(`[类目] 已创建: ${m.category}`);
  }

  // 2. 资料（指纹幂等）
  const h = materialHash(text);
  const dup = d.prepare('SELECT id, status FROM materials WHERE content_hash=?').get(h);
  if (dup) {
    console.log(`[资料] ${m.category} 指纹命中已有资料#${dup.id}（${dup.status}），跳过导入`);
    if (dup.status === 'pending') parseTargets.push(dup.id);
    continue;
  }
  const r = d.prepare(`INSERT INTO materials (title, track, format, text_content, grade, status, parse_note, uploader_id, uploader_name, category, visibility, content_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    m.title, TRACK, 'text', text, 'A', 'pending',
    `${VERSION_TAG} 待解析`, 'system_import', '知识工厂导入', m.category, 'PUBLIC', h);
  console.log(`[资料] 已导入: ${m.category} id=${r.lastInsertRowid} (${text.length} 字)`);
  parseTargets.push(Number(r.lastInsertRowid));
}

// 3. 追加待解析的历史资料：天纪·人间道（易学基础/天纪易理研修类目，#30 pending）
const tianji = d.prepare(`SELECT id, title, status FROM materials WHERE track=? AND status='pending' AND id NOT IN (${parseTargets.length ? parseTargets.join(',') : '0'})`).all(TRACK);
for (const t of tianji) {
  console.log(`[追加] 待解析历史资料: #${t.id} ${t.title}`);
  parseTargets.push(t.id);
}

// 4. 触发解析（线上真实管线，AI 解析 → 质量闸门 → 待人工审核）
const adminKey = envAdminKey();
if (!adminKey) { console.error('FATAL: ADMIN_API_KEY 未配置'); process.exit(1); }

(async () => {
  for (const id of parseTargets) {
    try {
      const resp = await fetch(`http://127.0.0.1:3001/api/academy/materials/${id}/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: '{}',
      });
      const data = await resp.json();
      console.log(`[解析] 资料#${id} 触发: ${JSON.stringify(data)}`);
    } catch (e) {
      console.error(`[解析] 资料#${id} 触发失败: ${e.message}`);
    }
  }
  console.log('\n[IMPORT_DONE] 共触发 ' + parseTargets.length + ' 份资料解析，等待 AI 完成后执行知识点审核');
  d.close();
})();
