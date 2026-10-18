'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { SOCIAL_FEATURE_KEYS, socialFeatureEnabled } = require('../backend_deploy/socialFeaturePolicy');
test('new iOS functionality is a declared versioned profile for every account; existing channels retain their settings', () => {
  const config = { posts_enabled: false, profiles: { 'ios-full-learning': { posts_enabled: true } } };
  const req = { headers: { 'x-client-platform': 'ios', 'x-store-channel': 'ios-full-learning', 'x-client-version': '25.0.115' } };
  assert.equal(socialFeatureEnabled('posts_enabled', req, config, {}), true);
  for (const change of [{ 'x-client-version': '25.0.114' }, { 'x-store-channel': 'default' }, { 'x-client-platform': 'android' }]) assert.equal(socialFeatureEnabled('posts_enabled', { headers: { ...req.headers, ...change } }, config, {}), false);
  assert.equal(socialFeatureEnabled('posts_enabled', req, config, { POSTS_ENABLED: 'false' }), false);
});
test('missing, malformed and unspecified configuration fail closed rather than enabling social publishing', () => {
  for (const config of [null, undefined, [], {}, { profiles: null }, { posts_enabled: 'FALSE' }]) for (const key of SOCIAL_FEATURE_KEYS) assert.equal(socialFeatureEnabled(key, {}, config, {}), false);
  assert.equal(socialFeatureEnabled('unknown', {}, { unknown: true }, {}), false);
});
