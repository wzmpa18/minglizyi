const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { listActiveResourceComments } = require('../backend_deploy/resourceDiscussionQueries');

test('learning discussions isolate resources, review status and both directions of blocking', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(`CREATE TABLE resource_comments (id INTEGER PRIMARY KEY, resource_type TEXT, resource_id TEXT, status TEXT, user_id TEXT);
      CREATE TABLE blacklists (user_id TEXT, blocked_id TEXT);
      INSERT INTO resource_comments VALUES
        (1,'classic','one','active','visible'), (2,'classic','one','pending','visible'),
        (3,'classic','two','active','visible'), (4,'acupoint','one','active','visible'),
        (5,'classic','one','active','blocked'), (6,'classic','one','active','blocks-me'),
        (7,'classic','one','deleted','visible');
      INSERT INTO blacklists VALUES ('reader','blocked'), ('blocks-me','reader');`);
    assert.deepEqual(listActiveResourceComments(db, 'classic', 'one').map(row => row.id), [6,5,1]);
    assert.deepEqual(listActiveResourceComments(db, 'classic', 'one', 'reader').map(row => row.id), [1]);
    assert.deepEqual(listActiveResourceComments(db, 'classic', 'two', 'reader').map(row => row.id), [3]);
    assert.deepEqual(listActiveResourceComments(db, 'classic', "one' OR 1=1 --", 'reader'), []);
  } finally { db.close(); }
});

test('blocked authors do not consume the 200 visible comment slots', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(`CREATE TABLE resource_comments (id INTEGER PRIMARY KEY, resource_type TEXT, resource_id TEXT, status TEXT, user_id TEXT);
      CREATE TABLE blacklists (user_id TEXT, blocked_id TEXT);
      INSERT INTO blacklists VALUES ('reader','blocked');`);
    const insert = db.prepare("INSERT INTO resource_comments VALUES (?,'classic','one','active',?)");
    insert.run(1, 'visible');
    for (let id = 2; id <= 205; id++) insert.run(id, 'blocked');
    assert.deepEqual(listActiveResourceComments(db, 'classic', 'one', 'reader').map(row => row.id), [1]);
  } finally { db.close(); }
});
