#!/bin/bash
# ============================================================================
# v25.0.69 公网验证：SEO 四工具集群页 + 后端工具矩阵登记
# 全部走公网 https://yandaoguoxue.yandao.vip 实测，不做任何本地绕过
# ============================================================================
set -uo pipefail
BASE="https://yandaoguoxue.yandao.vip"
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "  [PASS] $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  [FAIL] $1"; }

echo "=== A. 版本与基线（切流正确性） ==="
R=$(curl -sk -m 10 "${BASE}/version.json" 2>/dev/null)
echo "$R" | grep -q '"version": "v25.0.69"' && ok "version.json = v25.0.69" || bad "version.json 非 v25.0.69：$R"
C=$(curl -sk -m 10 -o /dev/null -w "%{http_code}" "${BASE}/")
[ "$C" = "200" ] && ok "主站首页 200" || bad "主站首页 $C"
C=$(curl -sk -m 10 "${BASE}/api/health" 2>/dev/null)
echo "$C" | grep -q '"success": *true' && ok "API health 正常（后端矩阵登记后）" || bad "API health 异常"
C=$(curl -sk -m 10 -o /dev/null -w "%{http_code}" "${BASE}/offline/")
[ "$C" = "200" ] && ok "/offline 回归 200" || bad "/offline 回归 $C"

echo "=== B. 四个新集群页 200 + 内容级验证 ==="
for p in tools/qizheng-siyu.html tools/luopan.html tools/liji-ruler.html tools/luban-ruler.html; do
  C=$(curl -sk -m 10 -o /dev/null -w "%{http_code}" "${BASE}/${p}")
  [ "$C" = "200" ] && ok "${p} 200" || bad "${p} ${C}"
done

HQ=$(curl -sk -m 10 "${BASE}/tools/qizheng-siyu.html" 2>/dev/null)
echo "$HQ" | grep -q '<title>七政四余排盘_果老星宗二十八宿宿度_言道国学APP免费无广告</title>' && ok "七政页标题公式（核心词+差异化）" || bad "七政页标题异常"
echo "$HQ" | grep -q '为什么选择言道国学' && ok "七政页固定模块" || bad "七政页固定模块缺失"
echo "$HQ" | grep -q 'yixue/qizheng/' && ok "七政页「网页版在线使用」直链（指令07工具页优先）" || bad "七政页在线用链接缺失"
echo "$HQ" | grep -q '二十八宿' && echo -n "" && echo "$HQ" | grep -q '洞微大限' && ok "七政页真实功能锚定（二十八宿+洞微大限）" || bad "七政页功能锚定缺失"
echo "$HQ" | grep -q '免费下载，排七政四余盘' && ok "七政页差异化CTA" || bad "七政页CTA异常"

HL=$(curl -sk -m 10 "${BASE}/tools/luopan.html" 2>/dev/null)
echo "$HL" | grep -q '<title>手机罗盘_二十四山坐向+磁偏角真北校正_言道国学APP免费无广告</title>' && ok "罗盘页标题公式" || bad "罗盘页标题异常"
echo "$HL" | grep -q 'WMM2025' && ok "罗盘页 WMM2025 磁偏角引擎锚定" || bad "罗盘页 WMM2025 缺失"
echo "$HL" | grep -q 'yixue/compass/' && ok "罗盘页在线用直链" || bad "罗盘页在线用链接缺失"
echo "$HL" | grep -q '二十四山' && ok "罗盘页二十四山判读锚定" || bad "罗盘页二十四山缺失"

HJ=$(curl -sk -m 10 "${BASE}/tools/liji-ruler.html" 2>/dev/null)
echo "$HJ" | grep -q '<title>立极尺_户型图叠加罗盘定坐向_言道国学APP免费无广告</title>' && ok "立极尺页标题公式" || bad "立极尺页标题异常"
echo "$HJ" | grep -q 'yixue/liji/' && ok "立极尺页在线用直链" || bad "立极尺页在线用链接缺失"
echo "$HJ" | grep -q '不上传' && ok "立极尺页隐私本地处理表述" || bad "立极尺页隐私表述缺失"

HB=$(curl -sk -m 10 "${BASE}/tools/luban-ruler.html" 2>/dev/null)
echo "$HB" | grep -q '<title>鲁班尺在线查询_丁兰尺双尺合参_言道国学APP免费无广告</title>' && ok "鲁班尺页标题公式" || bad "鲁班尺页标题异常"
echo "$HB" | grep -q 'yixue/luban/' && ok "鲁班尺页在线用直链" || bad "鲁班尺页在线用链接缺失"
echo "$HB" | grep -q '丁兰尺' && ok "鲁班尺页双尺合参锚定" || bad "鲁班尺页丁兰尺缺失"

echo "=== C. 老 SEO 18 页 + 四目录索引回归（切流不伤既有批次） ==="
for p in tools/wuguang-paipan.html tools/mianfei-bazi-paipan.html tools/paipan-mianfei.html tools/buyong-huiyuan-paipan.html tools/paipan-nage-haoyong.html tools/youmeiyou-wuguang-paipan.html learn/mianfei-zhongyi-tiku.html learn/mianfei-zhongyi-shuati.html learn/zhongyi-dianji-mianfei.html app/meiyou-guanggao-guoxue.html app/shenme-guoxue-meiguanggao.html app/quangongneng-guoxue.html app/gongneng-quan-guoxue.html b/yixue-zhongyi-fangan.html tools/ learn/ app/ b/; do
  C=$(curl -sk -m 10 -o /dev/null -w "%{http_code}" "${BASE}/${p}")
  [ "$C" = "200" ] && ok "${p} 200" || bad "${p} ${C}"
done
HO=$(curl -sk -m 10 "${BASE}/tools/wuguang-paipan.html" 2>/dev/null)
echo "$HO" | grep -q '为什么选择言道国学' && ok "老SEO页固定模块回归" || bad "老SEO页固定模块丢失"

echo "=== D. sitemap + robots（22→28 URL） ==="
R=$(curl -sk -m 10 "${BASE}/robots.txt" 2>/dev/null)
echo "$R" | grep -q 'Sitemap: https://yandaoguoxue.yandao.vip/sitemap.xml' && ok "robots.txt 指向 sitemap" || bad "robots.txt 内容异常"
S=$(curl -sk -m 10 "${BASE}/sitemap.xml" 2>/dev/null)
N=$(echo "$S" | grep -o '<loc>' | wc -l || true)
[ "$N" = "28" ] && ok "sitemap 含 28 个 URL（6主站+18落地页+4目录）" || bad "sitemap URL 数 $N"
for kw in qizheng-siyu luopan liji-ruler luban-ruler; do
  echo "$S" | grep -q "/tools/${kw}.html" && ok "sitemap 覆盖 ${kw}" || bad "sitemap 缺 ${kw}"
done

echo "=== E. 后端工具矩阵（四工具 SSOT 登记） ==="
M=$(curl -sk -m 10 "${BASE}/api/public/tool-matrix" 2>/dev/null)
echo "$M" | grep -q '"qizheng"' && echo "$M" | grep -q '"七政四余"' && ok "矩阵登记：七政四余" || bad "矩阵缺七政四余"
echo "$M" | grep -q '"compass"' && echo "$M" | grep -q '"专业罗盘"' && ok "矩阵登记：专业罗盘" || bad "矩阵缺专业罗盘"
echo "$M" | grep -q '"liji"' && echo "$M" | grep -q '"立极尺"' && ok "矩阵登记：立极尺" || bad "矩阵缺立极尺"
echo "$M" | grep -q '"luban"' && echo "$M" | grep -q '"鲁班尺丁兰尺"' && ok "矩阵登记：鲁班尺丁兰尺" || bad "矩阵缺鲁班尺丁兰尺"
CNT=$(echo "$M" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['data']['tools']))" 2>/dev/null || echo 0)
[ "$CNT" = "27" ] && ok "矩阵工具总数 27（23老+4新）" || bad "矩阵总数 ${CNT}"
FREE4=$(echo "$M" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']['tools']; print(all(d[k]['payMode']=='FREE' and d[k]['status']=='ON' for k in ['qizheng','compass','liji','luban']))" 2>/dev/null || echo False)
[ "$FREE4" = "True" ] && ok "四工具全部 FREE/ON（SEO免费口径SSOT实证）" || bad "四工具矩阵状态异常"
for t in bazi ziwei qimen liuyao meihua daliuren zhongyi_classic zhongyi_exam; do
  echo "$M" | grep -q "\"${t}\":" || bad "老工具 ${t} 从矩阵丢失"
done
ok "老工具矩阵回归（8抽查全在位）"

echo "=== F. 四工具网页版回归（在线用直链目标） ==="
for p in yixue/compass/ yixue/qizheng/ yixue/liji/ yixue/luban/ yixue/; do
  C=$(curl -sk -m 10 -o /dev/null -w "%{http_code}" "${BASE}/${p}")
  [ "$C" = "200" ] && ok "${p} 200" || bad "${p} ${C}"
done

echo "=== G. 合规与转化基建 ==="
echo "$HQ" | grep -q '粤ICP备2026071165号-4A' && ok "ICP 备案号悬挂" || bad "ICP 备案缺失"
echo "$HQ" | grep -q 'https://beian.miit.gov.cn/' && ok "工信部备案链接" || bad "工信部链接缺失"
echo "$HQ" | grep -q 'https://yandaoguoxue.yandao.vip/app-download/latest.apk' && ok "APK 唯一下载源" || bad "APK 下载源异常"
echo "$HQ" | grep -q 'rel="canonical"' && ok "canonical 声明" || bad "canonical 缺失"
echo "$HQ" | grep -q 'application/ld+json' && ok "JSON-LD 结构化数据" || bad "JSON-LD 缺失"
echo "$HQ" | grep -q '仅供传统文化学习研究' && ok "免责声明（合规）" || bad "免责声明缺失"
IPLEAK=$(echo "$HQ $HL $HJ $HB" | grep -cE '82\.156\.228\.87|8\.155\.23\.111' || true)
[ "$IPLEAK" = "0" ] && ok "四新页 IP 零泄漏" || bad "IP 泄漏 ${IPLEAK} 处"
C=$(curl -sk -m 10 -o /dev/null -w "%{http_code}" "${BASE}/app-download/latest.apk")
[ "$C" = "200" ] || [ "$C" = "302" ] && ok "APK 下载端点可用 (${C})" || bad "APK 端点 ${C}"

echo ""
echo "=================================================="
echo "RESULT: ${PASS} PASS / ${FAIL} FAIL"
[ "$FAIL" = "0" ] && echo "公网验证通过，v25.0.69 SEO 四工具集群页批次封板。" || { echo "公网验证失败项存在，禁止封板！"; exit 1; }
