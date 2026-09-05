#!/bin/bash
set -euo pipefail
VERSION="v25.0.80"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"
TAR="/root/yandaoguoxue/out_v25_0_80.tar.gz"
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

echo "=== [3] content gates (v25.0.80 用户反馈六修复 + v25.0.79 合规回归) ==="
fail=0
V=$(grep -o '"version": *"[^"]*"' "$RELEASE_DIR/version.json" || true)
echo "version.json: $V"
echo "$V" | grep -q "v25.0.80" || { echo "FAIL: buildId not v25.0.80"; fail=1; }

# --- v25.0.80 新增四特征 ---
CH_GBB=$(grep -rl "data-global-back" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
echo "chunks 全局悬浮返回键: $CH_GBB"
[ "$CH_GBB" -ge 1 ] || { echo "FAIL: GlobalBackButton 缺失"; fail=1; }

CH_NEWS=$(grep -rl "noopener,noreferrer" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
echo "chunks NewsCard 外链跳转: $CH_NEWS"
[ "$CH_NEWS" -ge 1 ] || { echo "FAIL: NewsCard 跳转逻辑缺失"; fail=1; }

CH_CD=$(grep -rl "s后重发" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
echo "chunks 倒计时重置双页: $CH_CD"
[ "$CH_CD" -ge 2 ] || { echo "FAIL: register/forgot-password 倒计时页缺失"; fail=1; }

CH_FR=$(grep -rl "social/friends/list" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
echo "chunks friends 服务端列表: $CH_FR"
[ "$CH_FR" -ge 1 ] || { echo "FAIL: friends 服务端唯一事实源缺失"; fail=1; }

# --- v25.0.79 合规回归（提审整改必须保留） ---
CH_GUSHU=$(grep -rl "钦定协纪辨方书" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
echo "chunks 黄历古籍注解: $CH_GUSHU"
[ "$CH_GUSHU" -ge 1 ] || { echo "FAIL: 黄历古籍注解回归丢失"; fail=1; }

CH_PHONE=$(grep -rl "手机号码解析" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
echo "chunks 手机号码解析: $CH_PHONE"
[ "$CH_PHONE" -ge 1 ] || { echo "FAIL: 手机号码解析入口回归丢失"; fail=1; }

CH_AI=$(grep -rl "仅用于国学、历法学术研究" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
echo "chunks AI免责声明: $CH_AI"
[ "$CH_AI" -ge 1 ] || { echo "FAIL: AI免责声明回归丢失"; fail=1; }

for page in index.html yixue/huangli/index.html yixue/phone/index.html yixue/carplate/index.html; do
  if grep -q "吉凶" "$RELEASE_DIR/$page" 2>/dev/null; then
    echo "FAIL: $page 含「吉凶」"; fail=1
  else
    echo "OK: $page 无「吉凶」"
  fi
done

grep -q "罗盘临时位置" "$RELEASE_DIR/privacy/index.html" || { echo "FAIL: 隐私政策罗盘位置声明回归丢失"; fail=1; }
echo "OK: 隐私政策含罗盘临时位置声明"

# --- 主站回归 ---
[ -f "$RELEASE_DIR/records/index.html" ] || { echo "FAIL: records 页缺失"; fail=1; }
grep -q '我的排盘记录' "$RELEASE_DIR/records/index.html" || { echo "FAIL: records 页标题指纹缺失"; fail=1; }
grep -rlq 'records/save' "$RELEASE_DIR/_next/static/chunks/" || { echo "FAIL: 排盘保存链路回归丢失"; fail=1; }
[ -f "$RELEASE_DIR/index.html" ] || { echo "FAIL: 主站 index.html 缺失"; fail=1; }
[ -d "$RELEASE_DIR/_next/static" ] || { echo "FAIL: _next 静态资源缺失"; fail=1; }
[ -f "$RELEASE_DIR/zhongyi/zhenggu/index.html" ] || { echo "FAIL: 正骨专区回归丢失"; fail=1; }
grep -q '正骨专区' "$RELEASE_DIR/zhongyi/index.html" || { echo "FAIL: 中医主页正骨入口回归丢失"; fail=1; }
grep -rlq 'zhongyi_zhenggu' "$RELEASE_DIR/_next/static/chunks/" || { echo "FAIL: 正骨工具ID回归丢失"; fail=1; }
[ -f "$RELEASE_DIR/offline/index.html" ] || { echo "FAIL: /offline 页回归丢失"; fail=1; }
TOOLS_N=$(ls "$RELEASE_DIR/tools/"*.html | wc -l)
echo "out/tools HTML: $TOOLS_N"
[ "$TOOLS_N" = "42" ] || { echo "FAIL: tools 页数非 42"; fail=1; }
grep -q '<urlset' "$RELEASE_DIR/sitemap.xml" || { echo "FAIL: sitemap 缺失"; fail=1; }
SM_N=$(grep -c '<loc>' "$RELEASE_DIR/sitemap.xml")
[ "$SM_N" = "69" ] || { echo "FAIL: sitemap URL 数非 69"; fail=1; }
echo "sitemap $SM_N URL OK"

# --- v25.0.80 易学学习中心（IOS-4.3B 教育转型核心新增） ---
for pg in academy/yixue/index.html academy/yixue/yixue_basic/index.html academy/yixue/bazi/index.html academy/yixue/ziwei/index.html academy/yixue/qizheng/index.html academy/yixue/qimen/index.html academy/yixue/liuyao/index.html academy/yixue/meihua/index.html academy/yixue/daliuren/index.html academy/yixue/calendar/index.html; do
  [ -f "$RELEASE_DIR/$pg" ] || { echo "FAIL: 易学学习中心页缺失 $pg"; fail=1; }
done
echo "易学学习中心 10 页 OK"
CH_YX=$(grep -rl "易学学习中心" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
[ "$CH_YX" -ge 1 ] || { echo "FAIL: 易学学习中心 chunks 缺失"; fail=1; }

IPLEAK=$(grep -rlE '82\.156\.228\.87|8\.155\.23\.111' "$RELEASE_DIR/tools" "$RELEASE_DIR/records" 2>/dev/null | wc -l || true)
[ "$IPLEAK" = "0" ] || { echo "FAIL: IP泄漏 $IPLEAK 个文件"; fail=1; }

CH_PAYTIP=$(grep -rl "iOS 版暂未开放购买功能" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
echo "chunks iOS payment-off tip: $CH_PAYTIP"
[ "$CH_PAYTIP" -ge 1 ] || { echo "FAIL: iOS payment gate tip 回归丢失"; fail=1; }

[ "$fail" = "0" ] || { echo "FATAL: 内容门禁未通过"; exit 1; }
echo "内容门禁全过（v25.0.80 六修复烧录 + v25.0.79 合规回归 + 主站回归 + IP零泄漏）"

echo "=== [4] current 原子切流（v25.0.79 → ${VERSION}） ==="
PREV=$(readlink /root/yandaoguoxue/current)
echo "prev: $PREV"
ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
CURR=$(readlink /root/yandaoguoxue/current)
echo "current: $CURR"
[ "$CURR" = "$RELEASE_DIR" ] || { echo "FATAL: 切流失败"; exit 1; }

echo "=== [5] 热路径立检 ==="
sleep 1
curl -sk -m 10 "${BASE}/version.json" | grep -q "v25.0.80" && echo "version.json → v25.0.80 OK" || { echo "FAIL: 公网版本未切换"; exit 1; }
curl -sk -m 10 "${BASE}/" | grep -q "吉凶" && { echo "FAIL: 公网首页含「吉凶」"; exit 1; } || echo "公网首页无「吉凶」 OK"
curl -sk -m 10 "${BASE}/yixue/huangli" | grep -q "钦定协纪辨方书" && echo "公网黄历古籍注解 OK" || { echo "FAIL: 公网黄历古籍注解缺失"; exit 1; }
curl -sk -m 10 "${BASE}/privacy" | grep -q "罗盘临时位置" && echo "公网隐私政策罗盘声明 OK" || { echo "FAIL: 公网隐私政策缺罗盘声明"; exit 1; }
curl -sk -m 10 -o /dev/null -w "首页 %{http_code}\n" "${BASE}/" | grep -q "200" || { echo "WARN: 首页非200"; }
curl -sk -m 10 -o /dev/null -w "记录页 %{http_code}\n" "${BASE}/records" | grep -q "200" || { echo "FAIL: 记录页异常"; exit 1; }
curl -sk -m 10 -o /dev/null -w "正骨页 %{http_code}\n" "${BASE}/zhongyi/zhenggu" | grep -q "200" || { echo "FAIL: 正骨专区回归异常"; exit 1; }
curl -sk -m 10 "${BASE}/api/health" | grep -q '"success"' && echo "API health OK" || echo "WARN: API health 异常"

echo ""
echo "DEPLOY_DONE ${VERSION}（用户反馈六修复上线：全局返回键+倒计时重置+通讯录服务端化+NewsCard跳转+排盘保存链路）"