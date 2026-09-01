#!/bin/bash
cd /www/yandaoguoxue-backend
echo "===study_progress schema==="
node -e "
const{getDb}=require('./wechatOaDb');
console.log(getDb().prepare('PRAGMA table_info(study_progress)').all().map(c=>c.name).join(', '));
console.log(JSON.stringify(getDb().prepare('SELECT * FROM study_progress LIMIT 2').all()))
"
echo "===records/save 写入的 record_type（register_routes）==="
grep -n "record_type\|recordType" /www/yandaoguoxue-backend/register_routes.js | head -20
