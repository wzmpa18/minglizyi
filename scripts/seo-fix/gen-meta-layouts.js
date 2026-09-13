// 生成各App路由的 layout.tsx（metadata / noindex）
// 用法: node scripts/seo-fix/gen-meta-layouts.js
const fs = require("fs");
const path = require("path");

const APP = path.join(__dirname, "..", "..", "src", "app");

// ============ 公开路由 metadata（title 不含品牌后缀，根布局 template 自动追加"｜言道国学"） ============
const META = {
  // ---- 枢纽页 ----
  "/yixue": {
    title: "易学排盘工具大全——八字紫微奇门六爻在线排盘",
    description: "言道国学易学工具中心：一站式提供八字排盘、紫微斗数、奇门遁甲、六爻起卦、梅花易数、大六壬、七政四余、玄空飞星等传统易学在线排盘工具，附万年历、老黄历、择日、罗盘等历法风水查询，功能免费使用，基于传统典籍整理，适合易学爱好者学习参考。",
  },
  "/zhongyi": {
    title: "中医学习工具——典籍方剂经络体质一站式中心",
    description: "言道国医学习中心：提供中医智能问诊、辨证学习、体质测评、中医典籍阅读、中药库、经典方剂库、经络穴位查询与养生功法参考，另含医考题库练习，内容基于《黄帝内经》《伤寒论》等经典医籍整理，适合中医自学入门与进阶学习。",
  },
  "/academy": {
    title: "学习中心——章节知识点练习与错题复习",
    description: "言道国学学习中心：易学与中医章节化知识体系，提供知识点学习、章节练习、错题复习、学习笔记与收藏功能，学习进度自动记录，支持易学基础、八字、紫微斗数、七政四余、中医基础与医考等多学科，适合系统化自学打卡。",
  },
  "/academy/yixue": {
    title: "易学学习专区——学科知识点与题库练习",
    description: "易学学习专区：涵盖易学基础、八字基础、紫微斗数、七政四余、奇门遁甲、六爻、梅花易数、大六壬与历法等学科，每科提供章节目录、知识点讲解、术语解释与章节练习，题目附答案解析，学习进度云端同步，适合零基础系统学习。",
  },
  "/academy/yikao": {
    title: "医考学习专区——中医医考知识点与刷题",
    description: "医考学习专区：整理中医执业医师与医考相关知识点，提供章节化学习、每日练习、错题复习与收藏功能，题目覆盖中医基础理论、中药学、方剂学、针灸学等科目，附答案解析，适合医考备考与中医在校生复习使用。",
  },
  "/download": {
    title: "言道国学APP下载——安卓苹果全平台安装",
    description: "言道国学APP官方下载页：安卓APK直装与苹果App Store下载入口，一个应用集成八字、紫微斗数、奇门遁甲、七政四余等易学排盘工具与中医学习中心，离线可用、无强制广告，下载安装即可使用全部基础排盘功能。",
  },
  "/membership": {
    title: "会员中心——言道国学套餐与权益说明",
    description: "言道国学会员中心：查看当前会员状态、会员套餐与权益说明，会员可解锁完整问诊分析、学习数据云同步等进阶功能，基础排盘与学习功能保持免费。",
  },
  "/ai": {
    title: "言道AI助手——易学中医智能问答工具",
    description: "言道AI助手：基于人工智能的传统文化问答工具，可咨询易学概念、中医基础、典籍出处与学习路径等问题，回答仅供文化学习参考，不构成医疗建议或决策依据。",
  },
  "/books": {
    title: "经典医籍阅读——中医经典著作书单",
    description: "经典医籍阅读列表：整理《黄帝内经》《伤寒论》《金匮要略》《温病条辨》等中医经典著作，建议按序研读的入门书单与阅读指引，附原文查阅入口，适合中医自学者的典籍学习路线参考。",
  },

  // ---- 易学工具 ----
  "/yixue/bazi": {
    title: "八字排盘——免费在线生辰八字命盘工具",
    description: "免费在线八字排盘：输入出生年月日时，自动生成四柱八字命盘，含五行旺衰、十神、纳音、神煞、藏干、大运流年排布与真太阳时校正，支持命盘保存与历史记录恢复，基于子平命理传统方法，适合八字入门学习与排盘对照参考。",
  },
  "/yixue/ziwei": {
    title: "紫微斗数排盘——在线紫微命盘十二宫安星",
    description: "紫微斗数在线排盘：自动完成十四主星安星、十二宫位、四化飞星、大限流年与身宫计算，命盘信息完整清晰，支持排盘保存与历史调用，基于传统紫微斗数典籍，适合斗数入门学习与命盘结构研究参考。",
  },
  "/yixue/qizheng": {
    title: "七政四余排盘——专业星命盘在线工具",
    description: "七政四余在线排盘：日月五星加紫炁月孛罗睺计都共十一曜、二十八宿宿度、十二人事宫、洞微行限、神煞与化曜专业排盘，支持原局流年叠加显示、流年神煞化曜高亮与高清图导出，专业信息密度对标案例盘，适合星命学深入学习。",
  },
  "/yixue/qimen": {
    title: "奇门遁甲排盘——时家奇门在线起局工具",
    description: "奇门遁甲在线排盘：支持时家转盘起局，自动排布九宫、天盘地盘人盘神盘、八门、九星、八神与三奇六仪，含旬空与马星标注，起局准确清晰，基于传统奇门典籍，适合奇门遁甲入门学习与课局研究参考。",
  },
  "/yixue/liuyao": {
    title: "六爻排盘——在线起卦装卦纳甲工具",
    description: "六爻在线排盘：支持手动摇卦与时间起卦，自动完成装卦、纳甲、安世应、配六亲六神，显示旬空月破与用神旺衰参考，卦象结构清晰完整，基于传统纳甲筮法，适合六爻入门学习与占例研究。",
  },
  "/yixue/meihua": {
    title: "梅花易数——在线起卦与体用生克分析",
    description: "梅花易数在线起卦：支持时间、数字、方位等多种起卦方式，自动完成卦象拆解、体用生克、互卦变卦与断卦要素标注，附起卦方法说明与卦象含义解释，基于邵雍梅花易数传统，适合梅花易数入门学习参考。",
  },
  "/yixue/daliuren": {
    title: "大六壬排盘——在线六壬课式起盘工具",
    description: "大六壬在线排盘：自动起课布局天地盘、四课三传、遁干与贵人顺逆，课式结构清晰完整，附神煞与课体参考说明，基于传统大六壬课法，适合六壬爱好者起盘学习与课式研究参考。",
  },
  "/yixue/xiaoliuren": {
    title: "小六壬——掌上起卦快速占测工具",
    description: "小六壬在线起卦：以月、日、时三数掐指起课，自动推算大安、留连、速喜、赤口、小吉、空亡六神课象，附各课含义解释与生活事项参考，方法简单易上手，适合民俗文化学习与趣味占测。",
  },
  "/yixue/taiyi-sanshi": {
    title: "太乙三式——太乙神数在线排盘工具",
    description: "太乙神数在线排盘：自动推演太乙积年、主客算、八将布局与年计月计日计时计课式，附太乙术语解释，基于传统太乙神数典籍，适合三式爱好者学习太乙课式结构与推演方法参考。",
  },
  "/yixue/xuankong-feixing": {
    title: "玄空飞星排盘——九宫飞星在线工具",
    description: "玄空飞星在线排盘：输入建造年代与坐向，自动排布下卦与替卦元盘、山向飞星组合、流年流月飞星盘，含正零神与城门诀参考，基于玄空风水传统理论，适合玄空飞星入门学习与宅运分析研究。",
  },
  "/yixue/compass": {
    title: "专业罗盘——手机电子风水罗盘工具",
    description: "手机电子罗盘：调用设备方向传感器显示二十四山方位与度数，附三合罗盘、三元罗盘盘面图层对照，支持坐向测定与方位记录，适合风水学习者在户外定向时替代实体罗盘使用，操作简单读数直观。",
  },
  "/yixue/liji": {
    title: "立极尺——玄空风水立极定位测量工具",
    description: "立极尺在线工具：玄空风水立极定位辅助测量，输入房屋户型尺寸确定立极点，辅助判断八方宫位划分与飞星布局，附立极尺使用方法说明，基于玄空风水传统，适合风水学习者练习立极与定向。",
  },
  "/yixue/luban": {
    title: "鲁班尺——在线鲁班尺吉凶查询工具",
    description: "在线鲁班尺查询：输入尺寸毫米数，自动对照鲁班尺财、病、离、义、官、劫、害、本八字刻度显示吉凶与红黑字，附鲁班尺的来历与阳宅常用吉利尺寸参考，适合木工、装修与民俗文化爱好者查询使用。",
  },
  "/yixue/yizhangjing": {
    title: "达摩一掌经——在线一掌经排盘工具",
    description: "达摩一掌经在线排盘：以出生年月日时在十二宫掌诀上起算，自动推排天贵、天厄、天权、天破、天奸、天文、天福、天驿、天孤、天艺、天寿十二星宫，附各星宫含义解释，适合佛门掌诀文化与民俗学习参考。",
  },
  "/yixue/wannianli": {
    title: "万年历——在线公历农历黄历查询",
    description: "在线万年历查询：公历农历对照、干支纪年、生肖、节气、节日与月相信息一键查询，支持跨年度日期检索与每日宜忌参考，数据基于传统历法推算，适合查日子、看节气、对照干支属相的日常使用。",
  },
  "/yixue/huangli": {
    title: "老黄历——今日黄历宜忌吉凶查询",
    description: "在线老黄历：查询每日宜忌、吉神凶煞、值日值神、冲煞生肖与五行，附黄历术语解释与择日小知识，内容基于传统历法通书整理，适合婚嫁、开业、搬家等事项的择日参考与文化了解。",
  },
  "/yixue/hehun": {
    title: "八字合婚——在线两人八字配对分析",
    description: "八字合婚在线分析：输入双方出生时间，对照两造年柱干支、生肖、日柱与五行生克关系，给出传统合婚参考要点，附合婚方法说明，结果仅供传统文化学习参考，婚姻决策请以现实相处为准。",
  },
  "/yixue/name": {
    title: "姓名解析——姓名五格三才分析工具",
    description: "在线姓名解析：输入姓名自动计算五格数理（天格人格地格外格总格）、三才配置与生肖用字宜忌，附数理吉凶含义解释，基于传统姓名学方法，适合姓名文化学习与起名参考使用。",
  },
  "/yixue/qiming": {
    title: "智能起名——生辰八字在线起名工具",
    description: "在线智能起名：结合出生八字五行喜忌、五格数理与生肖宜用字，生成候选姓名并附解析，支持性别与字数偏好设置，附起名原则说明，基于传统命理与姓名学方法，适合新生儿起名与改名参考。",
  },
  "/yixue/phone": {
    title: "手机号码解析——数字能量磁场查询",
    description: "手机号码解析：按数字能量学方法拆分号码数组，对照八星磁场组合含义给出解读，附数组对照表与说明，内容属民俗数字文化，仅供娱乐学习参考，不构成任何决策建议。",
  },
  "/yixue/carplate": {
    title: "车牌号民俗解读——车牌数字字母寓意查询",
    description: "车牌号民俗解读：输入车牌号按数字能量与字母民俗含义组合解读，附常见吉数组合与选号小知识，内容属民俗文化参考，适合选号时趣味对照，不构成任何决策建议。",
  },
  "/yixue/zeri": {
    title: "择日——传统黄道吉日在线查询工具",
    description: "在线择日：按嫁娶、开业、搬家、动土等事项查询传统黄道吉日，对照每日建除十二神、二十八宿与吉神方位，附择日术语解释，基于传统通书历法，适合民俗择日学习与日常参考。",
  },
  "/yixue/astro": {
    title: "占星术——在线本命星盘星座排盘工具",
    description: "在线占星排盘：输入出生时间与城市，生成本命星盘，含上升、天顶、行星星座与宫位落点，附十二星座与行星含义解释，适合占星入门学习与星盘结构对照参考，内容仅供文化学习。",
  },
  "/yixue/tarot": {
    title: "塔罗牌——在线塔罗占卜抽牌工具",
    description: "在线塔罗占卜：支持常用牌阵抽牌与翻牌解读，附大阿卡纳与小阿卡纳牌意说明，可保存占卜记录，适合塔罗入门学习与娱乐参考，内容仅供文化学习，不构成决策建议。",
  },
  "/yixue/jiemeng": {
    title: "周公解梦——在线梦境意象查询工具",
    description: "在线周公解梦：按关键词查询梦境意象的传统解梦释义，覆盖常见梦境类别，附解梦文化说明，内容整理自传统解梦典籍，仅供民俗文化学习参考。",
  },
  "/yixue/jieqi": {
    title: "二十四节气——节气时间查询与养生参考",
    description: "二十四节气查询：显示各节气准确时间、物候特征与传统习俗，附节气养生与饮食参考，基于传统农历历法推算，适合了解节气文化与安排日常起居参考。",
  },
  "/yixue/ai": {
    title: "AI易学问答——智能易学概念查询助手",
    description: "AI易学问答：向AI助手咨询易学概念、排盘术语、典籍出处与学习路径等问题，即时获得解答与学习建议，回答仅供传统文化学习参考，不构成预测或决策建议。",
  },
  "/yixue/chenggu": {
    title: "称骨算命——袁天罡称骨歌在线测算",
    description: "称骨算命在线测算：输入出生年月日时与性别，按袁天罡称骨歌传统方法计算骨重并显示对应歌诀与批注，附称骨算命的来历说明，仅供民俗文化学习参考。",
  },
  "/yixue/ganzhi": {
    title: "干支查询——天干地支在线对照工具",
    description: "干支查询工具：按干支查六十甲子序号，或按序号反查干支，附十天干十二地支的五行属性与方位对照表，适合历法学习与干支纪年查询使用。",
  },
  "/yixue/kongwang": {
    title: "空亡查询——六十甲子旬空在线工具",
    description: "空亡在线查询：选择干支自动显示所在旬与旬空（空亡）地支，附空亡的概念解释与命理用法说明，适合八字学习中查询旬空对照使用。",
  },
  "/yixue/nayin": {
    title: "纳音查询——六十甲子纳音五行对照工具",
    description: "纳音在线查询：选择干支组合显示对应纳音五行（如海中金、炉中火等），附六十甲子纳音全表与纳音含义说明，适合八字学习与命理术语查询使用。",
  },
  "/yixue/shensha": {
    title: "神煞查询——八字神煞在线查询工具",
    description: "神煞在线查询：按干支组合查询对应的吉神、凶煞与中性神煞，附各神煞的传统含义解释与总计统计，适合八字学习中查询神煞对照与术语学习。",
  },
  "/yixue/wuxing": {
    title: "五行查询——八字五行属性在线对照",
    description: "五行查询工具：十天干十二地支的五行属性对照表，附五行相生相克关系图解与方位季节对应，适合五行入门学习与干支五行属性速查。",
  },
  "/yixue/learn": {
    title: "易学典籍库——基础教程与古籍阅读",
    description: "易学典籍库：传统易学典籍与基础教程在线阅读，含《易经》原文与历代注疏、易学基础概念讲解，附入门阅读顺序建议，适合易学自学者系统研读经典。",
  },

  // ---- 中医工具 ----
  "/zhongyi/ai": {
    title: "AI中医问答——智能中医知识查询助手",
    description: "AI中医问答：向AI助手咨询中医基础概念、药材功效、方剂组成与典籍出处等问题，附学习建议，回答基于公开中医资料整理，仅供学习参考，不构成诊疗建议，身体不适请线下就医。",
  },
  "/zhongyi/bianzheng": {
    title: "辨证学习——中医辨证论治在线练习",
    description: "中医辨证学习：输入症状进行辨证分析练习，对照八纲辨证、脏腑辨证与六经辨证思路，附常见证型辨析要点，基于《中医诊断学》体系整理，适合中医专业学生与自学者练习辨证思维。",
  },
  "/zhongyi/classic": {
    title: "中医典籍——经典医书在线阅读",
    description: "中医典籍在线阅读：《黄帝内经》《伤寒论》《金匮要略》等经典医书原文查阅，支持搜索与分篇浏览，附典籍导读与阅读顺序建议，适合中医学习者研读原始文献。",
  },
  "/zhongyi/constitution": {
    title: "中医体质测评——九种体质在线测试",
    description: "中医体质测评：按标准体质量表自测体质倾向，输出九种体质（平和、气虚、阳虚、阴虚、痰湿、湿热、血瘀、气郁、特禀）结果与调理建议，附体质辨识知识讲解，适合了解中医体质学说。",
  },
  "/zhongyi/diagnosis": {
    title: "中医智能问诊——症状分析参考工具",
    description: "中医智能问诊：选择性别与症状后获得证候分析参考，含妇科专项症状，输出可能的证型与调理方向，附问诊说明，结果仅供学习参考，不能替代执业医师诊断。",
  },
  "/zhongyi/wenzhen": {
    title: "智能问诊——中医证型分析进阶版",
    description: "中医智能问诊进阶版：输入症状组合获得更完整的辨证分析与证型鉴别参考，会员可解锁完整结果，附辨证思路讲解，内容仅供中医学习参考，不构成诊疗建议。",
  },
  "/zhongyi/yangsheng": {
    title: "中医养生——传统功法与四季养生参考",
    description: "中医养生参考：按季节与主题整理养生功法、起居饮食与情志调摄建议，附八段锦、太极拳等传统功法简介，内容基于中医养生理论整理，适合日常养生参考学习。",
  },
  "/zhongyi/zhenggu": {
    title: "正骨专区——中华非遗正骨知识学习",
    description: "正骨专区：中华非遗正骨流派知识整理，含正骨手法原理、流派传承与知识点学习，内容仅供专业了解，正骨操作须由专业医师进行，请勿自行模仿。",
  },
  "/zhongyi/exam": {
    title: "医考题库——中医考试在线刷题工具",
    description: "医考题库在线刷题：总题数、已练习、正确率与学习天数统计，按科目分章节练习，支持错题本与收藏，题目附答案解析，覆盖中医基础理论、中药学、方剂学、针灸学等科目，适合医考备考。",
  },
  "/zhongyi/formula": {
    title: "经典方剂库——方剂组成功效在线查询",
    description: "经典方剂库：按方名或主治查询方剂的组成、剂量、功用与主治，附方歌与出处，古籍记载剂量为非标准化剂量，仅供学习参考，临床用药请遵医嘱。",
  },
  "/zhongyi/herb": {
    title: "中药库——中药功效性味在线查询",
    description: "中药库：按药名查询性味归经、功效主治与用法注意，含毒性药材标注，支持分类浏览，附中药学习记忆方法，内容基于《中药学》教材整理，仅供学习参考。",
  },
  "/zhongyi/meridian": {
    title: "经络穴位——十二经络循行与穴位查询",
    description: "经络穴位查询：十二正经与任督二脉的循行路线、常用穴位定位与主治功效，附标准经络图参考，基于《经络腧穴学》整理，适合针灸推拿学习与穴位速查。",
  },
  "/zhongyi/shanghan": {
    title: "伤寒论辨证学习——六经证型对照工具",
    description: "伤寒论学习：输入症状对照六经辨证证型，附各方证的条文出处与鉴别要点，采用证型对照学习模式，基于《伤寒论》原文整理，适合经典方证学习与考研复习。",
  },
};

// ============ 私密/工具类路由 noindex ============
const NOINDEX = [
  "/profile", "/friends", "/groups", "/messages", "/points", "/orders",
  "/user", "/clients", "/contacts", "/files", "/records", "/social", "/offline",
  "/calendar", "/discover", "/featured", "/share", "/login", "/register",
  "/forgot-password", "/yixue/profile", "/yixue/shop", "/zhongyi/profile", "/zhongyi/shop",
  "/academy/learn", "/academy/question-bank", "/academy/wrong-book", "/academy/favorites",
  "/academy/notes", "/academy/exam", "/academy/certificates", "/academy/leaderboard",
  "/academy/factory", "/academy/my-comments", "/academy/orgs",
];

function writeMetaLayout(route, meta) {
  const dir = path.join(APP, route);
  if (!fs.existsSync(dir)) {
    console.log(`SKIP(目录不存在): ${route}`);
    return;
  }
  if (fs.existsSync(path.join(dir, "layout.tsx"))) {
    console.log(`SKIP(已有layout): ${route}`);
    return;
  }
  const code = `import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "${meta.title}",
  description: "${meta.description}",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
`;
  fs.writeFileSync(path.join(dir, "layout.tsx"), code, "utf8");
  console.log(`OK(meta): ${route}`);
}

function writeNoindexLayout(route) {
  const dir = path.join(APP, route);
  if (!fs.existsSync(dir)) {
    console.log(`SKIP(目录不存在): ${route}`);
    return;
  }
  if (fs.existsSync(path.join(dir, "layout.tsx"))) {
    console.log(`SKIP(已有layout): ${route}`);
    return;
  }
  const code = `import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
`;
  fs.writeFileSync(path.join(dir, "layout.tsx"), code, "utf8");
  console.log(`OK(noindex): ${route}`);
}

let ok = 0, skip = 0;
for (const [route, meta] of Object.entries(META)) writeMetaLayout(route, meta);
for (const route of NOINDEX) writeNoindexLayout(route);
console.log("\n=== 完成 ===");
