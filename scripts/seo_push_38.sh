#!/bin/bash
# 主动提交38个SEO新页：sitemap验证 + 百度队列追加 + 立即推送 + IndexNow全量
set -u
BASE="https://yandaoguoxue.yandao.vip"
REL="/root/yandaoguoxue/current"

echo "=== [1] sitemap 公网验证 ==="
SM_PUB=$(curl -sk -m 10 "$BASE/sitemap.xml" | grep -c '<loc>')
echo "公网 sitemap URL数: $SM_PUB"
grep -q '<loc>'"$BASE/zixue/"'</loc>' <(curl -sk -m 10 "$BASE/sitemap.xml") && echo "/zixue/ hub 已在线上" || echo "FAIL /zixue/ hub 缺失"
grep -q '<loc>'"$BASE/yikao/"'</loc>' <(curl -sk -m 10 "$BASE/sitemap.xml") && echo "/yikao/ hub 已在线上" || echo "FAIL /yikao/ hub 缺失"

echo "=== [2] 构建38条URL清单 ==="
grep -oE '<loc>[^<]+(zixue|yikao|qizheng-study)[^<]*</loc>' "$REL/sitemap.xml" | sed 's/<loc>//;s/<\/loc>//' > /root/seo_new_urls.txt
echo "https://yandaoguoxue.yandao.vip/zixue/" >> /root/seo_new_urls.txt
echo "https://yandaoguoxue.yandao.vip/yikao/" >> /root/seo_new_urls.txt
sort -u /root/seo_new_urls.txt -o /root/seo_new_urls.txt
N=$(grep -c . /root/seo_new_urls.txt)
echo "URL清单: $N 条（应=38）"

echo "=== [3] 百度队列追加（去重） ==="
QUEUE="/root/backend-auth/data/baidu_push_queue.txt"
BEFORE=$(grep -c . "$QUEUE")
while IFS= read -r u; do
  grep -qxF "$u" "$QUEUE" || echo "$u" >> "$QUEUE"
done < /root/seo_new_urls.txt
AFTER=$(grep -c . "$QUEUE")
echo "队列: $BEFORE -> $AFTER（新增 $((AFTER-BEFORE))）"

echo "=== [4] 立即推送百度（首批10条，cron明日续推） ==="
bash /root/backend-auth/scripts/baidu_multi_push.sh 2>&1 | tail -8

echo "=== [5] IndexNow 全量38条 ==="
bash /root/indexnow_push.sh yandaoguoxue.yandao.vip 6adb2132052f4657a159f7302971f5c2 /root/seo_new_urls.txt 2>&1 | tail -4

echo "=== DONE ==="
