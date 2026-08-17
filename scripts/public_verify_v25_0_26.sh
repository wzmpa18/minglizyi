#!/bin/bash
# v25.0.26 公网验证：版本号 + 页面状态码 + ICP 备案 + 学外语隔离
D="https://yandaoguoxue.yandao.vip"
echo "--version--"
curl -s "$D/version.json"
echo
echo "--pages--"
for p in / /yixue/ziwei /yixue/astro /yixue/wannianli /yixue/zeri /yixue/wannianli/events /admin/tools /admin/sources /admin/alerts /admin/consult /membership /privacy /messages/system /profile/consult/provider-apply /login; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$D$p")
  echo "$code $p"
done
echo "--ICP--"
curl -s "$D/" | grep -o '粤ICP备2026071165号-4A' | head -1
echo "miit_links=$(curl -s "$D/" | grep -c 'miit.gov.cn')"
echo "--isolation--"
curl -s -o /dev/null -w '%{http_code}\n' "$D/xuewaiyu/"
echo "--three-end--"
echo "server HEAD: $(cd /root/yandaoguoxue-source && git rev-parse --short HEAD)"
echo "current release: $(readlink -f /root/yandaoguoxue/current)"
