'use strict';
const fs = require('node:fs');

function readAscPrivateKey() {
  const key = process.env.ASC_PRIVATE_KEY || process.env.APP_STORE_CONNECT_KEY ||
    (process.env.ASC_PRIVATE_KEY_PATH ? fs.readFileSync(process.env.ASC_PRIVATE_KEY_PATH, 'utf8') : '');
  if (!key || !process.env.ASC_KEY_ID || !process.env.APP_STORE_CONNECT_ISSUER_ID) {
    throw new Error('Set ASC_KEY_ID, APP_STORE_CONNECT_ISSUER_ID and ASC_PRIVATE_KEY_PATH (or APP_STORE_CONNECT_KEY) in protected configuration. Never embed credentials in source.');
  }
  return key;
}
module.exports = { readAscPrivateKey };
