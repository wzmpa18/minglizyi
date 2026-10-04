/**
 * offlinePackRoutes.js — OFFLINE CONTENT PACK 路由（FINAL-MASTER-05 第五十四~六十五章）
 *
 * 用户端（JWT 可选公开 manifest，挂载 /api/offline）：
 *   GET  /manifest                    — Pack Manifest（第五十九章：APP 比较 local 版本）
 *   GET  /packs/:packId/download      — Pack 下载（支持 Range 断点续传；sha256 由 manifest 提供）
 *   POST /sync                        — 批量同步离线事件（第六十四~六十五章：eventId 幂等）
 *   GET  /sync/events?since=          — 查询本人已同步事件（冲突检测）
 *
 * 管理端（密钥鉴权，挂载 /api/admin/offline）：
 *   GET  /packs                       — 全量 pack 列表（含 DRAFT/DEPRECATED）
 *   POST /packs                       — 注册 pack（服务器本地文件，实测 size/sha256）
 *   POST /packs/:packId/action        — publish / deprecate / redraft
 *   GET  /sync/stats                  — 同步事件统计
 *
 * 下载安全（第六十章）：sha256 在 manifest 中提供，客户端校验失败禁止启用；
 * 服务端在响应头回传 X-Pack-Sha256 供二次核对。
 */
'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const offlinePackEngine = require('./offlinePackEngine');
const objectStorage = require('./objectStorageEngine');
const { adminAuth, audit } = require('./adminRoles');
const { getMembershipFromDB, MEMBER_LEVELS } = require('./middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET 未配置或长度不足32位，服务拒绝启动（fail-closed）。请在部署 .env 设置 ≥32 位随机密钥。');
}

function createRouter() {
  const router = express.Router();

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

  function attachUserIfPresent(req) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : (req.headers['x-access-token'] || '');
    if (!token) return;
    try { req.user = jwt.verify(token, JWT_SECRET); } catch { /* 下载门禁统一返回登录提示 */ }
  }

  function canDownload(req, row) {
    if ((row.access_level || 'PUBLIC') === 'PUBLIC') return { ok: true };
    if (!req.user || !req.user.userId) return { ok: false, status: 401, error: '请先登录会员账号' };
    const membership = getMembershipFromDB(req.user.userId);
    const paid = ['monthly', 'quarterly', 'yearly', 'lifetime', 'premium'].includes(membership.level) ||
      (MEMBER_LEVELS[membership.level] || 0) >= (MEMBER_LEVELS.monthly || 1);
    return paid ? { ok: true } : { ok: false, status: 403, error: '离线学习包为会员权益，请开通会员后下载' };
  }

  const guard = fn => (req, res) => {
    try { fn(req, res); } catch (e) {
      console.error('[OfflineRoutes] 内部错误:', e.message);
      res.status(500).json({ success: false, error: '服务内部错误' });
    }
  };
  const guardAsync = fn => (req, res) => {
    Promise.resolve(fn(req, res)).catch((e) => {
      console.error('[OfflineRoutes] 内部错误:', e.message);
      if (!res.headersSent) res.status(500).json({ success: false, error: '服务内部错误' });
    });
  };

  // ==================== 用户端 ====================

  // 第五十九章：Pack Manifest（公开只读——元数据不含隐私；登录可选以携带平台信息）
  router.get('/manifest', guard((req, res) => {
    const manifest = offlinePackEngine.getManifest();
    // Content releases must become visible immediately.  The client persists
    // verified packs locally, so caching this small manifest only risks serving
    // an obsolete catalogue after an operator publishes a new version.
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json({ success: true, data: manifest });
  }));

  // 第六十~六十一章：Pack 下载（支持 Range 断点续传）
  router.get('/packs/:packId/download', guardAsync(async (req, res) => {
    const r = offlinePackEngine.getPackFile(req.params.packId);
    if (!r.ok) return res.status(404).json({ success: false, error: r.error });
    attachUserIfPresent(req);
    const access = canDownload(req, r.row);
    if (!access.ok) return res.status(access.status).json({ success: false, error: access.error });

    if (r.deliveryProvider === 'COS' && r.objectKey) {
      const signed = await objectStorage.ObjectStorageService.temporaryDownloadUrl('learning_content', r.objectKey, 900);
      if (!signed.ok) return res.status(503).json({ success: false, error: signed.error, code: signed.status || 'COS_URL_FAILED' });
      res.setHeader('Cache-Control', 'private, no-store');
      return res.redirect(307, signed.url);
    }

    const stat = fs.statSync(r.filePath);
    const range = req.headers.range;
    res.setHeader('X-Pack-Sha256', r.sha256);
    res.setHeader('X-Pack-Version', r.row.version);
    res.setHeader('X-Pack-Size', String(r.size));
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Type', 'application/octet-stream');

    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(String(range).trim());
      if (m) {
        const start = m[1] === '' ? 0 : parseInt(m[1], 10);
        const end = m[2] === '' ? r.size - 1 : Math.min(parseInt(m[2], 10), r.size - 1);
        if (start <= end && start < r.size) {
          const stream = fs.createReadStream(r.filePath, { start, end });
          res.status(206);
          res.setHeader('Content-Range', `bytes ${start}-${end}/${r.size}`);
          res.setHeader('Content-Length', String(end - start + 1));
          return stream.pipe(res);
        }
      }
      res.status(416).setHeader('Content-Range', `bytes */${r.size}`);
      return res.status(416).end();
    }
    res.setHeader('Content-Length', String(stat.size));
    fs.createReadStream(r.filePath).pipe(res);
  }));

  // 第六十四~六十五章：批量同步离线事件（eventId 幂等）
  router.post('/sync', authRequired, guard((req, res) => {
    const b = req.body || {};
    const r = offlinePackEngine.syncEvents({ userId: req.user.userId, events: b.events });
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    res.json({ success: true, data: r });
  }));

  router.get('/sync/events', authRequired, guard((req, res) => {
    const r = offlinePackEngine.getSyncedEvents(req.user.userId, req.query.since);
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    res.json({ success: true, data: r });
  }));

  // ==================== 管理端 ====================

  router.get('/packs', adminAuth('SUPER_ADMIN', 'content'), guard((req, res) => {
    const data = offlinePackEngine.listPacksAdmin({ status: req.query.status, contentType: req.query.contentType });
    res.json({ success: true, data });
  }));

  router.post('/packs', adminAuth('SUPER_ADMIN', 'content'), guard((req, res) => {
    const b = req.body || {};
    const r = offlinePackEngine.registerPack({
      packId: b.packId, contentType: b.contentType, version: b.version,
      filePath: b.filePath, name: b.name, minAppVersion: b.minAppVersion,
      required: b.required, description: b.description,
      accessLevel: b.accessLevel,
    });
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    audit(req.admin, 'OFFLINE_PACK_REGISTER', `pack=${b.packId} type=${b.contentType} v=${b.version} size=${r.pack.size}`, null, null, '', null, null, '', req);
    res.json({ success: true, data: r });
  }));

  router.post('/packs/:packId/distribute', adminAuth('SUPER_ADMIN', 'content'), guardAsync(async (req, res) => {
    const r = await offlinePackEngine.distributePack(req.params.packId);
    if (!r.ok) return res.status(400).json({ success: false, error: r.error, status: r.status });
    audit(req.admin, 'OFFLINE_PACK_DISTRIBUTE', `pack=${req.params.packId} provider=${r.provider}`, null, r.objectKey, '学习包分发到私有对象存储', req);
    res.json({ success: true, data: r });
  }));

  router.post('/packs/:packId/action', adminAuth('SUPER_ADMIN', 'content'), guard((req, res) => {
    const b = req.body || {};
    const r = offlinePackEngine.setPackStatus({ packId: req.params.packId, action: b.action });
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    audit(req.admin, 'OFFLINE_PACK_STATUS', `pack=${req.params.packId} action=${b.action} -> ${r.status}`, null, null, '', null, null, '', req);
    res.json({ success: true, data: r });
  }));

  router.get('/sync/stats', adminAuth('SUPER_ADMIN', 'content'), guard((req, res) => {
    res.json({ success: true, data: offlinePackEngine.syncStats() });
  }));

  return router;
}

module.exports = createRouter;
module.exports.createRouter = createRouter;
