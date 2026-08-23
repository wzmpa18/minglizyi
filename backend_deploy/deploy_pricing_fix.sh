#!/bin/bash
set -euo pipefail
COMMIT="1f037c2"
SRC=/root/yandaoguoxue-source
BACKEND=/www/yandaoguoxue-backend

cd "$SRC"
git checkout -- . 2>/dev/null || true
git reset --hard "$COMMIT"
echo "[1] source at: $(git log --oneline -1 | head -c 80)"

cp "$SRC/backend_deploy/publicPricingRoutes.js" "$BACKEND/publicPricingRoutes.js"
node --check "$BACKEND/publicPricingRoutes.js" || { echo "SYNTAX FAIL"; exit 1; }
echo "[2] copy + syntax OK"

pm2 restart yandaoguoxue-backend --update-env
sleep 4
curl -s -o /dev/null -w "[3] health: %{http_code}\n" http://127.0.0.1:3001/api/health
echo "[4] pricing verify:"
curl -s https://yandaoguoxue.yandao.vip/api/public/pricing | python3 -c "
import json,sys
d=json.load(sys.stdin)['data']
plans=d['membershipPlans']
print('  plans:', [(p['level'],p['price']) for p in plans])
bi=d.get('batchInterpret')
print('  batch:', bi)
feat=[f for p in plans for f in p.get('features',[]) if '9.9' in f or '折' in f or '免费' in f]
print('  features sample:', feat[:5])
"
echo "PRICING-FIX-DONE"
