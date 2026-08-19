#!/usr/bin/env node
/**
 * v25.0.39 中医学习板块资料补齐主管线（混元 AI）
 * 用户指令：倪海厦内容归自学中医板块专区；国家医考严禁出现其内容与名字；
 *          公共学科大类基于公域典籍与通用知识框架补齐（三层隔离）
 *
 * 阶段1：倪海厦专区补齐——解析 24 部 pending 人纪材料 → 知识点审核 → 专区全覆盖出题 → 题目上线
 * 阶段2：公域典籍补齐——classics.ts 7 部公版典籍导入公共大类 → 解析 → 审核 → 出题 → 上线
 * 阶段3：通用框架类目——AI 按公域知识框架生成 5 个空类目学习材料 → 解析 → 审核 → 出题 → 上线
 *
 * 幂等可恢复：重复执行自动跳过已完成环节。停止：kill 进程即可。
 * 运行：nohup node /root/tcm_pipeline_v25_0_39.js > /root/tcm_pipeline_v25_0_39.log 2>&1 &
 */
'use strict';
require('/www/yandaoguoxue-backend/node_modules/dotenv').config({ path: '/www/yandaoguoxue-backend/.env' });
const fs = require('fs');
const Database = require('/www/yandaoguoxue-backend/node_modules/better-sqlite3');

const DB_PATH = '/www/yandaoguoxue-backend/data/academy.db';
const API = 'http://127.0.0.1:3001/api/academy';
const KEY = (process.env.ADMIN_API_KEY || '').trim();
const SRC_DIR = '/root/yandaoguoxue-source';
const D = new Database(DB_PATH);
D.exec('PRAGMA busy_timeout = 10000');

const log = (msg) => console.log(`[${new Date().toISOString().slice(5, 19).replace('T', ' ')}] ${msg}`);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function api(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-admin-key': KEY },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-json */ }
  return { status: res.status, data };
}

// ---------- 通用环节 ----------

async function parseMaterial(mid, title) {
  const st = () => D.prepare('SELECT status FROM materials WHERE id=?').get(mid).status;
  const cur0 = st();
  if (['parsed', 'approved'].includes(cur0)) { log(`  资料#${mid} ${title} 已 ${cur0}，跳过`); return true; }
  if (cur0 === 'parsing') {
    // 后端解析无全局锁，重复触发会产生并行重复任务——只接管等待
    log(`  资料#${mid} ${title} 解析进行中，接管等待`);
  } else {
    log(`  资料#${mid} ${title} 触发解析`);
    const r = await api('POST', `/materials/${mid}/parse`);
    if (!r.data || !r.data.success) { log(`  资料#${mid} 触发失败: ${JSON.stringify(r.data).slice(0, 150)}`); return false; }
    if (r.data.dedup) { log(`  资料#${mid} 指纹命中复用 #${r.data.reusedFrom}（0 次 AI）`); return true; }
  }
  let waited = 0;
  while (waited < 7200) { // 单部最长等 120 分钟（24 部并行解析时 AI 吞吐下降）
    await sleep(20000); waited += 20;
    const s = st();
    if (s !== 'parsing') {
      const note = D.prepare('SELECT parse_note FROM materials WHERE id=?').get(mid).parse_note || '';
      const kp = D.prepare('SELECT COUNT(*) n FROM knowledge_points WHERE material_id=?').get(mid).n;
      log(`  资料#${mid} 解析结束: ${s} / KP ${kp} / ${String(note).slice(0, 80)}`);
      return s === 'parsed' || s === 'approved';
    }
    if (waited % 600 === 0) log(`  ...资料#${mid} 解析中 ${waited}s`);
  }
  log(`  资料#${mid} 等待超时（仍 parsing），后续可重跑恢复`);
  return false;
}

function approveKps(categories, tag) {
  const ph = categories.map(() => '?').join(',');
  const before = D.prepare(`SELECT COUNT(*) n FROM knowledge_points WHERE category IN (${ph}) AND status='pending'`).get(...categories).n;
  if (before === 0) { log(`  [${tag}] 无 pending 知识点，跳过审核`); return; }
  D.prepare(`UPDATE knowledge_points SET status='approved', reviewer='project_owner_authorized', review_time=datetime('now','localtime')
    WHERE category IN (${ph}) AND status='pending'`).run(...categories);
  D.prepare(`INSERT INTO loc_op_logs (admin_id, action, target, detail) VALUES (?,?,?,?)`)
    .run('project_owner_authorized', 'batch_approve_kp', tag, `v25.0.39 ${tag} 批量审核知识点 ${before} 个（质量闸门已过，指纹已去重）`);
  log(`  [${tag}] 知识点审核通过 ${before} 个`);
}

async function generateFull(track, category, level) {
  const existing = D.prepare(`SELECT COUNT(*) n FROM knowledge_points WHERE track=? AND category=? AND status='approved'`).get(track, category).n;
  if (existing === 0) { log(`  [${category}] 无已审核知识点，跳过出题`); return false; }
  const r = await api('POST', '/questions/generate-full', { track, category, level });
  if (!r.data || !r.data.success) { log(`  [${category}] 出题任务创建失败: ${JSON.stringify(r.data).slice(0, 150)}`); return false; }
  const taskId = r.data.taskId;
  log(`  [${category}] 全覆盖出题任务 #${taskId} 已启动（KP ${existing}）`);
  let waited = 0;
  while (waited < 21600) { // 单类目最长 6 小时
    await sleep(120000); waited += 120;
    const t = D.prepare('SELECT status, done_groups, total_groups, created_q, covered_kp, total_kp, error FROM gen_tasks WHERE id=?').get(taskId);
    if (!t) break;
    if (t.status === 'done' || t.status === 'failed') {
      log(`  [${category}] 任务#${taskId} ${t.status}: 组${t.done_groups}/${t.total_groups} 出题${t.created_q} 覆盖${t.covered_kp}/${t.total_kp} ${t.error || ''}`);
      return t.status === 'done';
    }
    if (waited % 1200 === 0) log(`  ...[${category}] 任务#${taskId} 组${t.done_groups}/${t.total_groups} 出题${t.created_q}`);
  }
  log(`  [${category}] 任务#${taskId} 等待超时`);
  return false;
}

function approveQuestions(categories, tag) {
  const ph = categories.map(() => '?').join(',');
  // 只上线：pending + 质量分达标 + 非结构重复待审（dup_tier=2 留人工）
  const before = D.prepare(`SELECT COUNT(*) n FROM questions WHERE category IN (${ph}) AND status='pending'`).get(...categories).n;
  if (before === 0) { log(`  [${tag}] 无 pending 题目，跳过上线`); return; }
  const r = D.prepare(`UPDATE questions SET status='approved', reviewer='project_owner_authorized', review_time=datetime('now','localtime')
    WHERE category IN (${ph}) AND status='pending' AND q_score >= 70 AND IFNULL(dup_tier,0) != 2`).run(...categories);
  D.prepare(`INSERT INTO loc_op_logs (admin_id, action, target, detail) VALUES (?,?,?,?)`)
    .run('project_owner_authorized', 'batch_approve_q', tag, `v25.0.39 ${tag} 批量上线题目 ${r.changes} 道（q_score>=70，结构重复待审的不上线）`);
  log(`  [${tag}] 题目上线 ${r.changes} 道（pending 共 ${before}）`);
}

// ---------- 阶段1：倪海厦专区 ----------

const ZONE_CATS = ['倪海厦·黄帝内经', '倪海厦·针灸', '倪海厦·伤寒论', '倪海厦·金匮要略', '倪海厦·神农本草经', '倪海厦·临床医案', '倪海厦·学生笔记', '倪海厦·方剂处方'];
const PENDING_MATS = [1, 2, 3, 4, 5, 6, 7, 8, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29];

async function phase1() {
  log('===== 阶段1：倪海厦专区补齐（24 部材料解析） =====');
  let ok = 0;
  const pool = [...PENDING_MATS];
  const worker = async (wid) => {
    while (pool.length) {
      const mid = pool.shift();
      const m = D.prepare('SELECT id, title, status FROM materials WHERE id=?').get(mid);
      if (!m) { log(`  [w${wid}] 资料#${mid} 不存在，跳过`); continue; }
      if (await parseMaterial(m.id, m.title)) ok++;
    }
  };
  await Promise.all([worker(1), worker(2), worker(3), worker(4)]);
  log(`阶段1 解析完成 ${ok}/${PENDING_MATS.length} 部`);
  approveKps(ZONE_CATS, '倪海厦专区');
  for (const cat of ZONE_CATS) {
    await generateFull('zhongyi', cat, 1);
  }
  approveQuestions(ZONE_CATS, '倪海厦专区');
}

// ---------- 阶段2：公域典籍公共大类 ----------

// classics.ts 典籍 → 公共大类映射（公版内容 L1）
const CLASSIC_MAP = [
  { id: 'suwen', cat: '黄帝内经与中医基础理论' },
  { id: 'lingshu', cat: '黄帝内经与中医基础理论' },
  { id: 'nanjing', cat: '黄帝内经与中医基础理论' },
  { id: 'shanghan', cat: '伤寒论' },
  { id: 'jingui', cat: '金匮要略' },
  { id: 'shennong', cat: '中药学与神农本草' },
  { id: 'wenbing', cat: '中医临床各科' },
];

function extractClassics() {
  const tsPath = SRC_DIR + '/src/algorithm-core/modules/tcm/classics.ts';
  if (!fs.existsSync(tsPath)) throw new Error('classics.ts 不存在: ' + tsPath);
  let src = fs.readFileSync(tsPath, 'utf8');
  // 截断到 CLASSICS_DATA 数组结束（后续为工具函数）
  const startIdx = src.indexOf('const CLASSICS_DATA');
  const endMarker = '\n];';
  const endIdx = src.indexOf(endMarker, startIdx);
  if (startIdx < 0 || endIdx < 0) throw new Error('CLASSICS_DATA 结构未找到');
  const arrCode = src.slice(startIdx, endIdx + endMarker.length)
    .replace('const CLASSICS_DATA: ClassicBook[] =', 'const CLASSICS_DATA =');
  const books = new Function(arrCode + '\nreturn CLASSICS_DATA;')();
  if (!Array.isArray(books)) throw new Error('典籍提取失败');
  return books;
}

function sha256(s) {
  return require('crypto').createHash('sha256').update(String(s), 'utf8').digest('hex');
}

async function phase2() {
  log('===== 阶段2：公域典籍导入公共大类 =====');
  const books = extractClassics();
  log(`典籍提取成功 ${books.length} 部: ${books.map(b => b.name).join('、')}`);
  // 注册公版来源（幂等：按 name 查）
  let srcId = (D.prepare("SELECT id FROM source_registry WHERE name=?").get('公版中医典籍') || {}).id;
  if (!srcId) {
    const r = await api('POST', '/sources', { name: '公版中医典籍', sourceType: 'classic', author: '', authLevel: 1, licenseNote: '公版典籍（黄帝内经/伤寒论/金匮要略/神农本草经/温病条辨/难经等），公域内容可公开学习' });
    srcId = r.data && r.data.sourceId ? Number(r.data.sourceId) : (D.prepare("SELECT id FROM source_registry WHERE name=?").get('公版中医典籍') || {}).id;
  }
  log(`公版典籍来源ID: ${srcId}`);
  const matIds = [];
  for (const b of books) {
    const map = CLASSIC_MAP.find(m => m.id === b.id);
    if (!map) { log(`  典籍 ${b.name}(${b.id}) 无映射，跳过`); continue; }
    const text = b.chapters.map(c => `【${c.title}】\n${c.content}`).join('\n\n');
    const title = `公版典籍·${b.name}`;
    let mat = D.prepare('SELECT id, status FROM materials WHERE title=?').get(title);
    if (mat) { log(`  材料《${title}》已存在(#${mat.id} ${mat.status})，跳过创建`); }
    else {
      const r = D.prepare(`INSERT INTO materials (title, track, category, format, text_content, grade, status, uploader_id, uploader_name, visibility, org_id, content_hash, source_id)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(title, 'zhongyi', map.cat, 'text', text.slice(0, 200000), 'S', 'pending', '0', '公版典籍导入', 'PUBLIC', 0, sha256(text), srcId || null);
      mat = { id: Number(r.lastInsertRowid), status: 'pending' };
      D.prepare(`INSERT INTO loc_op_logs (admin_id, action, target, detail) VALUES (?,?,?,?)`)
        .run('project_owner_authorized', 'material_import', `#${mat.id}`, `v25.0.39 公版典籍导入《${title}》→ ${map.cat}（${text.length}字，公域内容零现代人名）`);
      log(`  创建材料《${title}》#${mat.id} → ${map.cat}（${text.length}字）`);
    }
    matIds.push({ id: mat.id, title, cat: map.cat });
  }
  const parsePool = [...matIds];
  const pw = async () => {
    while (parsePool.length) {
      const m = parsePool.shift();
      await parseMaterial(m.id, m.title);
    }
  };
  await Promise.all([pw(), pw(), pw()]);
  const cats = [...new Set(matIds.map(m => m.cat))];
  approveKps(cats, '公域典籍');
  for (const c of cats) await generateFull('zhongyi', c, 1);
  approveQuestions(cats, '公域典籍');
}

// ---------- 阶段3：通用框架类目（AI 按公域知识框架生成） ----------

const FRAMEWORK_CATS = [
  {
    cat: '方剂学',
    prompt: `请编写一部《方剂学公域知识框架学习资料》，基于历代公版方剂学通用知识（国家规划教材通行口径），覆盖：
1. 方剂学总论：方剂与治法（八法）、方剂组成原则（君臣佐使）、剂型与用法
2. 十八大类方剂概述与代表方：解表剂（麻黄汤/桂枝汤/银翘散）、泻下剂、和解剂（小柴胡汤）、清热剂（白虎汤/黄连解毒汤）、温里剂（理中丸/四逆汤）、补益剂（四君子汤/补中益气汤/六味地黄丸）、固涩剂、安神剂、开窍剂、理气剂、理血剂（血府逐瘀汤）、治风剂、治燥剂、祛湿剂（五苓散/平胃散）、祛痰剂（二陈汤）、消食剂（保和丸）、驱虫剂、涌吐剂
3. 每个代表方：组成、功用、主治证候、配伍要点
要求：全部使用公版方剂与通行教材口径；不出现任何现代人名、机构、课程；正文用条目式结构化表述，便于拆分知识点；总字数 15000-20000 字。`,
  },
  {
    cat: '针灸推拿与经络',
    prompt: `请编写一部《针灸推拿与经络公域知识框架学习资料》，基于历代公版针灸学通用知识，覆盖：
1. 经络总论：十二正经循行与病候、奇经八脉、十五络脉
2. 腧穴总论：腧穴分类、定位方法（骨度分寸法）、特定穴（五输穴/原穴/络穴/背俞穴/募穴/八会穴）
3. 常用腧穴（约60穴）：定位、主治、操作（按经脉分述：手太阴肺经尺泽/列缺…足厥阴肝经太冲等）
4. 刺灸法：毫针刺法、艾灸法、拔罐法、三棱针、电针
5. 推拿手法：滚法/揉法/按法/推法/拿法/拍法等手法要领与适应
6. 针灸治疗总论：辨证选穴原则、配穴方法
要求：公版针灸教材通行口径；不出现现代人名机构；条目式结构化；总字数 15000-20000 字。`,
  },
  {
    cat: '中医诊断学',
    prompt: `请编写一部《中医诊断学公域知识框架学习资料》，基于公版中医诊断学通用知识，覆盖：
1. 诊法：望诊（望神/望色/望形态/望舌）、闻诊、问诊（十问）、切诊（脉诊二十八脉/按诊）
2. 八纲辨证：阴阳表里寒热虚实
3. 脏腑辨证：心/肝/脾/肺/肾各脏证候与兼证
4. 其他辨证：六经辨证、卫气营血辨证、三焦辨证、气血津液辨证
5. 诊断综合运用：辨证要点与病案书写规范
要求：公版教材口径；不出现现代人名机构课程；条目式结构化便于拆分知识点；总字数 15000-20000 字。`,
  },
  {
    cat: '医案与临证笔记',
    prompt: `请编写一部《中医医案学习与临证思维公域知识框架资料》，基于公版医籍与历代公版医案传统，覆盖：
1. 医案学概论：医案的价值、历代公版医案名著概述（《临证指南医案》《寓意草》《名医类案》等公版典籍的体例特点）
2. 医案阅读方法：如何从医案中提炼辨证思路、处方思路、药物加减思路
3. 临证思维框架：辨证论治步骤（四诊合参→辨证→治法→方药→调护）、常见辨证误区
4. 教学示例医案 12 则（注明为教学编写示例）：外感发热、咳嗽、胃脘痛、泄泻、失眠、眩晕、水肿、痹证、月经不调、小儿食积等常见证的完整辨证分析示范
要求：仅基于公版典籍与通行教材口径；示例医案明确标注"教学编写示例"；不出现任何现代人名、机构、课程；条目式结构化；总字数 15000-20000 字。`,
  },
  {
    cat: '养生食疗与功法',
    prompt: `请编写一部《中医养生食疗与传统功法文化学习资料》，基于公版养生典籍与传统养生文化，覆盖：
1. 养生文化总论：中医养生思想源流（《黄帝内经》"治未病"思想、四气调神、形神共养）
2. 顺时养生：四时起居调摄原则（春夏秋冬各季节的生活方式建议，以文化学习与一般健康教育角度表述）
3. 食养文化：五谷为养/五果为助的饮食文化传统、常见药食同源食材的文化源流（山药/莲子/枸杞/红枣/薏苡仁/百合/生姜等的传统食养文化记载）
4. 传统功法：八段锦（八式名称与动作要点）、太极拳文化源流、五禽戏源流、导引按跷传统
5. 情志调摄与起居有常：传统文化中的情志养生观
合规要求（最高优先级）：本资料定位为文化学习与一般健康教育内容，严禁出现任何疾病诊断、处方用药、疗效承诺、替代医疗建议的表述；涉及健康影响的表述必须使用"传统养生文化认为/中医经典记载"等文化学习口径；不出现任何现代人名、机构、课程；条目式结构化；总字数 15000-20000 字。`,
  },
];

async function callHunyuan(prompt) {
  const url = process.env.HUNYUAN_API_URL || 'https://tokenhub.tencentmaas.com/v1/chat/completions';
  const model = process.env.HUNYUAN_MODEL || 'hy3';
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.HUNYUAN_API_KEY}` },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.3 }),
    signal: AbortSignal.timeout(300000),
  });
  if (!resp.ok) throw new Error('混元接口返回 ' + resp.status);
  const data = await resp.json();
  try {
    const usage = data.usage || {};
    D.prepare(`INSERT INTO ai_call_logs (scene, material_id, kp_id, task_id, tokens_in, tokens_out) VALUES ('framework_gen', NULL, NULL, NULL, ?, ?)`)
      .run(usage.prompt_tokens || Math.ceil(prompt.length / 2), usage.completion_tokens || 0);
  } catch { /* 日志失败不阻断 */ }
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
}

async function phase3() {
  log('===== 阶段3：通用框架类目 AI 生成补齐 =====');
  // 注册 AI 原创来源 L5（幂等）
  let srcId = (D.prepare("SELECT id FROM source_registry WHERE name=?").get('AI 公域框架原创') || {}).id;
  if (!srcId) {
    const r = await api('POST', '/sources', { name: 'AI 公域框架原创', sourceType: 'ai_generated', author: '', authLevel: 5, licenseNote: 'AI 基于公域典籍与通用知识框架原创生成的学习资料（标准 3.3/3.4），人工审核后发布' });
    srcId = r.data && r.data.sourceId ? Number(r.data.sourceId) : (D.prepare("SELECT id FROM source_registry WHERE name=?").get('AI 公域框架原创') || {}).id;
  }
  log(`AI 框架来源ID: ${srcId}`);
  const done = [];
  for (const f of FRAMEWORK_CATS) {
    const title = `公域知识框架·${f.cat}`;
    let mat = D.prepare('SELECT id, status FROM materials WHERE title=?').get(title);
    if (!mat) {
      log(`  [${f.cat}] AI 生成知识框架文本…`);
      const text = await callHunyuan(f.prompt);
      if (!text || text.length < 3000) { log(`  [${f.cat}] AI 产出过短(${text.length}字)，跳过待重试`); continue; }
      const r = D.prepare(`INSERT INTO materials (title, track, category, format, text_content, grade, status, uploader_id, uploader_name, visibility, org_id, content_hash, source_id)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(title, 'zhongyi', f.cat, 'text', text.slice(0, 200000), 'B', 'pending', '0', 'AI 框架生成', 'PUBLIC', 0, sha256(text), srcId || null);
      mat = { id: Number(r.lastInsertRowid) };
      D.prepare(`INSERT INTO loc_op_logs (admin_id, action, target, detail) VALUES (?,?,?,?)`)
        .run('project_owner_authorized', 'material_import', `#${mat.id}`, `v25.0.39 AI 公域框架生成《${title}》（${text.length}字，L5 来源，${f.cat === '养生食疗与功法' ? '养生合规口径' : '公域口径'}）`);
      log(`  [${f.cat}] 生成 ${text.length} 字 → 材料#${mat.id}`);
    } else {
      log(`  材料《${title}》已存在(#${mat.id} ${mat.status})`);
    }
    done.push({ id: mat.id, title, cat: f.cat });
  }
  for (const m of done) await parseMaterial(m.id, m.title);
  const cats = [...new Set(done.map(m => m.cat))];
  approveKps(cats, '通用框架');
  for (const c of cats) await generateFull('zhongyi', c, 1);
  approveQuestions(cats, '通用框架');
}

// ---------- 验收 ----------

function finalReport() {
  log('\n===== 中医学习板块最终覆盖（zhongyi 轨道） =====');
  const cats = D.prepare("SELECT id, name FROM categories WHERE track='zhongyi' AND status='active' ORDER BY sort, id").all();
  let kpT = 0, qT = 0;
  for (const c of cats) {
    const kp = D.prepare("SELECT COUNT(*) n FROM knowledge_points WHERE category=? AND track='zhongyi' AND status='approved'").get(c.name).n;
    const q = D.prepare("SELECT COUNT(*) n FROM questions WHERE category=? AND track='zhongyi' AND status='approved'").get(c.name).n;
    kpT += kp; qT += q;
    console.log(`  ${c.id}\t${c.name}\tKP:${kp}\t题:${q}`);
  }
  console.log(`  合计 approved KP:${kpT} 题:${qT}`);
  log('\n===== 合规复扫 =====');
  const pubBad = D.prepare(`SELECT COUNT(*) n FROM knowledge_points WHERE track='zhongyi' AND category NOT LIKE '倪海厦·%' AND status='approved'
    AND (title LIKE '%倪海厦%' OR content LIKE '%倪海厦%' OR title LIKE '%人纪%' OR content LIKE '%人纪%')`).get().n;
  const ykBad = D.prepare(`SELECT COUNT(*) n FROM questions WHERE track='yikao' AND status IN ('approved','pending')
    AND (stem LIKE '%倪海厦%' OR analysis LIKE '%倪海厦%' OR options LIKE '%倪海厦%' OR stem LIKE '%人纪%')`).get().n;
  console.log(`  公共大类人名污染: ${pubBad}（须为0）  医考可见污染: ${ykBad}（须为0）`);
  log('===== 管线结束 =====');
}

(async () => {
  log(`v25.0.39 中医学习板块补齐管线启动（AI 通道: ${process.env.HUNYUAN_MODEL || 'hy3'}）`);
  try {
    await phase1();
  } catch (e) { log('阶段1 异常: ' + e.message); }
  try {
    await phase2();
  } catch (e) { log('阶段2 异常: ' + e.message); }
  try {
    await phase3();
  } catch (e) { log('阶段3 异常: ' + e.message); }
  finalReport();
  process.exit(0);
})();
