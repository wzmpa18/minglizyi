// ============================================================================
// ai_phase1_test.js — AI Phase 1 隔离测试（禁止真实调用昂贵模型 / 真实用户）
// ============================================================================
// 指令：P0-PRODUCTION-SEAL-AND-AI-COST-PHASE1-03 第五十四~五十五章
// 运行方式（服务器，隔离 DB + 隔离 policy 文件，永不触碰生产库）：
//   node ai_phase1_test.js
// 覆盖：
//   1) AI_USAGE_POLICY 档位额度（basic 3 / monthly·quarterly 50 / yearly·lifetime 无限）
//   2) 历史无限权益保护（yearly/lifetime 禁止改为有限额度）
//   3) policyVersion 变更必须 bump（且不改变受保护档位）
//   4) 成本估算（KNOWN → ESTIMATED；UNKNOWN 模型 → UNKNOWN，禁止伪造）
//   5) 配额 DB 裁决：basic 3 次/日、monthly 50 次/日、yearly/lifetime 无限
// ============================================================================
'use strict';

// ---- 隔离环境（必须在 require 之前设置）----
const os = require('os');
const path = require('path');
const fs = require('fs');
const TMP_DIR = path.join(os.tmpdir(), 'yandao-ai-phase1-' + Date.now());
fs.mkdirSync(TMP_DIR, { recursive: true });

process.env.DB_PATH = path.join(TMP_DIR, 'users.db');
process.env.AI_POLICY_FILE = path.join(TMP_DIR, 'ai-usage-policy.json');
process.env.AI_PRICING_FILE = path.join(TMP_DIR, 'ai-pricing.json');
process.env.JWT_SECRET = 'ai-phase1-test-secret-0123456789abcdef-32chars';

const policy = require('./aiUsagePolicy');
const auth = require('./middleware/auth');

// ---- 准备隔离用户表 ----
const Database = require('better-sqlite3');
const db = new Database(process.env.DB_PATH);
db.exec(`CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  member_level TEXT DEFAULT 'basic',
  membership_expiry TEXT
)`);
const future = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
const USERS = [
  ['u_basic', 'basic'],
  ['u_monthly', 'monthly'],
  ['u_quarterly', 'quarterly'],
  ['u_yearly', 'yearly'],
  ['u_lifetime', 'lifetime'],
];
for (const [id, lvl] of USERS) {
  db.prepare('INSERT OR REPLACE INTO users (user_id, member_level, membership_expiry) VALUES (?,?,?)')
    .run(id, lvl, lvl === 'lifetime' ? null : future);
}

// ---- 断言辅助 ----
let pass = 0;
let fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.error('  FAIL  ' + name + (extra ? '  => ' + extra : '')); }
}
function eq(actual, expected, name) {
  ok(actual === expected, name, `actual=${String(actual)} expected=${String(expected)}`);
}

console.log('=== 1) AI_USAGE_POLICY 档位额度 ===');
eq(policy.getUsagePolicy('basic').dailyRequests, 3, 'basic 每日 3 次');
eq(policy.getUsagePolicy('monthly').dailyRequests, 50, 'monthly 每日 50 次');
eq(policy.getUsagePolicy('quarterly').dailyRequests, 50, 'quarterly 每日 50 次');
eq(policy.getUsagePolicy('yearly').dailyRequests, -1, 'yearly 无限（-1）');
eq(policy.getUsagePolicy('lifetime').dailyRequests, -1, 'lifetime 无限（-1）');
ok(policy.isLegacyUnlimited('yearly'), 'yearly 为 LEGACY_UNLIMITED_PROTECTED');
ok(policy.isLegacyUnlimited('lifetime'), 'lifetime 为 LEGACY_UNLIMITED_PROTECTED');
ok(!policy.isLegacyUnlimited('basic'), 'basic 非无限');

console.log('=== 2) Fair Use 安全限流字段 ===');
eq(policy.getUsagePolicy('basic').maxConcurrent, 1, 'basic 并发=1');
ok(policy.getUsagePolicy('basic').maxInputChars >= 12000, '输入上限 ≥ 12000 字符', JSON.stringify(policy.getUsagePolicy('basic').maxInputChars));
ok(policy.getUsagePolicy('basic').maxOutputTokens >= 8192, '输出上限 ≥ 8192 tokens');
ok(policy.getUsagePolicy('yearly').maxConcurrent === 1, 'yearly 无限也设并发=1（Fair Use）');

console.log('=== 3) 历史无限权益保护（禁止改为有限）===');
let r = policy.updatePolicy({ tiers: { yearly: { dailyRequests: 10 } } });
ok(r.ok === false, '拒绝将 yearly 改为 10 次/日', JSON.stringify(r));
r = policy.updatePolicy({ tiers: { lifetime: { monthlyRequests: 100 } } });
ok(r.ok === false, '拒绝将 lifetime 改为 100 次/月', JSON.stringify(r));
ok(policy.isLegacyUnlimited('yearly'), 'yearly 拒绝后仍为无限');
ok(policy.isLegacyUnlimited('lifetime'), 'lifetime 拒绝后仍为无限');

console.log('=== 4) policyVersion 变更必须 bump ===');
const v0 = policy.getPolicyVersion();
r = policy.updatePolicy({ tiers: { basic: { maxConcurrent: 2 } } });
ok(r.ok === true, '调整 basic 并发允许成功', JSON.stringify(r));
ok(r.policyVersion !== v0, 'policyVersion 已 bump', `v0=${v0} new=${r && r.policyVersion}`);
eq(policy.getUsagePolicy('basic').dailyRequests, 3, 'basic 日均次数在 bump 后不变');

console.log('=== 5) 成本估算（可配置价格表，不硬编码）===');
const est = policy.estimateCost('deepseek-chat', 1000, 500);
eq(est.estimatedCost, 0.002, 'deepseek 1000in/500out 成本估算', JSON.stringify(est));
eq(est.costSource, 'ESTIMATED', '默认成本标记 ESTIMATED');
const unk = policy.estimateCost('nonexistent-model', 100, 50);
eq(unk.costSource, 'UNKNOWN', '未知模型标记 UNKNOWN（禁止伪造）');
ok(unk.estimatedCost === null, '未知模型成本为 null');

console.log('=== 6) 配额 DB 裁决（隔离库，绝不真实调用模型）===');
// basic：3 次/日
for (let i = 0; i < 3; i++) auth.consumeAIQuotaInDB('u_basic');
let q = auth.getAIQuotaFromDB('u_basic');
eq(q.dailyUsed, 3, 'basic 消费 3 次后 dailyUsed=3');
eq(q.dailyLimit, 3, 'basic dailyLimit=3');
ok(q.dailyUsed >= q.dailyLimit, 'basic 第 4 次将被拒绝（dailyUsed>=limit）');

// monthly：50 次/日
for (let i = 0; i < 50; i++) auth.consumeAIQuotaInDB('u_monthly');
q = auth.getAIQuotaFromDB('u_monthly');
eq(q.dailyUsed, 50, 'monthly 消费 50 次后 dailyUsed=50');
eq(q.dailyLimit, 50, 'monthly dailyLimit=50');
ok(q.dailyUsed >= q.dailyLimit, 'monthly 第 51 次将被拒绝');

// quarterly：50 次/日
q = auth.getAIQuotaFromDB('u_quarterly');
eq(q.dailyLimit, 50, 'quarterly dailyLimit=50');

// yearly/lifetime：无限
q = auth.getAIQuotaFromDB('u_yearly');
eq(q.dailyLimit, Infinity, 'yearly dailyLimit=Infinity');
q = auth.getAIQuotaFromDB('u_lifetime');
eq(q.dailyLimit, Infinity, 'lifetime dailyLimit=Infinity');

// 模拟失败请求不扣额度：当前成功扣减仅发生在内容非空的成功路径（server.js），
// 本测试仅验证「未调用 consumeAIQuotaInDB 则 dailyUsed 不变」这一不变量。
q = auth.getAIQuotaFromDB('u_basic');
const beforeFail = q.dailyUsed;
eq(beforeFail, 3, '失败请求前 basic dailyUsed=3（未额外扣减）');

console.log('=== 清理隔离文件 ===');
try { db.close(); } catch (e) {}
try { fs.rmSync(TMP_DIR, { recursive: true, force: true }); } catch (e) {}

console.log(`\n=== AI Phase 1 测试结果：${pass} PASS / ${fail} FAIL ===`);
process.exit(fail === 0 ? 0 : 1);