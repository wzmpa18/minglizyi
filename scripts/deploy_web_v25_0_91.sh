#!/bin/bash
set -e
REL=/root/yandaoguoxue/releases/v25.0.91
rm -rf "$REL"
mkdir -p "$REL"
tar -xzf /root/yandaoguoxue/out_v25_0_91.tar.gz -C "$REL"
COUNT=$(find "$REL" -type f | wc -l)
echo "files=$COUNT"
cat "$REL/version.json"
test -f "$REL/index.html" || { echo "FATAL index.html missing"; exit 1; }
grep -rq "立即注册" "$REL/_next/static/chunks/" && echo "MARK-立即注册 OK"
grep -rq "应用权限说明" "$REL/privacy/index.html" && echo "MARK-应用权限说明 OK"
grep -rq "排盘记录" "$REL/_next/static/chunks/" && echo "MARK-排盘记录 OK"
grep -rq "命主档案库" "$REL/_next/static/chunks/" && echo "MARK-命主档案库 OK"
grep -rq "AI智能解读需联网使用" "$REL/_next/static/chunks/" && echo "MARK-离线边界提示 OK"
grep -rql "loginWithWechat|wxLogin" "$REL/_next/static/chunks/" && { echo "FATAL wechat login remnant"; exit 1; } || echo "NO-WECHAT-LOGIN OK"
ln -sfn "$REL" /root/yandaoguoxue/current
echo "current -> $(readlink -f /root/yandaoguoxue/current)"
rm -rf /www/server/nginx/cache/* 2>/dev/null || true
nginx -s reload 2>/dev/null || true
sleep 2
echo "===== WEB v25.0.91 DEPLOY DONE ====="
