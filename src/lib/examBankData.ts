/**
 * ============================================================================
 * 国学学习平台 - 考试题库数据库
 * ============================================================================
 *
 * 包含易学（易经/周易）与中医两大题库，各设初、中、高三个难度等级。
 * 全部题目对所有用户免费开放，无会员限制。
 *
 * 合规说明：本题库仅供传统文化学习研究使用，所有内容均为学术知识考查，
 * 不涉及任何医疗建议、诊断或处方指导。中医类题目以典籍知识为主。
 *
 * 创建日期：2026-08-11
 * ============================================================================
 */

// ============================================================================
// 类型定义
// ============================================================================

export interface ExamQuestion {
  id: string;
  category: 'yixue' | 'zhongyi';
  difficulty: 'basic' | 'intermediate' | 'advanced';
  question: string;
  options: string[];
  correctAnswer: number; // 正确答案的索引
  explanation: string;
  source?: string; // 出处
}

// ============================================================================
// 易学（易经/周易）题库
// ============================================================================

// ---- 易学·初级（30题） ----
const YIXUE_BASIC: ExamQuestion[] = [
  { id: 'yx_b001', category: 'yixue', difficulty: 'basic', question: '《周易》的"周"字，传统上有哪两种主要解释？', options: ['周朝、周普', '周全、周密', '周期、周转', '周密、周延'], correctAnswer: 0, explanation: '传统认为"周"一指周代（朝代名），二指周普（普遍、无所不包之意），出自郑玄《易论》。', source: '《周易正义》' },
  { id: 'yx_b002', category: 'yixue', difficulty: 'basic', question: '"易"字的三层含义是什么？', options: ['简易、变易、不易', '容易、交易、不易', '简易、变易、交易', '变易、不易、容易'], correctAnswer: 0, explanation: '郑玄在《易赞》中提出"易"含三义：简易（简明易知）、变易（变化不息）、不易（变中之常）。', source: '《易赞》' },
  { id: 'yx_b003', category: 'yixue', difficulty: 'basic', question: '《周易》一书由哪两部分组成？', options: ['经与传', '上经与下经', '彖与象', '文言与系辞'], correctAnswer: 0, explanation: '《周易》分为"经"（六十四卦卦辞、爻辞）和"传"（解释经文的十翼）两大部分。', source: '《周易》' },
  { id: 'yx_b004', category: 'yixue', difficulty: 'basic', question: '太极生两仪，"两仪"指的是什么？', options: ['天与地', '阴与阳', '水与火', '日与月'], correctAnswer: 1, explanation: '《系辞传》曰"易有太极，是生两仪"，两仪即阴阳，是宇宙万物生成的最基本对立统一力量。', source: '《周易·系辞传》' },
  { id: 'yx_b005', category: 'yixue', difficulty: 'basic', question: '两仪生四象，"四象"指的是什么？', options: ['春夏秋冬', '东南西北', '太阳、少阴、少阳、太阴', '青龙、白虎、朱雀、玄武'], correctAnswer: 2, explanation: '四象是阴阳进一步分化：太阳（老阳）、少阴、少阳、太阴（老阴），代表阴阳的四种组合状态。', source: '《周易·系辞传》' },
  { id: 'yx_b006', category: 'yixue', difficulty: 'basic', question: '八卦共有几卦？每卦由几爻组成？', options: ['六十四卦，六爻', '八卦，三爻', '八卦，六爻', '六十四卦，三爻'], correctAnswer: 1, explanation: '八卦即经卦，每卦三爻；两卦相重为六十四卦（别卦），每卦六爻。', source: '《周易》' },
  { id: 'yx_b007', category: 'yixue', difficulty: 'basic', question: '下列哪一组是正确的先天八卦方位？', options: ['乾南坤北，离东坎西', '乾北坤南，离西坎东', '震东兑西，乾南坤北', '巽东南坤西南'], correctAnswer: 0, explanation: '先天八卦（伏羲八卦）方位：乾南、坤北、离东、坎西、震东北、巽西南、艮西北、兑东南。', source: '《周易本义》' },
  { id: 'yx_b008', category: 'yixue', difficulty: 'basic', question: '后天八卦（文王八卦）中，离卦居于何方？', options: ['东方', '南方', '西方', '北方'], correctAnswer: 1, explanation: '后天八卦方位：震东、巽东南、离南、坤西南、兑正西、乾西北、坎正北、艮东北。离属火，居南方。', source: '《周易·说卦传》' },
  { id: 'yx_b009', category: 'yixue', difficulty: 'basic', question: '乾卦的卦象是什么？', options: ['地', '天', '水', '火'], correctAnswer: 1, explanation: '乾卦三爻皆阳，卦象为天，象征刚健中正、自强不息。', source: '《周易·说卦传》' },
  { id: 'yx_b010', category: 'yixue', difficulty: 'basic', question: '坤卦的卦德是什么？', options: ['健', '顺', '动', '入'], correctAnswer: 1, explanation: '乾健坤顺，坤卦卦象为地，卦德为顺，象征柔顺承载、厚德载物。', source: '《周易·说卦传》' },
  { id: 'yx_b011', category: 'yixue', difficulty: 'basic', question: '五行相生的顺序是？', options: ['金生水、水生木、木生火、火生土、土生金', '金克木、木克土、土克水、水克火、火克金', '金生木、木生水、水生火、火生土、土生金', '木生火、火生土、土生金、金生水、水生木'], correctAnswer: 0, explanation: '五行相生：金生水，水生木，木生火，火生土，土生金，循环不息。', source: '《尚书·洪范》' },
  { id: 'yx_b012', category: 'yixue', difficulty: 'basic', question: '五行相克的顺序是？', options: ['金克木、木克土、土克水、水克火、火克金', '金生水、水生木、木生火、火生土、土生金', '金克木、木克火、火克土、土克水、水克金', '木克金、金克火、火克水、水克土、土克木'], correctAnswer: 0, explanation: '五行相克：金克木，木克土，土克水，水克火，火克金，循环制约。', source: '《尚书·洪范》' },
  { id: 'yx_b013', category: 'yixue', difficulty: 'basic', question: '天干共有几个？', options: ['八个', '十个', '十二个', '十六个'], correctAnswer: 1, explanation: '十天干：甲、乙、丙、丁、戊、己、庚、辛、壬、癸。', source: '《史记·律书》' },
  { id: 'yx_b014', category: 'yixue', difficulty: 'basic', question: '地支共有几个？', options: ['八个', '十个', '十二个', '十六个'], correctAnswer: 2, explanation: '十二地支：子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥。', source: '《史记·律书》' },
  { id: 'yx_b015', category: 'yixue', difficulty: 'basic', question: '六十甲子是由什么组合而成的？', options: ['天干与天干', '地支与地支', '天干与地支', '八卦与八卦'], correctAnswer: 2, explanation: '十天干与十二地支按顺序配对，最小公倍数为60，形成六十甲子循环。', source: '《史记·历书》' },
  { id: 'yx_b016', category: 'yixue', difficulty: 'basic', question: '《周易》六十四卦的每一卦由几爻组成？', options: ['三爻', '四爻', '五爻', '六爻'], correctAnswer: 3, explanation: '六十四卦（别卦）由两个经卦相重而成，每卦六爻，自下而上分别为初、二、三、四、五、上。', source: '《周易》' },
  { id: 'yx_b017', category: 'yixue', difficulty: 'basic', question: '爻的两种基本类型是什么？', options: ['阴爻和阳爻', '动爻和静爻', '本爻和变爻', '吉爻和凶爻'], correctAnswer: 0, explanation: '爻分阴阳：阳爻为"—"（实线），阴爻为"--"（虚线），是构成八卦和六十四卦的基本符号。', source: '《周易》' },
  { id: 'yx_b018', category: 'yixue', difficulty: 'basic', question: '乾卦的六爻皆为什么？', options: ['阴爻', '阳爻', '动静各半', '前三阴后三阳'], correctAnswer: 1, explanation: '乾卦六爻皆阳，纯阳之卦，象征纯刚至健。', source: '《周易·乾卦》' },
  { id: 'yx_b019', category: 'yixue', difficulty: 'basic', question: '坤卦的六爻皆为什么？', options: ['阴爻', '阳爻', '动静各半', '前三阳后三阴'], correctAnswer: 0, explanation: '坤卦六爻皆阴，纯阴之卦，象征纯柔至顺。', source: '《周易·坤卦》' },
  { id: 'yx_b020', category: 'yixue', difficulty: 'basic', question: '"元亨利贞"是哪一卦的卦辞？', options: ['坤卦', '乾卦', '泰卦', '否卦'], correctAnswer: 1, explanation: '"乾：元亨利贞"是乾卦的卦辞，元为始，亨为通，利为宜，贞为正，为乾卦四德。', source: '《周易·乾卦》' },
  { id: 'yx_b021', category: 'yixue', difficulty: 'basic', question: '"天行健，君子以自强不息"出自哪里？', options: ['《论语》', '《周易·乾卦·大象传》', '《道德经》', '《中庸》'], correctAnswer: 1, explanation: '此句出自《周易·乾卦·象传》，意为天道运行刚健不息，君子应当效法天道，自强不息。', source: '《周易·乾卦·大象传》' },
  { id: 'yx_b022', category: 'yixue', difficulty: 'basic', question: '"地势坤，君子以厚德载物"出自哪里？', options: ['《道德经》', '《论语》', '《周易·坤卦·大象传》', '《大学》'], correctAnswer: 2, explanation: '此句出自《周易·坤卦·象传》，意为大地气势柔顺，君子应当效法大地，以深厚德行承载万物。', source: '《周易·坤卦·大象传》' },
  { id: 'yx_b023', category: 'yixue', difficulty: 'basic', question: '《周易》的"十翼"又称为什么？', options: ['十卦', '十传', '十翼', '十经'], correctAnswer: 2, explanation: '"十翼"即《易传》十篇，包括彖上下、象上下、系辞上下、文言、说卦、序卦、杂卦，如经之羽翼。', source: '《周易正义》' },
  { id: 'yx_b024', category: 'yixue', difficulty: 'basic', question: '下列哪篇不属于《易传》十翼？', options: ['彖传', '象传', '爻传', '说卦传'], correctAnswer: 2, explanation: '十翼为彖上下、象上下、文言、系辞上下、说卦、序卦、杂卦，无"爻传"之名。爻辞解释在彖、象中。', source: '《周易正义》' },
  { id: 'yx_b025', category: 'yixue', difficulty: 'basic', question: '六十四卦中，泰卦的卦象是什么？', options: ['天在上地在下', '地在上天在下', '水在上火在下', '火在上水在下'], correctAnswer: 1, explanation: '泰卦是坤上乾下（地天泰），地在上天在下，天气下降地气上升，天地交而万物通，故为泰。', source: '《周易·泰卦》' },
  { id: 'yx_b026', category: 'yixue', difficulty: 'basic', question: '六十四卦中，否卦的卦象是什么？', options: ['天在上地在下', '地在上天在下', '山在上泽在下', '风在上雷在下'], correctAnswer: 0, explanation: '否卦是乾上坤下（天地否），天在上地在下，天气上升地气下降，天地不交，故为否（闭塞）。', source: '《周易·否卦》' },
  { id: 'yx_b027', category: 'yixue', difficulty: 'basic', question: '震卦的自然象征是什么？', options: ['风', '雷', '水', '山'], correctAnswer: 1, explanation: '震卦卦象为雷，象征震动、奋起、长子。在自然界代表雷电。', source: '《周易·说卦传》' },
  { id: 'yx_b028', category: 'yixue', difficulty: 'basic', question: '巽卦的自然象征是什么？', options: ['风', '雷', '水', '山'], correctAnswer: 0, explanation: '巽卦卦象为风，象征逊顺、无孔不入。在自然界代表风。', source: '《周易·说卦传》' },
  { id: 'yx_b029', category: 'yixue', difficulty: 'basic', question: '坎卦的自然象征是什么？', options: ['火', '水', '泽', '山'], correctAnswer: 1, explanation: '坎卦卦象为水，象征险陷、流动。在自然界代表水，卦德为险。', source: '《周易·说卦传》' },
  { id: 'yx_b030', category: 'yixue', difficulty: 'basic', question: '离卦的自然象征是什么？', options: ['火', '水', '风', '雷'], correctAnswer: 0, explanation: '离卦卦象为火，象征光明、附丽。在自然界代表火，卦德为明。', source: '《周易·说卦传》' },
];

// ---- 易学·中级（35题） ----
const YIXUE_INTERMEDIATE: ExamQuestion[] = [
  { id: 'yx_i001', category: 'yixue', difficulty: 'intermediate', question: '《周易》六十四卦的排列顺序，传统上称为？', options: ['先天卦序', '后天卦序', '周易卦序', '连山卦序'], correctAnswer: 2, explanation: '通行本《周易》六十四卦的排列顺序始于乾坤、终于既济未济，称为周易卦序或文王卦序。', source: '《周易·序卦传》' },
  { id: 'yx_i002', category: 'yixue', difficulty: 'intermediate', question: '"彖传"主要解释什么？', options: ['爻辞的含义', '卦辞的含义', '卦象的含义', '卦序的含义'], correctAnswer: 1, explanation: '彖传主要解释卦辞，统论一卦之义，包括卦名、卦义和卦辞。', source: '《周易·彖传》' },
  { id: 'yx_i003', category: 'yixue', difficulty: 'intermediate', question: '"大象传"和"小象传"分别解释什么？', options: ['大象释卦象，小象释爻象', '大象释卦辞，小象释爻辞', '大象释上卦，小象释下卦', '大象释彖，小象释象'], correctAnswer: 0, explanation: '大象传取上下八卦之象来阐发全卦之义，小象传解释每一爻的爻象和爻辞含义。', source: '《周易·象传》' },
  { id: 'yx_i004', category: 'yixue', difficulty: 'intermediate', question: '《文言传》专门解释哪两卦？', options: ['乾坤二卦', '坎离二卦', '泰否二卦', '震巽二卦'], correctAnswer: 0, explanation: '《文言传》专释乾坤二卦的卦辞和爻辞，乾文言、坤文言各一篇，因乾坤为诸卦之祖故特加文饰。', source: '《周易·文言传》' },
  { id: 'yx_i005', category: 'yixue', difficulty: 'intermediate', question: '"系辞传"在《易传》中的地位如何？', options: ['解释个别卦象', '通论《周易》原理', '解释卦序', '解释八卦取象'], correctAnswer: 1, explanation: '系辞传是通论《周易》全书基本原理的通论性著作，包含太极、两仪、四象、八卦等宇宙生成论。', source: '《周易·系辞传》' },
  { id: 'yx_i006', category: 'yixue', difficulty: 'intermediate', question: '"易有太极，是生两仪"出自哪里？', options: ['《说卦传》', '《系辞传》', '《文言传》', '《序卦传》'], correctAnswer: 1, explanation: '此句出自《系辞传上》第十一章，是《周易》宇宙生成论的经典表述。', source: '《周易·系辞传上》' },
  { id: 'yx_i007', category: 'yixue', difficulty: 'intermediate', question: '六爻的位置从下到上依次称为什么？', options: ['初二三四五上', '一二三四五六', '下中上三爻', '甲乙丙丁戊己'], correctAnswer: 0, explanation: '六爻自下而上依次为：初爻、二爻、三爻、四爻、五爻、上爻。', source: '《周易》' },
  { id: 'yx_i008', category: 'yixue', difficulty: 'intermediate', question: '六爻中，哪两个位置为"天位"？', options: ['初、二', '三、四', '五、上', '二、五'], correctAnswer: 2, explanation: '初二为地位，三四为人位，五上为天位，此为三才之道在六爻中的体现。', source: '《周易·说卦传》' },
  { id: 'yx_i009', category: 'yixue', difficulty: 'intermediate', question: '六爻中，"得中"（居中位）指的是哪两个爻？', options: ['初与上', '二与五', '三与四', '初与三'], correctAnswer: 1, explanation: '二爻居下卦之中，五爻居上卦之中，二、五为"中位"，得中者多吉。', source: '《周易》' },
  { id: 'yx_i010', category: 'yixue', difficulty: 'intermediate', question: '阳爻居阳位（一三五）称为什么？', options: ['得位（正）', '失位（不正）', '得中', '失中'], correctAnswer: 0, explanation: '阳爻居初、三、五（阳位），阴爻居二、四、上（阴位），称为"得位"或"当位"，反之"失位"。', source: '《周易》' },
  { id: 'yx_i011', category: 'yixue', difficulty: 'intermediate', question: '"承"与"乘"在爻位关系中的含义是？', options: ['承为下对上，乘为上对下', '承为上对下，乘为下对上', '均为相邻爻的关系', '承为远应，乘为近比'], correctAnswer: 0, explanation: '下爻对上爻为"承"（承托），上爻对下爻为"乘"（乘凌）。阳乘阴为顺，阴乘阳为逆。', source: '《周易》' },
  { id: 'yx_i012', category: 'yixue', difficulty: 'intermediate', question: '"应"在爻位关系中指什么？', options: ['初与四应、二与五应、三与上应', '初与二应、三与四应', '初与三应、四与上应', '相邻两爻为应'], correctAnswer: 0, explanation: '六爻中初与四、二与五、三与上为对应关系，一阴一阳为"有应"，同阴同阳为"无应"。', source: '《周易》' },
  { id: 'yx_i013', category: 'yixue', difficulty: 'intermediate', question: '十二消息卦中，代表阳气最盛的是哪一卦？', options: ['乾卦', '泰卦', '大壮卦', '夬卦'], correctAnswer: 0, explanation: '十二消息卦中，乾卦（四月）六爻皆阳，阳气最盛；坤卦（十月）六爻皆阴，阴气最盛。', source: '《周易》' },
  { id: 'yx_i014', category: 'yixue', difficulty: 'intermediate', question: '十二消息卦的推演反映了什么规律？', options: ['阴阳消长的周期规律', '五行相生规律', '天干地支循环', '河图洛书之数'], correctAnswer: 0, explanation: '十二消息卦从复到乾（阳息阴消）、从姤到坤（阴息阳消），反映阴阳消长的自然周期规律。', source: '《周易》' },
  { id: 'yx_i015', category: 'yixue', difficulty: 'intermediate', question: '先天八卦数（乾一兑二离三震四巽五坎六艮七坤八）出自哪位易学家？', options: ['孔子', '邵雍', '朱熹', '周敦颐'], correctAnswer: 1, explanation: '先天八卦数由北宋邵雍（康节）提出，载于《皇极经世》，后被朱熹收入《周易本义》。', source: '《皇极经世》' },
  { id: 'yx_i016', category: 'yixue', difficulty: 'intermediate', question: '后天八卦数（坎一坤二震三巽四中五乾六兑七艮八离九）出自哪里？', options: ['《周易本义》', '《说卦传》', '《洛书》', '《河图》'], correctAnswer: 1, explanation: '后天八卦方位载于《说卦传》，后天数与洛书数对应，广泛应用于风水、奇门等术数。', source: '《周易·说卦传》' },
  { id: 'yx_i017', category: 'yixue', difficulty: 'intermediate', question: '河图中的白点代表什么？黑点代表什么？', options: ['白点为阳为天数，黑点为阴为地数', '白点为地数，黑点为天数', '白点为生数，黑点为成数', '无区别'], correctAnswer: 0, explanation: '河图中白点为阳，代表天数（一三五七九）；黑点为阴，代表地数（二四六八十）。', source: '《周易·系辞传》' },
  { id: 'yx_i018', category: 'yixue', difficulty: 'intermediate', question: '洛书的结构特征是？', options: ['五行相生排列', '九宫纵横皆十五', '天十地十二', '阴阳鱼图'], correctAnswer: 1, explanation: '洛书为三阶幻方，戴九履一、左三右七、二四为肩、六八为足、五居中央，纵、横、斜三数之和皆为十五。', source: '《周易》' },
  { id: 'yx_i019', category: 'yixue', difficulty: 'intermediate', question: '乾卦初九爻辞"潜龙勿用"的含义是？', options: ['龙潜于深渊，宜静待时机', '龙已腾飞，不可阻挡', '龙跃于渊，可进可退', '龙飞在天，利于大人'], correctAnswer: 0, explanation: '初九阳居最下位，如龙潜于渊，阳气微弱宜隐忍蓄势，不可妄动，故曰"潜龙勿用"。', source: '《周易·乾卦》' },
  { id: 'yx_i020', category: 'yixue', difficulty: 'intermediate', question: '乾卦九五爻辞"飞龙在天，利见大人"的象征意义是？', options: ['阳气微弱，宜静待', '阳气盛极，大人得位', '阳极将变，宜守', '阴气上升，宜退'], correctAnswer: 1, explanation: '九五为天子之位，阳刚中正，如龙飞于天，得位得中，象征圣人居天子之位而治理天下。', source: '《周易·乾卦》' },
  { id: 'yx_i021', category: 'yixue', difficulty: 'intermediate', question: '乾卦上九爻辞"亢龙有悔"说明了什么道理？', options: ['阳气初生，宜蓄势', '物极必反，盛极则衰', '刚健中正，无往不利', '柔顺承天，大吉'], correctAnswer: 1, explanation: '上九居乾卦之极，阳气过盛而不知退，故有悔。说明"物极必反"的道理，盛极当知退。', source: '《周易·乾卦》' },
  { id: 'yx_i022', category: 'yixue', difficulty: 'intermediate', question: '坤卦六四爻辞"括囊，无咎无誉"的含义是？', options: ['张开口袋，有得有失', '扎紧口袋，谨慎自守则无咎', '打开口袋，广纳万物', '翻转口袋，颠倒得失'], correctAnswer: 1, explanation: '六四居上卦之下，当谨慎自守，如扎紧口袋不露锋芒，虽无美誉亦无咎害，为明哲保身之道。', source: '《周易·坤卦》' },
  { id: 'yx_i023', category: 'yixue', difficulty: 'intermediate', question: '"用九，见群龙无首，吉"出现在哪一卦？', options: ['乾卦', '坤卦', '泰卦', '既济卦'], correctAnswer: 0, explanation: '"用九"为乾卦特有的爻题，意为六爻皆变（阳变阴），群龙皆现而不为首，各尽其力，故吉。', source: '《周易·乾卦》' },
  { id: 'yx_i024', category: 'yixue', difficulty: 'intermediate', question: '"用六，利永贞"出现在哪一卦？', options: ['乾卦', '坤卦', '泰卦', '未济卦'], correctAnswer: 1, explanation: '"用六"为坤卦特有的爻题，意为六爻皆变（阴变阳），利于永久保持正道，柔变而归于正。', source: '《周易·坤卦》' },
  { id: 'yx_i025', category: 'yixue', difficulty: 'intermediate', question: '在纳甲筮法中，乾卦纳什么天干？', options: ['甲壬', '乙癸', '丙戊', '丁己'], correctAnswer: 0, explanation: '纳甲法中乾纳甲壬（内甲外壬），坤纳乙癸，震纳庚，巽纳辛，坎纳戊，离纳己，艮纳丙，兑纳丁。', source: '《京房易传》' },
  { id: 'yx_i026', category: 'yixue', difficulty: 'intermediate', question: '六爻占法中，"世爻"和"应爻"的关系是？', options: ['世应在同一卦', '世应隔两爻，世在初应在四', '世应在相邻爻', '世应在同一爻'], correctAnswer: 1, explanation: '世爻与应爻相隔两位：世在初则应在四，世在二则应在五，世在三则应在上，反之亦然，代表主与客。', source: '《京房易传》' },
  { id: 'yx_i027', category: 'yixue', difficulty: 'intermediate', question: '梅花易数的主要起卦方法有哪些？', options: ['时间起卦、数字起卦、方位起卦', '蓍草起卦、铜钱起卦', '抽签起卦、掷骰起卦', '观象起卦、望气起卦'], correctAnswer: 0, explanation: '梅花易数（邵雍）以时间、数字、方位、声音、文字等均可起卦，简便灵活，核心在"心易"。', source: '《梅花易数》' },
  { id: 'yx_i028', category: 'yixue', difficulty: 'intermediate', question: '梅花易数中的"体"与"用"是什么关系？', options: ['体为主，用为客，用生体则吉', '用为主，体为客', '体用相同', '体用无关'], correctAnswer: 0, explanation: '梅花易数以不动爻所在卦为"体"（主体），动爻所在卦为"用"（客体），用生体、体克用为吉，用克体、体生用为凶。', source: '《梅花易数》' },
  { id: 'yx_i029', category: 'yixue', difficulty: 'intermediate', question: '《周易》"三才"之道是指什么？', options: ['天、地、人', '日、月、星', '风、水、火', '君、臣、民'], correctAnswer: 0, explanation: '三才指天、地、人，六爻中初二为地、三四为人、五上为天，体现天地人三才统一的思想。', source: '《周易·系辞传》' },
  { id: 'yx_i030', category: 'yixue', difficulty: 'intermediate', question: '先天八卦的排列原则是什么？', options: ['阴阳对待（对立统一）', '五行相生', '四时流转', '方位配属'], correctAnswer: 0, explanation: '先天八卦以阴阳对待为原则：乾坤定位、坎离相交、震巽相对、艮兑相配，体现宇宙对称统一。', source: '《周易本义》' },
  { id: 'yx_i031', category: 'yixue', difficulty: 'intermediate', question: '后天八卦的排列原则是什么？', options: ['阴阳对待', '五行相生顺序与四时方位配合', '河图之数', '洛书之数'], correctAnswer: 1, explanation: '后天八卦按五行相生与四时方位排列：震（木·春·东）→巽→离（火·夏·南）→坤→兑（金·秋·西）→乾→坎（水·冬·北）→艮。', source: '《周易·说卦传》' },
  { id: 'yx_i032', category: 'yixue', difficulty: 'intermediate', question: '"一阴一阳之谓道"出自哪里？', options: ['《道德经》', '《周易·系辞传》', '《论语》', '《中庸》'], correctAnswer: 1, explanation: '此句出自《系辞传上》第五章，是《周易》核心哲学命题，阴阳交替变化即为道。', source: '《周易·系辞传上》' },
  { id: 'yx_i033', category: 'yixue', difficulty: 'intermediate', question: '"形而上者谓之道，形而下者谓之器"出自哪里？', options: ['《道德经》', '《周易·系辞传》', '《论语》', '《孟子》'], correctAnswer: 1, explanation: '此句出自《系辞传上》第十二章，区分了形而上的"道"（抽象原理）与形而下的"器"（具体事物）。', source: '《周易·系辞传上》' },
  { id: 'yx_i034', category: 'yixue', difficulty: 'intermediate', question: '"生生之谓易"的含义是？', options: ['易是生命哲学', '生生不息、变化不止即为易', '易卦有生命', '易是生物之理'], correctAnswer: 1, explanation: '此句出自《系辞传》，意为天地万物生生不息、变化无穷，这种永恒的生命力与变化性即为"易"的本质。', source: '《周易·系辞传》' },
  { id: 'yx_i035', category: 'yixue', difficulty: 'intermediate', question: '《周易》"穷则变，变则通，通则久"说明了什么道理？', options: ['穷困则失败', '事物发展到极限则需变革，变革则通达，通达则长久', '变则不通', '穷则不变'], correctAnswer: 1, explanation: '此句出自《系辞传下》，说明事物发展到极点（穷）时必须变革（变），变革后才能通达（通），通达才能长久（久），体现了辩证发展观。', source: '《周易·系辞传下》' },
];

// ---- 易学·高级（35题） ----
const YIXUE_ADVANCED: ExamQuestion[] = [
  { id: 'yx_a001', category: 'yixue', difficulty: 'advanced', question: '《易传》中"保合大和，乃利贞"体现了什么样的哲学思想？', options: ['斗争哲学', '和谐中庸哲学', '无为哲学', '功利哲学'], correctAnswer: 1, explanation: '此句出自乾卦彖传，"保合大和"即保持和谐至极的状态，体现了儒家追求中庸和谐、阴阳调和中正的哲学理念。', source: '《周易·乾卦·彖传》' },
  { id: 'yx_a002', category: 'yixue', difficulty: 'advanced', question: '王弼《周易注》的核心方法论是什么？', options: ['象数推演', '得意忘象', '纳甲爻辰', '飞伏互变'], correctAnswer: 1, explanation: '王弼主张"得意在忘象"，以义理释易，反对繁琐的象数推演，开创了魏晋玄学义理易学一派。', source: '《周易注》' },
  { id: 'yx_a003', category: 'yixue', difficulty: 'advanced', question: '汉易"卦气说"将六十四卦与什么对应？', options: ['五行方位', '一年二十四节气七十二候', '天干地支', '河图洛书'], correctAnswer: 1, explanation: '孟喜、京房的卦气说将六十四卦与一年二十四节气七十二候相对应，以十二消息卦配十二月，反映天文历法与易学结合。', source: '《京房易传》' },
  { id: 'yx_a004', category: 'yixue', difficulty: 'advanced', question: '汉代"飞伏"说的含义是什么？', options: ['卦爻的运动方向', '可见卦象中隐藏的对立卦象', '天干地支的飞动', '爻的升降变化'], correctAnswer: 1, explanation: '飞伏说为京房所创，"飞"指显现的卦象，"伏"指隐藏的对应卦象，如乾飞则坤伏，揭示卦象背后的对立统一关系。', source: '《京房易传》' },
  { id: 'yx_a005', category: 'yixue', difficulty: 'advanced', question: '《周易》"互卦"（互体）的取法是？', options: ['取二三四爻为下互，三四五爻为上互', '取初上二爻为互', '取全卦六爻', '取动爻为互'], correctAnswer: 0, explanation: '互卦取法：以二三四爻组成下互卦，三四五爻组成上互卦，合成一个新卦，用于揭示卦中隐含之象。', source: '《周易》' },
  { id: 'yx_a006', category: 'yixue', difficulty: 'advanced', question: '朱熹在《周易本义》中对《周易》性质的基本判断是？', options: ['哲学著作', '占筮之书', '历史著作', '文学著作'], correctAnswer: 1, explanation: '朱熹认为《周易》本为卜筮之书，主张还原其原始占筮功能，但通过占筮可明天理，故有哲学意义。', source: '《周易本义》' },
  { id: 'yx_a007', category: 'yixue', difficulty: 'advanced', question: '程颐《伊川易传》的释易特点是什么？', options: ['重象数推演', '以儒家义理释易', '以道家思想释易', '以佛学释易'], correctAnswer: 1, explanation: '程颐以儒家义理（天理、人性、治道）为核心释易，将《周易》作为明理之书，影响宋代义理易学深远。', source: '《伊川易传》' },
  { id: 'yx_a008', category: 'yixue', difficulty: 'advanced', question: '周敦颐《太极图说》的宇宙生成模式是？', options: ['太极→阴阳→五行→万物', '无极→太极→阴阳→五行→男女→万物', '道→气→形', '理→气→物'], correctAnswer: 1, explanation: '周敦颐提出"无极而太极"→阴阳→五行→四时→乾男坤女→化生万物的宇宙生成图式，融合儒道思想。', source: '《太极图说》' },
  { id: 'yx_a009', category: 'yixue', difficulty: 'advanced', question: '邵雍"先天学"的核心概念是什么？', options: ['心为太极', '气为太极', '理为太极', '数为太极'], correctAnswer: 0, explanation: '邵雍以"心"为太极，认为先天之学乃心法，万物皆生于心，推演先天六十四卦方圆图。', source: '《皇极经世》' },
  { id: 'yx_a010', category: 'yixue', difficulty: 'advanced', question: '"天地之数五十有五"出自哪里？这个数字如何构成？', options: ['天数二十五加地数三十', '天数三十加地数二十五', '河图之数', '洛书之数'], correctAnswer: 0, explanation: '《系辞传》载天数五（一三五七九）合为二十五，地数五（二四六八十）合为三十，天地之数共五十五。', source: '《周易·系辞传上》' },
  { id: 'yx_a011', category: 'yixue', difficulty: 'advanced', question: '《周易》"大衍之数五十"的占筮法中，实际使用多少根蓍草？', options: ['五十根', '四十九根', '四十五根', '五十五根'], correctAnswer: 1, explanation: '《系辞传》载"大衍之数五十，其用四十有九"，取出一根不用象征太极，用四十九根分二、挂一、揲四、归奇。', source: '《周易·系辞传上》' },
  { id: 'yx_a012', category: 'yixue', difficulty: 'advanced', question: '《周易》占筮中"三变成一爻"的具体过程是？', options: ['三次分合揲算', '三次掷钱', '三次抽签', '三次推演'], correctAnswer: 0, explanation: '大衍占法每爻需三变：每变包括"分二、挂一、揲四、归奇"四步，三变而成一爻，十八变而成一卦。', source: '《周易·系辞传》' },
  { id: 'yx_a013', category: 'yixue', difficulty: 'advanced', question: '京房"八宫卦"说中，每宫的第八卦称为什么？', options: ['游魂卦', '归魂卦', '变卦', '伏卦'], correctAnswer: 1, explanation: '八宫卦序每宫八卦，从本宫卦到变卦，第六卦为游魂卦，第七卦为归魂卦（恢复内卦为本宫），第八卦亦归于本宫。', source: '《京房易传》' },
  { id: 'yx_a014', category: 'yixue', difficulty: 'advanced', question: '《周易》"错卦"（旁通卦）的含义是？', options: ['阴阳全变之卦', '上下颠倒之卦', '动爻变化之卦', '互体之卦'], correctAnswer: 0, explanation: '错卦（旁通卦）指将原卦每爻阴阳全变所得之卦，如乾错坤、坎错离，体现阴阳对立转化。', source: '《周易》' },
  { id: 'yx_a015', category: 'yixue', difficulty: 'advanced', question: '《周易》"综卦"（反卦）的含义是？', options: ['阴阳全变之卦', '上下颠倒之卦', '内外卦互换', '动爻变化之卦'], correctAnswer: 1, explanation: '综卦（反卦）指将原卦上下颠倒所得之卦，如屯综蒙、需综讼，体现视角转换、事理反转。', source: '《周易》' },
  { id: 'yx_a016', category: 'yixue', difficulty: 'advanced', question: '汉代"爻辰说"将爻与什么对应？', options: ['五行', '十二律、十二辰', '天干', '八卦'], correctAnswer: 1, explanation: '爻辰说（郑玄）将六爻与十二律、十二辰对应，如乾初九配子（黄钟），坤初六配未（林钟），体现律历易结合。', source: '《郑氏易注》' },
  { id: 'yx_a017', category: 'yixue', difficulty: 'advanced', question: '《周易》"中行"概念的最佳体现是哪一爻位？', options: ['二爻和五爻', '初爻和上爻', '三爻和四爻', '所有阳爻'], correctAnswer: 0, explanation: '二居下卦之中，五居上卦之中，为"得中"，中行之道体现中庸不偏的处世智慧。', source: '《周易》' },
  { id: 'yx_a018', category: 'yixue', difficulty: 'advanced', question: '《易传》中"继之者善也，成之者性也"表达了什么思想？', options: ['善恶二元论', '天道继之为善，万物成之为性', '人性本恶', '人性无善无恶'], correctAnswer: 1, explanation: '此句出自《系辞传》，意为继承天道者为善，成就万物者为性，将天道之善与人性之善贯通，为儒家性善论的易学基础。', source: '《周易·系辞传上》' },
  { id: 'yx_a019', category: 'yixue', difficulty: 'advanced', question: '焦延寿《焦氏易林》的体例特点是？', options: ['每卦一辞', '六十四卦每卦变出六十四卦共4096卦各系辞', '只解乾坤二卦', '只解卦辞不解爻辞'], correctAnswer: 1, explanation: '《焦氏易林》将六十四卦每卦变为六十四卦，共4096卦，每卦各系四言韵语辞，极大地扩展了占筮体系。', source: '《焦氏易林》' },
  { id: 'yx_a020', category: 'yixue', difficulty: 'advanced', question: '虞翻"纳甲"说与月相的关系是？', options: ['无关', '以月相盈亏配八卦纳甲', '以日影配卦', '以星辰配卦'], correctAnswer: 1, explanation: '虞翻纳甲说将八卦与月相盈亏周期对应：初三日（震）庚，初八日（兑）丁，十五日（乾）甲壬，十六日（巽）辛，二十三日（艮）丙，三十日（坤）乙癸。', source: '《虞氏易注》' },
  { id: 'yx_a021', category: 'yixue', difficulty: 'advanced', question: '《序卦传》将六十四卦分为哪两篇？', options: ['上经三十卦，下经三十四卦', '上下各三十二卦', '上经三十六卦，下经二十八卦', '上下各三十卦'], correctAnswer: 0, explanation: '《序卦传》将六十四卦分上经（乾至离共三十卦）和下经（咸至未济共三十四卦），上经明天道，下经明人事。', source: '《周易·序卦传》' },
  { id: 'yx_a022', category: 'yixue', difficulty: 'advanced', question: '"既济"卦的结构特点是什么？', options: ['六爻皆当位', '六爻皆不当位', '阴阳全变', '上下相同'], correctAnswer: 0, explanation: '既济卦（水火既济）六爻全部当位（阳居阳位、阴居阴位），象征事已成而秩序井然，但既济之后又有未济，终而复始。', source: '《周易·既济卦》' },
  { id: 'yx_a023', category: 'yixue', difficulty: 'advanced', question: '"未济"卦的结构特点是什么？', options: ['六爻皆当位', '六爻皆不当位（阴阳反位）', '六爻皆阳', '六爻皆阴'], correctAnswer: 1, explanation: '未济卦（火水未济）六爻全部不当位（阳居阴位、阴居阳位），象征事未成而蕴藏变化可能，体现"终则有始"的生生之意。', source: '《周易·未济卦》' },
  { id: 'yx_a024', category: 'yixue', difficulty: 'advanced', question: '《周易》"时"与"位"的关系如何理解？', options: ['时位无关', '时是时机环境，位是爻位身份，时位配合则吉', '时优于位', '位优于时'], correctAnswer: 1, explanation: '"时"指时势时机，"位"指爻位身份处境，吉凶取决于时位配合：得时得位则吉，失时失位则凶。', source: '《周易》' },
  { id: 'yx_a025', category: 'yixue', difficulty: 'advanced', question: '《周易》"当位"与"中德"哪个更为重要？', options: ['当位更重要', '中德更重要', '同等重要', '都不重要'], correctAnswer: 1, explanation: '传统易学认为"中"重于"正"：得中虽不当位亦可吉，如师卦九二不当位但得中故吉。中德体现中庸之道。', source: '《周易正义》' },
  { id: 'yx_a026', category: 'yixue', difficulty: 'advanced', question: '来知德"错综"说的核心观点是？', options: ['错综无关紧要', '错卦与综卦揭示事物对立与转换关系', '只用错卦', '只用综卦'], correctAnswer: 1, explanation: '明代来知德强调"错综"为易学重要方法，错卦揭示对立面，综卦揭示视角转换，二者共同展现事物变化的全貌。', source: '《周易集注》' },
  { id: 'yx_a027', category: 'yixue', difficulty: 'advanced', question: '《周易》"变卦"（之卦）在占筮中的作用是？', options: ['占卜的辅助参考', '通过动爻变化得到变卦，与本卦结合推断吉凶趋势', '变卦无意义', '变卦取代本卦'], correctAnswer: 1, explanation: '占筮中动爻变化后得变卦（之卦），本卦代表现在状态，变卦代表发展趋势，结合推断吉凶。', source: '《周易》' },
  { id: 'yx_a028', category: 'yixue', difficulty: 'advanced', question: '张载"为天地立心"的易学思想基础是？', options: ['《周易》乾坤天地之德', '《道德经》', '《中庸》', '《大学》'], correctAnswer: 0, explanation: '张载以乾坤为天地之心，人继天地之心而有性，故"为天地立心"源于《周易》乾坤化生、人继天道的思想。', source: '《正蒙》' },
  { id: 'yx_a029', category: 'yixue', difficulty: 'advanced', question: '《周易》"复卦"彖辞"复其见天地之心"的哲学含义是？', options: ['天地有心脏', '在阳气复归中可见天地生物之心（生生之仁）', '复卦代表返回', '天地无心'], correctAnswer: 1, explanation: '复卦一阳生于下，象征阳气复归，在微阳复苏中可见天地化育万物的仁心，此为宋儒阐发的核心命题。', source: '《周易·复卦·彖传》' },
  { id: 'yx_a030', category: 'yixue', difficulty: 'advanced', question: '马王堆帛书《周易》与通行本的主要差异是？', options: ['卦序不同', '卦名相同', '爻辞相同', '无差异'], correctAnswer: 0, explanation: '帛书《周易》卦序以乾艮坎震坤兑离巽为序，与通行本周易卦序（乾坤屯蒙...）显著不同，为研究早期易学提供了重要文献。', source: '马王堆帛书《周易》' },
  { id: 'yx_a031', category: 'yixue', difficulty: 'advanced', question: '《周易》"贲卦"彖辞"观乎天文以察时变，观乎人文以化成天下"的含义是？', options: ['天文与人文无关', '观察自然规律以顺应变化，观察人文以教化天下', '只看天文', '只看人文'], correctAnswer: 1, explanation: '此句阐明天文（自然规律）与人文（社会文化）并重：天文察时变，人文化天下，体现了天人合一、自然与人文统一的易学思想。', source: '《周易·贲卦·彖传》' },
  { id: 'yx_a032', category: 'yixue', difficulty: 'advanced', question: '《周易》"革卦"与"鼎卦"的象征关系是？', options: ['革为变革，鼎为建立，革故鼎新', '革为兵器，鼎为食器', '革为皮甲，鼎为重器', '革鼎无关'], correctAnswer: 0, explanation: '革卦象征变革去旧，鼎卦象征鼎新立制，革故鼎新相承相连，体现破旧立新的历史辩证法。', source: '《周易·革卦、鼎卦》' },
  { id: 'yx_a033', category: 'yixue', difficulty: 'advanced', question: '高亨《周易古经今注》对卦辞爻辞的基本判断是？', options: ['纯粹哲学文本', '西周占筮记录与历史叙事', '后世伪作', '神话传说'], correctAnswer: 1, explanation: '高亨认为《周易》古经（卦辞爻辞）为西周占筮记录，其中包含大量历史叙事与社会生活素材，应从历史语言角度还原其本义。', source: '《周易古经今注》' },
  { id: 'yx_a034', category: 'yixue', difficulty: 'advanced', question: '李鼎祚《周易集解》的主要贡献是？', options: ['创立新说', '保存了大量汉易象数学资料', '反驳王弼', '编写占筮指南'], correctAnswer: 1, explanation: '《周易集解》汇集汉唐三十五家易说，尤其保存了荀爽、虞翻等汉代象数易学的大量资料，是研究汉易的宝贵文献。', source: '《周易集解》' },
  { id: 'yx_a035', category: 'yixue', difficulty: 'advanced', question: '《周易》"咸卦"彖辞"二气感应以相与"体现了什么思想？', options: ['阴阳相斥', '阴阳二气相互感应交感而万物化生', '只有阳气重要', '只有阴气重要'], correctAnswer: 1, explanation: '咸卦彖传以阴阳二气相互感应解释"咸"（感），认为天地阴阳交感感应而万物化生，体现了气机感应的哲学思想。', source: '《周易·咸卦·彖传》' },
];

// ============================================================================
// 中医题库
// ============================================================================

// ---- 中医·初级（30题） ----
const ZHONGYI_BASIC: ExamQuestion[] = [
  { id: 'zy_b001', category: 'zhongyi', difficulty: 'basic', question: '中医学的基本特点是？', options: ['整体观念和辨证论治', '阴阳五行和脏腑经络', '望闻问切四诊', '中药针灸推拿'], correctAnswer: 0, explanation: '中医学两大基本特点：整体观念（人是一个有机整体，人与自然相统一）和辨证论治（辨证求因、审因论治）。', source: '《中医基础理论》' },
  { id: 'zy_b002', category: 'zhongyi', difficulty: 'basic', question: '阴阳学说的基本内容不包括下列哪一项？', options: ['阴阳对立制约', '阴阳互根互用', '阴阳消长平衡', '阴阳五行相生'], correctAnswer: 3, explanation: '阴阳学说内容包括：对立制约、互根互用、消长平衡、相互转化。五行相生属五行学说，不属阴阳学说。', source: '《中医基础理论》' },
  { id: 'zy_b003', category: 'zhongyi', difficulty: 'basic', question: '"阳胜则热"属于什么证？', options: ['虚热证', '实热证', '寒证', '虚寒证'], correctAnswer: 1, explanation: '阳胜则热指阳气偏盛导致的实热证，"阳胜则阴病"即阳热偏盛损伤阴津。', source: '《素问·阴阳应象大论》' },
  { id: 'zy_b004', category: 'zhongyi', difficulty: 'basic', question: '五行中"木"对应的脏腑是？', options: ['心', '肝', '脾', '肺'], correctAnswer: 1, explanation: '五行与脏腑对应：木-肝、火-心、土-脾、金-肺、水-肾。肝属木，主疏泄、藏血。', source: '《素问·阴阳应象大论》' },
  { id: 'zy_b005', category: 'zhongyi', difficulty: 'basic', question: '五行中"火"对应的腑是？', options: ['胆', '小肠', '胃', '大肠'], correctAnswer: 1, explanation: '五行与腑对应：木-胆、火-小肠、土-胃、金-大肠、水-膀胱。小肠属火，与心相表里。', source: '《素问·阴阳应象大论》' },
  { id: 'zy_b006', category: 'zhongyi', difficulty: 'basic', question: '五脏中"心"的主要功能是？', options: ['主疏泄', '主血脉、藏神', '主运化', '主肃降'], correctAnswer: 1, explanation: '心主血脉（推动血液运行）和藏神（主神志），为五脏六腑之大主。', source: '《素问·灵兰秘典论》' },
  { id: 'zy_b007', category: 'zhongyi', difficulty: 'basic', question: '五脏中"肝"的主要功能是？', options: ['主血脉', '主疏泄、藏血', '主运化', '主纳气'], correctAnswer: 1, explanation: '肝主疏泄（调畅气机）和主藏血（储藏血液、调节血量），为刚脏，体阴用阳。', source: '《素问·灵兰秘典论》' },
  { id: 'zy_b008', category: 'zhongyi', difficulty: 'basic', question: '五脏中"脾"的主要功能是？', options: ['主血脉', '主疏泄', '主运化、主升清', '主水'], correctAnswer: 2, explanation: '脾主运化（运化水谷精微和水液）、主升清（升提内脏和精微上输）、主统血（摄血于脉内）。', source: '《素问·灵兰秘典论》' },
  { id: 'zy_b009', category: 'zhongyi', difficulty: 'basic', question: '五脏中"肺"的主要功能是？', options: ['主血脉', '主疏泄', '主运化', '主气、司呼吸'], correctAnswer: 3, explanation: '肺主气司呼吸（吸入清气、呼出浊气）、主宣发肃降、通调水道、朝百脉，为华盖。', source: '《素问·灵兰秘典论》' },
  { id: 'zy_b010', category: 'zhongyi', difficulty: 'basic', question: '五脏中"肾"的主要功能是？', options: ['主血脉', '主疏泄', '主运化', '藏精、主水、纳气'], correctAnswer: 3, explanation: '肾藏精（先天之本）、主水（调节水液代谢）、主纳气（摄纳肺之清气），为先天之本。', source: '《素问·灵兰秘典论》' },
  { id: 'zy_b011', category: 'zhongyi', difficulty: 'basic', question: '中医四诊是哪四种？', options: ['望闻问切', '视触叩听', '望切按摸', '望闻按切'], correctAnswer: 0, explanation: '四诊即望诊（观察神色形态）、闻诊（听声音嗅气味）、问诊（询问病情）、切诊（切脉按腹）。', source: '《难经》' },
  { id: 'zy_b012', category: 'zhongyi', difficulty: 'basic', question: '正常的舌象是？', options: ['淡红舌薄白苔', '红舌黄苔', '青紫舌无苔', '白厚腻苔'], correctAnswer: 0, explanation: '正常舌象为"淡红舌、薄白苔"，舌体柔软灵活，舌色淡红荣润，舌苔薄白均匀。', source: '《中医诊断学》' },
  { id: 'zy_b013', category: 'zhongyi', difficulty: 'basic', question: '浮脉的主病通常是？', options: ['里证', '表证', '寒证', '热证'], correctAnswer: 1, explanation: '浮脉轻取即得，主表证（外邪侵袭肌表），亦可见于虚阳外越之里虚证。', source: '《濒湖脉学》' },
  { id: 'zy_b014', category: 'zhongyi', difficulty: 'basic', question: '迟脉的脉象特征是？', options: ['一息四至', '一息不足四至', '一息五至', '一息六至'], correctAnswer: 1, explanation: '迟脉一息不足四至（每分钟不足60次），主寒证，有力为实寒，无力为虚寒。', source: '《濒湖脉学》' },
  { id: 'zy_b015', category: 'zhongyi', difficulty: 'basic', question: '数脉的脉象特征是？', options: ['一息四至', '一息不足四至', '一息五至以上', '一息三至'], correctAnswer: 2, explanation: '数脉一息五至以上（每分钟90次以上），主热证，有力为实热，无力为虚热。', source: '《濒湖脉学》' },
  { id: 'zy_b016', category: 'zhongyi', difficulty: 'basic', question: '中药"四气"是指什么？', options: ['寒热温凉', '辛苦甘酸', '升降浮沉', '辛甘酸苦'], correctAnswer: 0, explanation: '四气即寒、热、温、凉四种药性，另有平性。寒凉属阴治热证，温热属阳治寒证。', source: '《神农本草经》' },
  { id: 'zy_b017', category: 'zhongyi', difficulty: 'basic', question: '中药"五味"是指什么？', options: ['寒热温凉平', '辛苦甘酸咸', '升降浮沉收', '气血阴阳'], correctAnswer: 1, explanation: '五味即辛、苦、甘、酸、咸，各有不同作用：辛散、苦泄、甘缓、酸收、咸软。', source: '《神农本草经》' },
  { id: 'zy_b018', category: 'zhongyi', difficulty: 'basic', question: '方剂"君臣佐使"中，君药的作用是？', options: ['辅佐主药', '针对主病主证起主要治疗作用', '调和诸药', '消除毒性'], correctAnswer: 1, explanation: '君药即主药，针对主病或主证起主要治疗作用，是方剂中不可缺少的核心药物。', source: '《黄帝内经》' },
  { id: 'zy_b019', category: 'zhongyi', difficulty: 'basic', question: '十二经脉中，手太阴经属于哪个脏腑？', options: ['心', '肺', '肝', '脾'], correctAnswer: 1, explanation: '手太阴经即手太阴肺经，属肺络大肠，为十二经脉之首，起于中焦，下行大肠再上行肺系。', source: '《灵枢·经脉》' },
  { id: 'zy_b020', category: 'zhongyi', difficulty: 'basic', question: '六淫是指哪六种外邪？', options: ['风寒暑湿燥火', '气血痰瘀湿食', '心肝脾肺肾', '金木水火土'], correctAnswer: 0, explanation: '六淫即风、寒、暑、湿、燥、火六种外感病邪，在正常情况下称为六气，太过或不及则为淫（邪）。', source: '《素问·至真要大论》' },
  { id: 'zy_b021', category: 'zhongyi', difficulty: 'basic', question: '"风为百病之长"的含义是？', options: ['风邪最凶猛', '风邪常为外邪致病的先导', '风邪最难治', '风邪只伤上部'], correctAnswer: 1, explanation: '风邪为百病之长，因其善行数变、为外邪先导，常兼挟他邪（风寒、风热、风湿等）致病。', source: '《素问·风论》' },
  { id: 'zy_b022', category: 'zhongyi', difficulty: 'basic', question: '寒邪的性质和致病特点是？', options: ['收引凝滞', '升散耗伤', '重浊黏滞', '干涩伤津'], correctAnswer: 0, explanation: '寒性收引（收缩牵引）、凝滞（气血凝结不通），故寒邪致病见疼痛、拘急、恶寒无汗等症。', source: '《素问·举痛论》' },
  { id: 'zy_b023', category: 'zhongyi', difficulty: 'basic', question: '湿邪的性质和致病特点是？', options: ['收引凝滞', '升散耗伤', '重浊黏滞趋下', '干涩伤津'], correctAnswer: 2, explanation: '湿性重浊（沉重浑浊）、黏滞（缠绵难愈）、趋下（易伤下部），为阴邪易伤阳气。', source: '《素问·阴阳应象大论》' },
  { id: 'zy_b024', category: 'zhongyi', difficulty: 'basic', question: '燥邪的性质和致病特点是？', options: ['收引凝滞', '干涩伤津', '重浊黏滞', '炎上耗气'], correctAnswer: 1, explanation: '燥性干涩，易伤津液，致病见口干唇裂、皮肤干涩、大便干结、干咳少痰等津液不足之症。', source: '《素问·阴阳应象大论》' },
  { id: 'zy_b025', category: 'zhongyi', difficulty: 'basic', question: '《黄帝内经》由哪两部分组成？', options: ['素问和灵枢', '伤寒和金匮', '本草和方剂', '针灸和按摩'], correctAnswer: 0, explanation: '《黄帝内经》分《素问》八十一篇和《灵枢》八十一篇，各九卷，为中医理论奠基之作。', source: '《黄帝内经》' },
  { id: 'zy_b026', category: 'zhongyi', difficulty: 'basic', question: '《伤寒论》的作者是？', options: ['华佗', '张仲景', '孙思邈', '李时珍'], correctAnswer: 1, explanation: '《伤寒杂病论》由东汉张仲景著，后分为《伤寒论》和《金匮要略》，为辨证论治之典范。', source: '《伤寒论》' },
  { id: 'zy_b027', category: 'zhongyi', difficulty: 'basic', question: '中药"归经"的含义是？', options: ['药物的产地', '药物对特定脏腑经络的选择性作用', '药物的炮制方法', '药物的配伍'], correctAnswer: 1, explanation: '归经指药物对机体特定脏腑经络的选择性治疗作用，如桔梗归肺经、柴胡归肝经，指导临床用药定位。', source: '《本草纲目》' },
  { id: 'zy_b028', category: 'zhongyi', difficulty: 'basic', question: '中医"气"的基本含义是？', options: ['呼吸之气', '构成人体和维持生命活动的最基本物质', '血液的组成部分', '津液的一种'], correctAnswer: 1, explanation: '气是构成人体和维持生命活动的最基本物质，具有推动、温煦、防御、固摄、气化等功能。', source: '《中医基础理论》' },
  { id: 'zy_b029', category: 'zhongyi', difficulty: 'basic', question: '气和血的关系是？', options: ['气为血之帅，血为气之母', '气血无关', '气生于血', '血生于气'], correctAnswer: 0, explanation: '气为血之帅（气能生血、行血、摄血），血为气之母（血能载气、养气），二者相互依存。', source: '《医林改错》' },
  { id: 'zy_b030', category: 'zhongyi', difficulty: 'basic', question: '中医"辨证论治"中"证"的含义是？', options: ['症状', '证候（疾病发展某一阶段的病理概括）', '体征', '病因'], correctAnswer: 1, explanation: '"证"即证候，是疾病发展过程中某一阶段的病理概括，包括病因、病位、病性、邪正关系，是论治的依据。', source: '《中医基础理论》' },
];

// ---- 中医·中级（35题） ----
const ZHONGYI_INTERMEDIATE: ExamQuestion[] = [
  { id: 'zy_i001', category: 'zhongyi', difficulty: 'intermediate', question: '阴阳偏衰中，"阳虚则寒"属于什么证？', options: ['实寒证', '虚寒证', '实热证', '虚热证'], correctAnswer: 1, explanation: '阳气不足（阳虚）不能温煦机体，导致虚寒之象，如畏寒肢冷、面色苍白、脉沉迟无力。', source: '《素问·调经论》' },
  { id: 'zy_i002', category: 'zhongyi', difficulty: 'intermediate', question: '阴阳偏衰中，"阴虚则热"属于什么证？', options: ['实寒证', '虚寒证', '实热证', '虚热证'], correctAnswer: 3, explanation: '阴液不足（阴虚）不能制约阳气，导致虚火内扰，如五心烦热、潮热盗汗、舌红少苔、脉细数。', source: '《素问·调经论》' },
  { id: 'zy_i003', category: 'zhongyi', difficulty: 'intermediate', question: '五行相生关系中，"木生火"，在脏腑关系中指的是？', options: ['心火生脾土', '肝木生心火', '脾土生肺金', '肺金生肾水'], correctAnswer: 1, explanation: '五行相生对应脏腑：肝木生心火（肝藏血以养心），心火生脾土（心阳温煦脾胃），脾土生肺金，肺金生肾水，肾水生肝木。', source: '《素问·阴阳应象大论》' },
  { id: 'zy_i004', category: 'zhongyi', difficulty: 'intermediate', question: '五行相克关系中，"木克土"，在脏腑关系中指的是？', options: ['肝木克脾土', '心火克肺金', '脾土克肾水', '肺金克肝木'], correctAnswer: 0, explanation: '五行相克对应脏腑：肝木克脾土（肝气横逆犯脾），当肝气郁结时常影响脾运，即"见肝之病，知肝传脾"。', source: '《金匮要略》' },
  { id: 'zy_i005', category: 'zhongyi', difficulty: 'intermediate', question: '"心肾相交"的理论基础是？', options: ['心火下温肾水，肾水上济心火', '心火克肾水', '肾水生心火', '心肾同属火'], correctAnswer: 0, explanation: '心火（阳）下降以温肾水，肾水（阴）上升以济心火，水火既济、阴阳交感，称为心肾相交（水火既济）。', source: '《慎斋遗书》' },
  { id: 'zy_i006', category: 'zhongyi', difficulty: 'intermediate', question: '肝主疏泄的功能主要体现在哪些方面？', options: ['调畅气机、促进消化、调畅情志、调节生殖', '藏血、主筋', '主血脉、藏神', '主运化、主升清'], correctAnswer: 0, explanation: '肝主疏泄包括调畅气机（气机升降出入）、促进脾胃消化（分泌胆汁助运化）、调畅情志、调节女子月经与男子排精。', source: '《素问·灵兰秘典论》' },
  { id: 'zy_i007', category: 'zhongyi', difficulty: 'intermediate', question: '脾主升清的"升清"指的是？', options: ['升提内脏', '将水谷精微上输心肺头目', '升提阳气', '升发肝气'], correctAnswer: 1, explanation: '脾主升清指脾将水谷精微上输至心肺头目，化生气血营养全身，同时维持内脏位置不致下垂。', source: '《素问·经脉别论》' },
  { id: 'zy_i008', category: 'zhongyi', difficulty: 'intermediate', question: '肺"通调水道"的功能是通过什么实现的？', options: ['肺主气', '肺的宣发和肃降', '肺朝百脉', '肺主呼吸'], correctAnswer: 1, explanation: '肺通过宣发（将津液输布全身皮毛）和肃降（将水液下输肾与膀胱）来通调水道，为水之上源。', source: '《素问·经脉别论》' },
  { id: 'zy_i009', category: 'zhongyi', difficulty: 'intermediate', question: '肾主纳气的含义是？', options: ['肾主呼吸', '肾摄纳肺吸入之清气，防止呼吸表浅', '肾主气化', '肾产生气'], correctAnswer: 1, explanation: '肾主纳气指肾摄纳肺吸入之清气，使呼吸保持一定深度，肾不纳气则见气喘（虚喘），"肺主呼气，肾主纳气"。', source: '《类证治裁》' },
  { id: 'zy_i010', category: 'zhongyi', difficulty: 'intermediate', question: '中医"七情"中，哪一种情志最易伤肝？', options: ['喜', '怒', '思', '恐'], correctAnswer: 1, explanation: '怒伤肝，过怒则肝气上逆，见头痛面赤、甚则呕血昏厥。"怒则气上"，肝为刚脏易动难静。', source: '《素问·阴阳应象大论》' },
  { id: 'zy_i011', category: 'zhongyi', difficulty: 'intermediate', question: '中医"七情"中，"思"最易伤哪个脏腑？', options: ['心', '肝', '脾', '肾'], correctAnswer: 2, explanation: '思伤脾，过度思虑则脾气郁结，运化失常，见食欲不振、腹胀便溏。思则气结。', source: '《素问·阴阳应象大论》' },
  { id: 'zy_i012', category: 'zhongyi', difficulty: 'intermediate', question: '中药"十八反"中，"藜芦反"哪几味药？', options: ['人参、丹参、玄参', '甘草', '乌头', '芍药'], correctAnswer: 0, explanation: '十八反中"藜芦反人参、丹参、玄参、沙参、苦参"（一反五参），为配伍禁忌。', source: '《本草经集注》' },
  { id: 'zy_i013', category: 'zhongyi', difficulty: 'intermediate', question: '中药"十九畏"中，"丁香畏"什么？', options: ['人参', '郁金', '犀角', '附子'], correctAnswer: 1, explanation: '十九畏中"丁香畏郁金"，二者不宜同用。十九畏还包括：硫黄畏朴硝、水银畏砒霜等。', source: '《珍珠囊补遗药性赋》' },
  { id: 'zy_i014', category: 'zhongyi', difficulty: 'intermediate', question: '麻黄汤的组成是哪四味药？', options: ['麻黄、桂枝、杏仁、甘草', '麻黄、桂枝、芍药、甘草', '麻黄、杏仁、石膏、甘草', '麻黄、桂枝、生姜、大枣'], correctAnswer: 0, explanation: '麻黄汤由麻黄（发汗解表宣肺平喘）、桂枝（解肌发汗）、杏仁（降肺气止咳）、甘草（调和诸药）组成。', source: '《伤寒论》' },
  { id: 'zy_i015', category: 'zhongyi', difficulty: 'intermediate', question: '桂枝汤的组成是哪五味药？', options: ['桂枝、芍药、甘草、生姜、大枣', '桂枝、麻黄、甘草、生姜、大枣', '桂枝、芍药、甘草、干姜、大枣', '桂枝、茯苓、甘草、生姜、大枣'], correctAnswer: 0, explanation: '桂枝汤由桂枝、芍药、甘草、生姜、大枣组成。桂枝解肌发表，芍药敛阴和营，姜枣调和营卫，甘草调和诸药。', source: '《伤寒论》' },
  { id: 'zy_i016', category: 'zhongyi', difficulty: 'intermediate', question: '小柴胡汤中，柴胡与黄芩的配伍意义是？', options: ['柴胡疏散少阳，黄芩清泄少阳，一散一清和解少阳', '柴胡补气，黄芩养血', '柴胡清热，黄芩泻下', '柴胡散寒，黄芩温中'], correctAnswer: 0, explanation: '柴胡疏散少阳半表之邪，黄芩清泄少阳半里之热，二药相使为用，一散一清，和解少阳，为小柴胡汤之核心配伍。', source: '《伤寒论》' },
  { id: 'zy_i017', category: 'zhongyi', difficulty: 'intermediate', question: '六经辨证中，"太阳病"的主要脉证是？', options: ['脉浮、头项强痛而恶寒', '往来寒热、胸胁苦满', '腹满而吐、自利不渴', '口苦、咽干、目眩'], correctAnswer: 0, explanation: '太阳病提纲："太阳之为病，脉浮，头项强痛而恶寒。"为外邪初犯肌表之表证。', source: '《伤寒论》第一条' },
  { id: 'zy_i018', category: 'zhongyi', difficulty: 'intermediate', question: '六经辨证中，"少阳病"的主要脉证是？', options: ['脉浮、头项强痛而恶寒', '往来寒热、胸胁苦满、口苦咽干目眩', '腹满而吐、自利不渴', '但欲寐、脉微细'], correctAnswer: 1, explanation: '少阳病提纲："少阳之为病，口苦、咽干、目眩也。"又有往来寒热、胸胁苦满等症，为半表半里证。', source: '《伤寒论》第263条' },
  { id: 'zy_i019', category: 'zhongyi', difficulty: 'intermediate', question: '卫气营血辨证中，"卫分证"的主要表现是？', options: ['高热烦渴', '发热微恶风寒、口微渴', '斑疹隐隐、舌绛', '神昏谵语'], correctAnswer: 1, explanation: '卫分证为温病初起，邪在卫表：发热微恶风寒、口微渴、苔薄白、脉浮数，治以辛凉解表。', source: '《温热论》' },
  { id: 'zy_i020', category: 'zhongyi', difficulty: 'intermediate', question: '卫气营血辨证中，"营分证"的舌象特点是？', options: ['苔薄白', '苔黄燥', '舌红绛', '舌青紫'], correctAnswer: 2, explanation: '营分证舌红绛，因热入营分灼伤营阴，见身热夜甚、心烦不寐、时有谵语、斑疹隐隐。', source: '《温热论》' },
  { id: 'zy_i021', category: 'zhongyi', difficulty: 'intermediate', question: '中药配伍"七情"中，"相须"的含义是？', options: ['两种功效相似的药物合用增强疗效', '一种药物减轻另一种毒性', '一种药物减弱另一种药效', '两种药物合用产生毒副作用'], correctAnswer: 0, explanation: '相须指两种功效相似的药物合用，增强原有疗效，如麻黄配桂枝增强发汗解表之力。', source: '《神农本草经》' },
  { id: 'zy_i022', category: 'zhongyi', difficulty: 'intermediate', question: '中药配伍"七情"中，"相使"的含义是？', options: ['两药合用增强疗效', '一种药物辅佐另一种药物提高疗效', '两药合用减毒', '两药合用减效'], correctAnswer: 1, explanation: '相使指一种药物为主，另一种药物为辅，辅药提高主药疗效，如黄芪配茯苓增强补气利水之效。', source: '《神农本草经》' },
  { id: 'zy_i023', category: 'zhongyi', difficulty: 'intermediate', question: '脏腑表里关系中，"肝与胆"的关系是？', options: ['心与小肠相表里', '肝与胆相表里', '脾与胃相表里', '肺与大肠相表里'], correctAnswer: 1, explanation: '肝与胆相表里，足厥阴肝经属肝络胆，足少阳胆经属胆络肝，二者经脉互络，功能相关。', source: '《灵枢·经脉》' },
  { id: 'zy_i024', category: 'zhongyi', difficulty: 'intermediate', question: '脏腑表里关系中，"脾与胃"的关系是？', options: ['心与小肠相表里', '肝与胆相表里', '脾与胃相表里', '肾与膀胱相表里'], correctAnswer: 2, explanation: '脾与胃相表里，足太阴脾经属脾络胃，足阳明胃经属胃络脾。脾主运化主升清，胃主受纳主降浊，升降相因。', source: '《灵枢·经脉》' },
  { id: 'zy_i025', category: 'zhongyi', difficulty: 'intermediate', question: '"五脏化液"中，心之液为？', options: ['泪', '汗', '涎', '唾'], correctAnswer: 1, explanation: '五脏化液：心为汗、肺为涕、肝为泪、脾为涎、肾为唾。汗为心之液，汗出过多易伤心阳。', source: '《素问·宣明五气篇》' },
  { id: 'zy_i026', category: 'zhongyi', difficulty: 'intermediate', question: '"五脏化液"中，肝之液为？', options: ['泪', '汗', '涎', '唾'], correctAnswer: 0, explanation: '五脏化液：肝为泪，肝开窍于目，泪从目出，故肝之液为泪。肝血不足则目干涩少泪。', source: '《素问·宣明五气篇》' },
  { id: 'zy_i027', category: 'zhongyi', difficulty: 'intermediate', question: '"五脏开窍"中，肾开窍于？', options: ['舌', '目', '口', '耳'], correctAnswer: 3, explanation: '五脏开窍：心开窍于舌、肝开窍于目、脾开窍于口、肺开窍于鼻、肾开窍于耳（及二阴）。', source: '《素问·金匮真言论》' },
  { id: 'zy_i028', category: 'zhongyi', difficulty: 'intermediate', question: '中药"升降浮沉"中，花叶类药物多具有什么趋向？', options: ['沉降', '升浮', '不入经', '平性'], correctAnswer: 1, explanation: '花、叶类药物质地轻清，多具升浮之性，如薄荷、菊花升散上行。子实类药物多沉降，如苏子降气。', source: '《本草纲目》' },
  { id: 'zy_i029', category: 'zhongyi', difficulty: 'intermediate', question: '中药炮制中，"酒炒"的主要目的是？', options: ['减毒', '引药上行、增强活血通络', '收敛固涩', '润肺止咳'], correctAnswer: 1, explanation: '酒性升提发散活血，酒炒可引药上行、增强活血通络之力，如酒炒黄芩引上行清上焦热、酒当归增强活血。', source: '《本草蒙筌》' },
  { id: 'zy_i030', category: 'zhongyi', difficulty: 'intermediate', question: '中药炮制中，"醋炒"的主要目的是？', options: ['引药入肝、增强止痛', '引药上行', '润肺', '清热'], correctAnswer: 0, explanation: '醋味酸入肝，醋炒可引药入肝、增强疏肝止痛之效，如醋柴胡引药入肝、醋香附增强行气止痛。', source: '《本草蒙筌》' },
  { id: 'zy_i031', category: 'zhongyi', difficulty: 'intermediate', question: '八纲辨证中，"表里"辨别的是？', options: ['疾病部位', '疾病性质', '邪正盛衰', '疾病类别'], correctAnswer: 0, explanation: '表里辨别病位浅深：表证病在肌表（皮毛、经络），里证病在脏腑，为病位浅深之辨。', source: '《中医诊断学》' },
  { id: 'zy_i032', category: 'zhongyi', difficulty: 'intermediate', question: '八纲辨证中，"虚实"辨别的是？', options: ['疾病部位', '疾病性质', '邪正盛衰', '疾病类别'], correctAnswer: 2, explanation: '虚实辨别邪正盛衰：虚证正气不足（气血阴阳亏虚），实证邪气盛（六淫痰瘀食积）。', source: '《中医诊断学》' },
  { id: 'zy_i033', category: 'zhongyi', difficulty: 'intermediate', question: '六淫中，哪种邪气最易伤人上部头面？', options: ['寒邪', '湿邪', '风邪', '燥邪'], correctAnswer: 2, explanation: '风为阳邪，其性开泄易袭阳位（上部头面肌表），"伤于风者，上先受之"，如头痛面赤。', source: '《素问·太阴阳明论》' },
  { id: 'zy_i034', category: 'zhongyi', difficulty: 'intermediate', question: '中医"瘀血"的疼痛特点是什么？', options: ['胀痛', '刺痛、痛有定处、夜间加重', '重痛', '隐痛'], correctAnswer: 1, explanation: '瘀血致痛特点：刺痛、痛处固定不移、拒按、夜间加重，因瘀血阻滞脉道，气血不通。', source: '《医林改错》' },
  { id: 'zy_i035', category: 'zhongyi', difficulty: 'intermediate', question: '"气为血之帅"主要体现在哪三个方面？', options: ['气能生血、行血、摄血', '气能造血、运血、止汗', '气能温血、凉血、散血', '气能补气、行气、降气'], correctAnswer: 0, explanation: '气为血之帅：气能生血（气化生血）、气能行血（气推动血行）、气能摄血（气统摄血不溢脉外）。', source: '《医林改错》' },
];

// ---- 中医·高级（35题） ----
const ZHONGYI_ADVANCED: ExamQuestion[] = [
  { id: 'zy_a001', category: 'zhongyi', difficulty: 'advanced', question: '《素问·阴阳应象大论》"阳化气，阴成形"的含义是？', options: ['阳主化生无形之气，阴主生成有形之物', '阳气主升，阴气主降', '阳气主热，阴气主寒', '阳气主表，阴气主里'], correctAnswer: 0, explanation: '阳化气指阳气推动气化功能产生无形之气态物质，阴成形指阴气凝聚形成有形之实体物质，体现阴阳气化生成万物的机制。', source: '《素问·阴阳应象大论》' },
  { id: 'zy_a002', category: 'zhongyi', difficulty: 'advanced', question: '《素问·六微旨大论》"升降出入，无器不有"说明了什么？', options: ['万物皆有气机升降出入运动', '只有人体有升降出入', '升降出入只在脏腑', '升降出入与疾病无关'], correctAnswer: 0, explanation: '此句说明气机升降出入是所有生命体（无器不有）的基本运动形式，气的运动推动脏腑功能运转和生命活动。', source: '《素问·六微旨大论》' },
  { id: 'zy_a003', category: 'zhongyi', difficulty: 'advanced', question: '《伤寒论》中"太阳蓄水证"的治法主方是？', options: ['麻黄汤', '五苓散', '桃核承气汤', '桂枝汤'], correctAnswer: 1, explanation: '太阳蓄水证为太阳经邪循经入腑，影响膀胱气化，水饮内停，治以五苓散化气利水。', source: '《伤寒论》第71条' },
  { id: 'zy_a004', category: 'zhongyi', difficulty: 'advanced', question: '《伤寒论》中"太阳蓄血证"的治法主方是？', options: ['五苓散', '桃核承气汤', '麻黄汤', '小柴胡汤'], correctAnswer: 1, explanation: '太阳蓄血证为太阳经邪化热入里，热与血结于下焦少腹，治以桃核承气汤逐瘀泻热，甚者用抵当汤。', source: '《伤寒论》第106条' },
  { id: 'zy_a005', category: 'zhongyi', difficulty: 'advanced', question: '《伤寒论》"少阴病"中，少阴寒化证的代表方是？', options: ['黄连阿胶汤', '四逆汤', '麻黄附子细辛汤', '真武汤'], correctAnswer: 1, explanation: '少阴寒化证为心肾阳衰阴盛，代表方为四逆汤（回阳救逆）。黄连阿胶汤治少阴热化证（阴虚火旺），真武汤治少阴阳虚水停。', source: '《伤寒论》第388条' },
  { id: 'zy_a006', category: 'zhongyi', difficulty: 'advanced', question: '《伤寒论》"厥阴病"的提纲证（上热下寒证）治法主方是？', options: ['乌梅丸', '四逆汤', '白虎汤', '小柴胡汤'], correctAnswer: 0, explanation: '厥阴病提纲为上热下寒证（消渴气上撞心心中疼热饥而不欲食），治以乌梅丸寒温并用、攻补兼施。', source: '《伤寒论》第338条' },
  { id: 'zy_a007', category: 'zhongyi', difficulty: 'advanced', question: '《金匮要略》中"治未病"的具体体现是？', options: ['"见肝之病，知肝传脾，当先实脾"', '"先其时发汗"', '"未病先防"', '"已病防变"'], correctAnswer: 0, explanation: '《金匮要略》首条即"见肝之病，知肝传脾，当先实脾"，体现了"治未病"——既病防传的预防思想。', source: '《金匮要略》第一篇第1条' },
  { id: 'zy_a008', category: 'zhongyi', difficulty: 'advanced', question: '吴鞠通三焦辨证中，上焦病证的主要病变部位是？', options: ['肺与心包', '脾胃', '肝肾', '大肠'], correctAnswer: 0, explanation: '三焦辨证中上焦病证主要在肺与心包（心），表现为温邪犯肺（发热咳嗽）或邪陷心包（神昏谵语）。', source: '《温病条辨》' },
  { id: 'zy_a009', category: 'zhongyi', difficulty: 'advanced', question: '吴鞠通三焦辨证中，中焦病证的主要病变部位是？', options: ['肺与心', '脾胃', '肝肾', '膀胱'], correctAnswer: 1, explanation: '中焦病证主要在脾胃，表现为阳明热盛（壮热汗出渴饮）或湿热困脾（身热不扬、脘痞苔腻）。', source: '《温病条辨》' },
  { id: 'zy_a010', category: 'zhongyi', difficulty: 'advanced', question: '吴鞠通三焦辨证中，下焦病证的主要病变部位是？', options: ['肺与心包', '脾胃', '肝与肾', '膀胱'], correctAnswer: 2, explanation: '下焦病证主要在肝与肾，为温病后期真阴亏损，见手足心热、口干舌燥、手足瘈疭，治以滋阴息风，如大定风珠。', source: '《温病条辨》' },
  { id: 'zy_a011', category: 'zhongyi', difficulty: 'advanced', question: '叶天士卫气营血辨证的传变规律是？', options: ['卫→气→营→血，由表入里', '血→营→气→卫', '卫→营→气→血', '气→血→营→卫'], correctAnswer: 0, explanation: '叶天士提出温病传变规律：卫之后方言气，营之后方言血，由浅入深、由轻到重，为温病辨证核心。', source: '《温热论》' },
  { id: 'zy_a012', category: 'zhongyi', difficulty: 'advanced', question: '叶天士"入营犹可透热转气"的治法含义是？', options: ['营分证当用苦寒直折', '营分证当清营透邪使热转出气分而解', '营分证当凉血止血', '营分证当攻下'], correctAnswer: 1, explanation: '叶天士提出营分证治疗当"透热转气"——清营分热邪并透邪外出气分而解，如清营汤中银花连翘竹叶透邪外出。', source: '《温热论》' },
  { id: 'zy_a013', category: 'zhongyi', difficulty: 'advanced', question: '《素问·至真要大论》病机十九条中"诸风掉眩，皆属于"哪个脏腑？', options: ['心', '肝', '脾', '肺'], correctAnswer: 1, explanation: '"诸风掉眩，皆属于肝"——一切风证引起的肢体震颤、头晕目眩，病机多属肝。肝为风木之脏，内风易动。', source: '《素问·至真要大论》' },
  { id: 'zy_a014', category: 'zhongyi', difficulty: 'advanced', question: '病机十九条中"诸湿肿满，皆属于"哪个脏腑？', options: ['心', '肝', '脾', '肾'], correctAnswer: 2, explanation: '"诸湿肿满，皆属于脾"——一切湿邪所致的浮肿胀满，病机多属脾。脾主运化水湿，脾虚则湿聚。', source: '《素问·至真要大论》' },
  { id: 'zy_a015', category: 'zhongyi', difficulty: 'advanced', question: '病机十九条中"诸气膹郁，皆属于"哪个脏腑？', options: ['心', '肝', '脾', '肺'], correctAnswer: 3, explanation: '"诸气膹郁，皆属于肺"——一切气机壅塞不畅之症（如胸闷喘急），病机多属肺。肺主气，司呼吸。', source: '《素问·至真要大论》' },
  { id: 'zy_a016', category: 'zhongyi', difficulty: 'advanced', question: '《素问·阴阳应象大论》"壮火之气衰，少火之气壮"的含义是？', options: ['火旺则气壮', '壮火（病理之火）消耗正气，少火（生理之火）温养正气', '大火伤气，小火养气', '火与气无关'], correctAnswer: 1, explanation: '壮火指亢盛的病理之火（邪火）消耗正气使气衰，少火指温和的生理之火（命门真火）温养正气使气壮，区分生理与病理之火。', source: '《素问·阴阳应象大论》' },
  { id: 'zy_a017', category: 'zhongyi', difficulty: 'advanced', question: '《素问·上古天真论》中女子七七的身体变化规律是？', options: ['七七则天癸竭，地道不通，形坏无子', '七七则肾气盛', '七七则发长齿更', '七七则筋骨坚强'], correctAnswer: 0, explanation: '女子七七（49岁）天癸竭，任脉虚，太冲脉衰少，地道不通（经断），形坏而无子，为女性自然衰老之期。', source: '《素问·上古天真论》' },
  { id: 'zy_a018', category: 'zhongyi', difficulty: 'advanced', question: '《素问·上古天真论》中男子八八的身体变化规律是？', options: ['八八则齿发去', '八八则肾气实', '八八则天癸至', '八八则筋骨隆盛'], correctAnswer: 0, explanation: '男子八八（64岁）则齿发去——阳气衰竭于上，面焦发鬓颁白，齿发皆衰，为男性自然衰老之期。', source: '《素问·上古天真论》' },
  { id: 'zy_a019', category: 'zhongyi', difficulty: 'advanced', question: '《难经》"命门学说"中命门的位置是？', options: ['右肾', '左肾', '两肾之间', '脐下'], correctAnswer: 0, explanation: '《难经·三十六难》提出"肾有两脏，左为肾，右为命门"，命门即右肾，为"诸神精之所舍，原气之所系"。', source: '《难经·三十六难》' },
  { id: 'zy_a020', category: 'zhongyi', difficulty: 'advanced', question: '赵献可《医贯》中命门的位置观点是？', options: ['右肾', '两肾之间', '左肾', '心下'], correctAnswer: 1, explanation: '明代赵献可在《医贯》中提出命门在两肾之间，为"人身之太极"，是十二经之主，命门火为人体生命之源。', source: '《医贯》' },
  { id: 'zy_a021', category: 'zhongyi', difficulty: 'advanced', question: '《伤寒论》"伤寒中风"与"伤寒"的鉴别要点是？', options: ['中风有汗，伤寒无汗', '中风发热重，伤寒发热轻', '中风脉缓，伤寒脉紧', '以上都是'], correctAnswer: 3, explanation: '伤寒中风（表虚证）：汗出恶风脉浮缓，桂枝汤主之；伤寒（表实证）：无汗恶寒脉浮紧，麻黄汤主之。两者均有发热头痛。', source: '《伤寒论》第2、3条' },
  { id: 'zy_a022', category: 'zhongyi', difficulty: 'advanced', question: '《伤寒论》阳明病"经证"与"腑证"的鉴别关键是？', options: ['有无便秘腹满', '有无发热', '有无汗出', '有无口渴'], correctAnswer: 0, explanation: '阳明经证（白虎汤证）为热在气分，壮热烦渴脉大；阳明腑证（承气汤证）为热结胃肠，有便秘腹满腹痛潮热谵语。', source: '《伤寒论》' },
  { id: 'zy_a023', category: 'zhongyi', difficulty: 'advanced', question: '《伤寒论》"结胸证"与"痞证"的鉴别要点是？', options: ['结胸为实热结于胸腹按之硬痛，痞为气机痞塞按之软不痛', '结胸为虚证，痞为实证', '结胸在上，痞在下', '二者无区别'], correctAnswer: 0, explanation: '结胸证（大陷胸汤证）为水热互结于胸腹，按之硬痛；痞证（半夏泻心汤证）为寒热错杂气机痞塞，按之柔软不痛，心下但满而不痛。', source: '《伤寒论》第131、149条' },
  { id: 'zy_a024', category: 'zhongyi', difficulty: 'advanced', question: '《温病条辨》中银翘散的配伍特点是？', options: ['纯用辛温', '辛凉透表、清热解毒', '苦寒直折', '甘温除热'], correctAnswer: 1, explanation: '银翘散以金银花、连翘清热解毒为君，薄荷牛蒡子辛凉透表为臣，桔梗宣肺利咽，竹叶芦根清热生津，全方辛凉透表清热解毒。', source: '《温病条辨》' },
  { id: 'zy_a025', category: 'zhongyi', difficulty: 'advanced', question: '吴鞠通"治上焦如羽，非轻不举"的含义是？', options: ['上焦病当用轻清宣透之品', '上焦病当用重镇', '上焦病当用补益', '上焦病当用攻下'], correctAnswer: 0, explanation: '吴鞠通提出三焦治法：治上焦如羽（轻清宣透），治中焦如衡（平调平衡），治下焦如权（重镇滋填），反映不同部位的用药原则。', source: '《温病条辨》' },
  { id: 'zy_a026', category: 'zhongyi', difficulty: 'advanced', question: '补中益气汤中"升麻、柴胡"的配伍意义是？', options: ['清热解毒', '升阳举陷，引清气上行', '疏肝解郁', '发汗解表'], correctAnswer: 1, explanation: '补中益气汤中升麻、柴胡用量轻少，意在升提下陷之清阳，配伍黄芪、人参益气健脾，共奏升阳举陷之功。', source: '《脾胃论》' },
  { id: 'zy_a027', category: 'zhongyi', difficulty: 'advanced', question: '六味地黄丸中"三补三泻"的配伍结构是？', options: ['熟地、山茱萸、山药为补，茯苓、泽泻、丹皮为泻', '人参、黄芪为补，当归、白芍为泻', '附子、肉桂为补，黄连为泻', '麻黄、桂枝为补，大黄为泻'], correctAnswer: 0, explanation: '六味地黄丸以熟地（补肾）、山茱萸（补肝肾）、山药（补脾）为"三补"，以泽泻（泻肾浊）、丹皮（泻肝火）、茯苓（渗脾湿）为"三泻"，补中有泻，寓泻于补。', source: '《小儿药证直诀》' },
  { id: 'zy_a028', category: 'zhongyi', difficulty: 'advanced', question: '《金匮要略》中"痰饮"的分类不包括下列哪一项？', options: ['痰饮', '悬饮', '溢饮', '饮邪'], correctAnswer: 3, explanation: '《金匮要略》将痰饮分为四类：痰饮（狭义，饮留肠胃）、悬饮（饮留胁下）、溢饮（饮溢四肢）、支饮（饮停胸肺），无"饮邪"之名。', source: '《金匮要略·痰饮咳嗽病脉证并治》' },
  { id: 'zy_a029', category: 'zhongyi', difficulty: 'advanced', question: '《伤寒论》中"四逆散"的组成是？', options: ['柴胡、芍药、枳实、甘草', '附子、干姜、甘草', '人参、附子、干姜', '柴胡、黄芩、半夏、甘草'], correctAnswer: 0, explanation: '四逆散由柴胡、芍药、枳实、甘草组成，治阳气内郁之四逆（手足不温），功能透邪解郁疏肝理脾，与四逆汤（回阳救逆）不同。', source: '《伤寒论》第318条' },
  { id: 'zy_a030', category: 'zhongyi', difficulty: 'advanced', question: '《素问·标本病传论》"急则治其标，缓则治其本"的含义是？', options: ['急性病只治标，慢性病只治本', '病势急重时先治标证，病势缓时治本源', '标本同治', '只治标不治本'], correctAnswer: 1, explanation: '此为标本治则：病势急重时先治标以解燃眉之急（如大出血先止血），病势缓时治本以杜病源，体现标本缓急的治法选择。', source: '《素问·标本病传论》' },
  { id: 'zy_a031', category: 'zhongyi', difficulty: 'advanced', question: '《灵枢·经脉》中十二经脉的流注顺序起于哪条经？', options: ['手阳明大肠经', '手太阴肺经', '足阳明胃经', '手少阴心经'], correctAnswer: 1, explanation: '十二经脉流注从手太阴肺经起（寅时），依次传至足厥阴肝经，再回到肺经，如环无端。肺经起于中焦，下络大肠。', source: '《灵枢·经脉》' },
  { id: 'zy_a032', category: 'zhongyi', difficulty: 'advanced', question: '《素问·五脏生成》"心之合脉也，其荣色也"说明心与什么的关系？', options: ['心合于脉，其华在面', '心合于皮', '心合于筋', '心合于骨'], correctAnswer: 0, explanation: '"心之合脉也，其荣色也"意为心与血脉相合，其华彩表现于面色（心华在面），心气充则面色红润。', source: '《素问·五脏生成》' },
  { id: 'zy_a033', category: 'zhongyi', difficulty: 'advanced', question: '《素问·五脏生成》中"肝受血而能视"说明肝与目的什么关系？', options: ['肝藏血，血养目则能视', '肝主疏泄，调畅目窍', '肝合于筋', '肝开窍于耳'], correctAnswer: 0, explanation: '"肝受血而能视"——肝藏血，目受血而能视物，说明肝血充足是视觉正常的基础，体现肝开窍于目、肝血养目的理论。', source: '《素问·五脏生成》' },
  { id: 'zy_a034', category: 'zhongyi', difficulty: 'advanced', question: '张介宾《景岳全书》"阳非有余，阴常不足"说的理论基础是？', options: ['阳气为人身之大宝，阴虚亦常见', '阳气不足', '阴气有余', '阴阳平衡'], correctAnswer: 0, explanation: '张介宾提出"阳非有余"（阳气不可妄伐，为生命之根本）和"阴常不足"（阴液易亏），主张温补阳气、滋养阴精，为温补学派代表。', source: '《景岳全书》' },
  { id: 'zy_a035', category: 'zhongyi', difficulty: 'advanced', question: '朱丹溪"相火论"中"阳常有余，阴常不足"的治法主张是？', options: ['温补阳气', '滋阴降火', '补气健脾', '活血化瘀'], correctAnswer: 1, explanation: '朱丹溪认为"阳常有余，阴常不足"，相火妄动则煎熬阴精，主张滋阴降火，善用知母、黄柏等滋阴泻火药，为滋阴派代表。', source: '《格致余论》' },
];

// ============================================================================
// 统一导出
// ============================================================================

/** 全部题库 */
export const EXAM_QUESTIONS: ExamQuestion[] = [
  ...YIXUE_BASIC,
  ...YIXUE_INTERMEDIATE,
  ...YIXUE_ADVANCED,
  ...ZHONGYI_BASIC,
  ...ZHONGYI_INTERMEDIATE,
  ...ZHONGYI_ADVANCED,
];

/** 易学初级题库（免费） */
export const YIXUE_BASIC_QUESTIONS = YIXUE_BASIC;

/** 易学中级题库（会员） */
export const YIXUE_INTERMEDIATE_QUESTIONS = YIXUE_INTERMEDIATE;

/** 易学高级题库（会员） */
export const YIXUE_ADVANCED_QUESTIONS = YIXUE_ADVANCED;

/** 中医初级题库（免费） */
export const ZHONGYI_BASIC_QUESTIONS = ZHONGYI_BASIC;

/** 中医中级题库（会员） */
export const ZHONGYI_INTERMEDIATE_QUESTIONS = ZHONGYI_INTERMEDIATE;

/** 中医高级题库（会员） */
export const ZHONGYI_ADVANCED_QUESTIONS = ZHONGYI_ADVANCED;

/** 根据类别获取题目 */
export function getQuestionsByCategory(category: 'yixue' | 'zhongyi'): ExamQuestion[] {
  return EXAM_QUESTIONS.filter((q) => q.category === category);
}

/** 根据难度获取题目 */
export function getQuestionsByDifficulty(difficulty: 'basic' | 'intermediate' | 'advanced'): ExamQuestion[] {
  return EXAM_QUESTIONS.filter((q) => q.difficulty === difficulty);
}

/** 根据类别和难度获取题目 */
export function getQuestionsByCategoryAndDifficulty(
  category: 'yixue' | 'zhongyi',
  difficulty: 'basic' | 'intermediate' | 'advanced',
): ExamQuestion[] {
  return EXAM_QUESTIONS.filter((q) => q.category === category && q.difficulty === difficulty);
}

/** 获取免费题目（初级） */
export function getFreeQuestions(): ExamQuestion[] {
  return EXAM_QUESTIONS.filter((q) => q.difficulty === 'basic');
}

/** 获取全部题目（会员） */
export function getAllExamQuestions(): ExamQuestion[] {
  return EXAM_QUESTIONS;
}

/** 根据 ID 获取题目 */
export function getQuestionById(id: string): ExamQuestion | undefined {
  return EXAM_QUESTIONS.find((q) => q.id === id);
}

/** 获取题目总数 */
export function getTotalQuestionCount(): number {
  return EXAM_QUESTIONS.length;
}

/** 获取各类别题目数 */
export function getCategoryQuestionCounts(): { yixue: number; zhongyi: number } {
  return {
    yixue: YIXUE_BASIC.length + YIXUE_INTERMEDIATE.length + YIXUE_ADVANCED.length,
    zhongyi: ZHONGYI_BASIC.length + ZHONGYI_INTERMEDIATE.length + ZHONGYI_ADVANCED.length,
  };
}
