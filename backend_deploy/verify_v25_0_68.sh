#!/bin/bash
# ============================================================================
# v25.0.68 公网验证：四工具批次（Web + APK + 升级链路全回归）
#   ① Web：版本烧录、四工具页 200+内容、易学入口、SEO18页回归、主站回归
#   ② APK：app-version 接口 2068、公告置顶、latest.apk 200/MIME/体积
#   ③ 埋点：本地无服务端上报（隐私设计），仅验证页面 JS 引擎就位
# ============================================================================
set -uo pipefail
VERSION="v25.0.68"
VC=2068
VN="25.0.68"
BASE="https://yandaoguoxue.yandao.vip"
MAIN="https://www.yandao.vip"
PASS=0; FAIL=0

ok()   { PASS=$((PASS+1)); echo "  ✓ $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  ✗ FAIL: $1"; }

check() { # check <描述> <期望> <实际>
  if [ "$2" = "$3" ]; then ok "$1"; else bad "$1（期望 $2 实际 $3）"; fi
}

echo "=== [1] Web 版本与四工具页 ==="
BV=$(curl -sk -m 10 "$BASE/version.json" | grep -o '"version": *"[^"]*"' | head -1 | grep -o 'v[0-9._]*')
check "version.json 烧录 $VERSION" "$VERSION" "$BV"

for p in "yixue/compass/" "yixue/qizheng/" "yixue/liji/" "yixue/luban/" "yixue/"; do
  CODE=$(curl -sk -m 10 -o /tmp/v68_page.html -w "%{http_code}" "${BASE}/${p}")
  check "${p} HTTP 200" "200" "$CODE"
done

# 工具页内容抽查（RSC/SSR 载荷内的引擎标记）
BODY=$(curl -sk -m 10 "${BASE}/yixue/compass/")
echo "$BODY" | grep -q "罗盘" && ok "compass 页含罗盘内容" || bad "compass 页内容缺失"
BODY_Q=$(curl -sk -m 10 "${BASE}/yixue/qizheng/")
echo "$BODY_Q" | grep -q "七政" && ok "qizheng 页含七政内容" || bad "qizheng 页内容缺失"
BODY_L=$(curl -sk -m 10 "${BASE}/yixue/liji/")
echo "$BODY_L" | grep -q "户型图" && ok "liji 页含户型图内容" || bad "liji 页内容缺失"
BODY_B=$(curl -sk -m 10 "${BASE}/yixue/luban/")
echo "$BODY_B" | grep -q "鲁班" && ok "luban 页含鲁班尺内容" || bad "luban 页内容缺失"
BODY_I=$(curl -sk -m 10 "${BASE}/yixue/")
for kw in "yixue/compass" "yixue/qizheng" "yixue/liji" "yixue/luban" "专业罗盘" "七政四余" "立极尺" "鲁班尺"; do
  echo "$BODY_I" | grep -q "$kw" && ok "入口含 $kw" || bad "入口缺 $kw"
done

echo "=== [2] v25.0.67 SEO 批次回归 ==="
for f in "tools/wuguang-paipan.html" "tools/mianfei-bazi-paipan.html" "learn/mianfei-zhongyi-tiku.html" "app/meiyou-guanggao-guoxue.html" "b/yixue-zhongyi-fangan.html" "sitemap.xml" "robots.txt"; do
  CODE=$(curl -sk -m 10 -o /dev/null -w "%{http_code}" "${BASE}/${f}")
  check "回归 ${f} 200" "200" "$CODE"
done
SEO=$(curl -sk -m 10 "${BASE}/tools/wuguang-paipan.html")
echo "$SEO" | grep -q '无广告的排盘软件_言道国学APP' && ok "SEO 差异化标题仍在" || bad "SEO 差异化标题丢失"

echo "=== [3] 主站回归 ==="
CODE=$(curl -sk -m 10 -o /dev/null -w "%{http_code}" "$BASE/")
check "国学站首页 200" "200" "$CODE"
CODE=$(curl -sk -m 10 -o /dev/null -w "%{http_code}" "$BASE/api/health")
check "API health 200" "200" "$CODE"
CODE=$(curl -sk -m 10 -o /dev/null -w "%{http_code}" "$MAIN/")
check "主站首页 200" "200" "$CODE"

echo "=== [4] APK 升级链路 ==="
V=$(curl -sk -m 15 "$BASE/api/public/app-version")
echo "$V" | grep -q "\"latestVersionCode\": *${VC}" && ok "app-version 接口 ${VC}" || bad "app-version 接口非 ${VC}"
echo "$V" | grep -q "\"latestVersion\": *\"${VN}\"" && ok "latestVersion ${VN}" || bad "latestVersion 非 ${VN}"
echo "$V" | grep -q 'app-download/latest.apk' && ok "downloadUrl 指向统一源" || bad "downloadUrl 未指向统一源"
A=$(curl -sk -m 15 "$BASE/api/announcements/public")
echo "$A" | grep -q "a_v25_0_68_release" && ok "v25.0.68 公告已发布" || bad "公告未更新"
echo "$A" | grep -q "专业罗盘" && ok "公告含罗盘内容" || bad "公告缺罗盘内容"

CT=$(curl -sk -m 30 -I "$BASE/app-download/latest.apk" | grep -i '^content-type' | tr -d '\r' | awk '{print $2}')
check "latest.apk MIME" "application/vnd.android.package-archive" "$CT"
SZ=$(curl -sk -m 30 -I "$BASE/app-download/latest.apk" | grep -i '^content-length' | tr -d '\r' | awk '{print $2}')
echo "  latest.apk size: ${SZ} bytes"
[ -n "$SZ" ] && [ "$SZ" -gt 5000000 ] && ok "APK 体积正常（>5MB）" || bad "APK 体积异常"

# APK 头部字节校验（ZIP 魔数 PK\x03\x04）
MAGIC=$(curl -sk -m 60 --range 0-3 "$BASE/app-download/latest.apk" | od -An -tx1 | tr -d ' \n')
check "APK ZIP 魔数" "504b0304" "$MAGIC"

echo "=== [5] APK 单一来源门禁（D20） ==="
if bash /root/apk_url_single_source_gate.sh "${VC}" "${VN}" >/tmp/v68_gate.log 2>&1; then
  ok "单一来源门禁通过"
else
  bad "单一来源门禁未通过（详见 /tmp/v68_gate.log）"
fi

echo ""
echo "===================================================="
echo "v25.0.68 公网验证：${PASS} 通过 / ${FAIL} 失败"
[ "$FAIL" = "0" ] && echo "ALL PASS ✓" || { echo "存在失败项，需排查"; exit 1; }
