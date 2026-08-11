/**
 * 积分配置管理路由 - v20.5
 * GET /api/admin/points/config - 获取积分配置
 * PUT /api/admin/points/config - 更新积分配置
 * 
 * 所有积分参数后台可视化可调，运营可自主管控
 */
'use strict';

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const ADMIN_KEY = process.env.ADMIN_API_KEY || 'WUzhimin123';
const CONFIG_FILE = path.join(__dirname, 'data', 'points_config.json');

// 默认积分配置
const DEFAULT_CONFIG = {
    // 积分获取规则
    earnRules: {
        invite_register: { amount: 0.5, enabled: true, desc: "邀请好友注册成功", perPersonLimit: 2 },
        invite_pay: { amount: 0.5, enabled: true, desc: "邀请好友首次付费", perPersonLimit: 2 },
        invite_review: { amount: 0.5, enabled: true, desc: "邀请好友发布有效评价", perPersonLimit: 2 },
        invite_active_7d: { amount: 0.5, enabled: true, desc: "邀请好友连续活跃7天", perPersonLimit: 2 },
        daily_signin: { amount: 0.5, enabled: true, desc: "每日登录打卡", dailyLimit: 1 },
        daily_group_active: { amount: 0.5, enabled: true, desc: "每日3群发言活跃", dailyLimit: 1, minGroups: 3, minMessages: 1 },
        content_featured: { amount: 5, enabled: true, desc: "内容被平台加精" },
        // v20.5: daily_share 已移除，不再作为积分获取渠道
    },
    // 积分扣除规则
    deductRules: {
        deduct_bad_review_2: { amount: 0.5, enabled: true, desc: "师父收到2星差评" },
        deduct_bad_review_1: { amount: 1, enabled: true, desc: "师父收到1星差评" },
        deduct_malicious: { minAmount: 5, maxAmount: 20, enabled: true, desc: "恶意差评/刷分核实" },
        deduct_violation: { minAmount: 5, maxAmount: 20, enabled: true, desc: "违规内容被处理" },
    },
    // 每日积分上限
    dailyEarnCap: { value: 50, enabled: true, desc: "单账号每日积分获取上限" },
    // 邀请规则
    inviteRules: {
        perPersonCap: 2,           // 单人贡献封顶
        inviteCountLimit: 0,       // 0=无上限
        desc: "单人贡献封顶2分，邀请人数无上限",
    },
    // 积分兑换池（禁止兑换AI次数、会员时长、现金余额）
    exchangePool: {
        categories: ["decor", "material", "exam", "privilege", "tool"],
        forbiddenCategories: ["ai_quota", "membership", "cash"],
    },
    // 版本
    version: "v20.5",
    updatedAt: new Date().toISOString(),
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
}

// 读取配置
function getConfig() {
    ensureConfig();
    try {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    } catch (e) {
        console.error('[PointsConfig] 读取失败，使用默认配置:', e.message);
        return DEFAULT_CONFIG;
    }
}

// 保存配置
function saveConfig(config) {
    ensureConfig();
    config.updatedAt = new Date().toISOString();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

// 验证管理员
function verifyAdmin(req) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return false;
    return authHeader.replace('Bearer ', '') === ADMIN_KEY;
}

// GET /api/admin/points/config
router.get('/points/config', (req, res) => {
    if (!verifyAdmin(req)) {
        return res.json({ success: false, error: '未授权访问' });
    }
    const config = getConfig();
    res.json({ success: true, config });
});

// PUT /api/admin/points/config
router.put('/points/config', (req, res) => {
    if (!verifyAdmin(req)) {
        return res.json({ success: false, error: '未授权访问' });
    }
    try {
        const newConfig = req.body;
        // 基本验证
        if (!newConfig.earnRules || !newConfig.deductRules) {
            return res.json({ success: false, error: '配置格式不正确' });
        }
        saveConfig(newConfig);
        console.log('[PointsConfig] 配置已更新');
        res.json({ success: true, message: '积分配置更新成功', config: newConfig });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// GET /api/admin/points/config/public (前端可调用的公开配置)
router.get('/points/config/public', (req, res) => {
    const config = getConfig();
    // 只返回前端需要的部分
    res.json({
        success: true,
        earnRules: config.earnRules,
        dailyEarnCap: config.dailyEarnCap,
        inviteRules: config.inviteRules,
        version: config.version,
    });
});

module.exports = router;
