#!/bin/bash
# 排盘记录保存链路核验：API 鉴权 + 数据库真实入库量
B="https://yandaoguoxue.yandao.vip"
echo "=== 1) API 链路 ==="
curl -s -o /dev/null -w "POST /api/auth/records/save(未登录) HTTP %{http_code}（应401）\n" -X POST "$B/api/auth/records/save" -H "Content-Type: application/json" -d "{}"
curl -s -o /dev/null -w "GET  /records 页面 HTTP %{http_code}\n" -L "$B/records/"
echo "=== 2) 数据库真实入库情况 ==="
sqlite3 /root/backend-auth/data/yandao_users.db "SELECT COUNT(*) AS 总记录数 FROM user_records" 2>/dev/null
sqlite3 /root/backend-auth/data/yandao_users.db "SELECT record_type, COUNT(*) AS n FROM user_records GROUP BY record_type ORDER BY n DESC LIMIT 12" 2>/dev/null
echo "--- 最近5条（时间+类型，不含隐私内容）---"
sqlite3 /root/backend-auth/data/yandao_users.db "SELECT substr(created_at,1,16), record_type, user_id FROM user_records ORDER BY rowid DESC LIMIT 5" 2>/dev/null
