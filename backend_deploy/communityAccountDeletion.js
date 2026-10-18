'use strict';
const fs=require('node:fs');
/** Attach only this product's existing social DB before starting account deletion.
 * Failure propagates; an incomplete cleanup must not be reported as success. */
function prepareCommunityDeletion(db,file){
 if(!fs.existsSync(file))return ()=>{};
 db.prepare('ATTACH DATABASE ? AS community_delete').run(file);
 const exists=name=>!!db.prepare("SELECT 1 FROM community_delete.sqlite_master WHERE type='table' AND name=?").get(name);
 const hasProfiles=exists('tongchen_profiles'),hasRequests=exists('friend_requests');
 const hasSource=hasRequests&&db.prepare('PRAGMA community_delete.table_info(friend_requests)').all().some(row=>row.name==='source');
 return userId=>{
  if(hasProfiles)db.prepare('DELETE FROM community_delete.tongchen_profiles WHERE user_id=?').run(String(userId));
  if(hasSource){
   db.prepare("UPDATE community_delete.friend_requests SET status='cancelled',from_name='' WHERE source='tongchen' AND from_id=?").run(String(userId));
   db.prepare("UPDATE community_delete.friend_requests SET status='cancelled' WHERE source='tongchen' AND to_id=? AND status='pending'").run(String(userId));
  }
 };
}
module.exports={prepareCommunityDeletion};
