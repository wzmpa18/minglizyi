'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), http = require('node:http'), crypto = require('node:crypto'), Module = require('node:module');
const express = require('express');
const spec = require('../backend_deploy/publicAndroidInstallerRelease');
const { PIN, COS_HOST, CONFIG_SCHEMA, installerObjectKey, activationMatches, validateSignedURL } = spec;
const { createRouter, decoratePublicRelease } = require('../backend_deploy/publicAndroidInstallerRoutes');
const { claimSinglePut, verifyDownloadResponse } = require('./stage-verified-android-installer.cjs');
const clock = Date.parse('2026-10-27T00:00:00Z'), uuid = '2d568ca1-e824-4f21-8964-52416b617fb3', key = installerObjectKey(uuid);
const publication = () => ({ latestVersion: PIN.version, latestVersionCode: PIN.build, downloadUrl: PIN.originURL, forceUpdate: false });
const activation = () => ({ schema: CONFIG_SCHEMA, enabled: true, release: { ...PIN }, objectKey: key, verifiedCloud: { checkedAt: new Date(clock).toISOString(), objectKey: 'learning-content/' + key, bytes: PIN.bytes, sha256: PIN.sha256, certificateSha256: PIN.certificateSha256, fullReadback: true, anonymousStatus: 403 } });
function signed(objectKey = key, seconds = 300) {
  const epoch = Math.floor(clock / 1000), q = new URLSearchParams({ 'q-sign-algorithm': 'sha1', 'q-ak': 'FIXTURE-NOT-A-CREDENTIAL', 'q-sign-time': epoch + ';' + (epoch + seconds), 'q-key-time': epoch + ';' + (epoch + seconds), 'q-header-list': 'host', 'q-url-param-list': '', 'q-signature': 'a'.repeat(40) });
  return 'https://' + COS_HOST + '/learning-content/' + objectKey + '?' + q;
}
async function serve(options, run) {
  const calls = [], storage = { statObject: async value => { calls.push(['head', value]); return { ok: true, size: PIN.bytes }; }, temporaryDownloadUrl: async (...args) => { calls.push(['sign', args]); return { ok: true, provider: 'COS', url: signed(args[1]) }; }, ...options.storage };
  const app = express(); app.use('/api/public/app-version', createRouter({ storage, readActivation: activation, readPublication: publication, now: () => clock, ...options, storage }));
  const server = http.createServer(app); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port + '/api/public/app-version';
  try { await run((suffix = PIN.routePath, extra = {}) => fetch(base + suffix, { redirect: 'manual', ...extra }), calls); }
  finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
const fallback = response => { assert.equal(response.status, 302); assert.equal(response.headers.get('location'), PIN.originURL); assert.equal(response.headers.get('cache-control'), 'private, no-store'); };

test('only a server-persisted UUID under the exact installer release is eligible; course/root/other release paths fail', () => {
  assert.ok(activationMatches(activation(), clock));
  for (const objectKey of ['offline-packs/tcm-learning-complete/1.1.2.pack', 'installers/android/2150/' + uuid + '/' + PIN.sha256 + '.apk', 'installers/android/2151/../' + PIN.sha256 + '.apk', 'installers/android/2151/' + uuid + '/' + 'b'.repeat(64) + '.apk']) assert.equal(activationMatches({ ...activation(), objectKey }, clock), false);
  assert.throws(() => installerObjectKey('../../learning-content'));
});
test('activation requires complete cloud SHA/private proof, exact signer/source and current publication; disabled/missing config preserves origin', () => {
  for (const patch of [{ fullReadback: false }, { anonymousStatus: 200 }, { sha256: 'b'.repeat(64) }, { certificateSha256: 'b'.repeat(64) }, { checkedAt: new Date(clock + 60000).toISOString() }]) assert.equal(activationMatches({ ...activation(), verifiedCloud: { ...activation().verifiedCloud, ...patch } }, clock), false);
  assert.equal(activationMatches({ ...activation(), release: { ...PIN, source: 'b'.repeat(40) } }, clock), false);
  assert.equal(decoratePublicRelease(publication(), { readActivation: () => { throw Error('absent'); } }).downloadUrl, PIN.originURL);
  assert.equal(decoratePublicRelease(publication(), { readActivation: activation, now: () => clock }).downloadUrl, PIN.publicURL);
  assert.equal(decoratePublicRelease({ ...publication(), latestVersionCode: 2150 }, { readActivation: activation, now: () => clock }).downloadUrl, PIN.originURL);
});
test('signed URL cannot escape pinned host/path, leak an application JWT, accept extra parameters or exceed short expiry', () => {
  assert.equal(validateSignedURL(signed(), key, clock), signed());
  for (const bad of [signed().replace(COS_HOST, COS_HOST + '.evil.test'), signed().replace('/learning-content/installers/', '/learning-content/offline-packs/'), signed(key, 3600), signed() + '&access_token=fixture', signed() + '&q-signature=' + 'b'.repeat(40), signed().replace('https:', 'http:')]) assert.throws(() => validateSignedURL(bad, key, clock));
});
test('anonymous GET redirects to exactly one private COS installer with no registration, JWT forwarding or cookies', async () => serve({}, async (request, calls) => {
  const r = await request(); assert.equal(r.status, 302); assert.equal(r.headers.get('location'), signed()); assert.equal(r.headers.get('set-cookie'), null); assert.equal(r.headers.get('referrer-policy'), 'no-referrer');
  assert.deepEqual(calls, [['head', { partition: 'learning_content', objectKey: key }], ['sign', ['learning_content', key, 300]]]);
}));
test('HEAD returns unchanged fixed origin without incorrectly using a GET signature; POST is not a download/source event', async () => serve({}, async (request, calls) => {
  const r = await request(PIN.routePath, { method: 'HEAD' }); fallback(r); assert.equal(await r.text(), '');
  assert.equal((await request(PIN.routePath, { method: 'POST' })).status, 405); assert.equal(calls.length, 0);
}));
test('client supplied keys/URLs/pack names, alternative release routes and cross-prefix escapes never reach storage', async () => serve({}, async (request, calls) => {
  for (const suffix of [PIN.routePath + '?key=' + encodeURIComponent(key), PIN.routePath + '?url=https://evil.test', PIN.routePath + '?pack=tcm-learning-complete']) assert.equal((await request(suffix)).status, 400);
  for (const suffix of ['/android-installer/2150.apk', '/android-installer/learning-content/offline-packs/test.pack', '/android-installer/' + encodeURIComponent('../') + 'test.apk']) assert.equal((await request(suffix)).status, 404);
  assert.equal(calls.length, 0);
}));
test('unverified or disabled configuration fails to fixed origin without cloud operations', async () => {
  for (const readActivation of [() => { throw Error('missing'); }, () => ({ ...activation(), enabled: false }), () => ({ ...activation(), verifiedCloud: null })]) await serve({ readActivation }, async (request, calls) => { fallback(await request()); assert.equal(calls.length, 0); });
});
test('publication drift never serves an old installer as a new release', async () => serve({ readPublication: () => ({ ...publication(), latestVersionCode: 2152 }) }, async (request, calls) => { fallback(await request()); assert.equal(calls.length, 0); }));
test('COS HEAD failure/wrong length/sign failure/bad URL each fall back without loops', async () => {
  for (const storage of [{ statObject: async () => ({ ok: false }) }, { statObject: async () => ({ ok: true, size: 1 }) }, { temporaryDownloadUrl: async () => ({ ok: false }) }, { temporaryDownloadUrl: async () => ({ ok: true, provider: 'COS', url: signed().replace(COS_HOST, 'evil.test') }) }]) await serve({ storage }, async request => { fallback(await request()); });
});
test('a bounded slow probe falls back, and the failure circuit avoids repeatedly waiting for COS', async () => serve({ timeoutMs: 20, storage: { statObject: async () => new Promise(() => {}) } }, async request => {
  const start = Date.now(); fallback(await request()); assert.ok(Date.now() - start < 500); fallback(await request());
}));
test('simultaneous anonymous requests coalesce HEAD and preserve per-response short signatures', async () => serve({}, async (request, calls) => {
  await Promise.all(Array.from({ length: 5 }, () => request().then(r => assert.equal(r.headers.get('location'), signed()))));
  assert.equal(calls.filter(([type]) => type === 'head').length, 1); assert.equal(calls.filter(([type]) => type === 'sign').length, 5);
}));
test('single PUT is durably claimed before the call; uncertain/crashed outcomes never retry the same namespace', async () => {
  const state = { objectKey: key, putMayHaveStarted: false }, events = [];
  const storage = { stagePinnedPrivateInstaller: async value => { events.push(['put', value]); throw Error('ambiguous transport'); } };
  await assert.rejects(claimSinglePut(state, storage, value => events.push(['save', value.putMayHaveStarted])));
  assert.deepEqual(events.map(([type]) => type), ['save', 'put']); assert.equal(await claimSinglePut(state, storage, () => assert.fail('must not rewrite')), false); assert.equal(events.length, 2);
});
test('cloud full readback rejects same-length corruption, incomplete/oversized content and non-200 responses', async () => {
  const body = Buffer.from('verified signed installer fixture'), identity = { bytes: body.length, sha256: crypto.createHash('sha256').update(body).digest('hex') };
  const response = (bytes, status = 200) => new Response(bytes, { status, headers: { 'content-length': String(identity.bytes) } });
  assert.equal(await verifyDownloadResponse(response(body), identity), identity.bytes);
  for (const bytes of [Buffer.alloc(body.length, 0), body.subarray(1), Buffer.concat([body, Buffer.from('extra')])]) await assert.rejects(verifyDownloadResponse(response(bytes), identity));
  await assert.rejects(verifyDownloadResponse(response(body, 403), identity));
});
async function adapterFixture({ headStatus = 404, sourceHash = PIN.sha256 } = {}, run) {
  const modulePath = require.resolve('../backend_deploy/objectStorageEngine'), originalLoad = Module._load, saved = { bucket: process.env.COS_BUCKET, region: process.env.COS_REGION }, calls = [];
  process.env.COS_BUCKET = PIN.bucket; process.env.COS_REGION = PIN.region;
  const fakeFs = { existsSync: () => true, realpathSync: value => value, statSync: () => ({ isFile: () => true, size: PIN.bytes }), readFileSync: file => String(file).endsWith('object_storage_config.json') ? JSON.stringify({ provider: 'COS' }) : Buffer.from('isolated byte source'), createReadStream: () => require('node:stream').Readable.from([Buffer.from('isolated byte source')]) };
  class FakeCOS {
    constructor(options) { calls.push(['options', options]); }
    headObject(args, callback) { calls.push(['head', args]); callback(headStatus === 200 ? null : { statusCode: headStatus }); }
    putObject(args, callback) { calls.push(['put', args]); callback(null, { statusCode: 200 }); }
  }
  Module._load = function (name, parent, ...rest) {
    if (parent?.filename === modulePath) {
      if (name === 'fs') return fakeFs;
      if (name === 'crypto') return { createHash: () => ({ update() { return this; }, digest: () => sourceHash }) };
      if (name === './cosCredentialProvider') return { validateAuth: () => ({ valid: true, mode: 'STATIC' }), createClientOptions: () => ({}) };
      if (name === 'cos-nodejs-sdk-v5') return FakeCOS;
    }
    return originalLoad.call(this, name, parent, ...rest);
  };
  let engine;
  try { delete require.cache[modulePath]; engine = require(modulePath); } finally { Module._load = originalLoad; }
  // SDK is lazily loaded. Keep only that one module's resolver isolated while
  // invoking the adapter, without installing credentials or using a network.
  Module._load = function (name, parent, ...rest) { if (parent?.filename === modulePath && name === 'cos-nodejs-sdk-v5') return FakeCOS; return originalLoad.call(this, name, parent, ...rest); };
  try { await run(engine, calls); } finally { Module._load = originalLoad; delete require.cache[modulePath]; if (saved.bucket === undefined) delete process.env.COS_BUCKET; else process.env.COS_BUCKET = saved.bucket; if (saved.region === undefined) delete process.env.COS_REGION; else process.env.COS_REGION = saved.region; }
}
test('installer storage uses only fresh private namespace, single PUT, forbid-overwrite and zero SDK retries; global APK uploads remain disallowed', async () => adapterFixture({}, async (engine, calls) => {
  const result = await engine.ObjectStorageService.stagePinnedPrivateInstaller({ filePath: PIN.originPath, objectKey: key }); assert.equal(result.ok, true);
  const options = calls.find(([type]) => type === 'options')[1], put = calls.find(([type]) => type === 'put')[1];
  assert.equal(options.MaxRetryTimes, 0); assert.equal(put.ACL, 'private'); assert.equal(put.Headers['x-cos-forbid-overwrite'], 'true'); assert.equal(put.Key, 'learning-content/' + key); assert.equal(put.ContentLength, PIN.bytes); assert.equal(put.Bucket, PIN.bucket);
  assert.equal(calls.filter(([type]) => type === 'put').length, 1); assert.equal(engine.getConfig().allowedExtensions.includes('.apk'), false);
}));
test('existing target or unconfirmed HEAD permission can never cause a PUT', async () => {
  for (const headStatus of [200, 403, 503]) await adapterFixture({ headStatus }, async (engine, calls) => {
    const result = await engine.ObjectStorageService.stagePinnedPrivateInstaller({ filePath: PIN.originPath, objectKey: key }); assert.equal(result.ok, false); assert.equal(result.putAttempted, false); assert.equal(calls.filter(([type]) => type === 'put').length, 0);
  });
});
test('private installer adapter rejects wrong local SHA and any alternate local file/key before network writes', async () => {
  await adapterFixture({ sourceHash: 'b'.repeat(64) }, async (engine, calls) => { assert.equal((await engine.ObjectStorageService.stagePinnedPrivateInstaller({ filePath: PIN.originPath, objectKey: key })).ok, false); assert.equal(calls.length, 0); });
  await adapterFixture({}, async (engine, calls) => {
    for (const value of [{ filePath: PIN.originPath + '.other', objectKey: key }, { filePath: PIN.originPath, objectKey: 'offline-packs/existing.pack' }]) assert.equal((await engine.ObjectStorageService.stagePinnedPrivateInstaller(value)).ok, false);
    assert.equal(calls.length, 0);
  });
});
test('real public version router decorates Android only and leaves Google/iOS channel update rules unchanged', async () => {
  const versionPath = require.resolve('../backend_deploy/appVersionRoutes'), installerPath = require.resolve('../backend_deploy/publicAndroidInstallerRoutes'), originalLoad = Module._load;
  const fakeFs = { existsSync: () => true, readFileSync: file => JSON.stringify(String(file).endsWith('public_android_installer.json') ? { ...activation(), verifiedCloud: { ...activation().verifiedCloud, checkedAt: new Date().toISOString() } } : publication()) };
  Module._load = function (name, parent, ...rest) { if (name === 'fs' && [versionPath, installerPath].includes(parent?.filename)) return fakeFs; return originalLoad.call(this, name, parent, ...rest); };
  let router;
  try { delete require.cache[versionPath]; delete require.cache[installerPath]; router = require(versionPath).router; } finally { Module._load = originalLoad; }
  const app = express(); app.use('/api/public/app-version', router); const server = http.createServer(app); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const url = 'http://127.0.0.1:' + server.address().port + '/api/public/app-version';
  try {
    const android = (await (await fetch(url)).json()).data; assert.equal(android.downloadUrl, PIN.publicURL); assert.equal(android.latestVersionCode, PIN.build);
    for (const [suffix, headers] of [['', { 'X-Store-Channel': 'google' }], ['?platform=google', {}], ['', { 'X-Client-Platform': 'google' }]]) {
      const google = (await (await fetch(url + suffix, { headers })).json()).data; assert.equal(google.downloadUrl, ''); assert.equal(google.latestVersionCode, 0); assert.match(google.downloadPage, /^https:\/\/play.google.com\//);
    }
    for (const [suffix, headers] of [['?platform=ios', {}], ['', { 'X-Client-Platform': 'ios' }], ['', { 'X-Store-Channel': 'ios-full-learning' }]]) {
      const ios = (await (await fetch(url + suffix, { headers })).json()).data; assert.equal(ios.downloadUrl, ''); assert.equal(ios.platform, 'ios'); assert.equal(ios.forceUpdate, false);
    }
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); delete require.cache[versionPath]; delete require.cache[installerPath]; }
});
test('the production identity gate permits only anonymous GET/HEAD to the exact resolver while private packs/POST stay authenticated', async () => {
  const { createBusinessIdentityGate, publicRequest } = require('../backend_deploy/businessIdentityGate');
  const full = '/api/public/app-version' + PIN.routePath, events = [];
  const app = express(); app.use(createBusinessIdentityGate({ verifyToken: () => null, getUser: () => assert.fail('public installer must not load a user'), resolveAdminKey: () => null, journal: { append: value => events.push(value) } }));
  app.use('/api/public/app-version', createRouter({ storage: { statObject: async () => ({ ok: true, size: PIN.bytes }), temporaryDownloadUrl: async () => ({ ok: true, provider: 'COS', url: signed() }) }, readActivation: activation, readPublication: publication, now: () => clock }));
  const server = http.createServer(app); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const base = 'http://127.0.0.1:' + server.address().port;
  try {
    const r = await fetch(base + full, { redirect: 'manual' }); assert.equal(r.status, 302); assert.equal(r.headers.get('location'), signed());
    fallback(await fetch(base + full, { method: 'HEAD', redirect: 'manual' }));
    assert.equal((await fetch(base + full + '?key=offline-packs/test.pack')).status, 400);
    for (const [method, route] of [['POST', full], ['GET', full + '/other'], ['GET', '/api/public/app-version/android-installer/2150.apk'], ['GET', '/api/offline/packs/private/download']]) {
      assert.equal(publicRequest(method, route), false); assert.equal((await fetch(base + route, { method, redirect: 'manual' })).status, 401);
    }
    assert.ok(events.some(row => row.route === full && row.kind === 'request_completed' && row.status === 302));
    assert.ok(events.every(row => !JSON.stringify(row).includes('q-signature')));
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
