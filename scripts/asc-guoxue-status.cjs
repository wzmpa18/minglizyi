'use strict';

const { createClient } = require('./lib/guoxueAscClient.cjs');

const APP_ID = '6807592575';
const VERSION = '25.0.124';
const { api } = createClient({ mutations: false });

const cleanError = error => ({
  message: String(error.message || error),
  details: Array.isArray(error.details)
    ? error.details.map(row => ({ code: row.code, title: row.title, pointer: row.source?.pointer }))
    : []
});

async function request(path) {
  try {
    const response = await api('GET', path);
    return { ok: true, data: response.data, included: response.included || [] };
  } catch (error) {
    return { ok: false, error: cleanError(error) };
  }
}

async function main() {
  const app = await request('/v1/apps/' + APP_ID);
  if (!app.ok) throw Error(JSON.stringify(app.error));
  const versions = await request('/v1/apps/' + APP_ID + '/appStoreVersions?filter[platform]=IOS&limit=50');
  if (!versions.ok) throw Error(JSON.stringify(versions.error));
  const version = versions.data.find(row => row.attributes.versionString === VERSION);
  if (!version) throw Error('Target App Store version not found');
  const versionId = version.id;
  const linkedBuild = await request('/v1/appStoreVersions/' + versionId + '/relationships/build');
  const reviews = await request('/v1/reviewSubmissions?filter[app]=' + APP_ID + '&limit=50');
  const builds = await request('/v1/builds?filter[app]=' + APP_ID + '&filter[preReleaseVersion.version]=' + VERSION + '&include=preReleaseVersion&limit=50');
  const appInfos = await request('/v1/apps/' + APP_ID + '/appInfos?limit=50');
  const appInfoId = appInfos.ok ? appInfos.data[0]?.id : null;
  const probes = {};
  const paths = [
    '/v1/apps/' + APP_ID + '/appAvailabilityV2',
    '/v1/apps/' + APP_ID + '/appIcpNumberDetails',
    '/v1/apps/' + APP_ID + '/relationships/appIcpNumberDetails',
    '/v1/appIcpNumberDetails?filter[app]=' + APP_ID,
    ...(appInfoId ? [
      '/v1/appInfos/' + appInfoId + '/appIcpNumberDetails',
      '/v1/appInfos/' + appInfoId + '/relationships/appIcpNumberDetails'
    ] : [])
  ];
  for (const path of paths) probes[path] = await request(path);
  const summary = {
    app: { id: APP_ID, bundleId: app.data.attributes.bundleId, name: app.data.attributes.name },
    version: { id: versionId, versionString: VERSION, state: version.attributes.appStoreState },
    linkedBuild: linkedBuild.ok ? linkedBuild.data : linkedBuild.error,
    builds: builds.ok ? builds.data.map(row => ({
      id: row.id,
      version: row.attributes.version,
      processingState: row.attributes.processingState,
      expired: row.attributes.expired,
      uploadedDate: row.attributes.uploadedDate
    })) : builds.error,
    reviews: reviews.ok ? reviews.data.map(row => ({
      id: row.id,
      platform: row.attributes.platform,
      state: row.attributes.state,
      submittedDate: row.attributes.submittedDate
    })) : reviews.error,
    appInfos: appInfos.ok ? appInfos.data.map(row => ({ id: row.id, state: row.attributes.appStoreState })) : appInfos.error,
    probes
  };
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
