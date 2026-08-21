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

const ADMIN_KEY = process.env.ADMIN_API_KEY || 'WUzhimin123';
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
        id: 'n001',
        title: '国家中医药管理局发布2026年中医药振兴发展重大工程实施方案',
        summary: '方案明确提出加强中医药传承创新、推进中医药文化弘扬传播、提升中医药服务能力等重点任务，为中医药高质量发展提供政策指引。',
        source: '国家中医药管理局',
        sourceUrl: 'https://www.satcm.gov.cn',
        publishedAt: '2026-08-06T09:00:00Z',
        category: 'zhongyi',
    },
    {
        id: 'n002',
        title: '中华中医药学会2026年学术年会在京召开',
        summary: '年会以"传承精华、守正创新"为主题，围绕经方临床应用、中医药现代化研究等议题展开深入研讨，千余名中医药专家参会。',
        source: '中华中医药学会',
        sourceUrl: 'https://www.cacm.org.cn',
        publishedAt: '2026-08-05T14:00:00Z',
        category: 'zhongyi',
    },
    {
        id: 'n003',
        title: '中国中医科学院发布中医药防治慢性病最新研究成果',
        summary: '研究团队基于传统经方与现代药理学结合，在心血管疾病、糖尿病等慢性病中医药防治领域取得重要进展，相关论文已发表。',
        source: '中国中医科学院',
        sourceUrl: 'https://www.catcm.ac.cn',
        publishedAt: '2026-08-04T08:30:00Z',
        category: 'zhongyi',
    },
    {
        id: 'n004',
        title: '中国社会科学院国学研究中心举办易学文化研讨会',
        summary: '研讨会围绕《周易》哲学思想与现代社会的关联、易学文化的传承与创新等主题展开学术交流，多位知名学者发表演讲。',
        source: '中国社会科学院',
        sourceUrl: 'https://www.cass.cn',
        publishedAt: '2026-08-05T10:00:00Z',
        category: 'yixue',
    },
    {
        id: 'n005',
        title: '世界中医药学会联合会推动中医药国际标准化建设',
        summary: '世界中联持续推动中医药术语、学术交流技术、教育标准等国际标准化工作，目前已有多项国际标准获ISO立项或发布。',
        source: '世界中医药学会联合会',
        sourceUrl: 'https://www.wfcms.org',
        publishedAt: '2026-08-03T16:00:00Z',
        category: 'zhongyi',
    },
    {
        id: 'n006',
        title: '北京大学国学研究院发布传统文化教育年度报告',
        summary: '报告系统梳理了过去一年全国高校国学教育开展情况，建议加强经典研读、推动传统文化课程体系建设。',
        source: '北京大学国学研究院',
        sourceUrl: 'https://guoxue.pku.edu.cn',
        publishedAt: '2026-08-03T09:30:00Z',
        category: 'yixue',
    },
    {
        id: 'n007',
        title: '中国中医药报：基层中医药服务能力提升工程取得显著成效',
        summary: '全国基层中医药服务能力提升工程实施以来，社区卫生服务中心、乡镇卫生院中医馆覆盖率显著提高，群众中医药服务可及性大幅增强。',
        source: '中国中医药报',
        sourceUrl: 'https://www.cntcm.com.cn',
        publishedAt: '2026-08-02T11:00:00Z',
        category: 'zhongyi',
    },
    {
        id: 'n008',
        title: '国学网：全国易学文化普及讲座惠及百万群众',
        summary: '由文化部门指导的易学文化普及系列讲座在全国各地开展，以通俗易懂的方式讲解《周易》基础知识和传统文化内涵。',
        source: '国学网',
        sourceUrl: 'https://www.guoxue.com',
        publishedAt: '2026-08-02T08:00:00Z',
        category: 'yixue',
    },
    {
        id: 'n009',
        title: '《黄帝内经》养生智慧与现代健康管理学术论坛举行',
        summary: '论坛聚焦《黄帝内经》"治未病"理念的现代化应用，探讨传统中医养生理论与现代预防医学的融合路径。',
        source: '中华中医药学会',
        sourceUrl: 'https://www.cacm.org.cn',
        publishedAt: '2026-08-01T14:30:00Z',
        category: 'zhongyi',
    },
    {
        id: 'n010',
        title: '中华传统文化论坛探讨易学在现代管理中的应用',
        summary: '论坛邀请管理学与易学交叉领域专家，探讨《周易》智慧在现代企业管理、决策科学中的应用价值与实践案例。',
        source: '北京大学国学研究院',
        sourceUrl: 'https://guoxue.pku.edu.cn',
        publishedAt: '2026-08-01T10:00:00Z',
        category: 'yixue',
    },
    {
        id: 'n011',
        title: '国家中医药管理局推进中医药文化进校园活动',
        summary: '活动旨在青少年群体中普及中医药文化知识，增强文化自信，目前已在多省市试点开展中医药文化课程。',
        source: '国家中医药管理局',
        sourceUrl: 'https://www.satcm.gov.cn',
        publishedAt: '2026-07-31T15:00:00Z',
        category: 'zhongyi',
    },
    {
        id: 'n012',
        title: '传统文化遗产保护：古籍数字化工程取得阶段性成果',
        summary: '国家图书馆古籍数字化项目已完成数千部珍贵古籍的高清扫描和文字识别，公众可通过数字平台免费阅读研究。',
        source: '中国社会科学院',
        sourceUrl: 'https://www.cass.cn',
        publishedAt: '2026-07-31T09:00:00Z',
        category: 'yixue',
    },
    {
        id: 'n013',
        title: '中药材质量标准体系建设取得新进展',
        summary: '新版《中国药典》进一步规范中药材质量标准，加强道地药材保护，推进中药材种植、采收、加工全链条标准化。',
        source: '中国中医科学院',
        sourceUrl: 'https://www.catcm.ac.cn',
        publishedAt: '2026-07-30T13:00:00Z',
        category: 'zhongyi',
    },
    {
        id: 'n014',
        title: '青少年经典诵读活动覆盖全国三百个城市',
        summary: '由文化部指导的青少年经典诵读工程持续推广，《论语》《道德经》《周易》等经典成为诵读重点，参与人数创新高。',
        source: '国学网',
        sourceUrl: 'https://www.guoxue.com',
        publishedAt: '2026-07-30T08:30:00Z',
        category: 'yixue',
    },
    {
        id: 'n015',
        title: '中国中医药报：针灸国际化发展进入新阶段',
        summary: '针灸已在多个国家获得合法地位，世界卫生组织持续更新针灸国际标准，中医药"走出去"战略取得实质性进展。',
        source: '中国中医药报',
        sourceUrl: 'https://www.cntcm.com.cn',
        publishedAt: '2026-07-29T14:00:00Z',
        category: 'zhongyi',
    },
    {
        id: 'n016',
        title: '世界中医药学会联合会发布中医药教育国际标准',
        summary: '标准对中医药国际教育的课程设置、师资要求、考核标准等作出规范，为全球中医药教育机构提供统一参考。',
        source: '世界中医药学会联合会',
        sourceUrl: 'https://www.wfcms.org',
        publishedAt: '2026-07-28T10:00:00Z',
        category: 'zhongyi',
    },
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
    return authHeader.replace('Bearer ', '') === ADMIN_KEY;
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
