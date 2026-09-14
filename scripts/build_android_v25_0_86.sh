#!/bin/bash
# v25.0.86 安卓构建 + COS 分发 + CDN 刷新 + 公网验证
# 统一下载地址: https://www.yandao.vip/app-download/latest.apk
#
# ===================== 永久固定规则（禁止违反） =====================
# 【历史二维码兼容性保障】
# 1. 历史发出去的二维码（印刷物料/分享图/公众号文章）永远不能失效：
#    - 每次发新版，必须同步更新所有别名对象：latest.apk + guoxue-chuancheng.apk + 版本命名APK
#    - 禁止删除/改名任何历史APK对象（guoxue-release-v*.apk、guoxue/guoxue.apk 等），
#      旧二维码扫出来必须能下载（下载旧版后App内会提示升级到最新）
# 2. 下载目录页 https://www.yandao.vip/app-download/ 必须可访问（index.html，禁止404）
# 3. 所有域名入口（www主域 / App子域 yandaoguoxue / 根路径 /latest.apk）必须经301收敛到主域统一地址
# 4. 每次构建分发的公网验证必须包含"历史入口回归检查"（本脚本[10.5]步），
#    任何一个历史URL非200即构建失败
# ====================================================================
set -e
SRC_DIR="/root/yandaoguoxue-source"
RELEASE_DIR="/root/yandaoguoxue/releases/v25.0.86"
ASSETS_PUBLIC="$SRC_DIR/android/app/src/main/assets/public"
APK_OUT="$SRC_DIR/android/app/build/outputs/apk/release/app-release.apk"
DIST_DIR="/var/www/yandao.vip/app-download"
NEW_APK_NAME="yandao-guoxue-v25.0.86-release.apk"
UNIFIED_URL="https://www.yandao.vip/app-download/latest.apk"

cd "$SRC_DIR"

# COS 凭证（与 /root/upload_apk.js 同源）
SID=$(grep -oP "SECRET_ID = '\K[^']+" /root/upload_apk.js)
SKEY=$(grep -oP "SECRET_KEY = '\K[^']+" /root/upload_apk.js)
export TENCENT_SES_SECRET_ID="$SID"
export TENCENT_SES_SECRET_KEY="$SKEY"

cos_put() { # 本地文件 对象Key ContentType
  node /root/cos_put.js yandao-guoxue-1300262413 ap-beijing "$1" "$2" "$3" "public, max-age=3600"
}

echo "--- [0] 前置校验 ---"
test -f "$RELEASE_DIR/index.html" || { echo "FATAL: releases/v25.0.86 不存在"; exit 1; }
node -e "const v=require('$RELEASE_DIR/version.json');if(!v.version.includes('v25.0.86'))process.exit(1)" || { echo "FATAL: releases 非 v25.0.86"; exit 1; }
grep -q 'versionCode 2073' android/app/build.gradle || { echo "FATAL: versionCode 非 2073"; exit 1; }
grep -q 'versionName "25.0.86"' android/app/build.gradle || { echo "FATAL: versionName 非 25.0.86"; exit 1; }
echo "前置校验 OK（资源 v25.0.86 / versionCode 2073）"

echo "--- [0.5] 内容门禁（资源侧）---"
fail=0
for kw in "七政四余" "协纪辨方" "手机号码解析" "车牌号民俗解读" "仅用于国学、历法学术研究"; do
  n=$(grep -rl "$kw" "$RELEASE_DIR/_next/static/chunks/" 2>/dev/null | wc -l)
  echo "  $kw: $n chunks"; [ "$n" -ge 1 ] || fail=1
done
n=$(grep -rl "手机号吉凶\|车牌号吉凶" "$RELEASE_DIR/_next/static/chunks/" 2>/dev/null | wc -l)
echo "  旧吉凶文案(应0): $n chunks"; [ "$n" = "0" ] || fail=1
[ "$fail" = "0" ] || { echo "FATAL: 内容门禁未通过"; exit 1; }

echo "--- [1] 同步 v25.0.86 web 资源到 android assets ---"
rm -rf "$ASSETS_PUBLIC"
mkdir -p "$ASSETS_PUBLIC"
cp -r "$RELEASE_DIR"/* "$ASSETS_PUBLIC/"
echo "assets files: $(find "$ASSETS_PUBLIC" -type f | wc -l)"

echo "--- [2] 写入 app-native.json ---"
BUILT_AT=$(date +%Y-%m-%dT%H:%M:%S+08:00)
cat > "$ASSETS_PUBLIC/app-native.json" <<EON
{
  "versionName": "25.0.86",
  "versionCode": 2073,
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
unzip -o -q "$APK_OUT" "assets/public/app-native.json" 2>/dev/null
grep -q '"versionCode": 2073' assets/public/app-native.json || { echo "FATAL: 内置版本号错误"; exit 1; }
echo "app-native.json 2073 OK"
unzip -o -q "$APK_OUT" "assets/public/_next/static/chunks/*" 2>/dev/null
for kw in "七政四余" "协纪辨方" "手机号码解析" "车牌号民俗解读" "仅用于国学、历法学术研究"; do
  n=$(grep -rl "$kw" assets/public/_next/static/chunks/ 2>/dev/null | wc -l)
  echo "  $kw: ${n} chunks"; [ "$n" -ge 1 ] || { echo "FATAL: 特征缺失 $kw"; exit 1; }
done
n=$(grep -rl "手机号吉凶\|车牌号吉凶" assets/public/_next/static/chunks/ 2>/dev/null | wc -l)
echo "  旧吉凶文案(应0): ${n} chunks"; [ "$n" = "0" ] || { echo "FATAL: 旧文案残留"; exit 1; }

echo "--- [5] 本地分发（三同名 + MD5 一致性）---"
cd "$SRC_DIR"
cp -f "$APK_OUT" "$DIST_DIR/$NEW_APK_NAME"
cp -f "$APK_OUT" "$DIST_DIR/guoxue-chuancheng.apk"
cp -f "$APK_OUT" "$DIST_DIR/latest.apk"
MD5_1=$(md5sum "$DIST_DIR/$NEW_APK_NAME" | cut -d' ' -f1)
MD5_2=$(md5sum "$DIST_DIR/guoxue-chuancheng.apk" | cut -d' ' -f1)
MD5_3=$(md5sum "$DIST_DIR/latest.apk" | cut -d' ' -f1)
echo "MD5: $MD5_1 / $MD5_2 / $MD5_3"
[ "$MD5_1" = "$MD5_2" ] && [ "$MD5_2" = "$MD5_3" ] || { echo "FATAL: MD5 不一致"; exit 1; }

echo "--- [6] 生成下载目录页 index.html（修复目录 404）---"
cat > "$DIST_DIR/index.html" <<EOH
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>言道国学 App 下载（Android v25.0.86）</title>
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
  <p class="ver">Android 版 v25.0.86（2073）</p>
  <p class="tip">正在为您开始下载，请稍候…</p>
  <a class="btn" href="latest.apk">立即下载安装包</a>
  <p class="small">如未自动开始下载，请点击上方按钮<br>安装时请在系统设置中允许"未知来源应用"权限</p>
</div>
</body>
</html>
EOH
echo "index.html 生成 OK"

echo "--- [7] COS 上传（北京桶 app-download/）---"
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

echo "--- [9] 升级配置（统一主域下载地址）---"
cat > /www/yandaoguoxue-backend/data/app-release-config.json <<EOCFG
{
  "latestVersion": "25.0.86",
  "latestVersionCode": 2073,
  "downloadUrl": "${UNIFIED_URL}",
  "downloadPage": "https://yandaoguoxue.yandao.vip/friend",
  "releaseNotes": [
    "七政四余学习专区：15个学习专题全新上线",
    "新增38页学习内容页面，覆盖更多国学知识点",
    "优化页面信息展示与常见问题内容区块",
    "修复已知问题，提升稳定性"
  ],
  "forceUpdate": false,
  "publishedAt": "${BUILT_AT}"
}
EOCFG
grep -q '"latestVersionCode": 2073' /www/yandaoguoxue-backend/data/app-release-config.json || { echo "FATAL: 升级配置未写入"; exit 1; }

echo "--- [10] 公网验证 ---"
for i in $(seq 1 6); do
  API=$(curl -s -m 15 "https://yandaoguoxue.yandao.vip/api/public/app-version")
  echo "$API" | grep -q '"latestVersionCode":2073' && { echo "版本接口 2073 OK"; break; }
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
cd /tmp && rm -f latest_verify.apk
curl -s -m 300 -o latest_verify.apk "$UNIFIED_URL"
MD5_R=$(md5sum latest_verify.apk | cut -d' ' -f1)
[ "$MD5_R" = "$MD5_1" ] && echo "线上 MD5 一致 OK ($MD5_R)" || { echo "FATAL: 线上 MD5 不一致: $MD5_R vs $MD5_1"; exit 1; }

echo "--- 入口链路验证 ---"
c1=$(curl -s -o /dev/null -w "%{http_code}" -m 20 "https://www.yandao.vip/app-download/guoxue-chuancheng.apk")
echo "guoxue-chuancheng.apk: $c1"
[ "$c1" = "200" ] || { echo "FATAL: chuancheng 不可用"; exit 1; }
c2=$(curl -s -o /dev/null -w "%{http_code}" -L -m 60 "https://yandaoguoxue.yandao.vip/app-download/latest.apk")
echo "App子域跟随重定向: $c2"
[ "$c2" = "200" ] || { echo "FATAL: App子域链路不可用"; exit 1; }

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

echo ""
echo "=== APK v25.0.86 构建分发完成 ==="
echo "统一下载地址: $UNIFIED_URL"
echo "目录页: https://www.yandao.vip/app-download/"
echo "版本命名: https://www.yandao.vip/app-download/$NEW_APK_NAME"
echo "MD5: $MD5_1  大小: $APK_SIZE bytes"
