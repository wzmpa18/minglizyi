// ============================================================================
// 言道国学 - 公众号内容引擎（指令书第三十四~五十八章 / 七十九~八十三章）
// WECHAT_CONTENT_OPPORTUNITY_ENGINE + WECHAT_CONTENT_SAFETY_GATE
// - 选题：内部真实数据优先（工具使用/学习进度/知识库量），公开趋势无真实API时记 UNKNOWN
// - 文章：AI 生成原创内容（2026-09-23 起智谱 glm-4.5-flash 免费优先），结构化 JSON 输出 → 服务端确定性渲染 HTML
// - Safety Gate：医疗风险/封建迷信/绝对化广告/金融承诺/隐私 五类拦截
// - 查重：标题二元语法 Jaccard 相似度 vs 历史文章
// - 双保险：AUTO_PUBLISH / AUTO_MASS_SEND 恒为 false（第六十二章代码层禁止）
// ============================================================================
const { getDb, getAuthDb, getSetting, setSetting } = require('./wechatOaDb');
const aiUsagePolicy = require('./aiUsagePolicy');
const { profileFor, solarTermForBatch, craftBullets } = require('./wechatBenchmarkProfiles');

const DEFAULT_SETTINGS = {
  automation: 'ON',            // ON / OFF / MAINTENANCE（第八十章）
  draftSync: 'ON',             // ON / OFF（第八十一章）
  dailyArticleLimit: 3,        // 1~5（第四十四章）
  maxArticleTokens: 8000,
  dailyCostCap: 20,            // CNY/日 成本保护（第八十三章）
  topicTopN: 8,                // 每日选题 TOP N（第四十一章）
  authorName: '言道国学',
  ctaText: '言道国学APP提供专业罗盘、七政四余等专业工具与系统课程，欢迎体验。',
  keywordBlacklist: [],
  coverTemplate: 'brand_compass',
};
const AUTO_PUBLISH = false;
const AUTO_MASS_SEND = false;

function settings() {
  return { ...DEFAULT_SETTINGS, ...getSetting('wechat_content_settings', {}) };
}
function updateSettings(patch, by) { setSetting('wechat_content_settings', { ...settings(), ...patch }, by); }

// ---------- 小众集群（第三十九章） ----------
// chapterKeys：study_progress.track='yixue' 的章节标题关键词（真实学习信号，按集群细粒度归集）
const CLUSTERS = [
  { id: 'qizheng', name: '七政四余', toolUrl: '/yixue/qizheng', learnUrl: '/academy/learn', recordTypes: ['qizheng'], tracks: ['yixue_qizheng', 'qizheng'], chapterKeys: ['七政', '四余', '星宗', '二十八宿'] },
  { id: 'luopan', name: '专业罗盘', toolUrl: '/yixue/compass', learnUrl: '/academy/learn', recordTypes: ['compass'], tracks: ['fengshui_luopan', 'luopan'], chapterKeys: ['罗经', '罗盘', '二十四山', '七十二龙', '分金'] },
  { id: 'bazi', name: '八字命理', toolUrl: '/yixue/bazi', learnUrl: '/academy/learn', recordTypes: ['bazi'], tracks: ['bazi', 'yixue_bazi'], chapterKeys: ['八字', '命理', '日元', '财官', '印绶', '六亲', '劫财', '食神', '紫微'] },
  { id: 'liji', name: '立极尺', toolUrl: '/yixue/liji', learnUrl: '/academy/learn', recordTypes: ['liji'], tracks: ['liji'], chapterKeys: ['立极'] },
  { id: 'xuankong', name: '玄空飞星', toolUrl: '/yixue/xuankong-feixing', learnUrl: '/academy/learn', recordTypes: ['xuankong-feixing'], tracks: ['xuankong'], chapterKeys: ['玄空', '飞星'] },
  { id: 'luban', name: '鲁班尺', toolUrl: '/yixue/luban', learnUrl: '/academy/learn', recordTypes: ['luban'], tracks: ['luban'], chapterKeys: ['鲁班'] },
  { id: 'phone', name: '手机号数字文化', toolUrl: '/yixue/phone', learnUrl: '/academy/learn', recordTypes: ['phone'], tracks: ['phone'], chapterKeys: ['手机号', '号码'] },
  { id: 'carplate', name: '车牌号数字文化', toolUrl: '/yixue/carplate', learnUrl: '/academy/learn', recordTypes: ['carplate'], tracks: ['carplate'], chapterKeys: ['车牌'] },
  { id: 'zhongyi', name: '中医学习', toolUrl: '/zhongyi', learnUrl: '/academy/learn', recordTypes: ['tcm-constitution'], tracks: ['zhongyi', 'zhenggu'], chapterKeys: [] },
  { id: 'yikao', name: '医考题库', toolUrl: '/academy/question-bank', learnUrl: '/academy/question-bank', recordTypes: [], tracks: ['zhongyi_zhiye', 'yikao'], chapterKeys: [] },
  // 2026-09-23 产品布局集群（用户指令）：学外语/数字管家产品相关的文化内容长期轮换，纯文化视角零广告
  // 战略保底分：无本站工具使用数据，靠 strategicFloor 保证稳定进入每日选题 TOP8
  { id: 'xuewaiyu', name: '语言文化', toolUrl: '/', learnUrl: '/', recordTypes: [], tracks: [], chapterKeys: [], strategicFloor: 55 },
  { id: 'shuziguanjia', name: '数字文化', toolUrl: '/', learnUrl: '/', recordTypes: [], tracks: [], chapterKeys: [], strategicFloor: 55 },
];

// 2026-09-30 内容强化：每个集群拆成具体、可考的写作角度（避免整集群反复写"八字命理/七政四余"等泛标题）
// 选题时按此表轮换取具体角度，配合知识库事实素材注入，保证每篇都是独特干货、不再重复
const SUBTOPICS = {
  qizheng: ['七政四余里的"十一曜"各自指什么', '星宗与二十八宿是什么关系', '七政看盘怎么起命宫', '四余星的文化源流', '七政四余与八字排盘的区别'],
  luopan: ['罗盘二十四山怎么读', '七十二龙与分金口诀', '罗经天地人三盘差在哪', '坐向和分金是什么关系', '罗盘上的缝针、中针怎么用'],
  bazi: ['八字里的日主强弱怎么看', '十神中"正印"代表什么', '财官印食四柱格局怎么入门', '大运和流年怎么排', '身弱身旺该怎么调候'],
  liji: ['立极尺在阳宅里怎么用', '中宫立极怎么定', '罗盘和立极尺怎么配合'],
  xuankong: ['玄空飞星九星各代表什么', '三元九运怎么分', '旺山旺向怎么看', '玄空飞星的山星向星'],
  luban: ['鲁班尺的八星吉凶怎么看', '门公尺和丁兰尺区别', '尺寸吉凶怎么选', '鲁班尺在门窗中的应用'],
  phone: ['手机号尾数数字文化怎么看', '选手机号的数字习俗', '号码里的阴阳奇偶讲究'],
  carplate: ['车牌号数字选取习俗', '车牌号里的数字文化', '选车牌号的常见讲究'],
  zhongyi: ['十二经脉循行顺序是怎样的', '脾胃为后天之本指什么', '二十四节气与养生怎么对应', '伤寒论六经辨证怎么入门', '五行和脏腑是怎么对应的', '经络里的原穴络穴是什么'],
  yikao: ['中医执业医师考试考什么', '医考刷题怎么高效', '中医基础怎么搭框架'],
  xuewaiyu: ['二十四节气里的语言文化', '汉字里的数字文化', '方言如何保留古音', '外来词怎么进入中文'],
  shuziguanjia: ['古人的数字哲学讲什么', '河图洛书怎么读', '数字在礼制里的含义', '天干地支怎么对应数字'],
};

// 从学堂知识库抽取该集群的真实知识点（必须 approved），作为文章事实素材；无则空数组（prompt 降级处理）
function collectKnowledge(cluster) {
  const db = getDb();
  const tracks = (cluster.tracks || []).filter(Boolean);
  if (!tracks.length) return [];
  const ph = tracks.map(() => '?').join(',');
  let rows = [];
  try {
    rows = db.prepare(`SELECT id, title, content, source_location, category FROM knowledge_points WHERE status = 'approved' AND track IN (${ph}) ORDER BY RANDOM() LIMIT 10`).all(...tracks);
  } catch { return []; }
  // 干货底料：每条素材给足原文（上限 480 字）并强制带出处，避免 AI 拿到截断的空泛片段
  return rows.map((r) => ({ id: r.id, title: r.title || '', content: String(r.content || '').slice(0, 480), source: r.source_location || r.category || '' }));
}

// 选题取具体角度：优先取近期未用过的小角度，保证批次间不重复；已用记录滚动保留最近 50 个
function pickSubtopic(cluster) {
  const list = SUBTOPICS[cluster.id];
  if (!list || !list.length) return cluster.name;
  const used = new Set(getSetting('wechat_used_subtopics', []));
  const avail = list.filter((x) => !used.has(x));
  const pick = (avail.length ? avail : list)[Math.floor(Math.random() * (avail.length ? avail.length : list.length))];
  setSetting('wechat_used_subtopics', [...used, pick].slice(-50), 'system');
  return pick;
}

// ---------- 内部需求数据（第三十五/三十八章：真实数据，不伪造） ----------
function collectInternalDemand() {
  const db = getDb();
  const auth = getAuthDb();
  const usage = {};
  // ① APP 工具真实使用数据（user_records 按类型计数）
  if (auth) {
    try {
      const rows = auth.prepare("SELECT record_type, COUNT(*) AS n FROM user_records GROUP BY record_type").all();
      for (const r of rows) usage[r.record_type] = (usage[r.record_type] || 0) + r.n;
    } catch { /* 表结构差异时静默降级 */ }
  }
  // ② 学堂学习进度（study_progress 按板块计数）
  const study = {};
  try {
    const rows = db.prepare('SELECT track, COUNT(*) AS n FROM study_progress GROUP BY track').all();
    for (const r of rows) study[r.track] = r.n;
  } catch { }
  // ②b yixue 学习章节细粒度归集（track 统一为 yixue，靠章节标题关键词区分集群）
  const yixueChapters = {};
  try {
    const rows = db.prepare("SELECT chapter, COUNT(*) AS n FROM study_progress WHERE track = 'yixue' GROUP BY chapter").all();
    for (const r of rows) yixueChapters[r.chapter] = r.n;
  } catch { }
  // ③ 知识库知识点量（按板块）
  const kp = {};
  try {
    const rows = db.prepare("SELECT track, COUNT(*) AS n FROM knowledge_points WHERE status = 'approved' GROUP BY track").all();
    for (const r of rows) kp[r.track] = r.n;
  } catch { }
  // ④ SEO 关键词数据（Growth Engine 集群页存在性 = 搜索需求信号）
  const seo = {};
  try {
    const rows = db.prepare("SELECT keyword, cluster FROM wechat_topic_candidates WHERE source = 'SEO_DATA' AND created_at > datetime('now','-30 days')").all();
    for (const r of rows) seo[r.cluster] = (seo[r.cluster] || 0) + 1;
  } catch { }
  return { usage, study, kp, seo, yixueChapters };
}

function internalDemandScore(cluster, data) {
  let toolUse = 0;
  for (const rt of cluster.recordTypes) toolUse += data.usage[rt] || 0;
  let studyRows = 0;
  for (const tr of cluster.tracks) studyRows += data.study[tr] || 0;
  // yixue 章节关键词信号（真实学习行为，权重与 track 学习一致）
  for (const key of cluster.chapterKeys || []) {
    for (const [chapter, n] of Object.entries(data.yixueChapters || {})) {
      if (chapter.includes(key)) studyRows += n;
    }
  }
  let kpCount = 0;
  for (const tr of cluster.tracks) kpCount += data.kp[tr] || 0;
  // 归一化加权：工具使用权重最高（真实付费/使用意图），学习次之，知识库存量为内容底气
  const raw = toolUse * 3 + studyRows * 2 + Math.min(kpCount, 500) * 0.2;
  const score = Math.min(100, Math.round(raw));
  // 产品布局集群（学外语/数字管家）无本站工具数据，用战略保底分保证进入轮换
  return Math.max(score, cluster.strategicFloor || 0);
}

function contentGapScore(cluster) {
  const db = getDb();
  try {
    // 2026-09-23：digest 模糊匹配不可靠（换标题/角度就漏判），改为按选题集群精确计数防主题重复
    const row = db.prepare(`
      SELECT COUNT(*) AS n FROM wechat_articles a
      JOIN wechat_topic_candidates t ON a.topic_id = t.topic_id
      WHERE a.status NOT IN ('ARCHIVED','DELETED') AND t.cluster = ?`).get(cluster.id);
    const existing = row ? row.n : 0;
    return Math.max(0, 100 - existing * 20);
  } catch { return 50; }
}

// ---------- 每日选题 ----------
function generateTopics(runDate) {
  const db = getDb();
  const s = settings();
  const data = collectInternalDemand();
  const rows = [];
  for (const c of CLUSTERS) {
    const internal = internalDemandScore(c, data);
    const gap = contentGapScore(c);
    const final = Math.round(internal * 0.7 + gap * 0.3);
    rows.push({
      keyword: pickSubtopic(c), cluster: c.id, source: 'INTERNAL',
      source_score: null, internal_score: internal,
      trend_score: null, // 无真实趋势API → UNKNOWN（第三十六章禁止伪数据）
      content_gap_score: gap, final_score: final,
    });
  }
  // 节气系列选题（2026-09-21 强化：批次日距节气0~3天时，注入置顶节气选题，保证系列连贯不重复）
  const st = solarTermForBatch(runDate);
  if (st) {
    // 已删文章不算已发（2026-09-23修复：寒露稿曾被删，排除DELETED后10/8批次可重新生成，兑现秋分文末钩子）
    const used = db.prepare("SELECT COUNT(*) AS n FROM wechat_articles WHERE status != 'DELETED' AND topic_id IN (SELECT topic_id FROM wechat_topic_candidates WHERE keyword = ?)").get(`节气·${st.term}`);
    if (!used.n) {
      rows.push({
        keyword: `节气·${st.term}`, cluster: 'jieqi', source: 'SOLAR_TERM',
        source_score: null, internal_score: 100,
        trend_score: null, content_gap_score: 100, final_score: 100,
      });
    }
  }
  rows.sort((a, b) => b.final_score - a.final_score);
  const top = rows.slice(0, s.topicTopN);
  const insert = db.prepare(`INSERT INTO wechat_topic_candidates(keyword, cluster, source, source_score, internal_score, trend_score, content_gap_score, final_score, status, pinned, run_date)
    VALUES(@keyword, @cluster, @source, @source_score, @internal_score, @trend_score, @content_gap_score, @final_score, @status, @pinned, @run_date)`);
  const tx = db.transaction(() => { for (const r of top) insert.run({ ...r, source_score: null, run_date: runDate, status: r.source === 'SOLAR_TERM' ? 'APPROVED' : 'PENDING', pinned: r.source === 'SOLAR_TERM' ? 1 : 0 }); });
  tx();
  return { total: top.length, top: top.slice(0, 8) };
}

function listTopics(runDate) {
  return getDb().prepare('SELECT * FROM wechat_topic_candidates WHERE run_date = ? ORDER BY pinned DESC, final_score DESC').all(runDate);
}
function topicAction(topicId, action) {
  const db = getDb();
  if (action === 'approve') db.prepare("UPDATE wechat_topic_candidates SET status = 'APPROVED', updated_at = datetime('now','localtime') WHERE topic_id = ?").run(topicId);
  else if (action === 'reject') db.prepare("UPDATE wechat_topic_candidates SET status = 'REJECTED', updated_at = datetime('now','localtime') WHERE topic_id = ?").run(topicId);
  else if (action === 'pin') db.prepare("UPDATE wechat_topic_candidates SET pinned = 1, updated_at = datetime('now','localtime') WHERE topic_id = ?").run(topicId);
  else if (action === 'unpin') db.prepare("UPDATE wechat_topic_candidates SET pinned = 0, updated_at = datetime('now','localtime') WHERE topic_id = ?").run(topicId);
}
function addManualTopic(keyword, cluster, runDate) {
  getDb().prepare(`INSERT INTO wechat_topic_candidates(keyword, cluster, source, internal_score, trend_score, content_gap_score, final_score, status, run_date)
    VALUES(?, ?, 'MANUAL', 0, NULL, 50, 50, 'APPROVED', ?)`).run(keyword, cluster || 'other', runDate);
}

// ---------- AI 调用（scene=wechat_content 进 AI Cost Center，第八十二章） ----------
// 2026-09-23：智谱 glm-4.5-flash（免费）优先 → 混元 tokenhub → deepseek，逐个降级
async function callAI(messages, maxTokens) {
  const providers = [];
  if (process.env.ZHIPU_API_KEY) {
    providers.push({
      id: 'zhipu', key: process.env.ZHIPU_API_KEY,
      url: process.env.ZHIPU_API_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      model: process.env.ZHIPU_MODEL || 'glm-4.5-flash',
      // glm-4.5 系列默认深度思考会吃光 max_tokens 导致正文为空，公众号场景必须禁用
      extra: { thinking: { type: 'disabled' } },
    });
  }
  if (process.env.HUNYUAN_API_KEY) {
    providers.push({
      id: 'tencent', key: process.env.HUNYUAN_API_KEY,
      url: process.env.HUNYUAN_API_URL || 'https://tokenhub.tencentmaas.com/v1/chat/completions',
      // WECHAT_CONTENT_MODEL 仅覆盖混元通道（智谱走 ZHIPU_MODEL）
      model: process.env.WECHAT_CONTENT_MODEL || process.env.HUNYUAN_MODEL || 'hy3',
    });
  }
  if (process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY) {
    providers.push({
      id: 'deepseek', key: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY,
      url: process.env.AI_API_URL || 'https://api.deepseek.com/v1/chat/completions',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    });
  }
  if (!providers.length) throw new Error('AI服务未配置');
  const started = Date.now();
  let lastErr = null;
  for (const p of providers) {
    // 免费智谱限流（429）退避重试最多5次（15/30/60/60s）守住零成本；其他错误2次后降级
    const maxTries = p.id === 'zhipu' ? 5 : 2;
    let backoffMs = 15000;
    for (let i = 0; i < maxTries; i++) {
      try {
        const res = await fetch(p.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.key}` },
          body: JSON.stringify({ model: p.model, messages, max_tokens: maxTokens, temperature: 0.7, stream: false, ...(p.extra || {}) }),
        });
        const raw = await res.text();
        if (res.status === 429) {
          let detail = '';
          try { const j = JSON.parse(raw); detail = String((j.error && j.error.code) || (j.error && j.error.message) || '').slice(0, 60); } catch { }
          throw Object.assign(new Error(`AI限流429(${detail})`), { rateLimited: true });
        }
        if (!raw || !raw.trim()) throw new Error('AI响应为空（网关超时）');
        let data;
        try { data = JSON.parse(raw); } catch { throw new Error('AI响应JSON截断（网关超时）'); }
        if (!res.ok || !data.choices || !data.choices[0]) throw new Error(`AI调用失败: ${res.status} ${String(raw).slice(0, 120)}`);
        const ch = data.choices[0];
        const content = (ch.message && ch.message.content) || '';
        if (!content.trim()) throw new Error(`AI内容为空（finish=${ch.finish_reason}，推理耗尽token）`);
        const usage = data.usage || {};
        const tokensIn = usage.prompt_tokens || 0;
        const tokensOut = usage.completion_tokens || 0;
        let cost = 0;
        try { const est = aiUsagePolicy.estimateCost(p.model, tokensIn, tokensOut); cost = (est && typeof est.estimatedCost === 'number') ? est.estimatedCost : 0; } catch { }
        try {
          getDb().prepare(`INSERT INTO ai_call_logs(scene, tokens_in, tokens_out, request_id, user_id, feature_key, model, provider_id, estimated_cost, duration_ms, status)
            VALUES('wechat_content', ?, ?, ?, '', 'wechat_content', ?, ?, ?, ?, 'success')`)
            .run(tokensIn, tokensOut, `woa_${Date.now()}`, p.model, p.id, cost, Date.now() - started);
        } catch { }
        return { content, model: p.model, cost };
      } catch (e) {
        lastErr = e;
        console.error(`[callAI] ${p.id} 第${i + 1}次失败: ${e.message}`);
        if (e.rateLimited) {
          if (i < maxTries - 1) await new Promise((r) => setTimeout(r, backoffMs));
          backoffMs = Math.min(backoffMs * 2, 60000);
        } else if (i < 1) {
          await new Promise((r) => setTimeout(r, 5000));
        } else {
          break; // 非限流错误2次后换下一个provider
        }
      }
    }
  }
  throw lastErr || new Error('AI全部provider失败');
}

function todayAiCost() {
  try {
    const row = getDb().prepare("SELECT COALESCE(SUM(estimated_cost), 0) AS c FROM ai_call_logs WHERE scene = 'wechat_content' AND created_at > datetime('now','localtime','-1 day')").get();
    return row.c || 0;
  } catch { return 0; }
}

// ---------- Safety Gate（第五十四~五十五章） ----------
const SAFETY_PATTERNS = [
  { type: 'MEDICAL_RISK', re: /(治愈|根治|包治|疗效显著|药到病除|痊愈率|不用去医院|自行用药|处方参考)/ },
  { type: 'SUPERSTITION', re: /(改命|转运消灾|化解灾难|破财免灾|算命很准|命中注定无法改变|趋吉避凶必|改运)/ },
  { type: 'ABSOLUTE_ADS', re: /(顶级|百分百|必看|震惊|国家级|全网最|史上最|不然后悔|错过再等|全网第一|排名第一|史上第一)/ },
  { type: 'FINANCIAL_PROMISE', re: /(稳赚|暴富|收益翻倍|必回本|投资必赚|财运亨通|就能发财|便能发财|必能发财|助你发财)/ },
  { type: 'PRIVACY', re: /(身份证号|手机号泄露|银行卡号)/ },
  // 2026-09-30 新增：任何"可能违规的推广/引流"话术一律拦截（纯干货、零推广硬约束）
  { type: 'PROMO_DIVERT', re: /(加微信|加我微信|客服微信|个人微信|微信号|扫码|扫一扫|私信|私聊|领取|免费送|限时福利|限时免费|加群|资料包|资料领取|关注后回复|回复.{0,4}领取|二维码|扫码关注|福利领取|课程优惠|优惠码|下单|点击链接|点击阅读原文|文末福利|后台回复|添加.{0,4}微信)/ },
];
function safetyGate(text) {
  const reasons = [];
  const blacklist = settings().keywordBlacklist || [];
  for (const p of SAFETY_PATTERNS) if (p.re.test(text)) reasons.push(p.type);
  for (const kw of blacklist) if (kw && text.includes(kw)) reasons.push(`BLACKLIST:${kw}`);
  return { pass: reasons.length === 0, reasons };
}

// 标题二元语法 Jaccard
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
function dedupGate(title) {
  const db = getDb();
  const rows = db.prepare("SELECT title FROM wechat_articles WHERE status NOT IN ('ARCHIVED','DELETED')").all();
  for (const r of rows) {
    if (titleSimilarity(title, r.title) > 0.55) return { pass: false, similarTo: r.title };
  }
  return { pass: true };
}

// ---------- 文章生成（第四十二~五十三章；2026-09-21 对标强化版） ----------
const ARTICLE_STYLES = ['科普型', '教程型', '问答型', '清单型', '学习型', '热点关联型'];

function buildArticlePrompt(topic, cluster, style) {
  const bp = profileFor(topic.cluster);
  const knowledge = collectKnowledge(cluster);
  const knowledgeText = knowledge.length
    ? knowledge.map(function (k, i) { return (i + 1) + '. ' + k.title + (k.source ? '（出处：' + k.source + '）' : '') + '：' + k.content; }).join('\n')
    : '（暂无结构化知识库素材，请基于公开、可考的国学常识与典籍撰写，仍须具体、有出处、不空泛）';
  let termNote = '';
  if (topic.cluster === 'jieqi') {
    const st = solarTermForBatch(topic.run_date || new Date().toISOString().slice(0, 10));
    const termName = topic.keyword.replace('节气·', '');
    if (st && st.term === termName) {
      const diff = Math.round((new Date(st.date + 'T00:00:00') - new Date(topic.run_date + 'T00:00:00')) / 86400000);
      const phase = diff > 0 ? `还差${diff}天（节气将至，标题可用"后天${termName}"等措辞）` : diff === 0 ? '就是当天（标题可用"今天${termName}"）' : `已过${-diff}天（标题可用"${termName}刚过"）`;
      termNote = `（节气主题：${termName}，交节日期 ${st.date}，本文发布时${phase}。文章围绕${termName}的天文含义、物候、典籍与当季起居展开，主题提示：${st.theme}）`;
    } else {
      termNote = `（节气主题，文章围绕"${topic.keyword.replace('节气·', '')}"的天文含义、物候、典籍与当季起居展开）`;
    }
  }
  return `你是一位深耕国学文化的资深作者，为微信公众号"言道国学研习"撰写一篇${style}深度原创文章。

主题：${topic.keyword}（方向：${cluster.name}）${termNote}

【对标标杆】${bp.benchmark}
【结构公式】${bp.formula}
【本题材禁忌】${bp.taboo}

【头部号 craft 方法论——只学手艺，绝不复制任何现存文章的内容/金句/表述，逐条落实】
${craftBullets()}

【事实素材（必须引用，不得虚构）】
${knowledgeText}
要求：全文至少落实 3 条具体素材，每条须带来源——优先用上面知识库条目（注明出处）；若知识库为空，则用公有领域典籍（须写清《书名·篇名》），不得编造现代来源。每条素材要落到"具体数字/年代/原文引文/可操作细节"之一，拒绝空泛。严禁无出处杜撰具体研究数据、百分比、人名、机构或考古编号（如"某碑林编号K327""记忆保持度82%"之类）；凡不确定的具体信息，用"有研究指出""古籍记载"等模糊表述或直接省略，确保每一条具体信息都可溯源、不造假。

【写作铁律（逐条自检后再输出）】
0. 必须紧扣本具体角度「${topic.keyword}」，严禁泛泛而谈；与任何已有文章不得雷同；必须出现上述事实素材中的至少 3 条具体内容。
1. 纯干货、零推广：通篇不得出现任何 APP/工具/课程/网站/下载/会员/加微信/扫码/私信/领取/免费送/限时福利/加群/资料包/关注后回复 等推广或引流话术，一字不带。
2. 原创合规：全部表述必须原创，绝不搬运任何公众号/书籍/课程的现成句子；借鉴只限结构方法论；引用典籍须为公有领域原文并注明书名+篇名，属合理使用，不构成侵权。
3. 结构硬指标：sections 必须有 4~6 个小节，每小节 paragraphs 给 2~3 段，每段 90~160 字；正文（开场+全部小节段落合计）必须达到 1700~2300 字，不足 1700 字为不合格，必须扩写具体细节（数字/年代/典籍出处/可操作细节）后再输出。信息密度优先。
4. 去AI味：长短句交错，一两句一段；禁用"与此同时""不仅如此""值得注意的是""让我们来看看""综上所述"等过渡词；允许出现极短句作停顿。
5. 观点后置且少而准：先铺事实，全文只在关键处下 2~3 个判断，判断要锋利、可被转发。
6. 典籍引用不超过 3 处，每处必须给准确出处（书名+篇名）。
7. 健康/命理题材守边界：只讲文化知识与方法，不作诊断、疗效、吉凶断言。
8. 结尾给一句"能带走的话"：读者可原样复述给别人，与标题呼应，带信息量。
9. 标题给 3 个候选（数字利益型/悬念反差型/时效钩子型），各不超过 28 字，避免绝对化与震惊体。
10. JSON 字符串值内严禁出现未转义的英文双引号：引用词语用中文引号""，书名用《》，避免解析失败。

【干货自检清单（输出前必须全部满足，否则重写）】
- 开场 3 句内是否有画面感场景或反常识事实？
- 每小节是否都含至少 1 个可验证具体信息（数字/年代/典籍原文/可操作细节）？
- 全文是否落实 ≥3 条带出处的素材？
- 是否零推广、零引流话术？
- 是否有 2~3 句可被转发的锋利金句？
- 结尾"能带走的话"是否可被原样复述？

输出必须是合法JSON（不要markdown代码块包裹），结构：
{"titleCandidates":["标题1","标题2","标题3"],"digest":"60字内摘要","intro":"场景开场段落（2~4句，从读者正在经历的细节切入）","sections":[{"h":"小节标题","paragraphs":["段落1","段落2"]}],"takeaway":"结尾带走的一句话"}`;
}

function parseAIJson(text) {
  let t = String(text || '').trim();
  t = t.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  try {
    return JSON.parse(t);
  } catch (e) {
    const KNOWN_KEYS = 'titleCandidates|digest|intro|sections|takeaway|h|paragraphs';
    let repaired = t;
    // 修复2：glm偶发漏写冒号——已知key换行后直接跟值（V8报错特征："Expected ':' after property name ... column 1"）
    repaired = repaired.replace(new RegExp(`"(${KNOWN_KEYS})"\\s*(?=["[{])`, 'g'), '"$1":');
    // 修复3：已知key后误用全角冒号（冒号在引号外）
    repaired = repaired.replace(new RegExp(`"(${KNOWN_KEYS})"\\s*：`, 'g'), '"$1":');
    // 修复4：全角冒号写进key字符串内部（实测高频："takeaway："值"，V8同样报Expected ':'）——该引号实为value开口引号
    // 注意：必须在修复1（CJK引号转义）之前执行，否则：先被当作内容引号转义，此模式即失效
    repaired = repaired.replace(new RegExp(`"(${KNOWN_KEYS})\\s*："`, 'g'), '"$1": "');
    // 修复1：模型在正文里输出未转义英文双引号（紧邻CJK判定为内容引号，转义为\u0022）
    const CJK = '\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\uff00-\uffef';
    const reAfter = new RegExp(`([${CJK}])"(?![,:}\\]\\s]|$)`, 'g');
    const reBefore = new RegExp(`(?<![{\\[:,\\s])"([${CJK}])`, 'g');
    repaired = repaired.replace(reAfter, '$1\\u0022').replace(reBefore, '\\u0022$1');
    if (repaired !== t) {
      try { return JSON.parse(repaired); } catch (e2) { dumpParseFail(t); throw e2; }
    }
    dumpParseFail(t);
    throw e;
  }
}

// 解析失败的原始输出落盘，便于针对性加固（仅失败时写）
function dumpParseFail(raw) {
  try {
    const fs = require('fs');
    const dir = require('path').join(__dirname, 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const dump = require('path').join(dir, `ai_parse_fail_${Date.now()}.json`);
    fs.writeFileSync(dump, raw);
    console.error(`[parseAIJson] 解析失败原始输出已存: ${dump}`);
  } catch { }
}

function articleWordCount(a) {
  return (a.intro + ' ' + a.sections.map((x) => (x.paragraphs || [x.p || '']).join(' ')).join(' ') + ' ' + (a.takeaway || '')).replace(/\s/g, '').length;
}

// 2026-09-23 扩写兜底：glm-4.5-flash 首稿常仅约1000字（实测996/937/1176），低于1500字触发一次免费扩写
// 扩写走纯文本标记格式（【开场】/【小节N】），响应不涉及JSON，从根上规避解析失败
// 目标字数感知：按缺口精确控制补写量，防止过冲超2500字上限（实测曾1019→2735过冲作废）
function buildExpandPrompt(parsed, wc) {
  const target = 1850;
  const need = Math.max(300, target - wc);
  const partsCount = parsed.sections.length + 1;
  const perPart = Math.max(70, Math.round(need / partsCount));
  const secList = parsed.sections.map((s, i) => {
    const body = (s.paragraphs || [s.p || '']).join(' ').slice(0, 200);
    return `【小节${i + 1}】\n（本节标题：${s.h}）\n（本节已有内容节选：${body}…）`;
  }).join('\n');
  return `你为公众号"言道国学研习"写了一篇文章，当前正文约 ${wc} 字，未达到 1600~2200 字的硬性要求。请补写新段落。

补写总量（严格执行）：补写内容合计约 ${need} 字（允许上下浮动100字，补写后全文约 ${target} 字，绝不能超过 ${target + 200} 字）。共 ${partsCount} 个部分，每个部分补写 1 段，每段约 ${perPart} 字。

扩写铁律：
1. 不注水：补充具体史实细节、典籍原文出处（书名+篇名）、数字与年代、可操作的生活细节，每条补写都要落到"可验证的具体信息"，拒绝空泛
2. 零推广：严禁出现任何 APP/工具/课程/网站/下载/会员/加微信/扫码/私信/领取/免费送/限时福利/加群/资料包 等推广或引流话术，一字不带
3. 原创合规：补写表述必须原创，引用典籍须为公有领域原文并注明书名+篇名，不构成侵权
4. 只输出补写的新段落本身，不要复述已有内容，不要任何解释
5. 输出纯文本（不要JSON、不要markdown代码块），引用词语用中文引号""
6. 严格按此格式（标记行独占一行，标记行上不写其他文字；段落间空行）：

【开场】
（补写的开场段落）

【小节1】
（补写的新段落）

【小节2】
（补写的新段落）

文章现有结构：
${secList}`;
}

function mergeExpand(parsed, raw) {
  const s = String(raw || '').replace(/```[a-z]*\n?/gi, '').trim();
  const parts = s.split(/【(开场|小节\d+)】/);
  for (let i = 1; i < parts.length; i += 2) {
    const tag = parts[i];
    const paras = (parts[i + 1] || '')
      .split(/\n\s*\n/)
      .map((block) => block
        .split('\n')
        .filter((line) => {
          const t = line.trim();
          if (!t) return false;
          if (/^[（(][^）)]*[）)]$/.test(t)) return false; // （本节标题：xxx）提示行
          if (/^(小节标题|本节标题)[:：]/.test(t)) return false;
          return true;
        })
        .join('\n')
        .trim())
      .filter((x) => x.length > 15);
    if (!paras.length) continue;
    if (tag === '开场') {
      parsed.intro = (parsed.intro || '') + '\n' + paras.join('\n');
    } else {
      const idx = parseInt(tag.replace('小节', ''), 10) - 1;
      const sec = parsed.sections[idx];
      if (sec) {
        sec.paragraphs = (sec.paragraphs || (sec.p ? [sec.p] : [])).concat(paras);
        delete sec.p;
      }
    }
  }
  return parsed;
}

// 公众号粘贴兼容排版（2026-09-21：内联样式+扁平p结构，无h3/ul/class依赖）
const LAYOUT = {
  bodyP: 'font-size:15px;line-height:1.75;color:#3a3a3a;margin:0 0 22px;',
  secNum: 'text-align:center;font-size:13px;letter-spacing:4px;color:#b08a3e;margin:52px 0 0;font-weight:bold;',
  secTitle: 'text-align:center;font-size:19px;font-weight:bold;color:#2b2b2b;margin:12px 0 26px;letter-spacing:1px;',
  takeaway: 'text-align:center;font-size:18px;font-weight:bold;color:#8b4a2b;margin:34px 0;letter-spacing:2px;line-height:1.6;',
};

function renderArticleHtml(article, cluster) {
  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let html = '';
  const intro = String(article.intro || '');
  for (const seg of intro.split('\n').filter(Boolean)) {
    html += `<p style="${LAYOUT.bodyP}">${esc(seg)}</p>`;
  }
  (article.sections || []).forEach((sec, i) => {
    const num = String(i + 1).padStart(2, '0');
    html += `<p style="${LAYOUT.secNum}">— ${num} —</p>`;
    html += `<p style="${LAYOUT.secTitle}">${esc(sec.h)}</p>`;
    for (const seg of (sec.paragraphs || (sec.p ? [sec.p] : []))) {
      html += `<p style="${LAYOUT.bodyP}">${esc(seg)}</p>`;
    }
  });
  if (article.takeaway) {
    html += `<p style="${LAYOUT.takeaway}">${esc(article.takeaway)}</p>`;
  }
  return html;
}

// 节气配图上传（本地素材 → 微信永久素材 URL；未配置凭据或图缺失时静默跳过）
async function uploadTermImage(term) {
  const fs = require('fs');
  const path = require('path');
  const imgPath = path.join(__dirname, 'data', 'solar-term-images', `${term}.jpg`);
  if (!fs.existsSync(imgPath)) return null;
  if (!process.env.WECHAT_OA_APP_SECRET) return null;
  const { getAccessToken } = require('./wechatTokenManager');
  const token = await getAccessToken();
  const buf = fs.readFileSync(imgPath);
  const form = new FormData();
  form.append('media', new Blob([buf], { type: 'image/jpeg' }), `${term}.jpg`);
  const res = await fetch(`https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${token}&type=image`, { method: 'POST', body: form });
  const data = await res.json();
  if (!data.url) throw new Error(`节气图上传失败: ${data.errcode || ''} ${data.errmsg || ''}`);
  return data.url;
}

async function generateArticle(topicId) {
  const db = getDb();
  const s = settings();
  if (s.automation !== 'ON') throw new Error('公众号内容自动化当前为 ' + s.automation);
  if (todayAiCost() >= s.dailyCostCap) throw new Error('已达当日AI成本上限，停止生成（成本保护）');
  const topic = db.prepare('SELECT * FROM wechat_topic_candidates WHERE topic_id = ?').get(topicId);
  if (!topic) throw new Error('选题不存在');
  // 2026-09-30 防重复：该具体角度若已发过（非归档/删除）则跳过，不再浪费 AI 调用，避免整集群反复写同一主题
  const usedSub = db.prepare(`SELECT 1 FROM wechat_articles a JOIN wechat_topic_candidates t ON a.topic_id=t.topic_id WHERE a.status NOT IN ('ARCHIVED','DELETED') AND t.keyword=? LIMIT 1`).get(topic.keyword);
  if (usedSub) throw new Error('该具体角度已发过，跳过（防重复）');
  const cluster = CLUSTERS.find((c) => c.id === topic.cluster) || (topic.cluster === 'jieqi'
    ? { id: 'jieqi', name: '节气文化', toolUrl: '/', learnUrl: '/', recordTypes: [], tracks: [], chapterKeys: [] }
    : CLUSTERS[0]);
  const style = ARTICLE_STYLES[Math.floor(Math.random() * ARTICLE_STYLES.length)];
  let { content, model, cost } = await callAI(
    [{ role: 'user', content: buildArticlePrompt(topic, cluster, style) }],
    s.maxArticleTokens,
  );
  let parsed = parseAIJson(content);
  if (!parsed.intro || !parsed.sections || !parsed.sections.length) throw new Error('AI输出结构不完整');
  let wordCount = articleWordCount(parsed);
  if (wordCount < 1500) {
    try {
      const exp = await callAI([{ role: 'user', content: buildExpandPrompt(parsed, wordCount) }], s.maxArticleTokens);
      const before = wordCount;
      parsed = mergeExpand(parsed, exp.content);
      wordCount = articleWordCount(parsed);
      if (wordCount > before) {
        model = `${model}+expand(${exp.model})`;
        cost += exp.cost || 0;
        console.log(`[expand] 标记式扩写: ${before} → ${wordCount}字`);
      }
    } catch (e) { console.error(`[expand] 扩写失败，沿用原稿: ${e.message}`); }
  }
  // 标题候选按查重结果兜底选择（2026-09-21：防标题重复）
  const candidates = parsed.titleCandidates && parsed.titleCandidates.length ? parsed.titleCandidates : [parsed.title || topic.keyword];
  let title = candidates[0];
  let dup = dedupGate(title);
  for (let i = 1; i < candidates.length && !dup.pass; i++) {
    title = candidates[i];
    dup = dedupGate(title);
  }
  if (!title) throw new Error('AI未输出标题');
  let contentHtml = renderArticleHtml(parsed, cluster);
  // 节气文章配图：上传本地节气图并插入正文开头（失败不阻断）
  if (topic.cluster === 'jieqi') {
    try {
      const termImg = await uploadTermImage(topic.keyword.replace('节气·', ''));
      if (termImg) contentHtml = `<p style="text-align:center;margin:0 0 26px;"><img src="${termImg}" style="max-width:100%;border-radius:6px;"></p>` + contentHtml;
    } catch (e) { console.error(`[termImage] 节气图处理跳过: ${e.message}`); }
  }
  const safety = safetyGate(title + ' ' + parsed.intro + ' ' + parsed.sections.map((x) => x.h + ' ' + (x.paragraphs || [x.p || '']).join(' ')).join(' '));
  const sourceRefs = [
    { type: 'APP_TOOL_FACT', note: `集群 ${cluster.name} 工具使用数据` },
    { type: 'ACADEMY_KNOWLEDGE', note: '言道学堂知识库' },
    { type: 'SEO_DATA', note: 'Growth Engine 关键词集群' },
  ];
  const info = db.prepare(`INSERT INTO wechat_articles(topic_id, title, digest, content_html, author, source_refs, safety_status, safety_reasons, status, ai_model, word_count)
    VALUES(?,?,?,?,?,?,?,?,?,?,?)`)
    .run(topicId, title, parsed.digest || '', contentHtml, s.authorName, JSON.stringify(sourceRefs),
      safety.pass ? 'PASS' : 'BLOCKED', JSON.stringify(safety.reasons),
      safety.pass ? (dup.pass ? 'SAFETY_PASSED' : 'DUPLICATE') : 'RISK_BLOCKED',
      model, wordCount);
  db.prepare("UPDATE wechat_topic_candidates SET status = 'USED', updated_at = datetime('now','localtime') WHERE topic_id = ?").run(topicId);
  return { articleId: info.lastInsertRowid, safety, dup, cost };
}

// ---------- 统计（第八十四章 Dashboard） ----------
function dashboardStats() {
  const db = getDb();
  const today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
  const followers = db.prepare('SELECT COUNT(*) AS n FROM wechat_oa_followers WHERE subscribe = 1').get().n;
  const todayNew = db.prepare("SELECT COUNT(*) AS n FROM wechat_oa_events WHERE event_type = 'subscribe' AND received_at >= date('now','localtime')").get().n;
  const todayUnfollow = db.prepare("SELECT COUNT(*) AS n FROM wechat_oa_events WHERE event_type = 'unsubscribe' AND received_at >= date('now','localtime')").get().n;
  const todayArticles = db.prepare("SELECT COUNT(*) AS n FROM wechat_articles WHERE created_at >= date('now','localtime')").get().n;
  const synced = db.prepare("SELECT COUNT(*) AS n FROM wechat_articles WHERE wechat_media_id != ''").get().n;
  const riskBlocked = db.prepare("SELECT COUNT(*) AS n FROM wechat_articles WHERE safety_status = 'BLOCKED' OR status = 'RISK_BLOCKED'").get().n;
  const pendingReview = db.prepare("SELECT COUNT(*) AS n FROM wechat_articles WHERE status IN ('SAFETY_PASSED','WECHAT_DRAFT','OWNER_REVIEWED') AND created_at >= date('now','localtime','-2 day')").get().n;
  const bindings = db.prepare("SELECT COUNT(*) AS n FROM wechat_user_binding WHERE bind_status = 'BOUND'").get().n;
  const lastJob = db.prepare("SELECT * FROM wechat_content_jobs ORDER BY job_id DESC LIMIT 1").get() || null;
  return {
    followers, todayNew, todayUnfollow, todayArticles, synced, riskBlocked, pendingReview, bindings,
    aiCostToday: todayAiCost(), lastJob, today,
  };
}

// ---------- 批次日/批次计数（调度器 v25.0.75+ 依赖，2026-09-23 补齐） ----------
function isBatchDay(dateStr) {
  const days = String(settings().batchDays || '1,8,15,22').split(',').map((x) => parseInt(String(x).trim(), 10)).filter((n) => n > 0);
  const d = new Date((dateStr || new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10)) + 'T00:00:00');
  return days.includes(d.getDate());
}

function pendingReviewCount() {
  const row = getDb().prepare("SELECT COUNT(*) AS n FROM wechat_articles WHERE status IN ('SAFETY_PASSED','WECHAT_DRAFT','OWNER_REVIEWED')").get();
  return row.n;
}

function monthlyBatchCount(dateStr) {
  const month = String(dateStr || new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10)).slice(0, 7);
  const row = getDb().prepare("SELECT COUNT(DISTINCT run_date) AS n FROM wechat_content_jobs WHERE stage = 'generate' AND status = 'SUCCESS' AND run_date LIKE ?").get(month + '-%');
  return row.n;
}

// 批次选题质量门禁自动批准：final_score ≥ topicQualityFloor 的 PENDING 选题按分批（上限 maxDraftsPerBatch）
function autoApproveBatchTopics(runDate) {
  const s = settings();
  const db = getDb();
  const floor = Number(s.topicQualityFloor) || 40;
  const cap = Number(s.maxDraftsPerBatch) || 5;
  const rows = db.prepare("SELECT topic_id, final_score FROM wechat_topic_candidates WHERE run_date = ? AND status = 'PENDING' ORDER BY pinned DESC, final_score DESC").all(runDate);
  let approved = 0;
  for (const r of rows) {
    if (approved >= cap) break;
    if ((r.final_score || 0) >= floor) {
      db.prepare("UPDATE wechat_topic_candidates SET status = 'APPROVED', updated_at = datetime('now','localtime') WHERE topic_id = ?").run(r.topic_id);
      approved++;
    }
  }
  return approved;
}

// 已发布状态回写（根因修复：用户在公众平台发布后 DB 停留 WECHAT_DRAFT → 待审积压误触发暂停锁）
// 比对 freepublish 已发布标题，命中的 WECHAT_DRAFT 文章标记为 PUBLISHED
async function syncPublishedFromWechat() {
  if (!process.env.WECHAT_OA_APP_SECRET) return 0;
  const { getAccessToken } = require('./wechatTokenManager');
  const db = getDb();
  const drafts = db.prepare("SELECT article_id, title FROM wechat_articles WHERE status = 'WECHAT_DRAFT'").all();
  if (!drafts.length) return 0;
  const token = await getAccessToken();
  const publishedTitles = new Set();
  let offset = 0;
  while (offset < 100) {
    const res = await fetch(`https://api.weixin.qq.com/cgi-bin/freepublish/batchget?access_token=${token}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offset, count: 20, no_content: 1 }),
    });
    const data = await res.json();
    if (data.errcode && data.errcode !== 0) throw new Error(`WECHAT_API_ERROR ${data.errcode}: ${data.errmsg}`);
    for (const it of data.item || []) {
      for (const ni of (it.content && it.content.news_item) || []) {
        if (ni.title) publishedTitles.add(String(ni.title).trim());
      }
    }
    offset += 20;
    if (offset >= (data.total_count || 0)) break;
  }
  let updated = 0;
  for (const d of drafts) {
    if (publishedTitles.has(String(d.title).trim())) {
      db.prepare("UPDATE wechat_articles SET status = 'PUBLISHED', updated_at = datetime('now','localtime') WHERE article_id = ?").run(d.article_id);
      updated++;
    }
  }
  return updated;
}

// ---------- 菜单（第二十五~三十章） ----------
function buildMenuJson() {
  const B = 'https://yandaoguoxue.yandao.vip';
  const link = (p, menu) => `${B}${p}?source=wechat_oa&menu=${menu}`;
  return {
    button: [
      { name: '国学工具', sub_button: [
        { type: 'view', name: '专业罗盘', url: link('/yixue/compass', 'luopan') },
        { type: 'view', name: '七政四余', url: link('/yixue/qizheng', 'qizheng') },
        { type: 'view', name: '八字排盘', url: link('/yixue/bazi', 'bazi') },
        { type: 'view', name: '更多工具', url: link('/tools/', 'more') },
      ]},
      { name: '学习', sub_button: [
        { type: 'view', name: '七政学习', url: link('/academy/learn', 'qizheng_learn') },
        { type: 'view', name: '中医学习', url: link('/zhongyi', 'zhongyi') },
        { type: 'view', name: '医考题库', url: link('/academy/question-bank', 'yikao') },
        { type: 'view', name: '国学资料', url: link('/books', 'books') },
      ]},
      { name: '我的', sub_button: [
        { type: 'view', name: '网页版', url: link('/', 'web') },
        { type: 'view', name: '下载APP', url: link('/download', 'download') },
        { type: 'view', name: '会员中心', url: link('/membership', 'membership') },
      ]},
    ],
  };
}

module.exports = {
  CLUSTERS, ARTICLE_STYLES, settings, updateSettings,
  generateTopics, listTopics, topicAction, addManualTopic,
  generateArticle, safetyGate, dedupGate,
  dashboardStats, buildMenuJson, todayAiCost,
  isBatchDay, pendingReviewCount, monthlyBatchCount, autoApproveBatchTopics, syncPublishedFromWechat,
  AUTO_PUBLISH, AUTO_MASS_SEND,
};
