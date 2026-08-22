#!/bin/bash
# v25.0.47_4 线上修复内容验证（在服务器执行）
set -e
CUR=/root/yandaoguoxue/current
echo "=== [1] 群聊页右上角按钮 z-[10001]（公网HTML） ==="
curl -sL https://yandaoguoxue.yandao.vip/groups/chat/index.html -o /tmp/gc.html
grep -o 'z-\[10001\]' /tmp/gc.html | sort | uniq -c || echo "NOTE: z-index多为运行时class合并,查chunks"

echo "=== [2] BottomNav 群聊隐藏逻辑（公网chunks） ==="
NAVFILE=$(grep -rl 'app-bottom-nav' $CUR/_next/static/chunks/ | head -1)
echo "BottomNav chunk: $NAVFILE"
grep -o '"/friends/chat"\|"/groups/chat"' "$NAVFILE" | sort | uniq -c

echo "=== [3] 群聊页输入栏贴底公式（公网chunks） ==="
CHATFILE=$(grep -rl '群聊 ' $CUR/_next/static/chunks/ | head -1)
grep -rl 'safe-area-inset-bottom, 0px' $CUR/_next/static/chunks/ | head -3

echo "=== [4] z-[10001] 在公网chunks ==="
grep -rl 'z-\[10001\]' $CUR/_next/static/chunks/ | head -3

echo "=== [5] 公网version.json ==="
curl -sL https://yandaoguoxue.yandao.vip/version.json

echo ""
echo "=== [6] 公网API健康 ==="
curl -sL -o /dev/null -w '%{http_code}' https://yandaoguoxue.yandao.vip/api/health
echo ""
echo "===== VERIFY v25.0.47_4 LIVE DONE ====="
