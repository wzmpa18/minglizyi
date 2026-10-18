'use strict';
// Compiled into the NEW client, and declared to all users/reviewers alike.
// No account, reviewer, device, remote flag or review-state exceptions.
const IOS_FULL_CHANNEL = 'ios-full-learning';
function isNewIOSFullProfile(platform, channel, version) {
  if (platform !== 'ios' || channel !== IOS_FULL_CHANNEL) return false;
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(version || ''));
  if (!match) return false;
  const [major, minor, patch] = match.slice(1).map(Number);
  return major > 25 || (major === 25 && (minor > 0 || (minor === 0 && patch >= 115)));
}
module.exports = { IOS_FULL_CHANNEL, isNewIOSFullProfile };
