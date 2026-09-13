#!/bin/bash
DB=/www/yandaoguoxue-backend/data/academy.db
echo '--- 存储的wechat_content_settings ---'
sqlite3 "$DB" "SELECT value_json FROM wechat_oa_settings WHERE key = 'wechat_content_settings';"
echo '--- 清理死键(仅保留有效设置) via node ---'
cd /www/yandaoguoxue-backend && node -e "
const { getSetting, setSetting } = require('./wechatOaDb');
const cur = getSetting('wechat_content_settings', {});
const cleaned = {};
for (const [k, v] of Object.entries(cur)) {
  if (k === 'dailyArticleLimit') { console.log('移除死键 dailyArticleLimit=' + v); continue; }
  cleaned[k] = v;
}
setSetting('wechat_content_settings', cleaned, 'system_batch_rule_20260913');
console.log('存储设置已清理，当前生效键:', Object.keys(cleaned).join(', ') || '(空=全部使用默认)');
"
echo '--- 清理后合并设置 ---'
cd /www/yandaoguoxue-backend && node -e "
const e = require('./wechatContentEngine');
const s = e.settings();
console.log(JSON.stringify({ maxBatchesPerMonth: s.maxBatchesPerMonth, maxDraftsPerBatch: s.maxDraftsPerBatch, batchDays: s.batchDays, pendingReviewPause: s.pendingReviewPause, topicQualityFloor: s.topicQualityFloor, autoPublish: e.AUTO_PUBLISH }, null, 0));
"
