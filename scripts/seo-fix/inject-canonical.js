// 向 out/ 中缺失 canonical 的已收录页面注入 <link rel="canonical">
// 以 public/sitemap.xml 为唯一事实源：sitemap 里的 URL 对应页面才注入，其余页面不碰
// 用法: node scripts/seo-fix/inject-canonical.js [--dry]
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'out');
const SM = fs.readFileSync(path.join(ROOT, 'public', 'sitemap.xml'), 'utf8');
const dry = process.argv.includes('--dry');

// sitemap URL -> 本地文件路径
function urlToFile(u) {
  const p = new URL(u).pathname; // e.g. /tools/luopan.html 或 /yixue/
  if (p.endsWith('/')) return path.join(OUT, p, 'index.html');
  return path.join(OUT, p);
}

const locs = [...SM.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
let injected = 0, skipped = 0, missing = 0, noHead = 0;
const report = { injected: [], missing: [] };

for (const u of locs) {
  const f = urlToFile(u);
  if (!fs.existsSync(f)) { missing++; report.missing.push(u); continue; }
  let html = fs.readFileSync(f, 'utf8');
  if (/rel=["']canonical["']/.test(html)) { skipped++; continue; }
  const clean = u.replace(/\/index\.html$/, '/');
  const tag = `<link rel="canonical" href="${clean}"/>`;
  if (!/<\/head>/i.test(html)) { noHead++; continue; }
  html = html.replace(/<\/head>/i, tag + '</head>');
  if (!dry) fs.writeFileSync(f, html, 'utf8');
  injected++;
  report.injected.push(clean);
}

console.log(`sitemap urls: ${locs.length}, injected: ${injected}, already-had: ${skipped}, file-missing: ${missing}, no-head: ${noHead}${dry ? ' (DRY RUN)' : ''}`);
if (report.missing.length) console.log('missing files:\n  ' + report.missing.join('\n  '));
if (report.injected.length) console.log('injected:\n  ' + report.injected.join('\n  '));
