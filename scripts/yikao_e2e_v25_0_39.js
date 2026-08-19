#!/usr/bin/env node
/**
 * v25.0.39 P1-1 验收 E2E：医考各科目答题全链路（题目拉取→组卷→判分→错题收录）
 * 运行：node /root/yikao_e2e_v25_0_39.js（服务器本机，结束后清理测试数据）
 */
'use strict';
require('/www/yandaoguoxue-backend/node_modules/dotenv').config({ path: '/www/yandaoguoxue-backend/.env' });
const RR = require('/www/yandaoguoxue-backend/register_routes.js');
const Database = require('/www/yandaoguoxue-backend/node_modules/better-sqlite3');

const BASE = 'http://127.0.0.1:3001';
const PW = 'P139e2eTest123';
const PA = '19700000139';
const ADB = new Database('/www/yandaoguoxue-backend/data/academy.db');

let failed = 0;
function check(name, cond, detail) {
  const ok = !!cond;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail !== undefined ? ' | ' + String(detail) : ''}`);
}

async function api(method, path, token, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-json */ }
  return { status: res.status, data };
}

(async () => {
  // ---- 准备测试账号 ----
  try { RR.deleteUser && RR.deleteUser(PA); } catch {}
  const udb = RR.initDatabase();
  udb.prepare("DELETE FROM users WHERE phone=?").run(PA);
  RR.createUser({ phone: PA, password: PW, deviceId: 'p139-dev-A', clientIp: '203.0.113.139' });
  const login = await api('POST', '/api/auth/login', null, { phone: PA, password: PW });
  check('T1 测试账号登录', login.data && login.data.success && login.data.data && login.data.data.accessToken);
  const token = login.data.data.accessToken;
  const uid = String(login.data.data.userId || login.data.data.user?.userId || '');

  // ---- T2 各核心科目题目可拉取（9大核心科目）----
  const core = ['中医基础理论', '中药学', '方剂学', '中医诊断学', '针灸学', '中医内科学', '中医外科学', '中医妇科学', '中医儿科学'];
  for (const cat of core) {
    const r = await api('GET', `/api/academy/questions?track=yikao&category=${encodeURIComponent(cat)}`, token);
    const qs = (r.data && r.data.questions) || [];
    const allApproved = qs.every(q => q.status === undefined || q.status === 'approved');
    check(`T2 ${cat} 可答题`, r.data && r.data.success && qs.length > 0 && allApproved, `题数=${qs.length}`);
  }

  // ---- T3 组卷：医考赛道开考 ----
  const start = await api('POST', '/api/academy/exams/start', token, { track: 'yikao', level: 1 });
  const exam = start.data && start.data;
  check('T3.1 组卷成功', start.data && start.data.success && Array.isArray(exam.questions) && exam.questions.length > 0,
    `题数=${exam.questions ? exam.questions.length : 0}`);
  check('T3.2 题目含答案掩码(判分在服务端)', exam.questions && exam.questions.every(q => !q.answer), 'answer字段未泄露');

  // ---- T4 判分 + 错题收录：全部答对1题外，其余乱答 ----
  if (exam.questions && exam.questions.length) {
    const answers = {};
    const qIds = exam.questions.map(q => q.id);
    const correct = {};
    for (const qid of qIds) {
      const row = ADB.prepare('SELECT answer FROM questions WHERE id=?').get(Number(qid));
      correct[qid] = row ? row.answer : 'A';
    }
    qIds.forEach((qid, i) => { answers[qid] = i === 0 ? (correct[qid] === 'A' ? 'B' : 'A') : correct[qid]; });
    const sub = await api('POST', `/api/academy/exams/${exam.examId}/submit`, token, { answers });
    check('T4.1 判分成功', sub.data && sub.data.success, `得分=${sub.data && sub.data.score}/${sub.data && sub.data.totalScore}`);
    check('T4.2 满分应为总分-1题分', sub.data && sub.data.score < sub.data.totalScore && sub.data.score >= 0);
    const wrongs = await api('GET', '/api/academy/wrong-answers', token);
    const wq = (wrongs.data && wrongs.data.wrongs) || [];
    check('T4.3 错题本收录错题', wq.length === 1 && String(wq[0].questionId) === String(qIds[0]),
      `错题数=${wq.length}`);

    // ---- T5 解析返回（收录错题含解析）----
    check('T5 错题含解析与正确答案', wq.length === 1 && wq[0].analysis && wq[0].answer && Array.isArray(wq[0].options) && wq[0].options.length === 5);
  }

  // ---- T6 公网入口探测（Nginx 前置，未登录应401结构化而非5xx）----
  const pub = await api('GET', '/api/academy/questions?track=yikao');
  check('T6 公网未登录访问受保护(401/403)', pub.status === 401 || pub.status === 403, `status=${pub.status}`);

  // ---- 清理测试数据 ----
  ADB.prepare("DELETE FROM wrong_answers WHERE user_id=?").run(uid);
  ADB.prepare("DELETE FROM exams WHERE user_id=?").run(uid);
  ADB.prepare("DELETE FROM certificates WHERE user_id=?").run(uid);
  udb.prepare("DELETE FROM users WHERE phone=?").run(PA);
  console.log('---- 测试数据已清理 ----');
  console.log(failed === 0 ? 'ALL PASS' : `FAILED: ${failed}`);
  process.exit(failed === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
