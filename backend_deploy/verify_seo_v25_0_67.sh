#!/bin/bash
# ============================================================================
# v25.0.67 公网验证：SEO 程序化搜索增长引擎（SUPP-01）
# 全部走公网 https://yandaoguoxue.yandao.vip 实测，不做任何本地绕过
# ============================================================================
set -uo pipefail
BASE="https://yandaoguoxue.yandao.vip"
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "  [PASS] $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  [FAIL] $1"; }

echo "=== A. 版本与基线（切流正确性） ==="
R=$(curl -sk -m 10 "${BASE}/version.json" 2>/dev/null)
echo "$R" | grep -q '"version": "v25.0.67"' && ok "version.json = v25.0.67" || bad "version.json 非 v25.0.67：$R"

C=$(curl -sk -m 10 -o /dev/null -w "%{http_code}" "${BASE}/")
[ "$C" = "200" ] && ok "主站首页 200" || bad "主站首页 $C"
C=$(curl -sk -m 10 "${BASE}/api/health" 2>/dev/null)
echo "$C" | grep -q '"success": *true' && ok "API health 正常（零后端变更）" || bad "API health 异常"
C=$(curl -sk -m 10 -o /dev/null -w "%{http_code}" "${BASE}/offline/")
[ "$C" = "200" ] && ok "v25.0.66 /offline 回归 200" || bad "/offline 回归 $C"

echo "=== B. SEO 14 个落地页全部 200 ==="
for p in tools/wuguang-paipan.html tools/mianfei-bazi-paipan.html tools/paipan-mianfei.html tools/buyong-huiyuan-paipan.html tools/paipan-nage-haoyong.html tools/youmeiyou-wuguang-paipan.html learn/mianfei-zhongyi-tiku.html learn/mianfei-zhongyi-shuati.html learn/zhongyi-dianji-mianfei.html app/meiyou-guanggao-guoxue.html app/shenme-guoxue-meiguanggao.html app/quangongneng-guoxue.html app/gongneng-quan-guoxue.html b/yixue-zhongyi-fangan.html; do
  C=$(curl -sk -m 10 -o /dev/null -w "%{http_code}" "${BASE}/${p}")
  [ "$C" = "200" ] && ok "${p} 200" || bad "${p} ${C}"
done

echo "=== C. 目录索引页 + robots + sitemap ==="
for d in tools/ learn/ app/ b/; do
  C=$(curl -sk -m 10 -o /dev/null -w "%{http_code}" "${BASE}/${d}")
  [ "$C" = "200" ] && ok "目录 ${d} 200" || bad "目录 ${d} ${C}"
done
R=$(curl -sk -m 10 "${BASE}/robots.txt" 2>/dev/null)
echo "$R" | grep -q 'Sitemap: https://yandaoguoxue.yandao.vip/sitemap.xml' && ok "robots.txt 指向 sitemap" || bad "robots.txt 内容异常：$R"
S=$(curl -sk -m 10 "${BASE}/sitemap.xml" 2>/dev/null)
N=$(echo "$S" | grep -o '<loc>' | wc -l || true)
[ "$N" = "24" ] && ok "sitemap 含 24 个 URL（6主站+14落地页+4目录）" || bad "sitemap URL 数 $N"
echo "$S" | grep -q '/tools/wuguang-paipan.html' && ok "sitemap 覆盖 SEO 页" || bad "sitemap 缺 SEO 页"

echo "=== D. SUPP-01 差异化三要素公网实测（页面内容级） ==="
H=$(curl -sk -m 10 "${BASE}/tools/wuguang-paipan.html" 2>/dev/null)
echo "$H" | grep -q '<title>无广告的排盘软件_言道国学APP_14款排盘工具基础功能永久免费</title>' && ok "①差异化标题公式（核心词+差异化卖点）" || bad "①标题公式异常"
echo "$H" | grep -q '为什么选择言道国学' && ok "②固定模块「为什么选择言道国学」" || bad "②固定模块缺失"
echo "$H" | grep -q '无广告体验，立即下载' && ok "③转化话术差异化（无广告）" || bad "③CTA 话术异常"
echo "$H" | grep -q 'Meeus' && ok "真太阳时 Meeus 描述（真实能力锚定）" || bad "Meeus 描述缺失"

H2=$(curl -sk -m 10 "${BASE}/learn/zhongyi-dianji-mianfei.html" 2>/dev/null)
echo "$H2" | grep -q '为什么选择言道国学' && ok "中医典籍页固定模块" || bad "中医典籍页固定模块缺失"
echo "$H2" | grep -q '22部' && ok "中医典籍页 22 部真实数字" || bad "中医典籍数字异常"

H3=$(curl -sk -m 10 "${BASE}/b/yixue-zhongyi-fangan.html" 2>/dev/null)
echo "$H3" | grep -q '我们的优势' && ok "B端「我们的优势」模块" || bad "B端优势模块缺失"
echo "$H3" | grep -q '模块化交付' && ok "B端模块化交付表述" || bad "B端优势表述缺失"

echo "=== E. 合规与转化基建 ==="
echo "$H" | grep -q '粤ICP备2026071165号-4A' && ok "ICP 备案号悬挂" || bad "ICP 备案缺失"
echo "$H" | grep -q 'https://beian.miit.gov.cn/' && ok "工信部备案链接" || bad "工信部链接缺失"
echo "$H" | grep -q 'https://yandaoguoxue.yandao.vip/app-download/latest.apk' && ok "APK 唯一下载源" || bad "APK 下载源异常"
echo "$H" | grep -q 'rel="canonical"' && ok "canonical 声明" || bad "canonical 缺失"
echo "$H" | grep -q 'application/ld+json' && ok "JSON-LD 结构化数据" || bad "JSON-LD 缺失"
echo "$H" | grep -q '免责声明\|仅供传统文化学习研究' && ok "免责声明（合规）" || bad "免责声明缺失"
C=$(curl -sk -m 10 -o /dev/null -w "%{http_code}" "${BASE}/app-download/latest.apk")
[ "$C" = "200" ] || [ "$C" = "302" ] && ok "APK 下载端点可用 (${C})" || bad "APK 端点 ${C}"

echo "=== F. 疑问类关键词页抽查（首批差异化词） ==="
H4=$(curl -sk -m 10 "${BASE}/app/shenme-guoxue-meiguanggao.html" 2>/dev/null)
echo "$H4" | grep -q '<title>什么国学APP没有广告' && ok "疑问词页标题「什么国学APP没有广告」" || bad "疑问词页标题异常"
H5=$(curl -sk -m 10 "${BASE}/tools/buyong-huiyuan-paipan.html" 2>/dev/null)
echo "$H5" | grep -q '不用会员' && ok "「不用会员的排盘工具」词页在位" || bad "不用会员词页异常"

echo ""
echo "=================================================="
echo "RESULT: ${PASS} PASS / ${FAIL} FAIL"
[ "$FAIL" = "0" ] && echo "公网验证通过，v25.0.67 SEO 批次封板。" || { echo "公网验证失败项存在，禁止封板！"; exit 1; }
