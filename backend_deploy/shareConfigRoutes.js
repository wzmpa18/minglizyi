/**
 * 分享配置与统计路由 - v20.5
 * 
 * 功能：
 *   1. 分享渠道配置（各渠道开关、排序）
 *   2. 分享文案配置（默认文案、备选文案，后台可配置）
 *   3. 下载链接配置（安卓、iOS状态）
 *   4. 分享日志记录（各渠道分享次数）
 *   5. 转化统计（扫码次数、下载次数、注册转化率）
 *   6. 用户分享排行榜、渠道效果排行
 * 
 * API：
 *   GET  /api/admin/share/config          - 获取分享配置
 *   PUT  /api/admin/share/config          - 更新分享配置
 *   GET  /api/share/config/public          - 前端获取公开分享配置
 *   POST /api/share/log                    - 记录分享行为
 *   GET  /api/admin/share/stats            - 获取分享统计数据
 *   GET  /api/admin/share/leaderboard      - 获取用户分享排行榜
 */
'use strict';

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const ADMIN_KEY = process.env.ADMIN_API_KEY || '';
const CONFIG_FILE = path.join(__dirname, 'data', 'share_config.json');
const STATS_FILE = path.join(__dirname, 'data', 'share_stats.json');

// 默认分享配置（v20.5：已移除所有AI免费赠送表述）
const DEFAULT_CONFIG = {
    // 分享渠道配置（开关+排序）
    channels: {
        wechat_friend:   { enabled: true, sort: 1, label: "微信好友" },
        wechat_moments:  { enabled: true, sort: 2, label: "朋友圈" },
        qq:              { enabled: true, sort: 3, label: "QQ好友" },
        qzone:           { enabled: true, sort: 4, label: "QQ空间" },
        weibo:           { enabled: true, sort: 5, label: "微博" },
        xiaohongshu:     { enabled: true, sort: 6, label: "小红书" },
        copy_link:       { enabled: true, sort: 7, label: "复制链接" },
        save_poster:     { enabled: true, sort: 8, label: "保存海报" }
    },
    // 分享文案（全部移除AI免费表述）
    texts: {
        default: "发现一个实用的传统文化学习平台，排盘工具、典籍知识库都有，分享给你一起看看。",
        alternative: "一直在用的国学学习工具，基础排盘永久免费，还有同道交流社区，扫码就能下载。"
    },
    // 合规文案（底部自动附带）
    complianceText: "内容仅供传统文化学习参考，不构成任何决策建议。",
    // 下载链接
    urls: {
        android: "https://www.yandao.vip/app-download/guoxue-chuancheng-v1.0-release.apk",
        downloadPage: "https://www.yandao.vip/download",
        register: "https://www.yandao.vip/register"
    },
    // iOS 发布状态
    iosStatus: "pending", // pending | available
    // 海报尺寸对应关系
    posterSizes: {
        wechat_friend: "vertical",
        wechat_moments: "square",
        qq: "vertical",
        qzone: "square",
        weibo: "weibo",
        xiaohongshu: "xiaohongshu"
    },
    updatedAt: new Date().toISOString()
};

// 确保文件存在
function ensureFiles() {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(CONFIG_FILE)) {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
    }
    if (!fs.existsSync(STATS_FILE)) {
        const statsDir = path.dirname(STATS_FILE);
        if (!fs.existsSync(statsDir)) {
            fs.mkdirSync(statsDir, { recursive: true });
        }
        const initialStats = {
            shares: [],        // 分享记录
            scans: [],         // 扫码记录
            downloads: [],     // 下载记录
            registrations: [], // 注册记录
            summary: {
                totalShares: 0,
                totalScans: 0,
                totalDownloads: 0,
                totalRegistrations: 0,
                byChannel: {},
                byUser: {}
            }
        };
        fs.writeFileSync(STATS_FILE, JSON.stringify(initialStats, null, 2), 'utf-8');
    }
}

// 读取配置
function getConfig() {
    ensureFiles();
    try {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    } catch {
        return DEFAULT_CONFIG;
    }
}

// 保存配置
function saveConfig(config) {
    ensureFiles();
    config.updatedAt = new Date().toISOString();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

// 读取统计
function getStats() {
    ensureFiles();
    try {
        return JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));
    } catch {
        return { shares: [], scans: [], downloads: [], registrations: [], summary: {} };
    }
}

// 保存统计
function saveStats(stats) {
    ensureFiles();
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf-8');
}

// 验证管理员
function verifyAdmin(req) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return false;
    const token = authHeader.replace('Bearer ', '');
    if (ADMIN_KEY && token === ADMIN_KEY) return true;
    // v25.0.47_13: 统一角色体系——运营/内容子密钥亦可管理（scope=ops）；财务/客服不可
    const admin = require('./adminRoles').resolveAdminKey(token);
    return !!(admin && ['SUPER_ADMIN', 'ADMIN', 'OPERATOR_ADMIN', 'CONTENT_ADMIN'].includes(admin.role));
}

// 记录分享
function logShare(channel, userId, inviteCode) {
    const stats = getStats();
    const record = {
        channel,
        userId: userId || 'anonymous',
        inviteCode: inviteCode || '',
        timestamp: new Date().toISOString()
    };
    stats.shares.push(record);
    // 只保留最近10000条
    if (stats.shares.length > 10000) {
        stats.shares = stats.shares.slice(-10000);
    }
    // 更新汇总
    stats.summary.totalShares = (stats.summary.totalShares || 0) + 1;
    if (!stats.summary.byChannel) stats.summary.byChannel = {};
    if (!stats.summary.byChannel[channel]) stats.summary.byChannel[channel] = 0;
    stats.summary.byChannel[channel]++;
    if (!stats.summary.byUser) stats.summary.byUser = {};
    if (!stats.summary.byUser[record.userId]) stats.summary.byUser[record.userId] = 0;
    stats.summary.byUser[record.userId]++;
    saveStats(stats);
}

// ==================== 管理员接口 ====================

// GET /api/admin/share/config - 获取分享配置
router.get('/share/config', (req, res) => {
    if (!verifyAdmin(req)) {
        return res.json({ success: false, error: '未授权访问' });
    }
    const config = getConfig();
    res.json({ success: true, config });
});

// PUT /api/admin/share/config - 更新分享配置
router.put('/share/config', (req, res) => {
    if (!verifyAdmin(req)) {
        return res.json({ success: false, error: '未授权访问' });
    }
    try {
        const newConfig = req.body;
        // 基本验证
        if (!newConfig.channels || typeof newConfig.channels !== 'object') {
            return res.json({ success: false, error: '渠道配置格式不正确' });
        }
        if (!newConfig.texts || !newConfig.texts.default) {
            return res.json({ success: false, error: '分享文案不能为空' });
        }
        saveConfig(newConfig);
        console.log('[ShareConfig] 分享配置已更新');
        res.json({ success: true, message: '分享配置更新成功', config: newConfig });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// GET /api/admin/share/stats - 获取分享统计数据
router.get('/share/stats', (req, res) => {
    if (!verifyAdmin(req)) {
        return res.json({ success: false, error: '未授权访问' });
    }
    const stats = getStats();
    
    // 计算转化率
    const totalShares = stats.summary.totalShares || 0;
    const totalScans = stats.summary.totalScans || 0;
    const totalDownloads = stats.summary.totalDownloads || 0;
    const totalRegistrations = stats.summary.totalRegistrations || 0;
    
    // 按日期汇总
    const dailyStats = {};
    stats.shares.forEach(s => {
        const date = s.timestamp.split('T')[0];
        if (!dailyStats[date]) dailyStats[date] = { shares: 0 };
        dailyStats[date].shares++;
    });
    stats.scans.forEach(s => {
        const date = s.timestamp.split('T')[0];
        if (!dailyStats[date]) dailyStats[date] = {};
        dailyStats[date].scans = (dailyStats[date].scans || 0) + 1;
    });
    stats.downloads.forEach(d => {
        const date = d.timestamp.split('T')[0];
        if (!dailyStats[date]) dailyStats[date] = {};
        dailyStats[date].downloads = (dailyStats[date].downloads || 0) + 1;
    });
    stats.registrations.forEach(r => {
        const date = r.timestamp.split('T')[0];
        if (!dailyStats[date]) dailyStats[date] = {};
        dailyStats[date].registrations = (dailyStats[date].registrations || 0) + 1;
    });
    
    res.json({
        success: true,
        summary: {
            totalShares,
            totalScans,
            totalDownloads,
            totalRegistrations,
            shareToScanRate: totalShares > 0 ? (totalScans / totalShares * 100).toFixed(2) + '%' : '0%',
            scanToDownloadRate: totalScans > 0 ? (totalDownloads / totalScans * 100).toFixed(2) + '%' : '0%',
            downloadToRegisterRate: totalDownloads > 0 ? (totalRegistrations / totalDownloads * 100).toFixed(2) + '%' : '0%',
            overallConversionRate: totalShares > 0 ? (totalRegistrations / totalShares * 100).toFixed(2) + '%' : '0%'
        },
        byChannel: stats.summary.byChannel || {},
        daily: dailyStats,
        recentShares: stats.shares.slice(-100)
    });
});

// GET /api/admin/share/leaderboard - 获取用户分享排行榜
router.get('/share/leaderboard', (req, res) => {
    if (!verifyAdmin(req)) {
        return res.json({ success: false, error: '未授权访问' });
    }
    const stats = getStats();
    const userStats = stats.summary.byUser || {};
    
    // 转为数组并排序
    const leaderboard = Object.entries(userStats)
        .map(([userId, count]) => ({ userId, shareCount: count }))
        .sort((a, b) => b.shareCount - a.shareCount)
        .slice(0, 100); // Top 100
    
    // 渠道效果排行
    const channelStats = stats.summary.byChannel || {};
    const channelRanking = Object.entries(channelStats)
        .map(([channel, count]) => ({ channel, shareCount: count }))
        .sort((a, b) => b.shareCount - a.shareCount);
    
    res.json({
        success: true,
        userLeaderboard: leaderboard,
        channelRanking: channelRanking
    });
});

// ==================== 公开接口（前端调用） ====================

// GET /api/share/config/public - 前端获取公开分享配置
router.get('/share/config/public', (req, res) => {
    const config = getConfig();
    // 只返回启用的渠道，按排序
    const enabledChannels = Object.entries(config.channels)
        .filter(([key, val]) => val.enabled)
        .sort((a, b) => a[1].sort - b[1].sort)
        .map(([key, val]) => ({ channel: key, label: val.label, sort: val.sort }));
    
    res.json({
        success: true,
        channels: enabledChannels,
        defaultText: config.texts.default,
        alternativeText: config.texts.alternative,
        complianceText: config.complianceText,
        downloadUrl: config.urls.android,
        registerUrl: config.urls.register,
        iosStatus: config.iosStatus,
        posterSizes: config.posterSizes
    });
});

// POST /api/share/log - 记录分享行为
router.post('/share/log', (req, res) => {
    try {
        const { channel, userId, inviteCode } = req.body;
        if (!channel) {
            return res.json({ success: false, error: '缺少渠道参数' });
        }
        logShare(channel, userId, inviteCode);
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// POST /api/share/scan - 记录扫码行为
router.post('/share/scan', (req, res) => {
    try {
        const { inviteCode, source } = req.body;
        const stats = getStats();
        stats.scans.push({
            inviteCode: inviteCode || '',
            source: source || 'poster',
            timestamp: new Date().toISOString()
        });
        if (stats.scans.length > 10000) {
            stats.scans = stats.scans.slice(-10000);
        }
        stats.summary.totalScans = (stats.summary.totalScans || 0) + 1;
        saveStats(stats);
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// POST /api/share/download - 记录下载行为
router.post('/share/download', (req, res) => {
    try {
        const { inviteCode, platform } = req.body;
        const stats = getStats();
        stats.downloads.push({
            inviteCode: inviteCode || '',
            platform: platform || 'android',
            timestamp: new Date().toISOString()
        });
        if (stats.downloads.length > 10000) {
            stats.downloads = stats.downloads.slice(-10000);
        }
        stats.summary.totalDownloads = (stats.summary.totalDownloads || 0) + 1;
        saveStats(stats);
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// POST /api/share/register - 记录注册行为（用于转化追踪）
router.post('/share/register', (req, res) => {
    try {
        const { inviteCode, userId } = req.body;
        const stats = getStats();
        stats.registrations.push({
            inviteCode: inviteCode || '',
            userId: userId || '',
            timestamp: new Date().toISOString()
        });
        if (stats.registrations.length > 10000) {
            stats.registrations = stats.registrations.slice(-10000);
        }
        stats.summary.totalRegistrations = (stats.summary.totalRegistrations || 0) + 1;
        saveStats(stats);
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

module.exports = router;
