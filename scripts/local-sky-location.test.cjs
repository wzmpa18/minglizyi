'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/lib/localSkyLocation.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function fixture(native, navigator) {
  let calls = 0;
  const exports = {};
  vm.runInNewContext(code, { exports, navigator, require: name => {
    assert.equal(name, '@capacitor/core'); return { Capacitor: { isNativePlatform: () => native, isPluginAvailable: () => native }, registerPlugin: () => ({ getCurrentPosition: async () => { calls++; return { latitude: 30, longitude: 110, accuracy: 100 }; } }) };
  } });
  return { api: exports, count: () => calls };
}
test('native location never starts on import and requests a single fix only on explicit invocation', async () => {
  const f = fixture(true); assert.equal(f.count(), 0);
  const result = await f.api.getLocalSkyPosition(); assert.equal(f.count(), 1); assert.equal(result.latitude, 30);
});
test('browser uses a bounded foreground request and reports denied permission without silent retry', async () => {
  let calls = 0;
  const f = fixture(false, { geolocation: { getCurrentPosition: (_success, error, options) => { calls++; assert.equal(options.timeout, 20000); assert.equal(options.enableHighAccuracy, false); error({ code: 1 }); } } });
  assert.equal(calls, 0); await assert.rejects(f.api.getLocalSkyPosition(), /未获得定位权限/); assert.equal(calls, 1);
  await assert.rejects(fixture(false, {}).api.getLocalSkyPosition(), /不支持定位/);
});
