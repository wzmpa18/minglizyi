/**
 * P8-DISTRIBUTION-COMMISSION-AUTO 阶段一集成测试
 * 在服务器真实环境执行（直接调 commissionEngine，模拟支付钩子）
 * 验收标准：1.分佣入账 2.幂等防重 3.比例配置生效 4.明细准确 5.退款冲正
 * 测试数据：TESTP8_* 订单号，结束后全量清理+账户快照还原
 */
'use strict';

const engine = require('/www/yandaoguoxue-backend/commissionEngine.js');
const db = engine.getDb();

const results = [];
function check(name, cond, detail) {
  results.push({ name, pass: !!cond, detail: detail || '' });
  console.log(`${cond ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`);
}

// ---- 0. 找一组真实邀请关系（level=1）----
const rel = db.prepare('SELECT inviter_id, invitee_id FROM user_invite_relation WHERE level = 1 LIMIT 1').get()
  || (() => {
    const u = db.prepare('SELECT user_id, invited_by FROM users WHERE invited_by IS NOT NULL AND invited_by != user_id LIMIT 1').get();
    return u ? { inviter_id: u.invited_by, invitee_id: u.user_id } : null;
  })();

if (!rel) {
  console.log('SKIP: 无邀请关系数据，无法测试');
  process.exit(2);
}
const INVITER = rel.inviter_id, PAYER = rel.invitee_id;
console.log(`测试邀请对: 推荐人=${INVITER} 付款人=${PAYER}`);

// ---- 账户快照（测试后还原） ----
engine.getDb().prepare('INSERT OR IGNORE INTO commission_accounts (user_id, updated_at) VALUES (?, ?)').run(INVITER, new Date().toISOString());
const acctBefore = db.prepare('SELECT * FROM commission_accounts WHERE user_id = ?').get(INVITER);
const cfgBefore = JSON.parse(JSON.stringify(engine.getConfig()));
const TEST_ORDER = 'TESTP8_' + Date.now();
const TEST_ORDER2 = 'TESTP8B_' + Date.now();

try {
  // ---- 1. 验收1：支付成功 → 待解冻金额正确增加 ----
  const cfg = engine.getConfig();
  const baseYuan = 100; // 100元
  const expectRatio = cfg.ratios.MEMBERSHIP;
  const expectCents = Math.floor(baseYuan * 100 * expectRatio / 100);
  const r1 = engine.grantCommission({ orderId: TEST_ORDER, userId: PAYER, type: 'MEMBERSHIP', amount: baseYuan, title: 'P8集成测试订单' });
  check('验收1: 分佣入账成功', r1.granted === true, JSON.stringify(r1));
  const acct1 = db.prepare('SELECT * FROM commission_accounts WHERE user_id = ?').get(INVITER);
  check('验收1: 待解冻增加=' + expectCents + '分', acct1.frozen_cents - acctBefore.frozen_cents === expectCents, `frozen ${acctBefore.frozen_cents}→${acct1.frozen_cents}`);
  check('验收1: 累计收益增加', acct1.total_earnings_cents - acctBefore.total_earnings_cents === expectCents);

  // ---- 2. 验收2：重复回调 → 佣金不重复发放（幂等） ----
  const r2 = engine.grantCommission({ orderId: TEST_ORDER, userId: PAYER, type: 'MEMBERSHIP', amount: baseYuan, title: '重复回调' });
  check('验收2: 幂等拒绝 DUPLICATE', r2.granted === false && r2.reason === 'DUPLICATE', JSON.stringify(r2));
  const cnt = db.prepare("SELECT COUNT(*) c FROM commission_records WHERE order_no = ?").get(TEST_ORDER).c;
  check('验收2: 记录仅1条', cnt === 1, `count=${cnt}`);
  const acct2 = db.prepare('SELECT frozen_cents FROM commission_accounts WHERE user_id = ?').get(INVITER);
  check('验收2: 金额未重复增加', acct2.frozen_cents === acct1.frozen_cents);

  // ---- 3. 验收3：后台改比例 → 新订单按新比例 ----
  const newRatio = 15;
  engine.saveConfig({ ...cfg, ratios: { ...cfg.ratios, MEMBERSHIP: newRatio } });
  const r3 = engine.grantCommission({ orderId: TEST_ORDER2, userId: PAYER, type: 'MEMBERSHIP', amount: baseYuan, title: '新比例订单' });
  const rec2 = db.prepare("SELECT ratio_percent, commission_cents FROM commission_records WHERE order_no = ?").get(TEST_ORDER2);
  check('验收3: 新订单用新比例', r3.granted && rec2.ratio_percent === newRatio && rec2.commission_cents === 1500, JSON.stringify(rec2));
  const rec1 = db.prepare("SELECT ratio_percent FROM commission_records WHERE order_no = ?").get(TEST_ORDER);
  check('验收3: 历史订单比例不变', rec1.ratio_percent === expectRatio, `old=${rec1.ratio_percent}`);
  engine.saveConfig(cfgBefore); // 还原配置

  // ---- 4. 验收4：明细数据准确（订单/用户/金额一一对应） ----
  const rec1Full = db.prepare("SELECT * FROM commission_records WHERE order_no = ?").get(TEST_ORDER);
  check('验收4: 明细字段完整', rec1Full.payer_user_id === PAYER && rec1Full.inviter_user_id === INVITER
    && rec1Full.base_amount_cents === 10000 && rec1Full.commission_cents === expectCents && rec1Full.status === 'FROZEN', JSON.stringify(rec1Full));

  // ---- 5. 解冻机制：到期转可提现 ----
  db.prepare("UPDATE commission_records SET unfreeze_at = ? WHERE order_no = ?").run('2020-01-01T00:00:00.000Z', TEST_ORDER);
  const unfrozen = engine.runUnfreeze();
  const recU = db.prepare("SELECT status FROM commission_records WHERE order_no = ?").get(TEST_ORDER);
  check('解冻: FROZEN→UNFROZEN', unfrozen >= 1 && recU.status === 'UNFROZEN', `unfrozen=${unfrozen}`);
  const acctU = db.prepare('SELECT frozen_cents, withdrawable_cents FROM commission_accounts WHERE user_id = ?').get(INVITER);
  check('解冻: 可提现增加', acctU.withdrawable_cents - acctBefore.withdrawable_cents === expectCents, `wd=${acctU.withdrawable_cents}`);
  check('解冻: 待解冻回落', acctU.frozen_cents - acctBefore.frozen_cents === 0, `frozen=${acctU.frozen_cents}`);

  // ---- 6. 验收5：全额退款 → 佣金扣减（已解冻→优先扣可提现） ----
  const r6 = engine.reverseCommission(TEST_ORDER);
  check('验收5: 冲正成功', r6.reversed === true && r6.reverseCents === expectCents, JSON.stringify(r6));
  const acctR = db.prepare('SELECT * FROM commission_accounts WHERE user_id = ?').get(INVITER);
  check('验收5: 可提现扣回', acctR.withdrawable_cents === acctBefore.withdrawable_cents, `wd ${acctU.withdrawable_cents}→${acctR.withdrawable_cents}`);
  const recR = db.prepare("SELECT status, note FROM commission_records WHERE order_no = ?").get(TEST_ORDER);
  check('验收5: 记录REVERSED+含冲正流水', recR.status === 'REVERSED' && /已冲正/.test(recR.note || ''), recR.note);

  // ---- 7. 冻结中退款 → 直接扣待解冻（TEST_ORDER2 还是 FROZEN） ----
  const r7 = engine.reverseCommission(TEST_ORDER2);
  const acct7 = db.prepare('SELECT frozen_cents FROM commission_accounts WHERE user_id = ?').get(INVITER);
  check('冻结期退款: 冲正成功', r7.reversed === true && r7.reverseCents === 1500, JSON.stringify(r7));
  // TEST_ORDER2 入账1500分冻结又全额冲回 → frozen 相对原始应为0
  check('冻结期退款: 待解冻精确归零', acct7.frozen_cents - acctBefore.frozen_cents === 0, `delta=${acct7.frozen_cents - acctBefore.frozen_cents}`);

  // ---- 8. 重复冲正拒绝 ----
  const r8 = engine.reverseCommission(TEST_ORDER);
  check('重复冲正: ALREADY_REVERSED', r8.reversed === false && r8.reason === 'ALREADY_REVERSED', JSON.stringify(r8));

} finally {
  // ---- 全量清理：测试记录删除 + 账户/配置还原 ----
  db.prepare("DELETE FROM commission_records WHERE order_no IN (?, ?)").run(TEST_ORDER, TEST_ORDER2);
  db.prepare('UPDATE commission_accounts SET total_earnings_cents = ?, withdrawable_cents = ?, frozen_cents = ?, negative_cents = ?, updated_at = ? WHERE user_id = ?')
    .run(acctBefore.total_earnings_cents, acctBefore.withdrawable_cents, acctBefore.frozen_cents, acctBefore.negative_cents, new Date().toISOString(), INVITER);
  engine.saveConfig(cfgBefore);
  const leftover = db.prepare("SELECT COUNT(*) c FROM commission_records WHERE order_no LIKE 'TESTP8%'").get().c;
  console.log(`\n清理完成: 测试记录残留=${leftover}（应为0） 账户已还原 配置已还原`);
}

const failed = results.filter(r => !r.pass);
console.log(`\n========== P8 集成测试结果: ${results.length - failed.length}/${results.length} PASS ==========`);
if (failed.length) { failed.forEach(f => console.log('FAILED: ' + f.name)); process.exit(1); }
process.exit(0);
