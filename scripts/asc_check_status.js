// Read-only Guoxue status audit. It never prints private keys, JWTs or reviewer credentials.
const log=(...args)=>{if(!process.argv.includes('--json'))console.log(...args);};
const crypto = require('crypto');
const https = require('https');

const ISSUER_ID = process.env.APP_STORE_CONNECT_ISSUER_ID;
const KEY_ID = process.env.ASC_KEY_ID;
const P8 = require('./lib/ascCredentials.cjs').readAscPrivateKey();
const VERSION_ID = process.env.ASC_VERSION_ID || '299afd61-88b3-4f82-b0dd-54847928f1e8';
const audit={appId:'6807592575',checkedAt:new Date().toISOString(),readOnly:true,version:null,linkedBuild:null,latestBuilds:[],reviewNotesCharacters:null,localizations:[],submissions:[],errors:[]};

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
  if(method!=='GET')throw Error('This status audit cannot change App Store Connect');
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = { Authorization: `Bearer ${makeJwt()}` };
    if (payload) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(payload); }
    const r = https.request({ hostname: 'api.appstoreconnect.apple.com', path, method, headers }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    r.setTimeout(30000,()=>r.destroy(Error('ASC request timed out')));
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

(async () => {
  let builds=await api('GET','/v1/builds?filter[app]=6807592575&sort=-uploadedDate&limit=5&fields[builds]=version,uploadedDate,processingState');
  if(builds.status===200)audit.latestBuilds=JSON.parse(builds.body).data.map(d=>({id:d.id,...d.attributes}));else audit.errors.push({operation:'latestBuilds',status:builds.status});
  let res = await api('GET', `/v1/appStoreVersions/${VERSION_ID}?fields[appStoreVersions]=appStoreState,versionString`);
  log('== version ==');
  log('status:', res.status);
  if (res.status === 200) {
    const d = JSON.parse(res.body).data;
    audit.version={id:d.id,...d.attributes};log('version:', d.attributes.versionString, '| state:', d.attributes.appStoreState);
  } else {
    audit.errors.push({operation:'version',status:res.status});log('HTTP',res.status);
  }

  res = await api('GET', `/v1/appStoreVersions/${VERSION_ID}/build?fields[builds]=version,uploadedDate,processingState`);
  log('\n== linked build ==');
  if (res.status === 200) {
    const d = JSON.parse(res.body).data;
    if (d) {audit.linkedBuild={id:d.id,...d.attributes};log('build', d.attributes.version, '| processing:', d.attributes.processingState);}
    else log('no build linked');
  } else {
    audit.errors.push({operation:'metadata',status:res.status});log('HTTP',res.status);
  }

  res = await api('GET', `/v1/appStoreVersions/${VERSION_ID}/appStoreReviewDetail`);
  log('\n== review detail ==');
  if (res.status === 200) {
    const d = JSON.parse(res.body).data;
    if (d) {
      log('detailId:', d.id);
      audit.reviewNotesCharacters=(d.attributes.notes||'').length;log('review notes characters:',audit.reviewNotesCharacters);
    } else log('no review detail');
  } else {
    audit.errors.push({operation:'metadata',status:res.status});log('HTTP',res.status);
  }

  res = await api('GET', `/v1/appStoreVersions/${VERSION_ID}/appStoreVersionLocalizations?limit=5&fields[appStoreVersionLocalizations]=locale,description`);
  log('\n== localizations ==');
  if (res.status === 200) {
    for (const d of JSON.parse(res.body).data) {
      audit.localizations.push({locale:d.attributes.locale,descriptionCharacters:(d.attributes.description||'').length});log(d.id, d.attributes.locale, '| desc len:', (d.attributes.description || '').length);
    }
  } else {
    audit.errors.push({operation:'metadata',status:res.status});log('HTTP',res.status);
  }
  res=await api('GET','/v1/reviewSubmissions?filter[app]=6807592575&limit=10');if(res.status===200)audit.submissions=JSON.parse(res.body).data.map(d=>({id:d.id,state:d.attributes.state,submitted:d.attributes.submitted}));else audit.errors.push({operation:'submissions',status:res.status});
  const output=process.argv.find(x=>x.startsWith('--output='));if(output)require('node:fs').writeFileSync(output.slice(9),JSON.stringify(audit,null,2)+'\n');
  if(process.argv.includes('--json'))console.log(JSON.stringify(audit));
})().catch(error=>{console.error('国学只读状态核查失败：'+(error.code||error.message));process.exitCode=1;});
