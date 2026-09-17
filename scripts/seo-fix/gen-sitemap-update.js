// 更新 public/sitemap.xml：移除 noindex 的 /invite/，追加工具页与辅助页，刷新改动页 lastmod
// 用法: node scripts/seo-fix/gen-sitemap-update.js
const fs = require("fs");
const path = require("path");

const PUB = path.join(__dirname, "..", "..", "public", "sitemap.xml");
const BASE = "https://yandaoguoxue.yandao.vip";
const TODAY = "2026-09-13";

const src = fs.readFileSync(PUB, "utf8");

// 从 toolNavData.ts 提取全部工具 href
const navSrc = fs.readFileSync(path.join(__dirname, "..", "..", "src", "lib", "toolNavData.ts"), "utf8");
const hrefs = [...navSrc.matchAll(/href: "([^"]+)"/g)].map((m) => m[1]);

// 额外补充页面
const extra = ["/ai/", "/books/", "/membership/", "/academy/yikao/"];
const all = [...hrefs, ...extra];

let out = src;

// 1) 移除 noindex 的 /invite/
out = out.replace(/  <url><loc>https:\/\/yandaoguoxue\.yandao\.vip\/invite\/<\/loc>[^\n]*\n/, "");

// 2) 追加新 URL（在 </urlset> 前）
const existing = [...out.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const additions = [];
for (const p of all) {
  const loc = BASE + p;
  if (existing.includes(loc)) continue;
  const isHub = p === "/ai/" || p === "/books/" || p === "/membership/" || p === "/academy/yikao/";
  const prio = isHub ? "0.7" : "0.6";
  additions.push(`  <url><loc>${loc}</loc><changefreq>weekly</changefreq><priority>${prio}</priority><lastmod>${TODAY}</lastmod></url>\n`);
}
out = out.replace("</urlset>", additions.join("") + "</urlset>");

// 3) 刷新本次改动的已有页面 lastmod（先清除旧 lastmod 再写入新的，避免重复标签）
const changed = ["/", "/yixue/", "/zhongyi/", "/academy/", "/academy/yixue/", "/b/", "/app/", "/learn/", "/tools/", "/download/"];
for (const p of changed) {
  const loc = BASE + p;
  const re = new RegExp(`(<url><loc>${loc.replace(/\//g, "\\/")}<\\/loc><changefreq>[a-z]+<\\/changefreq><priority>[\\d.]+<\\/priority>)(<lastmod>[\\d-]+<\\/lastmod>)*`);
  out = out.replace(re, `$1<lastmod>${TODAY}</lastmod>`);
}
// 4) 兜底：把重复连续的 lastmod 压成一个（每条 url 只保留一个）
out = out.replace(/(<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>)(?:<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>)+/g, "$1");

fs.writeFileSync(PUB, out, "utf8");
console.log(`tools in nav: ${hrefs.length}, extra: ${extra.length}, added: ${additions.length}`);
console.log(`total locs: ${(out.match(/<loc>/g) || []).length}`);
