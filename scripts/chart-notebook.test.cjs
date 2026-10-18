'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { chartNotebookKey, isChartNotebookRecord, CHART_NOTE_MAX_IMAGE_BYTES } = require('../src/lib/chartNotebook.ts');

test('different people, ambiguous legacy dates, minutes and accounts do not share a notebook', () => {
  const identities = [
    ['a', 'person-1', 2026, 1, 11, 12, 0], ['a', 'person-1', 2026, 11, 1, 12, 0],
    ['a', 'person-2', 2026, 1, 11, 12, 0], ['b', 'person-1', 2026, 1, 11, 12, 0],
    ['a', 'person-1', 2026, 1, 11, 12, 30],
  ];
  assert.equal(new Set(identities.map(chartNotebookKey)).size, identities.length);
  assert.equal(chartNotebookKey(identities[0]), chartNotebookKey([...identities[0]]));
});

test('local note records accept only bounded embedded images, never remote URLs or active SVG', () => {
  const image = { id: 'one', name: '本机备注.png', type: 'image/png', bytes: 1, dataUrl: 'data:image/png;base64,AA==' };
  const record = { schema: 1, text: '此人的反馈与资料', images: [image], updatedAt: new Date().toISOString() };
  assert.equal(isChartNotebookRecord(record), true);
  for (const patch of [
    { dataUrl: 'https://example.com/private.png' }, { type: 'image/svg+xml', dataUrl: 'data:image/svg+xml;base64,AA==' },
    { bytes: CHART_NOTE_MAX_IMAGE_BYTES + 1 }, { dataUrl: 'data:image/png;base64,' },
  ]) assert.equal(isChartNotebookRecord({ ...record, images: [{ ...image, ...patch }] }), false);
  assert.equal(isChartNotebookRecord({ ...record, images: [image, image] }), false);
  assert.equal(isChartNotebookRecord({ ...record, schema: 2 }), false);
});
