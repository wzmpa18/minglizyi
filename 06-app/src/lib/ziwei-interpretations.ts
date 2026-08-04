/**
 * 紫微斗数经典解读数据库
 * 引经据典，来源：《紫微斗数全书》《十八飞星策天紫微斗数》《紫微斗数骨髓赋》等
 * 用于宫位点击解读功能
 */

export interface PalaceInterpretation {
  palace: string;
  title: string;
  summary: string;
  details: string[];
  source: string;
}

export const PALACE_INTERPRETATIONS: Record<string, PalaceInterpretation> = {
  "命宫": {
    palace: "命宫",
    title: "命宫 · 一身之主宰",
    summary: "命宫为十二宫之首，统辖一生之荣枯得失，定人格之高低，判气质之清浊。",
    details: [
      "命宫旺则根基稳固，一生顺遂；弱则根基浅薄，多波折。",
      "命宫无主星者，借对宫迁移宫之星曜为用，性格多受外界环境左右。",
      "命宫见吉星（紫微、天府、天相等）则气质高贵，见煞星（破军、七杀等）则性刚气躁。",
      "命宫化禄：一生福泽深厚，得贵人相助；化权：有领导才能，掌权柄；化科：文采出众，名声在外；化忌：多阻滞，需防口舌是非。"
    ],
    source: "《紫微斗数全书·卷一·命宫论》"
  },
  "兄弟": {
    palace: "兄弟",
    title: "兄弟宫 · 手足之情",
    summary: "兄弟宫主兄弟姐妹之缘份、多寡、助力，亦主母亲之健康状况。",
    details: [
      "兄弟宫吉星汇聚，兄弟姐妹有成就，彼此互助；煞星多则缘薄或易生争执。",
      "天机、天梁在兄弟宫，兄弟姐妹聪明有才；廉贞、破军则多竞争。",
      "兄弟宫化禄：兄弟姐妹富贵，能得助力；化忌：缘薄或易有纷争。"
    ],
    source: "《紫微斗数全书·卷二·兄弟宫》"
  },
  "夫妻": {
    palace: "夫妻",
    title: "夫妻宫 · 婚姻之缘",
    summary: "夫妻宫主婚姻状况、配偶品貌、婚姻生活之美恶。",
    details: [
      "夫妻宫吉星守照，配偶贤良，婚姻美满；煞星多则婚姻多波折。",
      "紫微、天府在夫妻宫，配偶有贵气；天相、天同则配偶温和。",
      "夫妻宫化禄：婚姻幸福，配偶有财；化忌：婚姻不顺，需多包容。",
      "七杀、破军在夫妻宫，配偶性格刚强，婚姻需用心经营。"
    ],
    source: "《紫微斗数全书·卷二·夫妻宫》"
  },
  "子女": {
    palace: "子女",
    title: "子女宫 · 子嗣之缘",
    summary: "子女宫主子息之多寡、贤愚、缘份，亦主性生活及生育能力。",
    details: [
      "子女宫旺相，子女有成就且孝顺；弱则子女缘薄或管教困难。",
      "紫微、天机在子女宫，子女聪明有才；武曲、七杀则子女刚强独立。",
      "子女宫化禄：子女多且有福；化忌：子女缘薄或生育困难。"
    ],
    source: "《紫微斗数全书·卷二·子女宫》"
  },
  "财帛": {
    palace: "财帛",
    title: "财帛宫 · 财富之运",
    summary: "财帛宫主一生财运之好坏、求财之方式、理财之能力。",
    details: [
      "财帛宫旺，财源广进，善于理财；弱则财运起伏，需勤俭持家。",
      "武曲、太阴在财帛宫为财星得位，主富足；天府在财帛宫主财库丰盈。",
      "财帛宫化禄：财运亨通，收入丰厚；化忌：破财或财务压力大。",
      "贪狼在财帛宫：主偏财运，但需防投机失利。"
    ],
    source: "《紫微斗数全书·卷二·财帛宫》"
  },
  "疾厄": {
    palace: "疾厄",
    title: "疾厄宫 · 健康之根",
    summary: "疾厄宫主身体健康状况、疾病倾向、意外灾厄。",
    details: [
      "疾厄宫吉星守照，身体健康少病；煞星多则体质较弱，需注意保养。",
      "天同、天梁在疾厄宫，虽有病亦能遇良医；七杀、破军则需防意外伤灾。",
      "疾厄宫化忌：需特别注意健康，定期体检。"
    ],
    source: "《紫微斗数全书·卷二·疾厄宫》"
  },
  "迁移": {
    palace: "迁移",
    title: "迁移宫 · 外出之运",
    summary: "迁移宫主外出运、远行吉凶、社交能力、在外发展之机遇。",
    details: [
      "迁移宫旺，适合外出发展，有贵人相助；弱则宜守不宜攻。",
      "紫微、天府在迁移宫，外出有贵气，受人尊重；天机在迁移宫，常奔波在外。",
      "迁移宫化禄：外出有利，旅途愉快；化忌：外出不顺，需防意外。"
    ],
    source: "《紫微斗数全书·卷二·迁移宫》"
  },
  "交友": {
    palace: "交友",
    title: "交友宫 · 人际之缘",
    summary: "交友宫主朋友、同事、下属之关系，亦主合伙运。",
    details: [
      "交友宫吉星多，朋友有助，人缘好；煞星多则易交损友或遭人陷害。",
      "天相、天同在交友宫，朋友和善可交；廉贞、破军则朋友多变。",
      "交友宫化禄：朋友带来财运；化忌：需防朋友背叛或拖累。"
    ],
    source: "《紫微斗数全书·卷二·交友宫》"
  },
  "官禄": {
    palace: "官禄",
    title: "官禄宫 · 事业之基",
    summary: "官禄宫主事业成就、职业取向、工作环境、升迁运。",
    details: [
      "官禄宫旺，事业有成，职位高升；弱则事业多波折，需努力打拼。",
      "紫微、天府在官禄宫，宜从政或管理岗位；武曲、七杀则宜军警、技术类。",
      "官禄宫化禄：事业顺利，有贵人提携；化忌：工作不顺，需防小人。",
      "天机在官禄宫：适合策划、咨询类工作，变动较多。"
    ],
    source: "《紫微斗数全书·卷二·官禄宫》"
  },
  "田宅": {
    palace: "田宅",
    title: "田宅宫 · 家宅之基",
    summary: "田宅宫主房产、家庭环境、祖业、居住品质。",
    details: [
      "田宅宫旺，房产运好，家庭和睦；弱则居无定所或家宅不宁。",
      "天府、太阴在田宅宫，房产丰厚，家有积蓄；天同在田宅宫，家庭温馨。",
      "田宅宫化禄：房产增值，置业顺利；化忌：家宅不宁，房产纠纷。"
    ],
    source: "《紫微斗数全书·卷二·田宅宫》"
  },
  "福德": {
    palace: "福德",
    title: "福德宫 · 福泽之源",
    summary: "福德宫主精神生活、兴趣爱好、晚年福气、享受能力。",
    details: [
      "福德宫旺，精神愉悦，晚年幸福；弱则精神压力大，难得清闲。",
      "天同、天梁在福德宫，福泽深厚，善享清福；紫微、天府则精神享受高雅。",
      "福德宫化禄：福气深厚，生活愉快；化忌：精神苦闷，难得安宁。"
    ],
    source: "《紫微斗数全书·卷二·福德宫》"
  },
  "父母": {
    palace: "父母",
    title: "父母宫 · 长辈之缘",
    summary: "父母宫主父母之状况、与长辈之缘份、上司关系。",
    details: [
      "父母宫旺，父母有成就，得长辈助力；弱则父母缘薄或需多尽孝道。",
      "紫微、天府在父母宫，父母有地位；天梁在父母宫，父母仁慈长寿。",
      "父母宫化禄：父母富贵，能得庇荫；化忌：父母缘薄，需多沟通。"
    ],
    source: "《紫微斗数全书·卷二·父母宫》"
  }
};

export interface StarPalaceInterpretation {
  star: string;
  palace: string;
  interpretation: string;
  source: string;
}

export const STAR_PALACE_INTERPRETATIONS: StarPalaceInterpretation[] = [
  // ---- 紫微 ----
  { star: "紫微", palace: "命宫", interpretation: "紫微居命宫，主人面色紫黄，相貌敦厚，少年老成。性情刚毅，有领导统御之才，自尊心强，好面子。得左右辅弼夹拱，则贵不可言，可掌权柄。", source: "《紫微斗数全书·紫微星》" },
  { star: "紫微", palace: "兄弟", interpretation: "紫微在兄弟宫，兄弟姐妹中有贵气者，兄弟成就高，但关系较疏远，互相尊重多于亲密。", source: "《紫微斗数全书》" },
  { star: "紫微", palace: "夫妻", interpretation: "紫微在夫妻宫，配偶有贵气，品貌端正，但自尊心强，需对方多包容。宜晚婚，婚姻方能长久。", source: "《紫微斗数全书》" },
  { star: "紫微", palace: "子女", interpretation: "紫微在子女宫，子女聪明有才，有领导能力，但个性较强，需以德化之。子女中有成就者。", source: "《紫微斗数全书》" },
  { star: "紫微", palace: "财帛", interpretation: "紫微在财帛宫，财源广而稳定，善理财，有储蓄之德。一生钱财不虞匮乏，但不宜投机。", source: "《紫微斗数全书》" },
  { star: "紫微", palace: "疾厄", interpretation: "紫微在疾厄宫，身体较为健康，但需注意脾胃及消化系统。有良医缘，遇病能得贵人相助。", source: "《紫微斗数全书》" },
  { star: "紫微", palace: "迁移", interpretation: "紫微在迁移宫，外出有贵气，受人尊重，适合远行发展。在外有贵人相助，社交场合受人瞩目。", source: "《紫微斗数全书》" },
  { star: "紫微", palace: "官禄", interpretation: "紫微在官禄宫，事业有成就，宜从政、管理或高层领导岗位。得贵人提拔，有掌权之机。", source: "《紫微斗数全书》" },
  { star: "紫微", palace: "田宅", interpretation: "紫微在田宅宫，家宅气派，房产丰厚。祖业有靠，居住环境优异。", source: "《紫微斗数全书》" },
  { star: "紫微", palace: "福德", interpretation: "紫微在福德宫，精神享受高雅，晚年福气深厚。喜清净，不喜俗务。", source: "《紫微斗数全书》" },
  { star: "紫微", palace: "父母", interpretation: "紫微在父母宫，父母有地位或成就，能得长辈庇荫。与长辈关系尊重多于亲密。", source: "《紫微斗数全书》" },

  // ---- 天机 ----
  { star: "天机", palace: "命宫", interpretation: "天机居命宫，主人聪明智慧，心思敏捷，善于谋划。但心性多变，容易犹豫不决。宜从事策划、咨询、学术研究等动脑工作。", source: "《紫微斗数全书·天机星》" },
  { star: "天机", palace: "兄弟", interpretation: "天机在兄弟宫，兄弟姐妹聪明有才，但关系时好时坏，变化较多。", source: "《紫微斗数全书》" },
  { star: "天机", palace: "夫妻", interpretation: "天机在夫妻宫，配偶聪明灵活，但婚姻中变化较多，需双方多沟通理解。", source: "《紫微斗数全书》" },
  { star: "天机", palace: "财帛", interpretation: "天机在财帛宫，财运多变动，适合靠智慧、策划、技术赚钱。不宜固定投资，宜灵活应变。", source: "《紫微斗数全书》" },
  { star: "天机", palace: "官禄", interpretation: "天机在官禄宫，事业多变，适合策划、顾问、技术研发等需要动脑的工作。不宜固守一职。", source: "《紫微斗数全书》" },
  { star: "天机", palace: "迁移", interpretation: "天机在迁移宫，外出奔波，但机遇多。适合频繁出差或外出发展，在外有贵人。", source: "《紫微斗数全书》" },

  // ---- 太阳 ----
  { star: "太阳", palace: "命宫", interpretation: "太阳居命宫，主人光明磊落，热情大方，乐于助人。男性命宫太阳旺则事业有成，女性则性格外向，宜嫁贵夫。", source: "《紫微斗数全书·太阳星》" },
  { star: "太阳", palace: "夫妻", interpretation: "太阳在夫妻宫，配偶性格开朗大方，但男性为妻夺夫权，女性则为贵夫之象。太阳落陷则需防婚姻不美。", source: "《紫微斗数全书》" },
  { star: "太阳", palace: "财帛", interpretation: "太阳在财帛宫，钱财来去分明，慷慨大方，但不易积蓄。太阳旺则财源广，陷则财来财去。", source: "《紫微斗数全书》" },
  { star: "太阳", palace: "官禄", interpretation: "太阳在官禄宫，事业光明磊落，宜从事公众事务、教育、公益等阳光行业。太阳旺则事业有成。", source: "《紫微斗数全书》" },
  { star: "太阳", palace: "父母", interpretation: "太阳在父母宫，父亲有地位或影响力，与父亲缘深。太阳陷则需注意父亲健康。", source: "《紫微斗数全书》" },
  { star: "太阳", palace: "子女", interpretation: "太阳在子女宫，子女活泼开朗，有领导才能。但子女个性较强，需以理服之。", source: "《紫微斗数全书》" },

  // ---- 武曲 ----
  { star: "武曲", palace: "命宫", interpretation: "武曲居命宫，主人刚毅果决，有胆识，重义气。性格刚直，不喜阿谀奉承。宜从事金融、军警、技术等行业。", source: "《紫微斗数全书·武曲星》" },
  { star: "武曲", palace: "财帛", interpretation: "武曲为财星，居财帛宫为正位，主财运亨通，善于理财，有积蓄之能。宜从事金融、财务相关工作。", source: "《紫微斗数全书》" },
  { star: "武曲", palace: "夫妻", interpretation: "武曲在夫妻宫，配偶性格刚强，有主见。婚姻中需互相尊重，避免硬碰硬。晚婚为佳。", source: "《紫微斗数全书》" },
  { star: "武曲", palace: "官禄", interpretation: "武曲在官禄宫，事业适合军警、金融、工程、技术等领域。工作认真，有执行力。", source: "《紫微斗数全书》" },
  { star: "武曲", palace: "疾厄", interpretation: "武曲在疾厄宫，需注意呼吸系统及筋骨损伤。体质偏燥，宜多保养。", source: "《紫微斗数全书》" },

  // ---- 天同 ----
  { star: "天同", palace: "命宫", interpretation: "天同居命宫，主人性情温和，待人谦逊，善解人意。有福气，但较懒散，缺乏进取心。宜培养主动精神。", source: "《紫微斗数全书·天同星》" },
  { star: "天同", palace: "夫妻", interpretation: "天同在夫妻宫，配偶温和体贴，婚姻和谐。但需防过于安逸而缺乏激情。", source: "《紫微斗数全书》" },
  { star: "天同", palace: "财帛", interpretation: "天同在财帛宫，财运平稳，不愁吃穿，但难有大富。有储蓄习惯，理财保守。", source: "《紫微斗数全书》" },
  { star: "天同", palace: "福德", interpretation: "天同在福德宫，福泽深厚，晚年安逸。善享清福，精神生活丰富。", source: "《紫微斗数全书》" },
  { star: "天同", palace: "官禄", interpretation: "天同在官禄宫，事业稳定但缺乏进取心。宜从事服务、艺术、教育等与人打交道的工作。", source: "《紫微斗数全书》" },

  // ---- 廉贞 ----
  { star: "廉贞", palace: "命宫", interpretation: "廉贞居命宫，主人性情刚烈，有正义感，重情重义。但心性敏感，易钻牛角尖。宜从事法律、监察、纪律相关工作。", source: "《紫微斗数全书·廉贞星》" },
  { star: "廉贞", palace: "夫妻", interpretation: "廉贞在夫妻宫，婚姻中感情浓烈，但易生波折。需双方多包容，避免因小事争执。", source: "《紫微斗数全书》" },
  { star: "廉贞", palace: "官禄", interpretation: "廉贞在官禄宫，宜从事法律、监察、纪律检查、军警等执法工作。事业心强，有执行力。", source: "《紫微斗数全书》" },
  { star: "廉贞", palace: "交友", interpretation: "廉贞在交友宫，朋友中有讲义气者，但也易交损友。需谨慎择友。", source: "《紫微斗数全书》" },

  // ---- 天府 ----
  { star: "天府", palace: "命宫", interpretation: "天府居命宫，主人相貌端庄，性情温和稳重，有包容心。善于理财，一生衣食无忧。为南斗主星，有领导才能。", source: "《紫微斗数全书·天府星》" },
  { star: "天府", palace: "财帛", interpretation: "天府为财库之星，居财帛宫为正位，主财库丰盈，善于理财储蓄。一生钱财不虞匮乏。", source: "《紫微斗数全书》" },
  { star: "天府", palace: "夫妻", interpretation: "天府在夫妻宫，配偶稳重可靠，婚姻稳定。配偶有管理才能，家庭和睦。", source: "《紫微斗数全书》" },
  { star: "天府", palace: "官禄", interpretation: "天府在官禄宫，事业稳定，宜从事管理、行政、财务等工作。有领导才能，能得下属信任。", source: "《紫微斗数全书》" },
  { star: "天府", palace: "田宅", interpretation: "天府在田宅宫，房产丰厚，家宅安稳。有祖业可守，居住环境优异。", source: "《紫微斗数全书》" },

  // ---- 太阴 ----
  { star: "太阴", palace: "命宫", interpretation: "太阴居命宫，主人容貌清秀，性情温婉，心思细腻。女性命宫太阴旺则贤淑美丽，男性则性格温柔，有艺术气质。", source: "《紫微斗数全书·太阴星》" },
  { star: "太阴", palace: "财帛", interpretation: "太阴为财星，居财帛宫为正位，主财运丰厚，但需防花钱大方。太阴庙旺则富足，落陷则财来财去。", source: "《紫微斗数全书》" },
  { star: "太阴", palace: "夫妻", interpretation: "太阴在夫妻宫，配偶容貌秀丽，性格温柔。女性为贵夫之象，男性则娶贤妻。", source: "《紫微斗数全书》" },
  { star: "太阴", palace: "田宅", interpretation: "太阴在田宅宫，家宅环境优美，房产运好。宜置产，有居家之福。", source: "《紫微斗数全书》" },
  { star: "太阴", palace: "父母", interpretation: "太阴在父母宫，母亲贤淑，与母亲缘深。太阴陷则需注意母亲健康。", source: "《紫微斗数全书》" },

  // ---- 贪狼 ----
  { star: "贪狼", palace: "命宫", interpretation: "贪狼居命宫，主人多才多艺，善于交际，有艺术天赋。但欲望强，需防沉迷酒色。贪狼为桃花星，异性缘佳。", source: "《紫微斗数全书·贪狼星》" },
  { star: "贪狼", palace: "夫妻", interpretation: "贪狼在夫妻宫，配偶有魅力，异性缘好。婚姻中需防第三者介入，宜多沟通增进感情。", source: "《紫微斗数全书》" },
  { star: "贪狼", palace: "财帛", interpretation: "贪狼在财帛宫，有偏财运，但需防投机失利。宜以才艺谋财，不宜赌博。", source: "《紫微斗数全书》" },
  { star: "贪狼", palace: "官禄", interpretation: "贪狼在官禄宫，适合从事艺术、娱乐、公关、营销等需要交际应酬的工作。", source: "《紫微斗数全书》" },

  // ---- 巨门 ----
  { star: "巨门", palace: "命宫", interpretation: "巨门居命宫，主人能言善辩，心思缜密，善于分析。但易生口舌是非，需慎言。宜从事法律、教育、咨询等需要口才的工作。", source: "《紫微斗数全书·巨门星》" },
  { star: "巨门", palace: "夫妻", interpretation: "巨门在夫妻宫，婚姻中易有口舌争执，需双方多包容。配偶口才好，但有时过于挑剔。", source: "《紫微斗数全书》" },
  { star: "巨门", palace: "官禄", interpretation: "巨门在官禄宫，适合从事律师、教师、咨询师、记者等需要口才和分析能力的工作。", source: "《紫微斗数全书》" },

  // ---- 天相 ----
  { star: "天相", palace: "命宫", interpretation: "天相居命宫，主人相貌端正，性情温和，乐于助人。为人忠厚，有服务精神。宜从事行政、服务、协调类工作。", source: "《紫微斗数全书·天相星》" },
  { star: "天相", palace: "夫妻", interpretation: "天相在夫妻宫，配偶相貌端正，婚姻和美。配偶为贤内助，家庭和睦。", source: "《紫微斗数全书》" },
  { star: "天相", palace: "官禄", interpretation: "天相在官禄宫，事业稳定，宜从事行政、人事、服务等协调性工作。有贵人相助。", source: "《紫微斗数全书》" },

  // ---- 天梁 ----
  { star: "天梁", palace: "命宫", interpretation: "天梁居命宫，主人心地善良，有长者之风，乐于助人。有逢凶化吉之福，但早年多波折，晚年福厚。宜从事医疗、慈善、教育等行业。", source: "《紫微斗数全书·天梁星》" },
  { star: "天梁", palace: "疾厄", interpretation: "天梁为寿星，居疾厄宫虽有病亦能遇良医，有逢凶化吉之象。但需注意脾胃保养。", source: "《紫微斗数全书》" },
  { star: "天梁", palace: "父母", interpretation: "天梁在父母宫，父母仁慈长寿，有福气。与长辈缘深，能得庇荫。", source: "《紫微斗数全书》" },
  { star: "天梁", palace: "福德", interpretation: "天梁在福德宫，福泽深厚，晚年安逸。精神生活丰富，有宗教信仰倾向。", source: "《紫微斗数全书》" },

  // ---- 七杀 ----
  { star: "七杀", palace: "命宫", interpretation: "七杀居命宫，主人性格刚强，有胆识魄力，敢于冒险。但性情急躁，宜培养耐心。七杀为将星，有统兵之才，宜从事军警、工程、管理等工作。", source: "《紫微斗数全书·七杀星》" },
  { star: "七杀", palace: "夫妻", interpretation: "七杀在夫妻宫，配偶性格刚强独立，婚姻中需互相尊重空间。晚婚为佳，早婚易生波折。", source: "《紫微斗数全书》" },
  { star: "七杀", palace: "官禄", interpretation: "七杀在官禄宫，事业适合军警、工程、技术、管理等需要决断力的工作。有开拓精神。", source: "《紫微斗数全书》" },

  // ---- 破军 ----
  { star: "破军", palace: "命宫", interpretation: "破军居命宫，主人性格敢作敢为，有改革精神，不喜墨守成规。但情绪波动大，需培养定力。破军为先锋之星，有开创之能，宜从事创新、变革类工作。", source: "《紫微斗数全书·破军星》" },
  { star: "破军", palace: "夫妻", interpretation: "破军在夫妻宫，婚姻中变化较多，需双方不断调整适应。配偶有开创精神，但情绪波动大。", source: "《紫微斗数全书》" },
  { star: "破军", palace: "官禄", interpretation: "破军在官禄宫，事业多变，适合创新、改革、开拓性工作。不宜守成，宜不断突破。", source: "《紫微斗数全书》" },
];

export const BRIGHTNESS_INTERPRETATIONS: Record<string, string> = {
  "庙": "庙旺为星曜最吉之状态，主星曜之力完全发挥，吉星更吉，凶星亦减其凶性。",
  "旺": "旺为星曜次吉之状态，主星曜之力充沛，吉象明显。",
  "得": "得地为星曜较佳之状态，主星曜有施展空间，较为顺利。",
  "利": "利为星曜平顺之状态，主星曜之力中等，无大吉无大凶。",
  "平": "平为星曜中性之状态，主星曜之力平常，需靠自身努力。",
  "不": "不地为星曜不吉之状态，主星曜之力受阻，吉星减吉，凶星增凶。",
  "陷": "落陷为星曜最弱之状态，主星曜之力衰微，吉星无力，凶星逞凶。",
};

export function getPalaceInterpretation(palaceName: string): PalaceInterpretation | null {
  return PALACE_INTERPRETATIONS[palaceName] || null;
}

export function getStarPalaceInterpretation(starName: string, palaceName: string): string | null {
  const found = STAR_PALACE_INTERPRETATIONS.find(
    (item) => item.star === starName && item.palace === palaceName
  );
  return found ? found.interpretation : null;
}

export function getSihuaInterpretation(sihuaType: string, starName: string, palaceName: string): string {
  const baseInterpretations: Record<string, Record<string, string>> = {
    "化禄": {
      "general": "化禄为福德之神，主财富、福气、人缘。化禄之星所临宫位，主该宫位之事顺遂，有福可享。",
      "命宫": "命宫化禄，一生福泽深厚，得贵人相助，衣食无忧。性格乐观，人缘好。",
      "财帛": "财帛宫化禄，财运亨通，收入丰厚，有意外之财。",
      "官禄": "官禄宫化禄，事业顺利，有贵人提携，升迁有望。",
      "夫妻": "夫妻宫化禄，婚姻幸福，配偶有财运，家庭和睦。",
    },
    "化权": {
      "general": "化权为权势之神，主权力、掌控、决断。化权之星所临宫位，主该宫位之事有掌控力，可掌权柄。",
      "命宫": "命宫化权，有领导才能，掌权柄，能独当一面。性格刚强，有决断力。",
      "官禄": "官禄宫化权，事业有成就，可掌实权，升迁顺利。",
      "财帛": "财帛宫化权，善于理财，能掌控钱财，投资有方。",
      "夫妻": "夫妻宫化权，配偶有主见，婚姻中一方占主导地位。",
    },
    "化科": {
      "general": "化科为文星，主名声、学问、考试运。化科之星所临宫位，主该宫位之事有文采，名声在外。",
      "命宫": "命宫化科，文采出众，名声在外，有学术成就。考试运好，宜深造。",
      "官禄": "官禄宫化科，事业有文名，宜从事学术、教育、文化工作。",
      "夫妻": "夫妻宫化科，配偶文雅有才，婚姻和美，有文化品位。",
      "财帛": "财帛宫化科，以文才谋财，钱财来源正当，有体面收入。",
    },
    "化忌": {
      "general": "化忌为多管之神，主阻滞、困扰、是非。化忌之星所临宫位，主该宫位之事多阻碍，需多用心经营。",
      "命宫": "命宫化忌，一生多阻滞，需低调行事，谨言慎行。宜守不宜攻，稳扎稳打。",
      "财帛": "财帛宫化忌，财运不佳，需防破财，理财需谨慎。",
      "官禄": "官禄宫化忌，事业不顺，需防小人，工作宜求稳。",
      "夫妻": "夫妻宫化忌，婚姻多波折，需多沟通包容，避免争执。",
    },
  };

  const sihuaData = baseInterpretations[sihuaType];
  if (!sihuaData) return "";
  return sihuaData[palaceName] || sihuaData["general"] || "";
}

export function getPalaceAllStarInterpretations(
  majorStars: string[],
  palaceName: string,
  sihua: { huaLu?: { star: string; palace: string }; huaQuan?: { star: string; palace: string }; huaKe?: { star: string; palace: string }; huaJi?: { star: string; palace: string } }
): Array<{ type: "star" | "sihua"; title: string; content: string; source: string }> {
  const results: Array<{ type: "star" | "sihua"; title: string; content: string; source: string }> = [];

  for (const star of majorStars) {
    const interp = getStarPalaceInterpretation(star, palaceName);
    if (interp) {
      results.push({ type: "star", title: `${star}在${palaceName}`, content: interp, source: "《紫微斗数全书》" });
    }
  }

  const sihuaTypes = [
    { key: "huaLu", type: "化禄" },
    { key: "huaQuan", type: "化权" },
    { key: "huaKe", type: "化科" },
    { key: "huaJi", type: "化忌" },
  ];

  for (const { key, type } of sihuaTypes) {
    const sihuaItem = (sihua as any)[key];
    if (sihuaItem && sihuaItem.star && sihuaItem.palace === palaceName) {
      const interp = getSihuaInterpretation(type, sihuaItem.star, palaceName);
      if (interp) {
        results.push({ type: "sihua", title: `${sihuaItem.star}${type}`, content: interp, source: "《紫微斗数全书·四化篇》" });
      }
    }
  }

  return results;
}