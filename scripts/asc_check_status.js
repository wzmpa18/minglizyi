const crypto = require('crypto');
const https = require('https');

const ISSUER_ID = 'ee663add-beb6-40d2-92ad-e09fafec8110';
const KEY_ID = 'UWQ354QP54';
const P8 = `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgDtIkaHRvdFTOos/oZdVd9nklnuRYnSsmlU28g7kPkbigCgYIKoZIzj0DAQehRANCAAQFfyjgrkwMGMax74CdmAPBT/A9+lPXgx1yGrUPYuuaQcx4dFdmZxzXhuYF0+byqCJ1PjPlH06gWOxv0XTMxLGo
-----END PRIVATE KEY-----`;
const VERSION_ID = '299afd61-88b3-4f82-b0dd-54847928f1e8';

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
  let res = await api('GET', `/v1/appStoreVersions/${VERSION_ID}?fields[appStoreVersions]=appStoreState,versionString`);
  console.log('== version ==');
  console.log('status:', res.status);
  if (res.status === 200) {
    const d = JSON.parse(res.body).data;
    console.log('version:', d.attributes.versionString, '| state:', d.attributes.appStoreState);
  } else {
    console.log(res.body.slice(0, 500));
  }

  res = await api('GET', `/v1/appStoreVersions/${VERSION_ID}/build?fields[builds]=version,uploadedDate,processingState`);
  console.log('\n== linked build ==');
  if (res.status === 200) {
    const d = JSON.parse(res.body).data;
    if (d) console.log('build', d.attributes.version, '| processing:', d.attributes.processingState);
    else console.log('no build linked');
  } else {
    console.log(res.body.slice(0, 300));
  }

  res = await api('GET', `/v1/appStoreVersions/${VERSION_ID}/appStoreReviewDetail`);
  console.log('\n== review detail ==');
  if (res.status === 200) {
    const d = JSON.parse(res.body).data;
    if (d) {
      console.log('detailId:', d.id);
      console.log('notes:', (d.attributes.notes || '').slice(0, 100) + '...');
    } else console.log('no review detail');
  } else {
    console.log(res.body.slice(0, 300));
  }

  res = await api('GET', `/v1/appStoreVersions/${VERSION_ID}/appStoreVersionLocalizations?limit=5&fields[appStoreVersionLocalizations]=locale,description`);
  console.log('\n== localizations ==');
  if (res.status === 200) {
    for (const d of JSON.parse(res.body).data) {
      console.log(d.id, d.attributes.locale, '| desc len:', (d.attributes.description || '').length);
    }
  } else {
    console.log(res.body.slice(0, 300));
  }
})();
