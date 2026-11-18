'use strict';
const info = require('../docs/requirements/apple-owner-release.json');
const { createClient } = require('./lib/guoxueAscClient.cjs');

const context = {
  ownerChannelSpecific: true,
  appId: info.appId,
  bundleId: info.bundleId,
  version: info.version,
  build: info.build,
  candidateSource: info.candidateSource,
  sameSourceChecksPassed: true,
  action: 'assemble'
};
if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_REF_NAME !== 'codex/ios-store-25-0-124') throw Error('Expected the release job after navigation regression');
const { api } = createClient({ mutations: true, reviewContext: context });
const relation = (type, id) => ({ data: { type, id } });
const get = async url => (await api('GET', url)).data;
const write = async (method, url, data) => (await api(method, url, { data })).data;
const editable = ['PREPARE_FOR_SUBMISSION', 'READY_FOR_REVIEW'];
const queueStates = ['WAITING_FOR_REVIEW', 'IN_REVIEW'];
const id = '47dfcf50-1542-4cbe-b85c-c4d3de25cf2e';

async function verifiedReviewer(versionPath, versions) {
  const currentPath = versionPath + '/appStoreReviewDetail';
  const detail = await get(currentPath).catch(e => {
    if (e.message.includes('HTTP 404')) return null;
    throw e;
  });
  const hasContact = a => a && a.contactFirstName && a.contactLastName && a.contactEmail && a.contactPhone;
  const hasDemo = a => a && a.demoAccountRequired === true && a.demoAccountName && a.demoAccountPassword;
  if (hasContact(detail?.attributes) && hasDemo(detail?.attributes)) return;
  const old = versions.find(v => v.attributes.versionString === '25.0.123');
  if (!old) throw Error('Previous App Review information is unavailable');
  const previous = (await get('/v1/appStoreVersions/' + old.id + '/appStoreReviewDetail')).attributes;
  const attributes = {};
  for (const field of ['contactFirstName', 'contactLastName', 'contactEmail', 'contactPhone', 'demoAccountName', 'demoAccountPassword']) {
    if (!detail?.attributes?.[field] && previous[field]) attributes[field] = previous[field];
  }
  attributes.demoAccountRequired = Boolean((detail?.attributes?.demoAccountName || attributes.demoAccountName) && (detail?.attributes?.demoAccountPassword || attributes.demoAccountPassword));
  if (!hasContact({ ...detail?.attributes, ...attributes }) || !hasDemo({ ...detail?.attributes, ...attributes })) throw Error('Review contact or existing dedicated review account is missing');
  if (detail) await write('PATCH', '/v1/appStoreReviewDetails/' + detail.id, { type: 'appStoreReviewDetails', id: detail.id, attributes });
  else await write('POST', '/v1/appStoreReviewDetails', { type: 'appStoreReviewDetails', attributes, relationships: { appStoreVersion: relation('appStoreVersions', id) } });
}

async function submit() {
  const app = await get('/v1/apps/' + info.appId);
  if (app.attributes.bundleId !== info.bundleId) throw Error('Wrong application');
  const versions = await get('/v1/apps/' + info.appId + '/appStoreVersions?filter[platform]=IOS&limit=50');
  const version = versions.find(v => v.id === id && v.attributes.versionString === info.version);
  if (!version) throw Error('Expected version was not found');
  const versionPath = '/v1/appStoreVersions/' + id;
  if (queueStates.includes(version.attributes.appStoreState)) {
    console.log('Already submitted: ' + version.attributes.appStoreState);
    return;
  }
  if (!editable.includes(version.attributes.appStoreState)) throw Error('Version not editable: ' + version.attributes.appStoreState);
  const linked = await get(versionPath + '/build');
  if (linked.attributes.version !== info.build || linked.attributes.processingState !== 'VALID' || linked.attributes.expired) throw Error('Linked build failed verification');
  const locales = await get(versionPath + '/appStoreVersionLocalizations?limit=50');
  for (const locale of ['zh-Hans', 'en-US']) {
    const loc = locales.find(l => l.attributes.locale === locale);
    if (!loc?.attributes.description || !loc.attributes.whatsNew) throw Error('Required App Store text is absent: ' + locale);
    const sets = await get('/v1/appStoreVersionLocalizations/' + loc.id + '/appScreenshotSets?limit=50');
    for (const display of ['APP_IPHONE_67', 'APP_IPAD_PRO_3GEN_129']) {
      const set = sets.find(s => s.attributes.screenshotDisplayType === display);
      if (!set) throw Error('Required screenshot set is absent: ' + locale + ' ' + display);
      const shots = await get('/v1/appScreenshotSets/' + set.id + '/appScreenshots?limit=50');
      if (shots.length < 2 || shots.slice(0, 2).some(s => s.attributes.assetDeliveryState?.state !== 'COMPLETE')) throw Error('The two front-of-gallery screenshots are not complete');
    }
  }
  const reviews = await get('/v1/reviewSubmissions?filter[app]=' + info.appId + '&limit=50');
  if (reviews.some(r => r.attributes.platform === 'IOS' && [...queueStates, 'CANCELING'].includes(r.attributes.state))) throw Error('An existing Apple review must be preserved');
  const drafts = reviews.filter(r => r.attributes.platform === 'IOS' && r.attributes.state === 'READY_FOR_REVIEW');
  if (drafts.length > 1) throw Error('More than one Apple review draft is present');
  let review = drafts[0];
  const reviewItems = async () => (await get('/v1/reviewSubmissions/' + review.id + '/items?limit=50')).filter(i => i.attributes?.state !== 'REMOVED');
  if (review && (await reviewItems()).some(i => i.relationships.appStoreVersion?.data?.id !== id)) throw Error('The existing draft contains a different item');
  await verifiedReviewer(versionPath, versions);
  if (!review) review = await write('POST', '/v1/reviewSubmissions', { type: 'reviewSubmissions', attributes: { platform: 'IOS' }, relationships: { app: relation('apps', info.appId) } });
  if (!(await reviewItems()).some(i => i.relationships.appStoreVersion?.data?.id === id)) {
    await write('POST', '/v1/reviewSubmissionItems', {
      type: 'reviewSubmissionItems',
      relationships: { reviewSubmission: relation('reviewSubmissions', review.id), appStoreVersion: relation('appStoreVersions', id) }
    });
  }
  const finalItems = await reviewItems();
  if (finalItems.length !== 1 || finalItems[0].relationships.appStoreVersion?.data?.id !== id) throw Error('Review contains unexpected items');
  context.action = 'submit';
  await write('PATCH', '/v1/reviewSubmissions/' + review.id, { type: 'reviewSubmissions', id: review.id, attributes: { submitted: true } });
  for (let i = 0; i < 12; i++) {
    const receipt = await get('/v1/reviewSubmissions/' + review.id);
    if (queueStates.includes(receipt.attributes.state)) {
      console.log(JSON.stringify({ version: info.version, build: info.build, reviewId: receipt.id, state: receipt.attributes.state, submittedDate: receipt.attributes.submittedDate }));
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  throw Error('Apple has not yet returned a review receipt');
}

submit().catch(error => {
  console.error(error.message);
  if (error.details) console.error(JSON.stringify(error.details.map(d => ({ code: d.code, title: d.title, pointer: d.source?.pointer }))));
  process.exitCode = 1;
});
