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
  const probes = [
    ['GET', `/v1/appPrices?filter[app]=${APP_ID}&limit=3`],
    ['GET', `/v1/appPriceSchedules?filter[app]=${APP_ID}&limit=3`],
    ['GET', `/v2/appPriceSchedules?filter[app]=${APP_ID}&limit=3`],
    ['GET', `/v1/apps/${APP_ID}/appPriceSchedule`],
    ['GET', `/v1/territories?limit=3`],
    ['GET', `/v2/apps/${APP_ID}/appPricePoints?limit=3&filter[territory]=CHN`],
    ['GET', `/v3/appPricePoints?limit=1`],
  ];
  for (const [m, p] of probes) {
    const res = await api(m, p);
    let code = '';
    try { code = JSON.parse(res.body).errors ? JSON.parse(res.body).errors[0].code : 'OK'; } catch (e) {}
    console.log(`${m} ${p} -> ${res.status} ${code}`);
  }
})();
