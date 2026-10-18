'use strict';
const { isNewIOSFullProfile } = require('./releaseProfilePolicy');
const SOCIAL_FEATURE_KEYS = ['friends_add_enabled', 'private_chat_enabled', 'posts_enabled', 'comments_enabled', 'groups_enabled'];
const enabledValue = value => value === true || value === 'true' || value === 1 || value === '1';
function socialFeatureEnabled(key, req, config, env = process.env) {
  if (!SOCIAL_FEATURE_KEYS.includes(key)) return false;
  if (env[key.toUpperCase()] !== undefined) return enabledValue(env[key.toUpperCase()]);
  if (!config || typeof config !== 'object' || Array.isArray(config)) return false;
  const headers = req?.headers || {};
  if (isNewIOSFullProfile(String(headers['x-client-platform'] || '').toLowerCase(), String(headers['x-store-channel'] || '').toLowerCase(), headers['x-client-version'])) {
    const profile = config.profiles?.['ios-full-learning'];
    if (profile && typeof profile === 'object' && profile[key] !== undefined) return enabledValue(profile[key]);
  }
  return enabledValue(config[key]);
}
module.exports = { SOCIAL_FEATURE_KEYS, socialFeatureEnabled };
