#!/bin/bash
BASE='https://yandaoguoxue.yandao.vip'
for p in academy academy/orgs academy/factory admin/loc profile discover featured invite; do
  code=$(curl -skL -o /dev/null -w '%{http_code}' "$BASE/$p")
  echo "PAGE $p: $code"
done
echo '--- page content markers ---'
curl -skL "$BASE/admin/loc" | grep -o '学习运营中心' | head -1
curl -skL "$BASE/academy/orgs" | grep -o '机构专区' | head -1
curl -skL "$BASE/academy/factory" | grep -o '点击选择记事本文件' | head -1
echo '--- redirect target sample ---'
curl -skI "$BASE/academy" | grep -i '^location' || true
