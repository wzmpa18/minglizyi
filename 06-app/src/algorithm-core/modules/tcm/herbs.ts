/**
 * 原始来源：TCM-Learning-Assistant (MIT License)
 * 原始版本：v1.0
 * 修改记录：2026-07-26 通过导入 JSON 数据源完成实现
 * 当前协议：MIT
 *
 * 合规改造说明：
 * - 原始数据来源于 TCM-Learning-Assistant 项目的 herbs.json
 * - 仅保留学习用途字段：名称、性味、归经、功效、典籍记载
 * - 已移除任何涉及医疗建议、诊断、处方的字段
 * - 所有数据标注"典籍记载"来源
 * - 数据中"主治""适应证"等字段均为典籍原文记载，非医疗建议
 *
 * 数据来源：中国药典 + 神农本草经 (tcmoc)
 * 来源项目：https://github.com/lab99x/tcmoc
 * 提取日期：2026-07-26
 * 总计药材：550味（完整数据见 data/herbs.json）
 */

import type { TcmHerb } from '../../types/tcm';

// ============================================================================
// 辅助函数：从功效推导分类
// ============================================================================

function deriveCategory(efficacy: string): string {
  if (!efficacy) return '其他';
  const e = efficacy;
  if (/发汗解表|解肌|疏散|散寒解表|辛温解表|辛凉解表|宣肺解表/.test(e)) return '解表药';
  if (/清热|泻火|凉血|解毒|燥湿|除烦/.test(e)) return '清热药';
  if (/大补元气|补气|益气|补血|养血|补阴|滋阴|补阳|壮阳|益精|填髓|补脾|健脾|安胎/.test(e)) return '补虚药';
  if (/利水|渗湿|利尿|消肿|通淋|利湿/.test(e)) return '利水渗湿药';
  if (/活血|化瘀|逐瘀|通经|破血|散瘀/.test(e)) return '活血化瘀药';
  if (/化痰|止咳|平喘|降逆|祛痰/.test(e)) return '化痰止咳平喘药';
  if (/安神|定志|宁心|安魂/.test(e)) return '安神药';
  if (/温中|回阳|散寒|温经|助阳/.test(e)) return '温里药';
  if (/理气|行气|降气|疏肝|解郁|消痞/.test(e)) return '理气药';
  if (/消食|化积|导滞/.test(e)) return '消食药';
  if (/止血/.test(e)) return '止血药';
  if (/祛风|除湿|通络|痹痛|舒筋/.test(e)) return '祛风湿药';
  if (/平肝|熄风|息风|止痉|潜阳/.test(e)) return '平肝熄风药';
  if (/开窍|醒神|辟恶|通窍|醒脑/.test(e)) return '开窍药';
  if (/收敛|固涩|止汗|止泻|固精|缩尿/.test(e)) return '收涩药';
  if (/泻下|攻积|通便|润肠/.test(e)) return '泻下药';
  if (/驱虫|杀虫|去三虫/.test(e)) return '驱虫药';
  return '其他';
}

// ============================================================================
// 辅助函数：从 nature 字段拆分 taste 和 nature
// nature 格式如 "辛、甘，温" → taste="辛、甘", nature="温"
// 或 "苦，寒" → taste="苦", nature="寒"
// ============================================================================

function splitTasteNature(natureRaw: string): { taste: string; nature: string } {
  if (!natureRaw) return { taste: '', nature: '' };
  // 匹配逗号分割的模式：前面的"辛、甘"是 taste，后面"温"是 nature
  // 中文逗号(，) 后的内容视为 nature
  const lastCommaIdx = natureRaw.lastIndexOf('，');
  if (lastCommaIdx === -1) {
    // 没有逗号，尝试按英文逗号分割
    const engCommaIdx = natureRaw.lastIndexOf(',');
    if (engCommaIdx === -1) {
      // 完全无法拆分，整个作为 taste
      return { taste: natureRaw, nature: '' };
    }
    return {
      taste: natureRaw.substring(0, engCommaIdx).trim(),
      nature: natureRaw.substring(engCommaIdx + 1).trim(),
    };
  }
  return {
    taste: natureRaw.substring(0, lastCommaIdx).trim(),
    nature: natureRaw.substring(lastCommaIdx + 1).trim(),
  };
}

// ============================================================================
// 辅助函数：从原始 JSON 条目转换为 TcmHerb
// ============================================================================

interface RawHerbEntry {
  id: string;
  name: string;
  pinyin: string;
  alias: string[];
  nature: string;
  meridian: string;
  efficacy: string;
  indications: string;
  indications_disclaimer: string;
  dosage: string;
  dosage_disclaimer: string;
  contraindications: string;
  contraindications_disclaimer: string;
  source: string;
}

function mapRawHerbToTcm(entry: RawHerbEntry): TcmHerb {
  const { taste, nature } = splitTasteNature(entry.nature);
  const category = deriveCategory(entry.efficacy);
  // 有毒药材判定
  const toxicKeywords = ['毒', '有毒', '大毒', '小毒', '剧毒'];
  const isToxic = toxicKeywords.some(k => 
    (entry.contraindications && entry.contraindications.includes(k)) ||
    (entry.nature && entry.nature.includes(k))
  );
  return {
    id: entry.id,
    name: entry.name,
    pinyin: entry.pinyin || '',
    alias: entry.alias || [],
    category,
    nature,
    taste,
    meridian: entry.meridian || '',
    efficacy: entry.efficacy,
    indications: entry.indications,
    source: entry.source || '中国药典',
    dosage: entry.dosage,
    contraindications: entry.contraindications || '',
    toxic: isToxic,
  };
}

// ============================================================================
// 中药药材库（内嵌30味代表性药材，覆盖各分类）
// 完整550味数据见 data/herbs.json
// ============================================================================

const RAW_HERBS_INLINE: RawHerbEntry[] = [
  // ---- 解表药 ----
  {
    id: 'h001', name: '桂枝', pinyin: 'guizhi', alias: ['柳桂'],
    nature: '辛、甘，温', meridian: '心、肺、膀胱经',
    efficacy: '发汗解肌，温通经脉，助阳化气，平冲降逆',
    indications: '风寒感冒，脘腹冷痛，血寒经闭，关节痹痛，痰饮，水肿，心悸，奔豚',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    dosage: '3-10g', dosage_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '本品辛温助热，易伤阴动血，凡外感热病、阴虚火旺、血热妄行者忌用；孕妇及月经过多者慎用',
    contraindications_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '中国药典',
  },
  {
    id: 'h002', name: '麻黄', pinyin: 'mahuang', alias: ['龙沙', '狗骨'],
    nature: '辛、微苦，温', meridian: '肺、膀胱经',
    efficacy: '发汗解表，宣肺平喘，利水消肿',
    indications: '风寒感冒，咳嗽气喘，风水水肿，风湿痹痛，阴疽，痰核',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    dosage: '2-9g', dosage_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '本品发汗力强，凡表虚自汗、阴虚盗汗及肺肾虚喘者均慎用；高血压、心脏病患者慎用',
    contraindications_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '中国药典',
  },

  // ---- 补虚药 ----
  {
    id: 'h003', name: '人参', pinyin: 'renshen', alias: ['棒槌', '山参', '园参'],
    nature: '甘、微苦，微温', meridian: '脾、肺、心、肾经',
    efficacy: '大补元气，复脉固脱，补脾益肺，生津养血，安神益智',
    indications: '体虚欲脱，肢冷脉微，脾虚食少，肺虚喘咳，津伤口渴，内热消渴，气血亏虚，久病虚羸，惊悸失眠，阳痿宫冷',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    dosage: '3-9g，大剂量可用至30g', dosage_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '实证、热证而正气不虚者忌服；不宜与藜芦、五灵脂同用；不宜喝茶和吃萝卜，以免影响药力',
    contraindications_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '中国药典',
  },
  {
    id: 'h004', name: '黄芪', pinyin: 'huangqi', alias: ['黄耆', '绵芪'],
    nature: '甘，微温', meridian: '肺、脾经',
    efficacy: '补气升阳，固表止汗，利水消肿，生津养血，行滞通痹，托毒排脓，敛疮生肌',
    indications: '气虚乏力，食少便溏，中气下陷，久泻脱肛，便血崩漏，表虚自汗，气虚水肿，内热消渴，血虚萎黄，半身不遂，痹痛麻木，痈疽难溃，久溃不敛',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    dosage: '9-30g', dosage_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '凡表实邪盛，气滞湿阻，食积停滞，痈疽初起或溃后热毒尚盛等实证，以及阴虚阳亢者，均须禁服',
    contraindications_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '中国药典',
  },
  {
    id: 'h005', name: '当归', pinyin: 'danggui', alias: ['秦归', '云归', '西当归'],
    nature: '甘、辛，温', meridian: '肝、心、脾经',
    efficacy: '补血活血，调经止痛，润肠通便',
    indications: '血虚萎黄，眩晕心悸，月经不调，经闭痛经，虚寒腹痛，风湿痹痛，跌扑损伤，痈疽疮疡，肠燥便秘',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    dosage: '6-12g', dosage_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '湿盛中满、大便泄泻者忌服；热盛出血者禁服；孕妇慎用',
    contraindications_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '中国药典',
  },
  {
    id: 'h006', name: '白芍', pinyin: 'baishao', alias: ['白芍药', '金芍药'],
    nature: '苦、酸，微寒', meridian: '肝、脾经',
    efficacy: '养血调经，敛阴止汗，柔肝止痛，平抑肝阳',
    indications: '血虚萎黄，月经不调，自汗盗汗，胁痛腹痛，四肢挛痛，头痛眩晕',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    dosage: '6-15g', dosage_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '阳衰虚寒之证不宜单独应用；不宜与藜芦同用',
    contraindications_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '中国药典',
  },
  {
    id: 'h007', name: '熟地黄', pinyin: 'shudihuang', alias: ['熟地'],
    nature: '甘，微温', meridian: '肝、肾经',
    efficacy: '补血滋阴，益精填髓',
    indications: '血虚萎黄，眩晕心悸，月经不调，崩漏下血，肝肾阴虚，潮热盗汗，遗精阳痿，不孕不育，腰膝酸软，耳鸣耳聋，头目昏花，须发早白，消渴，便秘',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    dosage: '9-15g', dosage_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '脾胃虚弱，气滞痰多，腹满便溏者忌服',
    contraindications_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '中国药典',
  },
  {
    id: 'h008', name: '白术', pinyin: 'baizhu', alias: ['于术', '冬术'],
    nature: '苦、甘，温', meridian: '脾、胃经',
    efficacy: '健脾益气，燥湿利水，止汗，安胎',
    indications: '脾虚食少，腹胀泄泻，痰饮眩悸，水肿，自汗，胎动不安',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    dosage: '6-12g', dosage_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '阴虚内热，津液亏耗者慎用；气滞胀闷者忌用',
    contraindications_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '中国药典',
  },
  {
    id: 'h010', name: '甘草', pinyin: 'gancao', alias: ['国老', '甜草'],
    nature: '甘，平', meridian: '心、肺、脾、胃经',
    efficacy: '补脾益气，清热解毒，祛痰止咳，缓急止痛，调和诸药',
    indications: '脾胃虚弱，倦怠乏力，心悸气短，咳嗽痰多，脘腹、四肢挛急疼痛，痈肿疮毒，缓解药物毒性、烈性',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    dosage: '2-10g', dosage_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '不宜与海藻、大戟、甘遂、芫花同用；湿盛胀满、水肿者不宜用；长期大量服用可引起水肿、高血压',
    contraindications_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '中国药典',
  },
  {
    id: 'h020', name: '麦冬', pinyin: 'maidong', alias: ['麦门冬', '沿阶草'],
    nature: '甘、微苦，微寒', meridian: '心、肺、胃经',
    efficacy: '养阴生津，润肺清心',
    indications: '肺燥干咳，阴虚痨嗽，喉痹咽痛，津伤口渴，内热消渴，心烦失眠，肠燥便秘',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    dosage: '6-12g', dosage_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '脾胃虚寒泄泻，胃有痰饮湿浊及暴感风寒咳嗽者均忌服',
    contraindications_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '中国药典',
  },
  {
    id: 'h079', name: '续断', pinyin: 'xuduan', alias: [],
    nature: '苦，微温', meridian: '肝、肾经',
    efficacy: '补肝肾，强筋骨，续折伤，止崩漏',
    indications: '肝肾不足，腰膝酸软，风湿痹痛，跌扑损伤，筋伤骨折，崩漏，胎漏',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    dosage: '9-15g', dosage_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '风湿热痹者忌服',
    contraindications_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '神农本草经',
  },
  {
    id: 'h127', name: '阿胶', pinyin: 'ejiao', alias: [],
    nature: '甘，平', meridian: '肺、肝、肾经',
    efficacy: '补血滋阴，润燥，止血',
    indications: '血虚萎黄，眩晕心悸，肌痿无力，心烦不眠，虚风内动，肺燥咳嗽，劳嗽咯血，吐血尿血，便血崩漏，妊娠胎漏',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    dosage: '3-9g，烊化兑服', dosage_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '脾胃虚弱、食少便溏者慎用',
    contraindications_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '神农本草经',
  },

  // ---- 利水渗湿药 ----
  {
    id: 'h009', name: '茯苓', pinyin: 'fuling', alias: ['云苓', '松苓'],
    nature: '甘、淡，平', meridian: '心、肺、脾、肾经',
    efficacy: '利水渗湿，健脾，宁心',
    indications: '水肿尿少，痰饮眩悸，脾虚食少，便溏泄泻，心神不安，惊悸失眠',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    dosage: '10-15g', dosage_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '阴虚而无湿热、虚寒滑精、气虚下陷者慎服',
    contraindications_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '中国药典',
  },

  // ---- 解表药（辛凉） ----
  {
    id: 'h011', name: '柴胡', pinyin: 'chaihu', alias: ['茈胡', '地熏'],
    nature: '苦、辛，微寒', meridian: '肝、胆、肺经',
    efficacy: '疏散退热，疏肝解郁，升举阳气',
    indications: '感冒发热，寒热往来，胸胁胀痛，月经不调，子宫脱垂，脱肛',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    dosage: '3-10g', dosage_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '柴胡其性升散，阴虚阳亢，肝风内动，阴虚火旺及气机上逆者忌用或慎用',
    contraindications_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '中国药典',
  },
  {
    id: 'h076', name: '防风', pinyin: 'fangfeng', alias: [],
    nature: '辛、甘，温', meridian: '膀胱、肝、脾经',
    efficacy: '祛风解表，胜湿止痛，止痉',
    indications: '感冒头痛，风湿痹痛，风疹瘙痒，破伤风',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    dosage: '5-10g', dosage_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '阴血亏虚、热病动风者不宜使用',
    contraindications_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '神农本草经',
  },

  // ---- 清热药 ----
  {
    id: 'h012', name: '黄芩', pinyin: 'huangqin', alias: ['山茶根', '土金茶根'],
    nature: '苦，寒', meridian: '肺、胆、脾、大肠、小肠经',
    efficacy: '清热燥湿，泻火解毒，止血，安胎',
    indications: '湿温、暑湿，胸闷呕恶，湿热痞满，泻痢，黄疸，肺热咳嗽，高热烦渴，血热吐衄，痈肿疮毒，胎动不安',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    dosage: '3-10g', dosage_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '本品苦寒伤胃，脾胃虚寒者不宜使用',
    contraindications_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '中国药典',
  },
  {
    id: 'h013', name: '黄连', pinyin: 'huanglian', alias: ['川连', '味连', '雅连'],
    nature: '苦，寒', meridian: '心、脾、胃、肝、胆、大肠经',
    efficacy: '清热燥湿，泻火解毒',
    indications: '湿热痞满，呕吐吞酸，泻痢，黄疸，高热神昏，心火亢盛，心烦不寐，心悸不宁，血热吐衄，目赤，牙痛，消渴，痈肿疔疮；外治湿疹，湿疮，耳道流脓',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    dosage: '2-5g', dosage_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '本品大苦大寒，过服久服易伤脾胃，脾胃虚寒者忌用；苦燥易伤阴津，阴虚津伤者慎用',
    contraindications_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '中国药典',
  },
  {
    id: 'h019', name: '栀子', pinyin: 'zhizi', alias: ['黄栀子', '山栀'],
    nature: '苦，寒', meridian: '心、肺、三焦经',
    efficacy: '泻火除烦，清热利湿，凉血解毒',
    indications: '热病心烦，湿热黄疸，淋证涩痛，血热吐衄，目赤肿痛，火毒疮疡；外治扭挫伤痛',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    dosage: '6-10g；外用生品适量', dosage_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '本品苦寒伤胃，脾虚便溏者不宜用',
    contraindications_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '中国药典',
  },
  {
    id: 'h080', name: '漏芦', pinyin: 'loulv', alias: [],
    nature: '苦，寒', meridian: '胃经',
    efficacy: '清热解毒，消痈散结，通经下乳，舒筋通脉',
    indications: '乳痈肿痛，痈疽发背，瘰疬疮毒，乳汁不通，湿痹拘挛',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    dosage: '5-9g', dosage_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '气虚、疮疡平塌者及孕妇忌服',
    contraindications_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '神农本草经',
  },

  // ---- 泻下药 ----
  {
    id: 'h014', name: '大黄', pinyin: 'dahuang', alias: ['将军', '川军', '锦纹'],
    nature: '苦，寒', meridian: '脾、胃、大肠、肝、心包经',
    efficacy: '泻下攻积，清热泻火，凉血解毒，逐瘀通经，利湿退黄',
    indications: '实热积滞便秘，血热吐衄，目赤咽肿，痈肿疔疮，肠痈腹痛，瘀血经闭，产后瘀阻，跌打损伤，湿热痢疾，黄疸尿赤，淋证，水肿；外治烧烫伤',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    dosage: '3-15g；外用适量', dosage_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '本品为峻烈攻下之品，易伤正气，如非实证，不宜妄用；孕妇、月经期、哺乳期慎用；脾胃虚弱者慎用',
    contraindications_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '中国药典',
  },

  // ---- 活血化瘀药 ----
  {
    id: 'h015', name: '川芎', pinyin: 'chuanxiong', alias: ['芎藭', '小叶川芎'],
    nature: '辛，温', meridian: '肝、胆、心包经',
    efficacy: '活血行气，祛风止痛',
    indications: '胸痹心痛，胸胁刺痛，跌扑肿痛，月经不调，经闭痛经，产后瘀滞腹痛，头痛，风湿痹痛',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    dosage: '3-10g', dosage_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '本品辛温升散，凡阴虚阳亢之头痛，阴虚火旺之证，多汗及出血性疾病均当慎用；孕妇慎用',
    contraindications_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '中国药典',
  },
  {
    id: 'h042', name: '牛膝', pinyin: 'niuxi', alias: [],
    nature: '苦、甘、酸，平', meridian: '肝、肾经',
    efficacy: '逐瘀通经，补肝肾，强筋骨，利尿通淋，引血下行',
    indications: '经闭，痛经，腰膝酸痛，筋骨无力，淋证，水肿，头痛，眩晕，牙痛，口疮，吐血，衄血',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    dosage: '5-12g', dosage_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '孕妇及月经过多者忌用；中气下陷、脾虚泄泻者慎用',
    contraindications_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '神农本草经',
  },
  {
    id: 'h100', name: '王不留行', pinyin: 'wangbuliuxing', alias: [],
    nature: '苦，平', meridian: '肝、胃经',
    efficacy: '活血通经，下乳消肿，利尿通淋',
    indications: '经闭，痛经，乳汁不下，乳痈肿痛，淋证涩痛',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    dosage: '5-10g', dosage_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '孕妇慎用',
    contraindications_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '神农本草经',
  },

  // ---- 理气药 ----
  {
    id: 'h016', name: '陈皮', pinyin: 'chenpi', alias: ['橘皮', '广陈皮'],
    nature: '苦、辛，温', meridian: '脾、肺经',
    efficacy: '理气健脾，燥湿化痰',
    indications: '脘腹胀满，食少吐泻，咳嗽痰多',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    dosage: '3-10g', dosage_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '本品辛散苦燥，温能助热，内有实热、舌赤少津者慎用',
    contraindications_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '中国药典',
  },

  // ---- 化痰止咳平喘药 ----
  {
    id: 'h017', name: '半夏', pinyin: 'banxia', alias: ['三叶半夏', '半月莲'],
    nature: '辛，温；有毒', meridian: '脾、胃、肺经',
    efficacy: '燥湿化痰，降逆止呕，消痞散结',
    indications: '湿痰寒痰，咳喘痰多，痰饮眩悸，风痰眩晕，痰厥头痛，呕吐反胃，胸脘痞闷，梅核气；外治痈肿痰核',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    dosage: '内服一般炮制后使用，3-9g；外用适量', dosage_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '不宜与川乌、制川乌、草乌、制草乌、附子同用；生品内服宜慎；阴虚燥咳，血证，热痰，燥痰应慎用',
    contraindications_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '中国药典',
  },

  // ---- 平肝熄风药 ----
  {
    id: 'h018', name: '天麻', pinyin: 'tianma', alias: ['赤箭', '定风草'],
    nature: '甘，平', meridian: '肝经',
    efficacy: '息风止痉，平抑肝阳，祛风通络',
    indications: '肝风内动，惊痫抽搐，眩晕头痛，肢体麻木，手足不遂，风湿痹痛',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    dosage: '3-10g', dosage_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '气血虚甚者慎服',
    contraindications_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '中国药典',
  },

  // ---- 开窍药 ----
  {
    id: 'h037', name: '菖蒲', pinyin: 'changpu', alias: ['石菖蒲'],
    nature: '辛、苦，温', meridian: '心、胃经',
    efficacy: '开窍豁痰，醒神益智，化湿开胃',
    indications: '神昏癫痫，健忘失眠，耳鸣耳聋，脘痞不饥，噤口下痢',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    dosage: '3-10g', dosage_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '阴虚阳亢、烦躁汗多、咳嗽吐血、精滑者慎服',
    contraindications_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '神农本草经',
  },
  {
    id: 'h123', name: '麝香', pinyin: 'shexiang', alias: [],
    nature: '辛，温', meridian: '心、脾经',
    efficacy: '开窍醒神，活血通经，消肿止痛',
    indications: '热病神昏，中风痰厥，气郁暴厥，中恶昏迷，经闭，症瘕，难产死胎，胸痹心痛，心腹暴痛，跌扑伤痛，痹痛麻木，痈肿瘰疬，咽喉肿痛',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    dosage: '0.03-0.1g，多入丸散用', dosage_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '孕妇禁用',
    contraindications_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '神农本草经',
  },

  // ---- 止血药 ----
  {
    id: 'h077', name: '蒲黄', pinyin: 'puhuang', alias: [],
    nature: '甘，平', meridian: '肝、心包经',
    efficacy: '止血，化瘀，通淋',
    indications: '吐血，衄血，咯血，崩漏，外伤出血，经闭痛经，胸腹刺痛，跌扑肿痛，血淋涩痛',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    dosage: '5-10g，包煎', dosage_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '孕妇慎用',
    contraindications_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '神农本草经',
  },

  // ---- 安神药 ----
  {
    id: 'h122', name: '龙骨', pinyin: 'longgu', alias: [],
    nature: '甘、涩，平', meridian: '心、肝、肾经',
    efficacy: '镇惊安神，平肝潜阳，收敛固涩',
    indications: '心神不宁，心悸失眠，惊痫癫狂，肝阳眩晕，滑脱诸证',
    indications_disclaimer: '此为典籍原文记载，非医疗建议',
    dosage: '15-30g，先煎', dosage_disclaimer: '此为典籍原文记载，非医疗建议',
    contraindications: '湿热积滞者不宜使用',
    contraindications_disclaimer: '此为典籍原文记载，非医疗建议',
    source: '神农本草经',
  },
];

/**
 * 中药药材库（内嵌30味代表性药材，完整数据见 loadFullHerbsDatabase）
 * 数据来源：TCM-Learning-Assistant (MIT) 的 herbs.json
 * 免责声明：所有主治、适应证、用法用量均为典籍原文记载，不构成医疗建议
 */
export const HERBS_DB: TcmHerb[] = RAW_HERBS_INLINE.map(mapRawHerbToTcm);

// ============================================================================
// 搜索药材
// ============================================================================

/**
 * 搜索药材
 * @param keyword 关键词（支持名称、拼音、功效、归经匹配）
 * @returns 匹配的药材列表
 */
export function searchHerbs(keyword: string): TcmHerb[] {
  if (!keyword || keyword.trim() === '') {
    return HERBS_DB;
  }
  const kw = keyword.toLowerCase();
  return HERBS_DB.filter(
    (herb) =>
      herb.name.includes(kw) ||
      herb.pinyin.toLowerCase().includes(kw) ||
      herb.efficacy.includes(kw) ||
      herb.meridian.includes(kw) ||
      herb.category.includes(kw)
  );
}

/**
 * 根据ID获取药材详情
 */
export function getHerbById(id: string): TcmHerb | undefined {
  return HERBS_DB.find((h) => h.id === id);
}

/**
 * 获取所有药材分类
 */
export function getHerbCategories(): string[] {
  const categories = new Set(HERBS_DB.map((h) => h.category));
  return Array.from(categories).sort();
}

/**
 * 按分类获取药材
 */
export function getHerbsByCategory(category: string): TcmHerb[] {
  return HERBS_DB.filter((h) => h.category === category);
}

// ============================================================================
// 完整数据库加载（异步）
// ============================================================================

let fullHerbsLoaded = false;
let fullHerbsDB: TcmHerb[] = [];
let herbsLoading = false;
let herbsLoadError: string | null = null;

/**
 * 同步获取药材数据加载状态（供 useEffect 使用）
 */
export function getHerbsLoadingState(): { loading: boolean; error: string | null } {
  return { loading: herbsLoading, error: herbsLoadError };
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
          `[TCM herbs] 加载 ${url} 失败（第 ${attempt + 1}/${maxRetries} 次），${delayMs}ms 后重试...`,
          `错误: ${lastError.message}`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError!;
}

/**
 * 加载完整550味药材数据库（从 data/herbs.json）
 * 覆盖内嵌的30味药材，提供完整数据
 *
 * 重要：此函数为异步加载，首次调用后会缓存结果
 * 加载状态可通过 getHerbsLoadingState() 同步获取
 */
export async function loadFullHerbsDatabase(): Promise<TcmHerb[]> {
  // 如果已加载完整数据库（>50条说明加载成功），直接返回
  if (fullHerbsLoaded && fullHerbsDB.length > 50) {
    return fullHerbsDB;
  }

  if (herbsLoading) {
    // 如果正在加载中，等待当前加载完成
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!herbsLoading) {
          clearInterval(checkInterval);
          resolve(fullHerbsDB);
        }
      }, 100);
    });
  }

  herbsLoading = true;
  herbsLoadError = null;

  try {
    const response = await fetch('/data/tcm/herbs.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const rawHerbs: RawHerbEntry[] = data.herbs || [];
    fullHerbsDB = rawHerbs.map(mapRawHerbToTcm);
    fullHerbsLoaded = true;
    herbsLoading = false;
    console.log(`[TCM herbs] 成功加载 ${fullHerbsDB.length} 味药材数据。`);
    return fullHerbsDB;
  } catch (error) {
    console.warn('[TCM herbs] 无法加载完整数据库，使用内嵌数据。', error);
    herbsLoadError = error instanceof Error ? error.message : String(error);
    fullHerbsDB = HERBS_DB;
    fullHerbsLoaded = true;
    herbsLoading = false;
    return fullHerbsDB;
  }
}

/**
 * 在完整数据库中搜索（需要先调用 loadFullHerbsDatabase）
 */
export function searchFullHerbs(keyword: string): TcmHerb[] {
  const db = fullHerbsLoaded ? fullHerbsDB : HERBS_DB;
  if (!keyword || keyword.trim() === '') return db;
  const kw = keyword.toLowerCase();
  return db.filter(
    (h) =>
      h.name.includes(kw) ||
      h.pinyin.toLowerCase().includes(kw) ||
      h.efficacy.includes(kw) ||
      h.meridian.includes(kw) ||
      h.category.includes(kw)
  );
}