#!/bin/bash
# ============================================================================
# v25.0.67 发布：SEO 程序化搜索增长引擎首批落地（SUPP-01 差异化优势强化）
#   ① 13个C端差异化关键词静态落地页 + 1个B端行业方案参考页 + 4个目录索引页
#     部署于 /tools/ /learn/ /app/ /b/（独立静态HTML，nginx try_files 直出）
#   ② robots.txt + sitemap.xml（主站+SEO页 18 URL）
#   ③ 本批零后端变更、零APP代码变更（纯静态增量），无需 PM2 重启
# 流程：tar 解包 → 内容门禁（版本烧录+SEO页+差异化要素+IP泄漏） → current 原子切流
# ============================================================================
set -euo pipefail
VERSION="v25.0.67"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"
TAR="/root/yandaoguoxue/out_v25_0_67.tar.gz"
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

echo "=== [3] 内容门禁（v25.0.67 SEO 批次） ==="
fail=0
V=$(grep -o '"version": *"[^"]*"' "$RELEASE_DIR/version.json" || true)
echo "version.json: $V"
echo "$V" | grep -q "v25.0.67" || { echo "FAIL: buildId 未烧录 v25.0.67"; fail=1; }

# SEO 18 页齐全（13 C端 + 1 B端 + 4 索引）
SEO_FILES="tools/wuguang-paipan.html tools/mianfei-bazi-paipan.html tools/paipan-mianfei.html tools/buyong-huiyuan-paipan.html tools/paipan-nage-haoyong.html tools/youmeiyou-wuguang-paipan.html learn/mianfei-zhongyi-tiku.html learn/mianfei-zhongyi-shuati.html learn/zhongyi-dianji-mianfei.html app/meiyou-guanggao-guoxue.html app/shenme-guoxue-meiguanggao.html app/quangongneng-guoxue.html app/gongneng-quan-guoxue.html b/yixue-zhongyi-fangan.html tools/index.html learn/index.html app/index.html b/index.html"
MISSING=0
for f in $SEO_FILES; do
  [ -f "$RELEASE_DIR/$f" ] || { echo "FAIL: SEO 页缺失 $f"; MISSING=1; fail=1; }
done
[ "$MISSING" = "0" ] && echo "SEO 18 页齐全"

# 差异化要素抽查（SUPP-01 三项强制的源文件级校验）
grep -q '无广告的排盘软件_言道国学APP' "$RELEASE_DIR/tools/wuguang-paipan.html" || { echo "FAIL: 差异化标题公式缺失"; fail=1; }
grep -q '为什么选择言道国学' "$RELEASE_DIR/tools/wuguang-paipan.html" || { echo "FAIL: 固定模块缺失"; fail=1; }
grep -q '无广告体验，立即下载' "$RELEASE_DIR/tools/wuguang-paipan.html" || { echo "FAIL: 差异化CTA缺失"; fail=1; }
grep -q '我们的优势' "$RELEASE_DIR/b/yixue-zhongyi-fangan.html" || { echo "FAIL: B端优势模块缺失"; fail=1; }
grep -q '粤ICP备2026071165号-4A' "$RELEASE_DIR/tools/wuguang-paipan.html" || { echo "FAIL: ICP备案悬挂缺失"; fail=1; }
grep -q '<urlset' "$RELEASE_DIR/sitemap.xml" 2>/dev/null || { echo "FAIL: sitemap 缺失"; fail=1; }
grep -q 'Sitemap:' "$RELEASE_DIR/robots.txt" 2>/dev/null || { echo "FAIL: robots.txt 未指向 sitemap"; fail=1; }
grep -q 'app-download/latest.apk' "$RELEASE_DIR/tools/wuguang-paipan.html" || { echo "FAIL: APK唯一下载源缺失"; fail=1; }

# 主站回归：Next.js 产物仍在（切流不影响既有站点）
[ -f "$RELEASE_DIR/index.html" ] || { echo "FAIL: 主站 index.html 缺失"; fail=1; }
[ -d "$RELEASE_DIR/_next/static" ] || { echo "FAIL: _next 静态资源缺失"; fail=1; }
[ -f "$RELEASE_DIR/offline/index.html" ] || { echo "FAIL: v25.0.66 /offline 页面回归丢失"; fail=1; }

# IP 泄漏检查
IPLEAK=$(grep -rlE '82\.156\.228\.87|8\.155\.23\.111' "$RELEASE_DIR/tools" "$RELEASE_DIR/learn" "$RELEASE_DIR/app" "$RELEASE_DIR/b" 2>/dev/null | wc -l || true)
[ "$IPLEAK" = "0" ] || { echo "FAIL: SEO页IP泄漏 $IPLEAK 个文件"; fail=1; }

[ "$fail" = "0" ] || { echo "FATAL: 内容门禁未通过"; exit 1; }
echo "内容门禁全过（版本烧录+SEO18页+差异化三要素+ICP+主站回归+IP零泄漏）"

echo "=== [4] current 原子切流（v25.0.66 → ${VERSION}） ==="
PREV=$(readlink /root/yandaoguoxue/current)
echo "prev: $PREV"
ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
CURR=$(readlink /root/yandaoguoxue/current)
echo "current: $CURR"
[ "$CURR" = "$RELEASE_DIR" ] || { echo "FATAL: 切流失败"; exit 1; }

echo "=== [5] 热路径立检（切换后无回滚需求即完成） ==="
sleep 1
curl -sk -m 10 "${BASE}/version.json" | grep -q "v25.0.67" && echo "version.json → v25.0.67 OK" || { echo "FAIL: 公网版本未切换"; exit 1; }
curl -sk -m 10 -o /dev/null -w "首页 %{http_code}\n" "${BASE}/" | grep -q "200" || { echo "WARN: 首页非200，需检查" ; }
curl -sk -m 10 "${BASE}/api/health" | grep -q '"success"' && echo "API health OK（本批零后端变更）" || echo "WARN: API health 异常"

echo ""
echo "DEPLOY_DONE ${VERSION}（详细公网验证见 verify_seo_v25_0_67.sh）"
