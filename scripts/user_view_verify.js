#!/usr/bin/env node
// v25.0.21: 模拟登录用户视角，公网验证题库/知识点可见性
'use strict';
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const sec = (env.match(/^JWT_SECRET=(.*)$/m) || [])[1] || 'yandao_default_jwt_secret_change_me';
const token = jwt.sign({ id: 'verify_v21', userId: 999, nickname: '验收测试', role: 'user' }, sec, { expiresIn: '2h' });

const BASE = 'https://yandaoguoxue.yandao.vip/api/academy';

async function getJSON(p, params) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(`${BASE}${p}?${q}`, { headers: { Authorization: `Bearer ${token}` } });
  return r.json();
}

(async () => {
  console.log('=== [用户视角] 公网题库验证 ===');
  const cats = [
    ['zhongyi', '倪海厦·神农本草经'],
    ['zhongyi', '倪海厦·伤寒论'],
    ['yixue', '八字命理'], ['yixue', '奇门遁甲'], ['yixue', '小六壬'],
    ['yixue', '七政四余'], ['yixue', '易经推命'], ['yixue', '堪舆地脉'], ['yixue', '倪海厦·天纪人间道'],
  ];
  for (const [track, cat] of cats) {
    const d = await getJSON('/questions', { track, category: cat });
    const qs = d.questions || [];
    console.log(`  [${track}] ${cat}: ${qs.length} 题${qs.length ? ' | 例: ' + qs[0].stem.slice(0, 30) : ''}`);
  }

  console.log('=== [用户视角] 知识点可见性（approved） ===');
  const kp = await getJSON('/knowledge', { track: 'zhongyi', category: '倪海厦·神农本草经' });
  console.log(`  神农本草经知识点: ${(kp.points || []).length} 个`);
  const kp2 = await getJSON('/knowledge', { track: 'yixue', category: '八字命理' });
  console.log(`  八字命理知识点: ${(kp2.points || []).length} 个`);

  console.log('=== [用户视角] 三板块 tracks ===');
  const tr = await getJSON('/tracks', {});
  (tr.tracks || []).forEach(t => console.log(`  ${t.key}: ${t.name}`));
})();
