'use strict';
const crypto = require('node:crypto');
const { validateStudyText } = require('./studyCommentPolicy');
const {localFlags,capability}=require('./studyCommentSafety');

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
    CREATE TABLE IF NOT EXISTS study_comment_safety(comment_id INTEGER PRIMARY KEY,content_hash TEXT NOT NULL,decision TEXT NOT NULL,provider TEXT NOT NULL,reason TEXT NOT NULL,flags_json TEXT NOT NULL,request_id TEXT NOT NULL,checked_ms INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS study_comment_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS study_comment_audit (id INTEGER PRIMARY KEY, actor TEXT, action TEXT,
      target TEXT, note TEXT, created_ms INTEGER);
    INSERT OR IGNORE INTO study_comment_settings VALUES ('enabled','false');`);
  const fail = (message, status = 400) => { const error = new Error(message); error.status = status; throw error; };
  const target = id => { if (typeof id !== 'string' || !targets.has(id)) fail('学习讨论对象不存在或编号不受支持', 404); return id; };
  const settings = () => Object.fromEntries(db.prepare('SELECT key,value FROM study_comment_settings').all().map(row => [row.key, row.value]));
  const limits=()=>{const s=settings();return {minIntervalSeconds:Number(s.minIntervalSeconds)||30,perDay:Number(s.perDay)||20,perTargetDay:Number(s.perTargetDay)||5};};
  const config = id => { target(id); const s = settings(); return { enabled: s.enabled === 'true' && s[`closed:${id}`] !== 'true', maxCharacters: 500, reviewBeforePublish: true, contactUrl: 'https://yandaoguoxue.yandao.vip/profile/feedback/', limits:limits(),schemaVersion: 1 }; };
  const user = id => { if (!id) fail('请先登录', 401); return String(id); };
  const blocked = (a,b) => !!db.prepare('SELECT 1 FROM study_comment_blocks WHERE (user_id=? AND blocked_id=?) OR (user_id=? AND blocked_id=?)').get(a,b,b,a);
  const audit = (actor,action,id,note='') => db.prepare('INSERT INTO study_comment_audit(actor,action,target,note,created_ms) VALUES (?,?,?,?,?)').run(String(actor),action,String(id),String(note).slice(0,1000),now());
  const publicRow = r => ({ id:String(r.id), targetId:r.target_id, authorId:r.user_id, authorName:r.nickname,
    content:r.content, parentId:r.parent_id ? String(r.parent_id) : null, createdAt:new Date(r.created_ms).toISOString(), pinned:!!r.pinned, evidenceUrl:r.evidence_url || '' });
  const list = (id,viewer='',options={}) => {
    target(id); if (!config(id).enabled) return [];
    return db.prepare(`SELECT c.* FROM study_comments c WHERE target_id=? AND status='APPROVED'
      AND c.id<? AND (?!='featured' OR c.pinned=1) AND (?!='mine' OR c.user_id=?)
      AND NOT EXISTS (SELECT 1 FROM study_comment_blocks b WHERE (b.user_id=? AND b.blocked_id=c.user_id) OR (b.user_id=c.user_id AND b.blocked_id=?))
      AND (c.parent_id IS NULL OR EXISTS (SELECT 1 FROM study_comments p WHERE p.id=c.parent_id AND p.status='APPROVED'
        AND NOT EXISTS (SELECT 1 FROM study_comment_blocks b WHERE (b.user_id=? AND b.blocked_id=p.user_id) OR (b.user_id=p.user_id AND b.blocked_id=?))))
      ORDER BY id DESC LIMIT ?`).all(id,Number(options.before)||Number.MAX_SAFE_INTEGER,options.view||'recent',options.view||'recent',String(viewer),String(viewer),String(viewer),String(viewer),String(viewer),options.limit||200).map(publicRow);
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
      const rates=limits(),stamp=now(), startDay=Math.floor((stamp+8*3600000)/86400000)*86400000-8*3600000;
      if (db.prepare('SELECT 1 FROM study_comment_mutes WHERE user_id=? AND until_ms>?').get(me,stamp)) fail('账号暂不可发表学习留言',403);
      const last=db.prepare('SELECT created_ms FROM study_comments WHERE user_id=? ORDER BY id DESC LIMIT 1').get(me);
      if (last && stamp-last.created_ms<rates.minIntervalSeconds*1000) fail(`请间隔${rates.minIntervalSeconds}秒再发表`,429);
      if (db.prepare('SELECT COUNT(*) n FROM study_comments WHERE user_id=? AND created_ms>=?').get(me,startDay).n>=rates.perDay) fail(`今日留言已达${rates.perDay}条，请明天再来`,429);
      if (db.prepare('SELECT COUNT(*) n FROM study_comments WHERE user_id=? AND target_id=? AND created_ms>=?').get(me,id,startDay).n>=rates.perTargetDay) fail(`今日在本讨论区的留言已达${rates.perTargetDay}条`,429);
      if (db.prepare('SELECT 1 FROM study_comments WHERE user_id=? AND target_id=? AND content_hash=? AND created_ms>=?').get(me,id,hash,stamp-86400000)) fail('请勿重复发表相同内容',409);
      if (parentId!==null) {
        const parent=db.prepare("SELECT * FROM study_comments WHERE id=? AND target_id=? AND status='APPROVED'").get(parentId,id);
        if (!parent || blocked(me,parent.user_id)) fail('原留言不可回复',404);
        if (parent.parent_id !== null) fail('请回复原始留言，不支持嵌套多层回复');
      }
      const result=db.prepare("INSERT INTO study_comments(target_id,user_id,nickname,content,parent_id,status,request_id,content_hash,created_ms) VALUES (?,?,?,?,?,'PENDING',?,?,?)").run(id,me,String(nickname||'学习者').slice(0,40),validation.text,parentId,body.requestId,hash,stamp);
      audit(me,'SUBMIT',result.lastInsertRowid,'待人工审核，不自动放行');
      db.exec('COMMIT'); return { success:true,pendingReview:true,status:'PENDING',id:String(result.lastInsertRowid),message:'已提交，可在“我的”查看处理状态' };
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
  function safetyFor(row){
    const check=db.prepare('SELECT * FROM study_comment_safety WHERE comment_id=? AND content_hash=?').get(row.id,row.content_hash);
    return {decision:check?.decision||'NOT_CHECKED',provider:check?.provider||'local-and-manual',reason:check?.reason||'尚无云检测结果，须人工逐条复核',flags:localFlags(row.content+' '+row.nickname),requestId:check?.request_id||'',checkedAt:check?.checked_ms||null};
  }
  function recordSafety(id,result){
    const row=db.prepare('SELECT * FROM study_comments WHERE id=?').get(id);
    if(!row||row.status==='REMOVED'||row.content_hash!==result.fingerprint)return {success:false};
    if(!['PASS','REVIEW','BLOCK','UNAVAILABLE'].includes(result.decision))fail('检测状态无效');
    const previous=db.prepare('SELECT decision FROM study_comment_safety WHERE comment_id=?').get(row.id);
    if(previous?.decision==='BLOCK'&&result.decision!=='PASS'){audit('content-safety','SAFETY_RECHECK_HELD',row.id,'原拦截结论未取得新的通过检测，继续禁止公开');return {success:true};}
    db.prepare('INSERT OR REPLACE INTO study_comment_safety VALUES (?,?,?,?,?,?,?,?)').run(row.id,row.content_hash,result.decision,String(result.provider||'').slice(0,60),String(result.reason||'').slice(0,300),JSON.stringify(result.flags||[]).slice(0,2000),String(result.requestId||'').slice(0,120),now());
    if(previous?.decision==='BLOCK'&&result.decision==='PASS'&&row.status==='REJECTED'&&!row.reviewed_ms)db.prepare("UPDATE study_comments SET status='PENDING' WHERE id=?").run(row.id);
    // A late machine rejection must not leave an already public item visible.
    if(result.decision==='BLOCK')db.prepare("UPDATE study_comments SET status='REJECTED',pinned=0 WHERE (id=? OR parent_id=?) AND status!='REMOVED'").run(row.id,row.id);
    audit('content-safety','SAFETY_'+result.decision,row.id,String(result.reason||'').slice(0,300));return {success:true};
  }
  function review(id,actor,body) {
    if(!['APPROVED','REJECTED','REMOVED'].includes(body.status)) fail('审核状态无效');
    const note=String(body.note||'').trim();if(!note || note.length>1000) fail('请填写审核依据');
    const row=db.prepare('SELECT * FROM study_comments WHERE id=?').get(id);if(!row || row.status==='REMOVED') fail('留言已删除或不存在',404);
    if(body.status==='APPROVED'){
      const check=safetyFor(row);
      if(check.decision==='BLOCK')fail('内容安全建议拦截，不能直接公开；请先修订或通过申诉复核检测',409);
      if(body.safetyConfirmed!==true)fail('请先逐条核对涉政、违法、仇恨、暴恐、隐私与医疗操作风险，并确认人工合规复核',400);
      const validation=validateStudyText(row.content);if(!validation.ok)fail('原留言未通过文字安全校验，不能公开',409);
    }
    if(body.pinned && (body.status!=='APPROVED' || !/^https:\/\/[^\s]+$/.test(body.evidenceUrl||''))) fail('置顶解答需附HTTPS依据链接');
    if(body.status==='APPROVED' && row.parent_id && !db.prepare("SELECT 1 FROM study_comments WHERE id=? AND status='APPROVED'").get(row.parent_id)) fail('原留言未公开，不能通过回复');
    db.exec('BEGIN IMMEDIATE');try {
      db.prepare('UPDATE study_comments SET status=?,reviewed_ms=?,review_note=?,pinned=?,evidence_url=? WHERE id=?').run(body.status,now(),note,body.pinned?1:0,body.pinned?body.evidenceUrl:'',id);
      if(body.status!=='APPROVED')db.prepare("UPDATE study_comments SET status='REMOVED',pinned=0 WHERE parent_id=?").run(id);
      audit(actor,body.status,id,note);db.exec('COMMIT');
    }catch(e){db.exec('ROLLBACK');throw e;} return {success:true};
  }
  return {config,list,submit,remove,report,block,review,recordSafety,
    safetyInput:id=>{const r=db.prepare("SELECT id,content,content_hash FROM study_comments WHERE id=? AND status!='REMOVED'").get(id);if(!r)fail('留言不存在',404);return r;},
    mine:(id,me)=>{target(id);return db.prepare('SELECT id,status,created_ms FROM study_comments WHERE target_id=? AND user_id=? ORDER BY id DESC LIMIT 30').all(id,user(me));},
    blocks:me=>db.prepare('SELECT blocked_id AS userId FROM study_comment_blocks WHERE user_id=?').all(user(me)),
    queue:()=>({comments:db.prepare("SELECT * FROM study_comments WHERE status='PENDING' ORDER BY id LIMIT 200").all().map(row=>({...row,safety:safetyFor(row)})),safetyCapability:capability(),blocked:db.prepare("SELECT c.* FROM study_comments c JOIN study_comment_safety s ON s.comment_id=c.id WHERE c.status='REJECTED' AND s.decision='BLOCK' ORDER BY c.id DESC LIMIT 100").all().map(row=>({...row,safety:safetyFor(row)})),recent:db.prepare("SELECT * FROM study_comments WHERE status='APPROVED' ORDER BY id DESC LIMIT 100").all(),reports:db.prepare("SELECT r.*,c.content,c.user_id author_id FROM study_comment_reports r JOIN study_comments c ON c.id=r.comment_id WHERE r.status='PENDING' ORDER BY r.id LIMIT 200").all(), overdue:db.prepare("SELECT COUNT(*) n FROM study_comments WHERE status='PENDING' AND created_ms<?").get(now()-86400000).n,audit:db.prepare('SELECT * FROM study_comment_audit ORDER BY id DESC LIMIT 50').all(),enabled:settings().enabled==='true',limits:limits()}),
    setConfig:(actor,body)=>{
      if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['enabled','targetId','minIntervalSeconds','perDay','perTargetDay'].includes(k)))fail('配置字段无效');
      if(body.enabled!==undefined&&typeof body.enabled!=='boolean')fail('开放状态无效');if(body.targetId){target(body.targetId);if(typeof body.enabled!=='boolean')fail('请明确讨论区开放状态');}
      for(const key of ['minIntervalSeconds','perDay','perTargetDay'])if(body[key]!==undefined&&(!Number.isInteger(body[key])||body[key]<1||body[key]>(key==='minIntervalSeconds'?3600:100)))fail('留言频率参数超出范围');
      db.exec('BEGIN IMMEDIATE');try{
        if(body.enabled!==undefined){const key=body.targetId?`closed:${body.targetId}`:'enabled';db.prepare('INSERT OR REPLACE INTO study_comment_settings VALUES (?,?)').run(key,String(body.targetId?!body.enabled:body.enabled));}
        for(const key of ['minIntervalSeconds','perDay','perTargetDay'])if(body[key]!==undefined)db.prepare('INSERT OR REPLACE INTO study_comment_settings VALUES (?,?)').run(key,String(body[key]));
        audit(actor,'CONFIG',body.targetId||'global',JSON.stringify(body));db.exec('COMMIT');return {success:true,limits:limits()};
      }catch(error){db.exec('ROLLBACK');throw error;}
    },
    mute:(actor,id,hours,reason)=>{if(!id || !Number.isInteger(hours) || hours<0 || hours>8760)fail('禁言参数无效');db.prepare('INSERT OR REPLACE INTO study_comment_mutes VALUES (?,?,?)').run(String(id),now()+hours*3600000,String(reason||'').slice(0,500));audit(actor,'MUTE',id,String(hours));return {success:true};},
    resolveReport:(actor,id,note)=>{db.prepare("UPDATE study_comment_reports SET status='RESOLVED' WHERE id=?").run(id);audit(actor,'REPORT_RESOLVED',id,note);return {success:true};}
  };
}
module.exports={ createStudyCommentStore };
