# 言道国学项目总账 (PROJECT_LEDGER_FINAL)

> 最后更新: 2026-08-15 | 维护者: AI 开发团队

---

## 版本历史

| 版本 | 日期 | 阶段 | 关键变更 | Commit |
|------|------|------|---------|--------|
| v25.0.0 | 2026-07 | P0-CORE | 架构冻结基础版本 | - |
| v25.0.5 | 2026-08-14 | P0-CORE | 用户核心服务层部署 | d8edc19 |
| v25.0.6 | 2026-08-14 | P1 | A-002 返回链路 + UC-003 邀请码 + ICP 备案 | d8edc19 |
| v25.0.7 | 2026-08-15 | P1-CLOSE | token 键名统一修复 + ICP 全量覆盖 | 4f62006 |

---

## 阶段完成状态

| 阶段 | 状态 | 完成日期 | 验收报告 |
|------|------|---------|---------|
| P0-CORE | ✅ 已关闭 | 2026-08-14 | - |
| P1-CLOSE | ✅ 已关闭 | 2026-08-15 | docs/reports/20260815_P1_FINAL_ACCEPTANCE.md |
| P2 用户中心 | 🔲 待启动 | - | - |
| P3 推广分销 | 🔲 待启动 | - | - |
| P4 轻量社交 | 🔲 待启动 | - | - |
| P5 移动端打包 | 🔲 待启动 | - | - |

---

## P1 修复项总览

| 编号 | 修复项 | 涉及文件 | 状态 |
|------|--------|---------|------|
| P1-1 | 登录异常修复 | teamApi.ts, aiService.ts, recordSync.ts | ✅ |
| P1-2 | ICP 备案号展示 | 全站 108 HTML 文件 | ✅ |
| P1-3 | A-002 返回链路 | useToolBack.ts, yixue/layout.tsx | ✅ |
| P1-4 | UC-003 邀请码 | teamApi.ts, authRoutes.js | ✅ |

---

## 生产环境

| 项目 | 值 |
|------|-----|
| 服务器 | 82.156.228.87 |
| 域名 | yandaoguoxue.yandao.vip |
| 当前版本 | v25.0.7 |
| 部署路径 | /root/yandaoguoxue/releases/v25.0.7 |
| 后端服务 | yandaoguoxue-backend (PM2 online) |
| 数据库 | PostgreSQL + SQLite |
| SSL | Let's Encrypt |
