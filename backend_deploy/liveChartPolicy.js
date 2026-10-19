'use strict';
// One serialization contract is imported by the sender and enforced again by the server.
const ADAPTERS={
 bazi:{version:1,fields:['pillars','dayGan','dayZhi','shensha','patterns','mainPattern','patternType']},
 ziwei:{version:1,fields:['fiveElementsClass','soulStar','bodyStar','earthlyBranchOfSoulPalace','earthlyBranchOfBodyPalace','palaces','stars','sihua','bodyPalace']},
 meihua:{version:1,fields:['benGua','huGua','bianGua','changeYao','tiYong']},
 liuyao:{version:1,fields:['benGua','bianGua','kongWang','yiMa','taoHua','method']},
 qizheng:{version:1,fields:['engineVersion','frame','sun','mingGong','mingDu','mingDuZhu','mingYuanWuxing','shenGong','shenDu','shenDuZhu','palaces','mansions','stars']},
 qimen:{version:1,fields:['panMethod','anganType','layoutMode','jigongMethod','jigongTargetName','yinYangDun','juNumber','juName','sanYuan','xunShou','xunKong','riKong','shiKong','zhiFuZhiShi','maXing','palaces']},
 daliuren:{version:1,fields:['yuejiangZhi','yuejiangName','kongwang','dayGan','dayZhi','isDaytime','yueJiangMap','guiShenMap','tianGanMap','siKe','sanChuan','sanChuanMethod','keTi','keTiDesc','shensha','zixuanShensha']}
};
const NAMES={bazi:'八字',ziwei:'紫微斗数',meihua:'梅花易数',liuyao:'六爻',qizheng:'七政四余',qimen:'奇门遁甲',daliuren:'大六壬'};
const PRIVATE_KEYS=/^(input|birthInput|calculationInput|recordName|client|profile|note|question|ai|report|solarDate|lunarDate|chineseDate|dateStr|lunarStr|time|timeRange|year|month|day|hour|minute|longitude|latitude|birthPlace|placeName|age|ages|ageRange|decadal|dayun|utcTime|trueSolar|startYear|endYear|startAge|birthYear|yearGanzhi|shengXiao|benMing|xingYear)$/i;
function fail(message){const e=new Error(message);e.status=400;throw e;}
function clean(value,key='',depth=0){
 if(depth>12)fail('盘面层级超出适配范围');if(PRIVATE_KEYS.test(key))return undefined;
 if(value===null||typeof value==='boolean')return value;
 if(typeof value==='number'){if(!Number.isFinite(value))fail('盘面包含无效数值');return value;}
 if(typeof value==='string'){if(value.length>3000||/[<>\u0000]/.test(value))fail('盘面字段不受支持');return value;}
 if(Array.isArray(value)){if(value.length>500)fail('盘面集合过大');return value.map(v=>clean(v,'',depth+1)).filter(v=>v!==undefined);}
 if(value&&typeof value==='object'){const out={};for(const [k,v] of Object.entries(value)){if(['__proto__','prototype','constructor'].includes(k))fail('非法盘面字段');const c=clean(v,k,depth+1);if(c!==undefined)out[k]=c;}return out;}
 return undefined;
}
function snapshot(tool,result,options={}){
 const adapter=ADAPTERS[tool];if(!adapter)fail('CAPABILITY_UNSUPPORTED：此工具活盘适配尚未验收，不会发送空卡或本机编号');
 if(!result||typeof result!=='object'||Array.isArray(result))fail('请先完成排盘并保存结果');
 const data={};for(const field of adapter.fields)if(result[field]!==undefined)data[field]=clean(result[field],field);
 if(tool==='bazi'&&options.showPillars!==false&&(!Array.isArray(data.pillars)||data.pillars.length!==4))fail('八字四柱不完整');
 if(tool==='ziwei'&&(!Array.isArray(data.palaces)||data.palaces.length!==12))fail('紫微十二宫不完整');
 if(tool==='qizheng'&&(!Array.isArray(data.palaces)||!Array.isArray(data.stars)))fail('七政星位不完整');
 if(tool==='qimen'&&(!Array.isArray(data.palaces)||data.palaces.length!==9))fail('奇门九宫不完整');
 if(['meihua','liuyao'].includes(tool)&&!data.benGua)fail('卦象不完整');
 if(tool==='daliuren'&&(!data.siKe||!data.sanChuan))fail('六壬四课三传不完整');
 const showPillars=options.showPillars===true;if(!showPillars){delete data.pillars;delete data.dayGan;delete data.dayZhi;}
 return {schemaVersion:1,toolKey:tool,title:NAMES[tool],adapterVersion:adapter.version,engineVersion:typeof result.engineVersion==='string'?result.engineVersion:'existing-engine-25.0.115',renderVersion:1,data,allowedLayers:['natal'],redaction:{name:true,birthDate:true,birthPlace:true,notes:true,ai:true,age:true,pillars:!showPillars},inferenceNotice:'姓名、日期和地点已在发送前移除；保留的四柱、星位或卦象仍可能推知部分出生信息，无法保证匿名。隐去资料的流年/行限层不可重算。'};
}
function revalidate(s){if(s?.schemaVersion!==1||s.renderVersion!==1)fail('活盘版本不受支持');return snapshot(s.toolKey,s.data,{showPillars:s.redaction?.pillars===false});}
module.exports={ADAPTERS,NAMES,snapshot,revalidate};
