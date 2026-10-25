const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ts = require('typescript');
const { IDBFactory, IDBObjectStore } = require('fake-indexeddb');
const { webcrypto, createHash } = require('node:crypto');

function fixture() {
  const cache = new Map(), indexedDB = new IDBFactory();
  let response, accessStatus = 200;
  const requests = [];
  function load(file) {
    file = path.resolve(__dirname, '..', 'src/lib', file + '.ts');
    if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file, exports);
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(source, { exports, indexedDB, Blob, ArrayBuffer, Uint8Array, TextDecoder,
      crypto: webcrypto, process: { env: {} }, URL, fetch: async (_, options) => { requests.push(options); return response; },
      require: name => name === './authInterceptor' ? { fetchWithAuth: async () => ({
        ok: accessStatus === 200, status: accessStatus, json: async () => ({ success: true,
          deliveryProvider: 'COS', version: pack.version, sha256: pack.sha256, size: pack.size,
          downloadUrl: 'https://fixture-123.cos.ap-beijing.myqcloud.com/learning-content/offline-packs/book.pack' }),
      }) } : load(name.replace('./', '')),
    }, { filename: file });
    return exports;
  }
  const bytes = new TextEncoder().encode('verified learning content').buffer;
  const pack = { packId: 'book', version: '2.0.0', size: bytes.byteLength,
    sha256: createHash('sha256').update(Buffer.from(bytes)).digest('hex'),
    downloadUrl: '/api/offline/packs/book/download' };
  return { api: load('offlinePackClient'), storage: load('storageManager'), bytes, pack, requests,
    respond: value => { response = value; }, deny: status => { accessStatus = status; } };
}

test('interrupted stream persists the real prefix and resumes with Range before atomic activation', async () => {
  const f = fixture(); let count = 0;
  f.respond(new Response(new ReadableStream({ pull(controller) {
    if (count++ === 0) controller.enqueue(new Uint8Array(f.bytes.slice(0, 8)));
    else controller.error(new Error('network disconnected'));
  } })));
  assert.equal((await f.api.downloadPack(f.pack)).ok, false);
  assert.equal((await f.storage.get('OFFLINE_PACK', 'book@2.0.0.part')).byteLength, 8);
  assert.equal(await f.api.loadPackContent('book'), null);
  f.respond(new Response(f.bytes.slice(8), { status: 206, headers: { 'Content-Range': `bytes 8-${f.pack.size - 1}/${f.pack.size}` } }));
  const result = await f.api.downloadPack(f.pack);
  assert.equal(result.ok, true); assert.equal(result.resumedFrom, 8);
  assert.equal(f.requests[1].headers.Range, 'bytes=8-');
  assert.deepEqual(Buffer.from(await f.api.loadPackContent('book')), Buffer.from(f.bytes));
  assert.equal(await f.storage.get('OFFLINE_PACK', 'book@2.0.0.part'), null);
});

test('server ignoring Range restarts cleanly; invalid Content-Range cannot mix bytes or replace active data', async () => {
  const f = fixture(); await f.storage.activateOfflinePack('book', '1.0.0', 'old', new Uint8Array([1]).buffer);
  await f.storage.put('OFFLINE_PACK', 'book@2.0.0.part', f.bytes.slice(0, 8));
  f.respond(new Response(f.bytes.slice(8), { status: 206, headers: { 'Content-Range': `bytes 0-${f.pack.size - 1}/${f.pack.size}` } }));
  assert.equal((await f.api.downloadPack(f.pack)).ok, false);
  assert.equal((await f.api.loadPackContent('book')).byteLength, 1);
  f.respond(new Response(f.bytes));
  const result = await f.api.downloadPack(f.pack);
  assert.equal(result.ok, true); assert.equal(result.resumedFrom, 0);
});

test('bad hash, protocol rejection and denied access all preserve the installed version', async () => {
  for (const scenario of ['hash', 'protocol', 'login', 'membership']) {
    const f = fixture(); await f.storage.activateOfflinePack('book', '1.0.0', 'old', new Uint8Array([1]).buffer);
    f.respond(new Response(scenario === 'hash' ? new Uint8Array(f.pack.size) : f.bytes));
    if (scenario === 'login') f.deny(401);
    if (scenario === 'membership') f.deny(403);
    const result = await f.api.downloadPack(f.pack, undefined, scenario === 'protocol' ? async () => { throw Error('invalid data schema'); } : undefined);
    assert.equal(result.ok, false); assert.equal((await f.api.getInstalledPacks())[0].version, '1.0.0');
    assert.deepEqual(Buffer.from(await f.api.loadPackContent('book')), Buffer.from([1]));
  }
});

test('concurrent installs retain both index entries and an old download cannot downgrade a newer pack', async () => {
  const f = fixture();
  await Promise.all([f.storage.activateOfflinePack('book', '2.0.0', 'new', f.bytes),
    f.storage.activateOfflinePack('atlas', '1.0.0', 'atlas', f.bytes)]);
  assert.equal((await f.api.getInstalledPacks()).length, 2);
  await assert.rejects(f.storage.activateOfflinePack('book', '1.0.0', 'old', f.bytes), /版本已变化/);
  await assert.rejects(f.storage.activateOfflinePack('book', '2.0.0', 'different', f.bytes), /版本已变化/);
  assert.equal((await f.api.getInstalledPacks()).find(row => row.packId === 'book').sha256, 'new');
});

test('storage quota failure rolls back content, index and metadata together', async () => {
  const f = fixture(); await f.storage.activateOfflinePack('book', '1.0.0', 'old', new Uint8Array([1]).buffer);
  const original = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function(value, key) {
    if (this.name === 'zone_meta' && key === 'OFFLINE_PACK:book@2.0.0') throw new DOMException('storage full', 'QuotaExceededError');
    return original.call(this, value, key);
  };
  try { await assert.rejects(f.storage.activateOfflinePack('book', '2.0.0', 'new', f.bytes), /storage full/); }
  finally { IDBObjectStore.prototype.put = original; }
  assert.equal((await f.api.getInstalledPacks())[0].version, '1.0.0');
  assert.equal(await f.storage.get('OFFLINE_PACK', 'book@2.0.0'), null);
  assert.deepEqual(Buffer.from(await f.api.loadPackContent('book')), Buffer.from([1]));
});

test('a full stale fragment restarts at zero, and oversized responses never activate', async () => {
  const f = fixture();
  await f.storage.put('OFFLINE_PACK', 'book@2.0.0.part', new Uint8Array(f.pack.size).buffer);
  f.respond(new Response(f.bytes));
  assert.equal((await f.api.downloadPack(f.pack)).ok, true);
  assert.equal(f.requests[0].headers.Range, undefined);
  const g = fixture(); g.respond(new Response(new Uint8Array(g.pack.size + 1)));
  assert.equal((await g.api.downloadPack(g.pack)).ok, false);
  assert.equal(await g.api.loadPackContent('book'), null);
});

test('explicit combined removal updates both contents and index, preserving other packs and private learning data', async () => {
  const f = fixture();
  for (const id of ['book', 'atlas', 'other']) await f.storage.activateOfflinePack(id, '1.0.0', id, f.bytes);
  await f.storage.put('USER_PRIVATE_DATA', 'learning-note', 'keep');
  await f.storage.deactivateOfflinePacks(['book', 'atlas']);
  assert.deepEqual(Array.from(await f.api.getInstalledPacks(), x => x.packId), ['other']);
  assert.equal(await f.api.loadPackContent('book'), null);
  assert.equal(await f.api.loadPackContent('atlas'), null);
  assert.equal(await f.storage.get('USER_PRIVATE_DATA', 'learning-note'), 'keep');
});

test('failed combined removal rolls back every package and an old dangling index is not shown as installed', async () => {
  const f = fixture();
  for (const id of ['book', 'atlas']) await f.storage.activateOfflinePack(id, '1.0.0', id, f.bytes);
  const original = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function(value, key) {
    if (this.name === 'zone_data' && key === 'SYSTEM_DATA:installed_packs_index') throw Error('storage unavailable');
    return original.call(this, value, key);
  };
  try { await assert.rejects(f.storage.deactivateOfflinePacks(['book', 'atlas']), /storage unavailable/); }
  finally { IDBObjectStore.prototype.put = original; }
  assert.equal((await f.api.getInstalledPacks()).length, 2);
  await f.storage.remove('OFFLINE_PACK', 'book@1.0.0');
  assert.equal((await f.api.getInstalledPacks()).some(row => row.packId === 'book'), false);
});
