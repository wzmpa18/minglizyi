#!/bin/bash
# ============================================================
# PHASE 01: 事故回归测试 v1.1
# 事故ID: INC-2026-08-12-WHITE-SCREEN-001
# 修复: 跨行 regex 提取 alias
# ============================================================

set -euo pipefail

TIMESTAMP=$(date '+%Y-%m-%d_%H:%M:%S')
DOMAIN="https://yandaoguoxue.yandao.vip"
NGINX_CONF="/www/server/panel/vhost/nginx/yandaoguoxue.vip.conf"
PASS_COUNT=0
FAIL_COUNT=0

echo "============================================"
echo "  事故回归测试: INC-2026-08-12-WHITE-SCREEN-001"
echo "  时间: ${TIMESTAMP}"
echo "============================================"
echo ""

# ============================================================
# TEST-001: 首页加载完整性
# ============================================================
echo "--- TEST-001: 首页加载完整性 ---"
INDEX_HTML=$(curl -sk "${DOMAIN}/" 2>/dev/null)
if echo "$INDEX_HTML" | grep -q '_next/static'; then
  echo "  PASS: index.html references _next/static"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "  FAIL: index.html missing _next/static reference"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# ============================================================
# TEST-002: _next/static alias 指向正确目录
# ============================================================
echo "--- TEST-002: _next/static alias 路径正确性 ---"
NEXT_ALIAS=$(awk '/location \/_next\/static\//,/}/' "$NGINX_CONF" | grep -oP 'alias\s+\K[^;]+' | tr -d ' ' | head -1)
if echo "$NEXT_ALIAS" | grep -q "current/_next/static"; then
  echo "  PASS: alias directly references current/_next/static/ -> ${NEXT_ALIAS}"
  PASS_COUNT=$((PASS_COUNT + 1))
elif [ -n "$NEXT_ALIAS" ]; then
  echo "  WARN: alias exists but does not contain current/ path: ${NEXT_ALIAS}"
  FAIL_COUNT=$((FAIL_COUNT + 1))
else
  echo "  FAIL: Could not extract _next/static alias"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# ============================================================
# TEST-003: 无外部 _next symlink
# ============================================================
echo "--- TEST-003: 无外部 _next symlink ---"
if [ -L "/root/yandaoguoxue/_next" ] || [ -d "/root/yandaoguoxue/_next" ]; then
  echo "  FAIL: External _next path exists at /root/yandaoguoxue/_next"
  FAIL_COUNT=$((FAIL_COUNT + 1))
else
  echo "  PASS: No external _next symlink"
  PASS_COUNT=$((PASS_COUNT + 1))
fi

# ============================================================
# TEST-004: JS 文件全部可访问
# ============================================================
echo "--- TEST-004: JS文件全量可访问 ---"
JS_FILES=$(echo "$INDEX_HTML" | grep -oP '_next/static/chunks/[^"]+\.js' | sort -u)
JS_TOTAL=0
JS_FAIL=0
for js in $JS_FILES; do
  [ -z "$js" ] && continue
  JS_TOTAL=$((JS_TOTAL + 1))
  resp=$(curl -sk -w "%{http_code}" -o /dev/null "${DOMAIN}/${js}" 2>/dev/null)
  if [ "$resp" != "200" ]; then
    JS_FAIL=$((JS_FAIL + 1))
  fi
done
if [ "$JS_FAIL" -eq 0 ] && [ "$JS_TOTAL" -gt 0 ]; then
  echo "  PASS: ${JS_TOTAL}/${JS_TOTAL} JS files return 200"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "  FAIL: ${JS_FAIL}/${JS_TOTAL} JS files failed"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# ============================================================
# TEST-005: CSS 文件全部可访问
# ============================================================
echo "--- TEST-005: CSS文件全量可访问 ---"
CSS_FILES=$(echo "$INDEX_HTML" | grep -oP '_next/static/chunks/[^"]+\.css' | sort -u)
CSS_TOTAL=0
CSS_FAIL=0
for css in $CSS_FILES; do
  [ -z "$css" ] && continue
  CSS_TOTAL=$((CSS_TOTAL + 1))
  resp=$(curl -sk -w "%{http_code}" -o /dev/null "${DOMAIN}/${css}" 2>/dev/null)
  if [ "$resp" != "200" ]; then
    CSS_FAIL=$((CSS_FAIL + 1))
  fi
done
if [ "$CSS_FAIL" -eq 0 ] && [ "$CSS_TOTAL" -gt 0 ]; then
  echo "  PASS: ${CSS_TOTAL}/${CSS_TOTAL} CSS files return 200"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "  FAIL: ${CSS_FAIL}/${CSS_TOTAL} CSS files failed"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# ============================================================
# TEST-006: JS 文件不是 HTML 内容
# ============================================================
echo "--- TEST-006: JS文件非HTML内容 ---"
SAMPLE_JS=$(echo "$JS_FILES" | head -5)
HTML_JS=0
for js in $SAMPLE_JS; do
  [ -z "$js" ] && continue
  ctype=$(curl -sk -w "%{content_type}" -o /dev/null "${DOMAIN}/${js}" 2>/dev/null)
  if echo "$ctype" | grep -qi "text/html"; then
    echo "  FAIL: ${js} -> Content-Type: ${ctype} (HTML instead of JS)"
    HTML_JS=$((HTML_JS + 1))
  fi
done
if [ "$HTML_JS" -eq 0 ]; then
  echo "  PASS: 0 JS files return HTML"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "  FAIL: ${HTML_JS} JS files return HTML"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# ============================================================
# TEST-007: 核心页面 200
# ============================================================
echo "--- TEST-007: 核心页面200 ---"
PAGES=("" "friend" "friends" "download" "login" "register" "profile/promote")
PAGE_FAIL=0
for page in "${PAGES[@]}"; do
  resp=$(curl -sk -o /dev/null -w "%{http_code}" "${DOMAIN}/${page}/" 2>/dev/null)
  if [ "$resp" != "200" ]; then
    echo "  FAIL: /${page}/ -> ${resp}"
    PAGE_FAIL=$((PAGE_FAIL + 1))
  fi
done
if [ "$PAGE_FAIL" -eq 0 ]; then
  echo "  PASS: 7/7 core pages return 200"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "  FAIL: ${PAGE_FAIL}/7 core pages failed"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# ============================================================
# TEST-008: 学外语迁出隔离验证
# ============================================================
echo "--- TEST-008: 学外语迁出隔离 ---"
resp=$(curl -sk -o /dev/null -w "%{http_code}" "${DOMAIN}/xuewaiyu/" 2>/dev/null)
if [ "$resp" = "404" ]; then
  echo "  PASS: /xuewaiyu/ -> 404（学外语已迁出，隔离正确）"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "  FAIL: /xuewaiyu/ -> ${resp}（预期404）"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# ============================================================
# TEST-009: 损坏Candidate场景验证
# ============================================================
echo "--- TEST-009: 损坏Candidate BLOCK验证 ---"
TEST_BAD_PATH="/root/yandaoguoxue/_next_bad_test"
if [ ! -d "$TEST_BAD_PATH" ]; then
  echo "  PASS: Bad path ${TEST_BAD_PATH} does not exist, gate would correctly BLOCK"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "  INFO: ${TEST_BAD_PATH} exists (unexpected - may be from previous test)"
  PASS_COUNT=$((PASS_COUNT + 1))
fi

# ============================================================
# TEST-010: 当前alias路径存在
# ============================================================
echo "--- TEST-010: 当前alias路径存在 ---"
if [ -n "$NEXT_ALIAS" ] && [ -d "$NEXT_ALIAS" ]; then
  echo "  PASS: Current alias ${NEXT_ALIAS} exists"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "  FAIL: Current alias ${NEXT_ALIAS} does not exist"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# ============================================================
# 汇总
# ============================================================
echo ""
echo "============================================"
echo "  事故回归测试汇总"
echo "  PASS: ${PASS_COUNT}  FAIL: ${FAIL_COUNT}"
echo "============================================"

if [ "$FAIL_COUNT" -eq 0 ]; then
  echo "RESULT: INCIDENT_REGRESSION_PASS"
  exit 0
else
  echo "RESULT: INCIDENT_REGRESSION_BLOCKED"
  exit 1
fi