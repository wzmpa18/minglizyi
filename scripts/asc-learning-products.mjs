// Maintenance: prepare ONLY the approved Guoxue products. Never submits review.
// Default is read-only. --apply permits draft metadata/prices; the existing
// availability is preserved unless --sync-availability explicitly mirrors the
// already configured app territories. Neither option submits App Review.
// Credentials: ASC_KEY_ID, ASC_ISSUER_ID, ASC_PRIVATE_KEY_PATH (protected file).
// Optional ASC_EVIDENCE_PATH stores non-sensitive read-back results outside Git.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const catalog = JSON.parse(fs.readFileSync(new URL('../backend_deploy/appleIapCatalog.json', import.meta.url), 'utf8'));
assert.equal(catalog.appId, '6807592575');
assert.equal(catalog.bundleId, 'com.yandaoguoxue.app');
assert.equal(new Set(catalog.products.map(p => p.productId)).size, catalog.products.length);
for (const p of catalog.products) {
  assert.ok(p.productId.startsWith(catalog.bundleId + '.'));
  assert.ok(p.chinaPrice > 0 && p.chinaPrice <= Math.round(p.androidBasePrice * 80) / 100);
  assert.ok(p.name.length <= 30 && p.description.length <= 45);
  assert.ok(p.englishName.length <= 30 && p.englishDescription.length <= 45);
}
const apply = process.argv.includes('--apply');
const syncAvailability = process.argv.includes('--sync-availability');
const reviewNote = 'Learning product draft. StoreKit 2 purchase, restore and signed server delivery/refund integration are implemented in TestFlight 25.0.115 (8). Real sandbox acceptance and final purchase screenshots are pending. Not submitted for review.';
const origin = 'https://api.appstoreconnect.apple.com';
function token() {
  for (const k of ['ASC_KEY_ID', 'ASC_ISSUER_ID', 'ASC_PRIVATE_KEY_PATH']) assert.ok(process.env[k], `Missing ${k}`);
  const now = Math.floor(Date.now() / 1000);
  const encode = v => Buffer.from(JSON.stringify(v)).toString('base64url');
  const data = encode({ alg: 'ES256', kid: process.env.ASC_KEY_ID, typ: 'JWT' }) + '.' + encode({ iss: process.env.ASC_ISSUER_ID, iat: now - 20, exp: now + 600, aud: 'appstoreconnect-v1' });
  return data + '.' + crypto.sign('sha256', Buffer.from(data), { key: fs.readFileSync(process.env.ASC_PRIVATE_KEY_PATH), dsaEncoding: 'ieee-p1363' }).toString('base64url');
}
async function api(path, method = 'GET', body) {
  const url = new URL(path, origin);
  assert.equal(url.origin, origin); // Don't forward credentials to pagination on another host.
  assert.ok(method === 'GET' || apply, 'Read-only mode cannot mutate App Store Connect');
  const response = await fetch(url, { method, headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(45000) });
  const data = await response.json();
  if (!response.ok) {
    const error = Error(`Apple ${response.status} ${method} ${url.pathname}: ${(data.errors || []).map(e => `${e.code}: ${e.detail || e.title}`).join('; ')}`);
    error.status = response.status;
    throw error;
  }
  return data;
}
async function all(path) {
  const result = [];
  while (path) { const data = await api(path); result.push(...data.data); path = data.links?.next; }
  return result;
}
const report = { checkedAt: new Date().toISOString(), appId: catalog.appId, applied: apply, submitted: false, products: [] };
function save() {
  if (process.env.ASC_EVIDENCE_PATH) fs.writeFileSync(process.env.ASC_EVIDENCE_PATH, JSON.stringify(report, null, 2) + '\n');
}
try {
  let appTerritories;
  let newTerritories;
  if (syncAvailability) {
    assert.ok(apply, '--sync-availability also requires --apply');
    const availability = (await api(`/v1/apps/${catalog.appId}/appAvailabilityV2`)).data;
    const related = availability.relationships?.territoryAvailabilities?.links?.related;
    assert.ok(related, 'Configure app availability before synchronizing products');
    const records = await all(`${related}?include=territory&limit=200`);
    appTerritories = records.filter(record => record.attributes.available === true).map(record => record.relationships.territory.data.id).sort();
    assert.ok(appTerritories.length > 0 && appTerritories.length <= 250);
    assert.equal(new Set(appTerritories).size, appTerritories.length);
    newTerritories = availability.attributes.availableInNewTerritories === true;
    report.appAvailability = { territories: appTerritories, availableInNewTerritories: newTerritories };
  }
  const existing = await all(`/v1/apps/${catalog.appId}/inAppPurchasesV2?limit=200`);
  for (const product of catalog.products) {
    let remote = existing.find(p => p.attributes.productId === product.productId);
    if (!remote && apply) {
      remote = (await api('/v2/inAppPurchases', 'POST', { data: { type: 'inAppPurchases', attributes: { name: '言道国学' + product.name, productId: product.productId, inAppPurchaseType: product.type, reviewNote: 'Learning product draft under configuration. Purchase, restore and refund integration is under development. Not submitted for review.' }, relationships: { app: { data: { type: 'apps', id: catalog.appId } } } } })).data;
    }
    if (!remote) { report.products.push({ productId: product.productId, exists: false }); save(); continue; }
    assert.equal(remote.attributes.inAppPurchaseType, product.type, 'Product type must never change');
    const row = { key: product.key, id: remote.id, productId: product.productId, state: remote.attributes.state, chinaPrice: product.chinaPrice, priceVerified: false, localizations: [] };
    report.products.push(row); save();
    let schedule;
    try { schedule = (await api(`/v2/inAppPurchases/${remote.id}/iapPriceSchedule`)).data; }
    catch (e) { if (e.status !== 404) throw e; }
    async function manualPrices() {
      return api(`/v1/inAppPurchasePriceSchedules/${schedule.id}/manualPrices?filter[territory]=CHN&include=inAppPurchasePricePoint,territory&limit=200`);
    }
    let prices = schedule ? await manualPrices() : null;
    const today = new Date().toISOString().slice(0, 10);
    const matching = () => prices?.data.filter(p => (!p.attributes.endDate || p.attributes.endDate > today) && (!p.attributes.startDate || p.attributes.startDate <= today)).some(p => Number(prices.included?.find(x => x.id === p.relationships.inAppPurchasePricePoint.data.id)?.attributes.customerPrice) === product.chinaPrice);
    // Preserve any existing schedule with a different price for review; don't
    // silently overwrite historical or scheduled charges on a published product.
    if (schedule && !matching()) throw Error(`Existing schedule differs for ${product.productId}; inspect before changing`);
    if (!schedule && apply) {
      const points = await all(`/v2/inAppPurchases/${remote.id}/pricePoints?filter[territory]=CHN&limit=8000`);
      const point = points.find(p => Number(p.attributes.customerPrice) === product.chinaPrice);
      assert.ok(point, `Approved price point missing: ${product.key}`);
      schedule = (await api('/v1/inAppPurchasePriceSchedules', 'POST', {
        data: { type: 'inAppPurchasePriceSchedules', relationships: { inAppPurchase: { data: { type: 'inAppPurchases', id: remote.id } }, baseTerritory: { data: { type: 'territories', id: 'CHN' } }, manualPrices: { data: [{ type: 'inAppPurchasePrices', id: '${price1}' }] } } },
        included: [{ type: 'inAppPurchasePrices', id: '${price1}', attributes: { startDate: null, endDate: null }, relationships: { inAppPurchaseV2: { data: { type: 'inAppPurchases', id: remote.id } }, inAppPurchasePricePoint: { data: { type: 'inAppPurchasePricePoints', id: point.id } } } }]
      })).data;
      prices = await manualPrices();
    }
    row.priceVerified = !!matching(); row.priceScheduleId = schedule?.id || null; save();
    // Version-based metadata is Apple's current workflow. Reuse drafts so
    // retries after uncertain outcomes cannot create duplicate products/versions.
    let versions = await all(`/v2/inAppPurchases/${remote.id}/versions?limit=200`);
    let version = versions.find(v => ['PREPARE_FOR_SUBMISSION', 'READY_FOR_REVIEW'].includes(v.attributes.state));
    if (!version && apply) version = (await api('/v1/inAppPurchaseVersions', 'POST', { data: { type: 'inAppPurchaseVersions', relationships: { inAppPurchase: { data: { type: 'inAppPurchases', id: remote.id } } } } })).data;
    if (version) {
      row.metadataVersionId = version.id;
      const localized = await all(`/v1/inAppPurchaseVersions/${version.id}/localizations?limit=200`);
      for (const [locale, name, description] of [['zh-Hans', product.name, product.description], ['en-US', product.englishName, product.englishDescription]]) {
        let local = localized.find(l => l.attributes.locale === locale);
        if (!local && apply) local = (await api('/v2/inAppPurchaseLocalizations', 'POST', { data: { type: 'inAppPurchaseLocalizations', attributes: { locale, name, description }, relationships: { version: { data: { type: 'inAppPurchaseVersions', id: version.id } } } } })).data;
        if (local) {
          assert.equal(local.attributes.name, name, 'Existing localization differs; inspect before overwriting');
          assert.equal(local.attributes.description, description, 'Existing description differs; inspect before overwriting');
          row.localizations.push({ locale, id: local.id });
        }
      }
    }
    if (apply && row.priceVerified && row.localizations.length === 2 && remote.attributes.reviewNote !== reviewNote) await api(`/v2/inAppPurchases/${remote.id}`, 'PATCH', { data: { type: 'inAppPurchases', id: remote.id, attributes: { reviewNote } } });
    if (syncAvailability) {
      let current;
      try { current = (await api(`/v2/inAppPurchases/${remote.id}/inAppPurchaseAvailability`)).data; }
      catch (error) { if (error.status !== 404) throw error; }
      const territories = current ? (await all(current.relationships.availableTerritories.links.related + '?limit=200')).map(record => record.id).sort() : [];
      if (!current || JSON.stringify(territories) !== JSON.stringify(appTerritories) || current.attributes.availableInNewTerritories !== newTerritories) {
        await api('/v1/inAppPurchaseAvailabilities', 'POST', { data: { type: 'inAppPurchaseAvailabilities', attributes: { availableInNewTerritories: newTerritories }, relationships: { inAppPurchase: { data: { type: 'inAppPurchases', id: remote.id } }, availableTerritories: { data: appTerritories.map(id => ({ type: 'territories', id })) } } } });
      }
      const confirmed = (await api(`/v2/inAppPurchases/${remote.id}/inAppPurchaseAvailability`)).data;
      const countries = (await all(confirmed.relationships.availableTerritories.links.related + '?limit=200')).map(record => record.id).sort();
      assert.deepEqual(countries, appTerritories);
      assert.equal(confirmed.attributes.availableInNewTerritories, newTerritories);
      row.availability = { territories: countries.length, availableInNewTerritories: newTerritories, verified: true };
    }
    const readback = (await api(`/v2/inAppPurchases/${remote.id}`)).data;
    row.state = readback.attributes.state;
    row.reviewNoteMatchesActualSetup = readback.attributes.reviewNote === reviewNote;
    save(); console.log(JSON.stringify(row));
  }
} catch (error) {
  report.error = error.message; save(); console.error(error.message); process.exitCode = 1;
}
