#!/bin/bash
# v25.0.76 原子切换 + 公网校验（SOP 第6-7步）
set -e
ln -sfn /root/yandaoguoxue/releases/v25.0.76 /root/yandaoguoxue/current
rm -rf /root/yandaoguoxue/current/.nginx_cache 2>/dev/null || true
nginx -s reload
sleep 2
echo "===切换完成 current -> $(readlink /root/yandaoguoxue/current)==="
echo "===公网校验：version.json==="
curl -s "https://yandaoguoxue.yandao.vip/version.json"
echo ""
echo "===公网校验：首页指纹==="
curl -s "https://yandaoguoxue.yandao.vip/" | grep -o 'v25\.0\.76_D[0-9]*' | head -1
echo "===OAuth防护公网验证==="
curl -s "https://yandaoguoxue.yandao.vip/api/wechat/official/me"
echo ""
curl -s -o /dev/null -w "authorize(未开通应302回跳原页) HTTP %{http_code} -> %{redirect_url}\n" "https://yandaoguoxue.yandao.vip/api/wechat/official/oauth/authorize?redirect=https%3A%2F%2Fyandaoguoxue.yandao.vip%2Ftools%2F"
echo "===回调验签公网==="
curl -s -o /dev/null -w "callback(坏签名应403) HTTP %{http_code}\n" "https://yandaoguoxue.yandao.vip/api/wechat/official/callback?signature=x&timestamp=1&nonce=2&echostr=3"
