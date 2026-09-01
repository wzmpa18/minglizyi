#!/bin/bash
set -e
cd /root/yandaoguoxue-source
git fetch origin main >/dev/null 2>&1 || true
git reset --hard origin/main
echo "源码仓: $(git log --oneline -1)"
cp -f backend_deploy/wechatOfficialAccountRoutes.js /www/yandaoguoxue-backend/wechatOfficialAccountRoutes.js
# .env 增加 OAuth 开关（未认证期 false；认证后改 true）
if ! grep -q '^WECHAT_OA_OAUTH_ENABLED=' /www/yandaoguoxue-backend/.env; then
  echo 'WECHAT_OA_OAUTH_ENABLED=false' >> /www/yandaoguoxue-backend/.env
fi
grep '^WECHAT_OA_OAUTH_ENABLED=' /www/yandaoguoxue-backend/.env
pm2 restart yandaoguoxue-backend --update-env >/dev/null 2>&1
sleep 3
echo "--- /me 状态 ---"
curl -s http://127.0.0.1:3001/api/wechat/official/me
echo ""
echo "--- /oauth/authorize 应302回跳原页(不进微信) ---"
curl -s -o /dev/null -w "HTTP %{http_code} -> Location: %{redirect_url}\n" "http://127.0.0.1:3001/api/wechat/official/oauth/authorize?redirect=https%3A%2F%2Fyandaoguoxue.yandao.vip%2Ftools%2F"
echo "--- PM2 ---"
pm2 list | grep yandaoguoxue-backend
