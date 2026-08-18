#!/bin/bash
# v25.0.33 后端热更：socialApiRoutes.js（敏感词拦截留痕/100条滚动覆盖/图片消息/功能总开关）+ social_feature_config.json
set -e
BE=/www/yandaoguoxue-backend
SRC=/root/yandaoguoxue-source

echo "--- [1] 备份当前后端文件 ---"
cp "$BE/socialApiRoutes.js" "$BE/socialApiRoutes.js.bak_v25_0_33_pre"
ls -la "$BE/socialApiRoutes.js.bak_v25_0_33_pre"

echo "--- [2] 部署新版 socialApiRoutes.js（来自已同步源码 f6dd6f2） ---"
cp "$SRC/backend_deploy/socialApiRoutes.js" "$BE/socialApiRoutes.js"
node --check "$BE/socialApiRoutes.js" && echo "node --check OK"

echo "--- [3] 部署功能开关配置 ---"
mkdir -p "$BE/data"
cp "$SRC/backend_deploy/data/social_feature_config.json" "$BE/data/social_feature_config.json"
cat "$BE/data/social_feature_config.json"

echo "--- [4] 重启后端 ---"
pm2 restart yandaoguoxue-backend
sleep 3
pm2 list | grep yandaoguoxue-backend

echo "--- [5] 本机接口健康检查 ---"
curl -s -o /dev/null -w "social/posts(GET游客): %{http_code}\n" http://127.0.0.1:3001/api/social/posts
curl -s -o /dev/null -w "social/messages/private(GET未登录): %{http_code}\n" http://127.0.0.1:3001/api/social/messages/private/123
curl -s -o /dev/null -w "health: %{http_code}\n" http://127.0.0.1:3001/api/health

echo "--- [6] 公网接口检查 ---"
curl -s -o /dev/null -w "公网 social/posts: %{http_code}\n" https://yandaoguoxue.yandao.vip/api/social/posts
curl -s -o /dev/null -w "公网 messages/private(未登录401): %{http_code}\n" https://yandaoguoxue.yandao.vip/api/social/messages/private/123

echo "===== BACKEND HOTUPDATE v25.0.33 COMPLETE ====="
