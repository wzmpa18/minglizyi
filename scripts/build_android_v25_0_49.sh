#!/bin/bash
# ============================================================================
# v25.0.49 APK 重建：FIX-V17 全端抽屉+会员入口+检查更新+典籍AI全量导入
#   前置：已执行 bash build.sh（out/ 为 v25.0.47_17 构建产物）
#   流程：out/ → android assets/public/ → 写入 app-native.json（versionCode 2049）
#         → gradlew assembleRelease（自动签名）→ 验证 → 上传分发目录 → 更新别名
#         → 后端 app-release-config.json 更新至 2049（升级提示数据源）
# ============================================================================
set -e
SRC_DIR="/root/yandaoguoxue-source"
ASSETS_PUBLIC="$SRC_DIR/android/app/src/main/assets/public"
APK_OUT="$SRC_DIR/android/app/build/outputs/apk/release/app-release.apk"
DIST_DIR="/var/www/yandao.vip/app-download"
NEW_APK_NAME="yandao-guoxue-v25.0.49-release.apk"

cd "$SRC_DIR"

echo "--- [0] 前置校验 ---"
test -f out/index.html || { echo "FATAL: out/ 不存在，请先执行 bash build.sh"; exit 1; }
BUILD_ID=$(node -e "console.log(JSON.parse(require('fs').readFileSync('out/version.json','utf8')).buildId)")
echo "web资源 buildId: ${BUILD_ID}"
echo "$BUILD_ID" | grep -q "v25.0.47_17" || { echo "FATAL: out/ 非 v25.0.47_17 构建"; exit 1; }
grep -q 'versionCode 2049' android/app/build.gradle || { echo "FATAL: build.gradle versionCode 非 2049"; exit 1; }

echo "--- [0.5] 后端版本接口热更（app-version 先于 APK 上线，避免接口404窗口） ---"
cp -f "$SRC_DIR/backend_deploy/appVersionRoutes.js" /www/yandaoguoxue-backend/appVersionRoutes.js
cp -f "$SRC_DIR/backend_deploy/server.js" /www/yandaoguoxue-backend/server.js
grep -q '/api/public/app-version' /www/yandaoguoxue-backend/server.js || { echo "FATAL: 后端版本接口未挂载"; exit 1; }
pm2 restart yandaoguoxue-backend --update-env > /dev/null 2>&1
sleep 4
curl -s -m 10 https://yandaoguoxue.yandao.vip/api/public/app-version | grep -q 'latestVersionCode' || { echo "FATAL: 版本接口未生效"; exit 1; }
echo "版本接口已生效 OK"

echo "--- [1] 同步 web 资源到 android assets ---"
rm -rf "$ASSETS_PUBLIC"
mkdir -p "$ASSETS_PUBLIC"
cp -r out/* "$ASSETS_PUBLIC/"

echo "--- [2] 写入 app-native.json（本地版本标识，AppUpgradeChecker 探测用） ---"
cat > "$ASSETS_PUBLIC/app-native.json" <<'EON'
{
  "versionName": "25.0.49",
  "versionCode": 2049,
  "platform": "android",
  "builtAt": "2026-08-23T18:30:00+08:00"
}
EON
cat "$ASSETS_PUBLIC/app-native.json"

echo "--- [3] Gradle 构建（release 自动签名） ---"
cd "$SRC_DIR/android"
export ANDROID_HOME=/opt/android-sdk
# 用本地 Gradle 8.9（服务器曾清理过 wrapper 缓存，./gradlew 需联网下载发行版会失败）
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
grep -q '"versionCode": 2049' assets/public/app-native.json || { echo "FATAL: 内置版本号错误"; exit 1; }
echo "--- 内置 version.json ---"
cat assets/public/version.json
grep -q "v25.0.47_17" assets/public/version.json || { echo "FATAL: 内置 web 资源版本错误"; exit 1; }
echo "--- 内置关键代码检查 ---"
unzip -o -q "$APK_OUT" "assets/public/_next/static/chunks/*" 2>/dev/null
for kw in "检查更新" "濒湖脉学" "汤头歌诀" "大医精诚" "发现新版本" "renderViralPoster" "打开导航菜单" "下载言道国学APP"; do
  n=$(grep -rl "$kw" assets/public/_next/static/chunks/ 2>/dev/null | wc -l)
  echo "[$kw] 命中 $n 个chunk"
  [ "$n" -eq 0 ] && { echo "FATAL: APK 内置资源缺少 [$kw]"; exit 1; }
done
echo "--- APK 签名验证 ---"
cd "$SRC_DIR/android"
$ANDROID_HOME/build-tools/34.0.0/apksigner verify --print-certs "$APK_OUT" 2>/dev/null | head -3 || echo "（apksigner 不可用，跳过签名详情）"

echo "--- [5] 上传分发目录 ---"
cp -f "$APK_OUT" "$DIST_DIR/$NEW_APK_NAME"
chmod 644 "$DIST_DIR/$NEW_APK_NAME"
# 别名文件同步更新（存量分享海报/旧链接兼容）
cp -f "$APK_OUT" "$DIST_DIR/guoxue-chuancheng-v1.0-release.apk"
chmod 644 "$DIST_DIR/guoxue-chuancheng-v1.0-release.apk"
ls -la "$DIST_DIR/"

echo "--- [6] 后端版本配置写入（升级提示数据源，幂等） ---"
mkdir -p /www/yandaoguoxue-backend/data
cat > /www/yandaoguoxue-backend/data/app-release-config.json <<'EOCFG'
{
  "latestVersion": "25.0.49",
  "latestVersionCode": 2049,
  "downloadUrl": "https://yandaoguoxue.yandao.vip/app-download/yandao-guoxue-v25.0.49-release.apk",
  "downloadPage": "https://yandaoguoxue.yandao.vip/friend",
  "releaseNotes": [
    "后台导航全新升级：全端统一抽屉式，默认收起不遮挡内容，汉堡按钮一键唤出",
    "商业中心会员购买入口修复：会员中心一键直达，购买更顺畅",
    "新增检查更新：系统中心可手动检测新版本，有更新立即提醒",
    "中医典籍全量扩容：12部典籍共177章，新增濒湖脉学、药性赋、汤头歌诀、千金要方、医宗金鉴、中藏经6部经典"
  ],
  "forceUpdate": false,
  "publishedAt": "2026-08-23T18:30:00+08:00"
}
EOCFG
grep -q '"latestVersionCode": 2049' /www/yandaoguoxue-backend/data/app-release-config.json || { echo "FATAL: 后端版本配置写入失败"; exit 1; }
grep -q "$NEW_APK_NAME" /www/yandaoguoxue-backend/data/app-release-config.json || { echo "FATAL: 后端下载地址未指向新包"; exit 1; }
pm2 restart yandaoguoxue-backend --update-env > /dev/null 2>&1
sleep 3
curl -s -m 10 https://yandaoguoxue.yandao.vip/api/public/app-version | grep -q '"latestVersionCode":2049\|"latestVersionCode": 2049' || { echo "FATAL: 升级接口未返回2049"; exit 1; }
echo "后端配置 OK（升级接口已返回 2049）"

echo "--- [7] 公网验证 ---"
DOMAIN="https://yandaoguoxue.yandao.vip"
CODE=$(curl -s -o /dev/null -w '%{http_code}' -I ${DOMAIN}/app-download/${NEW_APK_NAME})
echo "新 APK 直链: ${CODE}"
[ "$CODE" != "200" ] && { echo "FATAL: 新 APK 直链非200"; exit 1; }
CT=$(curl -sI ${DOMAIN}/app-download/${NEW_APK_NAME} | grep -i 'content-type' | tr -d '\r')
echo "MIME: ${CT}"
echo "$CT" | grep -q 'application/vnd.android.package-archive' || { echo "FATAL: APK MIME错误"; exit 1; }
ALIAS=$(curl -s -o /dev/null -w '%{http_code}' -I ${DOMAIN}/app-download/guoxue-chuancheng-v1.0-release.apk)
echo "别名直链: ${ALIAS}"
[ "$ALIAS" != "200" ] && { echo "FATAL: 别名直链非200"; exit 1; }

echo "===== APK v25.0.49 BUILD COMPLETE ====="
echo "NOTE: 旧 v25.0.48 APK 保留在分发目录作回滚备份（不再被前端引用）"
