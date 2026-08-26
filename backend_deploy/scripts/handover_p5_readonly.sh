#!/bin/bash
# ============================================================================
# P5 只读体检 — FINAL-HANDOVER-20260826（第十七/二十一/二十五/四十三章）
# 全部 SELECT/只读，不写任何生产数据。输出供总账第十五章引用。
# ============================================================================
SOCIAL_DB=/www/yandaoguoxue-backend/data/social.db
USERS_DB=/root/backend-auth/data/yandao_users.db
NGX_ACCESS=/www/wwwlogs/yandaoguoxue.yandao.vip.log
NGX_ERROR=/www/wwwlogs/yandaoguoxue.yandao.vip.error.log
PM2_ERR=/root/.pm2/logs/yandaoguoxue-backend-error.log

echo "===== A. 第十七章 social.db 数据健康（只读） ====="
# 跨库引用检查：ATTACH 用户库
sq() { sqlite3 "$SOCIAL_DB" "ATTACH '$USERS_DB' AS u; $1" 2>&1; }

echo "-- A1 好友重复边(无向对, 应0):"
sq "SELECT COUNT(*) FROM (SELECT MIN(user_a,user_b) x, MAX(user_a,user_b) y, COUNT(*) c FROM friendships GROUP BY x,y HAVING c>1);"
echo "-- A2 好友边引用不存在用户(应0):"
sq "SELECT COUNT(*) FROM friendships WHERE CAST(user_a AS INTEGER) NOT IN (SELECT user_id FROM u.users) OR CAST(user_b AS INTEGER) NOT IN (SELECT user_id FROM u.users);"
echo "-- A3 孤儿消息(发送者不存在, 应0):"
sq "SELECT COUNT(*) FROM chat_messages WHERE CAST(sender_id AS INTEGER) NOT IN (SELECT user_id FROM u.users);"
echo "-- A4 孤儿评论(用户或帖子不存在, 应0):"
sq "SELECT COUNT(*) FROM comments WHERE CAST(user_id AS INTEGER) NOT IN (SELECT user_id FROM u.users) OR CAST(post_id AS INTEGER) NOT IN (SELECT post_id FROM posts);"
echo "-- A5 孤儿点赞(应0):"
sq "SELECT COUNT(*) FROM likes WHERE CAST(user_id AS INTEGER) NOT IN (SELECT user_id FROM u.users) OR CAST(post_id AS INTEGER) NOT IN (SELECT post_id FROM posts);"
echo "-- A6 孤儿收藏(应0):"
sq "SELECT COUNT(*) FROM favorites WHERE CAST(user_id AS INTEGER) NOT IN (SELECT user_id FROM u.users);"
echo "-- A7 无主群(群主不存在, 应0):"
sq "SELECT COUNT(*) FROM groups WHERE CAST(owner_id AS INTEGER) NOT IN (SELECT user_id FROM u.users);"
echo "-- A8 重复blacklist(应0):"
sq "SELECT COUNT(*) FROM (SELECT user_id, blocked_id, COUNT(*) c FROM blacklists GROUP BY user_id, blocked_id HAVING c>1);"
echo "-- A9 群成员存储方式检查(是否存在独立成员表/列):"
sqlite3 "$SOCIAL_DB" ".schema groups" | grep -o 'members[^,]*' | head -3
sqlite3 "$SOCIAL_DB" "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%member%';"
echo "-- A10 基础量(供口径参考):"
sq "SELECT 'friendships=' || (SELECT COUNT(*) FROM friendships) || ' messages=' || (SELECT COUNT(*) FROM chat_messages) || ' groups=' || (SELECT COUNT(*) FROM groups) || ' posts=' || (SELECT COUNT(*) FROM posts) || ' comments=' || (SELECT COUNT(*) FROM comments) || ' blacklists=' || (SELECT COUNT(*) FROM blacklists);"

echo ""
echo "===== B. 第二十五章 历史权益核账（只读） ====="
uq() { sqlite3 "$USERS_DB" "$1" 2>&1; }
echo "-- B1 PAID订单按类型:"
uq "SELECT order_type, COUNT(*) FROM user_orders WHERE status='PAID' GROUP BY order_type;"
echo "-- B2 权益表按类型:"
uq "SELECT entitlement_type, COUNT(*) FROM user_entitlements GROUP BY entitlement_type;"
echo "-- B3 user_entitlements 表结构:"
uq ".schema user_entitlements" | head -12
echo "-- B4 MEMBERSHIP PAID订单中 无对应有效会员等级的用户数(应0, 会员以users.member_level为准):"
uq "SELECT COUNT(*) FROM user_orders o WHERE o.status='PAID' AND o.order_type='MEMBERSHIP' AND EXISTS(SELECT 1 FROM users u WHERE u.user_id=o.user_id AND u.member_level='basic');"

echo ""
echo "===== C. 第四十三章 最近24h错误日志（只统计次数, 不输出敏感内容） ====="
# 24h窗口: 昨天23点之后到现在
echo "-- C1 nginx访问日志 4xx/5xx (25/Aug 23:00 之后):"
awk -F'"' '{print $0}' "$NGX_ACCESS" 2>/dev/null | awk '{
  if ($0 ~ /25\/Aug\/2026:2[3-9]/ || $0 ~ /26\/Aug\/2026/) {
    if (match($0, /" [0-9]{3} /)) { s=substr($0, RSTART+2, 3);
      if (s ~ /^4/) c4[s]++; else if (s ~ /^5/) c5[s]++; }
  }
} END { t4=0; for (k in c4) { t4+=c4[k]; print "  4xx " k ": " c4[k] } t5=0; for (k in c5) { t5+=c5[k]; print "  5xx " k ": " c5[k] } print "  合计 4xx=" t4 " 5xx=" t5 }'
echo "-- C2 nginx访问日志 5xx 路径分布(top5):"
grep -E '25/Aug/2026:2[3-9]|26/Aug/2026' "$NGX_ACCESS" 2>/dev/null | grep -oE '" (5[0-9]{2}) [0-9]+ "[^"]*" "[^"]*"' | awk '{print $2}' | sort | uniq -c | sort -rn | head -5
grep -E '25/Aug/2026:2[3-9]|26/Aug/2026' "$NGX_ACCESS" 2>/dev/null | awk '$9 ~ /^5/ {print $7}' | sort | uniq -c | sort -rn | head -5
echo "-- C3 nginx error日志(近24h条数+类型):"
grep -cE '2026/08/2[56]' "$NGX_ERROR" 2>/dev/null
grep -E '2026/08/2[56]' "$NGX_ERROR" 2>/dev/null | grep -oE '(timed out|upstream|failed|error)' | sort | uniq -c | sort -rn | head -5
echo "-- C4 PM2 error日志(近24h):"
tail -2000 "$PM2_ERR" 2>/dev/null | grep -c "$(date +%Y-%m-%d)" 
tail -2000 "$PM2_ERR" 2>/dev/null | grep "$(date +%Y-%m-%d)" | grep -oE '(SQLITE_BUSY|database is locked|ECONNREFUSED|ETIMEDOUT|Error)' | sort | uniq -c | sort -rn | head -6
echo "-- C5 AI健康(今日):"
cat /www/yandaoguoxue-backend/data/ai-health.json 2>/dev/null
echo ""
echo "-- C6 支付回调错误(近24h, 仅次数):"
grep -E '25/Aug/2026:2[3-9]|26/Aug/2026' "$NGX_ACCESS" 2>/dev/null | grep -E 'payment|callback|notify' | grep -E ' (4[0-9]{2}|5[0-9]{2}) ' | wc -l
echo "-- C7 社交API 5xx(近24h):"
grep -E '25/Aug/2026:2[3-9]|26/Aug/2026' "$NGX_ACCESS" 2>/dev/null | grep '/api/social' | awk '$9 ~ /^5/' | wc -l
echo ""
echo "P5_READONLY_DONE"
