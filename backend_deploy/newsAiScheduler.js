// ============================================================================
// 言道国学 - 行业资讯 AI 定时维护（v25.0.78 P6b）
//
// 背景：发现页「行业资讯」原为静态默认库（2026-07/08 日期），无法保鲜。
// 本脚本每日由 cron 触发，自动补充新鲜的知识类资讯条目：
//   1. AI 生成主路径：混元（tokenhub，与公众号内容引擎同一凭据）按主题池轮换生成
//   2. 模板池降级：AI 未配置/失败时用内置知识条目（保证资讯不中断）
//   3. 合规三重门禁：营销词表 + 医疗/迷信风险模式 + 字段长度校验（同 newsRoutes 口径）
//   4. 标题去重：与现有条目 Jaccard 相似度 > 0.55 拒绝
//   5. 来源合规：AI/模板条目来源标注「言道国学·传统文化知识库」，链接指向站内频道
//      （不冒充权威机构编造新闻——合规红线）
//   6. 上限控制：AI 条目（id 前缀 ai_）超过 60 条时删除最旧
//   7. 幂等：data/news_ai_state.json 记录当日成功状态，同日重复运行自动跳过
//   8. 原子写入：tmp + rename，避免半写损坏 news_items.json
//
// 用法（服务器 crontab，每日 07:10，避开公众号调度 06:40~07:50 高峰）：
//   10 7 * * * cd /www/yandaoguoxue-backend && node newsAiScheduler.js >> logs/news_ai.log 2>&1
//
// 手动验证：node newsAiScheduler.js（输出每日新增明细）
// ============================================================================
'use strict';

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'news_items.json');
const STATE_FILE = path.join(DATA_DIR, 'news_ai_state.json');

const DAILY_ADD = Number(process.env.NEWS_AI_DAILY_ADD || 2);   // 每日新增条数
const AI_ITEM_MAX = 60;                                          // AI 条目总量上限
const SITE_BASE = process.env.SITE_BASE || 'https://yandaoguoxue.yandao.vip';
const SOURCE_LABEL = '言道国学·传统文化知识库';

// ==================== 合规门禁（口径同 newsRoutes.js + wechatContentEngine.js） ====================
const COMPLIANCE_BLOCKED_TERMS = [
  '全网第一', '全国第一', '全球第一', '第一品牌', '顶级', '极品',
  '100%准确', '百分百准确', '包治', '根治', '治愈率100%', '药到病除',
  '分享赚钱', '转发赚钱', '邀请返利', '躺赚', '日入过万', '稳赚不赔', '零风险',
  '加微信', '加V', '扫码加', '限时抢购', '秒杀', '优惠券', '下单购买',
  '代购', '带货', '招商加盟', '砍价', '推广链接',
];
const RISK_PATTERNS = [
  /(治愈|根治|包治|疗效显著|药到病除|痊愈率|不用去医院|自行用药|处方参考)/,
  /(改命|转运消灾|化解灾难|破财免灾|算命很准|命中注定无法改变|改运)/,
  /(必看|震惊|不然后悔|错过再等|史上最|全网最)/,
];

function complianceHits(text) {
  const hits = [];
  for (const t of COMPLIANCE_BLOCKED_TERMS) if (text.includes(t)) hits.push(t);
  for (const p of RISK_PATTERNS) if (p.test(text)) hits.push(p.source.slice(0, 24));
  return hits;
}

function validateItem(item) {
  const title = String(item.title || '').trim();
  const summary = String(item.summary || '').trim();
  if (title.length < 4 || title.length > 80) return '标题须4~80字';
  if (summary.length < 10 || summary.length > 300) return '摘要须10~300字';
  if (item.category !== 'zhongyi' && item.category !== 'yixue') return '分类不合法';
  if (!/^https?:\/\/.+/.test(String(item.sourceUrl || ''))) return '链接不合法';
  return null;
}

// ==================== 标题去重（Jaccard 二元语法，同 wechatContentEngine） ====================
function bigrams(s) {
  const t = String(s || '').replace(/\s+/g, '');
  const set = new Set();
  for (let i = 0; i < t.length - 1; i++) set.add(t.slice(i, i + 2));
  return set;
}
function titleSimilarity(a, b) {
  const A = bigrams(a), B = bigrams(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}
function isDuplicate(title, items) {
  return items.some((it) => titleSimilarity(title, it.title) > 0.55);
}

// ==================== 存储层（与 newsRoutes.js 同格式） ====================
function readItems() {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}
function writeItemsAtomic(items) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ items, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
  fs.renameSync(tmp, DATA_FILE);
}
function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return {}; }
}
function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}
function today() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}
function dayOfYear() {
  const d = new Date(Date.now() + 8 * 3600 * 1000);
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.floor((d.getTime() - start) / 86400000) + 1;
}

// ==================== AI 生成（主路径） ====================
const AI_THEMES = [
  { theme: '秋季养生与节气食疗', category: 'zhongyi' },
  { theme: '经络穴位日常保健', category: 'zhongyi' },
  { theme: '药食同源与体质调养', category: 'zhongyi' },
  { theme: '情志调摄与睡眠养生', category: 'zhongyi' },
  { theme: '传统功法八段锦要点', category: 'zhongyi' },
  { theme: '中医基础知识科普', category: 'zhongyi' },
  { theme: '二十四节气与传统历法', category: 'yixue' },
  { theme: '天干地支纪年原理', category: 'yixue' },
  { theme: '《周易》卦象哲学解读', category: 'yixue' },
  { theme: '传统文化典故与民俗', category: 'yixue' },
  { theme: '古籍保护与传统文化教育', category: 'yixue' },
  { theme: '五行学说的文化源流', category: 'yixue' },
];

async function callAI(themeItem, seed) {
  const apiKey = process.env.HUNYUAN_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '';
  if (!apiKey) throw new Error('AI服务未配置');
  const useHunyuan = !!process.env.HUNYUAN_API_KEY;
  const model = process.env.WECHAT_CONTENT_MODEL || process.env.HUNYUAN_MODEL || 'hy3';
  const apiUrl = process.env.HUNYUAN_API_URL || 'https://tokenhub.tencentmaas.com/v1/chat/completions';
  const messages = [
    {
      role: 'system',
      content: '你是言道国学APP资讯编辑，为「行业资讯」栏目生成传统文化知识卡片。只输出 JSON，不要任何其他文字。',
    },
    {
      role: 'user',
      content: `主题：${themeItem.theme}\n要求：\n1. 标题15~30字，客观知识性表述，不用感叹号和问号，不用营销词汇\n2. 摘要80~160字，内容为可靠的传统文化或中医基础知识，不给出诊疗建议\n3. 不得出现绝对化用语（第一/顶级/100%）、医疗承诺（根治/包治）、迷信表述（改运/消灾）\n4. 分类固定为 ${themeItem.category}\n输出JSON：{"title":"","summary":"","category":"${themeItem.category}"}\n（角度参考序号${seed}，避免与其他常识角度雷同）`,
    },
  ];
  let lastErr = null;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages, max_tokens: 600, temperature: 0.7 }),
      });
      const raw = await res.text();
      if (!raw || !raw.trim()) throw new Error('AI响应为空');
      const data = JSON.parse(raw);
      if (!res.ok || !data.choices || !data.choices[0]) throw new Error(`AI调用失败: ${res.status}`);
      const content = (data.choices[0].message && data.choices[0].message.content) || '';
      const m = content.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('AI输出无JSON');
      const parsed = JSON.parse(m[0]);
      logAiUsage(data.usage || {}, model, useHunyuan);
      return { title: parsed.title, summary: parsed.summary, category: parsed.category };
    } catch (e) {
      lastErr = e;
      if (i < 2) await new Promise((r) => setTimeout(r, 5000));
    }
  }
  throw lastErr;
}

// AI 用量记账（复用 ai_call_logs，scene 区分；失败不影响主流程）
function logAiUsage(usage, model, useHunyuan) {
  try {
    const { getDb } = require('./wechatOaDb');
    getDb().prepare(`INSERT INTO ai_call_logs(scene, tokens_in, tokens_out, request_id, user_id, feature_key, model, provider_id, estimated_cost, duration_ms, status)
      VALUES('news_ai', ?, ?, ?, '', 'news_ai', ?, ?, 0, 0, 'success')`)
      .run(usage.prompt_tokens || 0, usage.completion_tokens || 0, `news_ai_${Date.now()}`, model, useHunyuan ? 'tencent' : 'deepseek');
  } catch { /* 记账失败不阻断 */ }
}

// ==================== 模板池降级（AI 未配置/失败时保鲜兜底） ====================
const TEMPLATE_POOL = [
  { title: '秋燥时节的润肺食养：银耳、百合与梨的性味特点', summary: '传统食养认为秋季气候干燥，宜选滋润类食材。银耳性平味甘，百合润而不腻，梨清热生津，常被用于秋季日常膳食搭配。食养讲究因人制宜，脾胃虚寒者宜适量并搭配温性食材。', category: 'zhongyi' },
  { title: '足三里穴的位置定位与日常按揉方法', summary: '足三里位于小腿前外侧，外膝眼下约四横指处，是传统保健要穴。日常可用拇指指腹按揉，每次数分钟，力度以酸胀为度。穴位保健属于传统养生文化内容，如有疾病请及时就医。', category: 'zhongyi' },
  { title: '药食同源理念下山药薏米粥的搭配思路', summary: '山药与薏米均为传统药食同源食材，前者性平味甘，后者利湿健脾，两者搭配煮粥是常见的家常食养方式。药食同源体现传统饮食文化智慧，日常食用仍需结合个人体质酌情调整。', category: 'zhongyi' },
  { title: '传统作息文化中的「子午觉」概念解读', summary: '子时（23点至1点）与午时（11点至13点）分别是昼夜的阴阳转换节点，传统养生提倡此时段安睡休息，称为「子午觉」。这一作息理念体现了古人对自然节律的观察与顺应。', category: 'zhongyi' },
  { title: '中医「七情」学说与情绪调摄的文化源流', summary: '七情指喜、怒、忧、思、悲、恐、惊七种情志活动。传统医学认为情志过极影响气血运行，提倡心态平和、遇事从容，是传统文化中身心一体观的重要体现。', category: 'zhongyi' },
  { title: '八段锦第一式「两手托天理三焦」动作要领', summary: '八段锦是流传甚广的传统健身功法。第一式双手交叉上托，配合缓慢深长的呼吸，意在舒展躯干。练习时动作宜缓慢柔和，循序渐进，以自觉舒适为度。', category: 'zhongyi' },
  { title: '常见养生茶饮的性味特点与适宜人群', summary: '菊花茶性微寒适合日常清润，陈皮水性温理气，枸杞茶平补。传统茶饮讲究辨体选用：虚寒体质宜温性茶饮，燥热体质宜清凉茶饮，且不宜长期单一饮用。', category: 'zhongyi' },
  { title: '中医体质辨识中「平和质」的特征与调养原则', summary: '平和质指阴阳气血调和、体态适中、精力充沛的体质状态。调养原则为饮食有节、起居有常、劳逸结合，保持原有良好生活习惯即可，无需刻意进补。', category: 'zhongyi' },
  { title: '艾灸保健的基础知识与使用注意', summary: '艾灸以点燃的艾条温熨穴位，是传统外治法之一。保健灸常用足三里、关元等穴位，每次十余分钟，以局部温热红晕为度。皮肤破损、发热及孕妇等人群不宜自行施灸。', category: 'zhongyi' },
  { title: '《黄帝内经》「治未病」理念的现代解读', summary: '「治未病」强调在疾病发生之前注重调养预防，包括顺应四时、饮食有节、起居有常、情志调畅等方面。这一理念与现代预防医学的健康管理思路有相通之处。', category: 'zhongyi' },
  { title: '泡脚养生的水温时长与传统依据', summary: '温水泡脚可促进足部血液循环，传统认为足部有多条经络循行。水温以40℃左右为宜，时间15~20分钟，饭后一小时内不宜泡脚，糖尿病及感觉障碍者需注意水温控制。', category: 'zhongyi' },
  { title: '中药「四气五味」性能理论基础知识', summary: '四气指寒热温凉四种药性，五味指酸苦甘辛咸。寒凉药多具清热作用，温热药多具散寒作用；五味各归不同脏腑。这一理论是传统中药学的性能纲领。', category: 'zhongyi' },
  { title: '二十四节气的天文含义与物候观察', summary: '二十四节气依据太阳周年视运动划分，反映季节、物候与气候变化。古人通过观察物候指导农事与生活，如「惊蛰」对应蛰虫始振，「白露」对应露凝而白，体现天人相应的观察智慧。', category: 'yixue' },
  { title: '天干地支纪年法的排列规则说明', summary: '十天干与十二地支两两相配，组成六十个基本单位，循环纪年。如2026年为丙午年。干支还用于纪月、纪日、纪时，构成传统历法的时间坐标体系，是传统文化的重要基础知识。', category: 'yixue' },
  { title: '《周易》乾卦的哲学内涵概述', summary: '乾卦由六个阳爻组成，象征天与刚健之道。卦辞「元亨利贞」被传统易学阐释为天道运行的四个阶段。乾卦的进取精神与自强不息理念，是中国传统哲学的重要命题。', category: 'yixue' },
  { title: '十二时辰制度与传统作息文化', summary: '古人将一昼夜划分为十二时辰，以地支命名，如子时23~1点、午时11~13点。时辰制度与经络气血流注学说结合，形成传统时间养生文化的基础框架。', category: 'yixue' },
  { title: '五行相生相克关系的逻辑体系', summary: '五行学说以木火土金水五种要素概括万物，相生指木生火、火生土等滋养关系，相克指木克土、土克水等制约关系。生克平衡构成传统哲学中动态平衡的思维模型。', category: 'yixue' },
  { title: '十二生肖的起源与文化含义', summary: '十二生肖以十二地支配属十二种动物，起源可追溯至先秦时期。生肖文化融入纪年、民俗与姓名传统，每种动物都被赋予相应的文化寓意，是民俗文化研究的经典课题。', category: 'yixue' },
  { title: '「六十甲子」循环周期的构成原理', summary: '天干十位与地支十二位按序相配，因最小公倍数为六十，故六十组干支循环一次称「一甲子」。六十年循环使干支纪年兼具周期性与唯一性，是传统历法的精妙设计。', category: 'yixue' },
  { title: '《周易》坤卦的哲学内涵概述', summary: '坤卦由六个阴爻组成，象征地与柔顺之德。传统易学以「厚德载物」概括坤卦精神，与乾卦「自强不息」相对应，共同构成刚柔相济的传统哲学基础。', category: 'yixue' },
  { title: '传统历法中「闰月」设置的天文原理', summary: '农历以朔望月为基础，一年约354天，与回归年相差约11天。为保持历月与季节同步，采用「十九年七闰」法则设置闰月。闰月制度体现传统历法的天文观测精度。', category: 'yixue' },
  { title: '河图洛书与传统数理文化概览', summary: '河图洛书是传统数理文化的源头图像，以点数排列表达数字结构，洛书九宫纵横斜相加皆为十五。历代学者以其阐发象数思想，是研究传统数学与哲学的重要文献。', category: 'yixue' },
  { title: '梅花易数的历史渊源与文化地位', summary: '梅花易数相传为宋代邵雍所传，以时间、方位等起卦，结合易理分析。作为传统易学的一个流派，其文化价值在于体现古人的取象思维方式，是易学史研究的组成部分。', category: 'yixue' },
  { title: '汉字演变与传统文化的深厚渊源', summary: '汉字从甲骨文、金文到篆隶楷的演变，记录了数千年文明进程。字形结构蕴含造字智慧，书法艺术承载审美传统，汉字是理解传统文化不可绕过的基础载体。', category: 'yixue' },
];

function pickTemplates(count, existingTitles) {
  const picked = [];
  const start = (dayOfYear() * DAILY_ADD) % TEMPLATE_POOL.length;
  for (let i = 0; picked.length < count && i < TEMPLATE_POOL.length; i++) {
    const t = TEMPLATE_POOL[(start + i) % TEMPLATE_POOL.length];
    // 模板条目重复使用时附加月份变体区分（池子24条、每日2条，12天一轮）
    let title = t.title;
    if (existingTitles.some((x) => titleSimilarity(title, x) > 0.55)) {
      const m = new Date(Date.now() + 8 * 3600 * 1000).getUTCMonth() + 1;
      title = `${t.title}（${m}月期）`;
      if (existingTitles.some((x) => titleSimilarity(title, x) > 0.55)) continue;
    }
    existingTitles.push(title);
    picked.push({ ...t, title });
  }
  return picked;
}

// ==================== 主流程 ====================
async function main() {
  const t = today();
  const state = readState();
  if (state.lastSuccessDate === t) {
    console.log(`[${t}] 今日已成功运行，幂等跳过`);
    return;
  }

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const items = readItems();
  const addedToday = items.filter((x) => String(x.id || '').startsWith('ai_') && String(x.publishedAt || '').slice(0, 10) === t);
  const need = Math.max(0, DAILY_ADD - addedToday.length);
  if (need === 0) {
    console.log(`[${t}] 今日已新增 ${addedToday.length} 条，无需补充`);
    writeState({ ...state, lastSuccessDate: t });
    return;
  }

  const existingTitles = items.map((x) => x.title);
  const fresh = [];
  let aiOk = 0, tplOk = 0, aiFail = 0;

  for (let i = 0; i < need; i++) {
    const themeIdx = (dayOfYear() * DAILY_ADD + addedToday.length + i) % AI_THEMES.length;
    const theme = AI_THEMES[themeIdx];
    let draft = null;
    try {
      draft = await callAI(theme, dayOfYear() + i);
    } catch (e) {
      aiFail++;
      console.error(`[ai] 主题「${theme.theme}」生成失败: ${e.message}`);
    }
    let fromAi = !!draft;
    if (!draft) {
      // 模板池兜底
      const tpls = pickTemplates(1, existingTitles);
      if (tpls.length === 0) { console.error('[tpl] 模板池无可用条目'); continue; }
      draft = tpls[0];
      fromAi = false;
    }

    // 三重门禁：字段 → 合规 → 去重
    const invalid = validateItem({ ...draft, sourceUrl: SITE_BASE });
    if (invalid) { console.error(`[gate] 字段校验未过: ${invalid}`); continue; }
    const hits = complianceHits(`${draft.title} ${draft.summary}`);
    if (hits.length) { console.error(`[gate] 合规拦截: ${hits.join(',')}`); continue; }
    if (isDuplicate(draft.title, items)) { console.error(`[gate] 标题重复: ${draft.title}`); continue; }

    items.unshift({
      id: `ai_${t.replace(/-/g, '')}_${Date.now()}_${i}`,
      title: String(draft.title).trim(),
      summary: String(draft.summary).trim(),
      source: SOURCE_LABEL,
      sourceUrl: draft.category === 'zhongyi' ? `${SITE_BASE}/zhongyi` : `${SITE_BASE}/yixue`,
      publishedAt: new Date().toISOString(),
      category: draft.category,
    });
    existingTitles.push(draft.title);
    fresh.push(draft.title);
    if (fromAi) aiOk++; else tplOk++;
  }

  // AI 条目总量上限（超限删最旧，默认库条目 id 无 ai_ 前缀不受影响）
  let aiItems = items.filter((x) => String(x.id || '').startsWith('ai_'));
  if (aiItems.length > AI_ITEM_MAX) {
    const doomed = aiItems.slice(AI_ITEM_MAX).map((x) => x.id);
    for (let i = items.length - 1; i >= 0; i--) {
      if (doomed.includes(items[i].id)) items.splice(i, 1);
    }
    aiItems = items.filter((x) => String(x.id || '').startsWith('ai_'));
  }

  if (fresh.length > 0) {
    writeItemsAtomic(items);
    writeState({ ...state, lastSuccessDate: t });
    console.log(`[${t}] SUCCESS: 新增 ${fresh.length} 条（AI ${aiOk} / 模板 ${tplOk}，AI失败 ${aiFail}），总条数 ${items.length}（AI ${aiItems.length}/${AI_ITEM_MAX}）`);
    for (const f of fresh) console.log(`  + ${f}`);
  } else {
    console.error(`[${t}] FAILED: 本轮无新增（AI失败 ${aiFail}）`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { main };