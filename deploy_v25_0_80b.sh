#!/bin/bash
set -euo pipefail
VERSION="v25.0.80b"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"
TAR="/root/yandaoguoxue/out_v25_0_80b.tar.gz"
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

echo "=== [3] content gates ==="
fail=0
V=$(grep -o '"buildId": *"[^"]*"' "$RELEASE_DIR/version.json" || true)
echo "version.json: $V"
echo "$V" | grep -q "v25.0.80_D20260913B" || { echo "FAIL: buildId 非本批次"; fail=1; }

# --- 本次新增：七政四余 P1 + 学习专区 15 专题 ---
CH_TOPIC=$(grep -rl "学习专题" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
echo "chunks 学习专题tab: $CH_TOPIC"
[ "$CH_TOPIC" -ge 1 ] || { echo "FAIL: 学习专题 tab 缺失"; fail=1; }

CH_KPK=$(grep -rl "qz-kp-" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
echo "chunks 知识点级打卡key: $CH_KPK"
[ "$CH_KPK" -ge 1 ] || { echo "FAIL: 知识点级打卡缺失"; fail=1; }

CH_TOPOBJ=$(grep -rl "专题练习" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
echo "chunks 专题练习分组: $CH_TOPOBJ"
[ "$CH_TOPOBJ" -ge 1 ] || { echo "FAIL: 专题练习分组缺失"; fail=1; }

for pg in yixue/qizheng/index.html academy/yixue/qizheng/index.html; do
  [ -f "$RELEASE_DIR/$pg" ] || { echo "FAIL: 页面缺失 $pg"; fail=1; }
done
echo "七政排盘页 + 七政学习页 OK"

CH_LAYER=$(grep -rl "感应图层" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
echo "chunks 七政感应图层: $CH_LAYER"
[ "$CH_LAYER" -ge 1 ] || { echo "FAIL: 七政感应图层缺失"; fail=1; }

CH_LN=$(grep -rl "原流相并" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
echo "chunks 七政流年原流相并: $CH_LN"
[ "$CH_LN" -ge 1 ] || { echo "FAIL: 七政流年模式缺失"; fail=1; }

CH_EXPORT=$(grep -rl "隐私模式" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
echo "chunks 高清导出隐私模式: $CH_EXPORT"
[ "$CH_EXPORT" -ge 1 ] || { echo "FAIL: 高清导出隐私模式缺失"; fail=1; }

# --- v25.0.80 特征回归（必须保留） ---
CH_GBB=$(grep -rl "data-global-back" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
[ "$CH_GBB" -ge 1 ] || { echo "FAIL: GlobalBackButton 缺失"; fail=1; }
CH_GUSHU=$(grep -rl "钦定协纪辨方书" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
[ "$CH_GUSHU" -ge 1 ] || { echo "FAIL: 黄历古籍注解回归丢失"; fail=1; }
CH_PHONE=$(grep -rl "手机号码解析" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
[ "$CH_PHONE" -ge 1 ] || { echo "FAIL: 手机号码解析入口回归丢失"; fail=1; }
CH_AI=$(grep -rl "仅用于国学、历法学术研究" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
[ "$CH_AI" -ge 1 ] || { echo "FAIL: AI免责声明回归丢失"; fail=1; }

for page in index.html yixue/huangli/index.html yixue/phone/index.html yixue/carplate/index.html; do
  if grep -q "吉凶" "$RELEASE_DIR/$page" 2>/dev/null; then
    echo "FAIL: $page 含「吉凶」"; fail=1
  fi
done
echo "合规检查 OK（无吉凶）"

for pg in academy/yixue/index.html academy/yixue/yixue_basic/index.html academy/yixue/bazi/index.html academy/yixue/ziwei/index.html academy/yixue/qizheng/index.html academy/yixue/qimen/index.html academy/yixue/liuyao/index.html academy/yixue/meihua/index.html academy/yixue/daliuren/index.html academy/yixue/calendar/index.html; do
  [ -f "$RELEASE_DIR/$pg" ] || { echo "FAIL: 易学学习中心页缺失 $pg"; fail=1; }
done
echo "易学学习中心 10 页 OK"

[ -f "$RELEASE_DIR/records/index.html" ] || { echo "FAIL: records 页缺失"; fail=1; }
grep -q '我的排盘记录' "$RELEASE_DIR/records/index.html" || { echo "FAIL: records 页标题指纹缺失"; fail=1; }
[ -f "$RELEASE_DIR/index.html" ] || { echo "FAIL: 主站 index.html 缺失"; fail=1; }
[ -d "$RELEASE_DIR/_next/static" ] || { echo "FAIL: _next 静态资源缺失"; fail=1; }
TOOLS_N=$(ls "$RELEASE_DIR/tools/"*.html | wc -l)
echo "out/tools HTML: $TOOLS_N"
[ "$TOOLS_N" = "42" ] || { echo "FAIL: tools 页数非 42"; fail=1; }
grep -q '<urlset' "$RELEASE_DIR/sitemap.xml" || { echo "FAIL: sitemap 缺失"; fail=1; }
SM_N=$(grep -c '<loc>' "$RELEASE_DIR/sitemap.xml")
[ "$SM_N" = "69" ] || { echo "FAIL: sitemap URL 数非 69"; fail=1; }
echo "sitemap $SM_N URL OK"

IPLEAK=$(grep -rlE '82\.156\.228\.87|8\.155\.23\.111' "$RELEASE_DIR/tools" "$RELEASE_DIR/records" 2>/dev/null | wc -l || true)
[ "$IPLEAK" = "0" ] || { echo "FAIL: IP泄漏 $IPLEAK 个文件"; fail=1; }

[ "$fail" = "0" ] || { echo "FATAL: 内容门禁未通过"; exit 1; }
echo "内容门禁全过（七政P1+学习专题 + v25.0.80回归 + 合规 + IP零泄漏）"

echo "=== [4] current 原子切流 ==="
PREV=$(readlink /root/yandaoguoxue/current)
echo "prev: $PREV"
ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
CURR=$(readlink /root/yandaoguoxue/current)
echo "current: $CURR"
[ "$CURR" = "$RELEASE_DIR" ] || { echo "FATAL: 切流失败"; exit 1; }

echo "=== [5] 公网热路径立检 ==="
sleep 1
curl -sk -m 10 "${BASE}/version.json" -o /tmp/_dep_v.json
grep -q "D20260913B" /tmp/_dep_v.json && echo "version.json → D20260913B OK" || { echo "FAIL: 公网版本未切换"; exit 1; }
curl -sk -m 10 -o /dev/null -w "七政学习页 %{http_code}\n" "${BASE}/academy/yixue/qizheng/" | grep -q "200" || { echo "FAIL: 七政学习页异常"; exit 1; }
curl -sk -m 10 -o /dev/null -w "七政排盘页 %{http_code}\n" "${BASE}/yixue/qizheng/" | grep -q "200" || { echo "FAIL: 七政排盘页异常"; exit 1; }
curl -sk -m 10 -o /dev/null -w "首页 %{http_code}\n" "${BASE}/" | grep -q "200" || { echo "WARN: 首页非200"; }
curl -sk -m 10 -o /dev/null -w "记录页 %{http_code}\n" "${BASE}/records/" | grep -q "200" || { echo "FAIL: 记录页异常"; exit 1; }
curl -sk -m 10 "${BASE}/yixue/huangli/" -o /tmp/_dep_hl.html
grep -q "钦定协纪辨方书" /tmp/_dep_hl.html && echo "公网黄历古籍注解 OK" || { echo "FAIL: 公网黄历古籍注解缺失"; exit 1; }
curl -sk -m 10 "${BASE}/" -o /tmp/_dep_home.html
grep -q "吉凶" /tmp/_dep_home.html && { echo "FAIL: 公网首页含「吉凶」"; exit 1; } || echo "公网首页无「吉凶」 OK"
curl -sk -m 10 "${BASE}/api/health" -o /tmp/_dep_health.json
grep -q '"success"' /tmp/_dep_health.json && echo "API health OK" || echo "WARN: API health 异常"

echo ""
echo "DEPLOY_DONE ${VERSION}（七政P1批次 + 学习专区15专题上线）"
