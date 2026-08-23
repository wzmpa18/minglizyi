#!/bin/bash
# ============================================================================
# v25.0.52 APK 构建：FIX-V20 首页死键清理+四柱高对比+更新自动清缓存
#   前置：release_v25_0_47_20.sh 已执行（/root/yandaoguoxue-source/out/ 为 v25.0.47_20）
#   流程：out/ → android assets/public/ → 写入 app-native.json（versionCode 2052）
#         → gradle assembleRelease（自动签名）→ 验证 → 上传分发目录 → 更新别名
#         → latest.apk 永久固定名别名（全站 APK 直链统一指向这一处）
#         → 后端 app-release-config.json 更新至 2052（升级提示数据源）
# ============================================================================
set -e
SRC_DIR="/root/yandaoguoxue-source"
ASSETS_PUBLIC="$SRC_DIR/android/app/src/main/assets/public"
APK_OUT="$SRC_DIR/android/app/build/outputs/apk/release/app-release.apk"
DIST_DIR="/var/www/yandao.vip/app-download"
NEW_APK_NAME="yandao-guoxue-v25.0.52-release.apk"

cd "$SRC_DIR"

echo "--- [0] 前置校验 ---"
test -f out/index.html || { echo "FATAL: out/ 不存在"; exit 1; }
BUILD_ID=$(node -e "console.log(JSON.parse(require('fs').readFileSync('out/version.json','utf8')).buildId)")
echo "web资源 buildId: ${BUILD_ID}"
echo "$BUILD_ID" | grep -q "v25.0.47_20" || { echo "FATAL: out/ 非 v25.0.47_20 构建"; exit 1; }
grep -q 'versionCode 2052' android/app/build.gradle || { echo "FATAL: build.gradle versionCode 非 2052"; exit 1; }
grep -q 'versionName "25.0.52"' android/app/build.gradle || { echo "FATAL: build.gradle versionName 非 25.0.52"; exit 1; }

echo "--- [1] 同步 web 资源到 android assets ---"
rm -rf "$ASSETS_PUBLIC"
mkdir -p "$ASSETS_PUBLIC"
cp -r out/* "$ASSETS_PUBLIC/"

echo "--- [2] 写入 app-native.json（本地版本标识，AppUpgradeChecker 探测用） ---"
cat > "$ASSETS_PUBLIC/app-native.json" <<'EON'
{
  "versionName": "25.0.52",
  "versionCode": 2052,
  "platform": "android",
  "builtAt": "2026-08-23T22:10:00+08:00"
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
unzip -o -q "$APK_OUT" "assets/public/app-native.json" "assets/public/version.json" "assets/public/native-api-patch.js" 2>/dev/null
echo "--- 内置 app-native.json ---"
cat assets/public/app-native.json
grep -q '"versionCode": 2052' assets/public/app-native.json || { echo "FATAL: 内置版本号错误"; exit 1; }
echo "--- 内置 version.json ---"
cat assets/public/version.json
grep -q "v25.0.47_20" assets/public/version.json || { echo "FATAL: 内置 web 资源版本错误"; exit 1; }
echo "--- 内置关键代码检查 ---"
unzip -o -q "$APK_OUT" "assets/public/_next/static/chunks/*" "assets/public/index.html" 2>/dev/null
for kw in "检查更新" "登录后即可购买会员" "发现新版本" "打开导航菜单" "官方公告" "latest.apk" "C62828" "getRegistrations"; do
  n=$(grep -rl "$kw" assets/public/_next/static/chunks/ 2>/dev/null | wc -l)
  echo "[$kw] 命中 $n 个chunk"
  [ "$n" -eq 0 ] && { echo "FATAL: APK 内置资源缺少 [$kw]"; exit 1; }
done
HTML_B=$(grep -c "C62828" assets/public/index.html 2>/dev/null || echo 0)
echo "index.html 红柱C62828出现: ${HTML_B} 次"
[ "$HTML_B" -lt 1 ] && { echo "FATAL: 首页红柱未烧录"; exit 1; }
RELOAD_N=$(grep -c "window.location.reload()" assets/public/index.html 2>/dev/null || echo 0)
echo "index.html 死键reload残留: ${RELOAD_N} 处（应为0）"
[ "$RELOAD_N" -ne 0 ] && { echo "FATAL: 首页死键未移除"; exit 1; }
echo "--- APK 签名验证 ---"
cd "$SRC_DIR/android"
$ANDROID_HOME/build-tools/34.0.0/apksigner verify --print-certs "$APK_OUT" 2>/dev/null | head -3 || echo "（apksigner 不可用，跳过签名详情）"

echo "--- [5] 上传分发目录 ---"
cp -f "$APK_OUT" "$DIST_DIR/$NEW_APK_NAME"
chmod 644 "$DIST_DIR/$NEW_APK_NAME"
cp -f "$APK_OUT" "$DIST_DIR/guoxue-chuancheng-v1.0-release.apk"
chmod 644 "$DIST_DIR/guoxue-chuancheng-v1.0-release.apk"
# latest.apk 永久固定名别名——全站 APK 直链统一指向这一处
cp -f "$APK_OUT" "$DIST_DIR/latest.apk"
chmod 644 "$DIST_DIR/latest.apk"
ls -la "$DIST_DIR/"

echo "--- [6] 后端版本配置写入（升级提示数据源，幂等） ---"
mkdir -p /www/yandaoguoxue-backend/data
cat > /www/yandaoguoxue-backend/data/app-release-config.json <<'EOCFG'
{
  "latestVersion": "25.0.52",
  "latestVersionCode": 2052,
  "downloadUrl": "https://yandaoguoxue.yandao.vip/app-download/latest.apk",
  "downloadPage": "https://yandaoguoxue.yandao.vip/friend",
  "releaseNotes": [
    "首页优化：移除无功能的刷新/设置按钮，界面更简洁",
    "黄历四柱全新高对比配色：白底红字，年月日时一眼看清",
    "版本更新自动清除缓存：升级后立即加载全新页面，不再看到旧版残留",
    "会员购买流程更顺畅：未登录购买弹出登录引导，登录后一键开通"
  ],
  "forceUpdate": false,
  "publishedAt": "2026-08-23T22:10:00+08:00"
}
EOCFG
grep -q '"latestVersionCode": 2052' /www/yandaoguoxue-backend/data/app-release-config.json || { echo "FATAL: 后端版本配置写入失败"; exit 1; }
grep -q 'app-download/latest.apk' /www/yandaoguoxue-backend/data/app-release-config.json || { echo "FATAL: 后端下载地址未指向统一固定地址 latest.apk"; exit 1; }
pm2 restart yandaoguoxue-backend --update-env > /dev/null 2>&1
sleep 4
curl -s -m 10 https://yandaoguoxue.yandao.vip/api/public/app-version | grep -q '"latestVersionCode":2052\|"latestVersionCode": 2052' || { echo "FATAL: 升级接口未返回2052"; exit 1; }
echo "后端配置 OK（升级接口已返回 2052）"

echo "--- [7] 公网验证 ---"
DOMAIN="https://yandaoguoxue.yandao.vip"
CODE=$(curl -s -o /dev/null -w '%{http_code}' -I ${DOMAIN}/app-download/${NEW_APK_NAME})
echo "新 APK 直链: ${CODE}"
[ "$CODE" != "200" ] && { echo "FATAL: 新 APK 直链非200"; exit 1; }
CT=$(curl -sI ${DOMAIN}/app-download/${NEW_APK_NAME} | grep -i 'content-type' | tr -d '\r')
echo "MIME: ${CT}"
echo "$CT" | grep -q 'application/vnd.android.package-archive' || { echo "FATAL: APK MIME错误"; exit 1; }
LATEST=$(curl -s -o /dev/null -w '%{http_code}' -I ${DOMAIN}/app-download/latest.apk)
echo "统一固定地址 latest.apk: ${LATEST}"
[ "$LATEST" != "200" ] && { echo "FATAL: 统一固定地址 latest.apk 非200"; exit 1; }
ALIAS=$(curl -s -o /dev/null -w '%{http_code}' -I ${DOMAIN}/app-download/guoxue-chuancheng-v1.0-release.apk)
echo "别名直链: ${ALIAS}"
[ "$ALIAS" != "200" ] && { echo "FATAL: 别名直链非200"; exit 1; }

echo "===== APK v25.0.52 BUILD COMPLETE ====="
