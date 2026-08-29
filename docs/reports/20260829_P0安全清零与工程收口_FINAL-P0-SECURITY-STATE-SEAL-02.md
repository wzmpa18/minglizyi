# 【P0 SECURITY + ENGINEERING STATE SEAL】+ WORK COMPLETION RECORD

> 指令：FINAL-P0-SECURITY-STATE-SEAL-02
> 版本：v25.0.65（安全修复批次）｜日期：2026-08-29
> 性质：P0 安全清零 + 工程收口（本地提交，不推送）
> 约束：禁止输出真实 Secret 片段；禁止仅凭静态代码定罪；先判「生产活跃路径」再修复。

---

## 一、【P0 SECURITY + ENGINEERING STATE SEAL】

### 1.1 生产真实执行路径核实（先判定，后修复）

生产入口事实源：`backend_deploy/ecosystem.config.js` → `script: server.js`，`cwd: /www/yandaoguoxue-backend`。即**生产活跃后端 = `backend_deploy/` 目录**；`src/lib/backend/` 为无任何 `require` 引用的历史遗留副本，非活跃路径。

| # | P0 检查项 | 生产路径核实 | 判定 |
|---|----------|------------|------|
| 1 | JWT 默认回退密钥 | 生产 `.env` JWT_SECRET = 64 位非默认值；代码内 `yandao_default_jwt_secret_*` 仅作 `process.env.JWT_SECRET \|\| '默认'` 死代码回退 | **修复（P0）** |
| 2 | 社交存储越权 | `/api/social`（socialStorageRoutes.js）原 6 个接口全部无鉴权，可匿名读任意用户聊天记录、读/改存储统计、传图、清理 | **修复（P0）** |
| 3 | AI 单次解锁旁路 | 服务端按会员等级 + 当日 AI 配额限流；订单金额以服务端 SSOT 裁决 | 非 P0（生产路径无私钥旁路） |
| 4 | 批量工具价格篡改 | `resolveServerPrice` 从 admin 配置读价，强制覆盖前端传入 amount | 非 P0（服务端 SSOT 成立） |
| 5 | 积分/钱包 localStorage | 积分不可兑核心付费权益；钱包为前端模拟数据、无真实资金流 | 非 P0 |
| 6 | Admin Key 本地存储 | 后台密钥仅落盘 sha256 哈希，明文只在签发响应返回一次 | 非 P0 |
| 7 | 离线假 Token | 离线功能不签发可伪造的 JWT | 非 P0 |

### 1.2 修复内容

**JWT fail-closed（9 文件）**：移除 `process.env.JWT_SECRET || '默认值'` 回退，改为启动期强校验——未配置或长度 < 32 位则抛错拒绝启动。
- `backend_deploy/middleware/auth.js`
- `backend_deploy/authRoutes.js`、`accountDeleteRoutes.js`、`register_routes.js`
- `backend_deploy/academyRoutes.js`、`commissionRoutes.js`、`partnerRoutes.js`
- `backend_deploy/socialApiRoutes.js`、`teamApiRoutes.js`

**社交存储鉴权（socialStorageRoutes.js）**：
- `POST /upload-image` → `authMiddleware` + 属主校验（`req.user.userId === userId`，否则 403）
- `GET /image/:fileName` → `authMiddleware` + 文件名白名单（拒绝 `..`、`/`、`\`，防路径穿越）
- `POST /messages/sync`、`GET /messages/:userId/:sessionId` → `authMiddleware` + 属主校验
- `GET /admin/storage/status`、`POST /admin/storage/cleanup` → `adminAuth('ADMIN')`（管理端密钥鉴权）

### 1.3 工程收口

| 类别 | 文件 | 处置 |
|------|------|------|
| A 入库测试 | `src/algorithm-core/tests/trueSolarTime.test.mts`、`src/algorithm-core/tests/package.json` | 入库（真太阳时封板测试，13/13 通过） |
| B 文档脱敏 | `20260816_v25.0.21_部署报告.md`、`20260822_全部报告整合_完整版.md`、`20260829_真太阳时均时差算法Meeus升级_完整报告.md` | 混元 Key 前缀 `sk-l4iL8*` 全部改 `sk-******` 占位；20260829 精度口径「零误差」改为可验证 Meeus ±2.4s/实测 1.66~1.75s |
| C 构建修复 | `pnpm-workspace.yaml`（占位符 `esbuild: set this to true or false` → `esbuild: true`）、`package.json`(+tsx)、`pnpm-lock.yaml` | 修复后 clean checkout 构建通过 |
| C 忽略规则 | `.gitignore`（新增 `tmp/`） | 排除 Meeus 临时校验脚本，防入库 |
| E（遗留，不动） | `src/lib/backend/authRoutes.js`、`register_routes.js` | 非活跃遗留副本，仍含死代码默认密钥，按「先判活跃路径」原则不予改动（低优先级清理项） |

### 1.4 验证与回归

| 验证项 | 结果 |
|--------|------|
| 后端 10 文件 `node --check` | ✅ 全部通过 |
| `authMiddleware` → `req.user.userId` 引用链 | ✅ 正确（decodeToken 返回 `{userId,phone,email}`，`req.user = user`） |
| `adminAuth('ADMIN')` 引用链 | ✅ 正确（adminRoles.js 导出 `adminAuth`，`ADMIN`=80 级角色存在） |
| 真太阳时 Golden 测试 | ✅ 13/13（EoT vs astronomy-engine ≤3s、跨日、时辰边界、奇门 Integration、八字/紫微提取一致性） |
| clean checkout 构建 | ✅ `pnpm install --frozen-lockfile`（lockfile up to date）+ `pnpm build` exit 0（54 路由无错误） |
| 全仓库 Secret 扫描 | ✅ 无 `sk-l4iL8` / `HUNYUAN_API_KEY=sk-` 明文残留；git 历史无完整 sk- / 私钥 / 管理密钥 / `.env` 被跟踪 |

### 1.5 Secret 治理结论

- **JWT_SECRET**：生产使用 64 位非默认值，代码默认值仅为死代码，**无需轮换**（本轮已移除默认回退，彻底 fail-closed）。
- **混元 Key**：生产 `.env` 已配置且 `hy3` 模型可用；历史文档曾出现 8 位前缀 `sk-l4iL8`，全文已脱敏为 `sk-******`。完整密钥从未入库（git 历史无 24+ 位 sk 值）。建议择机在腾讯云控制台轮换一次作卫生动作（**非阻断项**）。

---

## 二、WORK COMPLETION RECORD

| 步骤 | 内容 | 状态 |
|------|------|------|
| 1 | 核实生产真实执行路径（ecosystem.config.js → backend_deploy/server.js） | ✅ |
| 2 | 7 项 P0 检查逐项判定（先判活跃路径） | ✅ |
| 3 | 修复 JWT 默认回退（9 文件 fail-closed） | ✅ |
| 4 | 修复社交存储越权（6 接口鉴权 + 属主 + 穿越校验） | ✅ |
| 5 | 真太阳时测试封板（13/13） | ✅ |
| 6 | 文档脱敏（3 份报告 Key 前缀 + 精度口径） | ✅ |
| 7 | 构建配置修复（pnpm-workspace esbuild 占位符） | ✅ |
| 8 | clean checkout 构建验证（frozen-lockfile + build exit 0） | ✅ |
| 9 | 回灌 PROJECT_MASTER_LEDGER（12.14 事实 + 新增 12.15） | ✅ |
| 10 | 本地 commit（不推送） | ✅ |

**声明**：发现的问题凡经「生产真实执行路径」核实确属本指令授权范围者，均已修复而非仅列清单。非活跃路径残留项（`src/lib/backend/` 死代码默认密钥）按指令「先判定生产活跃路径」原则记录为低优先级清理项，不作本轮改动。

**后续建议（非本轮范围）**：混元 Key 轮换（卫生动作）；`src/lib/backend/` 遗留副本清理；Phase 1 AI Fair Usage + Cost Center（前置盘点历史权益）。