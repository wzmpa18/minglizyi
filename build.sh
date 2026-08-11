#!/bin/bash
# 自动化构建脚本 - v20.4
# 处理 output:export 与 API 路由的冲突
# 用法: bash build.sh

set -e

echo "[Build] Step 1: Temporarily moving API routes..."
if [ -d "src/app/api" ]; then
  mv src/app/api src/app/_api_disabled
  echo "[Build] API routes moved to _api_disabled"
fi

echo "[Build] Step 2: Building Next.js static export..."
npm run build

echo "[Build] Step 3: Restoring API routes..."
if [ -d "src/app/_api_disabled" ]; then
  mv src/app/_api_disabled src/app/api
  echo "[Build] API routes restored"
fi

echo "[Build] Step 4: Verifying output..."
if [ -f "out/index.html" ]; then
  echo "[Build] SUCCESS: out/index.html exists"
  ls -la out/ | head -10
else
  echo "[Build] ERROR: out/index.html not found!"
  exit 1
fi

echo "[Build] Complete!"
