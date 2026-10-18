'use strict';
// Reproducible DATA-ONLY catalogue. Default verifies; --write emits one pack.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function buildPack(version = '1.0.0') {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('version must be x.y.z');
  const data = path.join(__dirname, '..', 'src', 'data');
  const read = name => JSON.parse(fs.readFileSync(path.join(data, name), 'utf8'));
  const books = [...read('tcmOriginalEditions.json'), read('nanjingOriginal.json'), ...read('tcmClinicalOriginalEditions.json')];
  if (books.length !== 7) throw new Error('All seven complete source editions are required');
  const ids = new Set();
  for (const book of books) {
    if (ids.has(book.id) || !book.sourceRevisionUrl || !book.license || !book.verification || !book.chapters?.length) throw new Error('Missing source metadata: ' + book.id);
    ids.add(book.id);
    // Existing four editions used Python's ensure_ascii=False JSON encoding;
    // clinical editions hash the exact joined text. Preserve each source rule.
    const hashInput = book.sourceRawSha256 ? book.chapters.map(chapter => chapter.content).join('\n')
      : '[' + book.chapters.map(chapter => '{' + Object.entries(chapter).map(([key, value]) => JSON.stringify(key) + ': ' + JSON.stringify(value)).join(', ') + '}').join(', ') + ']';
    const digest = crypto.createHash('sha256').update(hashInput).digest('hex');
    if (digest !== book.contentSha256) throw new Error('Source text hash mismatch: ' + book.id);
  }
  return { schema: 'yandao.tcm.original-editions.v1', version, books };
}

if (require.main === module) {
  const version = process.argv.find(arg => arg.startsWith('--version='))?.slice(10) || '1.0.0';
  const pack = buildPack(version);
  const bytes = Buffer.from(JSON.stringify(pack));
  let output;
  if (process.argv.includes('--write')) {
    output = path.join(__dirname, 'data', 'offline_pack_sources', 'tcm-original-editions-approved.pack');
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, bytes);
  }
  console.log(JSON.stringify({ packId: 'tcm-original-editions-approved', version, books: pack.books.length, chapters: pack.books.reduce((sum, book) => sum + book.chapters.length, 0), bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), output: output || null }));
}
module.exports = { buildPack };
