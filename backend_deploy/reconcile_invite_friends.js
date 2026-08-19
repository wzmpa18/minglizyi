#!/usr/bin/env node
/**
 * v25.0.41 邀请绑定最终一致性·每日reconcile（crontab 每日 03:30 执行）
 * 1) 重试PENDING补偿任务（autoFriend失败遗留，attempts<5）
 * 2) 全量对账：users.invited_by 存在但 social.db friendships 缺失 → 自动补齐
 * 输出写入 /root/backup/reconcile_invite.log
 */
'use strict';
require('dotenv').config({ path: '/www/yandaoguoxue-backend/.env' });
const RR = require('/www/yandaoguoxue-backend/register_routes.js');

const db = RR.initDatabase();
const retried = RR.retryPendingInviteFriendTasks(db);
const reconciled = RR.reconcileInviteFriendships(db);
console.log(`[${new Date().toISOString()}] retry=${JSON.stringify(retried)} reconcile=${JSON.stringify(reconciled)}`);
if (reconciled.failed > 0 || retried.pending > retried.fixed) process.exit(1);
