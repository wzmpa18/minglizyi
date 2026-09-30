#!/usr/bin/env bash
# 发布即推广闭环：把各站 sitemap 中的 URL 同步进百度 / IndexNow 推送队列
# 依赖：/root/backend-auth/data/baidu_push_sites.env（SITE_PARAM|QUEUE_FILE）
# 说明：IndexNow 复用同一队列文件（见 indexnow_sites.env），故入百度队列即覆盖 IndexNow。
# 准入：仅收录 HTTP 200 且非 noindex 的页面，避免把错误/屏蔽页推给搜索引擎。
# 用法：在国学站源码目录执行  bash scripts/seo-fix/promote_new_pages.sh
set -e
export PATH=/usr/local/bin:$PATH
cd /root/yandaoguoxue-source 2>/dev/null || true
LOG=/root/backup/promote.log
mkdir -p /root/backup
echo "[$(date '+%F %T')] promote_new_pages start" >> "$LOG"

ENV=/root/backend-auth/data/baidu_push_sites.env
[ -f "$ENV" ] || { echo "[$(date '+%F %T')] ERR: $ENV missing" >> "$LOG"; exit 0; }

while IFS='|' read -r SITE QUEUE; do
  SITE=$(echo "$SITE" | xargs)
  QUEUE=$(echo "$QUEUE" | xargs)
  case "$SITE" in ''|\#*) continue;; esac
  [ -f "$QUEUE" ] || touch "$QUEUE"
  # 取该站 sitemap 的 URL 列表（国学站优先读刚构建的 out/sitemap.xml）
  if [ "$SITE" = "https://yandaoguoxue.yandao.vip" ] && [ -f out/sitemap.xml ]; then
    URLS=$(grep -oP '(?<=<loc>)[^<]+' out/sitemap.xml)
  else
    URLS=$(curl -s --max-time 25 "https://$SITE/sitemap.xml" | grep -oP '(?<=<loc>)[^<]+')
  fi
  added=0; skipped=0
  for u in $URLS; do
    [ -z "$u" ] && continue
    if grep -qxF "$u" "$QUEUE" 2>/dev/null; then continue; fi
    code=$(curl -s -o /tmp/promote_body.html -w '%{http_code}' --max-time 25 "$u")
    if [ "$code" != "200" ]; then echo "  SKIP(non-200 $code): $u" >> "$LOG"; skipped=$((skipped+1)); continue; fi
    if grep -qi 'noindex' /tmp/promote_body.html; then echo "  SKIP(noindex): $u" >> "$LOG"; skipped=$((skipped+1)); continue; fi
    echo "$u" >> "$QUEUE"
    added=$((added+1))
  done
  echo "[$(date '+%F %T')] $SITE: +$added new, skip $skipped (queue $(wc -l < "$QUEUE" 2>/dev/null) lines)" >> "$LOG"
done < "$ENV"
echo "[$(date '+%F %T')] promote_new_pages done" >> "$LOG"
