#!/bin/bash
set -e
SRC_DIR="/root/yandaoguoxue-source"
RELEASE_DIR="/root/yandaoguoxue/releases/v25.0.79"
ASSETS_PUBLIC="$SRC_DIR/android/app/src/main/assets/public"
APK_OUT="$SRC_DIR/android/app/build/outputs/apk/release/app-release.apk"
DIST_DIR="/var/www/yandao.vip/app-download"
NEW_APK_NAME="yandao-guoxue-v25.0.79-release.apk"

cd "$SRC_DIR"

echo "--- [0] 前置校验 ---"
test -f "$RELEASE_DIR/index.html" || { echo "FATAL: releases/v25.0.79 不存在"; exit 1; }
node -e "const v=require('$RELEASE_DIR/version.json');if(!v.version.includes('v25.0.79'))process.exit(1)" || { echo "FATAL: releases 非 v25.0.79"; exit 1; }
grep -q 'versionCode 2072' android/app/build.gradle || { echo "FATAL: versionCode 非 2072"; exit 1; }
grep -q 'versionName "25.0.79"' android/app/build.gradle || { echo "FATAL: versionName 非 25.0.79"; exit 1; }
echo "前置校验 OK（资源 v25.0.79 / versionCode 2072）"

echo "--- [0.5] 整改内容门禁（资源侧）---"
fail=0
CH_PHONE=$(grep -rl "手机号码解析" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
echo "  手机号码解析: $CH_PHONE chunks"; [ "$CH_PHONE" -ge 1 ] || fail=1
CH_CAR=$(grep -rl "车牌号民俗解读" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
echo "  车牌号民俗解读: $CH_CAR chunks"; [ "$CH_CAR" -ge 1 ] || fail=1
CH_GUSHU=$(grep -rl "钦定协纪辨方书" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
echo "  黄历古籍注解: $CH_GUSHU chunks"; [ "$CH_GUSHU" -ge 1 ] || fail=1
CH_AI=$(grep -rl "仅用于国学、历法学术研究" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
echo "  AI免责声明: $CH_AI chunks"; [ "$CH_AI" -ge 1 ] || fail=1
for page in index.html yixue/huangli/index.html yixue/phone/index.html yixue/carplate/index.html; do
  if grep -q "吉凶" "$RELEASE_DIR/$page" 2>/dev/null; then echo "  FAIL: $page 含吉凶"; fail=1; else echo "  OK: $page 无吉凶"; fi
done
[ "$fail" = "0" ] || { echo "FATAL: 整改内容门禁未通过"; exit 1; }

echo "--- [1] 同步 web 资源到 android assets ---"
rm -rf "$ASSETS_PUBLIC"
mkdir -p "$ASSETS_PUBLIC"
cp -r "$RELEASE_DIR"/* "$ASSETS_PUBLIC/"
echo "assets files: $(find "$ASSETS_PUBLIC" -type f | wc -l)"

echo "--- [2] 写入 app-native.json ---"
BUILT_AT=$(date +%Y-%m-%dT%H:%M:%S+08:00)
cat > "$ASSETS_PUBLIC/app-native.json" <<EON
{
  "versionName": "25.0.79",
  "versionCode": 2072,
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
echo "APK 大小: $APK_SIZE bytes"
[ "$APK_SIZE" -lt 5000000 ] && { echo "FATAL: APK 体积异常"; exit 1; }
cd /tmp && rm -rf apk_verify && mkdir apk_verify && cd apk_verify
unzip -o -q "$APK_OUT" "assets/public/app-native.json" "assets/public/version.json" 2>/dev/null
grep -q '"versionCode": 2072' assets/public/app-native.json || { echo "FATAL: 内置版本号错误"; exit 1; }
echo "app-native.json OK"
unzip -o -q "$APK_OUT" "assets/public/_next/static/chunks/*" 2>/dev/null
echo "--- 整改特征词检查（必须>=1 chunks）---"
for kw in "手机号码解析" "车牌号民俗解读" "钦定协纪辨方书" "仅用于国学、历法学术研究" "十二时辰历注"; do
  n=$(grep -rl "$kw" assets/public/_next/static/chunks/ 2>/dev/null | wc -l)
  echo "  ${kw}: ${n} chunks"
  [ "$n" -ge 1 ] || { echo "FATAL: 特征缺失 ${kw}"; exit 1; }
done
echo "--- 旧入口文案检查（应为0）---"
n=$(grep -rl "手机号吉凶" assets/public/_next/static/chunks/ 2>/dev/null | wc -l)
echo "  手机号吉凶(旧): ${n} chunks"; [ "$n" = "0" ] || { echo "FATAL: 旧入口文案残留"; exit 1; }
n=$(grep -rl "车牌号吉凶" assets/public/_next/static/chunks/ 2>/dev/null | wc -l)
echo "  车牌号吉凶(旧): ${n} chunks"; [ "$n" = "0" ] || { echo "FATAL: 旧入口文案残留"; exit 1; }

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
  "latestVersion": "25.0.79",
  "latestVersionCode": 2072,
  "downloadUrl": "https://yandaoguoxue.yandao.vip/app-download/latest.apk",
  "downloadPage": "https://yandaoguoxue.yandao.vip/friend",
  "releaseNotes": [
    "工具入口名称规范化：手机号码解析、车牌号民俗解读",
    "黄历与万年历内容增加《钦定协纪辨方书》等古籍来源标注，仅供民俗文化学习参考",
    "AI 解读聚焦名词释义、典籍出处与天文历法科普，输出更严谨",
    "修复已知问题，提升稳定性"
  ],
  "forceUpdate": false,
  "publishedAt": "${BUILT_AT}"
}
EOCFG
grep -q '"latestVersionCode": 2072' /www/yandaoguoxue-backend/data/app-release-config.json || { echo "FATAL: 升级配置未写入"; exit 1; }

echo "--- [7] 公网验证 ---"
sleep 2
curl -s -m 15 "https://yandaoguoxue.yandao.vip/api/public/app-version" | grep -q '"latestVersionCode":2072' || { echo "FATAL: 版本接口未更新"; exit 1; }
echo "版本接口 2072 OK"
REMOTE_SIZE=$(curl -s -o /dev/null -w "%{size_download}" -m 120 "https://yandaoguoxue.yandao.vip/app-download/latest.apk")
echo "线上 latest.apk 大小: $REMOTE_SIZE"
[ "$REMOTE_SIZE" = "$APK_SIZE" ] || { echo "FATAL: 线上 APK 大小不一致"; exit 1; }
echo "线上 APK 与本地一致 OK"

echo "=== APK v25.0.79（整改版）构建完成 ==="
