#!/bin/bash
# 微信服务号 .env 配置脚本（一次性，用后留在服务器无害；Token/AESKey 存 root-only 文件）
set -e
cd /www/yandaoguoxue-backend
TOKEN=$(tr -dc 'a-zA-Z0-9' < /dev/urandom | head -c 24)
AESKEY=$(tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 43)
sed -i '/^WECHAT_OA_/d' .env
printf '\n# ===== 微信服务号（FINAL-SEAL-10 v25.0.75）=====\n' >> .env
printf 'WECHAT_OA_APP_ID=wxa4dbabb60590614c\n' >> .env
printf 'WECHAT_OA_APP_SECRET=\n' >> .env
printf 'WECHAT_OA_TOKEN=%s\n' "$TOKEN" >> .env
printf 'WECHAT_OA_ENCODING_AES_KEY=%s\n' "$AESKEY" >> .env
printf 'WECHAT_OA_ENABLED=true\n' >> .env
printf 'WECHAT_OA_CALLBACK_URL=https://yandaoguoxue.yandao.vip/api/wechat/official/callback\n' >> .env
printf 'WECHAT_OA_JS_DOMAIN=yandaoguoxue.yandao.vip\n' >> .env
printf 'WECHAT_OA_OAUTH_REDIRECT=https://yandaoguoxue.yandao.vip\n' >> .env
printf 'WECHAT_OA_COVER_PATH=/www/yandaoguoxue-backend/data/wechat-cover.jpg\n' >> .env
printf 'WECHAT_OA_TOKEN=%s\nWECHAT_OA_ENCODING_AES_KEY=%s\nWECHAT_OA_CALLBACK_URL=https://yandaoguoxue.yandao.vip/api/wechat/official/callback\n' "$TOKEN" "$AESKEY" > /root/woa_platform_config.txt
chmod 600 /root/woa_platform_config.txt
echo "ENV_DONE token_len=${#TOKEN} aeskey_len=${#AESKEY}"
echo "--- .env WECHAT_OA 条目数: $(grep -c '^WECHAT_OA_' .env)"
