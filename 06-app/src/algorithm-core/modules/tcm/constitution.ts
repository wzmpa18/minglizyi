/**
 * 中医体质辨识模块 - 基于中华中医药学会标准 ZYYXH/T157-2009
 * (参照 GB/T 21156-2007《中医体质分类与判定》)
 *
 * 九种体质：平和质、气虚质、阳虚质、阴虚质、痰湿质、湿热质、血瘀质、气郁质、特禀质
 */

// ============================================================================
// 类型定义
// ============================================================================

export interface ConstitutionType {
  id: string;
  name: string;
  pinyin: string;
  icon: string;
  color: string;
  bgColor: string;
  features: string;           // 总体特征
  physicalTraits: string;     // 形体特征
  commonManifestations: string; // 常见表现
  psychologicalTraits: string;  // 心理特征
  diseaseTendency: string;      // 发病倾向
  adaptability: string;         // 对外界环境适应能力
  healthAdvice: {
    diet: string;
    exercise: string;
    acupoints: string;
    lifestyle: string;
  };
}

export interface ConstitutionQuestion {
  id: string;
  text: string;
  constitutionId: string;
  reverse?: boolean; // 反向计分（用于平和质）
}

export interface ConstitutionScore {
  id: string;
  name: string;
  rawScore: number;
  convertedScore: number; // 转化分 0-100
}

export interface ConstitutionResult {
  id: string;
  timestamp: number;
  date: string;
  scores: ConstitutionScore[];
  primaryType: ConstitutionType;
  secondaryTypes: ConstitutionType[];
  isBalanced: boolean; // 是否为平和质
}

// ============================================================================
// 九种体质定义
// ============================================================================

export const CONSTITUTION_TYPES: ConstitutionType[] = [
  {
    id: "pinghe",
    name: "平和质",
    pinyin: "píng hé zhì",
    icon: "☯️",
    color: "#2E7D32",
    bgColor: "#E8F5E9",
    features: "阴阳气血调和，以体态适中、面色红润、精力充沛等为主要特征。",
    physicalTraits: "体形匀称健壮，面色、肤色润泽，头发稠密有光泽，目光有神，鼻色明润，嗅觉通利，唇色红润。",
    commonManifestations: "面色红润，精力充沛，睡眠良好，二便正常，舌色淡红，苔薄白，脉和有神。",
    psychologicalTraits: "性格随和开朗，心情舒畅，情绪稳定。",
    diseaseTendency: "平素患病较少，对自然和社会环境适应能力较强。",
    adaptability: "对自然环境和社会环境适应能力较强。",
    healthAdvice: {
      diet: "饮食有节，不偏食，粗细粮搭配合理，多吃五谷杂粮、蔬菜水果，少食过于油腻辛辣之物。",
      exercise: "坚持规律运动，可选择跑步、游泳、太极拳、瑜伽等，保持适度运动量。",
      acupoints: "可常按足三里（健脾益气）、涌泉穴（补肾强身）、合谷穴（调理气血）。",
      lifestyle: "起居有常，劳逸结合，保持充足睡眠，保持心态平和，避免过度劳累。",
    },
  },
  {
    id: "qixu",
    name: "气虚质",
    pinyin: "qì xū zhì",
    icon: "🌬️",
    color: "#FF9800",
    bgColor: "#FFF3E0",
    features: "元气不足，以疲乏、气短、自汗等气虚表现为主要特征。",
    physicalTraits: "肌肉松软不实，形体偏瘦或偏胖，体倦乏力，面色偏黄或苍白。",
    commonManifestations: "平素语音低弱，气短懒言，容易疲乏，精神不振，易出汗，舌淡红，舌边有齿痕，脉弱。",
    psychologicalTraits: "性格内向，不喜冒险，情绪不稳定，胆小。",
    diseaseTendency: "易患感冒、内脏下垂等病，病后康复缓慢。",
    adaptability: "不耐受风、寒、暑、湿邪，对外界环境适应能力差。",
    healthAdvice: {
      diet: "宜多食益气健脾的食物，如山药、黄芪、大枣、鸡肉、牛肉、小米、白扁豆等；少食空心菜、生萝卜等耗气食物。",
      exercise: "宜做柔缓运动，如散步、太极拳、八段锦等，避免剧烈运动和过度劳累。",
      acupoints: "常按足三里（补中益气）、气海穴（益气固本）、关元穴（培元固本）。",
      lifestyle: "起居有规律，避免熬夜，注意保暖，避免过度劳累，可适当午睡。",
    },
  },
  {
    id: "yangxu",
    name: "阳虚质",
    pinyin: "yáng xū zhì",
    icon: "❄️",
    color: "#1565C0",
    bgColor: "#E3F2FD",
    features: "阳气不足，以畏寒怕冷、手足不温等虚寒表现为主要特征。",
    physicalTraits: "肌肉松软不实，形体白胖，面色柔白，畏寒怕冷。",
    commonManifestations: "平素畏冷，手足不温，喜热饮食，精神不振，舌淡胖嫩，脉沉迟。",
    psychologicalTraits: "性格多沉静、内向，精神不振。",
    diseaseTendency: "易患痰饮、肿胀、泄泻等病，感邪易从寒化。",
    adaptability: "耐夏不耐冬，易感风、寒、湿邪。",
    healthAdvice: {
      diet: "宜多食温阳散寒的食物，如羊肉、韭菜、生姜、核桃、桂圆等；少食生冷寒凉食物如西瓜、梨、绿豆、冰饮等。",
      exercise: "可适当进行有氧运动如慢跑、快走、跳绳，多在阳光下运动，避免在阴冷潮湿环境中锻炼。",
      acupoints: "常按关元穴（温阳固本）、命门穴（温肾壮阳）、足三里（温补脾胃）。",
      lifestyle: "注意保暖，尤其腰腹和下肢，夏季少吹空调，秋冬注意进补，多晒太阳，避免熬夜伤阳。",
    },
  },
  {
    id: "yinxu",
    name: "阴虚质",
    pinyin: "yīn xū zhì",
    icon: "🔥",
    color: "#C62828",
    bgColor: "#FFEBEE",
    features: "阴液亏少，以口燥咽干、手足心热等虚热表现为主要特征。",
    physicalTraits: "体形偏瘦，面色潮红，皮肤偏干。",
    commonManifestations: "手足心热，口燥咽干，鼻微干，喜冷饮，大便干燥，舌红少津，脉细数。",
    psychologicalTraits: "性情急躁，外向好动，活泼。",
    diseaseTendency: "易患虚劳、失精、不寐等病，感邪易从热化。",
    adaptability: "耐冬不耐夏，不耐受暑、热、燥邪。",
    healthAdvice: {
      diet: "宜多食滋阴润燥的食物，如银耳、百合、梨、鸭肉、黑豆、芝麻、枸杞等；少食温燥辛辣食物如羊肉、辣椒、花椒等。",
      exercise: "宜做温和运动如太极拳、游泳、散步，避免剧烈运动大汗淋漓，运动后注意补充水分。",
      acupoints: "常按太溪穴（滋阴补肾）、三阴交（滋阴养血）、照海穴（滋阴清热）。",
      lifestyle: "起居有规律，避免熬夜，保持充足睡眠，避免过度劳累，保持情绪稳定，戒烟限酒。",
    },
  },
  {
    id: "tanshi",
    name: "痰湿质",
    pinyin: "tán shī zhì",
    icon: "💧",
    color: "#6A1B9A",
    bgColor: "#F3E5F5",
    features: "痰湿凝聚，以形体肥胖、腹部肥满、口黏苔腻等痰湿表现为主要特征。",
    physicalTraits: "体形肥胖，腹部肥满松软，面部皮肤油脂较多。",
    commonManifestations: "面部皮肤油脂较多，多汗且黏，胸闷，痰多，口黏腻或甜，喜食肥甘甜黏，苔腻，脉滑。",
    psychologicalTraits: "性格温和、稳重，善于忍耐。",
    diseaseTendency: "易患消渴、中风、胸痹等病。",
    adaptability: "对梅雨季节及湿重环境适应能力差。",
    healthAdvice: {
      diet: "饮食宜清淡，多食薏米、赤小豆、冬瓜、白萝卜、荷叶等化痰祛湿食物；少食肥肉、甜食、油腻食物，控制饮酒。",
      exercise: "应坚持长期运动锻炼，如慢跑、游泳、快走、球类运动等，运动强度应逐渐增强。",
      acupoints: "常按丰隆穴（化痰祛湿）、足三里（健脾化湿）、阴陵泉（健脾利湿）。",
      lifestyle: "居住环境宜干燥通风，避免潮湿，衣着应透气散湿，定期检查血糖、血脂。",
    },
  },
  {
    id: "shire",
    name: "湿热质",
    pinyin: "shī rè zhì",
    icon: "🌡️",
    color: "#E65100",
    bgColor: "#FFF3E0",
    features: "湿热内蕴，以面垢油光、口苦、苔黄腻等湿热表现为主要特征。",
    physicalTraits: "形体中等或偏瘦，面垢油光，易生痤疮。",
    commonManifestations: "面垢油光，易生痤疮，口苦口干，身重困倦，大便黏滞不畅或燥结，小便短黄，男性易阴囊潮湿，女性易带下增多，舌质偏红，苔黄腻，脉滑数。",
    psychologicalTraits: "容易心烦急躁。",
    diseaseTendency: "易患疮疖、黄疸、热淋等病。",
    adaptability: "对夏末秋初湿热气候，湿重或气温偏高环境较难适应。",
    healthAdvice: {
      diet: "宜食清热利湿的食物，如绿豆、苦瓜、冬瓜、薏米、莲藕、芹菜等；少食辛辣燥烈食物如辣椒、羊肉、狗肉，忌烟酒。",
      exercise: "适合中长跑、游泳、爬山、球类运动等，消耗体内多余热量，排除湿热。",
      acupoints: "常按曲池穴（清热利湿）、阴陵泉（健脾利湿）、太冲穴（疏肝清热）。",
      lifestyle: "避免长期熬夜，保持二便通畅，注意个人卫生，居室通风干燥，戒烟酒。",
    },
  },
  {
    id: "xueyu",
    name: "血瘀质",
    pinyin: "xuè yū zhì",
    icon: "🩸",
    color: "#AD1457",
    bgColor: "#FCE4EC",
    features: "血行不畅，以肤色晦黯、舌质紫黯等血瘀表现为主要特征。",
    physicalTraits: "胖瘦均见，肤色晦黯，色素沉着，容易出现瘀斑。",
    commonManifestations: "肤色晦黯，色素沉着，容易出现瘀斑，口唇黯淡，舌黯或有瘀点，舌下络脉紫黯或增粗，脉涩。",
    psychologicalTraits: "易烦，健忘，性格内郁。",
    diseaseTendency: "易患癥瘕及痛证、血证等。",
    adaptability: "不耐受寒邪。",
    healthAdvice: {
      diet: "宜多食具有行气活血作用的食物，如山楂、醋、玫瑰花、金橘、桃仁、黑豆、油菜等；少食肥肉等滋腻之品。",
      exercise: "宜进行有助于促进气血运行的运动，如舞蹈、太极拳、八段锦、快走、慢跑等，坚持经常性锻炼。",
      acupoints: "常按血海穴（活血化瘀）、合谷穴（行气活血）、三阴交（活血调经）。",
      lifestyle: "保持心情舒畅，避免长期抑郁，注意保暖，避免久坐不动，可定期进行经络按摩。",
    },
  },
  {
    id: "qiyu",
    name: "气郁质",
    pinyin: "qì yù zhì",
    icon: "😔",
    color: "#4527A0",
    bgColor: "#EDE7F6",
    features: "气机郁滞，以神情抑郁、忧虑脆弱等气郁表现为主要特征。",
    physicalTraits: "形体瘦者为多，性格内向不稳定。",
    commonManifestations: "神情抑郁，情感脆弱，烦闷不乐，舌淡红，苔薄白，脉弦。",
    psychologicalTraits: "性格内向不稳定，敏感多虑，情绪波动大。",
    diseaseTendency: "易患脏躁、梅核气、百合病及郁证等。",
    adaptability: "对精神刺激适应能力较差，不适应阴雨天气。",
    healthAdvice: {
      diet: "宜多食行气解郁的食物，如玫瑰花、佛手、橙子、柑橘、香菜、萝卜、黄花菜等；少食收敛酸涩之物如乌梅、青梅、杨梅等。",
      exercise: "宜坚持较大量的运动锻炼，如跑步、登山、游泳、武术等，多参加集体性运动，多与人交流。",
      acupoints: "常按太冲穴（疏肝解郁）、期门穴（疏肝理气）、内关穴（宁心安神）。",
      lifestyle: "主动寻求快乐，多参加社会活动和集体文娱活动，培养乐观豁达的性格，保持良好人际关系。",
    },
  },
  {
    id: "tebing",
    name: "特禀质",
    pinyin: "tè bǐng zhì",
    icon: "🤧",
    color: "#00695C",
    bgColor: "#E0F2F1",
    features: "先天失常，以生理缺陷、过敏反应等为主要特征。",
    physicalTraits: "过敏体质者一般无特殊形体特征，先天禀赋异常者或有畸形，或有生理缺陷。",
    commonManifestations: "过敏体质者常见哮喘、风团、咽痒、鼻塞、喷嚏等；患遗传性疾病者有垂直遗传、先天性、家族性特征。",
    psychologicalTraits: "因禀质特异情况而不同，过敏体质者性格多敏感。",
    diseaseTendency: "过敏体质者易患哮喘、荨麻疹、花粉症及药物过敏等；遗传性疾病如血友病、先天愚型等。",
    adaptability: "适应能力差，如过敏体质者对易致过敏季节适应能力差，易引发宿疾。",
    healthAdvice: {
      diet: "饮食宜清淡、均衡，粗细搭配，少食荞麦、蚕豆、白扁豆、牛肉、鹅肉、鲤鱼、虾、蟹、茄子、酒、辣椒等致敏食物。",
      exercise: "根据个人体质选择适合的运动，避免在过敏原多的环境中运动，运动时注意防护。",
      acupoints: "常按迎香穴（通利鼻窍）、曲池穴（祛风止痒）、足三里（增强体质）。",
      lifestyle: "起居有规律，保持充足睡眠，增强体质，避免接触过敏原，注意个人卫生，保持室内清洁通风。",
    },
  },
];

// ============================================================================
// 体质测评问卷（基于国家标准判定量表，约60+题）
// 评分标准：没有=1, 很少=2, 有时=3, 经常=4, 总是=5
// 平和质部分条目为反向计分（reverse标记）
// ============================================================================

export const CONSTITUTION_QUESTIONS: ConstitutionQuestion[] = [
  // --- 平和质 (8题，含反向计分题) ---
  { id: "ph1", text: "您精力充沛吗？", constitutionId: "pinghe" },
  { id: "ph2", text: "您容易疲乏吗？", constitutionId: "pinghe", reverse: true },
  { id: "ph3", text: "您说话声音低弱无力吗？", constitutionId: "pinghe", reverse: true },
  { id: "ph4", text: "您感到闷闷不乐、情绪低沉吗？", constitutionId: "pinghe", reverse: true },
  { id: "ph5", text: "您比一般人耐受不了寒冷吗？", constitutionId: "pinghe", reverse: true },
  { id: "ph6", text: "您能适应外界自然和社会环境的变化吗？", constitutionId: "pinghe" },
  { id: "ph7", text: "您容易失眠吗？", constitutionId: "pinghe", reverse: true },
  { id: "ph8", text: "您容易忘事（健忘）吗？", constitutionId: "pinghe", reverse: true },

  // --- 气虚质 (8题) ---
  { id: "qx1", text: "您容易疲乏吗？", constitutionId: "qixu" },
  { id: "qx2", text: "您容易气短（呼吸短促，接不上气）吗？", constitutionId: "qixu" },
  { id: "qx3", text: "您容易心慌吗？", constitutionId: "qixu" },
  { id: "qx4", text: "您容易头晕或站起时晕眩吗？", constitutionId: "qixu" },
  { id: "qx5", text: "您比别人容易患感冒吗？", constitutionId: "qixu" },
  { id: "qx6", text: "您喜欢安静、懒得说话吗？", constitutionId: "qixu" },
  { id: "qx7", text: "您说话声音低弱无力吗？", constitutionId: "qixu" },
  { id: "qx8", text: "您活动量稍大就容易出虚汗吗？", constitutionId: "qixu" },

  // --- 阳虚质 (7题) ---
  { id: "yx1", text: "您手脚发凉吗？", constitutionId: "yangxu" },
  { id: "yx2", text: "您胃脘部、背部或腰膝部怕冷吗？", constitutionId: "yangxu" },
  { id: "yx3", text: "您感到怕冷、衣服比别人穿得多吗？", constitutionId: "yangxu" },
  { id: "yx4", text: "您比一般人耐受不了寒冷吗？", constitutionId: "yangxu" },
  { id: "yx5", text: "您比别人容易患感冒吗？", constitutionId: "yangxu" },
  { id: "yx6", text: "您吃凉东西会感到不适或怕吃凉东西吗？", constitutionId: "yangxu" },
  { id: "yx7", text: "您受凉或吃凉东西后容易腹泻吗？", constitutionId: "yangxu" },

  // --- 阴虚质 (8题) ---
  { id: "yyx1", text: "您感到手脚心发热吗？", constitutionId: "yinxu" },
  { id: "yyx2", text: "您感觉身体、脸上发热吗？", constitutionId: "yinxu" },
  { id: "yyx3", text: "您皮肤或口唇干吗？", constitutionId: "yinxu" },
  { id: "yyx4", text: "您口唇的颜色比一般人红吗？", constitutionId: "yinxu" },
  { id: "yyx5", text: "您容易便秘或大便干燥吗？", constitutionId: "yinxu" },
  { id: "yyx6", text: "您面部两颧潮红或偏红吗？", constitutionId: "yinxu" },
  { id: "yyx7", text: "您感到眼睛干涩吗？", constitutionId: "yinxu" },
  { id: "yyx8", text: "您感到口干咽燥、总想喝水吗？", constitutionId: "yinxu" },

  // --- 痰湿质 (8题) ---
  { id: "ts1", text: "您感到胸闷或腹部胀满吗？", constitutionId: "tanshi" },
  { id: "ts2", text: "您感到身体沉重不轻松或不爽快吗？", constitutionId: "tanshi" },
  { id: "ts3", text: "您腹部肥满松软吗？", constitutionId: "tanshi" },
  { id: "ts4", text: "您有额部油脂分泌多的现象吗？", constitutionId: "tanshi" },
  { id: "ts5", text: "您上眼睑比别人肿（上眼睑有轻微隆起）吗？", constitutionId: "tanshi" },
  { id: "ts6", text: "您嘴里有黏黏的感觉吗？", constitutionId: "tanshi" },
  { id: "ts7", text: "您平时痰多，特别是咽喉部总感到有痰堵着吗？", constitutionId: "tanshi" },
  { id: "ts8", text: "您舌苔厚腻或有舌苔厚厚的感觉吗？", constitutionId: "tanshi" },

  // --- 湿热质 (6题) ---
  { id: "sr1", text: "您面部或鼻部有油腻感或者油亮发光吗？", constitutionId: "shire" },
  { id: "sr2", text: "您容易生痤疮或疮疖吗？", constitutionId: "shire" },
  { id: "sr3", text: "您感到口苦或嘴里有异味吗？", constitutionId: "shire" },
  { id: "sr4", text: "您大便黏滞不爽、有解不尽的感觉吗？", constitutionId: "shire" },
  { id: "sr5", text: "您小便时尿道有发热感、尿色浓（深）吗？", constitutionId: "shire" },
  { id: "sr6", text: "您带下色黄（白带颜色发黄）吗？（限女性回答）/您阴囊部位潮湿吗？（限男性回答）", constitutionId: "shire" },

  // --- 血瘀质 (7题) ---
  { id: "xy1", text: "您的皮肤在不知不觉中会出现青紫瘀斑（皮下出血）吗？", constitutionId: "xueyu" },
  { id: "xy2", text: "您两颧部有细微红丝吗？", constitutionId: "xueyu" },
  { id: "xy3", text: "您身体上有哪里疼痛吗？", constitutionId: "xueyu" },
  { id: "xy4", text: "您面色晦黯或容易出现褐斑吗？", constitutionId: "xueyu" },
  { id: "xy5", text: "您容易有黑眼圈吗？", constitutionId: "xueyu" },
  { id: "xy6", text: "您容易忘事（健忘）吗？", constitutionId: "xueyu" },
  { id: "xy7", text: "您口唇颜色偏黯吗？", constitutionId: "xueyu" },

  // --- 气郁质 (7题) ---
  { id: "qyy1", text: "您感到闷闷不乐、情绪低沉吗？", constitutionId: "qiyu" },
  { id: "qyy2", text: "您容易精神紧张、焦虑不安吗？", constitutionId: "qiyu" },
  { id: "qyy3", text: "您多愁善感、感情脆弱吗？", constitutionId: "qiyu" },
  { id: "qyy4", text: "您容易感到害怕或受到惊吓吗？", constitutionId: "qiyu" },
  { id: "qyy5", text: "您胁肋部或乳房胀痛吗？", constitutionId: "qiyu" },
  { id: "qyy6", text: "您无缘无故叹气吗？", constitutionId: "qiyu" },
  { id: "qyy7", text: "您咽喉部有异物感，且吐之不出、咽之不下吗？", constitutionId: "qiyu" },

  // --- 特禀质 (7题) ---
  { id: "tb1", text: "您没有感冒时也会打喷嚏吗？", constitutionId: "tebing" },
  { id: "tb2", text: "您没有感冒时也会鼻塞、流鼻涕吗？", constitutionId: "tebing" },
  { id: "tb3", text: "您有因季节变化、温度变化或异味等原因而咳喘的现象吗？", constitutionId: "tebing" },
  { id: "tb4", text: "您容易过敏（对药物、食物、气味、花粉或在季节交替、气候变化时）吗？", constitutionId: "tebing" },
  { id: "tb5", text: "您的皮肤容易起荨麻疹（风团、风疹块、风疙瘩）吗？", constitutionId: "tebing" },
  { id: "tb6", text: "您的皮肤因过敏出现过紫癜（紫红色瘀点、瘀斑）吗？", constitutionId: "tebing" },
  { id: "tb7", text: "您的皮肤一抓就红，并出现抓痕吗？", constitutionId: "tebing" },
];

// ============================================================================
// 常量
// ============================================================================

export const COMPLIANCE_TEXT = "体质测评仅供学习参考，不作为诊断依据";

const HISTORY_KEY = "tcm_constitution_history";
const MAX_HISTORY = 20;

// 判定阈值
const BALANCED_THRESHOLD = 60;       // 平和质转化分 >= 60 为基本是
const UNBALANCED_THRESHOLD = 40;    // 偏颇体质转化分 >= 40 为是
const SECONDARY_THRESHOLD = 30;     // 转化分 >= 30 为倾向是

// ============================================================================
// 数据访问函数
// ============================================================================

export function getConstitutionTypes(): ConstitutionType[] {
  return CONSTITUTION_TYPES;
}

export function getConstitutionById(id: string): ConstitutionType | undefined {
  return CONSTITUTION_TYPES.find((c) => c.id === id);
}

export function getQuestionnaire(): ConstitutionQuestion[] {
  return CONSTITUTION_QUESTIONS;
}

// ============================================================================
// 评分算法
// ============================================================================

/**
 * 计算体质得分
 * 算法依据：中华中医药学会《中医体质分类与判定》标准
 *
 * 原始分 = 各条目分数之和
 * 转化分 = [(原始分 - 条目数) / (条目数 × 4)] × 100
 *
 * 判定标准：
 * - 平和质：转化分 >= 60 且其他8种体质转化分均 < 40 → 是
 *           转化分 >= 60 且其他8种体质转化分均 < 30 → 基本是
 *           否则 → 否
 * - 偏颇体质：转化分 >= 40 → 是；30-39 → 倾向是；<30 → 否
 */
export function calculateConstitution(
  answers: Record<string, number>
): ConstitutionResult {
  // 按体质分组计算原始分
  const rawScores: Record<string, number> = {};
  const questionCounts: Record<string, number> = {};
  const reverseFlags: Record<string, boolean> = {};

  for (const q of CONSTITUTION_QUESTIONS) {
    const score = answers[q.id] ?? 0;
    if (!rawScores[q.constitutionId]) {
      rawScores[q.constitutionId] = 0;
      questionCounts[q.constitutionId] = 0;
      reverseFlags[q.constitutionId] = false;
    }

    // 反向计分：1→5, 2→4, 3→3, 4→2, 5→1
    const actualScore = q.reverse ? 6 - score : score;
    rawScores[q.constitutionId] += actualScore;
    questionCounts[q.constitutionId] += 1;
  }

  // 计算转化分
  const scores: ConstitutionScore[] = CONSTITUTION_TYPES.map((type) => {
    const raw = rawScores[type.id] || 0;
    const count = questionCounts[type.id] || 1;
    // 转化分公式：[(原始分 - 条目数) / (条目数 × 4)] × 100
    const converted = Math.round(((raw - count) / (count * 4)) * 100);
    return {
      id: type.id,
      name: type.name,
      rawScore: raw,
      convertedScore: Math.max(0, Math.min(100, converted)),
    };
  });

  // 找平和质分数
  const pingheScore = scores.find((s) => s.id === "pinghe")!;
  const biasedScores = scores.filter((s) => s.id !== "pinghe");

  // 判定主要体质
  let primaryType: ConstitutionType;
  let secondaryTypes: ConstitutionType[] = [];
  let isBalanced = false;

  // 检查是否为平和质
  const allBiasedLow = biasedScores.every((s) => s.convertedScore < UNBALANCED_THRESHOLD);
  const allBiasedVeryLow = biasedScores.every((s) => s.convertedScore < SECONDARY_THRESHOLD);

  if (pingheScore.convertedScore >= BALANCED_THRESHOLD && allBiasedLow) {
    // 平和质
    primaryType = getConstitutionById("pinghe")!;
    isBalanced = true;
    // 如果有倾向的偏颇体质，作为兼夹体质
    if (!allBiasedVeryLow) {
      secondaryTypes = biasedScores
        .filter((s) => s.convertedScore >= SECONDARY_THRESHOLD)
        .sort((a, b) => b.convertedScore - a.convertedScore)
        .map((s) => getConstitutionById(s.id)!)
        .filter(Boolean)
        .slice(0, 2);
    }
  } else {
    // 偏颇体质
    // 找出转化分最高的偏颇体质
    const sortedBiased = [...biasedScores].sort(
      (a, b) => b.convertedScore - a.convertedScore
    );
    primaryType = getConstitutionById(sortedBiased[0].id)!;
    isBalanced = false;

    // 次要体质：转化分 >= 30 的其他偏颇体质
    secondaryTypes = sortedBiased
      .slice(1)
      .filter((s) => s.convertedScore >= SECONDARY_THRESHOLD)
      .map((s) => getConstitutionById(s.id)!)
      .filter(Boolean)
      .slice(0, 2);
  }

  const now = new Date();
  return {
    id: `result_${now.getTime()}`,
    timestamp: now.getTime(),
    date: now.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    scores,
    primaryType,
    secondaryTypes,
    isBalanced,
  };
}

// ============================================================================
// 历史记录管理 (localStorage)
// ============================================================================

export function getHistory(): ConstitutionResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveResult(result: ConstitutionResult): void {
  if (typeof window === "undefined") return;
  try {
    const history = getHistory();
    history.unshift(result);
    const trimmed = history.slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore storage errors
  }
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // ignore
  }
}
