'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const versionArg = process.argv.find((value) => value.startsWith('--version='));
const version = versionArg ? versionArg.slice(10) : '1.0.0';
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('version 必须是 x.y.z');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'src', 'data', 'guoxueClassics.json');
const outputDir = path.join(__dirname, 'data', 'offline_pack_sources');
const output = path.join(outputDir, `guoxue-classics-approved-v${version}.pack`);
const catalogue = JSON.parse(fs.readFileSync(source, 'utf8'));
if (!Array.isArray(catalogue.books) || catalogue.books.length < 1) throw new Error('国学典籍目录为空');

const ids = new Set();
for (const book of catalogue.books) {
  if (!book.id || ids.has(book.id)) throw new Error(`典籍 ID 缺失或重复: ${book.id || '(empty)'}`);
  if (!book.title || !book.category || !book.author || !book.sourceUrl || !book.license) throw new Error(`典籍元数据不完整: ${book.id}`);
  if (String(book.content || '').trim().length < 500) throw new Error(`典籍正文过短: ${book.title}`);
  if (book.completeness !== 'full' || !Number.isInteger(book.sectionCount) || book.sectionCount < 1) {
    throw new Error(`典籍未通过全文篇章核验，禁止发布: ${book.title}`);
  }
  ids.add(book.id);
}

const payload = {
  schema: 'yandao.guoxue.classics.v1',
  version,
  generatedAt: new Date().toISOString(),
  notice: catalogue.notice,
  books: catalogue.books,
};
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(output, JSON.stringify(payload), 'utf8');
const bytes = fs.statSync(output).size;
const sha256 = crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex');
console.log(JSON.stringify({ packId: 'guoxue-classics-approved', version, output, bytes, sha256, books: payload.books.length }));
