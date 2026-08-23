/**
 * 混元AI内容导入路由 - v20.4
 * POST /api/admin/content-import - 管理员调用混元AI生成内容
 */
'use strict';

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const ADMIN_KEY = process.env.ADMIN_API_KEY || '';
const HUNYUAN_API_KEY = process.env.HUNYUAN_API_KEY || '';
const HUNYUAN_API_URL = process.env.HUNYUAN_API_URL || 'https://tokenhub.tencentmaas.com/v1/chat/completions';
const HUNYUAN_MODEL = process.env.HUNYUAN_MODEL || 'hy3';

const DATA_ROOT = path.join(__dirname, '..', 'yandaoguoxue', 'data', 'imported');

// 验证管理员权限
function verifyAdmin(req) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return false;
    const token = authHeader.replace('Bearer ', '');
    if (ADMIN_KEY && token === ADMIN_KEY) return true;
    // v25.0.47_13: 统一角色体系——运营/内容子密钥亦可管理（scope=ops）；财务/客服不可
    const admin = require('./adminRoles').resolveAdminKey(token);
    return !!(admin && ['SUPER_ADMIN', 'ADMIN', 'OPERATOR_ADMIN', 'CONTENT_ADMIN'].includes(admin.role));
}

// 调用混元AI
async function callHunyuan(messages, temperature = 0.7, maxTokens = 4096) {
    if (!HUNYUAN_API_KEY) {
        throw new Error('混元AI密钥未配置');
    }
    const body = {
        model: HUNYUAN_MODEL,
        messages: messages,
        temperature: temperature,
        max_tokens: maxTokens,
        stream: false,
    };
    const response = await fetch(HUNYUAN_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${HUNYUAN_API_KEY}`,
        },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`混元API错误: HTTP ${response.status} ${errText.slice(0, 200)}`);
    }
    const data = await response.json();
    if (!data.choices || data.choices.length === 0) {
        throw new Error('混元AI返回空结果');
    }
    return data.choices[0].message?.content || '';
}

// 从AI返回文本中提取JSON
function extractJSON(text) {
    try { JSON.parse(text); return text; } catch {}
    const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) { try { JSON.parse(codeBlock[1]); return codeBlock[1]; } catch {} }
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) { try { JSON.parse(objMatch[0]); return objMatch[0]; } catch {} }
    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (arrMatch) { try { JSON.parse(arrMatch[0]); return arrMatch[0]; } catch {} }
    return null;
}

// POST /api/admin/content-import
router.post('/content-import', async (req, res) => {
    if (!verifyAdmin(req)) {
        return res.json({ success: false, error: '未授权访问' });
    }
    if (!HUNYUAN_API_KEY) {
        return res.json({ success: false, error: '混元AI密钥未配置，请在.env中设置HUNYUAN_API_KEY' });
    }

    const { type, params } = req.body;
    if (!type) {
        return res.json({ success: false, error: '缺少type参数' });
    }

    try {
        let prompt = '';
        let userMsg = '';
        let saveDir = '';

        if (type === 'tcm_classic') {
            prompt = `你是一位中医文献研究专家。请严格按照以下JSON格式生成一部中医典籍的内容，要求原文准确、注解专业。
请生成以下JSON结构（不要包含其他文字，直接输出JSON）：
{"id":"拼音简写id","title":"书名","author":"作者","dynasty":"朝代","category":"经典|方剂|药学|诊断","summary":"200字以内简介","isFreeContent":true,"chapters":[{"title":"章节标题","content":"典籍原文","annotation":"白话注解"}]}
要求：1.原文必须选自公共领域古籍 2.每部典籍包含2-3个章节 3.所有文字使用简体中文 4.内容仅供传统文化学习研究，不构成诊疗指导`;
            userMsg = params?.name ? `请生成《${params.name}》的典籍内容。` : '请从中医典籍中选择一部生成内容。';
            saveDir = path.join(DATA_ROOT, 'tcm_classics');
        } else if (type === 'yixue_exam') {
            prompt = `你是一位易学教育专家。请严格按照以下JSON格式生成10道易学考试题目。
请生成以下JSON数组（不要包含其他文字）：
[{"id":"yx_x001","category":"yixue","difficulty":"basic|intermediate|advanced","question":"题目","options":["A","B","C","D"],"correctAnswer":0,"explanation":"解析","source":"出处"}]
要求：1.每题4个选项，correctAnswer为正确选项索引(0-3) 2.所有文字使用简体中文 3.内容仅供传统文化学习研究`;
            userMsg = `请生成10道${params?.difficulty || 'intermediate'}难度的易学考试题目。`;
            saveDir = path.join(DATA_ROOT, 'yixue_exams');
        } else if (type === 'zhongyi_exam') {
            prompt = `你是一位中医教育专家。请严格按照以下JSON格式生成10道中医考试题目。
请生成以下JSON数组（不要包含其他文字）：
[{"id":"zy_x001","category":"zhongyi","difficulty":"basic|intermediate|advanced","question":"题目","options":["A","B","C","D"],"correctAnswer":0,"explanation":"解析","source":"出处"}]
要求：1.每题4个选项，correctAnswer为正确选项索引(0-3) 2.所有文字使用简体中文 3.内容仅供传统文化学习研究，不涉及诊疗指导`;
            userMsg = `请生成10道${params?.difficulty || 'intermediate'}难度的中医考试题目。`;
            saveDir = path.join(DATA_ROOT, 'zhongyi_exams');
        } else {
            return res.json({ success: false, error: `未知类型: ${type}` });
        }

        console.log(`[ContentImport] 开始生成 type=${type}`);
        const content = await callHunyuan(
            [{ role: 'system', content: prompt }, { role: 'user', content: userMsg }],
            0.6, 4096
        );

        const jsonStr = extractJSON(content);
        if (!jsonStr) {
            return res.json({ success: false, error: 'AI返回内容无法解析为JSON' });
        }
        const data = JSON.parse(jsonStr);

        // 保存到服务器
        if (!fs.existsSync(saveDir)) {
            fs.mkdirSync(saveDir, { recursive: true });
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${type}_${timestamp}.json`;
        const filePath = path.join(saveDir, fileName);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

        console.log(`[ContentImport] 保存成功: ${filePath}`);
        res.json({
            success: true,
            message: '内容生成并保存成功',
            file: fileName,
            data: Array.isArray(data) ? { count: data.length } : { title: data.title },
        });
    } catch (error) {
        console.error('[ContentImport] error:', error);
        res.json({ success: false, error: error.message });
    }
});

// GET /api/admin/content-import/status
router.get('/content-import/status', (req, res) => {
    if (!verifyAdmin(req)) {
        return res.json({ success: false, error: '未授权访问' });
    }
    res.json({
        success: true,
        configured: !!HUNYUAN_API_KEY,
        model: HUNYUAN_MODEL,
        hasApiKey: !!HUNYUAN_API_KEY,
    });
});

module.exports = router;
