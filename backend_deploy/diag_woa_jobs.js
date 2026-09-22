// 检查近期内容任务执行结果 + 引擎导出函数核对
const { getDb } = require('/www/yandaoguoxue-backend/wechatOaDb');
const db = getDb();
const jobs = db.prepare("SELECT job_id, run_date, stage, status, error, started_at FROM wechat_content_jobs ORDER BY job_id DESC LIMIT 16").all();
console.log('===== RECENT JOBS =====');
for (const j of jobs) console.log([j.job_id, j.run_date, j.stage, j.status, j.started_at, (j.error || '').slice(0, 60)].join(' | '));
const engine = require('/www/yandaoguoxue-backend/wechatContentEngine');
console.log('===== ENGINE EXPORTS =====');
console.log(Object.keys(engine).join(', '));
console.log('isBatchDay:', typeof engine.isBatchDay, '| pendingReviewCount:', typeof engine.pendingReviewCount, '| syncPublishedFromWechat:', typeof engine.syncPublishedFromWechat, '| autoApproveBatchTopics:', typeof engine.autoApproveBatchTopics, '| monthlyBatchCount:', typeof engine.monthlyBatchCount);
