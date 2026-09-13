// 从各工具页 layout.tsx 提取 title/description，生成共享导航数据模块 src/lib/toolNavData.ts
// 用法: node scripts/seo-fix/gen-tool-nav-data.js
const fs = require("fs");
const path = require("path");

const APP = path.join(__dirname, "..", "..", "src", "app");
const LIB = path.join(APP, "..", "lib", "toolNavData.ts");

function collect(group) {
  const dir = path.join(APP, group);
  const items = [];
  for (const name of fs.readdirSync(dir).sort()) {
    const layoutFile = path.join(dir, name, "layout.tsx");
    if (!fs.existsSync(layoutFile)) continue;
    const src = fs.readFileSync(layoutFile, "utf8");
    const title = src.match(/title:\s*"([^"]+)"/);
    const desc = src.match(/description:\s*"([^"]+)"/);
    if (!title || !desc) continue;
    if (/robots:\s*\{\s*index:\s*false/.test(src)) continue;
    items.push({ href: `/${group}/${name}/`, name: title[1].split("——")[0].replace("｜言道国学", "").trim(), desc: desc[1] });
  }
  return items;
}

const yixue = collect("yixue");
const zhongyi = collect("zhongyi");

const code = `// 自动生成：scripts/seo-fix/gen-tool-nav-data.js（数据源为各工具页 layout.tsx 的 title/description）
export interface ToolNavItem {
  href: string;
  name: string;
  desc: string;
}

export const YIXUE_TOOLS: ToolNavItem[] = [
${yixue.map((x) => `  { href: "${x.href}", name: "${x.name}", desc: "${x.desc}" },`).join("\n")}
];

export const ZHONGYI_TOOLS: ToolNavItem[] = [
${zhongyi.map((x) => `  { href: "${x.href}", name: "${x.name}", desc: "${x.desc}" },`).join("\n")}
];
`;

fs.writeFileSync(LIB, code, "utf8");
console.log(`yixue: ${yixue.length}, zhongyi: ${zhongyi.length} -> ${LIB}`);
