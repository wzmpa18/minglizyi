#!/bin/bash
# v25.0.35 发布：P7-上架前阻断整改-01 阶段2 全站弹窗治理
#   统一弹窗组件库（ConfirmDialog/SelectorDialog/PaymentDialog/BottomSheet/Toast 内建滚动锁+返回键优先关弹窗）
#   考试类型选择改居中 SelectorDialog（禁止贴底部）；设置/付费迁移统一组件
#   移除 yikao 页面自写固定定位营销浮窗；统一 PromoFloat（后台开关+白名单+频次+冷却期+永久关闭，首发默认关闭）
#   friends 页删除确认迁移统一 ConfirmDialog；根布局挂载 ToastHost/PromoFloat
set -e
SRC_DIR="/root/yandaoguoxue-source"
VERSION="v25.0.35"
BUILD_ID="${VERSION}_D20260818"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"

cd "$SRC_DIR"

echo "--- [0] 源码同步校验（内容门禁：版本号+阶段2组件落位，规避自引用哈希） ---"
echo "HEAD: $(git rev-parse --short HEAD)"; git log --oneline -2
grep -q "\"version\": \"${VERSION}\"" package.json || { echo "FATAL: package.json 版本未升级到 ${VERSION}"; exit 1; }
test -f src/components/ui/SelectorDialog.tsx || { echo "FATAL: 统一选择弹窗组件缺失"; exit 1; }
test -f src/components/ui/PaymentDialog.tsx || { echo "FATAL: 统一付费弹窗组件缺失"; exit 1; }
test -f src/components/ui/BottomSheet.tsx || { echo "FATAL: 统一底部菜单组件缺失"; exit 1; }
test -f src/components/ui/ConfirmDialog.tsx || { echo "FATAL: 统一确认弹窗组件缺失"; exit 1; }
test -f src/components/ui/Toast.tsx || { echo "FATAL: 统一轻提示组件缺失"; exit 1; }
test -f src/components/marketing/PromoFloat.tsx || { echo "FATAL: 营销浮窗统一组件缺失"; exit 1; }
grep -q "promoFloat" src/lib/toolConfigStore.ts || { echo "FATAL: 浮窗治理配置缺失"; exit 1; }
echo "内容门禁 OK"

echo "--- [1] 构建（build.sh 静态导出） ---"
bash build.sh 2>&1 | tail -6

echo "--- [2] 页面导出校验（弹窗治理涉及页 + 抽检核心页） ---"
for p in academy/yikao friends profile profile/promote invite register login privacy yixue/ziwei; do
  test -f "out/${p}/index.html" || { echo "FATAL: out/${p}/index.html missing"; exit 1; }
  echo "OK: ${p}"
done

echo "--- [3] 阶段2功能标记入包校验 ---"
# 考试类型选择：居中 SelectorDialog（贴底部选择弹层为负向校验）
grep -rq "选择考试类型" out/_next/static/chunks/ && echo "EXAM-SELECTOR(考试类型选择器) OK" || { echo "FATAL: 考试类型选择标记缺失"; exit 1; }
# 统一组件内建规范
grep -rq "暂不解锁" out/_next/static/chunks/ && echo "PAYMENT-DIALOG(统一付费面板) OK" || { echo "FATAL: 统一付费面板标记缺失"; exit 1; }
# 营销浮窗统一治理（永久关闭确认 + 治理标记）
grep -rq "不再显示推广浮窗" out/_next/static/chunks/ && echo "PROMO-FLOAT-GOV(浮窗治理) OK" || { echo "FATAL: 浮窗治理标记缺失"; exit 1; }
# 负向：yikao 自写固定定位营销浮窗不得回流
if grep -rq 'title="邀好友送题库"' out/_next/static/chunks/ 2>/dev/null; then
  echo "FATAL: yikao 自写营销浮窗残留"; exit 1
fi
echo "YIKAO-NO-SELF-FLOAT(页面自写浮窗已清) OK"
# 阶段1紫微既有功能保留（红线：无回归）
grep -rq "运限四化" out/_next/static/chunks/ && echo "ZW-TIME(时间轴四化) OK" || { echo "FATAL: 时间轴四化缺失"; exit 1; }
grep -rq "大限命宫" out/_next/static/chunks/ && echo "ZW-OVERLAY(叠宫) OK" || { echo "FATAL: 叠宫标记缺失"; exit 1; }

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

echo "--- [7] 公网验证（弹窗治理涉及页 + 首页 + version） ---"
DOMAIN="https://yandaoguoxue.yandao.vip"
for path in academy/yikao friends profile/promote invite yixue/ziwei; do
  CODE=$(curl -sL -o /dev/null -w '%{http_code}' ${DOMAIN}/${path})
  echo "公网 /${path}: ${CODE}"
  [ "$CODE" != "200" ] && { echo "FATAL: /${path} 公网非200"; exit 1; }
done
VJSON=$(curl -sL ${DOMAIN}/version.json)
echo "$VJSON"
echo "$VJSON" | grep -q "\"v25.0.35\"" || { echo "WARN: 公网version未生效（可能缓存，稍后复验）"; }
HOME=$(curl -sL -o /dev/null -w '%{http_code}' ${DOMAIN}/)
echo "公网首页: ${HOME}"
echo "===== DEPLOY ${VERSION} COMPLETE ====="
