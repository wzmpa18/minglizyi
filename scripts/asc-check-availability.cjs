'use strict';
// Read-only App Store territorial availability inspection. Never print credentials.
const fs = require('node:fs');
const path = require('node:path');
const folder = 'E:/八字命理类文档包括排盘方式电子版/苹果开发者';
const config = fs.readFileSync(path.join(folder, 'APP Stotr CONNECT API 最新秘钥.txt'), 'utf8');
const unique = regex => [...new Set([...config.matchAll(regex)].map(match => match[1]))];
const keys = unique(/(?:KEY_ID|Key ID|KeyId|密钥ID)\s*[:=：]\s*["']?([A-Z0-9]{10})/gi);
const issuers = unique(/(?:Issuer\s*ID|ISSUER_ID)\s*[:=：]\s*["']?([a-f0-9-]{36})/gi);
if (keys.length !== 1 || issuers.length !== 1) throw Error('Protected Apple identifiers are not unique');
process.env.ASC_KEY_ID = keys[0];
process.env.APP_STORE_CONNECT_ISSUER_ID = issuers[0];
process.env.ASC_PRIVATE_KEY_PATH = path.join(folder, `AuthKey_${keys[0]}.p8`);
const {createClient} = require('./lib/guoxueAscClient.cjs');
const client = createClient();
(async () => {
  const appId = '6807592575';
  const availability = await client.api('GET', `/v1/apps/${appId}/appAvailabilityV2`);
  const id = availability.data?.id;
  if (!id) throw Error('Apple did not return a Guoxue availability resource');
  let next = `/v2/appAvailabilities/${id}/territoryAvailabilities?limit=200&include=territory`;
  const rows = [];
  while (next) {
    const page = await client.api('GET', next.replace('https://api.appstoreconnect.apple.com', ''));
    for (const item of page.data || []) {
      const territoryId = item.relationships?.territory?.data?.id;
      rows.push({territory: territoryId, available: item.attributes?.available, releaseDate: item.attributes?.releaseDate, contentStatuses: item.attributes?.contentStatuses});
    }
    next = page.links?.next || null;
  }
  console.log(JSON.stringify({checkedAt: new Date().toISOString(), appId, resourceId: id, availableInNewTerritories: availability.data?.attributes?.availableInNewTerritories, territoryCount: rows.length, cn: rows.filter(x => ['CHN', 'CN'].includes(x.territory)), jp: rows.filter(x => ['JPN', 'JP'].includes(x.territory)), us: rows.filter(x => ['USA', 'US'].includes(x.territory)), exceptions: rows.filter(x => !x.available || !x.contentStatuses?.includes('AVAILABLE'))}, null, 2));
})().catch(error => { console.error(error.message, JSON.stringify(error.details || [])); process.exitCode = 1; });
