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
 assert.equal(q.validateStudyReport(body,n),null);
 assert.ok(!q.applyStudyPolicy(message('手机号码')).messages[0].content.includes('必须明说'));
 assert.ok(!q.appendSourceNotes(body,n).includes('本次未核原文'));
 assert.equal(q.validateStudyReport(body+'《三命通会》云：“使用这个号码就可以发财”。',n),'REPORT_FABRICATED_QUOTE');
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

test('verified full quotations can resolve their source without a fragile marker; simplified glyphs preserve provenance',()=>{
 const qm=q.applyStudyPolicy(message('奇门遁甲'));
 const exact=body+'《奇門遁甲統宗》卷二已核原文：“左三右七，戴九履一，二四为肩，六八为足，五居中宫”。';
 assert.equal(q.validateStudyReport(exact,qm),null);assert.ok(q.appendSourceNotes(exact,qm).includes('[QM]'));
 assert.equal(q.validateStudyReport(body+'[BZ] 戊土在寅月处于囚地。',q.applyStudyPolicy(message('八字'))),'REPORT_SEASON_SYSTEM_ERROR');
 assert.equal(q.validateStudyReport(body+'[BZ] 金克亥水。',q.applyStudyPolicy(message('八字'))),'REPORT_ELEMENT_ERROR');
});

test('refuting an incorrect relationship is not itself a model error; an affirmative error still fails',()=>{
 const r=q.applyStudyPolicy(message('八字'));
 assert.equal(q.validateStudyReport(body+'[BZ] 木克土为既定方向，非土生木。',r),null);
 assert.equal(q.validateStudyReport(body+'[BZ] 变用木生体火，非火生木。',r),null);
 assert.equal(q.validateStudyReport(body+'[BZ] 火生木。',r),'REPORT_ELEMENT_ERROR');
 assert.equal(q.validateStudyReport(body+'[FAKE]',r),'REPORT_UNKNOWN_SOURCE');
});

test('a narrowly phrased direction-comparison question is not an assertion; a wrong-premise question is rejected',()=>{
 const r=q.applyStudyPolicy(message('五行查询'));
 assert.equal(q.validateStudyReport(body+'[BZ] 复盘：木生火与火生木在方向上如何区分？',r),null);
 assert.equal(q.validateStudyReport(body+'[BZ] 火生木如何应用？',r),'REPORT_ELEMENT_ERROR');
});


test('individual future claims are blocked despite a separate reassuring negation',()=>{
 const request=q.applyStudyPolicy(message('八字'));
 for(const claim of ['你明年会离婚，应当立即分手。','你明年一定升职并财源滚滚。','你一定会破财，但不能过度担心。','你不是穷人，一定发财。'])assert.equal(q.validateStudyReport(body+'[BZ] '+claim,request),'REPORT_MANIPULATIVE_CLAIM',claim);
 for(const explanation of ['不能断言你一定发财。','你不会因为这个符号而注定发财。','古籍中的吉凶不能代表你明年一定发财。','“你一定发财”这种说法没有依据。','古代吉凶属于文本分类，不代表现实命运。'])assert.equal(q.validateStudyReport(body+'[BZ] '+explanation,request),null,explanation);
});
test('unlabelled personal fortune questions enter the same server-owned study policy',()=>{
 for(const question of ['我的八字代表我将来会富贵吗？','我的财运怎么样？','请给我算命，未来能结婚吗？']){const request=q.applyStudyPolicy([{role:'system',content:'你是传统文化研究者。'},{role:'user',content:question}]);assert.equal(request.applied,true,question);assert.ok(request.messages[0].content.includes('不构成现实预测'));}
 assert.equal(q.applyStudyPolicy([{role:'user',content:'请解释经络穴位术语，输出JSON'}]).applied,false);
});

test('general learning answers stay concise while actual chart reports keep their depth gate',()=>{
 const general=q.applyStudyPolicy([{role:'system',content:'你是专业易学助手'},{role:'user',content:'六爻中的元神是什么意思？'}]);assert.equal(general.conceptOnly,true);assert.equal(q.validateStudyReport('AI辅助释义：元神是六爻资料对生扶用神之爻的传统称谓，这里仅作术语学习。',general),null);
 const forecast=q.applyStudyPolicy([{role:'user',content:'我的八字代表我会富贵吗？'}]);assert.equal(q.validateStudyReport('AI辅助说明：八字是传统分类方法，可用于规则与文献学习，不能由此判断现实财富。',forecast),null);
 assert.equal(q.validateStudyReport('AI辅助解释：你明年会离婚。这只是传统学习。',general),'REPORT_MANIPULATIVE_CLAIM');
 assert.equal(q.validateStudyReport('AI辅助释义：仅作术语学习，不代表现实结果。',q.applyStudyPolicy(message('八字'))),'REPORT_TOO_SHALLOW');
});
