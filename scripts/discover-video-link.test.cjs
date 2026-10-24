const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const exportsForTest = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname,
  '../src/lib/discoverService.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
  { exports: exportsForTest, URL, require: name => {
    if (name === './socialStore') return { getPosts: () => [] };
    throw Error('Unexpected dependency');
  } });
const parse = exportsForTest.parseVideoLink;

test('real platform hosts support BV, AV and Xigua identifiers without leaking query parameters', () => {
  const bv = parse('https://www.bilibili.com/video/BV1xx411c7mD/?share_source=copy');
  assert.equal(bv.valid, true); assert.equal(bv.videoId, 'BV1xx411c7mD');
  assert.equal(bv.embedUrl, 'https://player.bilibili.com/player.html?bvid=BV1xx411c7mD');
  assert.equal(parse('https://m.bilibili.com/video/av170001').embedUrl,
    'https://player.bilibili.com/player.html?aid=170001');
  assert.equal(parse('https://www.ixigua.com/123456789/').embedUrl, 'https://www.ixigua.com/iframe/123456789');
  assert.equal(parse('https://www.toutiao.com/video/123456789/').videoId, '123456789');
});

test('lookalike hosts, embedded platform strings, credentials and unsupported schemes are rejected', () => {
  for (const url of [
    'https://evil.example/?next=bilibili.com/video/BV1xx411c7mD',
    'https://evilbilibili.com/video/BV1xx411c7mD',
    'https://bilibili.com.evil.example/video/BV1xx411c7mD',
    'https://bilibili.com@evil.example/video/BV1xx411c7mD',
    'https://user:pass@www.bilibili.com/video/BV1xx411c7mD',
    'https://www.bilibili.com:444/video/BV1xx411c7mD',
    'https://www.bilibili.com/video/BV1xx411c7mD/another-page',
    'https://www.bilibili.com/video/BV1xx4\n11c7mD',
    'javascript:alert(1)', 'not a url',
  ]) assert.equal(parse(url).valid, false, url);
});

test('short links remain explicitly unsupported instead of becoming fake BV identifiers', () => {
  assert.equal(parse('https://b23.tv/example').valid, false);
  assert.match(parse('https://b23.tv/example').error, /完整视频链接/);
});
