#!/bin/bash
# 微信草稿与批次统计
echo "=== [1] 数据库定位 ==="
for db in $(find /www /root/backend-auth -maxdepth 5 -name '*.db' 2>/dev/null | sort -u | head -8); do
  T=$(sqlite3 "$db" ".tables" 2>/dev/null | tr -s ' \n' '\n' | grep -icE 'wechat|article|topic')
  echo "$db → wechat/article表 $T 个"
done

echo ""
echo "=== [2] 微信文章状态统计 ==="
DB=""
for db in $(find /www /root/backend-auth -maxdepth 5 -name '*.db' 2>/dev/null | sort -u); do
  if sqlite3 "$db" ".tables" 2>/dev/null | grep -qi 'wechat'; then DB="$db"; break; fi
done
echo "使用DB: $DB"
[ -z "$DB" ] && exit 0
sqlite3 "$DB" ".tables" | tr -s ' ' '\n' | grep -i wechat
echo "--- 文章状态分布（全量） ---"
sqlite3 "$DB" "SELECT status, COUNT(*) FROM wechat_articles GROUP BY status ORDER BY 2 DESC;" 2>/dev/null
echo "--- 9月以来按日期 ---"
sqlite3 "$DB" "SELECT date(created_at), status, COUNT(*) FROM wechat_articles WHERE created_at >= '2026-09-01' GROUP BY 1, 2 ORDER BY 1;" 2>/dev/null
echo "--- 选题批次（9月） ---"
sqlite3 "$DB" "SELECT date(created_at), COUNT(*) FROM wechat_topics WHERE created_at >= '2026-09-01' GROUP BY 1 ORDER BY 1;" 2>/dev/null
