#!/bin/bash
B=https://yandaoguoxue.yandao.vip
echo "== 未认证响应原文 =="
curl -sk -m 10 "$B/api/academy/knowledge?track=yixue&category=%E4%B8%83%E6%94%BF%E5%9B%9B%E4%BD%99&limit=3"
echo ""
echo "== 响应头 =="
curl -sk -m 10 -I "$B/api/academy/knowledge?track=yixue&category=%E4%B8%83%E6%94%BF%E5%9B%9B%E4%BD%99&limit=3" | head -8
echo "== 服务器后端直连（绕过nginx） =="
curl -s -m 10 "http://127.0.0.1:3001/api/academy/knowledge?track=yixue&category=%E4%B8%83%E6%94%BF%E5%9B%9B%E4%BD%99&limit=3" | head -c 400
