'use strict';

// A public installer is a separate, exact object. Never accept a request key,
// URL, bucket, filename or learning-pack identity as a replacement for this pin.
const PIN = Object.freeze({
  version: '25.0.118', build: 2151,
  source: 'ac13a433cfb5f5e8f2c2e3e0946f7181339fc079',
  bytes: 91492400,
  sha256: '2ce3de1ccc6d92ffb31e0fd30479142d6d86731249773c3ef96007e7d6f7fd9d',
  certificateSha256: '8ca0c414573d4b05fc2bd1ba9c6a2a8090c90c58e3815119494607443dc6d5a0',
  bucket: 'yandao-guoxue-1300262413', region: 'ap-beijing',
  partition: 'learning_content',
  originPath: '/root/yandaoguoxue/learning-downloads/2151/YandaoGuoxue_25.0.118_2151.apk',
  originURL: 'https://yandaoguoxue.yandao.vip/downloads/2151/YandaoGuoxue_25.0.118_2151.apk',
  routePath: '/android-installer/2151.apk',
  publicURL: 'https://yandaoguoxue.yandao.vip/api/public/app-version/android-installer/2151.apk',
});
const COS_HOST = PIN.bucket + '.cos.' + PIN.region + '.myqcloud.com';
const CONFIG_SCHEMA = 'yandao.public-android-installer.v1';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
function installerObjectKey(namespace) {
  if (!UUID.test(namespace || '')) throw Error('INSTALLER_NAMESPACE_INVALID');
  return 'installers/android/2151/' + namespace + '/' + PIN.sha256 + '.apk';
}
function isInstallerObjectKey(value) {
  const parts = String(value || '').split('/');
  return parts.length === 5 && UUID.test(parts[3]) && installerObjectKey(parts[3]) === value;
}
function releaseMatches(value) {
  return !!value && Object.keys(value).length === Object.keys(PIN).length && Object.entries(PIN).every(([key, entry]) => value[key] === entry);
}

function publicationMatches(release) {
  return release?.latestVersion === PIN.version && release.latestVersionCode === PIN.build && release.downloadUrl === PIN.originURL;
}

function activationMatches(value, now = Date.now()) {
  if (!value || value.schema !== CONFIG_SCHEMA || value.enabled !== true) return false;
  if (Object.keys(value).some(key => !['schema', 'enabled', 'release', 'verifiedCloud', 'objectKey'].includes(key))) return false;
  if (!releaseMatches(value.release) || !isInstallerObjectKey(value.objectKey)) return false;
  const proof = value.verifiedCloud, at = Date.parse(proof?.checkedAt || '');
  return !!proof && proof.objectKey === 'learning-content/' + value.objectKey && proof.bytes === PIN.bytes && proof.sha256 === PIN.sha256 &&
    proof.certificateSha256 === PIN.certificateSha256 && proof.fullReadback === true && proof.anonymousStatus === 403 &&
    Number.isFinite(at) && at <= now + 30000;
}

function validateSignedURL(value, objectKey, now = Date.now()) {
  if (!isInstallerObjectKey(objectKey)) throw Error('INSTALLER_KEY_INVALID');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== COS_HOST || url.port || url.username || url.password || url.hash || url.pathname !== '/learning-content/' + objectKey) throw Error('INSTALLER_SIGNED_IDENTITY_MISMATCH');
  const times = url.searchParams.get('q-sign-time')?.split(';').map(Number);
  const epoch = Math.floor(now / 1000);
  if (!times || times.length !== 2 || times.some(n => !Number.isSafeInteger(n)) || times[0] > epoch + 30 || times[1] <= epoch || times[1] - epoch > 330 || times[1] - times[0] > 300) throw Error('INSTALLER_SIGNED_EXPIRY_INVALID');
  const allowed = new Set(['q-sign-algorithm', 'q-ak', 'q-sign-time', 'q-key-time', 'q-header-list', 'q-url-param-list', 'q-signature', 'x-cos-security-token']);
  if ([...url.searchParams.keys()].some(key => !allowed.has(key)) || [...allowed].some(key => url.searchParams.getAll(key).length > 1) || url.searchParams.get('q-sign-algorithm') !== 'sha1' || !/^[a-f0-9]{40}$/i.test(url.searchParams.get('q-signature') || '') || !url.searchParams.get('q-ak') || url.searchParams.get('q-url-param-list') !== '' || url.searchParams.get('q-header-list') !== 'host') throw Error('INSTALLER_SIGNED_QUERY_INVALID');
  return url.href;
}

module.exports = { PIN, COS_HOST, CONFIG_SCHEMA, publicationMatches, activationMatches, validateSignedURL, installerObjectKey, isInstallerObjectKey, releaseMatches };
