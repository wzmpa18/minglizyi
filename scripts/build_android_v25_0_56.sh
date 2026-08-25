#!/bin/bash
# ============================================================================
# v25.0.56 APK 构建：FIX-V31 会员显示+AI权限同步
#   ① setLoginState 自动同步 yandao_membership_status（解决后台改会员等级后 AI 不可用）
#   ② 后端统一返回 memberLevel=premium + memberTier=具体档位（兼容旧 APK + 新前端）
#   ③ profile 页面显示具体档位（月度/季度/年度/终身）而非笼统的「高级会员」
#   ④ 用户管理页新增会员等级列、admin 导航新增合伙人渠道入口
#   保留 v25.0.55 全部功能：DownloadListener、intent:// 下载、侧滑返回、合伙人渠道
#   前置：已执行 bash build.sh（out/ 为 v25.0.47_32 构建产物）
# ============================================================================
set -e
SRC_DIR="/root/yandaoguoxue-source"
ASSETS_PUBLIC="$SRC_DIR/android/app/src/main/assets/public"
APK_OUT="$SRC_DIR/android/app/build/outputs/apk/release/app-release.apk"
DIST_DIR="/var/www/yandao.vip/app-download"
NEW_APK_NAME="yandao-guoxue-v25.0.56-release.apk"

cd "$SRC_DIR"

echo "--- [0] 前置校验 ---"
test -f out/index.html || { echo "FATAL: out/ 不存在，请先执行 bash build.sh"; exit 1; }
node -e "const v=require('./out/version.json');if(!v.buildId.includes('v25.0.47_32'))process.exit(1)" || { echo "FATAL: out/ 非 v25.0.47_32"; exit 1; }
grep -q 'versionCode 2056' android/app/build.gradle || { echo "FATAL: build.gradle versionCode 非 2056"; exit 1; }
grep -q 'versionName "25.0.56"' android/app/build.gradle || { echo "FATAL: build.gradle versionName 非 25.0.56"; exit 1; }
grep -q 'setDownloadListener' android/app/src/main/java/com/yandao/guoxue/MainActivity.java || { echo "FATAL: MainActivity 缺 DownloadListener"; exit 1; }

echo "--- [1] 同步 web 资源到 android assets ---"
rm -rf "$ASSETS_PUBLIC"
mkdir -p "$ASSETS_PUBLIC"
cp -r out/* "$ASSETS_PUBLIC/"

echo "--- [2] 写入 app-native.json ---"
BUILT_AT=$(date +%Y-%m-%dT%H:%M:%S+08:00)
cat > "$ASSETS_PUBLIC/app-native.json" <<EON
{
  "versionName": "25.0.56",
  "versionCode": 2056,
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
grep -q '"versionCode": 2056' assets/public/app-native.json || { echo "FATAL: 内置版本号错误"; exit 1; }
echo "--- 内置 version.json ---"
cat assets/public/version.json
grep -q "v25.0.47_32" assets/public/version.json || { echo "FATAL: 内置 web 资源版本错误"; exit 1; }
echo "--- DownloadListener 编译验证（dex 内符号检索） ---"
DL_HITS=$(cat classes*.dex 2>/dev/null | grep -a -c "setDownloadListener" || true)
echo "setDownloadListener 符号命中: ${DL_HITS}"
[ "${DL_HITS}" -ge 1 ] || { echo "FATAL: DownloadListener 未编译入 APK"; exit 1; }
echo "--- 内置关键代码检查 ---"
unzip -o -q "$APK_OUT" "assets/public/_next/static/chunks/*" 2>/dev/null
for kw in "yandao_membership_status" "memberTier" "月度会员" "复制下载链接" "latest.apk"; do
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

echo "--- [6] 升级配置写入 2056 ---"
cat > /www/yandaoguoxue-backend/data/app-release-config.json <<EOCFG
{
  "latestVersion": "25.0.56",
  "latestVersionCode": 2056,
  "downloadUrl": "https://yandaoguoxue.yandao.vip/app-download/latest.apk",
  "downloadPage": "https://yandaoguoxue.yandao.vip/friend",
  "releaseNotes": [
    "修复会员显示：月度/季度/年度/终身会员正确显示，不再显示普通用户",
    "修复AI权限：后台开通会员后登录即生效，AI解读立即可用",
    "保留全部功能：下载更新、合伙人渠道、侧滑返回、离线数据"
  ],
  "forceUpdate": false,
  "publishedAt": "${BUILT_AT}"
}
EOCFG
grep -q '"latestVersionCode": 2056' /www/yandaoguoxue-backend/data/app-release-config.json || { echo "FATAL: 升级配置未写入"; exit 1; }

echo "--- [7] 公网验证 ---"
sleep 2
curl -s -m 15 "https://yandaoguoxue.yandao.vip/api/public/app-version" | grep -q '"latestVersionCode":2056' || { echo "FATAL: 版本接口未更新"; exit 1; }
REMOTE_SIZE=$(curl -s -o /dev/null -w "%{size_download}" -m 60 "https://yandaoguoxue.yandao.vip/app-download/latest.apk")
echo "线上 latest.apk 大小: ${REMOTE_SIZE}"
[ "$REMOTE_SIZE" = "$APK_SIZE" ] || { echo "FATAL: 线上 APK 大小不一致"; exit 1; }

echo "=== APK v25.0.56 构建完成 ==="
