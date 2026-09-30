// 向 out/ 中缺失 canonical 的已收录页面注入 <link rel="canonical">
// 以 public/sitemap.xml 为唯一事实源：sitemap 里的 URL 对应页面才注入，其余页面不碰
// 用法: node scripts/seo-fix/inject-canonical.js [--dry]
//
// 该脚本已挂到 package.json 的 postbuild（npm run build 结束后自动执行）。
// 生产构建管线（scripts/woa_web_build.sh）只跑 `npm run build`，
// 不会执行 build.sh 的 Step 5，因此必须挂在 npm 生命周期上才能进产物。
// 任何异常都只告警、不抛错，避免阻断部署（fail-soft）。
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'out');
const dry = process.argv.includes('--dry');

// sitemap URL -> 本地文件路径（非法 URL 返回 null，由调用方跳过）
function urlToFile(u) {
  let p;
  try {
    p = new URL(u).pathname; // e.g. /tools/luopan.html 或 /yixue/
  } catch {
    return null;
  }
  if (p.endsWith('/')) return path.join(OUT, p, 'index.html');
  return path.join(OUT, p);
}

function run() {
  const SM = fs.readFileSync(path.join(ROOT, 'public', 'sitemap.xml'), 'utf8');
  const locs = [...SM.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  let injected = 0, skipped = 0, missing = 0, noHead = 0, invalid = 0;
  const report = { injected: [], missing: [] };

  for (const u of locs) {
    const f = urlToFile(u);
    if (!f) { invalid++; continue; }
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

  console.log(`sitemap urls: ${locs.length}, injected: ${injected}, already-had: ${skipped}, file-missing: ${missing}, no-head: ${noHead}, invalid-url: ${invalid}${dry ? ' (DRY RUN)' : ''}`);
  if (report.missing.length) console.log('missing files:\n  ' + report.missing.join('\n  '));
  if (report.injected.length) console.log('injected:\n  ' + report.injected.join('\n  '));
}

try {
  run();
} catch (e) {
  console.log(`[canonical] WARN: 注入失败（不阻断构建）: ${e && e.message ? e.message : e}`);
}
