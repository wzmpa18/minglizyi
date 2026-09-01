#!/bin/bash
# 后端部署验证：语法检查 + PM2重启 + 路由挂载确认
cd /www/yandaoguoxue-backend
FAIL=0
for f in wechatOaDb wechatTokenManager wechatOfficialAccountEngine wechatContentEngine wechatDraftService wechatContentScheduler wechatOfficialAccountRoutes server; do
  if ! node --check "$f.js"; then echo "SYNTAX_FAIL_$f"; FAIL=1; fi
done
[ $FAIL -eq 0 ] && echo "SYNTAX_OK_ALL"
pm2 restart yandaoguoxue-backend --update-env >/dev/null 2>&1
sleep 5
echo "===PM2 状态==="
pm2 list | grep yandaoguoxue-backend
echo "===微信路由挂载日志==="
pm2 logs yandaoguoxue-backend --lines 60 --nostream 2>/dev/null | grep -E "微信服务号|wechat" | tail -5
echo "===表创建验证==="
node -e "const{getDb}=require('./wechatOaDb');const t=getDb().prepare(\"SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'wechat_%'\").all().map(r=>r.name);console.log('TABLES('+t.length+'):',t.join(', '))"
