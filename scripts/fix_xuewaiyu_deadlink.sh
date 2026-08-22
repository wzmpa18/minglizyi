#!/bin/bash
# FINAL-RC-04 官网下载防错：言道学外语 APK 不在本服务器(旧服务器不可达)，死链改「敬请期待」
set -e
SITE=/www/yandao-company

echo "--- [1] 备份 yandao.html ---"
cp -f $SITE/app-pages/yandao.html /root/backup/archive/www_site_20260822/

echo "--- [2] index.html / app.html: 学外语卡片死链改敬请期待(样式与本地生活卡片一致) ---"
for f in $SITE/index.html $SITE/app.html; do
  sed -i 's|<a href="/app-download/yandao/yandao-xuewaiyu-v1.0.apk" class="download">下载APP</a>|<span class="coming">敬请期待</span>|g' "$f"
done

echo "--- [3] app-pages/yandao.html: hero下载按钮改敬请期待 ---"
sed -i 's|<a href="/app-download/yandao/yandao-xuewaiyu-v1.0.apk" class="download-btn">下载 Android 版</a>|<span class="download-btn" style="cursor:default;opacity:.75;">敬请期待</span>|g' $SITE/app-pages/yandao.html

echo "--- [4] 校验: xuewaiyu 死链应全部清零 ---"
echo "[index.html 残留]"; grep -c xuewaiyu $SITE/index.html || true
echo "[app.html 残留]"; grep -c xuewaiyu $SITE/app.html || true
echo "[yandao.html 残留]"; grep -c xuewaiyu $SITE/app-pages/yandao.html || true

echo "--- [5] 全站 apk 链接盘点(应只剩 v25.0.47) ---"
grep -rhoE 'href="[^"]*\.apk"' $SITE/ | sort | uniq -c

echo "--- [6] reload nginx(刷 open_file_cache) ---"
nginx -t 2>&1 | tail -1
nginx -s reload
sleep 1

echo "--- [7] 公网验证 ---"
curl -s -H 'Cache-Control: no-cache' "https://www.yandao.vip/?_t=$(date +%s)" | grep -c 'xuewaiyu' || echo '首页 xuewaiyu 已清零'
curl -s -H 'Cache-Control: no-cache' "https://www.yandao.vip/?_t=$(date +%s)" | grep -oE 'href="[^"]*\.apk"' | sort -u
curl -s -o /dev/null -w '学外语页: %{http_code}\n' "https://www.yandao.vip/app-pages/yandao.html"
curl -s "https://www.yandao.vip/app-pages/yandao.html" | grep -c xuewaiyu || echo '学外语页 xuewaiyu 已清零'
