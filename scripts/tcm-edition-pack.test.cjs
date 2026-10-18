'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPack } = require('../backend_deploy/build_tcm_original_editions_pack');
const { isCompatibleTcmEditionPack, mergeTcmEditionPack } = require('../src/lib/tcmEditionPack.ts');

test('seven complete source editions validate, retain old study links and accept a corrected paragraph', () => {
  const pack = buildPack();
  assert.equal(pack.books.length, 7);
  assert.equal(pack.books.reduce((sum, book) => sum + book.chapters.length, 0), 309);
  const legacy = { ...pack.books[0], id: 'suwen-notes', sourceUrl: undefined };
  const baseline = [...pack.books, legacy];
  assert.equal(isCompatibleTcmEditionPack(pack, baseline), true);
  const updated = structuredClone(pack);
  updated.books[0].chapters[0].content += '\n校勘补充说明';
  assert.equal(isCompatibleTcmEditionPack(updated, baseline), true);
  const merged = mergeTcmEditionPack(baseline, updated);
  assert.equal(merged.length, 8);
  assert.equal(merged.at(-1), legacy);
  assert.equal(merged[0], updated.books[0]);
});

test('incomplete, duplicate, unsafe-source and unsupported content packs never replace bundled originals', () => {
  const baseline = buildPack();
  const mutations = [
    p => { p.schema = 'remote-code'; },
    p => { p.books.pop(); },
    p => { p.books[0].chapters.pop(); },
    p => { p.books[0].chapters[0].content = '节选'; },
    p => { p.books[0].sourceUrl = 'javascript:alert(1)'; },
    p => { p.books[0].sourceRevisionUrl = 'https://user:pass@example.com'; },
    p => { p.books[0].license = ''; },
    p => { p.books[0].chapters.push(p.books[0].chapters[0]); },
    p => { p.books.push(p.books[0]); },
  ];
  for (const mutate of mutations) {
    const bad = structuredClone(baseline); mutate(bad);
    assert.equal(isCompatibleTcmEditionPack(bad, baseline.books), false);
  }
});
