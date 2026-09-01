#!/bin/bash
# v25.0.76 Web 构建（SOP 第2-3步）
set -e
cd /root/yandaoguoxue-source
git checkout -- public/version.json 2>/dev/null || true
git checkout -- package-lock.json 2>/dev/null || true
git fetch origin main 2>&1 | tail -1 || true
git reset --hard origin/main
echo "===源码已同步到 $(git rev-parse --short HEAD)==="
export PATH=/usr/local/node-v22/bin:$PATH
node -v
echo "===开始构建（v25.0.76）==="
npm run build 2>&1 | tail -8
echo "===构建产物==="
cat out/version.json
