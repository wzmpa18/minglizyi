/* Export the existing in-app policy for crawlers that do not execute JavaScript. */
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const root = path.resolve(__dirname, '..');
const runtime = process.env.PRIVACY_RENDER_RUNTIME;
const load = runtime ? Module.createRequire(path.resolve(runtime, 'package.json')) : require;
const ts = load('typescript');
const React = load('react');
const {renderToStaticMarkup} = load('react-dom/server');
const source = path.join(root, 'src/app/privacy/page.tsx');
const compiled = ts.transpileModule(fs.readFileSync(source, 'utf8'), {
  compilerOptions: {jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true},
}).outputText;
const policy = new Module(source, module);
policy.filename = source;
policy.paths = module.paths;
policy.require = (id) => {
  if (id === 'react') return React;
  // The policy body has no router-dependent text. Only the interactive back button uses it.
  if (id === 'next/navigation') return {useRouter: () => ({back() {}})};
  if (id === '@/components/shared') return {BrandHeader: () => null};
  if (id === '@/data/acupointOpenSources.json') return require('../src/data/acupointOpenSources.json');
  if (id === '@/lib/acupointPhotos') return {BUNDLED_PHOTOS: require('../public/assets/acupoint-photos/MANIFEST.json')};
  throw new Error(`Unexpected policy import: ${id}`);
};
policy._compile(compiled, source);
let body = renderToStaticMarkup(React.createElement(policy.exports.PrivacyPolicyDocument));
// A static document does not pretend its router back button works.
body = body.replace(/<button\b[^>]*>[\s\S]*?<\/button>/g, '');
for (const text of ['信息收集范围', '信息使用方式', '信息存储与保护', '第三方共享说明', '用户信息管理权', '应用权限说明', 'support@yandao.vip', '东莞言道科技有限公司']) {
  if (!body.includes(text)) throw new Error(`Missing policy section: ${text}`);
}
if (/<(?:script|iframe|form)\b/i.test(body) || /\son\w+=/i.test(body)) throw new Error('Executable policy markup');
const html = '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>言道国学隐私政策</title><style>body{margin:0;background:#fff;color:#333;font-family:system-ui,sans-serif;line-height:1.8}main{max-width:860px;margin:auto;padding:24px 16px}main>div{max-width:none!important;min-height:0!important}a{color:#6527a2}h1{font-size:26px}h2{line-height:1.6}section{scroll-margin-top:16px}</style></head><body><main><h1>言道国学隐私政策</h1>' + body + '</main></body></html>\n';
const target = path.join(root, 'public/legal/privacy-zh-cn.html');
fs.mkdirSync(path.dirname(target), {recursive: true});
fs.writeFileSync(target, html);
if (process.argv.includes('--patch-export')) {
  const exported = path.join(root, 'out/privacy/index.html');
  if (!fs.existsSync(exported)) throw new Error('Expected exported privacy route is missing');
  // Preserve the app's router, back button, hydration and navigation for JS users.
  // Crawlers and users without JS receive the same policy as a noscript fallback.
  let original = fs.readFileSync(exported, 'utf8');
  original = original.replace(/<noscript id="privacy-static-fallback">[\s\S]*?<\/noscript>/g, '');
  if (!original.includes('</body>')) throw new Error('Exported privacy document has no body');
  const fallback = '<noscript id="privacy-static-fallback"><main><h1>言道国学隐私政策</h1>' + body + '</main></noscript>';
  fs.writeFileSync(exported, original.replace('</body>', fallback + '</body>'));
}
console.log(`Static policy exported from in-app source: ${Buffer.byteLength(html)} bytes`);
