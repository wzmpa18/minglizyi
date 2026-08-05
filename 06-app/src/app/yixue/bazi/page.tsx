"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  solarToBazi,
  calculateAllShenSha,
  GAN_WUXING,
  ZHI_WUXING,
  getShengXiao,
  getNaYin,
  getChangSheng,
  getXunKong,
  getGanHePartner,
  getZhiHePartner,
  getZhiChongPartner,
  getGanWuxing,
  getZhiWuxing,
  getCangGan,
  getShiShen,
  SHI_SHEN_JIAN_CHENG,
  WUXING_SHENG,
  WUXING_KE,
  GAN,
  ZHI,
  getGanIndex,
  getZhiIndex,
} from "@/algorithm-core";
import type { TianGan, DiZhi, Gender, BaziResult, BaziPillar } from "@/algorithm-core";
import { DatePicker } from "@/components/shared";
import { saveRecord, getPrefillData, clearPrefillData, getClient } from "@/lib/clientStore";
import type { Client } from "@/lib/clientStore";
import { getPillarInterpretation, getShenshaInterpretation } from "@/lib/bazi-interpretations";
import { savePaipanState, loadPaipanState, clearPaipanState } from "@/lib/paipanPersistence";
import { useToolBack } from "@/lib/useToolBack";

// ===== 五行颜色 - 严格对标jishiyu =====
// 注意: 五行颜色为传统命理数据色(火=红)，品牌紫色(#7B2FBE)仅用于UI chrome
const WX_COLORS: Record<string, string> = {
  "金": "#ffa500",
  "木": "#00a879",
  "水": "#0074e4",
  "火": "#ed4d49",
  "土": "#a64b00",
};
const BRAND_PURPLE = "#7B2FBE";
const BRAND_PURPLE_LIGHT = "#9B5ECF";
const BRAND_PURPLE_BG = "#F3EDF7";
const BRAND_PURPLE_BORDER = "#C9A8DC";

// 五行小图标 - 使用Unicode符号贴近jishiyu风格
const WX_ICON: Record<string, string> = {
  "金": "▲",
  "木": "🌲",
  "水": "💧",
  "火": "🔥",
  "土": "▴",
};

// 旺衰条颜色顺序(月令决定): 旺相休囚死 - 五行为传统色(火红)
const WANGSHUAI_COLORS: Record<string, {label:string; wx:string; bg:string}[]> = {
  "木": [
    {label:"旺", wx:"木", bg:"#00a879"},
    {label:"相", wx:"火", bg:"#ed4d49"},
    {label:"休", wx:"水", bg:"#0074e4"},
    {label:"囚", wx:"金", bg:"#ffa500"},
    {label:"死", wx:"土", bg:"#a64b00"},
  ],
  "火": [
    {label:"旺", wx:"火", bg:"#ed4d49"},
    {label:"相", wx:"土", bg:"#a64b00"},
    {label:"休", wx:"木", bg:"#00a879"},
    {label:"囚", wx:"水", bg:"#0074e4"},
    {label:"死", wx:"金", bg:"#ffa500"},
  ],
  "土": [
    {label:"旺", wx:"土", bg:"#a64b00"},
    {label:"相", wx:"金", bg:"#ffa500"},
    {label:"休", wx:"火", bg:"#ed4d49"},
    {label:"囚", wx:"木", bg:"#00a879"},
    {label:"死", wx:"水", bg:"#0074e4"},
  ],
  "金": [
    {label:"旺", wx:"金", bg:"#ffa500"},
    {label:"相", wx:"水", bg:"#0074e4"},
    {label:"休", wx:"土", bg:"#a64b00"},
    {label:"囚", wx:"火", bg:"#ed4d49"},
    {label:"死", wx:"木", bg:"#00a879"},
  ],
  "水": [
    {label:"旺", wx:"水", bg:"#0074e4"},
    {label:"相", wx:"木", bg:"#00a879"},
    {label:"休", wx:"金", bg:"#ffa500"},
    {label:"囚", wx:"土", bg:"#a64b00"},
    {label:"死", wx:"火", bg:"#ed4d49"},
  ],
};

// 生肖红色线描图标(SVG)
function ShengxiaoIcon({ name }: { name: string }) {
  const sxMap: Record<string, string> = {
    "鼠": "🐭","牛": "🐮","虎": "🐯","兔": "🐰",
    "龙": "🐲","蛇": "🐍","马": "🐴","羊": "🐑",
    "猴": "🐵","鸡": "🐔","狗": "🐶","猪": "🐷",
  };
  return (
    <div className="flex flex-col items-center">
      <div
        className="w-[72px] h-[72px] flex items-center justify-center text-[40px] bg-white"
        style={{ borderRadius: "28px", border: "3px solid " + BRAND_PURPLE }}
      >
        {sxMap[name] || "🐴"}
      </div>
    </div>
  );
}

// ===== helpers =====
function calcTaiYuan(mGan: TianGan, mZhi: DiZhi): string {
  const gi = getGanIndex(mGan); const zi = getZhiIndex(mZhi);
  return `${GAN[((gi + 1) % 10)]}${ZHI[((zi + 3) % 12)]}`;
}
function calcTaiXi(mZhi: DiZhi): string {
  const zi = getZhiIndex(mZhi); const tz = (zi + 3) % 12;
  const hm: Record<number,number> = {0:1,1:0,2:11,3:10,4:9,5:8,6:7,7:6,8:5,9:4,10:3,11:2};
  return ZHI[hm[tz]??tz];
}
function calcMingGong(mZhi: DiZhi, hZhi: DiZhi): string {
  const mz = getZhiIndex(mZhi); const hz = getZhiIndex(hZhi);
  return ZHI[((2-(hz-2)+12)%12 + (mz-2+12)%12)%12];
}
function calcShenGong(mZhi: DiZhi, hZhi: DiZhi): string {
  const mz = getZhiIndex(mZhi); const hz = getZhiIndex(hZhi);
  return ZHI[((2+(hz-2)+12)%12 + (mz-2+12)%12)%12];
}
function calcMingGua(yGan: TianGan, yZhi: DiZhi, gender: Gender): string {
  const baGua = ["坎","坤","震","巽","中","乾","兑","艮","离"];
  const mG=[1,9,8,7,6,2,4,3,5]; const fG=[5,6,7,8,9,1,2,3,4];
  const idx = (parseInt(String(yGan)+String(yZhi),10)-1)%9;
  return gender==="male"?(baGua[mG[idx]-1]||"坎"):(baGua[fG[idx]-1]||"离");
}
function getZuoChangSheng(p: { changsheng?: string }): string {
  // v17.7 修复：直接使用算法层预计算的 changsheng，禁止中间层重新计算
  return p.changsheng || "-";
}
function getGanLiuYi(result: BaziResult): {text:string; type:"he"|"chong"|null}[] {
  const tips: {text:string; type:"he"|"chong"|null}[] = [];
  const allGan = result.pillars.map(p=>p.gan as TianGan);
  const checked=new Set<number>();
  for(let i=0;i<allGan.length;i++){
    if(checked.has(i)) continue;
    const partner=getGanHePartner(allGan[i]); if(!partner) continue;
    for(let j=i+1;j<allGan.length;j++){
      if(allGan[j]===partner.partner){
        tips.push({text:allGan[i]+allGan[j]+"合化"+partner.huaWuXing, type:"he"});
        checked.add(i);checked.add(j);break;
      }
    }
  }
  // 天干相克
  for(let i=0;i<allGan.length;i++){
    for(let j=i+1;j<allGan.length;j++){
      const wx1 = getGanWuxing(allGan[i]);
      const wx2 = getGanWuxing(allGan[j]);
      if(wx1 && wx2 && WUXING_KE[wx1]===wx2){
        tips.push({text:allGan[i]+"克"+allGan[j], type:"chong"});
      }
    }
  }
  return tips;
}
function getZhiLiuYi(result: BaziResult): {text:string; type:"he"|"chong"|"xing"|"po"|null}[] {
  const tips: {text:string; type:"he"|"chong"|"xing"|"po"|null}[] = [];
  const allZhi = result.pillars.map(p=>p.zhi as DiZhi);
  // 六合
  for(let i=0;i<allZhi.length;i++){
    const p=getZhiHePartner(allZhi[i]); if(!p) continue;
    for(let j=i+1;j<allZhi.length;j++){if(allZhi[j]===p.partner) tips.push({text:allZhi[i]+allZhi[j]+"半合"+p.hua+"局", type:"he"});}
  }
  // 六冲
  for(let i=0;i<allZhi.length;i++){
    const p=getZhiChongPartner(allZhi[i]); if(!p) continue;
    for(let j=i+1;j<allZhi.length;j++){if(allZhi[j]===p) tips.push({text:allZhi[i]+allZhi[j]+"相冲", type:"chong"});}
  }
  // 自刑
  const xingMap: Record<string,string> = {"午":"午","辰":"辰","酉":"酉","亥":"亥"};
  const countMap: Record<string,number> = {};
  allZhi.forEach(z=>{countMap[z]=(countMap[z]||0)+1;});
  Object.entries(xingMap).forEach(([z])=>{
    if((countMap[z]||0)>=2) tips.push({text:z+z+"自刑", type:"xing"});
  });
  // 相破(简单版)
  const poMap: Record<string,string> = {"子":"酉","酉":"子","卯":"午","午":"卯","寅":"亥","亥":"寅","巳":"申","申":"巳","辰":"丑","丑":"辰","未":"戌","戌":"未"};
  for(let i=0;i<allZhi.length;i++){
    for(let j=i+1;j<allZhi.length;j++){
      if(poMap[allZhi[i]]===allZhi[j]){
        tips.push({text:allZhi[i]+allZhi[j]+"相破", type:"po"});
      }
    }
  }
  return tips;
}
function getPillarShenshaNames(shensha: ReturnType<typeof calculateAllShenSha>|null, pillarIdx: number): string[] {
  if(!shensha) return [];
  const keys=["年柱","月柱","日柱","时柱"] as const;
  const k=keys[pillarIdx]; const data=shensha.byPillar;
  if(!data||typeof data!=="object") return [];
  const arr=(data as any)[k];
  if(!Array.isArray(arr)) return [];
  return (arr as Array<{name:string}>).map(it=>it.name);
}

// ===== 袁天罡称骨数据 =====
const YEAR_BONE: Record<string, number> = {
  "甲子":1.2,"乙丑":0.9,"丙寅":0.6,"丁卯":0.7,"戊辰":1.2,"己巳":0.5,"庚午":0.9,"辛未":0.8,
  "壬申":0.7,"癸酉":0.8,"甲戌":1.5,"乙亥":0.9,"丙子":1.6,"丁丑":0.8,"戊寅":0.8,"己卯":1.9,
  "庚辰":1.2,"辛巳":0.6,"壬午":0.8,"癸未":0.7,"甲申":0.5,"乙酉":1.5,"丙戌":0.6,"丁亥":1.6,
  "戊子":1.5,"己丑":0.7,"庚寅":0.9,"辛卯":1.2,"壬辰":1.0,"癸巳":0.7,"甲午":1.5,"乙未":0.6,
  "丙申":0.5,"丁酉":1.4,"戊戌":1.4,"己亥":0.9,"庚子":0.7,"辛丑":0.7,"壬寅":0.9,"癸卯":1.2,
  "甲辰":0.8,"乙巳":0.7,"丙午":1.3,"丁未":0.5,"戊申":1.4,"己酉":0.5,"庚戌":0.9,"辛亥":1.7,
  "壬子":0.5,"癸丑":0.7,"甲寅":1.2,"乙卯":0.8,"丙辰":0.8,"丁巳":0.6,"戊午":1.9,"己未":0.6,
  "庚申":0.8,"辛酉":1.6,"壬戌":1.0,"癸亥":0.7,
};
const MONTH_BONE: Record<number, number> = {
  1:0.6,2:0.7,3:1.8,4:0.9,5:0.5,6:1.6,7:0.9,8:1.5,9:1.8,10:0.8,11:0.9,12:0.5,
};
const DAY_BONE: Record<number, number> = {
  1:0.5,2:1.0,3:0.8,4:1.5,5:1.6,6:1.5,7:0.8,8:1.6,9:0.8,10:1.6,
  11:0.9,12:1.7,13:0.8,14:1.7,15:1.0,16:0.8,17:0.9,18:1.8,19:0.5,20:1.5,
  21:1.0,22:0.9,23:0.8,24:0.9,25:1.5,26:1.8,27:0.7,28:0.8,29:1.6,30:0.6,
};
const HOUR_BONE: Record<number, number> = {
  0:1.6,1:0.6,2:0.7,3:1.0,4:0.9,5:1.6,6:1.0,7:0.8,8:0.8,9:0.9,10:0.6,11:0.6,
};
const ZHI_TO_MONTH: Record<string, number> = {
  "寅":1,"卯":2,"辰":3,"巳":4,"午":5,"未":6,"申":7,"酉":8,"戌":9,"亥":10,"子":11,"丑":12,
};
const ZHI_TO_HOUR: Record<string, number> = {
  "子":0,"丑":1,"寅":2,"卯":3,"辰":4,"巳":5,"午":6,"未":7,"申":8,"酉":9,"戌":10,"亥":11,
};
const BONE_COMMENTARY: Record<string, {male:string; female:string}> = {
  "2.1":{male:"短命非业谓大凶，平生灾难事重重，凶祸频临陷逆境，终世困苦事不成。",female:"短命非业谓大凶，平生灾难事重重，凶祸频临陷逆境，终世困苦事不成。"},
  "2.2":{male:"身寒骨冷苦伶仃，此命推来行乞人，劳劳碌碌无度日，终年打拱过平生。",female:"此命孤冷有凄伶，此命推来路乞人，操心烦脑度平日，一生育苦度光阴。"},
  "2.3":{male:"此命推来骨格轻，求谋作事事难成，妻儿兄弟应难许，别处他乡作散人。",female:"此命推来骨格轻，求谋作事事难成，妻儿兄弟应难许，别处他乡作散人。"},
  "2.4":{male:"此命推来福禄无，门庭困苦总难荣，六亲骨肉皆无靠，流浪他乡作老翁。",female:"此命推来福禄无，门庭困苦总难荣，六亲骨肉皆无靠，流浪他乡作老翁。"},
  "2.5":{male:"此命推来祖业微，门庭营度似稀奇，六亲骨肉如冰炭，一世勤劳自把持。",female:"此命推来祖业微，门庭营度似稀奇，六亲骨肉如冰炭，一世勤劳自把持。"},
  "2.6":{male:"平生衣禄苦中求，独自营谋事不休，离祖出门宜早计，晚来衣禄自无休。",female:"平生衣禄苦中求，独自营谋事不休，离祖出门宜早计，晚来衣禄自无休。"},
  "2.7":{male:"一生作事少商量，难靠祖宗作主张，独马单枪空做去，早年晚岁总无长。",female:"一生作事少商量，难靠祖宗作主张，独马单枪空做去，早年晚岁总无长。"},
  "2.8":{male:"一生行事似飘蓬，祖宗产业在梦中，若不过房改名姓，也当移徒二三通。",female:"一生行事似飘蓬，祖宗产业在梦中，若不过房改名姓，也当移徒二三通。"},
  "2.9":{male:"初年运限未曾亨，纵有功名在后成，须过四旬才可立，移居改姓始为良。",female:"初年运限未曾亨，纵有功名在后成，须过四旬才可立，移居改姓始为良。"},
  "3.0":{male:"劳劳碌碌苦中求，东奔西走何日休，若使终身勤与俭，老来稍可免忧愁。",female:"劳劳碌碌苦中求，东奔西走何日休，若使终身勤与俭，老来稍可免忧愁。"},
  "3.1":{male:"忙忙碌碌苦中求，何日云开见日头，难得祖基家可立，中年衣食渐无忧。",female:"忙忙碌碌苦中求，何日云开见日头，难得祖基家可立，中年衣食渐无忧。"},
  "3.2":{male:"初年运蹇事难谋，渐有财源如水流，到得中年衣食旺，那时名利一齐收。",female:"初年运蹇事难谋，渐有财源如水流，到得中年衣食旺，那时名利一齐收。"},
  "3.3":{male:"早年做事事难成，百年勤劳枉费心，半世自如流水去，后来运到始得金。",female:"早年做事事难成，百年勤劳枉费心，半世自如流水去，后来运到始得金。"},
  "3.4":{male:"此命福气果如何，僧道门中衣禄多，离祖出家方为妙，朝晚拜佛念弥陀。",female:"此命福气果如何，僧道门中衣禄多，离祖出家方为妙，朝晚拜佛念弥陀。"},
  "3.5":{male:"生平福量不周全，祖业根基觉少传，营事生涯宜守旧，时来衣食胜从前。",female:"生平福量不周全，祖业根基觉少传，营事生涯宜守旧，时来衣食胜从前。"},
  "3.6":{male:"不须劳碌过平生，独自成家福不轻，早有福星常照命，任君行去百般成。",female:"不须劳碌过平生，独自成家福不轻，早有福星常照命，任君行去百般成。"},
  "3.7":{male:"此命般般事不成、弟兄少力自孤行。虽然祖业须微有，来得明时去不明。",female:"此命般般事不成、弟兄少力自孤行。虽然祖业须微有，来得明时去不明。"},
  "3.8":{male:"一身骨肉最清高，早入簧门姓氏标。待到年将三十六，蓝衫脱去换红袍。",female:"一身骨肉最清高，早入簧门姓氏标。待到年将三十六，蓝衫脱去换红袍。"},
  "3.9":{male:"此命终身运不通，劳劳作事尽皆空，苦心竭力成家计，到得那时在梦中。",female:"此命终身运不通，劳劳作事尽皆空，苦心竭力成家计，到得那时在梦中。"},
  "4.0":{male:"平生衣禄是绵长，件件心中自主张。前面风霜多受过，后来必定享安康。",female:"平生衣禄是绵长，件件心中自主张。前面风霜多受过，后来必定享安康。"},
  "4.1":{male:"此命推来自不同，为人能干异凡庸。中年还有逍遥福：不比前时运来通。",female:"此命推来自不同，为人能干异凡庸。中年还有逍遥福：不比前时运来通。"},
  "4.2":{male:"得宽怀处且宽怀，何用双眉皱不开。若使中年命运济，那时名利一起来。",female:"得宽怀处且宽怀，何用双眉皱不开。若使中年命运济，那时名利一起来。"},
  "4.3":{male:"为人心性最聪明，作事轩昂近贵人。衣禄一生天注定，不须劳碌是丰亨。",female:"为人心性最聪明，作事轩昂近贵人。衣禄一生天注定，不须劳碌是丰亨。"},
  "4.4":{male:"万事由天莫苦求，须知福碌赖人修。当年财帛难如意，晚景欣然便不优。",female:"万事由天莫苦求，须知福碌赖人修。当年财帛难如意，晚景欣然便不优。"},
  "4.5":{male:"名利推求竟若何？前番辛苦后奔波。命中难养男和女，骨肉扶持也不多。",female:"名利推求竟若何？前番辛苦后奔波。命中难养男和女，骨肉扶持也不多。"},
  "4.6":{male:"东西南北尽皆通，出姓移居更觉隆。衣禄无穷无数定，中年晚景一般同。",female:"东西南北尽皆通，出姓移居更觉隆。衣禄无穷无数定，中年晚景一般同。"},
  "4.7":{male:"此命推求旺末年，妻荣子贵自怡然。平生原有滔滔福，可卜财源若水泉。",female:"此命推求旺末年，妻荣子贵自怡然。平生原有滔滔福，可卜财源若水泉。"},
  "4.8":{male:"初年运道未曾通，几许蹉跎命亦穷。兄弟六亲无依靠，一生事业晚来整。",female:"初年运道未曾通，几许蹉跎命亦穷。兄弟六亲无依靠，一生事业晚来整。"},
  "4.9":{male:"此命推来福不轻，自成自立显门庭。从来富贵人钦敬，使婢差奴过一生。",female:"此命推来福不轻，自成自立显门庭。从来富贵人钦敬，使婢差奴过一生。"},
  "5.0":{male:"为利为名终日劳，中年福禄也多遭。老来自有财星照，不比前番目下高。",female:"为利为名终日劳，中年福禄也多遭。老来自有财星照，不比前番目下高。"},
  "5.1":{male:"一世荣华事事通，不须劳碌自亨通。兄弟叔侄皆如意，家业成时福禄宏。",female:"一世荣华事事通，不须劳碌自亨通。兄弟叔侄皆如意，家业成时福禄宏。"},
  "5.2":{male:"一世亨通事事能，不须劳苦自然宁。宗族有光欣喜甚，家产丰盈自称心。",female:"一世亨通事事能，不须劳苦自然宁。宗族有光欣喜甚，家产丰盈自称心。"},
  "5.3":{male:"此格推来福泽宏，兴家立业在其中。一生衣食安排定，却是人间一福翁。",female:"此格推来福泽宏，兴家立业在其中。一生衣食安排定，却是人间一福翁。"},
  "5.4":{male:"此格详采福泽宏，诗书满腹看功成。丰衣足食多安稳，正是人间有福人。",female:"此格详采福泽宏，诗书满腹看功成。丰衣足食多安稳，正是人间有福人。"},
  "5.5":{male:"策马扬鞭争名利，少年作事费筹论。一朝福禄源源至，富贵荣华显六亲。",female:"策马扬鞭争名利，少年作事费筹论。一朝福禄源源至，富贵荣华显六亲。"},
  "5.6":{male:"此格推来礼义通，一身福禄用无穷。甜酸苦辣皆尝过，滚滚财源盈而丰。",female:"此格推来礼义通，一身福禄用无穷。甜酸苦辣皆尝过，滚滚财源盈而丰。"},
  "5.7":{male:"福禄丰盈万事全，一身荣耀乐天年。名扬威震人争羡，此世逍遥宛似仙。",female:"福禄丰盈万事全，一身荣耀乐天年。名扬威震人争羡，此世逍遥宛似仙。"},
  "5.8":{male:"平生衣食自然来，名利双全富贵偕。金榜题名登甲第，紫袍玉带走金阶。",female:"平生衣食自然来，名利双全富贵偕。金榜题名登甲第，紫袍玉带走金阶。"},
  "5.9":{male:"细推此格秀而清，必定才高学业成。甲第之中应有分，扬鞭走马显威荣。",female:"细推此格秀而清，必定才高学业成。甲第之中应有分，扬鞭走马显威荣。"},
  "6.0":{male:"一朝金榜快题名，显祖荣宗大器成。衣禄定然无欠缺，田园财帛更丰盈。",female:"一朝金榜快题名，显祖荣宗大器成。衣禄定然无欠缺，田园财帛更丰盈。"},
  "6.1":{male:"不作朝中金榜客，定为世上大财翁。聪明天付经书熟，名显高褂自是荣。",female:"不作朝中金榜客，定为世上大财翁。聪明天付经书熟，名显高褂自是荣。"},
  "6.2":{male:"此命生来福不穷，读书必定显亲宗。紫衣玉带为卿相，富贵荣华孰与同。",female:"此命生来福不穷，读书必定显亲宗。紫衣玉带为卿相，富贵荣华孰与同。"},
  "6.3":{male:"命主为官福禄长，得来富贵实非常。名题雁塔传金榜，大显门庭天下扬。",female:"命主为官福禄长，得来富贵实非常。名题雁塔传金榜，大显门庭天下扬。"},
  "6.4":{male:"此格威权不可当，紫袍金带尘高堂。荣华富贵谁能及？万古留名姓氏扬。",female:"此格威权不可当，紫袍金带尘高堂。荣华富贵谁能及？万古留名姓氏扬。"},
  "6.5":{male:"细推此命福非轻，富贵荣华孰与争？定国安邦人极品，威声显赫震寰瀛。",female:"细推此命福非轻，富贵荣华孰与争？定国安邦人极品，威声显赫震寰瀛。"},
  "6.6":{male:"此格人间一福人，堆金积玉满堂春。从来富贵有天定，金榜题名更显亲。",female:"此格人间一福人，堆金积玉满堂春。从来富贵有天定，金榜题名更显亲。"},
  "6.7":{male:"此命生来福自宏，田园家业最高隆。平生衣禄盈丰足，一路荣华万事通。",female:"此命生来福自宏，田园家业最高隆。平生衣禄盈丰足，一路荣华万事通。"},
  "6.8":{male:"富贵由天莫苦求，万金家计不须谋。如今不比前翻事，祖业根基飞古留。",female:"富贵由天莫苦求，万金家计不须谋。如今不比前翻事，祖业根基飞古留。"},
  "6.9":{male:"君是人间衣禄星，一生富贵众人钦。总然衣禄由天定，安享荣华过一生。",female:"君是人间衣禄星，一生富贵众人钦。总然衣禄由天定，安享荣华过一生。"},
  "7.0":{male:"此命推来福不轻，何须愁虑苦劳心。荣华富贵已天定，正笏垂绅拜紫宸。",female:"此命推来福不轻，何须愁虑苦劳心。荣华富贵已天定，正笏垂绅拜紫宸。"},
  "7.1":{male:"此命生成大不同，公侯卿相在其中。一生自有逍遥福，富贵荣华极品隆。",female:"此命生成大不同，公侯卿相在其中。一生自有逍遥福，富贵荣华极品隆。"},
  "7.2":{male:"此命推来天下隆，必定人间一主公。富贵荣华数不尽，定为乾坤一蛟龙。",female:"此命推来天下隆，必定人间一主公。富贵荣华数不尽，定为乾坤一蛟龙。"},
};

function calcBoneWeight(yearGanZhi: string, monthZhi: string, day: number, hourZhi: string, gender: Gender): {total: string; details: string; poem: string; weightKey: string} | null {
  const yw = YEAR_BONE[yearGanZhi];
  if(yw===undefined) return null;
  const lunarMonth = ZHI_TO_MONTH[monthZhi];
  if(lunarMonth===undefined) return null;
  const mw = MONTH_BONE[lunarMonth];
  if(mw===undefined) return null;
  const dw = DAY_BONE[day] ?? DAY_BONE[15];
  const hIdx = ZHI_TO_HOUR[hourZhi];
  if(hIdx===undefined) return null;
  const hw = HOUR_BONE[hIdx];
  if(hw===undefined) return null;
  const total = yw + mw + dw + hw;
  const totalStr = total.toFixed(1);
  const details = `${yearGanZhi}年${yw}两 + ${monthZhi}月${mw}两 + ${day}日${dw}两 + ${hourZhi}时${hw}两`;
  const commentary = BONE_COMMENTARY[totalStr];
  const poem = commentary ? (gender==="male" ? commentary.male : commentary.female) : "暂无批语";
  return {total: totalStr, details, poem, weightKey: totalStr};
}

// ===== TabChart - 核心命盘 - 严格对标jishiyu =====
function TabChart({result,shensha,shengxiao,gender,lunarDateStr,solarDateStr,trueSolarStr,wangshuaiArr,onPillarClick}:{
  result:BaziResult;shensha:ReturnType<typeof calculateAllShenSha>|null;shengxiao:string;
  gender:Gender;lunarDateStr:string;solarDateStr:string;trueSolarStr:string;
  wangshuaiArr:{label:string;wx:string;bg:string}[]|null;
  onPillarClick:(label:string,gan:string,zhi:string,shishenGan:string,nayin:string,canggan:string[])=>void;
}){
  const pillars=result.pillars;
  const colLabels=["年柱","月柱","日柱","时柱"];
  const dayGan = result.dayGan as TianGan;

  // 计算每个柱的藏干+十神(全称) - v17.7 直接使用算法层预计算值
  const getCangGanWithShiShen = (p: BaziPillar, pillarIdx: number) => {
    const cg = p.canggan || [];
    return cg.map((g, idx) => {
      const wx = getGanWuxing(g as TianGan);
      let ssName = "";
      if (pillarIdx !== 2) {
        ssName = (p.shishen.zhi && p.shishen.zhi[idx]) || "";
      } else {
        ssName = idx === 0 ? (gender === "male" ? "元男" : "元女") : ((p.shishen.zhi && p.shishen.zhi[idx]) || "");
      }
      return { gan: g, wx, shishen: ssName, isDayMaster: pillarIdx === 2 && idx === 0 };
    });
  };

  // 天干十神(全称) - v17.7 直接使用算法层预计算值
  const getGanShishen = (p: BaziPillar, pillarIdx: number) => {
    if (pillarIdx === 2) return gender === "male" ? "元男" : "元女";
    return p.shishen.gan || "";
  };

  // 留意标签样式 - 粉色边框(参考jishiyu)
  const renderTipTag = (tip: {text:string; type:string|null}) => {
    return (
      <span
        key={tip.text}
        className="inline-block px-2 py-0.5 mr-1.5 mb-1 text-[15px] border"
        style={{
          borderColor: BRAND_PURPLE_LIGHT,
          color: BRAND_PURPLE,
          backgroundColor: BRAND_PURPLE_BG,
          borderRadius: "2px",
        }}
      >
        {tip.text}
      </span>
    );
  };

  const ganTips = getGanLiuYi(result);
  const zhiTips = getZhiLiuYi(result);

  return <div className="px-2 pt-2">
    {/* 头部信息卡 - 白底无圆角阴影 */}
    <div className="bg-white mb-2 px-3 py-3">
      <table className="w-full border-collapse"><colgroup><col width="22%"/><col width="78%"/></colgroup><tbody>
        <tr>
          <td rowSpan={3} className="text-center align-top pr-2 pt-1">
            <ShengxiaoIcon name={shengxiao} />
          </td>
          <td className="text-[17px] text-[#333] pb-1">
            农历：{lunarDateStr} <span className="text-[#9B5ECF] font-bold">({gender==="male"?"乾造":"坤造"})</span>
          </td>
        </tr>
        <tr>
          <td className="text-[17px] text-[#333] pb-1">北京时间：{solarDateStr}</td>
        </tr>
        <tr>
          <td className="text-[17px] text-[#333]">真太阳时：{trueSolarStr}</td>
        </tr>
      </tbody></table>
    </div>

    {/* 四柱命盘表格 - 白底无圆角阴影 */}
    <div className="bg-white mb-2 overflow-hidden">
      <table className="w-full border-collapse text-center table-fixed">
        <colgroup><col width="14%"/><col width="21.5%"/><col width="21.5%"/><col width="21.5%"/><col width="21.5%"/></colgroup>
        <tbody>
          {/* 标题行 */}
          <tr>
            <td className="py-[6px] px-1 text-[14px] text-[#666] font-medium align-middle">四柱</td>
            {colLabels.map((l,i)=>{
              const p = pillars[i];
              const ss = getGanShishen(p, i);
              const ny = p.nayin || getNaYin(p.ganzhi) || "-";
              const cg = p.canggan || [];
              return <td key={i} className="py-[6px] px-1 text-[14px] text-[#666] font-medium align-middle cursor-pointer hover:bg-[#F3EDF7]" style={{cursor:"pointer"}} onClick={()=>onPillarClick(l,p.gan,p.zhi,ss,ny,cg)}>{l}</td>;
            })}
          </tr>
          {/* 十神 - 黑色文字 */}
          <tr style={{backgroundColor:"#ffffff"}}>
            <td className="py-[5px] px-1 text-[14px] text-[#666] align-middle">十神</td>
            {pillars.map((p,i)=>{
              const ss = getGanShishen(p, i);
              const isDay = i === 2;
              return <td key={i} className="py-[5px] px-1 text-[15px] text-[#333]">
                {isDay
                  ? <span className="font-bold">{ss}</span>
                  : <span>{ss}</span>
                }
              </td>;
            })}
          </tr>
          {/* 天干 */}
          <tr style={{height:"44px", backgroundColor:"#ffffff"}}>
            <td className="py-[4px] px-1 text-[14px] text-[#666] align-middle">天干</td>
            {pillars.map((p,i)=>{
              const wx = getGanWuxing(p.gan as TianGan);
              return <td key={i} className="py-[4px] px-1 align-middle">
                <span className="font-black text-[28px] leading-none" style={{color: WX_COLORS[wx || "火"]}}>{p.gan}</span>
                <span className="text-[16px] ml-0.5">{WX_ICON[wx || "火"]}</span>
              </td>;
            })}
          </tr>
          {/* 地支 */}
          <tr style={{height:"44px", backgroundColor:"#ffffff"}}>
            <td className="py-[4px] px-1 text-[14px] text-[#666] align-middle">地支</td>
            {pillars.map((p,i)=>{
              const wx = getZhiWuxing(p.zhi as DiZhi);
              return <td key={i} className="py-[4px] px-1 align-middle">
                <span className="font-black text-[28px] leading-none" style={{color: WX_COLORS[wx || "火"]}}>{p.zhi}</span>
                <span className="text-[16px] ml-0.5">{WX_ICON[wx || "火"]}</span>
              </td>;
            })}
          </tr>
          {/* 藏干(带十神,同色) */}
          <tr style={{backgroundColor:"#ffffff"}}>
            <td className="py-[5px] px-1 text-[14px] text-[#666] align-top">藏干</td>
            {pillars.map((p,i)=>{
              const items = getCangGanWithShiShen(p, i);
              return <td key={i} className="py-[5px] px-1 align-top">
                {items.map((it,idx)=>{
                  return (
                    <div key={idx} className="leading-[24px]">
                      <span style={{color: WX_COLORS[it.wx || "火"], fontSize:"17px"}}>{it.gan}</span>
                      {it.shishen && <span style={{color: WX_COLORS[it.wx || "火"], fontSize:"15px", marginLeft:"2px"}}>{it.shishen}</span>}
                    </div>
                  );
                })}
              </td>;
            })}
          </tr>
          {/* 地势(长生十二神) */}
          <tr style={{backgroundColor:"#f8f8f8"}}>
            <td className="py-[5px] px-1 text-[14px] text-[#666] align-middle">地势</td>
            {pillars.map((p,i)=><td key={i} className="py-[5px] px-1 text-[15px] text-[#333] align-middle">
              {getZuoChangSheng(p)}
            </td>)}
          </tr>
          {/* 自坐(同是长生十二神) - v17.9 直接使用算法层预计算值 */}
          <tr style={{backgroundColor:"#ffffff"}}>
            <td className="py-[5px] px-1 text-[14px] text-[#666] align-middle">自坐</td>
            {pillars.map((p,i)=><td key={i} className="py-[5px] px-1 text-[15px] text-[#333] align-middle">
              {(p as any).zizuo || getChangSheng(p.gan as TianGan, p.zhi as DiZhi)}
            </td>)}
          </tr>
          {/* 空亡 - 仅日柱加红色虚线框 */}
          <tr style={{backgroundColor:"#f8f8f8"}}>
            <td className="py-[5px] px-1 text-[14px] text-[#666] align-middle">空亡</td>
            {pillars.map((p,i)=>{
              const xk = p.xunkong || getXunKong(p.ganzhi) || "";
              const isDay = i === 2;
              return <td key={i} className="py-[5px] px-1 text-[15px]">
                {xk
                  ? isDay
                    ? <span className="inline-block rounded px-1" style={{border:"2px dotted #9B5ECF", fontWeight:"bold"}}>{xk}</span>
                    : <span>{xk}</span>
                  : "-"
                }
              </td>;
            })}
          </tr>
          {/* 纳音 */}
          <tr style={{backgroundColor:"#ffffff"}}>
            <td className="py-[5px] px-1 text-[14px] text-[#666] align-middle">纳音</td>
            {pillars.map((p,i)=>{
              const ny = p.nayin || getNaYin(p.ganzhi) || "-";
              // 纳音五行取最后一个字
              const wx = ["金","木","水","火","土"].find(w => ny.includes(w));
              return <td key={i} className="py-[5px] px-1 text-[15px] align-middle" style={{color: wx ? WX_COLORS[wx] : "#333"}}>{ny}</td>;
            })}
          </tr>
          {/* 神煞 */}
          <tr style={{backgroundColor:"#f8f8f8"}}>
            <td className="py-[5px] px-1 text-[14px] text-[#666] align-top">神煞</td>
            {[0,1,2,3].map(i=>{
              const ss = getPillarShenshaNames(shensha, i);
              return <td key={i} className="py-[5px] px-1 text-[15px] align-top text-[#2e4487] leading-[22px]">
                {ss.length>0 ? ss.map((n,idx)=><div key={idx}>{n}</div>) : "-"}
              </td>;
            })}
          </tr>
        </tbody>
      </table>
    </div>

    {/* 五行旺衰条 - 无圆角,上小下大 */}
    {wangshuaiArr && <div className="grid grid-cols-5 text-center mb-2">
      {wangshuaiArr.map((item,i)=><div key={i} className="py-1.5 text-white" style={{background:item.bg}}>
        <div className="text-[14px]">{item.label}</div>
        <div className="font-bold text-[17px]">{item.wx}</div>
      </div>)}
    </div>}

    {/* 天干留意/地支留意 - 白底无圆角 */}
    <div className="bg-white mb-2 px-3 py-3">
      <div className="mb-2">
        <span className="text-[17px] font-bold text-[#333]">天干留意：</span>
        <span className="ml-1">
          {ganTips.length>0 ? ganTips.map(renderTipTag) : <span className="text-[#999] text-[17px]">(无)</span>}
        </span>
      </div>
      <div className="mb-2">
        <span className="text-[17px] font-bold text-[#333]">地支留意：</span>
        <span className="ml-1">
          {zhiTips.length>0 ? zhiTips.map(renderTipTag) : <span className="text-[#999] text-[17px]">(无)</span>}
        </span>
      </div>
      <div className="pt-1">
        <i className="text-[15px] text-[#2e4487] italic">* 提示：点击十神、神煞、纳音显示详情。</i>
      </div>
    </div>
  </div>;
}

// ===== TabBasic =====
function TabBasic({result,shengxiao,dateStr,lunarDateStr,solarDateStr,trueSolarStr,taiYuan,taiXi,mingGong,shenGong,mingGua,wuxingStats,boneWeight,gender}:{
  result:BaziResult;shengxiao:string;dateStr:string;lunarDateStr:string;solarDateStr:string;trueSolarStr:string;taiYuan:string;taiXi:string;mingGong:string;shenGong:string;mingGua:string;
  wuxingStats:Record<string,number>|null;boneWeight:ReturnType<typeof calcBoneWeight>;gender:Gender;
}){
  const rows:[string,string][]=[["农历",lunarDateStr],["北京时间",solarDateStr],["真太阳时",trueSolarStr],["出生节气",result.jieQiInfo?.prevJie||"立春"],["出生地区","北京地区"],["胎元",taiYuan],["胎息",taiXi],["命宫",mingGong],["身宫",shenGong],["命卦",mingGua]];
  return <div className="px-2 pt-2">
    <div className="bg-white mb-2 px-3 py-3">
      <table className="w-full border-collapse"><colgroup><col width="22%"/><col width="78%"/></colgroup><tbody>
        <tr><td rowSpan={10} className="text-center align-top pr-2 pt-1"><ShengxiaoIcon name={shengxiao} /></td><td className="text-[17px] text-[#333] pb-1">农历：{lunarDateStr}</td></tr>
        {rows.slice(0,0).map(([l,v],i)=><tr key={i}><td className="text-[13px] text-[#999] text-right pr-1 align-top">{l}：</td><td className="text-[13px] text-[#333]">{v}</td></tr>)}
        <tr><td className="text-[13px] text-[#999] text-right pr-1 align-top">胎元：</td><td className="text-[13px] text-[#333]">{taiYuan}</td></tr>
        <tr><td className="text-[13px] text-[#999] text-right pr-1 align-top">胎息：</td><td className="text-[13px] text-[#333]">{taiXi}</td></tr>
        <tr><td className="text-[13px] text-[#999] text-right pr-1 align-top">命宫：</td><td className="text-[13px] text-[#333]">{mingGong}</td></tr>
        <tr><td className="text-[13px] text-[#999] text-right pr-1 align-top">身宫：</td><td className="text-[13px] text-[#333]">{shenGong}</td></tr>
        <tr><td className="text-[13px] text-[#999] text-right pr-1 align-top">命卦：</td><td className="text-[13px] text-[#333]">{mingGua}</td></tr>
      </tbody></table>
    </div>
    <div className="bg-white mb-2 px-3 py-3">
      <div className="text-[16px] font-bold mb-2 text-[#333]">五行统计</div>
      {wuxingStats&&(()=>{const mx=Math.max(...Object.values(wuxingStats),1);
        return <div className="grid grid-cols-[30px_auto_75px] gap-y-1.5 gap-x-2.5 items-center">
          {(["金","木","水","火","土"] as const).map(wx=><div key={wx} className="contents">
            <div className="text-right text-[15px] font-medium" style={{color:WX_COLORS[wx]}}>{wx}</div>
            <div className="bg-[#f0f0f0] h-3 overflow-hidden"><div className="h-full transition-[width] duration-300" style={{width:Math.max(5,(wuxingStats[wx]/mx)*100)+"%",background:WX_COLORS[wx]}}/></div>
            <div className="text-right text-[15px] text-[#666] pr-1">{(wuxingStats[wx]||0).toFixed(1)}</div>
          </div>)}
        </div>;
      })()}
    </div>
    <div className="bg-white mb-2 px-3 py-3">
      <div className="text-[16px] font-bold mb-2 text-[#333]">袁天罡称骨算命</div>
      <table className="w-full border-collapse"><colgroup><col width="15%"/><col width="85%"/></colgroup><tbody>
        <tr><td className="text-[13px] text-[#999] text-right pr-1 align-top">骨重：</td><td className="text-[15px] text-[#333] font-bold">{boneWeight?boneWeight.total+"两":"--"}</td></tr>
        <tr><td className="text-[13px] text-[#999] text-right pr-1 align-top">组成：</td><td className="text-[13px] text-[#666]">{boneWeight?.details||"--"}</td></tr>
        <tr><td className="text-[13px] text-[#999] text-right pr-1 align-top">歌决：</td><td className="text-[13px] text-[#333]" style={{wordWrap:"break-word"}}>{boneWeight?.poem||"--"}</td></tr>
      </tbody></table>
    </div>
  </div>;
}

// ===== TabDetail 详盘 - 完整大运流年功能 =====
function TabDetail({result,gender}:{
  result:BaziResult;gender:Gender;
}){
  const pillars=result.pillars;
  const dayGan = result.dayGan as TianGan;
  const colLabels=["年柱","月柱","日柱","时柱"];
  const dayunData = result.dayun;
  const dayunList = dayunData?.dayunList || [];

  // 选中大运索引 (默认0 - 第一个大运)
  const [selectedDy, setSelectedDy] = useState(0);
  // 选中流年索引 (默认0 - 第1年)
  const [selectedLn, setSelectedLn] = useState(0);
  // 选中流月索引 (undefined = 未选中，隐藏流月列)
  const [selectedLy, setSelectedLy] = useState<number | undefined>(undefined);

  // 默认选中包含当前年份的大运
  useEffect(() => {
    if (!dayunList.length) return;
    const curYear = new Date().getFullYear();
    let found = 0;
    for (let i = 0; i < dayunList.length; i++) {
      const dy = dayunList[i];
      if (curYear >= dy.startYear && curYear < dy.startYear + 10) {
        found = i;
        setSelectedLn(curYear - dy.startYear);
        break;
      }
    }
    setSelectedDy(found);
  }, [dayunList.length > 0]);

  const handleDayunClick = (idx: number) => {
    setSelectedDy(idx);
    setSelectedLn(0); // 切换大运时重置流年到第1年
    setSelectedLy(undefined); // 切换大运时隐藏流月列
  };

  const handleLiunianClick = (idx: number) => {
    setSelectedLn(idx);
    setSelectedLy(undefined); // 切换流年时隐藏流月列
  };

  // 流月点击：toggle 选中/取消选中
  const handleLiuyueClick = (idx: number) => {
    setSelectedLy(idx === selectedLy ? undefined : idx);
  };

  const curDy = dayunList[selectedDy];
  const curLnList = curDy?.liunian || [];
  const curLn = curLnList[selectedLn];

  // 天干十神 - v17.7 直接使用算法层预计算值
  const getGanShishen = (p: BaziPillar, pillarIdx: number) => {
    if (pillarIdx === 2) return gender === "male" ? "元男" : "元女";
    return p.shishen.gan || "";
  };
  // 藏干十神 - v17.7 直接使用算法层预计算值
  const getCangGanWithShiShen = (p: BaziPillar, pillarIdx: number) => {
    const cg = p.canggan || [];
    return cg.map((g, idx) => {
      const wx = getGanWuxing(g as TianGan);
      let ssName = "";
      if (pillarIdx !== 2) {
        ssName = (p.shishen.zhi && p.shishen.zhi[idx]) || "";
      } else {
        ssName = idx === 0 ? (gender === "male" ? "元男" : "元女") : ((p.shishen.zhi && p.shishen.zhi[idx]) || "");
      }
      return { gan: g, wx, shishen: ssName };
    });
  };

  // 吉凶判定（简单版：根据十神和五行生克）
  const getJixiong = (ln: any) => {
    if (!ln) return { text: "平", color: "#888" };
    const ss = ln.shishenGan || "";
    if (["正财","偏财","正官","七杀","正印","偏印"].includes(ss)) return { text: "吉", color: "#16a34a" };
    if (["食神","伤官"].includes(ss)) return { text: "平", color: "#d97706" };
    if (["比肩","劫财"].includes(ss)) return { text: "平", color: "#888" };
    return { text: "平", color: "#888" };
  };

  // ===== 流月计算(五虎遁) =====
  const liuyueList = useMemo(() => {
    if (!curLn) return [];
    // 五虎遁: 年干定寅月天干
    // 甲己→丙寅, 乙庚→戊寅, 丙辛→庚寅, 丁壬→壬寅, 戊癸→甲寅
    const wuHuDun: Record<string, string> = {
      "甲":"丙","己":"丙",
      "乙":"戊","庚":"戊",
      "丙":"庚","辛":"庚",
      "丁":"壬","壬":"壬",
      "戊":"甲","癸":"甲",
    };
    const ganOrder: TianGan[] = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
    const zhiOrder: DiZhi[] = ["寅","卯","辰","巳","午","未","申","酉","戌","亥","子","丑"];
    const jieqiList = ["立春","惊蛰","清明","立夏","芒种","小暑","立秋","白露","寒露","立冬","大雪","小寒"];
    const dateList = ["2/4","3/5","4/5","5/5","6/5","7/7","8/7","9/7","10/8","11/7","12/7","1/5"];
    const startGan = wuHuDun[curLn.gan] || "丙";
    const startGanIdx = ganOrder.indexOf(startGan as TianGan);
    const list: Array<{
      gan: TianGan; zhi: DiZhi; jieqi: string; date: string;
      shishenGan: string;
      wuxing: { gan: string; zhi: string };
    }> = [];
    for (let m = 0; m < 12; m++) {
      const gan = ganOrder[(startGanIdx + m) % 10] as TianGan;
      const zhi = zhiOrder[m] as DiZhi;
      const ganWx = getGanWuxing(gan) || "火";
      const zhiWx = getZhiWuxing(zhi) || "火";
      const ss = getShiShen(dayGan, gan) || "";
      list.push({
        gan, zhi,
        jieqi: jieqiList[m],
        date: dateList[m],
        shishenGan: ss,
        wuxing: { gan: ganWx, zhi: zhiWx },
      });
    }
    return list;
  }, [curLn?.ganzhi, dayGan]);

  // 当前选中流月
  const curLy = useMemo(() => {
    if (selectedLy === undefined || !curLn) return undefined;
    return liuyueList[selectedLy];
  }, [selectedLy, curLn, liuyueList]);

  // ===== 统一显示柱数组：基础4柱 + 选中大运(第5列) + 选中流年(第6列) + 选中流月(第7列) =====
  type DisplayPillar = {
    label: string;
    sublabel?: string;
    gan: TianGan;
    zhi: DiZhi;
    ganzhi: string;
    shishenGan: string;
    shishenZhi: string[];
    canggan: TianGan[];
    nayin: string;
    xunkong: string;
    zuo: string;
    isDayPillar: boolean;
    isDayun?: boolean;
    isLiunian?: boolean;
    isLiuyue?: boolean;
  };

  const displayPillars: DisplayPillar[] = useMemo(() => {
    const base: DisplayPillar[] = pillars.map((p, i) => ({
      label: colLabels[i],
      gan: p.gan as TianGan,
      zhi: p.zhi as DiZhi,
      ganzhi: p.ganzhi,
      shishenGan: getGanShishen(p, i),
      shishenZhi: p.shishenShort?.zhi || [],
      canggan: p.canggan || [],
      nayin: p.nayin || getNaYin(p.ganzhi) || "-",
      xunkong: p.xunkong || getXunKong(p.ganzhi) || "",
      zuo: getZuoChangSheng(p),
      isDayPillar: i === 2,
    }));

    // 大运列（第5列）
    if (curDy) {
      const dyGanzhi = curDy.gan + curDy.zhi;
      base.push({
        label: "大运",
        sublabel: `${Math.floor(curDy.startAge)}-${Math.floor(curDy.startAge)+9}岁`,
        gan: curDy.gan as TianGan,
        zhi: curDy.zhi as DiZhi,
        ganzhi: dyGanzhi,
        shishenGan: curDy.shishenGan || getShiShen(dayGan, curDy.gan as TianGan) || "",
        shishenZhi: [],
        canggan: curDy.canggan || getCangGan(curDy.zhi as DiZhi) || [],
        nayin: curDy.nayin || getNaYin(dyGanzhi) || "",
        xunkong: getXunKong(dyGanzhi) || "",
        zuo: getChangSheng(dayGan, curDy.zhi as DiZhi),
        isDayPillar: false,
        isDayun: true,
      });
    }

    // 流年列（第6列）
    if (curLn && curDy) {
      const lnGanzhi = curLn.gan + curLn.zhi;
      base.push({
        label: "流年",
        sublabel: `${curLn.year}年`,
        gan: curLn.gan as TianGan,
        zhi: curLn.zhi as DiZhi,
        ganzhi: lnGanzhi,
        shishenGan: curLn.shishenGan || getShiShen(dayGan, curLn.gan as TianGan) || "",
        shishenZhi: [],
        canggan: curLn.canggan || getCangGan(curLn.zhi as DiZhi) || [],
        nayin: curLn.nayin || getNaYin(lnGanzhi) || "",
        xunkong: getXunKong(lnGanzhi) || "",
        zuo: getChangSheng(dayGan, curLn.zhi as DiZhi),
        isDayPillar: false,
        isLiunian: true,
      });
    }

    // 流月列（第7列）
    if (curLy !== undefined && curLn) {
      const lyGanzhi = curLy.gan + curLy.zhi;
      base.push({
        label: "流月",
        sublabel: `${curLy.jieqi}`,
        gan: curLy.gan as TianGan,
        zhi: curLy.zhi as DiZhi,
        ganzhi: lyGanzhi,
        shishenGan: curLy.shishenGan || getShiShen(dayGan, curLy.gan as TianGan) || "",
        shishenZhi: [],
        canggan: getCangGan(curLy.zhi as DiZhi) || [],
        nayin: getNaYin(lyGanzhi) || "",
        xunkong: getXunKong(lyGanzhi) || "",
        zuo: getChangSheng(dayGan, curLy.zhi as DiZhi),
        isDayPillar: false,
        isLiuyue: true,
      });
    }

    return base;
  }, [pillars, curDy, curLn, curLy, dayGan, gender]);

  // 藏干+十神（统一用于基础柱/大运/流年）- v17.7 基础柱使用预计算值
  const getCgSs = (dp: DisplayPillar) => {
    return dp.canggan.map((g, idx) => {
      const wx = getGanWuxing(g as TianGan);
      let ssName = "";
      if (dp.isDayPillar) {
        ssName = idx === 0 ? (gender === "male" ? "元男" : "元女") : ((dp.shishenZhi && dp.shishenZhi[idx]) || "");
      } else if (dp.isDayun || dp.isLiunian || dp.isLiuyue) {
        ssName = getShiShen(dayGan, g as TianGan) || "";
      } else {
        ssName = (dp.shishenZhi && dp.shishenZhi[idx]) || "";
      }
      return { gan: g, wx, shishen: ssName };
    });
  };

  // 动态列宽
  const numPillars = displayPillars.length;
  const labelWidth = numPillars <= 4 ? "14%" : numPillars === 5 ? "12%" : numPillars === 6 ? "11%" : "9%";
  const pillarWidth = `${(100 - parseFloat(labelWidth)) / numPillars}%`;
  const ganzhiFontSize = numPillars <= 4 ? "26px" : numPillars === 5 ? "22px" : numPillars === 6 ? "20px" : "18px";
  const cgFontSize = numPillars <= 4 ? "15px" : numPillars === 5 ? "13px" : numPillars === 6 ? "12px" : "11px";
  const cgSsFontSize = numPillars <= 4 ? "13px" : numPillars === 5 ? "11px" : numPillars === 6 ? "10px" : "9px";
  const cgLineHeight = numPillars <= 4 ? "22px" : numPillars === 5 ? "19px" : numPillars === 6 ? "17px" : "15px";

  return <div className="px-2 pt-2 pb-4">
    {/* 四柱详盘表格 - 白底无圆角阴影，对标jishiyu，支持4/5/6/7列动态 */}
    <div className="bg-white mb-2 overflow-hidden">
      <table className="w-full border-collapse text-center table-fixed">
        <colgroup>
          <col width={labelWidth}/>
          {displayPillars.map((_, i) => <col key={i} width={pillarWidth}/>)}
        </colgroup>
        <tbody>
          {/* 四柱列头 */}
          <tr>
            <td className="py-[6px] px-1 text-[13px] text-[#666] font-medium">四柱</td>
            {displayPillars.map((dp, i) => (
              <td key={i} className="py-[6px] px-1 text-[13px] text-[#666] font-medium leading-tight">
                <div>{dp.label}</div>
                {dp.sublabel && <div className="text-[11px] text-[#999] font-normal mt-[1px]">{dp.sublabel}</div>}
              </td>
            ))}
          </tr>
          {/* 十神 - 黑色字，仅日柱加粗 */}
          <tr style={{backgroundColor:"#fff"}}>
            <td className="py-[5px] px-1 text-[13px] text-[#666]">十神</td>
            {displayPillars.map((dp, i) => (
              <td key={i} className="py-[5px] px-1 text-[14px] text-[#333]">
                {dp.isDayPillar
                  ? <span className="font-bold">{dp.shishenGan}</span>
                  : <span>{dp.shishenGan}</span>}
              </td>
            ))}
          </tr>
          {/* 天干 */}
          <tr style={{height:"42px", backgroundColor:"#fff"}}>
            <td className="py-[3px] px-1 text-[13px] text-[#666] align-middle">天干</td>
            {displayPillars.map((dp, i) => (
              <td key={i} className="py-[3px] px-1 align-middle">
                <span className="font-black leading-none" style={{color:WX_COLORS[getGanWuxing(dp.gan)||"火"],fontSize:ganzhiFontSize}}>{dp.gan}</span>
              </td>
            ))}
          </tr>
          {/* 地支 */}
          <tr style={{height:"42px", backgroundColor:"#fff"}}>
            <td className="py-[3px] px-1 text-[13px] text-[#666] align-middle">地支</td>
            {displayPillars.map((dp, i) => (
              <td key={i} className="py-[3px] px-1 align-middle">
                <span className="font-black leading-none" style={{color:WX_COLORS[getZhiWuxing(dp.zhi)||"火"],fontSize:ganzhiFontSize}}>{dp.zhi}</span>
              </td>
            ))}
          </tr>
          {/* 藏干 */}
          <tr style={{backgroundColor:"#fff"}}>
            <td className="py-[4px] px-1 text-[13px] text-[#666] align-top">藏干</td>
            {displayPillars.map((dp, i) => (
              <td key={i} className="py-[4px] px-1 align-top">
                {getCgSs(dp).map((it, idx) => (
                  <div key={idx} style={{lineHeight:cgLineHeight}}>
                    <span style={{color:WX_COLORS[it.wx||"火"],fontSize:cgFontSize}}>{it.gan}</span>
                    {it.shishen && <span style={{color:WX_COLORS[it.wx||"火"],fontSize:cgSsFontSize,marginLeft:"1px"}}>{it.shishen}</span>}
                  </div>
                ))}
              </td>
            ))}
          </tr>
          {/* 地势 */}
          <tr style={{backgroundColor:"#f8f8f8"}}>
            <td className="py-[4px] px-1 text-[13px] text-[#666]">地势</td>
            {displayPillars.map((dp, i) => (
              <td key={i} className="py-[4px] px-1 text-[14px] text-[#333]">{dp.zuo}</td>
            ))}
          </tr>
          {/* 空亡 - 仅日柱虚线框 */}
          <tr style={{backgroundColor:"#fff"}}>
            <td className="py-[4px] px-1 text-[13px] text-[#666]">空亡</td>
            {displayPillars.map((dp, i) => (
              <td key={i} className="py-[4px] px-1 text-[14px]">
                {dp.xunkong
                  ? (dp.isDayPillar
                    ? <span className="inline-block px-1" style={{border:"2px dotted "+BRAND_PURPLE_LIGHT,fontWeight:"bold"}}>{dp.xunkong}</span>
                    : <span>{dp.xunkong}</span>)
                  : "-"}
              </td>
            ))}
          </tr>
          {/* 纳音 */}
          <tr style={{backgroundColor:"#f8f8f8"}}>
            <td className="py-[4px] px-1 text-[13px] text-[#666]">纳音</td>
            {displayPillars.map((dp, i) => {
              const ny = dp.nayin || "-";
              const wx = ["金","木","水","火","土"].find(w => ny.includes(w));
              return <td key={i} className="py-[4px] px-1 text-[14px]" style={{color:wx?WX_COLORS[wx]:"#333"}}>{ny}</td>;
            })}
          </tr>
        </tbody>
      </table>
    </div>

    {/* ===== 大运流年模块 - 无横向滚动，flex等分布局 ===== */}
    {dayunList.length>0 && <div className="bg-white mb-2">
      {/* 起运信息行 */}
      <div style={{backgroundColor:"#f8f8f8", padding:"5px 8px", fontSize:"12px", color:"#666"}}>
        {dayunData?.qiyunText || `出生后${dayunData?.startAge||0}岁起运（${dayunData?.direction||'顺排'}）`}
      </div>

      {/* 大运行 */}
      <div className="flex" style={{borderBottom:"1px solid #ccc"}}>
        {/* 左侧标签 */}
        <div className="shrink-0 flex flex-col items-center justify-center text-center font-bold" style={{width:"28px", lineHeight:"20px", fontSize:"12px", color:"#333", borderRight:"1px solid #ccc"}}>
          <div>大</div><div>运</div>
        </div>
        {/* 右侧cells - flex等分布局，无滚动 */}
        <div className="flex-1 flex" style={{overflow:"hidden"}}>
          {dayunList.map((dy,i)=>{
            const isActive = i === selectedDy;
            const ganWx = dy.wuxing?.gan || getGanWuxing(dy.gan as TianGan) || "火";
            const zhiWx = dy.wuxing?.zhi || getZhiWuxing(dy.zhi as DiZhi) || "火";
            return (
              <div
                key={i}
                data-dy-idx={i}
                onClick={()=>handleDayunClick(i)}
                className="flex-1 text-center cursor-pointer"
                style={{
                  padding:"3px 1px",
                  borderLeft: i===0?"none":"1px solid #ccc",
                  backgroundColor: isActive ? "#e2e2e2" : "#fff",
                  fontWeight: isActive ? "bold" : "normal",
                  lineHeight:"18px",
                  fontSize:"12px",
                }}
              >
                <div style={{fontSize:"9px", color:"#555", lineHeight:"12px"}}>
                  {Math.floor(dy.startAge)}岁
                </div>
                <div style={{fontSize:"9px", color:"#555", lineHeight:"12px"}}>{dy.startYear}</div>
                <div style={{fontSize:"14px", fontWeight:"bold", lineHeight:"18px", color:WX_COLORS[ganWx]}}>{dy.gan}</div>
                <div style={{fontSize:"10px", color:BRAND_PURPLE_LIGHT, lineHeight:"13px"}}>{dy.shishenGan}</div>
                <div style={{fontSize:"14px", fontWeight:"bold", lineHeight:"18px", color:WX_COLORS[zhiWx]}}>{dy.zhi}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 流年行 - 当前选中大运的10个流年 */}
      {curLnList.length>0 && <div className="flex" style={{borderBottom:"1px solid #e0e0e0"}}>
        <div className="shrink-0 flex flex-col items-center justify-center text-center font-bold" style={{width:"28px", lineHeight:"20px", fontSize:"12px", color:"#333", borderRight:"1px solid #ccc"}}>
          <div>流</div><div>年</div>
        </div>
        <div className="flex-1 flex" style={{overflow:"hidden"}}>
          {curLnList.map((ln,j)=>{
            const isActive = j === selectedLn;
            const ganWx = ln.wuxing?.gan || getGanWuxing(ln.gan as TianGan) || "火";
            const zhiWx = ln.wuxing?.zhi || getZhiWuxing(ln.zhi as DiZhi) || "火";
            return (
              <div
                key={j}
                onClick={()=>handleLiunianClick(j)}
                className="flex-1 text-center cursor-pointer"
                style={{
                  padding:"2px 0",
                  borderLeft: "1px solid #eee",
                  backgroundColor: isActive ? "#e2e2e2" : "#fff",
                  fontWeight: isActive ? "bold" : "normal",
                }}
              >
                <div style={{fontSize:"9px", color:"#555", lineHeight:"11px"}}>{ln.year%100}</div>
                <div style={{fontSize:"9px", color:"#888", lineHeight:"11px"}}>{Math.floor(ln.age)}岁</div>
                <div style={{fontSize:"13px", fontWeight:"bold", lineHeight:"16px", color:WX_COLORS[ganWx]}}>{ln.gan}</div>
                <div style={{fontSize:"9px", color:"#333", lineHeight:"11px"}}>{ln.shishenGan}</div>
                <div style={{fontSize:"13px", fontWeight:"bold", lineHeight:"16px", color:WX_COLORS[zhiWx]}}>{ln.zhi}</div>
              </div>
            );
          })}
        </div>
      </div>}

      {/* 流月行 - 当前选中流年的12个月 */}
      {curLn && liuyueList.length>0 && <div className="flex" style={{borderBottom:"1px solid #e0e0e0"}}>
        <div className="shrink-0 flex flex-col items-center justify-center text-center font-bold" style={{width:"28px", lineHeight:"18px", fontSize:"12px", color:"#333", borderRight:"1px solid #ccc"}}>
          <div>流</div><div>月</div>
        </div>
        <div className="flex-1 flex" style={{overflow:"hidden"}}>
          {liuyueList.map((ly,j)=>{
            const isActive = j === selectedLy;
            const ganWx = ly.wuxing?.gan || getGanWuxing(ly.gan as TianGan) || "火";
            return (
              <div
                key={j}
                data-ly-idx={j}
                onClick={()=>handleLiuyueClick(j)}
                className="flex-1 text-center cursor-pointer"
                style={{
                  padding:"2px 0",
                  borderLeft: "1px solid #f0f0f0",
                  backgroundColor: isActive ? "#e2e2e2" : "#fff",
                  cursor: "pointer",
                }}
              >
                <div style={{fontSize:"9px", color:"#555", lineHeight:"11px"}}>{ly.jieqi}</div>
                <div style={{fontSize:"8px", color:"#999", lineHeight:"10px"}}>{ly.date}</div>
                <div style={{fontSize:"12px", fontWeight:"bold", lineHeight:"15px", color:WX_COLORS[ganWx]}}>{ly.gan}</div>
                <div style={{fontSize:"8px", color:"#333", lineHeight:"10px"}}>{ly.shishenGan}</div>
                <div style={{fontSize:"12px", fontWeight:"bold", lineHeight:"15px", color:WX_COLORS[getZhiWuxing(ly.zhi as DiZhi)||"火"]}}>{ly.zhi}</div>
              </div>
            );
          })}
        </div>
      </div>}

      {/* 选中流年详情 */}
      {curLn && <div className="px-3 py-3" style={{backgroundColor:BRAND_PURPLE_BG}}>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[16px] font-bold" style={{color:BRAND_PURPLE}}>{curLn.ganzhi}年</span>
          <span className="text-[13px] text-[#666]">{curLn.year}年 · {Math.floor(curLn.age)}岁 · 属{curLn.shengxiao}</span>
          <span className="ml-auto text-[13px] px-2 py-0.5 rounded" style={{backgroundColor:BRAND_PURPLE,color:"#fff"}}>{getJixiong(curLn).text}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[13px] text-[#333]">
          <div>纳音五行：<span style={{color:WX_COLORS[curLn.wuxing?.gan||"火"]}}>{curLn.nayin}</span></div>
          <div>天干十神：<span style={{color:BRAND_PURPLE}}>{curLn.shishenGan}</span></div>
          <div>流年天干：<span style={{color:WX_COLORS[curLn.wuxing?.gan||"火"]}}>{curLn.gan}（{curLn.wuxing?.gan}）</span></div>
          <div>流年地支：<span style={{color:WX_COLORS[curLn.wuxing?.zhi||"火"]}}>{curLn.zhi}（{curLn.wuxing?.zhi}）</span></div>
          <div>与日主关系：{curLn.shishenGan}{WUXING_SHENG[dayGan ? getGanWuxing(dayGan) : "火"]?.includes(curLn.wuxing?.gan) ? " · 生我" : ""}</div>
          <div>地支藏干：{curLn.canggan?.join(" ") || "-"}</div>
        </div>
        <div className="mt-2 pt-2" style={{borderTop:"1px dashed "+BRAND_PURPLE_BORDER}}>
          <div className="text-[12px] text-[#888] leading-[1.8]">
            {curLn.year}年为{curLn.ganzhi}年，{curLn.shengxiao}年，纳音{curLn.nayin}。
            流年天干{curLn.gan}为日主之{curLn.shishenGan}，{curLn.wuxing?.gan}性；地支{curLn.zhi}属{curLn.wuxing?.zhi}。
            {curLn.shishenGan==="正财"||curLn.shishenGan==="偏财"?"财运方面有所动向，宜把握机会。":""}
            {curLn.shishenGan==="正官"||curLn.shishenGan==="七杀"?"事业压力与机遇并存，注意人际关系。":""}
            {curLn.shishenGan==="正印"||curLn.shishenGan==="偏印"?"学业贵人有助，利进修学习。":""}
            {curLn.shishenGan==="食神"||curLn.shishenGan==="伤官"?"才华发挥，创意表达，但需防口舌。":""}
            {curLn.shishenGan==="比肩"||curLn.shishenGan==="劫财"?"竞争较多，合作需谨慎，破财之象需留意。":""}
          </div>
        </div>
      </div>}
    </div>}

    {/* 五行旺衰条 - 金色/棕色底, 对标参考页 */}
    {(() => {
      // 计算月令五行旺衰
      const monthZhi = pillars[1]?.zhi as DiZhi;
      const monthWx = getZhiWuxing(monthZhi) || "火";
      const WX_SEQ = ["木","火","土","金","水"] as const;
      const wxStatus: Record<string, {label:string; wx:string; bg:string}> = {};
      // 旺相休囚死: 月令同行为旺, 我生为相, 生我为休, 克我为囚, 我克为死
      const shengMap: Record<string,string> = {"木":"火","火":"土","土":"金","金":"水","水":"木"};
      const keMap: Record<string,string> = {"木":"土","火":"金","土":"水","金":"木","水":"火"};
      const shengWoMap: Record<string,string> = {"木":"水","火":"木","土":"火","金":"土","水":"金"};
      const keWoMap: Record<string,string> = {"木":"金","火":"水","土":"木","金":"火","水":"土"};
      wxStatus[monthWx] = {label:"旺", wx:monthWx, bg:"#B8860B"};
      if(shengMap[monthWx]) wxStatus[shengMap[monthWx]] = {label:"相", wx:shengMap[monthWx], bg:"#CD853F"};
      if(shengWoMap[monthWx]) wxStatus[shengWoMap[monthWx]] = {label:"休", wx:shengWoMap[monthWx], bg:"#D2B48C"};
      if(keWoMap[monthWx]) wxStatus[keWoMap[monthWx]] = {label:"囚", wx:keWoMap[monthWx], bg:"#C4A77D"};
      if(keMap[monthWx]) wxStatus[keMap[monthWx]] = {label:"死", wx:keMap[monthWx], bg:"#DAA520"};
      return (
        <div className="grid grid-cols-5 mb-2" style={{borderTop:"1px solid #D2B48C", borderBottom:"1px solid #D2B48C"}}>
          {WX_SEQ.map(wx=>{
            const st = wxStatus[wx] || {label:"", wx, bg:"#C4A77D"};
            return <div key={wx} className="py-1.5 text-center text-white text-[15px] font-bold" style={{background:st.bg}}>
              {wx}{st.label}
            </div>;
          })}
        </div>
      );
    })()}

    {/* 天干留意/地支留意 - 参考页底部分析 */}
    <div className="bg-white mb-2 px-3 py-2">
      <div className="text-[13px] text-[#333] leading-[1.8]">
        {(() => {
          const yg = pillars[0]?.gan; const yz = pillars[0]?.zhi;
          const mg = pillars[1]?.gan; const mz = pillars[1]?.zhi;
          const dg = pillars[2]?.gan; const dz = pillars[2]?.zhi;
          const hg = pillars[3]?.gan; const hz = pillars[3]?.zhi;
          const tips: string[] = [];
          // 天干五合
          const ganHe: [string,string,string][] = [["甲","己","土"],["乙","庚","金"],["丙","辛","水"],["丁","壬","木"],["戊","癸","火"]];
          const allGan = [yg,mg,dg,hg].filter(Boolean);
          for(const [a,b,res] of ganHe) {
            if(allGan.includes(a as any) && allGan.includes(b as any)) tips.push(`${a}${b}合化${res}`);
          }
          // 天干相克
          const kePairs: [string,string][] = [["甲","戊"],["乙","己"],["丙","庚"],["丁","辛"],["戊","壬"],["己","癸"],["庚","甲"],["辛","乙"],["壬","丙"],["癸","丁"]];
          for(const [a,b] of kePairs) {
            if(allGan.includes(a as any) && allGan.includes(b as any)) tips.push(`${a}${b}相克`);
          }
          return tips.length ? tips.join("；") : "天干组合平稳。";
        })()}
      </div>
    </div>

    {/* 大运列表(纵向详细) - 附加完整信息 */}
    {dayunList.length>0 && <div className="bg-white mb-2 overflow-hidden">
      <div className="px-3 py-2 text-[14px] font-bold text-[#333]" style={{borderBottom:"1px solid #eee"}}>大运总览</div>
      <div>
        {dayunList.map((dy,i)=>{
          const isActive = i===selectedDy;
          const ganWx = dy.wuxing?.gan || getGanWuxing(dy.gan as TianGan) || "火";
          const zhiWx = dy.wuxing?.zhi || getZhiWuxing(dy.zhi as DiZhi) || "火";
          return (
            <div
              key={i}
              onClick={()=>handleDayunClick(i)}
              className="flex items-center px-3 py-2 cursor-pointer"
              style={{
                borderBottom:"1px solid #f0f0f0",
                backgroundColor: isActive ? BRAND_PURPLE_BG : "#fff",
              }}
            >
              <div className="text-[12px] text-[#666] w-16 shrink-0">
                {Math.floor(dy.startAge)}-{Math.floor(dy.startAge)+9}岁
              </div>
              <div className="text-[12px] text-[#888] w-16 shrink-0">
                {dy.startYear}-{dy.startYear+9}
              </div>
              <div className="flex-1 flex items-center gap-1">
                <span className="text-[18px] font-black" style={{color:WX_COLORS[ganWx]}}>{dy.gan}</span>
                <span className="text-[12px]" style={{color:BRAND_PURPLE_LIGHT}}>{dy.shishenGan}</span>
                <span className="text-[18px] font-black" style={{color:WX_COLORS[zhiWx]}}>{dy.zhi}</span>
              </div>
              <div className="text-[12px] text-[#666]">{dy.nayin}</div>
              {isActive && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded" style={{backgroundColor:BRAND_PURPLE,color:"#fff"}}>当前</span>}
            </div>
          );
        })}
      </div>
    </div>}
  </div>;
}

// ===== TabJingpi 八字精批 =====
function TabJingpi({result,gender,wuxingStats}:{
  result:BaziResult;gender:Gender;wuxingStats:Record<string,number>|null;
}){
  const dayGan = result.dayGan as TianGan;
  const dayZhi = result.dayZhi as DiZhi;
  const dayGanWx = getGanWuxing(dayGan) || "火";
  const dayunList = result.dayun?.dayunList || [];
  const mainPattern = result.mainPattern || "";
  const patternType = result.patternType || "";
  const shenQiangRuo = result.shenQiangRuo;

  // 五行强弱文字分析
  const getWuxingAnalysis = () => {
    if(!wuxingStats) return "暂无五行统计数据。";
    const entries = Object.entries(wuxingStats).sort((a,b)=>b[1]-a[1]);
    const strongest = entries[0];
    const weakest = entries[entries.length-1];
    const missing = entries.filter(([,v])=>v===0).map(([k])=>k);
    let text = `八字五行中，${strongest[0]}最旺（${strongest[1].toFixed(1)}分），${weakest[0]}最弱（${weakest[1].toFixed(1)}分）。`;
    if(missing.length>0) text += `八字缺${missing.join("、")}。`;
    if(shenQiangRuo){
      text += `综合判定为${shenQiangRuo.result}（综合得分${shenQiangRuo.totalScore}分）。`;
    }
    return text;
  };

  // 十神格局分析
  const getPatternAnalysis = () => {
    let text = "";
    if(mainPattern){
      text += `命局为${mainPattern}（${patternType}）。`;
    }
    const monthZhi = result.pillars[1]?.zhi as DiZhi;
    const monthZhiWx = getZhiWuxing(monthZhi) || "";
    text += `月令${monthZhi}（${monthZhiWx}），日干${dayGan}（${dayGanWx}）生于${monthZhi}月。`;
    // 有利十神
    const favorableSs = shenQiangRuo?.result === "身强"
      ? "官杀、财星、食伤（克泄耗）"
      : shenQiangRuo?.result === "身弱"
        ? "印星、比劫（生扶）"
        : "均可，以中和为贵";
    text += `喜用方向：${favorableSs}有利。`;
    return text;
  };

  // 大运流年趋势
  const getDayunTrend = () => {
    if(!dayunList.length) return "暂无大运数据。";
    const curYear = new Date().getFullYear();
    let curDy = dayunList.find(dy=>curYear>=dy.startYear && curYear<dy.startYear+10);
    if(!curDy) curDy = dayunList[0];
    const ganWx = curDy.wuxing?.gan || getGanWuxing(curDy.gan as TianGan) || "";
    const zhiWx = curDy.wuxing?.zhi || getZhiWuxing(curDy.zhi as DiZhi) || "";
    let trend = `当前行${curDy.ganzhi}大运（${Math.floor(curDy.startAge)}-${Math.floor(curDy.startAge)+9}岁，${curDy.startYear}-${curDy.startYear+9}年），天干${curDy.gan}（${ganWx}），地支${curDy.zhi}（${zhiWx}），纳音${curDy.nayin}。`;
    // 判断吉凶
    const ss = curDy.shishenGan || "";
    if(["正财","偏财"].includes(ss)) trend += "财运活跃，求财机会较多。";
    else if(["正官","七杀"].includes(ss)) trend += "事业压力与机遇并存，有升职或变动之机。";
    else if(["正印","偏印"].includes(ss)) trend += "学业贵人有助，利学习进修，长辈助力。";
    else if(["食神","伤官"].includes(ss)) trend += "才华发挥，创意丰富，但需防口舌是非。";
    else if(["比肩","劫财"].includes(ss)) trend += "竞争较多，合作需谨慎，注意财务支出。";
    return trend;
  };

  // 事业财运婚姻简评
  const getLifeCommentary = () => {
    const dayGanSs = (gan: TianGan) => getShiShen(dayGan, gan) || "";
    const pillars = result.pillars;
    let careerText = "";
    let wealthText = "";
    let marriageText = "";

    // 事业看官杀
    const hasGuanSha = pillars.some(p => {
      const ss = dayGanSs(p.gan as TianGan);
      return ["正官","七杀"].includes(ss);
    });
    careerText = hasGuanSha ? "命局带官杀，有事业心，适合管理岗位或公职发展。" : "命局官杀不显，适合自由职业或专业技术路线。";

    // 财运看财星
    const hasCai = pillars.some(p => {
      const ss = dayGanSs(p.gan as TianGan);
      return ["正财","偏财"].includes(ss);
    });
    wealthText = hasCai ? "命局财星透出，财运较好，善理财。" : "命局财星不显，财来财去，宜稳定收入。";

    // 婚姻看日支
    const dayZhiSs = (() => {
      const cg = getCangGan(dayZhi) || [];
      if(cg.length===0) return "";
      return getShiShen(dayGan, cg[0] as TianGan) || "";
    })();
    marriageText = `日支${dayZhi}为配偶宫，${dayZhiSs?`藏干${dayZhiSs}`:"配偶宫平稳"}。${gender==="male"?"财星为妻，注意财星旺衰。":"官杀为夫，看官杀格局。"}`;

    return { careerText, wealthText, marriageText };
  };

  const lifeCommentary = getLifeCommentary();

  return <div className="px-2 pt-2">
    {/* 五行强弱分析 */}
    <div className="bg-white mb-2 px-3 py-3">
      <div className="text-[16px] font-bold mb-2 text-[#333]">五行强弱分析</div>
      <div className="text-[13px] text-[#333] leading-[1.8]">
        {getWuxingAnalysis()}
      </div>
      {wuxingStats && <div className="mt-2 grid grid-cols-5 gap-1 text-center">
        {(["金","木","水","火","土"] as const).map(wx=>(
          <div key={wx} className="py-1" style={{backgroundColor:WX_COLORS[wx]+"22", borderRadius:"3px"}}>
            <div style={{color:WX_COLORS[wx], fontSize:"14px", fontWeight:"bold"}}>{wx}</div>
            <div style={{color:WX_COLORS[wx], fontSize:"12px"}}>{(wuxingStats[wx]||0).toFixed(1)}</div>
          </div>
        ))}
      </div>}
    </div>

    {/* 十神格局分析 */}
    <div className="bg-white mb-2 px-3 py-3">
      <div className="text-[16px] font-bold mb-2 text-[#333]">十神格局分析</div>
      <div className="text-[13px] text-[#333] leading-[1.8]">
        {getPatternAnalysis()}
      </div>
      {mainPattern && <div className="mt-2 px-2 py-1 text-center" style={{backgroundColor:BRAND_PURPLE_BG, color:BRAND_PURPLE, borderRadius:"3px", fontSize:"14px", fontWeight:"bold"}}>
        {mainPattern}
      </div>}
    </div>

    {/* 大运流年趋势 */}
    <div className="bg-white mb-2 px-3 py-3">
      <div className="text-[16px] font-bold mb-2 text-[#333]">大运流年趋势</div>
      <div className="text-[13px] text-[#333] leading-[1.8]">
        {getDayunTrend()}
      </div>
      {dayunList.length>0 && <div className="mt-2 flex gap-1">
        {dayunList.slice(0,8).map((dy,i)=>{
          const ganWx = dy.wuxing?.gan || getGanWuxing(dy.gan as TianGan) || "火";
          const zhiWx = dy.wuxing?.zhi || getZhiWuxing(dy.zhi as DiZhi) || "火";
          const nowYear = new Date().getFullYear();
          const isCurrent = nowYear>=dy.startYear && nowYear<dy.startYear+10;
          return (
            <div key={i} className="flex-1 text-center py-1" style={{
              border:"1px solid #eee",
              borderRadius:"2px",
              backgroundColor: isCurrent ? BRAND_PURPLE_BG : "#fff",
            }}>
              <div style={{fontSize:"10px",color:"#666"}}>{Math.floor(dy.startAge)}岁</div>
              <div style={{fontSize:"12px",fontWeight:"bold",color:WX_COLORS[ganWx]}}>{dy.gan}</div>
              <div style={{fontSize:"12px",fontWeight:"bold",color:WX_COLORS[zhiWx]}}>{dy.zhi}</div>
            </div>
          );
        })}
      </div>}
    </div>

    {/* 事业/财运/婚姻简评 */}
    <div className="bg-white mb-2 px-3 py-3">
      <div className="text-[16px] font-bold mb-2 text-[#333]">事业财运婚姻简评</div>
      <div className="space-y-2 text-[13px] text-[#333] leading-[1.8]">
        <div><span style={{color:BRAND_PURPLE,fontWeight:"bold"}}>事业：</span>{lifeCommentary.careerText}</div>
        <div><span style={{color:BRAND_PURPLE,fontWeight:"bold"}}>财运：</span>{lifeCommentary.wealthText}</div>
        <div><span style={{color:BRAND_PURPLE,fontWeight:"bold"}}>婚姻：</span>{lifeCommentary.marriageText}</div>
      </div>
    </div>
  </div>;
}

// ===== TabXingge 性格分析 =====
function TabXingge({result}:{result:BaziResult}){
  const dayGan = result.dayGan as TianGan;
  const dayZhi = result.dayZhi as DiZhi;
  const dayGanWx = getGanWuxing(dayGan) || "火";
  const shenQiangRuo = result.shenQiangRuo;

  // 日干性格特征
  const GAN_TRAITS: Record<string, {title:string; traits:string[]; advice:string}> = {
    "甲": {title:"甲木参天", traits:["性格正直刚毅，有领导力","积极进取，意志坚定","乐于助人，有担当","有时过于固执，不擅变通"], advice:"宜学会灵活变通，多听取他人意见。"},
    "乙": {title:"乙木花草", traits:["性格温和柔韧，心思细腻","善于适应环境，外柔内刚","富有同情心，重感情","有时优柔寡断，缺乏主见"], advice:"宜增强决断力，坚定自己的立场。"},
    "丙": {title:"丙火太阳", traits:["性格热情开朗，乐观积极","富有感染力，喜欢交际","光明磊落，精力充沛","有时急躁冲动，缺乏耐心"], advice:"宜修身养性，控制急躁情绪。"},
    "丁": {title:"丁火灯烛", traits:["性格温文尔雅，心思缜密","重视细节，富有艺术感","忠诚专一，感情丰富","有时多疑敏感，情绪波动"], advice:"宜放宽心胸，增强自信。"},
    "戊": {title:"戊土高山", traits:["性格敦厚稳重，诚实守信","踏实可靠，有责任感","重视承诺，不喜变化","有时保守固执，不够灵活"], advice:"宜开放心态，接纳新事物。"},
    "己": {title:"己土田园", traits:["性格温和包容，善于积累","重视内涵，低调务实","勤劳踏实，重视家庭","有时多疑计较，不够果断"], advice:"宜开阔视野，果断决策。"},
    "庚": {title:"庚金刀剑", traits:["性格刚毅果断，讲义气","勇敢直接，不畏强权","重情重义，行动力强","有时过于刚硬，易得罪人"], advice:"宜刚柔并济，学会柔和处世。"},
    "辛": {title:"辛金珠玉", traits:["性格细腻敏感，追求完美","重视形象，有审美眼光","自尊心强，聪明机智","有时过于挑剔，虚荣心强"], advice:"宜包容他人，接纳不完美。"},
    "壬": {title:"壬水江河", traits:["性格聪明机智，胸怀宽广","富有谋略，善于筹划","自由奔放，不拘小节","有时散漫随性，缺乏恒心"], advice:"宜培养专注，持之以恒。"},
    "癸": {title:"癸水雨露", traits:["性格温柔含蓄，直觉敏锐","富有想象力，善解人意","勤奋努力，脚踏实地","有时消极悲观，缺乏魄力"], advice:"宜增强自信，积极进取。"},
  };

  const trait = GAN_TRAITS[dayGan] || GAN_TRAITS["甲"];

  // 五行性格补充
  const WX_TRAITS: Record<string, string> = {
    "金": "主义，性格刚健果敢，重情重义，做事果断，但易刚愎自用。",
    "木": "主仁，性格仁慈宽厚，积极向上，有博爱之心，但易固执己见。",
    "水": "主智，性格聪明机敏，灵活多变，善于思考，但易散漫无恒。",
    "火": "主礼，性格热情外向，乐观积极，富有激情，但易急躁冲动。",
    "土": "主信，性格敦厚稳重，诚实守信，踏实可靠，但易保守多疑。",
  };

  // 身强身弱对性格的影响
  const sqrTrait = shenQiangRuo ? (
    shenQiangRuo.result === "身强" ? "日主偏强，自我意识较强，做事有主见，行动力佳，但需注意不要过于自我中心。" :
    shenQiangRuo.result === "身弱" ? "日主偏弱，性格较内敛温和，善于配合他人，但需注意增强自信心和独立性。" :
    "日主中和，性格较为平衡，刚柔并济，待人处世较为得体。"
  ) : "";

  return <div className="px-2 pt-2">
    {/* 日主性格 */}
    <div className="bg-white mb-2 px-3 py-3">
      <div className="text-[16px] font-bold mb-2 text-[#333]">日主性格 · {trait.title}</div>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-14 h-14 flex items-center justify-center rounded-lg" style={{backgroundColor:WX_COLORS[dayGanWx]+"22", border:`2px solid ${WX_COLORS[dayGanWx]}`}}>
          <span style={{fontSize:"28px", fontWeight:"bold", color:WX_COLORS[dayGanWx]}}>{dayGan}</span>
        </div>
        <div className="flex-1 text-[13px] text-[#666]">
          <div>日主：<span className="font-bold" style={{color:WX_COLORS[dayGanWx]}}>{dayGan}{dayGanWx}</span></div>
          <div>日支：{dayZhi}（{getZhiWuxing(dayZhi)||""}）</div>
          {shenQiangRuo && <div>身强弱：<span className="font-bold" style={{color:BRAND_PURPLE}}>{shenQiangRuo.result}</span></div>}
        </div>
      </div>
      <div className="space-y-1.5">
        {trait.traits.map((t,i)=>(
          <div key={i} className="flex items-start text-[13px] text-[#333] leading-[1.7]">
            <span className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full mr-2 mt-0.5" style={{backgroundColor:BRAND_PURPLE_BG, color:BRAND_PURPLE, fontSize:"11px", fontWeight:"bold"}}>{i+1}</span>
            <span>{t}</span>
          </div>
        ))}
      </div>
    </div>

    {/* 五行属性性格 */}
    <div className="bg-white mb-2 px-3 py-3">
      <div className="text-[16px] font-bold mb-2 text-[#333]">五行属性</div>
      <div className="text-[13px] text-[#333] leading-[1.8]">
        {dayGan}日主属{dayGanWx}，{WX_TRAITS[dayGanWx] || ""}
      </div>
    </div>

    {/* 身强身弱性格影响 */}
    {sqrTrait && <div className="bg-white mb-2 px-3 py-3">
      <div className="text-[16px] font-bold mb-2 text-[#333]">强弱影响</div>
      <div className="text-[13px] text-[#333] leading-[1.8]">{sqrTrait}</div>
    </div>}

    {/* 性格建议 */}
    <div className="bg-white mb-2 px-3 py-3">
      <div className="text-[16px] font-bold mb-2 text-[#333]">性格建议</div>
      <div className="text-[13px] text-[#333] leading-[1.8] px-3 py-2" style={{backgroundColor:BRAND_PURPLE_BG, borderRadius:"4px", borderLeft:`3px solid ${BRAND_PURPLE}`}}>
        {trait.advice}
      </div>
    </div>
  </div>;
}

// ===== TabNotes =====
function TabNotes({storageKey}:{storageKey:string}){
  const [note,setNote]=useState("");
  const [saved,setSaved]=useState(false);

  useEffect(()=>{
    if(typeof window!=="undefined"){
      const savedNote = localStorage.getItem("yandao_bazi_note"+storageKey);
      if(savedNote) setNote(savedNote);
    }
  },[storageKey]);

  const handleSave=()=>{
    if(typeof window!=="undefined"){
      localStorage.setItem("yandao_bazi_note"+storageKey, note);
      setSaved(true);
      setTimeout(()=>setSaved(false),1500);
    }
  };

  return <div className="px-2 pt-2">
    <div className="bg-white mb-2 px-3 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[16px] font-bold text-[#333]">命理笔记</div>
        <button onClick={handleSave} className="px-3 py-1 text-[12px] text-white border-none rounded cursor-pointer" style={{backgroundColor:BRAND_PURPLE}}>
          {saved?"已保存":"保存"}
        </button>
      </div>
      <textarea
        value={note}
        onChange={e=>setNote(e.target.value)}
        placeholder="在此记录命理分析笔记，自动保存到本地..."
        className="w-full box-border border border-[#ddd] rounded px-2 py-2 text-[13px] outline-none resize-y"
        style={{minHeight:"200px",lineHeight:"1.6",fontFamily:"inherit"}}
      />
      <div className="text-[11px] text-[#999] mt-1">笔记保存在本地浏览器，不会上传到服务器。</div>
    </div>
  </div>;
}

// ===== main =====
export default function BaziPage(){
  const pageKey = "yixue_bazi"; const { showResult, savedParams, saveParams, goToResult } = useToolBack({ pageKey, eventName: "yixue-back", globalFlag: "__yixueBackHandled" });
  const [name,setName]=useState(""); const [year,setYear]=useState(1990); const [month,setMonth]=useState(5);
  const [day,setDay]=useState(15); const [hour,setHour]=useState(12); const [gender,setGender]=useState<Gender>("male");
  const [calType,setCalType]=useState<"gongli"|"nongli"|"sizhu">("gongli");
  const [zaoWanZi,setZaoWanZi]=useState(false); const [zhenTaiyang,setZhenTaiyang]=useState(false);
  const [xiaLing,setXiaLing]=useState(false); const [saveName,setSaveName]=useState(false);
  const [showForm,setShowForm]=useState(true); const [result,setResult]=useState<BaziResult|null>(null);
  const [shensha,setShensha]=useState<ReturnType<typeof calculateAllShenSha>|null>(null);
  const [activeTab,setActiveTab]=useState<"basic"|"chart"|"detail"|"jingpi"|"xingge"|"notes">("chart");
  const [selectedClient,setSelectedClient]=useState<Client|null>(null);
  const [interpretPanel, setInterpretPanel] = useState<{pillarLabel:string; items:Array<{type:string;title:string;content:string;source:string}>} | null>(null);

  // 监听layout的edit事件和back事件（v18.2：返回时从结果页切回输入页）
  useEffect(() => {
    const editHandler = () => setShowForm(true);
    const backHandler = () => {
      if (!showForm) {
        setShowForm(true);
        window.__yixueBackHandled = true;
      }
    };
    window.addEventListener("yixue-edit", editHandler);
    window.addEventListener("yixue-back", backHandler);
    return () => {
      window.removeEventListener("yixue-edit", editHandler);
      window.removeEventListener("yixue-back", backHandler);
    };
  }, [showForm]);

  // URL参数clientId自动选中客户 + 回填数据检查
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cid = params.get("clientId");
    if (cid) {
      const c = getClient(cid);
      if (c) setSelectedClient(c);
    }
    // 检查回填数据（从客户详情页跳转）
    const prefill = getPrefillData("bazi");
    if (prefill) {
      try {
        setResult(prefill);
        const ss = calculateAllShenSha({
          yearGan: prefill.pillars[0].gan as TianGan, yearZhi: prefill.pillars[0].zhi as DiZhi,
          monthGan: prefill.pillars[1].gan as TianGan, monthZhi: prefill.pillars[1].zhi as DiZhi,
          dayGan: prefill.dayGan as TianGan, dayZhi: prefill.dayZhi as DiZhi,
          hourGan: prefill.pillars[3].gan as TianGan, hourZhi: prefill.pillars[3].zhi as DiZhi,
          gender,
        });
        setShensha(ss);
        setShowForm(false);
        clearPrefillData("bazi");
      } catch (e) { console.error("回填失败:", e); }
    }
  }, []);

  // localStorage 持久化：恢复排盘状态
  useEffect(() => {
    const saved = loadPaipanState("bazi");
    if (saved && saved.input) {
      const inp = saved.input as any;
      if (inp.year) setYear(inp.year);
      if (inp.month) setMonth(inp.month);
      if (inp.day) setDay(inp.day);
      if (inp.hour) setHour(inp.hour);
      if (inp.gender) setGender(inp.gender);
      if (inp.calType) setCalType(inp.calType);
      if (saved.showForm === false) {
        handleSubmit({ year: inp.year, month: inp.month, day: inp.day, hour: inp.hour, gender: inp.gender });
      }
    }
  }, []);

  const handleSubmit=useCallback((override?:{year:number;month:number;day:number;hour:number;gender:Gender})=>{
    const y=override?.year??year; const m=override?.month??month;
    const d=override?.day??day; const h=override?.hour??hour;
    const g=override?.gender??gender;
    try{const bz=solarToBazi({year:y,month:m,day:d,hour:h,gender:g}) as BaziResult;setResult(bz);
      const ss=calculateAllShenSha({yearGan:bz.pillars[0].gan as TianGan,yearZhi:bz.pillars[0].zhi as DiZhi,monthGan:bz.pillars[1].gan as TianGan,monthZhi:bz.pillars[1].zhi as DiZhi,dayGan:bz.dayGan as TianGan,dayZhi:bz.dayZhi as DiZhi,hourGan:bz.pillars[3].gan as TianGan,hourZhi:bz.pillars[3].zhi as DiZhi,gender:g});
      setShensha(ss);setShowForm(false);savePaipanState("bazi",{input:{year:y,month:m,day:d,hour:h,gender:g,calType},result:bz,showForm:false,_ts:Date.now()});
      // 保存客户记录
      if(selectedClient){
        try{saveRecord({clientId:selectedClient.id,type:"bazi",data:{...bz,inputParams:{year:y,month:m,day:d,hour:h,gender:g}},note:"",status:"pending"});}catch(e){console.error("保存记录失败:",e);}
      }
    }catch(e){console.error("排盘失败:",e);}
  },[year,month,day,hour,gender,selectedClient]);

  const pillars=result?.pillars||[]; const shengxiao=pillars[0]?getShengXiao(pillars[0].zhi as DiZhi):"";
  const dateStr=`${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")} ${String(hour).padStart(2,"0")}:00`;
  const lunarDateStr = result?.lunarDate || (result ? `${result.input?.solarDate} ${result.input?.time}` : '');

  const wuxingStats=useMemo(()=>{if(!result) return null;const s:Record<string,number>={"金":0,"木":0,"水":0,"火":0,"土":0};
    result.pillars.forEach(p=>{const gWx=GAN_WUXING[p.gan as TianGan];const zWx=ZHI_WUXING[p.zhi as DiZhi];if(gWx)s[gWx]=(s[gWx]||0)+1;if(zWx)s[zWx]=(s[zWx]||0)+1;const cg=getCangGan(p.zhi as DiZhi);if(cg)cg.forEach(g=>{const w=getGanWuxing(g as TianGan);if(w)s[w]=(s[w]||0)+0.5;});});return s;},[result]);

  const wangshuaiArr=useMemo(()=>{
    if(!result) return null;
    const yz=result.pillars[1].zhi as DiZhi;
    const yw=ZHI_WUXING[yz];
    if(!yw) return null;
    return WANGSHUAI_COLORS[yw] || WANGSHUAI_COLORS["木"];
  },[result]);

  const taiYuan=pillars.length>=2?calcTaiYuan(pillars[1].gan as TianGan,pillars[1].zhi as DiZhi):"--";
  const taiXi=pillars.length>=2?calcTaiXi(pillars[1].zhi as DiZhi):"--";
  const mingGong=pillars.length>=2?calcMingGong(pillars[1].zhi as DiZhi,pillars[3].zhi as DiZhi):"--";
  const shenGong=pillars.length>=2?calcShenGong(pillars[1].zhi as DiZhi,pillars[3].zhi as DiZhi):"--";
  const mingGua=pillars.length>=1?calcMingGua(pillars[0].gan as TianGan,pillars[0].zhi as DiZhi,gender):"--";

  const boneWeight=useMemo(()=>{
    if(!result||pillars.length<4) return null;
    const yGz=pillars[0].gan+pillars[0].zhi;
    const mZhi=pillars[1].zhi;
    const hZhi=pillars[3].zhi;
    return calcBoneWeight(yGz, mZhi, day, hZhi, gender);
  },[result,day,gender,pillars]);

  const tabLabels:Record<string,string>={basic:"基本",chart:"命盘",detail:"详盘",jingpi:"精批",xingge:"性格",notes:"笔记"};
  const tabOrder:("basic"|"chart"|"detail"|"jingpi"|"xingge"|"notes")[]=["basic","chart","detail","jingpi","xingge","notes"];

  return <div className="bg-[#ededed] min-h-screen flex justify-center">
    <div className="w-full" style={{maxWidth:"375px",paddingBottom:"10px"}}>
    <DatePicker
      show={showForm}
      onClose={() => setShowForm(false)}
      onSubmit={(dateVal, opts) => {
        setYear(dateVal.year); setMonth(dateVal.month); setDay(dateVal.day); setHour(dateVal.hour);
        setGender(opts.gender as Gender);
        setCalType(opts.calType === "solar" ? "gongli" : opts.calType === "lunar" ? "nongli" : "sizhu");
        setZaoWanZi(opts.zaoWanZi); setZhenTaiyang(opts.zhenTaiyang); setXiaLing(opts.xiaLing);
        handleSubmit({year: dateVal.year, month: dateVal.month, day: dateVal.day, hour: dateVal.hour, gender: opts.gender as Gender});
      }}
      initialDate={{year, month, day, hour, minute: 0}}
      initialOptions={{
        gender,
        calType: calType === "gongli" ? "solar" : calType === "nongli" ? "lunar" : "sizhu",
        zaoWanZi, zhenTaiyang, xiaLing,
      }}
      showName={true} name={name} onNameChange={setName}
      showSaveName={true} saveName={saveName} onSaveNameChange={setSaveName}
      showGender={true} showCalType={true} showToggles={true} showRegion={true}
      showMinute={true}
      submitText="排盘" title="八字排盘"
    />
    {!showForm && !result && (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <button onClick={() => { clearPaipanState("bazi"); setShowForm(true); }} className="rounded-full bg-[#7B2FBE] text-white font-bold text-lg px-8 py-3 shadow-lg">开始排盘</button>
      </div>
    )}
    {result&&<div>
      {/* Tab导航 - 紫色选中态 */}
      <div className="flex border-b border-[#eee] bg-white/95 sticky top-10 z-30 overflow-x-auto">
        {tabOrder.map(tab=><button key={tab} onClick={()=>setActiveTab(tab)} className={`shrink-0 px-3 py-2.5 text-center text-[15px] font-bold border-none bg-transparent cursor-pointer transition-colors duration-200 border-b-[3px]`} style={{color: activeTab===tab ? BRAND_PURPLE : "#666", borderBottomColor: activeTab===tab ? BRAND_PURPLE : "transparent", borderBottomStyle:"solid"}}>{tabLabels[tab]}</button>)}
      </div>
      {activeTab==="basic"&&<TabBasic result={result} shengxiao={shengxiao} dateStr={dateStr} lunarDateStr={lunarDateStr} solarDateStr={dateStr} trueSolarStr={dateStr} taiYuan={taiYuan} taiXi={taiXi} mingGong={mingGong} shenGong={shenGong} mingGua={mingGua} wuxingStats={wuxingStats} boneWeight={boneWeight} gender={gender}/>}
      {activeTab==="chart"&&<>
      <TabChart result={result} shensha={shensha} shengxiao={shengxiao} gender={gender} lunarDateStr={lunarDateStr} solarDateStr={dateStr} trueSolarStr={dateStr} wangshuaiArr={wangshuaiArr} onPillarClick={(label,gan,zhi,shishenGan,nayin,canggan)=>{
        const interp = getPillarInterpretation(label,gan,zhi,shishenGan,nayin,canggan);
        setInterpretPanel(interp);
      }}/>
      {interpretPanel && (
        <div className="bg-white rounded-lg overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.08)] mx-2 mb-2" style={{ border: "1px solid #7B2FBE" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "linear-gradient(135deg, #7B2FBE, #9B5ECF)", color: "white" }}>
            <div>
              <span style={{ fontSize: "16px", fontWeight: "bold" }}>{interpretPanel.pillarLabel}</span>
            </div>
            <button onClick={() => setInterpretPanel(null)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", width: "28px", height: "28px", borderRadius: "50%", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>x</button>
          </div>
          <div style={{ padding: "10px 12px" }}>
            {interpretPanel.items.map((item, idx) => (
              <div key={idx} style={{ marginBottom: idx < interpretPanel.items.length - 1 ? "10px" : 0 }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "10px", fontWeight: "bold", padding: "1px 6px", borderRadius: "3px", background: item.type === "gan" ? "#fef3c7" : item.type === "zhi" ? "#e0e7ff" : item.type === "shishen" ? "#f3e8ff" : item.type === "nayin" ? "#d1fae5" : "#fce7f3", color: item.type === "gan" ? "#92400e" : item.type === "zhi" ? "#3730a3" : item.type === "shishen" ? "#6b21a8" : item.type === "nayin" ? "#065f46" : "#9d174d", marginRight: "8px" }}>{item.type === "gan" ? "天干" : item.type === "zhi" ? "地支" : item.type === "shishen" ? "十神" : item.type === "nayin" ? "纳音" : "藏干"}</span>
                  <span style={{ fontSize: "13px", fontWeight: "bold", color: "#333" }}>{item.title}</span>
                </div>
                <div style={{ fontSize: "12px", color: "#555", lineHeight: "1.6", whiteSpace: "pre-line" }}>{item.content}</div>
                <div style={{ fontSize: "10px", color: "#999", marginTop: "4px", fontStyle: "italic" }}>—— {item.source}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: "6px 12px", background: "#fafafa", borderTop: "1px solid #eee", fontSize: "10px", color: "#999", textAlign: "center" }}>点击其他四柱可查看不同解读 · 引经据典，仅供参考</div>
        </div>
      )}
    </>}
      {activeTab==="detail"&&<TabDetail result={result} gender={gender}/>}
      {activeTab==="jingpi"&&<TabJingpi result={result} gender={gender} wuxingStats={wuxingStats}/>}
      {activeTab==="xingge"&&<TabXingge result={result}/>}
      {activeTab==="notes"&&<TabNotes storageKey={`${year}${month}${day}${hour}${gender}`}/>}
    </div>}
    </div>
  </div>;
}
