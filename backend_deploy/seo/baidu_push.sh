#!/bin/bash
# ============================================================================
# 百度普通收录 API 推送（待项目方提供接口调用地址后执行）
# 用法: bash baidu_push.sh "http://data.zz.baidu.com/urls?site=xxx&token=xxx" urls.txt
#   urls.txt 每行一个 URL；推送全部 URL 并打印配额返回
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
echo "$RESP" | grep -q '"success"' && echo "PUSH OK" || { echo "PUSH FAIL（检查 token/站点域名）"; exit 1; }

echo "--- 尝试 sitemap API 提交 ---"
SITE=$(echo "$API" | grep -o 'site=[^&]*' | cut -d= -f2)
SMAP="https://${SITE}/sitemap.xml"
SRESP=$(curl -s -m 30 -H 'Content-Type: text/plain' --data-binary "$SMAP" "http://data.zz.baidu.com/sitemap?site=${SITE}&token=$(echo "$API" | grep -o 'token=[^&]*' | cut -d= -f2)")
echo "sitemap(${SMAP}) 返回: ${SRESP}"
