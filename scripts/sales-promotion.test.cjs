const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const sale = require('../backend_deploy/salesPromotion');
const campaign = { ...sale.DEFAULT_CONFIG, enabled: true };

test('twenty percent campaign preserves base prices, cents and zero-cost entitlements', () => {
  for (const [base, expected] of [[37,29.6],[99,79.2],[374,299.2],[3600,2880],[28,22.4],[130,104],[200,160],[800,640],[2.9,2.32],[39.9,31.92],[9.9,7.92]]) {
    const result = sale.quote('MEMBERSHIP', { price: base }, campaign);
    assert.equal(result.price, expected); assert.equal(result.basePrice, base);
    assert.equal(result.promotion.revision, campaign.revision);
  }
  assert.equal(sale.quote('MEMBERSHIP', { price: 0 }, campaign).price, 0);
  assert.equal(sale.quote('MEMBERSHIP', { price: 0.01 }, { ...campaign, discountPercent: 90 }).price, 0.01);
  assert.equal(sale.quote('SINGLE_UNLOCK', { price: null }, campaign).price, null);
  for (const type of ['POINTS_RECHARGE','SERVICE_ORDER','CONSULT_SERVICE']) assert.equal(sale.quote(type, { price: 100 }, campaign).price, 100);
});

test('campaign periods use inclusive start and exclusive end, and never stack member discounts', () => {
  const timed = { ...campaign, startsAt: '2026-10-18T10:00:00+09:00', endsAt: '2026-10-19T10:00:00+09:00' };
  assert.equal(sale.quote('MEMBERSHIP', { price: 37 }, timed, Date.parse(timed.startsAt)-1).price, 37);
  assert.equal(sale.quote('MEMBERSHIP', { price: 37 }, timed, Date.parse(timed.startsAt)).price, 29.6);
  assert.equal(sale.quote('MEMBERSHIP', { price: 37 }, timed, Date.parse(timed.endsAt)).price, 37);
  assert.equal(sale.quote('BATCH_INTERPRET', { price: 160, basePrice: 200 }, campaign).price, 160);
  assert.equal(sale.quote('BATCH_INTERPRET', { price: 150, basePrice: 200 }, campaign).price, 150);
  assert.equal(sale.quote('BATCH_INTERPRET', { price: 190, basePrice: 200 }, campaign).price, 160);
});

test('public catalog and alternate pricing endpoint expose identical discounted products without mutation', () => {
  const source = { membershipPlans: [{ level:'monthly',price:37,originalPrice:59 }], singleUnlockPrice:9.9,
    aiPlans:[{key:'monthly',price:39.9}], ai:{singleUnlockPrice:9.9,packages:[{id:'pack_10',count:10,price:28}],timePlans:[{key:'monthly',price:39.9}],tools:[{id:'phone_number',price:18}]} };
  const before = JSON.stringify(source), result = sale.decoratePricing(source,campaign);
  assert.equal(JSON.stringify(source),before);
  assert.equal(result.membershipPlans[0].price,29.6); assert.equal(result.membershipPlans[0].originalPrice,37); assert.equal(result.membershipPlans[0].regularOriginalPrice,59);
  assert.equal(result.aiPlans[0].price,result.ai.timePlans[0].price);
  assert.equal(result.singleUnlockPrice,result.ai.singleUnlockPrice);
  assert.equal(result.ai.packages[0].price,22.4); assert.equal(result.ai.packages[0].count,10);
  assert.equal(sale.decoratePricing(source,{...campaign,enabled:false}).membershipPlans[0].price,37);
});

test('operator configuration rejects unsafe schedules, percentages and monetary balance products', () => {
  assert.equal(sale.validateConfig(campaign).discountPercent,20);
  for (const patch of [{discountPercent:100},{discountPercent:1.5},{enabled:'true'},{startsAt:'2026-10-18T10:00'},{startsAt:'2026-02-31T10:00:00Z'},{productTypes:['POINTS_RECHARGE']},{productTypes:['MEMBERSHIP','MEMBERSHIP']},{name:'<img>'},{revision:0},{startsAt:'2026-10-19T00:00:00Z',endsAt:'2026-10-18T00:00:00Z'}]) assert.throws(()=>sale.validateConfig({...campaign,...patch}));
});

test('real server quote functions apply the campaign to authoritative prices and ignore client amounts', () => {
  const text=fs.readFileSync('backend_deploy/paymentRoutes.js','utf8');
  const source=text.slice(text.indexOf('function resolveBaseServerPrice('),text.indexOf('// POST /api/payment/create —'));
  const config={plans:[{level:'monthly',price:37}],packages:[{id:'pack_10',price:28}],timePlans:[{key:'single',price:2.9}]};
  const context={readAdminConfig:()=>config,DEFAULT_MEMBERSHIP_PLANS:[],DEFAULT_AI_TIME_PLANS:[],DEFAULT_SINGLE_UNLOCK_PRICE:9.9,
    readBatchConfig:()=>({basePrice:200,discounts:{basic:1,yearly:0.8}}),readUserMemberLevel:()=> 'yearly',console,
    require:name=> name==='./salesPromotion'?{quote:(type,current)=>sale.quote(type,current,campaign)}:{loadMatrix:()=>({tools:{phone_number:{status:'ON',payMode:'ONE_TIME',price:18}}})}};
  vm.createContext(context);vm.runInContext(source,context);
  const quote=context.resolveServerPrice;
  assert.equal(quote('MEMBERSHIP',{membershipLevel:'monthly',price:0.01},'123').price,29.6);
  assert.equal(quote('AI_PACKAGE',{packageId:'pack_10',price:0.01},'123').price,22.4);
  assert.equal(quote('SINGLE_UNLOCK',{unlockTargetId:'ai_plan_single'},'123').price,2.32);
  assert.equal(quote('SINGLE_UNLOCK',{unlockTargetId:'phone_number'},'123').price,14.4);
  assert.equal(quote('BATCH_INTERPRET',{},'123').price,160);
  assert.equal(quote('MEMBERSHIP',{membershipLevel:'missing'},'123').price,null);
});
