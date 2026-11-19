'use strict';

const info = require('../docs/requirements/apple-owner-release.json');
const { createClient } = require('./lib/guoxueAscClient.cjs');

const context = {
  ownerChannelSpecific: true,
  appId: info.appId,
  bundleId: info.bundleId,
  version: info.version,
  build: info.build,
  candidateSource: info.candidateSource,
  sameSourceChecksPassed: true,
  action: 'assemble'
};
const { api } = createClient({ mutations: true, reviewContext: context });
const REVIEW_ID = '87ce350f-4fe8-4529-9c38-4d771d7f3c3c';
const VERSION_ID = '47dfcf50-1542-4cbe-b85c-c4d3de25cf2e';

async function main() {
  try {
    const result = await api('POST', '/v1/reviewSubmissionItems', {
      data: {
        type: 'reviewSubmissionItems',
        relationships: {
          reviewSubmission: { data: { type: 'reviewSubmissions', id: REVIEW_ID } },
          appStoreVersion: { data: { type: 'appStoreVersions', id: VERSION_ID } }
        }
      }
    });
    console.log(JSON.stringify({ addedToReviewDraft: true, itemId: result.data?.id || null }));
  } catch (error) {
    const associatedResources = [];
    for (const detail of error.details || []) {
      for (const [resource, errors] of Object.entries(detail.associatedErrors || {})) {
        associatedResources.push({
          resource,
          errors: Array.isArray(errors) ? errors.map(row => ({ code: row.code, title: row.title })) : []
        });
      }
    }
    console.log(JSON.stringify({
      addedToReviewDraft: false,
      message: error.message,
      associatedResources
    }, null, 2));
    if (!associatedResources.length) throw error;
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
