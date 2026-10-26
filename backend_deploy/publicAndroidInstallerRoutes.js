'use strict';
const fs = require('fs'), path = require('path');
const { PIN, publicationMatches, activationMatches, validateSignedURL } = require('./publicAndroidInstallerRelease');
const CONFIG_FILE = path.join(__dirname, 'data', 'public_android_installer.json');
const RELEASE_FILE = path.join(__dirname, 'data', 'app-release-config.json');
const readJSON = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const readActivation = () => readJSON(CONFIG_FILE);
const readPublication = () => readJSON(RELEASE_FILE);

// Used only when decorating the PUBLIC API response. The persisted release
// file and company-download's exact completed-stream evidence stay unchanged.
function decoratePublicRelease(release, options = {}) {
  try {
    if (publicationMatches(release) && activationMatches((options.readActivation || readActivation)(), (options.now || Date.now)())) return { ...release, downloadUrl: PIN.publicURL };
  } catch { /* Missing/unverified configuration keeps the existing origin. */ }
  return release;
}

function createRouter(options = {}) {
  const router = require('express').Router();
  const storage = options.storage || require('./objectStorageEngine').ObjectStorageService;
  const activation = options.readActivation || readActivation, publication = options.readPublication || readPublication, now = options.now || Date.now;
  const timeout = options.timeoutMs || 2000;
  const heads = new Map();
  let failureUntil = 0;
  const bounded = fn => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('INSTALLER_STORAGE_TIMEOUT')), timeout);
    Promise.resolve().then(fn).then(value => { clearTimeout(timer); resolve(value); }, () => { clearTimeout(timer); reject(Error('INSTALLER_STORAGE_UNAVAILABLE')); });
  });
  async function verifiedHead(objectKey) {
    const current = heads.get(objectKey);
    if (current && now() < current.until) return;
    if (current?.promise) return current.promise;
    const row = { until: 0, promise: null };
    row.promise = bounded(async () => {
      const row = await storage.statObject({ partition: PIN.partition, objectKey });
      if (!row?.ok || row.size !== PIN.bytes) throw Error('INSTALLER_OBJECT_UNVERIFIED');
    }).then(() => { row.until = now() + 30000; }).finally(() => { row.promise = null; });
    heads.set(objectKey, row);
    return row.promise;
  }
  function headers(res) {
    res.set('Cache-Control', 'private, no-store');
    res.set('Pragma', 'no-cache');
    res.set('Referrer-Policy', 'no-referrer');
    res.set('X-Content-Type-Options', 'nosniff');
  }
  async function resolve(req, res) {
    headers(res);
    // No arbitrary paths/keys and no query-controlled redirects. Authentication
    // is intentionally unnecessary for this one already-public installer.
    if (Object.keys(req.query || {}).length) return res.status(400).end();
    const fallback = () => res.redirect(302, PIN.originURL);
    if (req.method === 'HEAD') return fallback(); // A signed GET is not a signed HEAD.
    try {
      const config = activation();
      if (!publicationMatches(publication()) || !activationMatches(config, now()) || now() < failureUntil) return fallback();
      await verifiedHead(config.objectKey);
      const link = await bounded(() => storage.temporaryDownloadUrl(PIN.partition, config.objectKey, 300));
      if (!link?.ok || link.provider !== 'COS') throw Error('INSTALLER_SIGNATURE_UNAVAILABLE');
      const destination = validateSignedURL(link.url, config.objectKey, now());
      // Do not log destination: it contains a temporary credential/signature.
      return res.redirect(302, destination);
    } catch {
      failureUntil = now() + 10000;
      return fallback();
    }
  }
  router.route(PIN.routePath).head(resolve).get(resolve).all((req, res) => { headers(res); res.set('Allow', 'GET, HEAD'); res.status(405).end(); });
  router.use('/android-installer', (_req, res) => { headers(res); res.status(404).end(); });
  return router;
}

module.exports = { createRouter, decoratePublicRelease, CONFIG_FILE };
