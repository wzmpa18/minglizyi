#!/bin/bash
set -euo pipefail
VERSION="v25.0.79"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"
TAR="/root/yandaoguoxue/out_v25_0_79.tar.gz"
BASE="https://yandaoguoxue.yandao.vip"

echo "=== [0] server check ==="
PUBIP=$(curl -s -m 8 ifconfig.me || true)
echo "public ip: ${PUBIP}"
[ "${PUBIP}" = "82.156.228.87" ] || { echo "FATAL: wrong server"; exit 1; }

test -f "$TAR" || { echo "FATAL: tar missing"; exit 1; }
echo "=== [1] tar OK ($(du -sh "$TAR" | cut -f1)) ==="

echo "=== [2] unpack to ${RELEASE_DIR} ==="
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
tar -xzf "$TAR" -C "$RELEASE_DIR" --strip-components=1
echo "files: $(find "$RELEASE_DIR" -type f | wc -l)"

echo "=== [3] content gates (v25.0.79 App Store compliance) ==="
fail=0
V=$(grep -o '"version": *"[^"]*"' "$RELEASE_DIR/version.json" || true)
echo "version.json: $V"
echo "$V" | grep -q "v25.0.79" || { echo "FAIL: buildId not v25.0.79"; fail=1; }

CH_GUSHU=$(grep -rl "钦定协纪辨方书" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
echo "chunks 黄历古籍注解: $CH_GUSHU"
[ "$CH_GUSHU" -ge 1 ] || { echo "FAIL: 黄历古籍注解缺失"; fail=1; }

CH_PHONE=$(grep -rl "手机号码解析" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
echo "chunks 手机号码解析: $CH_PHONE"
[ "$CH_PHONE" -ge 1 ] || { echo "FAIL: 手机号码解析入口缺失"; fail=1; }

CH_CAR=$(grep -rl "车牌号民俗解读" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
echo "chunks 车牌号民俗解读: $CH_CAR"
[ "$CH_CAR" -ge 1 ] || { echo "FAIL: 车牌号民俗解读入口缺失"; fail=1; }

CH_AI=$(grep -rl "仅用于国学、历法学术研究" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
echo "chunks AI免责声明: $CH_AI"
[ "$CH_AI" -ge 1 ] || { echo "FAIL: AI免责声明缺失"; fail=1; }

# 首页/黄历/手机/车牌 静态 HTML 不得出现"吉凶"
for page in index.html yixue/huangli/index.html yixue/phone/index.html yixue/carplate/index.html; do
  if grep -q "吉凶" "$RELEASE_DIR/$page" 2>/dev/null; then
    echo "FAIL: $page 含「吉凶」"; fail=1
  else
    echo "OK: $page 无「吉凶」"
  fi
done

grep -q "罗盘临时位置" "$RELEASE_DIR/privacy/index.html" || { echo "FAIL: 隐私政策罗盘位置声明缺失"; fail=1; }
echo "OK: 隐私政策含罗盘临时位置声明"

# 主站回归
[ -f "$RELEASE_DIR/records/index.html" ] || { echo "FAIL: records 页缺失"; fail=1; }
grep -q '我的排盘记录' "$RELEASE_DIR/records/index.html" || { echo "FAIL: records 页标题指纹缺失"; fail=1; }
[ -f "$RELEASE_DIR/index.html" ] || { echo "FAIL: 主站 index.html 缺失"; fail=1; }
[ -d "$RELEASE_DIR/_next/static" ] || { echo "FAIL: _next 静态资源缺失"; fail=1; }
[ -f "$RELEASE_DIR/zhongyi/zhenggu/index.html" ] || { echo "FAIL: 正骨专区回归丢失"; fail=1; }
grep -q '正骨专区' "$RELEASE_DIR/zhongyi/index.html" || { echo "FAIL: 中医主页正骨入口回归丢失"; fail=1; }
grep -rlq 'zhongyi_zhenggu' "$RELEASE_DIR/_next/static/chunks/" || { echo "FAIL: 正骨工具ID回归丢失"; fail=1; }
grep -rlq '查看学习资料' "$RELEASE_DIR/_next/static/chunks/" || { echo "FAIL: 七政学习链接回归丢失"; fail=1; }
[ -f "$RELEASE_DIR/offline/index.html" ] || { echo "FAIL: /offline 页回归丢失"; fail=1; }
TOOLS_N=$(ls "$RELEASE_DIR/tools/"*.html | wc -l)
echo "out/tools HTML: $TOOLS_N"
[ "$TOOLS_N" = "42" ] || { echo "FAIL: tools 页数非 42"; fail=1; }
grep -q '<urlset' "$RELEASE_DIR/sitemap.xml" || { echo "FAIL: sitemap 缺失"; fail=1; }
SM_N=$(grep -c '<loc>' "$RELEASE_DIR/sitemap.xml")
[ "$SM_N" = "59" ] || { echo "FAIL: sitemap URL 数非 59"; fail=1; }
echo "sitemap $SM_N URL OK"

IPLEAK=$(grep -rlE '82\.156\.228\.87|8\.155\.23\.111' "$RELEASE_DIR/tools" "$RELEASE_DIR/records" 2>/dev/null | wc -l || true)
[ "$IPLEAK" = "0" ] || { echo "FAIL: IP泄漏 $IPLEAK 个文件"; fail=1; }

# v25.0.77 iOS 支付门禁回归
CH_PAYTIP=$(grep -rl "iOS 版暂未开放购买功能" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
echo "chunks iOS payment-off tip: $CH_PAYTIP"
[ "$CH_PAYTIP" -ge 1 ] || { echo "FAIL: iOS payment gate tip missing"; fail=1; }

[ "$fail" = "0" ] || { echo "FATAL: 内容门禁未通过"; exit 1; }
echo "内容门禁全过（v25.0.79 整改烧录 + 主站回归 + IP零泄漏）"

echo "=== [4] current 原子切流（v25.0.77 → ${VERSION}） ==="
PREV=$(readlink /root/yandaoguoxue/current)
echo "prev: $PREV"
ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
CURR=$(readlink /root/yandaoguoxue/current)
echo "current: $CURR"
[ "$CURR" = "$RELEASE_DIR" ] || { echo "FATAL: 切流失败"; exit 1; }

echo "=== [5] 热路径立检 ==="
sleep 1
curl -sk -m 10 "${BASE}/version.json" | grep -q "v25.0.79" && echo "version.json → v25.0.79 OK" || { echo "FAIL: 公网版本未切换"; exit 1; }
curl -sk -m 10 "${BASE}/" | grep -q "吉凶" && { echo "FAIL: 公网首页含「吉凶」"; exit 1; } || echo "公网首页无「吉凶」 OK"
curl -sk -m 10 "${BASE}/yixue/huangli" | grep -q "吉凶" && { echo "FAIL: 公网黄历页含「吉凶」"; exit 1; } || echo "公网黄历页无「吉凶」 OK"
curl -sk -m 10 "${BASE}/yixue/huangli" | grep -q "钦定协纪辨方书" && echo "公网黄历古籍注解 OK" || { echo "FAIL: 公网黄历古籍注解缺失"; exit 1; }
curl -sk -m 10 "${BASE}/privacy" | grep -q "罗盘临时位置" && echo "公网隐私政策罗盘声明 OK" || { echo "FAIL: 公网隐私政策缺罗盘声明"; exit 1; }
curl -sk -m 10 -o /dev/null -w "首页 %{http_code}\n" "${BASE}/" | grep -q "200" || { echo "WARN: 首页非200"; }
curl -sk -m 10 -o /dev/null -w "记录页 %{http_code}\n" "${BASE}/records" | grep -q "200" || { echo "FAIL: 记录页异常"; exit 1; }
curl -sk -m 10 -o /dev/null -w "正骨页 %{http_code}\n" "${BASE}/zhongyi/zhenggu" | grep -q "200" || { echo "FAIL: 正骨专区回归异常"; exit 1; }
curl -sk -m 10 "${BASE}/api/health" | grep -q '"success"' && echo "API health OK" || echo "WARN: API health 异常"

echo ""
echo "DEPLOY_DONE ${VERSION}（App Store 提审整改上线：入口改名+黄历古籍定性+吉凶清零+AI合规）"
