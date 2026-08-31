#!/bin/bash
# ============================================================================
# v25.0.70 APK 构建：小众工具收尾批次（versionCode 2069）
#   背景：Web 已发 v25.0.70（罗盘多门派 Profile/立极尺专业盘/七政三级地点/
#         SEO 五 Cluster），APK 对齐重建，手机端收到 v25.0.70 升级引导。
#   前置：/root/yandaoguoxue/releases/v25.0.70 在产（current 软链指向，
#         由 deploy_v25_0_70.sh 完成）
#   流程：out/ ← releases/v25.0.70（与线上逐字节一致）→ build.gradle 2069/25.0.70
#         → assets/public + app-native.json(2069) → gradle assembleRelease
#         → APK 内容门禁（六新SEO页/罗盘Profile引擎烧录/五工具页/老SEO回归/
#           版本烧录/签名/单一下载源）
#         → 原子替换 latest.apk → app-release-config.json 升 2069
#         → v25.0.70 升级公告 → 公网全链路验证
#   分发纪律（项目方硬性要求）：/var/www/yandao.vip/app-download/ 仅 latest.apk
#         一个 APK 文件，全站所有下载/分享链接唯一指向该目录（D20 防复发门禁）
#   顺序纪律：先换包后升版本号（防升级循环：先升号再换包会让已升级用户拿旧包）
# ============================================================================
set -e

SRC_DIR="/root/yandaoguoxue-source"
RELEASE_DIR="/root/yandaoguoxue/releases/v25.0.70"
ASSETS_PUBLIC="$SRC_DIR/android/app/src/main/assets/public"
APK_OUT="$SRC_DIR/android/app/build/outputs/apk/release/app-release.apk"
DIST_DIR="/var/www/yandao.vip/app-download"
AAPT="/opt/android-sdk/build-tools/34.0.0/aapt"
APKSIGNER="/opt/android-sdk/build-tools/34.0.0/apksigner"
GRADLE_BIN="/opt/gradle-8.9/bin/gradle"
VC=2069
VN="25.0.70"
BASE="https://yandaoguoxue.yandao.vip"

echo "--- [0] 前置校验 ---"
PUBIP=$(curl -s -m 8 ifconfig.me || true)
echo "public ip: ${PUBIP}"
[ "${PUBIP}" = "82.156.228.87" ] || { echo "FATAL: 非唯一生产服务器 82.156.228.87，禁止构建"; exit 1; }
[ -d "$RELEASE_DIR" ] || { echo "FATAL: ${RELEASE_DIR} 不存在"; exit 1; }
grep -q "v25.0.70" "$RELEASE_DIR/version.json" || { echo "FATAL: release 非 v25.0.70"; exit 1; }
[ -x "$GRADLE_BIN" ] && [ -x "$AAPT" ] || { echo "FATAL: 构建工具链缺失"; exit 1; }
df -h / | tail -1

echo "--- [1] 同步线上 v25.0.70 资源到源码 out/（与生产 current 完全一致） ---"
rm -rf "$SRC_DIR/out"
mkdir -p "$SRC_DIR/out"
cp -a "$RELEASE_DIR/." "$SRC_DIR/out/"
test -f "$SRC_DIR/out/index.html" || { echo "FATAL: out/index.html 缺失"; exit 1; }
test -f "$SRC_DIR/out/native-api-patch.js" || { echo "FATAL: native-api-patch.js 缺失"; exit 1; }
grep -q "v25.0.70" "$SRC_DIR/out/version.json" || { echo "FATAL: out/ 版本非 v25.0.70"; exit 1; }

echo "--- [2] build.gradle 版本对齐 ${VC}/${VN}（幂等） ---"
cd "$SRC_DIR"
sed -i "s/versionCode [0-9]\+/versionCode ${VC}/" android/app/build.gradle
sed -i "s/versionName \"[^\"]*\"/versionName \"${VN}\"/" android/app/build.gradle
grep -q "versionCode ${VC}" android/app/build.gradle || { echo "FATAL: versionCode 未对齐"; exit 1; }
grep -q "versionName \"${VN}\"" android/app/build.gradle || { echo "FATAL: versionName 未对齐"; exit 1; }

echo "--- [3] 同步 web 资源到 android assets + 写入 app-native.json ---"
rm -rf "$ASSETS_PUBLIC"
mkdir -p "$ASSETS_PUBLIC"
cp -a "$SRC_DIR/out/." "$ASSETS_PUBLIC/"
BUILT_AT=$(date '+%Y-%m-%dT%H:%M:%S+08:00')
cat > "$ASSETS_PUBLIC/app-native.json" <<EON
{
  "versionName": "${VN}",
  "versionCode": ${VC},
  "platform": "android",
  "builtAt": "${BUILT_AT}"
}
EON
cat "$ASSETS_PUBLIC/app-native.json"

echo "--- [4] Gradle 构建（release 自动签名） ---"
cd "$SRC_DIR/android"
export ANDROID_HOME=/opt/android-sdk
"$GRADLE_BIN" assembleRelease --no-daemon -q 2>&1 | tail -5
test -f "$APK_OUT" || { echo "FATAL: APK 未生成"; exit 1; }
APK_SIZE=$(stat -c %s "$APK_OUT")
echo "APK 大小: ${APK_SIZE} bytes"
[ "$APK_SIZE" -lt 5000000 ] && { echo "FATAL: APK 体积异常（<5MB）"; exit 1; }

echo "--- [5] APK 内容门禁（v25.0.70 小众工具收尾批次） ---"
PKG=$($AAPT dump badging "$APK_OUT" 2>/dev/null | grep "^package:" | head -1)
echo "$PKG"
echo "$PKG" | grep -q "name='com.yandao.guoxue'" || { echo "FATAL: 包名错误"; exit 1; }
echo "$PKG" | grep -q "versionCode='${VC}'" || { echo "FATAL: versionCode 非 ${VC}"; exit 1; }
echo "$PKG" | grep -q "versionName='${VN}'" || { echo "FATAL: versionName 非 ${VN}"; exit 1; }

TMPD=/tmp/apk_verify_v25_0_70
rm -rf "$TMPD"; mkdir -p "$TMPD"; cd "$TMPD"
unzip -o -q "$APK_OUT" \
  "assets/public/app-native.json" "assets/public/version.json" \
  "assets/public/sitemap.xml" "assets/public/robots.txt" \
  "assets/public/native-api-patch.js" \
  "assets/public/yixue/*" \
  "assets/public/tools/*" "assets/public/learn/*" "assets/public/app/*" "assets/public/b/*" \
  "assets/public/index.html" "assets/public/_next/static/chunks/*" 2>/dev/null || true
grep -q "\"versionCode\": ${VC}" assets/public/app-native.json || { echo "FATAL: 内置版本号错误"; exit 1; }
grep -q "v25.0.70" assets/public/version.json || { echo "FATAL: 内置 web 资源版本错误"; exit 1; }
grep -q "<urlset" assets/public/sitemap.xml || { echo "FATAL: 内置 sitemap 缺失"; exit 1; }
grep -q "Sitemap:" assets/public/robots.txt || { echo "FATAL: 内置 robots 缺失"; exit 1; }

# 五工具页内置齐全（含玄空飞星）
TOOL_FILES="yixue/compass/index.html yixue/qizheng/index.html yixue/liji/index.html yixue/luban/index.html yixue/xuankong-feixing/index.html yixue/index.html"
for f in $TOOL_FILES; do
  [ -f "assets/public/$f" ] || { echo "FATAL: APK 缺少工具页 $f"; exit 1; }
done
echo "五工具页（含玄空飞星）+ 易学入口页内置齐全"

# 引擎烧录抽查（字符串字面量）
grep -rq "罗盘门派圈层引擎 v25.0.70" assets/public/_next/static/chunks/ || { echo "FATAL: 罗盘 Profile 引擎缺失"; exit 1; }
grep -rq "WMM2025" assets/public/_next/static/chunks/ || { echo "FATAL: WMM2025 引擎缺失"; exit 1; }
grep -rq "七政四余引擎" assets/public/_next/static/chunks/ || { echo "FATAL: 七政引擎缺失"; exit 1; }
grep -rq "ruler-engine-v1.0.0" assets/public/_next/static/chunks/ || { echo "FATAL: 鲁班尺引擎缺失"; exit 1; }
grep -rq "liji-engine-v1.0.0" assets/public/_next/static/chunks/ || { echo "FATAL: 立极尺引擎缺失"; exit 1; }
grep -rq "穿山七十二龙" assets/public/_next/static/chunks/ || { echo "FATAL: 罗盘圈层数据缺失"; exit 1; }
echo "五引擎烧录 OK（含罗盘 Profile v25.0.70）"

# SEO 24 页回归（18 老 + 6 新）
SEO_FILES="tools/wuguang-paipan.html tools/mianfei-bazi-paipan.html tools/paipan-mianfei.html tools/buyong-huiyuan-paipan.html tools/paipan-nage-haoyong.html tools/youmeiyou-wuguang-paipan.html tools/qizheng-siyu.html tools/luopan.html tools/liji-ruler.html tools/luban-ruler.html tools/xuankong-feixing.html tools/qizheng-siyu-rumen.html tools/luopan-zenme-kan.html tools/liji-ruler-zenme-yong.html tools/xuankong-feixing-rumen.html tools/luban-ruler-zenme-kan.html learn/mianfei-zhongyi-tiku.html learn/mianfei-zhongyi-shuati.html learn/zhongyi-dianji-mianfei.html app/meiyou-guanggao-guoxue.html app/shenme-guoxue-meiguanggao.html app/quangongneng-guoxue.html app/gongneng-quan-guoxue.html b/yixue-zhongyi-fangan.html tools/index.html learn/index.html app/index.html b/index.html"
for f in $SEO_FILES; do
  [ -f "assets/public/$f" ] || { echo "FATAL: APK 缺少 SEO 页 $f"; exit 1; }
done
echo "SEO 28 页（24 落地页 + 4 索引）回归齐全"
grep -q '无广告的排盘软件_言道国学APP' assets/public/tools/wuguang-paipan.html || { echo "FATAL: 差异化标题公式缺失"; exit 1; }
grep -q 'app-download/latest.apk' assets/public/tools/wuguang-paipan.html || { echo "FATAL: APK 唯一下载源缺失"; exit 1; }
for kw in "latest.apk" "app-download"; do
  n=$(grep -rl "$kw" assets/public/_next/static/chunks/ 2>/dev/null | wc -l)
  echo "[$kw] 命中 ${n} 个 chunk"
  [ "$n" -eq 0 ] && { echo "FATAL: APK 内置资源缺少 [$kw]"; exit 1; }
done
$APKSIGNER verify --print-certs "$APK_OUT" 2>/dev/null | head -3 || echo "（apksigner 不可用，跳过签名详情）"
cd /; rm -rf "$TMPD"

echo "--- [6] 原子部署到统一分发目录（唯一 latest.apk） ---"
cp -f "$APK_OUT" "$DIST_DIR/.latest.apk.new"
chmod 644 "$DIST_DIR/.latest.apk.new"
mv -f "$DIST_DIR/.latest.apk.new" "$DIST_DIR/latest.apk"
find "$DIST_DIR" -maxdepth 1 -type f -name '*.apk' ! -name 'latest.apk' -delete
ls -la "$DIST_DIR/"

echo "--- [7] 后端版本配置升级 ${VC}（升级提示数据源） ---"
cat > /www/yandaoguoxue-backend/data/app-release-config.json <<EOCFG
{
  "latestVersion": "${VN}",
  "latestVersionCode": ${VC},
  "downloadUrl": "https://yandaoguoxue.yandao.vip/app-download/latest.apk",
  "downloadPage": "https://yandaoguoxue.yandao.vip/friend",
  "releaseNotes": [
    "专业罗盘升级多门派：三合/三元/玄空三套盘，三合12圈层（三针、穿山透地、分金、二十八宿等），圈层自由开关",
    "罗盘支持全屏放大、逐圈层读数面板，测完坐向一键跳转玄空飞星排盘",
    "立极尺叠加专业罗盘：门派选择+圈层可见性，与电子罗盘同引擎同口径",
    "七政四余出生地点升级：省→市→区县三级选择，与八字排盘同一地点库",
    "内置资源与官网同步至 v25.0.70，功能完全一致"
  ],
  "forceUpdate": false,
  "publishedAt": "${BUILT_AT}"
}
EOCFG
grep -q "\"latestVersionCode\": ${VC}" /www/yandaoguoxue-backend/data/app-release-config.json || { echo "FATAL: 版本配置写入失败"; exit 1; }
grep -q 'app-download/latest.apk' /www/yandaoguoxue-backend/data/app-release-config.json || { echo "FATAL: 下载地址未指向统一固定地址"; exit 1; }

echo "--- [8] 发布 v25.0.70 升级公告（替换过时版本公告） ---"
node <<'EONODE'
const fs = require('fs');
const P = '/www/yandaoguoxue-backend/data/announcements.json';
const items = JSON.parse(fs.readFileSync(P, 'utf8'));
const keep = items.filter(i => !String(i.id).match(/^a_v25_0_\d+_release$/));
const now = new Date().toISOString();
keep.unshift({
  id: 'a_v25_0_70_release',
  title: '🎉 新版 v25.0.70 发布：罗盘多门派、立极尺专业盘升级',
  content: '【本次更新内容】\n1. 专业罗盘多门派升级：内置三合/三元/玄空三套门派盘，三合盘 12 圈层齐备（地盘正针/人盘中针/天盘缝针三针、穿山七十二龙、透地六十龙、一百二十分金、二十八宿、二十四节气、赖公拨砂），不认识的圈层可随时隐藏，盘面清爽不慌；\n2. 罗盘体验增强：全屏放大细读、逐圈层读数面板，现场测完坐向一键跳转玄空飞星排盘，坐山自动带入；\n3. 立极尺叠加专业盘：户型图上可切换三合/三元/玄空专业罗盘，圈层按需开关，与电子罗盘同一引擎同一口径；\n4. 七政四余出生地点升级：省→市→区县三级选择（与八字排盘同一地点库），真太阳时按当地经度自动校正。\n\n老版本用户打开 APP 会收到升级引导，按提示操作即可完成升级。',
  level: 'important',
  pinned: true,
  published: true,
  publishAt: now,
  expiresAt: null,
  link: 'https://yandaoguoxue.yandao.vip/friend',
  createdAt: now,
  updatedAt: now
});
fs.writeFileSync(P, JSON.stringify(keep, null, 2));
console.log('公告列表:', keep.map(i => i.id).join(', '));
EONODE

echo "--- [9] 公网全链路验证 ---"
sleep 2
V=$(curl -sk -m 15 "$BASE/api/public/app-version")
echo "$V" | grep -q "\"latestVersionCode\":${VC}\|\"latestVersionCode\": ${VC}" || { echo "FATAL: 升级接口未返回 ${VC}：$V"; exit 1; }
echo "升级接口 OK → ${VN}/${VC}"
A=$(curl -sk -m 15 "$BASE/api/announcements/public")
echo "$A" | grep -q "v25.0.70" || { echo "FATAL: 公告未更新"; exit 1; }
echo "公告 OK → v25.0.70 升级公告已生效"
CT=$(curl -sk -m 30 -I "$BASE/app-download/latest.apk" | grep -i '^content-type' | tr -d '\r' | awk '{print $2}')
SZ=$(curl -sk -m 30 -I "$BASE/app-download/latest.apk" | grep -i '^content-length' | tr -d '\r' | awk '{print $2}')
echo "latest.apk: MIME=${CT} size=${SZ}"
[ "$CT" = "application/vnd.android.package-archive" ] || { echo "FATAL: MIME 错误"; exit 1; }
[ -n "$SZ" ] && [ "$SZ" -gt 5000000 ] || { echo "FATAL: 公网 APK 体积异常"; exit 1; }

echo "--- [10] APK 单一来源门禁（D20 防复发） ---"
bash /root/apk_url_single_source_gate.sh "${VC}" "${VN}" || { echo "FATAL: 单一来源门禁未通过"; exit 1; }

echo ""
echo "===== APK v25.0.70 BUILD COMPLETE（${VN}/${VC} 统一分发 latest.apk + 升级提示 + 公告 全部就绪） ====="
