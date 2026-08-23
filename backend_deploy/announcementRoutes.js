/**
 * 公告栏路由 - v25.0.47_19
 *
 * 功能：
 *   1. 官方公告发布：首页永久公告栏展示（未登录可见——保证长期未登录用户也能收到升级/维护通知）
 *   2. 管理后台增删改查 + 发布/撤回/置顶
 *
 * ⚠️ 永久功能约束（项目方明确要求）：首页公告栏为永久入口，后续任何版本迭代
 *    均不得移除该功能与入口，避免用户长期不登录导致无法获知升级信息。
 *
 * API：
 *   GET    /api/announcements/public   - 前端公开获取生效中公告（置顶优先，发布时间倒序）
 *   GET    /api/announcements          - 管理员获取全部公告
 *   POST   /api/announcements          - 新增公告（运营/超管）
 *   PUT    /api/announcements/:id      - 更新公告
 *   DELETE /api/announcements/:id      - 删除公告
 *
 * 存储：/www/yandaoguoxue-backend/data/announcements.json（JSON 文件，与海报配置同一模式）
 */
'use strict';

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const ADMIN_KEY = process.env.ADMIN_API_KEY || '';
const DATA_FILE = path.join(__dirname, 'data', 'announcements.json');

// ==================== 读写工具 ====================

function readAll() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        }
    } catch (e) {
        console.log('[Announcements] 读取失败，使用空列表:', e.message);
    }
    return [];
}

function writeAll(items) {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), 'utf-8');
}

function newId() {
    return 'a_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ==================== 鉴权 ====================

function verifyAdmin(req) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return false;
    const token = authHeader.replace('Bearer ', '');
    if (ADMIN_KEY && token === ADMIN_KEY) return true;
    // 三级角色体系：超管/管理员/运营可管理公告；财务/客服不可
    try {
        const admin = require('./adminRoles').resolveAdminKey(token);
        return !!(admin && ['SUPER_ADMIN', 'ADMIN', 'OPERATOR_ADMIN', 'CONTENT_ADMIN'].includes(admin.role));
    } catch (e) {
        return false;
    }
}

// ==================== 校验 ====================

const LEVELS = ['info', 'important', 'urgent'];

function validate(body) {
    if (!body.title || String(body.title).trim().length < 2) return '标题不能少于2个字';
    if (String(body.title).trim().length > 60) return '标题不能超过60个字';
    if (!body.content || String(body.content).trim().length < 2) return '内容不能少于2个字';
    if (String(body.content).trim().length > 2000) return '内容不能超过2000个字';
    if (body.level && !LEVELS.includes(body.level)) return `级别必须是 ${LEVELS.join(' / ')} 之一`;
    if (body.publishAt && isNaN(new Date(body.publishAt).getTime())) return '发布时间格式不正确';
    if (body.expiresAt && body.expiresAt !== null && isNaN(new Date(body.expiresAt).getTime())) return '过期时间格式不正确';
    if (body.link && !/^https?:\/\//.test(String(body.link))) return '跳转链接必须以 http(s):// 开头';
    return null;
}

function normalize(body, existing) {
    return {
        id: existing ? existing.id : newId(),
        title: String(body.title).trim(),
        content: String(body.content).trim(),
        level: LEVELS.includes(body.level) ? body.level : 'info',
        pinned: body.pinned === true,
        published: body.published !== false,
        publishAt: body.publishAt || (existing ? existing.publishAt : new Date().toISOString()),
        expiresAt: body.expiresAt === '' || body.expiresAt === undefined ? (existing ? existing.expiresAt : null) : body.expiresAt,
        link: String(body.link || '').trim() || null,
        createdAt: existing ? existing.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}

function isActive(item, now) {
    if (item.published === false) return false;
    if (item.publishAt && new Date(item.publishAt).getTime() > now) return false;
    if (item.expiresAt && new Date(item.expiresAt).getTime() <= now) return false;
    return true;
}

function sortForPublic(items) {
    return items.slice().sort((a, b) => {
        if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
        return new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime();
    });
}

// ==================== 版本占位符注入（v25.0.47_21） ====================
// 公告标题/内容支持 {APP_VERSION} / {WEB_VERSION} 占位符，返回时替换为实时值，
// 确保公告版本与实际运行版本永远一致（单一数据源，杜绝人工改版本号遗漏）
//   APP_VERSION ← data/app-release-config.json 的 latestVersion（APP 发版数据源）
//   WEB_VERSION ← 生产前端 current/version.json 的 version（Web 发版数据源）

function getVersionPlaceholders() {
    let appVersion = '';
    let webVersion = '';
    try {
        const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'app-release-config.json'), 'utf-8'));
        appVersion = cfg.latestVersion || '';
    } catch (e) { /* 配置不存在时置空，占位符原样保留 */ }
    try {
        const v = JSON.parse(fs.readFileSync('/root/yandaoguoxue/current/version.json', 'utf-8'));
        webVersion = v.version || '';
    } catch (e) { /* 路径不可读时置空 */ }
    return { appVersion, webVersion };
}

function applyVersionPlaceholders(text, ph) {
    if (!text) return text;
    let out = String(text);
    if (ph.appVersion) out = out.split('{APP_VERSION}').join(ph.appVersion);
    if (ph.webVersion) out = out.split('{WEB_VERSION}').join(ph.webVersion);
    return out;
}

// ==================== 公开接口（首页公告栏调用，未登录可访问） ====================

// GET /api/announcements/public?limit=5
router.get('/public', (req, res) => {
    try {
        const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 5));
        const now = Date.now();
        const active = sortForPublic(readAll().filter((item) => isActive(item, now))).slice(0, limit);
        const ph = getVersionPlaceholders();
        res.json({
            success: true,
            announcements: active.map((item) => ({
                id: item.id,
                title: applyVersionPlaceholders(item.title, ph),
                content: applyVersionPlaceholders(item.content, ph),
                level: item.level,
                pinned: item.pinned,
                publishAt: item.publishAt,
                link: item.link || null,
            })),
            total: active.length,
        });
    } catch (error) {
        res.json({ success: false, error: error.message, announcements: [], total: 0 });
    }
});

// ==================== 管理接口 ====================

// GET /api/announcements —— 全部公告（含未发布/已过期）
router.get('/', (req, res) => {
    if (!verifyAdmin(req)) return res.status(401).json({ success: false, error: '未授权访问' });
    try {
        const items = readAll().slice().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        res.json({ success: true, data: { announcements: items } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/announcements —— 新增
router.post('/', (req, res) => {
    if (!verifyAdmin(req)) return res.status(401).json({ success: false, error: '未授权访问' });
    const err = validate(req.body || {});
    if (err) return res.status(400).json({ success: false, error: err });
    try {
        const item = normalize(req.body, null);
        const items = readAll();
        items.push(item);
        writeAll(items);
        res.json({ success: true, data: item, message: '公告已发布' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/announcements/:id —— 更新
router.put('/:id', (req, res) => {
    if (!verifyAdmin(req)) return res.status(401).json({ success: false, error: '未授权访问' });
    const err = validate(req.body || {});
    if (err) return res.status(400).json({ success: false, error: err });
    try {
        const items = readAll();
        const idx = items.findIndex((i) => i.id === req.params.id);
        if (idx === -1) return res.status(404).json({ success: false, error: '公告不存在' });
        const updated = normalize(req.body, items[idx]);
        items[idx] = updated;
        writeAll(items);
        res.json({ success: true, data: updated, message: '公告已更新' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/announcements/:id —— 删除
router.delete('/:id', (req, res) => {
    if (!verifyAdmin(req)) return res.status(401).json({ success: false, error: '未授权访问' });
    try {
        const items = readAll();
        const idx = items.findIndex((i) => i.id === req.params.id);
        if (idx === -1) return res.status(404).json({ success: false, error: '公告不存在' });
        const removed = items.splice(idx, 1)[0];
        writeAll(items);
        res.json({ success: true, message: `已删除公告：${removed.title.slice(0, 20)}` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
