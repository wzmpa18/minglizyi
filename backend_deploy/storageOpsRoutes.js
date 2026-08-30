/**
 * storageOpsRoutes.js — SERVER GC + 容量监控路由（FINAL-MASTER-05 第七十~七十四章）
 *
 * 管理端（密钥鉴权，挂载 /api/admin/storage）：
 *   GET  /report                    — 存储容量分区报告（第七十三章）+ 阈值等级（第七十四章）
 *   POST /gc                        — 手动触发 Server GC（第七十~七十二章，禁止区保护）
 *   GET  /gc/forbidden              — 禁止区清单（第七十二章，只读展示）
 *   GET  /config                    — GC 配置（保留天数/阈值）
 *   PUT  /config                    — 更新配置（SUPER_ADMIN + Audit）
 */
'use strict';

const express = require('express');
const storageOpsEngine = require('./storageOpsEngine');
const { adminAuth, audit } = require('./adminRoles');

function createRouter() {
  const router = express.Router();

  const guard = fn => (req, res) => {
    try { fn(req, res); } catch (e) {
      console.error('[StorageOpsRoutes] 内部错误:', e.message);
      res.status(500).json({ success: false, error: '服务内部错误' });
    }
  };

  // 第七十三~七十四章：容量报告
  router.get('/report', adminAuth('SUPER_ADMIN', 'ops'), guard((req, res) => {
    const report = storageOpsEngine.storageReport();
    res.json({ success: true, data: report });
  }));

  // 第七十~七十二章：手动 GC（保留 current+rollback release；禁止区路径拒绝删除）
  router.post('/gc', adminAuth('SUPER_ADMIN', 'ops'), guard((req, res) => {
    const b = req.body || {};
    const result = storageOpsEngine.runServerGc({
      skipLogs: !!b.skipLogs, skipTemp: !!b.skipTemp, skipReleases: !!b.skipReleases,
    });
    audit(req.admin, 'SERVER_GC_RUN', `removed=${result.totalRemovedFiles} logs=${(result.logs.removed || []).length} temp=${(result.tempFragments.removed || []).length} releases=${(result.releases.removed || []).filter(r => !r.skipped).length}`, null, null, '', null, null, '', req);
    res.json({ success: true, data: result });
  }));

  router.get('/gc/forbidden', adminAuth('SUPER_ADMIN', 'ops'), guard((req, res) => {
    res.json({ success: true, data: { zones: storageOpsEngine.GC_FORBIDDEN_PATTERNS.map(String) } });
  }));

  router.get('/config', adminAuth('SUPER_ADMIN', 'ops'), guard((req, res) => {
    const cfg = storageOpsEngine.getConfig();
    res.json({ success: true, data: cfg });
  }));

  router.put('/config', adminAuth('SUPER_ADMIN', 'ops'), guard((req, res) => {
    const b = req.body || {};
    const cfg = storageOpsEngine.getConfig();
    if (b.logRetentionDays !== undefined) {
      const n = parseInt(b.logRetentionDays, 10);
      if (!n || n < 7 || n > 365) return res.status(400).json({ success: false, error: 'logRetentionDays 需 7-365' });
      cfg.logRetentionDays = n;
    }
    if (b.releasesKeepCount !== undefined) {
      const n = parseInt(b.releasesKeepCount, 10);
      if (n < 2) return res.status(400).json({ success: false, error: '第七十一章红线：至少保留 current + 上一稳定（>=2）' });
      cfg.releasesKeepCount = n;
    }
    if (b.capacityThresholds) {
      const { remind, yellow, red } = b.capacityThresholds;
      if ([remind, yellow, red].some(v => v === undefined) || !(remind < yellow && yellow < red) || red > 100) {
        return res.status(400).json({ success: false, error: '阈值需满足 remind < yellow < red <= 100' });
      }
      cfg.capacityThresholds = { remind: Number(remind), yellow: Number(yellow), red: Number(red) };
    }
    storageOpsEngine.saveConfig(cfg);
    audit(req.admin, 'STORAGE_GC_CONFIG', `logDays=${cfg.logRetentionDays} keepReleases=${cfg.releasesKeepCount} thresholds=${JSON.stringify(cfg.capacityThresholds)}`, null, null, '', null, null, '', req);
    res.json({ success: true, data: cfg });
  }));

  return router;
}

module.exports = createRouter;
module.exports.createRouter = createRouter;
