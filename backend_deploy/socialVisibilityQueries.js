'use strict';

// Apply two-way blocks in SQL before pagination, including links opened directly.
const visibleAuthor = alias => `NOT EXISTS (SELECT 1 FROM blacklists b
  WHERE (b.user_id = ? AND b.blocked_id = ${alias}.user_id)
     OR (b.user_id = ${alias}.user_id AND b.blocked_id = ?))`;

function getVisiblePost(db, postId, viewerId = '') {
  const me = String(viewerId);
  return db.prepare(`SELECT p.* FROM posts p WHERE p.post_id = ? AND p.status = 'active'
    AND ${visibleAuthor('p')}`).get(String(postId), me, me);
}

function listVisiblePosts(db, { viewerId = '', tag = '', circle = '', cursor = 0, limit = 20 } = {}) {
  const me = String(viewerId);
  const lim = Math.max(1, Math.min(Number.parseInt(limit, 10) || 20, 50));
  const cur = Number.isSafeInteger(Number(cursor)) && Number(cursor) > 0 ? Number(cursor) : Number.MAX_SAFE_INTEGER;
  let query = `SELECT p.* FROM posts p WHERE p.status = 'active' AND p.id < ? AND ${visibleAuthor('p')}`;
  const args = [cur, me, me];
  if (circle) { query += ' AND p.circle = ?'; args.push(String(circle)); }
  if (tag) { query += ' AND p.tags LIKE ?'; args.push(`%"${String(tag).replace(/[\\%_]/g, '\\$&')}"%`); query += " ESCAPE '\\'"; }
  query += ' ORDER BY p.id DESC LIMIT ?'; args.push(lim);
  return db.prepare(query).all(...args);
}

function listVisiblePostComments(db, postId, viewerId = '') {
  const me = String(viewerId);
  return db.prepare(`SELECT c.* FROM comments c
    JOIN posts p ON p.post_id = c.post_id
    WHERE c.post_id = ? AND p.status = 'active'
      AND ${visibleAuthor('p')} AND ${visibleAuthor('c')}
      AND NOT EXISTS (SELECT 1 FROM comments parent
        WHERE parent.id = c.parent_id AND parent.post_id = c.post_id
          AND NOT (${visibleAuthor('parent')}))
    ORDER BY c.id ASC LIMIT 500`).all(String(postId), me, me, me, me, me, me);
}

function listVisibleFavoritePosts(db, viewerId) {
  const me = String(viewerId);
  return db.prepare(`SELECT p.* FROM favorites f JOIN posts p ON p.post_id = f.post_id
    WHERE f.user_id = ? AND p.status = 'active' AND ${visibleAuthor('p')}
    ORDER BY f.created_at DESC, p.id DESC LIMIT 100`).all(me, me, me);
}

module.exports = { getVisiblePost, listVisiblePosts, listVisiblePostComments, listVisibleFavoritePosts };
