#!/bin/bash
# ============================================================================
# v25.0.72 APK 构建：七政四余学习资料 + 中医正骨专区（versionCode 2070）
#   背景：Web 已发 v25.0.72（七政四余学习资料入易学学习区 + 断语面板学习链接；
#         中医正骨专区恢复上线，单独付费 ¥89 永久解锁，后台可开关/改价），
#         APK 对齐重建，手机端收到 v25.0.72 升级引导。
#   前置：/root/yandaoguoxue/releases/v25.0.72 在产（current 软链指向，
#         由 deploy_v25_0_72.sh 完成）
#   流程：out/ ← releases/v25.0.72（与线上逐字节一致）→ build.gradle 2070/25.0.72
#         → assets/public + app-native.json(2070) → gradle assembleRelease
#         → APK 内容门禁（正骨专区页/中医入口/学习链接/老SEO回归/
#           引擎烧录/版本烧录/签名/单一下载源）
#         → 原子替换 latest.apk → app-release-config.json 升 2070
#         → v25.0.72 升级公告 → 公网全链路验证
#   分发纪律（项目方硬性要求）：/var/www/yandao.vip/app-download/ 仅 latest.apk
#         一个 APK 文件，全站所有下载/分享链接唯一指向该目录（D20 防复发门禁）
#   顺序纪律：先换包后升版本号（防升级循环：先升号再换包会让已升级用户拿旧包）
# ============================================================================
set -e

SRC_DIR="/root/yandaoguoxue-source"
RELEASE_DIR="/root/yandaoguoxue/releases/v25.0.72"
ASSETS_PUBLIC="$SRC_DIR/android/app/src/main/assets/public"
APK_OUT="$SRC_DIR/android/app/build/outputs/apk/release/app-release.apk"
DIST_DIR="/var/www/yandao.vip/app-download"
AAPT="/opt/android-sdk/build-tools/34.0.0/aapt"
APKSIGNER="/opt/android-sdk/build-tools/34.0.0/apksigner"
GRADLE_BIN="/opt/gradle-8.9/bin/gradle"
VC=2070
VN="25.0.72"
BASE="https://yandaoguoxue.yandao.vip"

echo "--- [0] 前置校验 ---"
PUBIP=$(curl -s -m 8 ifconfig.me || true)
echo "public ip: ${PUBIP}"
[ "${PUBIP}" = "82.156.228.87" ] || { echo "FATAL: 非唯一生产服务器 82.156.228.87，禁止构建"; exit 1; }
[ -d "$RELEASE_DIR" ] || { echo "FATAL: ${RELEASE_DIR} 不存在"; exit 1; }
grep -q "v25.0.72" "$RELEASE_DIR/version.json" || { echo "FATAL: release 非 v25.0.72"; exit 1; }
[ -x "$GRADLE_BIN" ] && [ -x "$AAPT" ] || { echo "FATAL: 构建工具链缺失"; exit 1; }
df -h / | tail -1

echo "--- [1] 同步线上 v25.0.72 资源到源码 out/（与生产 current 完全一致） ---"
rm -rf "$SRC_DIR/out"
mkdir -p "$SRC_DIR/out"
cp -a "$RELEASE_DIR/." "$SRC_DIR/out/"
test -f "$SRC_DIR/out/index.html" || { echo "FATAL: out/index.html 缺失"; exit 1; }
test -f "$SRC_DIR/out/native-api-patch.js" || { echo "FATAL: native-api-patch.js 缺失"; exit 1; }
grep -q "v25.0.72" "$SRC_DIR/out/version.json" || { echo "FATAL: out/ 版本非 v25.0.72"; exit 1; }

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

echo "--- [5] APK 内容门禁（v25.0.72 正骨专区 + 七政学习资料批次） ---"
PKG=$($AAPT dump badging "$APK_OUT" 2>/dev/null | grep "^package:" | head -1)
echo "$PKG"
echo "$PKG" | grep -q "name='com.yandao.guoxue'" || { echo "FATAL: 包名错误"; exit 1; }
echo "$PKG" | grep -q "versionCode='${VC}'" || { echo "FATAL: versionCode 非 ${VC}"; exit 1; }
echo "$PKG" | grep -q "versionName='${VN}'" || { echo "FATAL: versionName 非 ${VN}"; exit 1; }

TMPD=/tmp/apk_verify_v25_0_72
rm -rf "$TMPD"; mkdir -p "$TMPD"; cd "$TMPD"
unzip -o -q "$APK_OUT" \
  "assets/public/app-native.json" "assets/public/version.json" \
  "assets/public/sitemap.xml" "assets/public/robots.txt" \
  "assets/public/native-api-patch.js" \
  "assets/public/yixue/*" "assets/public/zhongyi/*" \
  "assets/public/tools/*" "assets/public/learn/*" "assets/public/app/*" "assets/public/b/*" \
  "assets/public/index.html" "assets/public/_next/static/chunks/*" 2>/dev/null || true
grep -q "\"versionCode\": ${VC}" assets/public/app-native.json || { echo "FATAL: 内置版本号错误"; exit 1; }
grep -q "v25.0.72" assets/public/version.json || { echo "FATAL: 内置 web 资源版本错误"; exit 1; }
grep -q "<urlset" assets/public/sitemap.xml || { echo "FATAL: 内置 sitemap 缺失"; exit 1; }
grep -q "Sitemap:" assets/public/robots.txt || { echo "FATAL: 内置 robots 缺失"; exit 1; }

# v25.0.72 新内容：正骨专区
[ -f "assets/public/zhongyi/zhenggu/index.html" ] || { echo "FATAL: APK 缺正骨专区页"; exit 1; }
grep -q '中华非遗正骨专区' assets/public/zhongyi/zhenggu/index.html || { echo "FATAL: 正骨页缺 Paywall 标题"; exit 1; }
grep -q '正骨专区' assets/public/zhongyi/index.html || { echo "FATAL: 中医主页缺正骨入口"; exit 1; }
grep -rq '正骨专区（永久解锁）' assets/public/_next/static/chunks/ || { echo "FATAL: 正骨支付文案缺失"; exit 1; }
grep -rq 'zhongyi_zhenggu' assets/public/_next/static/chunks/ || { echo "FATAL: 正骨工具ID缺失"; exit 1; }
grep -rq '查看学习资料' assets/public/_next/static/chunks/ || { echo "FATAL: 七政学习链接缺失"; exit 1; }
echo "正骨专区页 + 中医入口 + 七政学习链接内置齐全"

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
echo "五引擎烧录 OK"

# SEO 28 页回归（24 落地页 + 4 索引）
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
    "七政四余学习资料上线：八卷知识库整理为 135 个知识点（标注古籍卷节页码）+ 141 道练习题，已收入易学学习区",
    "七政四余排盘断语面板新增「查看学习资料」入口，断语出处一键溯源",
    "中医正骨专区恢复上线：15 部非遗正骨资料 + 212 知识点 + 266 题，单独付费 89 元永久解锁",
    "内置资源与官网同步至 v25.0.72，功能完全一致"
  ],
  "forceUpdate": false,
  "publishedAt": "${BUILT_AT}"
}
EOCFG
grep -q "\"latestVersionCode\": ${VC}" /www/yandaoguoxue-backend/data/app-release-config.json || { echo "FATAL: 版本配置写入失败"; exit 1; }
grep -q 'app-download/latest.apk' /www/yandaoguoxue-backend/data/app-release-config.json || { echo "FATAL: 下载地址未指向统一固定地址"; exit 1; }

echo "--- [8] 发布 v25.0.72 升级公告（替换过时版本公告） ---"
node <<'EONODE'
const fs = require('fs');
const P = '/www/yandaoguoxue-backend/data/announcements.json';
const items = JSON.parse(fs.readFileSync(P, 'utf8'));
const keep = items.filter(i => !String(i.id).match(/^a_v25_0_\d+_release$/));
const now = new Date().toISOString();
keep.unshift({
  id: 'a_v25_0_72_release',
  title: '🎉 新版 v25.0.72 发布：七政四余学习资料 + 正骨专区上线',
  content: '【本次更新内容】\n1. 七政四余学习资料上线：将七政四余八卷知识库整理为系统学习资料，135 个知识点全部标注古籍卷节与页码，配 141 道练习题，已收入易学学习区，可在学习区选择「七政四余」类目开始学习；\n2. 七政排盘断语溯源：排盘页断语面板新增「查看学习资料」入口，每条断语的出处可一键跳转学习区对应知识点；\n3. 中医正骨专区恢复上线：15 部中华非遗正骨资料、212 个知识点、266 道题目全部恢复，进入中医板块即可看到正骨专区入口；正骨专区为单独付费内容，89 元永久解锁（后续价格如有调整以页面显示为准）。\n\n老版本用户打开 APP 会收到升级引导，按提示操作即可完成升级。',
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
echo "$A" | grep -q "v25.0.72" || { echo "FATAL: 公告未更新"; exit 1; }
echo "公告 OK → v25.0.72 升级公告已生效"
CT=$(curl -sk -m 30 -I "$BASE/app-download/latest.apk" | grep -i '^content-type' | tr -d '\r' | awk '{print $2}')
SZ=$(curl -sk -m 30 -I "$BASE/app-download/latest.apk" | grep -i '^content-length' | tr -d '\r' | awk '{print $2}')
echo "latest.apk: MIME=${CT} size=${SZ}"
[ "$CT" = "application/vnd.android.package-archive" ] || { echo "FATAL: MIME 错误"; exit 1; }
[ -n "$SZ" ] && [ "$SZ" -gt 5000000 ] || { echo "FATAL: 公网 APK 体积异常"; exit 1; }

echo "--- [10] APK 单一来源门禁（D20 防复发） ---"
bash /root/apk_url_single_source_gate.sh "${VC}" "${VN}" || { echo "FATAL: 单一来源门禁未通过"; exit 1; }

echo ""
echo "===== APK v25.0.72 BUILD COMPLETE（${VN}/${VC} 统一分发 latest.apk + 升级提示 + 公告 全部就绪） ====="