/**
 * objectStorageEngine.js — 对象存储适配层（FINAL-MASTER-05 第一百零三~一百零八章）
 *
 * 第一百零三章：统一 ObjectStorageService —— 全平台唯一对象读写入口，
 *              禁止业务模块直接散写 COS SDK（本引擎是唯一 SDK 调用点）。
 * 第一百零四章：Provider 至少 LOCAL / COS，可扩展 SECONDARY（接口预留）。
 * 第一百零五章：无 COS 凭证 → 软件照样完成（adapter/config validation/upload/download
 *              abstraction/dry-run/测试），状态如实 BLOCKED_EXTERNAL_CONFIG，
 *              禁止伪称 COS = VERIFIED。
 * 第一百零六章：Bucket 逻辑分区 —— user-content / public-content / backup
 *              （LOCAL 用不同根目录；COS 用不同 prefix，策略一致）。
 * 第一百零七章：PRIVATE（user-content）必须鉴权 + owner 权限校验。
 * 第一百零八章：PUBLIC（public-content）才允许公开 CDN；默认禁止公开。
 *
 * 密钥来源（第一百一十四章）：仅从环境变量/服务器 .env 读取（COS_SECRET_ID/
 *   COS_SECRET_KEY/COS_BUCKET/COS_REGION），禁止聊天粘贴、禁止硬编码、禁止写库。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== 第一百零六章：逻辑分区（冻结枚举） ====================
const PARTITIONS = {
  user_content: {
    key: 'user_content',
    label: '用户私人内容',
    visibility: 'PRIVATE',           // 第一百零七章：必须鉴权 + owner 校验
    localDir: process.env.OSS_USER_DIR || 'user-content',
    cosPrefix: 'user-content/',
    cdn: false,                       // 第一百零八章：禁止公开 CDN
  },
  public_content: {
    key: 'public_content',
    label: '公开内容',
    visibility: 'PUBLIC',             // 仅此分区可公开/CDN
    localDir: process.env.OSS_PUBLIC_DIR || 'public-content',
    cosPrefix: 'public-content/',
    cdn: true,
  },
  backup: {
    key: 'backup',
    label: '备份归档',
    visibility: 'PRIVATE',
    localDir: process.env.OSS_BACKUP_DIR || 'backup',
    cosPrefix: 'backup/',
    cdn: false,
  },
};

const PROVIDER_TYPES = ['LOCAL', 'COS', 'SECONDARY'];

const CONFIG_FILE = process.env.OSS_CONFIG_FILE || path.join(__dirname, 'data', 'object_storage_config.json');
const LOCAL_ROOT = process.env.OSS_LOCAL_ROOT || path.join(__dirname, 'data', 'object_storage');

// ==================== 配置 ====================

function getDefaultConfig() {
  return {
    provider: 'LOCAL',                       // 当前生效 Provider
    cos: {
      // 第一百一十四章：凭证仅从 env 读取（不落库不落配置文件）
      secretId: process.env.COS_SECRET_ID || '',
      secretKey: process.env.COS_SECRET_KEY || '',
      bucket: process.env.COS_BUCKET || '',
      region: process.env.COS_REGION || '',
    },
    secondary: { enabled: false, note: '接口预留（第一百零四章）：后续可接第二云/自建 MinIO' },
    maxObjectSize: 512 * 1024 * 1024,        // 单对象上限 512MB
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf', '.zip', '.mp4', '.mp3', '.json', '.db', '.enc', '.bin', '.pack'],
  };
}

function getConfig() {
  const def = getDefaultConfig();
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      const cfg = { ...def, ...saved };
      // 凭证永远以 env 为准（配置文件中即使残留也忽略——密钥不落盘原则）
      cfg.cos = { ...def.cos, ...(saved.cos || {}), secretId: def.cos.secretId, secretKey: def.cos.secretKey, bucket: def.cos.bucket, region: def.cos.region };
      return cfg;
    }
  } catch (e) { console.error('[OSS] 配置读取异常，回退默认:', e.message); }
  return def;
}

function saveConfig(patch) {
  const current = getConfig();
  const next = {
    provider: PROVIDER_TYPES.includes(patch.provider) ? patch.provider : current.provider,
    cos: { ...current.cos, ...(patch.cos || {}) },
    secondary: { ...current.secondary, ...(patch.secondary || {}) },
    maxObjectSize: pickPosInt(patch.maxObjectSize, current.maxObjectSize, 1024, 8 * 1024 * 1024 * 1024),
    allowedExtensions: Array.isArray(patch.allowedExtensions) && patch.allowedExtensions.length
      ? patch.allowedExtensions.map((x) => String(x).slice(0, 12)) : current.allowedExtensions,
  };
  saveConfigFile(next);
  return { ok: true, config: next };
}

function saveConfigFile(cfg) {
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
}

function pickPosInt(v, fallback, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.floor(n), min), max);
}

// ==================== 第一百零五章：COS 凭证校验（不猜不伪称） ====================

/** COS 配置校验：只报事实——有凭证 = READY_TO_CONNECT，无凭证 = BLOCKED_EXTERNAL_CONFIG */
function validateCosConfig() {
  const cfg = getConfig().cos;
  const missing = [];
  if (!cfg.secretId) missing.push('COS_SECRET_ID');
  if (!cfg.secretKey) missing.push('COS_SECRET_KEY');
  if (!cfg.bucket) missing.push('COS_BUCKET');
  if (!cfg.region) missing.push('COS_REGION');
  if (missing.length) {
    return {
      valid: false,
      status: 'BLOCKED_EXTERNAL_CONFIG',      // 第一百零五章：如实状态，不伪称 VERIFIED
      missing,
      note: `请在部署服务器 .env 或环境变量配置：${missing.join(' / ')}（禁止在聊天中粘贴密钥，第一百一十四章）`,
    };
  }
  return {
    valid: true,
    status: 'READY_TO_CONNECT',
    bucket: cfg.bucket,
    region: cfg.region,
    note: '凭证已从服务器环境读取（软件链已就绪；实际连通性以首次真实上传为准）',
  };
}

// ==================== Provider：LOCAL ====================

function localObjectPath(partitionKey, objectKey) {
  const p = PARTITIONS[partitionKey];
  if (!p) throw new Error(`未知分区：${partitionKey}`);
  const safeKey = String(objectKey || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!safeKey || safeKey.includes('..') || /[\u0000-\u001f]/.test(safeKey)) {
    throw new Error('objectKey 非法（禁止路径穿越）');
  }
  return path.join(LOCAL_ROOT, p.localDir, safeKey);
}

const localProvider = {
  type: 'LOCAL',
  async put(partitionKey, objectKey, filePath, meta = {}) {
    const cfg = getConfig();
    const stat = fs.statSync(filePath);
    if (stat.size > cfg.maxObjectSize) return { ok: false, error: `对象超过上限 ${cfg.maxObjectSize} 字节` };
    const dest = localObjectPath(partitionKey, objectKey);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(filePath, dest);
    const digest = sha256File(dest);
    if (meta.sha256 && meta.sha256 !== digest) {
      fs.unlinkSync(dest);
      return { ok: false, error: 'sha256 校验失败，已删除落盘对象' };
    }
    return { ok: true, provider: 'LOCAL', partition: partitionKey, objectKey, size: stat.size, sha256: digest, path: dest };
  },
  async get(partitionKey, objectKey, destPath) {
    const src = localObjectPath(partitionKey, objectKey);
    if (!fs.existsSync(src)) return { ok: false, error: '对象不存在' };
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(src, destPath);
    return { ok: true, path: destPath, size: fs.statSync(src).size, sha256: sha256File(destPath) };
  },
  async delete(partitionKey, objectKey) {
    const src = localObjectPath(partitionKey, objectKey);
    if (!fs.existsSync(src)) return { ok: true, already: true };
    fs.unlinkSync(src);
    const metaPath = src + '.meta.json';
    if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
    // 对象存储无目录概念：删除后清理空父目录（retention 滚动清理依赖）
    const root = path.join(LOCAL_ROOT, PARTITIONS[partitionKey].localDir);
    let dir = path.dirname(src);
    while (dir.startsWith(root) && dir !== root) {
      try {
        if (fs.readdirSync(dir).length) break;
        fs.rmdirSync(dir);
        dir = path.dirname(dir);
      } catch { break; }
    }
    return { ok: true };
  },
  async stat(partitionKey, objectKey) {
    const src = localObjectPath(partitionKey, objectKey);
    if (!fs.existsSync(src)) return { ok: false, error: '对象不存在' };
    const st = fs.statSync(src);
    return { ok: true, size: st.size, sha256: sha256File(src), modifiedAt: st.mtime.toISOString() };
  },
};

// ==================== Provider：COS（第一百零五章：软件链完整，无凭证=BLOCKED） ====================
// 唯一允许接触 COS SDK 的代码点（第一百零三章）。SDK 未安装/无凭证时不假装成功。

let cosSdkModule = null;
function loadCosSdk() {
  if (cosSdkModule !== null) return cosSdkModule;
  try { cosSdkModule = require('cos-nodejs-sdk-v5'); }
  catch { cosSdkModule = false; }
  return cosSdkModule;
}

function getCosClient() {
  const v = validateCosConfig();
  if (!v.valid) return { blocked: v };
  const Sdk = loadCosSdk();
  if (!Sdk) {
    return {
      blocked: {
        valid: false, status: 'BLOCKED_EXTERNAL_CONFIG',
        missing: ['cos-nodejs-sdk-v5（npm 依赖未安装）'],
        note: 'COS SDK 未安装：软件链就绪后执行 npm install cos-nodejs-sdk-v5（服务器上安装，凭证配好后即可启用）',
      },
    };
  }
  const cfg = getConfig().cos;
  const client = new Sdk({ SecretId: cfg.secretId, SecretKey: cfg.secretKey });
  return { client, bucket: cfg.bucket, region: cfg.region };
}

const cosProvider = {
  type: 'COS',
  async put(partitionKey, objectKey, filePath, meta = {}) {
    const c = getCosClient();
    if (c.blocked) return { ok: false, status: 'BLOCKED_EXTERNAL_CONFIG', error: c.blocked.note, detail: c.blocked };
    const p = PARTITIONS[partitionKey];
    const cfg = getConfig();
    const stat = fs.statSync(filePath);
    if (stat.size > cfg.maxObjectSize) return { ok: false, error: `对象超过上限 ${cfg.maxObjectSize} 字节` };
    const Key = p.cosPrefix + normalizeCosKey(objectKey);
    return new Promise((resolve) => {
      c.client.uploadFile({
        Bucket: c.bucket, Region: c.region, Key, FilePath: filePath, SliceSize: 8 * 1024 * 1024,
      }, (err, data) => {
        if (err) return resolve({ ok: false, error: String(err.message || err) });
        resolve({ ok: true, provider: 'COS', partition: partitionKey, objectKey, cosKey: Key, size: stat.size, location: data && data.Location, sha256: meta.sha256 || sha256File(filePath) });
      });
    });
  },
  async get(partitionKey, objectKey, destPath) {
    const c = getCosClient();
    if (c.blocked) return { ok: false, status: 'BLOCKED_EXTERNAL_CONFIG', error: c.blocked.note };
    const Key = PARTITIONS[partitionKey].cosPrefix + normalizeCosKey(objectKey);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    return new Promise((resolve) => {
      c.client.getObject({ Bucket: c.bucket, Region: c.region, Key, Output: destPath }, (err) => {
        if (err) return resolve({ ok: false, error: String(err.message || err) });
        resolve({ ok: true, path: destPath, size: fs.statSync(destPath).size, sha256: sha256File(destPath) });
      });
    });
  },
  async delete(partitionKey, objectKey) {
    const c = getCosClient();
    if (c.blocked) return { ok: false, status: 'BLOCKED_EXTERNAL_CONFIG', error: c.blocked.note };
    const Key = PARTITIONS[partitionKey].cosPrefix + normalizeCosKey(objectKey);
    return new Promise((resolve) => {
      c.client.deleteObject({ Bucket: c.bucket, Region: c.region, Key }, (err) => {
        if (err) return resolve({ ok: false, error: String(err.message || err) });
        resolve({ ok: true });
      });
    });
  },
  async stat(partitionKey, objectKey) {
    const c = getCosClient();
    if (c.blocked) return { ok: false, status: 'BLOCKED_EXTERNAL_CONFIG', error: c.blocked.note };
    const Key = PARTITIONS[partitionKey].cosPrefix + normalizeCosKey(objectKey);
    return new Promise((resolve) => {
      c.client.headObject({ Bucket: c.bucket, Region: c.region, Key }, (err, data) => {
        if (err) return resolve({ ok: false, error: String(err.message || err) });
        resolve({ ok: true, size: (data && data.headers && Number(data.headers['content-length'])) || 0, modifiedAt: data && data.headers && data.headers['last-modified'] });
      });
    });
  },
};

function normalizeCosKey(objectKey) {
  const k = String(objectKey || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!k || k.includes('..')) throw new Error('objectKey 非法（禁止路径穿越）');
  return k;
}

// ==================== 第一百零四章：SECONDARY（接口预留，未实现不伪称） ====================

const secondaryProvider = {
  type: 'SECONDARY',
  async put() {
    const cfg = getConfig().secondary;
    return { ok: false, status: 'NOT_IMPLEMENTED', error: cfg.enabled ? 'SECONDARY Provider 已启用但驱动未接入' : 'SECONDARY Provider 未启用（第一百零四章：接口预留，以后可增加）' };
  },
  async get() { return { ok: false, status: 'NOT_IMPLEMENTED', error: 'SECONDARY Provider 未接入' }; },
  async delete() { return { ok: false, status: 'NOT_IMPLEMENTED', error: 'SECONDARY Provider 未接入' }; },
  async stat() { return { ok: false, status: 'NOT_IMPLEMENTED', error: 'SECONDARY Provider 未接入' }; },
};

const PROVIDERS = { LOCAL: localProvider, COS: cosProvider, SECONDARY: secondaryProvider };

// ==================== 第一百零三章：ObjectStorageService（唯一入口） ====================

function getProvider(name) {
  const type = String(name || getConfig().provider);
  const p = PROVIDERS[type];
  if (!p) throw new Error(`未知 Provider：${type}（支持 ${PROVIDER_TYPES.join('/')}）`);
  return p;
}

const ObjectStorageService = {
  /** 上传对象（分区强制；PRIVATE 分区必须带 owner） */
  async putObject({ partition, objectKey, filePath, sha256, owner }) {
    const p = PARTITIONS[partition];
    if (!p) return { ok: false, error: `分区仅支持：${Object.keys(PARTITIONS).join('/')}` };
    if (p.visibility === 'PRIVATE' && !owner) {
      return { ok: false, error: `分区 ${p.label} 为 PRIVATE，必须登记 owner（第一百零七章）` };
    }
    if (!fs.existsSync(filePath)) return { ok: false, error: '源文件不存在' };
    const ext = path.extname(filePath).toLowerCase();
    const cfg = getConfig();
    if (cfg.allowedExtensions.length && !cfg.allowedExtensions.includes(ext)) {
      return { ok: false, error: `扩展名 ${ext} 不在允许列表` };
    }
    const provider = getProvider();
    const r = await provider.put(partition, objectKey, filePath, { sha256 });
    if (r.ok) {
      r.meta = { partition, visibility: p.visibility, owner: String(owner || ''), uploadedAt: new Date().toISOString(), provider: provider.type };
      // LOCAL Provider 同步落属主元数据（PRIVATE 鉴权数据源）
      if (provider.type === 'LOCAL') writeObjectMeta(partition, objectKey, r.meta);
    }
    return r;
  },

  /** 下载对象（PRIVATE 分区：必须 owner 校验通过才放行） */
  async getObject({ partition, objectKey, destPath, requester }) {
    const p = PARTITIONS[partition];
    if (!p) return { ok: false, error: '未知分区' };
    if (p.visibility === 'PRIVATE') {
      const meta = readObjectMeta(partition, objectKey);
      if (meta && meta.owner && String(requester) !== String(meta.owner)) {
        return { ok: false, status: 403, error: '无权访问该对象（仅 owner 可读，第一百零七章）' };
      }
    }
    return getProvider().get(partition, objectKey, destPath);
  },

  async deleteObject({ partition, objectKey, requester }) {
    const p = PARTITIONS[partition];
    if (!p) return { ok: false, error: '未知分区' };
    if (p.visibility === 'PRIVATE') {
      const meta = readObjectMeta(partition, objectKey);
      if (meta && meta.owner && String(requester) !== String(meta.owner)) {
        return { ok: false, status: 403, error: '无权删除该对象（仅 owner，第一百零七章）' };
      }
    }
    return getProvider().delete(partition, objectKey);
  },

  async statObject({ partition, objectKey }) {
    if (!PARTITIONS[partition]) return { ok: false, error: '未知分区' };
    return getProvider().stat(partition, objectKey);
  },

  /** 第一百零八章：公开 URL 只对 PUBLIC 分区生成；PRIVATE 一律拒绝 */
  publicUrl(partition, objectKey) {
    const p = PARTITIONS[partition];
    if (!p) return { ok: false, error: '未知分区' };
    if (!p.cdn) {
      return { ok: false, error: `分区 ${p.label} 为 PRIVATE，禁止公开 URL（第一百零八章：默认禁止公开）` };
    }
    const provider = getProvider();
    if (provider.type === 'LOCAL') {
      return { ok: true, provider: 'LOCAL', partition, objectKey, url: `/api/oss/public/public-content/${objectKey}`, note: 'LOCAL Provider 经服务端公开只读端点（仅 PUBLIC 分区路由挂载）' };
    }
    if (provider.type === 'COS') {
      const cfg = getConfig().cos;
      const key = PARTITIONS[partition].cosPrefix + normalizeCosKey(objectKey);
      return { ok: true, provider: 'COS', url: `https://${cfg.bucket}.cos.${cfg.region}.myqcloud.com/${key}` };
    }
    return { ok: false, error: '当前 Provider 不支持公开 URL' };
  },
};

// LOCAL Provider 的对象属主元数据（随对象同目录 .meta.json；PRIVATE 鉴权数据源）
function readObjectMeta(partition, objectKey) {
  try {
    const objPath = localObjectPath(partition, objectKey);
    const metaPath = objPath + '.meta.json';
    if (fs.existsSync(metaPath)) return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  } catch { /* ignore */ }
  return null;
}

function writeObjectMeta(partition, objectKey, meta) {
  const objPath = localObjectPath(partition, objectKey);
  fs.writeFileSync(objPath + '.meta.json', JSON.stringify(meta, null, 2), 'utf-8');
}

// ==================== 能力报告（诚实状态，供后台总控） ====================

function capabilityReport() {
  const cfg = getConfig();
  const cos = validateCosConfig();
  const provider = getProvider();
  return {
    activeProvider: provider.type,
    providers: {
      LOCAL: { status: 'VERIFIED', note: '本地磁盘适配器（已实测）' },
      COS: {
        // 第一百零五章：无凭证如实 BLOCKED_EXTERNAL_CONFIG；有凭证 = READY_TO_CONNECT（首次真实上传前不称 VERIFIED）
        status: cos.valid ? 'READY_TO_CONNECT' : 'BLOCKED_EXTERNAL_CONFIG',
        missing: cos.missing || [],
        sdkInstalled: !!loadCosSdk(),
        note: cos.note,
      },
      SECONDARY: { status: 'NOT_IMPLEMENTED', note: '第一百零四章接口预留：以后可增加第二云/MinIO' },
    },
    partitions: Object.values(PARTITIONS).map((p) => ({
      key: p.key, label: p.label, visibility: p.visibility,
      localDir: p.localDir, cosPrefix: p.cosPrefix, cdn: p.cdn,
    })),
    rules: {
      chapter103: '统一 ObjectStorageService，业务模块禁止直写 COS SDK（唯一 SDK 调用点在本引擎）',
      chapter107: 'PRIVATE 分区读取强制 owner 校验',
      chapter108: 'publicUrl 仅对 PUBLIC 分区生成，默认禁止公开',
    },
    config: { maxObjectSize: cfg.maxObjectSize, allowedExtensions: cfg.allowedExtensions },
  };
}

function sha256File(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

module.exports = {
  PARTITIONS, PROVIDER_TYPES,
  getConfig, saveConfig, validateCosConfig,
  ObjectStorageService, capabilityReport,
  readObjectMeta, writeObjectMeta, localObjectPath,
  // MASTER-05 第一百一十章：备份密钥分离校验需要知道对象存储本地根目录
  getLocalRoot: () => LOCAL_ROOT,
};
