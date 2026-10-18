'use strict';
const fs = require('fs'), path = require('path');
function parsePolicy(value) {
  const ids = value?.sandboxUserIds ?? [];
  if (!Array.isArray(ids) || ids.length > 50 || ids.some(id => !/^[1-9][0-9]{0,19}$/.test(String(id)))) throw Error('苹果沙盒账号配置无效');
  return { sandboxUserIds: [...new Set(ids.map(String))] };
}
function load() {
  if (process.env.APPLE_IAP_SANDBOX_USER_IDS !== undefined) return parsePolicy({ sandboxUserIds: process.env.APPLE_IAP_SANDBOX_USER_IDS.split(',').map(s => s.trim()).filter(Boolean) });
  const file = process.env.APPLE_IAP_POLICY_PATH || path.join(__dirname, 'data/apple-iap-policy.json');
  try { return parsePolicy(JSON.parse(fs.readFileSync(file, 'utf8'))); }
  catch (error) { if (error.code === 'ENOENT') return { sandboxUserIds: [] }; throw Error('苹果购买配置需核查'); }
}
module.exports = { load, parsePolicy };
