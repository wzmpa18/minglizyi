import { Solar } from "lunar-javascript";
import { xianDuAtAge, type QizhengResult, type PalaceInfo } from "@/algorithm-core/modules/qizheng";
import { calcQizhengDuanyu, nianZhiShensha, huayaoStarKeysForGan, MIAO_WANG_LE_XI, JI_CHAN, TEHUA_TABLE, SHORT_KEY } from "@/algorithm-core/modules/qizheng-duanyu";
import type { QizhengLiunianResult } from "@/algorithm-core/modules/qizheng-liunian";

// Source lock: QIZHENG-HANDOFF-12PALACE-01 + standard_kb §§1.4,1.5,1.6,3,4,5,7.3.
export const PALACE_KNOWLEDGE: Record<string,{name:string;meaning:string;focus:string}> = {
 命宫:{name:"命宫",meaning:"自身与人生主轴，观察性情基础和整体格局。",focus:"命宫宫主、命度主与身宫身度须相互参照。"},
 财帛:{name:"财帛宫",meaning:"财富与资源，观察收入资源、获得方式与实际受用。",focus:"结合财星、田财关系、日月、福禄与刑囚暗耗，不凭单星论财富。"},
 兄弟:{name:"兄弟宫",meaning:"手足与同辈关系，观察互助、互动和竞争。",focus:"结合本宫星曜、孤寡、官符及宫主强弱。"},
 田宅:{name:"田宅宫",meaning:"家宅与资产基础，观察居所、家庭环境和不动产议题。",focus:"结合田主、财星、日月、土星及身命主。"},
 男女:{name:"子女宫",meaning:"子女与晚辈关系，观察代际互动的传统象义。",focus:"结合本宫星曜、五行和辅助因素，不推断必有几个孩子。"},
 奴仆:{name:"交友·部属宫",meaning:"助手、合作人员、执行团队和人际支援。",focus:"结合身命主、禄马贵人、长生帝旺及劫刃亡神。"},
 妻妾:{name:"夫妻宫",meaning:"婚姻、伴侣关系与亲密互动。",focus:"结合本宫星曜、禄贵、咸池与强弱；不据单一星煞判断关系成败。"},
 疾厄:{name:"疾厄宫",meaning:"身体与压力议题，也有权力、权威及职业的延伸象义。",focus:"仅呈现传统文化解释，不构成医学诊断或疾病预测。"},
 迁移:{name:"迁移宫",meaning:"外出、迁居、外地发展与环境变化。",focus:"结合驿马、攀鞍及相关星曜。宫势为近强，同时列于传统弱宫体系。"},
 官禄:{name:"官禄宫",meaning:"事业、工作、职位、名望与社会角色。",focus:"结合官星、文星、魁星、印星、禄神及生克守照。"},
 福德:{name:"福德宫",meaning:"生活安稳、内在满足、福享与精神状态。",focus:"结合日月金水，以及刑囚暗耗与全盘强弱。"},
 相貌:{name:"相貌宫",meaning:"外在形象、气质、性情及内在状态。",focus:"综合星曜与宫度关系，不据单星断定外貌。"},
};
export const PALACE_AUX: Record<string,{zodiac:string;bagua:string}> = {
 子:{zodiac:"宝瓶",bagua:"坎"},丑:{zodiac:"摩羯",bagua:"艮"},寅:{zodiac:"人马",bagua:"艮"},卯:{zodiac:"天蝎",bagua:"震"},辰:{zodiac:"天秤",bagua:"巽"},巳:{zodiac:"双女",bagua:"巽"},
 午:{zodiac:"狮子",bagua:"离"},未:{zodiac:"巨蟹",bagua:"坤"},申:{zodiac:"双子",bagua:"坤"},酉:{zodiac:"金牛",bagua:"兑"},戌:{zodiac:"白羊",bagua:"乾"},亥:{zodiac:"双鱼",bagua:"乾"},
};
export function allHuayao(gan:string) {
 return [...huayaoStarKeysForGan(gan),...Object.entries(TEHUA_TABLE).flatMap(([huaName,rows])=>(rows[gan]||[]).map(short=>({huaName,starKey:SHORT_KEY[short]})))];
}
export function chartShensha(gan:string,zhi:string,lunarMonth?:number) {
 const base=nianZhiShensha(gan,zhi);
 const g="甲乙丙丁戊己庚辛壬癸".indexOf(gan);
 if(g<0) return base;
 const tables=[{name:"禄勋",branches:"寅卯巳午巳午申酉亥子",source:"§4.1.1"},
  {name:"文昌",branches:"巳午申酉申酉亥戌寅卯",source:"§4.1.2"},
  {name:"国印",branches:"戌亥丑寅卯辰巳午未申",source:"§4.1.3"}];
 const items=[...base,...tables.map(t=>({id:t.name,name:t.name,branch:t.branches[g],level:"ji" as const,text:`${t.name}按出生年干起。`,source:`标准知识库卷四${t.source}`}))];
 const branches="子丑寅卯辰巳午未申酉戌亥",zi=branches.indexOf(zhi);
 const add=(name:string,branch:string,source:string)=>items.push({id:`kb-${name}-${branch}`,name,branch,level:"zhong",text:`${name}依标准知识库${source}定位，须结合全盘解释。`,source:`标准知识库卷四${source}`});
 add("玉堂","丑子亥酉未申未午巳卯"[g],"§4.1.2");
 if(zi>=0){
  add("飞廉","申酉戌巳午未寅卯辰亥子丑"[zi],"§4.2.3");
  add("年符",branches[(zi+4)%12],"§4.3.1（驾前第五位，含本位计数）");
  add("小耗",branches[(zi+5)%12],"§4.3.3");add("大耗",branches[(zi+6)%12],"§4.3.3（岁破对宫）");
 }
 add("天罗","辰","§4.5.6");add("地网","戌","§4.5.6");
 for(const s of base.filter(s=>s.name==="空亡"))add("孤虚",branches[(branches.indexOf(s.branch)+6)%12],"§4.5.7");
 if(lunarMonth && lunarMonth>=1 && lunarMonth<=12){const m=lunarMonth-1;
  add("月符","午未申酉戌亥子丑寅卯辰巳"[m],"§4.3.2");
  add("天耗","子寅辰午申戌子寅辰午申戌"[m],"§4.3.4");
  add("地耗","酉亥丑卯申未酉亥丑卯申未"[m],"§4.3.4");
  add("月廉","申酉戌亥子丑寅卯辰巳午未"[m],"§4.4.1");
  add("月煞","戌巳午未寅卯辰亥子丑申酉"[m],"§4.4.2");
 }
 return items;
}
const distance=(a:number,b:number)=>Math.min(Math.abs(a-b)%360,360-Math.abs(a-b)%360);
export function buildPalaceBasicInterpretation(chart:QizhengResult,palace:PalaceInfo,transit:QizhengLiunianResult|null=null,age?:number) {
 const dy=calcQizhengDuanyu(chart),kb=PALACE_KNOWLEDGE[palace.renshiGong];
 const i=chart.input;
 const lunar=Solar.fromYmdHms(i.year,i.month,i.day,i.hour,i.minute,0).getLunar();
 const month=Math.abs(lunar.getMonth());
 const season=[3,6,9,12].includes(month)?"土":[1,2].includes(month)?"木":[4,5].includes(month)?"火":[7,8].includes(month)?"金":"水";
 const order:Record<string,string[]>={木:["木","火","水","金","土"],火:["火","土","木","水","金"],土:["土","金","火","木","水"],金:["金","水","土","火","木"],水:["水","木","金","土","火"]};
 const strength=palace.renshiGong==="迁移"?"近强（亦列传统弱宫）":["命宫","官禄","田宅","妻妾"].includes(palace.renshiGong)?"强宫":["男女","福德","财帛"].includes(palace.renshiGong)?"次强宫":"弱宫";
 const hua=allHuayao(dy.yearGanzhi.gan);
 const stars=chart.stars.filter(s=>s.palaceBranch===palace.branch).map(s=>{
  const places=MIAO_WANG_LE_XI[s.key];
  const states=[s.inYuan?"入垣":"",s.shengDian?"升殿":"",...(places?Object.entries(places).filter(([,b])=>b===s.palaceBranch).map(([k])=>({miao:"庙",wang:"旺",le:"乐",xi:"喜"}[k])):[]),JI_CHAN[s.key]?.includes(s.palaceBranch)?"忌躔":""].filter(Boolean);
  return {...s,states,seasonStrength:["旺","相","休","囚","死"][order[season].indexOf(s.wuxing)]||"未定",huayao:hua.filter(h=>h.starKey===s.key).map(h=>h.huaName)};
 });
 const at=(offset:number)=>chart.palaces.find(p=>p.branchIndex===(palace.branchIndex+offset+12)%12)!;
 const relation=(name:string,offsets:number[])=>({name,palaces:offsets.map(n=>{const p=at(n);return {branch:p.branch,name:PALACE_KNOWLEDGE[p.renshiGong].name,stars:chart.stars.filter(s=>s.palaceBranch===p.branch).map(s=>s.name)};})});
 const shenshaNatal=chartShensha(dy.yearGanzhi.gan,dy.yearGanzhi.zhi,month).filter(s=>s.branch===palace.branch);
 const shenshaTransit=transit?chartShensha(transit.ganzhi.gan,transit.ganzhi.zhi).filter(s=>s.branch===palace.branch):[];
 const transitStars=transit?.stars.filter(s=>s.palaceBranch===palace.branch)||[];
 const huaTransit=transit?allHuayao(transit.ganzhi.gan):[];
 const chosenAge=age ?? (transit?transit.year-i.year+1:undefined);
 const daxian=chosenAge!==undefined && chosenAge>0?xianDuAtAge(chart,chosenAge):null;
 return {schemaVersion:1,title:kb.name,classicalName:palace.renshiGong,branch:palace.branch,lord:palace.owner,strength,
  auxiliary:PALACE_AUX[palace.branch],baseMeaning:kb.meaning,focus:kb.focus,stars,shenshaNatal,shenshaTransit,
  huayaoNatal:stars.flatMap(s=>s.huayao.map(h=>`${h}：${s.name}`)),huayaoTransit:transitStars.flatMap(s=>huaTransit.filter(h=>h.starKey===s.key).map(h=>`${h.huaName}：${s.name}`)),transitStars,
  relations:[relation("对宫",[6]),relation("三方",[4,8]),relation("拱",[5,7]),relation("夹",[11,1])],
  starRelations:stars.flatMap(s=>chart.stars.filter(t=>t.key!==s.key).flatMap(t=>{
   const relations:string[]=[]; if(distance(s.lon,t.lon)<1) relations.push("同经（黄经差小于1°）"); if(s.xiuName===t.xiuName) relations.push("同宿");
   return relations.map(kind=>`${s.name}与${t.name}：${kind}`);
  })),
  currentDaXian:daxian?{age:chosenAge,inPalace:daxian.row.palaceBranch===palace.branch,branch:daxian.row.palaceBranch,xiu:daxian.xiuFullName,degree:daxian.xiuDegree}:null,
  currentXiaoXian:{status:"SOURCE_INCOMPLETE",label:"资料未提供完整起算法，暂不推算"},currentYueXian:{status:"SOURCE_INCOMPLETE",label:"资料未提供完整起算法，暂不推算"},
  summary:`${kb.name}主要用于观察${kb.meaning}当前本宫落在${palace.branch}，宫主为${palace.owner}，宫势为${strength}。${stars.length?`本宫有${stars.map(s=>s.name).join("、")}。`:"本宫无入星，仍需参看宫主与对宫，不代表该领域没有信息。"}${shenshaNatal.length?`原局辅助神煞有${shenshaNatal.map(s=>s.name).join("、")}。`:""}${kb.focus}上述为确定性数据与传统宫义的组合，不是对现实结果的断言。`,
  sourceRefs:["QIZHENG-HANDOFF-12PALACE-01","标准知识库 §1.4 宫义与宫势","§1.5.2 四时旺相休囚死（按农历月）","§1.6 化曜","卷三 垣殿庙旺乐喜与忌躔","卷四 神煞","卷五 洞微大限","§7.3 十二宫守拱照"],
 };
}
export type PalaceInterpretation=ReturnType<typeof buildPalaceBasicInterpretation>;
