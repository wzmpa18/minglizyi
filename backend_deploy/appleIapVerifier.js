'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const catalog = require('./appleIapCatalog.json');
let verifiers;
function initialize() {
  if (verifiers) return verifiers;
  // This dependency is installed independently, never by pruning the live backend.
  const { SignedDataVerifier, Environment } = require('./apple-iap-runtime/node_modules/@apple/app-store-server-library');
  const rootDir = path.join(__dirname, 'apple-root-certificates');
  const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'manifest.json'), 'utf8'));
  const roots = manifest.certificates.map(cert => {
    const bytes = fs.readFileSync(path.join(rootDir, cert.file));
    if (crypto.createHash('sha256').update(bytes).digest('hex') !== cert.sha256) throw Error('Apple root certificate integrity failure');
    return bytes;
  });
  // Online certificate revocation checks are mandatory. Xcode/LocalTesting are
  // deliberately never constructed: those modes skip cryptographic verification.
  verifiers = [
    new SignedDataVerifier(roots, true, Environment.PRODUCTION, catalog.bundleId, Number(catalog.appId)),
    new SignedDataVerifier(roots, true, Environment.SANDBOX, catalog.bundleId),
  ];
  return verifiers;
}
async function verify(value, method) {
  if (typeof value !== 'string' || value.length < 100 || value.length > 40000) throw Error('无效的苹果签名数据');
  let last;
  for (const verifier of initialize()) {
    try { return await verifier[method](value); } catch (error) { last = error; }
  }
  // Do not log raw signed transactions, account tokens or library certificate errors.
  const error = Error('苹果购买验证未通过，请稍后重试'); error.cause = last; throw error;
}
module.exports = {
  transaction: value => verify(value, 'verifyAndDecodeTransaction'),
  notification: value => verify(value, 'verifyAndDecodeNotification'),
  ready: () => { initialize(); return true; },
};
