# 言道国学 · FINAL_PROJECT_HANDOVER（唯一交接文档）

> 本文档是全项目唯一交接文件（2026-08-26 FINAL-HANDOVER-STABILITY-SEAL 封板批次）。
> 目标：一位全新的 AI/开发只读本文档即可独立接管项目。历史细节见仓库根 `PROJECT_MASTER_LEDGER.md` 与《01_项目总账_宪法.md》（项目方持有副本）。
> 本文档只写密钥**位置**，绝不写密钥**值**（第五十一章红线）。

---

## 1. 项目是什么

**言道国学**（yandaoguoxue）：传统文化命理学习平台。
- **命理工具**：八字、紫微斗数、奇门遁甲、六爻、梅花易数、姓名解析（算法全部本地计算，前端完成）。
- **AI 深度解读**：以上工具结果接入 AI 深度分析（服务端代理转发上游大模型）。
- **中医/学习**：中医百科（中药/经络/伤寒/问诊/养生/体质）+ 学习院（academy 课程/考试/证书）。
- **社交**：好友、私聊、群聊（群主/管理员/成员三级）、动态流、点赞、收藏、评论、通知、拉黑、举报、后台审核。
- **商业化**：会员订阅（月/季/年/终身）、单项解锁、AI 时卡、积分充值；微信支付；两级分佣（15%+5%）+ 合伙人渠道体系。
- **形态**：Next.js 静态导出 Web（nginx 托管）+ Capacitor Android APK + Node.js(Koa) 后端 API。

## 2. 当前正式版本

| 组件 | 版本 |
|------|------|
| Web（生产 current） | **v25.0.62**（buildId `v25.0.62_D20260827`，builtAt 2026-08-26T16:53:19Z） |
| 后端 API | package 1.1.0（PM2: yandaoguoxue-backend，online） |
| Android APK | **v25.0.60 / versionCode 2059**（APK 未随 Web 61/62 后台增量重建；下次 APK 发布走 §33 流程） |

## 3. 当前 Commit

- **四端 HEAD 一致**：LOCAL = GITHUB = SERVER_SOURCE = 生产构建源（接管后第一步：`git log --oneline -3` 四端核对，见总账第十五章）。
- D22 代码批次链：`37a3260`（三库备份+后台展示）→ `2b1d6af`（版本号 v25.0.62）；其后均为文档批次（本文档），不改变运行时代码。

## 4. GitHub

`https://github.com/wzmpa18/minglizyi`（branch `main`）。
- 服务器直连 GitHub 不稳（拉取用 git bundle 中转，推送走本地）。
- **可恢复性已实证**：服务器从 GitHub 全新 clone → npm install（552 包）→ next build 成功 → 静态导出 1790 文件。
- CI：`gh workflow run android-build.yml --repo wzmpa18/minglizyi --ref main`（iOS 同理 ios-build.yml）。

## 5. 生产服务器

腾讯云 **82.156.228.87**（root 登录；SSH 密钥 `~/.ssh/id_rsa_yandao`，本地 Windows 已配）。宝塔面板管理。
- 实例：`lhins-4ak6ifwg`（轻量应用服务器），地域：**北京（ap-beijing）**，系统盘 50GB（已用 15GB/30%）。
- 腾讯云安全组件：云镜(YunJing) v5.4.4.213 / Stargate agent / TAT agent 均运行中。
⚠️ 同机还承载「言道学外语」与公司官网——**清理服务器时绝对不能碰**。

## 6. 域名

| 域名 | 用途 |
|------|------|
| `yandaoguoxue.yandao.vip` | 国学站（Web + API + APK 下载唯一源） |
| `www.yandao.vip` / `yandao.vip` | 公司官网；其 `/app-download/*` 与 `/latest.apk` 均 301 到国学站唯一源 |

## 7. 源码目录

- **服务器源码仓**：`/root/yandaoguoxue-source`（git，与 GitHub 同步）。
- **本地开发仓**：`C:\Users\ZhuanZ\Projects\minglizyi`（Windows，pnpm）。
- 关键子目录：`src/`（Next.js 前端）、`backend_deploy/`（后端全部 .js，部署时整体同步到 /www/yandaoguoxue-backend）、`android/` `ios/`（Capacitor 壳）、`scripts/`（含 ssh_exec.py、发布/验证脚本）、`backend_deploy/scripts/`（运维门禁脚本）。

## 8. Web 生产目录

`/root/yandaoguoxue/current` → 软链 `releases/v25.0.62`。
`releases/` 现存：`v25.0.62`（生产）、`v25.0.61`、`v25.0.60`、`v25.0.47_34`（历史回滚档）。**禁止删除 current 指向的目录**。

## 9. Backend 目录

`/www/yandaoguoxue-backend`（PM2 fork 模式，入口 `server.js`，配置 `ecosystem.config.js`，密钥在 `.env`）。
常用：`pm2 ls` / `pm2 logs yandaoguoxue-backend` / `pm2 reload yandaoguoxue-backend`。

## 10. Nginx 配置

`/www/server/panel/vhost/nginx/yandaoguoxue.vip.conf`（宝塔 vhost）。
关键指令：
- `location /api/` → proxy 到 127.0.0.1:3001，**`proxy_read_timeout 180s`**（AI 长请求防 504，勿删）。
- `location = /latest.apk` → `return 301 …/app-download/latest.apk`（防根路径假 APK）。
- `location /app-download/` → `alias /var/www/yandao.vip/app-download/`（唯一 APK 真源）。
- 访问日志：`/www/wwwlogs/yandaoguoxue.yandao.vip.log`（每日 00:00 轮转，昨日日志 `-20260827` 后缀）。

## 11. 数据库（全部 SQLite）

| 库 | 路径 | 说明 |
|----|------|------|
| 用户库（权威） | `/root/backend-auth/data/yandao_users.db` | 用户/订单/权益/分佣/邀请（73 用户） |
| 社交库 | `/www/yandaoguoxue-backend/data/social.db` | 好友/私聊/群/动态/评论/举报 |
| 学习库 | `/www/yandaoguoxue-backend/data/academy.db` | 学习平台（57MB）：study_progress 用户进度 + materials/questions/knowledge_points 内容 |
| ⚠️ 0 字节残留 | `/root/backend-auth/data/social.db`、`…/academy.db` | 历史空壳文件，**不是**真库，勿误用 |

## 12. 数据表作用

**用户库（21 表）**：`users`（账号+`member_level`+`membership_expiry` 权威会员字段）、`user_assets`（积分/星级，`member_expire_at` 仅派生兼容非权威）、`user_orders`（订单+`extra` JSON 持久化交付键）、`user_entitlements`（单项解锁/AI 时卡权益，换设备恢复）、`user_records`（姓名解析等历史记录）、`ai_quota_usage`（AI 日额度）、`points_transactions`（积分流水）、`user_ratings`、`device_registry`（设备）、`commission_accounts`/`commission_records`/`withdrawals`（分佣三件套）、`partners`/`partner_order_log`/`partner_settlements`（合伙人）、`invite_audit`/`invite_rewards`/`invite_friend_tasks`/`user_invite_relation`（邀请裂变）、`operation_logs`（运营日志）。

**社交库（15 表）**：`friendships`（好友边，无向对）、`friend_requests`、`friend_remarks`、`chat_messages`（私聊+群消息，`clientMsgId` 幂等）、`user_conversations`（会话未读）、`groups`（含 owner_id）、`follows`、`posts`（动态）、`comments`（扁平，无层级）、`likes`、`favorites`、`notifications`、`blacklists`、`reports`、`sensitive_logs`（敏感词）。

**学习库（24 表）**：`materials`/`knowledge_points`/`questions`/`exams`/`exam_specs`/`certificates`/`categories`/`learning_paths`（内容与题库）、`study_progress`/`wrong_answers`（用户学习数据）、`ai_call_logs`（内容生成日志）、`organizations`/`org_members`/`org_earnings`（机构，当前空表）。

## 13. Backup 路径

`/root/backup/`。
- 每日 **02:00** cron：`/root/backend-auth/backup_db.sh` → 备份**用户库 + 社交库 + 学习库（academy.db）三库**（D22 封口），保留 30 天，`integrity_check` 校验，写状态文件 `backend data/backup_status.json`（含 usersDb/socialDb/academyDb 三块）。
- 学习库说明：`/www/yandaoguoxue-backend/data/academy.db`（57MB）= `study_progress`（用户学习进度）+ 13 万条学习内容（materials/questions/knowledge_points），AI 生成内容重建成本高，**必须备份**。
- 特殊快照：`yandao_users_pre_fix100011_*.db`、`social_db_precleanup_*.db`（操作前快照，勿删）。
- **每周核心表导出**：每周一 08:00 cron → `/root/backend-auth/scripts/weekly_core_export.sh` → 导出 12 张核心表（users/orders/entitlements/commissions/withdrawals/partners/points/friendships/groups/study_progress）为 CSV → tar.gz 打包，保留 4 周。路径：`/root/backup/weekly_exports/`。
- **异地备份**：腾讯云基础设施层提供快照备份能力（轻量服务器系统盘快照），但COS应用层异地同步未配置（coscmd 已装但 `/root/.cos.conf` 缺失）。腾讯云防护拉满方案见 `docs/TENCENT_CLOUD_PROTECTION_CHECKLIST.md`（D23 批次）。

## 14. APK 唯一地址（DOWNLOAD SSOT，永久冻结）

**`https://yandaoguoxue.yandao.vip/app-download/latest.apk`**
- 公网实测：HTTP 200 / `application/vnd.android.package-archive` / 11,501,732 B（>5MB）。
- 磁盘真实路径：`/var/www/yandao.vip/app-download/latest.apk`（目录内**仅此一个** APK 文件）。
- **任何新版本发布 = 替换这一个文件**，前端公开页面永远不许再出现带版本号的 APK 文件名；版本号包只做服务器内部归档。
- 防回归门禁：`backend_deploy/scripts/apk_url_single_source_gate.sh`（发布前必跑：扫全仓旧地址 + 包名/versionCode/versionName/MD5 校验，任一失败禁止发布）。

## 15. Android 版本

v25.0.60 / versionCode 2059 / 包名 `com.yandao.guoxue` / MD5 `e506971da1779ea7a044ad5330878fc4`（SHA256 前缀 `46a01207…`）。
- 此版起前端 AI 调用携带 Bearer Token（`src/lib/aiService.ts`）。
- `data/app-release-config.json`：`downloadUrl` 已指向唯一源；`forceUpdate: false`。
- 旧版 APK（≤2058）不带 token：AI 调用已被 401 封口（见 §20），用户升级即恢复。

## 16. iOS 状态

**PARTIAL**：Codemagic 管道就绪，唯一缺口是账号持有人（ZHIMIN WU）在 developer.apple.com 接受 PLA 协议；接受后 `gh workflow run ios-build.yml` 即出签名 ipa。

## 17. 后台 URL

`https://yandaoguoxue.yandao.vip/admin`（唯一管理入口；抽屉式导航，桌面/手机均不遮内容）。
核心页：dashboard 驾驶舱、moderation 审核、ai-control、commission 分佣、alerts、announcements、feature-flags、poster-config、share-config。

## 18. 后台权限体系

三级角色（`backend_deploy/adminRoles.js` 服务端强校验）：**SUPER_ADMIN > ADMIN > SUPPORT_ADMIN**（另含 finance/ops scope）。
- 密钥存后端 `data/admin_roles.json`；`.env` 的 `ADMIN_API_KEY` 自动映射为 SUPER_ADMIN（向后兼容）。
- 鉴权方式：`Authorization: Bearer <key>`（不是 X-Admin-Key）。
- 全部操作写 `data/admin_audit.json` 审计（operator/oldValue/newValue/ip/ua）。

## 19. 支付架构

微信支付（`paymentRoutes.js`）：**Native 扫码 + JSAPI** 双通道（nativeReady=true）。
- 下单 → 微信回调 → 状态 PAID → `deliverOrderBenefits()` 交付：
  - MEMBERSHIP → 更新 `users.member_level` + `membership_expiry`（权威 SSOT）。
  - SINGLE_UNLOCK / AI 时卡 → 写 `user_entitlements`（`entitlement_key`=unlockTargetId，`expire_at`=NULL 表示永久；`extra` 已 D18 持久化到 `user_orders.extra`，进程重启不丢）。
  - POINTS_RECHARGE → 积分流水。
- 历史事实：4 笔 PAID（2 MEMBERSHIP 均有效；2 SINGLE_UNLOCK 为测试账号订单，extra 在 D18 修复前丢失、权益未落库，真实用户 SINGLE_UNLOCK 订单 = 0）。

## 20. AI 架构

`server.js` 内 `/api/ai/chat` 服务端代理（上游 TokenHub，密钥仅存服务器 `.env`）：
- **鉴权**：Bearer Token 必须；无 token 一律 **401 AI_AUTH_REQUIRED**（`AI_ANON_DAILY_LIMIT=0` 已硬关闭匿名通道——2026-08-26 封板，比原定 2026-10-31 日落提前）。
- **配额**：basic 3 次/日，monthly/quarterly 50 次/日，yearly/lifetime 无限；`ai_quota_usage` 记账；失败不扣额。
- **并发锁**：同一主体同时仅 1 个在途请求（429 AI_CONCURRENT_LIMIT），防并行双烧 token。
- **上游**：`max_tokens 8192` + 空内容保护（返回明确错误、不扣额、记日志）；输入 >8000 字拒绝。
- **超时**：nginx `proxy_read_timeout 180s`；健康监控 `data/ai-health.json`（P50/95/99、>60s/>120s、空内容、连续失败≥5 红灯）。
- 匿名通道证据：8/26 全天真实匿名调用仅 1 次（旧 APK WebView UA），Dalvik 原生 UA 4 次被 UA 门控拦截——旧 APK 群体可忽略，关闭无实质影响。

## 21. 会员 / 权益

- **权威 SSOT：`users.membership_expiry` + `users.member_level`**（写入宪法）。`user_assets.member_expire_at` 只能派生/兼容，禁止当第二权威源（存量 NULL 无功能影响）。
- 档位：basic（免费）/ monthly / quarterly(99元) / yearly / lifetime。
- 权益恢复：`GET /api/auth/entitlements` 登录即恢复（换设备/重装不丢）。
- 后台会员调整全流程 24/24 验收通过（每步双表 DB + AI 权限即时生效 + 审计日志一致）。

## 22. 分佣 / 合伙人

- 两级分佣：**一级 15% + 二级 5%，层级冻结禁止再增**。
- 表：`commission_accounts`（账户）/ `commission_records`（明细）/ `withdrawals`（提现，需审核）。
- 合伙人渠道 V2：`partners` / `partner_order_log` / `partner_settlements`。
- 后台 `/admin/commission` 可视化配置；合规红线已内置（层级封顶）。
- 裂变：邀请海报（`/share` 引擎）+ `user_invite_relation`（`invited_by` 归因）+ `invite_rewards`。

## 23. 社交架构

`backend_deploy/socialApiRoutes.js`（挂载 `/api/social`，`authRequired` 中间件鉴权）+ `social.db`。
- 好友：申请/接受/拒绝/删除/备注；无重复边（无向对唯一）。
- 私聊：`clientMsgId` 幂等（快速双击/断网重试不重复）、`afterId` 增量分页、未读数、进入清零。
- 群聊：服务端生成 groupId；群主/管理员/成员三级权限矩阵（越权 403）；**群主退群自动转让最早成员 → 最后成员退群自动解散**（无主群不变量已验证）；禁言（到期自动恢复）。
- 动态：发布/点赞 toggle 幂等/收藏/评论（扁平）/举报；XSS 转义已验。
- 治理：拉黑强制 403、举报后台可处理、动态下架、封禁全链路拦截（D19：AI/社交/authMiddleware 三处拦截 banned/deleted）。
- 验收口径：主测 83 项 + 复核 17 项 = **100 项有效检查全过**（finalseal_social_retest.js 存档）。
- 测试账号：**YDAO_TEST_A=910077 / B=910078 / C=910079**（生产库专用测试号，破坏性测试只准用它们）。

## 24. 学习 / 中医

- 学习院（academy）：课程/考试/证书/资料，进度接口 `/api/academy/*`（需登录）；资料库 `docs/materials/`。
- 中医：`/zhongyi/*` 全静态页群（herb/meridian/shanghan/wenzhen/yangsheng/profile/shop）+ AI 问诊内容。
- 医考引擎（yikao）为**冻结算法核心**，禁止改动。

## 25. 分享 / 营销

- 分享结果页：`/share/result/`（注意带尾斜杠才 200；`/share/` 无索引页 403 属正常）。
- 海报引擎：html2canvas 生成完整海报（背景/标题/卖点/二维码/邀请码），`/admin/poster-config` 配置。
- 分享配置：`/admin/share-config`（`share_config.json`；downloadUrl 已收口唯一源）。
- 邀请归因：注册链路带邀请码 → `users.invited_by` / `user_invite_relation`；每日 03:30 cron `reconcile_invite_friends.js` 对账。
- 裂变海报营销化（AI 智能文案）v25.0.47_22 已上线。

## 26. 当前功能矩阵（2026-08-26 封板口径，只允许事实）

| 模块 | 状态 | 一句话依据 |
|------|------|-----------|
| AI | **VERIFIED** | 攻击测试 A–H 23 项全过 + 匿名通道硬关闭 + 并发锁 + 健康监控 |
| MEMBERSHIP | **VERIFIED** | 调整全流程 24/24 + 审计全覆盖 + SSOT 明确 |
| PAYMENT | **VERIFIED** | Native/JSAPI 双通道 + D18 extra 持久化 |
| ENTITLEMENT | **VERIFIED** | user_entitlements + 换设备恢复（2 笔历史测试单 extra 失落已如实记录，真实用户缺口=0） |
| COMMISSION | **VERIFIED** | 两级分佣 + 提现审核 + 合规红线 |
| FRIEND | **VERIFIED** | S1 全过含并发/幂等边界 |
| PRIVATE_CHAT | **VERIFIED** | clientMsgId 幂等/分页/未读全过 |
| GROUP_CHAT | **VERIFIED** | 三角色 + 无主群不变量直接验证 |
| GROUP_ADMIN | **VERIFIED** | 权限矩阵 + 越权 403 |
| SOCIAL_FEED | **VERIFIED** | 文字链路全过（图片 API 支持未端到端验收） |
| COMMENT | **PARTIAL** | 基础评论可用；层级回复+删除 NOT_IMPLEMENTED（无 UI 入口，保持隐藏） |
| LIKE | **VERIFIED** | toggle 幂等净效果正确 |
| FAVORITE | **VERIFIED** | 收藏/取消/列表/重登正确 |
| NOTIFICATION | **VERIFIED** | 通知触达+未读+已读不回弹（含群主转让通知） |
| BLOCK | **VERIFIED** | 服务端强制 403 + 解除恢复 |
| REPORT | **VERIFIED** | 分类/幂等/后台可查（当前待处理 0） |
| MODERATION | **VERIFIED** | 下架/禁言/封禁全链路 + audit 四处一致 |
| SHARE | **PARTIAL** | 服务端链路 VERIFIED；真机 Share Sheet/微信/QQ/归因未验 |
| DOWNLOAD | **VERIFIED** | 唯一源 200+MIME+MD5；301 收口；门禁脚本 |
| ANDROID | **PARTIAL** | APK 三重验证（直链/二进制/版本）；真机全链路 DEVICE_UNAVAILABLE |
| ADMIN | **VERIFIED** | /admin 唯一入口 + 三级角色 + 驾驶舱含备份状态 |
| BACKUP | **VERIFIED**（本地） | 三库每日 02:00 + 每周核心表导出 + integrity_check + SOCIAL_BACKUP_GATE 红灯 + 恢复演练 ok；腾讯云快照/安全加固方案已就绪（D23） |
| SOURCE_SYNC | **VERIFIED** | 四端一致 + GitHub clone 构建实证 |

## 27. 当前已知 PARTIAL

1. **OFFSITE_BACKUP**：腾讯云基础设施层快照能力可用（轻量服务器系统盘快照），但 COS 应用层异地同步未配置（coscmd 装了但 `/root/.cos.conf` 缺失）。P0 优先：在腾讯云控制台开启自动快照策略（每日，保留 7 天）+ 跨地域复制（北京→上海）。完整操作清单见 `docs/TENCENT_CLOUD_PROTECTION_CHECKLIST.md`。
2. **ANDROID 真机**：开发环境无 Android 物理设备（DEVICE_UNAVAILABLE），真机下载→安装→登录→AI→社交全链路待项目方执行（服务端已三重验证 APK）。
3. **SHARE 真机**：排盘→分享→Share Sheet→微信/QQ→接收→注册→归因，真机链路未验。
4. **iOS**：PLA 未签。
5. **COMMENT**：见 §26。
6. **hy3 极限场景**：5000+ 字提示词可能推理耗尽 8192 token（已有明确报错不扣额）；根治靠流式改造或提示词瘦身，**禁止堆 max_tokens**。
7. **`/api/sync` 404 噪音**：旧 APK 调用不存在的端点（8/26 32 次），无功能影响；新版已无此调用。

## 28. 当前 NOT_IMPLEMENTED（如实，禁止为全绿临时新增）

1. 评论层级回复（API 无 parentId）。
2. 评论删除（无端点，作者/他人均不可删）。
3. 社交频率保护（好友申请/消息/评论/动态/举报均无服务端 rate limit；建议后续补 IP/用户级限频）。
4. 动态图片端到端验收（API 支持 posts.images ≤9 张，未做真实上传验收）。

## 29. 当前风险（按优先级）

1. **单机单盘**：全部数据在一台腾讯云北京轻量服务器；**腾讯云快照是性价比最高的第一道防线**（控制台开启自动快照策略，3 分钟搞定）。COS 异地同步是第二道防线（需提供 API 密钥后开通）。完整方案见 `docs/TENCENT_CLOUD_PROTECTION_CHECKLIST.md`。
2. **旧 APK 用户 AI 不可用**：≤2058 版不带 token 被 401；观测影响 1-2 台设备；升级 latest.apk 即恢复——**推广前应引导存量用户升级**。
3. **无社交限频**：恶意刷屏/刷申请无服务端拦截。
4. **服务器直连 GitHub 不稳**：发布依赖本地推送 + bundle 中转，流程勿改（见 §30）。
5. PM2 累计重启 194 次（历史累计，unstable_restarts=0，当前稳定 30m+ 无 error）。

## 30. 部署步骤（小步发布，每批一个主题）

```bash
# 0) 前置：修改前备份 + git commit + health 记录
# 1) 本地构建（自动生成 version.json）
cd C:\Users\ZhuanZ\Projects\minglizyi && pnpm build        # 产物 out/
# 2) 门禁（任一 FAIL 禁止发布）
bash backend_deploy/scripts/apk_url_single_source_gate.sh   # APK 唯一源扫描+校验
# 3) 上传 out/ → 服务器新 release 目录，切换软链
python scripts/ssh_exec.py run "mkdir -p /root/yandaoguoxue/releases/vX.Y.Z"
#    （或 scp -r out/* 到新目录；保持上一版目录不动）
python scripts/ssh_exec.py run "ln -sfn /root/yandaoguoxue/releases/vX.Y.Z /root/yandaoguoxue/current && nginx -s reload"
# 4) 后端改动：同步 backend_deploy/*.js → /www/yandaoguoxue-backend/，然后
python scripts/ssh_exec.py run "cd /www/yandaoguoxue-backend && pm2 reload yandaoguoxue-backend"
# 5) 自动回归（26 项，全绿才算完成）
python scripts/ssh_exec.py run "bash /tmp/handover_regression_sweep.sh"
# 6) Git 四端：本地 push GitHub → 服务器 bundle 同步（GitHub 拉取受阻时）
#    服务器: git bundle create /tmp/x.bundle main → scp 回本地 → git fetch bundle main:main → push origin
```
⚠️ **禁止一次改 30 个无关模块**；每批 = 一个主题（下载/备份/社交修复/AI 安全）；失败立即回滚（§31）。

## 31. 回滚步骤（秒级）

```bash
# Web：切回上一版软链
python scripts/ssh_exec.py run "ln -sfn /root/yandaoguoxue/releases/v25.0.60 /root/yandaoguoxue/current && nginx -s reload"
# 后端：当日回滚件在 /www/yandaoguoxue-backend/bak_finalseal_20260826_*（发布批次时留 .bak，下次发版后清除）
python scripts/ssh_exec.py run "cp /www/yandaoguoxue-backend/bak_xxx/server.js /www/yandaoguoxue-backend/ && pm2 reload yandaoguoxue-backend"
```

## 32. 备份恢复步骤（已演练验证）

```bash
# 1) 复制备份到临时目录（禁止覆盖生产！）
python scripts/ssh_exec.py run "mkdir -p /tmp/yandao_restore_test && cp /root/backup/users_db_最新.db /tmp/yandao_restore_test/ && cp /root/backup/social_db_最新.db /tmp/yandao_restore_test/ && cp /root/backup/academy_db_最新.db /tmp/yandao_restore_test/"
# 2) 完整性 + 关键表可读
sqlite3 /tmp/yandao_restore_test/xxx.db "PRAGMA integrity_check;"
sqlite3 /tmp/yandao_restore_test/social.db "SELECT COUNT(*) FROM friendships; SELECT COUNT(*) FROM chat_messages;"
# 3) 真恢复（需停写窗口）：cp 覆盖 → pm2 reload → 回归扫描
```

## 33. APK 发布步骤

1. 本地 `pnpm build` + Capacitor 构建（或 `gh workflow run android-build.yml` 云打包）。
2. **门禁全过才准发**（`apk_url_single_source_gate.sh`）：HTTP 200 / Content-Type=application/vnd.android.package-archive / >5MB / 包名=com.yandao.guoxue / versionCode=当前发布值 / MD5=发布文件。
3. 替换**唯一文件** `/var/www/yandao.vip/app-download/latest.apk`（旧版本号包禁止再放此目录）。
4. 更新 `data/app-release-config.json`（latestVersion/versionCode/notes）。
5. 全仓扫描确认无旧 APK 文件名外泄（门禁脚本内置）。

## 34. 必须保护的数据（丢失不可逆）

- `/root/backend-auth/data/yandao_users.db`（73 真实用户 + 订单 + 权益 + 分佣账）。
- `/www/yandaoguoxue-backend/data/social.db`（全部社交关系与聊天记录）。
- `/root/backup/`（30 天备份 + pre_* 操作前快照）。
- 证书（宝塔 SSL，yandaoguoxue.yandao.vip）。
- `data/admin_audit.json`（后台审计，只增不删）。
- 上游 `.env`（AI/微信/ADMIN_API_KEY 等，见 §38 位置）。

## 35. 禁止修改的算法核心（冻结）

- 紫微 / 八字 / 奇门 / 六爻 / 梅花 / 姓名算法核心（`src/lib/` 与页面内算法）。
- 医考引擎（yikao）。
- 邀请归因体系（invited_by 链路）。
- 数据库表结构（只许加列加表，禁止改列删表）。
- 分佣两级 15%+5%（层级不得再增加）。
- APK 唯一下载源（§14）与 `proxy_read_timeout 180s`。

## 36. 历史重大坑及根因（新开发必读）

| 坑 | 根因 | 防复发 |
|----|------|--------|
| AI 504（用户 100011 事件） | nginx 默认 proxy_read_timeout 60s，AI 长请求被切断 | 180s 已固化 + ai-health 延迟监控 |
| AI 空内容烧钱 | 上游偶发空 content，仍算成功扣额 | 空内容保护：明确报错+不扣额+记日志 |
| 会员权益换设备丢失 | 权益只存前端 localStorage | 服务端 user_entitlements + 登录恢复接口 |
| Koa 中间件 ctx 丢失 | koa-connect 包 Express 中间件致 ctx.state 丢 | 原生 Koa 中间件重写（禁止再包） |
| 订单 extra 重启丢失 | extra 只存内存 | D18 持久化 user_orders.extra |
| 旧 APK 死链 10 处 | 官网/海报/分享配置散指旧版本号包名 | APK_URL_SINGLE_SOURCE_GATE 门禁 |
| social.db 零备份 | 原备份脚本只备用户库 | SOCIAL_BACKUP_GATE（文件+size+integrity+红灯） |
| 服务器构建失败 | PowerShell 写 package.json 带 UTF-8 BOM，JSON.parse 崩 | 2defc78 已修；改 JSON 用无 BOM 编码 |
| 匿名 AI 被白嫖 | /api/ai/chat 无鉴权 | 401 硬关闭（AI_ANON_DAILY_LIMIT=0）+ UA 不可信原则 |

## 37. 下一位开发最先检查什么（接管 Day-1 清单）

1. `pm2 ls`（backend online）+ 公网 `curl -s https://yandaoguoxue.yandao.vip/api/health`。
2. Git 四端 HEAD：本地 `git log -1` vs `git ls-remote origin main` vs 服务器 `/root/yandaoguoxue-source` vs 总账记录。
3. 驾驶舱 `/admin` → health 六灯（backend/db/ai/payment/server/**backup**）应全绿（backup 灯 = SOCIAL_BACKUP_GATE）。
4. `cat /www/yandaoguoxue-backend/data/backup_status.json`（gateOk 必须为 true；>48h 红灯说明 cron 挂了）。
5. APK 唯一源 200 + MD5 比对（§15）。
6. 跑一遍 `handover_regression_sweep.sh`（26 项全绿基线）。
7. 有任何写生产操作：先用 YDAO_TEST_A/B/C（910077/78/79），只准写带 TEST 标识的数据，测试后只清 TEST 数据、保留 audit log。

## 38. SECRET INVENTORY（只说位置，绝不写值）

| 密钥 | 位置 |
|------|------|
| ADMIN_API_KEY | 服务器 `/www/yandaoguoxue-backend/.env`（自动映射 SUPER_ADMIN） |
| 后台子密钥 | `data/admin_roles.json` |
| JWT_SECRET | 同 `.env` |
| AI 上游 Key | 同 `.env`（AI_API_KEY/相关变量，仅服务器持有） |
| 微信支付商户私钥/APIv3 | 同 `.env` + 宝塔证书目录（变量名见 `.env.example`） |
| Apple P8 | GitHub Secrets（ios-build workflow，名为见 `.github/workflows/`） |
| Android keystore | Codemagic/GitHub Secrets（B64 见项目方文档 `06_Codemagic_ANDROID_KEYSTORE_B64.txt`，勿入库） |
| 数据库 | 无独立密码（SQLite 文件权限即边界，root only） |
| SSH | 本地 `~/.ssh/id_rsa_yandao`（服务器 root） |
| 仓库卫生 | `.env.example` 只允许变量名；secret 扫描历史已完成（36f2005） |

---

**封板声明**：本文档对应 FINAL-HANDOVER-STABILITY-SEAL-20260826 批次（最终代码批次 v25.0.62：D22 academy.db 三库备份封口，代码止于 `2b1d6af`，其后仅文档批次）。生产已封板（回归 26/26 全绿、四端一致、三库备份门禁在线）。推广门禁仅剩 2 项真机验证（§27.2/27.3），由项目方执行后即可扩大推广。
