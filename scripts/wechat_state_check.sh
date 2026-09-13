#!/bin/bash
# FINAL-17 第二十章：微信调度真实状态核实（服务器实测）
echo "=== 1. crontab（微信相关） ==="
crontab -l 2>/dev/null | grep -v '^#' | grep -iE 'wechat|content' || echo "(无)"
echo
echo "=== 2. 引擎当前生效设置（服务器） ==="
cd /www/yandaoguoxue-backend && node -e '
const e = require("./wechatContentEngine");
const s = e.settings();
console.log(JSON.stringify({
  automation: s.automation,
  draftSync: s.draftSync,
  maxBatchesPerMonth: s.maxBatchesPerMonth,
  maxDraftsPerBatch: s.maxDraftsPerBatch,
  batchDays: s.batchDays,
  pendingReviewPause: s.pendingReviewPause,
  topicQualityFloor: s.topicQualityFloor,
  AUTO_PUBLISH: e.AUTO_PUBLISH
}, null, 1));'
echo
echo "=== 3. 月度批次计数 / 待审草稿 ==="
cd /www/yandaoguoxue-backend && node -e '
const e = require("./wechatContentEngine");
const today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
const used = e.monthlyBatchCount(today);
const pending = e.pendingReviewCount();
const maxB = e.settings().maxBatchesPerMonth;
console.log("today(bj)      :", today);
console.log("isBatchDay     :", e.isBatchDay(today));
console.log("batches_used   :", used + "/" + maxB);
console.log("batches_left   :", Math.max(0, maxB - used));
console.log("pending_drafts :", pending);'
echo
echo "=== 4. 调度器门禁代码在位 ==="
grep -n "batchDayGate\|monthlyBatchCount\|pendingReviewPause" /www/yandaoguoxue-backend/wechatContentScheduler.js | head -10
echo
echo "=== 5. 本月微信文章产出（按日） ==="
sqlite3 /www/yandaoguoxue-backend/data/academy.db "SELECT date(created_at) d, COUNT(*) n FROM wechat_articles WHERE substr(created_at,1,7) = strftime('%Y-%m','now','+8 hours') GROUP BY d ORDER BY d;" 2>/dev/null || echo "(sqlite3 不可用)"
