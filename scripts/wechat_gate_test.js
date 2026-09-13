// 批次规则验证（FINAL-17 第十六~二十章）
const path = require('path');
require('dotenv').config({ path: '/www/yandaoguoxue-backend/.env' });
const engine = require('/www/yandaoguoxue-backend/wechatContentEngine');

const results = [];
const check = (name, actual, expected) => {
  const ok = String(actual) === String(expected);
  results.push(`${ok ? 'PASS' : 'FAIL'} | ${name} = ${actual}${ok ? '' : ' (期望 ' + expected + ')'}`);
};

const s = engine.settings();
check('maxBatchesPerMonth', s.maxBatchesPerMonth, 4);
check('maxDraftsPerBatch', s.maxDraftsPerBatch, 5);
check('AUTO_PUBLISH', engine.AUTO_PUBLISH, false);
check('AUTO_MASS_SEND', engine.AUTO_MASS_SEND, false);
check('pendingReviewPause', s.pendingReviewPause, 5);
check('topicQualityFloor', s.topicQualityFloor, 40);
check('batchDays', s.batchDays, '1,8,15,22');

check('isBatchDay(2026-09-13)非批次日', engine.isBatchDay('2026-09-13'), false);
check('isBatchDay(2026-09-15)批次日', engine.isBatchDay('2026-09-15'), true);
check('isBatchDay(2026-10-01)批次日', engine.isBatchDay('2026-10-01'), true);
check('isBatchDay(2026-09-22)批次日', engine.isBatchDay('2026-09-22'), true);
check('isBatchDay(2026-09-23)非批次日', engine.isBatchDay('2026-09-23'), false);

check('本月已用批次(9月)', engine.monthlyBatchCount('2026-09-13'), 2);
check('本月剩余批次(9月)', 4 - engine.monthlyBatchCount('2026-09-13'), 2);
check('当前待审草稿数', engine.pendingReviewCount() + ' (>=5 应暂停生成)', engine.pendingReviewCount() >= 5 ? '10 (>=5 应暂停生成)' : '低于5');

console.log(results.join('\n'));
console.log('\n--- 门禁决策模拟（今日2026-09-13非批次日 + 待审10篇）---');
console.log('topics/generate/safety/notify 普通运行 →', engine.isBatchDay('2026-09-13') ? '放行' : 'SKIP：非批次日');
console.log('--force 运行 → generate 仍被待审门禁拦截 →', engine.pendingReviewCount() >= s.pendingReviewPause ? 'PAUSE：待审' + engine.pendingReviewCount() + '篇≥5' : '放行');
