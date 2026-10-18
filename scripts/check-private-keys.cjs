'use strict';
// Report paths and line numbers only. Never echo a credential or matching line.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).split('\0').filter(Boolean);
const failures = [];
const privateBlock = /-----BEGIN (?:EC |RSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----[\r\n]+[A-Za-z0-9+/=\r\n]{80,}-----END /g;
for (const file of files) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
  if (/\.(?:p8|p12|pfx)$/i.test(file)) { failures.push(`${file}: private credential file must stay outside Git`); continue; }
  const source = fs.readFileSync(file).toString('utf8');
  for (const match of source.matchAll(privateBlock)) {
    failures.push(`${file}:${source.slice(0, match.index).split('\n').length}: embedded private key`);
  }
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else console.log(`PASS: ${files.length} tracked paths checked; no embedded private key or private credential file.`);
