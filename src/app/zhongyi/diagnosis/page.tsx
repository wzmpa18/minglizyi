"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getMembershipStatus, type MembershipStatus } from "@/lib/membershipStore";

// ==================== 品牌色 / 常量 ====================
const BRAND = "#7B2FBE";
const BRAND_LIGHT = "#9B5ECF";
const BRAND_BG = "#F3EDF7";
const COMPLIANCE_TEXT =
  "以上内容仅供中医学习参考，不构成诊疗建议，身体不适请及时就医";

// ==================== 类型定义 ====================
type BiaoLi = "表" | "里" | "半表半里";
type HanRe = "寒" | "热" | "寒热错杂";
type XuShi = "虚" | "实" | "虚实夹杂";

interface FormulaRef {
  name: string;
  desc: string;
}
interface AcupointRef {
  name: string;
  desc: string;
}
interface PatternDef {
  id: string;
  name: string; // 证型名（脏腑定位）
  organ: string; // 脏腑
  biaoLi: BiaoLi;
  hanRe: HanRe;
  xuShi: XuShi;
  sixMeridian: string; // 六经归属
  pathogenesis: string; // 病机分析
  formulas: FormulaRef[];
  acupoints: AcupointRef[];
  masterNotes: string; // 名家思路
}

interface SymptomDef {
  id: string;
  name: string;
  patterns: Record<string, number>;
}
interface SymptomCategoryDef {
  id: string;
  name: string;
  icon: string;
  femaleOnly?: boolean;
  symptoms: SymptomDef[];
}

interface SelectedSymptom {
  symptomId: string;
  note: string;
}

interface RankedPattern {
  id: string;
  score: number;
  def: PatternDef;
}

interface DiagnosisResult {
  systemId: string;
  systemName: string;
  schoolId: string;
  schoolName: string;
  conclusion: string;
  conclusionTags: string[];
  primaryPatterns: RankedPattern[];
  pathogenesis: string;
  formulas: FormulaRef[];
  acupoints: AcupointRef[];
  masterNotes: string[];
  selectedSymptomNames: string[];
  painNatureNames: string[];
  date: string;
}

interface HistoryRecord {
  id: string;
  date: string;
  systemName: string;
  schoolName: string;
  conclusion: string;
  symptomNames: string[];
  primaryPatternNames: string[];
}

// ==================== 疼痛性质 ====================
interface PainNature {
  id: string;
  name: string;
  hint: string;
  patterns: Record<string, number>;
}
const PAIN_NATURES: PainNature[] = [
  { id: "stinging", name: "刺痛", hint: "痛如针刺，固定不移，多属血瘀", patterns: { blood_stasis: 3 } },
  { id: "distending", name: "胀痛", hint: "痛而发胀，走窜不定，多属气滞", patterns: { liver_qi_stag: 2, liver_fire: 1 } },
  { id: "dull", name: "隐痛", hint: "疼痛绵绵，时作时止，多属虚证", patterns: { qi_def: 2, blood_def: 1, kidney_yin_def: 1, spleen_qi_def: 1 } },
  { id: "burning", name: "灼痛", hint: "痛如火烧，喜凉恶热，多属热证", patterns: { damp_heat: 2, stomach_heat: 1, heart_fire: 1, liver_fire: 1 } },
  { id: "cold", name: "冷痛", hint: "痛而冷感，得温则缓，多属寒证", patterns: { kidney_yang_def: 2, spleen_yang_def: 2, cold_damp: 2 } },
  { id: "heavy", name: "重痛", hint: "痛而沉重，如裹如缚，多属湿证", patterns: { phlegm_damp: 2, damp_heat: 1, cold_damp: 1 } },
  { id: "colicky", name: "绞痛", hint: "痛如刀绞，剧烈发作，多属实证瘀阻", patterns: { cold_damp: 2, blood_stasis: 1, liver_qi_stag: 1 } },
  { id: "empty", name: "空痛", hint: "痛而空虚，绵绵不休，多属气血亏虚", patterns: { blood_def: 2, kidney_yin_def: 2, qi_def: 1 } },
];

// ==================== 证型库（含病机/方剂/穴位/名家思路） ====================
const PATTERNS: PatternDef[] = [
  {
    id: "liver_qi_stag", name: "肝郁气滞证", organ: "肝", biaoLi: "里", hanRe: "寒热错杂", xuShi: "实",
    sixMeridian: "少阳",
    pathogenesis: "肝主疏泄，情志不遂则肝气郁结，气机不畅，可见胁肋胀痛、善太息、情志抑郁；气滞日久可化火、生痰、致瘀。",
    formulas: [
      { name: "柴胡疏肝散", desc: "疏肝理气，活血止痛，适用于肝气郁结之胁肋胀痛、脘腹胀满。" },
      { name: "逍遥散", desc: "疏肝解郁，养血健脾，适用于肝郁血虚脾弱之情绪不舒、月经不调。" },
    ],
    acupoints: [
      { name: "太冲", desc: "肝经原穴，疏肝理气，平肝泻热。" },
      { name: "期门", desc: "肝之募穴，理气解郁，宽胸止痛。" },
      { name: "膻中", desc: "气会，宽胸理气，调畅气机。" },
      { name: "阳陵泉", desc: "胆经合穴，疏肝利胆，缓急止痛。" },
    ],
    masterNotes: "肝郁为百病之始，调气先于调血；少阳为枢，枢机一转则郁结得散。",
  },
  {
    id: "liver_fire", name: "肝火上炎证", organ: "肝", biaoLi: "里", hanRe: "热", xuShi: "实",
    sixMeridian: "少阳",
    pathogenesis: "肝气郁久化火，或暴怒伤肝，气火上逆，可见头胀痛、面红目赤、口苦、烦躁易怒、耳鸣如潮。",
    formulas: [
      { name: "龙胆泻肝汤", desc: "泻肝胆实火，清下焦湿热，适用于肝火头痛、目赤、口苦、带下黄稠。" },
      { name: "丹栀逍遥散", desc: "疏肝清热，适用于肝郁化火之烦躁、潮热、月经先期。" },
    ],
    acupoints: [
      { name: "行间", desc: "肝经荥穴，清泻肝火。" },
      { name: "侠溪", desc: "胆经荥穴，平肝泻火。" },
      { name: "百会", desc: "平肝潜阳，清头明目。" },
    ],
    masterNotes: "肝火宜清不宜温，泻火需顾阴，中病即止，免伤脾胃。",
  },
  {
    id: "liver_yang", name: "肝阳上亢证", organ: "肝", biaoLi: "里", hanRe: "热", xuShi: "虚实夹杂",
    sixMeridian: "厥阴",
    pathogenesis: "肝肾阴虚，水不涵木，肝阳偏亢而上扰清窍，可见眩晕耳鸣、头胀痛、面潮红、腰膝酸软，本虚标实。",
    formulas: [
      { name: "天麻钩藤饮", desc: "平肝潜阳，清热安神，适用于肝阳上亢之眩晕头痛、失眠。" },
      { name: "镇肝熄风汤", desc: "镇肝熄风，滋阴潜阳，适用于阴虚阳亢、气血逆乱之眩晕。" },
    ],
    acupoints: [
      { name: "太冲", desc: "平肝潜阳，泻肝热。" },
      { name: "风池", desc: "疏风平肝，清利头目。" },
      { name: "太溪", desc: "滋肾养阴，滋水涵木。" },
    ],
    masterNotes: "阳亢多本于阴虚，治当滋水涵木、平肝潜阳并重，不可一味镇潜伤正。",
  },
  {
    id: "liver_blood_def", name: "肝血虚证", organ: "肝", biaoLi: "里", hanRe: "寒热错杂", xuShi: "虚",
    sixMeridian: "厥阴",
    pathogenesis: "肝藏血，血虚则筋失所养、目失所濡，可见视物模糊、肢体麻木、爪甲不荣、月经量少。",
    formulas: [
      { name: "四物汤", desc: "补血调血，为补血调经之基础方。" },
      { name: "补肝汤", desc: "养血滋阴，柔肝舒筋，适用于肝血不足之麻木、筋挛。" },
    ],
    acupoints: [
      { name: "肝俞", desc: "肝之背俞，养血柔肝。" },
      { name: "三阴交", desc: "肝脾肾交会，补血养血。" },
      { name: "足三里", desc: "补后天以生化气血。" },
    ],
    masterNotes: "肝为刚脏，体阴用阳，补血当佐柔润，兼以健脾以资生化之源。",
  },
  {
    id: "heart_blood_def", name: "心血虚证", organ: "心", biaoLi: "里", hanRe: "寒热错杂", xuShi: "虚",
    sixMeridian: "少阴",
    pathogenesis: "心主血脉，血不养心则心悸、失眠、健忘、多梦；血虚不能上荣则面色淡白。",
    formulas: [
      { name: "归脾汤", desc: "益气补血，健脾养心，适用于心脾两虚之心悸失眠、健忘。" },
      { name: "天王补心丹", desc: "滋阴养血，补心安神，适用于心阴血不足之失眠多梦。" },
    ],
    acupoints: [
      { name: "神门", desc: "心经原穴，宁心安神。" },
      { name: "心俞", desc: "养心血，安心神。" },
      { name: "内关", desc: "宽胸宁心，定悸安神。" },
    ],
    masterNotes: "心脾为母子，补血多从健脾入手；神不安多因血不足，养血即可安神。",
  },
  {
    id: "heart_yin_def", name: "心阴虚证", organ: "心", biaoLi: "里", hanRe: "热", xuShi: "虚",
    sixMeridian: "少阴",
    pathogenesis: "心阴亏虚，虚火内生，心失所养，可见心悸、心烦、失眠、潮热、盗汗、手足心热。",
    formulas: [
      { name: "天王补心丹", desc: "滋阴养血，补心安神，适用于心阴不足之虚烦不眠。" },
      { name: "生脉散", desc: "益气养阴，敛汗生津，适用于气阴两虚之心悸气短。" },
    ],
    acupoints: [
      { name: "神门", desc: "滋阴安神。" },
      { name: "三阴交", desc: "滋阴养血。" },
      { name: "太溪", desc: "滋肾阴以济心火。" },
    ],
    masterNotes: "心阴不足易生虚火，宜滋阴兼以清虚热，慎用苦寒直折。",
  },
  {
    id: "heart_fire", name: "心火亢盛证", organ: "心", biaoLi: "里", hanRe: "热", xuShi: "实",
    sixMeridian: "少阴",
    pathogenesis: "心火内炽，上炎口舌，下移小肠，可见口舌生疮、心烦失眠、小便短赤。",
    formulas: [
      { name: "导赤散", desc: "清心利水，引心火下行从小便出，适用于心火上炎之口疮、尿赤。" },
      { name: "朱砂安神丸", desc: "镇心安神，清热养阴，适用于心火亢盛之失眠心烦。" },
    ],
    acupoints: [
      { name: "少府", desc: "心经荥穴，清心泻火。" },
      { name: "神门", desc: "清心安神。" },
      { name: "涌泉", desc: "引火归元，引心火下行。" },
    ],
    masterNotes: "心火宜清宜导，导赤散取舌为心之苗、心与小肠相表里之意，使火有出路。",
  },
  {
    id: "spleen_qi_def", name: "脾气虚证", organ: "脾", biaoLi: "里", hanRe: "寒热错杂", xuShi: "虚",
    sixMeridian: "太阴",
    pathogenesis: "脾主运化，脾气虚弱则健运失职，可见食少腹胀、便溏、神疲乏力、气短懒言；气虚不能摄血可见月经过多。",
    formulas: [
      { name: "四君子汤", desc: "益气健脾，为补气之基础方。" },
      { name: "参苓白术散", desc: "益气健脾，渗湿止泻，适用于脾虚湿盛之便溏。" },
    ],
    acupoints: [
      { name: "足三里", desc: "补脾胃，益气血。" },
      { name: "脾俞", desc: "健脾益气。" },
      { name: "中脘", desc: "健运中州，调理脾胃。" },
      { name: "太白", desc: "脾经原穴，健脾化湿。" },
    ],
    masterNotes: "脾为后天之本，气血生化之源，补气首重健脾，健脾常佐理气防滞。",
  },
  {
    id: "spleen_yang_def", name: "脾阳虚证", organ: "脾", biaoLi: "里", hanRe: "寒", xuShi: "虚",
    sixMeridian: "太阴",
    pathogenesis: "脾阳不足，阴寒内生，运化无权，可见腹痛绵绵、喜温喜按、便溏完谷不化、腹部冷痛。",
    formulas: [
      { name: "理中丸", desc: "温中祛寒，补气健脾，适用于脾胃虚寒之腹痛便溏。" },
      { name: "附子理中丸", desc: "温阳散寒，益气健脾，适用于脾阳虚重证。" },
    ],
    acupoints: [
      { name: "中脘", desc: "温中散寒。" },
      { name: "神阙", desc: "温阳救逆，艾灸佳。" },
      { name: "关元", desc: "培补元气，温下焦。" },
      { name: "足三里", desc: "补脾益气。" },
    ],
    masterNotes: "脾阳虚即气虚之甚，温阳须佐补气，中阳一振则寒湿自化。",
  },
  {
    id: "stomach_heat", name: "胃热（火）证", organ: "胃", biaoLi: "里", hanRe: "热", xuShi: "实",
    sixMeridian: "阳明",
    pathogenesis: "胃火炽盛，灼伤胃津，可见消谷善饥、口臭、口渴喜饮、牙龈肿痛出血、便秘。",
    formulas: [
      { name: "清胃散", desc: "清胃凉血，适用于胃火上攻之牙痛、牙龈出血。" },
      { name: "玉女煎", desc: "清胃热，滋肾阴，适用于胃热阴虚之牙痛口渴。" },
    ],
    acupoints: [
      { name: "内庭", desc: "胃经荥穴，清泻胃火。" },
      { name: "合谷", desc: "清阳明热，止痛消肿。" },
      { name: "中脘", desc: "和胃清热。" },
    ],
    masterNotes: "胃火宜清宜降，通腑即是泻火，大便一通则胃火自平。",
  },
  {
    id: "stomach_yin_def", name: "胃阴虚证", organ: "胃", biaoLi: "里", hanRe: "热", xuShi: "虚",
    sixMeridian: "阳明",
    pathogenesis: "胃阴不足，失于濡润，胃失和降，可见胃脘嘈杂、干呕、口干、饥不欲食。",
    formulas: [
      { name: "益胃汤", desc: "养阴益胃，适用于胃阴不足之口干、嘈杂。" },
      { name: "沙参麦冬汤", desc: "清养胃阴，生津润燥。" },
    ],
    acupoints: [
      { name: "中脘", desc: "和胃养阴。" },
      { name: "三阴交", desc: "滋阴养液。" },
      { name: "内关", desc: "和胃降逆。" },
    ],
    masterNotes: "胃喜润恶燥，养胃阴宜甘凉濡润，慎用辛香温燥劫阴之品。",
  },
  {
    id: "damp_heat", name: "湿热证", organ: "脾胃/下焦", biaoLi: "里", hanRe: "热", xuShi: "实",
    sixMeridian: "阳明",
    pathogenesis: "湿邪与热邪相合，蕴阻中焦或下注，可见口苦口粘、带下黄稠、小便短赤、关节红肿、面部痤疮、舌红苔黄腻。",
    formulas: [
      { name: "龙胆泻肝汤", desc: "清泻肝胆湿热，适用于湿热下注之带下黄稠、小便涩痛。" },
      { name: "三仁汤", desc: "宣畅气机，清利湿热，适用于湿温初起、三焦湿热。" },
      { name: "四妙丸", desc: "清热利湿，适用于湿热下注之关节红肿、下肢酸沉。" },
    ],
    acupoints: [
      { name: "阴陵泉", desc: "脾经合穴，健脾利湿。" },
      { name: "丰隆", desc: "化痰要穴，清利湿浊。" },
      { name: "曲池", desc: "清热利湿，泻阳明热。" },
    ],
    masterNotes: "湿热缠绵难愈，治当分消走泄，湿重化湿、热重清热，兼顾气机宣畅。",
  },
  {
    id: "cold_damp", name: "寒湿证", organ: "脾/经络", biaoLi: "里", hanRe: "寒", xuShi: "实",
    sixMeridian: "太阴",
    pathogenesis: "寒湿相合，困遏脾阳或阻滞经络，可见腹部冷痛、关节冷痛重着、带下清稀、完谷不化。",
    formulas: [
      { name: "平胃散", desc: "燥湿运脾，行气和胃，适用于寒湿困脾之腹胀。" },
      { name: "苓桂术甘汤", desc: "温阳化饮，健脾利湿，适用于阳虚饮停。" },
      { name: "独活寄生汤", desc: "祛风湿，止痹痛，益肝肾，适用于寒湿痹证。" },
    ],
    acupoints: [
      { name: "足三里", desc: "健脾化湿。" },
      { name: "阴陵泉", desc: "利湿要穴。" },
      { name: "关元", desc: "温阳散寒。" },
    ],
    masterNotes: "寒湿宜温宜化，温阳则寒散，健脾则湿化，佐以通络则痹痛可解。",
  },
  {
    id: "phlegm_damp", name: "痰湿证", organ: "脾/肺", biaoLi: "里", hanRe: "寒热错杂", xuShi: "实",
    sixMeridian: "太阴",
    pathogenesis: "脾失健运，水湿停聚成痰，痰湿蕴肺则咳嗽痰多；痰湿中阻则头重如裹、胸闷、嗜睡；流注经络则肢体麻木重着。",
    formulas: [
      { name: "二陈汤", desc: "燥湿化痰，理气和中，为治痰之基础方。" },
      { name: "平胃散", desc: "燥湿运脾，适用于痰湿中阻。" },
    ],
    acupoints: [
      { name: "丰隆", desc: "化痰要穴，豁痰化湿。" },
      { name: "中脘", desc: "理中焦，化痰湿。" },
      { name: "阴陵泉", desc: "健脾利湿。" },
      { name: "膻中", desc: "理气宽胸，助痰湿消散。" },
    ],
    masterNotes: "脾为生痰之源，肺为贮痰之器，治痰当先理气，气顺则痰消，根本在健脾。",
  },
  {
    id: "lung_qi_def", name: "肺气虚证", organ: "肺", biaoLi: "里", hanRe: "寒热错杂", xuShi: "虚",
    sixMeridian: "太阴",
    pathogenesis: "肺气不足，卫外不固，宣降失司，可见气短、自汗、易感冒、咳声低弱、声音嘶哑。",
    formulas: [
      { name: "玉屏风散", desc: "益气固表止汗，适用于肺气虚之自汗易感。" },
      { name: "补肺汤", desc: "补肺益气，止咳平喘。" },
    ],
    acupoints: [
      { name: "肺俞", desc: "补肺益气。" },
      { name: "太渊", desc: "肺经原穴，补肺气。" },
      { name: "足三里", desc: "培土生金。" },
    ],
    masterNotes: "肺主气，脾为肺之母，培土生金为补肺要法；固表以防外感。",
  },
  {
    id: "lung_yin_def", name: "肺阴虚证", organ: "肺", biaoLi: "里", hanRe: "热", xuShi: "虚",
    sixMeridian: "太阴",
    pathogenesis: "肺阴亏虚，虚热内生，肺失清肃，可见干咳少痰、痰中带血、咽干声嘶、潮热盗汗。",
    formulas: [
      { name: "沙参麦冬汤", desc: "清养肺胃，生津润燥，适用于肺阴不足之干咳。" },
      { name: "百合固金汤", desc: "养阴润肺，化痰止咳，适用于肺肾阴虚之咳嗽。" },
    ],
    acupoints: [
      { name: "肺俞", desc: "滋阴润肺。" },
      { name: "太渊", desc: "补肺气，养肺阴。" },
      { name: "列缺", desc: "宣肺利咽。" },
    ],
    masterNotes: "肺为娇脏，喜润恶燥，养肺阴宜甘寒清润，佐以化痰止咳。",
  },
  {
    id: "wind_cold", name: "风寒表证", organ: "肺/表", biaoLi: "表", hanRe: "寒", xuShi: "实",
    sixMeridian: "太阳",
    pathogenesis: "风寒外袭，卫阳被遏，营卫失和，可见恶寒发热、头痛、鼻塞流清涕、咳嗽痰白。",
    formulas: [
      { name: "荆防败毒散", desc: "辛温解表，宣肺散寒，适用于风寒感冒。" },
      { name: "桂枝汤", desc: "解肌发表，调和营卫，适用于外感风寒表虚证。" },
    ],
    acupoints: [
      { name: "风池", desc: "疏风散寒解表。" },
      { name: "大椎", desc: "解表退热，通阳散寒。" },
      { name: "列缺", desc: "宣肺解表。" },
      { name: "合谷", desc: "疏风解表，通络止痛。" },
    ],
    masterNotes: "风寒宜辛温发汗，微微似汗出为佳，不可大汗伤阳；表虚表实当辨。",
  },
  {
    id: "wind_heat", name: "风热表证", organ: "肺/表", biaoLi: "表", hanRe: "热", xuShi: "实",
    sixMeridian: "太阳",
    pathogenesis: "风热犯表，肺失宣肃，可见发热微恶风、咽痛、鼻塞流黄涕、咳嗽痰黄。",
    formulas: [
      { name: "银翘散", desc: "辛凉透表，清热解毒，适用于风热感冒初起。" },
      { name: "桑菊饮", desc: "疏风清热，宣肺止咳，适用于风热咳嗽。" },
    ],
    acupoints: [
      { name: "大椎", desc: "解表清热。" },
      { name: "曲池", desc: "疏风清热。" },
      { name: "少商", desc: "点刺出血，清咽利喉。" },
      { name: "风池", desc: "疏风解表。" },
    ],
    masterNotes: "风热宜辛凉清透，忌辛温助热；咽痛甚者佐以清热解毒利咽。",
  },
  {
    id: "kidney_yang_def", name: "肾阳虚证", organ: "肾", biaoLi: "里", hanRe: "寒", xuShi: "虚",
    sixMeridian: "少阴",
    pathogenesis: "肾阳为一身阳气之本，命门火衰则温煦失职，可见畏寒肢冷、腰膝冷痛、夜尿频多、小便清长、水肿、五更泻。",
    formulas: [
      { name: "金匮肾气丸", desc: "温补肾阳，化气行水，为补肾阳之祖方。" },
      { name: "右归丸", desc: "温补肾阳，填精止遗，适用于肾阳不足之命门火衰。" },
    ],
    acupoints: [
      { name: "肾俞", desc: "温补肾阳。" },
      { name: "命门", desc: "培元固本，温补肾阳，艾灸佳。" },
      { name: "关元", desc: "培补元气，温阳固脱。" },
      { name: "太溪", desc: "肾经原穴，补肾气。" },
    ],
    masterNotes: "善补阳者，必于阴中求阳，则阳得阴助而生化无穷；温阳佐填精。",
  },
  {
    id: "kidney_yin_def", name: "肾阴虚证", organ: "肾", biaoLi: "里", hanRe: "热", xuShi: "虚",
    sixMeridian: "少阴",
    pathogenesis: "肾阴为一身阴液之本，肾阴亏虚则失于滋养，虚火内生，可见腰膝酸软、头晕耳鸣、手足心热、盗汗、脱发、口干。",
    formulas: [
      { name: "六味地黄丸", desc: "滋补肾阴，为补肾阴之祖方。" },
      { name: "左归丸", desc: "滋阴补肾，填精益髓，适用于真阴不足重证。" },
    ],
    acupoints: [
      { name: "太溪", desc: "滋补肾阴。" },
      { name: "肾俞", desc: "益肾滋阴。" },
      { name: "三阴交", desc: "滋阴养血。" },
      { name: "照海", desc: "滋肾阴，清虚热。" },
    ],
    masterNotes: "善补阴者，必于阳中求阴，则阴得阳升而泉源不竭；滋阴佐泻虚火。",
  },
  {
    id: "kidney_qi_unfixed", name: "肾气不固证", organ: "肾", biaoLi: "里", hanRe: "寒", xuShi: "虚",
    sixMeridian: "少阴",
    pathogenesis: "肾气虚弱，下元不固，封藏失职，可见尿频遗尿、夜尿多、小便清长、滑胎、带下清稀。",
    formulas: [
      { name: "缩泉丸", desc: "温肾祛寒，缩尿止遗，适用于肾气不固之尿频。" },
      { name: "肾气丸", desc: "温补肾阳，化气固摄。" },
      { name: "寿胎丸", desc: "补肾安胎，适用于肾虚滑胎。" },
    ],
    acupoints: [
      { name: "肾俞", desc: "补肾固摄。" },
      { name: "关元", desc: "培元固本。" },
      { name: "中极", desc: "膀胱募穴，约束膀胱。" },
    ],
    masterNotes: "肾主封藏，固摄当温补肾气，佐以收敛固涩之品，标本兼治。",
  },
  {
    id: "blood_stasis", name: "血瘀证", organ: "血脉", biaoLi: "里", hanRe: "寒热错杂", xuShi: "实",
    sixMeridian: "厥阴",
    pathogenesis: "血行不畅，停滞为瘀，可见刺痛固定不移、面色晦暗、经血色暗有块、痛经、肿块、舌质紫暗有瘀斑。",
    formulas: [
      { name: "血府逐瘀汤", desc: "活血化瘀，行气止痛，适用于胸中血瘀之胸痛。" },
      { name: "少腹逐瘀汤", desc: "活血祛瘀，温经止痛，适用于下焦血瘀之痛经、月经不调。" },
      { name: "桃红四物汤", desc: "养血活血，适用于血虚兼瘀之月经不调。" },
    ],
    acupoints: [
      { name: "血海", desc: "理血调经，活血化瘀。" },
      { name: "膈俞", desc: "血会，活血化瘀要穴。" },
      { name: "三阴交", desc: "活血调经。" },
      { name: "合谷", desc: "气为血帅，行气以活血。" },
    ],
    masterNotes: "治血先治气，气行则血行；瘀血多兼寒，温化则瘀易散，久瘀多虚当佐扶正。",
  },
  {
    id: "qi_def", name: "气虚证", organ: "脾/肺", biaoLi: "里", hanRe: "寒热错杂", xuShi: "虚",
    sixMeridian: "太阴",
    pathogenesis: "元气不足，脏腑功能衰退，可见神疲乏力、气短懒言、自汗、食少便溏、面色淡白。",
    formulas: [
      { name: "四君子汤", desc: "益气健脾，为补气基础方。" },
      { name: "补中益气汤", desc: "补中益气，升阳举陷，适用于气虚下陷。" },
    ],
    acupoints: [
      { name: "足三里", desc: "补益后天，益气强身。" },
      { name: "气海", desc: "培补元气。" },
      { name: "关元", desc: "培元固本。" },
    ],
    masterNotes: "气为血之帅，补气可生血、行血、摄血；补气佐行气，补而不滞。",
  },
  {
    id: "blood_def", name: "血虚证", organ: "心/肝", biaoLi: "里", hanRe: "寒热错杂", xuShi: "虚",
    sixMeridian: "厥阴",
    pathogenesis: "血液亏虚，脏腑组织失于濡养，可见面色苍白或萎黄、头晕眼花、心悸失眠、手足麻木、月经量少色淡。",
    formulas: [
      { name: "四物汤", desc: "补血调血，为补血基础方。" },
      { name: "当归补血汤", desc: "补气生血，适用于气血两虚、血虚发热。" },
      { name: "八珍汤", desc: "气血双补，适用于气血两虚。" },
    ],
    acupoints: [
      { name: "足三里", desc: "补后天以生血。" },
      { name: "三阴交", desc: "补血养血。" },
      { name: "血海", desc: "理血调血。" },
    ],
    masterNotes: "气为血之母，有形之血不能自生，生于无形之气，补血多佐补气。",
  },
];

const PATTERN_MAP: Record<string, PatternDef> = Object.fromEntries(
  PATTERNS.map((p) => [p.id, p])
) as Record<string, PatternDef>;

// ==================== 症状数据（按部位分类） ====================
const SYMPTOM_CATEGORIES: SymptomCategoryDef[] = [
  {
    id: "toumian", name: "头面", icon: "👤",
    symptoms: [
      { id: "headache", name: "头痛", patterns: { liver_yang: 2, wind_cold: 2, wind_heat: 2, blood_stasis: 1, kidney_yin_def: 1 } },
      { id: "dizziness", name: "头晕", patterns: { liver_yang: 3, kidney_yin_def: 2, blood_def: 2, spleen_qi_def: 1, phlegm_damp: 1 } },
      { id: "head_distension", name: "头胀", patterns: { liver_yang: 2, damp_heat: 1, liver_fire: 1 } },
      { id: "heavy_head", name: "头重如裹", patterns: { phlegm_damp: 3, cold_damp: 2, damp_heat: 1 } },
      { id: "pale_face", name: "面色苍白", patterns: { blood_def: 2, qi_def: 2, spleen_qi_def: 1, kidney_yang_def: 1 } },
      { id: "sallow_face", name: "面色萎黄", patterns: { spleen_qi_def: 2, blood_def: 2 } },
      { id: "flushed_face", name: "面色潮红", patterns: { liver_yang: 2, kidney_yin_def: 1, damp_heat: 1 } },
      { id: "dull_face", name: "面色晦暗/黧黑", patterns: { blood_stasis: 3, kidney_yang_def: 2 } },
      { id: "facial_edema", name: "面部浮肿", patterns: { kidney_yang_def: 2, spleen_qi_def: 2, phlegm_damp: 1 } },
      { id: "hair_loss", name: "脱发/发白", patterns: { kidney_yin_def: 2, blood_def: 2, liver_blood_def: 1 } },
      { id: "acne", name: "面部痤疮", patterns: { damp_heat: 2, stomach_heat: 1 } },
      { id: "dark_circles", name: "眼圈发黑", patterns: { kidney_yang_def: 2, kidney_yin_def: 1, blood_stasis: 1 } },
    ],
  },
  {
    id: "wuguan", name: "五官", icon: "👁️",
    symptoms: [
      { id: "blurred_vision", name: "视物模糊", patterns: { liver_blood_def: 3, kidney_yin_def: 2, blood_def: 1 } },
      { id: "dry_eyes", name: "眼干涩", patterns: { liver_blood_def: 2, kidney_yin_def: 2 } },
      { id: "red_eyes", name: "眼红目赤", patterns: { liver_fire: 3, wind_heat: 1, damp_heat: 1 } },
      { id: "tinnitus", name: "耳鸣", patterns: { kidney_yin_def: 3, liver_yang: 2, liver_fire: 1 } },
      { id: "deafness", name: "耳聋渐重", patterns: { kidney_yin_def: 2, kidney_yang_def: 2 } },
      { id: "nasal_congestion", name: "鼻塞", patterns: { wind_cold: 2, wind_heat: 2 } },
      { id: "clear_rhinorrhea", name: "流清涕", patterns: { wind_cold: 3 } },
      { id: "thick_rhinorrhea", name: "流黄浊涕", patterns: { wind_heat: 3, damp_heat: 1 } },
      { id: "dry_nose", name: "鼻干", patterns: { wind_heat: 1, lung_yin_def: 2 } },
      { id: "bitter_mouth", name: "口苦", patterns: { liver_fire: 3, liver_qi_stag: 1, damp_heat: 1 } },
      { id: "dry_mouth", name: "口干", patterns: { kidney_yin_def: 2, stomach_heat: 1, lung_yin_def: 1, damp_heat: 1 } },
      { id: "bad_breath", name: "口臭", patterns: { stomach_heat: 3, damp_heat: 1, spleen_qi_def: 1 } },
      { id: "mouth_ulcers", name: "口舌生疮", patterns: { heart_fire: 3, stomach_heat: 2, damp_heat: 1 } },
      { id: "gum_bleeding", name: "牙龈出血", patterns: { stomach_heat: 2, kidney_yin_def: 1 } },
      { id: "toothache", name: "牙痛", patterns: { stomach_heat: 2, kidney_yin_def: 1, wind_cold: 1 } },
      { id: "tasteless_mouth", name: "口淡无味", patterns: { spleen_qi_def: 2, cold_damp: 1 } },
    ],
  },
  {
    id: "yanhou", name: "咽喉", icon: "🗣️",
    symptoms: [
      { id: "dry_throat", name: "咽干", patterns: { kidney_yin_def: 2, lung_yin_def: 2, wind_heat: 1 } },
      { id: "sore_throat", name: "咽痛", patterns: { wind_heat: 3, stomach_heat: 1, lung_yin_def: 1 } },
      { id: "foreign_body", name: "咽部异物感（梅核气）", patterns: { liver_qi_stag: 3, phlegm_damp: 2 } },
      { id: "hoarseness", name: "声音嘶哑", patterns: { lung_yin_def: 2, wind_cold: 1, kidney_yin_def: 1 } },
      { id: "cough", name: "咳嗽", patterns: { wind_cold: 2, wind_heat: 2, lung_qi_def: 2, phlegm_damp: 1 } },
      { id: "yellow_phlegm", name: "痰黄粘稠", patterns: { wind_heat: 2, damp_heat: 1, lung_yin_def: 1 } },
      { id: "white_phlegm", name: "痰白清稀", patterns: { wind_cold: 2, phlegm_damp: 2, cold_damp: 1, spleen_qi_def: 1 } },
      { id: "much_phlegm", name: "痰多易咯", patterns: { phlegm_damp: 3, spleen_qi_def: 2 } },
      { id: "dry_cough", name: "干咳少痰", patterns: { lung_yin_def: 3, wind_heat: 1 } },
    ],
  },
  {
    id: "xiongfu", name: "胸腹", icon: "🫀",
    symptoms: [
      { id: "chest_oppression", name: "胸闷", patterns: { liver_qi_stag: 2, phlegm_damp: 2, heart_blood_def: 1, qi_def: 1 } },
      { id: "chest_pain", name: "胸痛", patterns: { blood_stasis: 3, heart_blood_def: 1, liver_qi_stag: 1 } },
      { id: "palpitation", name: "心悸", patterns: { heart_blood_def: 3, heart_yin_def: 2, qi_def: 2, kidney_yin_def: 1 } },
      { id: "short_breath", name: "气短", patterns: { lung_qi_def: 3, qi_def: 2, kidney_qi_unfixed: 1 } },
      { id: "abdominal_distension", name: "腹胀", patterns: { spleen_qi_def: 2, liver_qi_stag: 2, cold_damp: 1, phlegm_damp: 1 } },
      { id: "abdominal_pain", name: "腹痛", patterns: { spleen_yang_def: 2, cold_damp: 2, liver_qi_stag: 1, blood_stasis: 1 } },
      { id: "hypochondriac_pain", name: "胁肋胀痛", patterns: { liver_qi_stag: 3, blood_stasis: 1, liver_fire: 1 } },
      { id: "epigastric_pain", name: "胃脘痛", patterns: { spleen_yang_def: 2, spleen_qi_def: 1, stomach_heat: 1, cold_damp: 1, liver_qi_stag: 1 } },
      { id: "cold_abdomen", name: "腹部冷痛", patterns: { spleen_yang_def: 3, kidney_yang_def: 2, cold_damp: 2 } },
      { id: "borborygmus", name: "肠鸣矢气", patterns: { liver_qi_stag: 2, spleen_qi_def: 1, cold_damp: 1 } },
    ],
  },
  {
    id: "yaobei", name: "腰背", icon: "🦴",
    symptoms: [
      { id: "back_pain", name: "腰痛", patterns: { kidney_yang_def: 2, kidney_yin_def: 2, cold_damp: 2, blood_stasis: 1 } },
      { id: "waist_knee_sore", name: "腰膝酸软", patterns: { kidney_yin_def: 3, kidney_yang_def: 2, kidney_qi_unfixed: 1 } },
      { id: "back_cold", name: "背部畏寒", patterns: { kidney_yang_def: 3, spleen_yang_def: 1 } },
      { id: "spine_stiff", name: "脊柱僵硬", patterns: { cold_damp: 2, blood_stasis: 1, kidney_yang_def: 1 } },
    ],
  },
  {
    id: "sizhi", name: "四肢", icon: "🦵",
    symptoms: [
      { id: "cold_limbs", name: "手足发凉", patterns: { kidney_yang_def: 3, spleen_yang_def: 2, qi_def: 1 } },
      { id: "hot_palms", name: "手足心热", patterns: { kidney_yin_def: 3, liver_blood_def: 1, heart_yin_def: 1 } },
      { id: "numbness", name: "肢体麻木", patterns: { blood_def: 2, blood_stasis: 2, liver_blood_def: 1, phlegm_damp: 1 } },
      { id: "joint_pain", name: "关节疼痛", patterns: { cold_damp: 2, blood_stasis: 2, wind_cold: 1, damp_heat: 1 } },
      { id: "joint_swelling", name: "关节红肿", patterns: { damp_heat: 3, wind_heat: 1, blood_stasis: 1 } },
      { id: "limb_edema", name: "肢体浮肿", patterns: { kidney_yang_def: 2, spleen_qi_def: 2, phlegm_damp: 1 } },
      { id: "heavy_limbs", name: "下肢酸沉", patterns: { damp_heat: 2, cold_damp: 2, phlegm_damp: 1, spleen_qi_def: 1 } },
      { id: "muscle_sore", name: "肌肉酸痛", patterns: { damp_heat: 1, cold_damp: 1, qi_def: 1, wind_cold: 1 } },
      { id: "tremor", name: "手足震颤", patterns: { liver_blood_def: 3, liver_yang: 1, kidney_yin_def: 1 } },
    ],
  },
  {
    id: "erbian", name: "二便", icon: "🚽",
    symptoms: [
      { id: "constipation", name: "便秘", patterns: { stomach_heat: 2, kidney_yin_def: 2, blood_def: 2, qi_def: 1 } },
      { id: "dry_stool", name: "大便干结", patterns: { stomach_heat: 2, kidney_yin_def: 1, blood_def: 1 } },
      { id: "loose_stool", name: "大便溏薄", patterns: { spleen_qi_def: 3, spleen_yang_def: 2, cold_damp: 1 } },
      { id: "diarrhea_dawn", name: "五更泄泻", patterns: { spleen_yang_def: 2, kidney_yang_def: 3, cold_damp: 1 } },
      { id: "undigested_stool", name: "完谷不化", patterns: { spleen_yang_def: 3, kidney_yang_def: 2 } },
      { id: "clear_urine", name: "小便清长", patterns: { kidney_yang_def: 3, kidney_qi_unfixed: 2, cold_damp: 1 } },
      { id: "yellow_urine", name: "小便短黄", patterns: { damp_heat: 3, heart_fire: 1, stomach_heat: 1 } },
      { id: "frequent_urine", name: "尿频", patterns: { kidney_qi_unfixed: 3, kidney_yang_def: 2 } },
      { id: "urgent_urine", name: "尿急尿痛", patterns: { damp_heat: 3 } },
      { id: "nocturia", name: "夜尿频多", patterns: { kidney_yang_def: 3, kidney_qi_unfixed: 3 } },
    ],
  },
  {
    id: "shuimian", name: "睡眠", icon: "😴",
    symptoms: [
      { id: "insomnia", name: "失眠", patterns: { heart_blood_def: 2, heart_yin_def: 2, liver_fire: 1, liver_qi_stag: 1, kidney_yin_def: 1 } },
      { id: "hard_to_sleep", name: "入睡困难", patterns: { liver_fire: 2, liver_qi_stag: 2, heart_fire: 1 } },
      { id: "easy_wake", name: "睡后易醒", patterns: { heart_blood_def: 2, spleen_qi_def: 2, qi_def: 1 } },
      { id: "early_wake", name: "早醒", patterns: { liver_qi_stag: 2, liver_fire: 1 } },
      { id: "many_dreams", name: "多梦纷扰", patterns: { heart_blood_def: 2, heart_yin_def: 1, liver_fire: 1, blood_def: 1 } },
      { id: "drowsiness", name: "嗜睡", patterns: { spleen_qi_def: 2, phlegm_damp: 2, kidney_yang_def: 1 } },
    ],
  },
  {
    id: "yinshi", name: "饮食", icon: "🍚",
    symptoms: [
      { id: "poor_appetite", name: "食欲不振", patterns: { spleen_qi_def: 3, spleen_yang_def: 1, damp_heat: 1, cold_damp: 1 } },
      { id: "easy_hunger", name: "消谷善饥", patterns: { stomach_heat: 3, stomach_yin_def: 1 } },
      { id: "thirst", name: "口渴喜饮", patterns: { stomach_heat: 2, damp_heat: 1, wind_heat: 1, kidney_yin_def: 1 } },
      { id: "thirst_no_drink", name: "口渴不欲饮", patterns: { damp_heat: 2, cold_damp: 1, blood_stasis: 1 } },
      { id: "averse_greasy", name: "厌食油腻", patterns: { damp_heat: 2, spleen_qi_def: 1, cold_damp: 1 } },
      { id: "nausea", name: "恶心", patterns: { stomach_heat: 1, spleen_qi_def: 1, cold_damp: 1, liver_qi_stag: 1, phlegm_damp: 1 } },
      { id: "vomiting", name: "呕吐", patterns: { stomach_heat: 1, cold_damp: 1, liver_qi_stag: 1, spleen_yang_def: 1 } },
      { id: "acid_regurg", name: "吞酸嘈杂", patterns: { liver_fire: 2, stomach_heat: 1, liver_qi_stag: 1 } },
      { id: "stomach_reflux", name: "胃中嘈杂", patterns: { stomach_yin_def: 2, stomach_heat: 1 } },
      { id: "sweet_sticky", name: "口甜粘腻", patterns: { damp_heat: 2, spleen_qi_def: 1 } },
    ],
  },
  {
    id: "qingzhi", name: "情志", icon: "💭",
    symptoms: [
      { id: "irritability", name: "烦躁易怒", patterns: { liver_fire: 3, liver_qi_stag: 2, heart_fire: 1 } },
      { id: "depression", name: "情志抑郁", patterns: { liver_qi_stag: 3 } },
      { id: "sighing", name: "善太息", patterns: { liver_qi_stag: 3 } },
      { id: "anxiety", name: "焦虑不安", patterns: { heart_fire: 2, heart_yin_def: 1, liver_qi_stag: 1, kidney_yin_def: 1 } },
      { id: "easily_frightened", name: "胆怯易惊", patterns: { heart_blood_def: 2, kidney_yin_def: 1 } },
      { id: "forgetfulness", name: "健忘", patterns: { heart_blood_def: 2, kidney_yin_def: 2, spleen_qi_def: 1, blood_def: 1 } },
      { id: "spiritless", name: "精神萎靡", patterns: { qi_def: 2, kidney_yang_def: 2, spleen_qi_def: 1 } },
      { id: "fatigue", name: "神疲乏力", patterns: { qi_def: 3, spleen_qi_def: 2, kidney_yang_def: 1 } },
    ],
  },
  // ===== 妇科专项 =====
  {
    id: "yuejing", name: "月经", icon: "🌸", femaleOnly: true,
    symptoms: [
      { id: "early_period", name: "月经先期", patterns: { kidney_yin_def: 2, damp_heat: 1, spleen_qi_def: 2 } },
      { id: "late_period", name: "月经后期", patterns: { blood_def: 3, kidney_yang_def: 2, cold_damp: 1, liver_qi_stag: 1 } },
      { id: "irregular_period", name: "月经先后无定期", patterns: { liver_qi_stag: 3, kidney_qi_unfixed: 1, spleen_qi_def: 1 } },
      { id: "menorrhagia", name: "月经过多", patterns: { spleen_qi_def: 3, blood_stasis: 2, damp_heat: 1 } },
      { id: "hypomenorrhea", name: "月经过少", patterns: { blood_def: 3, kidney_yin_def: 2, blood_stasis: 1, cold_damp: 1 } },
      { id: "prolonged_period", name: "经期延长", patterns: { spleen_qi_def: 2, blood_stasis: 2, damp_heat: 1 } },
      { id: "dysmenorrhea", name: "痛经", patterns: { blood_stasis: 3, cold_damp: 2, liver_qi_stag: 2, kidney_yang_def: 1 } },
      { id: "amenorrhea", name: "闭经", patterns: { blood_def: 2, kidney_yin_def: 2, liver_qi_stag: 2, blood_stasis: 1 } },
      { id: "dark_clots", name: "经血色暗有块", patterns: { blood_stasis: 3, cold_damp: 2, kidney_yang_def: 1 } },
      { id: "pale_period", name: "经血色淡质稀", patterns: { blood_def: 3, spleen_qi_def: 2, kidney_yang_def: 1 } },
    ],
  },
  {
    id: "daixia", name: "带下", icon: "💧", femaleOnly: true,
    symptoms: [
      { id: "excessive_discharge", name: "带下量多", patterns: { spleen_qi_def: 2, kidney_yang_def: 2, damp_heat: 1, cold_damp: 1 } },
      { id: "yellow_discharge", name: "带下色黄", patterns: { damp_heat: 3 } },
      { id: "white_discharge", name: "带下色白清稀", patterns: { cold_damp: 2, spleen_qi_def: 1, kidney_yang_def: 1 } },
      { id: "foul_discharge", name: "带下腥臭", patterns: { damp_heat: 2, cold_damp: 1 } },
    ],
  },
  {
    id: "yunchan", name: "孕产", icon: "🤰", femaleOnly: true,
    symptoms: [
      { id: "morning_sickness", name: "妊娠恶阻", patterns: { spleen_qi_def: 2, liver_qi_stag: 1, cold_damp: 1 } },
      { id: "insufficient_lactation", name: "产后缺乳", patterns: { qi_def: 2, blood_def: 2, liver_qi_stag: 1 } },
      { id: "habitual_abortion", name: "滑胎（习惯性流产）", patterns: { kidney_yang_def: 3, kidney_qi_unfixed: 2, spleen_qi_def: 2, qi_def: 1 } },
      { id: "infertility", name: "不孕", patterns: { kidney_yang_def: 2, kidney_yin_def: 2, liver_qi_stag: 2, blood_stasis: 1, cold_damp: 1 } },
    ],
  },
];

const ALL_SYMPTOMS: SymptomDef[] = SYMPTOM_CATEGORIES.flatMap((c) => c.symptoms);
const SYMPTOM_MAP: Record<string, SymptomDef> = Object.fromEntries(
  ALL_SYMPTOMS.map((s) => [s.id, s])
) as Record<string, SymptomDef>;

// ==================== 辨证体系 / 流派 ====================
interface DiffSystem {
  id: string;
  name: string;
  desc: string;
}
const DIFF_SYSTEMS: DiffSystem[] = [
  { id: "bagang", name: "八纲辨证", desc: "以阴阳、表里、寒热、虚实为纲领，总括病位病性" },
  { id: "liujing", name: "六经辨证", desc: "以太阳、阳明、少阳、太阴、少阴、厥阴归纳外感内伤" },
  { id: "zangfu", name: "脏腑辨证", desc: "以脏腑气血阴阳定位定性，内伤杂病常用" },
];

interface School {
  id: string;
  name: string;
  desc: string;
  note: string;
}
const SCHOOLS: School[] = [
  {
    id: "jingfang", name: "经方派", desc: "宗张仲景《伤寒杂病论》",
    note: "崇尚张仲景《伤寒杂病论》，主张方证相应、有是证用是方。重视六经辨证与八纲归属，善用桂枝、麻黄、柴胡、附子等组方，强调顾护胃气、存津液、保阳气。",
  },
  {
    id: "wenbing", name: "温病派", desc: "宗叶天士、吴鞠通温病学说",
    note: "宗叶天士、吴鞠通温病学说，以卫气营血与三焦辨证为纲。善用银翘、桑菊、白虎、清营等方，注重清热透邪、养阴保津，忌辛温发汗伤阴。",
  },
  {
    id: "nihaisha", name: "倪海厦方案", desc: "经方大家，重视阳气与六经",
    note: "经方大家倪海厦推崇阳主阴从，临证重视阳气与水饮、瘀血。常用桂枝汤类调和营卫，四逆汤类温阳救逆，注重六经提纲与阴阳辨证，强调恢复人体自愈之力。",
  },
  {
    id: "like", name: "李可方案", desc: "擅治急症，重用附子回阳",
    note: "李可老中医善治急危重症，创破格救心汤，重用附子、山茱萸回阳救逆。强调阳气为本，重视肾气与中气，治沉疴痼疾多从温阳破阴、通瘀化痰入手。",
  },
];

// ==================== 辨证规则匹配 ====================
function dedupByName<T extends { name: string }>(arr: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of arr) {
    if (!seen.has(item.name)) {
      seen.add(item.name);
      out.push(item);
    }
  }
  return out;
}

function runDiagnosis(params: {
  selected: SelectedSymptom[];
  painNatureIds: string[];
  systemId: string;
  schoolId: string;
}): DiagnosisResult {
  const { selected, painNatureIds, systemId, schoolId } = params;

  // 1. 汇总证型得分
  const scores: Record<string, number> = {};
  for (const sel of selected) {
    const sym = SYMPTOM_MAP[sel.symptomId];
    if (!sym) continue;
    for (const [pid, w] of Object.entries(sym.patterns)) {
      scores[pid] = (scores[pid] || 0) + w;
    }
  }
  for (const nid of painNatureIds) {
    const nature = PAIN_NATURES.find((n) => n.id === nid);
    if (!nature) continue;
    for (const [pid, w] of Object.entries(nature.patterns)) {
      scores[pid] = (scores[pid] || 0) + w;
    }
  }

  // 2. 排序，取主要证型
  const ranked: RankedPattern[] = Object.entries(scores)
    .filter(([, s]) => s > 0)
    .map(([id, score]) => ({ id, score, def: PATTERN_MAP[id] }))
    .filter((r) => !!r.def)
    .sort((a, b) => b.score - a.score);

  const maxScore = ranked.length > 0 ? ranked[0].score : 0;
  const primaryPatterns = ranked
    .filter((r) => r.score >= Math.max(2, maxScore * 0.5))
    .slice(0, 3);

  // 3. 八纲属性汇总
  let heatScore = 0;
  let coldScore = 0;
  let defScore = 0;
  let exScore = 0;
  let hasExterior = false;
  for (const r of ranked.slice(0, 4)) {
    if (r.def.hanRe === "热") heatScore += r.score;
    else if (r.def.hanRe === "寒") coldScore += r.score;
    else if (r.def.hanRe === "寒热错杂") {
      heatScore += r.score * 0.5;
      coldScore += r.score * 0.5;
    }
    if (r.def.xuShi === "虚") defScore += r.score;
    else if (r.def.xuShi === "实") exScore += r.score;
    else if (r.def.xuShi === "虚实夹杂") {
      defScore += r.score * 0.5;
      exScore += r.score * 0.5;
    }
    if (r.def.biaoLi === "表") hasExterior = true;
  }

  // 4. 辨证结论（随辨证体系切换）
  const system = DIFF_SYSTEMS.find((s) => s.id === systemId) || DIFF_SYSTEMS[0];
  const school = SCHOOLS.find((s) => s.id === schoolId) || SCHOOLS[0];
  let conclusion = "";
  let conclusionTags: string[] = [];

  if (systemId === "bagang") {
    const biaoLi = hasExterior && !primaryPatterns.every((p) => p.def.biaoLi === "里") ? "表证" : "里证";
    const hanRe = heatScore > coldScore ? "热证" : coldScore > heatScore ? "寒证" : "寒热错杂";
    const xuShi = defScore > exScore ? "虚证" : exScore > defScore ? "实证" : "虚实夹杂";
    const yangCnt = (biaoLi === "表证" ? 1 : 0) + (hanRe === "热证" ? 1 : 0) + (xuShi === "实证" ? 1 : 0);
    const yinCnt = (biaoLi === "里证" ? 1 : 0) + (hanRe === "寒证" ? 1 : 0) + (xuShi === "虚证" ? 1 : 0);
    const yinYang = yangCnt > yinCnt ? "偏于阳证" : yinCnt > yangCnt ? "偏于阴证" : "阴阳错杂";
    conclusionTags = [biaoLi, hanRe, xuShi, yinYang];
    conclusion = `八纲辨证：${biaoLi} · ${hanRe} · ${xuShi}（${yinYang}）`;
  } else if (systemId === "liujing") {
    const sixScores: Record<string, number> = {};
    for (const r of ranked) {
      const m = r.def.sixMeridian;
      sixScores[m] = (sixScores[m] || 0) + r.score;
    }
    const sixRanked = Object.entries(sixScores).sort((a, b) => b[1] - a[1]);
    const mainMeridian = sixRanked[0]?.[0] || "太阴";
    const secondMeridian = sixRanked[1]?.[0];
    conclusionTags = sixRanked.slice(0, 3).map((e) => `${e[0]}经`);
    conclusion =
      secondMeridian && sixRanked[1][1] > 0
        ? `六经辨证：${mainMeridian}经证为主，兼涉${secondMeridian}经`
        : `六经辨证：${mainMeridian}经证`;
  } else {
    const names = primaryPatterns.map((p) => p.def.name);
    conclusionTags = primaryPatterns.map((p) => p.def.organ);
    conclusion =
      names.length > 0
        ? `脏腑辨证：${names.join("、")}`
        : "脏腑辨证：证候不明显，请补充更多症状";
  }

  // 5. 病机分析
  const pathoParts: string[] = [];
  for (const p of primaryPatterns) {
    pathoParts.push(`【${p.def.name}】${p.def.pathogenesis}`);
  }
  const painNames = painNatureIds
    .map((nid) => PAIN_NATURES.find((n) => n.id === nid)?.name)
    .filter(Boolean) as string[];
  let painHint = "";
  if (painNames.length > 0) {
    const hints: string[] = [];
    if (painNames.includes("刺痛")) hints.push("提示瘀血阻络");
    if (painNames.includes("胀痛")) hints.push("提示气机郁滞");
    if (painNames.includes("隐痛") || painNames.includes("空痛")) hints.push("提示虚损失养");
    if (painNames.includes("灼痛")) hints.push("提示热邪灼络");
    if (painNames.includes("冷痛")) hints.push("提示寒邪凝滞");
    painHint = `疼痛性质为${painNames.join("、")}，${hints.join("、")}。`;
  }
  const tendency =
    defScore > exScore
      ? "整体属虚，治当扶正补虚为主。"
      : exScore > defScore
      ? "整体属实，治当祛邪泻实为先。"
      : "整体虚实夹杂，治当攻补兼施。";
  const pathogenesis = (
    pathoParts.join("\n") +
    (painHint ? "\n" + painHint : "") +
    "\n" +
    tendency
  ).trim();

  // 6. 方剂 / 穴位（去重合并）
  const formulas = dedupByName(primaryPatterns.flatMap((p) => p.def.formulas)).slice(0, 6);
  const acupoints = dedupByName(primaryPatterns.flatMap((p) => p.def.acupoints)).slice(0, 8);

  // 7. 名家思路
  const masterNotes: string[] = [];
  const noteSeen = new Set<string>();
  for (const p of primaryPatterns) {
    if (p.def.masterNotes && !noteSeen.has(p.def.masterNotes)) {
      noteSeen.add(p.def.masterNotes);
      masterNotes.push(p.def.masterNotes);
    }
  }
  masterNotes.push(`【${school.name}】${school.note}`);

  const selectedSymptomNames = selected
    .map((s) => SYMPTOM_MAP[s.symptomId]?.name)
    .filter(Boolean) as string[];

  return {
    systemId,
    systemName: system.name,
    schoolId,
    schoolName: school.name,
    conclusion,
    conclusionTags,
    primaryPatterns,
    pathogenesis,
    formulas,
    acupoints,
    masterNotes,
    selectedSymptomNames,
    painNatureNames: painNames,
    date: new Date().toLocaleString("zh-CN", { hour12: false }),
  };
}

// ==================== localStorage 历史 ====================
const HISTORY_KEY = "yandao_diagnosis_history";

function loadHistory(): HistoryRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryRecord[]) : [];
  } catch {
    return [];
  }
}

function saveHistoryRecord(rec: HistoryRecord): void {
  if (typeof window === "undefined") return;
  try {
    const list = loadHistory();
    list.unshift(rec);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 50)));
  } catch {
    // ignore
  }
}

// ==================== 主组件 ====================
const STEP_TITLES = ["症状选择", "辨证体系", "结果输出"];

export default function DiagnosisPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [gender, setGender] = useState<"male" | "female">("female");
  const [selected, setSelected] = useState<SelectedSymptom[]>([]);
  const [painNatureIds, setPainNatureIds] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["toumian"]));
  const [search, setSearch] = useState("");
  const [systemId, setSystemId] = useState("bagang");
  const [schoolId, setSchoolId] = useState("jingfang");
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [saved, setSaved] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus | null>(null);
  const [lockNotice, setLockNotice] = useState<string | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
    setMembershipStatus(getMembershipStatus());
  }, []);

  // 会员等级判断：basic 为免费用户，monthly/yearly/lifetime 为付费会员
  const isPremium = membershipStatus
    ? membershipStatus.level !== "basic" && membershipStatus.isActive
    : false;

  const visibleCategories = useMemo(
    () => SYMPTOM_CATEGORIES.filter((c) => !c.femaleOnly || gender === "female"),
    [gender]
  );

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return visibleCategories;
    const q = search.trim();
    return visibleCategories
      .map((c) => ({
        ...c,
        symptoms: c.symptoms.filter((s) => s.name.includes(q)),
      }))
      .filter((c) => c.symptoms.length > 0);
  }, [visibleCategories, search]);

  const selectedIds = useMemo(() => new Set(selected.map((s) => s.symptomId)), [selected]);
  const selectedCount = selected.length;

  const toggleSymptom = (symptomId: string) => {
    setSelected((prev) => {
      if (prev.some((s) => s.symptomId === symptomId)) {
        return prev.filter((s) => s.symptomId !== symptomId);
      }
      return [...prev, { symptomId, note: "" }];
    });
  };

  const updateNote = (symptomId: string, note: string) => {
    setSelected((prev) => prev.map((s) => (s.symptomId === symptomId ? { ...s, note } : s)));
  };

  const togglePain = (id: string) => {
    setPainNatureIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleCategory = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleHeaderBack = () => {
    if (step > 1) setStep(step - 1);
    else router.push("/zhongyi");
  };

  const handleNext = () => {
    if (step === 1) {
      if (selectedCount === 0) return;
      setStep(2);
    } else if (step === 2) {
      const res = runDiagnosis({ selected, painNatureIds, systemId, schoolId });
      setResult(res);
      setSaved(false);
      const rec: HistoryRecord = {
        id: `diag_${Date.now()}`,
        date: res.date,
        systemName: res.systemName,
        schoolName: res.schoolName,
        conclusion: res.conclusion,
        symptomNames: res.selectedSymptomNames,
        primaryPatternNames: res.primaryPatterns.map((p) => p.def.name),
      };
      saveHistoryRecord(rec);
      setHistory(loadHistory());
      setSaved(true);
      setStep(3);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleRestart = () => {
    setStep(1);
    setResult(null);
    setSaved(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleClearAll = () => {
    setSelected([]);
    setPainNatureIds([]);
  };

  const progress = (step / 3) * 100;
  const canNext = step === 1 ? selectedCount > 0 : true;

  return (
    <div
      style={{
        maxWidth: "420px",
        margin: "0 auto",
        minHeight: "100vh",
        backgroundColor: "#f8f5fc",
        paddingBottom: "calc(120px + var(--bottom-nav-height, 64px) + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {/* 紫色头部 */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`,
          padding: "12px 16px",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
          <button
            onClick={handleHeaderBack}
            aria-label="返回"
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "white",
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: "17px", fontWeight: "bold", margin: 0 }}>中医智能问诊</h1>
            <p style={{ fontSize: "11px", opacity: 0.85, margin: 0 }}>
              第 {step} 步 · {STEP_TITLES[step - 1]}
            </p>
          </div>
          <span style={{ fontSize: "12px", opacity: 0.85 }}>{step} / 3</span>
        </div>
        {/* 步骤进度条 */}
        <div style={{ height: "6px", background: "rgba(255,255,255,0.3)", borderRadius: "3px", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "white",
              borderRadius: "3px",
              transition: "width 0.3s ease",
            }}
          />
        </div>
        {/* 步骤圆点 */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
          {STEP_TITLES.map((t, i) => {
            const n = i + 1;
            const done = step > n;
            const active = step === n;
            return (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1, justifyContent: "center" }}>
                <div
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    background: done ? "white" : active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.3)",
                    color: active || done ? BRAND : "white",
                    fontSize: "11px",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {done ? "✓" : n}
                </div>
                <span style={{ fontSize: "10px", opacity: active ? 1 : 0.7 }}>{t}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============ 步骤1：症状选择 ============ */}
      {step === 1 && (
        <div style={{ padding: "16px 12px 0" }}>
          {/* 性别选择 */}
          <div
            style={{
              background: "white",
              borderRadius: "14px",
              padding: "12px 14px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              marginBottom: "12px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <span style={{ fontSize: "13px", color: "#666", flexShrink: 0 }}>性别</span>
            <div style={{ display: "flex", gap: "8px" }}>
              {(
                [
                  { id: "male", label: "男" },
                  { id: "female", label: "女" },
                ] as const
              ).map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGender(g.id)}
                  style={{
                    padding: "6px 18px",
                    borderRadius: "20px",
                    border: gender === g.id ? "none" : "1px solid #ddd",
                    background:
                      gender === g.id
                        ? `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`
                        : "white",
                    color: gender === g.id ? "white" : "#666",
                    fontSize: "13px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>
            {gender === "female" && (
              <span style={{ fontSize: "11px", color: BRAND, marginLeft: "auto" }}>含妇科专项</span>
            )}
          </div>

          {/* 搜索框 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "white",
              borderRadius: "20px",
              padding: "8px 14px",
              marginBottom: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              placeholder="搜索症状，如：头痛、失眠、痛经..."
              style={{ flex: 1, border: "none", outline: "none", fontSize: "13px", background: "transparent" }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{ background: "none", border: "none", color: "#999", cursor: "pointer", padding: 0, fontSize: "14px" }}
              >
                ✕
              </button>
            )}
          </div>

          {/* 已选统计 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "10px",
              padding: "0 4px",
            }}
          >
            <span style={{ fontSize: "13px", color: "#666" }}>
              已选 <b style={{ color: BRAND }}>{selectedCount}</b> 项症状
            </span>
            {selectedCount > 0 && (
              <button
                onClick={handleClearAll}
                style={{ background: "none", border: "none", color: "#999", fontSize: "12px", cursor: "pointer" }}
              >
                清空选择
              </button>
            )}
          </div>

          {/* 症状分类折叠列表 */}
          {filteredCategories.length === 0 && (
            <div style={{ textAlign: "center", color: "#999", padding: "40px 0", fontSize: "13px" }}>
              未找到相关症状
            </div>
          )}
          {filteredCategories.map((cat) => {
            const catSelected = cat.symptoms.filter((s) => selectedIds.has(s.id)).length;
            const isOpen = search.trim() ? true : expanded.has(cat.id);
            return (
              <div
                key={cat.id}
                style={{
                  background: "white",
                  borderRadius: "14px",
                  marginBottom: "10px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => toggleCategory(cat.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "12px 14px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: "18px" }}>{cat.icon}</span>
                  <span style={{ flex: 1, fontSize: "14px", fontWeight: "bold", color: "#333" }}>
                    {cat.name}
                    {cat.femaleOnly && (
                      <span style={{ fontSize: "10px", color: "#e91e63", marginLeft: "6px", fontWeight: "normal" }}>
                        妇科
                      </span>
                    )}
                  </span>
                  {catSelected > 0 && (
                    <span
                      style={{
                        fontSize: "11px",
                        padding: "1px 8px",
                        borderRadius: "10px",
                        backgroundColor: BRAND_BG,
                        color: BRAND,
                        fontWeight: "bold",
                      }}
                    >
                      {catSelected}
                    </span>
                  )}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ccc"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {isOpen && (
                  <div
                    style={{
                      padding: "4px 12px 12px",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    {cat.symptoms.map((sym) => {
                      const checked = selectedIds.has(sym.id);
                      return (
                        <button
                          key={sym.id}
                          onClick={() => toggleSymptom(sym.id)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "7px 12px",
                            borderRadius: "20px",
                            border: checked ? `1px solid ${BRAND}` : "1px solid #e5e5e5",
                            background: checked ? BRAND_BG : "white",
                            color: checked ? BRAND : "#555",
                            fontSize: "13px",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <span
                            style={{
                              width: "16px",
                              height: "16px",
                              borderRadius: "4px",
                              border: checked ? "none" : "1.5px solid #ccc",
                              background: checked ? BRAND : "transparent",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {checked && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </span>
                          {sym.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* 疼痛性质（多选） */}
          <div
            style={{
              background: "white",
              borderRadius: "14px",
              padding: "14px",
              marginBottom: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: "bold", color: "#333", marginBottom: "4px" }}>
              🩹 疼痛性质（如有疼痛，可多选）
            </div>
            <div style={{ fontSize: "11px", color: "#999", marginBottom: "10px" }}>
              补充疼痛特征有助于精确辨别病机
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {PAIN_NATURES.map((n) => {
                const checked = painNatureIds.includes(n.id);
                return (
                  <button
                    key={n.id}
                    onClick={() => togglePain(n.id)}
                    title={n.hint}
                    style={{
                      padding: "7px 12px",
                      borderRadius: "20px",
                      border: checked ? `1px solid ${BRAND}` : "1px solid #e5e5e5",
                      background: checked ? BRAND_BG : "white",
                      color: checked ? BRAND : "#555",
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    {n.name}
                  </button>
                );
              })}
            </div>
            {painNatureIds.length > 0 && (
              <div style={{ marginTop: "8px", fontSize: "11px", color: "#888", lineHeight: 1.6 }}>
                {painNatureIds
                  .map((id) => PAIN_NATURES.find((n) => n.id === id)?.hint)
                  .filter(Boolean)
                  .map((h, i) => (
                    <div key={i}>· {h}</div>
                  ))}
              </div>
            )}
          </div>

          {/* 已选症状补充描述 */}
          {selected.length > 0 && (
            <div
              style={{
                background: "white",
                borderRadius: "14px",
                padding: "14px",
                marginBottom: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ fontSize: "14px", fontWeight: "bold", color: "#333", marginBottom: "10px" }}>
                📝 已选症状 · 补充描述
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {selected.map((sel) => {
                  const sym = SYMPTOM_MAP[sel.symptomId];
                  if (!sym) return null;
                  return (
                    <div key={sel.symptomId}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "500", color: BRAND }}>{sym.name}</span>
                        <button
                          onClick={() => toggleSymptom(sel.symptomId)}
                          style={{ background: "none", border: "none", color: "#bbb", cursor: "pointer", fontSize: "12px", marginLeft: "auto" }}
                        >
                          移除
                        </button>
                      </div>
                      <input
                        type="text"
                        value={sel.note}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNote(sel.symptomId, e.target.value)}
                        placeholder="补充：如反复发作、夜间加重、遇冷加剧..."
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          borderRadius: "8px",
                          border: "1px solid #ece8f2",
                          background: "#faf8fd",
                          fontSize: "12px",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 历史记录 */}
          {history.length > 0 && (
            <div
              style={{
                background: "white",
                borderRadius: "14px",
                padding: "14px",
                marginBottom: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ fontSize: "14px", fontWeight: "bold", color: "#333", marginBottom: "10px" }}>
                🕐 历史问诊（{history.length}）
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {history.slice(0, 3).map((h) => (
                  <div
                    key={h.id}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "8px",
                      backgroundColor: "#faf8fd",
                      fontSize: "11px",
                      color: "#777",
                      lineHeight: 1.5,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                      <span style={{ color: BRAND, fontWeight: "bold" }}>
                        {h.systemName} · {h.schoolName}
                      </span>
                      <span>{h.date}</span>
                    </div>
                    <div style={{ color: "#555" }}>{h.conclusion}</div>
                    {h.primaryPatternNames.length > 0 && (
                      <div style={{ marginTop: "2px" }}>证型：{h.primaryPatternNames.join("、")}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============ 步骤2：辨证体系与流派 ============ */}
      {step === 2 && (
        <div style={{ padding: "16px 12px 0" }}>
          {/* 辨证体系选择 */}
          <div style={{ fontSize: "15px", fontWeight: "bold", color: "#333", margin: "0 0 10px" }}>
            ① 选择辨证体系
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
            {DIFF_SYSTEMS.map((sys) => {
              const checked = systemId === sys.id;
              const locked = !isPremium && sys.id !== "bagang";
              return (
                <button
                  key={sys.id}
                  onClick={() => {
                    if (locked) {
                      setLockNotice(`「${sys.name}」为会员专享辨证体系`);
                      return;
                    }
                    setLockNotice(null);
                    setSystemId(sys.id);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    padding: "14px",
                    borderRadius: "14px",
                    border: checked ? `2px solid ${BRAND}` : "2px solid #eee",
                    background: checked ? BRAND_BG : "white",
                    cursor: "pointer",
                    textAlign: "left",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    opacity: locked ? 0.7 : 1,
                  }}
                >
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      border: checked ? `6px solid ${BRAND}` : "2px solid #ccc",
                      background: "white",
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "15px", fontWeight: "bold", color: checked ? BRAND : "#333", display: "flex", alignItems: "center", gap: "6px" }}>
                      {sys.name}
                      {locked && <LockIcon />}
                    </div>
                    <div style={{ fontSize: "12px", color: "#888", marginTop: "3px", lineHeight: 1.5 }}>{sys.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 流派方案选择 */}
          <div style={{ fontSize: "15px", fontWeight: "bold", color: "#333", margin: "0 0 10px" }}>
            ② 选择流派方案
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
            {SCHOOLS.map((sch) => {
              const checked = schoolId === sch.id;
              const locked = !isPremium && sch.id !== "jingfang";
              return (
                <button
                  key={sch.id}
                  onClick={() => {
                    if (locked) {
                      setLockNotice(`「${sch.name}」为会员专享流派方案`);
                      return;
                    }
                    setLockNotice(null);
                    setSchoolId(sch.id);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    padding: "14px",
                    borderRadius: "14px",
                    border: checked ? `2px solid ${BRAND}` : "2px solid #eee",
                    background: checked ? BRAND_BG : "white",
                    cursor: "pointer",
                    textAlign: "left",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    opacity: locked ? 0.7 : 1,
                  }}
                >
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      border: checked ? `6px solid ${BRAND}` : "2px solid #ccc",
                      background: "white",
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "15px", fontWeight: "bold", color: checked ? BRAND : "#333", display: "flex", alignItems: "center", gap: "6px" }}>
                      {sch.name}
                      {locked && <LockIcon />}
                    </div>
                    <div style={{ fontSize: "12px", color: "#888", marginTop: "3px", lineHeight: 1.5 }}>{sch.desc}</div>
                    {checked && (
                      <div style={{ fontSize: "11px", color: "#6a5a7a", marginTop: "6px", lineHeight: 1.6, fontStyle: "italic" }}>
                        {sch.note}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 锁定提示（免费用户点击会员专享项时展示） */}
          {lockNotice && (
            <div style={{ marginBottom: "16px" }}>
              <UpgradePrompt message={`${lockNotice}，升级会员解锁全部辨证流派与名家方案`} />
            </div>
          )}

          {/* 已选症状摘要 */}
          <div
            style={{
              background: "white",
              borderRadius: "14px",
              padding: "14px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <span style={{ fontSize: "14px", fontWeight: "bold", color: "#333" }}>已选症状摘要</span>
              <button
                onClick={() => setStep(1)}
                style={{ background: "none", border: "none", color: BRAND, fontSize: "12px", cursor: "pointer" }}
              >
                修改 ›
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {selected.map((sel) => {
                const sym = SYMPTOM_MAP[sel.symptomId];
                return sym ? (
                  <span
                    key={sel.symptomId}
                    style={{
                      fontSize: "12px",
                      padding: "4px 10px",
                      borderRadius: "12px",
                      backgroundColor: BRAND_BG,
                      color: BRAND,
                    }}
                  >
                    {sym.name}
                  </span>
                ) : null;
              })}
            </div>
            {painNatureIds.length > 0 && (
              <div style={{ marginTop: "10px", fontSize: "12px", color: "#888" }}>
                疼痛性质：
                {painNatureIds
                  .map((id) => PAIN_NATURES.find((n) => n.id === id)?.name)
                  .join("、")}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ 步骤3：结果输出 ============ */}
      {step === 3 && result && (
        <div style={{ padding: "16px 12px 0" }}>
          {/* 辨证结论 */}
          <div
            style={{
              background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`,
              borderRadius: "16px",
              padding: "20px",
              color: "white",
              marginBottom: "12px",
              boxShadow: "0 4px 16px rgba(123,47,190,0.25)",
            }}
          >
            <div style={{ fontSize: "12px", opacity: 0.85, marginBottom: "6px" }}>
              辨证体系 · {result.systemName} ｜ 流派 · {result.schoolName}
            </div>
            <div style={{ fontSize: "12px", opacity: 0.7, marginBottom: "8px" }}>{result.date}</div>
            <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: "0 0 12px", lineHeight: 1.5 }}>
              {result.conclusion}
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {result.conclusionTags.map((tag, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: "12px",
                    padding: "3px 12px",
                    borderRadius: "12px",
                    background: "rgba(255,255,255,0.25)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* 主要证型 */}
          {result.primaryPatterns.length > 0 && (
            <SectionCard title="🔍 主要证型" accent={BRAND}>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {result.primaryPatterns.map((p, i) => (
                  <div
                    key={p.id}
                    style={{
                      padding: "12px",
                      borderRadius: "10px",
                      backgroundColor: BRAND_BG,
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: BRAND,
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px",
                        fontWeight: "bold",
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: "bold", color: BRAND }}>{p.def.name}</div>
                      <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>
                        {p.def.organ} · {p.def.biaoLi}/{p.def.hanRe}/{p.def.xuShi} · {p.def.sixMeridian}经
                      </div>
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: "bold", color: BRAND }}>{p.score}分</div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* 病机分析 */}
          <SectionCard title="🧬 病机分析" accent="#E65100">
            <p style={{ fontSize: "13px", color: "#555", lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap" }}>
              {result.pathogenesis}
            </p>
            {result.selectedSymptomNames.length > 0 && (
              <div style={{ marginTop: "12px" }}>
                <div style={{ fontSize: "12px", color: "#999", marginBottom: "6px" }}>主要症状表现：</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {result.selectedSymptomNames.map((n, i) => (
                    <span
                      key={i}
                      style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "8px", backgroundColor: "#f5f0f9", color: "#7a6a8a" }}
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>

          {/* 方案建议：经典方剂参考 */}
          <SectionCard title="💊 方案建议 · 经典方剂参考" accent="#2E7D32">
            {result.formulas.length === 0 ? (
              <EmptyHint text="症状信息不足，无法匹配经典方剂，请补充更多症状。" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {result.formulas.map((f, i) => (
                  <div key={i} style={{ padding: "12px", borderRadius: "10px", border: "1px solid #e8f0e8", backgroundColor: "#fafff9" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{ fontSize: "16px" }}>📜</span>
                      <span style={{ fontSize: "14px", fontWeight: "bold", color: "#2E7D32" }}>{f.name}</span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#555", lineHeight: 1.7 }}>{f.desc}</div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* 针灸取穴建议（会员专享） */}
          <SectionCard title="📍 针灸取穴建议" accent="#1565C0">
            {isPremium ? (
              result.acupoints.length === 0 ? (
                <EmptyHint text="暂无明确取穴建议，请补充症状后重试。" />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  {result.acupoints.map((a, i) => (
                    <div key={i} style={{ padding: "12px", borderRadius: "10px", backgroundColor: "#eef6fd" }}>
                      <div style={{ fontSize: "14px", fontWeight: "bold", color: "#1565C0", marginBottom: "4px" }}>
                        {a.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "#555", lineHeight: 1.5 }}>{a.desc}</div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <UpgradePrompt message="升级会员解锁针灸取穴建议" />
            )}
          </SectionCard>

          {/* 名家思路参考（会员专享） */}
          <SectionCard title="🎓 名家思路参考" accent="#6A1B9A">
            {isPremium ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {result.masterNotes.map((note, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "12px",
                      borderRadius: "10px",
                      backgroundColor: i === result.masterNotes.length - 1 ? "#f3edf7" : "#faf6fe",
                      borderLeft: `3px solid ${BRAND_LIGHT}`,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: "12px",
                        color: i === result.masterNotes.length - 1 ? "#5a3a7a" : "#666",
                        lineHeight: 1.8,
                      }}
                    >
                      {note}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <UpgradePrompt message="升级会员解锁全部辨证流派与名家方案" />
            )}
          </SectionCard>

          {/* 保存状态 */}
          <div style={{ textAlign: "center", fontSize: "12px", color: "#2E7D32", padding: "4px 0" }}>
            {saved ? "✓ 本次问诊已记录到历史" : ""}
          </div>
        </div>
      )}

      {/* 强制合规提示 */}
      <div
        style={{
          margin: "16px 12px 0",
          padding: "12px 14px",
          backgroundColor: "#fff3e0",
          borderRadius: "12px",
          border: "1px solid #ffd9a8",
        }}
      >
        <p style={{ margin: 0, fontSize: "12px", color: "#e65100", textAlign: "center", lineHeight: 1.6, fontWeight: 500 }}>
          ⚠️ {COMPLIANCE_TEXT}
        </p>
      </div>

      {/* 底部操作栏 */}
      <div
        style={{
          position: "fixed",
          bottom: "calc(var(--bottom-nav-height, 64px) + env(safe-area-inset-bottom, 0px))",
          left: 0,
          right: 0,
          maxWidth: "420px",
          margin: "0 auto",
          padding: "12px 16px",
          background: "white",
          borderTop: "1px solid #f0f0f0",
          display: "flex",
          gap: "10px",
          zIndex: 50,
        }}
      >
        {step < 3 ? (
          <>
            <button
              onClick={handlePrev}
              disabled={step === 1}
              style={{
                flex: 1,
                padding: "13px",
                borderRadius: "12px",
                border: step === 1 ? "1px solid #e8e8e8" : "1px solid #ddd",
                background: step === 1 ? "#f7f7f7" : "white",
                color: step === 1 ? "#ccc" : "#666",
                fontSize: "14px",
                fontWeight: "500",
                cursor: step === 1 ? "not-allowed" : "pointer",
              }}
            >
              上一步
            </button>
            <button
              onClick={handleNext}
              disabled={!canNext}
              style={{
                flex: 2,
                padding: "13px",
                borderRadius: "12px",
                border: "none",
                background: canNext
                  ? `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`
                  : "#e0e0e0",
                color: canNext ? "white" : "#999",
                fontSize: "15px",
                fontWeight: "bold",
                cursor: canNext ? "pointer" : "not-allowed",
                boxShadow: canNext ? "0 2px 8px rgba(123,47,190,0.3)" : "none",
              }}
            >
              {step === 1 ? "下一步：选择辨证" : "开始辨证"}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleRestart}
              style={{
                flex: 1,
                padding: "13px",
                borderRadius: "12px",
                border: "1px solid #ddd",
                background: "white",
                color: "#666",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              重新问诊
            </button>
            <button
              onClick={() => router.push("/zhongyi")}
              style={{
                flex: 1,
                padding: "13px",
                borderRadius: "12px",
                border: "none",
                background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`,
                color: "white",
                fontSize: "14px",
                fontWeight: "bold",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(123,47,190,0.3)",
              }}
            >
              返回中医首页
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ==================== 子组件 ====================
function SectionCard({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: "16px",
        padding: "16px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        marginBottom: "12px",
      }}
    >
      <h3
        style={{
          fontSize: "15px",
          fontWeight: "bold",
          color: accent,
          margin: "0 0 12px",
          paddingBottom: "8px",
          borderBottom: `2px solid ${accent}1a`,
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div style={{ textAlign: "center", color: "#999", fontSize: "12px", padding: "16px 0", lineHeight: 1.6 }}>
      {text}
    </div>
  );
}

// 锁定图标（会员专享标识）
function LockIcon() {
  return (
    <span
      title="会员专享"
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </span>
  );
}

// 内联升级提示（非弹窗，品牌紫色风格）
function UpgradePrompt({ message }: { message?: string }) {
  return (
    <div
      style={{
        padding: "16px 14px",
        borderRadius: "12px",
        background: `linear-gradient(135deg, ${BRAND_BG} 0%, #ffffff 100%)`,
        border: `1px solid ${BRAND}33`,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          color: BRAND,
          fontWeight: "bold",
          marginBottom: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
        }}
      >
        <LockIcon />
        {message || "升级会员解锁全部辨证流派与名家方案"}
      </div>
      <Link
        href="/membership"
        style={{
          display: "inline-block",
          fontSize: "13px",
          color: "white",
          background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`,
          padding: "6px 20px",
          borderRadius: "20px",
          fontWeight: "bold",
          textDecoration: "none",
          boxShadow: "0 2px 8px rgba(123,47,190,0.25)",
        }}
      >
        立即升级 ›
      </Link>
    </div>
  );
}
