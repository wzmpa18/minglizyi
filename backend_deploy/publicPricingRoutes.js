// ============================================================================
// 公开价格 SSOT 接口 - v25.0.47_10 (FINAL-ADMIN-COMMERCIAL-SEAL-02 第七章/第十四章)
// GET /api/public/pricing：聚合会员套餐/AI单次/AI套餐/额度包/B类工具价格
// 数据来源：admin-membership-config.json + admin-ai-config.json（后台改价即生效，无需发版）
// 前端 pricingStore 消费：用户看到的价格优先来自本接口，本地常量仅作 fallback
// ============================================================================
'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const DATA_DIR = path.join(__dirname, 'data');

// 默认会员套餐（与前端 MEMBERSHIP_PLANS 对齐；admin-membership-config.json 未生成时的兜底）
const DEFAULT_MEMBERSHIP_PLANS = [
  { level: 'basic', name: '普通会员', price: 0, originalPrice: 0, duration: '永久免费', features: ['全部14款排盘工具（基础排盘）', '每日3次通用AI问答', '中医基础内容查询', '模拟考试初级题库', '社区浏览发帖 · 签到积分'], badge: '', highlighted: false },
  { level: 'monthly', name: '月度会员', price: 39, originalPrice: 59, duration: '30天', features: ['全部14款排盘工具', '每日50次通用AI问答', 'B类工具月赠3次，超出享8折', '中医学习库全部开放', '模拟考试全等级开放', '签到积分2倍 · 无广告体验', '专属标识/头像框 · 导出排盘报告'], badge: '热门', highlighted: false },
  { level: 'yearly', name: '年度会员', price: 366, originalPrice: 458, duration: '365天', features: ['全部14款排盘工具', '通用AI问答无限次', 'B类工具月赠15次，超出享7折', '中医学习库全部开放', '模拟考试全等级开放', '签到积分3倍 · 无广告体验', '专属标识/头像框 · 导出排盘报告', '专属客服支持'], badge: '推荐', highlighted: true },
  { level: 'lifetime', name: '终身会员', price: 3600, originalPrice: 4500, duration: '永久有效', features: ['全部14款排盘工具', '通用AI问答无限次', 'B类工具无限次免费使用', '中医学习库全部开放', '模拟考试全等级开放', '签到积分5倍 · 无广告体验', '专属标识/头像框 · 导出排盘报告', '专属客服支持 · 新功能优先体验'], badge: '尊享', highlighted: false },
];

function readJson(file, fallback) {
  try {
    const p = path.join(DATA_DIR, file);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch (e) { console.error('[publicPricing] 读取失败:', file, e.message); }
  return fallback;
}

router.get('/', (_req, res) => {
  try {
    const memCfg = readJson('admin-membership-config.json', null);
    const aiCfg = readJson('admin-ai-config.json', null);

    // 会员套餐（后台可改价/上下架）
    const rawPlans = (memCfg && Array.isArray(memCfg.plans) && memCfg.plans.length > 0)
      ? memCfg.plans
      : DEFAULT_MEMBERSHIP_PLANS;
    const membershipPlans = rawPlans
      .filter(p => p.enabled !== false)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map(p => ({
        level: p.level, name: p.name, price: p.price, originalPrice: p.originalPrice,
        duration: p.duration, features: p.features || [], badge: p.badge || '',
        highlighted: !!p.highlighted,
      }));

    // AI 配置（单次解锁价/增量包/时卡/工具价）
    const ai = aiCfg ? {
      singleUnlockPrice: aiCfg.singleUnlockPrice != null ? aiCfg.singleUnlockPrice : 9.9,
      packages: (aiCfg.packages || []).filter(p => p.enabled !== false),
      timePlans: (aiCfg.timePlans || []).filter(p => p.enabled !== false),
      tools: (aiCfg.tools || []).map(t => ({ id: t.id, name: t.name, enabled: t.enabled !== false, price: t.price, category: t.category })),
    } : null;

    res.json({
      success: true,
      data: {
        source: 'server-ssot',
        membershipPlans,
        ai,
        complianceLabel: (memCfg && memCfg.complianceLabel) || '传统文化学习服务',
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: '价格配置读取失败' });
  }
});

module.exports = { router };
