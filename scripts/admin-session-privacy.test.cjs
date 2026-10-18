'use strict';
const { test } = require('node:test'), assert = require('node:assert/strict'), crypto = require('node:crypto');
process.env.ADMIN_SESSION_SECRET = crypto.randomBytes(48).toString('hex');
const roles = require('../backend_deploy/adminRoles');
const privacy = require('../backend_deploy/adminPrivacy');
test('admin sessions retain role, never expose the signing secret, and reject tampering/expiration', () => {
  const session = roles.createAdminSession({ username: 'synthetic-support', name: '测试客服', role: 'SUPPORT_ADMIN' }, 600);
  const admin = roles.resolveAdminKey(session);
  assert.equal(admin.role, 'SUPPORT_ADMIN'); assert.equal(admin.session, true);
  assert.equal(session.includes(process.env.ADMIN_SESSION_SECRET), false);
  const parts = session.split('.');
  assert.equal(roles.resolveAdminKey(parts.slice(0, 2).join('.') + '.tampered'), null);
  const payload = Buffer.from(JSON.stringify({ sub: 'synthetic-support', role: 'SUPER_ADMIN', iat: 1, exp: 2 })).toString('base64url');
  const signature = crypto.createHmac('sha256', process.env.ADMIN_SESSION_SECRET).update(payload).digest('base64url');
  assert.equal(roles.resolveAdminKey(`YD-SESSION.${payload}.${signature}`), null);
});
test('recursive administrative lists and free text cannot return complete synthetic contacts', () => {
  const phone = '13800138000', email = 'test.reader@example.test';
  const source = { phone, nested: [{ email, inviter_phone: phone, note: `联络 ${email} 或 ${phone}` }], amount: 29, unchanged: '古籍学习' };
  const sanitized = privacy.sanitizeAdminData(source), rendered = JSON.stringify(sanitized);
  assert.equal(rendered.includes(phone), false); assert.equal(rendered.includes(email), false);
  assert.equal(sanitized.amount, 29); assert.equal(sanitized.unchanged, '古籍学习');
  assert.equal(source.phone, phone); assert.equal(source.nested[0].email, email);
});
