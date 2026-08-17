#!/bin/bash
set -euo pipefail
cd /root/yandaoguoxue-source
echo "HEAD: $(git log --oneline -1)"
echo "git status (tracked changes):"
git status --short | grep -v '^??' | head -10 || echo "  (none)"
git checkout -- public/version.json 2>/dev/null || git restore public/version.json 2>/dev/null || true
echo "after restore: $(cat public/version.json | tr -d '\n')"
grep -q "v25.0.25" public/version.json || { echo "STILL-OLD: force write"; printf '{\n  "buildId": "v25.0.25_D20260817",\n  "version": "v25.0.25",\n  "builtAt": "2026-08-17T11:30:00.000Z"\n}\n' > public/version.json; }
cp public/version.json /root/yandaoguoxue/releases/v25.0.25/version.json
rm -rf /www/server/nginx/cache/* 2>/dev/null || true
nginx -s reload 2>/dev/null || true
sleep 2
echo "PUBLIC: $(curl -sk https://yandaoguoxue.yandao.vip/version.json | tr -d '\n')"
echo "FIX2-DONE"
