/** FINAL-17 搜索增长：静态 SEO 内容页共享模板（内容优先 / 直接进做题 / APP次级） */
const SITE = "https://yandaoguoxue.yandao.vip";

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** 站内导航（内容页头） */
const NAV = [
  ["/zhongyi/", "中医专区"],
  ["/zhongyi/exam/practice", "免费做题"],
  ["/yixue/qizheng/", "七政四余"],
  ["/download/", "下载APP"],
];

function faqSchema(faq) {
  if (!faq || !faq.length) return "";
  const items = faq.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  }));
  return `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items })}</script>`;
}

function articleSchema(p) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: p.title.replace(/_.*$/, ""),
    description: p.desc,
    inLanguage: "zh-CN",
    datePublished: "2026-09-13",
    dateModified: "2026-09-13",
    author: { "@type": "Organization", name: "言道国学", url: `${SITE}/` },
    publisher: { "@type": "Organization", name: "言道国学", url: `${SITE}/` },
    mainEntityOfPage: `${SITE}${p.path}`,
  };
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

const CSS = `
:root{--brand:#7B2FBE;--brand-dark:#5E2293;--brand-light:#F3ECFA;--text:#2D1A3E;--muted:#6B5B80;--bg:#FAF8FD;--card:#fff;--line:#E7DDF0;}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;background:var(--bg);color:var(--text);line-height:1.85}
a{color:var(--brand);text-decoration:none}
.wrap{max-width:720px;margin:0 auto;padding:0 18px}
header.site{background:var(--brand);color:#fff;padding:12px 16px;position:sticky;top:0;z-index:10}
header.site .wrap{display:flex;align-items:center;justify-content:space-between;gap:10px;max-width:720px}
.logo{font-size:18px;font-weight:700;letter-spacing:1px;color:#fff;white-space:nowrap}
.logo small{font-size:11px;font-weight:400;opacity:.85;margin-left:6px}
nav.top{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
nav.top a{color:#fff;font-size:12px;border:1px solid rgba(255,255,255,.45);padding:3px 10px;border-radius:14px;white-space:nowrap}
.crumb{font-size:12px;color:var(--muted);padding:12px 0 2px}
.crumb a{color:var(--muted)}
article{padding:8px 0 10px}
h1{font-size:25px;line-height:1.45;margin:6px 0 14px}
.lead{font-size:15px;color:var(--muted);border-left:4px solid var(--brand);padding:2px 0 2px 14px;margin-bottom:20px}
h2{font-size:19px;margin:28px 0 12px;padding-left:10px;border-left:4px solid var(--brand)}
h3{font-size:16px;margin:18px 0 8px}
p{margin-bottom:12px;font-size:15px}
ul,ol{margin:0 0 14px 22px}
li{margin-bottom:7px;font-size:15px}
table{width:100%;border-collapse:collapse;margin:12px 0 18px;background:var(--card);font-size:14px}
th,td{border:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top}
th{background:var(--brand-light);color:var(--brand-dark);font-weight:600;white-space:nowrap}
.note{background:#FFF8E1;border:1px solid #F5E1A4;border-radius:10px;padding:12px 14px;font-size:14px;margin:14px 0}
.try{background:var(--brand-light);border-radius:14px;padding:18px;margin:26px 0}
.try h2{border:none;padding:0;margin:0 0 10px}
.try .btns{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px}
.btn{display:inline-block;background:var(--brand);color:#fff;font-weight:600;font-size:15px;padding:11px 24px;border-radius:24px}
.btn.gold{background:#FFC107;color:#4A2B00}
.btn.plain{background:#fff;color:var(--brand-dark);border:1.5px solid var(--brand)}
.try .hint{font-size:12.5px;color:var(--muted)}
.appcta{background:linear-gradient(160deg,var(--brand-dark),var(--brand));color:#fff;border-radius:14px;padding:20px;margin:26px 0;text-align:center}
.appcta h2{color:#fff;border:none;padding:0;margin:0 0 8px;text-align:center}
.appcta p{font-size:13.5px;opacity:.92;margin-bottom:14px}
.appcta .btn{background:#FFC107;color:#4A2B00}
.faq .item{margin-bottom:14px}
.faq .q{font-weight:600;font-size:15px;margin-bottom:6px}
.faq .q::before{content:"Q ";color:var(--brand)}
.faq .a{font-size:14px;color:var(--muted)}
.faq .a::before{content:"A ";color:#B39D00;font-weight:700}
.kp-list{columns:2;column-gap:18px;margin:10px 0 16px}
.kp-list li{font-size:13.5px;break-inside:avoid;margin-bottom:5px;color:#41305a}
@media(max-width:420px){.kp-list{columns:1}}
.toc-links{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}
@media(max-width:420px){.toc-links{grid-template-columns:1fr}}
.toc-links a{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:9px 12px;font-size:13.5px}
footer.site{background:#241632;color:#B9A9CC;padding:24px 16px;font-size:12px;text-align:center;margin-top:20px}
footer.site p{margin-bottom:8px;font-size:12px}
footer.site a{color:#D8C8EC}
footer.site .disc{color:#8E7FA3;font-size:11px;line-height:1.7}
footer.site .related a{display:inline-block;margin:2px 6px}
`;

/**
 * 生成完整页面
 * p: { path, title, desc, keywords, h1, lead, sections:[{h2, html}], tryLinks:[[label,href,gold]], faq, related:[[label,href]], clusterNavTitle, clusterNav:[[label,href]] }
 */
function renderPage(p) {
  const url = `${SITE}${p.path}`;
  const navHtml = NAV.map(([href, label]) => `<a href="${SITE}${href}">${esc(label)}</a>`).join("");
  const sectionsHtml = p.sections
    .map((s) => {
      const body = typeof s.html === "string" ? s.html : s.html.join("\n");
      return `<h2 id="${s.id || ""}">${esc(s.h2)}</h2>\n${body}`;
    })
    .join("\n");
  const tryBtns = (p.tryLinks || [])
    .map(([label, href, gold]) => `<a class="btn${gold ? " gold" : ""}" href="${href}">${esc(label)}</a>`)
    .join("");
  const trySection = p.tryLinks && p.tryLinks.length
    ? `<section class="try" id="dongshou"><h2>直接开始（网页版免费）</h2><div class="btns">${tryBtns}</div><p class="hint">${esc(p.tryHint || "以上入口均为网页版，打开即用，无需注册，不强制下载APP。")}</p></section>`
    : "";
  const faqHtml = p.faq && p.faq.length
    ? p.faq.map((f) => `<div class="item"><div class="q">${esc(f.q)}</div><div class="a">${esc(f.a)}</div></div>`).join("")
    : "";
  const relatedHtml = (p.related || []).map(([label, href]) => `<a href="${href}">${esc(label)}</a>`).join(" · ");
  const clusterHtml = p.clusterNav && p.clusterNav.length
    ? `<h2>${esc(p.clusterNavTitle || "本系列更多内容")}</h2><div class="toc-links">${p.clusterNav.map(([label, href]) => `<a href="${href}">${esc(label)}</a>`).join("")}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.desc)}">
<meta name="keywords" content="${esc(p.keywords)}">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.desc)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="言道国学">
<meta name="applicable-device" content="mobile">
<meta name="format-detection" content="telephone=no">
<meta name="renderer" content="webkit">
<meta name="robots" content="index,follow">
${articleSchema(p)}
${faqSchema(p.faq)}
<style>${CSS}</style>
</head>
<body>
<header class="site"><div class="wrap">
<a class="logo" href="${SITE}/">言道国学<small>一站式国学学习平台</small></a>
<nav class="top">${navHtml}</nav>
</div></header>
<div class="wrap">
<div class="crumb"><a href="${SITE}/">首页</a> › ${p.crumb || esc(p.h1)}</div>
<article>
<h1>${esc(p.h1)}</h1>
<p class="lead">${esc(p.lead)}</p>
${sectionsHtml}
${trySection}
${clusterHtml}
${p.faq && p.faq.length ? `<h2>常见问题</h2><div class="faq">${faqHtml}</div>` : ""}
<section class="appcta">
<h2>想系统学、随时练？</h2>
<p>言道国学APP：1447道医考题库、22部中医典籍、七政四余排盘与学习专区，基础功能永久免费、无广告。</p>
<a class="btn" href="${SITE}/app-download/latest.apk" rel="nofollow">免费下载APP（安卓）</a>
</section>
</article>
</div>
<footer class="site"><div class="wrap">
<p class="related">${relatedHtml}</p>
<p><a href="${SITE}/">言道国学</a> · <a href="${SITE}/download/">下载APP</a> · <a href="${SITE}/yixue/">易学排盘</a> · <a href="${SITE}/zhongyi/">中医学习</a> · <a href="${SITE}/qizheng-study/">七政四余学习</a></p>
<p><a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener">粤ICP备2026071165号-4A</a></p>
<p class="disc">言道国学提醒：本站内容仅供传统文化学习研究参考，不构成医疗诊断建议或人生决策依据。中医内容仅供学习交流，如有健康问题请前往正规医疗机构就诊。</p>
</div></footer>
</body>
</html>`;
}

module.exports = { SITE, esc, renderPage };
