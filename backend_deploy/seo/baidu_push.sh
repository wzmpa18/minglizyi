#!/bin/bash
# ============================================================================
# 百度普通收录 API 推送（手动批量版）
# 用法: bash baidu_push.sh "http://data.zz.baidu.com/urls?site=xxx&token=xxx" urls.txt
#   urls.txt 每行一个 URL；推送全部 URL 并打印配额返回
# 注意：
#   1. 每站每日配额 10 条（新站），超限整批拒绝（error:400 over quota）——
#      分批推送或用 baidu_daily_push.sh（队列+指针+每日cron自动推进）
#   2. sitemap 提交走平台网页端「普通收录→sitemap」（配额与 API 独立）——
#      data.zz.baidu.com/sitemap 旧接口已废弃（返回 site is wrong）
#   3. token 从百度搜索资源平台「普通收录→API推送」页复制（I/l 易混淆，注意大小写）
# ============================================================================
set -e
API="$1"
URLS="$2"
[ -z "$API" ] && { echo "用法: bash baidu_push.sh <接口调用地址> <urls文件>"; exit 1; }
[ -f "$URLS" ] || { echo "FATAL: urls 文件不存在: $URLS"; exit 1; }

N=$(grep -c . "$URLS")
echo "--- 推送 ${N} 个 URL 到百度 ---"
RESP=$(curl -s -m 30 -H 'Content-Type: text/plain' --data-binary @"$URLS" "$API")
echo "百度返回: $RESP"
echo "$RESP" | grep -q '"success"' && echo "PUSH OK" || { echo "PUSH FAIL（检查 token/配额/站点域名）"; exit 1; }
