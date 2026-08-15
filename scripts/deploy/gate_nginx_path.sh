#!/bin/bash
# ============================================================
# PHASE 01: Nginx 路径完整性校验 v1.1
# 修复: 跨行 regex 提取 alias
# ============================================================

set -euo pipefail

TIMESTAMP=$(date '+%Y-%m-%d_%H:%M:%S')
NGINX_CONF="/www/server/panel/vhost/nginx/yandaoguoxue.vip.conf"
FAIL_COUNT=0

echo "============================================"
echo "  Nginx 路径完整性校验 v1.1"
echo "  时间: ${TIMESTAMP}"
echo "============================================"
echo ""

# 提取所有 root 路径
echo "--- 检查 root 指令 ---"
ROOT_PATHS=$(grep -oP 'root\s+\K[^;]+' "$NGINX_CONF" | tr -d ' ' | sort -u)
for path in $ROOT_PATHS; do
  if [ -d "$path" ]; then
    echo "  PASS: root ${path} -> exists"
  else
    echo "  FAIL: root ${path} -> NOT FOUND"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
done

# 提取所有 alias 路径
echo ""
echo "--- 检查 alias 指令 ---"
ALIAS_PATHS=$(grep -oP 'alias\s+\K[^;]+' "$NGINX_CONF" | tr -d ' ' | sort -u)
for path in $ALIAS_PATHS; do
  if [ -d "$path" ]; then
    echo "  PASS: alias ${path} -> exists"
  else
    echo "  FAIL: alias ${path} -> NOT FOUND"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
done

# 提取所有 proxy_pass 地址
echo ""
echo "--- 检查 proxy_pass 目标 ---"
PROXY_PATHS=$(grep -oP 'proxy_pass\s+\K[^;]+' "$NGINX_CONF" | tr -d ' ' | sort -u)
for target in $PROXY_PATHS; do
  hostport=$(echo "$target" | sed 's|http://||')
  host=$(echo "$hostport" | cut -d: -f1)
  port=$(echo "$hostport" | cut -d: -f2 | cut -d/ -f1)
  if curl -sk --connect-timeout 3 "http://${host}:${port}/" >/dev/null 2>&1; then
    echo "  PASS: proxy_pass ${target} -> reachable"
  else
    echo "  FAIL: proxy_pass ${target} -> NOT REACHABLE"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
done

# 检查 _next/static alias 是否正确指向 current
echo ""
echo "--- 检查 _next/static 路径完整性 ---"
# 用 awk 提取 location /_next/static/ 块内的 alias
NEXT_ALIAS=$(awk '/location \/_next\/static\//,/}/' "$NGINX_CONF" | grep -oP 'alias\s+\K[^;]+' | tr -d ' ' | head -1)
if [ -n "$NEXT_ALIAS" ]; then
  echo "  _next/static alias: ${NEXT_ALIAS}"
  if [ -d "$NEXT_ALIAS" ]; then
    echo "  PASS: alias directory exists"
    if [ -d "${NEXT_ALIAS}/chunks" ]; then
      chunk_count=$(ls "${NEXT_ALIAS}/chunks/" 2>/dev/null | wc -l)
      echo "  PASS: chunks/ exists with ${chunk_count} files"
    else
      echo "  FAIL: chunks/ directory missing"
      FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
  else
    echo "  FAIL: alias directory does not exist"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
  
  if echo "$NEXT_ALIAS" | grep -q "current"; then
    echo "  PASS: alias directly references current/ (no external symlink)"
  else
    echo "  WARN: alias does NOT reference current/ - may use external symlink"
  fi
else
  echo "  FAIL: Could not extract _next/static alias"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# 检查残留外部 symlink
echo ""
echo "--- 检查残留外部 symlink ---"
if [ -L "/root/yandaoguoxue/_next" ]; then
  echo "  FAIL: External symlink /root/yandaoguoxue/_next still exists"
  FAIL_COUNT=$((FAIL_COUNT + 1))
else
  echo "  PASS: No external _next symlink"
fi

# 检查 current symlink
echo ""
echo "--- 检查 current symlink ---"
if [ -L "/root/yandaoguoxue/current" ]; then
  target=$(readlink -f /root/yandaoguoxue/current)
  echo "  PASS: current -> ${target}"
  if [ -d "$target" ]; then
    echo "  PASS: target directory exists"
  else
    echo "  FAIL: target directory does not exist"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
else
  echo "  FAIL: current symlink missing"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# 检查学外语残留引用（已迁出：配置中不得再出现 /www/xuewaiyu 或 :3000）
echo ""
echo "--- 检查学外语残留引用 ---"
if grep -q '/www/xuewaiyu' "$NGINX_CONF"; then
  echo "  FAIL: 配置仍引用 /www/xuewaiyu（学外语已迁出）"
  FAIL_COUNT=$((FAIL_COUNT + 1))
else
  echo "  PASS: 无 /www/xuewaiyu 引用"
fi
if grep -q '127.0.0.1:3000' "$NGINX_CONF"; then
  echo "  FAIL: 配置仍代理 127.0.0.1:3000（学外语后端已下线）"
  FAIL_COUNT=$((FAIL_COUNT + 1))
else
  echo "  PASS: 无 :3000 死端口代理"
fi

echo ""
echo "============================================"
if [ "$FAIL_COUNT" -eq 0 ]; then
  echo "  RESULT: ALL_PATHS_VALID"
  exit 0
else
  echo "  RESULT: PATH_INTEGRITY_BLOCKED (${FAIL_COUNT} failures)"
  exit 1
fi
echo "============================================"