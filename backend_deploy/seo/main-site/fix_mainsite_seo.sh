#!/bin/bash
# ============================================================================
# 主站 www.yandao.vip robots.txt + sitemap.xml 修复
#   根因：官网为 SPA fallback（try_files → /index.html），robots.txt/sitemap.xml
#         请求返回 200 但内容是官网首页 HTML——百度/谷歌平台提交 sitemap 会失败。
#   方案：真实文件放入官网静态目录 /www/yandao-company/（nginx location / 的
#         try_files $uri 直接命中，无需改 nginx 配置），只收录实测 200 的页面。
# ============================================================================
set -e

SITE_DIR="/www/yandao-company"
BASE="https://www.yandao.vip"

echo "--- [1] 探测主站真实可达页面 ---"
PAGES="/ /app.html /app-pages/shenghuo.html /app-pages/yandao.html"
GOOD=""
for p in $PAGES; do
  code=$(curl -sk -o /dev/null -w '%{http_code}' "$BASE$p")
  echo "$p -> $code"
  [ "$code" = "200" ] && GOOD="$GOOD $p"
done
echo "可收录页面: $GOOD"

echo "--- [2] 写入 robots.txt ---"
cat > "$SITE_DIR/robots.txt" <<'EOR'
User-agent: *
Allow: /

Sitemap: https://www.yandao.vip/sitemap.xml
EOR
cat "$SITE_DIR/robots.txt"

echo "--- [3] 写入 sitemap.xml ---"
{
  echo '<?xml version="1.0" encoding="UTF-8"?>'
  echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
  TODAY=$(date +%F)
  for p in $GOOD; do
    case "$p" in
      /)       pri=1.0; freq=daily ;;
      /app.html) pri=0.8; freq=weekly ;;
      *)       pri=0.6; freq=monthly ;;
    esac
    echo "  <url><loc>${BASE}${p}</loc><changefreq>${freq}</changefreq><priority>${pri}</priority><lastmod>${TODAY}</lastmod></url>"
  done
  echo '</urlset>'
} > "$SITE_DIR/sitemap.xml"
cat "$SITE_DIR/sitemap.xml"

echo "--- [4] 公网内容级验证 ---"
R=$(curl -sk "$BASE/robots.txt")
echo "$R" | grep -q "Sitemap: https://www.yandao.vip/sitemap.xml" || { echo "FAIL: robots.txt 内容错误"; exit 1; }
echo "$R" | head -1 | grep -q "User-agent" || { echo "FAIL: robots.txt 仍为HTML"; exit 1; }
S=$(curl -sk "$BASE/sitemap.xml")
echo "$S" | grep -q "<urlset" || { echo "FAIL: sitemap.xml 仍为HTML"; exit 1; }
N=$(echo "$S" | grep -c "<loc>")
[ "$N" -ge 2 ] || { echo "FAIL: sitemap URL 数量异常 ($N)"; exit 1; }
CT_R=$(curl -sk -o /dev/null -w '%{content_type}' "$BASE/robots.txt")
CT_S=$(curl -sk -o /dev/null -w '%{content_type}' "$BASE/sitemap.xml")
echo "robots.txt Content-Type: $CT_R"
echo "sitemap.xml Content-Type: $CT_S"

echo "--- [5] apex 域名同样验证 ---"
curl -sk https://yandao.vip/robots.txt | head -1
curl -sk https://yandao.vip/sitemap.xml | head -2

echo "--- [6] 官网首页回归 ---"
C0=$(curl -sk -o /dev/null -w '%{http_code}' "$BASE/")
[ "$C0" = "200" ] || { echo "FAIL: 官网首页回归异常"; exit 1; }
echo "官网首页 200 OK"

echo ""
echo "===== 主站 robots.txt + sitemap.xml 修复完成（$N 个 URL 入图） ====="
