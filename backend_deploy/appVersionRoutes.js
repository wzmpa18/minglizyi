// ============================================================================
// APP 版本发布接口 - v25.0.48 (FIX-V16-UPGRADE-NOTICE)
// GET /api/public/app-version：返回最新 APP 版本号/下载地址/更新说明/强制更新标志
// 数据来源：data/app-release-config.json（服务器文件，发布新 APK 后更新即可，无需改代码）
// 前端 AppUpgradeChecker 组件消费：APP 启动时比较 versionCode，落后则弹升级提示
// ============================================================================
'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const DATA_DIR = path.join(__dirname, 'data');

// 兜底默认值：配置文件缺失/损坏时返回（保持接口永不 500）
const DEFAULT_RELEASE = {
  latestVersion: '25.0.48',
  latestVersionCode: 2048,
  downloadUrl: 'https://yandaoguoxue.yandao.vip/app-download/yandao-guoxue-v25.0.48-release.apk',
  downloadPage: 'https://yandaoguoxue.yandao.vip/friend',
  releaseNotes: [
    '修复邀请海报保存：导出完整高清海报（含背景/标题/卖点/二维码），不再只有二维码',
    '后台导航升级为抽屉式：内容区全宽展示，不再遮挡',
    '新增版本升级提示：新版本发布后自动提醒更新',
  ],
  forceUpdate: false,
  publishedAt: '2026-08-23T00:00:00+08:00',
};

function readReleaseConfig() {
  try {
    const p = path.join(DATA_DIR, 'app-release-config.json');
    if (fs.existsSync(p)) {
      const cfg = JSON.parse(fs.readFileSync(p, 'utf-8'));
      if (cfg && typeof cfg.latestVersionCode === 'number' && cfg.downloadUrl) {
        return {
          latestVersion: String(cfg.latestVersion || DEFAULT_RELEASE.latestVersion),
          latestVersionCode: cfg.latestVersionCode,
          downloadUrl: cfg.downloadUrl,
          downloadPage: cfg.downloadPage || DEFAULT_RELEASE.downloadPage,
          releaseNotes: Array.isArray(cfg.releaseNotes) ? cfg.releaseNotes : DEFAULT_RELEASE.releaseNotes,
          forceUpdate: cfg.forceUpdate === true,
          publishedAt: cfg.publishedAt || DEFAULT_RELEASE.publishedAt,
        };
      }
    }
  } catch (e) {
    console.error('[appVersion] 读取配置失败:', e.message);
  }
  return DEFAULT_RELEASE;
}

router.get('/', (_req, res) => {
  res.json({ success: true, data: readReleaseConfig() });
});

module.exports = { router, DEFAULT_RELEASE };
