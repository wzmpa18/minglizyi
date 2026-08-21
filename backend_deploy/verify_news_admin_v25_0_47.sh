#!/bin/bash
# v25.0.47 资讯管理接口验证（真实密钥版，服务器执行）
set -e
BASE="http://127.0.0.1:3001"
KEY=$(grep ADMIN_API_KEY /www/yandaoguoxue-backend/.env | cut -d= -f2)

echo "--- [1] 公开读取（默认16条） ---"
curl -s "$BASE/api/news/public?page=1&pageSize=50" | python3 -c "import sys,json; d=json.load(sys.stdin); print('success:', d['success'], '| total:', d['total'], '| first:', d['news'][0]['title'][:30])"

echo "--- [2] 管理列表（真实密钥） ---"
curl -s "$BASE/api/admin/news" -H "Authorization: Bearer $KEY" | python3 -c "import sys,json; d=json.load(sys.stdin); print('success:', d['success'], '| total:', d['data']['total'])"

echo "--- [3] 合规拦截：全网第一 ---"
curl -s -X POST "$BASE/api/admin/news" -H "Content-Type: application/json" -H "Authorization: Bearer $KEY" -d '{"title":"全网第一的中医课程","summary":"测试合规拦截摘要超过十个字","source":"测试","sourceUrl":"https://example.com/x","publishedAt":"2026-08-21T00:00:00Z","category":"zhongyi"}' | head -c 150; echo ""

echo "--- [4] 合规拦截：根治 ---"
curl -s -X POST "$BASE/api/admin/news" -H "Content-Type: application/json" -H "Authorization: Bearer $KEY" -d '{"title":"这个方子能根治百病","summary":"测试合规拦截摘要超过十个字","source":"测试","sourceUrl":"https://example.com/y","publishedAt":"2026-08-21T00:00:00Z","category":"zhongyi"}' | head -c 150; echo ""

echo "--- [5] 正常新增+删除往返 ---"
RESP=$(curl -s -X POST "$BASE/api/admin/news" -H "Content-Type: application/json" -H "Authorization: Bearer $KEY" -d '{"title":"部署验证临时条目","summary":"这是一条部署验证的临时资讯摘要","source":"部署验证","sourceUrl":"https://example.com/verify","publishedAt":"2026-08-21T12:00:00Z","category":"yixue"}')
NEWID=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
echo "created: $NEWID"
curl -s "$BASE/api/news/public?category=yixue" | python3 -c "import sys,json; d=json.load(sys.stdin); print('public-first-id:', d['news'][0]['id'])"
curl -s -X DELETE "$BASE/api/admin/news/$NEWID" -H "Authorization: Bearer $KEY" | head -c 100; echo ""
curl -s "$BASE/api/admin/news" -H "Authorization: Bearer $KEY" | python3 -c "import sys,json; d=json.load(sys.stdin); print('after-delete total:', d['data']['total'])"

echo "--- [6] 公网域名验证 ---"
curl -s "http://yandaoguoxue.yandao.vip/api/news/public?page=1&pageSize=2" | python3 -c "import sys,json; d=json.load(sys.stdin); print('public-domain success:', d['success'], '| count:', len(d['news']))"

echo "VERIFY-NEWS-ADMIN-DONE"
