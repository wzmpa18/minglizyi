#!/bin/bash
# ============================================================================
# v25.0.55 APK 构建：FIX-V29-DOWNLOAD-RESCUE 壳内下载根治
#   ① MainActivity DownloadListener：壳内 WebView 下载请求交系统 DownloadManager
#      （通知栏可见进度），与 web 层 intent:// 双保险
#   ② 内置 web 资源升级至 v25.0.47_29（/friend、/download 壳感知下载 +
#      「正在添加好友」假转圈修复 + 升级弹窗点击后不再重复弹）
#   前置：已执行 bash build.sh（out/ 为 v25.0.47_29 构建产物）
# ============================================================================
set -e
SRC_DIR="/root/yandaoguoxue-source"
ASSETS_PUBLIC="$SRC_DIR/android/app/src/main/assets/public"
APK_OUT="$SRC_DIR/android/app/build/outputs/apk/release/app-release.apk"
DIST_DIR="/var/www/yandao.vip/app-download"
NEW_APK_NAME="yandao-guoxue-v25.0.55-release.apk"

cd "$SRC_DIR"

echo "--- [0] 前置校验 ---"
test -f out/index.html || { echo "FATAL: out/ 不存在，请先执行 bash build.sh"; exit 1; }
node -e "const v=require('./out/version.json');if(!v.buildId.includes('v25.0.47_29'))process.exit(1)" || { echo "FATAL: out/ 非 v25.0.47_29"; exit 1; }
grep -q 'versionCode 2055' android/app/build.gradle || { echo "FATAL: build.gradle versionCode 非 2055"; exit 1; }
grep -q 'versionName "25.0.55"' android/app/build.gradle || { echo "FATAL: build.gradle versionName 非 25.0.55"; exit 1; }
grep -q 'setDownloadListener' android/app/src/main/java/com/yandao/guoxue/MainActivity.java || { echo "FATAL: MainActivity 缺 DownloadListener"; exit 1; }

echo "--- [1] 同步 web 资源到 android assets ---"
rm -rf "$ASSETS_PUBLIC"
mkdir -p "$ASSETS_PUBLIC"
cp -r out/* "$ASSETS_PUBLIC/"

echo "--- [2] 写入 app-native.json ---"
BUILT_AT=$(date +%Y-%m-%dT%H:%M:%S+08:00)
cat > "$ASSETS_PUBLIC/app-native.json" <<EON
{
  "versionName": "25.0.55",
  "versionCode": 2055,
  "platform": "android",
  "builtAt": "${BUILT_AT}"
}
EON
cat "$ASSETS_PUBLIC/app-native.json"

echo "--- [3] Gradle 构建（release 自动签名） ---"
cd "$SRC_DIR/android"
export ANDROID_HOME=/opt/android-sdk
GRADLE_BIN=/opt/gradle-8.9/bin/gradle
test -x "$GRADLE_BIN" || { echo "FATAL: $GRADLE_BIN 不存在"; exit 1; }
"$GRADLE_BIN" assembleRelease --no-daemon -q 2>&1 | tail -5 || { echo "FATAL: gradle 构建失败"; exit 1; }
test -f "$APK_OUT" || { echo "FATAL: APK 未生成"; exit 1; }
ls -la "$APK_OUT"

echo "--- [4] APK 内容验证 ---"
APK_SIZE=$(stat -c %s "$APK_OUT")
echo "APK 大小: ${APK_SIZE} bytes"
[ "$APK_SIZE" -lt 5000000 ] && { echo "FATAL: APK 体积异常（<5MB）"; exit 1; }
cd /tmp && rm -rf apk_verify && mkdir apk_verify && cd apk_verify
unzip -o -q "$APK_OUT" "assets/public/app-native.json" "assets/public/version.json" "classes*.dex" 2>/dev/null
echo "--- 内置 app-native.json ---"
cat assets/public/app-native.json
grep -q '"versionCode": 2055' assets/public/app-native.json || { echo "FATAL: 内置版本号错误"; exit 1; }
echo "--- 内置 version.json ---"
cat assets/public/version.json
grep -q "v25.0.47_29" assets/public/version.json || { echo "FATAL: 内置 web 资源版本错误"; exit 1; }
echo "--- DownloadListener 编译验证（dex 内符号检索） ---"
DL_HITS=$(cat classes*.dex 2>/dev/null | grep -a -c "setDownloadListener" || true)
echo "setDownloadListener 符号命中: ${DL_HITS}"
[ "${DL_HITS}" -ge 1 ] || { echo "FATAL: DownloadListener 未编译入 APK"; exit 1; }
echo "--- 内置关键代码检查 ---"
unzip -o -q "$APK_OUT" "assets/public/_next/static/chunks/*" 2>/dev/null
for kw in "复制下载链接" "正在为您升级新版本" "当前已是最新版本" "latest.apk"; do
  n=$(grep -rl "$kw" assets/public/_next/static/chunks/ 2>/dev/null | wc -l)
  echo "  ${kw}: ${n} chunks"
  [ "$n" -ge 1 ] || { echo "FATAL: 特征缺失 ${kw}"; exit 1; }
done

echo "--- [5] 分发（单一分发源三文件） ---"
cp -f "$APK_OUT" "$DIST_DIR/$NEW_APK_NAME"
cp -f "$APK_OUT" "$DIST_DIR/guoxue-chuancheng.apk"
cp -f "$APK_OUT" "$DIST_DIR/latest.apk"
MD5_1=$(md5sum "$DIST_DIR/$NEW_APK_NAME" | cut -d' ' -f1)
MD5_2=$(md5sum "$DIST_DIR/guoxue-chuancheng.apk" | cut -d' ' -f1)
MD5_3=$(md5sum "$DIST_DIR/latest.apk" | cut -d' ' -f1)
echo "MD5: $MD5_1 / $MD5_2 / $MD5_3"
[ "$MD5_1" = "$MD5_2" ] && [ "$MD5_2" = "$MD5_3" ] || { echo "FATAL: 三文件 MD5 不一致"; exit 1; }

echo "--- [6] 升级配置写入 2055 ---"
cat > /www/yandaoguoxue-backend/data/app-release-config.json <<EOCFG
{
  "latestVersion": "25.0.55",
  "latestVersionCode": 2055,
  "downloadUrl": "https://yandaoguoxue.yandao.vip/app-download/latest.apk",
  "downloadPage": "https://yandaoguoxue.yandao.vip/friend",
  "releaseNotes": [
    "修复下载更新：点击升级即刻打开系统浏览器下载，不再卡住",
    "下载进度通知栏可见，下载完成一键安装",
    "修复升级弹窗重复出现的问题",
    "保留 v25.0.54 全部功能：合伙人渠道体系、侧滑返回、离线数据"
  ],
  "forceUpdate": false,
  "publishedAt": "${BUILT_AT}"
}
EOCFG
grep -q '"latestVersionCode": 2055' /www/yandaoguoxue-backend/data/app-release-config.json || { echo "FATAL: 升级配置未写入"; exit 1; }

echo "--- [7] 公网验证 ---"
sleep 2
curl -s -m 15 "https://yandaoguoxue.yandao.vip/api/public/app-version" | grep -q '"latestVersionCode":2055' || { echo "FATAL: 版本接口未更新"; exit 1; }
REMOTE_SIZE=$(curl -s -o /dev/null -w "%{size_download}" -m 60 "https://yandaoguoxue.yandao.vip/app-download/latest.apk")
echo "线上 latest.apk 大小: ${REMOTE_SIZE}"
[ "$REMOTE_SIZE" = "$APK_SIZE" ] || { echo "FATAL: 线上 APK 大小不一致"; exit 1; }
echo ""
echo "ALL_OK v25.0.55 (2055)"
