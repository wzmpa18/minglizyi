'use strict';
const fs = require('node:fs');
const path = require('node:path');

const PRODUCT_TYPES = ['MEMBERSHIP', 'AI_PACKAGE', 'SINGLE_UNLOCK', 'BATCH_INTERPRET'];
const DEFAULT_CONFIG = { id: 'learning-sale-20261018', revision: 1, name: '促销期间全场八折', enabled: false, discountPercent: 20, startsAt: null, endsAt: null, productTypes: PRODUCT_TYPES };
const configPath = () => process.env.SALES_PROMOTION_FILE || path.join(__dirname, 'data', 'sales-promotion.json');

function validateConfig(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('促销配置无效');
  if (typeof input.enabled !== 'boolean' || !Number.isInteger(input.discountPercent) || input.discountPercent < 1 || input.discountPercent > 90) throw Error('折扣必须为1至90的整数百分比');
  for (const key of ['startsAt', 'endsAt']) if (input[key] != null) {
    const value = input[key];
    if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value) || !Number.isFinite(Date.parse(value))) throw Error('时间必须含明确时区');
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) throw Error('日期不存在');
  }
  if (input.startsAt && input.endsAt && Date.parse(input.startsAt) >= Date.parse(input.endsAt)) throw Error('结束时间必须晚于开始时间');
  if (!Array.isArray(input.productTypes) || input.productTypes.some(x => !PRODUCT_TYPES.includes(x)) || new Set(input.productTypes).size !== input.productTypes.length) throw Error('促销商品类型无效');
  if (typeof input.name !== 'string' || input.name.length < 1 || input.name.length > 60 || /[<>]/.test(input.name)) throw Error('促销名称无效');
  if (typeof input.id !== 'string' || !/^[a-zA-Z0-9_-]{1,70}$/.test(input.id)) throw Error('促销ID无效');
  if (!Number.isSafeInteger(input.revision) || input.revision < 1) throw Error('配置版本无效');
  return { id: input.id, revision: input.revision, name: input.name, enabled: input.enabled, discountPercent: input.discountPercent, startsAt: input.startsAt || null, endsAt: input.endsAt || null, productTypes: [...input.productTypes] };
}

function getConfig() {
  if (!fs.existsSync(configPath())) return { ...DEFAULT_CONFIG, productTypes: [...PRODUCT_TYPES] };
  // A broken config must not silently change an active checkout to a higher price.
  return validateConfig(JSON.parse(fs.readFileSync(configPath(), 'utf8')));
}

function saveConfig(input, expectedRevision) {
  const previous = getConfig();
  if (expectedRevision !== previous.revision) { const error = Error('促销配置已更新，请刷新后重试'); error.status = 409; throw error; }
  const config = validateConfig({ ...input, revision: previous.revision + 1 });
  const filename = configPath(); fs.mkdirSync(path.dirname(filename), { recursive: true });
  const temporary = filename + '.tmp'; fs.writeFileSync(temporary, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 }); fs.renameSync(temporary, filename);
  return config;
}

function active(config, type, now = Date.now()) {
  return config.enabled && config.productTypes.includes(type) && (!config.startsAt || now >= Date.parse(config.startsAt)) && (!config.endsAt || now < Date.parse(config.endsAt));
}

function quote(type, current, config = getConfig(), now = Date.now()) {
  if (!current || current.price == null || !Number.isFinite(current.price) || current.price <= 0 || !active(config, type, now)) return current;
  const basePrice = current.basePrice ?? current.price;
  if (!Number.isFinite(basePrice) || basePrice <= 0) throw Error('商品基础价格无效');
  const baseCents = Math.round(basePrice * 100), currentCents = Math.round(current.price * 100);
  const saleCents = Math.max(1, Math.round(baseCents * (100 - config.discountPercent) / 100));
  const price = Math.min(currentCents, saleCents) / 100; // Best offer; never multiply a member/coupon discount twice.
  return { ...current, basePrice, price, promotion: { id: config.id, revision: config.revision, name: config.name, discountPercent: config.discountPercent, basePrice, finalPrice: price, endsAt: config.endsAt } };
}

function decorateProduct(product, type, config, now) {
  const result = quote(type, { price: Number(product.price) }, config, now);
  if (!result.promotion) return { ...product };
  return { ...product, basePrice: result.basePrice, price: result.price, regularOriginalPrice: product.originalPrice, originalPrice: result.basePrice, promotion: result.promotion };
}

function decoratePricing(data, config = getConfig(), now = Date.now()) {
  const result = { ...data, promotion: { ...config, active: config.enabled && PRODUCT_TYPES.some(type => active(config, type, now)) } };
  if (data.membershipPlans) result.membershipPlans = data.membershipPlans.map(p => decorateProduct(p, 'MEMBERSHIP', config, now));
  if (data.aiPlans) result.aiPlans = data.aiPlans.map(p => decorateProduct(p, 'AI_PACKAGE', config, now));
  if (data.ai) result.ai = { ...data.ai,
    singleUnlockBasePrice: data.ai.singleUnlockPrice,
    singleUnlockPrice: quote('SINGLE_UNLOCK', { price: data.ai.singleUnlockPrice }, config, now).price,
    packages: (data.ai.packages || []).map(p => decorateProduct(p, 'AI_PACKAGE', config, now)),
    timePlans: (data.ai.timePlans || []).map(p => decorateProduct(p, 'AI_PACKAGE', config, now)),
    tools: (data.ai.tools || []).map(p => decorateProduct(p, 'SINGLE_UNLOCK', config, now)) };
  if (data.singleUnlockPrice != null) { result.singleUnlockBasePrice = data.singleUnlockPrice; result.singleUnlockPrice = quote('SINGLE_UNLOCK', { price: data.singleUnlockPrice }, config, now).price; }
  if (data.batchInterpret) result.batchInterpret = { ...data.batchInterpret, promotionDiscount: active(config, 'BATCH_INTERPRET', now) ? (100 - config.discountPercent) / 100 : 1 };
  return result;
}

module.exports = { PRODUCT_TYPES, DEFAULT_CONFIG, validateConfig, getConfig, saveConfig, active, quote, decorateProduct, decoratePricing };
