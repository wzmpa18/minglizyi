#!/bin/bash
# ============================================================================
# v25.0.72 发布：七政四余学习资料上线 + 中医正骨专区恢复（单独付费¥89）
#   ① Web 前端：
#     - 中医主页新增「正骨专区」入口卡（15部资料/212知识点/266题）
#     - 新页面 /zhongyi/zhenggu：登录守卫 + Paywall（¥89 永久解锁）+ 三态开关
#       （OFF=下线提示 / MAINTENANCE=维护提示 / ON=正常）
#     - 七政四余排盘页断语面板新增「查看学习资料」链接（跳易学学习区七政类目）
#     - 学习区支持 ?category= URL 参数直选类目
#   ② 本版含后端变更（需 PM2 重启）：
#     - academyRoutes.js：正骨专区服务端门控（materials/knowledge/questions
#       答案可见性 / access 接口 / 类目过滤；未解锁 402 Paywall）
#     - toolAdminRoutes.js：工具矩阵新增 zhongyi_zhenggu 条目
#       （ONE_TIME ¥89，后台工具管理中心实时改价/开关）
#   ③ 数据已在库（本脚本前已导入并核验）：
#     - 易学·七政四余：135 知识点（卷节+页码出处）+ 141 题（全部关联知识点）
#     - 中医·中华非遗正骨：15 资料 + 212 知识点 + 266 题（全 approved）
# 流程：tar 解包 → 内容门禁 → 后端同步+PM2重启 → current 原子切流 → 热路径立检
# ============================================================================
set -euo pipefail
VERSION="v25.0.72"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"
TAR="/root/yandaoguoxue/out_v25_0_72.tar.gz"
BASE="https://yandaoguoxue.yandao.vip"
BACKEND_DIR="/www/yandaoguoxue-backend"

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

echo "=== [3] 内容门禁（v25.0.72 正骨专区 + 七政学习资料） ==="
fail=0
V=$(grep -o '"version": *"[^"]*"' "$RELEASE_DIR/version.json" || true)
echo "version.json: $V"
echo "$V" | grep -q "v25.0.72" || { echo "FAIL: buildId 未烧录 v25.0.72"; fail=1; }

# 正骨专区新页面
[ -f "$RELEASE_DIR/zhongyi/zhenggu/index.html" ] || { echo "FAIL: /zhongyi/zhenggu 页面缺失"; fail=1; }
grep -q '正骨专区' "$RELEASE_DIR/zhongyi/zhenggu/index.html" || { echo "FAIL: 正骨页缺标题"; fail=1; }
grep -q '正骨专区' "$RELEASE_DIR/zhongyi/index.html" || { echo "FAIL: 中医主页缺正骨入口卡"; fail=1; }
echo "正骨专区页面 + 中医主页入口 OK"

# 正骨 Paywall/三态/登录守卫要素烧录（SPA chunk 抽查）
CHK_DIR="$RELEASE_DIR/_next/static/chunks"
grep -rlq '正骨专区（永久解锁）' "$CHK_DIR" || { echo "FAIL: 正骨支付文案未烧录"; fail=1; }
grep -rlq '正骨专区内容暂已下线' "$CHK_DIR" || { echo "FAIL: 正骨 OFF 态文案未烧录"; fail=1; }
grep -rlq '登录后即可查看正骨专区' "$CHK_DIR" || { echo "FAIL: 正骨登录守卫文案未烧录"; fail=1; }
grep -rlq 'zhongyi_zhenggu' "$CHK_DIR" || { echo "FAIL: 正骨工具ID未烧录"; fail=1; }
echo "正骨 Paywall/三态/登录守卫/工具ID 烧录 OK"

# 七政断语面板「查看学习资料」链接烧录
grep -rlq '查看学习资料' "$CHK_DIR" || { echo "FAIL: 七政学习资料链接未烧录"; fail=1; }
echo "七政「查看学习资料」链接烧录 OK"

# SEO 28 页回归（v25.0.67 18页 + v25.0.70 六新页）
ALL_SEO="tools/wuguang-paipan.html tools/mianfei-bazi-paipan.html tools/paipan-mianfei.html tools/buyong-huiyuan-paipan.html tools/paipan-nage-haoyong.html tools/youmeiyou-wuguang-paipan.html tools/qizheng-siyu.html tools/luopan.html tools/liji-ruler.html tools/luban-ruler.html tools/xuankong-feixing.html tools/qizheng-siyu-rumen.html tools/luopan-zenme-kan.html tools/liji-ruler-zenme-yong.html tools/xuankong-feixing-rumen.html tools/luban-ruler-zenme-kan.html learn/mianfei-zhongyi-tiku.html learn/mianfei-zhongyi-shuati.html learn/zhongyi-dianji-mianfei.html app/meiyou-guanggao-guoxue.html app/shenme-guoxue-meiguanggao.html app/quangongneng-guoxue.html app/gongneng-quan-guoxue.html b/yixue-zhongyi-fangan.html tools/index.html learn/index.html app/index.html b/index.html"
SEO_MISS=0
for f in $ALL_SEO; do
  [ -f "$RELEASE_DIR/$f" ] || { echo "FAIL: SEO 回归页缺失 $f"; SEO_MISS=1; fail=1; }
done
[ "$SEO_MISS" = "0" ] && echo "SEO 28 页回归齐全"

# tools 目录索引 16 页链接
grep -c 'class="card"' "$RELEASE_DIR/tools/index.html" | grep -q '^16$' || { echo "FAIL: tools 索引页非 16 页"; fail=1; }
echo "tools 目录索引 16 页 OK"

# 工具页回归（含中医/易学入口）
TOOL_FILES="yixue/compass/index.html yixue/qizheng/index.html yixue/liji/index.html yixue/luban/index.html yixue/xuankong-feixing/index.html yixue/index.html zhongyi/index.html"
for f in $TOOL_FILES; do
  [ -f "$RELEASE_DIR/$f" ] || { echo "FAIL: 工具页缺失 $f"; fail=1; }
done
echo "五工具页 + 易学/中医入口页齐全"

# 引擎烧录回归
grep -rq "罗盘门派圈层引擎 v25.0.70" "$CHK_DIR/" || { echo "FAIL: 罗盘 Profile 引擎未烧录"; fail=1; }
grep -rq "WMM2025" "$CHK_DIR/" || { echo "FAIL: WMM2025 磁偏角引擎未烧录"; fail=1; }
grep -rq "七政四余引擎" "$CHK_DIR/" || { echo "FAIL: 七政引擎未烧录"; fail=1; }
grep -rq "ruler-engine-v1.0.0" "$CHK_DIR/" || { echo "FAIL: 鲁班尺引擎未烧录"; fail=1; }
grep -rq "liji-engine-v1.0.0" "$CHK_DIR/" || { echo "FAIL: 立极尺引擎未烧录"; fail=1; }
echo "五引擎烧录回归 OK"

# sitemap + robots
SM=$(cat "$RELEASE_DIR/sitemap.xml")
SMN=$(echo "$SM" | grep -c '<loc>')
echo "sitemap URL 数: ${SMN}"
[ "$SMN" = "34" ] || { echo "FAIL: sitemap URL 数非 34"; fail=1; }
grep -q "<urlset" "$RELEASE_DIR/sitemap.xml" || { echo "FAIL: sitemap 缺失"; fail=1; }
grep -q "Sitemap:" "$RELEASE_DIR/robots.txt" || { echo "FAIL: robots.txt 未指向 sitemap"; fail=1; }
echo "sitemap 34 URL + robots OK"

# 主站回归
[ -f "$RELEASE_DIR/index.html" ] || { echo "FAIL: 主站 index.html 缺失"; fail=1; }
[ -d "$RELEASE_DIR/_next/static" ] || { echo "FAIL: _next 静态资源缺失"; fail=1; }
[ -f "$RELEASE_DIR/offline/index.html" ] || { echo "FAIL: /offline 页面回归丢失"; fail=1; }
[ -f "$RELEASE_DIR/6adb2132052f4657a159f7302971f5c2.txt" ] || { echo "FAIL: IndexNow 密钥文件缺失"; fail=1; }

# IP 泄漏检查
IPLEAK=$(grep -rlE '82\.156\.228\.87|8\.155\.23\.111' "$RELEASE_DIR/tools" "$RELEASE_DIR/learn" "$RELEASE_DIR/app" "$RELEASE_DIR/b" 2>/dev/null | wc -l || true)
[ "$IPLEAK" = "0" ] || { echo "FAIL: SEO页IP泄漏 $IPLEAK 个文件"; fail=1; }

[ "$fail" = "0" ] || { echo "FATAL: 内容门禁未通过"; exit 1; }
echo "内容门禁全过（版本烧录+正骨专区+七政链接+SEO28页+五工具页+五引擎+sitemap34+主站回归+IP零泄漏）"

echo "=== [4] 后端同步（v25.0.72 变更：academyRoutes 门控 + toolAdminRoutes 矩阵条目） ==="
test -f /root/yandaoguoxue-source/backend_deploy/academyRoutes.js || { echo "FATAL: 源码仓无 academyRoutes.js"; exit 1; }
cp /root/yandaoguoxue-source/backend_deploy/academyRoutes.js "$BACKEND_DIR/academyRoutes.js"
grep -q 'zhengguGateBlock' "$BACKEND_DIR/academyRoutes.js" || { echo "FAIL: academyRoutes 门控未同步"; exit 1; }
cp /root/yandaoguoxue-source/backend_deploy/toolAdminRoutes.js "$BACKEND_DIR/toolAdminRoutes.js"
grep -q 'zhongyi_zhenggu' "$BACKEND_DIR/toolAdminRoutes.js" || { echo "FAIL: toolAdminRoutes 矩阵条目未同步"; exit 1; }
echo "academyRoutes.js + toolAdminRoutes.js synced"
pm2 restart yandaoguoxue-backend --update-env >/dev/null 2>&1
sleep 3
curl -sk -m 10 ${BASE}/api/health | grep -q '"success"' && echo "backend restart + health OK" || { echo "FAIL: 后端重启后不健康"; exit 1; }
# 工具矩阵条目生效核查（loadMatrix 合并默认 zhongyi_zhenggu）
node -e "const m=require('$BACKEND_DIR/toolAdminRoutes.js').loadMatrix(); const t=m.tools['zhongyi_zhenggu']; if(!t||t.status!=='ON'||t.payMode!=='ONE_TIME'||Number(t.price)!==89){console.log('FAIL: '+JSON.stringify(t));process.exit(1);} console.log('zhongyi_zhenggu ON/ONE_TIME/89 OK');"

echo "=== [5] current 原子切流（v25.0.71 → ${VERSION}） ==="
PREV=$(readlink /root/yandaoguoxue/current)
echo "prev: $PREV"
ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
CURR=$(readlink /root/yandaoguoxue/current)
echo "current: $CURR"
[ "$CURR" = "$RELEASE_DIR" ] || { echo "FATAL: 切流失败"; exit 1; }

echo "=== [6] 热路径立检（切换后无回滚需求即完成） ==="
sleep 1
curl -sk -m 10 "${BASE}/version.json" | grep -q "v25.0.72" && echo "version.json → v25.0.72 OK" || { echo "FAIL: 公网版本未切换"; exit 1; }
for p in zhongyi/zhenggu/ zhongyi/ yixue/qizheng/ yixue/compass/ yixue/liji/ yixue/luban/ yixue/xuankong-feixing/; do
  CODE=$(curl -sk -m 10 -o /dev/null -w "%{http_code}" "${BASE}/${p}")
  [ "$CODE" = "200" ] || { echo "FAIL: /${p} → ${CODE}"; exit 1; }
  echo "/${p} → 200"
done
# 内容指纹抽查（防 SPA fallback 假 200）
curl -sk -m 10 "${BASE}/zhongyi/zhenggu/" | grep -q "正骨专区" && echo "正骨专区页内容指纹 OK" || { echo "FAIL: 正骨页内容为 fallback"; exit 1; }
curl -sk -m 10 "${BASE}/zhongyi/" | grep -q "正骨专区" && echo "中医主页正骨入口指纹 OK" || { echo "FAIL: 中医主页入口为 fallback"; exit 1; }
# 正骨 access 接口存在性（匿名应要求登录，证明路由挂载）
curl -sk -m 10 "${BASE}/api/academy/zhenggu/access" | grep -q '请先登录' && echo "正骨 access 路由 OK（匿名→要求登录）" || { echo "FAIL: 正骨 access 路由未挂载"; exit 1; }
# SEO 抽查回归
for p in tools/xuankong-feixing.html tools/qizheng-siyu.html learn/mianfei-zhongyi-tiku.html; do
  CODE=$(curl -sk -m 10 -o /dev/null -w "%{http_code}" "${BASE}/${p}")
  [ "$CODE" = "200" ] || { echo "FAIL: /${p} → ${CODE}"; exit 1; }
done
echo "SEO 抽查回归 200"
curl -sk -m 10 -o /dev/null -w "首页 %{http_code}\n" "${BASE}/" | grep -q "200" || { echo "WARN: 首页非200，需检查"; }
curl -sk -m 10 "${BASE}/api/health" | grep -q '"success"' && echo "API health OK" || { echo "FAIL: API health 异常"; exit 1; }

echo ""
echo "DEPLOY_DONE ${VERSION}（APK 重建见 build_android_v25_0_72.sh）"