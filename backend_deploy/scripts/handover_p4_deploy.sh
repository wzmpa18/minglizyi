#!/bin/bash
# ============================================================================
# FINAL-HANDOVER-20260826 ??1???v2???????????????P4?
# v2???pipefail????? / bundle??? / HEAD??????????????
# ============================================================================
set -e
set -o pipefail
SRC=/root/yandaoguoxue-source
REL=/root/yandaoguoxue/releases
BE=/www/yandaoguoxue-backend
TS=$(date +%H%M%S)
EXPECT_HEAD="2defc78"
EXPECT_VER="v25.0.61"

echo "===== 1. bundle???????????? ====="
cd $SRC
git bundle verify /tmp/yandao_v2561b.bundle 2>&1 | grep -E 'ref|okay' | head -2

echo ""
echo "===== 2. ???????? ====="
git checkout -- public/version.json 2>/dev/null || true
git checkout -- package-lock.json 2>/dev/null || true
git pull /tmp/yandao_v2561b.bundle main 2>&1 | tail -2
HEAD_NOW=$(git rev-parse --short HEAD)
echo "SERVER_SOURCE_HEAD: $HEAD_NOW"
if [ "$HEAD_NOW" != "$EXPECT_HEAD" ]; then echo "FATAL: HEAD=$HEAD_NOW ??=$EXPECT_HEAD?????"; exit 1; fi

echo ""
echo "===== 3. ??Web ====="
bash build.sh 2>&1 | tail -4
VER_NOW=$(grep -o '"version": "[^"]*"' out/version.json | head -1)
echo "??????: $VER_NOW"
if ! echo "$VER_NOW" | grep -q "$EXPECT_VER"; then echo "FATAL: ?????$EXPECT_VER?????"; exit 1; fi

echo ""
echo "===== 4. ?????????????? ====="
GATE_HITS=$(grep -coE '????|?????|????' out/admin/dashboard/index.html 2>/dev/null || true)
if [ "${GATE_HITS:-0}" -ge 2 ]; then
  echo "PASS: admin/dashboard ?????????($GATE_HITS?)"
else
  echo "FATAL: admin/dashboard ????????????($GATE_HITS)?????"
  exit 1
fi

echo ""
echo "===== 5. Web??????????v25.0.60??? ====="
rm -rf $REL/v25.0.61
mkdir -p $REL/v25.0.61
cp -a out/. $REL/v25.0.61/
ln -sfn $REL/v25.0.61 /root/yandaoguoxue/current
echo "current -> $(readlink /root/yandaoguoxue/current)"

echo ""
echo "===== 6. Backend????????+??+reload? ====="
cp $BE/adminUnifiedRoutes.js $BE/adminUnifiedRoutes.js.bak_p4_$TS
cp $SRC/backend_deploy/adminUnifiedRoutes.js $BE/adminUnifiedRoutes.js
pm2 reload yandaoguoxue-backend --update-env 2>&1 | tail -1
sleep 2

echo ""
echo "===== 7. ???? ====="
curl -sk -o /dev/null -w 'web??: %{http_code}\n' https://yandaoguoxue.yandao.vip/
curl -sk -o /dev/null -w 'admin?: %{http_code}\n' https://yandaoguoxue.yandao.vip/admin/
curl -sk -o /dev/null -w 'dashboard?(???): %{http_code}\n' https://yandaoguoxue.yandao.vip/admin/dashboard/
curl -sk -o /dev/null -w 'APK??: %{http_code}\n' -r 0-1023 https://yandaoguoxue.yandao.vip/app-download/latest.apk
curl -sk https://yandaoguoxue.yandao.vip/version.json
echo ""
KEY=$(grep -oP 'ADMIN_API_KEY=\K.*' $BE/.env | head -1)
curl -sk -m 10 -H "Authorization: Bearer $KEY" https://yandaoguoxue.yandao.vip/api/admin/unified/overview | python3 -c "
import json,sys
d=json.load(sys.stdin)
b=d.get('data',{}).get('backup',{})
h=d.get('data',{}).get('health',{})
print('  web version:', d.get('data',{}).get('version'))
print('  health.backup:', h.get('backup'))
print('  backup.gateOk:', b.get('gateOk'), '| offsite:', b.get('offsite'), '| ageHours:', b.get('ageHours'))
print('  usersDb.lastSuccess:', (b.get('usersDb') or {}).get('lastSuccess'))
print('  socialDb.lastSuccess:', (b.get('socialDb') or {}).get('lastSuccess'))
print('  lastDrill:', b.get('lastDrill'))
ok = h.get('backup')=='ok' and b.get('gateOk')==True
print('  P4??:', 'PASS' if ok else 'FAIL')
"
echo ""
echo "P4_DEPLOY_DONE"
