#!/bin/bash
# FINAL-SEAL-03 第三十四/三十五章: www.yandao.vip 官网统一到当前正式 APK
# 国学传承=言道国学旧品牌名, 下载链接全部指向 v25.0.47 正式包
set -e
NEW_APK="yandao-guoxue-v25.0.47-release.apk"
NEW_URL="https://www.yandao.vip/app-download/${NEW_APK}"
SITE=/www/yandao-company

echo "--- [1] 备份官网三个HTML ---"
mkdir -p /root/backup/archive/www_site_20260822
cp -f $SITE/index.html $SITE/app.html $SITE/app-pages/guoxue.html /root/backup/archive/www_site_20260822/

echo "--- [2] index.html / app.html: APK链接统一 ---"
for f in $SITE/index.html $SITE/app.html; do
  sed -i "s|https://www.yandao.vip/app-download/guoxue-chuancheng-v1.0-release.apk|${NEW_URL}|g" "$f"
  sed -i "s|/app-download/guoxue/guoxue-chuancheng-v1.0.apk|/app-download/${NEW_APK}|g" "$f"
  sed -i "s|guoxue-chuancheng-v1.0.apk|${NEW_APK}|g" "$f"
  sed -i 's|>v1.0<|>v25.0.47<|g' "$f"
  sed -i 's|下载 国学传承 APP|下载 言道国学 APP|g; s|下载 国学传承APP|下载 言道国学APP|g' "$f"
done

echo "--- [3] app-pages/guoxue.html: 下载链接统一 ---"
sed -i "s|/app-download/guoxue/guoxue.apk|/app-download/${NEW_APK}|g" $SITE/app-pages/guoxue.html

echo "--- [4] 校验替换结果 ---"
echo "[index.html 残留旧引用]"; grep -c 'guoxue-chuancheng' $SITE/index.html || true
echo "[app.html 残留旧引用]"; grep -c 'guoxue-chuancheng' $SITE/app.html || true
echo "[guoxue.html 残留旧引用]"; grep -c 'guoxue\.apk' $SITE/app-pages/guoxue.html || true
echo "[新链接计数 index/app/guoxue]"; grep -c "$NEW_APK" $SITE/index.html; grep -c "$NEW_APK" $SITE/app.html; grep -c "$NEW_APK" $SITE/app-pages/guoxue.html

echo "--- [5] 清理旧APK(引用已归零) ---"
cd /var/www/yandao.vip/app-download
ls -la *.apk
rm -f guoxue-chuancheng-v1.0-release.apk yandao-guoxue-v25.0.41-release.apk yandao-guoxue-v25.0.42-release.apk yandao-guoxue-v25.0.45-release.apk
echo "[清理后]"; ls -la *.apk
md5sum *.apk

echo "--- [6] 归档旧nginx配置.bak ---"
mv -f /www/server/panel/vhost/nginx/yandaoguoxue.vip.conf.bak.* /www/server/panel/vhost/nginx/yandaoguoxue.vip.conf.clean_backup.* /root/backup/archive/ 2>/dev/null || true
ls /www/server/panel/vhost/nginx/ | grep yandao

echo "--- [7] 公网验证 ---"
nginx -t 2>&1 | tail -1
curl -s -o /dev/null -w '官网首页: %{http_code}\n' -L https://www.yandao.vip/
curl -s -o /dev/null -w '官网APK直链(经跳转): %{http_code}\n' -L "https://www.yandao.vip/app-download/${NEW_APK}"
curl -s https://www.yandao.vip/ | grep -oE 'href="[^"]*\.apk"' | sort -u
curl -s -o /dev/null -w 'APP站下载页: %{http_code}\n' https://yandaoguoxue.yandao.vip/download
