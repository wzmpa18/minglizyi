// ============================================================================
// aiUsagePolicy.js — AI 权益与额度唯一裁决服务（AI_USAGE_POLICY）
// ============================================================================
// 指令：P0-PRODUCTION-SEAL-AND-AI-COST-PHASE1-03 第三十五~四十章
//
// 目标架构：
//   Membership Entitlement（会员功能权益） ≠ AI Usage Entitlement（AI 调用额度/成本）
//   本模块为 AI 额度的【服务端唯一事实源】，前端只展示剩余额度，真正裁决在服务端。
//
// 历史权益核定（第三十二~三十四章，已核实前端购买页 + 服务端价格 SSOT）：
//   basic     每日 3 次
//   monthly   每日 50 次通用 AI 问答
//   quarterly 每日 50 次通用 AI 问答
//   yearly    购买页明确写「通用AI问答无限次 / 无限畅享」→ LEGACY_UNLIMITED_PROTECTED
//   lifetime  购买页明确写「通用AI问答无限次 / AI 解读终身畅用」→ LEGACY_UNLIMITED_PROTECTED
//
// 红线（第三十八/三十九章）：
//   - 历史明确承诺 Unlimited 的档位（yearly/lifetime）禁止改成「每天 N 次」；
//     仅施加 Fair Use 技术安全限流（并发=1、输入/输出上限、异常频率告警）。
//   - 后台改策略必须 bump policyVersion，静默 UPDATE 一个数字会瞬间改变历史权益 → 禁止。
// ============================================================================
'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.AI_POLICY_DIR || path.join(__dirname, 'data');
const POLICY_FILE = process.env.AI_POLICY_FILE || path.join(DATA_DIR, 'ai-usage-policy.json');
const PRICING_FILE = process.env.AI_PRICING_FILE || path.join(DATA_DIR, 'ai-pricing.json');

// ==================== 默认策略（政策版本化基础） ====================
//
// dailyRequests/monthlyRequests = -1 表示无限（LEGACY_UNLIMITED_PROTECTED）
// dailyCostCap/monthlyCostCap 仅用于「告警状态」（第四十七章），Phase 1 不做硬性封禁；
//   不对真实正常用户自动封号；异常由 anomaly 告警上报人工。
// overageAllowed=true 的档位（basic/monthly/quarterly）：超额后可购买增量包/升级，
//   overageProductId 指向可购买的增量包 ID。

const DEFAULT_POLICY = {
  policyVersion: '1.0.0',
  effectiveFrom: '2026-08-29',
  note: 'AI 额度服务端唯一事实源。yearly/lifetime 为 LEGACY_UNLIMITED_PROTECTED，禁止改为每天 N 次。basic/monthly/quarterly 保持现状（每日 3/50/50 次），Phase 1 不下调。',
  legacyUnlimitedProtected: ['yearly', 'lifetime'],
  // monthlyRequests 为可配置字段（第三十六章），Phase 1 置 -1 = 不设月硬上限，
  // 以避免隐性削减现有「每日」承诺对应的自然月总量；月上限属后续商业决策。
  tiers: {
    basic: {
      dailyRequests: 3,
      monthlyRequests: -1,
      maxConcurrent: 1,
      maxInputChars: 12000,
      maxOutputTokens: 8192,
      dailyCostCap: null,
      monthlyCostCap: null,
      overageAllowed: false,
      overageProductId: null,
      legacyUnlimited: false,
    },
    monthly: {
      dailyRequests: 50,
      monthlyRequests: -1,
      maxConcurrent: 1,
      maxInputChars: 12000,
      maxOutputTokens: 8192,
      dailyCostCap: null,
      monthlyCostCap: null,
      overageAllowed: false,
      overageProductId: null,
      legacyUnlimited: false,
    },
    quarterly: {
      dailyRequests: 50,
      monthlyRequests: -1,
      maxConcurrent: 1,
      maxInputChars: 12000,
      maxOutputTokens: 8192,
      dailyCostCap: null,
      monthlyCostCap: null,
      overageAllowed: false,
      overageProductId: null,
      legacyUnlimited: false,
    },
    yearly: {
      dailyRequests: -1,
      monthlyRequests: -1,
      maxConcurrent: 1,
      maxInputChars: 12000,
      maxOutputTokens: 8192,
      dailyCostCap: null,
      monthlyCostCap: null,
      overageAllowed: false,
      overageProductId: null,
      legacyUnlimited: true,
    },
    lifetime: {
      dailyRequests: -1,
      monthlyRequests: -1,
      maxConcurrent: 1,
      maxInputChars: 12000,
      maxOutputTokens: 8192,
      dailyCostCap: null,
      monthlyCostCap: null,
      overageAllowed: false,
      overageProductId: null,
      legacyUnlimited: true,
    },
  },
};

// 匿名通道（旧 APK 过渡期）单主体限额，不属于会员档位
const ANON_POLICY = {
  dailyRequests: 5,
  monthlyRequests: -1,
  maxConcurrent: 1,
  maxInputChars: 12000,
  maxOutputTokens: 8192,
  overageAllowed: false,
  legacyUnlimited: false,
};

// ==================== 历史用户权益映射（第十二部分） ====================
// 历史库未逐用户保存 entitlement snapshot，故以「档位级」映射兼容历史用户：
//   - 历史 yearly/lifetime 购买页明确「无限畅享 / AI 解读终身畅用」→ 永久 LEGACY_UNLIMITED（仅 Fair Use 限流）
//   - 历史 basic/monthly/quarterly 维持既定 3/50/50 每日口径（历史事实，本轮不改变）
// 未来若调整当前 tiers，此映射仍固化历史口径，避免历史承诺被新政策回溯改写。
const LEGACY_POLICY_MAPPING = {
  basic:     { dailyRequests: 3,  monthlyRequests: -1, legacyUnlimited: false },
  monthly:   { dailyRequests: 50, monthlyRequests: -1, legacyUnlimited: false },
  quarterly: { dailyRequests: 50, monthlyRequests: -1, legacyUnlimited: false },
  yearly:    { dailyRequests: -1, monthlyRequests: -1, legacyUnlimited: true },
  lifetime:  { dailyRequests: -1, monthlyRequests: -1, legacyUnlimited: true },
};

// 合理默认上限（第八部分）：够正常用户使用，但不无限放大 AI 成本；
// 与 DEFAULT_POLICY tiers 及 ANON_POLICY 的 maxInputChars/maxOutputTokens 保持一致。
const DEFAULT_MAX_INPUT_CHARS = 12000;
const DEFAULT_MAX_OUTPUT_TOKENS = 8192;

// ==================== 默认模型价目表（可配置，禁止硬编码死价） ====================
// 第四十四章：价格必须可配置（effectiveFrom/effectiveTo 区间），后台可在文件校准。
// 以下为「估算默认值」，costSource 会标记 ESTIMATED，待按腾讯云/DeepSeek 真实账单季单价校准。
const DEFAULT_PRICING = {
  source: 'ESTIMATED',
  version: '1.0.0',
  effectiveFrom: '2026-08-29',
  effectiveTo: null,
  note: '默认估算单价（source=ESTIMATED），未经腾讯云/DeepSeek 真实账单校准。请在 data/ai-pricing.json 按供应商真实账单季单价校准后再切 CALIBRATED；未校准前禁止在 UI 显示为「实际成本/真实成本/已结算成本」。',
  models: {
    'deepseek-chat': { inputUnitPrice: 0.000001, outputUnitPrice: 0.000002, currency: 'CNY', effectiveFrom: '2026-08-29', effectiveTo: null },
    'hy3':           { inputUnitPrice: 0.000001, outputUnitPrice: 0.000002, currency: 'CNY', effectiveFrom: '2026-08-29', effectiveTo: null },
    'hunyuan-lite':  { inputUnitPrice: 0.000001, outputUnitPrice: 0.000002, currency: 'CNY', effectiveFrom: '2026-08-29', effectiveTo: null },
  },
};

// ==================== 配置加载 ====================

function readJSON(file, fallback) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    }
  } catch (e) {
    console.error('[aiUsagePolicy] 读取配置失败:', file, e.message);
  }
  return fallback;
}

function writeJSON(file, data) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('[aiUsagePolicy] 写入配置失败:', file, e.message);
    return false;
  }
}

function loadPolicy() {
  const disk = readJSON(POLICY_FILE, null);
  if (!disk || !disk.tiers) return structuredClone(DEFAULT_POLICY);
  // 用默认值兜底补齐缺失档位/字段，保证结构完整
  const merged = structuredClone(DEFAULT_POLICY);
  merged.policyVersion = disk.policyVersion || DEFAULT_POLICY.policyVersion;
  merged.effectiveFrom = disk.effectiveFrom || DEFAULT_POLICY.effectiveFrom;
  merged.legacyUnlimitedProtected = disk.legacyUnlimitedProtected || DEFAULT_POLICY.legacyUnlimitedProtected;
  for (const level of Object.keys(DEFAULT_POLICY.tiers)) {
    merged.tiers[level] = { ...DEFAULT_POLICY.tiers[level], ...(disk.tiers[level] || {}) };
  }
  return merged;
}

function getPolicy() {
  return loadPolicy();
}

function getPolicyVersion() {
  return getPolicy().policyVersion;
}

/**
 * 某档位的额度策略（缺失/未知档位回退 basic）
 */
function tierPolicy(level) {
  const p = getPolicy();
  return p.tiers[level] || p.tiers.basic;
}

function isLegacyUnlimited(level) {
  return !!tierPolicy(level).legacyUnlimited;
}

function isUnlimitedLimit(n) {
  return typeof n !== 'number' || n < 0 || n === Infinity;
}

/**
 * 获取一个主体的全量额度元数据（供 /api/ai/chat 与配额展示共同使用）
 * @param {string} level 会员等级
 * @returns {object} { level, dailyRequests, monthlyRequests, maxConcurrent, maxInputChars, maxOutputTokens, legacyUnlimited, policyVersion }
 */
function getUsagePolicy(level) {
  const t = tierPolicy(level);
  return {
    level,
    dailyRequests: t.dailyRequests,
    monthlyRequests: t.monthlyRequests,
    maxConcurrent: t.maxConcurrent,
    maxInputChars: t.maxInputChars,
    maxOutputTokens: t.maxOutputTokens,
    dailyCostCap: t.dailyCostCap,
    monthlyCostCap: t.monthlyCostCap,
    overageAllowed: t.overageAllowed,
    overageProductId: t.overageProductId,
    legacyUnlimited: !!t.legacyUnlimited,
    policyVersion: getPolicyVersion(),
  };
}

/**
 * 为「新购买」生成权益快照（第十二部分），供订单交付时持久化。
 * @param {string} level 会员等级
 * @param {string} productId 商品标识（如 membership_yearly / pack_50）
 * @returns {object} { productId, membershipPlan, policyVersion, entitlementSnapshot, purchasedAt }
 */
function buildEntitlementSnapshot(level, productId) {
  const t = tierPolicy(level);
  return {
    productId: productId || ('membership_' + level),
    membershipPlan: level,
    policyVersion: getPolicyVersion(),
    entitlementSnapshot: {
      dailyRequests: t.dailyRequests,
      monthlyRequests: t.monthlyRequests,
      maxConcurrent: t.maxConcurrent,
      maxInputChars: t.maxInputChars,
      maxOutputTokens: t.maxOutputTokens,
      legacyUnlimited: !!t.legacyUnlimited,
    },
    purchasedAt: new Date().toISOString(),
  };
}

/**
 * 解析某主体实际应生效的额度政策（第十一~十二部分）：
 *   - 有显式 snapshot（新购买已保存）→ 用 snapshot 固化该购买时的权益；
 *   - 否则历史用户 → 用 LEGACY_POLICY_MAPPING（档位级兼容）；
 *   - 兜底 → 当前 tiers。
 * @param {string} level 会员等级
 * @param {object|null} snapshot 已持久化的 entitlementSnapshot（或含 entitlementSnapshot 的对象）
 */
function resolveEffectivePolicy(level, snapshot) {
  if (snapshot && snapshot.entitlementSnapshot) {
    return { ...getUsagePolicy(level), ...snapshot.entitlementSnapshot };
  }
  const legacy = LEGACY_POLICY_MAPPING[level];
  if (legacy) {
    return { ...getUsagePolicy(level), ...legacy };
  }
  return getUsagePolicy(level);
}

// ==================== 模型价目 / 成本估算 ====================

function loadPricing() {
  const disk = readJSON(PRICING_FILE, null);
  if (!disk || !disk.models) return structuredClone(DEFAULT_PRICING);
  return {
    source: disk.source || DEFAULT_PRICING.source,
    version: disk.version || DEFAULT_PRICING.version,
    effectiveFrom: disk.effectiveFrom || DEFAULT_PRICING.effectiveFrom,
    effectiveTo: disk.effectiveTo || null,
    note: disk.note || DEFAULT_PRICING.note,
    models: { ...DEFAULT_PRICING.models, ...(disk.models || {}) },
  };
}

function getPricing() {
  return loadPricing();
}

/**
 * 估算单次调用成本（人民币元）
 * @param {string} model 模型名
 * @param {number} inputTokens 输入 token 数
 * @param {number} outputTokens 输出 token 数
 * @returns {object} { estimatedCost, costSource, inputUnitPrice, outputUnitPrice, currency }
 */
function estimateCost(model, inputTokens, outputTokens) {
  const p = getPricing();
  const m = (p.models && p.models[model]) || null;
  if (!m) {
    return { estimatedCost: null, costSource: 'UNKNOWN', inputUnitPrice: null, outputUnitPrice: null, currency: null };
  }
  const inP = Number(m.inputUnitPrice) || 0;
  const outP = Number(m.outputUnitPrice) || 0;
  const cost = (Number(inputTokens) || 0) * inP + (Number(outputTokens) || 0) * outP;
  const rounded = Math.round(cost * 10000) / 10000; // 4 位小数（元）
  return {
    estimatedCost: rounded,
    costSource: p.source === 'CALIBRATED' ? 'CALIBRATED' : 'ESTIMATED',
    inputUnitPrice: inP,
    outputUnitPrice: outP,
    currency: m.currency || 'CNY',
  };
}

// ==================== 后台策略修改（必须 bump 版本，禁止静默改历史权益） ====================

/**
 * 后台更新策略：返回新 policyVersion（第四十八~五十三章）
 * 严禁直接 UPDATE 数字导致历史 Lifetime 权益瞬间变化；
 * 仅允许显式传入 tiers 并自动 version bump；yearly/lifetime 若尝试设 dailyRequests>=0 会被拒绝。
 */
function updatePolicy(patch) {
  const current = loadPolicy();
  if (patch && patch.tiers) {
    for (const level of Object.keys(patch.tiers)) {
      const tier = patch.tiers[level];
      if (current.legacyUnlimitedProtected.includes(level)) {
        const dr = tier.dailyRequests;
        const mr = tier.monthlyRequests;
        if ((Number.isFinite(dr) && dr >= 0) || (Number.isFinite(mr) && mr >= 0)) {
          return {
            ok: false,
            error: `拒绝：${level} 为 LEGACY_UNLIMITED_PROTECTED 历史权益，禁止将无限改为有限额度。仅可调整 Fair Use 安全限流（并发/输入/输出上限）。`,
          };
        }
      }
    }
    for (const level of Object.keys(patch.tiers)) {
      current.tiers[level] = { ...current.tiers[level], ...patch.tiers[level] };
    }
  }
  if (patch && Array.isArray(patch.legacyUnlimitedProtected)) {
    current.legacyUnlimitedProtected = patch.legacyUnlimitedProtected;
  }
  // version bump：major.minor.patch → patch+1（默认）
  const parts = String(current.policyVersion || '1.0.0').split('.').map(Number);
  parts[2] = (parts[2] || 0) + 1;
  current.policyVersion = parts.join('.');
  current.effectiveFrom = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
  writeJSON(POLICY_FILE, current);
  return { ok: true, policyVersion: current.policyVersion, policy: current };
}

module.exports = {
  DEFAULT_POLICY,
  ANON_POLICY,
  LEGACY_POLICY_MAPPING,
  DEFAULT_MAX_INPUT_CHARS,
  DEFAULT_MAX_OUTPUT_TOKENS,
  getPolicy,
  getPolicyVersion,
  tierPolicy,
  getUsagePolicy,
  isLegacyUnlimited,
  isUnlimitedLimit,
  buildEntitlementSnapshot,
  resolveEffectivePolicy,
  getPricing,
  estimateCost,
  updatePolicy,
  POLICY_FILE,
  PRICING_FILE,
};

function structuredClone(v) {
  return JSON.parse(JSON.stringify(v));
}