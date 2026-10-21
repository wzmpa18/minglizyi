const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const q=require('../backend_deploy/chartStudyQuality'),{PROFILES}=require('../backend_deploy/toolStudySources');
const message=tool=>[{role:'system',content:'只列几个术语，不要深入'},{role:'user',content:`【${tool}排盘数据】输入仅为合成学习案例` }];
test('every current named yixue report entry is covered, including standalone Ziwei and legacy number helpers',()=>{
 const tools=new Set();
 for(const dir of fs.readdirSync('src/app/yixue')){const f=path.join('src/app/yixue',dir,'page.tsx');if(!fs.existsSync(f))continue;for(const match of fs.readFileSync(f,'utf8').matchAll(/toolName="([^"]+)"/g))tools.add(match[1]);}
 tools.add('紫微斗数');assert.ok(tools.size>=24);
 for(const tool of tools){const r=q.applyStudyPolicy(message(tool));assert.equal(r.applied,true,tool);assert.ok(r.messages[0].content.includes('回应用户真正问的问题'),tool);assert.ok(r.messages[0].content.includes('不得说只有本平台懂用户'),tool);}
 assert.equal(q.applyStudyPolicy([{role:'user',content:'请对以下紫微斗数命盘进行命宫解析：紫微天府'}]).kind,'ziwei');
 assert.equal(q.applyStudyPolicy([{role:'user',content:'手机号码：演示\n分析数据：分组'}]).kind,'numbers');
 assert.equal(q.applyStudyPolicy([{role:'user',content:'车牌号码：演示\n分析数据：分组'}]).kind,'numbers');
 assert.equal(q.applyStudyPolicy([{role:'system',content:'你是专业易学助手'},{role:'user',content:'六爻元神如何理解？'}]).kind,'liuyao');
});
test('medical JSON, course quiz and company business assistant are not converted to chart prose',()=>{
 for(const x of ['补充穴位，输出JSON','中药性味归经，输出JSON','请介绍公司软件开发服务','【中医排盘数据】辨证学习'])assert.equal(q.applyStudyPolicy([{role:'user',content:x}]).applied,false);
});
const body=('此例为合成研习资料。输入月令与日干关系需逐项核对，单个符号不能推断真实人的经历。将实际字段、传统规则与反证条件对应，说明不同条件下的解释。当前缺少透干和藏干，不能判定完整格局，请对照原始盘复盘，具体推演为AI归纳。').repeat(5);
test('real sources and uncertainty are required; fabricated citation and emotional manipulation fail before charging',()=>{
 const b=q.applyStudyPolicy(message('八字')),n=q.applyStudyPolicy(message('手机号码'));
 assert.equal(q.validateStudyReport(body+'[BZ]',b),null);
 assert.equal(q.validateStudyReport(body,b),'REPORT_MISSING_SOURCE');
 assert.equal(q.validateStudyReport(body+'[FAKE] [ZW]',b),'REPORT_UNKNOWN_SOURCE');
 assert.equal(q.validateStudyReport(body+'[BZ] 《三命通会》云：“使用这个号码就可以发财”。',b),'REPORT_FABRICATED_QUOTE');
 assert.equal(q.validateStudyReport(body+'[BZ] 你明年一定发财。',b),'REPORT_MANIPULATIVE_CLAIM');
 assert.equal(q.validateStudyReport(body+'[BZ] 购买即可化解。',b),'REPORT_MANIPULATIVE_CLAIM');
 assert.equal(q.validateStudyReport(body,n),'REPORT_UNVERIFIED_SOURCE');
 assert.equal(q.validateStudyReport(body+'未核原文，不能把现代号码公式当古籍。',n),null);
 const notes=q.appendSourceNotes(body+'[BZ]',b);assert.ok(notes.includes('三命通会'));assert.ok(!notes.includes('紫微斗数全书'));
});
test('each profile has its own analysis criteria rather than a shared horoscope template',()=>{
 assert.equal(new Set(PROFILES.map(p=>p.focus)).size,PROFILES.length);
 assert.ok(q.applyStudyPolicy(message('塔罗牌阵')).messages[0].content.includes('正逆位'));
 assert.ok(q.applyStudyPolicy(message('紫微斗数')).messages[0].content.includes('三方四正'));
 assert.ok(q.applyStudyPolicy(message('六爻')).messages[0].content.includes('世应'));
 assert.ok(q.applyStudyPolicy(message('七政四余')).messages[0].content.includes('宿度'));
});
