'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

test('study library only lists complete files and resolves a valid PDF', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yandao-study-files-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  process.env.STUDY_FILE_LIBRARY_DIR = root;
  const { mountStudyFileLibraryRoutes, readLibrary } = require('../studyFileLibraryRoutes');
  const pdf = Buffer.from('%PDF-1.4\nfixture\n');
  fs.mkdirSync(path.join(root, 'clinical', '2025'), { recursive: true });
  fs.writeFileSync(path.join(root, 'clinical', '2025', 'paper.pdf'), pdf);
  fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify({
    schema: 'yandao.study-files.v1',
    groups: [{ id: 'clinical-physician', title: '临床执业医师', collections: [
      { id: '2025', title: '2025 年', documents: [{ id: 'paper', title: '真题', file: 'clinical/2025/paper.pdf', size: pdf.length }] },
      { id: '2024', title: '2024 年', documents: [{ id: 'paper', title: '真题', file: 'clinical/2024/missing.pdf', size: 99 }] },
      { id: 'invalid', title: '越界', documents: [{ id: 'paper', title: '真题', file: '../private.pdf', size: pdf.length }] },
    ] }],
  }));
  assert.equal(readLibrary()[0].collections.length, 1);

  const handlers = new Map();
  const router = { get: (route, handler) => handlers.set(route, handler) };
  mountStudyFileLibraryRoutes(router);
  const response = () => ({
    headers: {}, set(key, value) { this.headers[key] = value; return this; },
    type(value) { this.mime = value; return this; },
    json(value) { this.body = value; return this; },
    sendFile(value) { this.file = value; return this; },
    sendStatus(value) { this.status = value; return this; },
  });
  const catalogRes = response();
  handlers.get('/study-files')({}, catalogRes);
  const catalog = catalogRes.body;
  assert.equal(catalog.groups[0].collections[0].documents[0].url, '/api/academy/study-files/clinical-physician/2025/paper');
  assert.equal(catalog.groups[0].collections[0].documents[0].extension, '.pdf');
  assert.equal(catalog.groups[0].collections.length, 1);
  const fileHandler = handlers.get('/study-files/:group/:collection/:document');
  const fileRes = response();
  fileHandler({ params: { group: 'clinical-physician', collection: '2025', document: 'paper' } }, fileRes);
  assert.equal(fileRes.file, path.join(root, 'clinical', '2025', 'paper.pdf'));
  assert.equal(fileRes.mime, 'application/pdf');
  const missingRes = response();
  fileHandler({ params: { group: 'clinical-physician', collection: '2024', document: 'paper' } }, missingRes);
  assert.equal(missingRes.status, 404);
});
