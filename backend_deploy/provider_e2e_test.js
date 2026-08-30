// ============================================================================
// provider_e2e_test.js — PROVIDER 师傅服务体系 E2E 隔离测试
//                        （FINAL-MASTER-05 第三十一~五十三章）
//   - 隔离 SQLite DB（不碰生产 users DB）
//   - Real Payment = 0（第53章：支付模拟 = bindPaymentOrder + onOrderPaid 引擎钩子，
//     不经过真实微信支付）
//   - 覆盖：
//       35章 Provider 申请（字段校验/准入三要素/重复申请/中医合规红线）
//       36章 审核状态机（DRAFT→PENDING_REVIEW→APPROVED/REJECTED/SUSPENDED/CLOSED）
//       37章 服务商品（价格区间/交付形式/上下架/冻结联动）
//       38章 价格服务端 SSOT（订单只传 serviceId；客户端 amount 不生效）
//       39章 订单状态机（非法转移拒绝/全链路推进）
//       40-41章 支付联动（回绑金额校验/onOrderPaid 幂等/金额不一致防护）
//       42章 Provider Revenue 独立（不写 commission_records / partner_order_log）
//       43章 结算快照（gross/refund/platformFee/providerRevenue/settlementStatus）
//       44章 退款（未服务全额/部分退款/超限拒绝/账本冲回/幂等）
//       45-46章 评价（仅 COMPLETED/一单一条/评分范围）
//       47章 争议（发起/一单一OPEN/仲裁退款/驳回恢复）
//       48章 提现（窗口/门槛/余额/独立账本 PROVIDER_REVENUE/审核退回）
//       49章 中医合规（敏感词拦截 + 定位声明）
//       51章 工作台 + 50章 后台统计
//       52章 完整 E2E 链路
// ============================================================================
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const TEST_DB = path.join(os.tmpdir(), 'provider_test_' + Date.now() + '_' + process.pid + '.db');
process.env.DB_PATH = TEST_DB;
const TEST_ROUTER_DIR = path.join(os.tmpdir(), 'provider_router_cfg_' + Date.now() + '_' + process.pid);
process.env.COMMISSION_ROUTER_DIR = TEST_ROUTER_DIR;

const Database = require('better-sqlite3');
{
  const init = new Database(TEST_DB);
  init.exec('CREATE TABLE IF NOT EXISTS __init(id INTEGER)');
  init.close();
}

const commissionEngine = require('./commissionEngine');
const partnerEngine = require('./partnerEngine');
const commissionRouter = require('./commissionRouter');
const providerEngine = require('./providerEngine');

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
function near(a, b, name) {
  const ok = typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 0.005;
  if (ok) { PASS++; console.log('  PASS  ' + name + ` = ${a} ≈ ${b}`); }
  else { FAIL++; failures.push(name); console.log('  FAIL  ' + name + ` (期望≈${b} 实际 ${JSON.stringify(a)})`); }
}

// ==================== fixture ====================
function setupFixtures() {
  const db = commissionEngine.getDb();
  partnerEngine.getDb();
  providerEngine.getDb();
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
  `);
  const insUser = db.prepare(`INSERT OR REPLACE INTO users (user_id, invited_by, deleted_at, member_level, nickname, phone, created_at)
    VALUES (?, ?, NULL, 'basic', ?, ?, '2026-08-01 09:00:00')`);
  insUser.run(3000, null, '师傅甲', '13000003000');   // Provider（YIXUE 类目）
  insUser.run(3100, null, '师傅乙', '13100003100');   // Provider（ZHONGYI 类目，合规测试）
  insUser.run(4000, null, '买家小言', '13200004000'); // 买家
  insUser.run(4100, null, '买家小道', '13300004100'); // 买家2
  insUser.run(2200, 1102, '合伙人A', '13400002200');  // 既是 Partner 也是推荐人（双身份不串账测试）
  insUser.run(1102, null, '上级普通人', '13500001102');
  insUser.run(1000, 2200, '渠道用户', '13600001000'); // 归属合伙人 2200 的用户
  const insPartner = db.prepare(`INSERT OR REPLACE INTO partners (user_id, real_name, contact, status, level, applied_at, reviewed_at)
    VALUES (?, ?, ?, 'APPROVED', 'NORMAL', '2026-08-10', '2026-08-11')`);
  insPartner.run(2200, '合伙人A', 'wx-a');
}

setupFixtures();
console.log('fixture 就绪（隔离DB）');

// ============================================================================
console.log('\n=== 1) 第三十五章：Provider 入驻申请 ===');
{
  // bio 过短
  let r = providerEngine.applyProvider({ userId: 3000, displayName: '师傅甲', bio: '太短', category: 'YIXUE' });
  eq(r.ok, false, 'bio<30字 拒绝');
  // 准入三要素缺失
  r = providerEngine.applyProvider({ userId: 3000, displayName: '师傅甲', bio: '深入研究传统易学文化二十年，擅长八字命理基础教学与排盘知识讲解，服务定位为知识学习与资料解释参考。', category: 'YIXUE', realName: '' });
  eq(r.ok, false, '缺实名 拒绝');
  r = providerEngine.applyProvider({ userId: 3000, displayName: '师傅甲', bio: '深入研究传统易学文化二十年，擅长八字命理基础教学与排盘知识讲解，服务定位为知识学习与资料解释参考。', category: 'YIXUE', realName: '张甲', idCardLast4: '12a4' });
  eq(r.ok, false, '证件后4位非法 拒绝');
  r = providerEngine.applyProvider({ userId: 3000, displayName: '师傅甲', bio: '深入研究传统易学文化二十年，擅长八字命理基础教学与排盘知识讲解，服务定位为知识学习与资料解释参考。', category: 'YIXUE', realName: '张甲', idCardLast4: '1234' });
  eq(r.ok, false, '缺收款账户 拒绝');

  // 中医合规红线（第四十九章）—— bio 需 ≥30 字以通过长度校验，验证敏感词扫描确实生效
  r = providerEngine.applyProvider({
    userId: 3100, displayName: '师傅乙', category: 'ZHONGYI',
    bio: '祖传中医世家行医三十余年经验丰富，可确诊各类疑难疾病并开具专属处方，保证治愈不复发的神奇疗效。', realName: '李乙', idCardLast4: '5678', payoutWechat: 'wx-3100',
  });
  check(!r.ok && /合规红线/.test(r.error), '中医敏感词（确诊/处方/保证治愈）拦截');

  // 合法申请（YIXUE）
  r = providerEngine.applyProvider({
    userId: 3000, displayName: '师傅甲', avatar: 'https://cdn.example.com/a.png',
    category: 'YIXUE', expertise: ['八字基础', '排盘讲解'], qualification: '某某协会易学研究会会员',
    bio: '深入研究传统易学文化二十年，擅长八字命理基础教学与排盘知识讲解，服务定位为知识学习与资料解释参考。',
    contact: 'wx-provider-3000', realName: '张甲', idCardLast4: '1234', payoutWechat: 'wx-3000',
  });
  eq(r.ok, true, '合法申请通过');
  eq(r.status, 'PENDING_REVIEW', '初始状态 PENDING_REVIEW');

  // 重复申请拒绝
  r = providerEngine.applyProvider({ userId: 3000, displayName: '师傅甲', bio: '深入研究传统易学文化二十年，擅长八字命理基础教学与排盘知识讲解，服务定位为知识学习与资料解释参考。', category: 'YIXUE', realName: '张甲', idCardLast4: '1234', payoutWechat: 'wx-3000' });
  eq(r.ok, false, '审核中重复申请 拒绝');

  // 中医 Provider 合法申请（知识学习定位）
  r = providerEngine.applyProvider({
    userId: 3100, displayName: '师傅乙', category: 'ZHONGYI',
    bio: '中医药知识学习与健康教育讲解者，专注黄帝内经与本草文献的资料解释参考服务，不含诊疗行为。',
    contact: 'wx-3100', realName: '李乙', idCardLast4: '5678', payoutWechat: 'wx-3100',
  });
  eq(r.ok, true, '中医类目合规申请通过');
}

console.log('\n=== 2) 第三十六章：审核状态机 ===');
{
  const db = providerEngine.getDb();
  const p3000 = providerEngine.getProviderByUserId(3000);
  const p3100 = providerEngine.getProviderByUserId(3100);
  check(!!p3000 && !!p3100, '档案已入库');

  // 非法 action
  let r = providerEngine.reviewProvider({ providerId: p3000.id, action: 'hack', admin: 'root' });
  eq(r.ok, false, '非法 action 拒绝');
  // 非法转移：直接 suspend（未 APPROVED）
  r = providerEngine.reviewProvider({ providerId: p3000.id, action: 'suspend', admin: 'root' });
  eq(r.ok, false, 'PENDING_REVIEW→SUSPENDED 非法转移拒绝');

  // 正常审核通过
  r = providerEngine.reviewProvider({ providerId: p3000.id, action: 'approve', admin: 'root' });
  eq(r.ok, true, '3000 审核通过 APPROVED');
  r = providerEngine.reviewProvider({ providerId: p3100.id, action: 'approve', admin: 'root' });
  eq(r.ok, true, '3100 审核通过 APPROVED');

  // 重复审核拒绝
  r = providerEngine.reviewProvider({ providerId: p3000.id, action: 'approve', admin: 'root' });
  eq(r.ok, false, '已 APPROVED 重复审核 拒绝');

  // 审计字段
  const row = db.prepare('SELECT status, reviewed_by FROM providers WHERE id = ?').get(p3000.id);
  eq(row.status, 'APPROVED', 'DB status=APPROVED');
  eq(row.reviewed_by, 'root', 'DB reviewed_by 留痕');
}

console.log('\n=== 3) 第三十七~三十八章：服务商品 + 价格 SSOT ===');
{
  // 价格区间
  let r = providerEngine.createService({ userId: 3000, serviceName: '八字排盘讲解', description: '讲解八字排盘基础知识与命盘结构，包含四柱关系与十神含义的知识说明。', price: 1, deliveryType: 'TEXT', duration: 60 });
  eq(r.ok, false, '价格低于下限 拒绝');
  r = providerEngine.createService({ userId: 3000, serviceName: '八字排盘讲解', description: '讲解八字排盘基础知识与命盘结构，包含四柱关系与十神含义的知识说明。', price: 99999, deliveryType: 'TEXT', duration: 60 });
  eq(r.ok, false, '价格高于上限 拒绝');
  // deliveryType 非法
  r = providerEngine.createService({ userId: 3000, serviceName: '八字排盘讲解', description: '讲解八字排盘基础知识与命盘结构，包含四柱关系与十神含义的知识说明。', price: 88, deliveryType: 'SMS', duration: 60 });
  eq(r.ok, false, 'deliveryType 非法 拒绝');
  // 描述过短
  r = providerEngine.createService({ userId: 3000, serviceName: '八字', description: '短', price: 88, deliveryType: 'TEXT', duration: 60 });
  eq(r.ok, false, '描述<20字 拒绝');

  // 中医服务合规
  r = providerEngine.createService({ userId: 3100, serviceName: '体质调理处方', description: '根据体质开出处方并保证治愈所有慢性疾病，提供确诊服务。', price: 128, deliveryType: 'TEXT', duration: 60 });
  check(!r.ok && /合规红线/.test(r.error), '中医服务敏感词（处方/治愈/确诊）拦截');

  // 合法上架
  r = providerEngine.createService({ userId: 3000, serviceName: '八字排盘知识讲解', description: '一对一讲解八字排盘基础知识与命盘结构，包含四柱关系与十神含义的知识说明与资料解读参考。', price: 88, deliveryType: 'VOICE', duration: 60, availability: '每日 19:00-22:00' });
  eq(r.ok, true, '服务上架成功');
  global.__svc = r.serviceId;
  const svc = providerEngine.getService(r.serviceId);
  eq(svc.price_cents, 8800, '价格 SSOT 整数分存储（88元=8800分）');
  eq(svc.status, 'ONLINE', '初始 ONLINE');

  // 价格 SSOT 查询
  const gp = providerEngine.getServicePrice(r.serviceId);
  eq(gp.priceCents, 8800, 'getServicePrice 返回 SSOT 价格');
  eq(gp.price, 88, 'getServicePrice 元口径');

  // 修改价格
  let u = providerEngine.updateService({ userId: 3000, serviceId: r.serviceId, price: 128 });
  eq(u.ok, true, '服务改价成功');
  eq(providerEngine.getService(r.serviceId).price_cents, 12800, '改价后 SSOT=12800分');

  // 他人无权修改
  u = providerEngine.updateService({ userId: 4000, serviceId: r.serviceId, price: 1 });
  eq(u.ok, false, '他人改服务 拒绝');

  // 下架后不可下单
  providerEngine.setServiceStatus({ userId: 3000, serviceId: r.serviceId, status: 'OFFLINE' });
  let o = providerEngine.createServiceOrder({ userId: 4000, serviceId: r.serviceId });
  eq(o.ok, false, 'OFFLINE 服务下单 拒绝');
  providerEngine.setServiceStatus({ userId: 3000, serviceId: r.serviceId, status: 'ONLINE' });
}

console.log('\n=== 4) 第三十八~三十九章：订单创建 + 状态机 ===');
{
  // 自己买自己的服务
  let r = providerEngine.createServiceOrder({ userId: 3000, serviceId: global.__svc });
  eq(r.ok, false, '预约自己的服务 拒绝');
  // 客户端传 amount 无效（服务端 SSOT）
  r = providerEngine.createServiceOrder({ userId: 4000, serviceId: global.__svc, amount: 0.01, requirement: '想学习八字排盘基础知识' });
  eq(r.ok, true, '买家下单成功');
  eq(r.priceCents, 12800, '订单金额=服务端 SSOT（128元，客户端0.01元被忽略）');
  global.__order = r.orderNo;

  const db = providerEngine.getDb();
  const o = db.prepare('SELECT * FROM service_orders WHERE order_no = ?').get(global.__order);
  eq(o.status, 'PENDING_PAYMENT', '初始 PENDING_PAYMENT');
  eq(o.platform_fee_cents, 1280, '平台费 10% = 1280分');
  eq(o.provider_revenue_cents, 11520, 'Provider 收益 = 11520分（金额守恒）');

  // 未支付重复挂单
  r = providerEngine.createServiceOrder({ userId: 4000, serviceId: global.__svc });
  eq(r.ok, false, '同一买家未支付挂单去重 拒绝');

  // 非法状态转移：PENDING_PAYMENT → COMPLETED
  const bad = providerEngine.confirmOrder({ userId: 3000, orderNo: global.__order });
  eq(bad.ok, false, 'PENDING_PAYMENT 接单 拒绝');
}

console.log('\n=== 5) 第四十~四十一章：支付联动（Real Payment = 0） ===');
{
  // 回绑金额不一致拒绝
  let r = providerEngine.bindPaymentOrder(global.__order, 'PAY_MISMATCH_001', 50);
  eq(r.ok, false, '回绑金额不一致 拒绝（SSOT 防篡改）');

  // 正确回绑
  r = providerEngine.bindPaymentOrder(global.__order, 'PAY_0001', 128);
  eq(r.ok, true, '支付单回绑成功');
  // 重复回绑幂等
  r = providerEngine.bindPaymentOrder(global.__order, 'PAY_0002', 128);
  check(r.ok && r.already, '重复回绑幂等拦截');

  // 支付成功联动
  r = providerEngine.onOrderPaid('PAY_0001', 128);
  eq(r.ok, true, 'onOrderPaid 成功');
  eq(r.orderNo, global.__order, '返回服务订单号');
  // 幂等
  r = providerEngine.onOrderPaid('PAY_0001', 128);
  check(r.ok && r.skipped, '重复支付回调幂等拦截');

  const db = providerEngine.getDb();
  const o = db.prepare('SELECT status, paid_at FROM service_orders WHERE order_no = ?').get(global.__order);
  eq(o.status, 'PAID', '订单状态 PAID');
  check(!!o.paid_at, 'paid_at 时间戳落库');
  const svc = providerEngine.getService(global.__svc);
  eq(svc.sales_count, 1, '销量 +1');

  // 金额不一致防护：新订单支付金额错误 → REFUND_PENDING
  const o2 = providerEngine.createServiceOrder({ userId: 4100, serviceId: global.__svc });
  providerEngine.bindPaymentOrder(o2.orderNo, 'PAY_0002', 128);
  const r2 = providerEngine.onOrderPaid('PAY_0002', 66.66);
  check(r2.ok && r2.amountMismatch === true, '支付金额不一致 → 标记 REFUND_PENDING');
  const o2row = db.prepare('SELECT status FROM service_orders WHERE order_no = ?').get(o2.orderNo);
  eq(o2row.status, 'REFUND_PENDING', '金额不一致订单进入 REFUND_PENDING');
  global.__order2 = o2.orderNo;
}

console.log('\n=== 6) 第三十九~四十三章：确认 → 服务 → 完成 → 结算 ===');
{
  // Provider 接单
  let r = providerEngine.confirmOrder({ userId: 3000, orderNo: global.__order });
  eq(r.ok, true, 'Provider 接单 CONFIRMED');
  // 买家无权接单
  r = providerEngine.confirmOrder({ userId: 4000, orderNo: global.__order });
  eq(r.ok, false, '买家接单 拒绝');

  // 开始服务
  r = providerEngine.startService({ userId: 3000, orderNo: global.__order });
  eq(r.ok, true, '开始服务 IN_SERVICE');

  // 完成服务 → 结算
  r = providerEngine.completeOrder({ userId: 3000, orderNo: global.__order, deliverNote: '已完成60分钟语音讲解并交付学习资料' });
  eq(r.ok, true, '完成服务 COMPLETED');
  check(!!r.settlementNo, '结算单号已生成');

  const db = providerEngine.getDb();
  const o = db.prepare('SELECT status, completed_at FROM service_orders WHERE order_no = ?').get(global.__order);
  eq(o.status, 'COMPLETED', '订单 COMPLETED');

  // 第四十三章：结算快照字段全集
  const s = db.prepare('SELECT * FROM provider_settlements WHERE order_no = ?').get(global.__order);
  check(!!s, '结算单已生成');
  eq(s.gross_cents, 12800, 'settlement gross=12800分');
  eq(s.refund_cents, 0, 'settlement refund=0');
  eq(s.platform_fee_cents, 1280, 'settlement platformFee=1280分');
  eq(s.provider_revenue_cents, 11520, 'settlement providerRevenue=11520分');
  eq(s.settlement_status, 'PENDING', 'settlementStatus=PENDING（T+settleDays）');
  check(!!s.settle_due_at, 'settle_due_at 到期时间已设置');

  // 幂等：重复完成不重复入账
  r = providerEngine.completeOrder({ userId: 3000, orderNo: global.__order });
  check(r.ok && r.settlementSkipped === true, '重复完成幂等（结算不重复）');
  const cnt = db.prepare('SELECT COUNT(*) c FROM provider_settlements WHERE order_no = ?').get(global.__order).c;
  eq(cnt, 1, '结算单仅一条');

  // Provider 独立账本 frozen
  const acct = db.prepare('SELECT * FROM provider_accounts WHERE user_id = 3000').get();
  eq(acct.frozen_cents, 11520, '独立账本 frozen=11520分');
  eq(acct.total_revenue_cents, 11520, '独立账本 totalRevenue=11520分');
  eq(acct.withdrawable_cents, 0, '未到期 withdrawable=0');
}

console.log('\n=== 7) 第四十二~四十五章：账本隔离 + 评价 ===');
{
  const db = providerEngine.getDb();

  // 42章：SERVICE_ORDER 订单禁止进入 Commission Router（防御性第二道闸验证）
  const rr = commissionRouter.processPaidOrder({ orderId: 'X-SO-0001', userId: '4000', type: 'SERVICE_ORDER', amount: 128, title: '传统文化学习咨询服务' });
  check(rr && rr.reason === 'SKIP_PROVIDER_ORDER', 'Router 拒绝 SERVICE_ORDER（SKIP_PROVIDER_ORDER）');
  const crecords = db.prepare("SELECT COUNT(*) c FROM commission_records WHERE order_no = 'X-SO-0001'").get().c;
  const plog = db.prepare("SELECT COUNT(*) c FROM partner_order_log WHERE order_no = 'X-SO-0001'").get().c;
  let snaps = 0;
  try { snaps = db.prepare("SELECT COUNT(*) c FROM commission_router_snapshots WHERE order_no = 'X-SO-0001'").get().c; } catch (e) { snaps = 0; }
  eq(crecords, 0, '无 Referral Commission 记录（第42章隔离）');
  eq(plog, 0, '无 Partner Revenue 记录（第42章隔离）');
  eq(snaps, 0, '无 Router 快照记录');

  // 45章：仅 COMPLETED 可评价
  let r = providerEngine.reviewOrder({ userId: 4000, orderNo: global.__order, rating: 5, content: '讲解非常清楚，受益匪浅' });
  // 订单已是 COMPLETED → 允许
  eq(r.ok, true, 'COMPLETED 订单评价成功');
  // 46章：一单一条（幂等）
  r = providerEngine.reviewOrder({ userId: 4000, orderNo: global.__order, rating: 4, content: '再来一条' });
  eq(r.ok, false, '同一订单重复评价 拒绝');
  // 非 COMPLETED 评价拒绝
  r = providerEngine.reviewOrder({ userId: 4100, orderNo: global.__order2, rating: 5 });
  eq(r.ok, false, '非 COMPLETED 评价 拒绝');
  // 评分范围
  const o3 = (() => {
    const rr = providerEngine.createServiceOrder({ userId: 4100, serviceId: global.__svc });
    providerEngine.bindPaymentOrder(rr.orderNo, 'PAY_0003', 128);
    providerEngine.onOrderPaid('PAY_0003', 128);
    providerEngine.confirmOrder({ userId: 3000, orderNo: rr.orderNo });
    providerEngine.startService({ userId: 3000, orderNo: rr.orderNo });
    providerEngine.completeOrder({ userId: 3000, orderNo: rr.orderNo });
    return rr.orderNo;
  })();
  r = providerEngine.reviewOrder({ userId: 4100, orderNo: o3, rating: 9 });
  eq(r.ok, false, '评分超范围 拒绝');
  r = providerEngine.reviewOrder({ userId: 4100, orderNo: o3, rating: 5, content: '师傅很专业' });
  eq(r.ok, true, '第二单评价成功');

  // 评分统计
  const pr = providerEngine.providerRating(providerEngine.getProviderByUserId(3000).id);
  eq(pr.reviewCount, 2, '评价计数=2');
  eq(pr.avgRating, 5, '平均分=5');

  global.__order3 = o3;
}

console.log('\n=== 8) 第四十三章：结算解冻（T+settleDays） ===');
{
  const db = providerEngine.getDb();
  // 未到期不解冻
  let r = providerEngine.settleDueSettlements();
  eq(r.settled, 0, '未到期不解冻');

  // 模拟到期
  db.prepare('UPDATE provider_settlements SET settle_due_at = ? WHERE order_no = ?')
    .run('2026-01-01T00:00:00.000Z', global.__order);
  r = providerEngine.settleDueSettlements();
  check(r.settled >= 1, '到期结算解冻执行');
  const s = db.prepare('SELECT settlement_status FROM provider_settlements WHERE order_no = ?').get(global.__order);
  eq(s.settlement_status, 'SETTLED', 'settlementStatus=SETTLED');
  const acct = db.prepare('SELECT * FROM provider_accounts WHERE user_id = 3000').get();
  eq(acct.withdrawable_cents, 11520, 'withdrawable=11520分');
  // order3 在第7节已结算入 frozen（未到期）→ 解冻 order1 后 frozen 仍剩 order3 的 11520
  eq(acct.frozen_cents, 11520, 'frozen=11520（order3 仍在 T+settleDays 冻结中）');
  // 幂等：重复解冻
  r = providerEngine.settleDueSettlements();
  const acct2 = db.prepare('SELECT withdrawable_cents FROM provider_accounts WHERE user_id = 3000').get();
  eq(acct2.withdrawable_cents, 11520, '重复解冻幂等（金额不变）');
}

console.log('\n=== 9) 第四十八章：Provider 提现（PROVIDER_REVENUE 独立账本） ===');
{
  const db = providerEngine.getDb();
  // 窗口校验：每月16日-月末。测试强制在窗口内（withdrawOpenDay=1）
  const cfg = providerEngine.getConfig();
  providerEngine.saveConfig({ ...cfg, withdrawOpenDay: 1, dailyWithdrawLimit: 1 });

  let r = providerEngine.applyProviderWithdrawal({ userId: 3000, amount: 1 });
  eq(r.ok, false, '低于门槛 拒绝');
  r = providerEngine.applyProviderWithdrawal({ userId: 3000, amount: 999999 });
  eq(r.ok, false, '超出余额 拒绝');

  r = providerEngine.applyProviderWithdrawal({ userId: 3000, amount: 50 });
  eq(r.ok, true, '提现申请成功');
  eq(r.ledgerType, 'PROVIDER_REVENUE', 'ledger_type=PROVIDER_REVENUE');
  const acct = db.prepare('SELECT withdrawable_cents FROM provider_accounts WHERE user_id = 3000').get();
  eq(acct.withdrawable_cents, 6520, '提现后 withdrawable=6520分');
  const wd = db.prepare('SELECT * FROM provider_withdrawals WHERE withdraw_no = ?').get(r.withdrawNo);
  eq(wd.status, 'PENDING_REVIEW', '提现单 PENDING_REVIEW');
  eq(wd.ledger_type, 'PROVIDER_REVENUE', 'DB ledger_type 留痕');

  // 每日次数限制（dailyWithdrawLimit=1：当日第 2 笔被拒）
  r = providerEngine.applyProviderWithdrawal({ userId: 3000, amount: 20 });
  check(!r.ok, '每日提现次数限制拦截');
  check(!r.withdrawNo, '被拦截申请未生成提现单');

  // 放开次数限制（驳回退回后当日需可再次申请）
  providerEngine.saveConfig({ ...providerEngine.getConfig(), dailyWithdrawLimit: 5 });

  // 管理端驳回 → 余额退回（驳回第一笔 50 元）
  let pr = providerEngine.processWithdrawal({ withdrawNo: wd.withdraw_no, action: 'reject', admin: 'root', reason: '账户信息待核实' });
  eq(pr.ok, true, '提现驳回成功');
  const acct2 = db.prepare('SELECT withdrawable_cents FROM provider_accounts WHERE user_id = 3000').get();
  eq(acct2.withdrawable_cents, 11520, '驳回后余额退回 11520分');
  // 重复处理幂等
  pr = providerEngine.processWithdrawal({ withdrawNo: wd.withdraw_no, action: 'approve', admin: 'root' });
  eq(pr.ok, false, '已处理提现单重复操作 拒绝');

  // 再次申请 → 通过
  const r2 = providerEngine.applyProviderWithdrawal({ userId: 3000, amount: 30 });
  eq(r2.ok, true, '再次提现申请成功');
  const pr2 = providerEngine.processWithdrawal({ withdrawNo: r2.withdrawNo, action: 'approve', admin: 'root' });
  eq(pr2.ok, true, '提现审核通过 PAID');
  const wd2 = db.prepare('SELECT status, paid_at FROM provider_withdrawals WHERE withdraw_no = ?').get(r2.withdrawNo);
  eq(wd2.status, 'PAID', '提现单 PAID');
  check(!!wd2.paid_at, 'paid_at 落库');
}

console.log('\n=== 10) 第四十四章：全额退款（争议前） ===');
{
  const db = providerEngine.getDb();
  // order3 已完成已评价，测试 COMPLETED 状态全额退款
  let r = providerEngine.refundOrder({ orderNo: global.__order3, full: true, admin: 'root' });
  eq(r.ok, true, '全额退款成功');
  eq(r.full, true, '标记全额');

  const o = db.prepare('SELECT status, refund_cents FROM service_orders WHERE order_no = ?').get(global.__order3);
  eq(o.status, 'REFUNDED', '订单 REFUNDED');
  eq(o.refund_cents, 12800, 'refund_cents=12800分');

  const s = db.prepare('SELECT settlement_status FROM provider_settlements WHERE order_no = ?').get(global.__order3);
  eq(s.settlement_status, 'REVERSED', '结算单 REVERSED');

  const acct = db.prepare('SELECT withdrawable_cents, total_revenue_cents FROM provider_accounts WHERE user_id = 3000').get();
  // order3 收益11520已frozen（未到期）→ 冲销 frozen
  eq(acct.total_revenue_cents, 11520, '总收益扣回（仅剩order1的11520）');
  const frz = db.prepare('SELECT frozen_cents FROM provider_accounts WHERE user_id = 3000').get();
  eq(frz.frozen_cents, 0, 'order3 frozen 已冲销');

  // 幂等：重复退款拒绝（累计不得超过实付）
  r = providerEngine.refundOrder({ orderNo: global.__order3, full: true, admin: 'root' });
  check(!r.ok, 'REFUNDED 订单重复退款 拒绝');
}

console.log('\n=== 11) 第四十四章：部分退款 ===');
{
  const db = providerEngine.getDb();
  // 新订单完整流程 → 部分退款
  const oNo = (() => {
    const rr = providerEngine.createServiceOrder({ userId: 4000, serviceId: global.__svc });
    providerEngine.bindPaymentOrder(rr.orderNo, 'PAY_0004', 128);
    providerEngine.onOrderPaid('PAY_0004', 128);
    providerEngine.confirmOrder({ userId: 3000, orderNo: rr.orderNo });
    providerEngine.startService({ userId: 3000, orderNo: rr.orderNo });
    providerEngine.completeOrder({ userId: 3000, orderNo: rr.orderNo });
    return rr.orderNo;
  })();

  let r = providerEngine.refundOrder({ orderNo: oNo, refundAmount: 200, admin: 'root' });
  check(!r.ok, '退款超过实付 拒绝');
  r = providerEngine.refundOrder({ orderNo: oNo, refundAmount: 28, admin: 'root' });
  eq(r.ok, true, '部分退款成功（28元）');
  eq(r.full, false, '标记部分退款');

  const o = db.prepare('SELECT status, refund_cents FROM service_orders WHERE order_no = ?').get(oNo);
  eq(o.refund_cents, 2800, 'refund_cents=2800分');
  check(o.status === 'COMPLETED', '部分退款订单保持 COMPLETED');

  const s = db.prepare('SELECT settlement_status, refund_cents, provider_revenue_cents FROM provider_settlements WHERE order_no = ?').get(oNo);
  eq(s.settlement_status, 'PARTIAL_REFUND', 'settlementStatus=PARTIAL_REFUND');
  eq(s.refund_cents, 2800, '结算单退款留痕 2800分');
  // 剩余收入 = (12800-2800)*(1-10%) = 9000
  eq(s.provider_revenue_cents, 9000, '冲减后 providerRevenue=9000分');

  // 累计退款上限
  r = providerEngine.refundOrder({ orderNo: oNo, refundAmount: 100.01, admin: 'root' });
  check(!r.ok, '累计退款超实付 拒绝');
  // 再退 100 → 全额
  r = providerEngine.refundOrder({ orderNo: oNo, refundAmount: 100, admin: 'root' });
  eq(r.ok, true, '累计退款至全额成功');
  const o2 = db.prepare('SELECT status, refund_cents FROM service_orders WHERE order_no = ?').get(oNo);
  eq(o2.status, 'REFUNDED', '累计全额后 REFUNDED');
  eq(o2.refund_cents, 12800, '累计 refund_cents=12800分');
}

console.log('\n=== 12) 第四十七章：投诉争议 ===');
{
  // 新订单 → 争议
  const oNo = (() => {
    const rr = providerEngine.createServiceOrder({ userId: 4000, serviceId: global.__svc });
    providerEngine.bindPaymentOrder(rr.orderNo, 'PAY_0005', 128);
    providerEngine.onOrderPaid('PAY_0005', 128);
    providerEngine.confirmOrder({ userId: 3000, orderNo: rr.orderNo });
    return rr.orderNo;
  })();

  // 原因过短
  let r = providerEngine.raiseDispute({ userId: 4000, orderNo: oNo, reason: '太短' });
  eq(r.ok, false, '争议原因<10字 拒绝');
  // 无关人发起
  r = providerEngine.raiseDispute({ userId: 9999, orderNo: oNo, reason: '与订单无关的第三人来发起争议测试' });
  eq(r.ok, false, '非当事人发起争议 拒绝');

  r = providerEngine.raiseDispute({ userId: 4000, orderNo: oNo, reason: '服务与描述严重不符，要求平台介入仲裁处理', evidence: ['evidence_text_1', 'attachment_ref_2'] });
  eq(r.ok, true, '买家发起争议成功');
  const db = providerEngine.getDb();
  const o = db.prepare('SELECT status FROM service_orders WHERE order_no = ?').get(oNo);
  eq(o.status, 'DISPUTED', '订单 DISPUTED');

  // 一单一 OPEN
  r = providerEngine.raiseDispute({ userId: 4000, orderNo: oNo, reason: '再来一次重复争议发起测试看会不会被拦截' });
  eq(r.ok, false, '重复 OPEN 争议 拒绝');

  const dno = db.prepare("SELECT dispute_no FROM provider_disputes WHERE order_no = ? AND status = 'OPEN'").get(oNo).dispute_no;

  // 处理说明过短
  r = providerEngine.resolveDispute({ disputeNo: dno, outcome: 'REFUND_FULL', resolution: '短', admin: 'root' });
  eq(r.ok, false, '处理说明<5字 拒绝');

  // 仲裁缺操作人拒绝（第四十七章：管理端动作留痕）
  r = providerEngine.resolveDispute({ disputeNo: dno, outcome: 'REFUND_FULL', resolution: '经核实服务确与描述不符，支持买家全额退款' });
  eq(r.ok, false, '仲裁缺操作人 拒绝');

  // 仲裁：买家胜 → 全额退款
  r = providerEngine.resolveDispute({ disputeNo: dno, outcome: 'REFUND_FULL', resolution: '经核实服务确与描述不符，支持买家全额退款', admin: 'root' });
  eq(r.ok, true, '争议仲裁退款成功');
  const d = db.prepare('SELECT status FROM provider_disputes WHERE dispute_no = ?').get(dno);
  eq(d.status, 'RESOLVED_REFUND', '争议状态 RESOLVED_REFUND');
  const o2 = db.prepare('SELECT status FROM service_orders WHERE order_no = ?').get(oNo);
  eq(o2.status, 'REFUNDED', '仲裁后订单 REFUNDED');

  // 第二单争议 → 驳回（Provider 胜）
  const oNo2 = (() => {
    const rr = providerEngine.createServiceOrder({ userId: 4100, serviceId: global.__svc });
    providerEngine.bindPaymentOrder(rr.orderNo, 'PAY_0006', 128);
    providerEngine.onOrderPaid('PAY_0006', 128);
    providerEngine.confirmOrder({ userId: 3000, orderNo: rr.orderNo });
    return rr.orderNo;
  })();
  const r2 = providerEngine.raiseDispute({ userId: 4100, orderNo: oNo2, reason: '主观不满意想要退款，但没有实质依据支撑' });
  eq(r2.ok, true, '第二单争议发起成功');
  const dno2 = db.prepare("SELECT dispute_no FROM provider_disputes WHERE order_no = ? AND status = 'OPEN'").get(oNo2).dispute_no;
  const r3 = providerEngine.resolveDispute({ disputeNo: dno2, outcome: 'REJECT', resolution: '买家主张无依据，服务已按约提供，驳回售后', admin: 'root' });
  eq(r3.ok, true, '争议驳回成功');
  const o3 = db.prepare('SELECT status FROM service_orders WHERE order_no = ?').get(oNo2);
  eq(o3.status, 'IN_SERVICE', '驳回后订单恢复 IN_SERVICE');
  const d2 = db.prepare('SELECT status FROM provider_disputes WHERE dispute_no = ?').get(dno2);
  eq(d2.status, 'RESOLVED_REJECT', '争议状态 RESOLVED_REJECT');
}

console.log('\n=== 13) 第三十六章：SUSPENDED/CLOSED 与服务冻结联动 ===');
{
  const db = providerEngine.getDb();
  const p = providerEngine.getProviderByUserId(3000);
  // SUSPEND：在架服务冻结
  let r = providerEngine.reviewProvider({ providerId: p.id, action: 'suspend', admin: 'root' });
  eq(r.ok, true, 'SUSPENDED 成功');
  const svc = providerEngine.getService(global.__svc);
  eq(svc.status, 'FROZEN', 'SUSPENDED 后服务 FROZEN');
  // 冻结服务不可下单
  const o = providerEngine.createServiceOrder({ userId: 4000, serviceId: global.__svc });
  eq(o.ok, false, 'FROZEN 服务下单 拒绝');
  // RESUME：服务恢复
  r = providerEngine.reviewProvider({ providerId: p.id, action: 'resume', admin: 'root' });
  eq(r.ok, true, 'RESUME 成功');
  eq(providerEngine.getService(global.__svc).status, 'ONLINE', 'RESUME 后服务 ONLINE');
  // Provider 本人无权冻结
  const sf = providerEngine.setServiceStatus({ userId: 3000, serviceId: global.__svc, status: 'FROZEN' });
  eq(sf.ok, false, 'Provider 本人冻结 拒绝（仅管理端）');
  // 管理端冻结
  const sf2 = providerEngine.setServiceStatus({ serviceId: global.__svc, status: 'FROZEN', admin: true });
  eq(sf2.ok, true, '管理端冻结服务成功');
  providerEngine.setServiceStatus({ serviceId: global.__svc, status: 'ONLINE', admin: true });
}

console.log('\n=== 14) 第五十~五十一章：工作台 + 后台统计 ===');
{
  const d = providerEngine.providerDashboard(3000);
  eq(d.ok, true, '工作台加载成功');
  check(!!d.provider && d.provider.status === 'APPROVED', '工作台档案字段');
  check(d.account.ledgerType === 'PROVIDER_REVENUE', '工作台账本类型 PROVIDER_REVENUE');
  check(d.rating.reviewCount >= 2, '工作台评分统计');
  check(!!d.orders.COMPLETED || d.orders.REFUNDED, '工作台订单状态统计');

  const stats = providerEngine.adminStats();
  check(stats.providers.total >= 2, '后台 Provider 总数');
  check(!!stats.orders.total && stats.orders.total > 0, '后台订单总数');
  check(!!stats.revenue.providerRevenueYuan, '后台收益统计');
  const d3100 = providerEngine.providerDashboard(3100);
  check(d3100.provider.compliance && !!d3100.provider.compliance.disclaimer, '中医 Provider 合规声明返回');

  // 管理端列表
  const lp = providerEngine.listProvidersAdmin({ status: 'APPROVED' });
  check(lp.total >= 1, '管理端 Provider 列表');
  const ls = providerEngine.listSettlementsAdmin({});
  check(ls.total >= 3, '管理端结算单列表');
  const lw = providerEngine.listWithdrawalsAdmin({});
  check(lw.total >= 2, '管理端提现列表');
  check(lw.list.every(w => w.ledgerType === 'PROVIDER_REVENUE'), '提现列表 ledgerType 全部 PROVIDER_REVENUE');
}

console.log('\n=== 15) 第三十三~三十四章：localStorage 替代（服务端 SSOT） ===');
{
  // 服务端数据库为唯一事实源：重启后数据仍可查（SQLite 持久化）
  const db = providerEngine.getDb();
  const tables = ['providers', 'provider_services', 'service_orders', 'provider_reviews',
    'provider_settlements', 'provider_accounts', 'provider_withdrawals', 'provider_disputes'];
  for (const t of tables) {
    const cnt = db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
    check(cnt >= 0, `SSOT 表 ${t} 存在且可查（${cnt} 行）`);
  }
  check(db.prepare('SELECT COUNT(*) c FROM providers').get().c >= 2, 'Provider 档案入库');
}

console.log('\n=== 16) 第四十二章：Provider 与 Partner/Referral 账务隔离（双身份不串账） ===');
{
  // 3000 Provider 同时是 Partner 2200 渠道用户 1000 的推荐链外的普通用户？
  // 验证：Provider 收益仅存在于 provider_accounts，commission_accounts / partner 表无 Provider 收益
  const db = providerEngine.getDb();
  const pa = db.prepare('SELECT total_revenue_cents FROM provider_accounts WHERE user_id = 3000').get();
  check(pa.total_revenue_cents > 0, 'Provider 账本有收益');
  const ca = db.prepare('SELECT withdrawable_cents, frozen_cents FROM commission_accounts WHERE user_id = 3000').get();
  check(!ca || (ca.withdrawable_cents === 0 && ca.frozen_cents === 0), '佣金账本无 Provider 收益（账务隔离）');

  // Partner 侧：2200 的 partner 渠道账与 Provider 账本分离
  const pe = db.prepare('SELECT COUNT(*) c FROM partner_order_log').get().c;
  check(pe === 0, 'Provider 服务订单未写 partner_order_log（不进 Partner Revenue）');
}

// ============================================================================
console.log('\n==========================================');
console.log(`PROVIDER E2E 结果：PASS=${PASS} FAIL=${FAIL}`);
if (failures.length) {
  console.log('失败项：');
  for (const f of failures) console.log('  - ' + f);
}
console.log('==========================================');
try { fs.unlinkSync(TEST_DB); } catch (e) {}
process.exit(FAIL ? 1 : 0);
