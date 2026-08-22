#!/bin/bash
set -e
cd /root/yandaoguoxue-source
git checkout -- public/version.json 2>/dev/null || true
git pull --ff-only origin main 2>&1 | tail -1

echo "=== 同步后端文件 ==="
cp backend_deploy/commissionRoutes.js backend_deploy/commissionEngine.js backend_deploy/adminUnifiedRoutes.js backend_deploy/wechatTransfer.js backend_deploy/paymentRoutes.js /www/yandaoguoxue-backend/
cp backend_deploy/p8_commission_e2e_test.js /www/yandaoguoxue-backend/
echo "synced"

echo "=== 重启后端 ==="
pm2 restart yandaoguoxue-backend --update-env >/dev/null 2>&1
sleep 4
pm2 list | grep yandao | head -2

echo "=== 运行 P8 分佣引擎集成测试 ==="
cd /www/yandaoguoxue-backend
node p8_commission_e2e_test.js
TEST_EXIT=$?

echo "=== 后端健康检查 ==="
sleep 2
curl -s -o /dev/null -w '/api/health: %{http_code}\n' https://yandaoguoxue.yandao.vip/api/health
exit $TEST_EXIT
