#!/usr/bin/env node
// 20260819 P7修复自测：紫微星曜竖排+同字号 / 动态路由查询参数化 / 邀请码自动绑定
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "out");
let pass = 0, fail = 0;
const ok = (name) => { pass++; console.log(`  PASS  ${name}`); };
const bad = (name) => { fail++; console.error(`  FAIL  ${name}`); };
const read = (p) => { try { return readFileSync(join(ROOT, p), "utf8"); } catch { return ""; } };

console.log("== S1 紫微星曜布局（v29口径恢复）==");
const zw = read("src/app/yixue/ziwei/page.tsx");
zw.includes('star.name.split("").map((char, ci)') ? ok("星名逐字竖排渲染") : bad("星名逐字竖排渲染缺失");
zw.includes("const majorFs = totalCount > 12") && zw.includes("const minorFs = totalCount > 12") ? ok("按星数分档字号") : bad("字号分档缺失");
!zw.includes("fsOf") ? ok("旧三级字号逻辑已移除") : bad("旧fsOf残留");
zw.includes("star.category === \"minor\" ? minorFs : majorFs") ? ok("副星与主星同字号（仅杂曜略小）") : bad("副星同字号逻辑缺失");
zw.includes('right: "1px", bottom: "15px"') && zw.includes("宫干支+大限干支恢复昨日口径固定右下角竖排") ? ok("宫干支+大限干支右下角竖排") : bad("干支右下角定位缺失");
zw.includes('writingMode: "vertical-rl", textOrientation: "upright"') ? ok("动态星/长生竖排保持") : bad("竖排样式缺失");

console.log("== S2 动态路由静态导出修复（?id= 查询参数）==");
const friendPages = ["friends", "groups", "messages", "discover", "featured", "profile/follows", "profile/fans"].map((d) => `src/app/${d}/page.tsx`);
let pathNavLeak = false;
for (const fp of friendPages) {
  const c = read(fp);
  if (/\/(friends\/chat|friends\/profile|groups\/chat|groups\/info)\/(?!.*\?)/.test(c.replace(/generateStaticParams/g, ""))) { pathNavLeak = true; bad(`${fp} 残留路径式跳转`); }
}
!pathNavLeak && ok("全站无路径式动态路由跳转残留");
const queryPages = ["src/app/friends/chat/page.tsx", "src/app/friends/profile/page.tsx", "src/app/groups/chat/page.tsx", "src/app/groups/info/page.tsx", "src/app/discover/detail/page.tsx", "src/app/featured/detail/page.tsx", "src/app/zhongyi/yangsheng/detail/page.tsx"];
for (const qp of queryPages) {
  const c = read(qp);
  c.includes("useSearchParams") && c.includes("Suspense") ? ok(`${qp.split("/").slice(-2).join("/")} ?id=静态页`) : bad(`${qp} 缺少searchParams/Suspense`);
}
for (const cp of ["src/app/friends/chat/[id]/ClientPage.tsx", "src/app/friends/profile/[id]/ClientPage.tsx", "src/app/groups/chat/[id]/ClientPage.tsx", "src/app/groups/info/[id]/ClientPage.tsx", "src/app/discover/[id]/ClientPage.tsx", "src/app/featured/[category]/[id]/ClientPage.tsx", "src/app/zhongyi/yangsheng/[id]/ClientPage.tsx"]) {
  const c = read(cp);
  c.includes("routeId") ? ok(`${cp.split("/").slice(-2).join("/")} 支持routeId prop`) : bad(`${cp} 缺少routeId`);
}
const outPages = ["friends/chat/index.html", "friends/profile/index.html", "groups/chat/index.html", "groups/info/index.html", "discover/detail/index.html", "featured/detail/index.html", "zhongyi/yangsheng/detail/index.html"];
for (const op of outPages) existsSync(join(OUT, op)) ? ok(`out/${op}`) : bad(`out/${op} 未生成`);

console.log("== S3 邀请码自动绑定 ==");
const reg = read("src/app/register/page.tsx");
reg.includes("邀请人已自动绑定") && reg.includes("invitedByCode || referrerId") ? ok("受邀注册隐藏邀请码输入框并显示自动绑定提示") : bad("注册页自动绑定UI缺失");
const fr = read("src/app/friend/page.tsx");
fr.includes("无需填写邀请码") ? ok("下载页文案去除邀请码填写引导") : bad("下载页文案仍引导填邀请码");
!fr.includes(`邀请码：\${referrerId}`) ? ok("下载页不再展示邀请码字样") : bad("下载页仍展示邀请码");

console.log("== S4 既有bug修复 ==");
const prof = read("src/app/profile/page.tsx");
!prof.includes("qrApiUrl") ? ok("profile二维码弹窗qrApiUrl崩溃引用已清除") : bad("qrApiUrl引用残留");

console.log(`\n结果：${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
