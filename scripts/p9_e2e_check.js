#!/usr/bin/env node
'use strict';
require('dotenv').config({ path: '/www/yandaoguoxue-backend/.env' });
const RR = require('/www/yandaoguoxue-backend/register_routes.js');
const db = RR.initDatabase();
const q = (s, ...a) => db.prepare(s).get(...a);
const out = {
  usersResidual: q('SELECT COUNT(*) c FROM users WHERE phone LIKE ?', '199000000%').c,
  deviceResidual: q('SELECT COUNT(*) c FROM device_registry WHERE device_id LIKE ?', 'p9-e2e-%').c,
  auditResidual: q('SELECT COUNT(*) c FROM invite_audit WHERE invitee_id > 100000 OR inviter_id > 100000').c,
  rewardResidual: q('SELECT COUNT(*) c FROM invite_rewards WHERE inviter_id > 100000 OR invitee_id > 100000').c,
  relationResidual: q('SELECT COUNT(*) c FROM user_invite_relation WHERE inviter_id > 100000 OR invitee_id > 100000').c,
  realUserCount: q('SELECT COUNT(*) c FROM users').c,
};
console.log(JSON.stringify(out, null, 2));
