// ============================================================================
// 言道国学 - 公众号内容引擎（指令书第三十四~五十八章 / 七十九~八十三章）
// WECHAT_CONTENT_OPPORTUNITY_ENGINE + WECHAT_CONTENT_SAFETY_GATE
// - 选题：内部真实数据优先（工具使用/学习进度/知识库量），公开趋势无真实API时记 UNKNOWN
// - 文章：AI 生成原创内容（腾讯混元），结构化 JSON 输出 → 服务端确定性渲染 HTML
// - Safety Gate：医疗风险/封建迷信/绝对化广告/金融承诺/隐私 五类拦截
// - 查重：标题二元语法 Jaccard 相似度 vs 历史文章
// - 双保险：AUTO_PUBLISH / AUTO_MASS_SEND 恒为 false（第六十二章代码层禁止）
// ============================================================================
const { getDb, getAuthDb, getSetting, setSetting } = require('./wechatOaDb');
const aiUsagePolicy = require('./aiUsagePolicy');

const DEFAULT_SETTINGS = {
  automation: 'ON',            // ON / OFF / MAINTENANCE（第八十章）
  draftSync: 'ON',             // ON / OFF（第八十一章）
  dailyArticleLimit: 3,        // 1~5（第四十四章）
  maxArticleTokens: 6000,
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
];

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
  return Math.min(100, Math.round(raw));
}

function contentGapScore(cluster) {
  const db = getDb();
  try {
    const row = db.prepare("SELECT COUNT(*) AS n FROM wechat_articles WHERE status != 'ARCHIVED' AND status != 'DELETED' AND digest LIKE ?").get(`%${cluster.name}%`);
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
      keyword: c.name, cluster: c.id, source: 'INTERNAL',
      source_score: null, internal_score: internal,
      trend_score: null, // 无真实趋势API → UNKNOWN（第三十六章禁止伪数据）
      content_gap_score: gap, final_score: final,
    });
  }
  rows.sort((a, b) => b.final_score - a.final_score);
  const top = rows.slice(0, s.topicTopN);
  const insert = db.prepare(`INSERT INTO wechat_topic_candidates(keyword, cluster, source, source_score, internal_score, trend_score, content_gap_score, final_score, status, run_date)
    VALUES(@keyword, @cluster, @source, @source_score, @internal_score, @trend_score, @content_gap_score, @final_score, 'PENDING', @run_date)`);
  const tx = db.transaction(() => { for (const r of top) insert.run({ ...r, source_score: null, run_date: runDate }); });
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
async function callAI(messages, maxTokens) {
  const apiKey = process.env.HUNYUAN_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '';
  if (!apiKey) throw new Error('AI服务未配置');
  const useHunyuan = !!process.env.HUNYUAN_API_KEY;
  const model = process.env.HUNYUAN_MODEL || 'hy3';
  const apiUrl = process.env.HUNYUAN_API_URL || 'https://tokenhub.tencentmaas.com/v1/chat/completions';
  const started = Date.now();
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.7 }),
  });
  const data = await res.json();
  const usage = data.usage || {};
  const tokensIn = usage.prompt_tokens || 0;
  const tokensOut = usage.completion_tokens || 0;
  let cost = 0;
  try { cost = aiUsagePolicy.estimateCost(model, tokensIn, tokensOut) || 0; } catch { }
  try {
    getDb().prepare(`INSERT INTO ai_call_logs(scene, tokens_in, tokens_out, request_id, user_id, feature_key, model, provider_id, estimated_cost, duration_ms, status)
      VALUES('wechat_content', ?, ?, ?, '', 'wechat_content', ?, ?, ?, ?, 'success')`)
      .run(tokensIn, tokensOut, `woa_${Date.now()}`, model, useHunyuan ? 'tencent' : 'deepseek', cost, Date.now() - started);
  } catch { }
  if (!res.ok || !data.choices || !data.choices[0]) throw new Error(`AI调用失败: ${res.status}`);
  return { content: data.choices[0].message.content, model, cost };
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
  { type: 'ABSOLUTE_ADS', re: /(最好|第一|顶级|百分百|必看|震惊|国家级|全网最|史上最|不然后悔|错过再等)/ },
  { type: 'FINANCIAL_PROMISE', re: /(稳赚|暴富|收益翻倍|必回本|发财|投资必赚|财运亨通)/ },
  { type: 'PRIVACY', re: /(身份证号|手机号泄露|银行卡号)/ },
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

// ---------- 文章生成（第四十二~五十三章） ----------
const ARTICLE_STYLES = ['科普型', '教程型', '问答型', '清单型', '学习型', '热点关联型', '产品使用技巧型'];

function buildArticlePrompt(topic, cluster, style) {
  const s = settings();
  return `你是一位严谨的国学文化科普作者，为微信公众号"言道国学研习"撰写一篇${style}原创文章。

主题：${topic.keyword}（集群：${cluster.name}）
事实依据（必须以此为唯一事实源，不得虚构数据）：
- 这是"言道国学"APP内的真实工具方向，网站地址 https://yandaoguoxue.yandao.vip${cluster.toolUrl}
- 面向对国学文化感兴趣、但零基础的读者
- 内容定位：传统文化知识科普与学习方法分享，采用"文化参考"口径，不作吉凶祸福断言

写作要求：
1. 标题避免绝对化、不使用震惊体；不用"必看""第一""百分百"等词
2. 正文800~1600字，价值优先，营销内容不超过两成，只在文末自然引导一次
3. 结构：导语（1段）→ 正文3~4个小节（每节有小标题）→ 知识要点（3~5条）→ 结尾
4. 中医类内容只讲学习知识、典籍、经络基础，禁止任何诊断、处方、疗效表述
5. 严禁出现：改命/转运/治愈/根治/稳赚/收益承诺等表述
6. 结尾引导语固定为："${s.ctaText}"
7. 输出必须是合法JSON（不要markdown代码块包裹），结构：
{"title":"...","digest":"60字内摘要","intro":"导语","sections":[{"h":"小标题","p":"本节正文"}],"knowledgePoints":["要点1","要点2"],"cta":"结尾引导段"}`;
}

function parseAIJson(text) {
  let t = String(text || '').trim();
  t = t.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  return JSON.parse(t);
}

function renderArticleHtml(article, cluster) {
  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let html = `<p>${esc(article.intro)}</p>`;
  for (const sec of article.sections || []) {
    html += `<h3>${esc(sec.h)}</h3><p>${esc(sec.p)}</p>`;
  }
  html += `<h3>知识要点</h3><ul>`;
  for (const kp of article.knowledgePoints || []) html += `<li>${esc(kp)}</li>`;
  html += `</ul>`;
  html += `<p><strong>相关工具</strong>：<a href="https://yandaoguoxue.yandao.vip${cluster.toolUrl}?source=wechat_oa&utm_medium=official_account">${esc(cluster.name)}在线工具</a></p>`;
  html += `<p>${esc(article.cta)}</p>`;
  html += `<p><em>本文为传统文化学习资料，内容仅供文化参考。数据来源：言道国学APP工具与学堂知识库。</em></p>`;
  return html;
}

async function generateArticle(topicId) {
  const db = getDb();
  const s = settings();
  if (s.automation !== 'ON') throw new Error('公众号内容自动化当前为 ' + s.automation);
  if (todayAiCost() >= s.dailyCostCap) throw new Error('已达当日AI成本上限，停止生成（成本保护）');
  const topic = db.prepare('SELECT * FROM wechat_topic_candidates WHERE topic_id = ?').get(topicId);
  if (!topic) throw new Error('选题不存在');
  const cluster = CLUSTERS.find((c) => c.id === topic.cluster) || CLUSTERS[0];
  const style = ARTICLE_STYLES[Math.floor(Math.random() * ARTICLE_STYLES.length)];
  const { content, model, cost } = await callAI(
    [{ role: 'user', content: buildArticlePrompt(topic, cluster, style) }],
    s.maxArticleTokens,
  );
  const parsed = parseAIJson(content);
  if (!parsed.title || !parsed.sections || !parsed.sections.length) throw new Error('AI输出结构不完整');
  const contentHtml = renderArticleHtml(parsed, cluster);
  const wordCount = (parsed.intro + ' ' + parsed.sections.map((x) => x.p).join(' ') + ' ' + (parsed.knowledgePoints || []).join(' ')).replace(/\s/g, '').length;
  const safety = safetyGate(parsed.title + ' ' + parsed.intro + ' ' + parsed.sections.map((x) => x.h + ' ' + x.p).join(' '));
  const dup = dedupGate(parsed.title);
  const sourceRefs = [
    { type: 'APP_TOOL_FACT', note: `集群 ${cluster.name} 工具使用数据` },
    { type: 'ACADEMY_KNOWLEDGE', note: '言道学堂知识库' },
    { type: 'SEO_DATA', note: 'Growth Engine 关键词集群' },
  ];
  const info = db.prepare(`INSERT INTO wechat_articles(topic_id, title, digest, content_html, author, source_refs, safety_status, safety_reasons, status, ai_model, word_count)
    VALUES(?,?,?,?,?,?,?,?,?,?,?)`)
    .run(topicId, parsed.title, parsed.digest || '', contentHtml, s.authorName, JSON.stringify(sourceRefs),
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
  AUTO_PUBLISH, AUTO_MASS_SEND,
};
