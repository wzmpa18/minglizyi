const crypto = require('crypto');
const https = require('https');

const ISSUER_ID = 'ee663add-beb6-40d2-92ad-e09fafec8110';
const KEY_ID = 'UWQ354QP54';
const P8 = `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgDtIkaHRvdFTOos/oZdVd9nklnuRYnSsmlU28g7kPkbigCgYIKoZIzj0DAQehRANCAAQFfyjgrkwMGMax74CdmAPBT/A9+lPXgx1yGrUPYuuaQcx4dFdmZxzXhuYF0+byqCJ1PjPlH06gWOxv0XTMxLGo
-----END PRIVATE KEY-----`;
const VERSION_ID = '299afd61-88b3-4f82-b0dd-54847928f1e8';
const BUILD2_ID = 'edae34ee-5719-42c7-9e4f-15c0d671c306';
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
  // 0. check build export compliance
  let res = await api('GET', `/v1/builds/${BUILD2_ID}?fields[builds]=version,usesNonExemptEncryption,processingState`);
  console.log('== build 2 export compliance ==');
  if (res.status === 200) {
    const a = JSON.parse(res.body).data.attributes;
    console.log('usesNonExemptEncryption:', a.usesNonExemptEncryption);
    if (a.usesNonExemptEncryption === null || a.usesNonExemptEncryption === undefined) {
      console.log('setting usesNonExemptEncryption=false (standard HTTPS only)...');
      res = await api('PATCH', `/v1/builds/${BUILD2_ID}`, {
        data: {
          type: 'builds',
          id: BUILD2_ID,
          attributes: { usesNonExemptEncryption: false },
        },
      });
      console.log('patch result:', res.status, res.status === 200 ? 'OK' : res.body.slice(0, 300));
    }
  } else {
    console.log(res.body.slice(0, 300));
  }

  // 1. check existing open reviewSubmissions for this app
  res = await api('GET', `/v1/reviewSubmissions?filter[app]=${APP_ID}&limit=5`);
  console.log('\n== existing reviewSubmissions ==');
  let existing = null;
  if (res.status === 200) {
    const list = JSON.parse(res.body).data;
    if (list.length) {
      for (const s of list) {
        console.log(`id=${s.id} state=${s.attributes.submitted ? 'submitted' : 'draft'}`);
        if (!s.attributes.submitted && !existing) existing = s;
      }
    } else console.log('none');
  } else {
    console.log(res.body.slice(0, 300));
  }

  // 2. create (or reuse) reviewSubmission
  let subId = existing ? existing.id : null;
  if (!subId) {
    res = await api('POST', '/v1/reviewSubmissions', {
      data: {
        type: 'reviewSubmissions',
        relationships: {
          app: { data: { type: 'apps', id: APP_ID } },
        },
      },
    });
    console.log('\n== create reviewSubmission ==', res.status);
    if (res.status !== 201) { console.log(res.body.slice(0, 500)); process.exit(1); }
    subId = JSON.parse(res.body).data.id;
  }
  console.log('reviewSubmissionId:', subId);

  // 3. check items on the submission
  res = await api('GET', `/v1/reviewSubmissions/${subId}/items?limit=5`);
  console.log('\n== existing items ==');
  let hasItem = false;
  if (res.status === 200) {
    const items = JSON.parse(res.body).data;
    if (items.length) {
      hasItem = true;
      for (const it of items) console.log('item:', it.id);
    } else console.log('none');
  } else {
    console.log(res.body.slice(0, 300));
  }

  // 4. create item linking the iOS version
  if (!hasItem) {
    res = await api('POST', '/v1/reviewSubmissionItems', {
      data: {
        type: 'reviewSubmissionItems',
        relationships: {
          appStoreVersion: { data: { type: 'appStoreVersions', id: VERSION_ID } },
          reviewSubmission: { data: { type: 'reviewSubmissions', id: subId } },
        },
      },
    });
    console.log('\n== create reviewSubmissionItem ==', res.status);
    if (res.status !== 201) { console.log(res.body.slice(0, 500)); process.exit(1); }
    console.log('itemId:', JSON.parse(res.body).data.id);
  }

  // 5. fetch item details to check missing compliance info
  res = await api('GET', `/v1/reviewSubmissions/${subId}/items?limit=5`);
  if (res.status === 200) {
    const items = JSON.parse(res.body).data;
    for (const it of items) {
      const a = it.attributes || {};
      console.log('\nitem attributes:', JSON.stringify(a).slice(0, 500));
    }
  }

  console.log('\nDONE - reviewSubmission ready (not yet submitted). Run submit step next.');
})();
