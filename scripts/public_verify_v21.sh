#!/bin/bash
# v25.0.21 公网 API 验证
set -uo pipefail
KEY=$(grep '^ADMIN_API_KEY=' /www/yandaoguoxue-backend/.env | cut -d= -f2)
BASE="https://yandaoguoxue.yandao.vip/api/academy"

echo "=== [1] 公网题库：神农本草经 ==="
curl -s --max-time 20 -G "$BASE/questions" --data-urlencode "track=zhongyi" --data-urlencode "category=倪海厦·神农本草经" --data-urlencode "status=approved" -H "x-admin-key: $KEY" | python3 -c "import json,sys; d=json.load(sys.stdin); qs=d.get('questions',[]); print('count:', len(qs)); [print(' -', q['type'], q['stem'][:40]) for q in qs[:3]]" 2>/dev/null || echo "FAIL"

echo "=== [2] 公网题库：易学各类目 ==="
for c in 八字命理 奇门遁甲 紫微斗数 小六壬 梅花易数 大六壬 玄空风水 七政四余 易经推命 堪舆地脉; do
  n=$(curl -s --max-time 20 -G "$BASE/questions" --data-urlencode "track=yixue" --data-urlencode "category=$c" --data-urlencode "status=approved" -H "x-admin-key: $KEY" | python3 -c "import json,sys; print(len(json.load(sys.stdin).get('questions',[])))" 2>/dev/null)
  echo "  $c: ${n:-0} 题"
done

echo "=== [3] 公网知识点：神农本草经 ==="
curl -s --max-time 20 -G "$BASE/knowledge" --data-urlencode "track=zhongyi" --data-urlencode "category=倪海厦·神农本草经" -H "x-admin-key: $KEY" | python3 -c "import json,sys; d=json.load(sys.stdin); print('approved kp visible:', len(d.get('points',[])))" 2>/dev/null || echo "FAIL"

echo "=== [4] 公网页面 ICP + 版本 ==="
echo "ICP hits: $(curl -sk --max-time 15 https://yandaoguoxue.yandao.vip/ | grep -c '粤ICP备2026071165号-4A')"
echo "ICP link: $(curl -sk --max-time 15 https://yandaoguoxue.yandao.vip/ | grep -o 'https://beian.miit.gov.cn/' | head -1)"
echo "version: $(curl -sk --max-time 15 https://yandaoguoxue.yandao.vip/version.json | grep buildId)"

echo "=== [5] AI 额度接口（未登录应业务错误非 5xx） ==="
curl -s --max-time 20 -X POST https://yandaoguoxue.yandao.vip/api/ai/chat -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"ping"}]}' -o /dev/null -w "http:%{http_code}\n"
