#!/bin/bash
# ============================================================================
# v25.0.58 发布：紫微斗数 UI 修正（用户 20260826 指令）
#   ① 移除紫微斗数星曜点击跳转学习页（/academy/learn）——干扰用户，删除
#   ② ZW-TIME 时间轴状态卡（叠宫对照行/运限四化）从命盘下方移至页面最底部
#   ③ 保留 v25.0.57 全部功能：易学模块修复、更新弹窗、会员显示、AI权限、侧滑返回、离线包
#   web 版本 v25.0.47_34 / APK versionCode 2058
# 流程：web构建 → 内容门禁 → current切流 → APK构建 → 分发 → 升级配置 → 公网验证
# ============================================================================
set -euo pipefail
SRC_DIR="/root/yandaoguoxue-source"
VERSION="v25.0.47_34"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"
ASSETS_PUBLIC="$SRC_DIR/android/app/src/main/assets/public"
APK_OUT="$SRC_DIR/android/app/build/outputs/apk/release/app-release.apk"
DIST_DIR="/var/www/yandao.vip/app-download"
NEW_APK_NAME="yandao-guoxue-v25.0.58-release.apk"
BASE="https://yandaoguoxue.yandao.vip"

echo "=== [0] 服务器校验 ==="
PUBIP=$(curl -s -m 8 ifconfig.me || true)
[ "${PUBIP}" = "82.156.228.87" ] || { echo "FATAL: 公网IP非82.156.228.87，禁止部署"; exit 1; }

echo "=== [1] 前置校验（源码特征） ==="
if grep -q "academy" "$SRC_DIR/src/app/yixue/ziwei/page.tsx"; then echo "FATAL: ziwei 页仍含 academy 跳转"; exit 1; fi
grep -q '从命盘下方移至页面最底部' "$SRC_DIR/src/app/yixue/ziwei/page.tsx" || { echo "FATAL: ZW-TIME 卡片未移至底部"; exit 1; }
grep -q 'versionCode 2058' "$SRC_DIR/android/app/build.gradle" || { echo "FATAL: versionCode 非 2058"; exit 1; }
grep -q 'versionName "25.0.58"' "$SRC_DIR/android/app/build.gradle" || { echo "FATAL: versionName 非 25.0.58"; exit 1; }
grep -q 'setDownloadListener' "$SRC_DIR/android/app/src/main/java/com/yandao/guoxue/MainActivity.java" || { echo "FATAL: 缺 DownloadListener"; exit 1; }
echo "源码特征校验通过"

echo "=== [2] web 构建（out/ → v25.0.47_34） ==="
cd "$SRC_DIR"
bash build.sh
node -e "const v=require('./out/version.json');if(!v.buildId.includes('v25.0.47_34')){console.error('FATAL: out/ 非 v25.0.47_34');process.exit(1)}"
echo "out/ 版本确认 v25.0.47_34"

echo "=== [3] 内容门禁 ==="
CHK_DIR="$SRC_DIR/out/_next/static/chunks"
fail=0
grep -rlq 'ZW-TIME' "$CHK_DIR" || { echo "FAIL: ZW-TIME 卡片代码未入包"; fail=1; }
IPLEAK=$(grep -rlE '82\.156\.228\.87|8\.155\.23\.111' "$CHK_DIR" | wc -l || true)
[ "$IPLEAK" = "0" ] || { echo "FAIL: IP泄漏 $IPLEAK 个文件"; fail=1; }
[ "$fail" = "0" ] || { echo "FATAL: 内容门禁未通过"; exit 1; }
echo "内容门禁通过"

echo "=== [4] current 切流（web 部署） ==="
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
cp -r "$SRC_DIR/out/." "$RELEASE_DIR/"
ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
readlink /root/yandaoguoxue/current
rm -rf /var/cache/nginx/* 2>/dev/null || true
nginx -s reload 2>/dev/null || true
sleep 2

echo "=== [5] 公网 web 验证 ==="
V=$(curl -sk -m 10 "$BASE/version.json")
echo "version.json: $V"
echo "$V" | grep -q 'v25.0.47_34' || { echo "FAIL: 公网版本号未更新"; exit 1; }
for p in / /yixue/ /yixue/ziwei/ /profile/ /discover/; do
  code=$(curl -sk -o /dev/null -w '%{http_code}' -m 15 "$BASE$p")
  echo "  $p -> $code"
  [ "$code" = "200" ] || { echo "FAIL: $p 非200"; exit 1; }
done

echo "=== [6] 同步 web 资源到 android assets ==="
rm -rf "$ASSETS_PUBLIC"
mkdir -p "$ASSETS_PUBLIC"
cp -r "$SRC_DIR/out/." "$ASSETS_PUBLIC/"
BUILT_AT=$(date +%Y-%m-%dT%H:%M:%S+08:00)
cat > "$ASSETS_PUBLIC/app-native.json" <<EON
{
  "versionName": "25.0.58",
  "versionCode": 2058,
  "platform": "android",
  "builtAt": "${BUILT_AT}"
}
EON
cat "$ASSETS_PUBLIC/app-native.json"

echo "=== [7] Gradle 构建（release 自动签名） ==="
cd "$SRC_DIR/android"
export ANDROID_HOME=/opt/android-sdk
GRADLE_BIN=/opt/gradle-8.9/bin/gradle
test -x "$GRADLE_BIN" || { echo "FATAL: $GRADLE_BIN 不存在"; exit 1; }
"$GRADLE_BIN" assembleRelease --no-daemon -q 2>&1 | tail -5 || { echo "FATAL: gradle 构建失败"; exit 1; }
test -f "$APK_OUT" || { echo "FATAL: APK 未生成"; exit 1; }
ls -la "$APK_OUT"

echo "=== [8] APK 内容验证 ==="
APK_SIZE=$(stat -c %s "$APK_OUT")
echo "APK 大小: ${APK_SIZE} bytes"
[ "$APK_SIZE" -lt 5000000 ] && { echo "FATAL: APK 体积异常（<5MB）"; exit 1; }
cd /tmp && rm -rf apk_verify_58 && mkdir apk_verify_58 && cd apk_verify_58
unzip -o -q "$APK_OUT" "assets/public/app-native.json" "assets/public/version.json" "classes*.dex" 2>/dev/null
grep -q '"versionCode": 2058' assets/public/app-native.json || { echo "FATAL: 内置版本号错误"; exit 1; }
grep -q "v25.0.47_34" assets/public/version.json || { echo "FATAL: 内置 web 资源版本错误"; exit 1; }
DL_HITS=$(cat classes*.dex 2>/dev/null | grep -a -c "setDownloadListener" || true)
echo "setDownloadListener 符号命中: ${DL_HITS}"
[ "${DL_HITS}" -ge 1 ] || { echo "FATAL: DownloadListener 未编译入 APK"; exit 1; }
unzip -o -q "$APK_OUT" "assets/public/_next/static/chunks/*" 2>/dev/null
echo "--- 紫微修复特征检查 ---"
ACADEMY_HITS=$(grep -rl "academy/learn" assets/public/_next/static/chunks/ 2>/dev/null | wc -l || true)
echo "academy/learn 跳转残留: ${ACADEMY_HITS} chunks（预期 0）"
ZWTIME_HITS=$(grep -rl "ZW-TIME" assets/public/_next/static/chunks/ 2>/dev/null | wc -l || true)
echo "ZW-TIME 卡片: ${ZWTIME_HITS} chunks（预期 ≥1）"
[ "${ZWTIME_HITS}" -ge 1 ] || { echo "FATAL: ZW-TIME 卡片缺失"; exit 1; }

echo "=== [9] 分发（单一分发源三文件） ==="
cp -f "$APK_OUT" "$DIST_DIR/$NEW_APK_NAME"
cp -f "$APK_OUT" "$DIST_DIR/guoxue-chuancheng.apk"
cp -f "$APK_OUT" "$DIST_DIR/latest.apk"
MD5_1=$(md5sum "$DIST_DIR/$NEW_APK_NAME" | cut -d' ' -f1)
MD5_2=$(md5sum "$DIST_DIR/guoxue-chuancheng.apk" | cut -d' ' -f1)
MD5_3=$(md5sum "$DIST_DIR/latest.apk" | cut -d' ' -f1)
echo "MD5: $MD5_1 / $MD5_2 / $MD5_3"
[ "$MD5_1" = "$MD5_2" ] && [ "$MD5_2" = "$MD5_3" ] || { echo "FATAL: 三文件 MD5 不一致"; exit 1; }

echo "=== [10] 升级配置写入 2058 ==="
cat > /www/yandaoguoxue-backend/data/app-release-config.json <<EOCFG
{
  "latestVersion": "25.0.58",
  "latestVersionCode": 2058,
  "downloadUrl": "https://yandaoguoxue.yandao.vip/app-download/latest.apk",
  "downloadPage": "https://yandaoguoxue.yandao.vip/friend",
  "releaseNotes": [
    "紫微斗数优化：命盘下方时间轴信息（叠宫/四化）移至页面底部，命盘更清爽",
    "移除星曜点击跳转学习页，避免误触干扰排盘",
    "保留全部功能：易学工具、AI解读、合伙人渠道、侧滑返回、离线数据"
  ],
  "forceUpdate": false,
  "publishedAt": "${BUILT_AT}"
}
EOCFG
grep -q '"latestVersionCode": 2058' /www/yandaoguoxue-backend/data/app-release-config.json || { echo "FATAL: 升级配置未写入"; exit 1; }

echo "=== [11] 公网 APK 验证 ==="
sleep 2
curl -s -m 15 "$BASE/api/public/app-version" | grep -q '"latestVersionCode":2058' || { echo "FATAL: 版本接口未更新"; exit 1; }
REMOTE_SIZE=$(curl -s -o /dev/null -w "%{size_download}" -m 60 "$BASE/app-download/latest.apk")
echo "线上 latest.apk 大小: ${REMOTE_SIZE}"
[ "$REMOTE_SIZE" = "$APK_SIZE" ] || { echo "FATAL: 线上 APK 大小不一致"; exit 1; }

echo "===== RELEASE v25.0.58 COMPLETE ====="
