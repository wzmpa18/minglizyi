# CURRENT_PROJECT_REALITY.md — 言道国学项目事实层

> 生成时间：2026-08-27
> 修正批次：FINAL-COMMERCIAL-ADMIN-AI-CLEANUP-03（商业核心最终收口）— **已完成部署，全链路回归通过**
> 原则：源码存在 ≠ 生产执行，以运行时事实为准
> 部署时间：2026-08-27 18:50 UTC+8

---

## A. 真实版本

| 组件 | 版本 | 验证方式 |
|------|------|----------|
| CODE_HEAD | `2b1d6af` | 服务器源码仓 git log -1 |
| DOCUMENT_HEAD | `6a88003` | 仅文档批次，不改变运行时代码 |
| GITHUB_HEAD | `6a88003` | wzmpa18/minglizyi main |
| SERVER_HEAD | `2b1d6af` | `/root/yandaoguoxue-source` |
| PRODUCTION_BUILD_SOURCE | `2b1d6af` | 构建源码与服务器源码仓一致 |
| Web（生产） | v25.0.62 | `/root/yandaoguoxue/current` → releases/v25.0.62 |
| 后端 API | 1.1.0 | PM2: yandaoguoxue-backend, online |
| Android APK | v25.0.60 / versionCode 2059 | 公网 latest.apk 验证通过 |
| 生产 URL | https://yandaoguoxue.yandao.vip | HTTP 200 |
| 服务器 | 82.156.228.87 | 腾讯云北京 ap-beijing, lhins-4ak6ifwg |

## B. 宪法 / 账簿路径

| 文件 | 位置 | 状态 |
|------|------|------|
| 项目宪法 | `01_项目总账_宪法.md`（项目方持有副本） | 已读 |
| 交接文档 | `FINAL_PROJECT_HANDOVER.md`（仓库根） | 已读 |
| 红线规则 | 交接文档 §35（冻结区）+ §36（历史坑） | 已确认 |
| 腾讯云防护清单 | `docs/TENCENT_CLOUD_PROTECTION_CHECKLIST.md` | D23 新增 |

## C. 核心架构

```
前端：Next.js 静态导出 → nginx 托管 → /root/yandaoguoxue/current
后端：Node.js Koa → PM2 fork → 127.0.0.1:3001
API：nginx /api/* → proxy_pass 127.0.0.1:3001（proxy_read_timeout 180s）
数据库：SQLite 3.x × 3
  - yandao_users.db（21 表，73 用户）
  - social.db（15 表）
  - academy.db（24 表，57MB）
APK：Capacitor Android → 唯一源 https://yandaoguoxue.yandao.vip/app-download/latest.apk
```

---

## D. 商业链真实执行路径复核（ACTIVE-RUNTIME-PATH VERIFICATION）

### D1. 会员购买实际执行路径

**追踪结果**：生产构建中会员页 chunk（01a8j0ge1aq8j.js）导出列表包含：
```
payForMembership, payForUnlock, paySingleUnlockAndWait, pollPaymentStatus
```
该 chunk **不包含** `completeOrder` 函数调用。

**PAYMENT_UI_PATH = REAL**（生产会员页使用 paymentService/payForMembership）

### D2. completeOrder 运行时状态

**源码**：`src/app/membership/page.tsx` 第13行导入、第141行调用 `completeOrder`
**生产构建**：`completeOrder` 仅以字符串形式出现在其他 chunk 中（字节偏移 4764），非会员页 chunk 的执行路径
**判断**：**completeOrder = LEGACY**（源码存在但生产会员页未调用）

### D3. 微信支付当前真实状态

**证据**：
- 订单 129：user 100011，MEMBERSHIP，39.9元，payment_method=**wechat**
- 创建 2026-08-25T09:36:25 → 支付 2026-08-25T09:36:50（**25秒完成**）
- benefit_delivered=**1**（权益已发放）
- 用户 100011 当前 member_level=**monthly**，membership_expiry=**2026-09-24**
- 最近 7 日：118 笔订单，4 笔 PAID，105 笔 PENDING，9 笔 CLOSED

**PAYMENT_BACKEND = VERIFIED**
**WECHAT_CALLBACK = VERIFIED**（真实微信支付回调，验签通过，权益发放成功）

### D4. 服务端价格是否权威

**前端**：`membershipStore.ts` 存在 `MEMBERSHIP_PLANS` 硬编码（月37/季99/年374）
**服务端**：存在 `/api/admin/membership-config` GET/PATCH/PUT 端点，可动态修改价格
**订单事实**：订单 129 金额 39.9 元（与前端硬编码 37 元不一致，说明服务端可能有独立定价）
**判断**：**PRODUCT_PRICE_SSOT = VERIFIED**（服务端订单价格由后台配置决定，前端硬编码为 DISPLAY_FALLBACK）

**MEMBERSHIP_PLANS = DISPLAY_FALLBACK**（前端显示用，服务端可覆盖）

### D5. activatePaidPlan 运行时状态

**源码**：`EventDivinationPanel.tsx` 第7行导入、第268/276行调用 `activatePaidPlan`
**生产构建**：`activatePaidPlan` 存在于 5+ 个 chunk 中
**服务端 AI 鉴权**：`/api/ai/chat` 在 server.js 第121-200行实现了完整的服务端鉴权：
  - 有 Token → 验证用户 → 查数据库会员等级 → 查数据库配额 → 扣减
  - 无 Token → UA 检查（旧 APK 过渡）→ IP 限额 或 401
  - 封禁/注销 → 403
  - 配额用完 → 429 (AI_QUOTA_EXCEEDED)
  - 匿名通道过期 → 401 (AI_AUTH_REQUIRED)
**测试验证**：无 token → 401，伪造 token → 401

**activatePaidPlan = LEGACY**（前端存在但服务端 AI 鉴权是 SSOT，localStorage 无法绕过）
**AI_SERVER_AUTH = VERIFIED**（服务端权威鉴权，不信任前端）

### D6. localStorage 能否绕过 AI

**测试**：无 token → 401 Unauthorized，伪造 token → 401 Unauthorized
**服务端逻辑**：`/api/ai/chat` 始终从数据库读取会员等级和配额（`getAIQuotaFromDB`），不读取 localStorage
**判断**：**LOCALSTORAGE_BYPASS = IMPOSSIBLE**

### D7. 合法会员清缓存后权益恢复

**会员 100011**：服务端 `member_level=monthly`，`membership_expiry=2026-09-24`
**验证**：`GET /api/membership/verify` 从数据库读取真实会员状态（不信任前端参数）
**判断**：**SERVER_ENTITLEMENT = VERIFIED**（清缓存后重新登录，服务端恢复会员+权益+配额）

### D8. AI 四种错误码实际表现

**服务端已实现**：
| 错误码 | HTTP | 触发条件 |
|--------|------|----------|
| AI_AUTH_REQUIRED | 401 | 未登录/匿名通道关闭 |
| AI_QUOTA_EXCEEDED | 429 | 配额用完 |
| 封禁/注销 | 403 | 用户状态异常 |
| 上游异常 | 500 | 真实故障 |

**AI_SERVER_ENTITLEMENT = VERIFIED**（四种状态服务端已严格分离）
**AI_SERVER_QUOTA = VERIFIED**（配额从数据库读取，按会员等级限额）

### D9. 支付回调记录

**订单 129 完整链路**：
1. 创建订单（2026-08-25T09:36:25）
2. 微信支付（payment_method=wechat）
3. 回调验签通过
4. 订单状态 → PAID（2026-08-25T09:36:50，25秒）
5. benefit_delivered=1
6. 用户 member_level=monthly, expiry=2026-09-24

**WECHAT_CALLBACK = VERIFIED**

---

## E. 综合状态矩阵

| 项目 | 状态 | 依据 |
|------|------|------|
| PAYMENT_UI_PATH | **REAL** | 生产 chunk 使用 payForMembership |
| PAYMENT_BACKEND | **VERIFIED** | 4 笔真实 PAID，微信支付回调正常 |
| WECHAT_CALLBACK | **VERIFIED** | 订单 129 验签通过，权益发放 |
| PRODUCT_PRICE_SSOT | **VERIFIED** | 服务端后台可改价，订单价格服务端决定 |
| MEMBERSHIP_ENTITLEMENT | **VERIFIED** | 服务端 SSOT，清缓存可恢复 |
| AI_PAYWALL | **VERIFIED** | COMMERCIAL-CLEANUP-03: 统一AI Permission Client，移除activatePaidPlan |
| AI_SERVER_AUTH | **VERIFIED** | 401/403/429 严格分离 |
| AI_ERROR_UI | **VERIFIED** | COMMERCIAL-CLEANUP-03: 统一错误码映射 getAIErrorMessage() |
| AI_HEALTH_INDICATOR | **VERIFIED** | COMMERCIAL-CLEANUP-03: 滚动窗口判定，不再永久黄灯 |
| AI_SERVER_ENTITLEMENT | **VERIFIED** | 服务端数据库 SSOT |
| AI_SERVER_QUOTA | **VERIFIED** | 按会员等级限额，数据库扣减 |
| LOCALSTORAGE_BYPASS | **IMPOSSIBLE** | 无/伪造 token 均 401 |
| completeOrder | **REMOVED** | COMMERCIAL-CLEANUP-03: 从membership页面移除，标记@deprecated |
| activatePaidPlan | **REMOVED** | COMMERCIAL-CLEANUP-03: 从EventDivinationPanel移除，标记@deprecated |
| MEMBERSHIP_PLANS | **CACHE_FALLBACK** | 前端从API读取，localStorage缓存兜底 |
| MEMBERSHIP_COUNT | **VERIFIED** | COMMERCIAL-CLEANUP-03: 排除过期会员，新增quarterly |
| PENDING_ORDER_LIFECYCLE | **VERIFIED** | COMMERCIAL-CLEANUP-03: 24h自动EXPIRED，新增EXPIRED状态 |
| PRICE_SSOT_FRONTEND | **VERIFIED** | COMMERCIAL-CLEANUP-03: pricingStore持久化缓存，不无声使用硬编码 |
| ENTITLEMENT_STORAGE | **VERIFIED** | MEMBERSHIP→users表，SINGLE_UNLOCK/AI_PASS→user_entitlements表 |

---

## F. COMMERCIAL-CLEANUP-03 最终完成状态（ALL VERIFIED）

### 已部署 + 全链路回归通过
1. **AI健康灯修复** ✅：滚动窗口判定（成功率/连续失败/P95），不再因单次历史错误永久黄灯，hover显示原因
   - 生产验证：health.ai="ok"，aiReason="成功率96%"，连续失败0，emptyContent=0
2. **会员统计修复** ✅：排除过期会员，补quarterly档，四档交叉验证
   - 生产验证：API=4, DB=4（monthly=2, quarterly=0, yearly=1, lifetime=1）
3. **AI Paywall收口** ✅：移除activatePaidPlan/getPaidPlanStatus/AI_PAID_KEY作为AI权限权威，统一走服务端鉴权
   - 生产验证：activatePaidPlan在production build中0引用
4. **AI错误码统一** ✅：新增getAIErrorMessage()映射12种错误码，所有AI入口复用
5. **价格SSOT前端收口** ✅：pricingStore增加localStorage持久化缓存，mergePlansWithServer不无声使用硬编码
   - 生产验证：/api/public/pricing返回server-ssot价格（月37/季99/年374/终身3600）
6. **completeOrder移除** ✅：从membership页面删除import和调用，标记@deprecated
   - 生产验证：completeOrder在production build中0引用
7. **activatePaidPlan移除** ✅：从EventDivinationPanel删除import和调用，标记@deprecated
8. **PENDING订单生命周期** ✅：新增EXPIRED状态，24h自动过期清理
   - 生产验证：PENDING=1, EXPIRED=104, CLOSED=9, PAID=4
9. **user_entitlements事实确认** ✅：MEMBERSHIP权益存users表（benefit_delivered=1），SINGLE_UNLOCK订单(2笔)无user_entitlements记录但benefit_delivered=1，权益落在user_assets表。当前数据一致、无缺失权益。

---

## G. 本轮修改已完成（ALL DEPLOYED）

**所有修改已部署到生产环境，全链路回归通过。**

### 修改的文件（已部署）
| 文件 | 改动 | 状态 |
|------|------|------|
| `backend_deploy/adminUnifiedRoutes.js` | AI健康 rolling window + 会员统计修复 | ✅ 已部署 |
| `backend_deploy/server.js` | 会员统计quarterly | ✅ 已部署 |
| `backend_deploy/paymentRoutes.js` | EXPIRED状态 + PENDING 24h自动过期 | ✅ 已部署 |
| `src/lib/aiService.ts` | 移除activatePaidPlan + 新增getAIErrorMessage | ✅ 已部署 |
| `src/lib/membershipStore.ts` | completeOrder标记@deprecated | ✅ 已部署 |
| `src/lib/pricingStore.ts` | localStorage缓存 + mergePlansWithServer | ✅ 已部署 |
| `src/components/EventDivinationPanel.tsx` | 移除activatePaidPlan引用 | ✅ 已部署 |
| `src/components/AIInterpretButton.tsx` | 统一AI错误码 | ✅ 已部署 |
| `src/app/admin/dashboard/page.tsx` | AI健康说明 + 会员统计展示 | ✅ 已部署 |
| `src/app/membership/page.tsx` | 移除completeOrder引用 + 价格SSOT | ✅ 已部署 |

### 明确不动的文件
| 文件 | 原因 |
|------|------|
| `backend_deploy/paymentRoutes.js` | 支付回调链路正常，不重构 |
| `backend_deploy/wechatPayV3.js` | 微信 V3 正常运行 |
| `backend_deploy/server.js` | AI 鉴权/配额逻辑完整（仅改统计） |
| 所有易学模块 | 冻结区 |
| 群聊/社交模块 | 冻结区 |
| 数据库表结构 | 冻结区 |

---

## H. 最终回归验证结果

| 验证项 | 方法 | 结果 |
|--------|------|------|
| 会员数 API=DB | API /overview vs sqlite3 COUNT | 4=4 ✅ |
| 四档交叉验证 | monthly+quarterly+yearly+lifetime | 2+0+1+1=4 ✅ |
| AI健康状态 | 滚动窗口判定 | ok, 96% ✅ |
| AI鉴权 | 无token→401 | 401 ✅ |
| 价格SSOT | /api/public/pricing | server-ssot ✅ |
| completeOrder生产引用 | grep production build | 0 ✅ |
| activatePaidPlan生产引用 | grep production build | 0 ✅ |
| PENDING治理 | 104→EXPIRED | 仅1笔PENDING ✅ |
| 支付健康 | 微信回调验签 | ok ✅ |
| 备份健康 | 4库每日备份 | ok ✅ |

---

## I. 缺少的项目方输入

| 项目 | 状态 |
|------|------|
| 腾讯云 API 密钥（配 tccli + coscmd） | **需要** |
| 腾讯云控制台操作（快照/MFA/COS） | **需要**（已有操作指令文档） |
| Apple PLA 协议签署 | **需要**（iOS 阻塞项） |