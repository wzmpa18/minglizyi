'use strict';
const crypto = require('node:crypto');
const { validateStudyText } = require('./studyCommentPolicy');

function createStudyCommentStore(db, targets, now = () => Date.now()) {
  db.exec(`CREATE TABLE IF NOT EXISTS study_comments (
    id INTEGER PRIMARY KEY, target_id TEXT NOT NULL, user_id TEXT NOT NULL, nickname TEXT NOT NULL,
    content TEXT NOT NULL, parent_id INTEGER, status TEXT NOT NULL DEFAULT 'PENDING',
    request_id TEXT NOT NULL, content_hash TEXT NOT NULL, created_ms INTEGER NOT NULL,
    reviewed_ms INTEGER, review_note TEXT DEFAULT '', pinned INTEGER DEFAULT 0, evidence_url TEXT DEFAULT '',
    UNIQUE(user_id, request_id));
    CREATE INDEX IF NOT EXISTS study_comment_target ON study_comments(target_id,status,id);
    CREATE TABLE IF NOT EXISTS study_comment_blocks (user_id TEXT, blocked_id TEXT, PRIMARY KEY(user_id,blocked_id));
    CREATE TABLE IF NOT EXISTS study_comment_reports (id INTEGER PRIMARY KEY, comment_id INTEGER, user_id TEXT,
      reason TEXT, created_ms INTEGER, status TEXT DEFAULT 'PENDING', UNIQUE(comment_id,user_id));
    CREATE TABLE IF NOT EXISTS study_comment_mutes (user_id TEXT PRIMARY KEY, until_ms INTEGER NOT NULL, reason TEXT);
    CREATE TABLE IF NOT EXISTS study_comment_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS study_comment_audit (id INTEGER PRIMARY KEY, actor TEXT, action TEXT,
      target TEXT, note TEXT, created_ms INTEGER);
    INSERT OR IGNORE INTO study_comment_settings VALUES ('enabled','false');`);
  const fail = (message, status = 400) => { const error = new Error(message); error.status = status; throw error; };
  const target = id => { if (typeof id !== 'string' || !targets.has(id)) fail('穴位不存在或编号不受支持', 404); return id; };
  const settings = () => Object.fromEntries(db.prepare('SELECT key,value FROM study_comment_settings').all().map(row => [row.key, row.value]));
  const config = id => { target(id); const s = settings(); return { enabled: s.enabled === 'true' && s[`closed:${id}`] !== 'true', maxCharacters: 500, reviewBeforePublish: true, contactUrl: 'https://yandaoguoxue.yandao.vip/profile/feedback/', schemaVersion: 1 }; };
  const user = id => { if (!id) fail('请先登录', 401); return String(id); };
  const blocked = (a,b) => !!db.prepare('SELECT 1 FROM study_comment_blocks WHERE (user_id=? AND blocked_id=?) OR (user_id=? AND blocked_id=?)').get(a,b,b,a);
  const audit = (actor,action,id,note='') => db.prepare('INSERT INTO study_comment_audit(actor,action,target,note,created_ms) VALUES (?,?,?,?,?)').run(String(actor),action,String(id),String(note).slice(0,1000),now());
  const publicRow = r => ({ id:String(r.id), targetId:r.target_id, authorId:r.user_id, authorName:r.nickname,
    content:r.content, parentId:r.parent_id ? String(r.parent_id) : null, createdAt:new Date(r.created_ms).toISOString(), pinned:!!r.pinned, evidenceUrl:r.evidence_url || '' });
  const list = (id,viewer='') => {
    target(id); if (!config(id).enabled) return [];
    return db.prepare(`SELECT c.* FROM study_comments c WHERE target_id=? AND status='APPROVED'
      AND NOT EXISTS (SELECT 1 FROM study_comment_blocks b WHERE (b.user_id=? AND b.blocked_id=c.user_id) OR (b.user_id=c.user_id AND b.blocked_id=?))
      AND (c.parent_id IS NULL OR EXISTS (SELECT 1 FROM study_comments p WHERE p.id=c.parent_id AND p.status='APPROVED'
        AND NOT EXISTS (SELECT 1 FROM study_comment_blocks b WHERE (b.user_id=? AND b.blocked_id=p.user_id) OR (b.user_id=p.user_id AND b.blocked_id=?))))
      ORDER BY pinned DESC, id DESC LIMIT 200`).all(id,String(viewer),String(viewer),String(viewer),String(viewer)).map(publicRow);
  };
  function submit(id,me,nickname,body) {
    target(id); me=user(me);
    if (!config(id).enabled) fail('学习讨论暂未开放，草稿可保留在本机',503);
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k=>!['content','parentId','requestId'].includes(k))) fail('仅接受纯文字、回复编号和请求编号');
    const validation=validateStudyText(body.content); if (!validation.ok) fail(validation.error);
    if (!/^[a-zA-Z0-9_-]{16,80}$/.test(body.requestId || '')) fail('请求编号无效');
    const parentId=body.parentId == null ? null : Number(body.parentId);
    if (parentId !== null && (!Number.isSafeInteger(parentId) || parentId<=0)) fail('回复编号无效');
    const hash=crypto.createHash('sha256').update(validation.text).digest('hex');
    db.exec('BEGIN IMMEDIATE');
    try {
      const existing=db.prepare('SELECT * FROM study_comments WHERE user_id=? AND request_id=?').get(me,body.requestId);
      if (existing) {
        if (existing.target_id!==id || existing.content_hash!==hash || existing.parent_id!==parentId) fail('请求编号已用于其他内容',409);
        db.exec('COMMIT'); return { success:true, pendingReview:existing.status==='PENDING', status:existing.status, id:String(existing.id), duplicated:true };
      }
      const stamp=now(), startDay=Math.floor((stamp+8*3600000)/86400000)*86400000-8*3600000;
      if (db.prepare('SELECT 1 FROM study_comment_mutes WHERE user_id=? AND until_ms>?').get(me,stamp)) fail('账号暂不可发表学习留言',403);
      const last=db.prepare('SELECT created_ms FROM study_comments WHERE user_id=? ORDER BY id DESC LIMIT 1').get(me);
      if (last && stamp-last.created_ms<30000) fail('请间隔30秒再发表',429);
      if (db.prepare('SELECT COUNT(*) n FROM study_comments WHERE user_id=? AND created_ms>=?').get(me,startDay).n>=20) fail('今日留言已达20条，请明天再来',429);
      if (db.prepare('SELECT COUNT(*) n FROM study_comments WHERE user_id=? AND target_id=? AND created_ms>=?').get(me,id,startDay).n>=5) fail('今日在本穴位的留言已达5条',429);
      if (db.prepare('SELECT 1 FROM study_comments WHERE user_id=? AND target_id=? AND content_hash=? AND created_ms>=?').get(me,id,hash,stamp-86400000)) fail('请勿重复发表相同内容',409);
      if (parentId!==null) {
        const parent=db.prepare("SELECT * FROM study_comments WHERE id=? AND target_id=? AND status='APPROVED'").get(parentId,id);
        if (!parent || blocked(me,parent.user_id)) fail('原留言不可回复',404);
        if (parent.parent_id !== null) fail('请回复原始留言，不支持嵌套多层回复');
      }
      const result=db.prepare("INSERT INTO study_comments(target_id,user_id,nickname,content,parent_id,status,request_id,content_hash,created_ms) VALUES (?,?,?,?,?,'PENDING',?,?,?)").run(id,me,String(nickname||'学习者').slice(0,40),validation.text,parentId,body.requestId,hash,stamp);
      audit(me,'SUBMIT',result.lastInsertRowid,'待人工审核，不自动放行');
      db.exec('COMMIT'); return { success:true,pendingReview:true,status:'PENDING',id:String(result.lastInsertRowid),message:'已提交审核，通过后公开展示' };
    } catch(error) { db.exec('ROLLBACK'); throw error; }
  }
  function remove(id,me) {
    me=user(me); const row=db.prepare('SELECT * FROM study_comments WHERE id=?').get(id);
    if (!row || row.user_id!==me) fail('只能删除自己的留言',403);
    db.exec('BEGIN IMMEDIATE');
    try { db.prepare("UPDATE study_comments SET status='REMOVED',pinned=0 WHERE id=? OR parent_id=?").run(id,id);audit(me,'REMOVE',id); db.exec('COMMIT'); }
    catch(e){db.exec('ROLLBACK');throw e;}
    return {success:true};
  }
  function report(id,me,reason) {
    me=user(me); const row=db.prepare("SELECT * FROM study_comments WHERE id=? AND status='APPROVED'").get(id);
    if (!row || blocked(me,row.user_id)) fail('留言不存在',404);
    const check=validateStudyText(reason); if(!check.ok) fail(check.error);
    db.prepare('INSERT OR IGNORE INTO study_comment_reports(comment_id,user_id,reason,created_ms) VALUES (?,?,?,?)').run(id,me,check.text,now());
    return {success:true,message:'举报已提交，平台将审核处理'};
  }
  function block(me,other,undo=false) {
    me=user(me); if(!other || other===me || String(other).length>100) fail('用户编号无效');
    if(undo) db.prepare('DELETE FROM study_comment_blocks WHERE user_id=? AND blocked_id=?').run(me,String(other));
    else db.prepare('INSERT OR IGNORE INTO study_comment_blocks VALUES (?,?)').run(me,String(other));
    return {success:true};
  }
  function review(id,actor,body) {
    if(!['APPROVED','REJECTED','REMOVED'].includes(body.status)) fail('审核状态无效');
    const note=String(body.note||'').trim();if(!note || note.length>1000) fail('请填写审核依据');
    const row=db.prepare('SELECT * FROM study_comments WHERE id=?').get(id);if(!row || row.status==='REMOVED') fail('留言已删除或不存在',404);
    if(body.pinned && (body.status!=='APPROVED' || !/^https:\/\/[^\s]+$/.test(body.evidenceUrl||''))) fail('置顶解答需附HTTPS依据链接');
    if(body.status==='APPROVED' && row.parent_id && !db.prepare("SELECT 1 FROM study_comments WHERE id=? AND status='APPROVED'").get(row.parent_id)) fail('原留言未公开，不能通过回复');
    db.exec('BEGIN IMMEDIATE');try {
      db.prepare('UPDATE study_comments SET status=?,reviewed_ms=?,review_note=?,pinned=?,evidence_url=? WHERE id=?').run(body.status,now(),note,body.pinned?1:0,body.pinned?body.evidenceUrl:'',id);
      if(body.status!=='APPROVED')db.prepare("UPDATE study_comments SET status='REMOVED',pinned=0 WHERE parent_id=?").run(id);
      audit(actor,body.status,id,note);db.exec('COMMIT');
    }catch(e){db.exec('ROLLBACK');throw e;} return {success:true};
  }
  return {config,list,submit,remove,report,block,review,
    mine:(id,me)=>{target(id);return db.prepare('SELECT id,status,created_ms FROM study_comments WHERE target_id=? AND user_id=? ORDER BY id DESC LIMIT 30').all(id,user(me));},
    blocks:me=>db.prepare('SELECT blocked_id AS userId FROM study_comment_blocks WHERE user_id=?').all(user(me)),
    queue:()=>({comments:db.prepare("SELECT * FROM study_comments WHERE status='PENDING' ORDER BY id LIMIT 200").all(),recent:db.prepare("SELECT * FROM study_comments WHERE status='APPROVED' ORDER BY id DESC LIMIT 100").all(),reports:db.prepare("SELECT r.*,c.content,c.user_id author_id FROM study_comment_reports r JOIN study_comments c ON c.id=r.comment_id WHERE r.status='PENDING' ORDER BY r.id LIMIT 200").all(), overdue:db.prepare("SELECT COUNT(*) n FROM study_comments WHERE status='PENDING' AND created_ms<?").get(now()-86400000).n,audit:db.prepare('SELECT * FROM study_comment_audit ORDER BY id DESC LIMIT 50').all(),enabled:settings().enabled==='true'}),
    setConfig:(actor,body)=>{ if(typeof body.enabled!=='boolean')fail('开放状态无效');if(body.targetId)target(body.targetId);const key=body.targetId?`closed:${body.targetId}`:'enabled';db.prepare('INSERT OR REPLACE INTO study_comment_settings VALUES (?,?)').run(key,String(body.targetId?!body.enabled:body.enabled));audit(actor,'CONFIG',key,String(body.enabled));return {success:true};},
    mute:(actor,id,hours,reason)=>{if(!id || !Number.isInteger(hours) || hours<0 || hours>8760)fail('禁言参数无效');db.prepare('INSERT OR REPLACE INTO study_comment_mutes VALUES (?,?,?)').run(String(id),now()+hours*3600000,String(reason||'').slice(0,500));audit(actor,'MUTE',id,String(hours));return {success:true};},
    resolveReport:(actor,id,note)=>{db.prepare("UPDATE study_comment_reports SET status='RESOLVED' WHERE id=?").run(id);audit(actor,'REPORT_RESOLVED',id,note);return {success:true};}
  };
}
module.exports={ createStudyCommentStore };
