const crypto = require('crypto');
const https = require('https');

const ISSUER_ID = 'ee663add-beb6-40d2-92ad-e09fafec8110';
const KEY_ID = 'UWQ354QP54';
const P8 = `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgDtIkaHRvdFTOos/oZdVd9nklnuRYnSsmlU28g7kPkbigCgYIKoZIzj0DAQehRANCAAQFfyjgrkwMGMax74CdmAPBT/A9+lPXgx1yGrUPYuuaQcx4dFdmZxzXhuYF0+byqCJ1PjPlH06gWOxv0XTMxLGo
-----END PRIVATE KEY-----`;
const VERSION_ID = '299afd61-88b3-4f82-b0dd-54847928f1e8';
const LOCALE_ID = 'badb6d7f-f2b5-4c14-8086-e31815c5a9f3';

function makeJwt() {
  const header = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: ISSUER_ID, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1' };
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const signingInput = `${enc(header)}.${enc(payload)}`;
  const signature = crypto.createSign('SHA256').update(signingInput).sign({ key: P8, dsaEncoding: 'ieee-p1363' }, 'base64url');
  return `${signingInput}.${signature}`;
}

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = { Authorization: `Bearer ${makeJwt()}` };
    if (payload) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(payload); }
    const r = https.request({ hostname: 'api.appstoreconnect.apple.com', path, method, headers }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

(async () => {
  // 1. localization full fields
  let res = await api('GET', `/v1/appStoreVersionLocalizations/${LOCALE_ID}`);
  console.log('== localization fields ==');
  if (res.status === 200) {
    const a = JSON.parse(res.body).data.attributes;
    for (const k of Object.keys(a)) {
      const v = a[k];
      console.log(`${k}: ${typeof v === 'string' ? (v.length > 80 ? v.slice(0, 80) + '...' : v) : JSON.stringify(v)}`);
    }
  } else console.log(res.body.slice(0, 400));

  // 2. screenshot sets status
  res = await api('GET', `/v1/appStoreVersionLocalizations/${LOCALE_ID}/appScreenshotSets?include=appScreenshots&fields[appScreenshots]=fileName,assetDeliveryState&limit=10`);
  console.log('\n== screenshot sets ==');
  if (res.status === 200) {
    const body = JSON.parse(res.body);
    for (const s of body.data) {
      const shots = (body.included || []).filter((x) => x.type === 'appScreenshots');
      console.log(`set ${s.attributes.screenshotDisplayType}: ${shots.length} screenshots`);
      for (const shot of shots) {
        const state = shot.attributes.assetDeliveryState;
        console.log(`  - ${shot.attributes.fileName}: ${state ? (state.state || JSON.stringify(state).slice(0, 60)) : '?'}`);
      }
    }
  } else console.log(res.body.slice(0, 400));

  // 3. age rating
  res = await api('GET', `/v1/agesRatingRequests`); // just probing availability
  console.log('\n== age rating probe (expected 404/405) ==', res.status);

  // 4. app info (name, subtitle, privacy policy URL, etc.)
  res = await api('GET', `/v1/appStoreVersions/${VERSION_ID}/appInfo`);
  console.log('\n== app info ==');
  if (res.status === 200) {
    const d = JSON.parse(res.body).data;
    for (const item of d) {
      console.log('appInfoId:', item.id);
      const r2 = await api('GET', `/v1/appInfos/${item.id}/appInfoLocalizations?limit=5`);
      if (r2.status === 200) {
        for (const l of JSON.parse(r2.body).data) {
          const a = l.attributes;
          console.log(`  locale=${a.locale} name=${a.name} subtitle=${a.subtitle || '(empty)'} privacyPolicyUrl=${a.privacyPolicyUrl || '(empty)'}`);
        }
      }
    }
  } else console.log(res.body.slice(0, 400));

  // 5. submission endpoint probe (GET to see error detail)
  res = await api('POST', '/v1/submissions', {
    data: {
      type: 'submissions',
      relationships: {
        appStoreVersion: { data: { type: 'appStoreVersions', id: VERSION_ID } },
      },
    },
  });
  console.log('\n== submit probe ==');
  console.log('status:', res.status);
  console.log('body:', res.body.slice(0, 800));
})();
