#!/bin/bash
# v25.0.75 Web 构建（SOP 第2-3步：源码同步 + 生产构建）
set -e
cd /root/yandaoguoxue-source
git checkout -- public/version.json 2>/dev/null || true
git checkout -- package-lock.json 2>/dev/null || true
git fetch origin main 2>&1 | tail -1 || true
git reset --hard origin/main
echo "===源码已同步到 $(git rev-parse --short HEAD)==="
export PATH=/usr/local/node-v22/bin:$PATH
which node && node -v
echo "===开始构建（v25.0.75）==="
npm run build 2>&1 | tail -15
echo "===构建产物==="
ls out/ | head -5
cat out/version.json
