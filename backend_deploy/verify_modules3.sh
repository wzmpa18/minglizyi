#!/bin/bash
# verify_modules3.sh — 生产公网验证 v2（修正为真实端点）
KEY=$(grep "^ADMIN_API_KEY=" /www/yandaoguoxue-backend/.env | cut -d= -f2- | tr -d '\r\n')
B="https://yandaoguoxue.yandao.vip"
PASS=0; FAIL=0; TOTAL=0

check() {
  local name="$1"; local url="$2"; local grep_pat="${3:-}"
  TOTAL=$((TOTAL+1))
  local body
  body=$(curl -s -m 20 -H "Authorization: Bearer $KEY" "$url")
  local ok=1
  if [ -n "$grep_pat" ]; then
    echo "$body" | grep -q "$grep_pat" || ok=0
  else
    echo "$body" | grep -q '"success":true' || ok=0
  fi
  if [ $ok -eq 1 ]; then
    PASS=$((PASS+1))
    echo "[PASS] $name"
  else
    FAIL=$((FAIL+1))
    echo "[FAIL] $name"
    echo "       -> $(echo "$body" | head -c 260)"
  fi
}

echo "=================================================================="
echo "PROD VERIFY v2 $(date '+%F %T')"
echo "=================================================================="

echo "== 1. Unified Admin (121-123) =="
check "unified whoami"      "$B/api/admin/unified/whoami"   ''
check "unified overview"    "$B/api/admin/unified/overview" ''

echo "== 2. Question Factory (81-96) =="
check "qf blueprints"       "$B/api/admin/qf/blueprints"    ''
check "qf inventory"        "$B/api/admin/qf/inventory"     ''
check "qf queue"            "$B/api/admin/qf/queue"         ''
check "qf quality"          "$B/api/admin/qf/quality"       ''

echo "== 3. Object Storage + Backup DR (103-114) =="
check "oss overview"        "$B/api/admin/oss/overview"         ''
check "oss capability"      "$B/api/admin/oss/capability"       ''
check "oss backup list"     "$B/api/admin/oss/backup/list"      ''
check "oss backup drillst"  "$B/api/admin/oss/backup/drill-status" ''
check "oss owner-actions"   "$B/api/admin/oss/owner-actions"    ''

echo "== 4. Storage GC + capacity (70-74) =="
check "storage report"      "$B/api/admin/storage/report"       ''
check "storage forbidden"   "$B/api/admin/storage/gc/forbidden" ''
check "storage config"      "$B/api/admin/storage/config"       ''

echo "== 5. Offline packs (54-66) =="
check "offline manifest"    "$B/api/offline/manifest"           ''
check "offline admin packs" "$B/api/admin/offline/packs"        ''

echo "== 6. Social (rate-limit mounted) =="
check "social circles"      "$B/api/social/circles"             '"success"'

echo "== 7. Basic =="
check "health"              "$B/api/health"                     'success'
check "pricing SSOT"        "$B/api/public/pricing/"            'success'
check "app version"         "$B/api/public/app-version"         'success'
check "front version.json"  "$B/version.json"                   'v25.0.66'

echo ""
echo "=================================================================="
echo "RESULT: PASS=$PASS FAIL=$FAIL TOTAL=$TOTAL"
echo "=================================================================="
[ $FAIL -eq 0 ] && echo "ALL PASS" || echo "HAS FAILURES"
