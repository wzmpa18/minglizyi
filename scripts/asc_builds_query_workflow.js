const crypto = require('crypto');
const https = require('https');

const ISSUER_ID = process.env.ASC_ISSUER;
const KEY_ID = process.env.ASC_KID;
const P8 = process.env.ASC_KEY;

function makeJwt() {
  const header = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: ISSUER_ID, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1' };
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const signingInput = `${enc(header)}.${enc(payload)}`;
  const signature = crypto.createSign('SHA256').update(signingInput).sign({ key: P8, dsaEncoding: 'ieee-p1363' }, 'base64url');
  return `${signingInput}.${signature}`;
}

function req(path) {
  return new Promise((resolve, reject) => {
    const r = https.request({
      hostname: 'api.appstoreconnect.apple.com',
      path,
      method: 'GET',
      headers: { Authorization: `Bearer ${makeJwt()}` },
    }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    r.on('error', reject);
    r.end();
  });
}

(async () => {
  const res = await req('/v1/builds?filter[app]=6807592575&sort=-uploadedDate&limit=5&fields[builds]=version,uploadedDate,processingState,usesNonExemptEncryption');
  console.log('HTTP_STATUS=' + res.status);
  if (res.status !== 200) {
    console.log('ERR_BODY=' + res.body.slice(0, 500));
    process.exit(1);
  }
  const j = JSON.parse(res.body);
  console.log('BUILD_COUNT=' + j.data.length);
  for (const b of j.data) {
    const a = b.attributes;
    console.log(`BUILD|version=${a.version}|state=${a.processingState}|uploaded=${a.uploadedDate}|enc=${a.usesNonExemptEncryption}`);
  }
})();
