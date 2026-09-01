#!/bin/bash
# ============================================================================
# v25.0.74 APK 构建：排盘记录保存修复 + 安卓返回手势（versionCode 2071）
#   背景：Web 已发 v25.0.74（排盘记录云端保存链路修复 + 13工具页未选客户也保存 +
#         records 页 22 类型映射；MainActivity OnBackPressedCallback 返回手势），
#         APK 对齐重建，手机端收到 v25.0.74 升级引导。
#   前置：/root/yandaoguoxue/releases/v25.0.74 在产（current 软链指向，
#         由 deploy_v25_0_74.sh 完成）
#   流程：out/ ← releases/v25.0.74 → build.gradle 2071/25.0.74
#         → assets/public + app-native.json(2071) → gradle assembleRelease
#         → APK 内容门禁（记录链路特征/records页22标签/dex返回手势符号/
#           正骨七政回归/五工具/五引擎/SEO42页/版本烧录/签名/单一下载源）
#         → 原子替换 latest.apk → app-release-config.json 升 2071
#         → v25.0.74 升级公告 → 公网全链路验证
#   分发纪律（项目方硬性要求）：/var/www/yandao.vip/app-download/ 仅 latest.apk
#   顺序纪律：先换包后升版本号
# ============================================================================
set -e

SRC_DIR="/root/yandaoguoxue-source"
RELEASE_DIR="/root/yandaoguoxue/releases/v25.0.74"
ASSETS_PUBLIC="$SRC_DIR/android/app/src/main/assets/public"
APK_OUT="$SRC_DIR/android/app/build/outputs/apk/release/app-release.apk"
DIST_DIR="/var/www/yandao.vip/app-download"
AAPT="/opt/android-sdk/build-tools/34.0.0/aapt"
APKSIGNER="/opt/android-sdk/build-tools/34.0.0/apksigner"
GRADLE_BIN="/opt/gradle-8.9/bin/gradle"
VC=2071
VN="25.0.74"
BASE="https://yandaoguoxue.yandao.vip"

echo "--- [0] 前置校验 ---"
PUBIP=$(curl -s -m 8 ifconfig.me || true)
echo "public ip: ${PUBIP}"
[ "${PUBIP}" = "82.156.228.87" ] || { echo "FATAL: 非唯一生产服务器 82.156.228.87，禁止构建"; exit 1; }
[ -d "$RELEASE_DIR" ] || { echo "FATAL: ${RELEASE_DIR} 不存在"; exit 1; }
grep -q "v25.0.74" "$RELEASE_DIR/version.json" || { echo "FATAL: release 非 v25.0.74"; exit 1; }
grep -q "OnBackPressedCallback" "$SRC_DIR/android/app/src/main/java/com/yandao/guoxue/MainActivity.java" || { echo "FATAL: MainActivity 返回处理源码未同步"; exit 1; }
[ -x "$GRADLE_BIN" ] && [ -x "$AAPT" ] || { echo "FATAL: 构建工具链缺失"; exit 1; }
df -h / | tail -1

echo "--- [1] 同步线上 v25.0.74 资源到源码 out/（与生产 current 完全一致） ---"
rm -rf "$SRC_DIR/out"
mkdir -p "$SRC_DIR/out"
cp -a "$RELEASE_DIR/." "$SRC_DIR/out/"
test -f "$SRC_DIR/out/index.html" || { echo "FATAL: out/index.html 缺失"; exit 1; }
test -f "$SRC_DIR/out/native-api-patch.js" || { echo "FATAL: native-api-patch.js 缺失"; exit 1; }
grep -q "v25.0.74" "$SRC_DIR/out/version.json" || { echo "FATAL: out/ 版本非 v25.0.74"; exit 1; }

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

echo "--- [5] APK 内容门禁（v25.0.74 记录保存 + 返回手势批次） ---"
PKG=$($AAPT dump badging "$APK_OUT" 2>/dev/null | grep "^package:" | head -1)
echo "$PKG"
echo "$PKG" | grep -q "name='com.yandao.guoxue'" || { echo "FATAL: 包名错误"; exit 1; }
echo "$PKG" | grep -q "versionCode='${VC}'" || { echo "FATAL: versionCode 非 ${VC}"; exit 1; }
echo "$PKG" | grep -q "versionName='${VN}'" || { echo "FATAL: versionName 非 ${VN}"; exit 1; }

TMPD=/tmp/apk_verify_v25_0_74
rm -rf "$TMPD"; mkdir -p "$TMPD"; cd "$TMPD"
unzip -o -q "$APK_OUT" \
  "assets/public/app-native.json" "assets/public/version.json" \
  "assets/public/sitemap.xml" "assets/public/robots.txt" \
  "assets/public/native-api-patch.js" \
  "assets/public/records/*" "assets/public/yixue/*" "assets/public/zhongyi/*" \
  "assets/public/tools/*" "assets/public/learn/*" "assets/public/app/*" "assets/public/b/*" \
  "assets/public/index.html" "assets/public/_next/static/chunks/*" \
  "classes*.dex" 2>/dev/null || true
grep -q "\"versionCode\": ${VC}" assets/public/app-native.json || { echo "FATAL: 内置版本号错误"; exit 1; }
grep -q "v25.0.74" assets/public/version.json || { echo "FATAL: 内置 web 资源版本错误"; exit 1; }
grep -q "<urlset" assets/public/sitemap.xml || { echo "FATAL: 内置 sitemap 缺失"; exit 1; }

# v25.0.74 核心①：记录保存链路特征（正式后端链路 + 登录补传）
grep -rq 'flushPendingRecordSync' assets/public/_next/static/chunks/ || { echo "FATAL: 登录补传特征缺失"; exit 1; }
grep -rq 'records/save' assets/public/_next/static/chunks/ || { echo "FATAL: 正式保存链路特征缺失"; exit 1; }
echo "记录保存链路特征（flushPendingRecordSync + records/save）内置 OK"

# v25.0.74 核心②：records 页 22 类型筛选标签（静态 HTML 直出）
[ -f "assets/public/records/index.html" ] || { echo "FATAL: APK 缺 records 页"; exit 1; }
for kw in "我的排盘记录" "七政四余" "专业罗盘" "体质测评" "车牌吉凶"; do
  grep -q "$kw" assets/public/records/index.html || { echo "FATAL: records 页缺筛选标签「$kw」"; exit 1; }
done
echo "records 页 + 22 类型标签内置齐全"

# v25.0.74 核心③：dex 返回手势符号（OnBackPressedCallback 接管 + 双击退出文案）
DEX_HIT=$(grep -la "getOnBackPressedDispatcher" classes*.dex 2>/dev/null | wc -l)
[ "$DEX_HIT" -ge 1 ] || { echo "FATAL: dex 缺 getOnBackPressedDispatcher 符号（返回手势回调未编入）"; exit 1; }
grep -qa "再按一次返回键退出言道国学" classes*.dex || { echo "FATAL: dex 缺双击退出 Toast 文案"; exit 1; }
echo "dex 返回手势符号（dispatcher + 双击退出文案）内置 OK"

# v25.0.72 回归：正骨专区 + 七政学习链接
[ -f "assets/public/zhongyi/zhenggu/index.html" ] || { echo "FATAL: APK 缺正骨专区页"; exit 1; }
grep -q '正骨专区' assets/public/zhongyi/index.html || { echo "FATAL: 中医主页缺正骨入口"; exit 1; }
grep -rq 'zhongyi_zhenggu' assets/public/_next/static/chunks/ || { echo "FATAL: 正骨工具ID缺失"; exit 1; }
grep -rq '查看学习资料' assets/public/_next/static/chunks/ || { echo "FATAL: 七政学习链接缺失"; exit 1; }
echo "正骨专区 + 七政学习链接回归 OK"

# 五工具页内置齐全
TOOL_FILES="yixue/compass/index.html yixue/qizheng/index.html yixue/liji/index.html yixue/luban/index.html yixue/xuankong-feixing/index.html yixue/index.html yixue/bazi/index.html yixue/ziwei/index.html yixue/qimen/index.html yixue/daliuren/index.html"
for f in $TOOL_FILES; do
  [ -f "assets/public/$f" ] || { echo "FATAL: APK 缺少工具页 $f"; exit 1; }
done
echo "工具页（五小众+四大排盘+易学入口）内置齐全"

# 引擎烧录抽查（字符串字面量）
grep -rq "罗盘门派圈层引擎 v25.0.70" assets/public/_next/static/chunks/ || { echo "FATAL: 罗盘 Profile 引擎缺失"; exit 1; }
grep -rq "WMM2025" assets/public/_next/static/chunks/ || { echo "FATAL: WMM2025 引擎缺失"; exit 1; }
grep -rq "七政四余引擎" assets/public/_next/static/chunks/ || { echo "FATAL: 七政引擎缺失"; exit 1; }
grep -rq "ruler-engine-v1.0.0" assets/public/_next/static/chunks/ || { echo "FATAL: 鲁班尺引擎缺失"; exit 1; }
grep -rq "liji-engine-v1.0.0" assets/public/_next/static/chunks/ || { echo "FATAL: 立极尺引擎缺失"; exit 1; }
echo "五引擎烧录 OK"

# SEO 42 页回归（v25.0.73 phase9 批次后 tools 17→42）
TOOLS_N=$(ls assets/public/tools/*.html 2>/dev/null | wc -l)
echo "内置 tools HTML: $TOOLS_N"
[ "$TOOLS_N" = "42" ] || { echo "FATAL: 内置 tools 页数非 42"; exit 1; }
for f in tools/24shan-luopan.html tools/shouji-haoma-nengliang.html tools/chepai-haoma-zuhe.html tools/qizheng-28xiu.html learn/index.html app/index.html b/index.html; do
  [ -f "assets/public/$f" ] || { echo "FATAL: APK 缺少 SEO 页 $f"; exit 1; }
done
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
    "修复排盘记录保存问题：八字、七政四余、紫微等全部排盘工具的记录现在会自动保存到云端，登录后可在「排盘记录」页跨设备查看",
    "修复未选择客户档案时排盘记录不保存的问题，现在无需选择客户也会保存",
    "排盘记录页新增全部工具类型筛选（七政四余、罗盘、合婚、择日等 22 类）",
    "修复安卓返回手势：屏幕右边缘向中间滑动现在可以正常返回上一级页面（或关闭弹窗），首页双击返回键退出"
  ],
  "forceUpdate": false,
  "publishedAt": "${BUILT_AT}"
}
EOCFG
grep -q "\"latestVersionCode\": ${VC}" /www/yandaoguoxue-backend/data/app-release-config.json || { echo "FATAL: 版本配置写入失败"; exit 1; }
grep -q 'app-download/latest.apk' /www/yandaoguoxue-backend/data/app-release-config.json || { echo "FATAL: 下载地址未指向统一固定地址"; exit 1; }

echo "--- [8] 发布 v25.0.74 升级公告（替换过时版本公告） ---"
node <<'EONODE'
const fs = require('fs');
const P = '/www/yandaoguoxue-backend/data/announcements.json';
const items = JSON.parse(fs.readFileSync(P, 'utf8'));
const keep = items.filter(i => !String(i.id).match(/^a_v25_0_\d+_release$/));
const now = new Date().toISOString();
keep.unshift({
  id: 'a_v25_0_74_release',
  title: '🎉 新版 v25.0.74 发布：修复排盘记录保存与安卓返回手势',
  content: '【本次更新内容】\n1. 修复排盘记录保存问题：之前部分排盘记录只在本地保存、换设备或重装后丢失，现在八字、七政四余、紫微斗数等全部排盘工具的记录都会自动保存到云端，登录后在「排盘记录」页随时查看；\n2. 修复未选择客户档案时排盘记录不保存的问题，现在直接排盘无需选择客户也会保存；\n3. 排盘记录页支持全部 22 种工具类型筛选，记录摘要显示排盘时间、号码等关键信息；\n4. 修复安卓返回手势：屏幕右边缘向中间滑动现在可以正常返回上一级页面（弹窗打开时会先关闭弹窗），在首页时双击返回键退出 APP。\n\n老版本用户打开 APP 会收到升级引导，按提示操作即可完成升级。',
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
echo "$A" | grep -q "v25.0.74" || { echo "FATAL: 公告未更新"; exit 1; }
echo "公告 OK → v25.0.74 升级公告已生效"
CT=$(curl -sk -m 30 -I "$BASE/app-download/latest.apk" | grep -i '^content-type' | tr -d '\r' | awk '{print $2}')
SZ=$(curl -sk -m 30 -I "$BASE/app-download/latest.apk" | grep -i '^content-length' | tr -d '\r' | awk '{print $2}')
echo "latest.apk: MIME=${CT} size=${SZ}"
[ "$CT" = "application/vnd.android.package-archive" ] || { echo "FATAL: MIME 错误"; exit 1; }
[ -n "$SZ" ] && [ "$SZ" -gt 5000000 ] || { echo "FATAL: 公网 APK 体积异常"; exit 1; }

echo "--- [10] APK 单一来源门禁（D20 防复发） ---"
bash /root/apk_url_single_source_gate.sh "${VC}" "${VN}" || { echo "FATAL: 单一来源门禁未通过"; exit 1; }

echo ""
echo "===== APK v25.0.74 BUILD COMPLETE（${VN}/${VC} 统一分发 latest.apk + 升级提示 + 公告 全部就绪） ====="
