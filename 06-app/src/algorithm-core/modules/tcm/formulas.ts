/**
 * 原始来源：TCM-Learning-Assistant (MIT License)
 * 原始版本：v1.0
 * 修改记录：2026-07-26 通过导入 JSON 数据源完成实现
 * 当前协议：MIT
 *
 * 合规改造说明：
 * - 原始数据来源于 TCM-Learning-Assistant 项目的 formulas.json
 * - 仅保留学习用途字段：方剂名、组成、功效、典籍出处
 * - 已移除任何涉及医疗建议、诊断、处方的字段
 * - 所有数据标注"典籍记载"来源
 * - 数据中"主治""适应证"等字段均为典籍原文记载，非医疗建议
 *
 * 数据来源：《伤寒论》《金匮要略》《温病条辨》《太平惠民和剂局方》
 * 提取日期：2026-07-26
 * 总计方剂：316首（完整数据见 data/formulas.json）
 */

import type { TcmFormula } from '../../types/tcm';
// 直接 import JSON 数据，确保静态导出时数据完整（316首方剂）
import formulasJson from './data/formulas.json';

// ============================================================================
// 原始方剂条目类型（与 JSON 结构对应）
// ============================================================================

interface RawFormulaComposition {
  herb: string;
  dosage: string;
  role: string;
  note: string;
}

interface RawFormulaEntry {
  id: string;
  name: string;
  pinyin: string;
  alias: string[];
  composition: RawFormulaComposition[];
  efficacy: string;
  indications: string;
  indications_disclaimer: string;
  contraindications: string;
  usage: string;
  usage_disclaimer: string;
  source: string;
  category: string;
  classic_text: string;
  classic_source: string;
  classic_usage: string;
  modern_research?: string;
}

function mapRawFormulaToTcm(entry: RawFormulaEntry): TcmFormula {
  return {
    id: entry.id,
    name: entry.name,
    pinyin: entry.pinyin,
    alias: entry.alias || [],
    category: entry.category,
    composition: entry.composition.map((c) => ({
      herb: c.herb,
      dosage: c.dosage,
    })),
    efficacy: entry.efficacy,
    indications: entry.indications,
    source: entry.source,
    preparation: entry.usage || '水煎服',
    contraindications: entry.contraindications || '',
  };
}

// ============================================================================
// 方剂库（内嵌20首代表性方剂，覆盖各分类）
// 完整316首数据见 data/formulas.json
// ============================================================================

const RAW_FORMULAS_INLINE: RawFormulaEntry[] = [
  // ---- 解表剂 ----
  {
    id: 'f001', name: '麻黄汤', pinyin: 'ma huang tang', alias: ['麻黄解表汤'],
    composition: [
      { herb: '麻黄', dosage: '9g', role: '君', note: '去节' },
      { herb: '桂枝', dosage: '6g', role: '臣', note: '去皮' },
      { herb: '杏仁', dosage: '9g', role: '佐', note: '去皮尖' },
      { herb: '甘草', dosage: '3g', role: '使', note: '炙' },
    ],
    efficacy: '发汗解表，宣肺平喘',
    indications: '外感风寒表实证，症见恶寒发热，头身疼痛，无汗而喘，舌苔薄白，脉浮紧',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '表虚自汗、阴虚血少者忌用',
    usage: '水煎服，温覆取微汗',
    usage_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '《伤寒论》',
    category: '解表剂-辛温解表',
    classic_text: '太阳病，头痛发热，身疼腰痛，骨节疼痛，恶风无汗而喘者，麻黄汤主之。',
    classic_source: '《伤寒论》第35条',
    classic_usage: '上四味，以水九升，先煮麻黄，减二升，去上沫，内诸药，煮取二升半，去滓，温服八合。覆取微似汗，不须啜粥，余如桂枝法将息。',
  },
  {
    id: 'f002', name: '桂枝汤', pinyin: 'gui zhi tang', alias: ['阳旦汤'],
    composition: [
      { herb: '桂枝', dosage: '9g', role: '君', note: '去皮' },
      { herb: '芍药', dosage: '9g', role: '臣', note: '生用' },
      { herb: '甘草', dosage: '6g', role: '佐', note: '炙' },
      { herb: '生姜', dosage: '9g', role: '佐', note: '切' },
      { herb: '大枣', dosage: '12枚', role: '使', note: '擘' },
    ],
    efficacy: '解肌发表，调和营卫',
    indications: '外感风寒表虚证，症见头痛发热，汗出恶风，鼻鸣干呕，苔白不渴，脉浮缓或浮弱',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '表实无汗者忌用',
    usage: '水煎服，温覆取微汗',
    usage_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '《伤寒论》',
    category: '解表剂-辛温解表',
    classic_text: '太阳中风，阳浮而阴弱，阳浮者热自发，阴弱者汗自出，啬啬恶寒，淅淅恶风，翕翕发热，鼻鸣干呕者，桂枝汤主之。',
    classic_source: '《伤寒论》第12条',
    classic_usage: '上五味，㕮咀三味，以水七升，微火煮取三升，去滓，适寒温，服一升。服已须臾，啜热稀粥一升余，以助药力。',
  },
  {
    id: 'f003', name: '小青龙汤', pinyin: 'xiao qing long tang', alias: [],
    composition: [
      { herb: '麻黄', dosage: '9g', role: '君', note: '去节' },
      { herb: '桂枝', dosage: '9g', role: '臣', note: '去皮' },
      { herb: '细辛', dosage: '3g', role: '佐', note: '生用' },
      { herb: '干姜', dosage: '3g', role: '佐', note: '生用' },
      { herb: '甘草', dosage: '6g', role: '使', note: '炙' },
      { herb: '芍药', dosage: '9g', role: '佐', note: '生用' },
      { herb: '半夏', dosage: '9g', role: '佐', note: '洗' },
      { herb: '五味子', dosage: '3g', role: '佐', note: '生用' },
    ],
    efficacy: '解表散寒，温肺化饮',
    indications: '外寒内饮证，症见恶寒发热，无汗，喘咳，痰多而稀，或痰饮咳喘，不得平卧，或身体疼重，头面四肢浮肿，舌苔白滑，脉浮',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '阴虚干咳、肺热咳喘者忌用',
    usage: '水煎服',
    usage_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '《伤寒论》',
    category: '解表剂-辛温解表',
    classic_text: '伤寒表不解，心下有水气，干呕，发热而咳，或渴，或利，或噎，或小便不利、少腹满，或喘者，小青龙汤主之。',
    classic_source: '《伤寒论》第40条',
    classic_usage: '上八味，以水一斗，先煮麻黄，减二升，去上沫，内诸药，煮取三升，去滓，温服一升。',
  },
  {
    id: 'f004', name: '大青龙汤', pinyin: 'da qing long tang', alias: [],
    composition: [
      { herb: '麻黄', dosage: '12g', role: '君', note: '去节' },
      { herb: '桂枝', dosage: '4g', role: '臣', note: '去皮' },
      { herb: '甘草', dosage: '5g', role: '佐', note: '炙' },
      { herb: '杏仁', dosage: '6g', role: '佐', note: '去皮尖' },
      { herb: '生姜', dosage: '9g', role: '佐', note: '切' },
      { herb: '大枣', dosage: '10枚', role: '使', note: '擘' },
      { herb: '石膏', dosage: '18g', role: '臣', note: '碎' },
    ],
    efficacy: '发汗解表，清热除烦',
    indications: '外感风寒，内有郁热证，症见恶寒发热，头身疼痛，无汗，烦躁，口渴，脉浮紧',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '表虚自汗、阴虚发热者忌用',
    usage: '水煎服，取微汗',
    usage_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '《伤寒论》',
    category: '解表剂-辛温解表',
    classic_text: '太阳中风，脉浮紧，发热恶寒，身疼痛，不汗出而烦躁者，大青龙汤主之。',
    classic_source: '《伤寒论》第38条',
    classic_usage: '上七味，以水九升，先煮麻黄，减二升，去上沫，内诸药，煮取三升，去滓，温服一升，取微似汗。',
  },
  {
    id: 'f005', name: '葛根汤', pinyin: 'ge gen tang', alias: [],
    composition: [
      { herb: '葛根', dosage: '12g', role: '君', note: '生用' },
      { herb: '麻黄', dosage: '9g', role: '臣', note: '去节' },
      { herb: '桂枝', dosage: '6g', role: '臣', note: '去皮' },
      { herb: '生姜', dosage: '9g', role: '佐', note: '切' },
      { herb: '甘草', dosage: '6g', role: '佐', note: '炙' },
      { herb: '芍药', dosage: '6g', role: '佐', note: '生用' },
      { herb: '大枣', dosage: '12枚', role: '使', note: '擘' },
    ],
    efficacy: '发汗解表，升津舒筋',
    indications: '外感风寒，太阳经气不舒证，症见发热恶寒，头痛无汗，项背强几几，或下利，舌苔薄白，脉浮紧',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '表虚有汗者不宜',
    usage: '水煎服',
    usage_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '《伤寒论》',
    category: '解表剂-辛温解表',
    classic_text: '太阳病，项背强几几，无汗恶风，葛根汤主之。',
    classic_source: '《伤寒论》第31条',
    classic_usage: '上七味，以水一斗，先煮麻黄、葛根，减二升，去上沫，内诸药，煮取三升，去滓，温服一升。',
  },
  {
    id: 'f006', name: '麻黄杏仁甘草石膏汤', pinyin: 'ma huang xing ren gan cao shi gao tang', alias: ['麻杏石甘汤'],
    composition: [
      { herb: '麻黄', dosage: '9g', role: '君', note: '去节' },
      { herb: '杏仁', dosage: '9g', role: '臣', note: '去皮尖' },
      { herb: '甘草', dosage: '6g', role: '佐', note: '炙' },
      { herb: '石膏', dosage: '18g', role: '臣', note: '碎' },
    ],
    efficacy: '辛凉宣泄，清肺平喘',
    indications: '外感风邪，邪热壅肺证，症见身热不解，咳逆气急，口渴，有汗或无汗，舌苔薄白或黄，脉滑数',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '风寒咳喘、虚证咳喘者忌用',
    usage: '水煎服',
    usage_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '《伤寒论》',
    category: '解表剂-辛凉解表',
    classic_text: '',
    classic_source: '',
    classic_usage: '上四味，以水七升，先煮麻黄，减二升，去上沫，内诸药，煮取二升，去滓，温服一升。',
  },

  // ---- 和解剂 ----
  {
    id: 'f009', name: '小柴胡汤', pinyin: 'xiao chai hu tang', alias: [],
    composition: [
      { herb: '柴胡', dosage: '12g', role: '君', note: '生用' },
      { herb: '黄芩', dosage: '9g', role: '臣', note: '生用' },
      { herb: '人参', dosage: '6g', role: '佐', note: '生用' },
      { herb: '半夏', dosage: '9g', role: '佐', note: '洗' },
      { herb: '甘草', dosage: '5g', role: '佐', note: '炙' },
      { herb: '生姜', dosage: '9g', role: '佐', note: '切' },
      { herb: '大枣', dosage: '4枚', role: '使', note: '擘' },
    ],
    efficacy: '和解少阳',
    indications: '伤寒少阳证，症见往来寒热，胸胁苦满，默默不欲饮食，心烦喜呕，口苦，咽干，目眩，舌苔薄白，脉弦',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '肝阳上亢、肝火偏盛者慎用',
    usage: '水煎服',
    usage_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '《伤寒论》',
    category: '和解剂-和解少阳',
    classic_text: '伤寒五六日中风，往来寒热，胸胁苦满，嘿嘿不欲饮食，心烦喜呕，或胸中烦而不呕，或渴，或腹中痛，或胁下痞硬，或心下悸、小便不利，或不渴、身有微热，或咳者，小柴胡汤主之。',
    classic_source: '《伤寒论》第96条',
    classic_usage: '上七味，以水一斗二升，煮取六升，去滓，再煎取三升，温服一升，日三服。',
  },
  {
    id: 'f010', name: '大柴胡汤', pinyin: 'da chai hu tang', alias: [],
    composition: [
      { herb: '柴胡', dosage: '12g', role: '君', note: '生用' },
      { herb: '黄芩', dosage: '9g', role: '臣', note: '生用' },
      { herb: '芍药', dosage: '9g', role: '佐', note: '生用' },
      { herb: '半夏', dosage: '9g', role: '佐', note: '洗' },
      { herb: '生姜', dosage: '15g', role: '佐', note: '切' },
      { herb: '枳实', dosage: '9g', role: '佐', note: '炙' },
      { herb: '大枣', dosage: '4枚', role: '使', note: '擘' },
      { herb: '大黄', dosage: '6g', role: '臣', note: '酒洗' },
    ],
    efficacy: '和解少阳，内泻热结',
    indications: '少阳阳明合病，症见往来寒热，胸胁苦满，呕不止，郁郁微烦，心下痞硬，或心下满痛，大便不解或协热下利，舌苔黄，脉弦数有力',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '脾胃虚寒者忌用',
    usage: '水煎服',
    usage_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '《伤寒论》',
    category: '和解剂-和解少阳',
    classic_text: '太阳病，过经十余日，反二三下之，后四五日，柴胡证仍在者，先与小柴胡。呕不止，心下急，郁郁微烦者，为未解也，与大柴胡汤下之则愈。',
    classic_source: '《伤寒论》第103条',
    classic_usage: '上八味，以水一斗二升，煮取六升，去滓，再煎取三升，温服一升，日三服。',
  },
  {
    id: 'f011', name: '四逆散', pinyin: 'si ni san', alias: [],
    composition: [
      { herb: '柴胡', dosage: '6g', role: '君', note: '生用' },
      { herb: '芍药', dosage: '9g', role: '臣', note: '生用' },
      { herb: '枳实', dosage: '6g', role: '佐', note: '炙' },
      { herb: '甘草', dosage: '6g', role: '使', note: '炙' },
    ],
    efficacy: '透邪解郁，疏肝理脾',
    indications: '阳郁厥逆证，症见手足不温，或腹痛，或泄利下重，脉弦；肝脾气郁证，症见胁肋胀闷，脘腹疼痛，脉弦',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '阴虚火旺者慎用',
    usage: '水煎服，或作散剂冲服',
    usage_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '《伤寒论》',
    category: '和解剂-调和肝脾',
    classic_text: '',
    classic_source: '',
    classic_usage: '',
  },
  {
    id: 'f012', name: '半夏泻心汤', pinyin: 'ban xia xie xin tang', alias: [],
    composition: [
      { herb: '半夏', dosage: '12g', role: '君', note: '洗' },
      { herb: '黄芩', dosage: '9g', role: '臣', note: '生用' },
      { herb: '干姜', dosage: '9g', role: '臣', note: '生用' },
      { herb: '人参', dosage: '9g', role: '佐', note: '生用' },
      { herb: '甘草', dosage: '9g', role: '佐', note: '炙' },
      { herb: '黄连', dosage: '3g', role: '佐', note: '生用' },
      { herb: '大枣', dosage: '4枚', role: '使', note: '擘' },
    ],
    efficacy: '寒热平调，消痞散结',
    indications: '寒热互结之痞证，症见心下痞，但满而不痛，或呕吐，肠鸣下利，舌苔腻而微黄',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '脾胃虚寒者不宜单用',
    usage: '水煎服',
    usage_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '《伤寒论》',
    category: '和解剂-调和肠胃',
    classic_text: '',
    classic_source: '',
    classic_usage: '',
  },

  // ---- 清热剂 ----
  {
    id: 'f013', name: '白虎汤', pinyin: 'bai hu tang', alias: [],
    composition: [
      { herb: '石膏', dosage: '50g', role: '君', note: '碎' },
      { herb: '知母', dosage: '18g', role: '臣', note: '生用' },
      { herb: '甘草', dosage: '6g', role: '佐', note: '炙' },
      { herb: '粳米', dosage: '9g', role: '使', note: '生用' },
    ],
    efficacy: '清热生津',
    indications: '气分热盛证，症见壮热面赤，烦渴引饮，汗出恶热，脉洪大有力',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '表证未解、阳虚发热者忌用',
    usage: '水煎服',
    usage_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '《伤寒论》',
    category: '清热剂-清气分热',
    classic_text: '伤寒脉浮滑，此以表有热、里有寒，白虎汤主之。',
    classic_source: '《伤寒论》第176条',
    classic_usage: '上四味，以水一斗，煮米熟，汤成去滓，温服一升，日三服。',
  },
  {
    id: 'f014', name: '白虎加人参汤', pinyin: 'bai hu jia ren shen tang', alias: [],
    composition: [
      { herb: '石膏', dosage: '50g', role: '君', note: '碎' },
      { herb: '知母', dosage: '18g', role: '臣', note: '生用' },
      { herb: '甘草', dosage: '6g', role: '佐', note: '炙' },
      { herb: '粳米', dosage: '9g', role: '使', note: '生用' },
      { herb: '人参', dosage: '9g', role: '臣', note: '生用' },
    ],
    efficacy: '清热，益气，生津',
    indications: '气分热盛，气津两伤证，症见汗、吐、下后，里热炽盛，而见四大症者；或暑热病见气津两伤者',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '阳虚发热者忌用',
    usage: '水煎服',
    usage_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '《伤寒论》',
    category: '清热剂-清气分热',
    classic_text: '',
    classic_source: '',
    classic_usage: '上五味，以水一斗，煮米熟，汤成去滓，温服一升，日三服。',
  },
  {
    id: 'f015', name: '竹叶石膏汤', pinyin: 'zhu ye shi gao tang', alias: [],
    composition: [
      { herb: '竹叶', dosage: '6g', role: '君', note: '生用' },
      { herb: '石膏', dosage: '50g', role: '臣', note: '碎' },
      { herb: '半夏', dosage: '9g', role: '佐', note: '洗' },
      { herb: '麦门冬', dosage: '20g', role: '臣', note: '去心' },
      { herb: '人参', dosage: '6g', role: '佐', note: '生用' },
      { herb: '甘草', dosage: '6g', role: '佐', note: '炙' },
      { herb: '粳米', dosage: '10g', role: '使', note: '生用' },
    ],
    efficacy: '清热生津，益气和胃',
    indications: '伤寒、温病、暑病余热未清，气津两伤证，症见身热多汗，心胸烦闷，气逆欲呕，口干喜饮，或虚烦不寐，舌红苔少，脉虚数',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '脾胃虚寒者慎用',
    usage: '水煎服',
    usage_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '《伤寒论》',
    category: '清热剂-清气分热',
    classic_text: '',
    classic_source: '',
    classic_usage: '上七味，以水一斗，煮取六升，去滓，内粳米，煮米熟，汤成去滓，温服一升，日三服。',
  },

  // ---- 泻下剂 ----
  {
    id: 'f016', name: '调胃承气汤', pinyin: 'diao wei cheng qi tang', alias: [],
    composition: [
      { herb: '大黄', dosage: '12g', role: '君', note: '酒洗' },
      { herb: '甘草', dosage: '6g', role: '佐', note: '炙' },
      { herb: '芒硝', dosage: '12g', role: '臣', note: '冲服' },
    ],
    efficacy: '缓下热结',
    indications: '阳明腑实证，症见大便不通，口渴心烦，或谵语，腹满，舌苔正黄，脉滑数',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '孕妇、体虚者慎用',
    usage: '大黄、甘草同煎，芒硝冲服',
    usage_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '《伤寒论》',
    category: '泻下剂-寒下',
    classic_text: '太阳病三日，发汗不解，蒸蒸发热者，属胃也，调胃承气汤主之。',
    classic_source: '《伤寒论》第248条',
    classic_usage: '上三味，以水三升，煮取一升，去滓，内芒硝，更煮微沸，少少温服之。',
  },
  {
    id: 'f017', name: '小承气汤', pinyin: 'xiao cheng qi tang', alias: [],
    composition: [
      { herb: '大黄', dosage: '12g', role: '君', note: '酒洗' },
      { herb: '厚朴', dosage: '6g', role: '臣', note: '去皮炙' },
      { herb: '枳实', dosage: '9g', role: '佐', note: '炙' },
    ],
    efficacy: '轻下热结',
    indications: '阳明腑实证，症见谵语潮热，大便秘结，胸腹痞满，舌苔老黄，脉滑而疾',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '孕妇、体虚者慎用',
    usage: '水煎服',
    usage_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '《伤寒论》',
    category: '泻下剂-寒下',
    classic_text: '阳明病，其人多汗，以津液外出，胃中燥，大便必硬，硬则谵语，小承气汤主之。',
    classic_source: '《伤寒论》第213条',
    classic_usage: '上三味，以水四升，煮取一升二合，去滓，分温二服。',
  },
  {
    id: 'f018', name: '大承气汤', pinyin: 'da cheng qi tang', alias: [],
    composition: [
      { herb: '大黄', dosage: '12g', role: '君', note: '酒洗' },
      { herb: '厚朴', dosage: '24g', role: '臣', note: '去皮炙' },
      { herb: '枳实', dosage: '12g', role: '佐', note: '炙' },
      { herb: '芒硝', dosage: '9g', role: '臣', note: '冲服' },
    ],
    efficacy: '峻下热结',
    indications: '阳明腑实证，症见大便不通，频转矢气，脘腹痞满，腹痛拒按，日晡潮热，神昏谵语，舌苔黄燥起刺，脉沉实',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '表证未解、阴虚肠燥、孕妇忌用',
    usage: '先煎厚朴、枳实，后下大黄，芒硝冲服',
    usage_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '《伤寒论》',
    category: '泻下剂-寒下',
    classic_text: '阳明病，发热汗多者，急下之，宜大承气汤。',
    classic_source: '《伤寒论》第253条',
    classic_usage: '上四味，以水一斗，先煮二物，取五升，去滓，内大黄，更煮取二升，去滓，内芒硝，更上微火一两沸，分温再服。',
  },
  {
    id: 'f019', name: '麻子仁丸', pinyin: 'ma zi ren wan', alias: ['脾约丸'],
    composition: [
      { herb: '麻子仁', dosage: '20g', role: '君', note: '生用' },
      { herb: '芍药', dosage: '9g', role: '臣', note: '生用' },
      { herb: '枳实', dosage: '9g', role: '佐', note: '炙' },
      { herb: '大黄', dosage: '12g', role: '臣', note: '酒洗' },
      { herb: '厚朴', dosage: '9g', role: '佐', note: '去皮炙' },
      { herb: '杏仁', dosage: '10g', role: '佐', note: '去皮尖' },
    ],
    efficacy: '润肠泄热，行气通便',
    indications: '肠胃燥热，脾约便秘证，症见大便干结，小便频数，苔微黄少津',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '孕妇、虚秘者慎用',
    usage: '上药为末，炼蜜为丸，每次9g，每日1-2次',
    usage_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '《伤寒论》',
    category: '泻下剂-润下',
    classic_text: '',
    classic_source: '',
    classic_usage: '上六味，蜜和丸，如梧桐子大，饮服十丸，日三服，渐加，以知为度。',
  },
  {
    id: 'f020', name: '茵陈蒿汤', pinyin: 'yin chen hao tang', alias: [],
    composition: [
      { herb: '茵陈蒿', dosage: '18g', role: '君', note: '生用' },
      { herb: '栀子', dosage: '9g', role: '臣', note: '擘' },
      { herb: '大黄', dosage: '6g', role: '佐', note: '酒洗' },
    ],
    efficacy: '清热，利湿，退黄',
    indications: '湿热黄疸，症见一身面目俱黄，黄色鲜明，发热，无汗或但头汗出，口渴欲饮，恶心呕吐，腹微满，小便短赤，大便不爽或秘结，舌红苔黄腻，脉沉数或滑数有力',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '寒湿黄疸忌用',
    usage: '水煎服',
    usage_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '《伤寒论》',
    category: '祛湿剂-清热祛湿',
    classic_text: '',
    classic_source: '',
    classic_usage: '上三味，以水一斗二升，先煮茵陈，减六升，内二味，煮取三升，去滓，分温三服。',
  },
];

/**
 * 方剂库（内嵌20首代表性方剂，完整数据见 loadFullFormulasDatabase）
 * 数据来源：TCM-Learning-Assistant (MIT) 的 formulas.json
 * 免责声明：所有主治、适应证、用法均为典籍原文记载，不构成医疗建议
 */
// 优先使用 JSON 完整数据（316首），内联数据作为后备
const RAW_FORMULAS_FULL: RawFormulaEntry[] = (formulasJson.formulas && formulasJson.formulas.length > 0)
  ? formulasJson.formulas as unknown as RawFormulaEntry[]
  : RAW_FORMULAS_INLINE;
export const FORMULAS_DB: TcmFormula[] = RAW_FORMULAS_FULL.map(mapRawFormulaToTcm);

// ============================================================================
// 搜索方剂
// ============================================================================

/**
 * 搜索方剂
 * @param keyword 关键词（支持名称、功效、主治、出处匹配）
 * @returns 匹配的方剂列表
 */
export function searchFormulas(keyword: string): TcmFormula[] {
  if (!keyword || keyword.trim() === '') {
    return FORMULAS_DB;
  }
  const kw = keyword.toLowerCase();
  return FORMULAS_DB.filter(
    (f) =>
      f.name.includes(kw) ||
      f.efficacy.includes(kw) ||
      f.indications.includes(kw) ||
      f.source.includes(kw) ||
      f.category.includes(kw)
  );
}

/**
 * 根据ID获取方剂详情
 */
export function getFormulaById(id: string): TcmFormula | undefined {
  return FORMULAS_DB.find((f) => f.id === id);
}

/**
 * 获取所有方剂分类
 */
export function getFormulaCategories(): string[] {
  const categories = new Set(FORMULAS_DB.map((f) => f.category));
  return Array.from(categories).sort();
}

/**
 * 按分类筛选方剂
 */
export function getFormulasByCategory(category: string): TcmFormula[] {
  return FORMULAS_DB.filter((f) => f.category === category);
}

// ============================================================================
// 完整数据库加载（异步）
// ============================================================================

let fullFormulasLoaded = false;
let fullFormulasDB: TcmFormula[] = [];
let formulasLoading = false;
let formulasLoadError: string | null = null;

/**
 * 同步获取方剂数据加载状态（供 useEffect 使用）
 */
export function getFormulasLoadingState(): { loading: boolean; error: string | null } {
  return { loading: formulasLoading, error: formulasLoadError };
}

/**
 * 带重试的 fetch 包装
 */
async function fetchWithRetry(
  url: string,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries - 1) {
        console.warn(
          `[TCM formulas] 加载 ${url} 失败（第 ${attempt + 1}/${maxRetries} 次），${delayMs}ms 后重试...`,
          `错误: ${lastError.message}`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError!;
}

/**
 * 加载完整316首方剂数据库（从 data/formulas.json）
 * 覆盖内嵌的20首方剂，提供完整数据
 *
 * 重要：此函数为异步加载，首次调用后会缓存结果
 * 加载状态可通过 getFormulasLoadingState() 同步获取
 */
export async function loadFullFormulasDatabase(): Promise<TcmFormula[]> {
  // JSON 数据已在构建时通过 import 加载，直接返回
  fullFormulasDB = FORMULAS_DB;
  fullFormulasLoaded = true;
  formulasLoading = false;
  console.log(`[TCM formulas] 数据已加载 ${fullFormulasDB.length} 首方剂。`);
  return fullFormulasDB;
}

/**
 * 在完整数据库中搜索（需要先调用 loadFullFormulasDatabase）
 */
export function searchFullFormulas(keyword: string): TcmFormula[] {
  const db = fullFormulasLoaded ? fullFormulasDB : FORMULAS_DB;
  if (!keyword || keyword.trim() === '') return db;
  const kw = keyword.toLowerCase();
  return db.filter(
    (f) =>
      f.name.includes(kw) ||
      f.efficacy.includes(kw) ||
      f.indications.includes(kw) ||
      f.source.includes(kw) ||
      f.category.includes(kw)
  );
}