#!/bin/bash
# v25.0.22 后端接口验证
KEY=$(grep -oP 'ADMIN_API_KEY=\K.*' /www/yandaoguoxue-backend/.env 2>/dev/null)
if [ -z "$KEY" ]; then KEY=$(grep -oP 'ADMIN_API_KEY=\K[^"'\'']+' /www/yandaoguoxue-backend/ecosystem.config.js 2>/dev/null); fi
echo "KEY_LEN: ${#KEY}"
echo '--- loc config ---'
curl -s -H "x-admin-key: $KEY" http://127.0.0.1:3001/api/academy/loc/config | head -c 500; echo
echo '--- gen-tasks ---'
curl -s -H "x-admin-key: $KEY" http://127.0.0.1:3001/api/academy/gen-tasks | head -c 250; echo
echo '--- loc dashboard ---'
curl -s -H "x-admin-key: $KEY" http://127.0.0.1:3001/api/academy/loc/dashboard | head -c 400; echo
echo '--- orgs all ---'
curl -s -H "x-admin-key: $KEY" -H "Authorization: Bearer none" "http://127.0.0.1:3001/api/academy/orgs?all=1" | head -c 200; echo
