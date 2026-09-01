#!/bin/bash
# ============================================================================
# v25.0.73 发布：phase9 增长批次——手机号/车牌号搜索集群 + 五小众集群Guide扩充
#   ① 25 个新 SEO 落地页（/tools/ 静态直出，nginx try_files）：
#     - 手机号数字能量集群 5 页（八星磁场/数字五行文化参考口径）
#     - 车牌号数字能量集群 5 页
#     - 罗盘集群 +5（二十四山/三合/玄空/贞北罗盘）
#     - 七政集群 +3（二十八宿/命宫/在线排盘）
#     - 立极尺 +3 / 玄空 +3 / 鲁班尺分位 +1 / 户型定向 +1
#   ② tools/index.html 索引刷新 + sitemap.xml 53 URL + IndexNow 池刷新
#   ③ 本批零后端变更、零 APP 代码变更（纯静态增量），无需 PM2 重启
#      APK 维持 2070/v25.0.72（升级接口独立于 Web 版本号，无升级提示影响）
# 流程：tar 解包 → 内容门禁（版本烧录+25新页+特征指纹+差异化+IP泄漏+主站回归）
#       → current 原子切流 → 热路径立检（GET+内容指纹，防 SPA fallback 假阳性）
# ============================================================================
set -euo pipefail
VERSION="v25.0.73"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"
TAR="/root/yandaoguoxue/out_v25_0_73.tar.gz"
BASE="https://yandaoguoxue.yandao.vip"

NEW_PAGES="24shan-luopan chepai-gongju-zenme-yong chepai-haoma-nengliang chepai-haoma-zuhe chepai-nengliang-shuoming chepai-zimu-shuzi dianzi-liji dinglan-chi huxing-dingzuoxiang jiugong-feixing liji-app luban-chi-fenwei qizheng-28xiu qizheng-minggong qizheng-zaixian-paipan sanhe-luopan sanyuan-jiuyun shouji-haoma-nengliang shouji-haoma-zenme-kan shouji-haoma-zuhe shouji-weihao shuzi-cichang xuankong-luopan xuankong-zaixian zhenbei-luopan"

echo "=== [0] 服务器校验（部署纪律：唯一生产服务器 82.156.228.87） ==="
PUBIP=$(curl -s -m 8 ifconfig.me || true)
echo "public ip: ${PUBIP}"
[ "${PUBIP}" = "82.156.228.87" ] || { echo "FATAL: 公网IP非82.156.228.87，禁止部署"; exit 1; }

test -f "$TAR" || { echo "FATAL: tar missing"; exit 1; }
echo "=== [1] tar OK ($(du -sh "$TAR" | cut -f1)) ==="

echo "=== [2] 解包到 ${RELEASE_DIR} ==="
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
tar -xzf "$TAR" -C "$RELEASE_DIR"
echo "files: $(find "$RELEASE_DIR" -type f | wc -l)"

echo "=== [3] 内容门禁（v25.0.73 phase9 SEO 批次） ==="
fail=0
V=$(grep -o '"version": *"[^"]*"' "$RELEASE_DIR/version.json" || true)
echo "version.json: $V"
echo "$V" | grep -q "v25.0.73" || { echo "FAIL: buildId 未烧录 v25.0.73"; fail=1; }

# 25 个新页齐全
MISSING=0
for p in $NEW_PAGES; do
  [ -f "$RELEASE_DIR/tools/$p.html" ] || { echo "FAIL: SEO 新页缺失 tools/$p.html"; MISSING=1; fail=1; }
done
[ "$MISSING" = "0" ] && echo "phase9 新页 25/25 齐全"

# h1 特征指纹抽查（4 个代表页：罗盘/手机号/车牌/七政集群各 1）
grep -q '二十四山罗盘（坐向自动判读）' "$RELEASE_DIR/tools/24shan-luopan.html" || { echo "FAIL: 24shan-luopan h1 指纹缺失"; fail=1; }
grep -q '手机号码数字能量分析（免费无广告）' "$RELEASE_DIR/tools/shouji-haoma-nengliang.html" || { echo "FAIL: shouji-haoma-nengliang h1 指纹缺失"; fail=1; }
grep -q '车牌号码数字组合怎么看' "$RELEASE_DIR/tools/chepai-haoma-zuhe.html" || { echo "FAIL: chepai-haoma-zuhe h1 指纹缺失"; fail=1; }
grep -q '七政四余二十八宿（宿度查询）' "$RELEASE_DIR/tools/qizheng-28xiu.html" || { echo "FAIL: qizheng-28xiu h1 指纹缺失"; fail=1; }
echo "h1 特征指纹抽查 OK"

# 差异化与合规要素抽查（文化参考口径/ICP/唯一下载源）
grep -q '粤ICP备2026071165号-4A' "$RELEASE_DIR/tools/24shan-luopan.html" || { echo "FAIL: ICP备案悬挂缺失"; fail=1; }
grep -q 'app-download/latest.apk' "$RELEASE_DIR/tools/shouji-haoma-nengliang.html" || { echo "FAIL: APK唯一下载源缺失"; fail=1; }
grep -q '文化参考' "$RELEASE_DIR/tools/chepai-haoma-nengliang.html" || { echo "FAIL: 文化参考口径缺失"; fail=1; }
grep -q '免费无广告' "$RELEASE_DIR/tools/shouji-haoma-nengliang.html" || { echo "FAIL: 差异化卖点缺失"; fail=1; }
grep -q '<urlset' "$RELEASE_DIR/sitemap.xml" || { echo "FAIL: sitemap 缺失"; fail=1; }
SM_N=$(grep -c '<loc>' "$RELEASE_DIR/sitemap.xml")
echo "sitemap URL 数: $SM_N"
[ "$SM_N" = "53" ] || { echo "FAIL: sitemap URL 数非 53"; fail=1; }
grep -q 'Sitemap:' "$RELEASE_DIR/robots.txt" || { echo "FAIL: robots.txt 未指向 sitemap"; fail=1; }

# 工具索引页含新集群入口
grep -q '24shan-luopan.html' "$RELEASE_DIR/tools/index.html" || { echo "FAIL: tools 索引缺新页链接"; fail=1; }
grep -q 'shouji-haoma-nengliang.html' "$RELEASE_DIR/tools/index.html" || { echo "FAIL: tools 索引缺手机号集群链接"; fail=1; }

# 主站回归：v25.0.72 产物仍在（正骨专区/七政学习链接）
[ -f "$RELEASE_DIR/index.html" ] || { echo "FAIL: 主站 index.html 缺失"; fail=1; }
[ -d "$RELEASE_DIR/_next/static" ] || { echo "FAIL: _next 静态资源缺失"; fail=1; }
[ -f "$RELEASE_DIR/zhongyi/zhenggu/index.html" ] || { echo "FAIL: v25.0.72 正骨专区回归丢失"; fail=1; }
grep -q '正骨专区' "$RELEASE_DIR/zhongyi/index.html" || { echo "FAIL: v25.0.72 中医主页正骨入口回归丢失"; fail=1; }
grep -rlq 'zhongyi_zhenggu' "$RELEASE_DIR/_next/static/chunks/" || { echo "FAIL: 正骨工具ID烧录回归丢失"; fail=1; }
[ -f "$RELEASE_DIR/offline/index.html" ] || { echo "FAIL: /offline 页面回归丢失"; fail=1; }

# IP 泄漏检查（新页全量）
IPLEAK=$(grep -rlE '82\.156\.228\.87|8\.155\.23\.111' "$RELEASE_DIR/tools" 2>/dev/null | wc -l || true)
[ "$IPLEAK" = "0" ] || { echo "FAIL: SEO页IP泄漏 $IPLEAK 个文件"; fail=1; }

[ "$fail" = "0" ] || { echo "FATAL: 内容门禁未通过"; exit 1; }
echo "内容门禁全过（版本烧录+25新页+h1指纹+差异化合规+主站回归+IP零泄漏）"

echo "=== [4] current 原子切流（v25.0.72 → ${VERSION}） ==="
PREV=$(readlink /root/yandaoguoxue/current)
echo "prev: $PREV"
ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
CURR=$(readlink /root/yandaoguoxue/current)
echo "current: $CURR"
[ "$CURR" = "$RELEASE_DIR" ] || { echo "FATAL: 切流失败"; exit 1; }

echo "=== [5] 热路径立检（GET+内容指纹，防 SPA fallback 假阳性） ==="
sleep 1
curl -sk -m 10 "${BASE}/version.json" | grep -q "v25.0.73" && echo "version.json → v25.0.73 OK" || { echo "FAIL: 公网版本未切换"; exit 1; }
curl -sk -m 10 -o /dev/null -w "首页 %{http_code}\n" "${BASE}/" | grep -q "200" || { echo "WARN: 首页非200，需检查"; }
# 新页内容指纹（非仅状态码）
curl -sk -m 10 "${BASE}/tools/24shan-luopan.html" | grep -q '二十四山罗盘（坐向自动判读）' && echo "24shan-luopan 内容指纹 OK" || { echo "FAIL: 24shan-luopan 公网内容指纹缺失"; exit 1; }
curl -sk -m 10 "${BASE}/tools/shouji-haoma-nengliang.html" | grep -q '手机号码数字能量分析' && echo "shouji-haoma-nengliang 内容指纹 OK" || { echo "FAIL: shouji 公网内容指纹缺失"; exit 1; }
# v25.0.72 回归：正骨页
curl -sk -m 10 -o /dev/null -w "正骨页 %{http_code}\n" "${BASE}/zhongyi/zhenggu" | grep -q "200" || { echo "FAIL: 正骨专区回归异常"; exit 1; }
curl -sk -m 10 "${BASE}/api/health" | grep -q '"success"' && echo "API health OK（本批零后端变更）" || echo "WARN: API health 异常"

echo ""
echo "DEPLOY_DONE ${VERSION}（phase9 增长批次上线；随后手动跑一次 Growth Pipeline 推送 IndexNow/百度队列）"
