#!/bin/bash
# v25.0.88 谷歌Play标准版：APK(通用渠道) + AAB(Google Play) 一体构建 + 分发 + 升级配置
# 沿用 v25.0.87 build_v25_0_87_all.sh 既有流程
# web 资源 = releases/v25.0.91（已公网部署），APK/AAB versionName 25.0.88 / versionCode 2078
set -e
SRC_DIR="/root/yandaoguoxue-source"
RELEASE_DIR="/root/yandaoguoxue/releases/v25.0.91"
ASSETS_PUBLIC="$SRC_DIR/android/app/src/main/assets/public"
APK_OUT="$SRC_DIR/android/app/build/outputs/apk/release/app-release.apk"
AAB_OUT="$SRC_DIR/android/app/build/outputs/bundle/release/app-release.aab"
MAPPING_OUT="$SRC_DIR/android/app/build/outputs/mapping/release/mapping.txt"
DIST_DIR="/var/www/yandao.vip/app-download"
NEW_APK_NAME="yandao-guoxue-v25.0.88-release.apk"
OLD_VER_APK="$DIST_DIR/yandao-guoxue-v25.0.87-release.apk"
UNIFIED_URL="https://www.yandao.vip/app-download/latest.apk"
LOG_FILE="/root/build_log_v25_0_88.txt"
AAPT="/opt/android-sdk/build-tools/36.0.0/aapt"
APKSIGNER="/opt/android-sdk/build-tools/36.0.0/apksigner"

exec > >(tee -a "$LOG_FILE") 2>&1
echo "=== v25.0.88(2078) 谷歌Play标准版构建开始: $(date '+%F %T') ==="

echo "--- [0] 前置校验 ---"
test -f "$RELEASE_DIR/index.html" || { echo "FATAL: releases/v25.0.91 不存在"; exit 1; }
node -e "const v=require('$RELEASE_DIR/version.json');if(!v.version.includes('v25.0.91'))process.exit(1)" || { echo "FATAL: releases 非 v25.0.91"; exit 1; }
grep -q 'versionCode 2078' "$SRC_DIR/android/app/build.gradle" || { echo "FATAL: versionCode 非 2078"; exit 1; }
grep -q 'versionName "25.0.88"' "$SRC_DIR/android/app/build.gradle" || { echo "FATAL: versionName 非 25.0.88"; exit 1; }
grep -q 'compileSdkVersion = 36' "$SRC_DIR/android/variables.gradle" || { echo "FATAL: compileSdk 非 36"; exit 1; }
grep -q 'targetSdkVersion = 36' "$SRC_DIR/android/variables.gradle" || { echo "FATAL: targetSdk 非 36"; exit 1; }
grep -q 'minifyEnabled true' "$SRC_DIR/android/app/build.gradle" || { echo "FATAL: R8 未开启"; exit 1; }
grep -q 'applicationId "com.yandao.guoxue"' "$SRC_DIR/android/app/build.gradle" || { echo "FATAL: 包名非 com.yandao.guoxue"; exit 1; }
test -f "$SRC_DIR/android/app/src/main/assets/adi-registration.properties" || { echo "FATAL: 谷歌所有权文件缺失"; exit 1; }
grep -q 'DDSZ65SKDLAWMAAAAAAAAAAAAA' "$SRC_DIR/android/app/src/main/assets/adi-registration.properties" || { echo "FATAL: 谷歌所有权注册码不符"; exit 1; }
test -f /root/yandao-release.keystore || { echo "FATAL: keystore 不存在"; exit 1; }
echo "前置校验 OK（资源 v25.0.91 / versionCode 2078 / versionName 25.0.88 / SDK36 / R8 / 包名 / 所有权文件 / 正式签名）"

echo "--- [0.5] 内容门禁（v25.0.87 保留项 + v25.0.88 新功能标记 + 无微信登录残留）---"
fail=0
for kw in "立即注册" "应用权限说明" "游客模式" "排盘记录" "命主档案库"; do
  n=$(grep -rl "$kw" "$RELEASE_DIR/_next/static/chunks/" "$RELEASE_DIR/login/index.html" "$RELEASE_DIR/privacy/index.html" 2>/dev/null | wc -l)
  echo "  $kw: ${n} 文件命中"; [ "$n" -ge 1 ] || fail=1
done
n=$(grep -rl "loginWithWechat\|wxLogin\|WeChatLogin" "$RELEASE_DIR/_next/static/chunks/" 2>/dev/null | wc -l)
echo "  微信登录函数残留(应0): ${n}"; [ "$n" = "0" ] || fail=1
n=$(grep '<uses-permission' "$SRC_DIR/android/app/src/main/AndroidManifest.xml" | grep -c "READ_MEDIA_IMAGES\|READ_EXTERNAL_STORAGE" || true)
echo "  敏感权限残留(应0): ${n}"; [ "$n" = "0" ] || fail=1
[ "$fail" = "0" ] || { echo "FATAL: 内容门禁未通过"; exit 1; }
echo "内容门禁 OK"

echo "--- [1] 同步 web 资源到 android assets（等价 npx cap sync android）---"
rm -rf "$ASSETS_PUBLIC"
mkdir -p "$ASSETS_PUBLIC"
cp -r "$RELEASE_DIR"/* "$ASSETS_PUBLIC/"
echo "assets files: $(find "$ASSETS_PUBLIC" -type f | wc -l)"

echo "--- [2] 写入 app-native.json ---"
BUILT_AT=$(date +%Y-%m-%dT%H:%M:%S+08:00)
cat > "$ASSETS_PUBLIC/app-native.json" <<EON
{
  "versionName": "25.0.88",
  "versionCode": 2078,
  "platform": "android",
  "builtAt": "${BUILT_AT}"
}
EON
cat "$ASSETS_PUBLIC/app-native.json"

echo "--- [3] Gradle 构建（assembleRelease + bundleRelease 一体，R8）---"
cd "$SRC_DIR/android"
export ANDROID_HOME=/opt/android-sdk
/opt/gradle-8.9/bin/gradle assembleRelease bundleRelease --no-daemon 2>&1 | tail -30
GRADLE_EXIT=${PIPESTATUS[0]}
[ "$GRADLE_EXIT" = "0" ] || { echo "FATAL: gradle 失败 (exit=$GRADLE_EXIT)"; exit 1; }
test -f "$APK_OUT" || { echo "FATAL: APK 未生成"; exit 1; }
test -f "$AAB_OUT" || { echo "FATAL: AAB 未生成"; exit 1; }
test -f "$MAPPING_OUT" || { echo "FATAL: mapping.txt 未生成"; exit 1; }
APK_SIZE=$(stat -c %s "$APK_OUT")
AAB_SIZE=$(stat -c %s "$AAB_OUT")
echo "APK 大小: $APK_SIZE bytes; AAB 大小: $AAB_SIZE bytes"
[ "$APK_SIZE" -gt 5000000 ] || { echo "FATAL: APK 体积异常"; exit 1; }
[ "$AAB_SIZE" -gt 3000000 ] || { echo "FATAL: AAB 体积异常"; exit 1; }

echo "--- [4] APK 版本/权限/签名验证（零成本自检）---"
"$AAPT" dump badging "$APK_OUT" | grep -E "^package|sdkVersion|targetSdkVersion" | head -4
"$AAPT" dump permissions "$APK_OUT"
BADGING=$("$AAPT" dump badging "$APK_OUT" | grep "^package")
echo "$BADGING" | grep -q "versionCode='2078'" || { echo "FATAL: APK versionCode 非 2078"; exit 1; }
echo "$BADGING" | grep -q "versionName='25.0.88'" || { echo "FATAL: APK versionName 非 25.0.88"; exit 1; }
echo "$BADGING" | grep -q "name='com.yandao.guoxue'" || { echo "FATAL: 包名不符"; exit 1; }
# DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION 是 AndroidX 在 targetSdk33+ 自动注入的应用自声明普通权限，非危险权限，不计入
PERMS=$("$AAPT" dump permissions "$APK_OUT" | grep "uses-permission" | grep -v "DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION" | wc -l)
[ "$PERMS" = "3" ] || { echo "FATAL: APK 权限数量异常($PERMS，应恰好3项)"; exit 1; }
"$AAPT" dump permissions "$APK_OUT" | grep -q "android.permission.INTERNET" || { echo "FATAL: 缺 INTERNET"; exit 1; }
"$AAPT" dump permissions "$APK_OUT" | grep -q "android.permission.ACCESS_NETWORK_STATE" || { echo "FATAL: 缺 ACCESS_NETWORK_STATE"; exit 1; }
if "$AAPT" dump permissions "$APK_OUT" | grep -q "android.permission.CAMERA\|READ_MEDIA_IMAGES\|READ_EXTERNAL_STORAGE"; then
  echo "FATAL: 存在应删权限(CAMERA/READ_MEDIA_IMAGES/READ_EXTERNAL_STORAGE)"; exit 1
fi
echo "APK 权限仅 INTERNET/ACCESS_NETWORK_STATE/WRITE_EXTERNAL_STORAGE(maxSdk28) OK"

echo "--- [4b] 签名一致性（对比已发布 v25.0.87 正式版证书）---"
NEW_CERT=$("$APKSIGNER" verify --print-certs "$APK_OUT" 2>/dev/null | grep -o 'SHA-256 digest: [a-f0-9]*' | head -1)
echo "新 APK 证书: $NEW_CERT"
if [ -f "$OLD_VER_APK" ]; then
  OLD_CERT=$("$APKSIGNER" verify --print-certs "$OLD_VER_APK" 2>/dev/null | grep -o 'SHA-256 digest: [a-f0-9]*' | head -1)
  echo "v25.0.87 证书: $OLD_CERT"
  [ "$NEW_CERT" = "$OLD_CERT" ] && [ -n "$NEW_CERT" ] || { echo "FATAL: 签名与历史不一致"; exit 1; }
  echo "签名与历史版本一致 OK"
else
  echo "WARN: 未找到 v25.0.87 版本化 APK，改用 keystore 比对"
  KS_SHA256=$(keytool -list -v -keystore /root/yandao-release.keystore -storepass yandao2024 2>/dev/null | grep 'SHA256:' | head -1 | tr -d ' ')
  echo "keystore 证书: $KS_SHA256"
fi

echo "--- [4c] AAB 内置版本与 R8 keep 校验 ---"
cd /tmp && rm -rf aab_verify_88 && mkdir aab_verify_88 && cd aab_verify_88
unzip -o -q "$AAB_OUT" "base/assets/public/app-native.json" || { echo "FATAL: 无法解包 AAB"; exit 1; }
grep -q '"versionCode": 2078' base/assets/public/app-native.json || { echo "FATAL: AAB 内置 versionCode 非 2078"; exit 1; }
grep -q '"versionName": "25.0.88"' base/assets/public/app-native.json || { echo "FATAL: AAB 内置 versionName 非 25.0.88"; exit 1; }
echo "AAB 内置版本 25.0.88 / 2078 OK"
unzip -o -q "$AAB_OUT" "base/assets/public/_next/static/chunks/*" 2>/dev/null || true
for kw in "立即注册" "应用权限说明" "排盘记录" "命主档案库"; do
  n=$(grep -rl "$kw" base/assets/public/_next/static/chunks/ 2>/dev/null | wc -l)
  echo "  AAB内 $kw: ${n} chunks"; [ "$n" -ge 1 ] || { echo "FATAL: AAB 特征缺失 $kw"; exit 1; }
done
n=$(grep -rl "loginWithWechat\|wxLogin" base/assets/public/_next/static/chunks/ 2>/dev/null | wc -l)
echo "  AAB内 微信登录残留(应0): ${n}"; [ "$n" = "0" ] || { echo "FATAL: AAB 微信残留"; exit 1; }
if grep -q '^com.capacitorjs.plugins.share.SharePlugin -> com.capacitorjs.plugins.share.SharePlugin:' "$MAPPING_OUT" && grep -q 'void share(com.getcapacitor.PluginCall)' "$MAPPING_OUT"; then
  echo "R8 KEEP_OK: SharePlugin 类及 share/canShare 方法保持原名（JS桥接正常）"
else
  echo "FATAL: SharePlugin 被混淆改名"; exit 1
fi
if grep -q '^com.yandao.guoxue.plugins.PaipanStorePlugin -> com.yandao.guoxue.plugins.PaipanStorePlugin:' "$MAPPING_OUT"; then
  echo "R8 KEEP_OK: PaipanStorePlugin 保持原名（SQLite排盘存储JS桥接正常）"
else
  echo "FATAL: PaipanStorePlugin 被混淆改名"; exit 1
fi
unzip -o -q "$AAB_OUT" "base/assets/native-plugins/capacitor.plugins.json" 2>/dev/null && echo "插件注册: $(cat base/assets/native-plugins/capacitor.plugins.json)" || echo "(无插件注册文件)"
cd "$SRC_DIR"

echo "--- [5] 本地分发（三同名 + MD5 一致性）---"
cp -f "$APK_OUT" "$DIST_DIR/$NEW_APK_NAME"
cp -f "$APK_OUT" "$DIST_DIR/guoxue-chuancheng.apk"
cp -f "$APK_OUT" "$DIST_DIR/latest.apk"
MD5_1=$(md5sum "$DIST_DIR/$NEW_APK_NAME" | cut -d' ' -f1)
MD5_2=$(md5sum "$DIST_DIR/guoxue-chuancheng.apk" | cut -d' ' -f1)
MD5_3=$(md5sum "$DIST_DIR/latest.apk" | cut -d' ' -f1)
echo "MD5: $MD5_1 / $MD5_2 / $MD5_3"
[ "$MD5_1" = "$MD5_2" ] && [ "$MD5_2" = "$MD5_3" ] || { echo "FATAL: MD5 不一致"; exit 1; }

echo "--- [6] 生成下载目录页 index.html ---"
cat > "$DIST_DIR/index.html" <<EOH
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>言道国学 App 下载（Android v25.0.88）</title>
<meta http-equiv="refresh" content="2; url=latest.apk">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;background:linear-gradient(160deg,#1a2233 0%,#232f4a 100%);min-height:100vh;display:flex;align-items:center;justify-content:center;color:#e8ecf4}
.card{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:48px 40px;text-align:center;max-width:400px;margin:24px;box-shadow:0 20px 60px rgba(0,0,0,0.3)}
.logo{width:84px;height:84px;border-radius:22px;background:linear-gradient(135deg,#f59f00,#fcc419);color:#1a2233;font-size:44px;font-weight:800;line-height:84px;margin:0 auto 20px}
h1{font-size:24px;margin-bottom:10px}
.ver{font-size:14px;color:#9fb0c9;margin-bottom:26px}
.btn{display:inline-block;background:linear-gradient(135deg,#4dabf7,#748ffc);color:#fff;text-decoration:none;font-size:17px;font-weight:600;padding:14px 44px;border-radius:12px;margin-bottom:22px;transition:transform .15s}
.btn:hover{transform:translateY(-2px)}
.tip{font-size:15px;color:#c8d6e5;margin-bottom:8px}
.small{font-size:12.5px;color:#8a9ab3;line-height:1.8}
</style>
</head>
<body>
<div class="card">
  <div class="logo">言</div>
  <h1>言道国学</h1>
  <p class="ver">Android 版 v25.0.88（2078）</p>
  <p class="tip">正在为您开始下载，请稍候…</p>
  <a class="btn" href="latest.apk">立即下载安装包</a>
  <p class="small">如未自动开始下载，请点击上方按钮<br>安装时请在系统设置中允许"未知来源应用"权限</p>
</div>
</body>
</html>
EOH
echo "index.html 生成 OK（v25.0.88）"

echo "--- [7] COS 上传（北京桶 app-download/）---"
SID=$(grep -oP "SECRET_ID = '\K[^']+" /root/upload_apk.js)
SKEY=$(grep -oP "SECRET_KEY = '\K[^']+" /root/upload_apk.js)
export TENCENT_SES_SECRET_ID="$SID"
export TENCENT_SES_SECRET_KEY="$SKEY"
cos_put() { node /root/cos_put.js yandao-guoxue-1300262413 ap-beijing "$1" "$2" "$3" "public, max-age=3600"; }
cos_put "$DIST_DIR/latest.apk"              "app-download/latest.apk"              "application/vnd.android.package-archive"
cos_put "$DIST_DIR/$NEW_APK_NAME"           "app-download/$NEW_APK_NAME"           "application/vnd.android.package-archive"
cos_put "$DIST_DIR/guoxue-chuancheng.apk"   "app-download/guoxue-chuancheng.apk"   "application/vnd.android.package-archive"
cos_put "$DIST_DIR/index.html"              "app-download/index.html"              "text/html; charset=utf-8"

echo "--- [8] CDN 缓存刷新 ---"
node /root/cdn_purge.js \
  "https://www.yandao.vip/app-download/" \
  "https://www.yandao.vip/app-download/latest.apk" \
  "https://www.yandao.vip/app-download/$NEW_APK_NAME" \
  "https://www.yandao.vip/app-download/guoxue-chuancheng.apk" \
  "https://www.yandao.vip/app-download/index.html"

echo "--- [9] 升级配置 app-release-config.json（25.0.88 / 2078）---"
cat > /www/yandaoguoxue-backend/data/app-release-config.json <<EOCFG
{
  "latestVersion": "25.0.88",
  "latestVersionCode": 2078,
  "downloadUrl": "${UNIFIED_URL}",
  "downloadPage": "https://yandaoguoxue.yandao.vip/friend",
  "releaseNotes": [
    "排盘记录升级：全部工具排盘参数与结果自动保存本机，永久不丢",
    "新增命主档案库：一次录入命主信息，全工具共享一键导入",
    "历史记录支持查看、恢复与删除，跨工具管理更方便",
    "离线可用边界明确：排盘计算与古籍经典断网可用，AI解读需联网",
    "移除登录页冗余下载入口，界面更简洁",
    "谷歌Play标准合规：移除敏感权限，隐私更安全"
  ],
  "forceUpdate": false,
  "publishedAt": "${BUILT_AT}"
}
EOCFG
grep -q '"latestVersionCode": 2078' /www/yandaoguoxue-backend/data/app-release-config.json || { echo "FATAL: 升级配置未写入"; exit 1; }
echo "升级配置写入 OK"

echo "--- [10] 公网验证 ---"
for i in $(seq 1 6); do
  API=$(curl -s -m 15 "https://yandaoguoxue.yandao.vip/api/public/app-version")
  echo "$API" | grep -q '"latestVersionCode":2078' && { echo "版本接口 2078 OK"; break; }
  [ "$i" = "6" ] && { echo "FATAL: 版本接口未更新: $API"; exit 1; }
  sleep 3
done

echo "--- 目录页与 APK 生效轮询（CDN 刷新传播，最长120秒）---"
ok_dir=0; ok_apk=0
for i in $(seq 1 24); do
  if [ "$ok_dir" = "0" ]; then
    sc=$(curl -s -o /dev/null -w "%{http_code}" -m 20 "https://www.yandao.vip/app-download/")
    [ "$sc" = "200" ] && ok_dir=1 && echo "[poll $i] 目录页 200 OK"
  fi
  if [ "$ok_apk" = "0" ]; then
    rs=$(curl -s -o /dev/null -w "%{size_download}" -m 120 -r 0-1023 "https://www.yandao.vip/app-download/latest.apk")
    if [ "$rs" -gt 0 ]; then
      full=$(curl -s -o /dev/null -w "%{size_download}" -m 180 "$UNIFIED_URL")
      [ "$full" = "$APK_SIZE" ] && ok_apk=1 && echo "[poll $i] 线上 APK 大小一致 OK ($full bytes)"
    fi
  fi
  [ "$ok_dir" = "1" ] && [ "$ok_apk" = "1" ] && break
  sleep 5
done
[ "$ok_dir" = "1" ] || { echo "FATAL: 目录页未生效"; exit 1; }
[ "$ok_apk" = "1" ] || { echo "FATAL: 线上 APK 未更新（CDN可能仍在刷新）"; exit 1; }

echo "--- 线上 MD5 校验 ---"
cd /tmp && rm -f latest_verify_88.apk
curl -s -m 300 -o latest_verify_88.apk "$UNIFIED_URL"
MD5_R=$(md5sum latest_verify_88.apk | cut -d' ' -f1)
[ "$MD5_R" = "$MD5_1" ] && echo "线上 MD5 一致 OK ($MD5_R)" || { echo "FATAL: 线上 MD5 不一致: $MD5_R vs $MD5_1"; exit 1; }

echo "--- [10.5] 历史入口回归检查（二维码永不失效）---"
LEGACY_FAIL=0
LEGACY_URLS=(
  "https://www.yandao.vip/app-download/latest.apk"
  "https://www.yandao.vip/app-download/guoxue-chuancheng.apk"
  "https://www.yandao.vip/app-download/guoxue-chuancheng-v1.0-release.apk"
  "https://www.yandao.vip/app-download/guoxue-release.apk"
  "https://www.yandao.vip/app-download/guoxue-release-v2.apk"
  "https://www.yandao.vip/app-download/guoxue-release-v3.apk"
  "https://www.yandao.vip/app-download/guoxue-release-v4.apk"
  "https://www.yandao.vip/app-download/guoxue-release-v5.apk"
  "https://www.yandao.vip/app-download/guoxue/guoxue-chuancheng-v1.0.apk"
  "https://www.yandao.vip/app-download/guoxue/guoxue-chuancheng-v2.0.apk"
  "https://www.yandao.vip/app-download/guoxue/guoxue.apk"
  "https://www.yandao.vip/app-download/yandao-guoxue-v25.0.86-release.apk"
  "https://www.yandao.vip/app-download/yandao-guoxue-v25.0.87-release.apk"
  "https://www.yandao.vip/app-download/$NEW_APK_NAME"
  "https://www.yandao.vip/latest.apk"
  "https://yandaoguoxue.yandao.vip/app-download/latest.apk"
  "https://yandaoguoxue.yandao.vip/app-download/guoxue-chuancheng.apk"
  "https://www.yandao.vip/app-download/"
)
for lu in "${LEGACY_URLS[@]}"; do
  lc=$(curl -s -o /dev/null -w "%{http_code}" -L -m 60 "$lu")
  echo "  $lc  $lu"
  [ "$lc" = "200" ] || LEGACY_FAIL=1
done
[ "$LEGACY_FAIL" = "0" ] || { echo "FATAL: 存在失效的历史下载入口（二维码兼容性破坏）"; exit 1; }
echo "历史入口全部 200 OK（旧二维码全部有效）"

echo "--- [11] 产物落位（服务器中转目录）---"
cp -f "$APK_OUT" /root/yandaoguoxue_v25.0.88_general.apk
cp -f "$AAB_OUT" /root/yandaoguoxue_v25.0.88_google_release.aab
cp -f "$MAPPING_OUT" /root/mapping_v25.0.88.txt
echo "AAB: $(stat -c %s /root/yandaoguoxue_v25.0.88_google_release.aab) bytes  MD5: $(md5sum /root/yandaoguoxue_v25.0.88_google_release.aab | cut -d' ' -f1)"
echo "APK: $(stat -c %s /root/yandaoguoxue_v25.0.88_general.apk) bytes  MD5: $(md5sum /root/yandaoguoxue_v25.0.88_general.apk | cut -d' ' -f1)"
echo "MAP: $(stat -c %s /root/mapping_v25.0.88.txt) bytes"

echo "=== v25.0.88(2078) 谷歌Play标准版构建分发完成: $(date '+%F %T') ==="
