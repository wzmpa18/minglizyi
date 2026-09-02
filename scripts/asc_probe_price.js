const crypto = require('crypto');
const https = require('https');

const ISSUER_ID = 'ee663add-beb6-40d2-92ad-e09fafec8110';
const KEY_ID = 'UWQ354QP54';
const P8 = `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgDtIkaHRvdFTOos/oZdVd9nklnuRYnSsmlU28g7kPkbigCgYIKoZIzj0DAQehRANCAAQFfyjgrkwMGMax74CdmAPBT/A9+lPXgx1yGrUPYuuaQcx4dFdmZxzXhuYF0+byqCJ1PjPlH06gWOxv0XTMxLGo
-----END PRIVATE KEY-----`;
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
  // probe v2 appPricePoints
  let res = await api('GET', `/v2/apps/${APP_ID}/appPricePoints?limit=10`);
  console.log('== v2 appPricePoints (no filter) ==', res.status);
  if (res.status !== 200) console.log(res.body.slice(0, 400));
  else {
    const body = JSON.parse(res.body);
    console.log('count:', body.data.length, 'meta:', JSON.stringify(body.meta || {}).slice(0, 200));
    for (const p of body.data.slice(0, 5)) console.log('point:', p.id.slice(0, 40) + '...', JSON.stringify(p.attributes).slice(0, 150));
  }

  // probe with territory filter
  res = await api('GET', `/v2/apps/${APP_ID}/appPricePoints?limit=10&filter[territory]=USA`);
  console.log('\n== v2 appPricePoints (USA) ==', res.status);
  if (res.status === 200) {
    const body = JSON.parse(res.body);
    for (const p of body.data.slice(0, 10)) {
      console.log('point:', p.id, '|', JSON.stringify(p.attributes).slice(0, 120));
    }
  } else {
    console.log(res.body.slice(0, 400));
  }

  // probe priceChanges creation docs-wise: check existing
  res = await api('GET', `/v1/apps/${APP_ID}/priceChanges?limit=5`);
  console.log('\n== priceChanges ==', res.status);
  console.log(res.body.slice(0, 400));
})();
