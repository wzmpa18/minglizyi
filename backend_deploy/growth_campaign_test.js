'use strict';

const assert = require('assert');
const { DatabaseSync } = require('node:sqlite');
const engine = require('./growthCampaignEngine');

const db = new DatabaseSync(':memory:');
db.exec(`
  CREATE TABLE users (user_id INTEGER PRIMARY KEY, phone TEXT);
  CREATE TABLE user_invite_relation (
    inviter_id INTEGER NOT NULL,
    invitee_id INTEGER NOT NULL,
    level INTEGER NOT NULL,
    invite_time TEXT NOT NULL
  );
`);

db.prepare('INSERT INTO users(user_id, phone) VALUES (?, ?)').run(1, '13800000000');
const addInvite = (id) => {
  db.prepare('INSERT INTO users(user_id, phone) VALUES (?, ?)').run(id, `1380000${String(id).padStart(4, '0')}`);
  db.prepare('INSERT INTO user_invite_relation(inviter_id, invitee_id, level, invite_time) VALUES (1, ?, 1, ?)')
    .run(id, '2026-10-03T08:00:00.000Z');
};

for (let id = 2; id <= 10; id += 1) addInvite(id);
let status = engine.syncUser(db, 1);
assert.equal(status.qualifiedInvites, 9);
assert.equal(status.coupon, null);

addInvite(11);
status = engine.syncUser(db, 1);
assert.equal(status.qualifiedInvites, 10);
assert.equal(status.coupon.status, 'AVAILABLE');
const couponId = status.coupon.id;

const quote = engine.quoteMembership(db, { userId: 1, membershipLevel: 'yearly', basePrice: 199, useCoupon: true });
assert.equal(quote.applied, true);
assert.equal(quote.price, 159.2);
assert.equal(engine.reserveCoupon(db, couponId, 1, 'TEST-ORDER-1'), true);
assert.equal(engine.reserveCoupon(db, couponId, 1, 'TEST-ORDER-2'), false);
assert.equal(engine.consumeCoupon(db, 'TEST-ORDER-1'), true);
assert.equal(engine.quoteMembership(db, { userId: 1, membershipLevel: 'yearly', basePrice: 199, useCoupon: true }).applied, false);

assert.equal(db.prepare('SELECT COUNT(*) AS c FROM growth_campaign_coupons WHERE user_id=1').get().c, 1);
db.close();
console.log('growth_campaign_test: PASS');
