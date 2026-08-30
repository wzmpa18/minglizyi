#!/bin/bash
# ============================================================================
# 站长平台验证文件·第二批（2026-08-31）
#   ① 主站 www.yandao.vip：百度(baidu_verify_codeva-JdVUh0FlbC.html)+谷歌(google5ebbc484799c2806.html)
#      → /www/yandao-verify/ 持久目录 + yandao.vip.conf 两 server 块精确 location
#   ② 头条修复：真实下载文件名为 ByteDanceVerify.html（KIKI 误用内容码当文件名）
#      → 补部署 /ByteDanceVerify.html（保留原 U447glXVJ3l8Obskdb3h.html 双保险）
# ============================================================================
set -euo pipefail
MAIN_CONF="/www/server/panel/vhost/nginx/yandao.vip.conf"
GUOXUE_CONF="/www/server/panel/vhost/nginx/yandaoguoxue.vip.conf"
MAIN_VERIFY="/www/yandao-verify"
GUOXUE_VERIFY="/root/yandaoguoxue/verify"
BAK=$(date +%Y%m%d_%H%M%S)

echo "=== [1] 主站验证文件写入 ${MAIN_VERIFY} ==="
mkdir -p "$MAIN_VERIFY"
printf 'fe012a0e3cdf568620573514eabf8fe2\n' > "$MAIN_VERIFY/baidu_verify_codeva-JdVUh0FlbC.html"
printf 'google-site-verification: google5ebbc484799c2806.html\n' > "$MAIN_VERIFY/google5ebbc484799c2806.html"
chmod 644 "$MAIN_VERIFY"/*.html
ls -la "$MAIN_VERIFY"
for f in "$MAIN_VERIFY"/*.html; do echo "== $f =="; cat "$f"; done

echo "=== [2] 头条 ByteDanceVerify.html 补部署（真实文件名） ==="
printf 'U447glXVJ3l8Obskdb3h\n' > "$GUOXUE_VERIFY/ByteDanceVerify.html"
chmod 644 "$GUOXUE_VERIFY/ByteDanceVerify.html"
ls -la "$GUOXUE_VERIFY"

echo "=== [3] 备份两份 nginx 配置 ==="
cp -f "$MAIN_CONF" "${MAIN_CONF}.bak_verify2_${BAK}"
cp -f "$GUOXUE_CONF" "${GUOXUE_CONF}.bak_verify2_${BAK}"
echo "backed up: .bak_verify2_${BAK}"

echo "=== [4] 主站 nginx 插入精确 location（幂等） ==="
if grep -q 'baidu_verify_codeva-JdVUh0FlbC' "$MAIN_CONF"; then
  echo "主站验证 location 已存在，跳过"
else
  python3 - <<'PYEOF'
conf = "/www/server/panel/vhost/nginx/yandao.vip.conf"
with open(conf, "r", encoding="utf-8") as f:
    content = f.read()
anchor = "    # APK下载重定向 - 旧二维码兼容，重定向到国学站点"
count = content.count(anchor)
if count == 0:
    raise SystemExit("FATAL: 未找到主站插入锚点")
block = """    # ========== 站长平台验证文件（持久目录 /www/yandao-verify，与官网静态目录解耦） ==========
    location = /baidu_verify_codeva-JdVUh0FlbC.html { root /www/yandao-verify; add_header Cache-Control "no-cache"; }
    location = /google5ebbc484799c2806.html { root /www/yandao-verify; add_header Cache-Control "no-cache"; }

"""
content = content.replace(anchor, block + anchor)
with open(conf, "w", encoding="utf-8") as f:
    f.write(content)
print(f"主站 inserted into {count} server blocks")
PYEOF
fi

echo "=== [5] 国学站 nginx 追加 ByteDanceVerify location（幂等） ==="
if grep -q 'ByteDanceVerify' "$GUOXUE_CONF"; then
  echo "ByteDanceVerify location 已存在，跳过"
else
  python3 - <<'PYEOF'
conf = "/www/server/panel/vhost/nginx/yandaoguoxue.vip.conf"
with open(conf, "r", encoding="utf-8") as f:
    content = f.read()
old = '    location = /U447glXV3l8Obskdb3h.html { root /root/yandaoguoxue/verify; add_header Cache-Control "no-cache"; }'
# 精确原行（防手误，逐字符匹配）
old = '    location = /U447glXVJ3l8Obskdb3h.html { root /root/yandaoguoxue/verify; add_header Cache-Control "no-cache"; }'
new = old + '\n    location = /ByteDanceVerify.html { root /root/yandaoguoxue/verify; add_header Cache-Control "no-cache"; }'
count = content.count(old)
if count == 0:
    raise SystemExit("FATAL: 未找到国学站 U447 location 锚点行")
content = content.replace(old, new)
with open(conf, "w", encoding="utf-8") as f:
    f.write(content)
print(f"国学站 ByteDanceVerify appended in {count} server blocks")
PYEOF
fi

echo "=== [6] nginx 校验 + 热加载 ==="
nginx -t 2>&1
nginx -s reload
sleep 1

echo "=== [7] 公网实测（内容级） ==="
echo "--- 主站 www.yandao.vip ---"
echo "baidu(w w) => $(curl -sk -m 10 https://www.yandao.vip/baidu_verify_codeva-JdVUh0FlbC.html)"
echo "baidu(apex) => $(curl -sk -m 10 https://yandao.vip/baidu_verify_codeva-JdVUh0FlbC.html)"
echo "google(www) => $(curl -sk -m 10 https://www.yandao.vip/google5ebbc484799c2806.html)"
echo "--- 国学站头条双文件名 ---"
echo "ByteDanceVerify => $(curl -sk -m 10 https://yandaoguoxue.yandao.vip/ByteDanceVerify.html)"
echo "U447(原) => $(curl -sk -m 10 https://yandaoguoxue.yandao.vip/U447glXVJ3l8Obskdb3h.html)"
echo "--- 回归 ---"
echo "main index: $(curl -sk -m 10 -o /dev/null -w '%{http_code}' https://www.yandao.vip/)"
echo "guoxue index: $(curl -sk -m 10 -o /dev/null -w '%{http_code}' https://yandaoguoxue.yandao.vip/)"
echo "guoxue baidu(旧): $(curl -sk -m 10 https://yandaoguoxue.yandao.vip/baidu_verify_codeva-mdfUGkzbxU.html)"
echo "health: $(curl -sk -m 10 https://yandaoguoxue.yandao.vip/api/health | grep -o '"success": *[a-z]*')"
echo "FIX2_DONE"
