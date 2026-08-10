/**
 * v20.1 养生（上古之道）模块数据
 * 9大分类：气功导引/内丹功法/呼吸吐纳/导引按跷/传统养生术/瑜伽/冥想/站桩养生/现代养生
 */

export interface VideoLink {
  title: string;
  platform: string; // B站/优酷/腾讯视频等
  url: string;
  cover?: string; // 封面图URL（可选）
  duration?: string;
}

export interface GongfaStep {
  title: string;
  essentials: string; // 动作要领
  effect: string; // 功效作用
}

export interface GongfaDetail {
  id: string;
  name: string;
  alias?: string; // 别名
  inheritor: string; // 传承人
  era: string; // 年代
  category: string; // 一级分类
  difficulty: "入门" | "初级" | "中级" | "高级";
  intro: string; // 功法简介
  classicSource?: string; // 典籍出处引用
  steps: GongfaStep[]; // 功法详解
  videos: VideoLink[]; // 视频学习
  classicText?: string; // 古籍原文
  hotTag?: string; // 热度标签
}

export interface YangshengCategory {
  id: string;
  name: string;
  desc: string;
  icon: string; // emoji
  color: string;
}

export const YANGSHENG_CATEGORIES: YangshengCategory[] = [
  { id: "all", name: "全部", desc: "所有功法", icon: "📋", color: "#7B2FBE" },
  { id: "qigong", name: "气功导引", desc: "调气导引类养生功法", icon: "🌀", color: "#2E7D32" },
  { id: "neidan", name: "内丹功法", desc: "炼精化气类静功", icon: "🔮", color: "#6A1B9A" },
  { id: "huxi", name: "呼吸吐纳", desc: "调息服气类方法", icon: "💨", color: "#1565C0" },
  { id: "daoyin", name: "导引按跷", desc: "导引按摩类", icon: "👐", color: "#E65100" },
  { id: "chuangtong", name: "传统养生术", desc: "中医养生体系", icon: "☯️", color: "#C62828" },
  { id: "yuja", name: "瑜伽", desc: "现代身心修炼", icon: "🧘", color: "#00838F" },
  { id: "mingxiang", name: "冥想", desc: "静心正念类", icon: "🧠", color: "#5D4037" },
  { id: "zhanzhuang", name: "站桩养生", desc: "站桩静功", icon: "🧍", color: "#37474F" },
  { id: "xiandai", name: "现代养生", desc: "科学养生方法", icon: "📊", color: "#1976D2" },
];

export const GONGFA_LIST: GongfaDetail[] = [
  {
    id: "baduanjin",
    name: "八段锦",
    alias: "八段锦导引法",
    inheritor: "国家体育总局推广",
    era: "宋代",
    category: "qigong",
    difficulty: "入门",
    intro: "八段锦是中国古代流传下来的一种健身功法，由八节动作组成。动作简单易学，适合各年龄段人群练习。具有调理脏腑、疏通经络、调和气血的功效。",
    classicSource: "《道枢·众妙篇》记载，南宋时期已有八段锦的雏形。明代《遵生八笺》中亦有详细记载。",
    classicText: "双手托天理三焦，左右开弓似射雕。调理脾胃须单举，五劳七伤往后瞧。摇头摆尾去心火，两手攀足固肾腰。攒拳怒目增气力，背后七颠百病消。",
    hotTag: "国民健身",
    steps: [
      { title: "第一式：双手托天理三焦", essentials: "双手交叉上托，缓缓举过头顶，臂肘伸直，同时足跟离地，全身伸展。", effect: "调理三焦，疏通经络，改善内脏功能。" },
      { title: "第二式：左右开弓似射雕", essentials: "马步站立，双手如拉弓状，左右交替。", effect: "扩胸展臂，增强心肺功能。" },
      { title: "第三式：调理脾胃须单举", essentials: "单手上举，另一手下按，左右交替。", effect: "调理脾胃，增强消化功能。" },
      { title: "第四式：五劳七伤往后瞧", essentials: "头缓缓转向后方，双眼向后看。", effect: "缓解颈肩疲劳，预防颈椎病。" },
      { title: "第五式：摇头摆尾去心火", essentials: "马步下蹲，头部和臀部向相反方向摆动。", effect: "去心火，调理心肾。" },
      { title: "第六式：两手攀足固肾腰", essentials: "双手沿腿后侧下攀至足部，再缓缓起身。", effect: "强腰固肾，增强腰腿力量。" },
      { title: "第七式：攒拳怒目增气力", essentials: "马步站立，双拳交替向前冲出，双目圆睁。", effect: "增强气力，疏通肝经。" },
      { title: "第八式：背后七颠百病消", essentials: "足跟提起再落下，全身颠动七次。", effect: "疏通全身经络，消除疲劳。" },
    ],
    videos: [
      { title: "国家体育总局版八段锦完整教学", platform: "B站", url: "https://www.bilibili.com/video/BV1Yb411W7Hi", duration: "12:30" },
      { title: "八段锦分解教学（慢动作）", platform: "B站", url: "https://www.bilibili.com/video/BV1Hx411y7rD", duration: "20:15" },
    ],
  },
  {
    id: "yijinjing",
    name: "易筋经",
    alias: "达摩易筋经",
    inheritor: "少林传承",
    era: "北魏",
    category: "qigong",
    difficulty: "中级",
    intro: "易筋经相传为达摩祖师所创，通过特定的姿势和呼吸方法，改变筋骨，强壮体魄。共十二式，动作刚柔并济。",
    classicSource: "《易筋经》最早见于明代，传说源自少林寺。清代潘霨整理为《卫生要求》收录。",
    classicText: "将尺之木，变为围指之筋，揉之而已。筋长则力大，骨壮则体强。",
    hotTag: "少林绝学",
    steps: [
      { title: "第一式：韦驮献杵", essentials: "自然站立，双手合十于胸前，心静气沉。", effect: "收心定神，预备开始。" },
      { title: "第二式：横担降魔", essentials: "双臂向两侧平展，掌心向下，如担重物。", effect: "展开胸廓，调理气机。" },
      { title: "第三式：掌托天门", essentials: "双手上托过顶，足跟提起，全身向上伸展。", effect: "疏通三焦，调理全身。" },
      { title: "第四式：摘星换斗", essentials: "单手上举如摘星，头目上视，左右交替。", effect: "舒展肝胆，明目醒脑。" },
      { title: "第五式：倒拽九牛尾", essentials: "弓步站立，双手如拽牛尾般交替拉动。", effect: "增强腰臂力量，疏通经络。" },
      { title: "第六式：出爪亮翅", essentials: "双手向前推出如亮翅状，反复推收。", effect: "增强胸臂力量，扩胸理气。" },
    ],
    videos: [
      { title: "少林易筋经完整教学", platform: "B站", url: "https://www.bilibili.com/video/BV1mW41137oP", duration: "15:40" },
      { title: "易筋经十二式分解", platform: "B站", url: "https://www.bilibili.com/video/BV1Hs41137oZ", duration: "22:10" },
    ],
  },
  {
    id: "wuqinxi",
    name: "五禽戏",
    alias: "华佗五禽戏",
    inheritor: "华佗传承",
    era: "东汉",
    category: "qigong",
    difficulty: "初级",
    intro: "五禽戏由东汉名医华佗所创，模仿虎、鹿、熊、猿、鸟五种动物的形态和动作，达到强身健体的目的。",
    classicSource: "《后汉书·方术传》记载华佗传授五禽之戏。南北朝陶弘景《养性延命录》有详细记载。",
    classicText: "人体欲得劳动，但不当使极尔。动摇则谷气得消，血脉流通，病不得生。譬如户枢，终不朽也。——华佗",
    hotTag: "华佗创编",
    steps: [
      { title: "虎戏：虎扑", essentials: "如猛虎扑食，双手前扑，身体前倾后收。", effect: "强腰固肾，增强腰背力量。" },
      { title: "鹿戏：鹿奔", essentials: "如鹿奔跑，双手前伸，身体前倾。", effect: "舒展腰脊，增强腰腿灵活。" },
      { title: "熊戏：熊运", essentials: "如熊转动身体，腰部左右旋转。", effect: "调理脾胃，增强消化功能。" },
      { title: "猿戏：猿摘", essentials: "如猿猴摘果，左右跳跃，灵活敏捷。", effect: "灵活关节，增强敏捷性。" },
      { title: "鸟戏：鸟飞", essentials: "如鸟展翅飞翔，双臂上下扇动。", effect: "疏通心肺，增强呼吸功能。" },
    ],
    videos: [
      { title: "五禽戏完整教学（国家体育总局）", platform: "B站", url: "https://www.bilibili.com/video/BV1LW41137xp", duration: "14:20" },
    ],
  },
  {
    id: "liuzijue",
    name: "六字诀",
    alias: "六气诀",
    inheritor: "陶弘景传承",
    era: "南北朝",
    category: "huxi",
    difficulty: "入门",
    intro: "六字诀是通过嘘、呵、呼、呬、吹、嘻六个字的发音吐纳，配合呼吸来调理五脏六腑的养生功法。",
    classicSource: "南北朝陶弘景《养性延命录》首次记载六字诀。唐代孙思邈《备急千金要方》亦有收录。",
    classicText: "凡行气，以鼻纳气，以口吐气，微而引之，名曰长息。——《养性延命录》",
    hotTag: "呼吸养生",
    steps: [
      { title: "嘘字诀（肝）", essentials: "口型嘘，配合两手从肝区方向向外展开。", effect: "疏肝理气，明目。" },
      { title: "呵字诀（心）", essentials: "口型呵，配合两手从心区方向向外推出。", effect: "清心泻火，安神。" },
      { title: "呼字诀（脾）", essentials: "口型呼，配合两手从腹部向外托举。", effect: "健脾和胃，消食。" },
      { title: "呬字诀（肺）", essentials: "口型呬，配合两手从胸部向外展开。", effect: "润肺理气，止咳。" },
      { title: "吹字诀（肾）", essentials: "口型吹，配合两手从腰部向下推按。", effect: "固肾强腰，壮阳。" },
      { title: "嘻字诀（三焦）", essentials: "口型嘻，配合两手从上向下疏导。", effect: "调理三焦，理气化滞。" },
    ],
    videos: [
      { title: "六字诀完整教学", platform: "B站", url: "https://www.bilibili.com/video/BV1Hb411W7Qq", duration: "10:30" },
    ],
  },
  {
    id: "zhanzhuang_hunyuan",
    name: "浑圆桩",
    alias: "浑圆站桩",
    inheritor: "王芗斋传承",
    era: "近代",
    category: "zhanzhuang",
    difficulty: "初级",
    intro: "浑圆桩是意拳（大成拳）的基础功法，由王芗斋先生所传。通过站立不动，以意领气，达到内外兼修的效果。",
    classicSource: "王芗斋《意拳正轨》记载。浑圆桩是意拳的核心基本功。",
    classicText: "站桩之功，不在久坐，而在得气。气得则神凝，神凝则形固。——王芗斋",
    hotTag: "意拳根基",
    steps: [
      { title: "第一步骤：调身", essentials: "双脚与肩同宽，膝盖微屈，双手抱球于胸前，全身放松。", effect: "调整身体姿势，建立正确的站桩框架。" },
      { title: "第二步骤：调息", essentials: "自然呼吸，不用刻意控制，逐渐做到细、长、静。", effect: "调整呼吸节奏，进入入静状态。" },
      { title: "第三步骤：调心", essentials: "意念集中在双手间，感受气的充盈，想象怀抱一个大气球。", effect: "以意领气，培养内气。" },
      { title: "第四步骤：收功", essentials: "缓缓放下双手，搓手擦面，散步放松。", effect: "收功归元，防止气血不畅。" },
    ],
    videos: [
      { title: "浑圆桩教学（意拳基础）", platform: "B站", url: "https://www.bilibili.com/video/BV1Yx411y7kP", duration: "18:20" },
    ],
  },
  {
    id: "zhengnian_mingxiang",
    name: "正念冥想",
    alias: "MBSR正念减压",
    inheritor: "乔·卡巴金",
    era: "现代",
    category: "mingxiang",
    difficulty: "入门",
    intro: "正念冥想源自佛教禅修传统，由乔·卡巴金博士改良为正念减压疗法（MBSR），已被现代医学证实对减压、焦虑、失眠等有显著效果。",
    classicSource: "乔·卡巴金《正念疗愈力》《多灾多难的时期，正念带你走出忧郁》",
    classicText: "正念是有意识地、不加评判地关注当下。——乔·卡巴金",
    hotTag: "科学验证",
    steps: [
      { title: "第一步：身体扫描", essentials: "仰卧或坐姿，从脚趾开始，逐一感受身体各部位的感觉。", effect: "放松身体，培养身体觉察力。" },
      { title: "第二步：呼吸觉察", essentials: "自然呼吸，将注意力集中在呼吸的进出上。走神时温和拉回。", effect: "训练专注力，减轻焦虑。" },
      { title: "第三步：开放觉察", essentials: "不聚焦特定对象，觉察当下所有体验（声音、感觉、想法）。", effect: "培养不评判的态度，提升觉知力。" },
      { title: "第四步：慈心冥想", essentials: "在心中默念祝福语：愿我快乐，愿我平安，愿我健康。", effect: "培养慈悲心，改善人际关系。" },
    ],
    videos: [
      { title: "正念冥想引导（10分钟入门）", platform: "B站", url: "https://www.bilibili.com/video/BV1GJ411x7hM", duration: "10:00" },
      { title: "MBSR正念减压完整课程", platform: "B站", url: "https://www.bilibili.com/video/BV1Hb411W7Yy", duration: "45:00" },
    ],
  },
  {
    id: "hata_yoga",
    name: "哈他瑜伽",
    alias: "Hatha Yoga",
    inheritor: "斯瓦特玛拉摩",
    era: "中世纪",
    category: "yuja",
    difficulty: "初级",
    intro: "哈他瑜伽是所有现代瑜伽的基础，通过体式（Asana）、呼吸法（Pranayama）和放松术，达到身心平衡。适合初学者入门。",
    classicSource: "《哈他瑜伽之光》（Hatha Yoga Pradipika）由斯瓦特玛拉摩所著。",
    classicText: "体式带来稳定、健康和肢体的轻盈。——《哈他瑜伽之光》",
    hotTag: "瑜伽入门",
    steps: [
      { title: "山式（Tadasana）", essentials: "双脚并拢站立，脊柱挺直，双臂自然下垂，均匀呼吸。", effect: "改善体态，增强身体觉察。" },
      { title: "下犬式（Adho Mukha Svanasana）", essentials: "双手双脚着地，臀部上抬，身体呈倒V形。", effect: "拉伸全身，增强手臂和腿部力量。" },
      { title: "战士一式（Virabhadrasana I）", essentials: "前腿弓步，后腿伸直，双臂上举。", effect: "增强腿部力量，开阔胸腔。" },
      { title: "树式（Vrksasana）", essentials: "单脚站立，另一脚置于大腿内侧，双手合十。", effect: "提升平衡力和专注力。" },
      { title: "摊尸式（Savasana）", essentials: "仰卧放松，全身松弛，自然呼吸。", effect: "深度放松，整合练习效果。" },
    ],
    videos: [
      { title: "哈他瑜伽入门完整课程", platform: "B站", url: "https://www.bilibili.com/video/BV1nx411y7kL", duration: "30:00" },
    ],
  },
  {
    id: "taiji_zhan",
    name: "太极桩",
    alias: "太极站桩",
    inheritor: "太极拳传承",
    era: "明清",
    category: "zhanzhuang",
    difficulty: "初级",
    intro: "太极桩是太极拳的基本功法，通过静站培养内劲，为太极拳套路打下基础。强调虚领顶劲、含胸拔背、松腰敛臀。",
    classicSource: "王宗岳《太极拳论》",
    classicText: "虚领顶劲，气沉丹田。不偏不倚，忽隐忽现。——《太极拳论》",
    hotTag: "太极根基",
    steps: [
      { title: "无极桩", essentials: "双脚平行与肩同宽，双手自然下垂，全身放松入静。", effect: "培本固元，入静养气。" },
      { title: "太极桩", essentials: "双手抱球于胸前，膝盖微屈，含胸拔背。", effect: "培养太极内劲，建立整体力。" },
      { title: "开合桩", essentials: "双手开合配合呼吸，开时吸气，合时呼气。", effect: "训练呼吸与动作配合。" },
    ],
    videos: [
      { title: "太极桩功教学", platform: "B站", url: "https://www.bilibili.com/video/BV1mW41137xp", duration: "15:00" },
    ],
  },
  {
    id: "zhenqi_yunxing",
    name: "真气运行法",
    alias: "真气运行静功",
    inheritor: "李少波",
    era: "近代",
    category: "neidan",
    difficulty: "中级",
    intro: "真气运行法由甘肃中医李少波所创，以内丹术为基础，通过五步功法疏通任督二脉，培养真气运行。",
    classicSource: "李少波《真气运行法》",
    classicText: "真气者，经气也。经脉者，所以决死生，处百病，调虚实，不可不通。——《黄帝内经》",
    hotTag: "内丹静功",
    steps: [
      { title: "第一步：呼气注意心窝部", essentials: "坐姿放松，呼气时意念集中在心窝部。每日练习20分钟。", effect: "心窝部产生温热感，为气沉丹田打基础。" },
      { title: "第二步：气沉丹田", essentials: "呼气时意念随气下行至下丹田。每日练习30分钟。", effect: "丹田产生气感，真气开始聚集。" },
      { title: "第三步：调息凝神守丹田", essentials: "意守丹田，自然呼吸，不再刻意关注呼气。", effect: "丹田气足，开始充实。" },
      { title: "第四步：通督不忘丹田", essentials: "真气沿督脉上行，通过背部到达头顶。", effect: "疏通督脉，真气上冲头顶。" },
      { title: "第五步：通任督，气归丹田", essentials: "真气沿任脉下行，完成小周天循环。", effect: "任督二脉通畅，真气循环运行。" },
    ],
    videos: [
      { title: "真气运行法五步功法教学", platform: "B站", url: "https://www.bilibili.com/video/BV1Hb411W7Qq", duration: "25:00" },
    ],
  },
  {
    id: "ertongao_anmo",
    name: "天竺国按摩法",
    alias: "天竺按摩法",
    inheritor: "孙思邈传承",
    era: "唐代",
    category: "daoyin",
    difficulty: "初级",
    intro: "天竺国按摩法记载于孙思邈《备急千金要方》，是一套古老的导引按摩方法，通过自我按摩全身来疏通经络。",
    classicSource: "孙思邈《备急千金要方·养性》",
    classicText: "天竺国按摩，此是婆罗门法。日能依此三遍，一月后百病除。——《备急千金要方》",
    hotTag: "古法按摩",
    steps: [
      { title: "第一步：摩面", essentials: "双手搓热，从下颌向上按摩面部至头顶。", effect: "润面养颜，清醒头脑。" },
      { title: "第二步：摩腹", essentials: "双手叠放于腹部，顺时针方向按摩。", effect: "健脾和胃，促进消化。" },
      { title: "第三步：摩腰", essentials: "双手搓热后按于腰部，上下搓摩。", effect: "温补肾阳，强腰固肾。" },
      { title: "第四步：摩足", essentials: "单脚盘于对侧腿上，按摩足底涌泉穴。", effect: "引火归元，滋阴降火。" },
    ],
    videos: [
      { title: "天竺国按摩法演示", platform: "B站", url: "https://www.bilibili.com/video/BV1Yb411W7Hi", duration: "08:00" },
    ],
  },
];

export const YANGSHENG_DISCLAIMER =
  "⚠️ 本内容为传统文化养生功法记载，仅供学习研究参考。功法练习存在一定风险，请在专业老师指导下进行。身体有疾病请及时前往正规医疗机构就诊，切勿因练习功法延误治疗。";

/**
 * 搜索功法
 */
export function searchGongfa(query: string): GongfaDetail[] {
  if (!query.trim()) return GONGFA_LIST;
  const q = query.toLowerCase();
  return GONGFA_LIST.filter(
    (g) =>
      g.name.toLowerCase().includes(q) ||
      g.alias?.toLowerCase().includes(q) ||
      g.inheritor.toLowerCase().includes(q) ||
      g.intro.toLowerCase().includes(q)
  );
}

/**
 * 按分类获取功法
 */
export function getGongfaByCategory(category: string): GongfaDetail[] {
  if (category === "all") return GONGFA_LIST;
  return GONGFA_LIST.filter((g) => g.category === category);
}

/**
 * 获取功法详情
 */
export function getGongfaById(id: string): GongfaDetail | undefined {
  return GONGFA_LIST.find((g) => g.id === id);
}
