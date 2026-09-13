#!/bin/bash
set +e
echo "===== baidu_multi_push.sh 核心逻辑 ====="
grep -E "curl|token|api|push|http" /root/backend-auth/scripts/baidu_multi_push.sh | head -12
echo ""
echo "===== 执行主动推送 ====="
bash /root/seo_push_38.sh 2>&1
