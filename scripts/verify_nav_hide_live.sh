#!/bin/bash
set -e
CUR=/root/yandaoguoxue/current
echo "=== BottomNav隐藏逻辑（JS chunks中 /groups/chat 路径判断） ==="
for f in $(grep -rl 'app-bottom-nav' $CUR/_next/static/chunks/ --include='*.js'); do
  echo "FILE: $(basename $f)"
  grep -o 'pathname==="/groups/chat"\|pathname === "/groups/chat"\|"/groups/chat"' "$f" | sort | uniq -c
done
echo "=== 群聊页chunk确认（含失效提示+按钮z-index同文件） ==="
grep -l '该旧群记录已失效' $CUR/_next/static/chunks/*.js | while read f; do
  echo "群聊chunk: $(basename $f)"
  grep -o 'z-.\[10001\]' "$f" | sort | uniq -c
done
