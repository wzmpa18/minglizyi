'use strict';
const liuren=require('./liurenStudyQuality');
const {SOURCES,PROFILES}=require('./toolStudySources');
const VERSION='chart-study-20261021-v1';
const CORE=`【所有工具共同的专业与关怀标准，优先于旧客户端文案】
回应用户真正问的问题，先用一两句平实、贴合其提问的话承接困惑，再展开分析；不要猜测用户现在很痛苦、过去受过伤或天生如何，不用“你一直很善良却没人懂”等巴纳姆式迎合。不得说只有本平台懂用户，不以制造焦虑、购买或依赖获得安慰。
缺项要温和说明具体影响，不贬低用户或资料为“空壳、无用、荒谬”，不责备用户不懂。关怀应有依据、有分寸，结尾帮助用户看清下一项可复核的内容，而不是反复背诵条款或安慰套话。
完整盘面通常1400—2200字，局部/基础工具通常600—1100字，简单追问按需简答；这是深度目标不是凑字要求。最多两句引子，主要篇幅用于这一次输入的具体事实和推演，不能反复讲历史或把定义清单当深度报告。资料缺少就说明影响范围，不能补造事实以凑篇幅。
组织为：1.回应所问与已知事实；2.至少三个适用的细节及推演链（输入字段→传统规则→条件→解释），细节必须与本次输入对应；3.综合解释、相反解释及各自成立条件，区分事实、传统象征和假设；4.用温和的语言说明限制，给两三项具体学习/复盘问题，或邀请用户补充自愿提供的非敏感情境，帮助用户保有自主判断；5.逐条给出原文、书名篇卷、适用范围和AI归纳。
对选中宫位/爻/牌/局部先答局部再联系全局，不重复一整篇泛论。没有的星、干支、爻位、时间、年龄、牌面和经历都不能编造；不要重排客户端已算的盘，不同流派分开说明。
未给原文或算法版本时，不得编造“某朝代本”“某流派口诀”“部分门派如何起算”。只能说明需补哪些资料和为什么，不能把未知规则讲成既成事实。季节旺相休囚死、十二长生和综合身强身弱是不同体系，不能混为一谈；通常春木旺火相水休金囚土死，夏火旺土相木休水囚金死，秋金旺水相土休火囚木死，冬水旺木相金休土囚火死；四季土旺等不同规则应注明适用条件，不能把“不得令”直接等同全局身弱。
基本关系必须逐项查对：木生火、火生土、土生金、金生水、水生木；木克土、土克水、水克火、火克金、金克木。谁生谁与谁被泄是不同方向：木生火，所以体为火、变用为木时是变用生体，绝不是火生木或木泄火体。不要用“耗”“泄”的词掩盖生克方向错误。
共情是尊重与解释，不是奉承或保证好结果。可以说“单个符号不足以给人下定义”“现实处境需要结合实际信息”，不可说注定发财、会离婚、前世业障、必有灾病，不能依据盘面决定医疗、投资、就业或亲密关系。古籍里的吉凶、官鬼等术语可以准确解释，但须限定为古人的分类，不延伸成人的价值、疾病或命运结论。
引经据典必须真：只允许短引当前给定且已核的原文，附对应编号和篇卷，说明这句到底支持哪条规则，解释另标AI归纳；不能列几个书名就说全篇来自经典。未核原文写“未核原文”，缺对应资料可写待核书目，不制造引文/篇名/页码。文化背景短引不得说成具体算法来源；没有古籍依据的现代规则应如实承认，不拿古书装饰权威。不要把短引重复几遍填篇幅。
纯文本编号段落，不用Markdown#、**或表格。收尾用一句自然的归纳，避免重复免责声明；注明“具体推演为AI归纳，引用以所列篇卷原文为准；仅供文化学习与复盘，不构成现实预测、医疗或投资建议”。`;

function identify(messages) {
 const users=messages.filter(m=>m&&m.role==='user'&&typeof m.content==='string').map(m=>m.content).join('\n');
 const header=users.match(/【([^】]{1,65}(?:排盘数据|排盘资料|命盘资料|课式资料))】/)?.[1];
 let label=header || users.match(/请对以下(.{1,45}?)(?:排盘数据|命盘|排盘资料)/)?.[1];
 if(!label && /^手机号码[:：]/.test(users))label='手机号码';
 if(!label && /^车牌号码[:：]/.test(users))label='车牌号码';
 const generalAI=messages.some(m=>m&&m.role==='system'&&typeof m.content==='string'&&/专业易学助手/.test(m.content));
 if(!label && generalAI)label=users;
 if(!label)return null;
 return PROFILES.find(p=>p.names.some(name=>label.includes(name))) || (generalAI?{id:'general',names:['易学问答'],refs:[],focus:'先确认问题所涉学科；不能混用不同术式规则，未提供盘面只作概念学习，不伪造具体盘。'}:null);
}
function applyStudyPolicy(messages) {
 const six=liuren.applyStudyPolicy(messages);
 if(six.applied)return {...six,kind:'liuren',messages:[{role:'system',content:six.messages[0].content+'\n'+CORE},...six.messages.slice(1)]};
 const profile=identify(messages);
 if(!profile)return {messages,applied:false};
 const refs=profile.refs.map(id=>SOURCES[id]);
 const material=refs.length?refs.map(r=>`[${r.id}] ${r.title}\n已核原文：“${r.quote}”\n适用边界：${r.scope}`).join('\n'):'本工具目前没有已核对的专属原文短引。必须明说“未核原文”，只可解释输入的计算、象征与学习条件，不能把待核书目当已引用经典。';
 return {applied:true,kind:profile.id,profile,refs,messages:[{role:'system',content:`你是${profile.names[0]}文化研习助手。\n${CORE}\n【本工具分析重点】${profile.focus}\n【可用典籍材料】\n${material}`},...messages.filter(m=>m&&['user','assistant'].includes(m.role))]};
}
const TRAD='為宮體動靜說義綬澤氣風齊歷與數會書莊鏡經統當將各應時隨觀陰陽門刪倉頡蓋類謂須詳剋夢爲璣';
const SIMP='为宫体动静说义绶泽气风齐历与数会书庄镜经统当将各应时随观阴阳门删仓颉盖类谓须详克梦为玑';
function compact(s) { return s.normalize('NFKC').replace(/[\s，。；、：:,.!?！？“”「」]/g,'').replace(/./gu,c=>{const i=TRAD.indexOf(c);return i<0?c:SIMP[i]}); }
function citedReferences(content,request) {
 return (request?.refs||[]).filter(r=>content.includes(`[${r.id}]`) || (compact(content).includes(compact(r.quote))&&compact(content).includes(compact(r.title.match(/《([^》]+)》/)?.[1]||r.title))));
}
function validateStudyReport(content,request) {
 const text=String(content||'');
 if(request?.kind==='liuren') {
  const error=liuren.validateStudyReport(text);if(error)return error;
 } else {
  if(text.length<350)return 'REPORT_TOO_SHALLOW';
  if(!/AI归纳|AI辅助/.test(text))return 'REPORT_MISSING_ATTRIBUTION';
  if(!/不足|缺|待核|未提供|不能|限制|并非|不代表/.test(text))return 'REPORT_MISSING_LIMITS';
  const ids=[...text.matchAll(/\[([A-Z]{2})\]/g)].map(m=>m[1]);
  if(ids.some(id=>!request?.refs?.some(r=>r.id===id)))return 'REPORT_UNKNOWN_SOURCE';
  if(request?.refs?.length && !citedReferences(text,request).length)return 'REPORT_MISSING_SOURCE';
  if(!request?.refs?.length && !/未核原文|暂无.{0,8}原文|没有.{0,8}已核/.test(text))return 'REPORT_UNVERIFIED_SOURCE';
  for(const quote of text.matchAll(/《([^》]+)》[^\n。]{0,12}?(?:云|曰|原文|记载|寫道|写道)[：:，,\s]*[“「]([^”」]{6,})[”」]/g)) {
    if(!request?.refs?.some(r=>compact(r.title).includes(compact(quote[1]))&&compact(r.quote).includes(compact(quote[2]))))return 'REPORT_FABRICATED_QUOTE';
  }
 }
 for(const sentence of text.split(/[。！？\n]/)) {
  if(/不能|不可|并非|不是|不代表|不应|切勿|没有依据|禁止/.test(sentence))continue;
  const generates={木:'火',火:'土',土:'金',金:'水',水:'木'},controls={木:'土',土:'水',水:'火',火:'金',金:'木'};
  for(const m of sentence.matchAll(/([木火土金水])\s*([生克剋])\s*[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]?([木火土金水])/g))if((m[2]==='生'?generates:controls)[m[1]]!==m[3])return 'REPORT_ELEMENT_ERROR';
  if(/土[^。\n]{0,8}(?:寅月|卯月|春季)[^。\n]{0,8}(?:处于|为|属)囚/.test(sentence))return 'REPORT_SEASON_SYSTEM_ERROR';
  if(/(?:注定|一定|必定|必然).{0,10}(?:发财|离婚|患病|破财|灾祸|短命|倒霉)|(?:购买|付费).{0,8}(?:化解|消灾|改运)|只有(?:我|我们|本平台).{0,5}懂你/.test(sentence))return 'REPORT_MANIPULATIVE_CLAIM';
 }
 return null;
}
function appendSourceNotes(content,request) {
 if(request?.kind==='liuren')return liuren.appendSourceNotes(content);
 const refs=citedReferences(content,request);
 return content+'\n\n来源核对（古代文本，不是现代效验证明）\n'+(refs.length?refs.map(r=>`[${r.id}] ${r.title}\n原文：${r.quote}\n${r.scope}\n${r.url}`).join('\n'):'本次未核原文；不将现代规则或待核书目冒充古籍依据。')+'\n具体推演为AI归纳，引用以所列篇卷原文为准；仅供文化学习与复盘，不构成现实预测、医疗或投资建议。';
}
module.exports={VERSION,CORE,identify,applyStudyPolicy,validateStudyReport,appendSourceNotes,citedReferences};
