/** FINAL-17 第十三章：医考免费题库SEO（10页，页面必须直接进做题，不首先逼下载APP） */
const { SITE } = require("./template");

const E = "/zhongyi/exam/";

const pages = [
  {
    path: "/yikao/zhongyi-yikao-mianfei-tiku.html",
    crumb: "中医医考免费题库",
    title: "中医医考免费题库_1447题网页直接做_无需注册_言道国学",
    desc: "中医医考免费题库：1447道题覆盖中医基础理论263题、中医诊断学213题、中药学612题、方剂学198题、针灸学161题，网页版直接做题，无需注册、无需下载APP。",
    keywords: "中医医考免费题库,中医题库免费,医考刷题,中医考试题库,免费做题",
    h1: "中医医考免费题库（1447题，网页直接做）",
    lead: "五大科目、1447道题、章节/每日/错题/统计全功能——全部免费，网页打开就能做，不注册、不下APP、不看广告。",
    sections: [
      {
        id: "zonglan", h2: "题库总览（按科目直进）",
        html: [
          `<table><tr><th>科目</th><th>题量</th><th>章节结构</th><th>直接开始</th></tr>
<tr><td>中医基础理论</td><td>263题</td><td>阴阳学说/五行学说/藏象/六腑/气血津液/病因/防治原则</td><td><a href="${SITE}${E}practice?subjectId=jichu">开始练习</a></td></tr>
<tr><td>中医诊断学</td><td>213题</td><td>望诊/舌诊/闻诊/问诊/切诊/八纲辨证/脏腑辨证</td><td><a href="${SITE}${E}practice?subjectId=zhenduan">开始练习</a></td></tr>
<tr><td>中药学</td><td>612题</td><td>中药基本知识+按功效分类章节</td><td><a href="${SITE}${E}practice?subjectId=zhongyao">开始练习</a></td></tr>
<tr><td>方剂学</td><td>198题</td><td>按剂类-功效双级分类（解表/和解/清热/泻下/温里/补益/理血/祛湿……）</td><td><a href="${SITE}${E}practice?subjectId=fangji">开始练习</a></td></tr>
<tr><td>针灸学</td><td>161题</td><td>经络循行/腧穴定位/主治刺灸法</td><td><a href="${SITE}${E}practice?subjectId=zhenjiu">开始练习</a></td></tr></table>`,
        ],
      },
      {
        id: "gongneng", h2: "不只是题库：完整练习闭环",
        html: [
          `<ul>
<li><strong><a href="${SITE}${E}practice">章节练习</a></strong>：按科目→章节树选题，学哪练哪</li>
<li><strong><a href="${SITE}${E}daily">每日一练</a></strong>：每天自动组卷，保持手感</li>
<li><strong><a href="${SITE}${E}mock">模拟测试</a></strong>：整卷计时，检验阶段成果</li>
<li><strong><a href="${SITE}${E}wrong">错题本</a></strong>：错题自动收集，随时重做</li>
<li><strong><a href="${SITE}${E}stats">学习统计</a></strong>：各科正确率与进度曲线</li>
</ul>`,
          `<p>做题数据存在本地，下次打开接着练。想要跨设备同步和更多功能时再考虑APP，做题本身零门槛。</p>`,
        ],
      },
      {
        id: "changjing", h2: "适合谁用",
        html: [
          `<ul>
<li>中医类考试备考者（执业医师综合笔试基础科目、考研中医综合、在校课程考试）</li>
<li>自学中医者：与教材学习同步，章节即时检验</li>
<li>教学场景：课堂随练、课后作业（免注册，扫码即用）</li>
</ul>`,
          `<div class="note">本站题库按五大学科的基础与主干考点组织，适合打牢基础与日常练习；具体报考请以当年官方考试大纲为准。</div>`,
        ],
      },
    ],
    tryLinks: [["进入题库总入口（免费）", `${SITE}${E}practice`, true], ["每日一练", `${SITE}${E}daily`]],
    faq: [
      { q: "真的免费吗？有没有广告？", a: "基础题库与全部练习功能永久免费，全程无开屏、无弹窗、无插屏广告，做题不被打断。" },
      { q: "需要注册或下载APP吗？", a: "不需要。网页版打开即做，做题记录存本地。" },
      { q: "题库覆盖哪些科目？", a: "中医基础理论263题、中医诊断学213题、中药学612题、方剂学198题、针灸学161题，共1447题，按章节组织。" },
    ],
    related: [["中医自学路线总览", "/zixue/zhongyi-zixue-luxian.html"], ["中药学题库", "/yikao/zhongyaoxue-tiku.html"], ["章节练习说明", "/yikao/zhangjie-lianxi.html"], ["错题复习说明", "/yikao/cuoti-fuxi.html"]],
    clusterNavTitle: "医考题库系列",
    clusterNav: [
      ["中医执业医师免费题库", `${SITE}/yikao/zhongyi-zhiye-yishi-mianfei-tiku.html`],
      ["基础理论免费练习（263题）", `${SITE}/yikao/zhongyi-jichu-lilun-mianfei-lianxi.html`],
      ["中药学题库（612题）", `${SITE}/yikao/zhongyaoxue-tiku.html`],
      ["方剂题库（198题）", `${SITE}/yikao/fangji-tiku.html`],
      ["针灸题库（161题）", `${SITE}/yikao/zhenjiu-tiku.html`],
      ["中医诊断题库（213题）", `${SITE}/yikao/zhongyi-zhenduan-tiku.html`],
      ["每日练习", `${SITE}/yikao/meirian-lianxi.html`],
      ["章节练习", `${SITE}/yikao/zhangjie-lianxi.html`],
      ["错题复习", `${SITE}/yikao/cuoti-fuxi.html`],
    ],
  },
  {
    path: "/yikao/zhongyi-zhiye-yishi-mianfei-tiku.html",
    crumb: "中医执业医师免费题库",
    title: "中医执业医师免费题库_基础科目免费刷_网页直接做题_言道国学",
    desc: "中医执业医师备考免费题库：基础理论/诊断/中药/方剂/针灸五大基础科目1447题免费刷，网页版直接做题，每日一练+错题本+模拟测试，无需注册。",
    keywords: "中医执业医师免费题库,执业医师中医,医考免费刷题,中医综合笔试,医师资格题库",
    h1: "中医执业医师免费题库（基础科目）",
    lead: "中医执业医师考试的重点在基础：基础理论、诊断、中药、方剂、针灸。这五科1447道题，网页免费刷，是你备考路上零成本的第一套弹药。",
    sections: [
      {
        id: "beikao", h2: "基础科目怎么刷",
        html: [
          `<p>医学综合笔试的中医基础类科目，复习策略是“教材+章节题”同步推进：每学完一章，当天做对应章节题巩固。基础概念题量大、得分快，是性价比最高的板块。</p>`,
          `<ul>
<li>第一阶段（打基础）：基础理论263题 + 诊断学213题，配教材逐章过</li>
<li>第二阶段（记忆攻坚）：中药学612题按功效类刷，方剂学198题按剂类刷</li>
<li>第三阶段（考前）：错题本清零 + <a href="${SITE}${E}mock">模拟测试</a>计时训练</li>
</ul>`,
        ],
      },
      {
        id: "shiyong", h2: "三个提分用法",
        html: [
          `<ul>
<li><strong>每日一练</strong>：<a href="${SITE}${E}daily">每日一练</a>每天一组混合题，防止前学后忘</li>
<li><strong>错题驱动</strong>：<a href="${SITE}${E}wrong">错题本</a>自动收集，考前只刷错题效率翻倍</li>
<li><strong>统计定位</strong>：<a href="${SITE}${E}stats">学习统计</a>看五科正确率，把时间砸给最弱科目</li>
</ul>`,
        ],
      },
      {
        id: "shuoming", h2: "覆盖范围说明（不夸大）",
        html: [
          `<p>本站题库覆盖五大基础学科的主干考点，适合基础巩固与日常练习。实践技能考试与特定年度大纲的变化，请以官方考试大纲为准，搭配官方指定材料复习。</p>`,
        ],
      },
    ],
    tryLinks: [["进入免费题库（无需注册）", `${SITE}${E}practice`, true], ["做一次模拟测试", `${SITE}${E}mock`]],
    faq: [
      { q: "这个题库能替代官方教材吗？", a: "不能也不应该。题库的作用是检验和巩固，主线永远是教材与官方大纲，题库负责把你“看懂”变成“做对”。" },
      { q: "和APP里的题库一样吗？", a: "同一套1447题数据，网页版与APP版功能同源，做题记录不互通（网页存本地）。" },
      { q: "免费会一直吗？", a: "基础题库与练习功能永久免费，无广告。增值服务（如AI解读）才另行按需选择。" },
    ],
    related: [["医考题库总览", "/yikao/zhongyi-yikao-mianfei-tiku.html"], ["中医自学路线", "/zixue/zhongyi-zixue-luxian.html"], ["错题复习说明", "/yikao/cuoti-fuxi.html"]],
    clusterNavTitle: "医考题库系列",
    clusterNav: [
      ["题库总览（1447题）", `${SITE}/yikao/zhongyi-yikao-mianfei-tiku.html`],
      ["基础理论练习", `${SITE}/yikao/zhongyi-jichu-lilun-mianfei-lianxi.html`],
      ["中药学题库", `${SITE}/yikao/zhongyaoxue-tiku.html`],
      ["方剂题库", `${SITE}/yikao/fangji-tiku.html`],
      ["针灸题库", `${SITE}/yikao/zhenjiu-tiku.html`],
      ["诊断题库", `${SITE}/yikao/zhongyi-zhenduan-tiku.html`],
    ],
  },
  {
    path: "/yikao/zhongyi-jichu-lilun-mianfei-lianxi.html",
    crumb: "中医基础理论免费练习",
    title: "中医基础理论免费练习_263题分章刷_网页直接做_言道国学",
    desc: "中医基础理论免费练习263题：阴阳学说15题、五行学说17题、藏象34题、气血津液88题、病因26题、防治原则71题，按章节免费刷，网页直接做。",
    keywords: "中医基础理论练习,中医基础理论题库,阴阳五行练习,藏象学说题目,免费中医题",
    h1: "中医基础理论免费练习（263题）",
    lead: "基础理论是所有中医考试的起跑线。263道题按章节组织，学完一章立刻验证一章——网页免费做，不注册。",
    sections: [
      {
        id: "zhangjie", h2: "章节题量分布",
        html: [
          `<table><tr><th>章节</th><th>题量</th><th>高频考点</th></tr>
<tr><td>阴阳学说</td><td>15题</td><td>对立制约/互根互用/消长转化</td></tr>
<tr><td>五行学说</td><td>17题</td><td>生克乘侮方向判断</td></tr>
<tr><td>藏象学说</td><td>34题</td><td>五脏功能系统与外在联系</td></tr>
<tr><td>六腑</td><td>12题</td><td>传化物而不藏</td></tr>
<tr><td>气血津液</td><td>88题</td><td>气与血的关系（题量最大，重点）</td></tr>
<tr><td>病因学说</td><td>26题</td><td>六淫性质与致病特点</td></tr>
<tr><td>防治原则</td><td>71题</td><td>正治反治/标本缓急</td></tr></table>`,
        ],
      },
      {
        id: "tuijian", h2: "推荐刷法",
        html: [
          `<ol>
<li>先做一遍<strong>整科顺序练习</strong>摸底，看正确率分布</li>
<li>正确率低于60%的章节，回教材重学后<strong>分章重做</strong></li>
<li>错题进错题本，按<a href="/zixue/zhongyi-cuoti-fuxi.html">错题复习方法</a>间隔重做</li>
</ol>`,
        ],
      },
    ],
    tryLinks: [["开始基础理论练习（免费）", `${SITE}${E}practice?subjectId=jichu`, true], ["怎么学基础理论（方法文）", `${SITE}/zixue/zhongyi-jichu-lilun-zenme-xue.html`]],
    faq: [
      { q: "263题够基础理论复习吗？", a: "章节覆盖完整（阴阳到防治原则七大模块），一轮复习+错题巩固足够定位薄弱点，配合教材使用效果最佳。" },
      { q: "题目有解析吗？", a: "做题即时判分并显示正确答案，错题自动进错题本可反复研究。" },
      { q: "手机上能用吗？", a: "能。网页版自适应手机屏幕，微信里打开也能直接做。" },
    ],
    related: [["医考题库总览", "/yikao/zhongyi-yikao-mianfei-tiku.html"], ["中医诊断题库", "/yikao/zhongyi-zhenduan-tiku.html"], ["基础理论怎么学", "/zixue/zhongyi-jichu-lilun-zenme-xue.html"]],
    clusterNavTitle: "医考题库系列",
    clusterNav: [
      ["题库总览（1447题）", `${SITE}/yikao/zhongyi-yikao-mianfei-tiku.html`],
      ["中药学题库", `${SITE}/yikao/zhongyaoxue-tiku.html`],
      ["方剂题库", `${SITE}/yikao/fangji-tiku.html`],
      ["针灸题库", `${SITE}/yikao/zhenjiu-tiku.html`],
      ["诊断题库", `${SITE}/yikao/zhongyi-zhenduan-tiku.html`],
    ],
  },
  {
    path: "/yikao/zhongyaoxue-tiku.html",
    crumb: "中药学题库",
    title: "中药学题库_612题免费刷_功效分类章节练习_言道国学",
    desc: "中药学免费题库612题：中药基本知识267题+按功效分类的各章节题（解表/清热/泻下/补虚……），网页免费做题，配中药库随时查阅。",
    keywords: "中药学题库,中药学免费练习,中药学题目,功效分类练习,中药免费刷题",
    h1: "中药学题库（612题，免费刷）",
    lead: "中药学是题量最大的科目。612道题按“基本知识+功效分类”两级组织，配合中药库边查边练，记忆效率翻倍。",
    sections: [
      {
        id: "jiegou", h2: "题库结构",
        html: [
          `<ul>
<li><strong>中药基本知识</strong>：267题——四气五味、升降浮沉、归经、配伍、用药禁忌（十八反十九畏）</li>
<li><strong>功效分类章节</strong>：按解表药/清热药/泻下药/祛风湿药/化湿药/利水渗湿药/温里药/理气药/消食药/止血药/活血化瘀药/化痰止咳平喘药/安神药/补虚药等分类刷题</li>
</ul>`,
          `<p>每道功效题都能在<a href="${SITE}/zhongyi/herb">中药库</a>找到对应条目：做错了立刻查库看功效主治原文，形成“做题→查证→记忆”的闭环。</p>`,
        ],
      },
      {
        id: "faf", h2: "高频易错提醒",
        html: [
          `<ul>
<li>功效相近药对比（如陈皮vs青皮、生地vs熟地）是最大失分区</li>
<li>十八反十九畏的配伍判断题必考，建议单独整理</li>
<li>用量特殊的药（如细辛、甘遂）结合禁忌记忆</li>
</ul>`,
        ],
      },
    ],
    tryLinks: [["开始中药学练习（免费）", `${SITE}${E}practice?subjectId=zhongyao`, true], ["查中药库", `${SITE}/zhongyi/herb`]],
    faq: [
      { q: "612题要全做完吗？", a: "建议全过一轮，重点是错题。中药学考点重复率高，错题巩固的边际收益最大。" },
      { q: "怎么记中药最快？", a: "先读《中药怎么记》的方法文：按功效分类块状记忆+差异点补充，再配合分章做题。" },
      { q: "和中药库怎么配合？", a: "做题遇到不确定的药，切到中药库查条目（功效/性味/归经），当天巩固。" },
    ],
    related: [["方剂题库", "/yikao/fangji-tiku.html"], ["医考题库总览", "/yikao/zhongyi-yikao-mianfei-tiku.html"], ["中药怎么记（方法文）", "/zixue/zhongyao-zenme-ji.html"]],
    clusterNavTitle: "医考题库系列",
    clusterNav: [
      ["题库总览（1447题）", `${SITE}/yikao/zhongyi-yikao-mianfei-tiku.html`],
      ["基础理论练习", `${SITE}/yikao/zhongyi-jichu-lilun-mianfei-lianxi.html`],
      ["方剂题库", `${SITE}/yikao/fangji-tiku.html`],
      ["针灸题库", `${SITE}/yikao/zhenjiu-tiku.html`],
      ["诊断题库", `${SITE}/yikao/zhongyi-zhenduan-tiku.html`],
    ],
  },
  {
    path: "/yikao/fangji-tiku.html",
    crumb: "方剂题库",
    title: "方剂题库_198题免费_按剂类功效分章练习_言道国学",
    desc: "方剂学免费题库198题：按剂类-功效双级分类（解表剂/和解剂/清热剂/泻下剂/温里剂/补益剂/理血剂/祛湿剂……），网页免费刷，配方剂库查询。",
    keywords: "方剂题库,方剂学免费练习,方剂学题目,君臣佐使练习,方剂免费刷题",
    h1: "方剂题库（198题，免费刷）",
    lead: "方剂学考的是“结构+加减”。198道题按剂类-功效双级组织，每类配代表方练习，配合方剂库随时查组成与主治。",
    sections: [
      {
        id: "jiegou", h2: "题库结构（按剂类-功效两级）",
        html: [
          `<table><tr><th>剂类</th><th>覆盖功效章节</th></tr>
<tr><td>解表剂</td><td>辛温解表/辛凉解表/扶正解表</td></tr>
<tr><td>和解剂</td><td>和解少阳/调和肝脾/调和肠胃</td></tr>
<tr><td>清热剂</td><td>清气分热/清脏腑热/清虚热/清热解毒</td></tr>
<tr><td>泻下剂</td><td>寒下/润下</td></tr>
<tr><td>温里剂</td><td>温中祛寒/回阳救逆/温经散寒</td></tr>
<tr><td>补益剂</td><td>补气/补血/补阴/补阳</td></tr>
<tr><td>理血剂</td><td>活血祛瘀/止血</td></tr>
<tr><td>祛湿剂</td><td>清热祛湿/温化水湿/利水渗湿</td></tr>
<tr><td>其他</td><td>安神剂/驱虫剂/痈疡剂等</td></tr></table>`,
          `<p>做错或拿不准的方子，去<a href="${SITE}/zhongyi/formula">方剂库</a>查“组成-功用-主治”三件套，当场补课。</p>`,
        ],
      },
      {
        id: "kaodian", h2: "高频考点",
        html: [
          `<ul>
<li>方剂的君药判断（给组成选君药/给功效推方名）</li>
<li>加减变化（某症重则加某药）</li>
<li>证-方对应（给出证候选最适方剂）</li>
</ul>`,
        ],
      },
    ],
    tryLinks: [["开始方剂学练习（免费）", `${SITE}${E}practice?subjectId=fangji`, true], ["查方剂库", `${SITE}/zhongyi/formula`]],
    faq: [
      { q: "方剂题只有198道，够吗？", a: "198道覆盖全部主流剂类与代表方，方剂考点集中度高（君臣佐使+证方对应），配合方剂库一轮+错题巩固足以形成框架。" },
      { q: "需要先背方歌吗？", a: "建议先理解组方结构再背方歌（见《方剂怎么学》），题库按剂类组织正好支撑这个学法。" },
      { q: "和中药学题库有重叠吗？", a: "互补不重叠：中药学考单味药，方剂学考组合结构，建议先中药后方剂。" },
    ],
    related: [["中药学题库", "/yikao/zhongyaoxue-tiku.html"], ["医考题库总览", "/yikao/zhongyi-yikao-mianfei-tiku.html"], ["方剂怎么学（方法文）", "/zixue/fangji-zenme-xue.html"]],
    clusterNavTitle: "医考题库系列",
    clusterNav: [
      ["题库总览（1447题）", `${SITE}/yikao/zhongyi-yikao-mianfei-tiku.html`],
      ["基础理论练习", `${SITE}/yikao/zhongyi-jichu-lilun-mianfei-lianxi.html`],
      ["中药学题库", `${SITE}/yikao/zhongyaoxue-tiku.html`],
      ["针灸题库", `${SITE}/yikao/zhenjiu-tiku.html`],
      ["诊断题库", `${SITE}/yikao/zhongyi-zhenduan-tiku.html`],
    ],
  },
  {
    path: "/yikao/zhenjiu-tiku.html",
    crumb: "针灸题库",
    title: "针灸题库_161题免费_经络循行腧穴定位主治_言道国学",
    desc: "针灸学免费题库161题：十二经脉循行、腧穴定位与主治、刺灸法，网页免费刷题，配经络循行图对照学习，无需注册。",
    keywords: "针灸题库,针灸学免费练习,针灸学题目,腧穴定位练习,经络题目",
    h1: "针灸题库（161题，免费刷）",
    lead: "针灸学的失分集中在“定位”和“主治”。161道题覆盖循行、定位、主治与刺灸法，配合经络循行图边看边练。",
    sections: [
      {
        id: "jiegou", h2: "考点分布",
        html: [
          `<ul>
<li><strong>经络循行</strong>：十二经脉走向、交接、表里关系（推导题为主）</li>
<li><strong>腧穴定位</strong>：骨度分寸+体表标志（最高频失分区）</li>
<li><strong>主治规律</strong>：共性主治+特定穴特效</li>
<li><strong>刺灸法</strong>：针刺角度深度、灸法适应证</li>
</ul>`,
          `<p>定位题做错时，对照<a href="${SITE}/zhongyi/meridian">经络循行图</a>把穴位走一遍，视觉记忆比文字记忆牢固得多。</p>`,
        ],
      },
      {
        id: "fangfa", h2: "刷题建议",
        html: [
          `<ol>
<li>先过一遍“经络总论+总方向四句”相关题，立框架</li>
<li>按经脉逐经刷定位与主治，每天1-2条经</li>
<li>特定穴（五输/原/络/募）单独整理成表后再刷对应题</li>
</ol>`,
        ],
      },
    ],
    tryLinks: [["开始针灸学练习（免费）", `${SITE}${E}practice?subjectId=zhenjiu`, true], ["看经络循行图", `${SITE}/zhongyi/meridian`]],
    faq: [
      { q: "腧穴定位记不住怎么办？", a: "先背骨度分寸表，再按经配合循行图记忆。错题集中在哪条经就重点走哪条经的图。" },
      { q: "零基础能直接刷针灸题吗？", a: "建议先过基础理论（尤其经络概念部分），否则循行题会变成死记硬背。" },
      { q: "题库含针法操作吗？", a: "含刺灸法基础考点的判断与选择题；实际操作需线下规范训练。" },
    ],
    related: [["经络怎么学（方法文）", "/zixue/jingluo-zenme-xue.html"], ["医考题库总览", "/yikao/zhongyi-yikao-mianfei-tiku.html"], ["诊断题库", "/yikao/zhongyi-zhenduan-tiku.html"]],
    clusterNavTitle: "医考题库系列",
    clusterNav: [
      ["题库总览（1447题）", `${SITE}/yikao/zhongyi-yikao-mianfei-tiku.html`],
      ["基础理论练习", `${SITE}/yikao/zhongyi-jichu-lilun-mianfei-lianxi.html`],
      ["中药学题库", `${SITE}/yikao/zhongyaoxue-tiku.html`],
      ["方剂题库", `${SITE}/yikao/fangji-tiku.html`],
      ["诊断题库", `${SITE}/yikao/zhongyi-zhenduan-tiku.html`],
    ],
  },
  {
    path: "/yikao/zhongyi-zhenduan-tiku.html",
    crumb: "中医诊断题库",
    title: "中医诊断题库_213题免费_四诊八纲脏腑辨证_言道国学",
    desc: "中医诊断学免费题库213题：望诊14题、舌诊13题、闻诊5题、问诊10题、切诊36题、八纲辨证6题、脏腑辨证129题，网页免费刷，无需注册。",
    keywords: "中医诊断题库,中医诊断学练习,脏腑辨证题目,舌诊脉诊题目,诊断免费刷题",
    h1: "中医诊断题库（213题，免费刷）",
    lead: "诊断学的分数大头在脏腑辨证（129题）。213道题按四诊与辨证体系分章，从舌脉识别到证型判断逐层训练。",
    sections: [
      {
        id: "jiegou", h2: "章节题量分布",
        html: [
          `<table><tr><th>章节</th><th>题量</th><th>重点</th></tr>
<tr><td>望诊</td><td>14题</td><td>望神望色</td></tr>
<tr><td>舌诊</td><td>13题</td><td>舌质×舌苔组合主证</td></tr>
<tr><td>闻诊</td><td>5题</td><td>声音气味辨虚实</td></tr>
<tr><td>问诊</td><td>10题</td><td>寒热汗问诊要点</td></tr>
<tr><td>切诊</td><td>36题</td><td>脉象特征→主病对应</td></tr>
<tr><td>八纲辨证</td><td>6题</td><td>纲领性判断</td></tr>
<tr><td>脏腑辨证</td><td>129题</td><td>最大头：各脏虚实证型识别</td></tr></table>`,
        ],
      },
      {
        id: "celue", h2: "刷题策略",
        html: [
          `<p>先刷四诊各章（打基础），再主攻脏腑辨证（占总题量六成）。脏腑辨证建议按“每脏一组”推进：心系证型→肝系证型→脾系→肺系→肾系，组内对比记忆，然后做题验证。</p>`,
          `<p>错题按<a href="/zixue/zhongyi-cuoti-fuxi.html">错题四步流程</a>处理——诊断学错题最能暴露概念链断点，收益极高。</p>`,
        ],
      },
    ],
    tryLinks: [["开始诊断学练习（免费）", `${SITE}${E}practice?subjectId=zhenduan`, true], ["诊断学习方法文", `${SITE}/zixue/zhongyi-zhenduan-xuexi.html`]],
    faq: [
      { q: "脏腑辨证129题会不会很难？", a: "按每脏分组对比学习后难度大幅下降；做题时抓症状关键词推病机即可，错题集中暴露断点。" },
      { q: "舌诊脉诊怎么准备？", a: "舌诊做“舌质×舌苔”组合卡片；脉诊记“特征→主病”对应，两者都在题库中有专门章节。" },
      { q: "和基础理论题库重叠吗？", a: "不重叠。基础理论考概念本身，诊断学考概念的应用（识别证候）。" },
    ],
    related: [["医考题库总览", "/yikao/zhongyi-yikao-mianfei-tiku.html"], ["基础理论练习", "/yikao/zhongyi-jichu-lilun-mianfei-lianxi.html"], ["中医诊断学习（方法文）", "/zixue/zhongyi-zhenduan-xuexi.html"]],
    clusterNavTitle: "医考题库系列",
    clusterNav: [
      ["题库总览（1447题）", `${SITE}/yikao/zhongyi-yikao-mianfei-tiku.html`],
      ["基础理论练习", `${SITE}/yikao/zhongyi-jichu-lilun-mianfei-lianxi.html`],
      ["中药学题库", `${SITE}/yikao/zhongyaoxue-tiku.html`],
      ["方剂题库", `${SITE}/yikao/fangji-tiku.html`],
      ["针灸题库", `${SITE}/yikao/zhenjiu-tiku.html`],
    ],
  },
  {
    path: "/yikao/meirian-lianxi.html",
    crumb: "每日练习",
    title: "中医每日练习_免费每日一练_五科混刷防遗忘_言道国学",
    desc: "中医每日一练免费：每天一组五科混合题自动组卷，防止前学后忘，学习记录本地保存，网页打开即做无需注册。",
    keywords: "中医每日练习,每日一练,中医刷题计划,每天做题,免费每日练习",
    h1: "中医每日一练（免费）",
    lead: "遗忘曲线是备考最大的敌人。每天一组混合题，把学过的内容滚动重现——打开网页就能做，今天的第一组现在就可以开始。",
    sections: [
      {
        id: "zuoyong", h2: "每日一练解决什么问题",
        html: [
          `<ul>
<li><strong>对抗遗忘</strong>：滚动混合出题，上周学的内容今天重现一次</li>
<li><strong>保持手感</strong>：每天15分钟，考试状态不断档</li>
<li><strong>发现问题</strong>：混合题暴露“某科突然想不起来”的知识盲区</li>
</ul>`,
        ],
      },
      {
        id: "peitao", h2: "配套功能",
        html: [
          `<ul>
<li>错题自动进<a href="${SITE}${E}wrong">错题本</a>，次日重做</li>
<li><a href="${SITE}${E}stats">学习统计</a>看累计做题量与正确率曲线</li>
<li>想按科目专项练？去<a href="${SITE}${E}practice">章节练习</a></li>
</ul>`,
        ],
      },
    ],
    tryLinks: [["开始今天的每日一练（免费）", `${SITE}${E}daily`, true], ["看学习统计", `${SITE}${E}stats`]],
    faq: [
      { q: "每日一练每天几道题？", a: "每天自动生成一组混合题，做完即时出分，控制在15分钟左右。" },
      { q: "错过一天会断吗？", a: "不会。记录存本地，第二天打开继续，学习统计里能看到累计进度。" },
      { q: "能指定科目吗？", a: "每日一练为混合卷；要指定科目请用章节练习按科目章节选择。" },
    ],
    related: [["章节练习说明", "/yikao/zhangjie-lianxi.html"], ["错题复习说明", "/yikao/cuoti-fuxi.html"], ["医考题库总览", "/yikao/zhongyi-yikao-mianfei-tiku.html"]],
    clusterNavTitle: "医考题库系列",
    clusterNav: [
      ["题库总览（1447题）", `${SITE}/yikao/zhongyi-yikao-mianfei-tiku.html`],
      ["章节练习", `${SITE}/yikao/zhangjie-lianxi.html`],
      ["错题复习", `${SITE}/yikao/cuoti-fuxi.html`],
      ["基础理论练习", `${SITE}/yikao/zhongyi-jichu-lilun-mianfei-lianxi.html`],
      ["中药学题库", `${SITE}/yikao/zhongyaoxue-tiku.html`],
    ],
  },
  {
    path: "/yikao/zhangjie-lianxi.html",
    crumb: "章节练习",
    title: "中医章节练习_按科目章节免费刷题_学哪练哪_言道国学",
    desc: "中医章节练习免费：五大科目按章节树选题（阴阳/五行/藏象/舌诊/切诊/中药各功效类/方剂各剂类/针灸各经），学哪练哪，网页直接做。",
    keywords: "中医章节练习,按章节刷题,分章做题,科目练习,免费章节题库",
    h1: "中医章节练习（按章节免费刷）",
    lead: "复习的最高效单位不是“科目”而是“章节”：今天学藏象，今天就刷藏象的题。章节练习支持科目→章节两级选题，精确对齐你的教材进度。",
    sections: [
      {
        id: "jiegou", h2: "章节树怎么用",
        html: [
          `<ol>
<li>进入练习页，选科目（基础理论/诊断/中药/方剂/针灸）</li>
<li>选章节（如基础理论→气血津液；方剂→解表剂→辛温解表）</li>
<li>做题即时判分，错题自动进错题本</li>
</ol>`,
          `<table><tr><th>科目</th><th>章节粒度</th></tr>
<tr><td>中医基础理论</td><td>按理论模块（阴阳/五行/藏象/六腑/气血津液/病因/防治）</td></tr>
<tr><td>中医诊断学</td><td>按诊法与辨证体系（望/舌/闻/问/切/八纲/脏腑）</td></tr>
<tr><td>中药学</td><td>基本知识+按功效分类</td></tr>
<tr><td>方剂学</td><td>按剂类-功效两级</td></tr>
<tr><td>针灸学</td><td>按经络与腧穴体系</td></tr></table>`,
        ],
      },
      {
        id: "changjing", h2: "典型使用场景",
        html: [
          `<ul>
<li><strong>跟教材同步</strong>：今晚学到第X章，睡前刷该章10-20题巩固</li>
<li><strong>弱项专项</strong>：统计发现某科正确率低，按章节逐个击破</li>
<li><strong>考前扫描</strong>：按章节顺序过一遍，标出错误率高的章节回炉</li>
</ul>`,
        ],
      },
    ],
    tryLinks: [["进入章节练习（免费）", `${SITE}${E}practice`, true], ["每日混合练习", `${SITE}${E}daily`]],
    faq: [
      { q: "能只刷某一章吗？", a: "能。科目→章节两级选择后只出该章节的题。" },
      { q: "做题有顺序/随机模式吗？", a: "支持顺序与随机切换，随机模式更接近考试状态。" },
      { q: "进度会保存吗？", a: "会。做题记录保存在本地，下次打开继续。" },
    ],
    related: [["每日练习说明", "/yikao/meirian-lianxi.html"], ["医考题库总览", "/yikao/zhongyi-yikao-mianfei-tiku.html"], ["错题复习说明", "/yikao/cuoti-fuxi.html"]],
    clusterNavTitle: "医考题库系列",
    clusterNav: [
      ["题库总览（1447题）", `${SITE}/yikao/zhongyi-yikao-mianfei-tiku.html`],
      ["每日练习", `${SITE}/yikao/meirian-lianxi.html`],
      ["错题复习", `${SITE}/yikao/cuoti-fuxi.html`],
      ["基础理论练习", `${SITE}/yikao/zhongyi-jichu-lilun-mianfei-lianxi.html`],
      ["中药学题库", `${SITE}/yikao/zhongyaoxue-tiku.html`],
    ],
  },
  {
    path: "/yikao/cuoti-fuxi.html",
    crumb: "错题复习",
    title: "中医错题复习_免费错题本_自动收集随时重做_言道国学",
    desc: "中医刷题错题免费复习：错题自动收集进错题本，随时按科目重做，学习统计看正确率曲线，网页版免费无需注册。",
    keywords: "中医错题复习,免费错题本,错题重做,医考错题,刷题错题管理",
    h1: "中医错题复习（免费错题本）",
    lead: "做题时答错的题会自动进入错题本——不用抄、不用整理，打开就能按科目重做。把“刷过”变成“刷会”。",
    sections: [
      {
        id: "jiaose", h2: "错题本的角色",
        html: [
          `<p>错题本是你个人化的“薄弱考点清单”。做对的题说明已掌握，错题才是提分空间所在。备考后期，刷错题的效率远高于刷新题。</p>`,
        ],
      },
      {
        id: "liucheng", h2: "推荐复习循环",
        html: [
          `<ol>
<li><strong>当日</strong>：错题定位考点（哪个知识点？回归教材哪节？）</li>
<li><strong>次日</strong>：重做昨日错题，仍未通过的标记重点</li>
<li><strong>每周</strong>：整周错题重做一轮，通过的移出关注</li>
<li><strong>考前</strong>：只刷错题本+模拟测试查漏</li>
</ol>`,
          `<p>配合<a href="${SITE}${E}stats">学习统计</a>的正确率曲线，能看到每个科目从“错误率高”到“稳定”的过程。</p>`,
        ],
      },
    ],
    tryLinks: [["打开我的错题本（免费）", `${SITE}${E}wrong`, true], ["错题复习方法论", `${SITE}/zixue/zhongyi-cuoti-fuxi.html`]],
    faq: [
      { q: "错题怎么进错题本？", a: "网页版做题答错即自动收录，无需手动操作。" },
      { q: "重做全对了会移除吗？", a: "重做记录保留在统计中，可以按科目反复重做直到全部掌握。" },
      { q: "错题数据存在哪里？", a: "存在浏览器本地。换设备或深度清理缓存前，重要进度建议在APP中同步。" },
    ],
    related: [["每日练习说明", "/yikao/meirian-lianxi.html"], ["章节练习说明", "/yikao/zhangjie-lianxi.html"], ["医考题库总览", "/yikao/zhongyi-yikao-mianfei-tiku.html"]],
    clusterNavTitle: "医考题库系列",
    clusterNav: [
      ["题库总览（1447题）", `${SITE}/yikao/zhongyi-yikao-mianfei-tiku.html`],
      ["每日练习", `${SITE}/yikao/meirian-lianxi.html`],
      ["章节练习", `${SITE}/yikao/zhangjie-lianxi.html`],
      ["基础理论练习", `${SITE}/yikao/zhongyi-jichu-lilun-mianfei-lianxi.html`],
      ["中药学题库", `${SITE}/yikao/zhongyaoxue-tiku.html`],
    ],
  },
];

module.exports = pages;
