#!/bin/bash
# v25.0.75 发布（SOP 第4-6步：发布版本 + 部署门禁 + 原子切换）
set -e
REL=/root/yandaoguoxue/releases/v25.0.75
mkdir -p "$REL"
cp -a /root/yandaoguoxue-source/out/. "$REL/"
echo "===发布完成==="
ls "$REL/version.json" && cat "$REL/version.json"
echo "===当前版本（切换前）==="
readlink /root/yandaoguoxue/current
echo "===部署门禁==="
if [ -f /root/yandaoguoxue/deploy_standard.sh ]; then
  bash /root/yandaoguoxue/deploy_standard.sh 2>&1 | tail -25
else
  echo "deploy_standard.sh 不存在，跳过（手动门禁）"
fi
