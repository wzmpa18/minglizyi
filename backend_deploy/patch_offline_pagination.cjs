const fs=require('fs');
const file=process.argv[2];if(!file)throw Error('Pass academyRoutes.js path');
let source=fs.readFileSync(file,'utf8');const crlf=source.includes('\r\n');source=source.replace(/\r\n/g,'\n');
if(source.includes('offlineCursorLimit')){console.log('Pagination already applied');process.exit(0);}
function once(before,after){if(source.split(before).length!==2)throw Error('Unexpected route source; refusing patch');source=source.replace(before,after);}
const limit="Math.min(1000, Math.max(1, parseInt(limitStr, 10) || 300))";
for(const [table,order] of [['knowledge','k.id'],['questions','id']]){
 const line='      sql += ` ORDER BY '+order+' DESC LIMIT ${'+limit+'}`;';
 once(line,"      const beforeId = Number(req.query.beforeId);\n      if (Number.isSafeInteger(beforeId) && beforeId > 0) { sql += ' AND "+order+" < ?'; params.push(beforeId); }\n      const offlineCursorLimit = "+limit+";\n      sql += ` ORDER BY "+order+" DESC LIMIT ${offlineCursorLimit}`;");
}
once('      res.json({ success: true, points: rows });','      res.json({ success: true, points: rows, pagination: { nextBeforeId: rows.length === offlineCursorLimit ? Number(rows[rows.length - 1].id) : null } });');
once('      res.json({ success: true, questions: d.prepare(sql).all(...params).map(q => questionVo(q, isAdmin(req) || zhengguWithAnswer)) });','      const rows = d.prepare(sql).all(...params).map(q => questionVo(q, isAdmin(req) || zhengguWithAnswer));\n      res.json({ success: true, questions: rows, pagination: { nextBeforeId: rows.length === offlineCursorLimit ? Number(rows[rows.length - 1].id) : null } });');
fs.writeFileSync(file,crlf?source.replace(/\n/g,'\r\n'):source);console.log('Patched authorized read routes with bounded ID-cursor pagination');
