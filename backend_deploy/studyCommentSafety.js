'use strict';
// Local-only text rules shared by public comments and private/group messaging.
// User text stays on the platform server and is not sent to an outside classifier.
function localFlags(text){
 const value=String(text).normalize('NFKC').toLowerCase().replace(/[\s\u200b-\u200f\ufeff·•._\-—,，。:：;；'"“”‘’()\[\]{}【】<>《》/\\|]+/g,'');
 const rules=[
  ['POLITY',/煽动颠覆|分裂国家|颠覆国家政权|推翻政府|推翻共产党|民族仇恨|民族歧视|暴力革命|非法集会|台独|港独|藏独|疆独|法轮功|六四事件|天安门事件|组建反政府|武装夺取政权/],
  ['VIOLENCE',/恐怖主义|极端主义|实施恐袭|宣扬暴恐|制造炸弹|枪支买卖|爆炸物|买卖枪支|雇凶|杀人教程/],
  ['SEXUAL',/色情|淫秽|裸聊|约炮|招嫖|卖淫|嫖娼|性交易|成人视频|成人网站|无码影片|未成年.{0,8}(?:性|裸照|视频)/],
  ['GAMBLING',/赌博|博彩|下注|赌资|赌场代理|网络赌场|棋牌返利|彩票内幕|赌球|赌马/],
  ['DRUGS',/毒品|冰毒|海洛因|麻古|k粉|摇头丸|大麻买卖|芬太尼买卖|制毒|贩毒|吸毒教程/],
  ['FRAUD',/诈骗|传销|洗钱|高利贷|假币|刷单返利|跑分洗钱|杀猪盘|冒充客服退款|代办信用卡套现/],
  ['AD_CONTACT',/加我微信|加微|加v|加vx|联系我.{0,8}(?:赚钱|返佣|代理)|招代理|私聊我.{0,8}(?:赚钱|返佣|代理)|(?:微信|vx|v信|qq|电报|telegram)(?:号|群)?[a-z0-9_-]{5,}/],
  ['DANGEROUS_MEDICAL',/保证治愈|包治百病|自行针刺|自行正骨|自行开方/],
 ];
 return rules.filter(([,pattern])=>pattern.test(value)).map(([label])=>label);
}
function capability(){
 return {provider:'platform-local',configured:true,automatic:true,manualReviewRequired:false,politicalCoverageRequired:true};
}
module.exports={localFlags,capability};
