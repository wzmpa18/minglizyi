'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.env.STUDY_FILE_LIBRARY_DIR || path.join(__dirname, 'data', 'study-files');
const TYPES = { '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
const slug = (value) => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(value);
const label = (value) => typeof value === 'string' && value.trim().length > 0 && value.length <= 100;

function readLibrary() {
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8')); }
  catch { return []; }
  if (manifest.schema !== 'yandao.study-files.v1' || !Array.isArray(manifest.groups)) return [];
  const groups = [];
  for (const group of manifest.groups) {
    if (!slug(group.id) || !label(group.title) || !Array.isArray(group.collections)) continue;
    const collections = [];
    for (const collection of group.collections) {
      if (!slug(collection.id) || !label(collection.title) || !Array.isArray(collection.documents) || !collection.documents.length) continue;
      const documents = [];
      let complete = true;
      for (const document of collection.documents) {
        if (!slug(document.id) || !label(document.title) || !Number.isSafeInteger(document.size) || document.size <= 0 || typeof document.file !== 'string') { complete = false; break; }
        const absolute = path.resolve(ROOT, document.file);
        const extension = path.extname(absolute).toLowerCase();
        if (!absolute.startsWith(path.resolve(ROOT) + path.sep) || !TYPES[extension]) { complete = false; break; }
        try { if (fs.statSync(absolute).size !== document.size) { complete = false; break; } }
        catch { complete = false; break; }
        documents.push({ id: document.id, title: document.title, size: document.size, file: absolute, type: TYPES[extension] });
      }
      if (complete) collections.push({ id: collection.id, title: collection.title, description: String(collection.description || '').slice(0, 300), documents });
    }
    if (collections.length) groups.push({ id: group.id, title: group.title, description: String(group.description || '').slice(0, 300), collections });
  }
  return groups;
}

function mountStudyFileLibraryRoutes(router) {
  router.get('/study-files', (_req, res) => {
    const groups = readLibrary().map((group) => ({ ...group, collections: group.collections.map((collection) => ({
      ...collection, documents: collection.documents.map(({ id, title, size, file }) => ({ id, title, size, extension: path.extname(file), url: `/api/academy/study-files/${group.id}/${collection.id}/${id}` })),
    })) }));
    res.set('Cache-Control', 'no-store').json({ success: true, groups });
  });
  router.get('/study-files/:group/:collection/:document', (req, res) => {
    const group = readLibrary().find((item) => item.id === req.params.group);
    const collection = group?.collections.find((item) => item.id === req.params.collection);
    const document = collection?.documents.find((item) => item.id === req.params.document);
    if (!document) return res.sendStatus(404);
    res.set('Cache-Control', 'public, max-age=86400');
    res.type(document.type);
    res.set('Content-Disposition', `inline; filename="${group.id}-${collection.id}-${document.id}${path.extname(document.file)}"`);
    res.sendFile(document.file);
  });
}

module.exports = { mountStudyFileLibraryRoutes, readLibrary };
