/** FINAL-15 SEO增长集群生成主脚本：中医自学(10) + 医考题库(10) + 七政学习(16) + sitemap更新 */
const fs = require("fs");
const path = require("path");
const { SITE, renderPage } = require("./template");
const zixuePages = require("./content-zixue");
const yikaoPages = require("./content-yikao");
const { TOPICS, topicPage, pillarPage } = require("./content-qizheng");

const PUB = path.join(__dirname, "..", "..", "public");

function writePage(p) {
  const file = path.join(PUB, p.path.replace(/^\//, "").replace(/\/$/, "/index.html"));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const html = renderPage(p);
  fs.writeFileSync(file, html, "utf8");
  const kb = (Buffer.byteLength(html, "utf8") / 1024).toFixed(1);
  console.log(`OK ${p.path} (${kb}KB)`);
}

/** hub 页（目录索引） */
function hubPage({ dir, title, h1, lead, cards, desc, keywords }) {
  const cardHtml = cards.map(([label, href, note]) => `<div class="toc-links"><a href="${href}"><strong>${label}</strong><br/><span style="font-size:12px;color:var(--muted)">${note}</span></a></div>`).join("");
  return {
    path: `/${dir}/index.html`,
    crumb: h1,
    title, desc, keywords,
    h1, lead,
    sections: [{ id: "mulu", h2: "目录", html: [cardHtml] }],
    tryLinks: [],
    faq: [],
    related: [],
    clusterNavTitle: "", clusterNav: [],
  };
}

// ---- 1. 生成中医自学集群 ----
console.log("== 中医自学集群 ==");
for (const p of zixuePages) writePage(p);
writePage(hubPage({
  dir: "zixue",
  title: "中医自学学习中心：路线图+方法文+免费题库_言道国学",
  desc: "中医自学中心：三阶段学习路线图，入门/基础理论/中药/方剂/经络/诊断/伤寒论/内经方法文，配1447道免费题库与典籍工具。",
  keywords: "中医自学,中医学习中心,中医路线图,中医免费学习",
  h1: "中医自学学习中心",
  lead: "10篇原创方法文+完整学习路线图，每篇配免费题库与查阅工具——学方法，做题目，查典籍，一站式。",
  cards: zixuePages.map((p) => [p.h1.split("：")[0], `${SITE}${p.path}`, p.desc.slice(0, 42) + "……"]),
}));

// ---- 2. 生成医考题库集群 ----
console.log("== 医考题库集群 ==");
for (const p of yikaoPages) writePage(p);
writePage(hubPage({
  dir: "yikao",
  title: "医考免费题库中心：1447题网页直接做_言道国学",
  desc: "医考免费题库中心：五科1447题，章节/每日/错题/模拟/统计全功能，网页直接做题，无需注册。",
  keywords: "医考题库中心,免费做题,中医考试,医考刷题中心",
  h1: "医考免费题库中心（1447题）",
  lead: "中医基础理论263题 · 中医诊断学213题 · 中药学612题 · 方剂学198题 · 针灸学161题——全部免费，网页直接做。",
  cards: yikaoPages.map((p) => [p.h1, `${SITE}${p.path}`, p.desc.slice(0, 42) + "……"]),
}));

// ---- 3. 生成七政学习集群 ----
console.log("== 七政学习集群 ==");
writePage(pillarPage());
for (const t of TOPICS) {
  writePage(topicPage(t, TOPICS));
}

// ---- 4. 校验：135知识点覆盖 ----
const total = TOPICS.reduce((s, t) => s + t.pointIds.length, 0);
console.log(`七政知识点总数校验: ${total} (应=135)`);
if (total !== 135) { console.error("FATAL: 知识点总数≠135"); process.exit(1); }

// ---- 5. sitemap 更新 ----
const SM = path.join(PUB, "sitemap.xml");
let sm = fs.readFileSync(SM, "utf8");
const allNew = [...zixuePages, ...yikaoPages].map((p) => p.path).concat([`/zixue/`, `/yikao/`, `/qizheng-study/`, ...TOPICS.map((t) => t.path)]);
const today = "2026-09-13";
let added = 0;
for (const u of allNew) {
  const loc = `${SITE}${u}`;
  if (sm.includes(`<loc>${loc}</loc>`)) continue;
  const entry = `  <url><loc>${loc}</loc><changefreq>weekly</changefreq><priority>0.8</priority><lastmod>${today}</lastmod></url>\n`;
  sm = sm.replace("</urlset>", entry + "</urlset>");
  added++;
}
fs.writeFileSync(SM, sm, "utf8");
console.log(`sitemap新增 ${added} 条，共 ${sm.split("<loc>").length - 1} 条URL`);

// ---- 6. 内链：给已有静态页补出口 ----
const learnIdx = path.join(PUB, "learn", "index.html");
if (fs.existsSync(learnIdx)) {
  let li = fs.readFileSync(learnIdx, "utf8");
  if (!li.includes("/zixue/")) {
    li = li.replace("</body>", `<section style="max-width:680px;margin:0 auto;padding:20px 16px 30px"><h2 style="font-size:18px;margin-bottom:10px">系统学习路线</h2><p style="font-size:14px"><a href="${SITE}/zixue/">中医自学学习中心</a> · <a href="${SITE}/yikao/">医考免费题库中心</a> · <a href="${SITE}/qizheng-study/">七政四余学习专区</a></p></section></body>`);
    fs.writeFileSync(learnIdx, li, "utf8");
    console.log("learn/index.html 已补内链");
  }
}
console.log("ALL DONE");
