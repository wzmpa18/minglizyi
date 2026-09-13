// 生成工具页 SEO 服务端区块：children + 工具说明 + 全组工具导航
// 同时给孙级 layout 的 title 追加"｜言道国学"后缀（title.template 在隔代 layout 不继承）
// 用法: node scripts/seo-fix/gen-tool-seo-blocks.js
const fs = require("fs");
const path = require("path");

const APP = path.join(__dirname, "..", "..", "src", "app");

const GROUPS = [
  { dir: "yixue", label: "易学" },
  { dir: "zhongyi", label: "中医" },
];

const SUFFIX = "｜言道国学";

function parseLayout(file) {
  const src = fs.readFileSync(file, "utf8");
  const title = src.match(/title:\s*"([^"]+)"/);
  const desc = src.match(/description:\s*"([^"]+)"/);
  if (!title || !desc) return null;
  if (/robots:\s*\{\s*index:\s*false/.test(src)) return null; // noindex 路由跳过
  return { title: title[1], desc: desc[1], hasSeoBlock: /TOOL_SEO_GROUP/.test(src) };
}

function buildGroupNavItems(group) {
  const dir = path.join(APP, group.dir);
  const items = [];
  for (const name of fs.readdirSync(dir).sort()) {
    if (name.startsWith("_") || name === "ClientShell.tsx") continue;
    const layoutFile = path.join(dir, name, "layout.tsx");
    if (!fs.existsSync(layoutFile)) continue;
    const parsed = parseLayout(layoutFile);
    if (!parsed) continue;
    const shortName = parsed.title.split("——")[0].replace(SUFFIX, "").trim();
    items.push({ href: `/${group.dir}/${name}/`, name: shortName, desc: parsed.desc });
  }
  return items;
}

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildLayoutCode(group, self, groupItems) {
  const navLiteral = groupItems
    .map((g) => `  { href: "${g.href}", name: "${esc(g.name)}", desc: "${esc(g.desc)}" },`)
    .join("\n");

  return `import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "${esc(self.title)}${SUFFIX}",
  description: "${esc(self.desc)}",
};

// TOOL_SEO_GROUP
const ${group.dir.toUpperCase()}_TOOLS = [
${navLiteral}
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <section style={{ maxWidth: "420px", margin: "0 auto", padding: "12px 12px 64px", backgroundColor: "#f5f5f5" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 1px 4px rgba(74,43,112,.06)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2D1A3E", margin: "0 0 8px" }}>工具说明</h2>
          <p style={{ fontSize: 12, lineHeight: 1.9, color: "#6B5B80", margin: "0 0 8px" }}>${esc(self.desc)}</p>
          <p style={{ fontSize: 12, lineHeight: 1.9, color: "#6B5B80", margin: 0 }}>本工具免费在线使用，无需下载安装，计算即时完成；登录后可保存与同步历史记录。内容基于传统典籍与现代历法推算整理，仅供传统文化学习与研究参考，不构成医疗、投资或其他专业建议。</p>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "#5E2293", margin: "14px 0 8px" }}>全部${group.label}工具导航</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {${group.dir.toUpperCase()}_TOOLS.map((g) => (
              <Link key={g.href} href={g.href} style={{ display: "block", background: "#F3ECFA", borderRadius: 12, padding: "8px 10px" }}>
                <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#5E2293" }}>{g.name}</span>
                <span style={{ display: "block", fontSize: 10.5, lineHeight: 1.6, color: "#6B5B80" }}>{g.desc.slice(0, 42)}…</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
`;
}

let done = 0, skip = 0;
for (const group of GROUPS) {
  const groupItems = buildGroupNavItems(group);
  console.log(`group ${group.dir}: ${groupItems.length} tools`);
  for (const item of groupItems) {
    const route = item.href; // "/yixue/bazi/"
    const dir = path.join(APP, route);
    const layoutFile = path.join(dir, "layout.tsx");
    const parsed = parseLayout(layoutFile);
    if (!parsed) { skip++; continue; }
    if (parsed.hasSeoBlock) { console.log(`SKIP(已有SEO区块): ${route}`); skip++; continue; }
    fs.writeFileSync(layoutFile, buildLayoutCode(group, parsed, groupItems), "utf8");
    done++;
  }
}
console.log(`\n=== 完成: 重写 ${done} 个 layout（跳过 ${skip}）===`);
