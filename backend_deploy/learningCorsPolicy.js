'use strict';
const APP_ORIGINS = new Set(['https://yandaoguoxue.yandao.vip', 'https://www.yandao.vip', 'https://localhost', 'capacitor://localhost']);
const CLIENT_HEADERS = ['X-Client-Platform', 'X-Store-Channel', 'X-Client-Version'];

// Only extend public version headers on an existing app-owned read rule.
// Origins, HTTP methods and unrelated rules stay byte-for-byte equivalent.
function learningCorsRules(existing) {
  if (!Array.isArray(existing)) throw Error('Missing current CORS policy');
  let matched = 0;
  const rules = existing.map(rule => {
    const origins = rule.AllowedOrigins || [];
    const methods = rule.AllowedMethods || [];
    if (!origins.includes('https://yandaoguoxue.yandao.vip') || !origins.every(o => APP_ORIGINS.has(o)) || !methods.length || !methods.every(m => ['GET','HEAD'].includes(m))) return rule;
    matched++;
    const headers = [...(rule.AllowedHeaders || [])];
    for (const header of CLIENT_HEADERS) if (!headers.some(h => h.toLowerCase() === header.toLowerCase())) headers.push(header);
    return { ...rule, AllowedHeaders: headers };
  });
  if (!matched) throw Error('Existing app-owned read CORS rule was not found; no changes made');
  return rules;
}
module.exports = { learningCorsRules };
