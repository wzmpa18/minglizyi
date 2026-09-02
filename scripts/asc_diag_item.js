const crypto = require('crypto');
const https = require('https');

const ISSUER_ID = 'ee663add-beb6-40d2-92ad-e09fafec8110';
const KEY_ID = 'UWQ354QP54';
const P8 = `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgDtIkaHRvdFTOos/oZdVd9nklnuRYnSsmlU28g7kPkbigCgYIKoZIzj0DAQehRANCAAQFfyjgrkwMGMax74CdmAPBT/A9+lPXgx1yGrUPYuuaQcx4dFdmZxzXhuYF0+byqCJ1PjPlH06gWOxv0XTMxLGo
-----END PRIVATE KEY-----`;
const VERSION_ID = '299afd61-88b3-4f82-b0dd-54847928f1e8';
const APP_ID = '6807592575';
const SUB_ID = 'a8bea0c3-7244-4c2a-b655-3192af447954';

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
  // retry creating the item, print FULL error body this time
  let res = await api('POST', '/v1/reviewSubmissionItems', {
    data: {
      type: 'reviewSubmissionItems',
      relationships: {
        appStoreVersion: { data: { type: 'appStoreVersions', id: VERSION_ID } },
        reviewSubmission: { data: { type: 'reviewSubmissions', id: SUB_ID } },
      },
    },
  });
  console.log('create item:', res.status);
  console.log('FULL BODY:\n', res.body);

  // inspect appInfo localizations for the failing appInfo
  res = await api('GET', `/v1/appInfos/157d4098-3c6f-4aa8-8418-4d60321ab9e8/appInfoLocalizations?limit=10`);
  console.log('\n== appInfoLocalizations ==');
  if (res.status === 200) {
    for (const l of JSON.parse(res.body).data) {
      const a = l.attributes;
      console.log(`id=${l.id} locale=${a.locale}`);
      console.log(`  name=${a.name} subtitle=${a.subtitle || '(empty)'}`);
      console.log(`  privacyPolicyUrl=${a.privacyPolicyUrl || '(empty)'}`);
      console.log(`  privacyPolicyText=${a.privacyPolicyText ? a.privacyPolicyText.slice(0, 50) + '...' : '(empty)'}`);
    }
  } else {
    console.log(res.body.slice(0, 400));
  }

  // check age rating declaration (ageRatingDeclarations on the version)
  res = await api('GET', `/v1/appStoreVersions/${VERSION_ID}/ageRatingDeclaration`);
  console.log('\n== ageRatingDeclaration ==');
  if (res.status === 200) {
    const d = JSON.parse(res.body).data;
    console.log('id:', d.id);
    console.log('attributes:', JSON.stringify(d.attributes).slice(0, 600));
  } else {
    console.log(res.body.slice(0, 400));
  }
})();
