#!/usr/bin/env node
'use strict';

/**
 * 程序化搜索增长引擎 —— SEO 落地页生成器
 * 指令：DEV-SEO-GROWTH-ENGINE-V1.0-SUPP-01（差异化优势强化：全功能/无广告/基础免费）
 *
 * 用法：node backend_deploy/seo/generateSeoPages.js
 * 输入：backend_deploy/seo/seoPagesConfig.json（唯一配置源）
 * 输出：public/{tools,learn,app,b}/*.html + 各目录 index.html + public/robots.txt + public/sitemap.xml
 *
 * 纪律：
 *  - 所有功能描述严格基于 APP 真实能力（不夸大、不虚构），数字来自代码核实：
 *    14款专业排盘工具 / 8款实用工具 / 22部中医典籍 / 医考分级题库 / 社群 / Meeus真太阳时
 *  - 基础免费范围=排盘基础功能+典籍全文查阅+基础题库刷题（生产 tool-matrix FREE 实证）
 *  - 每页强制含：「为什么选择言道国学」固定模块 + 差异化标题公式 + 差异化转化话术
 *  - ICP 备案号悬挂 + 工信部链接（合规）
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const CONFIG_PATH = path.join(__dirname, 'seoPagesConfig.json');
const PUBLIC_DIR = path.join(ROOT, 'public');

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function renderQrSvg(text) {
  const QRCode = require('qrcode');
  const svg = await QRCode.toString(text, {
    type: 'svg',
    margin: 1,
    width: 200,
    errorCorrectionLevel: 'M',
    color: { dark: '#2D1A3E', light: '#FFFFFF' },
  });
  // 适配容器尺寸：去掉固定宽高，保留 viewBox
  return svg.replace(/<svg[^>]*>/, (m) =>
    m
      .replace(/width="[^"]*"/, 'width="100%"')
      .replace(/height="[^"]*"/, 'height="100%"')
  );
}

function jsonLdApp(site, page) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: '言道国学',
    operatingSystem: 'Android, Web',
    applicationCategory: 'EducationalApplication',
    description: esc(page.description),
    url: site.domain + '/',
    downloadUrl: site.apkUrl,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'CNY' },
    featureList: '易学排盘工具,中医典籍,医考题库,同好社群,AI深度解读',
  };
}

function jsonLdB(site, page) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: '易学中医行业APP开发解决方案',
    provider: { '@type': 'Organization', name: '言道国学', url: site.companySite },
    description: esc(page.description),
    serviceType: '垂直行业APP开发与模块化交付',
  };
}

function jsonLdFaq(page) {
  const items = (page.faq || []).map((f) => ({
    '@type': 'Question',
    name: esc(f.q),
    acceptedAnswer: { '@type': 'Answer', text: esc(f.a) },
  }));
  return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items };
}

const CSS = `
:root{--brand:#7B2FBE;--brand-dark:#5E2293;--brand-light:#F3ECFA;--text:#2D1A3E;--muted:#6B5B80;--bg:#FAF8FD;--card:#FFFFFF;}
*{box-sizing:border-box;margin:0;padding:0;}
html{-webkit-text-size-adjust:100%;}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;background:var(--bg);color:var(--text);line-height:1.7;}
a{color:var(--brand);text-decoration:none;}
.wrap{max-width:680px;margin:0 auto;padding:0 16px;}
header.site{background:var(--brand);color:#fff;padding:14px 16px;position:sticky;top:0;z-index:10;}
header.site .wrap{display:flex;align-items:center;justify-content:space-between;max-width:680px;}
.logo{font-size:19px;font-weight:700;letter-spacing:1px;}
.logo small{font-size:11px;font-weight:400;opacity:.85;margin-left:8px;}
header.site a.home{color:#fff;font-size:13px;border:1px solid rgba(255,255,255,.5);padding:4px 12px;border-radius:16px;}
.hero{background:linear-gradient(160deg,var(--brand) 0%,var(--brand-dark) 100%);color:#fff;padding:40px 16px 48px;text-align:center;}
.hero h1{font-size:26px;line-height:1.4;margin-bottom:14px;}
.badges{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:18px;}
.badge{background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.35);padding:4px 12px;border-radius:14px;font-size:12px;}
.cta-big{display:inline-block;background:#FFC107;color:#4A2B00;font-weight:700;font-size:16px;padding:13px 34px;border-radius:26px;box-shadow:0 4px 14px rgba(0,0,0,.18);}
.hero .tip{font-size:12px;opacity:.85;margin-top:12px;}
.hero .toollink{font-size:13px;margin-top:10px;}
.hero .toollink a{color:#FFD54F;text-decoration:underline;}
section{padding:30px 0;}
section.alt{background:var(--card);}
h2{font-size:19px;margin-bottom:16px;padding-left:10px;border-left:4px solid var(--brand);}
.pain p{margin-bottom:14px;color:var(--muted);font-size:15px;}
.pain p:last-child{color:var(--text);font-weight:500;}
.grid{display:grid;grid-template-columns:1fr;gap:12px;}
.card{background:var(--card);border-radius:14px;padding:16px;box-shadow:0 1px 4px rgba(74,43,112,.06);}
.card h3{font-size:15.5px;margin-bottom:6px;color:var(--brand-dark);}
.card p{font-size:13.5px;color:var(--muted);}
.why{background:var(--brand-light);}
.why .item{background:var(--card);border-radius:14px;padding:16px;margin-bottom:12px;display:flex;gap:12px;}
.why .num{flex:none;width:30px;height:30px;border-radius:50%;background:var(--brand);color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:14px;}
.why h3{font-size:15.5px;margin-bottom:6px;}
.why p{font-size:13.5px;color:var(--muted);}
.faq .item{margin-bottom:14px;}
.faq .q{font-weight:600;font-size:15px;margin-bottom:6px;}
.faq .q::before{content:"Q ";color:var(--brand);}
.faq .a{font-size:13.5px;color:var(--muted);}
.faq .a::before{content:"A ";color:#B39D00;font-weight:700;}
.convert{text-align:center;background:linear-gradient(160deg,var(--brand-dark),var(--brand));color:#fff;padding:40px 16px;}
.convert h2{color:#fff;border-color:#FFC107;text-align:left;}
.convert .say{font-size:14px;opacity:.92;margin-bottom:20px;}
.qrbox{background:#fff;border-radius:16px;padding:14px;width:170px;margin:0 auto 10px;}
.qrbox svg{display:block;}
.convert .qrtext{font-size:12px;opacity:.85;}
.links{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:24px;}
.links a{color:#fff;font-size:12px;border:1px solid rgba(255,255,255,.35);padding:3px 10px;border-radius:12px;opacity:.9;}
footer.site{background:#241632;color:#B9A9CC;padding:24px 16px;font-size:12px;text-align:center;}
footer.site p{margin-bottom:8px;}
footer.site a{color:#D8C8EC;}
footer.site .icp a{color:#D8C8EC;}
footer.site .disc{color:#8E7FA3;font-size:11px;line-height:1.6;}
footer.site .related{margin:12px 0;}
footer.site .related a{display:inline-block;margin:2px 6px;}
@media(min-width:560px){.grid{grid-template-columns:1fr 1fr;}.hero h1{font-size:30px;}}
`;

function renderHead(site, page, url) {
  const ld = page.type === 'B' ? jsonLdB(site, page) : jsonLdApp(site, page);
  const ldFaq = jsonLdFaq(page);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
<meta name="keywords" content="${esc(page.keyword)},言道国学,国学APP,无广告,基础功能免费">
<link rel="canonical" href="${esc(url)}">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(url)}">
<meta property="og:site_name" content="言道国学">
<meta name="applicable-device" content="mobile">
<meta name="format-detection" content="telephone=no">
<meta name="renderer" content="webkit">
<meta name="robots" content="index,follow">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<script type="application/ld+json">${JSON.stringify(ldFaq)}</script>
<style>${CSS}</style>
</head>
<body>`;
}

function renderHeader(site, page) {
  return `<header class="site"><div class="wrap">
<a class="logo" href="${esc(site.domain)}/">言道国学<small>一站式国学学习平台</small></a>
<a class="home" href="${esc(site.domain)}/download/">下载APP</a>
</div></header>`;
}

function renderHero(site, page) {
  const badges = (page.heroBadges || []).map((b) => `<span class="badge">${esc(b)}</span>`).join('');
  const toolLink = page.toolUrl
    ? `<p class="toollink">不用下载先试试：<a href="${esc(site.domain)}${esc(page.toolUrl)}">网页版在线使用 →</a></p>`
    : '';
  return `<section class="hero"><div class="wrap">
<h1>${esc(page.h1)}</h1>
<div class="badges">${badges}</div>
<a class="cta-big" href="${esc(site.apkUrl)}" rel="nofollow">${esc(page.cta)}</a>
<p class="tip">安卓APK直装 · 无广告 · 基础功能永久免费</p>
${toolLink}
</div></section>`;
}

function renderPain(page) {
  const ps = (page.painIntro || []).map((p) => `<p>${esc(p)}</p>`).join('\n');
  return `<section class="pain"><div class="wrap">
<h2>先说痛点：${esc(page.keyword)}</h2>
${ps}
</div></section>`;
}

function renderFeatures(page) {
  const cards = (page.features || [])
    .map((f) => `<div class="card"><h3>${esc(f.title)}</h3><p>${esc(f.desc)}</p></div>`)
    .join('\n');
  return `<section class="alt"><div class="wrap">
<h2>${esc(page.featuresTitle || '言道国学对应能力')}</h2>
<div class="grid">
${cards}
</div>
</div></section>`;
}

/** Guide 页可选「使用步骤」区块（PHASE8 小众五Cluster 指南页专用） */
function renderSteps(page) {
  if (!page.steps || page.steps.length === 0) return '';
  const items = page.steps
    .map(
      (s, i) =>
        `<div class="item"><div class="num">${i + 1}</div><div><h3>${esc(s.title)}</h3><p>${esc(s.desc)}</p></div></div>`
    )
    .join('\n');
  return `<section class="why"><div class="wrap">
<h2>${esc(page.stepsTitle || '怎么用：一步一步来')}</h2>
${items}
</div></section>`;
}

function renderWhy(shared) {
  const items = (shared.whyChooseUs || [])
    .map(
      (w, i) =>
        `<div class="item"><div class="num">${i + 1}</div><div><h3>${esc(w.title)}</h3><p>${esc(w.desc)}</p></div></div>`
    )
    .join('\n');
  return `<section class="why"><div class="wrap">
<h2>为什么选择言道国学</h2>
${items}
</div></section>`;
}

function renderFaq(page) {
  const items = (page.faq || [])
    .map((f) => `<div class="item"><div class="q">${esc(f.q)}</div><div class="a">${esc(f.a)}</div></div>`)
    .join('\n');
  return `<section class="faq"><div class="wrap">
<h2>常见问题</h2>
${items}
</div></section>`;
}

async function renderConvert(site, page, qrSvg) {
  const href = page.ctaUrl || site.apkUrl;
  const rel = page.ctaUrl ? '' : ' rel="nofollow"';
  return `<section class="convert"><div class="wrap">
<h2>${page.type === 'B' ? '联系我们' : '立即下载体验'}</h2>
<p class="say">${page.type === 'B' ? esc(page.keyword) + '——垂直经验现成、模块化交付、懂合规懂审核' : '无广告 · 基础功能永久免费 · 一个APP顶十个'}</p>
<a class="cta-big" href="${esc(href)}"${rel}>${esc(page.cta)}</a>
${page.type === 'B' ? '' : `<div class="qrbox" aria-label="下载二维码">${qrSvg}</div>
<p class="qrtext">扫码下载，基础功能永久免费</p>`}
</div></section>`;
}

function renderFooter(site, page, related) {
  const relLinks = (related || [])
    .map((r) => `<a href="${esc(site.domain)}/${esc(r.file)}">${esc(r.keyword)}</a>`)
    .join('');
  return `<footer class="site"><div class="wrap">
<p class="related">${relLinks}</p>
<p><a href="${esc(site.domain)}/">言道国学</a> · <a href="${esc(site.domain)}/download/">下载APP</a> · <a href="${esc(site.domain)}/yixue/">易学排盘</a> · <a href="${esc(site.domain)}/zhongyi/">中医学习</a></p>
<p class="icp"><a href="${esc(site.icpUrl)}" target="_blank" rel="noopener">${esc(site.icp)}</a></p>
<p class="disc">${esc(site.brand)}提醒：${esc(page._disclaimer || '')}</p>
</div></footer>
</body>
</html>`;
}

/** B端「我们的优势」模块（SUPP-01 第五节） */
function renderBAdvantage(shared, page) {
  const items = (shared.bAdvantage || [])
    .map(
      (w, i) =>
        `<div class="item"><div class="num">${i + 1}</div><div><h3>${esc(w.title)}</h3><p>${esc(w.desc)}</p></div></div>`
    )
    .join('\n');
  const modules = (page.modules || [])
    .map((f) => `<div class="card"><h3>${esc(f.title)}</h3><p>${esc(f.desc)}</p></div>`)
    .join('\n');
  return `<section class="why"><div class="wrap">
<h2>我们的优势</h2>
<p class="painintro" style="margin-bottom:14px;color:var(--muted);font-size:14px;">${esc(page.advantageIntro || '')}</p>
${items}
<div class="grid" style="margin-top:14px;">${modules}</div>
</div></section>`;
}

async function renderPage(site, shared, page, qrSvg) {
  const url = `${site.domain}/${page.file}`;
  let html = renderHead(site, page, url);
  html += renderHeader(site, page);
  html += renderHero(site, page);
  html += renderPain(page);
  html += renderFeatures(page);
  html += renderSteps(page);
  if (page.type === 'B') {
    html += renderBAdvantage(shared, page);
  } else {
    html += renderWhy(shared);
  }
  html += renderFaq(page);
  html += await renderConvert(site, page, qrSvg);
  page._disclaimer = shared.disclaimer;
  html += renderFooter(site, page, page._related || []);
  return html;
}

function renderIndexPage(site, dir, dirLabel, pages) {
  const items = pages
    .map(
      (p) =>
        `<div class="card"><h3><a href="./${path.basename(p.file)}">${esc(p.keyword)}</a></h3><p>${esc(p.description)}</p></div>`
    )
    .join('\n');
  const title = `${dirLabel}专题页_言道国学_无广告基础免费`;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="言道国学${esc(dirLabel)}专题导航：覆盖排盘工具、中医学习等高转化关键词落地页，全部无广告、基础功能永久免费。">
<link rel="canonical" href="${esc(site.domain)}/${dir}/">
<meta name="robots" content="index,follow">
<style>${CSS}</style>
</head>
<body>
<header class="site"><div class="wrap">
<a class="logo" href="${esc(site.domain)}/">言道国学<small>一站式国学学习平台</small></a>
<a class="home" href="${esc(site.domain)}/download/">下载APP</a>
</div></header>
<section class="hero"><div class="wrap">
<h1>${esc(dirLabel)}专题</h1>
<div class="badges"><span class="badge">全程无广告</span><span class="badge">基础功能永久免费</span><span class="badge">一个APP全搞定</span></div>
<a class="cta-big" href="${esc(site.apkUrl)}" rel="nofollow">免费下载，无广告全功能</a>
</div></section>
<section><div class="wrap">
<h2>全部专题页</h2>
<div class="grid">
${items}
</div>
</div></section>
<section class="why"><div class="wrap">
<h2>为什么选择言道国学</h2>
${(site._sharedWhy || [])
  .map(
    (w, i) =>
      `<div class="item"><div class="num">${i + 1}</div><div><h3>${esc(w.title)}</h3><p>${esc(w.desc)}</p></div></div>`
  )
  .join('\n')}
</div></section>
<footer class="site"><div class="wrap">
<p><a href="${esc(site.domain)}/">言道国学</a> · <a href="${esc(site.domain)}/download/">下载APP</a></p>
<p class="icp"><a href="${esc(site.icpUrl)}" target="_blank" rel="noopener">${esc(site.icp)}</a></p>
</div></footer>
</body>
</html>`;
}

function renderSitemap(site, seoUrls, mainUrls) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [];
  for (const u of mainUrls) {
    urls.push(
      `  <url><loc>${esc(site.domain + u.path)}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
    );
  }
  for (const u of seoUrls) {
    urls.push(`  <url><loc>${esc(u)}</loc><changefreq>weekly</changefreq><priority>0.8</priority><lastmod>${today}</lastmod></url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}

function renderRobots(site) {
  return `User-agent: *
Allow: /

Sitemap: ${site.domain}/sitemap.xml
`;
}

async function main() {
  const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const site = cfg.site;
  const shared = cfg.shared;
  const pages = cfg.pages;

  // 同目录互链（每页 3 个相关页；同 cluster 优先互链：Core↔Guide 强内链）
  const byDir = {};
  for (const p of pages) (byDir[p.dir] = byDir[p.dir] || []).push(p);
  for (const p of pages) {
    const sibs = byDir[p.dir].filter((x) => x.file !== p.file);
    if (p.cluster) {
      const same = sibs.filter((x) => x.cluster === p.cluster);
      const rest = sibs.filter((x) => x.cluster !== p.cluster);
      p._related = [...same, ...rest].slice(0, 3);
    } else {
      p._related = sibs.slice(0, 3);
    }
  }

  const qrSvg = await renderQrSvg(site.qrTarget);

  const seoUrls = [];
  let count = 0;
  for (const p of pages) {
    p._disclaimer = shared.disclaimer;
    const html = await renderPage(site, shared, p, qrSvg);
    const out = path.join(PUBLIC_DIR, p.file);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, html, 'utf8');
    seoUrls.push(`${site.domain}/${p.file}`);
    count++;
    console.log(`[GEN] ${p.file} (${p.keyword})`);
  }

  // 目录索引页
  for (const [dir, list] of Object.entries(byDir)) {
    const html = renderIndexPage(site, dir, list[0].dirLabel, list);
    fs.writeFileSync(path.join(PUBLIC_DIR, dir, 'index.html'), html, 'utf8');
    seoUrls.push(`${site.domain}/${dir}/`);
    console.log(`[GEN] ${dir}/index.html (${list.length} pages)`);
  }

  // sitemap + robots
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), renderSitemap(site, seoUrls, cfg.mainSiteUrls), 'utf8');
  fs.writeFileSync(path.join(PUBLIC_DIR, 'robots.txt'), renderRobots(site), 'utf8');
  console.log(`[GEN] sitemap.xml (${seoUrls.length} urls) + robots.txt`);

  console.log(`\nDONE: ${count} pages + ${Object.keys(byDir).length} index pages + sitemap + robots`);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
