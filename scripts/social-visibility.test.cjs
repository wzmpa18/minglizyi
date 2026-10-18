const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { getVisiblePost, listVisiblePosts, listVisiblePostComments, listVisibleFavoritePosts } = require('../backend_deploy/socialVisibilityQueries');

function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE posts(id INTEGER PRIMARY KEY, post_id TEXT, user_id TEXT, status TEXT, circle TEXT, tags TEXT);
    CREATE TABLE comments(id INTEGER PRIMARY KEY, post_id TEXT, user_id TEXT, parent_id INTEGER, deleted INTEGER);
    CREATE TABLE blacklists(user_id TEXT, blocked_id TEXT);
    CREATE TABLE favorites(user_id TEXT, post_id TEXT, created_at TEXT);
    INSERT INTO blacklists VALUES('reader','blocked'),('blocks-reader','reader');
    INSERT INTO posts VALUES
      (1,'one','visible','active','tcm','["经典"]'),
      (2,'two','visible','active','tcm','["100%"]'),
      (3,'other','visible','active','yixue','["100x"]'),
      (4,'hidden','visible','hidden','tcm','[]'),
      (5,'deleted','visible','deleted','tcm','[]'),
      (6,'blocked','blocked','active','tcm','[]'),
      (7,'reverse','blocks-reader','active','tcm','[]');`);
  return db;
}

test('post feed and direct links enforce two-way blocks, status, filters and visible cursors', () => {
  const db = fixture();
  try {
    const ids = rows => rows.map(row => row.post_id);
    assert.deepEqual(ids(listVisiblePosts(db, { viewerId: 'reader', limit: 2 })), ['other', 'two']);
    assert.deepEqual(ids(listVisiblePosts(db, { viewerId: 'reader', cursor: 2 })), ['one']);
    assert.deepEqual(ids(listVisiblePosts(db, { viewerId: 'reader', circle: 'tcm' })), ['two', 'one']);
    assert.deepEqual(ids(listVisiblePosts(db, { viewerId: 'reader', tag: '100%' })), ['two']);
    assert.deepEqual(listVisiblePosts(db, { viewerId: 'reader', tag: "' OR 1=1 --" }), []);
    for (const id of ['blocked', 'reverse', 'hidden', 'deleted', 'missing']) assert.equal(getVisiblePost(db, id, 'reader'), undefined);
    assert.equal(getVisiblePost(db, 'one', 'reader').post_id, 'one');
    assert.equal(getVisiblePost(db, 'blocked').post_id, 'blocked');
    assert.equal(listVisiblePosts(db, { viewerId: 'reader', limit: -20 }).length, 1);
    const insert = db.prepare("INSERT INTO posts VALUES (?,?,'blocked','active','tcm','[]')");
    for (let id = 8; id < 70; id++) insert.run(id, `blocked-${id}`);
    assert.deepEqual(ids(listVisiblePosts(db, { viewerId: 'reader', limit: 50 })), ['other', 'two', 'one']);
  } finally { db.close(); }
});

test('comment reads hide blocked roots and their replies before the visible limit', () => {
  const db = fixture();
  try {
    db.exec(`INSERT INTO comments VALUES
      (1,'one','blocked',0,0), (2,'one','visible',1,0),
      (3,'one','blocks-reader',0,0), (4,'one','visible',3,0),
      (5,'one','visible',0,1), (6,'one','visible',5,0),
      (7,'two','visible',0,0), (8,'blocked','visible',0,0),
      (9,'hidden','visible',0,0), (10,'deleted','visible',0,0);`);
    const insert = db.prepare("INSERT INTO comments VALUES (?,'one','blocked',0,0)");
    for (let id = 11; id <= 520; id++) insert.run(id);
    db.exec("INSERT INTO comments VALUES (521,'one','visible',0,0)");
    assert.deepEqual(listVisiblePostComments(db, 'one', 'reader').map(row => row.id), [5,6,521]);
    for (const post of ['blocked','reverse','hidden','deleted','missing']) assert.deepEqual(listVisiblePostComments(db, post, 'reader'), []);
    assert.deepEqual(listVisiblePostComments(db, 'two', 'reader').map(row => row.id), [7]);
    assert.deepEqual(listVisiblePostComments(db, "one' OR 1=1 --", 'reader'), []);
    assert.equal(listVisiblePostComments(db, 'one').length, 500);
  } finally { db.close(); }
});

test('favorite lists cannot restore blocked or moderated posts and filter before limiting', () => {
  const db = fixture();
  try {
    db.exec("INSERT INTO favorites SELECT 'reader',post_id,'2026-01-01' FROM posts; INSERT INTO favorites VALUES('other-reader','other','2026-01-03');");
    const post = db.prepare("INSERT INTO posts VALUES (?,?,'blocked','active','tcm','[]')");
    const favorite = db.prepare("INSERT INTO favorites VALUES('reader',?,'2026-01-02')");
    for (let id = 8; id < 115; id++) { post.run(id, `blocked-${id}`); favorite.run(`blocked-${id}`); }
    assert.deepEqual(listVisibleFavoritePosts(db, 'reader').map(row => row.post_id), ['other','two','one']);
    db.exec("DELETE FROM blacklists WHERE user_id='reader';");
    const visible = listVisibleFavoritePosts(db, 'reader');
    assert.equal(visible.length, 100);
    assert.ok(visible.every(row => row.user_id !== 'blocks-reader' && row.status === 'active'));
  } finally { db.close(); }
});
