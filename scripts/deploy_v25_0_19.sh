#!/bin/bash
# ===== v25.0.19 发布脚本：P6 言道学堂 + 社交后端化 + 版本热更新 =====
# 前置：门禁已通过(deploy_standard.sh ALL_GATES_PASS)，构建已完成(npm run build exit 0)
set -euo pipefail

VERSION="v25.0.19"
SRC_DIR="/root/yandaoguoxue-source"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"

cd "$SRC_DIR"

echo "--- [1] Verify source commit ---"
git log --oneline -1

echo "--- [2] Verify build output exists ---"
if [ ! -f "out/index.html" ]; then
  echo "FATAL: out/index.html not found - build output missing"
  exit 1
fi
echo "out/index.html OK ($(du -sh out | cut -f1))"

echo "--- [3] Verify academy pages exported ---"
for p in academy academy/learn academy/question-bank academy/exam academy/certificates academy/wrong-book academy/factory academy/factory/review; do
  if [ ! -f "out/${p}/index.html" ]; then
    echo "FATAL: out/${p}/index.html missing"
    exit 1
  fi
  echo "OK: ${p}"
done

echo "--- [4] Release to ${RELEASE_DIR} ---"
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
cp -r out/* "$RELEASE_DIR/"
cp -r .next "$RELEASE_DIR/" 2>/dev/null || true
cp package.json "$RELEASE_DIR/" 2>/dev/null || true

echo "--- [5] Verify release content ---"
RELEASE_FILES=$(find "$RELEASE_DIR" -type f | wc -l)
echo "Release file count: ${RELEASE_FILES}"
if [ "$RELEASE_FILES" -lt 50 ]; then
  echo "FATAL: release content suspiciously small"
  exit 1
fi

echo "--- [6] Verify version.json ---"
cat "$RELEASE_DIR/version.json"

echo "--- [7] Switch current symlink ---"
ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
ACTUAL=$(readlink -f /root/yandaoguoxue/current)
echo "current -> ${ACTUAL}"
if [ "$ACTUAL" != "$RELEASE_DIR" ]; then
  echo "FATAL: symlink switch failed"
  exit 1
fi

echo "--- [8] Clean Nginx cache + reload ---"
rm -rf /www/server/nginx/cache/* 2>/dev/null || true
nginx -s reload 2>/dev/null || true

echo "--- [9] Public verification ---"
sleep 3
BASE="https://yandaoguoxue.yandao.vip"
curl -sk -o /dev/null -w "HOME:%{http_code} time:%{time_total}s\n" ${BASE}/
curl -sk -o /dev/null -w "ACADEMY:%{http_code}\n" ${BASE}/academy.html
curl -sk -o /dev/null -w "LEARN:%{http_code}\n" ${BASE}/academy/learn.html
curl -sk -o /dev/null -w "BANK:%{http_code}\n" ${BASE}/academy/question-bank.html
curl -sk -o /dev/null -w "EXAM:%{http_code}\n" ${BASE}/academy/exam.html
curl -sk -o /dev/null -w "CERT:%{http_code}\n" ${BASE}/academy/certificates.html
curl -sk -o /dev/null -w "WRONG:%{http_code}\n" ${BASE}/academy/wrong-book.html
curl -sk -o /dev/null -w "FACTORY:%{http_code}\n" ${BASE}/academy/factory.html
curl -sk -o /dev/null -w "REVIEW:%{http_code}\n" ${BASE}/academy/factory/review.html
curl -sk -o /dev/null -w "PROFILE:%{http_code}\n" ${BASE}/profile.html
curl -sk -o /dev/null -w "SOCIAL:%{http_code}\n" ${BASE}/social.html
curl -sk -o /dev/null -w "LOGIN:%{http_code}\n" ${BASE}/login.html
echo "VERSION_JSON: $(curl -sk ${BASE}/version.json)"

echo "--- [10] Backend API verification ---"
curl -s http://127.0.0.1:3001/api/academy/tracks | head -c 80; echo
curl -s http://127.0.0.1:3001/api/social/posts | head -c 80; echo

echo "--- [11] Feature markers in public HTML ---"
curl -sk ${BASE}/academy.html | grep -o "言道学堂\|知识工厂\|AI 知识工厂" | sort | uniq -c | head -5
curl -sk ${BASE}/profile.html | grep -o "学习中心\|内容中心\|社区中心\|商业中心\|推广中心\|系统中心" | sort | uniq -c

echo "===== DEPLOY v25.0.19 COMPLETE ====="
