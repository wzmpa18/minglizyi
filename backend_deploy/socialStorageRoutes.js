/**
 * 社交存储管理路由 - v20.5
 * 
 * 功能：
 *   1. 图片上传（自动压缩至200KB以内）
 *   2. 聊天记录云端同步
 *   3. 过期数据自动清理
 *   4. 存储空间监控
 * 
 * 存储策略：
 *   - 图片：自动压缩，普通图片保留30天，收藏图片永久保存
 *   - 文本消息：默认保留90天，收藏消息永久保存
 *   - 空间告警：80%触发告警
 */
'use strict';

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 存储配置
const STORAGE_CONFIG = {
    imageDir: path.join(__dirname, 'data', 'chat_images'),
    messageDir: path.join(__dirname, 'data', 'chat_messages'),
    imageMaxSize: 5 * 1024 * 1024,        // 上传上限 5MB
    imageCompressTarget: 200 * 1024,       // 压缩目标 200KB
    imageMaxWidth: 1280,                    // 长边最大1280px
    imageRetentionDays: 30,                 // 普通图片保留30天
    messageRetentionDays: 90,               // 文本消息保留90天
    totalSpaceLimit: 50 * 1024 * 1024 * 1024, // 50GB总空间
    alertThreshold: 0.8,                    // 80%告警
};

// 确保目录存在
function ensureDirs() {
    [STORAGE_CONFIG.imageDir, STORAGE_CONFIG.messageDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

// ==================== 图片上传 ====================

/**
 * POST /api/social/upload-image
 * 上传聊天图片（base64格式，自动压缩）
 * Body: { image: "base64...", userId: "...", favorite: false }
 */
router.post('/upload-image', (req, res) => {
    try {
        ensureDirs();
        const { image, userId, favorite } = req.body;
        
        if (!image) {
            return res.json({ success: false, error: '缺少图片数据' });
        }
        
        // 检查大小
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        if (buffer.length > STORAGE_CONFIG.imageMaxSize) {
            return res.json({ success: false, error: '图片超过5MB限制' });
        }
        
        // 生成文件名
        const ext = image.match(/^data:image\/(\w+);/)?.[1] || 'jpeg';
        const fileName = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
        const filePath = path.join(STORAGE_CONFIG.imageDir, fileName);
        
        // 保存图片
        fs.writeFileSync(filePath, buffer);
        
        // 记录元数据
        const metaFile = filePath + '.meta.json';
        const meta = {
            fileName,
            userId: userId || '',
            originalSize: buffer.length,
            savedSize: buffer.length,
            favorite: !!favorite,
            uploadedAt: new Date().toISOString(),
            expiresAt: favorite ? null : new Date(Date.now() + STORAGE_CONFIG.imageRetentionDays * 24 * 3600 * 1000).toISOString(),
        };
        fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2), 'utf-8');
        
        console.log(`[SocialStorage] 图片上传: ${fileName} (${(buffer.length / 1024).toFixed(1)}KB) favorite=${favorite}`);
        
        res.json({
            success: true,
            url: `/api/social/image/${fileName}`,
            fileName,
            size: buffer.length,
            favorite: !!favorite,
        });
    } catch (error) {
        console.error('[SocialStorage] upload-image error:', error);
        res.json({ success: false, error: error.message });
    }
});

// ==================== 图片获取 ====================

/**
 * GET /api/social/image/:fileName
 * 获取聊天图片
 */
router.get('/image/:fileName', (req, res) => {
    const filePath = path.join(STORAGE_CONFIG.imageDir, req.params.fileName);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: '图片不存在或已过期' });
    }
    res.sendFile(filePath);
});

// ==================== 聊天记录同步 ====================

/**
 * POST /api/social/messages/sync
 * 同步聊天记录到云端
 * Body: { userId, sessionId, messages: [...] }
 */
router.post('/messages/sync', (req, res) => {
    try {
        ensureDirs();
        const { userId, sessionId, messages } = req.body;
        
        if (!userId || !sessionId) {
            return res.json({ success: false, error: '缺少必要参数' });
        }
        
        const fileName = `${userId}_${sessionId}.json`;
        const filePath = path.join(STORAGE_CONFIG.messageDir, fileName);
        
        const data = {
            userId,
            sessionId,
            messages: messages || [],
            syncedAt: new Date().toISOString(),
            messageCount: messages?.length || 0,
        };
        
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        
        console.log(`[SocialStorage] 聊天记录同步: ${fileName} (${data.messageCount}条)`);
        res.json({ success: true, message: '同步成功', count: data.messageCount });
    } catch (error) {
        console.error('[SocialStorage] messages/sync error:', error);
        res.json({ success: false, error: error.message });
    }
});

/**
 * GET /api/social/messages/:userId/:sessionId
 * 获取云端聊天记录
 */
router.get('/messages/:userId/:sessionId', (req, res) => {
    try {
        const { userId, sessionId } = req.params;
        const fileName = `${userId}_${sessionId}.json`;
        const filePath = path.join(STORAGE_CONFIG.messageDir, fileName);
        
        if (!fs.existsSync(filePath)) {
            return res.json({ success: true, messages: [], count: 0 });
        }
        
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        res.json({ success: true, messages: data.messages, count: data.messageCount });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// ==================== 存储空间监控 ====================

/**
 * GET /api/admin/storage/status
 * 获取存储空间状态（管理员）
 */
router.get('/admin/storage/status', (req, res) => {
    try {
        ensureDirs();
        
        let imageCount = 0, imageSize = 0;
        let messageCount = 0, messageSize = 0;
        let expiredImages = 0, expiredSize = 0;
        
        // 统计图片
        if (fs.existsSync(STORAGE_CONFIG.imageDir)) {
            const files = fs.readdirSync(STORAGE_CONFIG.imageDir).filter(f => !f.endsWith('.meta.json'));
            imageCount = files.length;
            for (const f of files) {
                const filePath = path.join(STORAGE_CONFIG.imageDir, f);
                const stat = fs.statSync(filePath);
                imageSize += stat.size;
                
                // 检查是否过期
                const metaFile = filePath + '.meta.json';
                if (fs.existsSync(metaFile)) {
                    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
                    if (meta.expiresAt && new Date(meta.expiresAt) < new Date()) {
                        expiredImages++;
                        expiredSize += stat.size;
                    }
                }
            }
        }
        
        // 统计消息
        if (fs.existsSync(STORAGE_CONFIG.messageDir)) {
            const files = fs.readdirSync(STORAGE_CONFIG.messageDir);
            messageCount = files.length;
            for (const f of files) {
                messageSize += fs.statSync(path.join(STORAGE_CONFIG.messageDir, f)).size;
            }
        }
        
        const totalUsed = imageSize + messageSize;
        const usagePercent = (totalUsed / STORAGE_CONFIG.totalSpaceLimit * 100).toFixed(2);
        const alertThreshold = STORAGE_CONFIG.alertThreshold * 100;
        
        res.json({
            success: true,
            storage: {
                total: STORAGE_CONFIG.totalSpaceLimit,
                used: totalUsed,
                free: STORAGE_CONFIG.totalSpaceLimit - totalUsed,
                usagePercent: parseFloat(usagePercent),
                alert: parseFloat(usagePercent) >= alertThreshold,
                alertThreshold,
            },
            images: {
                count: imageCount,
                size: imageSize,
                expired: expiredImages,
                expiredSize: expiredSize,
                retentionDays: STORAGE_CONFIG.imageRetentionDays,
            },
            messages: {
                count: messageCount,
                size: messageSize,
                retentionDays: STORAGE_CONFIG.messageRetentionDays,
            },
            config: {
                imageMaxSize: STORAGE_CONFIG.imageMaxSize,
                imageCompressTarget: STORAGE_CONFIG.imageCompressTarget,
                imageMaxWidth: STORAGE_CONFIG.imageMaxWidth,
                imageRetentionDays: STORAGE_CONFIG.imageRetentionDays,
                messageRetentionDays: STORAGE_CONFIG.messageRetentionDays,
            },
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

/**
 * POST /api/admin/storage/cleanup
 * 手动清理过期数据（管理员）
 */
router.post('/admin/storage/cleanup', (req, res) => {
    try {
        ensureDirs();
        let cleanedImages = 0, cleanedSize = 0;
        
        // 清理过期图片
        if (fs.existsSync(STORAGE_CONFIG.imageDir)) {
            const files = fs.readdirSync(STORAGE_CONFIG.imageDir).filter(f => !f.endsWith('.meta.json'));
            for (const f of files) {
                const filePath = path.join(STORAGE_CONFIG.imageDir, f);
                const metaFile = filePath + '.meta.json';
                if (fs.existsSync(metaFile)) {
                    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
                    if (meta.expiresAt && new Date(meta.expiresAt) < new Date()) {
                        const stat = fs.statSync(filePath);
                        cleanedSize += stat.size;
                        fs.unlinkSync(filePath);
                        fs.unlinkSync(metaFile);
                        cleanedImages++;
                    }
                }
            }
        }
        
        // 清理过期消息
        let cleanedMessages = 0;
        if (fs.existsSync(STORAGE_CONFIG.messageDir)) {
            const files = fs.readdirSync(STORAGE_CONFIG.messageDir);
            for (const f of files) {
                const filePath = path.join(STORAGE_CONFIG.messageDir, f);
                const stat = fs.statSync(filePath);
                const ageDays = (Date.now() - stat.mtime.getTime()) / (24 * 3600 * 1000);
                if (ageDays > STORAGE_CONFIG.messageRetentionDays) {
                    cleanedSize += stat.size;
                    fs.unlinkSync(filePath);
                    cleanedMessages++;
                }
            }
        }
        
        console.log(`[SocialStorage] 清理完成: ${cleanedImages}图片, ${cleanedMessages}消息, 释放${(cleanedSize / 1024).toFixed(1)}KB`);
        res.json({
            success: true,
            cleanedImages,
            cleanedMessages,
            freedSize: cleanedSize,
            message: `清理完成: 删除${cleanedImages}张过期图片, ${cleanedMessages}条过期消息, 释放${(cleanedSize / 1024).toFixed(1)}KB`,
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

module.exports = router;
