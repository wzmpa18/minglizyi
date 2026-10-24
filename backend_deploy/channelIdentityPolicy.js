'use strict';
// Channel identity requirements are independent from UGC content moderation.
// Every account on these declared native channels uses the same policy.
function requiresDomesticPhoneVerification(req) {
  const headers = req?.headers || {};
  const platform = String(headers['x-client-platform'] || '').trim().toLowerCase();
  const channel = String(headers['x-store-channel'] || '').trim().toLowerCase();
  if (platform === 'ios') return false;
  if (platform === 'android' && channel === 'google') return false;
  return true;
}
module.exports = { requiresDomesticPhoneVerification };
