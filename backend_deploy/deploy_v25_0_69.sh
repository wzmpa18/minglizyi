#!/bin/bash
# ============================================================================
# v25.0.69 发布：SEO 四工具集群页（NICHE-TOOLS-07 搜索增长联动批次）
#   ① Web：/tools/ 新增 4 个小众工具集群页（七政四余排盘/手机罗盘/立极尺/
#     鲁班尺在线查询），tools 目录索引+sitemap 22→28 URL；生成器新增
#     toolUrl「网页版在线使用」直链（指令07 第九十八章 工具页优先于软文）
#   ② 后端：toolAdminRoutes.js DEFAULT_MATRIX 登记四工具（FREE/ON，SSOT 补全，
#     后台工具管理中心可管控；四工具页不依赖矩阵门禁，纯登记无行为变化）
#     → 需要 PM2 重启一次（ additive 变更，风险低）
#   ③ 老SEO 22 页/主站/四工具页全量回归纳入门禁
# 流程：tar 解包 → 内容门禁 → 后端矩阵登记+PM2重启+矩阵验证 → current 原子切流
# ============================================================================
set -euo pipefail
VERSION="v25.0.69"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"
TAR="/root/yandaoguoxue/out_v25_0_69.tar.gz"
BACKEND_DIR="/www/yandaoguoxue-backend"
BACKEND_NEW="/root/toolAdminRoutes.v25_0_69.js"
BASE="https://yandaoguoxue.yandao.vip"

echo "=== [0] 服务器校验（部署纪律：唯一生产服务器 82.156.228.87） ==="
PUBIP=$(curl -s -m 8 ifconfig.me || true)
echo "public ip: ${PUBIP}"
[ "${PUBIP}" = "82.156.228.87" ] || { echo "FATAL: 公网IP非82.156.228.87，禁止部署"; exit 1; }

test -f "$TAR" || { echo "FATAL: tar missing"; exit 1; }
test -f "$BACKEND_NEW" || { echo "FATAL: backend toolAdminRoutes.v25_0_69.js missing"; exit 1; }
echo "=== [1] tar OK ($(du -sh "$TAR" | cut -f1)) ==="

echo "=== [2] 解包到 ${RELEASE_DIR} ==="
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
tar -xzf "$TAR" -C "$RELEASE_DIR"
echo "files: $(find "$RELEASE_DIR" -type f | wc -l)"

echo "=== [3] 内容门禁（v25.0.69 SEO 四工具集群页批次） ==="
fail=0
V=$(grep -o '"version": *"[^"]*"' "$RELEASE_DIR/version.json" || true)
echo "version.json: $V"
echo "$V" | grep -q "v25.0.69" || { echo "FAIL: buildId 未烧录 v25.0.69"; fail=1; }

# 四新集群页齐全
NEW_SEO="tools/qizheng-siyu.html tools/luopan.html tools/liji-ruler.html tools/luban-ruler.html"
MISSING=0
for f in $NEW_SEO; do
  [ -f "$RELEASE_DIR/$f" ] || { echo "FAIL: 新集群页缺失 $f"; MISSING=1; fail=1; }
done
[ "$MISSING" = "0" ] && echo "四新集群页齐全"

# 新页要素抽查（在线用链接 + ICP + canonical）
grep -q 'yixue/qizheng/' "$RELEASE_DIR/tools/qizheng-siyu.html" || { echo "FAIL: 七政页缺在线用链接"; fail=1; }
grep -q 'yixue/compass/' "$RELEASE_DIR/tools/luopan.html" || { echo "FAIL: 罗盘页缺在线用链接"; fail=1; }
grep -q 'yixue/liji/' "$RELEASE_DIR/tools/liji-ruler.html" || { echo "FAIL: 立极尺页缺在线用链接"; fail=1; }
grep -q 'yixue/luban/' "$RELEASE_DIR/tools/luban-ruler.html" || { echo "FAIL: 鲁班尺页缺在线用链接"; fail=1; }
for f in $NEW_SEO; do
  grep -q '粤ICP备2026071165号-4A' "$RELEASE_DIR/$f" || { echo "FAIL: $f 缺ICP悬挂"; fail=1; }
done
echo "在线用链接 + ICP 悬挂齐全"

# v25.0.67/v25.0.68 回归：老 SEO 18 页 + 四工具页 + 易学入口
OLD_SEO="tools/wuguang-paipan.html tools/mianfei-bazi-paipan.html tools/paipan-mianfei.html tools/buyong-huiyuan-paipan.html tools/paipan-nage-haoyong.html tools/youmeiyou-wuguang-paipan.html learn/mianfei-zhongyi-tiku.html learn/mianfei-zhongyi-shuati.html learn/zhongyi-dianji-mianfei.html app/meiyou-guanggao-guoxue.html app/shenme-guoxue-meiguanggao.html app/quangongneng-guoxue.html app/gongneng-quan-guoxue.html b/yixue-zhongyi-fangan.html tools/index.html learn/index.html app/index.html b/index.html"
SEO_MISS=0
for f in $OLD_SEO; do
  [ -f "$RELEASE_DIR/$f" ] || { echo "FAIL: SEO 回归页缺失 $f"; SEO_MISS=1; fail=1; }
done
[ "$SEO_MISS" = "0" ] && echo "老 SEO 18 页回归齐全"

TOOL_FILES="yixue/compass/index.html yixue/qizheng/index.html yixue/liji/index.html yixue/luban/index.html yixue/index.html"
for f in $TOOL_FILES; do
  [ -f "$RELEASE_DIR/$f" ] || { echo "FAIL: 工具页缺失 $f"; fail=1; }
done
echo "四工具页 + 易学入口页齐全"

# 引擎烧录回归（字符串字面量在 chunk 中可 grep）
grep -rq "WMM2025" "$RELEASE_DIR/_next/static/chunks/" || { echo "FAIL: WMM2025 磁偏角引擎未烧录"; fail=1; }
grep -rq "七政四余引擎" "$RELEASE_DIR/_next/static/chunks/" || { echo "FAIL: 七政引擎版本未烧录"; fail=1; }
grep -rq "ruler-engine-v1.0.0" "$RELEASE_DIR/_next/static/chunks/" || { echo "FAIL: 鲁班尺引擎版本未烧录"; fail=1; }
grep -rq "liji-engine-v1.0.0" "$RELEASE_DIR/_next/static/chunks/" || { echo "FAIL: 立极尺引擎版本未烧录"; fail=1; }
echo "四引擎烧录回归 OK"

# sitemap 覆盖新页 + robots
SM=$(cat "$RELEASE_DIR/sitemap.xml")
for kw in qizheng-siyu luopan liji-ruler luban-ruler; do
  echo "$SM" | grep -q "$kw" || { echo "FAIL: sitemap 缺 $kw"; fail=1; }
done
grep -q "<urlset" "$RELEASE_DIR/sitemap.xml" || { echo "FAIL: sitemap 缺失"; fail=1; }
grep -q "Sitemap:" "$RELEASE_DIR/robots.txt" || { echo "FAIL: robots.txt 未指向 sitemap"; fail=1; }
echo "sitemap 覆盖四新页 + robots OK"

# 主站回归
[ -f "$RELEASE_DIR/index.html" ] || { echo "FAIL: 主站 index.html 缺失"; fail=1; }
[ -d "$RELEASE_DIR/_next/static" ] || { echo "FAIL: _next 静态资源缺失"; fail=1; }
[ -f "$RELEASE_DIR/offline/index.html" ] || { echo "FAIL: /offline 页面回归丢失"; fail=1; }

# IP 泄漏检查
IPLEAK=$(grep -rlE '82\.156\.228\.87|8\.155\.23\.111' "$RELEASE_DIR/tools" "$RELEASE_DIR/learn" "$RELEASE_DIR/app" "$RELEASE_DIR/b" 2>/dev/null | wc -l || true)
[ "$IPLEAK" = "0" ] || { echo "FAIL: SEO页IP泄漏 $IPLEAK 个文件"; fail=1; }

[ "$fail" = "0" ] || { echo "FATAL: 内容门禁未通过"; exit 1; }
echo "内容门禁全过（版本烧录+四新页+老SEO18页+四工具页+引擎烧录+sitemap+主站回归+IP零泄漏）"

echo "=== [4] 后端工具矩阵登记四工具（SSOT 补全，PM2 重启一次） ==="
BACKUP_TS=$(date +%Y%m%d%H%M%S)
cp "$BACKEND_DIR/toolAdminRoutes.js" "$BACKEND_DIR/toolAdminRoutes.js.bak_${BACKUP_TS}"
echo "已备份: toolAdminRoutes.js.bak_${BACKUP_TS}"
grep -c "qizheng\|compass\|liji\|luban" "$BACKEND_NEW" >/dev/null
cp "$BACKEND_NEW" "$BACKEND_DIR/toolAdminRoutes.js"
node --check "$BACKEND_DIR/toolAdminRoutes.js" || { echo "FATAL: 新 toolAdminRoutes.js 语法错误，回滚"; cp "$BACKEND_DIR/toolAdminRoutes.js.bak_${BACKUP_TS}" "$BACKEND_DIR/toolAdminRoutes.js"; exit 1; }
pm2 restart yandaoguoxue-backend --update-env >/dev/null 2>&1
sleep 3
pm2 list | grep yandaoguoxue-backend | grep -q online || { echo "FATAL: PM2 重启后非 online，回滚"; cp "$BACKEND_DIR/toolAdminRoutes.js.bak_${BACKUP_TS}" "$BACKEND_DIR/toolAdminRoutes.js"; pm2 restart yandaoguoxue-backend >/dev/null 2>&1; exit 1; }
echo "PM2 重启完成（online）"

# 矩阵验证：四工具登记 + 老工具不丢
MATRIX=$(curl -s -m 10 "${BASE}/api/public/tool-matrix")
echo "$MATRIX" | grep -q '"qizheng"' || { echo "FAIL: qizheng 未登记进矩阵"; fail=1; }
echo "$MATRIX" | grep -q '"compass"' || { echo "FAIL: compass 未登记进矩阵"; fail=1; }
echo "$MATRIX" | grep -q '"liji"' || { echo "FAIL: liji 未登记进矩阵"; fail=1; }
echo "$MATRIX" | grep -q '"luban"' || { echo "FAIL: luban 未登记进矩阵"; fail=1; }
for t in bazi ziwei qimen liuyao zhongyi_classic zhongyi_exam; do
  echo "$MATRIX" | grep -q "\"${t}\":" || { echo "FAIL: 老工具 ${t} 从矩阵丢失"; fail=1; }
done
echo "$MATRIX" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']['tools']; print('矩阵工具总数:', len(d)); [print(' ', k, d[k]['name'], d[k]['payMode'], d[k]['status']) for k in ['qizheng','compass','liji','luban']]" 2>/dev/null || echo "(python3 不可用，跳过总数统计)"
API_OK=$(curl -s -m 10 "${BASE}/api/health" | grep -c '"success"' || true)
[ "$API_OK" = "1" ] || { echo "FAIL: API health 异常"; fail=1; }
[ "$fail" = "0" ] || { echo "FATAL: 后端矩阵验证未通过"; exit 1; }
echo "后端矩阵验证通过（四工具登记 + 老工具全在 + API health OK）"

echo "=== [5] current 原子切流（v25.0.68 → ${VERSION}） ==="
PREV=$(readlink /root/yandaoguoxue/current)
echo "prev: $PREV"
ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
CURR=$(readlink /root/yandaoguoxue/current)
echo "current: $CURR"
[ "$CURR" = "$RELEASE_DIR" ] || { echo "FATAL: 切流失败"; exit 1; }

echo "=== [6] 热路径立检（切换后无回滚需求即完成） ==="
sleep 1
curl -sk -m 10 "${BASE}/version.json" | grep -q "v25.0.69" && echo "version.json → v25.0.69 OK" || { echo "FAIL: 公网版本未切换"; exit 1; }
for p in tools/qizheng-siyu.html tools/luopan.html tools/liji-ruler.html tools/luban-ruler.html; do
  CODE=$(curl -sk -m 10 -o /dev/null -w "%{http_code}" "${BASE}/${p}")
  [ "$CODE" = "200" ] || { echo "FAIL: /${p} → ${CODE}"; exit 1; }
  echo "/${p} → 200"
done
curl -sk -m 10 -o /dev/null -w "首页 %{http_code}\n" "${BASE}/" | grep -q "200" || { echo "WARN: 首页非200，需检查"; }

echo ""
echo "DEPLOY_DONE ${VERSION}（详细公网验证见 verify_v25_0_69.sh）"
