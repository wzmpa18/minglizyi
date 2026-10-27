'use strict';
const liuren=require('./liurenStudyQuality');
const {SOURCES,PROFILES}=require('./toolStudySources');
const VERSION='chart-study-20261027-v3';
const CORE=`【所有工具共同的专业与关怀标准，优先于旧客户端文案】
回应用户真正问的问题，先用一两句平实、贴合其提问的话承接困惑，再展开分析；不要猜测用户现在很痛苦、过去受过伤或天生如何，不用“你一直很善良却没人懂”等巴纳姆式迎合。不得说只有本平台懂用户，不以制造焦虑、购买或依赖获得安慰。
不要把“未核原文、没有资料、无法解读”等内部核验状态当开场或反复展示，也不能整篇以缺项和免责替代服务。先充分解释已有盘面与用户所问；只在影响结论的位置简短交代必要条件，并说明当前仍能理解的内容。缺项要温和说明具体影响，不贬低用户或资料为“空壳、无用、荒谬”，不责备用户不懂。关怀应有依据、有分寸，结尾帮助用户看清下一项可复核的内容，而不是反复背诵条款或安慰套话。
完整盘面通常1400—2200字，局部/基础工具通常600—1100字，简单追问按需简答；这是深度目标不是凑字要求。最多两句引子，主要篇幅用于这一次输入的具体事实和推演，不能反复讲历史或把定义清单当深度报告。资料缺少就说明影响范围，不能补造事实以凑篇幅。
组织为：1.回应所问与已知事实；2.至少三个适用的细节及推演链（输入字段→传统规则→条件→解释），细节必须与本次输入对应；3.综合解释、相反解释及各自成立条件，区分事实、传统象征和假设；4.用温和的语言说明限制，给两三项具体学习/复盘问题，或邀请用户补充自愿提供的非敏感情境，帮助用户保有自主判断；5.逐条给出原文、书名篇卷、适用范围和AI归纳。
对选中宫位/爻/牌/局部先答局部再联系全局，不重复一整篇泛论。没有的星、干支、爻位、时间、年龄、牌面和经历都不能编造；不要重排客户端已算的盘，不同流派分开说明。
未给原文或算法版本时，不得编造“某朝代本”“某流派口诀”“部分门派如何起算”。只能说明需补哪些资料和为什么，不能把未知规则讲成既成事实。季节旺相休囚死、十二长生和综合身强身弱是不同体系，不能混为一谈；通常春木旺火相水休金囚土死，夏火旺土相木休水囚金死，秋金旺水相土休火囚木死，冬水旺木相金休土囚火死；四季土旺等不同规则应注明适用条件，不能把“不得令”直接等同全局身弱。
基本关系必须逐项查对：木生火、火生土、土生金、金生水、水生木；木克土、土克水、水克火、火克金、金克木。谁生谁与谁被泄是不同方向：木生火，所以体为火、变用为木时是变用生体，绝不是火生木或木泄火体。不要用“耗”“泄”的词掩盖生克方向错误。
共情是尊重与解释，不是奉承或保证好结果。可以说“单个符号不足以给人下定义”“现实处境需要结合实际信息”，不可说注定发财、会离婚、前世业障、必有灾病，不能依据盘面决定医疗、投资、就业或亲密关系。古籍里的吉凶、官鬼等术语可以准确解释，但须限定为古人的分类，不延伸成人的价值、疾病或命运结论。
引经据典必须真：只允许短引当前给定且已核的原文，附对应编号和篇卷，说明这句到底支持哪条规则，解释另标AI归纳；不能列几个书名就说全篇来自经典。无可核专属引文时不强制输出“未核原文”等内部状态，只解释有依据的输入和方法，来源栏用自然准确的“本段为AI辅助方法解析”标注，不能声称来自古籍；缺对应资料不堆待核书目，不制造引文/篇名/页码。文化背景短引不得说成具体算法来源；没有古籍依据的现代规则应如实承认，不拿古书装饰权威。不要把短引重复几遍填篇幅。
纯文本编号段落，不用Markdown#、**或表格。收尾用一句自然的归纳，避免重复免责声明；注明“具体推演为AI归纳，引用以所列篇卷原文为准；仅供文化学习与复盘，不构成现实预测、医疗或投资建议”。`;

function identify(messages) {
 const users=messages.filter(m=>m&&m.role==='user'&&typeof m.content==='string').map(m=>m.content).join('\n');
 const header=users.match(/【([^】]{1,65}(?:排盘数据|排盘资料|命盘资料|课式资料))】/)?.[1];
 let label=header || users.match(/请对以下(.{1,45}?)(?:排盘数据|命盘|排盘资料)/)?.[1];
 if(!label && /^手机号码[:：]/.test(users))label='手机号码';
 if(!label && /^车牌号码[:：]/.test(users))label='车牌号码';
 const generalAI=messages.some(m=>m&&m.role==='system'&&typeof m.content==='string'&&/专业易学助手/.test(m.content));
 const forecastQuestion=/算命|改运|财运|运势|姻缘|命运|富贵|命好|命坏/.test(users)||/八字|四柱|命理|生辰|命盘|紫微|卦象/.test(users)&&/未来|婚姻|发财|健康|吉凶/.test(users);
 if(!label&&forecastQuestion)label=users;
 if(!label && generalAI)label=users;
 if(!label)return null;
 const profile=PROFILES.find(p=>p.names.some(name=>label.includes(name))) || (generalAI||forecastQuestion?{id:'general',names:['易学问答'],refs:[],focus:'先确认问题所涉学科；不能混用不同术式规则，未提供盘面只作概念学习，不伪造具体盘。'}:null);
 const structured=!!header||/请对以下.{1,45}(?:排盘数据|命盘|排盘资料)/.test(users)||/^(?:手机号码|车牌号码)[:：]/.test(users);
 return profile?{...profile,conceptOnly:!structured}:null;
}
function applyStudyPolicy(messages) {
 const six=liuren.applyStudyPolicy(messages);
 if(six.applied)return {...six,kind:'liuren',messages:[{role:'system',content:six.messages[0].content+'\n'+CORE},...six.messages.slice(1)]};
 const profile=identify(messages);
 if(!profile)return {messages,applied:false};
 const refs=profile.refs.map(id=>SOURCES[id]);
 const material=refs.length?refs.map(r=>`[${r.id}] ${r.title}\n已核原文：“${r.quote}”\n适用边界：${r.scope}`).join('\n'):'本段按输入信息提供AI辅助方法解析，重点讲清具体结构、条件、对照与复盘，不强制展示内部核验状态。没有提供可用专属原文时，不虚构古籍引文或声称该现代方法来自经典。';
 return {applied:true,kind:profile.id,profile,refs,conceptOnly:profile.conceptOnly,messages:[{role:'system',content:`你是${profile.names[0]}文化研习助手。\n${CORE}\n${profile.conceptOnly?'【本次为概念问答】没有结构化盘面，简洁回答术语、来源或追问即可，不套用深度报告篇幅和结构，不为凑字补造盘面或个人经历。明确AI辅助和学习范围即可；只有实际引用才核对原文。':''}\n【本工具分析重点】${profile.focus}\n【可用典籍材料】\n${material}`},...messages.filter(m=>m&&['user','assistant'].includes(m.role))]};
}
const TRAD='為宮體動靜說義綬澤氣風齊歷與數會書莊鏡經統當將各應時隨觀陰陽門刪倉頡蓋類謂須詳剋夢爲璣';
const SIMP='为宫体动静说义绶泽气风齐历与数会书庄镜经统当将各应时随观阴阳门删仓颉盖类谓须详克梦为玑';
function compact(s) { return s.normalize('NFKC').replace(/[\s，。；、：:,.!?！？“”「」]/g,'').replace(/./gu,c=>{const i=TRAD.indexOf(c);return i<0?c:SIMP[i]}); }
function citedReferences(content,request) {
 return (request?.refs||[]).filter(r=>content.includes(`[${r.id}]`) || (compact(content).includes(compact(r.quote))&&compact(content).includes(compact(r.title.match(/《([^》]+)》/)?.[1]||r.title))));
}
function hasPersonalPrediction(sentence) {
 const outcomes='(?:发财|富贵|富裕|财源|暴富|破财|离婚|结婚|分手|升职|升官|晋升|失业|患病|生病|死亡|短命|灾祸|倒霉|克夫|克妻|克子|财运.{0,6}(?:好转|上升|下降|旺)|运势.{0,6}(?:好转|转好|变差))';
 const patterns=[new RegExp('(?:你|您|命主|求测者|当事人)[^。！？\\n，,；;]{0,28}(?:明年|来年|后年|今年|将来|未来|下个?月|一定|必定|必然|注定|肯定|必会|必将|将会|会|将)[^。！？\\n，,；;]{0,14}'+outcomes,'g'),new RegExp('(?:注定|一定|必定|必然|肯定|必会|必将)[^。！？\\n，,；;]{0,10}'+outcomes,'g'),/(?:你|您|命主)(?:应该|应当|必须|务必|需要|适合|不适合)[^。！？\n，,；;]{0,10}(?:立即分手|离婚|结婚|投资|买入|卖出|辞职|跳槽|转行)/g];
 const negatedRanges=[];
 for(const pattern of patterns)for(const match of sentence.matchAll(pattern)){
  if(negatedRanges.some(range=>match.index>=range[0]&&match.index+match[0].length<=range[1]))continue;
  const before=sentence.slice(Math.max(0,match.index-24),match.index),inside=match[0],after=sentence.slice(match.index+inside.length).split(/[，,；;]/)[0];
  // Negation must govern this claim. A reassuring clause after a comma does
  // not excuse a separate affirmative prediction earlier in the sentence.
  if(/(?:不能|不可|不得|不应|禁止)[^，,；;]{0,12}(?:说|断言|认为|推断|预测|承诺|认定|断定|保证|推出|肯定|代表)[^，,；;]{0,12}$/.test(before)||/(?:不是|并非|不代表|没有依据)[^，,；;]{0,12}$/.test(before)||/不会|不一定|未必|并非|不是|不代表|没有依据|(?:不能|不可).{0,12}(?:推断|断言|认定|预测|承诺|保证|推出|肯定)/.test(inside)){negatedRanges.push([match.index,match.index+inside.length]);continue;}
  if(/^[”」’"\s]*(?:这(?:种|类)?(?:说法|讲法|断言|判断)?|此(?:说|论|判断)?|的说法)?(?:没有依据|不成立|不可靠|并非|不是|不能|不代表)/.test(after))continue;
  return true;
 }return false;
}
function validateStudyReport(content,request) {
 const text=String(content||'');
 if(request?.kind==='liuren'&&!request?.conceptOnly) {
  const error=liuren.validateStudyReport(text,{skipPredictionGuard:true});if(error)return error;
 } else {
  if(text.length<(request?.conceptOnly?20:350))return 'REPORT_TOO_SHALLOW';
  if(!/AI归纳|AI辅助/.test(text))return 'REPORT_MISSING_ATTRIBUTION';
  if(request?.conceptOnly?!/学习|术语|文献|古籍|文化|传统/.test(text):!/不足|缺|待核|未提供|不能|限制|并非|不代表/.test(text))return 'REPORT_MISSING_LIMITS';
  const ids=[...text.matchAll(/\[([A-Z][A-Z0-9]{1,9})\]/g)].map(m=>m[1]).filter(id=>id!=='AI');
  if(ids.some(id=>!request?.refs?.some(r=>r.id===id)))return 'REPORT_UNKNOWN_SOURCE';
  if(!request?.conceptOnly&&request?.refs?.length && !citedReferences(text,request).length)return 'REPORT_MISSING_SOURCE';
  for(const quote of text.matchAll(/《([^》]+)》[^\n。]{0,12}?(?:云|曰|原文|记载|寫道|写道)[：:，,\s]*[“「]([^”」]{6,})[”」]/g)) {
    if(!request?.refs?.some(r=>compact(r.title).includes(compact(quote[1]))&&compact(r.quote).includes(compact(quote[2]))))return 'REPORT_FABRICATED_QUOTE';
  }
 }
 for(const sentence of text.split(/[。！？\n]/)) {
  if(hasPersonalPrediction(sentence))return 'REPORT_MANIPULATIVE_CLAIM';
  if(/不能|不可|并非|不是|不代表|不应|切勿|没有依据|禁止/.test(sentence))continue;
  const generates={木:'火',火:'土',土:'金',金:'水',水:'木'},controls={木:'土',土:'水',水:'火',火:'金',金:'木'};
  const comparison=sentence.match(/([木火土金水])生([木火土金水])与\2生\1.{0,10}(?:区分|区别|辨别)/);
  for(const m of sentence.matchAll(/([木火土金水])\s*([生克剋])\s*[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]?([木火土金水])/g)) {
   if(comparison && m.index>=comparison.index && m.index<comparison.index+comparison[0].length)continue;
   if(/(?:非|不是|不能|勿|错误说法为)[：:\s]*$/.test(sentence.slice(Math.max(0,m.index-8),m.index)))continue;
   if((m[2]==='生'?generates:controls)[m[1]]!==m[3])return 'REPORT_ELEMENT_ERROR';
  }
  if(/土[^。\n]{0,8}(?:寅月|卯月|春季)[^。\n]{0,8}(?:处于|为|属)囚/.test(sentence))return 'REPORT_SEASON_SYSTEM_ERROR';
  if(/(?:购买|付费).{0,8}(?:化解|消灾|改运)|只有(?:我|我们|本平台).{0,5}懂你/.test(sentence))return 'REPORT_MANIPULATIVE_CLAIM';
 }
 return null;
}
function appendSourceNotes(content,request) {
 if(request?.kind==='liuren')return liuren.appendSourceNotes(content);
 const refs=citedReferences(content,request);
 return content+'\n\n来源核对（古代文本，不是现代效验证明）\n'+(refs.length?refs.map(r=>`[${r.id}] ${r.title}\n原文：${r.quote}\n${r.scope}\n${r.url}`).join('\n'):'本段为AI辅助方法解析；输入结构与方法说明请结合实际资料对照学习。')+'\n具体推演为AI归纳，引用以所列篇卷原文为准；仅供文化学习与复盘，不构成现实预测、医疗或投资建议。';
}
module.exports={VERSION,CORE,identify,applyStudyPolicy,validateStudyReport,appendSourceNotes,citedReferences,hasPersonalPrediction};
