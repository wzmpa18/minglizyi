#!/bin/bash
# v25.0.75 原子切换 + 公网校验（SOP 第6-7步）
set -e
ln -sfn /root/yandaoguoxue/releases/v25.0.75 /root/yandaoguoxue/current
rm -rf /root/yandaoguoxue/current/.nginx_cache 2>/dev/null || true
find /root/yandaoguoxue/current -name "*.html" -newer /root/yandaoguoxue/releases/v25.0.75/version.json -exec touch {} + 2>/dev/null || true
nginx -s reload
sleep 2
echo "===切换完成 current -> $(readlink /root/yandaoguoxue/current)==="
echo "===公网校验：首页版本==="
curl -s "https://yandaoguoxue.yandao.vip/version.json" | head -5
echo ""
echo "===公网校验：版本指纹==="
curl -s -o /dev/null -w "首页 HTTP %{http_code}\n" "https://yandaoguoxue.yandao.vip/"
curl -s "https://yandaoguoxue.yandao.vip/" | grep -o 'v25\.0\.[0-9]*_D[0-9]*' | head -2
echo "===后台页面（公众号运营路由）==="
curl -s -o /dev/null -w "/admin/wechat-oa HTTP %{http_code}\n" "https://yandaoguoxue.yandao.vip/admin/wechat-oa"
echo "===微信回调公网仍正常==="
curl -s -o /dev/null -w "callback(无签名) HTTP %{http_code}（应403）\n" "https://yandaoguoxue.yandao.vip/api/wechat/official/callback"
curl -s -o /dev/null -w "/me HTTP %{http_code}\n" "https://yandaoguoxue.yandao.vip/api/wechat/official/me"
echo "===v25.0.74 回归：核心接口==="
curl -s -o /dev/null -w "health HTTP %{http_code}\n" "https://yandaoguoxue.yandao.vip/api/health"
curl -s -o /dev/null -w "records-save(未登录应401) HTTP %{http_code}\n" -X POST "https://yandaoguoxue.yandao.vip/api/auth/records/save" -H "Content-Type: application/json" -d "{}"
curl -s -o /dev/null -w "latest.apk HTTP %{http_code}\n" -r 0-99 "https://yandaoguoxue.yandao.vip/app-download/latest.apk"
curl -s -o /dev/null -w "phase9页 HTTP %{http_code}\n" "https://yandaoguoxue.yandao.vip/academy/learn"
