#!/bin/bash
# ============================================================================
# v25.0.68 发布：易学四工具上线（专业罗盘/七政四余/立极尺/鲁班尺丁兰尺）
#   ① Web：/yixue/compass /yixue/qizheng /yixue/liji /yixue/luban 四页 + 入口
#     统一 Share Engine / 埋点 / 客户记录已接入；纯前端增量，零后端变更
#   ② 本批无 PM2 重启需求（静态导出产物，nginx try_files 直出）
# 流程：tar 解包 → 内容门禁（版本烧录+四工具页+入口+主站回归+IP泄漏）
#       → current 原子切流（v25.0.67 → v25.0.68）
# ============================================================================
set -euo pipefail
VERSION="v25.0.68"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"
TAR="/root/yandaoguoxue/out_v25_0_68.tar.gz"
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

echo "=== [3] 内容门禁（v25.0.68 四工具批次） ==="
fail=0
V=$(grep -o '"version": *"[^"]*"' "$RELEASE_DIR/version.json" || true)
echo "version.json: $V"
echo "$V" | grep -q "v25.0.68" || { echo "FAIL: buildId 未烧录 v25.0.68"; fail=1; }

# 四工具页齐全（Next.js 静态导出，trailingSlash 目录式）
TOOL_FILES="yixue/compass/index.html yixue/qizheng/index.html yixue/liji/index.html yixue/luban/index.html yixue/index.html"
MISSING=0
for f in $TOOL_FILES; do
  [ -f "$RELEASE_DIR/$f" ] || { echo "FAIL: 工具页缺失 $f"; MISSING=1; fail=1; }
done
[ "$MISSING" = "0" ] && echo "四工具页 + 易学入口页齐全"

# 工具页内容抽查（引擎烧录：字符串字面量在 chunk 中可 grep，变量名会被混淆不可用）
grep -rq "WMM2025" "$RELEASE_DIR/_next/static/chunks/" || { echo "FAIL: WMM2025 磁偏角引擎未烧录"; fail=1; }
grep -rq "七政四余引擎" "$RELEASE_DIR/_next/static/chunks/" || { echo "FAIL: 七政引擎版本未烧录"; fail=1; }
grep -rq "ruler-engine-v1.0.0" "$RELEASE_DIR/_next/static/chunks/" || { echo "FAIL: 鲁班尺引擎版本未烧录"; fail=1; }
grep -rq "liji-engine-v1.0.0" "$RELEASE_DIR/_next/static/chunks/" || { echo "FAIL: 立极尺引擎版本未烧录"; fail=1; }
# 易学入口含四工具链接
for kw in "yixue/compass" "yixue/qizheng" "yixue/liji" "yixue/luban"; do
  grep -q "$kw" "$RELEASE_DIR/yixue/index.html" || { echo "FAIL: 入口缺 $kw"; fail=1; }
done
echo "入口四链接齐全"

# v25.0.67 回归：SEO 18 页仍在（切流不影响既有批次）
SEO_FILES="tools/wuguang-paipan.html tools/mianfei-bazi-paipan.html tools/paipan-mianfei.html tools/buyong-huiyuan-paipan.html tools/paipan-nage-haoyong.html tools/youmeiyou-wuguang-paipan.html learn/mianfei-zhongyi-tiku.html learn/mianfei-zhongyi-shuati.html learn/zhongyi-dianji-mianfei.html app/meiyou-guanggao-guoxue.html app/shenme-guoxue-meiguanggao.html app/quangongneng-guoxue.html app/gongneng-quan-guoxue.html b/yixue-zhongyi-fangan.html tools/index.html learn/index.html app/index.html b/index.html"
SEO_MISS=0
for f in $SEO_FILES; do
  [ -f "$RELEASE_DIR/$f" ] || { echo "FAIL: SEO 回归页缺失 $f"; SEO_MISS=1; fail=1; }
done
[ "$SEO_MISS" = "0" ] && echo "SEO 18 页回归齐全"

# 主站回归
[ -f "$RELEASE_DIR/index.html" ] || { echo "FAIL: 主站 index.html 缺失"; fail=1; }
[ -d "$RELEASE_DIR/_next/static" ] || { echo "FAIL: _next 静态资源缺失"; fail=1; }
[ -f "$RELEASE_DIR/offline/index.html" ] || { echo "FAIL: /offline 页面回归丢失"; fail=1; }
grep -q "<urlset" "$RELEASE_DIR/sitemap.xml" 2>/dev/null || { echo "FAIL: sitemap 缺失"; fail=1; }
grep -q "Sitemap:" "$RELEASE_DIR/robots.txt" 2>/dev/null || { echo "FAIL: robots.txt 未指向 sitemap"; fail=1; }

# IP 泄漏检查（新增 yixue 目录一并覆盖）
IPLEAK=$(grep -rlE '82\.156\.228\.87|8\.155\.23\.111' "$RELEASE_DIR/tools" "$RELEASE_DIR/learn" "$RELEASE_DIR/app" "$RELEASE_DIR/b" 2>/dev/null | wc -l || true)
[ "$IPLEAK" = "0" ] || { echo "FAIL: SEO页IP泄漏 $IPLEAK 个文件"; fail=1; }

[ "$fail" = "0" ] || { echo "FATAL: 内容门禁未通过"; exit 1; }
echo "内容门禁全过（版本烧录+四工具页+入口+SEO18页回归+主站回归+IP零泄漏）"

echo "=== [4] current 原子切流（v25.0.67 → ${VERSION}） ==="
PREV=$(readlink /root/yandaoguoxue/current)
echo "prev: $PREV"
ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
CURR=$(readlink /root/yandaoguoxue/current)
echo "current: $CURR"
[ "$CURR" = "$RELEASE_DIR" ] || { echo "FATAL: 切流失败"; exit 1; }

echo "=== [5] 热路径立检 ==="
sleep 1
curl -sk -m 10 "${BASE}/version.json" | grep -q "v25.0.68" && echo "version.json → v25.0.68 OK" || { echo "FAIL: 公网版本未切换"; exit 1; }
for p in "yixue/compass/" "yixue/qizheng/" "yixue/liji/" "yixue/luban/"; do
  CODE=$(curl -sk -m 10 -o /dev/null -w "%{http_code}" "${BASE}/${p}")
  echo "${p} → ${CODE}"
  [ "$CODE" = "200" ] || { echo "FAIL: 工具页非200"; exit 1; }
done
curl -sk -m 10 -o /dev/null -w "首页 %{http_code}\n" "${BASE}/" | grep -q "200" || { echo "WARN: 首页非200，需检查"; }
curl -sk -m 10 "${BASE}/api/health" | grep -q '"success"' && echo "API health OK（本批零后端变更）" || echo "WARN: API health 异常"

echo ""
echo "DEPLOY_DONE ${VERSION}（详细公网验证见 verify_v25_0_68.sh）"
