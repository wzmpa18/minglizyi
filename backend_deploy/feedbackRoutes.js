/**
 * 用户反馈路由 - v20.4
 * POST /api/feedback/submit - 提交反馈
 * GET  /api/feedback/list   - 获取反馈列表
 */
'use strict';

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const FEEDBACK_DIR = path.join(__dirname, 'data', 'feedback');
const FEEDBACK_FILE = path.join(FEEDBACK_DIR, 'feedbacks.json');

// 确保目录和文件存在
function ensureStorage() {
    if (!fs.existsSync(FEEDBACK_DIR)) {
        fs.mkdirSync(FEEDBACK_DIR, { recursive: true });
    }
    if (!fs.existsSync(FEEDBACK_FILE)) {
        fs.writeFileSync(FEEDBACK_FILE, JSON.stringify([]), 'utf-8');
    }
}

// POST /api/feedback/submit
router.post('/submit', (req, res) => {
    try {
        ensureStorage();
        const { userId, userName, type, title, description, contact, deviceInfo, appVersion } = req.body;

        if (!type || !title || !description) {
            return res.json({ success: false, error: '缺少必填字段' });
        }

        const feedbacks = JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf-8'));
        const feedback = {
            id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            userId: userId || '',
            userName: userName || '',
            type: type,
            title: title,
            description: description,
            contact: contact || '',
            deviceInfo: deviceInfo || '',
            appVersion: appVersion || '',
            status: 'pending',
            createdAt: new Date().toISOString(),
        };

        feedbacks.push(feedback);
        fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(feedbacks, null, 2), 'utf-8');

        console.log(`[Feedback] 新反馈: ${feedback.id} type=${type} title=${title}`);
        res.json({ success: true, message: '反馈提交成功', feedbackId: feedback.id });
    } catch (error) {
        console.error('[Feedback] submit error:', error);
        res.json({ success: false, error: `提交失败: ${error.message}` });
    }
});

// GET /api/feedback/list
router.get('/list', (req, res) => {
    try {
        ensureStorage();
        const { userId } = req.query;
        let feedbacks = JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf-8'));
        if (userId) {
            feedbacks = feedbacks.filter(f => f.userId === userId);
        }
        feedbacks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json({ success: true, feedbacks });
    } catch (error) {
        console.error('[Feedback] list error:', error);
        res.json({ success: false, error: `获取失败: ${error.message}` });
    }
});

module.exports = router;
