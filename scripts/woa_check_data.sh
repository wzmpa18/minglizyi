#!/bin/bash
# 检查真实数据分布（修正选题集群映射用）
cd /www/yandaoguoxue-backend
echo "===user_records record_type 分布（auth库）==="
node -e "
const Database=require('better-sqlite3');
const fs=require('fs');
const p='/root/backend-auth/data/yandao_users.db';
if(!fs.existsSync(p)){console.log('AUTH_DB_MISSING');process.exit(0)}
const db=new Database(p,{readonly:true});
try{console.log(JSON.stringify(db.prepare('SELECT record_type,COUNT(*) n FROM user_records GROUP BY record_type ORDER BY n DESC').all()))}catch(e){console.log('ERR:'+e.message)}
"
echo "===study_progress track 分布（academy库）==="
node -e "
const{getDb}=require('./wechatOaDb');
try{console.log(JSON.stringify(getDb().prepare('SELECT track,COUNT(*) n FROM study_progress GROUP BY track ORDER BY n DESC LIMIT 20').all()))}catch(e){console.log('ERR:'+e.message)}
"
echo "===knowledge_points track 分布==="
node -e "
const{getDb}=require('./wechatOaDb');
try{console.log(JSON.stringify(getDb().prepare(\"SELECT track,COUNT(*) n FROM knowledge_points WHERE status='approved' GROUP BY track ORDER BY n DESC LIMIT 20\").all()))}catch(e){console.log('ERR:'+e.message)}
"
echo "===user_records 表是否存在==="
node -e "
const Database=require('better-sqlite3');
const db=new Database('/root/backend-auth/data/yandao_users.db',{readonly:true});
console.log(db.prepare(\"SELECT name FROM sqlite_master WHERE type='table' AND name IN ('user_records','users')\").all().map(r=>r.name).join(', '))
"
