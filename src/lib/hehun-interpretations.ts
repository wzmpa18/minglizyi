/**
 * 八字合婚经典解读数据库
 * 引经据典，来源：《渊海子平》《三命通会》《滴天髓》《吕才合婚论》
 * 用于八字合婚排盘点击解读功能
 */

// ============================================================================
// 合婚等级解读
// ============================================================================

export interface HehunInterpretItem {
  type: "grade" | "shengxiao" | "nayin" | "tiangan" | "dizhi" | "bazi";
  title: string;
  content: string;
  source: string;
}

export interface GradeDetail {
  grade: string;
  title: string;
  summary: string;
  details: string[];
  source: string;
}

export const GRADE_DETAILS: Record<string, GradeDetail> = {
  "天作之合": {
    grade: "天作之合",
    title: "天作之合 · 上上等",
    summary: "天地相合，阴阳相配，五行相生，八字互补。此乃上上等婚配，夫妻和谐，白头偕老，子孙昌盛。",
    details: [
      "天作之合者，八字互相补益，五行生克得当。",
      "夫妻二人命理相合，性格互补，相互成就。",
      "婚姻幸福美满，家庭和谐，事业共同进步。",
      "子女缘佳，后代昌盛，家运亨通。"
    ],
    source: "《三命通会·合婚篇》"
  },
  "上等婚": {
    grade: "上等婚",
    title: "上等婚 · 上等",
    summary: "八字相合度较高，五行互补明显，虽有微瑕但无大碍。此乃上等婚配，婚姻幸福，家庭和睦。",
    details: [
      "上等婚者，八字大部分相合，仅小有不合。",
      "夫妻感情深厚，虽有磕碰但无伤大雅。",
      "事业财运相互促进，家庭生活美满。",
      "子女缘良好，晚年幸福。"
    ],
    source: "《渊海子平·合婚论》"
  },
  "中等婚": {
    grade: "中等婚",
    title: "中等婚 · 中等",
    summary: "八字有合有冲，五行互补与相克并存。此乃中等婚配，婚姻平淡，需互谅互让，方能长久。",
    details: [
      "中等婚者，八字半合半冲，吉凶参半。",
      "夫妻需多加沟通，互相包容理解。",
      "事业财运平稳，但需共同努力。",
      "子女缘一般，晚年需多加调养。"
    ],
    source: "《滴天髓·合婚篇》"
  },
  "下等婚": {
    grade: "下等婚",
    title: "下等婚 · 下等",
    summary: "八字相冲较多，五行相克明显。此乃下等婚配，婚姻多波折，需双方多加努力经营。",
    details: [
      "下等婚者，八字多有冲克，五行相战。",
      "夫妻性格差异大，需磨合包容。",
      "事业财运恐有波折，宜互相扶持。",
      "子女缘较弱，需注重家庭和谐。"
    ],
    source: "《吕才合婚论》"
  },
  "需谨慎": {
    grade: "需谨慎",
    title: "需谨慎 · 下下等",
    summary: "八字严重相冲，五行相克甚重。此乃下下等婚配，建议慎重考虑，或寻求化解之法后再定。",
    details: [
      "需谨慎者，八字冲克严重，五行相战激烈。",
      "夫妻恐性格不合，冲突不断。",
      "事业财运恐受拖累，家庭难安。",
      "子女缘薄，身体健康需多加注意。"
    ],
    source: "《三命通会·忌婚篇》"
  },
};

// ============================================================================
// 生肖配对解读
// ============================================================================

export interface ShengxiaoPairDetail {
  pair: string;
  summary: string;
  details: string[];
  source: string;
}

export const SHENGXIAO_PAIR_DETAILS: Record<string, ShengxiaoPairDetail> = {
  "六合": {
    pair: "六合",
    summary: "六合为最佳配对，生肖相差六位，阴阳互补，五行相生。如子丑合、寅亥合、卯戌合、辰酉合、巳申合、午未合。",
    details: [
      "六合配对：子鼠配丑牛、寅虎配亥猪、卯兔配戌狗、辰龙配酉鸡、巳蛇配申猴、午马配未羊。",
      "六合为天地阴阳之最佳配合，夫妻和谐，白头偕老。",
      "五行互补，性格互补，婚姻幸福美满。",
      "此为最佳婚配，大力推荐。"
    ],
    source: "《渊海子平·十二生肖合婚论》"
  },
  "三合": {
    pair: "三合",
    summary: "三合为良好配对，三生肖成局，五行相生互助。如申子辰水局、巳酉丑金局、寅午戌火局、亥卯未木局。",
    details: [
      "三合局：申子辰（水局）、巳酉丑（金局）、寅午戌（火局）、亥卯未（木局）。",
      "三合为三生肖互助之局，夫妻相互扶持，共同进步。",
      "婚姻稳定，家庭和谐，事业有成。",
      "此为良好婚配，值得推荐。"
    ],
    source: "《三命通会·三合论》"
  },
  "六冲": {
    pair: "六冲",
    summary: "六冲为不良配对，生肖相差六位为冲，五行相克。如子午冲、丑未冲、寅申冲、卯酉冲、辰戌冲、巳亥冲。",
    details: [
      "六冲配对：子鼠冲午马、丑牛冲未羊、寅虎冲申猴、卯兔冲酉鸡、辰龙冲戌狗、巳蛇冲亥猪。",
      "六冲为天地阴阳之相冲，夫妻恐性格不合，冲突不断。",
      "需特别注意化解，或慎重考虑。",
      "不建议此配对，如有特殊情况需请专业命理师详批。"
    ],
    source: "《渊海子平·十二生肖冲合论》"
  },
  "六害": {
    pair: "六害",
    summary: "六害为不良配对，相害则关系不睦，易生口舌是非。",
    details: [
      "六害配对需谨慎对待，夫妻之间易生矛盾。",
      "相害则关系不睦，沟通不畅，易生误会。",
      "需双方多加包容理解，方可能化解。"
    ],
    source: "《渊海子平·十二生肖害合论》"
  },
  "一般": {
    pair: "一般",
    summary: "生肖配对无冲无合，关系平淡，需看八字整体配合。",
    details: [
      "生肖配对一般，无特别吉凶。",
      "需结合八字整体分析，不可仅凭生肖判断。",
      "婚姻关系主要看双方八字五行配合。"
    ],
    source: "《渊海子平》"
  },
};

// ============================================================================
// 纳音配对解读
// ============================================================================

export interface NayinDetail {
  summary: string;
  details: string[];
  source: string;
}

export const NAYIN_RELATIONS: Record<string, NayinDetail> = {
  "相生": {
    summary: "纳音相生为吉，夫妻五行互补，相互滋养，家庭和谐，事业发展顺利。",
    details: [
      "纳音五行相生，如金生水、水生木等，为吉配。",
      "夫妻之间相互滋养，感情深厚。",
      "事业财运相互促进，家庭美满。"
    ],
    source: "《三命通会·纳音论》"
  },
  "比和": {
    summary: "纳音比和为吉，夫妻五行相同，志同道合，但需防过于刚强。",
    details: [
      "纳音五行相同，志趣相投，容易沟通。",
      "夫妻二人性格相似，相互理解。",
      "但需防过于刚强，宜柔克刚。"
    ],
    source: "《三命通会·纳音论》"
  },
  "相克": {
    summary: "纳音相克为凶，夫妻五行相克，需多加包容，或寻求化解之法。",
    details: [
      "纳音五行相克，如金克木、木克土等，为凶配。",
      "夫妻之间摩擦较多，需多加包容。",
      "宜通过五行调解，如增加中间五行来化解。"
    ],
    source: "《三命通会·纳音论》"
  },
};

// ============================================================================
// 辅助函数
// ============================================================================

/** 获取合婚等级解读 */
export function getHehunGradeInterpretation(grade: string): { title: string; items: HehunInterpretItem[] } | null {
  const info = GRADE_DETAILS[grade];
  if (!info) return null;

  return {
    title: info.title,
    items: [{
      type: "grade",
      title: grade + " · 合婚等级",
      content: info.summary + "\n" + info.details.join("\n"),
      source: info.source,
    }],
  };
}

/** 获取生肖配对解读 */
export function getHehunShengxiaoInterpretation(pair: string): { title: string; items: HehunInterpretItem[] } | null {
  const info = SHENGXIAO_PAIR_DETAILS[pair];
  if (!info) return null;

  return {
    title: pair + " · 生肖配对",
    items: [{
      type: "shengxiao",
      title: pair + "配对",
      content: info.summary + "\n" + info.details.join("\n"),
      source: info.source,
    }],
  };
}

/** 获取纳音关系解读 */
export function getHehunNayinInterpretation(relation: string): { title: string; items: HehunInterpretItem[] } | null {
  const info = NAYIN_RELATIONS[relation];
  if (!info) return null;

  return {
    title: "纳音" + relation,
    items: [{
      type: "nayin",
      title: "纳音" + relation,
      content: info.summary + "\n" + info.details.join("\n"),
      source: info.source,
    }],
  };
}