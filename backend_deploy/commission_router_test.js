// ============================================================================
// commission_router_test.js — COMMISSION_ROUTER 隔离测试
// 指令：FINAL-OPERATIONS-COMPLETION-MASTER-05（第十三章双身份全场景 + 第十四章守恒）
//   - 隔离 SQLite DB（不碰生产 users DB）
//   - fixture 订单模拟，Real Payment = 0
//   - 默认策略 PARTNER_NET_OF_REFERRAL（第四章项目方已决策）
//   - 覆盖：无推荐/L1/L1+L2/仅Partner/Partner=L1(双身份NET_OF_REFERRAL)/
//           Partner=L1+L2(双身份)/培养/全额退款/部分退款/重复支付回调/
//           重复退款回调/双身份refund/双身份partial refund/
//           REVIEW_REQUIRED兼容路径/rateSnapshot/金额守恒（整数分）
// ============================================================================
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const TEST_DB = path.join(os.tmpdir(), 'router_test_' + Date.now() + '_' + process.pid + '.db');
process.env.DB_PATH = TEST_DB; // 必须在 require 引擎前设置（引擎模块加载时固化 USERS_DB_PATH）
// Router 配置完全隔离到 tmp（避免读写运行目录 data/commission_router_config.json，
// 保证测试从 DEFAULT_CONFIG=PARTNER_NET_OF_REFERRAL/1.1.0 开始）
const TEST_ROUTER_DIR = path.join(os.tmpdir(), 'router_test_cfg_' + Date.now() + '_' + process.pid);
process.env.COMMISSION_ROUTER_DIR = TEST_ROUTER_DIR;

// 先创建合法 SQLite 文件（引擎 getDb 会 fs.existsSync 检查）
const Database = require('better-sqlite3');
{
  const init = new Database(TEST_DB);
  init.exec('CREATE TABLE IF NOT EXISTS __init(id INTEGER)');
  init.close();
}

const commissionEngine = require('./commissionEngine');
const partnerEngine = require('./partnerEngine');
const commissionRouter = require('./commissionRouter');

// ==================== 断言工具 ====================
let PASS = 0, FAIL = 0;
const failures = [];
function check(cond, name, extra) {
  if (cond) { PASS++; console.log('  PASS  ' + name); }
  else { FAIL++; failures.push(name); console.log('  FAIL  ' + name + (extra ? '  => ' + JSON.stringify(extra) : '')); }
}
function eq(actual, expected, name) {
  const okv = actual === expected;
  if (okv) { PASS++; console.log('  PASS  ' + name + ' = ' + JSON.stringify(actual)); }
  else { FAIL++; failures.push(name + ` (期望 ${JSON.stringify(expected)} 实际 ${JSON.stringify(actual)})`); console.log('  FAIL  ' + name + ` (期望 ${JSON.stringify(expected)} 实际 ${JSON.stringify(actual)})`); }
}

// ==================== fixture 构建 ====================
function setupFixtures() {
  const db = commissionEngine.getDb();   // 建 commission_accounts / commission_records / withdrawals
  partnerEngine.getDb();                 // 建 partners / partner_order_log / partner_settlements
  commissionRouter.ensureSchema();       // 建 commission_router_snapshots

  // 引擎只查询不创建的表：users + user_invite_relation
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY,
      invited_by INTEGER,
      deleted_at TEXT,
      member_level TEXT,
      invite_code TEXT
    );
    CREATE TABLE IF NOT EXISTS user_invite_relation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inviter_id INTEGER,
      invitee_id INTEGER,
      level INTEGER
    );
  `);

  const insUser = db.prepare('INSERT OR REPLACE INTO users (user_id, invited_by, deleted_at) VALUES (?, ?, NULL)');

  // 普通用户（无 invited_by，channel 由 user_invite_relation 之外另行指定）
  const plainUsers = [1000, 1001, 1002, 1003, 1004, 1005, 1006, 1100, 1101, 1102, 1103];
  for (const u of plainUsers) insUser.run(u, null);

  // 渠道归属：findChannelPartner 沿 users.invited_by 向上找最近 Partner
  // 场景4(仅Partner)：1003 channel=2200（L1 用 relation 指到普通 1103）
  insUser.run(1003, 2200);
  // 场景5(双身份·无L2)：1004 L1=2400 且 channel=2400（2400 无 inviter → 无 L2）
  insUser.run(1004, 2400);
  // 场景6(Partner+L1+L2)：1005 L1=2200 且 channel=2200（2200 有 inviter=1102）
  insUser.run(1005, 2200);
  // 场景7(培养)：1006 channel=2300（2300 上级 Partner=2200）
  insUser.run(1006, 2300);

  // Partner 本身也是真实注册用户（生产上 Partner 必是 users 表记录），
  // 否则 commissionEngine.inviterEligible 会误判 INVITER_NOT_FOUND。
  insUser.run(2200, null);
  insUser.run(2300, null);
  insUser.run(2400, null); // P3 独立：无 inviter（场景5 双身份·无 L2）

  // Partners
  const insPartner = db.prepare(`INSERT OR REPLACE INTO partners
    (user_id, real_name, contact, referrer_partner_id, status, level, applied_at)
    VALUES (?, ?, ?, ?, 'APPROVED', 'NORMAL', datetime('now'))`);
  insPartner.run(2200, 'P1顶级', 'p1@x', null);       // P1 无上级
  insPartner.run(2300, 'P2下级', 'p2@x', 2200);        // P2 上级=P1
  insPartner.run(2400, 'P3独立', 'p3@x', null);        // P3 无上级无 inviter

  // user_invite_relation（精确控制 L1/L2，与 users.invited_by 独立）
  const insRel = db.prepare('INSERT INTO user_invite_relation (inviter_id, invitee_id, level) VALUES (?, ?, ?)');
  insRel.run(1100, 1001, 1);   // 场景2：1001 L1=1100
  insRel.run(1101, 1002, 1);   // 场景3：1002 L1=1101
  insRel.run(1102, 1101, 1);   // 场景3：1101 L1=1102 → 1002 L2=1102
  insRel.run(1103, 1003, 1);   // 场景4：1003 L1=1103（普通）
  insRel.run(2400, 1004, 1);   // 场景5：1004 L1=2400（Partner）双身份·无 L2
  insRel.run(2200, 1005, 1);   // 场景6：1005 L1=2200（Partner）双身份
  insRel.run(1102, 2200, 1);   // 场景6：2200 L1=1102 → 1005 L2=1102
  insRel.run(1100, 1006, 1);   // 场景7：1006 L1=1100（普通）

  console.log('[fixture] 已就绪，DB=' + TEST_DB);
}

// 构造订单
function mkOrder(orderId, userId, amountYuan) {
  return { orderId, userId: String(userId), type: 'MEMBERSHIP', amount: amountYuan, title: '测试订单' };
}

// ==================== 场景执行 ====================
setupFixtures();

// 金额常数（100元=10000分）
// L1=15%→1500, L2=5%→500, fee=0.6%→60, aiCost=10%→1000, partner=50%net, nurture=5%net
// PARTNER_NET_OF_REFERRAL：net = gross - fee - aiCost - 普通佣金(L1+L2)

console.log('\n=== 0) 默认策略 = PARTNER_NET_OF_REFERRAL（第十章） ===');
{
  const cfg = commissionRouter.getConfig();
  eq(cfg.doubleIdentityPolicy, 'PARTNER_NET_OF_REFERRAL', '默认策略已切 PARTNER_NET_OF_REFERRAL');
  eq(cfg.formulaVersion, '1.1.0', 'formulaVersion=1.1.0');
  const parsed = JSON.parse(commissionRouter.buildRateSnapshot());
  eq(parsed.referralL1Percent, 15, 'rateSnapshot L1=15');
  eq(parsed.referralL2Percent, 5, 'rateSnapshot L2=5');
  eq(parsed.partnerPercent, 50, 'rateSnapshot Partner=50');
  eq(parsed.nurturePercent, 5, 'rateSnapshot nurture=5');
}

console.log('\n=== 1) 无推荐人（无 L1/L2/Partner） ===');
{
  const r = commissionRouter.processPaidOrder(mkOrder('T1', 1000, 100));
  eq(r.ok, true, '入账 ok');
  eq(r.doubleIdentity, false, '非双身份');
  eq(r.reviewRequired, false, '非 reviewRequired');
  eq(r.referral.granted, false, '无普通佣金');
  eq(r.partner.granted, false, '无 Partner 佣金');
  eq(r.conservation.ok, true, '金额守恒');
  const rec = commissionRouter.reconcileOrder('T1');
  eq(rec.ok, true, '对账一致');
}

console.log('\n=== 2) 只有 L1（无 Partner） ===');
{
  const r = commissionRouter.processPaidOrder(mkOrder('T2', 1001, 100));
  eq(r.ok, true, '入账 ok');
  eq(r.referral.granted, true, '普通佣金已入账');
  eq(r.referral.commissionCents, 1500, 'L1=15%');
  eq(r.referral.inviterId, 1100, 'L1 是 1100');
  eq(r.partner.granted, false, '无 Partner');
  eq(r.conservation.ok, true, '金额守恒');
}

console.log('\n=== 3) L1 + L2 ===');
{
  const r = commissionRouter.processPaidOrder(mkOrder('T3', 1002, 100));
  eq(r.referral.granted, true, '普通佣金已入账');
  eq(r.referral.commissionCents, 1500, 'L1=15%');
  eq(r.referral.level2CommissionCents, 500, 'L2=5%');
  eq(r.referral.inviterId, 1101, 'L1=1101');
  eq(r.referral.level2InviterId, 1102, 'L2=1102');
}

console.log('\n=== 4) 只有 Partner（L1 普通，channel 归 Partner） ===');
{
  const r = commissionRouter.processPaidOrder(mkOrder('T4', 1003, 100));
  eq(r.doubleIdentity, false, '非双身份（L1=1103 ≠ Partner=2200）');
  eq(r.referral.granted, true, '普通 L1 已入账');
  eq(r.referral.inviterId, 1103, 'L1=1103');
  eq(r.partner.granted, true, 'Partner 佣金已入账');
  eq(r.partner.partnerId, 2200, 'Partner=2200');
  eq(r.partner.commissionCents, 3720, 'Partner=7440净额×50%');
  eq(r.partner.netCents, 7440, '净额=7440');
  eq(r.conservation.ok, true, '金额守恒');
  // 守恒明细核对
  eq(r.conservation.breakdown.paymentFee, 60, '手续费=60');
  eq(r.conservation.breakdown.aiCost, 1000, 'AI成本=1000');
  eq(r.conservation.breakdown.referralL1, 1500, 'L1=1500');
  eq(r.conservation.breakdown.partner, 3720, 'partner=3720');
  eq(r.conservation.platformRevenueCents, 3720, '平台留存=3720');
}

console.log('\n=== 5) 双身份 Partner=L1（PARTNER_NET_OF_REFERRAL 核心口径） ===');
{
  const r = commissionRouter.processPaidOrder(mkOrder('T5', 1004, 100));
  eq(r.ok, true, '入账 ok');
  eq(r.doubleIdentity, true, '检测到双身份');
  eq(r.policy, 'PARTNER_NET_OF_REFERRAL', 'policy=PARTNER_NET_OF_REFERRAL');
  // 第五章：普通 L1 15% 正常计算（推荐人权益独立于 Partner）
  eq(r.referral.granted, true, '普通 L1 照发');
  eq(r.referral.inviterId, 2400, 'L1=2400（Partner 本人）');
  eq(r.referral.commissionCents, 1500, 'L1=1500 分（15%）');
  // Partner 侧：50% 基数先扣普通佣金（第五章 DISTRIBUTABLE_REVENUE）
  eq(r.partner.granted, true, 'Partner 已入账');
  eq(r.partner.netCents, 7440, '净额=10000-60-1000-1500=7440');
  eq(r.partner.commissionCents, 3720, 'Partner=7440×50%=3720');
  // 第六章反例：STACK 口径=8940×50%=4470；NET_OF_REFERRAL 严格少 750（=1500×50%）
  check(r.partner.commissionCents !== 4470, '非 STACK 双拿（3720≠4470）');
  eq(r.reviewRequired, false, '非 REVIEW_REQUIRED');
  eq(r.status, 'ESTIMATED', '快照状态 ESTIMATED（AI 成本口径）');
  eq(r.conservation.ok, true, '金额守恒');
  // 第十二章：formulaVersion / doubleIdentityPolicySnapshot / rateSnapshot
  const db = commissionRouter.getDb();
  const snap = db.prepare('SELECT * FROM commission_router_snapshots WHERE order_no = ?').get('T5');
  eq(snap.double_identity, 1, '快照 double_identity=1');
  eq(snap.double_identity_policy, 'PARTNER_NET_OF_REFERRAL', '快照 policySnapshot');
  eq(snap.formula_version, '1.1.0', '快照 formulaVersion');
  check(!!snap.rate_snapshot, '快照 rateSnapshot 非空');
  eq(JSON.parse(snap.rate_snapshot).partnerPercent, 50, 'rateSnapshot.partnerPercent=50');
  eq(snap.referral_l1_cents, 1500, '快照 L1=1500');
  eq(snap.partner_revenue_cents, 3720, '快照 partner=3720');
}

console.log('\n=== 6) 双身份 Partner=L1 + L2（L1+L2 均计入 normalReferralCost） ===');
{
  const r = commissionRouter.processPaidOrder(mkOrder('T6', 1005, 100));
  eq(r.doubleIdentity, true, '双身份');
  eq(r.policy, 'PARTNER_NET_OF_REFERRAL', 'policy');
  eq(r.referral.granted, true, '普通照发');
  eq(r.referral.commissionCents, 1500, 'L1=1500');
  eq(r.referral.level2CommissionCents, 500, 'L2=500（照发）');
  eq(r.referral.level2InviterId, 1102, 'L2=1102');
  eq(r.partner.granted, true, 'Partner 已入账');
  // 第七章：L1+L2 两项真实普通推广佣金都属于 normalReferralCost
  eq(r.partner.netCents, 6940, '净额=10000-60-1000-(1500+500)=6940');
  eq(r.partner.commissionCents, 3470, 'Partner=6940×50%=3470');
  eq(r.status, 'ESTIMATED', '状态 ESTIMATED');
  eq(r.conservation.ok, true, '金额守恒');
}

console.log('\n=== 7) Partner 培养关系（P2 下级，P1 上级收 5% nurture） ===');
{
  const r = commissionRouter.processPaidOrder(mkOrder('T7', 1006, 100));
  eq(r.doubleIdentity, false, '非双身份');
  eq(r.partner.granted, true, 'Partner 已入账');
  eq(r.partner.partnerId, 2300, 'channel=2300(P2)');
  eq(r.partner.nurtureInviterId, 2200, '培养奖励给上级 P1=2200');
  eq(r.partner.nurtureCents, 372, '培养=7440×5%=372');
  eq(r.partner.commissionCents, 3720, 'P2 佣金=3720');
  eq(r.conservation.ok, true, '金额守恒');
  eq(r.conservation.breakdown.nurture, 372, '快照 nurture=372');
}

console.log('\n=== 8) 全额退款冲正 ===');
{
  // T4 已入账（普通 + Partner）
  const r = commissionRouter.processRefund('T4');
  eq(r.ok, true, '退款冲正 ok');
  eq(r.referral.reversed, true, '普通佣金已冲正');
  eq(r.partner.reversed, true, 'Partner 佣金已冲正');
  // 快照状态应为 REVERSED（全额）
  const db = commissionRouter.getDb();
  const snap = db.prepare('SELECT status, refund_cents, gross_cents FROM commission_router_snapshots WHERE order_no = ?').get('T4');
  eq(snap.status, 'REVERSED', '快照状态 REVERSED');
  eq(snap.refund_cents >= snap.gross_cents, true, '全额退款金额=毛额');
}

console.log('\n=== 9) 部分退款冲正（按比例） ===');
{
  // T7 已入账（普通 + Partner + nurture）
  const r = commissionRouter.processRefund('T7', 50); // 退 50 元（一半）
  eq(r.ok, true, '部分退款 ok');
  eq(r.referral.reversed, true, '普通佣金按比例冲正');
  eq(r.partner.reversed, true, 'Partner 按比例冲正');
  const db = commissionRouter.getDb();
  const snap = db.prepare('SELECT status FROM commission_router_snapshots WHERE order_no = ?').get('T7');
  eq(snap.status, 'PARTIAL_REFUND', '快照状态 PARTIAL_REFUND');
}

console.log('\n=== 10) 双身份 + 全额退款（冲正双份） ===');
{
  const r = commissionRouter.processRefund('T5');
  eq(r.ok, true, '双身份全额退款 ok');
  eq(r.referral.reversed, true, '普通 L1 已冲正');
  eq(r.partner.reversed, true, 'Partner 已冲正');
  const db = commissionRouter.getDb();
  const snap = db.prepare('SELECT status FROM commission_router_snapshots WHERE order_no = ?').get('T5');
  eq(snap.status, 'REVERSED', '双身份快照 REVERSED');
}

console.log('\n=== 11) 双身份 + 部分退款 ===');
{
  const r = commissionRouter.processRefund('T6', 40);
  eq(r.ok, true, '双身份部分退款 ok');
  eq(r.referral.reversed, true, '普通 L1/L2 按比例冲正');
  eq(r.partner.reversed, true, 'Partner 按比例冲正');
  const db = commissionRouter.getDb();
  const snap = db.prepare('SELECT status FROM commission_router_snapshots WHERE order_no = ?').get('T6');
  eq(snap.status, 'PARTIAL_REFUND', '双身份快照 PARTIAL_REFUND');
}

console.log('\n=== 12) 重复支付回调（幂等） ===');
{
  const db = commissionRouter.getDb();
  const before = db.prepare("SELECT COUNT(*) c FROM commission_records WHERE order_no = 'T2'").get().c;
  const r = commissionRouter.processPaidOrder(mkOrder('T2', 1001, 100));
  eq(r.ok, false, '重复入账被拦截');
  eq(r.reason, 'DUPLICATE', 'reason=DUPLICATE');
  const after = db.prepare("SELECT COUNT(*) c FROM commission_records WHERE order_no = 'T2'").get().c;
  eq(before, after, '无重复佣金记录');
}

console.log('\n=== 13) 重复退款回调（幂等） ===');
{
  const r = commissionRouter.processRefund('T4');
  eq(r.ok, true, '重复退款 ok（幂等不报错）');
  const r2 = commissionEngine.reverseCommission('T4');
  eq(r2.reversed, false, '普通佣金重复冲正被拦（已冲正）');
}

console.log('\n=== 14) REVIEW_REQUIRED 兼容路径（历史待决策订单仍可处理） ===');
{
  // 配置切到 REVIEW_REQUIRED 模拟历史策略（不重算历史，仅影响新单）
  const cfg = commissionRouter.getConfig();
  commissionRouter.saveConfig({ ...cfg, doubleIdentityPolicy: 'REVIEW_REQUIRED' });
  const r = commissionRouter.processPaidOrder(mkOrder('T9', 1004, 100));
  eq(r.doubleIdentity, true, 'T9 双身份');
  eq(r.reviewRequired, true, 'REVIEW_REQUIRED 模式生效');
  eq(r.partner.granted, false, 'Partner 侧暂停');
  eq(r.referral.granted, true, '普通照发');
  const list = commissionRouter.listReviewRequired();
  eq(list.some(s => s.order_no === 'T9'), true, '待决策列表含 T9');
  const rec = commissionRouter.reconcileOrder('T9');
  eq(rec.doubleIdentityReviewPending, true, '对账标记双身份待决策');
  eq(rec.doubleIdentityReviewAlert, false, '无越权 Partner 记录');
  // STACK 决策补发
  const res = commissionRouter.resolveReviewOrder('T9', 'STACK', '测试管理员');
  eq(res.ok, true, '决策 STACK ok');
  eq(res.partner.granted, true, 'Partner 补发成功');
  const db = commissionRouter.getDb();
  const snap = db.prepare("SELECT status FROM commission_router_snapshots WHERE order_no = 'T9'").get();
  eq(snap.status, 'RESOLVED_STACK', '快照状态 RESOLVED_STACK');
  // 恢复正式策略
  commissionRouter.saveConfig({ ...commissionRouter.getConfig(), doubleIdentityPolicy: 'PARTNER_NET_OF_REFERRAL' });
  eq(commissionRouter.getConfig().doubleIdentityPolicy, 'PARTNER_NET_OF_REFERRAL', '配置已恢复正式策略');
}

console.log('\n=== 15) 金额守恒复核（第十四章：全程整数分） ===');
{
  const db = commissionRouter.getDb();
  const snaps = db.prepare('SELECT order_no, status, gross_cents, payment_fee_cents, referral_l1_cents, referral_l2_cents, ai_cost_cents, partner_revenue_cents, nurture_revenue_cents, refund_cents, platform_revenue_cents, conservation_ok FROM commission_router_snapshots').all();
  let allInt = true, allConserved = true;
  for (const s of snaps) {
    const vals = [s.gross_cents, s.payment_fee_cents, s.referral_l1_cents, s.referral_l2_cents, s.ai_cost_cents, s.partner_revenue_cents, s.nurture_revenue_cents, s.refund_cents, s.platform_revenue_cents];
    for (const v of vals) { if (!Number.isInteger(v)) allInt = false; }
    // 守恒口径：快照分项 = 原始入账事实（退款不改分项，refund_cents 独立记录冲退款额，
    // 其守恒由引擎冲正比例保证）。退款订单另验：refund ≤ gross 且状态机正确。
    const sum = s.payment_fee_cents + s.referral_l1_cents + s.referral_l2_cents + s.ai_cost_cents + s.partner_revenue_cents + s.nurture_revenue_cents + s.platform_revenue_cents;
    if (sum !== s.gross_cents) { allConserved = false; console.log(`    守恒异常 ${s.order_no}: sum=${sum} gross=${s.gross_cents}`); }
    if ((s.status === 'REVERSED' || s.status === 'PARTIAL_REFUND') && (s.refund_cents > s.gross_cents || s.refund_cents <= 0)) {
      allConserved = false; console.log(`    退款异常 ${s.order_no}: refund=${s.refund_cents} gross=${s.gross_cents}`);
    }
  }
  eq(allInt, true, '全部金额为整数分（无 float）');
  eq(allConserved, true, '全部快照 分项之和 = gross（原始入账口径）');
  eq(snaps.every(s => s.conservation_ok === 1), true, 'conservation_ok 全部=1');
}

// ==================== 汇总 ====================
console.log('\n==================== 测试汇总 ====================');
console.log(`PASS: ${PASS}  FAIL: ${FAIL}`);
if (FAIL > 0) {
  console.log('失败项：');
  failures.forEach(f => console.log('  - ' + f));
}

// 清理隔离 DB
try {
  fs.unlinkSync(TEST_DB);
  fs.unlinkSync(TEST_DB + '-wal');
  fs.unlinkSync(TEST_DB + '-shm');
} catch (e) { /* ignore */ }
console.log('[cleanup] 隔离 DB 已清理');

process.exit(FAIL > 0 ? 1 : 0);