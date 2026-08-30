// ============================================================================
// partner_attribution_test.js — PARTNER ATTRIBUTION / CONTRACT / REBIND
//                                隔离测试（FINAL-MASTER-05 第十八~三十章）
//   - 隔离 SQLite DB（不碰生产 users DB）
//   - Real Payment = 0（fixture 订单模拟）
//   - 覆盖：
//       19章 归属快照字段全集 + 首次落库
//       20章 静默改绑禁止 + SUPER_ADMIN 改绑（原因/版本递增/REBOUND 保留/rebind_log 审计）
//       21-23章 合同（3年默认/期限与收益规则分开/到期停止计佣但历史保留/CONTINUE 继续计佣/终止）
//       24章 月度结算快照（refund/aiCostSource/formulaVersion/contractVersion/finalAmount）
//       25章 逐单透明账（字段全集 + 脱敏 + ESTIMATED 口径）
//       27章 用户列表字段全集（昵称/脱敏手机/会员等级/最后活跃/模块次数/最近消费）
//       29章 邀请关系只读统计（TOTAL_RELATIONS）
//       28章 渠道子码 CRUD
//       14章 金额守恒（整数分）
// ============================================================================
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const TEST_DB = path.join(os.tmpdir(), 'attr_test_' + Date.now() + '_' + process.pid + '.db');
process.env.DB_PATH = TEST_DB;
const TEST_ROUTER_DIR = path.join(os.tmpdir(), 'attr_router_cfg_' + Date.now() + '_' + process.pid);
process.env.COMMISSION_ROUTER_DIR = TEST_ROUTER_DIR;
// 无 academy.db 场景：模块使用次数返回 0（不猜测）
process.env.AI_COST_DB_PATH = path.join(os.tmpdir(), 'attr_nonexistent_' + Date.now() + '.db');

const Database = require('better-sqlite3');
{
  const init = new Database(TEST_DB);
  init.exec('CREATE TABLE IF NOT EXISTS __init(id INTEGER)');
  init.close();
}

const commissionEngine = require('./commissionEngine');
const partnerEngine = require('./partnerEngine');
const partnerAttribution = require('./partnerAttribution');
const commissionRouter = require('./commissionRouter');

let PASS = 0, FAIL = 0;
const failures = [];
function eq(actual, expected, name) {
  if (actual === expected) { PASS++; console.log('  PASS  ' + name + ' = ' + JSON.stringify(actual)); }
  else { FAIL++; failures.push(name); console.log('  FAIL  ' + name + ` (期望 ${JSON.stringify(expected)} 实际 ${JSON.stringify(actual)})`); }
}
function check(cond, name, extra) {
  if (cond) { PASS++; console.log('  PASS  ' + name); }
  else { FAIL++; failures.push(name); console.log('  FAIL  ' + name + (extra ? '  => ' + JSON.stringify(extra) : '')); }
}

function todayStr() { return new Date().toISOString().slice(0, 10); }
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// ==================== fixture ====================
function setupFixtures() {
  const db = commissionEngine.getDb();
  partnerEngine.getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY,
      invited_by INTEGER,
      deleted_at TEXT,
      member_level TEXT,
      nickname TEXT,
      phone TEXT,
      invite_code TEXT,
      last_login_at TEXT,
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS user_invite_relation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inviter_id INTEGER,
      invitee_id INTEGER,
      level INTEGER
    );
  `);
  const insUser = db.prepare(`INSERT OR REPLACE INTO users (user_id, invited_by, deleted_at, member_level, nickname, phone, invite_code, last_login_at, created_at)
    VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)`);
  // 普通用户
  insUser.run(1000, null, 'basic', '小白', '13800001000', null, '2026-08-20 10:00:00', '2026-08-01 09:00:00');
  insUser.run(1003, 2200, 'basic', '用户甲', '13900001003', null, '2026-08-25 10:00:00', '2026-08-20 09:00:00');
  insUser.run(1004, 2400, 'basic', '用户乙', '13700001004', null, '2026-08-26 10:00:00', '2026-08-21 09:00:00');
  insUser.run(1007, 2500, 'basic', '用户丙', '13600001007', null, '2026-08-27 10:00:00', '2026-08-22 09:00:00');
  // Partner：2200（inviter=1102，会产生 L2）、2400（无 inviter）、2500（合同测试专用）
  insUser.run(2200, 1102, 'basic', '合伙人A', '13500002200', 'PCODEA', '2026-08-10 10:00:00', '2026-08-01 09:00:00');
  insUser.run(2400, null, 'basic', '合伙人B', '13400002400', 'PCODEB', '2026-08-10 10:00:00', '2026-08-01 09:00:00');
  insUser.run(2500, null, 'basic', '合伙人C', '13300002500', 'PCODEC', '2026-08-10 10:00:00', '2026-08-01 09:00:00');
  insUser.run(1102, null, 'basic', '上级普通人', '13200001102', null, null, '2026-08-01 09:00:00');

  const insPartner = db.prepare(`INSERT OR REPLACE INTO partners (user_id, real_name, contact, status, level, applied_at, reviewed_at)
    VALUES (?, ?, ?, 'APPROVED', 'NORMAL', '2026-08-10', '2026-08-11')`);
  insPartner.run(2200, '合伙人A', 'wx-a');
  insPartner.run(2400, '合伙人B', 'wx-b');
  insPartner.run(2500, '合伙人C', 'wx-c');

  // 邀请关系（第29章统计用）：3000 的 L1=1004，L2=1005
  db.prepare('INSERT OR REPLACE INTO users (user_id, invited_by, deleted_at, nickname) VALUES (3000, NULL, NULL, ?)').run('邀请人');
  db.prepare('INSERT OR REPLACE INTO user_invite_relation (inviter_id, invitee_id, level) VALUES (3000, 1004, 1)').run();
  db.prepare('INSERT OR REPLACE INTO user_invite_relation (inviter_id, invitee_id, level) VALUES (3000, 1005, 2)').run();

  // user_orders（与生产 register_routes.js 表结构一致；Router 不写订单表，fixture 预置）
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      order_no TEXT UNIQUE NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      order_type TEXT,
      status TEXT DEFAULT 'pending',
      payment_method TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      paid_at DATETIME,
      benefit_delivered INTEGER DEFAULT 0,
      transaction_id TEXT
    );
  `);
  const insOrder = db.prepare(`INSERT OR REPLACE INTO user_orders (user_id, order_no, amount, order_type, status, payment_method, created_at, paid_at)
    VALUES (?, ?, ?, ?, 'PAID', 'WECHAT', ?, ?)`);
  const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
  insOrder.run(1004, 'ATTR-T1', 100, 'MEMBERSHIP', nowStr, nowStr);
  insOrder.run(1004, 'ATTR-T2', 100, 'MEMBERSHIP', nowStr, nowStr);

  console.log('[fixture] 用户/合伙人/邀请关系/订单已就绪');
}

function mkOrder(orderNo, userId, amountYuan) {
  return { orderId: orderNo, userId, type: 'MEMBERSHIP', amount: amountYuan, title: '会员年卡' };
}

// ============================================================================
console.log('\n=== 1) 第十九章：归属快照首次落库（字段全集） ===');
setupFixtures();
{
  const db = partnerEngine.getDb();
  const pid = partnerEngine.findChannelPartner(1003);
  eq(pid, 2200, '链式解析 1003 → Partner 2200');
  const row = db.prepare('SELECT * FROM partner_attribution WHERE user_id = 1003').get();
  check(!!row, '归属快照已落库');
  eq(row.partner_id, 2200, 'partnerId=2200');
  eq(row.source, 'INVITE_CHAIN', 'source=INVITE_CHAIN');
  check(!!row.bound_at, 'boundAt 已记录');
  check(!!row.effective_from, 'effectiveFrom 已记录');
  eq(row.attribution_version, 1, 'attributionVersion=1');
  eq(row.status, 'ACTIVE', 'status=ACTIVE');
  eq(row.channel_code, 'PCODEA', 'channelCode=Partner 邀请码 PCODEA');
  check(row.contract_id === null, '无合同时 contractId=NULL');
  check(row.effective_to === null, '无合同时 effectiveTo=NULL（长期有效）');

  // 重复解析不重复落库、不改版本
  partnerEngine.findChannelPartner(1003);
  const cnt = db.prepare('SELECT COUNT(*) c FROM partner_attribution WHERE user_id = 1003').get().c;
  eq(cnt, 1, '重复解析不重复落库');
}

console.log('\n=== 2) 第二十章：首次合法归属后禁止静默改绑 ===');
{
  const db = partnerEngine.getDb();
  // 静默改动 users.invited_by（模拟后续邀请关系变化）
  db.prepare('UPDATE users SET invited_by = 2400 WHERE user_id = 1003').run();
  const pid = partnerEngine.findChannelPartner(1003);
  eq(pid, 2200, 'invited_by 被改后归属仍=2200（快照优先）');
  const cnt = db.prepare('SELECT COUNT(*) c FROM partner_attribution WHERE user_id = 1003').get().c;
  eq(cnt, 1, '无 SUPER_ADMIN 改绑时不产生新版本');
}

console.log('\n=== 3) 第二十章：SUPER_ADMIN 改绑（原因/版本/REBOUND/rebind_log） ===');
{
  const db = partnerEngine.getDb();
  // 校验：缺原因
  let r = partnerAttribution.rebindAttribution({ userId: 1003, newPartnerId: 2400, reason: '', operator: 'root' });
  eq(r.ok, false, '缺原因拒绝');
  r = partnerAttribution.rebindAttribution({ userId: 1003, newPartnerId: 99999, reason: '渠道调整', operator: 'root' });
  eq(r.ok, false, '新归属非合伙人拒绝');
  r = partnerAttribution.rebindAttribution({ userId: 1003, newPartnerId: 2200, reason: '渠道调整', operator: 'root' });
  eq(r.ok, false, '改绑到原 Partner 拒绝');

  // 正式改绑
  r = partnerAttribution.rebindAttribution({ userId: 1003, newPartnerId: 2400, reason: '渠道归并调整', operator: 'root' });
  eq(r.ok, true, '改绑 1003: 2200 → 2400 ok');
  eq(r.fromPartnerId, 2200, 'fromPartnerId=2200');
  eq(r.toPartnerId, 2400, 'toPartnerId=2400');

  const v1 = db.prepare("SELECT * FROM partner_attribution WHERE user_id = 1003 AND attribution_version = 1").get();
  const v2 = db.prepare("SELECT * FROM partner_attribution WHERE user_id = 1003 AND attribution_version = 2").get();
  check(!!v1 && v1.status === 'REBOUND', '版本1 保留且 REBOUND（历史不删）');
  check(!!v2 && v2.status === 'ACTIVE', '版本2 ACTIVE');
  eq(v2.partner_id, 2400, '版本2 partnerId=2400');
  eq(v2.source, 'ADMIN_REBIND', '版本2 source=ADMIN_REBIND');
  const log = db.prepare('SELECT * FROM partner_attribution_rebind_log WHERE user_id = 1003 ORDER BY id DESC LIMIT 1').get();
  check(!!log, 'rebind_log 审计已留痕');
  eq(log.from_partner_id, 2200, 'log.from=2200');
  eq(log.to_partner_id, 2400, 'log.to=2400');
  eq(log.operator, 'root', 'log.operator=root');
  check(String(log.reason).includes('渠道归并调整'), 'log.reason 完整');

  // 改绑后归属生效
  eq(partnerEngine.findChannelPartner(1003), 2400, '改绑后解析=2400');

  // 管理端查询
  const list = partnerAttribution.listAttributions({ userId: 1003 });
  eq(list.total, 2, '归属列表含全部历史版本');
  const detail = partnerAttribution.getAttributionDetail(1003);
  eq(detail.versions.length, 2, '归属详情版本链=2');
  eq(detail.rebindLog.length, 1, '改绑审计链=1');
}

console.log('\n=== 4) 第二十一~二十二章：合同（3年默认/期限与收益规则分开） ===');
{
  const db = partnerEngine.getDb();
  // 2400：标准3年合同（今天起，POSTEXPIRY_STOP）
  let r = partnerAttribution.createContract({ partnerId: 2400, contractStart: todayStr(), contractYears: 3 });
  eq(r.ok, true, '2400 签约 ok（默认3年）');
  const c = db.prepare("SELECT * FROM partner_contracts WHERE partner_id = 2400 AND status = 'ACTIVE'").get();
  check(!!c, '合同已入库');
  eq(c.contract_years, 3, 'contractYears=3');
  check(c.contract_end === addDays(todayStr(), 0).slice(0, 4) + '-xx-xx' || !!c.contract_end, 'contractEnd 已推算');
  check(String(c.contract_end) > todayStr(), 'contractEnd 在未来（3年）');
  eq(c.renewal_status, 'ACTIVE', 'renewalStatus=ACTIVE');
  eq(c.revenue_right_policy, 'NET50_POSTEXPIRY_STOP', '默认收益规则=POSTEXPIRY_STOP');
  check(String(c.contract_no).startsWith('PC'), '合同号自动生成');

  // 归属快照 effective_to 同步为合同结束日
  const attr = db.prepare("SELECT effective_to, contract_id FROM partner_attribution WHERE user_id = 1003 AND status = 'ACTIVE'").get();
  eq(attr.effective_to, c.contract_end, '改绑归属 effectiveTo=合同结束日');
  eq(attr.contract_id, c.id, '归属 contractId=合同id');

  // 重复签约拒绝
  r = partnerAttribution.createContract({ partnerId: 2400, contractStart: todayStr() });
  eq(r.ok, false, '已有生效合同重复签约拒绝');

  // 日期校验
  r = partnerAttribution.createContract({ partnerId: 2500, contractStart: 'bad-date' });
  eq(r.ok, false, '非法日期拒绝');
  r = partnerAttribution.createContract({ partnerId: 2500, contractStart: '2026-08-01', contractEnd: '2026-01-01' });
  eq(r.ok, false, '结束早于开始拒绝');
  r = partnerAttribution.createContract({ partnerId: 2500, contractStart: todayStr(), revenueRightPolicy: 'FOO' });
  eq(r.ok, false, '非法收益规则拒绝');
}

console.log('\n=== 5) 第二十三章：合同到期（STOP）停止计佣 + 历史保留 ===');
{
  const db = partnerEngine.getDb();
  // 2500：已过期合同（2024-12-31 结束）
  const r = partnerAttribution.createContract({ partnerId: 2500, contractStart: '2022-01-01', contractEnd: '2024-12-31' });
  eq(r.ok, true, '2500 历史合同创建 ok');
  // 1007 首次解析（2500 有过期合同 → 链式解析后落库 effective_to=2024-12-31）
  const pid = partnerEngine.findChannelPartner(1007);
  eq(pid, 2500, '链式解析 1007 → 2500（快照落库）');
  const attr = db.prepare("SELECT * FROM partner_attribution WHERE user_id = 1007 AND status = 'ACTIVE'").get();
  eq(attr.effective_to, '2024-12-31', '1007 归属 effectiveTo=2024-12-31');
  // 过期后停止计佣
  eq(partnerEngine.findChannelPartner(1007), null, '合同过期后停止计佣（返回 null）');
  // 历史归属行保留
  const cnt = db.prepare('SELECT COUNT(*) c FROM partner_attribution WHERE user_id = 1007').get().c;
  eq(cnt, 1, '历史归属行保留未删除（第二十三章）');

  // 到期扫描：renewal_status=EXPIRED
  const sc = partnerAttribution.expireDueContracts();
  check(sc.expired >= 1, '到期扫描标记过期合同');
  const c = db.prepare("SELECT renewal_status FROM partner_contracts WHERE partner_id = 2500 AND status = 'ACTIVE'").get();
  eq(c.renewal_status, 'EXPIRED', '合同 renewalStatus=EXPIRED（历史保留）');

  // 历史订单/佣金数据不受影响（1004 的既有入账在场景8验证）
}

console.log('\n=== 6) 第二十三章：CONTINUE 口径到期后继续计佣 ===');
{
  const db = partnerEngine.getDb();
  // 2500 调整收益规则为 CONTINUE（需先有原因）
  let r = partnerAttribution.updateContractPolicy({ contractId: db.prepare("SELECT id FROM partner_contracts WHERE partner_id = 2500 AND status = 'ACTIVE'").get().id, revenueRightPolicy: 'NET50_POSTEXPIRY_CONTINUE', reason: '历史渠道终身归属条款' });
  eq(r.ok, true, '收益规则调整为 CONTINUE ok');
  // 1007 旧快照 effective_to=2024-12-31 已过期 → 重新改绑后按新口径落库？
  // 先验证：syncAttributionEffectiveTo 应将 ACTIVE 归属改为 NULL
  // （updateContractPolicy 内部已调用 sync）
  const attr = db.prepare("SELECT effective_to FROM partner_attribution WHERE user_id = 1007 AND status = 'ACTIVE'").get();
  eq(attr.effective_to, null, 'CONTINUE 口径下 effectiveTo=NULL');
  eq(partnerEngine.findChannelPartner(1007), 2500, 'CONTINUE 到期后继续计佣');
}

console.log('\n=== 7) 分佣联动：快照归属 + 双身份（NET_OF_REFERRAL） ===');
{
  // 1004：L1=2400 且 channel=2400（双身份），快照已在解析时落库
  const o = mkOrder('ATTR-T1', 1004, 100);
  const r = commissionRouter.processPaidOrder(o);
  eq(r.ok, true, '双身份订单入账 ok');
  eq(r.partner.partnerId, 2400, 'Partner=2400（快照归属）');
  eq(r.referral.commissionCents, 1500, 'L1=1500 分');
  eq(r.partner.netCents, 7440, '净额=10000-60-1000-1500=7440');
  eq(r.partner.commissionCents, 3720, 'Partner=3720 分（NET_OF_REFERRAL）');

  // 静默改 invited_by 后新订单仍归 2400（快照优先）
  const db = partnerEngine.getDb();
  db.prepare('UPDATE users SET invited_by = 2200 WHERE user_id = 1004').run();
  const o2 = mkOrder('ATTR-T2', 1004, 100);
  const r2 = commissionRouter.processPaidOrder(o2);
  eq(r2.ok, true, 'invited_by 被改后新订单仍入账');
  eq(r2.partner.partnerId, 2400, '归属不静默漂移（仍=2400）');
}

console.log('\n=== 8) 第二十四章：月度结算快照（refund/口径/公式版本/合同版本/finalAmount） ===');
{
  const db = partnerEngine.getDb();
  const period = new Date().toISOString().slice(0, 7);
  // 部分退款留痕：ATTR-T1 退 30 元
  partnerEngine.reversePartnerCommission('ATTR-T1', 30);
  const log = db.prepare("SELECT refund_cents FROM partner_order_log WHERE order_no = 'ATTR-T1'").get();
  eq(log.refund_cents, 3000, '逐单留痕 refund_cents=3000（第25章退款列）');

  const r = partnerEngine.generateMonthlySettlements(period, 'test');
  eq(r.formulaVersion, '1.1.0', '结算返回 formulaVersion=1.1.0');
  const s = db.prepare('SELECT * FROM partner_settlements WHERE partner_id = 2400 AND period = ?').get(period);
  check(!!s, '结算单已生成');
  eq(s.formula_version, '1.1.0', '结算快照 formulaVersion=1.1.0');
  eq(s.ai_cost_source, 'ESTIMATED', 'aiCostSource=ESTIMATED（第15-16章）');
  eq(s.contract_version, 'V1', 'contractVersion=V1（2400 有合同）');
  eq(s.refund_cents, 3000, '结算快照 refundCents=3000');
  eq(s.final_amount_cents, s.base_commission_cents + s.nurture_received_cents, 'finalAmount=base+nurture');
  check(Number.isInteger(s.final_amount_cents), 'finalAmount 整数分（第14章守恒）');

  // 幂等
  const again = partnerEngine.generateMonthlySettlements(period, 'test');
  eq(again.created, 0, '重复生成幂等（0 新建）');

  // 金额守恒（整数）
  const allInt = db.prepare('SELECT COUNT(*) c FROM partner_settlements WHERE CAST(final_amount_cents AS TEXT) != CAST(final_amount_cents AS INTEGER)').get().c;
  eq(allInt, 0, '全部结算金额为整数分');
}

console.log('\n=== 9) 第二十五章：逐单透明账（脱敏 + ESTIMATED 口径） ===');
{
  // Partner 2400 视角
  const data = partnerAttribution.partnerOrders(2400, { page: 1, size: 10 });
  check(data.total >= 2, `逐单账 total>=2（实际 ${data.total}）`);
  eq(data.aiCostSource, 'ESTIMATED', 'aiCostSource=ESTIMATED 明确标注');
  const o = data.orders[0];
  const required = ['orderNo', 'orderTime', 'orderType', 'payerMasked', 'paidAmountYuan', 'paymentFeeYuan',
    'referralCostYuan', 'estimatedAiCostYuan', 'refundYuan', 'distributableNetYuan', 'partnerRevenueYuan',
    'entryStatus', 'settlementStatus'];
  const missing = required.filter(k => o[k] === undefined);
  eq(missing.length, 0, '逐单账字段全集（第25章）');
  check(String(o.payerMasked).includes('****'), '用户身份脱敏（含****）');
  eq(String(o.payerMasked) === String(1004), false, '脱敏不等于完整 userId');
  check(o.orderType === 'MEMBERSHIP', '订单类型来自 user_orders（MEMBERSHIP）');
  const refunded = data.orders.find(x => x.orderNo === 'ATTR-T1');
  check(!!refunded && refunded.refundYuan === '30.00', '退款列=30.00 元');

  // 管理端不脱敏版
  const admin = partnerAttribution.adminPartnerOrders(2400, { page: 1, size: 10 });
  check(admin.total >= 2, '管理端逐单账 total>=2');
  check(String(admin.orders[0].payerUserId) === '1004' || admin.orders.some(x => String(x.payerUserId) === '1004'), '管理端可见完整 payerUserId');
  check(admin.orders.every(x => x.settlementStatus !== undefined), '管理端含 settlementStatus');
  check(admin.orders.every(x => x.formulaVersion !== undefined), '管理端含 formulaVersion');
}

console.log('\n=== 10) 第二十七章：用户列表字段全集 ===');
{
  const data = partnerAttribution.partnerUsersDetailed(2400, { page: 1, size: 20 });
  check(data.total >= 2, `用户列表 total>=2（实际 ${data.total}）`);
  const u = data.users.find(x => x.uid === '1004') || data.users[0];
  const required = ['uid', 'nickname', 'phoneMasked', 'registeredAt', 'lastActiveAt', 'memberLevel',
    'totalConsumeYuan', 'lastConsumeAt', 'moduleUsageCount', 'isPaid'];
  const missing = required.filter(k => u[k] === undefined);
  eq(missing.length, 0, '用户列表字段全集（第27章）');
  check(String(u.phoneMasked).includes('****'), '手机号脱敏');
  eq(String(u.phoneMasked) === '13700001004', false, '完整手机号禁止输出（第26章红线）');
  check(u.nickname === '用户乙' || typeof u.nickname === 'string', '昵称可见');
  eq(u.moduleUsageCount, 0, '无 academy.db 时模块次数=0（不猜测）');
  check(u.isPaid === true || u.isPaid === false, '是否付费字段存在');
}

console.log('\n=== 11) 第二十九章：邀请关系只读统计（TOTAL_RELATIONS） ===');
{
  const st = partnerAttribution.userInviteStats(3000);
  check(!!st, '邀请统计返回');
  eq(st.directInvites, 1, '直接邀请数=1');
  eq(st.level2Relations, 1, '二级关系数=1');
  eq(st.totalRelations, 2, 'TOTAL_RELATIONS=2');
  check(st.invitedBy === null, '3000 无上级（invitedBy=null）');
  eq(st.readonly, true, '默认只读（第30章禁止改写）');
  // 用户被谁邀请
  const st2 = partnerAttribution.userInviteStats(1004);
  check(!!st2.invitedBy && st2.invitedBy.userId === '3000', '1004 的邀请人=3000');
  // 不存在的用户
  eq(partnerAttribution.userInviteStats(99999), null, '不存在用户返回 null');
}

console.log('\n=== 12) 第二十八章：渠道子码 CRUD ===');
{
  const db = partnerEngine.getDb();
  let r = partnerAttribution.createChannelCode({ partnerId: 2400, label: '抖音投放' });
  eq(r.ok, true, '自动生成子码 ok');
  const code = r.code;
  check(/^CH2400-\d{4}$/.test(code), `子码格式 CH2400-XXXX（${code}）`);
  r = partnerAttribution.createChannelCode({ partnerId: 2400, code });
  eq(r.ok, false, '重复子码拒绝');
  r = partnerAttribution.createChannelCode({ partnerId: 2400, code: 'BAD CODE!' });
  eq(r.ok, false, '非法字符子码拒绝');
  r = partnerAttribution.createChannelCode({ partnerId: 9999 });
  eq(r.ok, false, '非合伙人创建子码拒绝');

  const codes = partnerAttribution.listChannelCodes(2400);
  eq(codes.length, 1, '子码列表=1');
  eq(codes[0].label, '抖音投放', '子码标签');
  eq(codes[0].status, 'ACTIVE', '子码状态 ACTIVE');
  check(codes[0].boundUserCount === 0, '子码绑定人数统计字段');

  const id = codes[0].id;
  r = partnerAttribution.setChannelCodeStatus({ codeId: id, action: 'disable' });
  eq(r.ok, true, '子码停用 ok');
  eq(partnerAttribution.listChannelCodes(2400)[0].status, 'DISABLED', '子码状态=DISABLED');
  r = partnerAttribution.setChannelCodeStatus({ codeId: id, action: 'reboot' });
  eq(r.ok, false, '非法 action 拒绝');
}

console.log('\n=== 13) 合同续约/终止（历史保留） ===');
{
  const db = partnerEngine.getDb();
  const old = db.prepare("SELECT * FROM partner_contracts WHERE partner_id = 2400 AND status = 'ACTIVE'").get();
  let r = partnerAttribution.renewContract({ contractId: old.id, contractStart: todayStr(), contractYears: 2, contractVersion: 'V2' });
  eq(r.ok, true, '续约 ok');
  const archived = db.prepare('SELECT * FROM partner_contracts WHERE id = ?').get(old.id);
  eq(archived.status, 'ARCHIVED', '旧合同 ARCHIVED（历史保留）');
  eq(archived.renewal_status, 'RENEWED', '旧合同 renewalStatus=RENEWED');
  const active = db.prepare("SELECT * FROM partner_contracts WHERE partner_id = 2400 AND status = 'ACTIVE'").get();
  eq(active.contract_version, 'V2', '新合同版本 V2');
  const attr = db.prepare("SELECT effective_to FROM partner_attribution WHERE user_id = 1003 AND status = 'ACTIVE'").get();
  eq(attr.effective_to, active.contract_end, '续约后归属有效期同步新合同');

  // 终止
  r = partnerAttribution.terminateContract({ contractId: active.id, reason: '' });
  eq(r.ok, false, '缺终止原因拒绝');
  r = partnerAttribution.terminateContract({ contractId: active.id, reason: '合作终止' });
  eq(r.ok, true, '终止 ok');
  const term = db.prepare('SELECT * FROM partner_contracts WHERE id = ?').get(active.id);
  eq(term.status, 'TERMINATED', '合同 TERMINATED');
  eq(term.renewal_status, 'TERMINATED', 'renewalStatus=TERMINATED');
  const attrAfter = db.prepare("SELECT effective_to FROM partner_attribution WHERE user_id = 1003 AND status = 'ACTIVE'").get();
  eq(attrAfter.effective_to, todayStr(), '终止当日停止新计佣');
  eq(partnerEngine.findChannelPartner(1003), null, '终止后不再计佣');
  // 历史归属/订单/佣金全保留
  const cnt = db.prepare('SELECT COUNT(*) c FROM partner_attribution WHERE user_id = 1003').get().c;
  eq(cnt, 2, '归属历史版本保留（第二十三章）');
  const comms = db.prepare("SELECT COUNT(*) c FROM commission_records WHERE record_type = 'PARTNER_COMMISSION'").get().c;
  check(comms >= 2, '历史佣金记录保留');
}

console.log('\n=== 14) 管理端归属列表 + 本人视图 ===');
{
  const list = partnerAttribution.listAttributions({ status: 'ACTIVE' });
  check(list.total >= 2, `ACTIVE 归属>=2（实际 ${list.total}）`);
  const byPartner = partnerAttribution.listAttributions({ partnerId: 2400 });
  check(byPartner.total >= 1, '按 partnerId 过滤');
  const my = partnerAttribution.partnerMySettlements(2400);
  check(my.length >= 1, '本人结算单视图');
  eq(my[0].aiCostSource, 'ESTIMATED', '本人结算单 ESTIMATED 口径');
  check(my[0].estimatedAiCostYuan !== undefined, '预计AI成本字段（第16章禁冒充实际）');
  check(my[0].finalAmountYuan !== undefined, '最终金额字段');
  const myc = partnerAttribution.myContract(2400);
  check(myc.length >= 1, '本人合同视图');
  eq(myc[0].contractVersion, 'V2', '本人合同版本 V2');
}

// ============================================================================
console.log('\n==================== 测试汇总 ====================');
console.log(`PASS: ${PASS}  FAIL: ${FAIL}`);
if (FAIL > 0) {
  console.log('失败项:', failures.join(' | '));
}
try { fs.rmSync(path.dirname(TEST_ROUTER_DIR), { recursive: true, force: true }); } catch (e) {}
try { fs.rmSync(TEST_DB, { force: true }); } catch (e) {}
try {
  const wal = TEST_DB + '-wal'; const shm = TEST_DB + '-shm';
  if (fs.existsSync(wal)) fs.rmSync(wal, { force: true });
  if (fs.existsSync(shm)) fs.rmSync(shm, { force: true });
} catch (e) {}
console.log('[cleanup] 隔离 DB 已清理');
process.exit(FAIL > 0 ? 1 : 0);
