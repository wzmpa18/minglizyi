// ============================================================================
// P7-MKT-POSTER-02 Compliance Validator（第十六/二十一/二十四/二十五条）
// 关键词过滤 + 语义风险模式双重校验；审核失败不得生成海报
// ============================================================================

import type { ComplianceResult } from "./types";

interface ForbiddenEntry {
  word: string;
  category: string;
  hint: string;
}

/** 第十六条：绝对化用语/迷信高风险/医疗功效/金融收益等禁用词 */
const FORBIDDEN_WORDS: ForbiddenEntry[] = [
  { word: "全网最全", category: "绝对化用语", hint: "改为「一处集合」" },
  { word: "全网第一", category: "绝对化用语", hint: "禁止第一类表述" },
  { word: "最好", category: "绝对化用语", hint: "改为具体功能描述" },
  { word: "最佳", category: "绝对化用语", hint: "改为具体功能描述" },
  { word: "第一", category: "绝对化用语", hint: "禁止排名表述" },
  { word: "顶级", category: "绝对化用语", hint: "改为具体功能描述" },
  { word: "天花板", category: "绝对化用语", hint: "改为具体功能描述" },
  { word: "吊打", category: "竞争贬低", hint: "删除竞争对比" },
  { word: "秒杀同行", category: "竞争贬低", hint: "删除竞争对比" },
  { word: "替代全部高价软件", category: "竞争贬低", hint: "改为「减少来回切换」" },
  { word: "百分百", category: "绝对化用语", hint: "禁止100%承诺" },
  { word: "100%", category: "绝对化用语", hint: "禁止100%承诺" },
  { word: "精准预测", category: "迷信高风险", hint: "删除预测表述" },
  { word: "必中", category: "迷信高风险", hint: "禁止必中承诺" },
  { word: "包过", category: "迷信高风险", hint: "禁止保过承诺" },
  { word: "包准", category: "迷信高风险", hint: "禁止准确性承诺" },
  { word: "改命", category: "迷信高风险", hint: "删除改命表述" },
  { word: "改运", category: "迷信高风险", hint: "删除改运表述" },
  { word: "转运", category: "迷信高风险", hint: "删除转运表述" },
  { word: "消灾", category: "迷信高风险", hint: "删除消灾表述" },
  { word: "破解", category: "迷信高风险", hint: "删除破解表述" },
  { word: "预测未来", category: "迷信高风险", hint: "删除预测表述" },
  { word: "预测吉凶", category: "迷信高风险", hint: "删除预测表述" },
  { word: "算命", category: "迷信高风险", hint: "改为「文化研习」" },
  { word: "看相", category: "迷信高风险", hint: "改为「文化研习」" },
  { word: "稳赚", category: "金融收益", hint: "删除收益承诺" },
  { word: "治愈", category: "医疗功效", hint: "删除治愈表述" },
  { word: "根治", category: "医疗功效", hint: "删除根治表述" },
  { word: "疗效保证", category: "医疗功效", hint: "删除疗效表述" },
  { word: "延年益寿", category: "医疗功效", hint: "删除功效承诺" },
  { word: "调理疾病", category: "医疗功效", hint: "改为「理论学习」" },
  { word: "改善体质", category: "医疗功效", hint: "删除功效表述" },
  { word: "固本延年", category: "医疗功效", hint: "删除功效表述" },
  { word: "调和气血", category: "医疗功效", hint: "删除功效表述" },
  { word: "治病", category: "医疗功效", hint: "删除治疗表述" },
  { word: "多推多得", category: "层级营销", hint: "改为「符合活动规则可获得平台活动权益」" },
  { word: "发展下线", category: "层级营销", hint: "删除层级表述" },
  { word: "团队赚钱", category: "层级营销", hint: "删除层级收益表述" },
  { word: "拉人赚钱", category: "层级营销", hint: "删除层级收益表述" },
  { word: "躺赚", category: "层级营销", hint: "删除被动收益表述" },
  { word: "被动收益", category: "层级营销", hint: "删除被动收益表述" },
  { word: "永久分红", category: "层级营销", hint: "删除分红表述" },
  { word: "分享赚钱", category: "层级营销", hint: "删除赚钱表述" },
  { word: "裂变赚钱", category: "层级营销", hint: "删除裂变收益表述" },
  { word: "治愈迷茫", category: "心理暗示", hint: "改为「多一个思考视角」" },
  { word: "治愈内耗", category: "心理暗示", hint: "改为「多一个思考视角」" },
  { word: "自愈焦虑", category: "心理暗示", hint: "改为「自我观察」" },
  { word: "告别高价付费", category: "价格误导", hint: "改为「提供更轻量的使用选择」" },
  { word: "免费解锁全部", category: "价格误导", hint: "与实际免费范围一致" },
];

/** 第二十五条：语义风险模式（即使无禁用词，命中模式仍不合规） */
const SEMANTIC_PATTERNS: { pattern: RegExp; category: string; hint: string }[] = [
  { pattern: /(保证|确保).{0,8}(财运|事业运|婚姻|感情|健康)/, category: "迷信高风险", hint: "删除运势保证类语义" },
  { pattern: /(财运|运势|桃花).{0,6}(提升|变好|好转|暴富)/, category: "迷信高风险", hint: "删除运势效果暗示" },
  { pattern: /(根治|治愈|治好).{0,6}(疾病|病症|病)/, category: "医疗功效", hint: "删除治疗效果暗示" },
  { pattern: /(喝|吃|用).{0,10}(就能|即可|便可).{0,6}(治病|痊愈|康复)/, category: "医疗功效", hint: "删除疗效暗示" },
  { pattern: /(扫码|下载).{0,10}(赚钱|赚钱了|有收入|得收益)/, category: "金融收益", hint: "删除扫码赚钱暗示" },
  { pattern: /(邀请|推广).{0,8}(躺赚|月入|日入|赚)/, category: "层级营销", hint: "删除邀请赚钱暗示" },
  { pattern: /\d+元.{0,6}(解锁全部|永久|终身)(?!版)/, category: "价格误导", hint: "价格必须说明范围与期限" },
  { pattern: /(绝对|百分百|100%|必定).{0,4}(准|中|过|有效)/, category: "绝对化用语", hint: "删除绝对化承诺" },
];

export function validateCopyText(text: string): ComplianceResult {
  const violations: ComplianceResult["violations"] = [];
  const normalized = text.replace(/\s+/g, "");

  for (const entry of FORBIDDEN_WORDS) {
    if (normalized.includes(entry.word)) {
      violations.push({ word: entry.word, category: entry.category, hint: entry.hint });
    }
  }
  for (const p of SEMANTIC_PATTERNS) {
    if (p.pattern.test(normalized)) {
      violations.push({ word: p.pattern.source.slice(0, 24), category: p.category, hint: p.hint });
    }
  }
  return { passed: violations.length === 0, violations };
}

/** 校验整组海报文案（标题/副标题/卖点/CTA/朋友圈/群/私聊） */
export function validateCopySet(fields: string[]): ComplianceResult {
  const all = fields.filter(Boolean).join("｜");
  return validateCopyText(all);
}

/** 恶意输入E2E用例（第六十三条） */
export const COMPLIANCE_E2E_CASES = [
  "全网第一的国学习题库",
  "100%准确预测运势",
  "根治失眠的中医课程",
  "分享赚钱多推多得",
  "扫码躺赚被动收益",
  "文化研习后保证你财运提升",
];
