#!/bin/bash
# v25.0.86 SEO修复批次推送：全量URL → 百度队列 + IndexNow
set -u
REL="/root/yandaoguoxue/current"
LIST="/root/seo_v86_urls.txt"

echo "=== [1] 从线上sitemap构建全量URL清单 ==="
grep -oE '<loc>[^<]+</loc>' "$REL/sitemap.xml" | sed 's/<loc>//;s|</loc>||' > "$LIST"
echo "URL总数: $(grep -c . "$LIST")"

echo "=== [2] 百度推送队列追加（去重） ==="
QUEUE="/root/backend-auth/data/baidu_push_queue.txt"
BEFORE=$(grep -c . "$QUEUE")
while IFS= read -r u; do
  grep -qxF "$u" "$QUEUE" || echo "$u" >> "$QUEUE"
done < "$LIST"
AFTER=$(grep -c . "$QUEUE")
echo "队列: $BEFORE -> $AFTER（新增 $((AFTER-BEFORE))）"

echo "=== [3] 立即推送百度（cron续推） ==="
bash /root/backend-auth/scripts/baidu_multi_push.sh 2>&1 | tail -6

echo "=== [4] IndexNow 全量推送（Bing/360/头条） ==="
bash /root/indexnow_push.sh yandaoguoxue.yandao.vip 6adb2132052f4657a159f7302971f5c2 "$LIST" 2>&1 | tail -6

echo "=== DONE v25.0.86 SEO PUSH ==="
