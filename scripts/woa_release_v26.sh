#!/bin/bash
# v25.0.76 发布（SOP 第4-6步）
set -e
REL=/root/yandaoguoxue/releases/v25.0.76
mkdir -p "$REL"
cp -a /root/yandaoguoxue-source/out/. "$REL/"
echo "===发布完成==="
cat "$REL/version.json"
echo "===当前版本（切换前）==="
readlink /root/yandaoguoxue/current
echo "===部署门禁==="
if [ -f /root/yandaoguoxue/deploy_standard.sh ]; then
  bash /root/yandaoguoxue/deploy_standard.sh 2>&1 | tail -30
else
  echo "deploy_standard.sh 不存在，跳过（手动门禁）"
fi
