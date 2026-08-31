const fs = require('fs');
const path = require('path');

const HOST = 'yandaoguoxue.yandao.vip';
const KEY = '6adb2132052f4657a159f7302971f5c2';
const urlFile = process.argv[2] || path.join(__dirname, 'indexnow_urls_niche_tools.txt');

const urls = fs.readFileSync(urlFile, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
const body = JSON.stringify({
  host: HOST,
  key: KEY,
  keyLocation: `https://${HOST}/${KEY}.txt`,
  urlList: urls,
});

(async () => {
  console.log(`--- 推送 ${urls.length} 个 URL (${HOST}) ---`);
  const res = await fetch('https://api.indexnow.org/IndexNow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body,
  });
  const text = await res.text();
  console.log(`IndexNow HTTP: ${res.status}`);
  if (text) console.log(`RESP: ${text}`);
  if (res.status === 200 || res.status === 202) {
    console.log('PUSH OK');
    process.exit(0);
  } else {
    console.log('PUSH FAIL');
    process.exit(1);
  }
})();
