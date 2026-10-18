'use strict';
const IMAGE_HOSTS = new Set(['yandaoguoxue.yandao.vip', 'www.yandao.vip', 'yandao.vip']);
function safeUrl(value, image = false) {
  if (value === '') return true;
  if (typeof value !== 'string' || value.length > 1500 || /[\x00-\x20\\]/.test(value)) return false;
  if (!image && /^\/(?:academy|zhongyi|books|yixue)(?:[/?#]|$)/.test(value)) return true;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443') return false;
    if (image) return IMAGE_HOSTS.has(url.hostname);
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url.hostname) && !/\.(?:local|internal|localhost)$/i.test(url.hostname);
  } catch { return false; }
}
function validateSponsor(entry) {
  if (typeof entry.adEnabled !== 'boolean') throw Error('广告开关必须为布尔值');
  if (typeof entry.adTitle !== 'string' || entry.adTitle.length > 80 || /[<>\x00-\x1f]/.test(entry.adTitle)) throw Error('广告标题无效');
  if (entry.adEnabled && !entry.adTitle.trim()) throw Error('开启广告前请填写广告标题');
  if (!safeUrl(entry.adImageUrl, true)) throw Error('广告图片必须来自本应用HTTPS素材域名');
  if (!safeUrl(entry.adLinkUrl)) throw Error('广告链接必须是学习页路径或有效HTTPS公开链接');
  return entry;
}
module.exports = { safeUrl, validateSponsor };
