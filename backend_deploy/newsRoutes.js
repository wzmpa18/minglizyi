/**
 * 行业资讯管理路由 - v25.0.47（FINAL-CLEAN-RC-01）
 *
 * 功能：
 *   1. 发现页「行业资讯」内容源后台维护（增删改查 + 恢复默认）
 *   2. 前端公开读取接口（分页 + 分类过滤，按发布时间倒序）
 *   3. 保存时合规门禁：拦截营销/绝对化用语，禁止违规内容入库
 *   4. 所有条目必须标注来源（合规红线：转载仅标题+摘要+来源+原文链接）
 *
 * API：
 *   GET    /api/news/public?page=1&pageSize=20&category=all   - 前端公开获取资讯
 *   GET    /api/admin/news                                     - 管理员获取全部资讯
 *   POST   /api/admin/news                                     - 新增资讯（合规校验）
 *   PUT    /api/admin/news/:id                                 - 更新资讯（合规校验）
 *   DELETE /api/admin/news/:id                                 - 删除资讯
 *   POST   /api/admin/news/reset                               - 恢复默认资讯库
 *
 * 存储：backend_deploy/data/news_items.json（JSON 文件，与海报配置同一模式）
 */
'use strict';

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const ADMIN_KEY = process.env.ADMIN_API_KEY || '';
const DATA_FILE = path.join(__dirname, 'data', 'news_items.json');

// ==================== 合规门禁词表 ====================
// 项目硬约束：营销海报/文案不得出现绝对化用语与诱导分享词（同口径适用于资讯源）
const COMPLIANCE_BLOCKED_TERMS = [
    // 绝对化用语
    '全网第一', '全国第一', '全球第一', '第一品牌', '顶级', '极品',
    '100%准确', '百分百准确', '包治', '根治', '治愈率100%', '药到病除',
    // 诱导分享/营销词
    '分享赚钱', '转发赚钱', '邀请返利', '躺赚', '日入过万', '稳赚不赔', '零风险',
    '加微信', '加V', '扫码加', '限时抢购', '秒杀', '优惠券', '下单购买',
    '代购', '带货', '招商加盟', '砍价', '推广链接',
];

// ==================== 默认资讯库（与前端 NEWS_DATA 同源基准，去除广告测试项） ====================
const DEFAULT_NEWS = [
    {
        "id": "n20261030-zhongyi",
        "title": "国家中医药管理局、国家卫生健康委联合印发《关于推进基层中医适宜技术推广应用的通知》",
        "summary": "通知提出健全基层中医适宜技术推广网络、加强培训和质量管理，推动适宜技术在基层医疗卫生机构规范应用。",
        "source": "淄博市卫生健康委员会",
        "sourceUrl": "https://ws.zibo.gov.cn/art/2026/10/30/art_812_3028917.html",
        "publishedAt": "2026-10-30T00:00:00+08:00",
        "category": "zhongyi"
    },
    {
        "id": "n20261026-yixue",
        "title": "2026年度山东省古籍保护工作会议在济南召开",
        "summary": "会议总结山东古籍保护工作，并讨论馆藏协作、典籍研究阐释与传播推广。",
        "source": "中国古籍保护网",
        "sourceUrl": "https://www.nlc.cn/pcab/zx/xw/20261026_2654954.shtml",
        "publishedAt": "2026-10-26T00:00:00+08:00",
        "category": "yixue"
    },
    {
        "id": "n20261010-zhongyi",
        "title": "2026世界传统医药大会新闻发布会在京举行",
        "summary": "发布会介绍大会主题、论坛安排，以及人工智能与传统医药相关议题。",
        "source": "北京市中医药管理局",
        "sourceUrl": "https://zyj.beijing.gov.cn/zyyxw/202610/t20261010_4895735.html",
        "publishedAt": "2026-10-10T00:00:00+08:00",
        "category": "zhongyi"
    },
    {
        "id": "n20261003-yixue",
        "title": "北京大学举办第四届中国传统文化体验周系列活动",
        "summary": "北京大学勺园、中关新园举办传统文化体验活动，邀请中外学生参与手作与文化交流。",
        "source": "北京大学新闻网",
        "sourceUrl": "https://news.pku.edu.cn/info/7921/3306471.htm",
        "publishedAt": "2026-10-03T00:00:00+08:00",
        "category": "yixue"
    }
];

// ==================== 存储层 ====================

function ensureData() {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ items: DEFAULT_NEWS, updatedAt: new Date().toISOString() }, null, 2), 'utf-8');
    }
}

function readItems() {
    ensureData();
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        return Array.isArray(data.items) ? data.items : DEFAULT_NEWS.slice();
    } catch (e) {
        console.error('[NewsRoutes] 读取失败，使用默认资讯库:', e.message);
        return DEFAULT_NEWS.slice();
    }
}

function writeItems(items) {
    ensureData();
    fs.writeFileSync(DATA_FILE, JSON.stringify({ items, updatedAt: new Date().toISOString() }, null, 2), 'utf-8');
}

// ==================== 工具函数 ====================

function verifyAdmin(req) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return false;
    const token = authHeader.replace('Bearer ', '');
    if (ADMIN_KEY && token === ADMIN_KEY) return true;
    // v25.0.47_13: 统一角色体系——运营/内容子密钥亦可管理（scope=ops）；财务/客服不可
    const admin = require('./adminRoles').resolveAdminKey(token);
    return !!(admin && ['SUPER_ADMIN', 'ADMIN', 'OPERATOR_ADMIN', 'CONTENT_ADMIN'].includes(admin.role));
}

/** 合规校验：返回违规词数组（空数组=通过） */
function checkCompliance(item) {
    const text = `${item.title || ''} ${item.summary || ''} ${item.source || ''}`;
    const hits = [];
    for (const term of COMPLIANCE_BLOCKED_TERMS) {
        if (text.includes(term)) hits.push(term);
    }
    return hits;
}

/** 字段校验：返回错误消息（null=通过） */
function validateItem(body) {
    if (!body.title || String(body.title).trim().length < 4) return '标题不能少于4个字';
    if (String(body.title).trim().length > 80) return '标题不能超过80个字';
    if (!body.summary || String(body.summary).trim().length < 10) return '摘要不能少于10个字';
    if (String(body.summary).trim().length > 300) return '摘要不能超过300个字';
    if (!body.source || String(body.source).trim().length < 2) return '来源不能为空（合规红线：必须标注来源）';
    if (!body.sourceUrl || !/^https?:\/\/.+/.test(String(body.sourceUrl).trim())) return '原文链接必须以 http(s):// 开头';
    if (body.category !== 'zhongyi' && body.category !== 'yixue') return '分类必须是 zhongyi（中医）或 yixue（易学）';
    const ts = new Date(body.publishedAt || '');
    if (isNaN(ts.getTime())) return '发布时间格式不正确（需 ISO 格式）';
    return null;
}

function normalizeItem(body) {
    return {
        id: body.id,
        title: String(body.title).trim(),
        summary: String(body.summary).trim(),
        source: String(body.source).trim(),
        sourceUrl: String(body.sourceUrl).trim(),
        publishedAt: body.publishedAt,
        category: body.category,
    };
}

function sortByTimeDesc(items) {
    return items.slice().sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

// ==================== 公开接口（前端发现页调用） ====================

// GET /api/news/public?page=1&pageSize=20&category=all|zhongyi|yixue
router.get('/public', (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
        const category = req.query.category || 'all';

        let items = readItems();
        if (category === 'zhongyi' || category === 'yixue') {
            items = items.filter(item => item.category === category);
        }
        items = sortByTimeDesc(items);

        const start = (page - 1) * pageSize;
        const pageItems = items.slice(start, start + pageSize);
        res.json({
            success: true,
            news: pageItems,
            hasMore: start + pageSize < items.length,
            total: items.length,
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// ==================== 管理员接口 ====================

// GET /api/admin/news - 获取全部资讯（含上下架标记）
router.get('/', (req, res) => {
    if (!verifyAdmin(req)) {
        return res.json({ success: false, error: '未授权访问' });
    }
    const items = sortByTimeDesc(readItems());
    res.json({ success: true, data: { items, total: items.length } });
});

// POST /api/admin/news - 新增资讯
router.post('/', (req, res) => {
    if (!verifyAdmin(req)) {
        return res.json({ success: false, error: '未授权访问' });
    }
    try {
        const invalid = validateItem(req.body);
        if (invalid) return res.json({ success: false, error: invalid });

        const item = normalizeItem(req.body);
        item.id = `n${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;

        const hits = checkCompliance(item);
        if (hits.length > 0) {
            return res.json({ success: false, error: `合规校验未通过，包含违规词：${hits.join('、')}` });
        }

        const items = readItems();
        items.push(item);
        writeItems(items);
        console.log(`[NewsRoutes] 新增资讯: ${item.id} ${item.title}`);
        res.json({ success: true, message: '资讯新增成功', data: item });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// PUT /api/admin/news/:id - 更新资讯
router.put('/:id', (req, res) => {
    if (!verifyAdmin(req)) {
        return res.json({ success: false, error: '未授权访问' });
    }
    try {
        const items = readItems();
        const idx = items.findIndex(it => it.id === req.params.id);
        if (idx === -1) {
            return res.json({ success: false, error: '资讯不存在或已被删除' });
        }

        const invalid = validateItem(req.body);
        if (invalid) return res.json({ success: false, error: invalid });

        const item = normalizeItem({ ...req.body, id: items[idx].id });
        const hits = checkCompliance(item);
        if (hits.length > 0) {
            return res.json({ success: false, error: `合规校验未通过，包含违规词：${hits.join('、')}` });
        }

        items[idx] = item;
        writeItems(items);
        console.log(`[NewsRoutes] 更新资讯: ${item.id}`);
        res.json({ success: true, message: '资讯更新成功', data: item });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// DELETE /api/admin/news/:id - 删除资讯
router.delete('/:id', (req, res) => {
    if (!verifyAdmin(req)) {
        return res.json({ success: false, error: '未授权访问' });
    }
    try {
        const items = readItems();
        const idx = items.findIndex(it => it.id === req.params.id);
        if (idx === -1) {
            return res.json({ success: false, error: '资讯不存在或已被删除' });
        }
        const removed = items.splice(idx, 1)[0];
        writeItems(items);
        console.log(`[NewsRoutes] 删除资讯: ${removed.id} ${removed.title}`);
        res.json({ success: true, message: '资讯删除成功' });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// POST /api/admin/news/reset - 恢复默认资讯库
router.post('/reset', (req, res) => {
    if (!verifyAdmin(req)) {
        return res.json({ success: false, error: '未授权访问' });
    }
    writeItems(DEFAULT_NEWS.slice());
    console.log('[NewsRoutes] 已恢复默认资讯库');
    res.json({ success: true, message: '已恢复默认资讯库', data: { total: DEFAULT_NEWS.length } });
});

module.exports = router;
