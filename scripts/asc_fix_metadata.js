const crypto = require('crypto');
const https = require('https');

const ISSUER_ID = 'ee663add-beb6-40d2-92ad-e09fafec8110';
const KEY_ID = 'UWQ354QP54';
const P8 = `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgDtIkaHRvdFTOos/oZdVd9nklnuRYnSsmlU28g7kPkbigCgYIKoZIzj0DAQehRANCAAQFfyjgrkwMGMax74CdmAPBT/A9+lPXgx1yGrUPYuuaQcx4dFdmZxzXhuYF0+byqCJ1PjPlH06gWOxv0XTMxLGo
-----END PRIVATE KEY-----`;
const APP_INFO_ID = '157d4098-3c6f-4aa8-8418-4d60321ab9e8';
const APP_ID = '6807592575';

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
  // 1. find Education category id
  let res = await api('GET', '/v1/appCategories?limit=200');
  console.log('== categories (top level) ==');
  let eduId = null, refId = null;
  if (res.status === 200) {
    for (const c of JSON.parse(res.body).data) {
      if (c.attributes && /education|教育/i.test(c.id + c.attributes.name)) { eduId = c.id; console.log('EDUCATION:', c.id, c.attributes.name); }
      if (c.attributes && /reference|参考/i.test(c.id + c.attributes.name)) { refId = c.id; console.log('REFERENCE:', c.id, c.attributes.name); }
    }
  } else {
    console.log(res.body.slice(0, 400));
  }
  if (!eduId) {
    // probe common ids
    for (const id of ['6017', '6006', '6020']) {
      res = await api('GET', `/v1/appCategories/${id}`);
      if (res.status === 200) {
        const d = JSON.parse(res.body).data;
        console.log(`probe ${id}:`, d.id, d.attributes.name);
        if (d.id === '6017') eduId = '6017';
        if (d.id === '6006') refId = '6006';
      }
    }
  }

  // 2. set primaryCategory + secondaryCategory on appInfo
  if (eduId) {
    const attrs = { primaryCategory: eduId };
    if (refId) attrs.secondaryCategory = refId;
    res = await api('PATCH', `/v1/appInfos/${APP_INFO_ID}`, {
      data: {
        type: 'appInfos',
        id: APP_INFO_ID,
        relationships: {
          primaryCategory: { data: { type: 'appCategories', id: eduId } },
          ...(refId ? { secondaryCategory: { data: { type: 'appCategories', id: refId } } } : {}),
        },
      },
    });
    console.log('\nset primaryCategory:', res.status, res.status === 200 ? 'OK' : res.body.slice(0, 400));
  }

  // 3. set contentRightsDeclaration on app
  res = await api('PATCH', `/v1/apps/${APP_ID}`, {
    data: {
      type: 'apps',
      id: APP_ID,
      attributes: { contentRightsDeclaration: 'DOES_NOT_USE_THIRD_PARTY_CONTENT' },
    },
  });
  console.log('\nset contentRightsDeclaration:', res.status, res.status === 200 ? 'OK' : res.body.slice(0, 400));

  // 4. inspect app pricing state
  res = await api('GET', `/v1/apps/${APP_ID}?include=prices&fields[appPrices]=startDate,endDate&limit=10`);
  console.log('\n== app prices (v1 include) ==');
  if (res.status === 200) {
    const body = JSON.parse(res.body);
    console.log('included:', JSON.stringify(body.included || []).slice(0, 300));
  } else console.log(res.body.slice(0, 300));

  // 5. check price schedules via v2 endpoint
  res = await api('GET', `/v2/apps/${APP_ID}/appPriceSchedules?limit=5`);
  console.log('\n== appPriceSchedules (v2) ==', res.status);
  if (res.status === 200) {
    console.log(res.body.slice(0, 500));
  } else {
    console.log(res.body.slice(0, 300));
  }
})();
