"use client";

// ============================================================================
// LOC 运营后台统一配置层 - P6-TOOL-04 §6.1
// 万年历字段开关 / 择日规则版本 / 占星配置 / 真人服务 / 增长体系 / 治理
// 所有配置可视化修改、版本化留存、带审计日志；前端读取实时生效。
// 架构红线：禁止硬编码业务规则/价格/比例/开关 → 全部收敛到本配置层。
// ============================================================================

// ==================== 配置类型定义 ====================

/** 万年历首页展示字段开关 */
export interface CalendarFieldConfig {
  showGanzhi: boolean; // 公历/农历/节气/干支
  showYiJi: boolean; // 宜忌
  showChongSha: boolean; // 冲煞
  showJiShi: boolean; // 吉时
  showFangWei: boolean; // 方位（喜神/财神/福神）
  showDayEvents: boolean; // 当日待办/生日提醒摘要
  showReminderEntry: boolean; // 「记事提醒」入口
  showZeriEntry: boolean; // 「择日」入口
  showMoreToolsEntry: boolean; // 「更多工具」入口
  functionEnabled: boolean; // 万年历功能总开关
}

/** 择日事项分类 */
export interface ZeriEventTypeConfig {
  id: string;
  name: string; // 嫁娶/搬家入宅/开业开市/装修动土/出行远行/签约交易/安床/安门/祭祀...
  enabled: boolean;
  /** 引擎预设键（匹配 algorithm-core 内置规则；自定义事项留空走 yiKeywords 匹配） */
  engineKey?: string;
  /** 宜忌匹配关键词（项目方后台可改，引擎按此匹配黄历宜项） */
  yiKeywords: string[];
  /** 民俗注意事项（项目方后台录入） */
  folkNote: string;
  /** 推荐展示权重 */
  weight: number;
}

/** 择日规则集（版本化） */
export interface ZeriRulesConfig {
  version: string; // 规则版本标识，如 v2026.08
  eventTypes: ZeriEventTypeConfig[];
  /** 每项展示字段开关 */
  showJiShi: boolean;
  showYiJi: boolean;
  showChongSha: boolean;
  showFangWei: boolean;
  showFolkNote: boolean;
  showAvoidDays: boolean; // 不建议日期及规则依据
  showRuleBasis: boolean; // 规则依据
  disclaimer: string; // 免责声明文案
  /** AI 深度择日定价（元/次） */
  aiDeepPrice: number;
  aiDeepEnabled: boolean;
  /** 查询范围上限（天） */
  maxRangeDays: number;
}

/** 占星工具配置 */
export interface AstroConfig {
  dataVersion: string; // 第三方数据/算法版本（astronomy-engine x.y.z）
  enabled: boolean;
  aiDeepPrice: number; // AI 解读定价（元/次）
  aiFreeTrialCount: number; // 免费体验次数
  aiDeepEnabled: boolean;
  defaultPrivate: boolean; // 隐私默认私有（运行时强制 true，禁止改公开默认）
  maxSavedCharts: number; // 最多保存星盘数
  disclaimer: string;
}

/** 塔罗工具配置（P6-补03 第四阶段） */
export interface TarotConfig {
  dataVersion: string; // 基础数据版本（公版韦特骨架 + 自研释义）
  enabled: boolean;
  aiDeepPrice: number; // AI 深度牌阵解读定价（元/次）
  aiDeepEnabled: boolean;
  defaultPrivate: boolean; // 隐私默认私有（运行时强制 true）
  maxSavedReadings: number; // 最多保存占卜记录数
  enabledSpreadIds: string[]; // 开放牌阵白名单
  disclaimer: string;
}

/** 真人咨询服务配置（言道精选类目） */
export interface ConsultServiceConfig {
  enabled: boolean;
  minPrice: number; // 平台允许最低价（元）
  maxPrice: number; // 平台允许最高价（元）
  platformFeeRate: number; // 平台服务费比例（0-1）
  settleDays: number; // 结算周期（天）
  maxDeliveryDays: number; // 履约时限上限（天）
  entryAuditRequired: boolean; // 准入需身份+收款+类目校验
  /** 服务类目（后台可增删改，服务者入驻与上架时选择） */
  categories: string[];
  disclaimer: string;
}

/** 分享与邀请归因配置 */
export interface GrowthConfig {
  sharePosterEnabled: boolean;
  inviteEnabled: boolean;
  /** 归因优先级：first=首绑优先 / last=后到优先（默认 first，禁止后到覆盖已确认绑定） */
  attributionPriority: "first" | "last";
  inviteValidDays: number; // 邀请链接有效期
  registerRewardPoints: number; // 邀请注册奖励积分
  firstPayRewardPoints: number; // 首次有效付费奖励积分
  learningRewardPoints: number; // 学习达标奖励积分
  /** 反作弊阈值 */
  maxRegistersPerDevice: number; // 同设备注册数上限
  maxInvitesPerDay: number; // 单用户日邀请上限
  rewardFreezeHours: number; // 异常数据延迟发奖观察期
  appealEnabled: boolean;
}

/** 记事提醒配置 */
export interface ReminderConfig {
  enabled: boolean; // 功能总开关
  maxEventsPerUser: number;
  pushEnabled: boolean;
  /** 提醒档位白名单（分钟） */
  offsetWhitelist: number[];
}

/** 账户特权配置（P6-TOOL-04-补02：全权限账户白名单，LOC 后台可配） */
export interface AccountPrivilegeConfig {
  /** 全权限手机号白名单（精确匹配，或以 * 结尾的前缀匹配如 134*） */
  superPhones: string[];
  /** 说明备注 */
  note: string;
}

/** 会员兑换码配置（兑换码为运营发放渠道，权益核销复用统一会员/积分引擎） */
export interface RedeemConfig {
  enabled: boolean; // 兑换入口总开关
  /** 单用户最多兑换次数（0=不限，按码独立幂等） */
  maxRedeemPerUser: number;
  /** 兑换失败尝试告警阈值（防爆破） */
  maxFailAttempts: number;
}

// ==================== 医考题库专区（P6-补04） ====================
// 架构红线：100% 复用唯一题库引擎（track='yikao' 标签区分），配置驱动全部文案/科目/权限/价格

/** 医考理论科目定义（共享池，各考试类别引用） */
export interface YikaoSubjectDef {
  id: string; // 如 zhongji
  name: string; // 中医基础理论
  /** 二级章节名（章节树展开展示；后台可改） */
  chapters: string[];
  /** 基础章节练习免费开放（false=整科目增值） */
  freeTier: boolean;
  enabled: boolean;
}

/** 实践技能站定义 */
export interface YikaoStationDef {
  id: string;
  name: string; // 第一站病案分析
  group: string; // 第一站 / 第二站 / 第三站
  /** 增值内容（带锁标识，走统一 Paywall） */
  paid: boolean;
  enabled: boolean;
}

/** 考试类别定义 */
export interface YikaoExamDef {
  id: string; // zyzy（category 前缀：zyzy:科目名）
  name: string; // 中医执业医师
  subjectIds: string[];
  enabled: boolean;
}

/** 精选题库卡片（2×2） */
export interface YikaoCardDef {
  id: string;
  seal: string; // 印章单字：密/刷/讲/真
  title: string; // 冲刺密卷
  subtitle: string; // 考前冲刺提分
  /** 增值内容价格（元）；0=免费 */
  price: number;
  /** 会员权益抵扣（true=会员免费） */
  memberFree: boolean;
  /** 解锁目标键（统一 Paywall 内容键） */
  target: string;
  enabled: boolean;
}

export interface YikaoConfig {
  enabled: boolean; // 专区总开关
  version: string; // 考纲结构版本
  exams: YikaoExamDef[];
  subjects: YikaoSubjectDef[];
  stations: YikaoStationDef[];
  cards: YikaoCardDef[];
  /** AI 错题深度解析定价（元/次） */
  aiWrongAnalysisPrice: number;
  aiWrongAnalysisEnabled: boolean;
  /** 覆盖度达标阈值（%，达到才显示「覆盖全部核心考点」） */
  coverageThreshold: number;
  /** 文库学科横向切换标签 */
  libTabs: string[];
  disclaimer: string;
}

export interface ToolConfig {
  calendar: CalendarFieldConfig;
  zeri: ZeriRulesConfig;
  astro: AstroConfig;
  tarot: TarotConfig;
  consult: ConsultServiceConfig;
  growth: GrowthConfig;
  reminder: ReminderConfig;
  account: AccountPrivilegeConfig;
  redeem: RedeemConfig;
  yikao: YikaoConfig;
}

// ==================== 默认配置（内容类字段由项目方后台修改） ====================

export const DEFAULT_TOOL_CONFIG: ToolConfig = {
  calendar: {
    showGanzhi: true,
    showYiJi: true,
    showChongSha: true,
    showJiShi: true,
    showFangWei: true,
    showDayEvents: true,
    showReminderEntry: true,
    showZeriEntry: true,
    showMoreToolsEntry: true,
    functionEnabled: true,
  },
  zeri: {
    version: "zeri-v2026.08-r1",
    eventTypes: [
      { id: "jiaqu", name: "嫁娶", enabled: true, engineKey: "嫁娶", yiKeywords: ["嫁娶", "结婚", "纳采", "问名", "纳征", "请期"], folkNote: "传统以女命行嫁大利月为先，避开双方生日月及父母生辰日；敬茶、迎亲时辰宜选吉时。", weight: 100 },
      { id: "banjia", name: "搬家入宅", enabled: true, engineKey: "搬家", yiKeywords: ["入宅", "移徙", "搬家", "安香", "入宅移居"], folkNote: "入宅宜白天中午前完成，先进贵重物品与米粮，开火、烧水、鸣炮以示生旺；避开家人生肖冲日。", weight: 95 },
      { id: "kaiye", name: "开业开市", enabled: true, engineKey: "开业", yiKeywords: ["开市", "开业", "开张", "交易", "立券", "纳财"], folkNote: "开业宜选天赦、月恩等吉日，上午吉时开门迎客；账台宜坐生旺方位。", weight: 90 },
      { id: "dongtu", name: "装修动土", enabled: true, engineKey: "动土", yiKeywords: ["动土", "修造", "装修", "破土", "起基", "竖柱"], folkNote: "动土前宜祭告土地，避开太岁方与三煞方作业；屋主生肖与当日相冲者当日回避。", weight: 85 },
      { id: "chuxing", name: "出行远行", enabled: true, engineKey: "出行", yiKeywords: ["出行", "旅游", "旅行", "远行"], folkNote: "出行宜避开往亡日与归忌日；出发前查当日冲煞方位，避开煞方出行。", weight: 80 },
      { id: "qianyue", name: "签约交易", enabled: true, engineKey: "签约", yiKeywords: ["交易", "立券", "签约", "订盟", "纳财"], folkNote: "签约宜满日、成日、开日；避开破日与平日，重要文书签订宜在吉时完成。", weight: 75 },
      { id: "anchuang", name: "安床", enabled: true, yiKeywords: ["安床"], folkNote: "安床宜择吉日吉时，床身避开正对门与横梁压顶；安床后当日不宜空床。", weight: 70 },
      { id: "anmen", name: "安门", enabled: true, yiKeywords: ["安门", "修门", "造门"], folkNote: "安门修造宜选定日、成日；避开门光日与大小耗日。", weight: 65 },
      { id: "jisi", name: "祭祀", enabled: true, engineKey: "祭祀", yiKeywords: ["祭祀", "祈福", "酬神", "拜佛", "敬神", "斋醮"], folkNote: "祭祀宜选敬心诚之日，传统避开破日；供品荤素依各地习俗。", weight: 60 },
    ],
    showJiShi: true,
    showYiJi: true,
    showChongSha: true,
    showFangWei: true,
    showFolkNote: true,
    showAvoidDays: true,
    showRuleBasis: true,
    disclaimer: "以上结果基于后台配置的传统择日规则生成，仅供民俗文化参考与个人娱乐，不构成任何专业建议或决策依据，请理性看待并自主决策。",
    aiDeepPrice: 9.9,
    aiDeepEnabled: true,
    maxRangeDays: 90,
  },
  astro: {
    dataVersion: "astronomy-engine 2.1.19 (MIT)",
    enabled: true,
    aiDeepPrice: 9.9,
    aiFreeTrialCount: 1,
    aiDeepEnabled: true,
    defaultPrivate: true,
    maxSavedCharts: 20,
    disclaimer: "占星内容仅面向文化兴趣娱乐，行星位置为天文计算结果，解读为传统文化视角的描述，不构成任何专业建议，请理性看待。",
  },
  tarot: {
    dataVersion: "waite-publicdomain-v1",
    enabled: true,
    aiDeepPrice: 9.9,
    aiDeepEnabled: true,
    defaultPrivate: true,
    maxSavedReadings: 50,
    enabledSpreadIds: ["one", "three-flow", "love-four", "career-four", "celtic"],
    disclaimer: "塔罗内容仅面向文化兴趣娱乐，牌面释义为传统文化视角的描述，不构成任何专业建议，请理性看待。",
  },
  consult: {
    enabled: true,
    minPrice: 10,
    maxPrice: 2999,
    platformFeeRate: 0.15,
    settleDays: 7,
    maxDeliveryDays: 7,
    entryAuditRequired: true,
    categories: ["八字命理咨询", "紫微斗数咨询", "风水堪舆指导", "择日民俗指导", "姓名文化解析", "综合文化咨询"],
    disclaimer: "真人咨询服务由第三方服务者提供，平台提供信息撮合与交易保障。服务内容仅供文化参考与个人娱乐，不构成医疗、法律、金融等专业建议。",
  },
  growth: {
    sharePosterEnabled: true,
    inviteEnabled: true,
    attributionPriority: "first",
    inviteValidDays: 30,
    registerRewardPoints: 100,
    firstPayRewardPoints: 200,
    learningRewardPoints: 50,
    maxRegistersPerDevice: 3,
    maxInvitesPerDay: 20,
    rewardFreezeHours: 24,
    appealEnabled: true,
  },
  reminder: {
    enabled: true,
    maxEventsPerUser: 200,
    pushEnabled: true,
    offsetWhitelist: [0, 30, 60, 180, 1440, 2880, 10080],
  },
  account: {
    // 项目方本人 134 号段账户：全权限（终身会员+不限次AI+B类工具免费+免广告）
    // 精确号码待项目方在 LOC 后台补充完整 11 位手机号，或保留 134* 前缀由项目方自担范围
    superPhones: ["134*"],
    note: "全权限账户：终身会员、不限次AI解读、B类工具免费、免广告、报告导出",
  },
  redeem: {
    enabled: true,
    maxRedeemPerUser: 0,
    maxFailAttempts: 5,
  },
  yikao: {
    enabled: true,
    version: "yikao-syllabus-2026-v1",
    exams: [
      { id: "zyzy", name: "中医执业医师", enabled: true, subjectIds: ["zhongji", "zhongzhen", "zhongyao", "fangji", "zhongnei", "zhongwai", "zhongfu", "zhonger", "zhenjiu", "zhenduan", "neike", "chuanran", "lunli", "fagui"] },
    ],
    subjects: [
      { id: "zhongji", name: "中医基础理论", chapters: [], freeTier: true, enabled: true },
      { id: "zhongzhen", name: "中医诊断学", chapters: [], freeTier: true, enabled: true },
      { id: "zhongyao", name: "中药学", chapters: [], freeTier: true, enabled: true },
      { id: "fangji", name: "方剂学", chapters: [], freeTier: true, enabled: true },
      { id: "zhongnei", name: "中医内科学", chapters: [], freeTier: true, enabled: true },
      { id: "zhongwai", name: "中医外科学", chapters: [], freeTier: true, enabled: true },
      { id: "zhongfu", name: "中医妇科学", chapters: [], freeTier: true, enabled: true },
      { id: "zhonger", name: "中医儿科学", chapters: [], freeTier: true, enabled: true },
      { id: "zhenjiu", name: "针灸学", chapters: [], freeTier: true, enabled: true },
      { id: "zhenduan", name: "诊断学基础", chapters: [], freeTier: true, enabled: true },
      { id: "neike", name: "内科学", chapters: [], freeTier: true, enabled: true },
      { id: "chuanran", name: "传染病学", chapters: [], freeTier: true, enabled: true },
      { id: "lunli", name: "医学伦理学", chapters: [], freeTier: true, enabled: true },
      { id: "fagui", name: "卫生法规", chapters: [], freeTier: true, enabled: true },
    ],
    stations: [
      { id: "st1-bingan", name: "第一站病案分析", group: "第一站", paid: true, enabled: true },
      { id: "st2-bingshi", name: "第二站病史采集", group: "第二站", paid: true, enabled: true },
      { id: "st2-zhongyi", name: "第二站中医操作", group: "第二站", paid: true, enabled: true },
      { id: "st2-dabian", name: "第二站中医临床答辩", group: "第二站", paid: true, enabled: true },
      { id: "st3-tige", name: "第三站体格检查", group: "第三站", paid: true, enabled: true },
      { id: "st3-xiyi", name: "第三站西医操作", group: "第三站", paid: true, enabled: true },
      { id: "st3-dabian", name: "第三站西医临床答辩", group: "第三站", paid: true, enabled: true },
    ],
    cards: [
      { id: "mijuan", seal: "密", title: "冲刺密卷", subtitle: "考前冲刺提分", price: 29.9, memberFree: true, target: "yikao_mijuan", enabled: true },
      { id: "bishua", seal: "刷", title: "必刷题集", subtitle: "掌握核心考点", price: 19.9, memberFree: true, target: "yikao_bishua", enabled: true },
      { id: "zhenti-jiang", seal: "讲", title: "真题精讲", subtitle: "精选名师讲解", price: 39.9, memberFree: true, target: "yikao_zhenti_jiang", enabled: true },
      { id: "zhenti", seal: "真", title: "历年真题", subtitle: "高命中率原题", price: 29.9, memberFree: true, target: "yikao_zhenti", enabled: true },
    ],
    aiWrongAnalysisPrice: 9.9,
    aiWrongAnalysisEnabled: true,
    coverageThreshold: 100,
    libTabs: ["中药", "方剂", "中诊", "针灸", "妇科", "儿科"],
    disclaimer: "内容仅供文化娱乐参考，不构成任何专业建议",
  },
};

// ==================== 存储与版本管理 ====================

const CONFIG_KEY = "yandao_tool_config";
const AUDIT_KEY = "yandao_tool_config_audit";
const SNAPSHOT_PREFIX = "yandao_tool_config_snapshot_";

export interface ConfigAuditEntry {
  id: string;
  module: string; // calendar/zeri/astro/consult/growth/reminder
  action: "update" | "rollback";
  summary: string;
  operator: string; // admin
  createdAt: string;
  beforeVersion: string;
  afterVersion: string;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function safeGet<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("[toolConfig] 存储失败:", e);
  }
}

/** 读取当前生效配置（含默认值兜底合并） */
export function getToolConfig(): ToolConfig {
  const stored = safeGet<Partial<ToolConfig>>(CONFIG_KEY, {});
  return {
    calendar: { ...DEFAULT_TOOL_CONFIG.calendar, ...(stored.calendar || {}) },
    zeri: { ...DEFAULT_TOOL_CONFIG.zeri, ...(stored.zeri || {}) },
    astro: { ...DEFAULT_TOOL_CONFIG.astro, ...(stored.astro || {}) },
    tarot: { ...DEFAULT_TOOL_CONFIG.tarot, ...(stored.tarot || {}) },
    consult: { ...DEFAULT_TOOL_CONFIG.consult, ...(stored.consult || {}) },
    growth: { ...DEFAULT_TOOL_CONFIG.growth, ...(stored.growth || {}) },
    reminder: { ...DEFAULT_TOOL_CONFIG.reminder, ...(stored.reminder || {}) },
    account: { ...DEFAULT_TOOL_CONFIG.account, ...(stored.account || {}) },
    redeem: { ...DEFAULT_TOOL_CONFIG.redeem, ...(stored.redeem || {}) },
    yikao: { ...DEFAULT_TOOL_CONFIG.yikao, ...(stored.yikao || {}) },
  };
}

export interface SaveResult {
  success: boolean;
  error?: string;
  version: string;
}

/** 更新某模块配置（带审计与版本递增） */
export function updateToolConfig<K extends keyof ToolConfig>(
  module: K,
  patch: Partial<ToolConfig[K]>,
  summary: string,
  operator = "admin"
): SaveResult {
  const current = getToolConfig();
  const before = current[module];
  const after = { ...before, ...patch } as ToolConfig[K];

  // 安全校验：占星/塔罗隐私默认私有不可关闭
  if (module === "astro" && (patch as Partial<AstroConfig>).defaultPrivate === false) {
    (after as unknown as AstroConfig).defaultPrivate = true;
  }
  if (module === "tarot" && (patch as Partial<TarotConfig>).defaultPrivate === false) {
    (after as unknown as TarotConfig).defaultPrivate = true;
  }
  // 归因优先级禁止 last（禁止后到覆盖已确认绑定）
  if (module === "growth" && (patch as Partial<GrowthConfig>).attributionPriority === "last") {
    (after as unknown as GrowthConfig).attributionPriority = "first";
  }

  const beforeVersion = getVersionOf(module, before);
  const afterVersion = bumpVersion(beforeVersion);
  (after as unknown as Record<string, unknown>)[VERSION_KEY] = afterVersion;

  current[module] = after;
  safeSet(CONFIG_KEY, current);

  // 快照留存（支持回溯）
  try {
    localStorage.setItem(SNAPSHOT_PREFIX + `${String(module)}_${afterVersion}`, JSON.stringify(after));
  } catch {
    /* ignore */
  }

  // 审计日志
  const audit = safeGet<ConfigAuditEntry[]>(AUDIT_KEY, []);
  audit.push({
    id: "ca_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    module: String(module),
    action: "update",
    summary,
    operator,
    createdAt: new Date().toISOString(),
    beforeVersion,
    afterVersion,
  });
  safeSet(AUDIT_KEY, audit.slice(-300));
  return { success: true, version: afterVersion };
}

/** 回滚到历史快照 */
export function rollbackToolConfig<K extends keyof ToolConfig>(module: K, version: string, operator = "admin"): SaveResult {
  if (!isBrowser()) return { success: false, error: "非浏览器环境", version: "" };
  const raw = localStorage.getItem(SNAPSHOT_PREFIX + `${String(module)}_${version}`);
  if (!raw) return { success: false, error: "快照不存在", version: "" };
  try {
    const snap = JSON.parse(raw);
    const current = getToolConfig();
    const beforeVersion = getVersionOf(module, current[module]);
    current[module] = snap;
    safeSet(CONFIG_KEY, current);
    const audit = safeGet<ConfigAuditEntry[]>(AUDIT_KEY, []);
    audit.push({
      id: "ca_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      module: String(module),
      action: "rollback",
      summary: `回滚 ${String(module)} 至 ${version}`,
      operator,
      createdAt: new Date().toISOString(),
      beforeVersion,
      afterVersion: version,
    });
    safeSet(AUDIT_KEY, audit.slice(-300));
    return { success: true, version };
  } catch {
    return { success: false, error: "快照解析失败", version: "" };
  }
}

export function listConfigSnapshots(module: string): string[] {
  if (!isBrowser()) return [];
  const out: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(SNAPSHOT_PREFIX + module + "_")) {
      out.push(k.replace(SNAPSHOT_PREFIX + module + "_", ""));
    }
  }
  return out.sort().reverse();
}

export function listConfigAudit(module?: string): ConfigAuditEntry[] {
  let audit = safeGet<ConfigAuditEntry[]>(AUDIT_KEY, []);
  if (module) audit = audit.filter((a) => a.module === module);
  return audit.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

// ==================== 版本号工具 ====================

const VERSION_KEY = "__v";

function getVersionOf(module: string, obj: unknown): string {
  const rec = obj as Record<string, unknown> | undefined;
  const v = rec?.[VERSION_KEY];
  if (typeof v === "string") return v;
  // 各模块默认版本
  const defaults: Record<string, string> = {
    calendar: "cal-v1",
    zeri: DEFAULT_TOOL_CONFIG.zeri.version,
    astro: "astro-v1",
    tarot: "tarot-v1",
    consult: "consult-v1",
    growth: "growth-v1",
    reminder: "rem-v1",
    yikao: DEFAULT_TOOL_CONFIG.yikao.version,
  };
  return defaults[module] || "v1";
}

/** cal-v3 → cal-v4；zeri-v2026.08-r1 → zeri-v2026.08-r2 */
function bumpVersion(v: string): string {
  const m = v.match(/^(.*?)(\d+)$/);
  if (!m) return v + "_2";
  return m[1] + (Number(m[2]) + 1);
}

/** 获取模块当前生效版本（供结果页打规则版本标识） */
export function getModuleVersion(module: keyof ToolConfig): string {
  const cfg = getToolConfig();
  return getVersionOf(String(module), cfg[module]);
}
