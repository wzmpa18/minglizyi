#!/bin/bash
cd /www/yandaoguoxue-backend
echo "===yixue 学习章节分布==="
node -e "
const{getDb}=require('./wechatOaDb');
const rows=getDb().prepare(\"SELECT chapter,COUNT(*) n FROM study_progress WHERE track='yixue' GROUP BY chapter ORDER BY n DESC LIMIT 30\").all();
console.log(JSON.stringify(rows,null,0));
"
