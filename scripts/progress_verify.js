#!/usr/bin/env node
// v25.0.21: 公网验证学习进度闭环（打卡→查询）
'use strict';
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const sec = (env.match(/^JWT_SECRET=(.*)$/m) || [])[1] || 'yandao_default_jwt_secret_change_me';
const token = jwt.sign({ id: 'verify_v21', userId: 999, nickname: '验收测试', role: 'user' }, sec, { expiresIn: '2h' });
const BASE = 'https://yandaoguoxue.yandao.vip/api/academy';

(async () => {
  const r1 = await fetch(`${BASE}/progress/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ track: 'zhongyi', chapter: '神农本草经·上经' }),
  }).then(r => r.json());
  console.log('checkin:', JSON.stringify(r1));

  const r2 = await fetch(`${BASE}/progress?track=zhongyi`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
  console.log('progress:', JSON.stringify(r2));
})();
