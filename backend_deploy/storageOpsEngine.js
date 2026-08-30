/**
 * storageOpsEngine.js — SERVER GC + 存储容量监控（FINAL-MASTER-05 第七十~七十四章）
 *
 * GC 治理区（第七十章）：
 *   - 旧日志（>logRetentionDays 天）
 *   - 失败上传碎片（*.part / *.tmp，>24h）
 *   - AI 临时文件（ai-temp，>24h）
 *   - 旧 release（保留 current + 上一稳定回滚版，第七十一章）
 *
 * GC 禁止区（第七十二章，绝对不可删）：
 *   三库 / 用户上传 / 正式学习资料 / 订单佣金（库内数据）/ 备份 / 证书 / Secret / Audit /
 *   current release / rollback release。引擎对每个候选路径先做禁止区校验。
 *
 * 容量监控（第七十三章）：系统盘 / 三库 / 聊天 / 媒体 / 用户资料 / 学习资料 /
 *   Offline Packs / 日志 / 备份 分区大小。
 *
 * 容量阈值（第七十四章）：60% REMIND / 80% YELLOW / 90% RED。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DATA_DIR = process.env.STORAGE_OPS_DIR || path.join(__dirname, 'data');

const DEFAULT_CONFIG = {
  logRetentionDays: 30,
  tempRetentionHours: 24,
  releasesKeepCount: 2,      // 第七十一章：CURRENT + 上一稳定
  capacityThresholds: { remind: 60, yellow: 80, red: 90 },  // 第七十四章
  // 生产目录映射（服务器 Linux 路径；本地测试用 env 覆盖）
  dirs: {
    logs: process.env.GC_LOGS_DIR || path.join(DATA_DIR, 'logs'),
    uploads: process.env.GC_UPLOADS_DIR || path.join(DATA_DIR, 'uploads'),
    aiTemp: process.env.GC_AI_TEMP_DIR || path.join(DATA_DIR, 'ai-temp'),
    backups: process.env.GC_BACKUPS_DIR || path.join(DATA_DIR, 'backups'),
    offlinePacks: process.env.GC_PACKS_DIR || path.join(DATA_DIR, 'offline_packs'),
    studyMaterials: process.env.GC_STUDY_DIR || path.join(DATA_DIR, 'study'),
    userMedia: process.env.GC_MEDIA_DIR || path.join(DATA_DIR, 'media'),
    certs: process.env.GC_CERTS_DIR || path.join(DATA_DIR, 'certs'),
    dbs: process.env.GC_DBS_DIR || DATA_DIR,
    releases: process.env.GC_RELEASES_DIR || '',
  },
};

// 第七十二章：GC 绝对禁止区（路径匹配即拒绝，双向防御）
const GC_FORBIDDEN_PATTERNS = [
  /[/\\]users\.db$/i,
  /[/\\]academy\.db$/i,
  /[/\\]social[^/\\]*\.db$/i,
  /[/\\]\.env/i,
  /[/\\]backups?[/\\]?$/i,
  /[/\\]certs?[/\\]?$/i,
  /[/\\]uploads[/\\]?(?!.*\.(part|tmp)$)/i,   // uploads 仅允许清 .part/.tmp 碎片
  /[/\\]study[/\\]?$/i,
  /[/\\]media[/\\]?$/i,
  /[/\\]audit[^/\\]*\.(db|log)$/i,
  /[/\\]commission[^/\\]*\.db/i,
  /current$/,
];

function nowIso() { return new Date().toISOString(); }

function getConfig() {
  try {
    const cfgFile = path.join(DATA_DIR, 'storage_ops_config.json');
    if (fs.existsSync(cfgFile)) {
      const saved = JSON.parse(fs.readFileSync(cfgFile, 'utf-8'));
      return { ...DEFAULT_CONFIG, ...saved, dirs: { ...DEFAULT_CONFIG.dirs, ...(saved.dirs || {}) } };
    }
  } catch (e) { /* 配置损坏用默认 */ }
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

function saveConfig(cfg) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, 'storage_ops_config.json'), JSON.stringify(cfg, null, 2), 'utf-8');
  return cfg;
}

/** 第七十二章：禁止区校验——目标路径命中即拒绝删除 */
function isForbiddenPath(target) {
  const normalized = String(target).replace(/\\/g, '/');
  for (const re of GC_FORBIDDEN_PATTERNS) {
    if (re.test(normalized)) return { forbidden: true, pattern: String(re) };
  }
  return { forbidden: false };
}

function dirSizeRecursive(dir) {
  let total = 0;
  let files = 0;
  const walk = d => {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else {
        try { total += fs.statSync(full).size; files++; } catch { /* 跳过不可读 */ }
      }
    }
  };
  if (dir && fs.existsSync(dir)) walk(dir);
  return { bytes: total, files };
}

function fmtBytes(bytes) {
  const mb = bytes / 1048576;
  if (mb >= 1024) return (mb / 1024).toFixed(2) + ' GB';
  if (mb >= 1) return mb.toFixed(2) + ' MB';
  return (bytes / 1024).toFixed(1) + ' KB';
}

// ==================== 第七十章：Server GC ====================

function gcOldLogs(cfg) {
  const dir = cfg.dirs.logs;
  const cutoff = Date.now() - cfg.logRetentionDays * 86400000;
  const removed = [];
  if (!dir || !fs.existsSync(dir)) return { removed, scanned: 0 };
  let scanned = 0;
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    const st = fs.statSync(full);
    if (!st.isFile()) continue;
    scanned++;
    const isLog = /\.(log|log\.\d+|log\.\d{4}-\d{2}-\d{2}|gz)$/i.test(f);
    if (!isLog) continue;
    if (st.mtimeMs < cutoff) {
      const guard = isForbiddenPath(full);
      if (guard.forbidden) continue;
      fs.unlinkSync(full);
      removed.push({ file: full, size: st.size, age: cfg.logRetentionDays + 'd+' });
    }
  }
  return { removed, scanned };
}

function gcTempFragments(cfg) {
  const cutoff = Date.now() - cfg.tempRetentionHours * 3600000;
  const targets = [cfg.dirs.uploads, cfg.dirs.aiTemp];
  const removed = [];
  let scanned = 0;
  for (const dir of targets) {
    if (!dir || !fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      const st = fs.statSync(full);
      if (!st.isFile()) continue;
      scanned++;
      // 第六十一章配套：仅清失败 .part/.tmp 碎片；uploads 正式文件一律保留（第七十二章）
      if (!/\.(part|tmp)$/i.test(f)) continue;
      if (st.mtimeMs < cutoff) {
        fs.unlinkSync(full);
        removed.push({ file: full, size: st.size, kind: 'temp_fragment' });
      }
    }
  }
  return { removed, scanned };
}

/** 第七十一章：旧 release 清理（保留 current + 上一稳定 = releasesKeepCount 个） */
function gcOldReleases(cfg) {
  const dir = cfg.dirs.releases;
  if (!dir || !fs.existsSync(dir)) return { removed: [], kept: [], skipped: 'releases 目录未配置或不存在' };
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isDirectory() && /^v\d+\.\d+/.test(e.name))
    .map(e => {
      const full = path.join(dir, e.name);
      return { name: e.name, full, mtime: fs.statSync(full).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
  if (entries.length <= cfg.releasesKeepCount) {
    return { removed: [], kept: entries.map(e => e.name), note: '数量在保留线内，无需清理' };
  }
  const keep = entries.slice(0, cfg.releasesKeepCount);
  const drop = entries.slice(cfg.releasesKeepCount);
  const removed = [];
  for (const d of drop) {
    // 禁止区防御：current 符号链接指向的目录绝不能删
    const guard = isForbiddenPath(d.full);
    if (guard.forbidden) { removed.push({ file: d.full, skipped: true, reason: 'FORBIDDEN: ' + guard.pattern }); continue; }
    fs.rmSync(d.full, { recursive: true, force: true });
    removed.push({ file: d.full, size: dirSizeRecursive(d.full).bytes, kind: 'old_release' });
  }
  return { removed, kept: keep.map(k => k.name) };
}

/** 手动 GC 入口（管理端触发；Audit 由路由层记录） */
function runServerGc(options) {
  const cfg = getConfig();
  const opts = options || {};
  const result = {
    startedAt: nowIso(),
    logs: opts.skipLogs ? { skipped: true } : gcOldLogs(cfg),
    tempFragments: opts.skipTemp ? { skipped: true } : gcTempFragments(cfg),
    releases: opts.skipReleases ? { skipped: true } : gcOldReleases(cfg),
  };
  result.finishedAt = nowIso();
  result.totalRemovedFiles =
    (result.logs.removed || []).length + (result.tempFragments.removed || []).length +
    (result.releases.removed || []).filter(r => !r.skipped).length;
  return result;
}

// ==================== 第七十三~七十四章：容量监控 ====================

/** 系统盘使用率：Linux 用 df，Windows/失败时返回 null（不猜测） */
function systemDiskUsage() {
  try {
    if (process.platform === 'win32') {
      const out = execSync('wmic logicaldisk where "DeviceID=\'C:\'" get Size,FreeSpace /value', { encoding: 'utf-8', timeout: 5000 });
      const total = /Size=(\d+)/.exec(out);
      const free = /FreeSpace=(\d+)/.exec(out);
      if (total && free) {
        const totalB = parseInt(total[1], 10), freeB = parseInt(free[1], 10);
        return { totalBytes: totalB, freeBytes: freeB, usedBytes: totalB - freeB, usedPercent: Math.round((totalB - freeB) / totalB * 100) };
      }
    } else {
      const out = execSync("df -B1 / | tail -1", { encoding: 'utf-8', timeout: 5000 }).trim().split(/\s+/);
      const totalB = parseInt(out[1], 10), usedB = parseInt(out[2], 10), freeB = parseInt(out[3], 10);
      const percent = parseInt(String(out[4]).replace('%', ''), 10);
      return { totalBytes: totalB, freeBytes: freeB, usedBytes: usedB, usedPercent: percent };
    }
  } catch (e) { /* 无法获取时不猜测 */ }
  return null;
}

function capacityLevel(usedPercent, thresholds) {
  const t = thresholds || DEFAULT_CONFIG.capacityThresholds;
  if (usedPercent >= t.red) return 'RED';
  if (usedPercent >= t.yellow) return 'YELLOW';
  if (usedPercent >= t.remind) return 'REMIND';
  return 'OK';
}

function storageReport() {
  const cfg = getConfig();
  const sections = {};
  // 第七十三章：分区清单
  const mapping = {
    dbs: '三库（users/academy/social）',
    logs: '日志',
    uploads: '用户上传',
    userMedia: '媒体',
    studyMaterials: '学习资料',
    offlinePacks: 'Offline Packs',
    backups: '备份',
    aiTemp: 'AI 临时文件',
  };
  let totalBytes = 0;
  for (const [key, label] of Object.entries(mapping)) {
    const dir = cfg.dirs[key];
    const stat = dirSizeRecursive(dir);
    totalBytes += stat.bytes;
    sections[key] = { label, path: dir || '(未配置)', bytes: stat.bytes, human: fmtBytes(stat.bytes), files: stat.files };
  }
  const disk = systemDiskUsage();
  const diskLevel = disk ? capacityLevel(disk.usedPercent, cfg.capacityThresholds) : 'UNKNOWN';
  return {
    generatedAt: nowIso(),
    sections,
    totalTrackedBytes: totalBytes,
    totalTrackedHuman: fmtBytes(totalBytes),
    systemDisk: disk ? { ...disk, human: { total: fmtBytes(disk.totalBytes), used: fmtBytes(disk.usedBytes), free: fmtBytes(disk.freeBytes) }, level: diskLevel } : null,
    thresholds: cfg.capacityThresholds,
    gcForbiddenZones: GC_FORBIDDEN_PATTERNS.map(String),
  };
}

module.exports = {
  getConfig,
  saveConfig,
  isForbiddenPath,
  runServerGc,
  storageReport,
  capacityLevel,
  dirSizeRecursive,
  fmtBytes,
  GC_FORBIDDEN_PATTERNS,
};
