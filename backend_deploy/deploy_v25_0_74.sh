#!/bin/bash
# ============================================================================
# v25.0.74 发布：排盘记录保存修复 + 安卓返回手势
#   ① 排盘记录云端保存链路修复（前端 JS 变更，零后端改动）：
#     - clientStore 死路径 /api/records → /api/auth/records/save 正式链路（JWT）
#     - 离线/未登录入队，登录后 flushPendingRecordSync 补传
#     - 13 个工具页去 selectedClient 守卫（未选客户档案也保存）
#     - /records 页类型映射 22 种全集 + 摘要增强
#   ② MainActivity OnBackPressedCallback（APK 侧，Web 部署不含；本脚本只发 Web）
#   本批零后端变更，无需 PM2 重启；后端维持 cf99433 运行时
# 流程：tar 解包 → 内容门禁（版本烧录+记录链路特征+主站回归+IP泄漏）
#       → current 原子切流 → 热路径立检（GET+特征，防 SPA fallback 假阳性）
# ============================================================================
set -euo pipefail
VERSION="v25.0.74"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"
TAR="/root/yandaoguoxue/out_v25_0_74.tar.gz"
BASE="https://yandaoguoxue.yandao.vip"

echo "=== [0] 服务器校验（部署纪律：唯一生产服务器 82.156.228.87） ==="
PUBIP=$(curl -s -m 8 ifconfig.me || true)
echo "public ip: ${PUBIP}"
[ "${PUBIP}" = "82.156.228.87" ] || { echo "FATAL: 公网IP非82.156.228.87，禁止部署"; exit 1; }

test -f "$TAR" || { echo "FATAL: tar missing"; exit 1; }
echo "=== [1] tar OK ($(du -sh "$TAR" | cut -f1)) ==="

echo "=== [2] 解包到 ${RELEASE_DIR} ==="
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
tar -xzf "$TAR" -C "$RELEASE_DIR"
echo "files: $(find "$RELEASE_DIR" -type f | wc -l)"

echo "=== [3] 内容门禁（v25.0.74 记录保存修复批次） ==="
fail=0
V=$(grep -o '"version": *"[^"]*"' "$RELEASE_DIR/version.json" || true)
echo "version.json: $V"
echo "$V" | grep -q "v25.0.74" || { echo "FAIL: buildId 未烧录 v25.0.74"; fail=1; }

# 记录保存链路修复特征：新逻辑必须进入线上 chunks
CH_FLUSH=$(grep -rl "flushPendingRecordSync" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
echo "chunks 含 flushPendingRecordSync（登录补传）: $CH_FLUSH 个文件"
[ "$CH_FLUSH" -ge 1 ] || { echo "FAIL: 记录保存登录补传特征缺失"; fail=1; }
CH_SAVE=$(grep -rl "records/save" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
echo "chunks 含 records/save（正式后端链路）: $CH_SAVE 个文件"
[ "$CH_SAVE" -ge 1 ] || { echo "FAIL: 正式保存链路特征缺失"; fail=1; }
CH_TMAP=$(grep -rl "七政四余" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
echo "chunks 含类型映射特征（七政四余等）: $CH_TMAP 个文件"
[ "$CH_TMAP" -ge 1 ] || { echo "FAIL: 类型映射特征缺失"; fail=1; }

# 记录页产物
[ -f "$RELEASE_DIR/records/index.html" ] || { echo "FAIL: records 页缺失"; fail=1; }
grep -q '我的排盘记录' "$RELEASE_DIR/records/index.html" || { echo "FAIL: records 页标题指纹缺失"; fail=1; }

# 主站回归：v25.0.72/73 产物仍在（正骨专区/七政学习/SEO 42 页）
[ -f "$RELEASE_DIR/index.html" ] || { echo "FAIL: 主站 index.html 缺失"; fail=1; }
[ -d "$RELEASE_DIR/_next/static" ] || { echo "FAIL: _next 静态资源缺失"; fail=1; }
[ -f "$RELEASE_DIR/zhongyi/zhenggu/index.html" ] || { echo "FAIL: v25.0.72 正骨专区回归丢失"; fail=1; }
grep -q '正骨专区' "$RELEASE_DIR/zhongyi/index.html" || { echo "FAIL: v25.0.72 中医主页正骨入口回归丢失"; fail=1; }
grep -rlq 'zhongyi_zhenggu' "$RELEASE_DIR/_next/static/chunks/" || { echo "FAIL: 正骨工具ID烧录回归丢失"; fail=1; }
grep -rlq '查看学习资料' "$RELEASE_DIR/_next/static/chunks/" || { echo "FAIL: v25.0.72 七政学习链接回归丢失"; fail=1; }
[ -f "$RELEASE_DIR/offline/index.html" ] || { echo "FAIL: /offline 页面回归丢失"; fail=1; }
TOOLS_N=$(ls "$RELEASE_DIR/tools/"*.html | wc -l)
echo "out/tools HTML: $TOOLS_N"
[ "$TOOLS_N" = "42" ] || { echo "FAIL: tools 页数非 42（phase9 回归丢失）"; fail=1; }
grep -q '<urlset' "$RELEASE_DIR/sitemap.xml" || { echo "FAIL: sitemap 缺失"; fail=1; }
SM_N=$(grep -c '<loc>' "$RELEASE_DIR/sitemap.xml")
[ "$SM_N" = "59" ] || { echo "FAIL: sitemap URL 数非 59"; fail=1; }
echo "sitemap $SM_N URL OK"

# IP 泄漏检查（全站新产物抽查：tools + records）
IPLEAK=$(grep -rlE '82\.156\.228\.87|8\.155\.23\.111' "$RELEASE_DIR/tools" "$RELEASE_DIR/records" 2>/dev/null | wc -l || true)
[ "$IPLEAK" = "0" ] || { echo "FAIL: IP泄漏 $IPLEAK 个文件"; fail=1; }

[ "$fail" = "0" ] || { echo "FATAL: 内容门禁未通过"; exit 1; }
echo "内容门禁全过（版本烧录+记录链路特征+主站回归+SEO回归+IP零泄漏）"

echo "=== [4] current 原子切流（v25.0.73 → ${VERSION}） ==="
PREV=$(readlink /root/yandaoguoxue/current)
echo "prev: $PREV"
ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
CURR=$(readlink /root/yandaoguoxue/current)
echo "current: $CURR"
[ "$CURR" = "$RELEASE_DIR" ] || { echo "FATAL: 切流失败"; exit 1; }

echo "=== [5] 热路径立检（GET+内容指纹，防 SPA fallback 假阳性） ==="
sleep 1
curl -sk -m 10 "${BASE}/version.json" | grep -q "v25.0.74" && echo "version.json → v25.0.74 OK" || { echo "FAIL: 公网版本未切换"; exit 1; }
curl -sk -m 10 -o /dev/null -w "首页 %{http_code}\n" "${BASE}/" | grep -q "200" || { echo "WARN: 首页非200，需检查"; }
curl -sk -m 10 -o /dev/null -w "记录页 %{http_code}\n" "${BASE}/records" | grep -q "200" || { echo "FAIL: 记录页异常"; exit 1; }
# 公网 chunks 特征：从 records 页 HTML 提取一个 JS chunk 实测新逻辑上线
CHUNK_URL=$(grep -o '/_next/static/chunks/[^"]*\.js' "$RELEASE_DIR/records/index.html" | head -1)
if [ -n "$CHUNK_URL" ]; then
  curl -sk -m 10 "${BASE}${CHUNK_URL}" | grep -q "records/save" && echo "公网 chunks 记录保存链路特征 OK" || echo "WARN: 首 chunk 未含特征（多文件分布，服务端门禁已过）"
fi
# v25.0.72/73 回归
curl -sk -m 10 -o /dev/null -w "正骨页 %{http_code}\n" "${BASE}/zhongyi/zhenggu" | grep -q "200" || { echo "FAIL: 正骨专区回归异常"; exit 1; }
curl -sk -m 10 "${BASE}/tools/shouji-haoma-nengliang.html" | grep -q '手机号码数字能量分析' && echo "phase9 SEO 页回归 OK" || { echo "FAIL: phase9 回归丢失"; exit 1; }
curl -sk -m 10 "${BASE}/api/health" | grep -q '"success"' && echo "API health OK（本批零后端变更）" || echo "WARN: API health 异常"

echo ""
echo "DEPLOY_DONE ${VERSION}（Web 记录保存修复上线；下一步：APK 2071 重建 + records fixture 后端链路验收）"
