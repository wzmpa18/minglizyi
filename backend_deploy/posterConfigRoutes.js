/**
 * 海报配置管理路由 - v20.5
 * 
 * 功能：
 *   1. 海报文案配置（主标题、副标题、卖点、福利、行动指令、合规声明）
 *   2. 下载链接配置（安卓APK地址、iOS状态）
 *   3. 品牌信息配置
 *   4. 海报生成/保存统计数据
 *   5. 前端公开配置获取接口
 * 
 * 所有文案后台可视化可调，修改实时生效
 * 
 * API：
 *   GET  /api/admin/poster/config         - 获取完整海报配置
 *   PUT  /api/admin/poster/config         - 更新海报配置
 *   GET  /api/poster/config/public        - 前端获取公开配置
 *   POST /api/poster/log                  - 记录海报生成/保存
 *   GET  /api/admin/poster/stats          - 获取海报统计数据
 */
'use strict';

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const ADMIN_KEY = process.env.ADMIN_API_KEY || 'WUzhimin123';
const CONFIG_FILE = path.join(__dirname, 'data', 'poster_config.json');
const STATS_FILE = path.join(__dirname, 'data', 'poster_stats.json');

// 默认海报配置（v20.5：已移除所有AI福利表述）
const DEFAULT_CONFIG = {
    // 主标题（二选一，后台可配置）
    titles: [
        "国学随身查，典籍全收录",
        "排盘・问诊・学习，一个 APP 全搞定"
    ],
    // 当前选中的标题索引
    currentTitleIndex: 0,
    // 副标题
    subtitle: "14 款专业排盘工具・中医典籍知识库・同好交流学习社区",
    // 核心卖点（3个，零成本权益，与实际免费范围一致）
    features: [
        { icon: "chart", title: "专业排盘", desc: "八字、紫微、奇门等 14 款工具，基础排盘永久免费" },
        { icon: "book", title: "典籍学习", desc: "中医经典、易学古籍、方剂经络，免费查阅初级库" },
        { icon: "community", title: "同道交流", desc: "同好社区互动，师父一对一咨询通道" }
    ],
    // 新人福利钩子（零成本，不触碰付费权益）
    benefits: "新人专享：免费解锁全部基础排盘 + 5 部易学典籍电子版",
    // 行动指令
    callToAction: "长按识别二维码，立即下载安卓版",
    // iOS 提示
    iosText: "iOS 版本・敬请期待",
    // 官方标识
    officialBadge: "官方正版・安全下载",
    // 底部合规声明
    complianceText: "内容仅供传统文化学习参考，不构成任何决策建议。",
    // 品牌主体
    brandEntity: "东莞言道科技有限公司",
    // 下载链接
    downloadUrls: {
        android: "https://www.yandao.vip/app-download/guoxue-chuancheng-v1.0-release.apk",
        downloadPage: "https://www.yandao.vip/download"
    },
    // iOS 发布状态（pending | available）
    iosStatus: "pending",
    // 版本信息
    version: "v1.1.0",
    versionCode: 201,
    updatedAt: new Date().toISOString()
};

// 确保配置文件存在
function ensureConfig() {
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
        fs.writeFileSync(STATS_FILE, JSON.stringify({ records: [], summary: {} }, null, 2), 'utf-8');
    }
}

// 读取配置
function getConfig() {
    ensureConfig();
    try {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    } catch (e) {
        console.error('[PosterConfig] 读取失败，使用默认配置:', e.message);
        return DEFAULT_CONFIG;
    }
}

// 保存配置
function saveConfig(config) {
    ensureConfig();
    config.updatedAt = new Date().toISOString();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

// 读取统计
function getStats() {
    ensureConfig();
    try {
        return JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));
    } catch {
        return { records: [], summary: {} };
    }
}

// 保存统计
function saveStats(stats) {
    ensureConfig();
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf-8');
}

// 验证管理员
function verifyAdmin(req) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return false;
    return authHeader.replace('Bearer ', '') === ADMIN_KEY;
}

// 记录海报事件
function logPosterEvent(type, userId, size) {
    const stats = getStats();
    const record = {
        type,           // generate | save
        userId: userId || 'anonymous',
        size: size || 'vertical',
        timestamp: new Date().toISOString()
    };
    stats.records.push(record);
    // 只保留最近10000条
    if (stats.records.length > 10000) {
        stats.records = stats.records.slice(-10000);
    }
    // 更新汇总
    if (!stats.summary[type]) stats.summary[type] = 0;
    stats.summary[type]++;
    if (!stats.summary.bySize) stats.summary.bySize = {};
    if (!stats.summary.bySize[size]) stats.summary.bySize[size] = 0;
    stats.summary.bySize[size]++;
    saveStats(stats);
}

// ==================== 管理员接口 ====================

// GET /api/admin/poster/config - 获取海报配置
router.get('/poster/config', (req, res) => {
    if (!verifyAdmin(req)) {
        return res.json({ success: false, error: '未授权访问' });
    }
    const config = getConfig();
    res.json({ success: true, config });
});

// PUT /api/admin/poster/config - 更新海报配置
router.put('/poster/config', (req, res) => {
    if (!verifyAdmin(req)) {
        return res.json({ success: false, error: '未授权访问' });
    }
    try {
        const newConfig = req.body;
        // 基本验证
        if (!newConfig.titles || !Array.isArray(newConfig.titles) || newConfig.titles.length === 0) {
            return res.json({ success: false, error: '主标题不能为空' });
        }
        if (!newConfig.features || !Array.isArray(newConfig.features)) {
            return res.json({ success: false, error: '卖点列表格式不正确' });
        }
        saveConfig(newConfig);
        console.log('[PosterConfig] 海报配置已更新');
        res.json({ success: true, message: '海报配置更新成功', config: newConfig });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// GET /api/admin/poster/stats - 获取海报统计数据
router.get('/poster/stats', (req, res) => {
    if (!verifyAdmin(req)) {
        return res.json({ success: false, error: '未授权访问' });
    }
    const stats = getStats();
    // 按日期汇总
    const dailyStats = {};
    stats.records.forEach(r => {
        const date = r.timestamp.split('T')[0];
        if (!dailyStats[date]) dailyStats[date] = { generate: 0, save: 0 };
        if (dailyStats[date][r.type] !== undefined) {
            dailyStats[date][r.type]++;
        }
    });
    res.json({
        success: true,
        total: stats.summary,
        daily: dailyStats,
        recentRecords: stats.records.slice(-100)
    });
});

// ==================== 公开接口（前端调用） ====================

// GET /api/poster/config/public - 前端获取公开海报配置
router.get('/poster/config/public', (req, res) => {
    const config = getConfig();
    // 只返回前端需要的部分，不暴露管理员字段
    res.json({
        success: true,
        title: config.titles[config.currentTitleIndex || 0],
        subtitle: config.subtitle,
        features: config.features,
        benefits: config.benefits,
        callToAction: config.callToAction,
        iosText: config.iosText,
        officialBadge: config.officialBadge,
        complianceText: config.complianceText,
        brandEntity: config.brandEntity,
        downloadUrl: config.downloadUrls.android,
        iosStatus: config.iosStatus,
        version: config.version
    });
});

// POST /api/poster/log - 记录海报事件（生成/保存）
router.post('/poster/log', (req, res) => {
    try {
        const { type, userId, size } = req.body;
        if (!type || (type !== 'generate' && type !== 'save')) {
            return res.json({ success: false, error: '无效的事件类型' });
        }
        logPosterEvent(type, userId, size);
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

module.exports = router;
