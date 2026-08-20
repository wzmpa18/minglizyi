// ============================================================================
// P7-MKT-POSTER-02 营销引擎 E2E 测试（第六十三/六十四条 + 最终验收标准）
// 运行：node scripts/p7-mkt-poster-e2e.cjs
// ============================================================================

const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");
const ROOT = path.resolve(__dirname, "..");
const M = (f) => require(path.join(ROOT, ".tmp-mkt-e2e", f));

if (!fs.existsSync(path.join(ROOT, ".tmp-mkt-e2e", "recommend.js"))) {
  execSync(
    "npx tsc src/lib/marketing/types.ts src/lib/marketing/audiences.ts src/lib/marketing/products.ts src/lib/marketing/channels.ts src/lib/marketing/templates.ts src/lib/marketing/copyLibrary.ts src/lib/marketing/compliance.ts src/lib/marketing/recommend.ts --outDir .tmp-mkt-e2e --module commonjs --target es2020 --moduleResolution node --skipLibCheck --esModuleInterop",
    { cwd: ROOT, stdio: "inherit" }
  );
}

const { validateCopyText, validateCopySet, COMPLIANCE_E2E_CASES } = M("compliance.js");
const { CHANNELS, channelAllowsQr } = M("channels.js");
const { COPY_LIBRARY, selectCopy, DISCLAIMERS } = M("copyLibrary.js");
const { AUDIENCES, AUDIENCE_LIST } = M("audiences.js");
const { PRODUCTS, PRODUCT_LIST } = M("products.js");
const { TEMPLATE_FAMILIES, TEMPLATE_FAMILY_LIST, TOTAL_VARIANT_COUNT } = M("templates.js");
const { recommend } = M("recommend.js");

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail = "") {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; failures.push(`${name} ${detail}`); console.log(`  FAIL  ${name} ${detail}`); }
}

console.log("== 1. 合规E2E：恶意输入必须全部被拦截（第六十三条） ==");
const malicious = [
  ...COMPLIANCE_E2E_CASES,
  "全网第一的国学工具",
  "100%准确预测",
  "根治疾病",
  "分享赚钱",
  "多推多得",
  "全网最全医易综合工具箱",
  "功能吊打市面高价软件",
  "治愈迷茫与内耗",
  "文化研习后保证你财运提升",
  "调理疾病改善体质",
  "躺赚被动收益",
  "延年益寿疗效保证",
];
for (const t of malicious) {
  const r = validateCopyText(t);
  check(`拦截「${t.slice(0, 14)}」`, !r.passed, r.passed ? "未被拦截!" : "");
}

console.log("== 2. Approved Copy Library 全量合规（全部必须通过） ==");
check("文案库数量>=9", COPY_LIBRARY.length >= 9, `实际${COPY_LIBRARY.length}`);
for (const c of COPY_LIBRARY) {
  const r = validateCopySet([c.title, c.subtitle, ...c.sellingPoints, c.cta, c.momentsCopy, c.groupCopy]);
  check(`文案${c.copyId}合规`, r.passed, r.violations.map((v) => v.word).join(","));
  check(`文案${c.copyId}状态ACTIVE`, c.status === "ACTIVE");
  check(`文案${c.copyId}私聊语气>=3`, c.privateCopies.length >= 3);
}
// 价格不得写死（第十七条）
const priceHardcoded = COPY_LIBRARY.filter((c) => /[0-9]+元|\u00a5[0-9]/.test(c.title + c.subtitle + c.sellingPoints.join()));
check("无写死价格", priceHardcoded.length === 0, priceHardcoded.map((c) => c.copyId).join(","));

console.log("== 3. 渠道E2E（第六十四条）：小红书禁站外二维码 ==");
check("C06小红书 qrAllowed=false", CHANNELS.C06.qrAllowed === false);
check("C06小红书 externalLinkAllowed=false", CHANNELS.C06.externalLinkAllowed === false);
check("channelAllowsQr('C06')=false", channelAllowsQr("C06") === false);
check("C01朋友圈允许二维码", channelAllowsQr("C01") === true);
check("渠道总数=10", Object.keys(CHANNELS).length === 10);

console.log("== 4. 圈层/产品差异（验收1/2/3条） ==");
const recZhongyi = recommend("P09", "A05", "C03", true);
const recYoung = recommend("P06", "A01", "C02", true);
check("中医圈层首选T02", recZhongyi[0].variant.family === "T02", recZhongyi[0].variant.family);
check("年轻塔罗圈层首选T03", recYoung[0].variant.family === "T03", recYoung[0].variant.family);
check("不同圈层生成不同海报家族", recZhongyi[0].variant.family !== recYoung[0].variant.family);
check("推荐恰好3套", recZhongyi.length === 3 && recYoung.length === 3);
const copyZhongyi = selectCopy("P09", "A05");
const copyAi = selectCopy("P11", "A08");
check("不同产品不同卖点", JSON.stringify(copyZhongyi.sellingPoints) !== JSON.stringify(copyAi.sellingPoints));
check("通用版首选T01", recommend("P09", "A05", "C01", false)[0].variant.family === "T01");

console.log("== 5. 全矩阵覆盖：每个产品×圈层都能取到ACTIVE文案与推荐 ==");
let allCovered = true;
for (const p of PRODUCT_LIST) {
  for (const a of AUDIENCE_LIST) {
    const c = selectCopy(p.id, a.id);
    if (!c || c.status !== "ACTIVE" || !c.title) { allCovered = false; console.log(`  缺口: ${p.id}×${a.id}`); }
    const r = recommend(p.id, a.id, "C01", true);
    if (r.length !== 3) { allCovered = false; console.log(`  推荐缺口: ${p.id}×${a.id}`); }
  }
}
check("14产品×8圈层全覆盖", allCovered);

console.log("== 6. 模板体系（第十三条） ==");
check("模板总数>=18", TOTAL_VARIANT_COUNT >= 18, `实际${TOTAL_VARIANT_COUNT}`);
for (const f of TEMPLATE_FAMILY_LIST) {
  check(`家族${f.id}变体>=3`, f.variants.length >= 3, `实际${f.variants.length}`);
}
const ratioSet = new Set();
for (const f of TEMPLATE_FAMILY_LIST) for (const v of f.variants) v.ratios.forEach((r) => ratioSet.add(r));
check("支持4种比例(9:16/3:4/1:1/长图)", ratioSet.size === 4, [...ratioSet].join(","));

console.log("== 7. 隐私E2E（第六十二条）：头像默认不公开 ==");
const posterSrc = fs.readFileSync(path.join(ROOT, "src/app/invite/poster/page.tsx"), "utf8");
check("showAvatar默认false", /showAvatar,\s*setShowAvatar\]\s*=\s*useState\(false\)/.test(posterSrc));
check("showNickname默认true", /showNickname,\s*setShowNickname\]\s*=\s*useState\(true\)/.test(posterSrc));
check("页面包含头像主动开启提示", posterSrc.includes("未经你主动开启不会在海报中展示"));
check("二维码自测失败禁止保存", posterSrc.includes("二维码自测未通过，禁止保存"));
check("只记share_started不伪造成功", posterSrc.includes("system_share_started"));
check("复用服务端签名邀请链接", posterSrc.includes("getInviteLink"));
check("价格未写死(price:null)", posterSrc.includes("price: null"));

console.log("== 8. 免责声明按产品动态（第二十七条） ==");
check("四类免责声明齐备", Object.keys(DISCLAIMERS).length === 4);
check("易学声明含独立判断", DISCLAIMERS.yixue.includes("独立判断"));
check("中医声明含不提供医疗诊断", DISCLAIMERS.zhongyi.includes("不提供医疗诊断"));

console.log(`\n结果: ${pass} 通过 / ${fail} 失败`);
if (fail > 0) { console.log("失败项:", failures); process.exit(1); }
console.log("P7-MKT-POSTER-02 E2E: ALL PASS");
