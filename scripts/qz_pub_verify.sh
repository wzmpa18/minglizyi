#!/bin/bash
# 公网最终验证：七政学习页/排盘页渲染内容 + 关键页面状态码
B=https://yandaoguoxue.yandao.vip

echo "== 状态码 =="
for p in "academy/yixue/qizheng/" "yixue/qizheng/" "" "records/" "academy/yixue/"; do
  printf "%-28s -> " "/$p"
  curl -sk -m 10 -o /dev/null -w "%{http_code}\n" "$B/$p"
done

echo ""
echo "== 七政学习页 HTML 指纹 =="
curl -sk -m 10 "$B/academy/yixue/qizheng/" -o /tmp/qz_learn.html
echo "size: $(wc -c < /tmp/qz_learn.html)"
grep -o '七政四余' /tmp/qz_learn.html | head -1
echo "JS chunks 引用数: $(grep -o 'chunks/[a-z0-9_-]*\.js' /tmp/qz_learn.html | sort -u | wc -l)"

echo ""
echo "== 公网 API 数据可用性（学习页实际数据源） =="
curl -sk -m 10 "$B/api/academy/knowledge?track=yixue&category=%E4%B8%83%E6%94%BF%E5%9B%9B%E4%BD%99&limit=1000" -o /tmp/qz_api.json
echo "size: $(wc -c < /tmp/qz_api.json)"
node -e 'const d=require("/tmp/qz_api.json");console.log("success:",d.success,"points:",d.points?d.points.length:0)'

echo ""
echo "== version.json =="
curl -sk -m 10 "$B/version.json"
