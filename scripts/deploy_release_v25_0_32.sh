#!/bin/bash
# v25.0.32 发布：P7-紫微布局-02（十二宫五区布局整改：A星曜主区统一字号+庙旺绑定 / B缓冲区 / C左下神煞 / D右侧长生 / E右侧动态栏七层简称 + 童限/小限补齐）
# 纯前端发布：源码同步校验 → 构建 → releases/v25.0.32 → current 软链 → nginx 缓存清理（无后端改动）
set -e
SRC_DIR="/root/yandaoguoxue-source"
VERSION="v25.0.32"
EXPECT_HEAD="__EXPECT_HEAD__"
BUILD_ID="${VERSION}_D20260818"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"

cd "$SRC_DIR"

echo "--- [0] 源码同步校验 ---"
HEAD=$(git rev-parse --short HEAD)
echo "HEAD: ${HEAD}"
[ "$HEAD" != "$EXPECT_HEAD" ] && { echo "FATAL: HEAD ${HEAD} != ${EXPECT_HEAD}"; exit 1; }

echo "--- [1] 构建（build.sh 静态导出） ---"
bash build.sh 2>&1 | tail -6

echo "--- [2] 页面导出校验（紫微页 + 抽检核心页） ---"
for p in yixue/ziwei "" academy academy/yikao invite register login profile privacy; do
  test -f "out/${p}/index.html" || { echo "FATAL: out/${p}/index.html missing"; exit 1; }
  echo "OK: ${p:-index}"
done

echo "--- [3] P7-紫微布局-02 功能标记入包校验（五区布局/动态星简称/童限小限） ---"
grep -rq "动态星（前缀+简称" out/_next/static/chunks/ && echo "DYN-LEGEND(动态星图例) OK" || { echo "FATAL: 动态星图例缺失"; exit 1; }
grep -rq "童限·虚岁" out/_next/static/chunks/ && echo "TONGLIMIT(童限) OK" || { echo "FATAL: 童限标记缺失"; exit 1; }
grep -rq "小限·虚岁" out/_next/static/chunks/ && echo "XIAOLIMIT(小限) OK" || { echo "FATAL: 小限标记缺失"; exit 1; }
grep -q "紫微斗数" out/yixue/ziwei/index.html && echo "ZIWEI-PAGE OK"

echo "--- [3.5] 错误IP残留与version门禁 ---"
BAD=$(grep -rl '101.32.191.210' out/ 2>/dev/null | wc -l)
[ "$BAD" -gt 0 ] && { echo "FATAL: $BAD 个文件含错误IP"; exit 1; }
echo "错误IP扫描 OK（0个文件）"
grep -q "\"version\": \"${VERSION}\"" out/version.json || { echo "FATAL: version.json 未升级"; cat out/version.json; exit 1; }
cat out/version.json

echo "--- [4] 发布到 ${RELEASE_DIR} ---"
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
cp -r out/* "$RELEASE_DIR/"
cp -r .next "$RELEASE_DIR/" 2>/dev/null || true
cp package.json "$RELEASE_DIR/" 2>/dev/null || true

RELEASE_FILES=$(find "$RELEASE_DIR" -type f | wc -l)
echo "Release file count: ${RELEASE_FILES}"
[ "$RELEASE_FILES" -lt 50 ] && { echo "FATAL: release suspiciously small"; exit 1; }

echo "--- [5] 切换 current 软链 ---"
ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
ACTUAL=$(readlink -f /root/yandaoguoxue/current)
echo "current -> ${ACTUAL}"
[ "$ACTUAL" != "$RELEASE_DIR" ] && { echo "FATAL: symlink switch failed"; exit 1; }

echo "--- [6] 清理 nginx 缓存 ---"
rm -rf /www/server/nginx/cache/* 2>/dev/null || true
nginx -s reload 2>/dev/null || true
sleep 3

echo "--- [7] 公网验证（紫微页200 + version + ICP） ---"
ZIWEI=$(curl -s -o /dev/null -w '%{http_code}' https://yandaoguoxue.cn/yixue/ziwei)
echo "公网 /yixue/ziwei: ${ZIWEI}"
[ "$ZIWEI" != "200" ] && { echo "FATAL: 紫微页公网非200"; exit 1; }
VJSON=$(curl -s https://yandaoguoxue.cn/version.json)
echo "$VJSON"
echo "$VJSON" | grep -q "\"v25.0.32\"" || { echo "WARN: 公网version未生效（可能缓存，稍后复验）"; }
HOME=$(curl -s -o /dev/null -w '%{http_code}' https://yandaoguoxue.cn/)
echo "公网首页: ${HOME}"

echo "===== DEPLOY ${VERSION} COMPLETE ====="
