/**
 * P7-弹窗统一-01 阶段2自测：统一弹窗组件 / 返回行为 / 营销浮窗治理
 * 运行：node scripts/p7_popup_unified_check.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

let pass = 0, fail = 0;
const check = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${detail}`); }
};

console.log("== [T1] 统一弹窗组件库（5组件+导出）==");
const uiFiles = ["ConfirmDialog", "SelectorDialog", "PaymentDialog", "BottomSheet", "Toast"];
for (const f of uiFiles) {
  check(`src/components/ui/${f}.tsx 存在`, fs.existsSync(path.join(ROOT, "src/components/ui", f + ".tsx")));
}
const uiIndex = read("src/components/ui/index.ts");
check("index.ts 导出全部5组件+showToast", ["ConfirmDialog", "SelectorDialog", "PaymentDialog", "BottomSheet", "ToastHost", "showToast"].every(k => uiIndex.includes(k)));

console.log("== [T2] 统一组件内建规范（滚动锁+返回键优先关弹窗）==");
for (const f of ["ConfirmDialog", "SelectorDialog", "PaymentDialog", "BottomSheet"]) {
  const src = read(`src/components/ui/${f}.tsx`);
  check(`${f} 内建 useBodyScrollLock`, src.includes("useBodyScrollLock"));
  check(`${f} 内建 usePopupBackHandler`, src.includes("usePopupBackHandler"));
}
const paySrc = read("src/components/ui/PaymentDialog.tsx");
check("PaymentDialog 85vh+safe-area+overflowY", paySrc.includes("85vh") && paySrc.includes("safe-area-inset-bottom") && paySrc.includes("overflowY"));
const sheetSrc = read("src/components/ui/BottomSheet.tsx");
check("BottomSheet 85vh+safe-area+overflowY", sheetSrc.includes("85vh") && sheetSrc.includes("safe-area-inset-bottom") && sheetSrc.includes("overflowY"));
check("PaymentDialog 支付中防误关", paySrc.includes("paying") && paySrc.includes("!paying && onClose"));

console.log("== [T3] 考试类型选择必须居中 SelectorDialog（禁止贴底部）==");
const yikao = read("src/app/academy/yikao/page.tsx");
check("yikao 使用 SelectorDialog", yikao.includes("<SelectorDialog"));
check("yikao 考试类型标题保留", yikao.includes('title="选择考试类型"'));
const selSrc = read("src/components/ui/SelectorDialog.tsx");
check("SelectorDialog 居中（modal-overlay-center）", selSrc.includes("modal-overlay-center") && !selSrc.includes("items-end"));
check("yikao 无 items-end 选择弹层残留", !/选择考试类型[\s\S]{0,200}items-end/.test(yikao));

console.log("== [T4] yikao 页面弹窗全部走统一组件 ==");
check("yikao 使用 BottomSheet（设置）", yikao.includes("<BottomSheet"));
check("yikao 使用 PaymentDialog（付费）", yikao.includes("<PaymentDialog"));
check("yikao 移除页面自写固定定位营销浮窗", !yikao.includes('title="邀好友送题库"') && !yikao.includes("悬浮邀请入口"));
check("yikao 移除页面级双份弹窗返回拦截（由组件接管）", !yikao.includes("usePopupBackHandler("));

console.log("== [T5] 营销浮窗统一治理（PromoFloat）==");
const floatSrc = read("src/components/marketing/PromoFloat.tsx");
check("PromoFloat 后台开关 enabled", floatSrc.includes("cfg.enabled"));
check("PromoFloat 页面白名单 allowedPages", floatSrc.includes("allowedPages"));
check("PromoFloat 每日频次 dailyMaxShows", floatSrc.includes("dailyMaxShows"));
check("PromoFloat 关闭冷却 cooldownHours", floatSrc.includes("cooldownHours"));
check("PromoFloat 永久关闭 allowPermanentClose", floatSrc.includes("allowPermanentClose") && floatSrc.includes("不再显示"));
check("PromoFloat 永久关闭经 ConfirmDialog 确认", floatSrc.includes("ConfirmDialog"));
check("PromoFloat 无定时器/自动弹出逻辑", !/setTimeout|setInterval/.test(floatSrc.replace(/setTimeout\(\(\) => \{\s*\}/g, "")) || !/(setTimeout|setInterval)\(/.test(floatSrc));
const tcs = read("src/lib/toolConfigStore.ts");
check("toolConfigStore 含 promoFloat 配置块", tcs.includes("promoFloat: PromoFloatConfig") || tcs.includes("promoFloat: {"));
check("首发默认关闭（enabled: false）", /promoFloat:\s*\{[^}]*enabled:\s*false/s.test(tcs));
check("白名单仅推广中心/个人中心/邀请页", /allowedPages:\s*\["\/invite",\s*"\/profile\/promote",\s*"\/profile"\]/.test(tcs));
check("getToolConfig 合并 promoFloat", tcs.includes("promoFloat: { ...DEFAULT_TOOL_CONFIG.promoFloat"));

console.log("== [T6] 根布局挂载统一宿主 ==");
const layout = read("src/app/layout.tsx");
check("根布局挂载 ToastHost", layout.includes("<ToastHost />"));
check("根布局挂载 PromoFloat", layout.includes("<PromoFloat />"));

console.log("== [T7] friends 页迁移统一 ConfirmDialog ==");
const friends = read("src/app/friends/page.tsx");
check("friends 引用统一 ConfirmDialog", friends.includes('ConfirmDialog as UnifiedConfirmDialog'));
check("friends 无本地自写 ConfirmDialog 函数", !/function ConfirmDialog\(/.test(friends));

console.log("== [T8] 返回行为红线（抽查：返回只返回上一层，不触发业务弹窗）==");
const brandHeader = read("src/components/shared/brand-header.tsx");
check("brand-header 返回仅 router.back()", /router\.back\(\)/.test(brandHeader) && !/setShow\w+\(true\)/.test(brandHeader));
const zyLayout = read("src/app/zhongyi/layout.tsx");
check("zhongyi 返回先关弹窗再 back", zyLayout.includes("zhongyi-back") && zyLayout.includes("router.back()"));
check("yikao 返回不弹考试类型（仅 history>1 时 back）", yikao.includes("window.history.length > 1") && !/router\.back\(\)[\s\S]{0,80}setShowExamPicker\(true\)/.test(yikao));

console.log("== [T9] 构建产物功能标记入包 ==");
const chunksDir = path.join(ROOT, "out/_next/static/chunks");
if (fs.existsSync(chunksDir)) {
  const chunkText = fs.readdirSync(chunksDir).filter(f => f.endsWith(".js")).map(f => {
    try { return fs.readFileSync(path.join(chunksDir, f), "utf8"); } catch { return ""; }
  }).join("");
  check("构建包含 SelectorDialog（选择考试类型）", chunkText.includes("选择考试类型"));
  check("构建包含统一 Paywall 文案", chunkText.includes("支付处理中"));
  check("构建包含营销浮窗治理标记", chunkText.includes("不再显示推广浮窗"));
  check("构建包无 yikao 自写浮窗残留", !chunkText.includes('title="邀好友送题库"'));
} else {
  check("out/_next/static/chunks 存在（先运行构建）", false);
}

console.log(`\n===== P7-弹窗统一-01 自测结果：PASS ${pass} / FAIL ${fail} =====`);
process.exit(fail > 0 ? 1 : 0);
