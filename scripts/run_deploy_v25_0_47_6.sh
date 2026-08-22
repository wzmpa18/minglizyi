#!/bin/bash
set -e
cd /root/yandaoguoxue-source
git checkout -- public/version.json 2>/dev/null || true
git checkout -- package-lock.json 2>/dev/null || true
git pull --ff-only origin main 2>&1 | tail -2
echo "=== 源码已更新到 $(git rev-parse --short HEAD)，开始执行部署脚本 ==="
bash scripts/deploy_release_v25_0_47_6.sh
