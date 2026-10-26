'use strict';
// Maintenance staging only. Does not enable the route, change publication,
// nginx/ACL/CAM/database/company attribution or retry an uncertain PUT.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { promisify } = require('node:util'), exec = promisify(require('node:child_process').execFile);
const APP = '/www/yandaoguoxue-backend', STATE_ROOT = '/root/yandaoguoxue-backups/public-installer-2151';
const sourceModule = path.join(__dirname, '../backend_deploy/publicAndroidInstallerRelease.js');
const { PIN, CONFIG_SCHEMA, COS_HOST, installerObjectKey, releaseMatches, publicationMatches, validateSignedURL, activationMatches } = require(fs.existsSync(sourceModule) ? sourceModule : APP + '/publicAndroidInstallerRelease');
const digestFile = async file => { const h = crypto.createHash('sha256'); for await (const data of fs.createReadStream(file)) h.update(data); return h.digest('hex'); };
function persist(file, value, fresh = false) {
  const temporary = fresh ? file : file + '.writing-' + crypto.randomUUID();
  const fd = fs.openSync(temporary, 'wx', 0o600);
  try { fs.writeFileSync(fd, JSON.stringify(value, null, 2) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  if (!fresh) fs.renameSync(temporary, file);
  const dir = fs.openSync(path.dirname(file), 'r'); try { fs.fsyncSync(dir); } finally { fs.closeSync(dir); }
}
async function verifyLocal() {
  if (fs.realpathSync(PIN.originPath) !== PIN.originPath || fs.statSync(PIN.originPath).size !== PIN.bytes || await digestFile(PIN.originPath) !== PIN.sha256) throw Error('INSTALLER_LOCAL_SHA_OR_PATH_MISMATCH');
  const { stdout } = await exec('/usr/bin/unzip', ['-p', PIN.originPath, 'assets/public/app-native.json'], { maxBuffer: 100000 });
  const marker = JSON.parse(stdout);
  if (marker.versionName !== PIN.version || marker.versionCode !== PIN.build || marker.sourceCommit !== PIN.source || marker.isNativeApp !== true || !['default', 'internal'].includes(marker.storeChannel)) throw Error('INSTALLER_NATIVE_MARKER_MISMATCH');
  const signer = await exec('/opt/android-sdk/build-tools/36.0.0/apksigner', ['verify', '--verbose', '--print-certs', PIN.originPath], { maxBuffer: 200000 });
  const certs = [...signer.stdout.matchAll(/certificate SHA-256 digest: ([a-f0-9]{64})/g)].map(match => match[1]);
  if (certs.length !== 1 || certs[0] !== PIN.certificateSha256 || !/v2\): true/.test(signer.stdout)) throw Error('INSTALLER_SIGNING_CERTIFICATE_MISMATCH');
  return { bytes: PIN.bytes, sha256: PIN.sha256, certificateSha256: certs[0], source: PIN.source, markerVerified: true };
}
async function verifyDownloadResponse(response, identity) {
  if (response.status !== 200 || Number(response.headers.get('content-length')) !== identity.bytes) { await response.body?.cancel(); throw Error('INSTALLER_CLOUD_RESPONSE_INVALID'); }
  const hash = crypto.createHash('sha256'); let bytes = 0;
  for await (const chunk of response.body) { bytes += chunk.length; if (bytes > identity.bytes) throw Error('INSTALLER_CLOUD_OVERSIZED'); hash.update(chunk); }
  if (bytes !== identity.bytes || hash.digest('hex') !== identity.sha256) throw Error('INSTALLER_CLOUD_FULL_SHA_MISMATCH');
  return bytes;
}
async function claimSinglePut(state, storage, save) {
  if (state.putMayHaveStarted) return false;
  state.putMayHaveStarted = true; state.claimedAt = new Date().toISOString(); save(state);
  const result = await storage.stagePinnedPrivateInstaller({ filePath: PIN.originPath, objectKey: state.objectKey });
  state.uploadResult = { ok: result.ok === true, putAttempted: result.putAttempted === true, error: result.error || null }; save(state);
  return true;
}
async function verifyCloud(storage, objectKey, fetchImpl = fetch) {
  const head = await storage.statObject({ partition: PIN.partition, objectKey });
  if (!head?.ok || head.size !== PIN.bytes) throw Error('INSTALLER_CLOUD_HEAD_NOT_VERIFIED');
  const signed = await storage.temporaryDownloadUrl(PIN.partition, objectKey, 300);
  if (!signed?.ok || signed.provider !== 'COS') throw Error('INSTALLER_CLOUD_SIGNING_FAILED');
  const url = validateSignedURL(signed.url, objectKey);
  const response = await fetchImpl(url, { redirect: 'error', signal: AbortSignal.timeout(180000) });
  const bytes = await verifyDownloadResponse(response, PIN);
  const unsigned = new URL(url); unsigned.search = '';
  const anonymous = await fetchImpl(unsigned, { method: 'HEAD', redirect: 'error', signal: AbortSignal.timeout(10000) });
  if (anonymous.status !== 403) throw Error('INSTALLER_RAW_OBJECT_NOT_PRIVATE');
  return { checkedAt: new Date().toISOString(), objectKey: 'learning-content/' + objectKey, bytes, sha256: PIN.sha256, certificateSha256: PIN.certificateSha256, fullReadback: true, anonymousStatus: anonymous.status, versioningStatus: 'UNKNOWN_NOT_CHANGED', originHost: COS_HOST };
}
async function main() {
  const args = process.argv.slice(2), upload = args.includes('--upload'), stateArg = args.find(value => value.startsWith('--state='));
  if (args.some(value => value !== '--upload' && !value.startsWith('--state=')) || args.filter(value => value === '--upload').length > 1 || args.filter(value => value.startsWith('--state=')).length > 1) throw Error('INSTALLER_ARGUMENT_INVALID');
  require(APP + '/node_modules/dotenv').config({ path: APP + '/.env', quiet: true });
  const storage = require(APP + '/objectStorageEngine').ObjectStorageService;
  const local = await verifyLocal(), publication = JSON.parse(fs.readFileSync(APP + '/data/app-release-config.json', 'utf8'));
  if (!publicationMatches(publication)) throw Error('INSTALLER_PUBLICATION_CHANGED');
  if (!upload) { console.log(JSON.stringify({ state: 'INSPECTED_NOT_UPLOADED', local, writes: 0, sourceClaim: false })); return; }
  if (!stateArg) throw Error('INSTALLER_EXPLICIT_STATE_PATH_REQUIRED');
  const file = path.resolve(stateArg.slice(8));
  if (path.dirname(file) !== STATE_ROOT || !/^[A-Za-z0-9_.-]+\.json$/.test(path.basename(file))) throw Error('INSTALLER_STATE_PATH_INVALID');
  fs.mkdirSync(STATE_ROOT, { recursive: true, mode: 0o700 });
  if (fs.realpathSync(STATE_ROOT) !== STATE_ROOT || (fs.existsSync(file) && fs.realpathSync(file) !== file)) throw Error('INSTALLER_STATE_LINK_FORBIDDEN');
  const lock = file + '.lock', lockFd = fs.openSync(lock, 'wx', 0o600);
  try {
    let state;
    if (fs.existsSync(file)) state = JSON.parse(fs.readFileSync(file, 'utf8'));
    else { const namespace = crypto.randomUUID(); state = { schema: 'yandao.installer-stage.v1', namespace, objectKey: installerObjectKey(namespace), release: PIN, allocatedAt: new Date().toISOString(), putMayHaveStarted: false }; persist(file, state, true); }
    if (state.schema !== 'yandao.installer-stage.v1' || !releaseMatches(state.release) || installerObjectKey(state.namespace) !== state.objectKey) throw Error('INSTALLER_STAGE_STATE_CHANGED');
    // Mark and fsync before calling the single-PUT adapter. A crash or ambiguous
    // network outcome can only be followed by readback, never another PUT.
    await claimSinglePut(state, storage, value => persist(file, value));
    let proof;
    try { proof = await verifyCloud(storage, state.objectKey); }
    catch (error) { state.state = 'NOT_ACTIVATED_UPLOAD_RESULT_REQUIRES_READBACK'; state.verificationFailure = /^INSTALLER_[A-Z0-9_]+$/.test(error.message) ? error.message : 'INSTALLER_READBACK_UNAVAILABLE'; persist(file, state); throw Error('INSTALLER_STAGE_READBACK_NOT_COMPLETE_NO_RETRY'); }
    const candidate = { schema: CONFIG_SCHEMA, enabled: true, release: PIN, objectKey: state.objectKey, verifiedCloud: proof };
    const candidateFile = file.replace(/\.json$/, '.verified-config.json');
    if (fs.existsSync(candidateFile)) {
      const existing = JSON.parse(fs.readFileSync(candidateFile, 'utf8'));
      if (existing.objectKey !== candidate.objectKey || !activationMatches(existing)) throw Error('INSTALLER_CANDIDATE_ALREADY_DIFFERENT');
      // Keep the first verified candidate as immutable audit evidence.
    } else persist(candidateFile, candidate, true);
    state.state = 'PRIVATE_STAGED_AND_FULLY_VERIFIED_NOT_ACTIVATED'; state.verification = proof; persist(file, state);
    console.log(JSON.stringify({ state: state.state, candidateFile, objectKey: state.objectKey, local, signedQueriesPrinted: false, versioningStatus: 'UNKNOWN_NOT_CHANGED', liveConfigurationChanged: false, companyEvidenceChanged: false }));
  } finally { fs.closeSync(lockFd); fs.unlinkSync(lock); }
}
if (require.main === module) main().catch(() => { console.error('INSTALLER_STAGING_FAILED_NO_ACTIVATION_NO_AUTOMATIC_PUT_RETRY'); process.exitCode = 1; });
module.exports = { verifyLocal, verifyCloud, verifyDownloadResponse, claimSinglePut, persist };
