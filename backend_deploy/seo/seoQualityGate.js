#!/usr/bin/env node
'use strict';

/**
 * SEO 落地页质量门禁（DEV-SEO-GROWTH-ENGINE-V1.0-SUPP-01 第六节 + 扩展）
 * 不通过禁止发布（exit 1）。
 *
 * SUPP-01 三项强制：
 *   ① 页面是否植入了至少 2 处差异化优势表述
 *   ② 是否有「为什么选择我们」固定模块（C端）/「我们的优势」（B端）
 *   ③ 转化话术是否体现了「无广告 / 免费 / 全功能」其中一点
 * 扩展门禁：标题公式、ICP悬挂、canonical、description、APK唯一源、JSON-LD、sitemap覆盖、robots、禁用CTA、占位符
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const CONFIG_PATH = path.join(__dirname, 'seoPagesConfig.json');
const PUBLIC_DIR = path.join(ROOT, 'public');

const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const site = cfg.site;

let pass = 0;
let fail = 0;
const problems = [];

function ok(name) {
  pass++;
  console.log(`  [PASS] ${name}`);
}
function bad(name, detail) {
  fail++;
  problems.push(`${name}${detail ? '：' + detail : ''}`);
  console.log(`  [FAIL] ${name}${detail ? ' —— ' + detail : ''}`);
}

// 差异化优势表述识别词（命中≥2 种即视为≥2处差异化表述）
const DIFF_PATTERNS = [
  '无广告',
  '无开屏',
  '无弹窗',
  '无插屏',
  '永久免费',
  '基础功能免费',
  '基础功能永久免费',
  '免费下载',
  '免费查阅',
  '免费刷题',
  '一站式',
  '一个APP全搞定',
  '一个APP顶十个',
  '全功能',
  '功能更全',
  '体验更干净',
  '更良心',
  '无会员套路',
  '不锁基础功能',
];

const CTA_FORBIDDEN = ['立即下载', '点击下载'];

console.log('==================================================');
console.log('SEO 落地页质量门禁 · SUPP-01');
console.log('==================================================');

const allUrls = [];

for (const page of cfg.pages) {
  const file = path.join(PUBLIC_DIR, page.file);
  console.log(`\n### ${page.file}（${page.keyword}）`);
  if (!fs.existsSync(file)) {
    bad('文件存在', `${page.file} 未生成`);
    continue;
  }
  const html = fs.readFileSync(file, 'utf8');
  const url = `${site.domain}/${page.file}`;
  allUrls.push(url);

  // ① 差异化优势表述 ≥2 处
  const hits = DIFF_PATTERNS.filter((p) => html.includes(p));
  if (hits.length >= 2) {
    ok(`差异化表述 ${hits.length} 处（${hits.slice(0, 4).join('/')}…）`);
  } else {
    bad('差异化表述≥2处', `仅命中 ${hits.length} 种：${hits.join('/') || '无'}`);
  }

  // ② 固定模块
  const moduleTitle = page.type === 'B' ? '我们的优势' : '为什么选择言道国学';
  if (html.includes(`<h2>${moduleTitle}</h2>`)) {
    ok(`固定模块「${moduleTitle}」`);
  } else {
    bad(`固定模块「${moduleTitle}」`, '未找到模块标题');
  }
  if (page.type !== 'B') {
    const subOk = ['功能更全', '体验更干净', '更良心'].every((t) => html.includes(t));
    subOk ? ok('三点内容（功能更全/体验更干净/更良心）') : bad('三点内容齐全', '缺少功能更全/体验更干净/更良心之一');
  } else {
    const subOk = ['垂直领域现成经验', '可模块化交付', '懂合规'].every((t) => html.includes(t));
    subOk ? ok('B端优势三点齐全') : bad('B端优势三点齐全', '缺少垂直经验/模块化交付/合规之一');
  }

  // ③ 转化话术（CTA 按钮文字必须含差异化词；禁用裸「立即下载/点击下载」）
  const ctaMatches = [...html.matchAll(/class="cta-big"[^>]*>([^<]+)<\/a>/g)].map((m) => m[1].trim());
  const ctaDiffRe = page.type === 'B'
    ? /无广告|免费|全功能|基础功能|现成经验|模块化交付|懂合规/
    : /无广告|免费|全功能|基础功能/;
  const ctaOk = ctaMatches.length > 0 && ctaMatches.every((t) => ctaDiffRe.test(t));
  const ctaForbidden = ctaMatches.filter((t) => CTA_FORBIDDEN.includes(t));
  if (ctaOk && ctaForbidden.length === 0) {
    ok(`转化话术差异化（${ctaMatches[0]}）`);
  } else {
    bad('转化话术差异化', `CTA=${JSON.stringify(ctaMatches)} 禁用命中=${ctaForbidden.length}`);
  }

  // ④ 标题公式：核心关键词 + 差异化卖点
  const titleM = html.match(/<title>([^<]+)<\/title>/);
  if (titleM) {
    const t = titleM[1];
    const hasKeyword = t.startsWith(page.keyword) || t.includes(page.keyword);
    const hasDiff = /无广告|免费|全功能|一站式|零广告|不付费|免会员|模块化/.test(t);
    if (hasKeyword && hasDiff) {
      ok('标题公式（关键词+差异化卖点）');
    } else {
      bad('标题公式', `「${t}」关键词=${hasKeyword} 差异化=${hasDiff}`);
    }
  } else {
    bad('标题存在', '无<title>');
  }

  // ⑤ 首段痛点锚定（标准结构）
  const painOk = html.includes('先说痛点') && (page.painIntro || []).length >= 2;
  painOk ? ok('首段痛点锚定（痛点+方案两段）') : bad('首段痛点锚定', '痛点段缺失或不足两段');

  // ⑥ ICP 备案悬挂 + 工信部链接
  const icpOk = html.includes(site.icp) && html.includes('beian.miit.gov.cn');
  icpOk ? ok('ICP备案悬挂+工信部链接') : bad('ICP备案悬挂', '备案号或链接缺失');

  // ⑦ canonical
  const canonOk = html.includes(`<link rel="canonical" href="${url}">`);
  canonOk ? ok('canonical 与生产URL一致') : bad('canonical', `期望 ${url}`);

  // ⑧ description
  const descM = html.match(/<meta name="description" content="([^"]+)">/);
  if (descM && descM[1].length >= 50 && descM[1].length <= 200) {
    ok(`description ${descM[1].length}字`);
  } else {
    bad('description', descM ? `长度${descM[1].length}` : '缺失');
  }

  // ⑨ APK 唯一源（C端）
  if (page.type !== 'B') {
    const apkOk = html.includes(site.apkUrl);
    apkOk ? ok('APK唯一源 latest.apk') : bad('APK唯一源', '未指向 app-download/latest.apk');
  }

  // ⑩ JSON-LD
  const ldOk = html.includes('application/ld+json') && html.includes('FAQPage');
  ldOk ? ok('JSON-LD（App/Service + FAQPage）') : bad('JSON-LD', '结构化数据缺失');

  // ⑪ 占位符残留
  const placeholder = html.match(/TODO|FIXME|\{\{[^}]+\}\}|xxx|待补充/);
  placeholder ? bad('占位符检查', placeholder[0]) : ok('无占位符残留');
}

// 目录索引页 + sitemap + robots 汇总校验
console.log('\n### 全局（索引页 / sitemap / robots）');
const dirs = [...new Set(cfg.pages.map((p) => p.dir))];
for (const d of dirs) {
  const idx = path.join(PUBLIC_DIR, d, 'index.html');
  if (fs.existsSync(idx)) {
    ok(`${d}/index.html 存在`);
    allUrls.push(`${site.domain}/${d}/`);
  } else {
    bad(`${d}/index.html`, '索引页缺失');
  }
}

const sitemapPath = path.join(PUBLIC_DIR, 'sitemap.xml');
if (fs.existsSync(sitemapPath)) {
  const sm = fs.readFileSync(sitemapPath, 'utf8');
  const missing = allUrls.filter((u) => !sm.includes(u));
  missing.length === 0 ? ok(`sitemap 覆盖全部 ${allUrls.length} 个URL`) : bad('sitemap覆盖', `缺 ${missing.join(',')}`);
  sm.includes('sitemaps.org/schemas/sitemap') ? ok('sitemap 格式合法') : bad('sitemap格式', '命名空间缺失');
} else {
  bad('sitemap.xml', '文件缺失');
}

const robotsPath = path.join(PUBLIC_DIR, 'robots.txt');
if (fs.existsSync(robotsPath)) {
  const rb = fs.readFileSync(robotsPath, 'utf8');
  rb.includes('Sitemap: ' + site.domain + '/sitemap.xml') ? ok('robots.txt 指向 sitemap') : bad('robots.txt', '未指向 sitemap');
} else {
  bad('robots.txt', '文件缺失');
}

console.log('\n==================================================');
console.log(`RESULT: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) {
  console.log('问题清单：');
  for (const p of problems) console.log('  - ' + p);
  console.log('门禁不通过，禁止发布！');
  process.exit(1);
}
console.log('门禁通过，允许发布。');
