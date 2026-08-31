#!/bin/bash
# ============================================================================
# v25.0.70 发布：小众工具收尾批次（LUOPAN_PROFILE + 三级地点 + SEO五Cluster）
#   ① Web 前端：
#     - 专业罗盘多门派 Profile 引擎（三合12圈层/三元/玄空），圈层开关+全屏+
#       逐圈读数+玄空飞星坐向联动跳转
#     - 立极尺叠加专业盘（门派 Profile + 圈层可见性 + 工程快照）
#     - 七政四余出生地点复用八字省→市→区县三级联动组件（与八字同源同精度）
#     - SEO 五 Cluster：新增玄空飞星 Core 页 + 五 Guide 页（七政/罗盘/立极尺/
#       玄空/鲁班尺），tools 目录 10→16 页，Core↔Guide cluster 互链，
#       罗盘/立极尺/七政 Core 页内容同步新能力
#   ② 本批次无后端改动（backend_deploy/*.js 零变更，无需 PM2 重启）
#   ③ 回归门禁：老 SEO 18 页 + 四工具页 + offline + 引擎烧录全量纳入
# 流程：tar 解包 → 内容门禁 → current 原子切流 → 热路径立检
# ============================================================================
set -euo pipefail
VERSION="v25.0.70"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"
TAR="/root/yandaoguoxue/out_v25_0_70.tar.gz"
BASE="https://yandaoguoxue.yandao.vip"

echo "=== [0] 服务器校验（部署纪律：唯一生产服务器 82.156.228.87） ==="
PUBIP=$(curl -s -m 8 ifconfig.me || true)
echo "public ip: ${PUBIP}"
[ "${PUBIP}" = "82.156.228.87" ] || { echo "FATAL: 公网IP非82.156.228.87，禁止部署"; exit 1; }

test -f "$TAR" || { echo "FATAL: tar missing: $TAR"; exit 1; }
echo "=== [1] tar OK ($(du -sh "$TAR" | cut -f1)) ==="

echo "=== [2] 解包到 ${RELEASE_DIR} ==="
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
tar -xzf "$TAR" -C "$RELEASE_DIR"
echo "files: $(find "$RELEASE_DIR" -type f | wc -l)"

echo "=== [3] 内容门禁（v25.0.70 小众工具收尾批次） ==="
fail=0
V=$(grep -o '"version": *"[^"]*"' "$RELEASE_DIR/version.json" || true)
echo "version.json: $V"
echo "$V" | grep -q "v25.0.70" || { echo "FAIL: buildId 未烧录 v25.0.70"; fail=1; }

# 六新 SEO 页齐全（玄空 Core + 五 Guide）
NEW_SEO="tools/xuankong-feixing.html tools/qizheng-siyu-rumen.html tools/luopan-zenme-kan.html tools/liji-ruler-zenme-yong.html tools/xuankong-feixing-rumen.html tools/luban-ruler-zenme-kan.html"
MISSING=0
for f in $NEW_SEO; do
  [ -f "$RELEASE_DIR/$f" ] || { echo "FAIL: 新 SEO 页缺失 $f"; MISSING=1; fail=1; }
done
[ "$MISSING" = "0" ] && echo "六新 SEO 页齐全（玄空 Core + 五 Guide）"

# 新页要素抽查（在线用链接 + ICP + cluster 互链）
grep -q 'yixue/xuankong-feixing/' "$RELEASE_DIR/tools/xuankong-feixing.html" || { echo "FAIL: 玄空 Core 页缺在线用链接"; fail=1; }
grep -q 'yixue/compass/' "$RELEASE_DIR/tools/luopan-zenme-kan.html" || { echo "FAIL: 罗盘 Guide 页缺在线用链接"; fail=1; }
grep -q 'tools/qizheng-siyu.html' "$RELEASE_DIR/tools/qizheng-siyu-rumen.html" || { echo "FAIL: 七政 Guide 缺 Core 互链"; fail=1; }
grep -q 'tools/luopan-zenme-kan.html' "$RELEASE_DIR/tools/luopan.html" || { echo "FAIL: 罗盘 Core 缺 Guide 互链"; fail=1; }
for f in $NEW_SEO; do
  grep -q '粤ICP备2026071165号-4A' "$RELEASE_DIR/$f" || { echo "FAIL: $f 缺ICP悬挂"; fail=1; }
done
echo "在线用链接 + ICP 悬挂 + cluster 互链齐全"

# 老 SEO 24 页回归（v25.0.67 起 18 页 + v25.0.69 批次已含其中）
OLD_SEO="tools/wuguang-paipan.html tools/mianfei-bazi-paipan.html tools/paipan-mianfei.html tools/buyong-huiyuan-paipan.html tools/paipan-nage-haoyong.html tools/youmeiyou-wuguang-paipan.html tools/qizheng-siyu.html tools/luopan.html tools/liji-ruler.html tools/luban-ruler.html learn/mianfei-zhongyi-tiku.html learn/mianfei-zhongyi-shuati.html learn/zhongyi-dianji-mianfei.html app/meiyou-guanggao-guoxue.html app/shenme-guoxue-meiguanggao.html app/quangongneng-guoxue.html app/gongneng-quan-guoxue.html b/yixue-zhongyi-fangan.html tools/index.html learn/index.html app/index.html b/index.html"
SEO_MISS=0
for f in $OLD_SEO; do
  [ -f "$RELEASE_DIR/$f" ] || { echo "FAIL: SEO 回归页缺失 $f"; SEO_MISS=1; fail=1; }
done
[ "$SEO_MISS" = "0" ] && echo "老 SEO 22 页回归齐全"

# tools 目录索引 16 页链接
grep -c 'class="card"' "$RELEASE_DIR/tools/index.html" | grep -q '^16$' || { echo "FAIL: tools 索引页非 16 页"; fail=1; }
echo "tools 目录索引 16 页 OK"

# 工具页回归
TOOL_FILES="yixue/compass/index.html yixue/qizheng/index.html yixue/liji/index.html yixue/luban/index.html yixue/xuankong-feixing/index.html yixue/index.html"
for f in $TOOL_FILES; do
  [ -f "$RELEASE_DIR/$f" ] || { echo "FAIL: 工具页缺失 $f"; fail=1; }
done
echo "五工具页（含玄空飞星）+ 易学入口页齐全"

# 引擎烧录回归
grep -rq "罗盘门派圈层引擎 v25.0.70" "$RELEASE_DIR/_next/static/chunks/" || { echo "FAIL: 罗盘 Profile 引擎未烧录"; fail=1; }
grep -rq "WMM2025" "$RELEASE_DIR/_next/static/chunks/" || { echo "FAIL: WMM2025 磁偏角引擎未烧录"; fail=1; }
grep -rq "七政四余引擎" "$RELEASE_DIR/_next/static/chunks/" || { echo "FAIL: 七政引擎未烧录"; fail=1; }
grep -rq "ruler-engine-v1.0.0" "$RELEASE_DIR/_next/static/chunks/" || { echo "FAIL: 鲁班尺引擎未烧录"; fail=1; }
grep -rq "liji-engine-v1.0.0" "$RELEASE_DIR/_next/static/chunks/" || { echo "FAIL: 立极尺引擎未烧录"; fail=1; }
grep -rq "穿山七十二龙" "$RELEASE_DIR/_next/static/chunks/" || { echo "FAIL: 罗盘圈层数据未烧录"; fail=1; }
echo "五引擎烧录回归 OK（含罗盘 Profile v25.0.70）"

# sitemap 覆盖新页 + robots
SM=$(cat "$RELEASE_DIR/sitemap.xml")
SMN=$(echo "$SM" | grep -c '<loc>')
echo "sitemap URL 数: ${SMN}"
[ "$SMN" = "34" ] || { echo "FAIL: sitemap URL 数非 34（24页+4索引+6主站）"; fail=1; }
for kw in xuankong-feixing.html qizheng-siyu-rumen luopan-zenme-kan liji-ruler-zenme-yong xuankong-feixing-rumen luban-ruler-zenme-kan; do
  echo "$SM" | grep -q "$kw" || { echo "FAIL: sitemap 缺 $kw"; fail=1; }
done
grep -q "<urlset" "$RELEASE_DIR/sitemap.xml" || { echo "FAIL: sitemap 缺失"; fail=1; }
grep -q "Sitemap:" "$RELEASE_DIR/robots.txt" || { echo "FAIL: robots.txt 未指向 sitemap"; fail=1; }
echo "sitemap 覆盖六新页（33 URL）+ robots OK"

# 主站回归
[ -f "$RELEASE_DIR/index.html" ] || { echo "FAIL: 主站 index.html 缺失"; fail=1; }
[ -d "$RELEASE_DIR/_next/static" ] || { echo "FAIL: _next 静态资源缺失"; fail=1; }
[ -f "$RELEASE_DIR/offline/index.html" ] || { echo "FAIL: /offline 页面回归丢失"; fail=1; }
[ -f "$RELEASE_DIR/6adb2132052f4657a159f7302971f5c2.txt" ] || { echo "FAIL: IndexNow 密钥文件缺失"; fail=1; }

# IP 泄漏检查
IPLEAK=$(grep -rlE '82\.156\.228\.87|8\.155\.23\.111' "$RELEASE_DIR/tools" "$RELEASE_DIR/learn" "$RELEASE_DIR/app" "$RELEASE_DIR/b" 2>/dev/null | wc -l || true)
[ "$IPLEAK" = "0" ] || { echo "FAIL: SEO页IP泄漏 $IPLEAK 个文件"; fail=1; }

[ "$fail" = "0" ] || { echo "FATAL: 内容门禁未通过"; exit 1; }
echo "内容门禁全过（版本烧录+六新页+cluster互链+老SEO22页+五工具页+五引擎烧录+sitemap34+主站回归+IP零泄漏）"

echo "=== [4] current 原子切流（v25.0.69 → ${VERSION}） ==="
PREV=$(readlink /root/yandaoguoxue/current)
echo "prev: $PREV"
ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
CURR=$(readlink /root/yandaoguoxue/current)
echo "current: $CURR"
[ "$CURR" = "$RELEASE_DIR" ] || { echo "FATAL: 切流失败"; exit 1; }

echo "=== [5] 热路径立检（切换后无回滚需求即完成） ==="
sleep 1
curl -sk -m 10 "${BASE}/version.json" | grep -q "v25.0.70" && echo "version.json → v25.0.70 OK" || { echo "FAIL: 公网版本未切换"; exit 1; }
for p in tools/xuankong-feixing.html tools/qizheng-siyu-rumen.html tools/luopan-zenme-kan.html tools/liji-ruler-zenme-yong.html tools/xuankong-feixing-rumen.html tools/luban-ruler-zenme-kan.html; do
  CODE=$(curl -sk -m 10 -o /dev/null -w "%{http_code}" "${BASE}/${p}")
  [ "$CODE" = "200" ] || { echo "FAIL: /${p} → ${CODE}"; exit 1; }
  echo "/${p} → 200"
done
# 内容指纹抽查（防 SPA fallback 假 200）
curl -sk -m 10 "${BASE}/tools/xuankong-feixing.html" | grep -q "玄空飞星排盘" && echo "玄空 Core 页内容指纹 OK" || { echo "FAIL: 玄空 Core 页内容为 fallback"; exit 1; }
curl -sk -m 10 "${BASE}/tools/luopan-zenme-kan.html" | grep -q "罗盘怎么看" && echo "罗盘 Guide 页内容指纹 OK" || { echo "FAIL: 罗盘 Guide 页内容为 fallback"; exit 1; }
# 工具页回归
for p in yixue/compass/ yixue/qizheng/ yixue/liji/ yixue/luban/ yixue/xuankong-feixing/; do
  CODE=$(curl -sk -m 10 -o /dev/null -w "%{http_code}" "${BASE}/${p}")
  [ "$CODE" = "200" ] || { echo "FAIL: /${p} → ${CODE}"; exit 1; }
done
echo "五工具页回归 200"
curl -sk -m 10 -o /dev/null -w "首页 %{http_code}\n" "${BASE}/" | grep -q "200" || { echo "WARN: 首页非200，需检查"; }
API_OK=$(curl -s -m 10 "${BASE}/api/health" | grep -c '"success"' || true)
[ "$API_OK" = "1" ] && echo "API health OK（后端未动，确认在产）" || echo "WARN: API health 异常（本批次未动后端）"

echo ""
echo "DEPLOY_DONE ${VERSION}（APK 重建见 build_android_v25_0_70.sh）"
