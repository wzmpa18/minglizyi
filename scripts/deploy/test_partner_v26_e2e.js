/**
 * 合伙人渠道体系V2 全链路E2E测试（v25.0.47_26）
 * 安全模式：复制生产库到 /tmp 副本上运行（DB_PATH 覆盖），生产库零写入
 * 覆盖：申请→绑定→审核→渠道归属→消费分佣→培养奖励→退款冲正→结算出账→审核提现→风控扣回→脱敏校验
 */
process.env.DB_PATH = '/tmp/partner_e2e_v26.db';

const fs = require('fs');
const SRC = '/root/backend-auth/data/yandao_users.db';
const DST = process.env.DB_PATH;
if (!fs.existsSync(DST)) {
  fs.copyFileSync(SRC, DST);
  console.log('[setup] 已复制生产库到测试副本: ' + DST);
} else {
  console.log('[setup] 复用已有测试副本');
}

const engine = require('/www/yandaoguoxue-backend/partnerEngine.js');
const db = engine.getDb();

let pass = 0, fail = 0;
function ok(cond, name, detail) {
  if (cond) { pass++; console.log('  PASS ' + name + (detail ? ' | ' + detail : '')); }
  else { fail++; console.log('  FAIL ' + name + ' | ' + (detail || '')); }
}
function eq(a, b, name) { ok(a === b, name, `期望=${b} 实际=${a}`); }

const T1 = 990001, T2 = 990002, T3 = 990003, T4 = 990004, T5 = 990005, T6 = 990006;
const RUN = Date.now();
const O1 = 'E2EV26_' + RUN + '_A', O2 = 'E2EV26_' + RUN + '_B', OS = 'E2EV26_' + RUN + '_S';
const PERIOD = new Date().toISOString().slice(0, 7);

function ensureUser(uid, phone, inviteCode, invitedBy) {
  db.prepare(`INSERT INTO users (user_id, phone, password_hash, nickname, invite_code, invited_by, created_at, updated_at)
    VALUES (?, ?, 'e2e', 'E2E测试' || ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET phone=excluded.phone, invite_code=excluded.invite_code, invited_by=excluded.invited_by`)
    .run(uid, phone, uid, inviteCode, invitedBy);
}
function ensureOrder(orderNo, userId, amount) {
  db.prepare(`INSERT INTO user_orders (user_id, order_no, amount, order_type, status, paid_at)
    VALUES (?, ?, ?, 'membership', 'PAID', datetime('now'))
    ON CONFLICT(order_no) DO UPDATE SET status='PAID', paid_at=datetime('now')`)
    .run(userId, orderNo, amount);
}

console.log('\n===== 一、账号与申请绑定 =====');
ensureUser(T1, '13900000001', 'E2EREF1', null);
ensureUser(T2, '13900000002', 'E2EREF2', T1);
ensureUser(T3, '13612344128', 'E2EPAY', T2);
ensureUser(T4, '13900000004', 'E2ESUB', T3);
ensureUser(T5, '13900000005', 'E2EREF5', null);
ensureUser(T6, '13900000006', 'E2EREF6', null);

const a1 = engine.applyPartner({ userId: T1, realName: 'E2E上级', contact: '13900000001', resources: '测试', expectedScale: '1000' });
ok(a1.ok, 'U1 自主申请（无推荐人）', JSON.stringify(a1));
ok(engine.adminSetPartnerStatus(T1, 'approve', 'e2e').ok, 'U1 审核开通');
eq(engine.getPartner(T1).status, 'APPROVED', 'U1 状态=APPROVED');

const a2 = engine.applyPartner({ userId: T2, realName: 'E2E下级', contact: '13900000002', resources: '测试', expectedScale: '500', refCode: String(T1) });
ok(a2.ok, 'U2 凭推荐人ID申请绑定上级', JSON.stringify(a2));
eq(engine.getPartner(T2).referrer_partner_id, T1, 'U2 推荐关系=U1（仅直属一级）');
ok(engine.adminSetPartnerStatus(T2, 'approve', 'e2e').ok, 'U2 审核开通');
eq(engine.getPartner(T2).status, 'APPROVED', 'U2 状态=APPROVED');

// 红线：已开通/审核中合伙人不可重复申请（防止篡改推荐关系）
const reApply = engine.applyPartner({ userId: T2, realName: 'E2E', contact: 'x', refCode: String(T3) });
ok(!reApply.ok && /已是/.test(reApply.error || ''), '红线: 已开通合伙人禁止重复申请改绑', JSON.stringify(reApply));
eq(engine.getPartner(T2).referrer_partner_id, T1, '红线: 绑定关系不受失败申请影响');

// 红线：互推环——T6绑定T5后，T6被驳回再反推T5 → 阻断
const p6 = engine.applyPartner({ userId: T6, realName: 'E2E互推', contact: '13900000006', resources: 't', expectedScale: '1' });
ok(p6.ok && engine.adminSetPartnerStatus(T6, 'approve', 'e2e').ok, 'U6 审核开通（无推荐人）');
const p5 = engine.applyPartner({ userId: T5, realName: 'E2E中间', contact: '13900000005', resources: 't', expectedScale: '1', refCode: String(T6) });
ok(p5.ok && engine.adminSetPartnerStatus(T5, 'approve', 'e2e').ok, 'U5 绑定U6并开通');
eq(engine.getPartner(T5).referrer_partner_id, T6, 'U5→U6 直属一级绑定成立');
ok(engine.adminSetPartnerStatus(T6, 'reject', 'e2e', { reason: 'E2E驳回再测互推' }).ok, 'U6 驳回（REJECTED 可重新申请）');
const mutual = engine.applyPartner({ userId: T6, realName: 'E2E', contact: 'x', refCode: String(T5) });
ok(/互推/.test(mutual.error || ''), '红线: 互推套取奖励被阻断', JSON.stringify(mutual));
const selfRef = engine.adminSetReferrer(T1, T1, 'e2e', 'E2E自设上级');
ok(!selfRef.ok && /自己/.test(selfRef.error || ''), '红线: 管理端禁止自设上级', JSON.stringify(selfRef));
const cycleRef = engine.adminSetReferrer(T1, T2, 'e2e', 'E2E环检测');
ok(!cycleRef.ok && /循环/.test(cycleRef.error || ''), '红线: 管理端循环推荐关系被阻断', JSON.stringify(cycleRef));

console.log('\n===== 二、渠道归属（永久归属+任意深度上溯） =====');
eq(engine.findChannelPartner(T3), T2, 'U3（U2直邀）归属U2渠道');
eq(engine.findChannelPartner(T4), T2, 'U4（U3自邀，隔代）仍归属U2渠道');
eq(engine.findChannelPartner(T1), null, 'U1 无上级渠道（顶级合伙人）');

console.log('\n===== 三、消费分佣（成本扣除顺序验证，¥100 订单） =====');
ensureOrder(O1, T3, 100);
// 模拟普通两级分销已实发：L1 15%=1500分 + L2 5%=500分
const now = new Date().toISOString();
db.prepare(`INSERT INTO commission_records (order_no, record_type, payer_user_id, inviter_user_id, ratio_percent, base_amount_cents, commission_cents, status, created_at)
  VALUES (?, 'COMMISSION', ?, ?, 15, 10000, 1500, 'FROZEN', ?), (?, 'COMMISSION_L2', ?, ?, 5, 10000, 500, 'FROZEN', ?)`)
  .run(O1, T3, T2, now, O1, T3, T4, now);

const g1 = engine.grantPartnerCommission({ orderId: O1, userId: T3, amount: 100, title: 'E2E订单A' });
ok(g1.granted, '分佣入账成功', JSON.stringify(g1));
const log1 = db.prepare('SELECT * FROM partner_order_log WHERE order_no = ?').get(O1);
eq(log1.gross_cents, 10000, '留痕: 实付总额10000分');
eq(log1.fee_cost_cents, 60, '留痕: 手续费60分(0.6%)');
eq(log1.ai_cost_cents, 1000, '留痕: AI成本1000分(10%)');
eq(log1.normal_commission_cents, 2000, '留痕: 普通两级佣金成本2000分(15%+5%)');
eq(log1.net_cents, 6940, '留痕: 渠道净收入=10000-60-1000-2000=6940分');
eq(log1.base_commission_cents, 3470, '留痕: 基础佣金=净收入×50%=3470分');
eq(log1.nurture_partner_id, T1, '留痕: 培养奖励归属直属上级U1');
eq(log1.nurture_cents, 347, '留痕: 培养奖励=净收入×5%=347分（平台承担）');
const platRetain = log1.net_cents - log1.base_commission_cents - log1.nurture_cents;
eq(platRetain, 3123, '平台留存=净收入45%保底=3123分');

const rec1 = db.prepare(`SELECT * FROM commission_records WHERE order_no = ? AND record_type = 'PARTNER_COMMISSION'`).get(O1);
eq(rec1.inviter_user_id, T2, '佣金记录: U2获基础佣金');
eq(rec1.commission_cents, 3470, '佣金记录: U2金额3470分');
eq(rec1.status, 'FROZEN', '佣金记录: 冻结期');
const rec2 = db.prepare(`SELECT * FROM commission_records WHERE order_no = ? AND record_type = 'PARTNER_NURTURE'`).get(O1);
eq(rec2.inviter_user_id, T1, '奖励记录: U1获培养奖励');
eq(rec2.commission_cents, 347, '奖励记录: U1金额347分');
const acc1 = db.prepare('SELECT * FROM commission_accounts WHERE user_id = ?').get(T1);
const acc2 = db.prepare('SELECT * FROM commission_accounts WHERE user_id = ?').get(T2);
eq(acc2.frozen_cents, 3470, '账户: U2冻结+3470分');
eq(acc1.frozen_cents, 347, '账户: U1冻结+347分');

const dup = engine.grantPartnerCommission({ orderId: O1, userId: T3, amount: 100 });
eq(dup.reason, 'DUPLICATE', '幂等: 重复入账被拒');

// 顶级合伙人自购：无上级渠道归属 → 不分佣
const t1Buy = engine.grantPartnerCommission({ orderId: 'E2EV26_' + RUN + '_T1', userId: T1, amount: 30 });
eq(t1Buy.reason, 'NO_CHANNEL_PARTNER', '防作弊: 顶级合伙人自购无渠道不分佣');

// 下级合伙人自购：计入上级渠道业绩（归属规则：渠道用户永久归属）
ensureOrder(OS, T2, 50);
const t2Buy = engine.grantPartnerCommission({ orderId: OS, userId: T2, amount: 50 });
ok(t2Buy.granted && t2Buy.partnerId === T1, '归属: 下级合伙人消费计入上级U1渠道', JSON.stringify(t2Buy));
const rs = engine.reversePartnerCommission(OS);
ok(rs.reversed, '清理: 冲正下级自购订单');
eq(db.prepare('SELECT frozen_cents FROM commission_accounts WHERE user_id = ?').get(T1).frozen_cents, 347, '清理: U1冻结回落347分');

console.log('\n===== 四、第二笔订单（无普通佣金成本）+ 全额退款冲正 =====');
ensureOrder(O2, T4, 50);
const g2 = engine.grantPartnerCommission({ orderId: O2, userId: T4, amount: 50, title: 'E2E订单B' });
ok(g2.granted, 'U4消费入账（隔代用户仍归U2渠道）', JSON.stringify(g2));
const log2 = db.prepare('SELECT * FROM partner_order_log WHERE order_no = ?').get(O2);
eq(log2.net_cents, 4470, '净收入=5000-30-500=4470分');
eq(log2.base_commission_cents, 2235, '基础佣金2235分');
const r2 = engine.reversePartnerCommission(O2);
ok(r2.reversed, '全额退款冲正');
eq(db.prepare(`SELECT status FROM commission_records WHERE order_no=? AND record_type='PARTNER_COMMISSION'`).get(O2).status, 'REVERSED', '冲正: 佣金记录REVERSED');
eq(db.prepare(`SELECT status FROM partner_order_log WHERE order_no=?`).get(O2).status, 'REVERSED', '冲正: 留痕整单REVERSED（全额退款不残留）');
eq(db.prepare('SELECT frozen_cents FROM commission_accounts WHERE user_id = ?').get(T2).frozen_cents, 3470, '冲正: U2冻结回落3470分');
eq(db.prepare('SELECT frozen_cents FROM commission_accounts WHERE user_id = ?').get(T1).frozen_cents, 347, '冲正: U1培养奖励同步扣回');

console.log('\n===== 五、月度结算出账→审核→可提现 =====');
const settle = engine.generateMonthlySettlements(PERIOD, 'e2e');
ok(settle.created >= 1, '结算单生成', JSON.stringify(settle));
const s2 = db.prepare('SELECT * FROM partner_settlements WHERE partner_id = ? AND period = ?').get(T2, PERIOD);
ok(!!s2, 'U2结算单存在');
eq(s2.gross_cents, 10000, '结算单: 实付10000分（冲正单不残留）');
eq(s2.normal_commission_cents, 2000, '结算单: 成本明细-普通佣金2000分');
eq(s2.net_cents, 6940, '结算单: 净收入6940分');
eq(s2.base_commission_cents, 3470, '结算单: 基础佣金3470分');
eq(s2.status, 'PENDING_REVIEW', '结算单: 待审核');
const s1 = db.prepare('SELECT * FROM partner_settlements WHERE partner_id = ? AND period = ?').get(T1, PERIOD);
eq(s1.nurture_received_cents, 347, '结算单: U1培养奖励收入347分');

const ap = engine.approveSettlement(s2.id, 'e2e');
ok(ap.ok, 'U2结算审核通过', JSON.stringify(ap));
eq(db.prepare('SELECT withdrawable_cents FROM commission_accounts WHERE user_id = ?').get(T2).withdrawable_cents, 3470, 'U2可提现=3470分（转可提现）');
const ap1 = engine.approveSettlement(s1.id, 'e2e');
ok(ap1.ok, 'U1结算审核通过');
eq(db.prepare('SELECT withdrawable_cents FROM commission_accounts WHERE user_id = ?').get(T1).withdrawable_cents, 347, 'U1可提现=347分');

console.log('\n===== 六、数据看板与脱敏 =====');
const ov = engine.partnerOverview(T2);
ok(ov.channelRegistered >= 2, '看板: 渠道注册≥2（U3+U4）', `实际=${ov.channelRegistered}`);
ok(Number(ov.channelGrossYuan) >= 100, '看板: 渠道流水≥¥100（user_orders口径）', `实际=${ov.channelGrossYuan}`);
ok(ov.channelPaidUsers >= 1, '看板: 付费人数≥1', `实际=${ov.channelPaidUsers}`);
eq(ov.baseCommissionYuan, '34.70', '看板: 基础佣金¥34.70');
eq(ov.subPartnerCount, 0, '看板: U2无直属下级合伙人');
const ov1 = engine.partnerOverview(T1);
eq(ov1.subPartnerCount, 1, '看板: U1直属下级合伙人=1');
const subs = engine.partnerSubPartners(T1);
ok(Array.isArray(subs) && subs.some(s => s.partnerUserId === String(T2)), '看板: U1直属下级列表含U2');
const users = engine.partnerUsers(T2, {});
const masked = JSON.stringify(users);
ok(masked.includes('136****4128'), '脱敏: 手机号中间四位打码', '136****4128');
ok(!masked.includes('13612344128'), '脱敏: 完整手机号绝不出现');
eq(engine.maskUserId(String(T3)), '99****03', '脱敏: 用户ID部分隐藏');

console.log('\n===== 七、风控标记无效订单 =====');
const mi = engine.markOrderInvalid(O1, 'E2E刷量测试', 'e2e');
ok(mi.ok, '风控标记成功', JSON.stringify(mi));
eq(db.prepare(`SELECT status FROM partner_order_log WHERE order_no=?`).get(O1).status, 'INVALID', '风控: 留痕INVALID');
eq(db.prepare('SELECT withdrawable_cents FROM commission_accounts WHERE user_id = ?').get(T2).withdrawable_cents, 0, '风控: U2可提现扣回至0');

console.log('\n===== 清理测试副本数据（可重复运行） =====');
db.prepare('DELETE FROM user_orders WHERE order_no LIKE ?').run('E2EV26_' + RUN + '%');
db.prepare('DELETE FROM commission_records WHERE order_no LIKE ?').run('E2EV26_' + RUN + '%');
db.prepare('DELETE FROM partner_order_log WHERE order_no LIKE ?').run('E2EV26_' + RUN + '%');
db.prepare('DELETE FROM partner_settlements WHERE partner_id IN (?,?)').run(T1, T2);
db.prepare('DELETE FROM commission_accounts WHERE user_id IN (?,?,?,?,?,?)').run(T1, T2, T3, T4, T5, T6);
db.prepare('DELETE FROM partners WHERE user_id IN (?,?,?,?,?,?)').run(T1, T2, T3, T4, T5, T6);
db.prepare('DELETE FROM users WHERE user_id IN (?,?,?,?,?,?)').run(T1, T2, T3, T4, T5, T6);
console.log('  已清理');

console.log('\n========================================');
console.log(`E2E 结果: ${pass} PASS / ${fail} FAIL`);
console.log('========================================');
process.exit(fail > 0 ? 1 : 0);
