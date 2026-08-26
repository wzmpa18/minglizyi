#!/bin/bash
set -e
SRC_DIR="/root/yandaoguoxue-source"
ASSETS_PUBLIC="$SRC_DIR/android/app/src/main/assets/public"
APK_OUT="$SRC_DIR/android/app/build/outputs/apk/release/app-release.apk"
DIST_DIR="/var/www/yandao.vip/app-download"
NEW_APK_NAME="yandao-guoxue-v25.0.57-release.apk"

cd "$SRC_DIR"

echo "--- [0] 前置校验 ---"
test -f out/index.html || { echo "FATAL: out/ 不存在"; exit 1; }
node -e "const v=require('./out/version.json');if(!v.buildId.includes('v25.0.47_33'))process.exit(1)" || { echo "FATAL: out/ 非 v25.0.47_33"; exit 1; }
grep -q 'versionCode 2057' android/app/build.gradle || { echo "FATAL: versionCode 非 2057"; exit 1; }
grep -q 'versionName "25.0.57"' android/app/build.gradle || { echo "FATAL: versionName 非 25.0.57"; exit 1; }

echo "--- [1] 同步 web 资源到 android assets ---"
rm -rf "$ASSETS_PUBLIC"
mkdir -p "$ASSETS_PUBLIC"
cp -r out/* "$ASSETS_PUBLIC/"

echo "--- [2] 写入 app-native.json ---"
BUILT_AT=$(date +%Y-%m-%dT%H:%M:%S+08:00)
cat > "$ASSETS_PUBLIC/app-native.json" <<EON
{
  "versionName": "25.0.57",
  "versionCode": 2057,
  "platform": "android",
  "builtAt": "${BUILT_AT}"
}
EON
cat "$ASSETS_PUBLIC/app-native.json"

echo "--- [3] Gradle 构建 ---"
cd "$SRC_DIR/android"
export ANDROID_HOME=/opt/android-sdk
GRADLE_BIN=/opt/gradle-8.9/bin/gradle
"$GRADLE_BIN" assembleRelease --no-daemon -q 2>&1 | tail -5 || { echo "FATAL: gradle 构建失败"; exit 1; }
test -f "$APK_OUT" || { echo "FATAL: APK 未生成"; exit 1; }
ls -la "$APK_OUT"

echo "--- [4] APK 内容验证 ---"
APK_SIZE=$(stat -c %s "$APK_OUT")
echo "APK 大小: ${APK_SIZE} bytes"
[ "$APK_SIZE" -lt 5000000 ] && { echo "FATAL: APK 体积异常"; exit 1; }
cd /tmp && rm -rf apk_verify && mkdir apk_verify && cd apk_verify
unzip -o -q "$APK_OUT" "assets/public/app-native.json" "assets/public/version.json" 2>/dev/null
echo "--- app-native.json ---"
cat assets/public/app-native.json
grep -q '"versionCode": 2057' assets/public/app-native.json || { echo "FATAL: 内置版本号错误"; exit 1; }
echo "--- version.json ---"
cat assets/public/version.json
echo "--- 关键代码检查 ---"
unzip -o -q "$APK_OUT" "assets/public/_next/static/chunks/*" 2>/dev/null
for kw in "yandao_membership_status" "memberTier" "yandao_vc_dismissed_for" "复制下载链接"; do
  n=$(grep -rl "$kw" assets/public/_next/static/chunks/ 2>/dev/null | wc -l)
  echo "  ${kw}: ${n} chunks"
  [ "$n" -ge 1 ] || { echo "FATAL: 特征缺失 ${kw}"; exit 1; }
done
echo "--- checkWebVersion 已移除验证 ---"
n=$(grep -rl "checkWebVersion" assets/public/_next/static/chunks/ 2>/dev/null | wc -l)
echo "  checkWebVersion: ${n} chunks (应为0)"
[ "$n" -eq 0 ] || { echo "FATAL: checkWebVersion 未移除"; exit 1; }

echo "--- [5] 分发 ---"
cp -f "$APK_OUT" "$DIST_DIR/$NEW_APK_NAME"
cp -f "$APK_OUT" "$DIST_DIR/guoxue-chuancheng.apk"
cp -f "$APK_OUT" "$DIST_DIR/latest.apk"
MD5_1=$(md5sum "$DIST_DIR/$NEW_APK_NAME" | cut -d' ' -f1)
MD5_2=$(md5sum "$DIST_DIR/guoxue-chuancheng.apk" | cut -d' ' -f1)
MD5_3=$(md5sum "$DIST_DIR/latest.apk" | cut -d' ' -f1)
echo "MD5: $MD5_1 / $MD5_2 / $MD5_3"
[ "$MD5_1" = "$MD5_2" ] && [ "$MD5_2" = "$MD5_3" ] || { echo "FATAL: MD5 不一致"; exit 1; }

echo "--- [6] 升级配置 ---"
cat > /www/yandaoguoxue-backend/data/app-release-config.json <<EOCFG
{
  "latestVersion": "25.0.57",
  "latestVersionCode": 2057,
  "downloadUrl": "https://yandaoguoxue.yandao.vip/app-download/latest.apk",
  "downloadPage": "https://yandaoguoxue.yandao.vip/friend",
  "releaseNotes": [
    "修复更新弹窗反复弹出：关闭后不再提醒，不影响正常使用",
    "修复易学模块打不开：移除网页自动刷新导致的页面加载中断",
    "修复会员显示与AI权益：月度/季度/年度/终身会员正确显示，AI可用",
    "保留全部功能：下载更新、合伙人渠道、侧滑返回、离线数据包"
  ],
  "forceUpdate": false,
  "publishedAt": "${BUILT_AT}"
}
EOCFG
grep -q '"latestVersionCode": 2057' /www/yandaoguoxue-backend/data/app-release-config.json || { echo "FATAL: 升级配置未写入"; exit 1; }

echo "--- [7] 公网验证 ---"
sleep 2
curl -s -m 15 "https://yandaoguoxue.yandao.vip/api/public/app-version" | grep -q '"latestVersionCode":2057' || { echo "FATAL: 版本接口未更新"; exit 1; }
REMOTE_SIZE=$(curl -s -o /dev/null -w "%{size_download}" -m 60 "https://yandaoguoxue.yandao.vip/app-download/latest.apk")
echo "线上 latest.apk 大小: ${REMOTE_SIZE}"
[ "$REMOTE_SIZE" = "$APK_SIZE" ] || { echo "FATAL: 线上 APK 大小不一致"; exit 1; }

echo "=== APK v25.0.57 构建完成 ==="
