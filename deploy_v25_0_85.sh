#!/bin/bash
set -euo pipefail
VERSION="v25.0.85"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"
TAR="/root/yandaoguoxue/out_v25_0_85.tar.gz"
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
echo "$V" | grep -q "v25.0.85_D20260913" || { echo "FAIL: buildId 非本批次"; fail=1; }

# --- 本次新增：SEO 增长集群 38 页（中医自学11 + 医考题库11 + 七政学习16） ---
ZIXUE_N=$(ls "$RELEASE_DIR/zixue/"*.html 2>/dev/null | wc -l)
YIKAO_N=$(ls "$RELEASE_DIR/yikao/"*.html 2>/dev/null | wc -l)
QZS_N=$(ls "$RELEASE_DIR/qizheng-study/"*.html 2>/dev/null | wc -l)
echo "SEO集群: zixue=$ZIXUE_N yikao=$YIKAO_N qizheng-study=$QZS_N"
[ "$ZIXUE_N" = "11" ] || { echo "FAIL: zixue 页数非 11"; fail=1; }
[ "$YIKAO_N" = "11" ] || { echo "FAIL: yikao 页数非 11"; fail=1; }
[ "$QZS_N" = "16" ] || { echo "FAIL: qizheng-study 页数非 16"; fail=1; }
grep -q "七政四余" "$RELEASE_DIR/qizheng-study/rumen.html" || { echo "FAIL: 七政入门页内容缺失"; fail=1; }
grep -q "中医" "$RELEASE_DIR/zixue/zhongyi-zenme-rumen.html" || { echo "FAIL: 中医入门页内容缺失"; fail=1; }
grep -q "题库" "$RELEASE_DIR/yikao/zhongyi-yikao-mianfei-tiku.html" || { echo "FAIL: 医考题库页内容缺失"; fail=1; }

SM_N=$(grep -c '<loc>' "$RELEASE_DIR/sitemap.xml")
echo "sitemap: $SM_N URL"
[ "$SM_N" = "105" ] || { echo "FAIL: sitemap URL 数非 105"; fail=1; }
grep -q '/qizheng-study/rumen.html' "$RELEASE_DIR/sitemap.xml" || { echo "FAIL: sitemap 缺七政学习URL"; fail=1; }
grep -q '/zixue/zhongyi-zenme-rumen.html' "$RELEASE_DIR/sitemap.xml" || { echo "FAIL: sitemap 缺自学URL"; fail=1; }

# --- 本次新增：七政视觉增强指纹 ---
CH_V2=$(grep -rl "yandao_qizheng_layers_v2" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
echo "chunks 图层状态v2键: $CH_V2"
[ "$CH_V2" -ge 1 ] || { echo "FAIL: 图层v2键缺失"; fail=1; }
CH_DX=$(grep -rl "洞微行限" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
echo "chunks 洞微行限岁段: $CH_DX"
[ "$CH_DX" -ge 1 ] || { echo "FAIL: 洞微行限岁段缺失"; fail=1; }

# --- v25.0.80 回归（必须保留） ---
CH_TOPIC=$(grep -rl "学习专题" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
[ "$CH_TOPIC" -ge 1 ] || { echo "FAIL: 学习专题 tab 缺失"; fail=1; }
CH_KPK=$(grep -rl "qz-kp-" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
[ "$CH_KPK" -ge 1 ] || { echo "FAIL: 知识点级打卡缺失"; fail=1; }
CH_TOPOBJ=$(grep -rl "专题练习" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
[ "$CH_TOPOBJ" -ge 1 ] || { echo "FAIL: 专题练习分组缺失"; fail=1; }
for pg in yixue/qizheng/index.html academy/yixue/qizheng/index.html; do
  [ -f "$RELEASE_DIR/$pg" ] || { echo "FAIL: 页面缺失 $pg"; fail=1; }
done
CH_LAYER=$(grep -rl "感应图层" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
[ "$CH_LAYER" -ge 1 ] || { echo "FAIL: 七政感应图层缺失"; fail=1; }
CH_LN=$(grep -rl "原流相并" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
[ "$CH_LN" -ge 1 ] || { echo "FAIL: 七政流年模式缺失"; fail=1; }
CH_EXPORT=$(grep -rl "隐私模式" "$RELEASE_DIR/_next/static/chunks/" | wc -l)
[ "$CH_EXPORT" -ge 1 ] || { echo "FAIL: 高清导出隐私模式缺失"; fail=1; }

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

IPLEAK=$(grep -rlE '82\.156\.228\.87|8\.155\.23\.111' "$RELEASE_DIR/tools" "$RELEASE_DIR/records" 2>/dev/null | wc -l || true)
[ "$IPLEAK" = "0" ] || { echo "FAIL: IP泄漏 $IPLEAK 个文件"; fail=1; }

[ "$fail" = "0" ] || { echo "FATAL: 内容门禁未通过"; exit 1; }
echo "内容门禁全过（SEO增长38页 + 七政视觉增强 + v25.0.80回归 + 合规 + IP零泄漏）"

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
grep -q "v25.0.85_D20260913" /tmp/_dep_v.json && echo "version.json → v25.0.85 OK" || { echo "FAIL: 公网版本未切换"; exit 1; }
for pg in "yixue/qizheng/" "zixue/" "zixue/zhongyi-zenme-rumen.html" "yikao/" "yikao/zhongyi-yikao-mianfei-tiku.html" "qizheng-study/" "qizheng-study/rumen.html" "records/"; do
  CODE=$(curl -sk -m 10 -o /dev/null -w "%{http_code}" "${BASE}/${pg}")
  echo "${pg} → ${CODE}"
  [ "$CODE" = "200" ] || { echo "FAIL: ${pg} 非200"; exit 1; }
done
curl -sk -m 10 "${BASE}/sitemap.xml" -o /tmp/_dep_sm.xml
SM_PUB=$(grep -c '<loc>' /tmp/_dep_sm.xml)
echo "公网 sitemap: $SM_PUB URL"
[ "$SM_PUB" = "105" ] || { echo "FAIL: 公网 sitemap 未更新"; exit 1; }
curl -sk -m 10 "${BASE}/" -o /tmp/_dep_home.html
grep -q "吉凶" /tmp/_dep_home.html && { echo "FAIL: 公网首页含「吉凶」"; exit 1; } || echo "公网首页无「吉凶」 OK"

echo ""
echo "DEPLOY_DONE ${VERSION}（SEO增长38页集群 + 七政视觉增强上线）"
