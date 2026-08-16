# 言道国学项目总账 (PROJECT_LEDGER_FINAL)

> 最后更新: 2026-08-16 | 维护者: AI 开发团队

---

## 版本历史

| 版本 | 日期 | 阶段 | 关键变更 | Commit |
|------|------|------|---------|--------|
| v25.0.0 | 2026-07 | P0-CORE | 架构冻结基础版本 | - |
| v25.0.5 | 2026-08-14 | P0-CORE | 用户核心服务层部署 | d8edc19 |
| v25.0.6 | 2026-08-14 | P1 | A-002 返回链路 + UC-003 邀请码 + ICP 备案 | d8edc19 |
| v25.0.7 | 2026-08-15 | P1-CLOSE | token 键名统一修复 + ICP 全量覆盖 | 4f62006 |
| v25.0.13 | 2026-08-15 | P0-1 | 全站工具弹窗遮挡根治（85vh/滚动/底部安全区统一规范） | - |
| v25.0.15 | 2026-08-16 | P1 | 返回键统一协议（弹窗历史垫层）+ 忘记密码后端同步（/api/auth/reset-password 更新 SQLite bcrypt） | - |
| v25.0.16 | 2026-08-16 | P1 | 返回键根因修复：trailingSlash pathname 尾斜杠比较缺陷（yixue/zhongyi layout 规范化） | 7f4254e |

---

## 阶段完成状态

| 阶段 | 状态 | 完成日期 | 验收报告 |
|------|------|---------|---------|
| P0-CORE | ✅ 已关闭 | 2026-08-14 | - |
| P1-CLOSE | ✅ 已关闭 | 2026-08-15 | docs/reports/20260815_P1_FINAL_ACCEPTANCE.md |
| P2 用户中心 | ✅ 闭环验证完成 | 2026-08-16 | docs/reports/20260816_治理收尾_审计问题完善.md |
| P3 推广分销 | ✅ 链路闭环验证完成 | 2026-08-16 | docs/reports/20260816_治理收尾_审计问题完善.md |
| P4 轻量社交 | ✅ 链路闭环验证完成 | 2026-08-16 | docs/reports/20260816_治理收尾_审计问题完善.md |
| P5 移动端打包 | 🔲 待启动 | - | - |

---

## P1 修复项总览

| 编号 | 修复项 | 涉及文件 | 状态 |
|------|--------|---------|------|
| P1-1 | 登录异常修复 | teamApi.ts, aiService.ts, recordSync.ts | ✅ |
| P1-2 | ICP 备案号展示 | 全站 108 HTML 文件 | ✅ |
| P1-3 | A-002 返回链路 | useToolBack.ts, yixue/layout.tsx | ✅ |
| P1-4 | UC-003 邀请码 | teamApi.ts, authRoutes.js | ✅ |
| P1-5 | 全站弹窗遮挡统一规范（85vh/滚动/安全区） | 各工具页弹窗组件 | ✅ v25.0.13 |
| P1-6 | 返回键统一协议（弹窗历史垫层+stale-closure修复） | yixue/layout.tsx, 4工具页 | ✅ v25.0.15 |
| P1-7 | 忘记密码后端同步 | loginService.ts, register_routes.js | ✅ v25.0.15 |
| P1-8 | 返回键根因（trailingSlash pathname） | yixue/layout.tsx, zhongyi/layout.tsx | ✅ v25.0.16 |

---

## 2026-08-16 治理收尾记录（审计问题完善）

| 编号 | 项目 | 结果 | 证据 |
|------|------|------|------|
| F-06 | 一致性校验脚本 Node 模块版本冲突 → bash+sqlite3 重写 | ✅ 每日 03:00 cron 正常 | /root/backup/consistency.log |
| F-06b | user_assets 孤儿记录清理（6条零值残留，users 批量清理时未级联） | ✅ foreign_key_check CLEAN | 备份 yandao_users_20260816_082935_pre_f06.db |
| UV-003 | PostgreSQL 状态 | ✅ active，库 yandaoguoxue | systemctl is-active |
| UV-004 | AI /api/ai/chat 密钥名不匹配修复（DEEPSEEK→HUNYUAN 兼容+错误透传） | ✅ 代码层完成；⚠️ 遗留：腾讯 TokenHub Key 白名单未含 82.156.228.87，需控制台添加 | 公网返回具体中文错误提示 |
| UV-005 | 后端 API 健康 | ✅ /api/version 200, /api/auth/login 校验正常 | curl 实测 |
| UV-006 | 邀请码功能 | ✅ 见 P2-1 | - |
| P2-1 | 邀请码分销全链路（生成→注册绑定→一级/二级关系→统计接口） | ✅ 生产 createUser 实测闭环，测试数据已清理 | 本报告 |
| P2-2 | 社交系统闭环（消息存取/图片上传回读/存储状态） | ✅ 全部 200 | 本报告 |
| 密码链路 | 忘记密码+短信验证码重置后新密码登录 | ✅ wuzhimin123 登录成功（100000 创世纪） | curl 实测 |
| 版本一致 | 本地/服务器/GitHub 三端 commit | ✅ 7f4254e 三端一致；公网版本 v25.0.16_D20260816 | git log + ls-remote + curl |

---

## 生产环境

| 项目 | 值 |
|------|-----|
| 服务器 | 82.156.228.87 |
| 域名 | yandaoguoxue.yandao.vip |
| 当前版本 | v25.0.16 (公网实测 v25.0.16_D20260816) |
| 部署路径 | /root/yandaoguoxue/releases/v25.0.16 |
| 后端服务 | yandaoguoxue-backend (PM2 online) |
| 数据库 | PostgreSQL + SQLite |
| SSL | Let's Encrypt |
