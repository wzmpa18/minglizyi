// 部署后验证：引擎导出 + 调度器依赖核对 + 关键函数冒烟
const engine = require('/www/yandaoguoxue-backend/wechatContentEngine');
const need = ['isBatchDay', 'pendingReviewCount', 'monthlyBatchCount', 'autoApproveBatchTopics', 'syncPublishedFromWechat', 'generateTopics', 'listTopics', 'generateArticle', 'settings', 'dashboardStats', 'safetyGate', 'dedupGate', 'addManualTopic', 'updateSettings'];
const missing = need.filter((k) => typeof engine[k] !== 'function');
console.log('MISSING:', missing.length ? missing.join(',') : 'none');
console.log('isBatchDay(2026-10-08):', engine.isBatchDay('2026-10-08'), '(expect true)');
console.log('isBatchDay(2026-09-24):', engine.isBatchDay('2026-09-24'), '(expect false)');
console.log('pendingReviewCount:', engine.pendingReviewCount());
console.log('monthlyBatchCount(2026-09-23):', engine.monthlyBatchCount('2026-09-23'));
console.log('CLUSTERS has xuewaiyu/shuziguanjia:', !!engine.CLUSTERS.find((c) => c.id === 'xuewaiyu'), !!engine.CLUSTERS.find((c) => c.id === 'shuziguanjia'));
const sched = require('/www/yandaoguoxue-backend/wechatContentScheduler');
console.log('SCHEDULER_LOADS:', typeof sched.stageGenerate === 'function');
