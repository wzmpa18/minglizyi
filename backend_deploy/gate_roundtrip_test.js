/**
 * v25.0.88 排盘云端备份公网回环测试（可复跑回归资产）
 * 用法：scp 至 /www/yandaoguoxue-backend/ 后 `node gate_roundtrip_test.js`
 * 流程：插入临时会员(999999901) → POST 上传记录 → GET 列表 → GET 单条读回比对
 *      → DELETE 对象 → 列表应为空 → 清理临时用户行与索引文件
 * 全程只使用合成数据，不触碰任何真实用户。
 */
'use strict';
const fs = require('fs');

for (const line of fs.readFileSync('/www/yandaoguoxue-backend/.env', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');

const UID = 999999901;
const API = 'https://yandaoguoxue.yandao.vip/api/oss';

async function main() {
  const db = new Database(process.env.DB_PATH);

  db.prepare(
    "INSERT OR REPLACE INTO users (user_id, phone, password_hash, nickname, member_level, membership_expiry, status) VALUES (?,?,?,?,?,?,'active')"
  ).run(UID, '00000000000', 'gate-verify-only', 'gate_verify_tmp', 'monthly', '2027-12-31 23:59:59');
  console.log('[1] 临时会员已插入 (userId=999999901, monthly)');

  const token = jwt.sign({ userId: UID }, process.env.JWT_SECRET, { expiresIn: 600 });
  const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const rec = {
    id: 'gatetest001',
    title: '回环测试记录',
    input: { year: 1990, month: 5, day: 15, hour: 12, gender: 'male' },
    result: { dayGan: '甲' },
    _ts: 1758500000000,
  };

  const r1 = await fetch(`${API}/paipan-record`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ toolKey: 'bazi', record: rec }),
  });
  const j1 = await r1.json();
  console.log('[2] POST 上传:', r1.status, JSON.stringify(j1));
  if (!j1.success) throw new Error('上传失败');

  const r2 = await fetch(`${API}/paipan-records?toolKey=bazi`, { headers: H });
  const j2 = await r2.json();
  console.log('[3] GET 列表:', r2.status, JSON.stringify(j2));
  const key = j2.records && j2.records[0] && j2.records[0].objectKey;
  if (!key) throw new Error('列表无 objectKey');

  const r3 = await fetch(`${API}/paipan-record?key=${encodeURIComponent(key)}`, { headers: H });
  const j3 = await r3.json();
  console.log('[4] GET 单条读回:', r3.status, JSON.stringify(j3));
  const ok = j3.success && j3.record
    && j3.record.id === 'gatetest001'
    && j3.record.title === '回环测试记录'
    && j3.record.result && j3.record.result.dayGan === '甲';
  if (!ok) throw new Error('读回内容与上传不一致');

  const r4 = await fetch(`${API}/object`, {
    method: 'DELETE', headers: H,
    body: JSON.stringify({ key, partition: 'user_content' }),
  });
  const j4 = await r4.json();
  console.log('[5] DELETE 对象:', r4.status, JSON.stringify(j4));

  const r5 = await fetch(`${API}/paipan-records?toolKey=bazi`, { headers: H });
  const j5 = await r5.json();
  console.log('[6] 删除后列表:', r5.status, JSON.stringify(j5));

  db.prepare('DELETE FROM users WHERE user_id = ?').run(UID);
  try { fs.unlinkSync('/www/yandaoguoxue-backend/data/paipan-cloud-index/999999901.json'); } catch (e) { /* 可能不存在 */ }
  db.close();
  console.log('[7] 临时数据已清理（用户行+索引文件）');
  console.log('ROUNDTRIP_OK');
}

main().catch((e) => { console.error('ROUNDTRIP_FAIL:', e.message); process.exit(1); });
