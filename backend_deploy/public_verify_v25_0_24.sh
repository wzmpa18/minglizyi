#!/bin/bash
# v25.0.24 公网全量验证：核心页面 + 新功能页面 + API
BASE=https://yandaoguoxue.yandao.vip
echo "=== 版本标识 ==="
curl -s $BASE/version.json | head -4
echo ""
echo "=== 页面状态（跟随跳转后最终码）==="
for P in / /academy /academy/learn /academy/factory /academy/orgs /admin/loc /yixue/ziwei /yixue/bazi /zhongyi /zhongyi/wenzhen /zhongyi/exam/practice /discover /social /profile /invite; do
  CODE=$(curl -sL -o /dev/null -w '%{http_code}' "$BASE$P")
  echo "$CODE $P"
done
echo ""
echo "=== API ==="
for A in /api/health /api/social/circles; do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE$A")
  echo "$CODE $A"
done
echo ""
echo "=== 圈层接口数据 ==="
curl -s $BASE/api/social/circles | head -c 500; echo
echo ""
echo "=== ICP 备案（footer）==="
curl -sL $BASE/ | grep -o '粤ICP备[0-9]*号-[0-9A-Z]*' | head -1
echo ""
echo "=== 学外语隔离（应 404）==="
curl -s -o /dev/null -w '%{http_code}\n' $BASE/xuewaiyu/
