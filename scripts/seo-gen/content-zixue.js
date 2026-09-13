/** FINAL-17 第十二章：中医自学原创学习集群（10页，内容优先，不关键词换皮） */
const { SITE } = require("./template");

const Z = "/zhongyi/";
const E = "/zhongyi/exam/";

const pages = [
  {
    path: "/zixue/zhongyi-zenme-rumen.html",
    crumb: "中医怎么入门",
    title: "中医怎么入门？零基础自学中医的正确顺序与方法_言道国学",
    desc: "零基础学中医从哪本书读起？中医入门顺序（基础理论→诊断→中药→方剂）、四大常见误区、学练结合的免费题库工具，一篇讲清楚中医自学怎么开始。",
    keywords: "中医怎么入门,中医自学,零基础学中医,中医入门顺序,学中医从哪本书开始",
    h1: "中医怎么入门？零基础自学中医的正确顺序",
    lead: "中医不是一个“背下经典就会”的学科，而是一座有明确地基和楼层的大厦。入门的关键不是找一本“神书”，而是按结构从地基往上走，并且边学边检验。",
    sections: [
      {
        id: "kuangjia", h2: "先看清中医的知识框架",
        html: [
          `<p>中医学大致分为两段：<strong>基础段</strong>和<strong>临床段</strong>。基础段包括中医基础理论、中医诊断学、中药学、方剂学（俗称“中医四大基础”）；临床段是内、外、妇、儿各科与针灸，再往上才是《伤寒论》《金匮要略》《黄帝内经》等经典的深读。</p>`,
          `<p>零基础最常犯的错误是跳过基础段直接读经典——翻开《黄帝内经》第一篇还能看懂几句，到“阴阳应象大论”就开始硬啃，一个月后放弃。经典是“有基础后的深水区”，不是入门教材。</p>`,
        ],
      },
      {
        id: "shunxu", h2: "推荐的入门顺序（按学期排）",
        html: [
          `<table><tr><th>阶段</th><th>学什么</th><th>目标</th></tr>
<tr><td>第1步</td><td>中医基础理论</td><td>掌握阴阳五行、藏象、气血津液、病因病机的概念体系</td></tr>
<tr><td>第2步</td><td>中医诊断学</td><td>会四诊合参，能做八纲辨证、脏腑辨证</td></tr>
<tr><td>第3步</td><td>中药学</td><td>记住常用中药的功效归类与配伍禁忌</td></tr>
<tr><td>第4步</td><td>方剂学</td><td>理解君臣佐使，掌握主流方剂的结构</td></tr>
<tr><td>第5步</td><td>经典选读</td><td>带着基础回读《伤寒论》《黄帝内经》，效率完全不同</td></tr></table>`,
          `<p>每一学完就配做题检验——概念“看懂了”和“会做题”是两个层次。言道国学的免费题库覆盖前四步全部科目（共1447题，网页版直接做）。</p>`,
        ],
      },
      {
        id: "wuqu", h2: "入门四大常见误区",
        html: [
          `<ul>
<li><strong>误区一：一上来背原文。</strong>《内经》《伤寒》的语言是古文，概念密度高，没有基础框架时背诵效率极低。先建框架，原文放在第5步。</li>
<li><strong>误区二：迷信“秘方特效方”。</strong>中医的核心是辨证论治——同一个病不同证型用不同方。脱离辨证谈方子，学到的只是碎片。</li>
<li><strong>误区三：只看视频不动手。</strong>看老师讲得头头是道，自己做题一片空白。诊断和方剂的掌握必须靠输出（做题、默写方歌）闭环。</li>
<li><strong>误区四：基础理论当“玄学”读。</strong>阴阳五行是古人建立的分类与推演模型，考试和临床都在考“怎么用模型推演”，不是考信仰。</li>
</ul>`,
        ],
      },
      {
        id: "gongju", h2: "边学边用的免费工具",
        html: [
          `<ul>
<li>学基础理论时：<a href="${SITE}${E}practice?subjectId=jichu">中医基础理论章节练习</a>（263题，按阴阳/五行/藏象/气血津液/病因/防治原则分章）</li>
<li>学中药时：<a href="${SITE}${Z}herb">中药库查询</a>对照记忆功效主治，配<a href="${SITE}${E}practice?subjectId=zhongyao">中药学题库</a>（612题）</li>
<li>学方剂时：<a href="${SITE}${Z}formula">方剂库查询</a>看组成与主治，配<a href="${SITE}${E}practice?subjectId=fangji">方剂学题库</a>（198题）</li>
<li>每日固定：做<a href="${SITE}${E}daily">每日一练</a>保持手感，错题进<a href="${SITE}${E}wrong">错题本</a>定期清零</li>
</ul>`,
        ],
      },
    ],
    tryLinks: [["开始中医基础理论学习（网页免费）", `${SITE}${E}practice?subjectId=jichu`, true], ["看中医自学总路线", `${SITE}/zixue/zhongyi-zixue-luxian.html`]],
    faq: [
      { q: "完全零基础，第一本书看什么？", a: "选一本《中医基础理论》教材（规划教材即可）打底，配合章节练习做题检验。不要直接读《黄帝内经》原文。" },
      { q: "自学中医要多久？", a: "过完四大基础（理论/诊断/中药/方剂）认真学约需6-12个月；入门框架（基础理论一科）约2-3个月。" },
      { q: "学中医能给自己看病吗？", a: "自学用于理解身体和养生知识可以，但诊断用药涉及安全，请以正规医疗机构为准。" },
    ],
    related: [["中医自学路线总览", "/zixue/zhongyi-zixue-luxian.html"], ["中医基础理论怎么学", "/zixue/zhongyi-jichu-lilun-zenme-xue.html"], ["中医诊断学习", "/zixue/zhongyi-zhenduan-xuexi.html"], ["中医错题复习方法", "/zixue/zhongyi-cuoti-fuxi.html"]],
    clusterNavTitle: "中医自学系列",
    clusterNav: [
      ["自学路线总览", `${SITE}/zixue/zhongyi-zixue-luxian.html`],
      ["基础理论怎么学", `${SITE}/zixue/zhongyi-jichu-lilun-zenme-xue.html`],
      ["中药怎么记", `${SITE}/zixue/zhongyao-zenme-ji.html`],
      ["方剂怎么学", `${SITE}/zixue/fangji-zenme-xue.html`],
      ["经络怎么学", `${SITE}/zixue/jingluo-zenme-xue.html`],
      ["中医诊断学习", `${SITE}/zixue/zhongyi-zhenduan-xuexi.html`],
      ["伤寒论学习方法", `${SITE}/zixue/shanghanlun-xuexi-fangfa.html`],
      ["黄帝内经学习方法", `${SITE}/zixue/huangdineijing-xuexi-fangfa.html`],
      ["错题复习方法", `${SITE}/zixue/zhongyi-cuoti-fuxi.html`],
    ],
  },
  {
    path: "/zixue/zhongyi-jichu-lilun-zenme-xue.html",
    crumb: "中医基础理论怎么学",
    title: "中医基础理论怎么学？阴阳五行藏象的学习方法与做题检验_言道国学",
    desc: "中医基础理论怎么学：阴阳五行不是玄学是推演工具，藏象是功能模型。分模块学习法+每章做题检验+263道免费章节练习，把“看懂”变成“会用”。",
    keywords: "中医基础理论怎么学,阴阳五行,藏象学说,气血津液,中医基础理论学习方法",
    h1: "中医基础理论怎么学：分模块攻克法",
    lead: "中医基础理论是整个中医的“操作系统”。它的难点不在记忆量，而在概念之间的关系——阴阳五行、藏象、气血津液是一个互相调用的体系，孤立背诵必然碎片化。",
    sections: [
      {
        id: "mokuai", h2: "按模块拆开学（附题量分布）",
        html: [
          `<table><tr><th>模块</th><th>核心内容</th><th>学习要点</th></tr>
<tr><td>阴阳学说</td><td>对立制约、互根互用、消长转化</td><td>会用阴阳解释生理病理，而非背定义</td></tr>
<tr><td>五行学说</td><td>生克乘侮、五行归类</td><td>画五行图推演传变方向</td></tr>
<tr><td>藏象学说</td><td>五脏六腑奇恒之腑的功能系统</td><td>重点：五脏各自的生理特性与外在联系</td></tr>
<tr><td>气血津液</td><td>生成、运行、功能与关系</td><td>气与血的关系是高频考点</td></tr>
<tr><td>病因病机</td><td>六淫、七情、痰饮瘀血</td><td>六淫各自的性质与致病特点</td></tr>
<tr><td>防治原则</td><td>治则治法、正治反治</td><td>结合案例理解“急则治标"</td></tr></table>`,
        ],
      },
      {
        id: "fangfa", h2: "三个真正有效的学习方法",
        html: [
          `<h3>1. 概念卡片+自述</h3><p>每学完一节，合上书用自己的话把概念讲一遍（费曼法）。讲不出来的地方就是没懂的地方。</p>`,
          `<h3>2. 关系图代替线性笔记</h3><p>藏象学说画“五脏关系图”：心-肺、脾-胃、肝-肾……用箭头标气血津液的走向。基础理论的考题几乎都在考“关系”。</p>`,
          `<h3>3. 章节做题闭环</h3><p>每章学完立刻做对应章节练习，错题回教材定位原句。做题是把“看懂”变成“会用”的唯一捷径。</p>`,
        ],
      },
      {
        id: "changjian", h2: "高频易混点提醒",
        html: [
          `<ul>
<li>阴阳的“互根”与“对立”：互根讲依存（无阳则无阴），对立讲制约，答题先分清问的是哪个关系。</li>
<li>五行“相乘”与“相侮”：乘是过度克制（顺序异常加深），侮是反向克制（反克）。方向是判别关键。</li>
<li>藏象的“脾主运化”不等于西医解剖的脾——藏象是功能系统模型，千万别拿解剖对号入座。</li>
</ul>`,
        ],
      },
    ],
    tryLinks: [["做基础理论章节练习（263题免费）", `${SITE}${E}practice?subjectId=jichu`, true], ["查中医典籍原文", `${SITE}${Z}classic`]],
    faq: [
      { q: "中医基础理论要看教材还是看讲解视频？", a: "教材打底+视频辅助理解，但闭环必须靠做题。只看视频会产生“都懂了”的错觉。" },
      { q: "阴阳五行背不下来怎么办？", a: "别背定义，改为推演练习：拿五行图做“肝病传脾”这类传变推演题，做完20道自然记住关系。" },
      { q: "学完基础理论下一步学什么？", a: "中医诊断学。诊断学直接调用基础理论的概念（脏腑辨证），是最好的复习+应用。" },
    ],
    related: [["中医怎么入门", "/zixue/zhongyi-zenme-rumen.html"], ["中医诊断学习", "/zixue/zhongyi-zhenduan-xuexi.html"], ["中医自学路线总览", "/zixue/zhongyi-zixue-luxian.html"]],
    clusterNavTitle: "中医自学系列",
    clusterNav: [
      ["中医怎么入门", `${SITE}/zixue/zhongyi-zenme-rumen.html`],
      ["自学路线总览", `${SITE}/zixue/zhongyi-zixue-luxian.html`],
      ["中药怎么记", `${SITE}/zixue/zhongyao-zenme-ji.html`],
      ["方剂怎么学", `${SITE}/zixue/fangji-zenme-xue.html`],
      ["中医诊断学习", `${SITE}/zixue/zhongyi-zhenduan-xuexi.html`],
      ["错题复习方法", `${SITE}/zixue/zhongyi-cuoti-fuxi.html`],
    ],
  },
  {
    path: "/zixue/zhongyao-zenme-ji.html",
    crumb: "中药怎么记",
    title: "中药怎么记？功效分类记忆法+高频考点+612道免费题库_言道国学",
    desc: "中药怎么记不枯燥？按功效分类成块记忆、性味归经联想、十八反十九畏必背，配合612道中药学免费题库按章检验，附中药库随时查阅。",
    keywords: "中药怎么记,中药学记忆方法,中药功效分类,十八反十九畏,中药学题库",
    h1: "中药怎么记：分类块状记忆法",
    lead: "中药学是记忆量最大的一科（常用中药数百味），但零散背诵是最低效的。中药知识的组织方式本身就是“按功效分类”——顺着这个结构记，就是块状记忆。",
    sections: [
      {
        id: "fenlei", h2: "第一原则：按功效分类，一类一块地记",
        html: [
          `<p>先把药分成大类：解表药、清热药、泻下药、祛风湿药、化湿药、利水渗湿药、温里药、理气药、消食药、止血药、活血化瘀药、化痰止咳平喘药、安神药、补虚药……每一类内部再抓“代表药+共同功效+各自特长”。</p>`,
          `<p>例如解表药分辛温（麻黄、桂枝、紫苏、生姜……发散风寒）与辛凉（薄荷、桑叶、菊花……疏散风热）。记住“类功效”，再记“每味药的差异点”，记忆量立刻从“几百个孤立条目”降为“十几个块+差异点”。</p>`,
        ],
      },
      {
        id: "xingwei", h2: "性味归经：用联想代替硬背",
        html: [
          `<ul>
<li>辛能散能行（解表行气药多辛）、甘能补能缓（补虚药多甘）、酸能收能涩（收涩药多酸）、苦能泄能燥（清热燥湿药多苦）、咸能软坚泻下。</li>
<li>归经联想：治咳喘多归肺经、治失眠多归心经、疏肝药多归肝经。功效与归经互相印证，记一个等于记两个。</li>
</ul>`,
          `<div class="note">性味归经的意义是“解释功效”和“指导配伍”，考试常给功效反推药性。学的时候多问一句：“这个功效为什么是这个性味？"</div>`,
        ],
      },
      {
        id: "jinji", h2: "必背硬表：十八反十九畏",
        html: [
          `<p>配伍禁忌是绝对考点：十八反（乌头反半夏瓜蒌贝母白蔹白及；甘草反甘遂大戟海藻芫花；藜芦反人参沙参丹参玄参细辛芍药）与十九畏必须记到“给两个药名能立刻判断能否同用”的程度。用口诀记忆后再做题验证，<a href="${SITE}${E}practice?subjectId=zhongyao">中药学题库</a>里有大量配伍判断题。</p>`,
        ],
      },
      {
        id: "lianzhu", h2: "记忆闭环：查+练结合",
        html: [
          `<p>记不牢的药立刻查<a href="${SITE}${Z}herb">中药库</a>看功效主治原文，然后做题检验。推荐节奏：每天一个功效类（记块）→ 立即做该章节题（验证）→ 错题进错题本次日重做（巩固）。</p>`,
        ],
      },
    ],
    tryLinks: [["做中药学题库（612题免费）", `${SITE}${E}practice?subjectId=zhongyao`, true], ["查中药库", `${SITE}${Z}herb`]],
    faq: [
      { q: "中药学要一味一味背吗？", a: "不要。按功效分类块状记忆+每味药只记差异点，效率是孤立背诵的数倍。" },
      { q: "多久能记完常用中药？", a: "按每日一类的节奏，约6-8周可完成一轮记忆，之后靠做题和错题复习巩固。" },
      { q: "记了就忘怎么办？", a: "正常现象。用间隔复习：错题本+每日一练滚动重现，三轮之后转为长期记忆。" },
    ],
    related: [["方剂怎么学", "/zixue/fangji-zenme-xue.html"], ["中医怎么入门", "/zixue/zhongyi-zenme-rumen.html"], ["错题复习方法", "/zixue/zhongyi-cuoti-fuxi.html"]],
    clusterNavTitle: "中医自学系列",
    clusterNav: [
      ["中医怎么入门", `${SITE}/zixue/zhongyi-zenme-rumen.html`],
      ["基础理论怎么学", `${SITE}/zixue/zhongyi-jichu-lilun-zenme-xue.html`],
      ["方剂怎么学", `${SITE}/zixue/fangji-zenme-xue.html`],
      ["经络怎么学", `${SITE}/zixue/jingluo-zenme-xue.html`],
      ["自学路线总览", `${SITE}/zixue/zhongyi-zixue-luxian.html`],
    ],
  },
  {
    path: "/zixue/fangji-zenme-xue.html",
    crumb: "方剂怎么学",
    title: "方剂怎么学？君臣佐使组方逻辑+分类记忆+198道免费题_言道国学",
    desc: "方剂怎么学才不乱？掌握君臣佐使组方结构，按剂类分块记忆（解表/清热/补益/理血……），核心方记“结构+加减”，配198道方剂学免费题库与方剂库查询。",
    keywords: "方剂怎么学,方剂学记忆,君臣佐使,方剂学题库,方歌记忆",
    h1: "方剂怎么学：先懂结构，再记组成",
    lead: "方剂学的误区是“背方歌”。方歌是结果不是起点——理解了组方逻辑（治法→君臣佐使），方歌只是把已经理解的东西押韵化。",
    sections: [
      {
        id: "jiegou", h2: "第一步：用“君臣佐使”拆方",
        html: [
          `<p>任何一首方子都能拆成四层：<strong>君药</strong>（针对主病主证）、<strong>臣药</strong>（辅助君药/针对兼证）、<strong>佐药</strong>（治疗次要症状/制约毒性/反佐）、<strong>使药</strong>（引经/调和）。</p>`,
          `<p>拿麻黄汤练习：麻黄发汗解表为君，桂枝助麻黄发汗为臣，杏仁降气平喘为佐，炙甘草调和为使。拆完这首方，你不仅记住了四味药，还理解了“为什么是这四味”。</p>`,
        ],
      },
      {
        id: "leibie", h2: "第二步：按剂类分块记",
        html: [
          `<table><tr><th>剂类</th><th>代表方</th><th>核心逻辑</th></tr>
<tr><td>解表剂</td><td>麻黄汤/桂枝汤/银翘散</td><td>辛温vs辛凉，看风寒风热</td></tr>
<tr><td>和解剂</td><td>小柴胡汤</td><td>和解少阳，枢机之剂</td></tr>
<tr><td>清热剂</td><td>白虎汤/黄连解毒汤</td><td>清气分/清脏腑/清虚热分位</td></tr>
<tr><td>泻下剂</td><td>大承气汤</td><td>寒下/温下/润下</td></tr>
<tr><td>温里剂</td><td>理中丸/四逆汤</td><td>温中祛寒/回阳救逆</td></tr>
<tr><td>补益剂</td><td>四君子汤/四物汤</td><td>补气/补血/气血双补</td></tr>
<tr><td>理血剂</td><td>血府逐瘀汤</td><td>活血祛瘀/止血</td></tr>
<tr><td>祛湿剂</td><td>五苓散</td><td>利水渗湿/温化水湿</td></tr></table>`,
          `<p>每记一方必带三问：治什么证？君药是谁？加减变化对应什么病机？——这就是考试的考法。</p>`,
        ],
      },
      {
        id: "jiange", h2: "第三步：记“药对”与“加减”",
        html: [
          `<p>方剂加减是高频考点，而加减的本质是“药对替换”：气虚重则加黄芪，血虚重则加当归、熟地。把常见加减整理成对照表（如桂枝汤→桂枝加葛根汤治项背强），记忆负担大幅下降。</p>`,
        ],
      },
      {
        id: "gongju", h2: "查+练闭环",
        html: [
          `<p>拆不明白的方子去<a href="${SITE}${Z}formula">方剂库</a>查组成、功用、主治原文；每学一个剂类做<a href="${SITE}${E}practice?subjectId=fangji">方剂学题库</a>对应章节（共198题），错题次日重做。</p>`,
        ],
      },
    ],
    tryLinks: [["做方剂学题库（198题免费）", `${SITE}${E}practice?subjectId=fangji`, true], ["查方剂库", `${SITE}${Z}formula`]],
    faq: [
      { q: "方歌要不要背？", a: "要，但放在理解组方结构之后背。理解后的方歌是索引，未理解的方歌是咒语。" },
      { q: "方剂和中药哪个先学？", a: "先中药后方剂。方剂是中药的应用组合，没有中药功效基础，拆方无从谈起。" },
      { q: "方剂学题量够练吗？", a: "198道按剂类-功效分章（解表/和解/清热/泻下/温里/补益/理血/祛湿……），配合方剂库可完整覆盖一轮学习。" },
    ],
    related: [["中药怎么记", "/zixue/zhongyao-zenme-ji.html"], ["中医怎么入门", "/zixue/zhongyi-zenme-rumen.html"], ["伤寒论学习方法", "/zixue/shanghanlun-xuexi-fangfa.html"]],
    clusterNavTitle: "中医自学系列",
    clusterNav: [
      ["中医怎么入门", `${SITE}/zixue/zhongyi-zenme-rumen.html`],
      ["基础理论怎么学", `${SITE}/zixue/zhongyi-jichu-lilun-zenme-xue.html`],
      ["中药怎么记", `${SITE}/zixue/zhongyao-zenme-ji.html`],
      ["经络怎么学", `${SITE}/zixue/jingluo-zenme-xue.html`],
      ["自学路线总览", `${SITE}/zixue/zhongyi-zixue-luxian.html`],
    ],
  },
  {
    path: "/zixue/jingluo-zenme-xue.html",
    crumb: "经络怎么学",
    title: "经络怎么学？十二经脉循行方向歌诀+腧穴定位+161道针灸题_言道国学",
    desc: "经络怎么学最快？先记十二经脉循行总方向歌诀，再逐条走行+交接规律，腧穴按分部定位记忆，配针灸学161道免费题库和经络循行图工具。",
    keywords: "经络怎么学,十二经脉循行,腧穴定位,经络记忆方法,针灸学题库",
    h1: "经络怎么学：从总方向到逐经走行",
    lead: "经络学最大的坑是“逐条背循行原文”。正确路径是：先立总框架（十二经流注次序+总方向规律），再填每条经的细节，最后落到腧穴定位。",
    sections: [
      {
        id: "zongkuangjia", h2: "第一步：十二经流注总框架",
        html: [
          `<p>十二经脉首尾相接、循环贯注：肺→大肠→胃→脾→心→小肠→膀胱→肾→心包→三焦→胆→肝→复归于肺。先把这个“环”背熟，任何一条经记不清时可以顺着环推导它的表里关系与交接部位。</p>`,
          `<div class="note">总方向规律：手三阴从胸走手，手三阳从手走头，足三阳从头走足，足三阴从足走腹（胸）。这四句能定位所有经的大走向，是推导题的解题基石。</div>`,
        ],
      },
      {
        id: "xunxing", h2: "第二步：逐经走行的关键点",
        html: [
          `<p>每条经不必全文背诵循行，抓“起止+过哪儿+络什么脏腑”三个要素。例如手阳明大肠经：起食指商阳→上行过上肢外侧前缘→肩→颈部→入下齿→夹口鼻——考“入下齿”这种特征点比全文背诵高效得多。</p>`,
          `<p>学每条经时对照<a href="${SITE}${Z}meridian">经络循行图</a>可视化走一遍，图+文的记忆远胜纯文字。</p>`,
        ],
      },
      {
        id: "shuxue", h2: "第三步：腧穴定位与特定穴",
        html: [
          `<ul>
<li><strong>定位</strong>：按“分部+骨度分寸”记（如内关在腕横纹上2寸，两筋之间）。骨度分寸表是定位的地基，先背表再记穴。</li>
<li><strong>特定穴</strong>：五输穴（井荥输经合）、原穴、络穴、募穴、下合穴——针灸学考试的核心之一。用表格横向对比记忆。</li>
<li><strong>主治</strong>：先记“共性”（某经腧穴都能治本经病）再看“个性”（特效穴如至阴矫正胎位）。</li>
</ul>`,
        ],
      },
      {
        id: "lianzhu", h2: "做题闭环",
        html: [
          `<p>针灸学共161道题，覆盖经络循行、腧穴定位、主治与刺灸法。每学完一经一穴群做对应章节，用<a href="${SITE}${E}wrong">错题本</a>收集定位错误（最常见的失分点）反复重做。</p>`,
        ],
      },
    ],
    tryLinks: [["做针灸学题库（161题免费）", `${SITE}${E}practice?subjectId=zhenjiu`, true], ["看经络循行图", `${SITE}${Z}meridian`]],
    faq: [
      { q: "经络循行背原文吗？", a: "不建议入门阶段背原文。先记流注次序+总方向四句+每经特征点，原文留给深入学习阶段。" },
      { q: "腧穴要记多少个？", a: "考试重点是常用穴（约150-200个）+特定穴规律。先记特定穴体系，再按经扩充。" },
      { q: "有经络图工具吗？", a: "言道国学网页版有经络循行图可对照学习，APP内还有更多细节与穴位定位说明。" },
    ],
    related: [["中医诊断学习", "/zixue/zhongyi-zhenduan-xuexi.html"], ["中医怎么入门", "/zixue/zhongyi-zenme-rumen.html"], ["自学路线总览", "/zixue/zhongyi-zixue-luxian.html"]],
    clusterNavTitle: "中医自学系列",
    clusterNav: [
      ["中医怎么入门", `${SITE}/zixue/zhongyi-zenme-rumen.html`],
      ["基础理论怎么学", `${SITE}/zixue/zhongyi-jichu-lilun-zenme-xue.html`],
      ["中药怎么记", `${SITE}/zixue/zhongyao-zenme-ji.html`],
      ["方剂怎么学", `${SITE}/zixue/fangji-zenme-xue.html`],
      ["自学路线总览", `${SITE}/zixue/zhongyi-zixue-luxian.html`],
    ],
  },
  {
    path: "/zixue/shanghanlun-xuexi-fangfa.html",
    crumb: "伤寒论学习方法",
    title: "伤寒论学习方法：六经辨证框架→方证对应→条文精读_言道国学",
    desc: "伤寒论怎么学？先立六经辨证总框架（太阳阳明少阳太阴少阴厥阴），再学方证对应（桂枝汤证/麻黄汤证），最后条文精读，附伤寒论原文查阅工具。",
    keywords: "伤寒论学习方法,六经辨证,方证对应,伤寒论怎么读,经方学习",
    h1: "伤寒论学习方法：框架先行，条文后读",
    lead: "《伤寒论》是辨证论治体系的源头，但直接按条文顺序硬读是最低效的学法。先立六经框架，把398条装进六个抽屉，每一条条文都有位置可放。",
    sections: [
      {
        id: "liujing", h2: "第一步：六经辨证总框架",
        html: [
          `<p>六经是六个“病位+病性”的组合：太阳（表/阳）、阳明（里/阳/胃肠燥热）、少阳（半表半里/阳）、太阴（里/阴/脾胃虚寒）、少阴（表里俱虚/阴/心肾）、厥阴（寒热错杂/阴）。</p>`,
          `<p>先画出“阳病三经（表-半表半里-里）→阴病三经”的传变地图，理解每经的提纲证（如太阳病脉浮头项强痛而恶寒、少阳病口苦咽干目眩）。框架立住后，条文不再是一盘散沙。</p>`,
        ],
      },
      {
        id: "fangzheng", h2: "第二步：方证对应地学",
        html: [
          `<p>《伤寒论》的灵魂是“有是证用是方”。按方证学习比按条文顺序学习高效：桂枝汤证（发热汗出恶风脉缓）、麻黄汤证（恶寒无汗身痛脉紧）、小柴胡汤证（往来寒热胸胁苦满）……每个方证记“证候群→病机→方药”三件套。</p>`,
          `<p>学方证同时复习中药与方剂——经方的君臣佐使结构极其严谨（如桂枝汤桂芍等量配姜枣草），是最好的方剂学案例库。</p>`,
        ],
      },
      {
        id: "tiaowen", h2: "第三步：条文精读的正确姿势",
        html: [
          `<ul>
<li>第一遍通读不求全懂，标记“方证明确”的核心条文（约百余条）精读。</li>
<li>读条文注意“但见一证便是，不必悉具”——抓主证而非全证。</li>
<li>注家观点（成无己、柯琴、尤在泾……）在有一年以上基础后再引入，入门阶段先立足原文。</li>
</ul>`,
          `<p>读原文用<a href="${SITE}${Z}shanghan">伤寒论原文查阅工具</a>逐条对照，遇到方证回到第二步的三件套检验自己能否复述。</p>`,
        ],
      },
      {
        id: "jiechu", h2: "学习伤寒论的前置基础",
        html: [
          `<p>最起码完成：中医基础理论（六经概念依赖阴阳表里）+ 中药（经方用药的性味功效）+ 方剂学基础（组方结构）。诊断学能帮你理解“证候群”的识别。检验前置基础的快方式：做一轮<a href="${SITE}${E}practice">四科免费题库</a>。</p>`,
        ],
      },
    ],
    tryLinks: [["查阅伤寒论原文", `${SITE}${Z}shanghan`, true], ["先补四大基础（免费做题）", `${SITE}${E}practice`]],
    faq: [
      { q: "零基础能直接学伤寒论吗？", a: "不推荐。缺基础理论概念时条文基本读不懂，容易半途而废。建议先过四大基础。" },
      { q: "伤寒论要背多少条文？", a: "核心方证条文（百余条）达到能复述证-机-方即可，其余条文理解框架归属。" },
      { q: "学伤寒论对考试有用吗？", a: "有。六经辨证与方证对应是中医诊断与方剂的临床思维底座，也是医考案例题的底层逻辑。" },
    ],
    related: [["黄帝内经学习方法", "/zixue/huangdineijing-xuexi-fangfa.html"], ["方剂怎么学", "/zixue/fangji-zenme-xue.html"], ["中医自学路线总览", "/zixue/zhongyi-zixue-luxian.html"]],
    clusterNavTitle: "中医自学系列",
    clusterNav: [
      ["黄帝内经学习方法", `${SITE}/zixue/huangdineijing-xuexi-fangfa.html`],
      ["中医怎么入门", `${SITE}/zixue/zhongyi-zenme-rumen.html`],
      ["中药怎么记", `${SITE}/zixue/zhongyao-zenme-ji.html`],
      ["方剂怎么学", `${SITE}/zixue/fangji-zenme-xue.html`],
      ["自学路线总览", `${SITE}/zixue/zhongyi-zixue-luxian.html`],
    ],
  },
  {
    path: "/zixue/huangdineijing-xuexi-fangfa.html",
    crumb: "黄帝内经学习方法",
    title: "黄帝内经学习方法：选读章节+与教材对照读+原文工具_言道国学",
    desc: "黄帝内经怎么学？素问灵枢各81篇不必通读，先精选核心篇（上古天真论/四气调神/阴阳应象/藏象类），与中医基础理论教材对照读，附内经原文查阅工具。",
    keywords: "黄帝内经学习方法,内经怎么读,素问灵枢,上古天真论,阴阳应象大论",
    h1: "黄帝内经学习方法：选读+对照，不通读",
    lead: "《黄帝内经》162篇（素问81+灵枢81）是中医理论的源头，但“通读”既不必要也不现实。正确的学法是：精选篇目、带着教材框架对照读、读出“概念的源头”。",
    sections: [
      {
        id: "xuanpian", h2: "入门精选篇目（按学习顺序）",
        html: [
          `<table><tr><th>篇目</th><th>学什么</th></tr>
<tr><td>上古天真论</td><td>养生总纲、肾气与生命周期（女七男八）</td></tr>
<tr><td>四气调神大论</td><td>四时养生、治未病思想的源头</td></tr>
<tr><td>阴阳应象大论</td><td>阴阳学说的经典表述（“治病必求于本”）</td></tr>
<tr><td>金匮真言论/五脏生成</td><td>五行归类、五脏与五方五味五色对应</td></tr>
<tr><td>灵兰秘典论/六节藏象论</td><td>藏象学说的核心篇章（“心者君主之官”）</td></tr>
<tr><td>经脉（灵枢）</td><td>经络学说的源头，学针灸时对照读</td></tr></table>`,
          `<p>读法：每篇先看白话通解，再回到原文逐句，标记“被后世教材直接继承的句子”——这就是内经与基础理论教材的连接点。</p>`,
        ],
      },
      {
        id: "duizhao", h2: "对照读：内经是“源头”，教材是“地图”",
        html: [
          `<p>学藏象时读《灵兰秘典论》，会发现教材上“心主血脉、肺主宣发”的每一条都能在原文找到表述雏形。反过来：教材给了你体系地图，内经给你概念的原始语境（为什么这样定义、古人如何论证）。</p>`,
          `<p>建议每学完基础理论一个模块，回读对应内经篇章一次。两三轮之后，理论不再是干条目，而是有源头的活水。</p>`,
        ],
      },
      {
        id: "fangfa", h2: "三个提醒",
        html: [
          `<ul>
<li><strong>不要用内经替代教材入门</strong>——语言和概念密度决定了它是“回读型”经典。</li>
<li><strong>版本选择</strong>：选带注释与白话的版本，纯古本不适合自学起步。</li>
<li><strong>灵枢经络篇</strong>等专论按需选读，不必按篇号顺读。</li>
</ul>`,
        ],
      },
    ],
    tryLinks: [["查阅中医典籍（含内经类）", `${SITE}${Z}classic`, true], ["先学基础理论（免费做题）", `${SITE}${E}practice?subjectId=jichu`]],
    faq: [
      { q: "黄帝内经要全部读完吗？", a: "不需要。精选20篇左右核心篇精读，其余按专题选读，效果远胜通读。" },
      { q: "什么时候开始读内经？", a: "学完中医基础理论之后开始选读最佳，框架在先，原文才有位置可放。" },
      { q: "内经和伤寒论先读哪个？", a: "内经理论性强，伤寒论临床性强。建议先内经选读（配合基础理论），再进入伤寒方证学习。" },
    ],
    related: [["伤寒论学习方法", "/zixue/shanghanlun-xuexi-fangfa.html"], ["中医基础理论怎么学", "/zixue/zhongyi-jichu-lilun-zenme-xue.html"], ["中医怎么入门", "/zixue/zhongyi-zenme-rumen.html"]],
    clusterNavTitle: "中医自学系列",
    clusterNav: [
      ["伤寒论学习方法", `${SITE}/zixue/shanghanlun-xuexi-fangfa.html`],
      ["中医怎么入门", `${SITE}/zixue/zhongyi-zenme-rumen.html`],
      ["基础理论怎么学", `${SITE}/zixue/zhongyi-jichu-lilun-zenme-xue.html`],
      ["经络怎么学", `${SITE}/zixue/jingluo-zenme-xue.html`],
      ["自学路线总览", `${SITE}/zixue/zhongyi-zixue-luxian.html`],
    ],
  },
  {
    path: "/zixue/zhongyi-zhenduan-xuexi.html",
    crumb: "中医诊断学习",
    title: "中医诊断学习：四诊+辨证体系学习法，213道免费诊断题_言道国学",
    desc: "中医诊断学怎么学？四诊（望闻问切）先分项过关，辨证（八纲→脏腑→气血津液）层层递进，脏腑辨证129题是重中之重，配213道免费章节练习。",
    keywords: "中医诊断学,四诊,八纲辨证,脏腑辨证,舌诊脉诊,中医诊断学习",
    h1: "中医诊断学习：从四诊到辨证的递进学法",
    lead: "诊断学是中医的“应用层”——基础理论在这里第一次被用来解决实际问题。它的学习必须分层递进：先四诊分项过关，再学辨证体系，最后做“证候识别”的综合训练。",
    sections: [
      {
        id: "sizhen", h2: "第一层：四诊分项过关",
        html: [
          `<table><tr><th>诊法</th><th>入门重点</th></tr>
<tr><td>望诊</td><td>望神（得神/失神/假神）、望色（五色主病）、望形态</td></tr>
<tr><td>舌诊</td><td>舌质（淡红/红/绛/紫）×舌苔（白/黄/腻/燥）的组合意义</td></tr>
<tr><td>闻诊</td><td>声音（谵语/郑声）、气味</td></tr>
<tr><td>问诊</td><td>十问歌顺序，寒热汗问诊要点</td></tr>
<tr><td>切诊</td><td>脉诊二十八脉先掌握浮沉迟数滑涩等常考脉</td></tr></table>`,
          `<p>舌诊和脉诊是难点也是考点富矿：舌诊建议做“舌象卡片”（舌质×舌苔组合→主证），脉诊先记“脉象特征→主病”对（如浮脉主表、沉脉主里）。</p>`,
        ],
      },
      {
        id: "bianzheng", h2: "第二层：辨证体系层层递进",
        html: [
          `<ol>
<li><strong>八纲辨证</strong>（表里寒热虚实阴阳）——总纲，先掌握每一纲的典型证候表现。</li>
<li><strong>脏腑辨证</strong>——重头戏：心/肝/脾/肺/肾各自的证型（如心气虚、肝阳上亢、脾气虚、肾阳虚），每个证型记“症状群→病机→治法方向”。</li>
<li><strong>气血津液辨证</strong>——气虚/气滞/血虚/血瘀/痰饮/津亏的识别。</li>
</ol>`,
          `<div class="note">脏腑辨证是考试与临床的核心，诊断类题目中占比最大（约六成），值得投入最多时间。</div>`,
        ],
      },
      {
        id: "zonghe", h2: "第三层：综合案例训练",
        html: [
          `<p>前两层过关后，做“给病例→判断证型”的综合题。方法：读题干圈出“症状关键词”（如五心烦热、潮热盗汗→阴虚），逐步排除干扰项。这个阶段错题本价值最大——每个错题暴露的都是“证候识别”的具体盲区。</p>`,
        ],
      },
    ],
    tryLinks: [["做诊断学题库（213题免费）", `${SITE}${E}practice?subjectId=zhenduan`, true], ["每日一练保持手感", `${SITE}${E}daily`]],
    faq: [
      { q: "诊断学和基础理论哪个难？", a: "诊断学更“综合”——它调用基础理论的概念做判断。学好基础理论后诊断会顺很多，反之会处处卡壳。" },
      { q: "脉诊自学能学会吗？", a: "考试层面（脉象特征→主病）完全可以自学掌握；手感层面的脉诊需要实践，入门以应试掌握为主。" },
      { q: "脏腑辨证证型太多记不住？", a: "按“每脏的虚证实证”分组记（如肾：肾阳虚/肾阴虚/肾气不固/肾不纳气），组内对比记忆，量立刻减半。" },
    ],
    related: [["中医基础理论怎么学", "/zixue/zhongyi-jichu-lilun-zenme-xue.html"], ["中医怎么入门", "/zixue/zhongyi-zenme-rumen.html"], ["错题复习方法", "/zixue/zhongyi-cuoti-fuxi.html"]],
    clusterNavTitle: "中医自学系列",
    clusterNav: [
      ["中医怎么入门", `${SITE}/zixue/zhongyi-zenme-rumen.html`],
      ["基础理论怎么学", `${SITE}/zixue/zhongyi-jichu-lilun-zenme-xue.html`],
      ["中药怎么记", `${SITE}/zixue/zhongyao-zenme-ji.html`],
      ["方剂怎么学", `${SITE}/zixue/fangji-zenme-xue.html`],
      ["自学路线总览", `${SITE}/zixue/zhongyi-zixue-luxian.html`],
    ],
  },
  {
    path: "/zixue/zhongyi-zixue-luxian.html",
    crumb: "中医自学路线",
    title: "中医自学路线图：三阶段（入门/进阶/经典）+书目+题库+工具_言道国学",
    desc: "中医自学完整路线：三阶段规划——入门阶段（基础理论+做题）、进阶阶段（四科闭环+典籍）、深入阶段（伤寒内经典读）。每阶段配书单、免费题库与查阅工具。",
    keywords: "中医自学路线,中医学习计划,中医自学顺序,中医学习路线图,零基础学中医",
    h1: "中医自学路线图：三阶段规划",
    lead: "这是一张可以照着走的路线图：每一阶段有明确的学习目标、书目/工具和过关标准。完成一个阶段再进入下一个，不跳步。",
    sections: [
      {
        id: "jieduan1", h2: "入门阶段（约2-3个月）：立起框架",
        html: [
          `<p><strong>目标</strong>：掌握中医基础理论的概念体系，能用自己的话解释阴阳五行、藏象、气血津液。</p>`,
          `<ul>
<li>主线：中医基础理论教材（规划教材或优质白话读本）</li>
<li>每日：1-2节学习 + <a href="${SITE}${E}practice?subjectId=jichu">基础理论章节练习</a>对应章节</li>
<li>过关标准：263道基础理论题正确率稳定在70%以上</li>
</ul>`,
        ],
      },
      {
        id: "jieduan2", h2: "进阶阶段（约6-12个月）：四科闭环",
        html: [
          `<p><strong>目标</strong>：完成诊断、中药、方剂三科，形成“辨证→用药”的完整链条。</p>`,
          `<ul>
<li>中医诊断学：四诊+八纲+脏腑辨证，<a href="${SITE}${E}practice?subjectId=zhenduan">213道诊断题</a>闭环</li>
<li>中药学：按功效分类块状记忆，<a href="${SITE}${E}practice?subjectId=zhongyao">612道中药题</a>+<a href="${SITE}${Z}herb">中药库</a>查阅</li>
<li>方剂学：君臣佐使拆方，<a href="${SITE}${E}practice?subjectId=fangji">198道方剂题</a>+<a href="${SITE}${Z}formula">方剂库</a>对照</li>
<li>针灸经络（可选并行）：总方向歌诀+循行图，<a href="${SITE}${E}practice?subjectId=zhenjiu">161道针灸题</a></li>
<li>过关标准：四科累计1447题完成一轮，错题本清零</li>
</ul>`,
        ],
      },
      {
        id: "jieduan3", h2: "深入阶段（持续）：经典与临床思维",
        html: [
          `<ul>
<li><a href="${SITE}/zixue/huangdineijing-xuexi-fangfa.html">黄帝内经</a>：选读20篇核心，与教材对照读</li>
<li><a href="${SITE}/zixue/shanghanlun-xuexi-fangfa.html">伤寒论</a>：六经框架→方证对应→条文精读，配<a href="${SITE}${Z}shanghan">原文查阅工具</a></li>
<li>典籍拓展：<a href="${SITE}${Z}classic">22部中医典籍</a>随时查阅</li>
<li>此阶段开始做综合案例题，训练“证-机-方-药”完整推理链</li>
</ul>`,
        ],
      },
      {
        id: "jieou", h2: "每日节奏建议",
        html: [
          `<table><tr><th>时段</th><th>内容</th><th>时长</th></tr>
<tr><td>主学习</td><td>当前阶段主线内容</td><td>40-60分钟</td></tr>
<tr><td>做题</td><td><a href="${SITE}${E}daily">每日一练</a>+当日章节题</td><td>15-20分钟</td></tr>
<tr><td>复习</td><td><a href="${SITE}${E}wrong">错题本</a>重做昨日错题</td><td>10分钟</td></tr></table>`,
          `<p>节奏比强度重要：每天一小时坚持半年，胜过突击一周。看<a href="${SITE}${E}stats">学习统计</a>跟踪自己的进度曲线。</p>`,
        ],
      },
    ],
    tryLinks: [["从基础理论开始（263题免费）", `${SITE}${E}practice?subjectId=jichu`, true], ["看全部题库入口", `${SITE}${E}practice`]],
    faq: [
      { q: "自学中医可行吗？", a: "应试和知识框架层面完全可行——四科教材+1447道题+典籍工具可以闭环。涉及真实诊疗必须正规医疗渠道。" },
      { q: "每天只有1小时怎么安排？", a: "主学习40分钟+做题15分钟+错题复习10分钟，用网页版随时随地进行，半年可完成入门+进阶前半。" },
      { q: "路线图要严格按顺序吗？", a: "阶段间不要跳（诊断依赖基础理论，方剂依赖中药），阶段内的科目可按个人节奏微调。" },
    ],
    related: [["中医怎么入门", "/zixue/zhongyi-zenme-rumen.html"], ["医考免费题库总览", "/yikao/zhongyi-yikao-mianfei-tiku.html"], ["七政四余学习", "/qizheng-study/"]],
    clusterNavTitle: "中医自学系列（本页为总入口）",
    clusterNav: [
      ["中医怎么入门", `${SITE}/zixue/zhongyi-zenme-rumen.html`],
      ["基础理论怎么学", `${SITE}/zixue/zhongyi-jichu-lilun-zenme-xue.html`],
      ["中药怎么记", `${SITE}/zixue/zhongyao-zenme-ji.html`],
      ["方剂怎么学", `${SITE}/zixue/fangji-zenme-xue.html`],
      ["经络怎么学", `${SITE}/zixue/jingluo-zenme-xue.html`],
      ["中医诊断学习", `${SITE}/zixue/zhongyi-zhenduan-xuexi.html`],
      ["伤寒论学习方法", `${SITE}/zixue/shanghanlun-xuexi-fangfa.html`],
      ["黄帝内经学习方法", `${SITE}/zixue/huangdineijing-xuexi-fangfa.html`],
      ["错题复习方法", `${SITE}/zixue/zhongyi-cuoti-fuxi.html`],
    ],
  },
  {
    path: "/zixue/zhongyi-cuoti-fuxi.html",
    crumb: "中医错题复习",
    title: "中医错题复习方法：错题本+间隔复习+考点回归_言道国学",
    desc: "中医刷题错题怎么复习？错题本正确用法：错题→定位考点→回归教材→间隔重做。附免费错题本工具（自动收集、随时重做）与学习统计。",
    keywords: "中医错题复习,错题本怎么用,间隔复习,中医刷题方法,医考错题",
    h1: "中医错题复习：把错题变成得分点",
    lead: "刷题的价值不在做对多少，而在做错的题被如何处理。一套正确的错题流程，能让同样1000道题的有效学习量翻倍。",
    sections: [
      {
        id: "liucheng", h2: "错题处理四步流程",
        html: [
          `<ol>
<li><strong>标记</strong>：做错当场标记，不抄题不誊写（抄题是最浪费时间的环节）。</li>
<li><strong>定位考点</strong>：问自己“这道题考的是哪个知识点？"（如脏腑辨证·肾阳虚），把错题归类到考点而非按时间堆放。</li>
<li><strong>回归教材</strong>：翻到教材对应小节重读，把”症状群→病机“的推理链补完整——错题90%是概念链某处断了。</li>
<li><strong>间隔重做</strong>：隔1天、3天、7天各重做一次，三次全对才移出错题本。这就是间隔重复（spaced repetition）。</li>
</ol>`,
        ],
      },
      {
        id: "leixing", h2: "错题分型处理",
        html: [
          `<table><tr><th>错题类型</th><th>典型表现</th><th>处理方法</th></tr>
<tr><td>概念不清</td><td>"相乘“和”相侮“选反</td><td>回归基础理论重学该节，重做该章5-10题</td></tr>
<tr><td>记忆偏差</td><td>中药功效记串</td><td>查中药库对比易混药，做对比卡片</td></tr>
<tr><td>推理链断</td><td>证型判断在两个选项间犹豫</td><td>补”症状→病机→证型“三件套，写出来</td></tr>
<tr><td>粗心误读</td><td>题干”不属于“看成”属于"</td><td>读题划关键词，错两次以上单独标记警示</td></tr></table>`,
        ],
      },
      {
        id: "gongju", h2: "免费工具：错题自动收集",
        html: [
          `<p>言道国学网页版做题时错题自动进入<a href="${SITE}${E}wrong">错题本</a>，可随时按科目重做；<a href="${SITE}${E}stats">学习统计</a>能看各科正确率曲线，薄弱科目一目了然——这正好实现了上面四步里最费人工的“标记+归类”环节。</p>`,
        ],
      },
      {
        id: "jiecheng", h2: "错题复习节奏",
        html: [
          `<ul>
<li>每日：当日新错题定位考点（5-10分钟）</li>
<li>每周：本周错题整体重做一轮，未通过的进入下周</li>
<li>考前/阶段末：只刷错题本，比刷新题效率高得多</li>
</ul>`,
        ],
      },
    ],
    tryLinks: [["打开我的错题本（免费）", `${SITE}${E}wrong`, true], ["看学习统计", `${SITE}${E}stats`]],
    faq: [
      { q: "错题要抄下来吗？", a: "不需要。系统自动收集，你的时间应该花在“定位考点+回归教材”上，而不是誊写。" },
      { q: "错题多久重做一次？", a: "1天/3天/7天三连过是性价比最高的节奏，三次全对才移出。" },
      { q: "考前刷错题还是刷新题？", a: "错题优先。错题暴露的是你的盲区，刷新题只在盲区修复后才有边际价值。" },
    ],
    related: [["中医自学路线总览", "/zixue/zhongyi-zixue-luxian.html"], ["医考免费题库总览", "/yikao/zhongyi-yikao-mianfei-tiku.html"], ["中医诊断学习", "/zixue/zhongyi-zhenduan-xuexi.html"]],
    clusterNavTitle: "中医自学系列",
    clusterNav: [
      ["中医怎么入门", `${SITE}/zixue/zhongyi-zenme-rumen.html`],
      ["自学路线总览", `${SITE}/zixue/zhongyi-zixue-luxian.html`],
      ["基础理论怎么学", `${SITE}/zixue/zhongyi-jichu-lilun-zenme-xue.html`],
      ["中药怎么记", `${SITE}/zixue/zhongyao-zenme-ji.html`],
      ["中医诊断学习", `${SITE}/zixue/zhongyi-zhenduan-xuexi.html`],
    ],
  },
];

module.exports = pages;
