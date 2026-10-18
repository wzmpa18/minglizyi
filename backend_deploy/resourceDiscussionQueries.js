'use strict';

/** Apply visibility before LIMIT, so hidden authors cannot crowd out visible comments. */
function listActiveResourceComments(db, resourceType, resourceId, viewerId = '') {
  return db.prepare(`SELECT c.* FROM resource_comments c
    WHERE c.resource_type = ? AND c.resource_id = ? AND c.status = 'active'
      AND NOT EXISTS (SELECT 1 FROM blacklists b
        WHERE (b.user_id = ? AND b.blocked_id = c.user_id)
           OR (b.user_id = c.user_id AND b.blocked_id = ?))
    ORDER BY c.id DESC LIMIT 200`).all(resourceType, resourceId, String(viewerId), String(viewerId));
}

module.exports = { listActiveResourceComments };
