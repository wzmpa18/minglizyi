/**
 * objectStorageRoutes.js — 对象存储 + 备份/灾备路由（FINAL-MASTER-05 第一百零三~一百一十四章）
 *
 * 用户端（JWT，挂载 /api/oss）：
 *   POST /upload                     — 上传私人内容（user_content 分区，owner=userId，第一百零七章）
 *   GET  /object                     — 读取自己的对象（owner 校验，引擎层强制）
 *   DELETE /object                   — 删除自己的对象
 *   GET  /public/public-content/:key — 公开只读（仅 PUBLIC 分区，第一百零八章）
 *
 * 管理端（密钥鉴权，挂载 /api/admin/oss）：
 *   GET  /overview                   — 总控（能力 + 加密 + 备份 + 演练 + Owner Actions）
 *   GET  /capability                 — 存储能力报告（COS 如实 BLOCKED_EXTERNAL_CONFIG）
 *   PUT  /config                     — 更新存储配置（不含凭证：凭证仅 env，第一百一十四章）
 *   POST /object/upload              — 管理员上传（可指定分区）
 *   GET  /object/download            — 下载对象（PRIVATE 分区 requester=system）
 *   DELETE /object/remove            — 删除对象
 *   GET  /public-url                 — 生成公开 URL（仅 PUBLIC 分区）
 *   --- 备份 / 灾备（第一百零九~一百一十二章）---
 *   POST /backup/run                 — 执行三库备份（snapshot→加密→上传→manifest→retention）
 *   GET  /backup/list                — 备份历史列表
 *   GET  /backup/config              — 备份配置（retention/演练间隔）
 *   PUT  /backup/config              — 更新备份配置
 *   POST /backup/restore             — 恢复取回（强制隔离目录，第一百一十一章禁止覆盖生产）
 *   POST /backup/drill               — 执行恢复演练（隔离目录 + integrity_check）
 *   GET  /backup/drill-status        — 演练状态（lastRestoreDrillAt/result/nextDueAt/OVERDUE）
 *   --- Owner Actions（第一百一十三~一百一十四章）---
 *   GET  /owner-actions              — Owner Action 清单 + 精确步骤 + 状态
 *   POST /owner-actions/:code/ack    — 项目方完成控制台动作后回填
 */
'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const OSS = require('./objectStorageEngine');
const backup = require('./backupEngine');
const { adminAuth, audit } = require('./adminRoles');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET 未配置或长度不足32位，服务拒绝启动（fail-closed）。请在部署 .env 设置 ≥32 位随机密钥。');
}

const UPLOAD_TMP_DIR = process.env.OSS_TMP_DIR || path.join(__dirname, 'data', 'oss-tmp');
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;   // 用户端单文件 5MB（base64 前原始大小）
const ALLOWED_USER_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

function createRouter() {
  const router = express.Router();
  OSS.ensureTmpDir = () => { if (!fs.existsSync(UPLOAD_TMP_DIR)) fs.mkdirSync(UPLOAD_TMP_DIR, { recursive: true }); };
  OSS.ensureTmpDir();

  function authRequired(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : (req.headers['x-access-token'] || '');
    if (!token) return res.status(401).json({ success: false, error: '请先登录' });
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      return res.status(401).json({ success: false, error: '登录已过期，请重新登录' });
    }
  }

  const guard = fn => (req, res) => {
    try { fn(req, res); } catch (e) {
      console.error('[OSSRoutes] 内部错误:', e.message);
      res.status(500).json({ success: false, error: '服务内部错误' });
    }
  };
  const guardAsync = fn => (req, res) => {
    Promise.resolve(fn(req, res)).catch((e) => {
      console.error('[OSSRoutes] 内部错误:', e.message);
      res.status(500).json({ success: false, error: '服务内部错误' });
    });
  };

  function safeExt(name, allowList) {
    const ext = path.extname(String(name || '')).toLowerCase();
    if (!ext || !allowList.includes(ext)) return null;
    return ext;
  }

  /** base64 → 临时文件（大小/扩展名校验） */
  function materializeUpload(b64, filename, allowList, maxBytes) {
    const ext = safeExt(filename, allowList);
    if (!ext) return { ok: false, error: `文件类型不支持（仅 ${allowList.join('/')}）` };
    let buf;
    try { buf = Buffer.from(String(b64 || ''), 'base64'); } catch { return { ok: false, error: 'base64 解析失败' }; }
    if (!buf || !buf.length) return { ok: false, error: '文件内容为空' };
    if (buf.length > maxBytes) return { ok: false, error: `文件超过上限 ${Math.floor(maxBytes / 1024)}KB` };
    if (buf.slice(0, 3).toString('hex') === '000000') return { ok: false, error: '文件内容非法' };
    OSS.ensureTmpDir();
    const tmp = path.join(UPLOAD_TMP_DIR, `up_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`);
    fs.writeFileSync(tmp, buf);
    return { ok: true, tmp, ext, size: buf.length };
  }

  // ==================== 用户端（第一百零七章：PRIVATE 必须 owner） ====================

  router.post('/upload', authRequired, guardAsync(async (req, res) => {
    const b = req.body || {};
    const up = materializeUpload(b.base64, b.filename, ALLOWED_USER_EXTS, MAX_UPLOAD_BYTES);
    if (!up.ok) return res.status(400).json({ success: false, error: up.error });
    try {
      const objectKey = `u${req.user.userId}/${Date.now()}_${crypto.randomBytes(4).toString('hex')}${up.ext}`;
      const r = await OSS.ObjectStorageService.putObject({
        partition: 'user_content', objectKey, filePath: up.tmp, owner: req.user.userId,
      });
      if (!r.ok) return res.status(400).json({ success: false, error: r.error });
      res.json({
        success: true,
        data: {
          objectKey, partition: 'user_content', visibility: 'PRIVATE',
          size: r.size, sha256: r.sha256, provider: r.provider,
          note: '私人内容：仅本人可读（第一百零七章 owner 校验）',
        },
      });
    } finally {
      try { fs.unlinkSync(up.tmp); } catch { /* ignore */ }
    }
  }));

  router.get('/object', authRequired, guardAsync(async (req, res) => {
    const objectKey = String(req.query.key || '').trim();
    const partition = String(req.query.partition || 'user_content');
    if (!objectKey) return res.status(400).json({ success: false, error: '缺少 key' });
    const st = await OSS.ObjectStorageService.statObject({ partition, objectKey });
    if (!st.ok) return res.status(404).json({ success: false, error: st.error });
    OSS.ensureTmpDir();
    const ext = path.extname(objectKey).toLowerCase();
    const dest = path.join(UPLOAD_TMP_DIR, `down_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext || '.bin'}`);
    const r = await OSS.ObjectStorageService.getObject({ partition, objectKey, destPath: dest, requester: req.user.userId });
    if (!r.ok) {
      const code = r.status === 403 ? 403 : 404;
      return res.status(code).json({ success: false, error: r.error });
    }
    try {
      const data = fs.readFileSync(dest);
      const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.gif' ? 'image/gif' : 'image/jpeg';
      res.setHeader('Content-Type', mime);
      res.setHeader('X-OSS-Visibility', 'PRIVATE');
      res.send(data);
    } finally {
      try { fs.unlinkSync(dest); } catch { /* ignore */ }
    }
  }));

  router.delete('/object', authRequired, guardAsync(async (req, res) => {
    const objectKey = String((req.body || {}).key || '').trim();
    const partition = String((req.body || {}).partition || 'user_content');
    if (!objectKey) return res.status(400).json({ success: false, error: '缺少 key' });
    const r = await OSS.ObjectStorageService.deleteObject({ partition, objectKey, requester: req.user.userId });
    if (!r.ok) {
      const code = r.status === 403 ? 403 : 404;
      return res.status(code).json({ success: false, error: r.error });
    }
    res.json({ success: true, data: { objectKey, deleted: true, already: !!r.already } });
  }));

  // ==================== 第一百零八章：公开只读端点（仅 PUBLIC 分区） ====================
  // Express 5 path-to-regexp v8：*splat 匹配多段，参数是数组（join 还原完整 key）
  router.get('/public/public-content/*splat', guardAsync(async (req, res) => {
    const raw = req.params.splat;
    const objectKey = (Array.isArray(raw) ? raw.join('/') : String(raw || '')).replace(/\\/g, '/').replace(/^\/+/, '');
    if (!objectKey || objectKey.includes('..')) return res.status(400).json({ success: false, error: 'key 非法' });
    const st = await OSS.ObjectStorageService.statObject({ partition: 'public_content', objectKey });
    if (!st.ok) return res.status(404).json({ success: false, error: '对象不存在' });
    OSS.ensureTmpDir();
    const dest = path.join(UPLOAD_TMP_DIR, `pub_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${path.extname(objectKey) || '.bin'}`);
    const r = await OSS.ObjectStorageService.getObject({ partition: 'public_content', objectKey, destPath: dest, requester: 'public' });
    if (!r.ok) return res.status(404).json({ success: false, error: '对象不存在' });
    try {
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('X-OSS-Visibility', 'PUBLIC');
      res.sendFile(r.path);
    } finally {
      // sendFile 异步发送，延迟清理
      setTimeout(() => { try { fs.unlinkSync(dest); } catch { /* ignore */ } }, 60000).unref();
    }
  }));

  // ==================== 管理端：总控与配置 ====================
  // 注意：用户端已注册 POST /upload、GET|DELETE /object（JWT）；
  // 管理端对象操作使用 /object/upload、/object/download、/object/remove 区分路径，
  // 避免同一 router 上路径冲突（Express 按注册顺序命中第一个）。

  router.get('/overview', adminAuth('SUPER_ADMIN', 'ops'), guard((req, res) => {
    res.json({ success: true, data: backup.overview() });
  }));

  router.get('/capability', adminAuth('SUPER_ADMIN', 'ops'), guard((req, res) => {
    res.json({ success: true, data: OSS.capabilityReport() });
  }));

  router.put('/config', adminAuth('SUPER_ADMIN', 'ops'), guard((req, res) => {
    const b = req.body || {};
    if (b.provider && !['LOCAL', 'COS', 'SECONDARY'].includes(b.provider)) {
      return res.status(400).json({ success: false, error: 'provider 仅支持 LOCAL/COS/SECONDARY' });
    }
    if (b.provider === 'COS') {
      const v = OSS.validateCosConfig();
      if (!v.valid) {
        return res.status(400).json({
          success: false,
          error: `切换到 COS 前需先在服务器 .env 配置凭证（第一百一十四章，禁止聊天粘贴）：${(v.missing || []).join(' / ')}`,
          detail: v,
        });
      }
    }
    const r = OSS.saveConfig({ provider: b.provider, maxObjectSize: b.maxObjectSize, allowedExtensions: b.allowedExtensions });
    audit(req.admin, 'OSS_CONFIG_UPDATE', `provider=${b.provider || '(未改)'}`, null, JSON.stringify({ provider: b.provider, maxObjectSize: b.maxObjectSize }), '对象存储配置更新', req);
    res.json({ success: true, data: { config: r.config, note: '凭证不落配置文件（仅 env，第一百一十四章）' } });
  }));

  router.post('/object/upload', adminAuth('OPERATOR_ADMIN', 'ops'), guardAsync(async (req, res) => {
    const b = req.body || {};
    const partition = String(b.partition || 'public_content');
    if (!['user_content', 'public_content', 'backup'].includes(partition)) {
      return res.status(400).json({ success: false, error: '分区仅支持 user_content/public_content/backup（第一百零六章）' });
    }
    const allowList = OSS.getConfig().allowedExtensions.map((e) => e.toLowerCase());
    const up = materializeUpload(b.base64, b.filename, allowList, 50 * 1024 * 1024);
    if (!up.ok) return res.status(400).json({ success: false, error: up.error });
    try {
      if (partition === 'user_content' && !b.owner) {
        return res.status(400).json({ success: false, error: 'user_content 分区为 PRIVATE，必须指定 owner（第一百零七章）' });
      }
      const objectKey = String(b.objectKey || `admin/${Date.now()}_${crypto.randomBytes(4).toString('hex')}${up.ext}`).replace(/\\/g, '/').replace(/^\/+/, '');
      if (objectKey.includes('..')) return res.status(400).json({ success: false, error: 'objectKey 非法' });
      const r = await OSS.ObjectStorageService.putObject({ partition, objectKey, filePath: up.tmp, owner: b.owner || 'system' });
      if (!r.ok) return res.status(400).json({ success: false, error: r.error });
      audit(req.admin, 'OSS_OBJECT_UPLOAD', `${partition}/${objectKey}`, null, `${r.size}B`, '管理端对象上传', req);
      res.json({ success: true, data: { partition, objectKey, size: r.size, sha256: r.sha256, provider: r.provider } });
    } finally {
      try { fs.unlinkSync(up.tmp); } catch { /* ignore */ }
    }
  }));

  router.get('/object/download', adminAuth('OPERATOR_ADMIN', 'ops'), guardAsync(async (req, res) => {
    const objectKey = String(req.query.key || '').trim();
    const partition = String(req.query.partition || 'backup');
    if (!objectKey) return res.status(400).json({ success: false, error: '缺少 key' });
    OSS.ensureTmpDir();
    const dest = path.join(UPLOAD_TMP_DIR, `adm_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${path.extname(objectKey) || '.bin'}`);
    const r = await OSS.ObjectStorageService.getObject({ partition, objectKey, destPath: dest, requester: 'system' });
    if (!r.ok) return res.status(r.status === 403 ? 403 : 404).json({ success: false, error: r.error });
    audit(req.admin, 'OSS_OBJECT_DOWNLOAD', `${partition}/${objectKey}`, null, null, '管理端对象下载', req);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(path.basename(objectKey))}"`);
    res.sendFile(dest, (err) => {
      try { fs.unlinkSync(dest); } catch { /* ignore */ }
      if (err && !res.headersSent) res.status(500).json({ success: false, error: '发送失败' });
    });
  }));

  router.delete('/object/remove', adminAuth('SUPER_ADMIN', 'ops'), guardAsync(async (req, res) => {
    const objectKey = String((req.body || {}).key || '').trim();
    const partition = String((req.body || {}).partition || 'user_content');
    if (!objectKey) return res.status(400).json({ success: false, error: '缺少 key' });
    const r = await OSS.ObjectStorageService.deleteObject({ partition, objectKey, requester: 'system' });
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    audit(req.admin, 'OSS_OBJECT_DELETE', `${partition}/${objectKey}`, null, null, '管理端对象删除', req);
    res.json({ success: true, data: { objectKey, deleted: true } });
  }));

  router.get('/public-url', adminAuth('OPERATOR_ADMIN', 'ops'), guard((req, res) => {
    const partition = String(req.query.partition || 'public_content');
    const objectKey = String(req.query.key || '').trim();
    if (!objectKey) return res.status(400).json({ success: false, error: '缺少 key' });
    const r = OSS.ObjectStorageService.publicUrl(partition, objectKey);
    if (!r.ok) return res.status(403).json({ success: false, error: r.error });
    res.json({ success: true, data: r });
  }));

  // ==================== 备份 / 灾备（第一百零九~一百一十二章） ====================

  router.post('/backup/run', adminAuth('SUPER_ADMIN', 'ops'), guardAsync(async (req, res) => {
    const b = req.body || {};
    const r = await backup.runBackup({ actor: (req.admin && req.admin.name) || 'admin', dryRun: !!b.dryRun });
    audit(req.admin, 'OSS_BACKUP_RUN', r.backupId || '(none)', null, `status=${r.status || 'ERR'} ok=${r.okCount ?? 0}`, '三库备份执行（snapshot→加密→上传→manifest→retention）', req);
    if (!r.ok && r.status !== 'PARTIAL') return res.status(400).json({ success: false, error: r.error, detail: r.detail || null, data: r });
    res.json({ success: true, data: r });
  }));

  router.get('/backup/list', adminAuth('SUPER_ADMIN', 'ops'), guard((req, res) => {
    res.json({ success: true, data: backup.listBackups() });
  }));

  router.get('/backup/config', adminAuth('SUPER_ADMIN', 'ops'), guard((req, res) => {
    const cfg = backup.getConfig();
    res.json({ success: true, data: { ...cfg, encryption: backup.validateEncryptionKey() } });
  }));

  router.put('/backup/config', adminAuth('SUPER_ADMIN', 'ops'), guard((req, res) => {
    const b = req.body || {};
    const r = backup.saveConfig({
      retentionCount: b.retentionCount,
      drillIntervalDays: b.drillIntervalDays,
      drillKeepCount: b.drillKeepCount,
      encrypt: b.encrypt,
    });
    audit(req.admin, 'OSS_BACKUP_CONFIG', 'backup_config', null, JSON.stringify(r.config), '备份配置更新', req);
    res.json({ success: true, data: { config: r.config, encryption: backup.validateEncryptionKey() } });
  }));

  // 第一百一十一章：恢复取回（隔离校验在引擎层强制；目标目录必须显式提供且非生产）
  router.post('/backup/restore', adminAuth('SUPER_ADMIN'), guardAsync(async (req, res) => {
    const b = req.body || {};
    if (!b.backupId || !b.targetDir) return res.status(400).json({ success: false, error: 'backupId 与 targetDir 必填（恢复目标必须是隔离目录，禁止覆盖生产）' });
    const r = await backup.fetchRestore({ backupId: b.backupId, targetDir: b.targetDir, actor: req.admin && req.admin.name, verifyIntegrity: true });
    if (r.status === 403) {
      audit(req.admin, 'OSS_RESTORE_BLOCKED', b.backupId, null, r.error, '恢复目标命中生产路径被拒绝（第一百一十一章）', req);
      return res.status(403).json({ success: false, error: r.error, rule: r.rule });
    }
    if (!r.ok) return res.status(400).json({ success: false, error: '恢复未完全成功', data: r });
    audit(req.admin, 'OSS_RESTORE_FETCH', b.backupId, null, `restored=${r.restoredCount} → ${r.outDir}`, '备份恢复取回到隔离目录', req);
    res.json({ success: true, data: r });
  }));

  // 第一百一十一~一百一十二章：恢复演练
  router.post('/backup/drill', adminAuth('SUPER_ADMIN'), guardAsync(async (req, res) => {
    const r = await backup.runRestoreDrill({ backupId: (req.body || {}).backupId, actor: req.admin && req.admin.name });
    if (!r.ok && r.status === 'NO_BACKUP') return res.status(400).json({ success: false, error: r.error });
    audit(req.admin, 'OSS_DRILL_RUN', r.backupId || '(none)', null, `result=${r.result} restored=${r.restoredCount}`, '恢复演练（隔离目录 + integrity_check）', req);
    if (!r.ok) return res.status(400).json({ success: false, error: '演练存在失败项', data: r });
    res.json({ success: true, data: r });
  }));

  router.get('/backup/drill-status', adminAuth('SUPER_ADMIN', 'ops'), guard((req, res) => {
    res.json({ success: true, data: backup.drillStatus() });
  }));

  // ==================== Owner Actions（第一百一十三~一百一十四章） ====================

  router.get('/owner-actions', adminAuth('SUPER_ADMIN', 'ops'), guard((req, res) => {
    res.json({ success: true, data: backup.ownerActions() });
  }));

  router.post('/owner-actions/:code/ack', adminAuth('SUPER_ADMIN'), guard((req, res) => {
    const r = backup.ackOwnerAction(req.params.code, (req.body || {}).note);
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    audit(req.admin, 'OSS_OWNER_ACTION_ACK', req.params.code, null, String((req.body || {}).note || '').slice(0, 200), 'Owner 外部动作完成回填', req);
    res.json({ success: true, data: r });
  }));

  return router;
}

module.exports = { createRouter };
