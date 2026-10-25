const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');

test('crawler policy has full Chinese text while the app keeps JS navigation; repeated exports are stable', () => {
  const prefix = path.join(os.tmpdir(), 'yandao-static-privacy-');
  const fixture = fs.mkdtempSync(prefix);
  try {
    for (const name of ['scripts/export-static-privacy.cjs','src/app/privacy/page.tsx','src/data/acupointOpenSources.json','public/assets/acupoint-photos/MANIFEST.json']) {
      const target = path.join(fixture, name);
      fs.mkdirSync(path.dirname(target), {recursive:true});
      fs.copyFileSync(path.join(root, name), target);
    }
    const route = path.join(fixture, 'out/privacy/index.html');
    fs.mkdirSync(path.dirname(route), {recursive:true});
    const original = '<!doctype html><html><body><div id="app-router"><button>返回</button></div><script src="/app.js"></script></body></html>';
    fs.writeFileSync(route, original);
    const env = {...process.env, PRIVACY_RENDER_RUNTIME: process.env.PRIVACY_RENDER_RUNTIME || root};
    const run = () => execFileSync(process.execPath,[path.join(fixture,'scripts/export-static-privacy.cjs'),'--patch-export'],{env,stdio:'pipe'});
    run();
    const staticPolicy = fs.readFileSync(path.join(fixture,'public/legal/privacy-zh-cn.html'),'utf8');
    assert.match(staticPolicy, /<html lang="zh-CN">/);
    assert.doesNotMatch(staticPolicy, /<(script|iframe|form|button)\b/i);
    for (const section of ['信息收集范围','第三方共享说明','用户信息管理权','应用权限说明','support@yandao.vip']) assert.ok(staticPolicy.includes(section));
    const patched = fs.readFileSync(route,'utf8');
    assert.equal(patched.replace(/<noscript id="privacy-static-fallback">[\s\S]*?<\/noscript>/,''),original);
    assert.match(patched, /<button>返回<\/button>/);
    assert.match(patched, /<script src="\/app.js"><\/script>/);
    run();
    assert.equal(fs.readFileSync(route,'utf8'),patched);
    assert.equal((patched.match(/id="privacy-static-fallback"/g)||[]).length,1);
  } finally {
    const absolute = path.resolve(fixture);
    if (!absolute.startsWith(path.resolve(prefix))) throw new Error('Unsafe test cleanup path');
    fs.rmSync(absolute,{recursive:true,force:true});
  }
});
