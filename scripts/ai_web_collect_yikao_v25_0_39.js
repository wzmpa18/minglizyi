#!/usr/bin/env node
/**
 * v25.0.39 AI 网络采集功能首跑：医考备考经验与应试技巧（公域采集·原创整理）
 * 用户指令：AI 需具备从公域网络收集该领域大咖考试经验/绝招的能力，用于训练用户；
 *          医考轨道严格按国家规范，采集内容只作学习资料（不进模拟卷题库），人名/机构/课程一律脱敏。
 *
 * 流程：登记采集来源(source_registry) → 确保类目(备考攻略) → 落资料+采集声明 → 触发混元解析
 *      → 知识点污染扫描 → 审核上线（学习资料，不出题）
 * 幂等可重跑。运行：node /root/ai_web_collect_yikao_v25_0_39.js
 */
'use strict';
require('/www/yandaoguoxue-backend/node_modules/dotenv').config({ path: '/www/yandaoguoxue-backend/.env' });
const crypto = require('crypto');
const Database = require('/www/yandaoguoxue-backend/node_modules/better-sqlite3');

const DB_PATH = '/www/yandaoguoxue-backend/data/academy.db';
const API = 'http://127.0.0.1:3001/api/academy';
const KEY = (process.env.ADMIN_API_KEY || '').trim();
const D = new Database(DB_PATH);
D.exec('PRAGMA busy_timeout = 10000');

const log = (m) => console.log(`[${new Date().toISOString().slice(5, 19).replace('T', ' ')}] ${m}`);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function api(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-admin-key': KEY },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

// 污染词：采集内容脱敏校验（机构/讲师/课程/营销词）
const POLLUTE = ['掌中书', '上学吧', '丁香园', '优题宝', '青医说', '昭昭', '医学教育网', '正保', '大苗', '菲菲',
  '老师', '讲师', '名师', '网课', '课程', '押题', '保过', '内部资料', '培训班', '机构'];

const MATERIAL_TITLE = '医考备考经验与应试技巧汇编（公域采集·原创整理）';
const SOURCES_JSON = {
  collectType: 'web_collection',
  collectedAt: '2026-08-19',
  collector: 'project_owner_authorized',
  sourceUrls: [
    'https://m.sohu.com/a/1043187341_122462842/',
    'https://tk.shangxueba.com/zn/FAQTyE9i.html',
    'https://3g.dxy.cn/bbs/topic/53577446',
    'https://www.bilibili.com/opus/1210700454152896520',
  ],
  rewriteStatement: '公域公开备考经验材料经 AI 原创整理改写，去除全部机构名/讲师名/课程名/营销话术；内容为通用学习方法与应试技巧，不含考纲外知识主张',
  usageRule: '仅作医考学习资料（track=yikao, category=备考攻略），严禁进入医考模拟卷题库（3.2 独立轨道规范）',
};

const CONTENT = `# 医考备考经验与应试技巧汇编（公域采集·原创整理）

说明：本资料由项目方通过公域网络公开渠道采集多份备考经验材料，经 AI 原创整理改写而成；已按要求去除一切机构名、讲师名、课程名；内容仅为学习方法与应试技巧参考，不构成任何考试通过承诺。

## 第一章 医学综合笔试机考应试策略

### 1.1 机考环境三大特点
中医类别医师资格考试医学综合笔试实行计算机化考试。与纸笔考试相比有三个关键差异：其一，每单元答题时间更紧凑，省去填涂答题卡的时间但题量不减，要求更高的做题节奏；其二，题目按科目乱序排列，相邻两题可能分属不同学科，知识提取不能依赖章节惯性；其三，跨题型不可回看，进入下一题型后无法返回修改上一题型的答案，这是每年考生失分最多的坑。

### 1.2 审题技巧：一头一尾法
拿到题干先看头尾：头部抓性别、年龄、既往史等背景信息，尾部抓设问方向——尤其要圈出是"正确的是"还是"不正确的是""错误的是"这类否定式设问。大量失分源于否定词漏看，把选错误做成选正确。

### 1.3 A1型题应对要点
A1型题直接考查概念、定义、机制、数值与法规条文。解题要点：第一，五个选项可能多个表述都正确，必须选出最符合题意的一项；第二，警惕绝对化表述，含有"一定""全都""肯定""必然"等绝对化词语的选项大概率是干扰项；第三，举棋不定时，表述完整、字数较多的选项往往更接近正确答案。

### 1.4 A2/A3型病例题三眼出答案法
第一步先扫选项，知道这道题在考什么考点；第二步看题干最后一句设问，明确考点落点；第三步回扫题干关键信息（主诉、典型体征、检查结果）锁定答案。病例题的核心是建立"症状到诊断到治疗"的临床思维链。

### 1.5 时间管理与分段检查
按先易后难、段内检查的节奏推进：每进入下一个题型段落前，把当前段落快速检查一遍，因为之后无法回头。遇到卡壳题先标记跳过，避免单题超时挤占后续答题时间。

## 第二章 分阶段备考方法论

### 2.1 四阶段备考规划
基础阶段：快速搭建中医基础理论、中医诊断学、中药学、方剂学四大基础科目的知识框架，用精简考点手册通读，配合章节题检测薄弱点。突破阶段：主攻中医内科学、针灸学等高分科目，按"病证、证型、治法、方剂"逻辑链系统学习各病证分型。刷题阶段：每日一套真题或专项卷，严格计时模拟，错题回归知识点。冲刺阶段：复盘错题本与高频考点，完成全真模拟，调整生物钟与心态。

### 2.2 抓大放小的分值梯队策略
时间有限时按分值投入：高分科目（中医内科、针灸、方剂、中药）优先吃透；基础科目保高频记忆；分值低、难度高的偏难怪考点果断放弃。医师资格考试是通过性考试，不追求满分，优先拿稳基础分。

### 2.3 真题为王原则
近五年真题至少完整刷两遍：第一遍按科目刷，掌握出题规律与高频考点；第二遍按套卷刷，训练时间分配。真题反复考查的知识点就是高频考点。

### 2.4 错题本复盘法
错题不能只抄不思。每道错题标注三要素：错因（审题失误、知识盲区或思路偏差）、正确考点、关联知识点。考前最后一周只看错题本，不再做新题。

### 2.5 碎片时间利用
通勤、午休等碎片时间用手机刷章节题或听考点音频，把大块时间留给系统学习与套卷模拟。

## 第三章 实践技能三站实战要点

### 3.1 第一站病案分析答题框架
病案分析考察中医临床思维。答题必须写足核心得分点：中医疾病诊断、证候类型、辨证依据、治法、方剂名称与药物组成、类证鉴别。答题原则：第一直觉优先，落笔后不要大面积涂改；字迹工整、不超答题框；病因病机大方向正确即可得分；药物组成不必逐字精确，但不能寒热颠倒，热证处方不能堆砌热药；剂量写常规范围，特殊煎服法不确定就不写；煎服法可统一写"三剂，水煎服，每日一剂，分三次服"。

### 3.2 第二站病史采集五要素
病史采集按五要素模板展开：发病诱因、主症特点（部位、性质、程度、持续时间）、伴随症状、诊疗经过、一般情况（饮食、睡眠、二便等）。信息量越完整得分越高，符合逻辑的前提下多说多得分。

### 3.3 第二站腧穴定位技巧
先报穴位归属经脉，再用骨度分寸或解剖标志描述定位，指认正确即有基础分；拿不准时依据解剖标志描述相对位置，定位合理即酌情给分。抽取的两个穴位即使不熟也要按解剖关系给出合理描述。

### 3.4 中医操作边做边说
操作时边操作边口述要点，说比做重要——口述标准流程能让考官确认你熟悉规范，即使手上稍慢也能拿分。操作前告知患者并征得配合，操作后致谢并告知结果。

### 3.5 第三站无菌观念与人文关怀
无菌观念是底线：任何疑似污染动作要立即口述纠正，例如手套外侧触碰污染物时立即口述"手套外侧被污染，需立即更换手套"，主动口述无菌原则反而体现操作意识。人文关怀是红线：操作前告知与征得配合、检查时遮挡隐私部位、操作后告知结果与致谢；缺乏人文关怀可能被一票否决。查体注意双侧对比：甲状腺检查、神经反射等项目必须查双侧，只查一侧会扣分；视诊项目必须口述并汇报检查结果。

### 3.6 临床答辩的放弃策略
遇到完全不会的答辩问题：礼貌表达"本题难度较大，我尝试从基础角度分析"，从基础病理生理角度展开；不纠结、不卡壳，把精力留给有把握的环节，避免心态崩盘影响后续站点。

### 3.7 技能考试通用心法
技能考不追求完美操作，追求流畅沟通与严谨安全意识。考前找搭档模拟演练，把每句操作口述台词念熟，比脑内过十遍更有效。

## 第四章 中医知识记忆方法

### 4.1 方剂歌诀记忆法
以经典方歌为纲记忆方剂组成、主治与配伍意义，例如"麻黄汤中用桂枝，杏仁甘草四般施"；先背方歌再拆解每味药的配伍角色，形成"方名、组成、功效、主治"的完整记忆链条。

### 4.2 逻辑链记忆法
中医内科按"病证、证型、治法、方剂"四级逻辑链记忆，每学一个病证就画出逻辑树，临床科目变成结构化网络而非孤立条目。

### 4.3 对比鉴别记忆法
易混知识成对记忆：易混病证（如中风与痫证）、易混药物功效（如苍术与白术）、易混方剂主治，整理对比表抓差异点记忆，考场鉴别题直接调用。

### 4.4 思维导图体系化
中医基础理论按藏象、气血津液、经络、病因病机等模块画思维导图，把碎片知识挂到体系树上，乱序出题时也能快速定位知识点所属模块。

### 4.5 高频优先记忆法
按真题考查频次排序记忆：高频考点反复记，低频考点理解即可。数值类（正常值、剂量、时限）与条文类（法规年限、处方限量）单独汇总成速记表。

## 第五章 考前状态与临场心态

### 5.1 考前作息调整
考前一周逐步把生物钟调整到考试时段，保证睡眠，避免熬夜突击；适当运动减压。

### 5.2 考前三天策略
不做新题、不学新知识，只复盘错题本、高频速记表与知识框架图，维持熟练度与信心。

### 5.3 临场心态管理
进入考场后先做有把握的题建立信心；遇到难题按既定策略处理（排除法、标记跳过），不让单题影响整体节奏；相信第一直觉，无充分理由不轻易改答案。

免责声明：本资料为学习方法与应试技巧整理，仅供学习参考，不构成任何考试通过承诺或专业建议。`;

(async () => {
  // ---- 1. 登记采集来源 ----
  let src = D.prepare("SELECT id FROM source_registry WHERE name=?").get('公域网络采集·医考备考经验');
  if (!src) {
    const r = D.prepare("INSERT INTO source_registry (name, source_type, author, auth_level, license_note) VALUES (?,?,?,?,?)")
      .run('公域网络采集·医考备考经验', 'web_collection', '', 5,
        'v25.0.39 AI网络采集功能：公域公开备考经验材料，AI原创改写+机构/讲师/课程全脱敏；仅作学习资料，严禁进入医考模拟卷题库');
    src = { id: Number(r.lastInsertRowid) };
    log(`采集来源已登记 #${src.id}（web_collection）`);
  } else log(`采集来源已存在 #${src.id}`);

  // ---- 2. 确保类目 ----
  let cat = D.prepare("SELECT id FROM categories WHERE track='yikao' AND name='备考攻略' AND status='active'").get();
  if (!cat) {
    const maxSort = D.prepare("SELECT MAX(sort) s FROM categories WHERE track='yikao'").get().s || 0;
    const r = D.prepare("INSERT INTO categories (track, name, sort) VALUES ('yikao','备考攻略',?)").run(maxSort + 1);
    cat = { id: Number(r.lastInsertRowid) };
    log(`类目[备考攻略]已创建 #${cat.id}`);
  } else log(`类目[备考攻略]已存在 #${cat.id}`);

  // ---- 3. 落资料（幂等）----
  const matHash = crypto.createHash('sha256').update('mat:' + CONTENT.replace(/\s+/g, '').toLowerCase(), 'utf8').digest('hex');
  let mat = D.prepare("SELECT id, status FROM materials WHERE title=?").get(MATERIAL_TITLE);
  if (!mat) {
    const r = D.prepare(`INSERT INTO materials (title, track, category, format, text_content, grade, status, uploader_id, uploader_name, visibility, content_hash, source_id, declaration_json)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(MATERIAL_TITLE, 'yikao', '备考攻略', 'text', CONTENT, 'B', 'pending', 'project_owner_authorized', '项目方', 'PUBLIC', matHash, src.id, JSON.stringify(SOURCES_JSON));
    mat = { id: Number(r.lastInsertRowid), status: 'pending' };
    log(`资料已登记 #${mat.id}（含采集来源声明）`);
  } else log(`资料已存在 #${mat.id}（${mat.status}）`);

  if (mat.status === 'pending') {
    // ---- 4. 触发混元解析 ----
    const pr = await api('POST', `/materials/${mat.id}/parse`);
    log(`解析触发: ${JSON.stringify(pr.data).slice(0, 120)}`);
    // ---- 5. 等待解析 ----
    let waited = 0;
    while (waited < 1800) {
      await sleep(20000); waited += 20;
      const s = D.prepare('SELECT status, parse_note FROM materials WHERE id=?').get(mat.id);
      if (s.status !== 'parsing') { log(`解析结束: ${s.status} / ${String(s.parse_note).slice(0, 100)}`); break; }
      if (waited % 120 === 0) log(`...解析中 ${waited}s`);
    }
  }

  // ---- 6. 知识点污染扫描 + 审核 ----
  const kps = D.prepare("SELECT id, title, content FROM knowledge_points WHERE material_id=? AND status='pending'").all(mat.id);
  if (!kps.length) { log('无待审核知识点'); }
  else {
    let clean = 0, dirty = 0;
    for (const kp of kps) {
      const blob = kp.title + ' ' + kp.content;
      const hit = POLLUTE.find(w => blob.includes(w));
      if (hit) {
        D.prepare("UPDATE knowledge_points SET status='rejected' WHERE id=?").run(kp.id);
        D.prepare("INSERT INTO kp_events (kp_id, event, actor, detail) VALUES (?,?,?,?)")
          .run(kp.id, 'reject', 'project_owner_authorized', `v25.0.39采集脱敏拦截：${hit}`);
        dirty++;
      } else clean++;
    }
    if (clean) {
      D.prepare("UPDATE knowledge_points SET status='approved', reviewer='project_owner_authorized', review_time=datetime('now','localtime') WHERE material_id=? AND status='pending'").run(mat.id);
    }
    D.prepare("UPDATE materials SET status='parsed' WHERE id=?").run(mat.id);
    D.prepare("INSERT INTO loc_op_logs (admin_id, action, target, detail) VALUES (?,?,?,?)")
      .run('project_owner_authorized', 'ai_web_collect', `materials#${mat.id}`,
        `v25.0.39 AI网络采集首跑：公域医考备考经验汇编入库（${clean}知识点通过脱敏审核，${dirty}拦截）`);
    log(`知识点审核：通过 ${clean} / 拦截 ${dirty}`);
  }

  const total = D.prepare("SELECT COUNT(*) n FROM knowledge_points WHERE material_id=?").get(mat.id).n;
  const ok = D.prepare("SELECT COUNT(*) n FROM knowledge_points WHERE material_id=? AND status='approved'").get(mat.id).n;
  log(`完成：资料#${mat.id} 共 ${total} 知识点，已上线 ${ok}（学习中心-医考-备考攻略 可见）`);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
