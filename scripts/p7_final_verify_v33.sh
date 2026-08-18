#!/bin/bash
# v25.0.33 最终收尾核验：残留用户清零 + 开关配置复位 + 公网页面/API 全绿
echo "--- [1] 残留测试用户核验（应为0） ---"
node -e "
const Database = require('/www/yandaoguoxue-backend/node_modules/better-sqlite3');
const db = new Database('/root/backend-auth/data/yandao_users.db', { readonly: true });
const n = db.prepare(\"SELECT COUNT(*) AS c FROM users WHERE phone LIKE '198%' OR phone LIKE '1990000002%'\").get();
console.log('残留测试用户数:', n.c);
db.close();
"
echo "--- [2] 开关配置复位核验 ---"
grep -o '"friends_add_enabled": [a-z]*\|"private_chat_enabled": [a-z]*\|"posts_enabled": [a-z]*\|"comments_enabled": [a-z]*\|"groups_enabled": [a-z]*' /www/yandaoguoxue-backend/data/social_feature_config.json
echo "--- [3] 公网关键页面 ---"
for p in yixue/ziwei friends friends/chat/placeholder profile/edit friend invite academy index; do
  printf '%s: %s\n' "$p" "$(curl -skL -o /dev/null -w '%{http_code}' https://yandaoguoxue.yandao.vip/$p)"
done
echo "--- [4] 公网API与版本 ---"
printf 'api/health: %s\n' "$(curl -sk -o /dev/null -w '%{http_code}' https://yandaoguoxue.yandao.vip/api/health)"
printf 'version.json: %s\n' "$(curl -sk https://yandaoguoxue.yandao.vip/version.json)"
echo "--- [5] 紫微公网页面内容标记 ---"
curl -sk https://yandaoguoxue.yandao.vip/yixue/ziwei.html | grep -c '命宫\|紫微' | head -1
echo "--- [6] ICP与免责声明 ---"
printf 'ICP备案: %s\n' "$(curl -sk https://yandaoguoxue.yandao.vip/index.html | grep -c '粤ICP备2026071165号')"
echo "--- [7] pm2与磁盘 ---"
pm2 list | grep yandaoguoxue-backend
df -h / | tail -1
echo "===== FINAL VERIFY v25.0.33 COMPLETE ====="
