'use strict';
// P8-5 医考题库全科目补齐·批量流水线
// 流程：AI 编写国家医考考纲知识汇编（原创）→ 建资料 → 解析知识点 → 审核入库 → 全覆盖出题（A1/A2 单选）
// 幂等：按资料标题检查点，已完成的科目自动跳过
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const D = require('/www/yandaoguoxue-backend/node_modules/better-sqlite3');

const BACKEND = '/www/yandaoguoxue-backend';
const db = new D(path.join(BACKEND, 'data/academy.db'));
const LOG = '/root/p8_batch.log';

const env = fs.readFileSync(path.join(BACKEND, '.env'), 'utf8');
const pick = (k) => ((env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1] || '').trim().replace(/^["']|["']$/g, '');
const AI_KEY = pick('DEEPSEEK_API_KEY') || pick('OPENAI_API_KEY') || pick('HUNYUAN_API_KEY');
const AI_URL = pick('DEEPSEEK_API_KEY')
  ? 'https://api.deepseek.com/chat/completions'
  : (pick('HUNYUAN_API_URL') || 'https://tokenhub.tencentmaas.com/v1/chat/completions');
const AI_MODEL = pick('DEEPSEEK_API_KEY') ? 'deepseek-chat' : (pick('HUNYUAN_MODEL') || 'hy3');
const ADMIN_KEY = pick('ADMIN_API_KEY');
const API = 'http://127.0.0.1:3001/api/academy';

function log(msg) {
  const line = `[${new Date().toLocaleString('zh-CN', { hour12: false })}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG, line + '\n');
}

async function ds(system, user, tag) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const resp = await fetch(AI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AI_KEY}` },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          temperature: 0.3,
          max_tokens: 8192,
        }),
        signal: AbortSignal.timeout(300000),
      });
      if (!resp.ok) throw new Error('AI HTTP ' + resp.status);
      const data = await resp.json();
      const choice = data.choices && data.choices[0];
      const content = (choice && choice.message && choice.message.content) || '';
      if (content.length < 800) throw new Error('AI 输出过短: ' + content.length);
      if (choice && choice.finish_reason && choice.finish_reason !== 'stop') {
        throw new Error('输出未完整结束 finish_reason=' + choice.finish_reason);
      }
      return content;
    } catch (e) {
      log(`  [${tag}] 第${attempt}次失败: ${e.message}`);
      if (attempt === 3) throw e;
      await new Promise((r) => setTimeout(r, 8000));
    }
  }
}

const OUTLINE_SYS = '你是国家中医/中西医结合执业医师资格考试考纲编写专家。输出简体中文的考纲知识点汇编纯文本，内容客观、密度高、面向考试。';

function outlineUser(subject, partDesc, partNo, totalParts) {
  return `请编写《${subject}》国家医考考纲知识汇编（第 ${partNo}/${totalParts} 部分）。
本部分覆盖范围：
${partDesc}

编写要求：
1. 面向国家执业医师资格考试笔试，覆盖本范围全部核心考点；逐条展开具体知识点，不写空泛提纲。
2. 每个知识点写清：概念定义、分类、具体内容、鉴别要点、临床或应用意义、常见考查角度。
3. 章节用【章节名】分节；条目以「◆」开头；层级清晰。
4. 不出现任何人名、书名、机构名、商标名；不使用繁体字；不使用营销化、恐吓式或绝对化表述；术语符合国家规范教材口径。
5. 直接输出正文，无前言后语，目标长度 6000—8000 字。`;
}

// ============ 21 个科目（3 个重建 + 18 个补齐科目）的章节规划 ============
const SUBJECTS = [
  { name: '中医基础理论', parts: [
    '绪论与哲学基础：中医学理论体系的概念与形成发展；精气学说（基本内容与应用）；阴阳学说（对立制约互根互用消长平衡相互转化、阴阳学说在中医学的应用）；五行学说（特性归类生克乘侮母子相及、五行学说在中医学的应用）。',
    '藏象：五脏（心肝脾肺肾的生理功能与生理特性、与形体官窍志液时的联系）；六腑（胆胃小肠大肠膀胱三焦的生理功能）；奇恒之腑（脑女子胞）；脏腑之间的关系（脏与脏、脏与腑、腑与腑）。精气血津液神：精（生成功能）、气（生成运行分布功能分类）、血（生成功能运行）、津液（生成输布排泄功能）、精气血津液之间的关系、神。',
    '经络：经络系统组成；十二经脉（名称走向分布规律流注次序表里关系）；奇经八脉（督任冲带阴阳跷阴阳维的循行与功能）；经别经筋皮部别络；经络的生理功能与应用。体质：体质的概念与形成、体质的分类（阴阳平和质偏阳质偏阴质等）与体质学说的应用。',
    '病因：六淫（风寒暑湿燥火的性质与致病特点）、疠气、七情内伤、饮食失宜、劳逸失度、痰饮、瘀血、结石、药邪医过与外伤。发病：发病的基本原理（正气与邪气）、影响发病的因素、发病类型（感邪即发徐发伏而后发继发合病并病复发）。病机：邪正盛衰（虚实变化）、阴阳失调（寒热真假格阴格阳）、气血失常、津液代谢失常、内生五邪（风寒湿燥火）、疾病传变（表里传变六经传变卫气营血传变三焦传变脏腑传变）。防治原则：治则（正治反治、治标治本、扶正祛邪、调整阴阳、调理气血津液、三因制宜）、治法（八法）；养生（原则与方法）与预防（未病先防既病防变）。',
  ]},
  { name: '中药学', parts: [
    '总论：中药的产地与采集、中药炮制的目的与方法；中药性能（四气、五味、归经、升降浮沉、毒性）；中药配伍（七情）与用药禁忌（十八反、十九畏、妊娠用药禁忌、证候用药禁忌）；中药的剂量与用法（煎服法、先煎后下等特殊煎法）。',
    '解表药（发散风寒药、发散风热药）与清热药（清热泻火药、清热燥湿药、清热解毒药、清热凉血药、清虚热药）：每味重点药的性味归经、功效、主治应用、用法用量、使用注意，及同类药功效鉴别比较。',
    '泻下药（攻下药、润下药、峻下逐水药）、祛风湿药（祛风寒湿药、祛风湿热药、祛风湿强筋骨药）、化湿药、利水渗湿药（利水消肿药、利尿通淋药、利湿退黄药）：重点药性味归经、功效、应用、用法用量与使用注意。',
    '温里药、理气药、消食药、驱虫药、止血药（凉血止血药、化瘀止血药、收敛止血药、温经止血药）：重点药功效主治、用法用量、使用注意与鉴别。',
    '活血化瘀药（活血止痛药、活血调经药、活血疗伤药、破血消癥药）与化痰止咳平喘药（温化寒痰药、清化热痰药、止咳平喘药）：重点药功效主治与使用注意。',
    '安神药（重镇安神药、养心安神药）、平肝息风药（平抑肝阳药、息风止痉药）、开窍药、补虚药（补气药、补阳药、补血药、补阴药）：重点药功效主治、用法用量与使用注意。',
    '收涩药（固表止汗药、敛肺涩肠药、固精缩尿止带药）、涌吐药、攻毒杀虫止痒药、拔毒化腐生肌药：重点药功效主治与使用注意；中药学综合鉴别要点归纳。',
  ]},
  { name: '方剂学', parts: [
    '总论：方剂与治法的关系、常用治法（汗和下消吐清温补消八法）、方剂的组成原则（君臣佐使）与组成变化（药味加减药量增减剂型更换）、常用剂型特点、煎药法与服药法。解表剂：辛温解表（麻黄汤桂枝汤九味羌活汤小青龙汤止嗽散香苏散）、辛凉解表（银翘散桑菊饮麻黄杏仁甘草石膏汤柴葛解肌汤升麻葛根汤）、扶正解表（败毒散参苏饮麻黄细辛附子汤加减葳蕤汤）的组成功用主治证候配伍意义使用注意。',
    '泻下剂：寒下（大承气汤小承气汤调胃承气汤大黄牡丹汤）、温下（温脾汤大黄附子汤）、润下（麻子仁丸济川煎）、逐水（十枣汤舟车丸）、攻补兼施（黄龙汤增液承气汤）。和解剂：和解少阳（小柴胡汤蒿芩清胆汤）、调和肝脾（四逆散逍遥散痛泻要方）、调和肠胃（半夏泻心汤生姜泻心汤甘草泻心汤）。清热剂：清气分热（白虎汤竹叶石膏汤）、清营凉血（清营汤犀角地黄汤）、清热解毒（黄连解毒汤凉膈散普济消毒饮仙方活命饮五味消毒饮）、清脏腑热（导赤散龙胆泻肝汤左金丸苇茎汤清胃散玉女煎芍药汤白头翁汤）、清虚热（青蒿鳖甲汤清骨散当归六黄汤）。',
    '温里剂：温中祛寒（理中丸吴茱萸汤小建中汤大建中汤）、回阳救逆（四逆汤回阳救急汤）、温经散寒（当归四逆汤黄芪桂枝五物汤阳和汤）。补益剂：补气（四君子汤参苓白术散补中益气汤生脉散玉屏风散完带汤）、补血（四物汤当归补血汤归脾汤）、气血双补（八珍汤炙甘草汤）、补阴（六味地黄丸大补阴丸一贯煎左归丸）、补阳（肾气丸右归丸）、阴阳双补（地黄饮子龟鹿二仙胶）。',
    '固涩剂：固表止汗（牡蛎散）、敛肺止咳（九仙散）、涩肠固脱（四神丸真人养脏汤）、涩精止遗（金锁固精丸桑螵蛸散）、固崩止带（固冲汤固经丸易黄汤）。安神剂：重镇安神（朱砂安神丸磁朱丸）、滋养安神（天王补心丹酸枣仁汤甘麦大枣汤）。开窍剂：凉开（安宫牛黄丸紫雪至宝丹）、温开（苏合香丸）。理气剂：行气（越鞠丸柴胡疏肝散瓜蒌薤白白酒汤半夏厚朴汤金铃子散天台乌药散厚朴温中汤）、降气（苏子降气汤定喘汤旋覆代赭汤橘皮竹茹汤）。理血剂：活血祛瘀（桃核承气汤血府逐瘀汤补阳还五汤复元活血汤温经汤生化汤桂枝茯苓丸）、止血（十灰散咳血方小蓟饮子槐花散黄土汤）。',
    '治风剂：疏散外风（川芎茶调散大秦艽汤小活络丹牵正散玉真散消风散）、平息内风（羚角钩藤汤镇肝熄风汤天麻钩藤饮大定风珠）。治燥剂：轻宣外燥（杏苏散桑杏汤清燥救肺汤）、滋阴润燥（麦门冬汤益胃汤养阴清肺汤百合固金汤）。祛湿剂：燥湿和胃（平胃散藿香正气散）、清热祛湿（茵陈蒿汤八正散三仁汤甘露消毒丹连朴饮二妙散）、利水渗湿（五苓汤猪苓汤防己黄芪汤五皮散）、温化寒湿（苓桂术甘汤真武汤实脾饮萆薢分清饮）、祛风胜湿（羌活胜湿汤独活寄生汤）。祛痰剂：燥湿化痰（二陈汤温胆汤茯苓丸）、清热化痰（清气化痰丸小陷胸汤滚痰丸）、润燥化痰（贝母瓜蒌散）、温化寒痰（三子养亲汤）、治风化痰（半夏白术天麻汤定痫丸）。消食剂：消食化滞（保和丸枳实导滞丸）、健脾消食（健脾丸枳实消痞丸）。驱虫剂：乌梅丸肥儿丸。治痈疡剂：仙方活命饮犀黄丸苇茎汤大黄牡丹汤阳和汤小金丹透脓散内补黄芪汤。各方剂组成药物、功用、主治证候、配伍意义（君臣佐使分析）、使用注意与类方鉴别。',
  ]},
  { name: '中医诊断学', parts: [
    '绪论（中医诊断学基本原理与基本原则）；望诊：全身望诊（神色形态）、局部望诊（头面五官躯体四肢二阴皮肤）、望舌（舌质舌苔）、望排出物、望小儿指纹。',
    '闻诊（声音气味）；问诊（问寒热汗疼痛头身胸腹耳目睡眠饮食口味二经常规十问要点）；切诊（脉诊：脉象形成原理、诊脉方法、正常脉象、二十八脉特征主病、相兼脉；按诊：按胸腹肌肤手足腧穴）。',
    '八纲辨证（阴阳表里寒热虚实及证候相兼错杂真假）；病性辨证（六淫辨证、阴阳虚损辨证、气血辨证、津液辨证）。',
    '脏腑辨证（心肝脾肺肾及腑病证候辨证要点、脏腑兼证）；六经辨证、卫气营血辨证、三焦辨证、经络辨证概要；诊断综合运用与病案书写规范。',
  ]},
  { name: '针灸学', parts: [
    '经络总论：十二经脉循行分布规律与流注、奇经八脉功能、十五络脉、十二经别、十二经筋、十二皮部；腧穴总论：腧穴分类、定位方法（骨度分寸、体表解剖标志、手指同身寸）、主治规律。',
    '手三阴经（肺心包心）、手三阳经（大肠三焦小肠）腧穴：重点腧穴定位、主治、操作；足三阳经（胃胆膀胱）腧穴：重点腧穴定位、主治、操作。',
    '足三阴经（脾肝肾）腧穴；督脉、任脉腧穴；常用经外奇穴：定位、主治、操作。刺灸法：毫针刺法（进针、行针、补泻、得气）、灸法（艾炷灸艾条灸温针灸）、拔罐法、三棱针、皮肤针、皮内针、电针法及针刺意外处理。',
    '针灸治疗总论：针灸治疗原则、处方配穴规律（近部远部随证取穴、主客配穴、原络配穴、俞募配穴等）；内科病证针灸治疗（中风、眩晕、头痛、面瘫、痹证、痿证、不寐、感冒、咳嗽、胃痛、便秘、泄泻、癃闭等）。',
    '妇儿科病证（月经不调、痛经、经闭、崩漏、遗尿、疳积等）、皮外伤科病证（瘾疹、蛇串疮、扭伤、落枕、漏肩风等）、五官科病证（目赤肿痛、耳鸣耳聋、鼻渊、牙痛、咽喉肿痛）及晕厥、内脏绞痛等急症针灸治疗。',
  ]},
  { name: '中医内科学', parts: [
    '感冒（风寒风热暑湿气虚阴虚）、外感发热与内伤发热、咳嗽（外感内伤）、哮病（冷哮热哮寒包热证风痰虚哮）、喘证（实喘虚喘各证型）。',
    '肺痈、肺痨、肺胀、肺痿；心悸（心虚胆怯心血不足阴虚火旺心阳不振水饮凌心瘀阻心脉痰火扰心）、胸痹（心血瘀阻气滞心胸痰浊闭阻寒凝心脉气阴两虚心肾阴虚心肾阳虚）。',
    '不寐、厥证（气厥血厥痰厥暑厥）；胃痛、痞满、呕吐、噎膈、呃逆、腹痛、泄泻、痢疾各证型辨治。',
    '便秘、胁痛、黄疸（阳黄阴黄急黄）、积聚、鼓胀；头痛（外感内伤及引经药）、眩晕（肝阳上亢气血亏虚肾精不足痰湿中阻瘀血阻窍）。',
    '中风（中经络中脏腑恢复期后遗症期分期辨治）、瘿病、疟疾；水肿（阳水阴水）、淋证（六淋）、癃闭、关格。',
    '郁证、血证（鼻衄齿衄咳血吐血便血尿血紫斑）、痰饮、消渴（三消）、自汗盗汗、虚劳、肥胖、癌病、痹证（行痛着热痹及久痹）、痿证、腰痛。',
  ]},
  { name: '中医外科学', parts: [
    '中医外科学总论：疾病命名与专业术语、病因病机（外感六淫特殊毒虫外伤情志饮食劳伤）、外科辨证（阴阳辨证、局部辨证：肿痛痒脓麻木溃疡；经络部位辨证）、治法（内治法三个总则消托补、外治法膏药掺药切开引流砭镰挂线结扎等）。',
    '疮疡：疖（有头疖无头疖蝼蛄疖疖病）、疔（颜面手足红丝疔烂疔疫疔）、痈（颈腋脐胯腹部）、发、有头疽、流注、发颐、丹毒、走窜与内陷（三陷证）；乳房疾病：乳痈、乳发、乳癖、乳核、乳岩、乳漏的辨治。',
    '瘿（气瘿肉瘿瘿痈石瘿）、瘤（气肉血骨脂瘤）、岩（舌岩失荣肾岩）；皮肤及性传播疾病：热疮、蛇串疮、疣、癣、湿疮、药毒、瘾疹、牛皮癣、白疕、淋病、梅毒；肛门直肠疾病：痔（内外混合）、肛痈、肛漏、肛裂、脱肛；泌尿男性疾病：子痈、子痰、精浊、精癃；周围血管疾病：股肿、血栓性浅静脉炎、臁疮、脱疽；其他：烧烫伤、冻伤、毒蛇咬伤、肠痈。',
  ]},
  { name: '中医妇科学', parts: [
    '中医妇科学总论：女性生殖器官（胞宫阴道子门毛际阴户）、月经生理与产生机制、妊娠与产育生理、带下生理；妇科病因病机特点；妇科诊断（四诊要点）与辨证概要；治法概要（内治外治周期疗法）。',
    '月经病：月经先期、月经后期、月经先后无定期、月经过多、月经过少、经期延长、经间期出血、崩漏、闭经、痛经、经行发热、经行头痛、经行感冒、经行身痛、经行泄泻、经行吐衄、经行口糜、经行风疹块、经行眩晕、经行浮肿、经断复来、绝经前后诸证。',
    '带下病（带下过多带下过少）；妊娠病：恶阻、妊娠腹痛、异位妊娠、胎漏与胎动不安、堕胎小产、滑胎、胎萎不长、子满、子肿、子晕、子痫、子嗽；产后病：产后血晕、产后痉证、产后发热、产后腹痛、产后恶露不绝、产后大便难、产后排尿异常、产后自汗盗汗、产后身痛、产后缺乳、产后乳汁自出；妇科杂病：癥瘕、盆腔炎、不孕症、阴痒、阴疮、子宫脱垂；计划生育措施与妇科常用检查要点。',
  ]},
  { name: '中医儿科学', parts: [
    '中医儿科学总论：小儿年龄分期、生长发育规律（体重身长囟门牙齿呼吸脉搏血压）、生理特点（稚阴稚阳纯阳脏腑娇嫩形气未充生机蓬勃）、病因病理特点、儿科喂养与保健；儿科诊断概要（望诊尤其望舌望指纹闻诊切诊要点）与辨证要点；儿科治法概要（内治用药特点、外治法、捏脊针刺四缝等）。',
    '肺系病证：感冒（风寒风热暑邪时邪）、咳嗽、肺炎喘嗽（常证变证）、哮喘（发作期缓解期）；脾系病证：鹅口疮、口疮、呕吐、泄泻（伤食风寒湿热脾虚）、厌食、积滞、疳证（疳气疳积干疳及兼证）；心肝病证：夜啼、汗证（自汗盗汗）、病毒性心肌炎、注意力缺陷多动障碍、抽动障碍、惊风（急惊风慢惊风）。',
    '肾系病证：水肿（风水相搏湿热内侵等）、尿频、遗尿、五迟五软；传染病：麻疹（顺证逆证）、幼儿急疹、风疹、猩红热、水痘、手足口病、痄腮、顿咳、小儿麻痹证；新生儿病：胎黄、硬肿症；其他病证：蛔虫病蛲虫病、夏季热、紫癜、皮肤黏膜淋巴结综合征。',
  ]},
  { name: '诊断学基础', parts: [
    '症状学：发热（病因机制热型）、头痛、胸痛、腹痛、咳嗽与咯血、呼吸困难、发绀、水肿、恶心与呕吐、呕血与黑便、便血、腹泻、黄疸、血尿、尿频尿急尿痛、意识障碍的病因与问诊鉴别要点。',
    '问诊（内容与方法技巧）；体格检查：基本检查法（视触叩听嗅）、一般检查（生命征皮肤淋巴结）、头部与颈部检查、胸部检查（胸廓肺脏心脏血管）、腹部检查、肛门直肠外生殖器、脊柱四肢与关节、神经系统检查（颅神经运动感觉反射病理征脑膜刺激征）。',
    '实验室诊断：血液一般检查（红细胞白细胞血小板网织红细胞红细胞沉降率）、骨髓细胞学检查概要、尿液与粪便检查、肝脏病常用实验室检查、肾功能检查、临床常用生物化学检查（血糖血脂电解质心肌酶）、免疫学检查（感染免疫自身免疫肿瘤标志物）。',
    '器械检查：心电图检查（正常心电图、心律失常、心肌梗死心电表现）、肺功能检查、内镜检查概要；影像诊断：超声诊断、放射诊断、CT与MRI成像原理与临床应用；诊断的步骤与临床思维方法。',
  ]},
  { name: '内科学', parts: [
    '呼吸系统疾病：急性上呼吸道感染与急性气管支气管炎、慢性支气管炎、慢性阻塞性肺疾病、慢性肺源性心脏病、支气管哮喘、肺炎（社区获得性）、肺结核、原发性支气管肺癌、呼吸衰竭（含血气分析判读）。',
    '循环系统疾病：心力衰竭（慢性急性）、心律失常（窦性房性室性传导阻滞预激颤动扑动的心电图与处理）、心脏瓣膜病、冠状动脉粥样硬化性心脏病（稳定与急性冠脉综合征）、原发性高血压、心肌疾病、心包疾病、感染性心内膜炎。',
    '消化系统疾病：急性慢性胃炎、消化性溃疡、胃癌、溃疡性结肠炎、肝硬化及其并发症、原发性肝癌、急性胰腺炎、上消化道出血。',
    '泌尿系统疾病：肾小球肾炎（急性慢性）、肾病综合征、尿路感染、慢性肾衰竭与血液透析指征；血液系统疾病：贫血分类与缺铁性贫血、再生障碍性贫血、白血病、淋巴瘤、白细胞减少与粒细胞缺乏、特发性血小板减少性紫癜；内分泌与代谢疾病：腺垂体功能减退症、甲状腺功能亢进与减退、糖尿病及其急慢性并发症、血脂异常、痛风、肥胖症。',
    '结缔组织病和风湿性疾病：类风湿关节炎、系统性红斑狼疮；神经系统疾病：脑梗死、脑出血、蛛网膜下腔出血、癫痫、帕金森病；常见急症：休克、急性中毒（有机磷杀虫药一氧化碳镇静催眠药）、中暑。',
  ]},
  { name: '传染病学', parts: [
    '传染病学总论：感染与免疫、传染病流行过程三环节两因素、传染病基本特征与临床特点、诊断治疗原则、预防措施与传染病报告制度；病毒性肝炎（甲乙丙丁戊型的流行病学临床分型诊断治疗预防）、流行性感冒与人感染禽流感、麻疹、水痘与带状疱疹、流行性腮腺炎、肾综合征出血热、流行性乙型脑炎。',
    '流行性脑脊髓膜炎、猩红热、伤寒与副伤寒、细菌性痢疾、霍乱、鼠疫、疟疾、钩端螺旋体病、血吸虫病、艾滋病；医院感染的概念与防控、消毒与隔离制度、常见传染病的报告时限分类要点。',
  ]},
  { name: '医学伦理学', parts: [
    '医学伦理学：研究对象与任务、发展史要点；医学伦理学的理论基础（生命论人道论义务论美德论功利论）；医学道德规范体系（原则与规范）；医患关系道德（医患关系模式、权利与义务、沟通伦理）；临床诊疗伦理（诊断治疗中的伦理要求、专科诊疗伦理）；医学科研伦理与人体试验伦理；公共卫生伦理；临终关怀与人体死亡伦理（安乐死的伦理争议）；医学道德评价（标准依据方式）、教育与修养；当前医学伦理热点（器官移植生殖克隆基因诊断与治疗卫生资源分配）。',
  ]},
  { name: '卫生法规', parts: [
    '卫生法规：执业医师法（考试注册执业规则考核培训法律责任）；医疗机构管理条例与实施细则要点；医疗事故处理条例（分级预防处置技术鉴定赔偿法律责任）；医疗纠纷预防和处理条例要点；传染病防治法（分类管理疫情报告控制措施医疗救治法律责任）；药品管理法与处方管理办法（处方权限书写规范限量保管）；抗菌药物临床应用管理办法要点；母婴保健法（婚前孕产期保健技术鉴定）；献血法；血液制品管理条例要点；突发公共卫生事件应急条例（报告与应急处理）；中医药法（服务与保护发展人才培养法律责任）；基本医疗卫生与健康促进法；医师外出会诊管理暂行规定；医疗废物管理条例要点。',
  ]},
  { name: '第一站病案分析', parts: [
    '实践技能第一站病案分析考试要点：病案书写规范（主诉现病史既往史个人史过敏史体格检查辅助检查的书写要求与格式）；中医辨病辨证依据的书写方法（主诉与四诊资料的归纳分析）；西医诊断依据书写要点；治法确立原则；方药选用与加减思路（方名药物组成剂量煎服法书写规范）；常见考试病种（感冒咳嗽哮病喘证胸痹心悸胃痛泄泻痢疾中风水肿淋证痹证腰痛郁证血证消渴等）的辨证分型要点与代表方剂梳理；中西医双诊断病案书写示例要点。',
  ]},
  { name: '第二站病史采集', parts: [
    '实践技能第二站病史采集考试要点：问诊的基本内容与顺序（一般项目主诉现病史既往史系统回顾个人史婚育史家族史）；十问要点（寒热汗头身胸腹耳目睡眠饮食口味二经带）；常见症状的问诊鉴别（发热疼痛咳嗽咯血呼吸困难心悸水肿恶心呕吐呕血便血腹泻黄疸抽搐意识障碍眩晕消瘦）；重点症状采集模板（起病情况与时间诱因主要症状特点伴随症状诊治经过一般情况）；医患沟通与问诊技巧（开场组织过渡追问核实结尾）。',
  ]},
  { name: '第二站中医操作', parts: [
    '实践技能第二站中医操作考试要点：毫针刺法（消毒进针方法指切夹持舒张提捏、针刺角度深度、行针基本手法与辅助手法、得气、单式补泻捻转提插、留针与出针）；针刺异常情况处理（晕针滞针弯针断针血肿气胸）；灸法（艾条灸温和雀啄回旋、艾炷灸直接间接隔姜隔盐隔蒜隔附子饼、温针灸）与施灸禁忌；拔罐法（留罐走罐闪罐刺络拔罐及注意事项）；其他针法（三棱针皮肤针皮内针电针）；推拿手法（滚法一指禅推法揉法摩法擦法推法拿法按法点法捏法捻法抖法搓法拍法击法摇法扳法）；常用腧穴定位与主治（高频考穴六十余个：定位骨度取穴与同身寸、主治、针刺深度角度与禁忌）；中医望闻问切四诊的操作规范（望舌脉诊的规范操作与叙述要点）。',
  ]},
  { name: '第二站中医临床答辩', parts: [
    '实践技能第二站中医临床答辩考试要点：中医基础理论与临床结合的高频答辩题（阴阳五行精气学说在临床的应用、脏腑生理功能与关系、气血津液的生理病理、病因病机分析思路）；常见病证的辨证论治答辩思路（肺系心系脾胃肝胆肾系气血津液肢体经络病证的辨证要点治法方药）；常用方剂的组成功用主治与配伍意义答辩（解表清热泻下补益理血祛痰治风祛湿安神开窍等类高频方剂）；常用中药的功效应用用法用量使用注意答辩；针灸治疗答辩要点（常见病证的治法主穴配穴方义操作）。',
  ]},
  { name: '第三站体格检查', parts: [
    '实践技能第三站体格检查考试要点：基本检查方法规范（视触叩听的规范手法叙述）；一般检查（体温脉搏呼吸血压的测量方法与正常值、发育营养意识状态面容表情体位步态皮肤检查、浅表淋巴结检查顺序与手法）；头部检查（眼耳鼻口腔咽扁桃体）；颈部检查（血管甲状腺气管）；胸部检查（胸廓与胸壁、肺脏视触叩听：呼吸运动触觉语颤叩诊音听诊正常与异常呼吸音啰音胸膜摩擦音；心脏视触叩听：心前区隆起心尖搏动震颤心界叩诊心率心律心音杂音心包摩擦音的检查方法与临床意义）；血管检查（脉搏周围血管征）；腹部检查（视触叩听：腹外形胃肠型蠕动波腹壁静脉血流方向、腹壁紧张度压痛反跳痛肿块、肝脾胆囊肾的触诊与叩诊、移动性浊音、肠鸣音振水音）；肛门直肠与外生殖器检查要点；脊柱四肢检查（弯曲度活动度压痛叩击痛、四肢关节形态与活动）；神经系统检查（肌力肌张力、共济运动、生理反射浅反射深反射、病理反射巴宾斯基征、脑膜刺激征颈强直凯尔尼格征布鲁津斯基征、拉塞格征）。',
  ]},
  { name: '第三站西医操作', parts: [
    '实践技能第三站西医操作考试要点：手术人员洗手（七步洗手法外科洗手）；穿脱手术衣与戴无菌手套；手术区皮肤消毒与铺巾；换药与拆线；伤口包扎与止血；心肺复苏（胸外按压开放气道人工呼吸的规范流程与质量指标电除颤配合）；简易呼吸器的使用；导尿术；胸膜腔穿刺术；腹腔穿刺术；腰椎穿刺术；骨髓穿刺术；吸氧术（鼻导管面罩）；胃管置入术；三腔二囊管使用要点；穿脱隔离衣；动静脉穿刺术要点。',
  ]},
  { name: '第三站西医临床答辩', parts: [
    '实践技能第三站西医临床答辩考试要点：常见西医疾病的诊断依据与处理原则答辩（呼吸循环消化泌尿血液内分泌神经系统的常见病）；辅助检查结果判读（血常规尿常规便常规肝肾功能血糖血脂电解质血气分析的心电图特征判读X线与CT的基本判读原则）；危重症的识别与初步处理（休克心律失常急性心衰呼吸衰竭脑血管意外急性中毒）；临床常用操作并发症的识别与处理；医患沟通与人文关怀答辩要点。',
  ]},
];

async function apiPost(pathname, body) {
  const r = await fetch(API + pathname, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function apiGet(pathname) {
  const r = await fetch(API + pathname, { headers: { 'x-admin-key': ADMIN_KEY } });
  return r.json();
}

function materialHash(text) {
  const norm = String(text || '').replace(/\s+/g, '').toLowerCase();
  return crypto.createHash('sha256').update('mat:' + norm, 'utf8').digest('hex');
}

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function waitFor(cond, timeoutMs, intervalMs, tag) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await cond()) return true;
    await sleep(intervalMs);
  }
  throw new Error('等待超时: ' + tag);
}

async function processSubject(sub) {
  const title = `${sub.name}·国家医考考纲`;
  let mat = db.prepare('SELECT * FROM materials WHERE title=?').get(title);
  if (!mat) {
    // 旧资料/旧知识点清理：停用该类目下非本次考纲资料的旧知识点与旧资料（可回滚：deprecated/rejected）
    const legacyMats = db.prepare("SELECT id, title, status FROM materials WHERE track='yikao' AND category=? AND title!=?").all(sub.name, title);
    const legacyIds = legacyMats.map((m) => m.id);
    if (legacyIds.length) {
      const ph = legacyIds.map(() => '?').join(',');
      const kpDep = db.prepare(`UPDATE knowledge_points SET status='deprecated' WHERE material_id IN (${ph}) AND status IN ('approved','pending','flagged')`).run(...legacyIds);
      const matRej = db.prepare(`UPDATE materials SET status='rejected' WHERE id IN (${ph}) AND status NOT IN ('rejected')`).run(...legacyIds);
      db.prepare("UPDATE questions SET status='rejected' WHERE track='yikao' AND category=? AND status IN ('pending','approved')").run(sub.name);
      log(`《${sub.name}》旧数据清理：停用旧知识点 ${kpDep.changes} 条，下线旧资料 ${matRej.changes} 个（${legacyMats.map((m) => '#' + m.id).join(',')}），旧题转驳回`);
    } else {
      // 无旧资料场景：仅清掉历史遗留的散题/散知识点
      const kpDep = db.prepare("UPDATE knowledge_points SET status='deprecated' WHERE track='yikao' AND category=? AND status IN ('approved','pending','flagged') AND material_id NOT IN (SELECT id FROM materials WHERE title=?)").run(sub.name, title);
      if (kpDep.changes) log(`《${sub.name}》清理游离知识点 ${kpDep.changes} 条`);
    }
    log(`《${sub.name}》开始编写考纲汇编（${sub.parts.length} 部分）`);
    const chunks = [];
    for (let i = 0; i < sub.parts.length; i++) {
      const text = await ds(OUTLINE_SYS, outlineUser(sub.name, sub.parts[i], i + 1, sub.parts.length), `${sub.name}·P${i + 1}`);
      chunks.push(text.trim());
      log(`《${sub.name}》第 ${i + 1}/${sub.parts.length} 部分完成（${text.length} 字）`);
    }
    const full = chunks.join('\n\n');
    const hash = materialHash(full);
    const info = db.prepare(`INSERT INTO materials (title, track, category, format, file_path, text_content, grade, status, uploader_id, uploader_name, visibility, org_id, content_hash)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(title, 'yikao', sub.name, 'text', null, full, 'A', 'pending', '1', '知识工厂', 'PUBLIC', 0, hash);
    mat = db.prepare('SELECT * FROM materials WHERE id=?').get(info.lastInsertRowid);
    log(`《${sub.name}》资料#${mat.id} 已创建（${full.length} 字）`);
  } else {
    log(`《${sub.name}》资料#${mat.id} 已存在（status=${mat.status}），跳过编写`);
  }

  // 解析（如未解析）——P8-5a 修复：等待条件必须覆盖 pending 与 parsing 两个中间态，
  // 解析启动后状态先变为 parsing，仅判断 !==pending 会在解析未完成时误放行
  if (mat.status === 'pending') {
    const r = await apiPost(`/materials/${mat.id}/parse`, {});
    log(`《${sub.name}》解析启动: ${JSON.stringify(r).slice(0, 120)}`);
  }
  if (mat.status === 'pending' || mat.status === 'parsing') {
    await waitFor(async () => {
      const m = db.prepare('SELECT status FROM materials WHERE id=?').get(mat.id);
      return m.status !== 'pending' && m.status !== 'parsing';
    }, 40 * 60 * 1000, 15 * 1000, `${sub.name} 解析`);
  }
  mat = db.prepare('SELECT * FROM materials WHERE id=?').get(mat.id);
  if (mat.status === 'rejected') throw new Error(`《${sub.name}》资料被驳回`);
  log(`《${sub.name}》资料状态: ${mat.status}`);

  // 审核资料
  if (mat.status !== 'approved') {
    db.prepare(`UPDATE materials SET status='approved', updated_at=datetime('now','localtime') WHERE id=?`).run(mat.id);
    log(`《${sub.name}》资料已审核通过`);
  }

  // 审核知识点
  const kpAppr = db.prepare("UPDATE knowledge_points SET status='approved' WHERE material_id=? AND status='pending'").run(mat.id);
  const kpCount = db.prepare('SELECT COUNT(*) c FROM knowledge_points WHERE material_id=? AND status=?').get(mat.id, 'approved').c;
  log(`《${sub.name}》知识点：本次审核 ${kpAppr.changes} 条，累计可用 ${kpCount} 条`);

  // 出题（如该类目无可用题）
  const qOk = db.prepare("SELECT COUNT(*) c FROM questions WHERE track='yikao' AND category=? AND status!='rejected'").get(sub.name).c;
  if (qOk > 0) {
    log(`《${sub.name}》已有 ${qOk} 道可用题，跳过出题`);
    return;
  }
  const gr = await apiPost('/questions/generate-full', { track: 'yikao', category: sub.name, level: 1 });
  if (!gr.success) throw new Error('generate-full 失败: ' + JSON.stringify(gr));
  const taskId = Number(gr.taskId);
  log(`《${sub.name}》出题任务#${taskId} 启动`);
  await waitFor(async () => {
    const t = db.prepare('SELECT status, done_groups, total_groups FROM gen_tasks WHERE id=?').get(taskId);
    return t.status === 'done' || t.status === 'failed';
  }, 90 * 60 * 1000, 15 * 1000, `${sub.name} 出题任务#${taskId}`);
  const t = db.prepare('SELECT * FROM gen_tasks WHERE id=?').get(taskId);
  log(`《${sub.name}》出题任务#${taskId} 结束: ${t.status} done=${t.done_groups}/${t.total_groups} created=${t.created_q} err=${t.error || '-'}`);
  if (t.status === 'failed') throw new Error(`出题任务失败: ${t.error}`);
  if (t.created_q === 0) throw new Error(`《${sub.name}》零题生成告警：任务完成但未创建任何题目（禁止静默空转，标记科目失败待人工排查）`);

  // 出题后质量抽查：题型分布 / 选项数 / 答案字母分布 / 难度分布 / 污染词检查
  const qs = db.prepare("SELECT type, difficulty, options, answer, stem, analysis FROM questions WHERE track='yikao' AND category=? AND status!='rejected'").all(sub.name);
  const byType = {}, byDiff = {}, byAns = {};
  let opt5 = 0, bad = 0, fmtBad = 0;
  for (const q of qs) {
    byType[q.type] = (byType[q.type] || 0) + 1;
    byDiff[q.difficulty] = (byDiff[q.difficulty] || 0) + 1;
    byAns[q.answer] = (byAns[q.answer] || 0) + 1;
    let opts = [];
    try { opts = JSON.parse(q.options || '[]'); } catch {}
    if (q.type === 'single' && opts.length === 5) opt5++;
    if ((q.stem + (q.analysis || '')).match(/倪海厦|汉唐|人纪|天纪/)) bad++;
    // P7-TCM-EXAM-01 3.3：答案格式校验——新题必须字母、选项必须 5 个
    if (q.type === 'single' && (opts.length !== 5 || !/^[A-E]$/.test(String(q.answer).trim().toUpperCase()))) fmtBad++;
  }
  log(`《${sub.name}》出题验收：共${qs.length}道 | 题型${JSON.stringify(byType)} | 难度${JSON.stringify(byDiff)} | 5选项single ${opt5}道 | 答案分布${JSON.stringify(byAns)} | 污染词命中 ${bad} 处 | 格式不符 ${fmtBad} 道`);
  if (bad > 0 || fmtBad > 0) {
    throw new Error(`《${sub.name}》质检阻断：污染词 ${bad} 处、格式不符 ${fmtBad} 道（不进入正式题库，需人工复核后再放行）`);
  }
}

(async () => {
  log('===== P8-5a 医考全科目批量流水线启动（P7-TCM-EXAM-01 加固版：唯一锁+状态机+零题告警） =====');
  // ---- P7-TCM-EXAM-01 4.3：单任务唯一锁，禁止重复启动 ----
  const LOCK = '/root/p8_batch.lock';
  if (fs.existsSync(LOCK)) {
    const oldPid = fs.readFileSync(LOCK, 'utf8').trim();
    let alive = false;
    try { process.kill(Number(oldPid), 0); alive = true; } catch (e) { alive = false; }
    if (alive) {
      log(`[锁] 已有任务运行中 (pid=${oldPid})，本次启动终止（禁止重复启动）`);
      process.exit(1);
    }
    log(`[锁] 检测到陈旧锁 (pid=${oldPid} 已退出)，接管并重建锁`);
  }
  fs.writeFileSync(LOCK, String(process.pid));
  process.on('exit', () => { try { fs.unlinkSync(LOCK); } catch (e) {} });
  process.on('SIGINT', () => { log('[锁] 手动中断，释放锁'); process.exit(0); });
  process.on('SIGTERM', () => { log('[锁] 被终止，释放锁'); process.exit(0); });

  // ---- P7-TCM-EXAM-01 4.3：科目级状态机（待处理/解析中/待审核/生成中/质检中/已发布/失败），支持从失败科目恢复 ----
  const STATE_FILE = '/root/p8_batch_state.json';
  const loadState = () => { try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch (e) { return {}; } };
  const saveState = (s) => fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
  const state = loadState();

  // 历史资料标题清理：去除「汉唐」字样（保留倪海厦署名，去除机构品牌名）
  const ht = db.prepare("UPDATE materials SET title=TRIM(REPLACE(title,'汉唐','')) WHERE title LIKE '%汉唐%'").run();
  if (ht.changes) log(`历史资料标题清理「汉唐」：${ht.changes} 条`);

  let ok = 0;
  let fail = 0;
  let skipped = 0;
  const failures = [];
  for (const sub of SUBJECTS) {
    const st = state[sub.name];
    if (st === 'published') { skipped++; log(`[状态机] 《${sub.name}》已发布，跳过`); continue; }
    state[sub.name] = 'parsing'; saveState(state);
    try {
      await processSubject(sub);
      state[sub.name] = 'published'; saveState(state);
      ok++;
    } catch (e) {
      fail++;
      state[sub.name] = 'failed'; state[`${sub.name}#error`] = String(e.message).slice(0, 300); saveState(state);
      failures.push(sub.name);
      log(`《${sub.name}》处理失败（继续下一科目）: ${e.message}`);
    }
  }
  log(`===== 流水线结束：成功 ${ok} 科，跳过 ${skipped} 科，失败 ${fail} 科 ${failures.length ? '（失败科目: ' + failures.join('、') + '，重跑本脚本可从失败科目恢复）' : ''} =====`);
  if (failures.length) process.exitCode = 2;
  process.exit(0);
})().catch((e) => {
  log('FATAL: ' + (e.stack || e.message));
  process.exit(1);
});
