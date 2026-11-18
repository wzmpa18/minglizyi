'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('./lib/guoxueAscClient.cjs');
const { hash, recoverableScreenshotUpload } = require('./lib/appleOwnerPreparation.cjs');

const appId = '6807592575';
const bundleId = 'com.yandaoguoxue.app';
const release = '25.0.124';
const source = '7a3d0d6e8b4a2c76cb8ad7835cf6bd6a11fa6f4c';
const build = '70';
const { api } = createClient({ mutations: true });
const copy = {
  'zh-Hans': {
    promotionalText: '打开言道国学首页，一键进入易学排盘或中医学习。查阅传统历法、排盘资料、中医经典和经络穴位。',
    description: '言道国学是传统文化与中医经典学习工具。首页设置易学排盘与中医学习两个入口，帮助你按主题查阅资料。\n\n易学排盘：使用八字排盘工具，查阅四柱、历法与易学术语，同时可了解紫微斗数等传统文化资料。\n\n中医学习：查阅中医经典、经络穴位和学习资料，结合人体图示理解结构。本应用供文化研究及学习参考，不提供医疗诊断、处方或个人健康建议。',
    whatsNew: '优化 iPhone 返回首页后再次进入八字排盘、紫微斗数等工具的导航体验。'
  },
  'en-US': {
    promotionalText: 'Open Yi studies or Chinese medicine learning from the home screen. Explore traditional charts, classic texts, and reference diagrams.',
    description: 'Yandao Guoxue is a learning tool for traditional Chinese culture. Its home screen provides dedicated entry points for Yi studies and Chinese medicine learning.\n\nYi studies: Explore traditional Four Pillars charts, calendars, and terminology.\n\nChinese medicine learning: Browse classic texts and reference materials on meridians and acupoints. The app is for learning and cultural research. It does not provide diagnosis, prescriptions, or personal health advice.',
    whatsNew: 'Improved navigation when reopening chart tools after returning to the iPhone home screen within the app.'
  }
};

const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const get = async url => (await api('GET', url)).data;
const mutate = async (method, url, type, attributes, relationships, id) => (await api(method, url, {
  data: { type, ...(id ? { id } : {}), ...(attributes ? { attributes } : {}), ...(relationships ? { relationships } : {}) }
})).data;
const relation = (type, id) => ({ data: { type, id } });
const put = (op, bytes) => fetch(op.url, {
  method: 'PUT', headers: Object.fromEntries(op.requestHeaders.map(h => [h.name, h.value])),
  body: bytes, redirect: 'error', signal: AbortSignal.timeout(60000)
});

function loadShots() {
  const base = 'store-proof';
  const manifest = read(path.join(base, 'source.json'));
  if (manifest.pinnedApplicationSource !== source || manifest.actualSimulator !== true || manifest.syntheticInterface !== false) throw Error('Unexpected screenshot provenance');
  return [
    { device: 'iphone', display: 'APP_IPHONE_67', allowed: [[1320, 2868], [1290, 2796], [1260, 2736]] },
    { device: 'ipad', display: 'APP_IPAD_PRO_3GEN_129', allowed: [[2064, 2752], [2048, 2732]] }
  ].map(group => {
    const dir = path.join(base, group.device);
    const rows = read(path.join(dir, 'manifest.json'));
    const files = ['yixue-tools', 'medical-home'].map(feature => {
      const matches = rows.filter(r => r.feature === feature && r.isAssociatedWithFailure === false);
      if (matches.length !== 1) throw Error('Missing verified screen ' + feature);
      const row = matches[0];
      if (!/^[a-f0-9-]+\.png$/i.test(row.exportedFileName) || row.hasAlphaChannel !== false) throw Error('Invalid screenshot manifest');
      const raw = fs.readFileSync(path.join(dir, row.exportedFileName));
      if (raw.length !== row.bytes || hash(raw) !== row.sha256 || raw.readUInt32BE(16) !== row.width || raw.readUInt32BE(20) !== row.height || !group.allowed.some(([w, h]) => w === row.width && h === row.height)) throw Error('Screenshot hash or dimensions mismatch');
      return { raw, sha256: row.sha256 };
    });
    return { ...group, files };
  });
}

async function save() {
  const groups = loadShots();
  const app = await get('/v1/apps/' + appId);
  if (app.attributes.bundleId !== bundleId) throw Error('Wrong App Store application');
  const versions = await get('/v1/apps/' + appId + '/appStoreVersions?filter[platform]=IOS&limit=50');
  let version = versions.find(v => v.attributes.versionString === release);
  if (!version) {
    const live = versions.find(v => v.attributes.versionString === '25.0.123');
    if (!live || !['READY_FOR_SALE', 'READY_FOR_DISTRIBUTION'].includes(live.attributes.appStoreState)) throw Error('Current version not confirmed live; existing review preserved');
    version = await mutate('POST', '/v1/appStoreVersions', 'appStoreVersions',
      { platform: 'IOS', versionString: release, releaseType: 'AFTER_APPROVAL' }, { app: relation('apps', appId) });
  }
  if (version.attributes.appStoreState !== 'PREPARE_FOR_SUBMISSION') throw Error('Target version is not an editable draft');
  const locPath = '/v1/appStoreVersions/' + version.id + '/appStoreVersionLocalizations';
  const locales = await get(locPath + '?limit=50');
  for (const [locale, attributes] of Object.entries(copy)) {
    let row = locales.find(l => l.attributes.locale === locale);
    if (!row) row = await mutate('POST', '/v1/appStoreVersionLocalizations', 'appStoreVersionLocalizations',
      { locale, ...attributes, supportUrl: 'https://yandaoguoxue.yandao.vip/' }, { appStoreVersion: relation('appStoreVersions', version.id) });
    else await mutate('PATCH', '/v1/appStoreVersionLocalizations/' + row.id, 'appStoreVersionLocalizations', attributes, null, row.id);
    const readback = await get('/v1/appStoreVersionLocalizations/' + row.id);
    if (Object.entries(attributes).some(([key, value]) => readback.attributes[key] !== value)) throw Error('Store description readback mismatch: ' + locale);

    const sets = await get('/v1/appStoreVersionLocalizations/' + row.id + '/appScreenshotSets?limit=50');
    for (const group of groups) {
      let set = sets.find(s => s.attributes.screenshotDisplayType === group.display);
      if (!set) set = await mutate('POST', '/v1/appScreenshotSets', 'appScreenshotSets',
        { screenshotDisplayType: group.display }, { appStoreVersionLocalization: relation('appStoreVersionLocalizations', row.id) });
      const assetsUrl = '/v1/appScreenshotSets/' + set.id + '/appScreenshots?limit=50';
      const existing = await get(assetsUrl);
      const trace = [];
      const write = (method, url, body) => api(method, url, body);
      const selected = [];
      for (let index = 0; index < group.files.length; index++) {
        selected.push(await recoverableScreenshotUpload({ api, write, setId: set.id, existing, ...group.files[index], build, device: group.device, index, trace, put }));
      }
      for (let attempt = 1; attempt <= 12; attempt++) {
        const actual = await get(assetsUrl);
        const complete = selected.every(s => actual.some(r => r.id === s.id && r.attributes.assetDeliveryState?.state === 'COMPLETE'));
        if (complete) break;
        if (attempt === 12) throw Error('Apple has not completed image processing: ' + locale + ' ' + group.device);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      const orderUrl = '/v1/appScreenshotSets/' + set.id + '/relationships/appScreenshots';
      const currentOrder = await get(orderUrl + '?limit=50');
      const first = selected.map(a => ({ type: 'appScreenshots', id: a.id }));
      const ordered = [...first, ...currentOrder.filter(a => !first.some(s => s.id === a.id))];
      if (ordered.length !== currentOrder.length) throw Error('Screenshot order omitted a selected asset');
      if (first.some((a, i) => currentOrder[i]?.id !== a.id)) await api('PATCH', orderUrl, { data: ordered });
      const actualOrder = await get(orderUrl + '?limit=50');
      if (first.some((a, i) => actualOrder[i]?.id !== a.id) || ordered.length !== actualOrder.length) throw Error('Screenshot order readback mismatch');
      console.log(locale + ' ' + group.device + ': two real screenshots verified at the front of the draft gallery');
    }
  }
  const buildUrl = '/v1/builds?filter[app]=' + appId + '&filter[version]=' + build + '&include=preReleaseVersion&limit=20';
  const result = await api('GET', buildUrl);
  const matches = result.data.filter(row => row.attributes.version === build && !row.attributes.expired && result.included?.some(v =>
    v.type === 'preReleaseVersions' && v.id === row.relationships.preReleaseVersion?.data?.id && v.attributes.platform === 'IOS' && v.attributes.version === release
  ));
  if (matches.length !== 1 || matches[0].attributes.processingState !== 'VALID') throw Error('Exact uploaded iOS build is not yet VALID');
  const exact = matches[0];
  const buildLink = '/v1/appStoreVersions/' + version.id + '/relationships/build';
  const existing = await get(buildLink);
  if (existing && existing.id !== exact.id) throw Error('Draft has a different build selected');
  if (!existing) await api('PATCH', buildLink, relation('builds', exact.id));
  const linked = await get(buildLink);
  if (linked?.id !== exact.id) throw Error('Linked build verification failed');
  console.log('Version ' + release + ': build ' + build + ', store copy and front-of-gallery screenshots verified. Draft id ' + version.id);
}

save().catch(error => {
  console.error(error.message);
  if (error.details) console.error(JSON.stringify(error.details.map(d => ({ code: d.code, title: d.title }))));
  process.exitCode = 1;
});
