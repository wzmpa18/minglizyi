// 为功能子页/协议页生成 noindex layout（解决重复标题：子功能页共享父级标题）
// 用法: node scripts/seo-fix/gen-noindex-subpages.js
const fs = require("fs");
const path = require("path");

const APP = path.join(__dirname, "..", "..", "src", "app");

const ROUTES = [
  "/yixue/wannianli/events",
  "/zhongyi/constitution/quiz",
  "/zhongyi/constitution/result",
  "/zhongyi/exam/daily",
  "/zhongyi/exam/favorites",
  "/zhongyi/exam/mock",
  "/zhongyi/exam/practice",
  "/zhongyi/exam/stats",
  "/zhongyi/exam/wrong",
  "/zhongyi/yangsheng/detail",
  "/zhongyi/yangsheng/placeholder",
  "/friend",
  "/agreement",
  "/privacy",
];

const CODE = `import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
`;

let ok = 0, skip = 0;
for (const route of ROUTES) {
  const dir = path.join(APP, route);
  if (!fs.existsSync(dir)) { console.log(`SKIP(目录不存在): ${route}`); skip++; continue; }
  const layoutFile = path.join(dir, "layout.tsx");
  if (fs.existsSync(layoutFile)) { console.log(`SKIP(已有layout): ${route}`); skip++; continue; }
  fs.writeFileSync(layoutFile, CODE, "utf8");
  ok++;
}
console.log(`\n=== 完成: 新建 ${ok} 个 noindex layout（跳过 ${skip}）===`);
