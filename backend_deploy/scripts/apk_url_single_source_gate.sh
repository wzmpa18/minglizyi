#!/bin/bash
# ============================================================================
# APK_URL_SINGLE_SOURCE_GATE — 发布门禁（FINAL-HANDOVER-20260826 D20 防复发）
# 用法: bash apk_url_single_source_gate.sh [期望versionCode] [期望versionName]
# 任何一项失败 => exit 1（发布流程必须中止）
# cron建议: 每日一次巡检 + 每次发布前强制执行
# ============================================================================
set -u

APK_URL="https://yandaoguoxue.yandao.vip/app-download/latest.apk"
APK_DIR="/var/www/yandao.vip/app-download"
APK_FILE="$APK_DIR/latest.apk"
AAPT="/opt/android-sdk/build-tools/34.0.0/aapt"
EXPECT_CODE="${1:-}"
EXPECT_NAME="${2:-}"
TMP=$(mktemp -d)
PASS=0; FAIL=0

ok()   { PASS=$((PASS+1)); echo "  [PASS] $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  [FAIL] $1"; }
hdr()  { echo; echo "===== $1 ====="; }

# ---------- 1. HTTP 层 ----------
hdr "1. HTTP 检查（$APK_URL）"
CODE=$(curl -sk -m 30 -o /dev/null -w '%{http_code}' -I "$APK_URL")
[ "$CODE" = "200" ] && ok "HTTP 200" || bad "HTTP 状态=$CODE（应200）"

CTYPE=$(curl -sk -m 30 -I "$APK_URL" | grep -i '^content-type' | tr -d '\r' | awk '{print $2}')
[ "$CTYPE" = "application/vnd.android.package-archive" ] && ok "Content-Type=$CTYPE" || bad "Content-Type=$CTYPE（应 application/vnd.android.package-archive）"

curl -sk -m 120 -o "$TMP/latest.apk" "$APK_URL"
SIZE=$(stat -c%s "$TMP/latest.apk" 2>/dev/null || echo 0)
[ "$SIZE" -gt 5242880 ] && ok "文件大小 $((SIZE/1024/1024))MB > 5MB" || bad "文件大小 ${SIZE}B ≤ 5MB"

# ---------- 2. 二进制层 ----------
hdr "2. APK 二进制检查"
MAGIC=$(head -c 4 "$TMP/latest.apk" | xxd -p 2>/dev/null)
[ "$MAGIC" = "504b0304" ] && ok "APK magic 正常 (PK\\x03\\x04)" || bad "magic=$MAGIC（应 504b0304）"

PKG=$($AAPT dump badging "$TMP/latest.apk" 2>/dev/null | grep "^package:" | head -1)
PKG_NAME=$(echo "$PKG"  | grep -o "package: name='[^']*'"  | grep -o "'[^']*'" | tr -d "'")
V_CODE=$(echo "$PKG"   | grep -o "versionCode='[^']*'"     | grep -o "'[^']*'" | tr -d "'")
V_NAME=$(echo "$PKG"   | grep -o "versionName='[^']*'"     | grep -o "'[^']*'" | tr -d "'")
[ "$PKG_NAME" = "com.yandao.guoxue" ] && ok "包名=$PKG_NAME" || bad "包名=$PKG_NAME（应 com.yandao.guoxue）"
if [ -n "$EXPECT_CODE" ]; then
  [ "$V_CODE" = "$EXPECT_CODE" ] && ok "versionCode=$V_CODE" || bad "versionCode=$V_CODE（应 $EXPECT_CODE）"
else
  ok "versionCode=$V_CODE（未指定期望值，仅记录）"
fi
if [ -n "$EXPECT_NAME" ]; then
  [ "$V_NAME" = "$EXPECT_NAME" ] && ok "versionName=$V_NAME" || bad "versionName=$V_NAME（应 $EXPECT_NAME）"
else
  ok "versionName=$V_NAME（未指定期望值，仅记录）"
fi

MD5=$(md5sum "$TMP/latest.apk" | cut -d' ' -f1)
SHA=$(sha256sum "$TMP/latest.apk" | cut -d' ' -f1)
ok "MD5=$MD5"
ok "SHA256=${SHA:0:16}..."

# 服务器文件与公网文件一致性
SRV_MD5=$(md5sum "$APK_FILE" 2>/dev/null | cut -d' ' -f1)
[ "$SRV_MD5" = "$MD5" ] && ok "公网文件与服务器文件 MD5 一致" || bad "公网/服务器 MD5 不一致！($MD5 vs $SRV_MD5)"

# 分发目录唯一性：只允许 latest.apk 一个 APK 文件
APK_COUNT=$(ls "$APK_DIR"/*.apk 2>/dev/null | wc -l)
[ "$APK_COUNT" = "1" ] && ok "分发目录仅 latest.apk 单一文件" || bad "分发目录存在 $APK_COUNT 个 APK（应仅 1 个 latest.apk）"

# ---------- 3. 公开入口扫描（唯一真源） ----------
hdr "3. 公开 APK 入口扫描（只允许 /app-download/latest.apk）"
scan_dir() {
  local dir="$1" label="$2"
  local hits=0
  # 旧包名模式 / 任何非 latest.apk 的公网 apk 直链
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    hits=$((hits+1)); echo "  [污染] $line"
  done < <(grep -rEo --include='*.json' --include='*.html' --include='*.js' --include='*.htm' 'https?://[^"'"'"' )]*\.apk' "$dir" 2>/dev/null | grep -v 'app-download/latest\.apk' | sort -u | head -10)
  if [ "$hits" = "0" ]; then ok "$label 无非法 APK 直链"; else bad "$label 发现 $hits 处非法 APK 直链"; fi
}
scan_dir "/www/yandao-company" "公司官网"
[ -d /root/yandaoguoxue/current ] && scan_dir "/root/yandaoguoxue/current" "线上Web构建"
scan_dir "/www/yandaoguoxue-backend/data" "后端配置JSON"

# ---------- 4. 配置端点 ----------
hdr "4. 配置端点 downloadUrl 一致性"
for EP in "https://yandaoguoxue.yandao.vip/api/public/app-version" \
          "https://yandaoguoxue.yandao.vip/api/admin/poster-config/poster/config/public" \
          "https://yandaoguoxue.yandao.vip/api/admin/share-config/share/config/public"; do
  DU=$(curl -sk -m 15 "$EP" | grep -o 'https://[^"]*\.apk' | head -1)
  [ "$DU" = "$APK_URL" ] && ok "$(basename $(dirname $EP))/… downloadUrl 正确" || bad "$EP downloadUrl=$DU"
done

# ---------- 5. 根路径防误判 ----------
hdr "5. 根路径 /latest.apk 重定向"
RD=$(curl -sk -m 10 -o /dev/null -w '%{http_code}' "$APK_URL" -I "https://yandaoguoxue.yandao.vip/latest.apk" 2>/dev/null; curl -sk -m 10 -o /dev/null -w '%{http_code}' -I "https://yandaoguoxue.yandao.vip/latest.apk")
RD=$(curl -sk -m 10 -o /dev/null -w '%{http_code}' -I "https://yandaoguoxue.yandao.vip/latest.apk")
[ "$RD" = "301" ] && ok "根路径 301 -> 正式地址" || bad "根路径状态=$RD（应301）"

# ---------- 结果 ----------
rm -rf "$TMP"
echo
echo "=========================================="
if [ "$FAIL" = "0" ]; then
  echo "APK_URL_SINGLE_SOURCE_GATE: PASS ($PASS 项通过)"
  echo "=========================================="
  exit 0
else
  echo "APK_URL_SINGLE_SOURCE_GATE: **BUILD FAIL** (PASS=$PASS FAIL=$FAIL)"
  echo "=========================================="
  exit 1
fi
