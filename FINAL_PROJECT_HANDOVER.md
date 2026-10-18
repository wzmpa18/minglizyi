# 言道国学 · FINAL_PROJECT_HANDOVER（唯一交接文档）

> 本文档是全项目唯一交接文件，采用持续增量维护；**最新 dated section 在本文末尾，遇到旧版信息冲突时以最新且有证据的增量为准**。原始封板基线为 2026-08-26 FINAL-HANDOVER-STABILITY-SEAL。
> 目标：一位全新的 AI/开发只读本文档即可独立接管项目。历史细节见仓库根 `PROJECT_MASTER_LEDGER.md` 与《01_项目总账_宪法.md》（项目方持有副本）。
> 本文档只写密钥**位置**，绝不写密钥**值**（第五十一章红线）。

---

## 1. 项目是什么

**言道国学**（yandaoguoxue）：传统文化命理学习平台。
- **命理工具**：八字、紫微斗数、奇门遁甲、六爻、梅花易数、姓名解析（算法全部本地计算，前端完成）+ **四专业工具（v25.0.68 起）**：七政四余（十一曜/二十八宿宿度/洞微大限）、专业罗盘（WMM2025 磁偏角真北校正/二十四山）、立极尺（户型图叠加罗盘）、鲁班尺丁兰尺（双尺合参）。
- **AI 深度解读**：以上工具结果接入 AI 深度分析（服务端代理转发上游大模型）。
- **中医/学习**：中医百科（中药/经络/伤寒/问诊/养生/体质）+ 学习院（academy 课程/考试/证书）。
- **社交**：好友、私聊、群聊（群主/管理员/成员三级）、动态流、点赞、收藏、评论、通知、拉黑、举报、后台审核。
- **商业化**：会员订阅（月/季/年/终身）、单项解锁、AI 时卡、积分充值；微信支付；两级分佣（15%+5%）+ 合伙人渠道体系。
- **形态**：Next.js 静态导出 Web（nginx 托管）+ Capacitor Android APK + Node.js(Koa) 后端 API。

## 2. 当前正式版本

| 组件 | 版本 |
|------|------|
| Web（生产 current） | **v25.0.79**（buildId `v25.0.79_D20260902`，2026-09-02 上线；iOS 提审整改批次：入口改名（手机号码解析/车牌号民俗解读）+全局吉凶清零+黄历古籍定性（《钦定协纪辨方书》注解）+AI 输出合规红线与免责声明+隐私政策补充；含 v25.0.74~78 全部功能：排盘云端保存链路/安卓返回手势/微信服务号17模块/NewsCard 原生壳跳转修复。**本地工作区另有 v25.0.80 六问题修复已构建未部署**（等苹果审核结果一次性部署，见总账十二.35）） |
| 后端 API | package 1.1.0（PM2: yandaoguoxue-backend，online；v25.0.72 批次后端变更=academyRoutes 正骨专区服务端门控+paymentRoutes 两修复（价格SSOT/订单回灌）+toolAdminRoutes 正骨三态开关；**v25.0.75/76 批次新增微信服务号后端 17 模块**（wechatContentEngine AI 文章生成+SafetyGate 查重+TokenManager+调度器 cron 流水线+OAuth 防护守卫，ai_call_logs 记账）；矩阵总数 28；QF/OSS/Offline/存储GC/统一后台 全挂载。**v25.0.80 批次待部署后端**：newsAiScheduler.js 资讯 AI 维护（cron 07:10） |
| Android APK | **v25.0.79 / versionCode 2072**（2026-09-02 发布：iOS 提审整改同步安卓，内置资源与 Web 生产一致（1931 文件）；统一分发源 latest.apk 原子替换（12,174,027 字节，MD5 `f1a50c4beebd546c9dd00c230b8bda1c`，三份分发名 MD5 一致）、公网版本接口与 APK MD5 终验一致、升级公告已发布；构建脚本 `backend_deploy/build_android_v25_0_79.sh` 可复跑。**审核结果后需重打包 2073（内置 v25.0.80）**） |

## 3. 当前 Commit

- **四端 HEAD 一致**：LOCAL = GITHUB origin/main = SERVER_SOURCE = 生产构建源（2026-09-01 核实；发布基线 `cf99433`，其后的文档回灌提交经 git bundle 中转同步服务器（服务器直连 GitHub 不稳），unpushed=0；接管后第一步：`git log --oneline -3` 四端核对）。
- 当前代码批次：`657dc5f`（双身份 PARTNER_NET_OF_REFERRAL）→ `b493913`（Partner 归属快照/合同/改绑审计/结算快照/逐单账）→ `852c5fd`（总账回灌）→ `ac45013`（**MASTER-05 六模块后端**：Provider/对象存储+备份灾备/Offline Pack/社交限频+评论层级/Question Factory/统一后台总控+全量回归矩阵）→ `7a0750d`（Offline 前端四库）→ `6a16c4e`（bump v25.0.66）→ `d9bde64`（/offline 页面接线）→ `4fd6cc5`（MASTER-05 封板回灌）→ `add0f56`（SEO 增长引擎首批：seoPagesConfig+生成器+质量门禁+18页+robots/sitemap+bump v25.0.67）→ `3370fe4`（APK v25.0.67/2067 重建+统一分发源+升级公告+主站 robots/sitemap 修复）→ `7624c15`（IndexNow 免登录主动推送双站 28 URL 202 受理+百度/头条/IndexNow 推送工具固化入仓）→ `2a148da`（**NICHE-TOOLS-07 四工具引擎上线 v25.0.68**：七政四余净室引擎/罗盘 WMM2025/立极尺/鲁班尺丁兰尺+Share 原生修复+APK 2068）→ `6fd3289`/`f53fe12`/`3707220`（v25.0.68 构建/验证脚本三坑修复）→ `d8f476a`（v25.0.69 四工具 SEO 集群页+矩阵登记+IndexNow 推送）→ `875ebfc`（v25.0.70 小众工具收尾：罗盘多门派Profile+立极尺专业盘+SEO五Cluster+Growth编排器）→ `5ece32b`（v25.0.71 七政断语引擎六节+开关管控+用户活跃统计）→ `cf99433`（v25.0.72 七政学习资料+正骨专区¥89付费+支付两修复）→ `9afd6b1`（v25.0.74 排盘云端保存+安卓返回手势）→ `03d7443`（v25.0.75 微信服务号17模块）→ `bbf0188`（v25.0.76 OAuth防护）→ `4290249`（v25.0.77 iOS合规收口）→ `35f2a4b`（v25.0.78 TestFlight VALID）→ `dcadb47`+`a1fec51`（v25.0.79 整改+安卓2072）→ **`9366314`（v25.0.79 报告+台账8.1/8.2，HEAD）**。**本地工作区有 v25.0.80 六问题修复未提交**（30 文件改动+8 新文件：GlobalBackButton/newsAiScheduler/DNS修复脚本/批次报告；接管后先 `git status` 核对再决定提交时机）。后端运行时已随 v25.0.72 重启（正骨门控+支付修复生效，PM2 online，fixture 生产实测全过）。四工具代码位置：`src/algorithm-core/modules/qizheng|compass|liji|ruler/index.ts`（净室开发：Astronomy Engine MIT 只做对拍基准、Horosa AGPL 只做结果参考未抄一行、Swiss Ephemeris 弃用；WMM2025 系数 NOAA 公共领域净室键入）。

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

`/root/yandaoguoxue/current` → 软链 `releases/v25.0.79`（2026-09-02 切流，1931 文件；公网 version.json buildId `v25.0.79_D20260902`）。
`releases/` 现存多版（_5~_29/_62~_79；回滚目标 v25.0.74）。**禁止删除 current 指向的目录**。
SEO 静态落地页在 current 内：`/tools/`、`/learn/`、`/app/`、`/b/` + `robots.txt` + `sitemap.xml`（nginx try_files 直出；新增页面用 `backend_deploy/seo/` 配置+生成器+门禁流水线，勿手改 HTML）。IndexNow 主动推送密钥文件在 current 根：`/6adb2132052f4657a159f7302971f5c2.txt`（仓库 public/ 同名副本，未来构建自动携带；推送脚本 `backend_deploy/seo/indexnow_push.sh`）。
站长平台验证文件（百度/头条/谷歌）：`/root/yandaoguoxue/verify/` 持久目录（nginx 精确 location root 指向，与发版切流解耦；源码仓 public/ 亦有副本双保险）；头条另有 `/ByteDanceVerify.html` 双文件名（真实下载文件名）；验证 URL 见总账十二.22。主站 `www.yandao.vip` 验证文件：`/www/yandao-verify/` 持久目录（yandao.vip.conf 精确 location；副本存 backend_deploy/seo/verify-main/；部署脚本 backend_deploy/deploy_verify2.sh 幂等可复跑）——含百度 `baidu_verify_codeva-JdVUh0FlbC.html`、谷歌 `google5ebbc484799c2806.html`、**头条 `ByteDanceVerify.html`（验证码 9/rZXunUHfGFCjR0DaQ8，与国学站 U447glXVJ3l8Obskdb3h 按站点独立）**；主站 IndexNow 密钥 `/www/yandao-company/7f9989ce602348f4bb3bb968879a640f.txt`（副本同 verify-main/）。主站访问日志：`/www/wwwlogs/www.yandao.vip.log`（十二.25 补配）。百度普通收录每日自动推送：`/root/backend-auth/scripts/baidu_daily_push.sh`（cron 10 9 * * *，队列/指针/env 在 /root/backend-auth/data/，token 不入仓库）。

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
| 用户库（权威） | `/root/backend-auth/data/yandao_users.db` | 用户/订单/权益/分佣/邀请/Provider（98 用户，2026-08-30） |
| 社交库 | `/www/yandaoguoxue-backend/data/social.db` | 好友/私聊/群/动态/评论/举报 |
| 学习库 | `/www/yandaoguoxue-backend/data/academy.db` | 学习平台（57MB）：study_progress 用户进度 + materials/questions/knowledge_points 内容 |
| ⚠️ 0 字节残留 | `/root/backend-auth/data/social.db`、`…/academy.db` | 历史空壳文件，**不是**真库，勿误用 |

## 12. 数据表作用

**用户库（21+8 表）**：`users`（账号+`member_level`+`membership_expiry` 权威会员字段）、`user_assets`（积分/星级，`member_expire_at` 仅派生兼容非权威）、`user_orders`（订单+`extra` JSON 持久化交付键）、`user_entitlements`（单项解锁/AI 时卡权益，换设备恢复）、`user_records`（姓名解析等历史记录）、`ai_quota_usage`（AI 日额度）、`points_transactions`（积分流水）、`user_ratings`、`device_registry`（设备）、`commission_accounts`/`commission_records`/`withdrawals`（分佣三件套）、`commission_router_snapshots`（Router 快照幂等）、`partners`/`partner_order_log`/`partner_settlements`（合伙人）+ MASTER-05 新表：`partner_attribution`（归属快照）/`partner_attribution_rebind_log`（改绑审计）/`partner_contracts`（合同）/`partner_channel_codes`（渠道子码）/`providers`/`provider_services`/`service_orders`/`provider_reviews`/`provider_settlements`（Provider 五表）、`invite_audit`/`invite_rewards`/`invite_friend_tasks`/`user_invite_relation`（邀请裂变）、`operation_logs`（运营日志）。

**社交库（15+1 表）**：`friendships`（好友边，无向对）、`friend_requests`、`friend_remarks`、`chat_messages`（私聊+群消息，`clientMsgId` 幂等）、`user_conversations`（会话未读）、`groups`（含 owner_id）、`follows`、`posts`（动态）、`comments`（**含 parentId 两级层级**，作者/管理员软删除 deleted 列）、`likes`、`favorites`、`notifications`、`blacklists`、`reports`、`sensitive_logs`（敏感词）+ `rate_limit_events`（社交限频计数）。

**学习库（24+5 表）**：`materials`/`knowledge_points`/`questions`/`exams`/`exam_specs`/`certificates`/`categories`/`learning_paths`（内容与题库）、`study_progress`/`wrong_answers`（用户学习数据）、`ai_call_logs`（内容生成日志）、`organizations`/`org_members`/`org_earnings`（机构，当前空表）+ Question Factory 新表：`exam_blueprints`（蓝图）/`qf_generation_queue`（生成队列）/`qf_quality_metrics`（质量指标）。

## 13. Backup 路径

`/root/backup/`。
- 每日 **02:00** cron：`/root/backend-auth/backup_db.sh` → 备份**用户库 + 社交库 + 学习库（academy.db）三库**（D22 封口），保留 30 天，`integrity_check` 校验，写状态文件 `backend data/backup_status.json`（含 usersDb/socialDb/academyDb 三块）。
- 学习库说明：`/www/yandaoguoxue-backend/data/academy.db`（57MB）= `study_progress`（用户学习进度）+ 13 万条学习内容（materials/questions/knowledge_points），AI 生成内容重建成本高，**必须备份**。
- 特殊快照：`yandao_users_pre_fix100011_*.db`、`social_db_precleanup_*.db`（操作前快照，勿删）。
- **每周核心表导出**：每周一 08:00 cron → `/root/backend-auth/scripts/weekly_core_export.sh` → 导出 12 张核心表（users/orders/entitlements/commissions/withdrawals/partners/points/friendships/groups/study_progress）为 CSV → tar.gz 打包，保留 4 周。路径：`/root/backup/weekly_exports/`。
- **异地备份**：腾讯云基础设施层提供快照备份能力（轻量服务器系统盘快照），但COS应用层异地同步未配置（coscmd 已装但 `/root/.cos.conf` 缺失）。腾讯云防护拉满方案见 `docs/TENCENT_CLOUD_PROTECTION_CHECKLIST.md`（D23 批次）。
- **MASTER-05 备份软件链（2026-08-30 上线）**：`backend_deploy/backupEngine.js` + `objectStorageEngine.js`——三库备份→AES-256-GCM 加密→ObjectStorageService（LOCAL 现行/COS adapter 就绪）→manifest+sha256→retention 策略→restore drill 恢复演练（目标目录生产路径保护 assertNotProductionPath）；管理接口 `/api/admin/oss/backup/*`（run/list/config/restore/drill/drill-status）公网验证 PASS；密钥仅从环境变量 `BACKUP_ENCRYPTION_KEY` 读取，与备份物理分离。COS 异地 = BLOCKED_EXTERNAL_CONFIG（凭证未配，dry-run 已通，不伪称 VERIFIED）。

## 14. APK 唯一地址（DOWNLOAD SSOT，永久冻结）

**`https://yandaoguoxue.yandao.vip/app-download/latest.apk`**
- 公网实测：HTTP 200 / `application/vnd.android.package-archive` / 11,714,186 B（>5MB）。
- 磁盘真实路径：`/var/www/yandao.vip/app-download/latest.apk`（目录内**仅此一个** APK 文件）。
- **任何新版本发布 = 替换这一个文件**，前端公开页面永远不许再出现带版本号的 APK 文件名；版本号包只做服务器内部归档。
- 防回归门禁：`backend_deploy/scripts/apk_url_single_source_gate.sh`（发布前必跑：扫全仓旧地址 + 包名/versionCode/versionName/MD5 校验，任一失败禁止发布）。

## 15. Android 版本

v25.0.79 / versionCode 2072 / 包名 `com.yandao.guoxue` / MD5 `f1a50c4beebd546c9dd00c230b8bda1c`（12,174,027 bytes；2026-09-02 发布，iOS 提审整改同步安卓批次：入口改名/吉凶清零/古籍定性/AI 合规整改，内置资源 releases/v25.0.79 与 Web 生产完全一致 1931 文件；服务器 Gradle 8.9 构建 `backend_deploy/build_android_v25_0_79.sh` 可复跑；APK 内容门禁：新文案 17-24 chunks 命中、旧文案「手机号吉凶」「车牌号吉凶」0 chunks；apksigner 验签 CN=Yandao 与历史一致）。
- v25.0.74 起 MainActivity 注册 OnBackPressedCallback 接管返回（WebView canGoBack→goBack()，首页双击退出防误触；兼容 KEYCODE_BACK 与 Android 13+ 手势两派发路径）。
- 此版起前端 AI 调用携带 Bearer Token（`src/lib/aiService.ts`）。
- `data/app-release-config.json`：`latestVersion 25.0.79 / latestVersionCode 2072`，`downloadUrl` 指向唯一源；`forceUpdate: false`。
- 旧版手机（≤2071）：启动后 AppUpgradeChecker 比对服务器 2072 自动弹升级引导 → latest.apk。
- **苹果审核结果后需重打包 versionCode 2073（内置 v25.0.80：全局悬浮返回键/倒计时重置/通讯录服务端化/NewsCard 主框架跳转）**。

## 16. iOS 状态

**审核中（WAITING_FOR_REVIEW）**——App ID 6807592575 / Bundle ID `com.yandaoguoxue.app` / iOS build 1.0(2) TestFlight VALID 已关联提审。历程：v25.0.77/78 CI 链收口（Xcode 26.3 强制、altool `--apiIssuer`、ASC API 自动签名）→ v25.0.79 按苹果整改指令全端合规（分类教育/参考、版权声明、8 张截图、隐私政策）→ 提审后 **Guideline 2.1（Information Needed）拒审** → 2026-09-03 资料补件重提（371 秒屏幕录制：启动/注册/登录/账号注销/UGC 举报/拉黑 + 演示账号 793398563@qq.com / wzm12345678 + 审核备注英文说明），submission `a8bea0c3-7244-4c2a-b655-3192af447954`。回执 `docs/reports/20260903-appstore-resubmit-receipt.html`。**注意**：①审核留言需项目方人工回复（同英文内容）；②若再拒/通过后发新版，把 v25.0.80 修复（返回键/倒计时/通讯录/NewsCard）编入；③ASC 定价管理需 Admin/Account Holder 角色 Key（当前 UWQ354QP54 App Manager 403）。

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

### 20.1 AI Fair Usage + Cost Center 第一阶段（已生产部署 · 2026-08-30）

- **AI_USAGE_POLICY（服务端唯一事实源）**：`backend_deploy/aiUsagePolicy.js` 统一 AI 额度裁决，与会员功能权益（Membership Entitlement）**解耦**。档位：basic 3/日、monthly/quarterly 50/日、yearly/lifetime 无限（`LEGACY_UNLIMITED_PROTECTED`，禁止改为有限额度）。Fair Use 安全限流：`maxConcurrent=1` / `maxInputChars=12000` / `maxOutputTokens=8192`。后台改策略强制 bump `policyVersion`，禁止静默 UPDATE 导致历史权益瞬间变化。
- **AI Cost Center**：`backend_deploy/aiCostCenter.js` 复用 `academy.db` 的 `ai_call_logs`（幂等扩展 11 个计量列，存量 1909 条未破坏），只记 `requestId/userId/model/tokens/estimatedCost` 等元数据，**不保存 prompt/命理输入/中医私人内容**。后台路由 `/api/admin/ai-cost/{summary,top-users,by-feature,by-model,by-membership,alerts}`（挂 `adminAuth('ADMIN')`，未登录/伪造 token 均 401）+ 页面 `/admin/ai-cost`。告警实时计算，仅告警状态、不自动封号。模型价格可配置（默认 `ESTIMATED`，待按混元/DeepSeek 真实账单校准）。
- **配额裁决接线**：`middleware/auth.js` 每日额度读 `aiUsagePolicy`；`server.js` `/api/ai/chat` 接入成本日志（requestId 幂等 + 成功/失败/blocked 落库）；`server.js` 启动时 `aiCostCenter.ensureSchema()`。
- **overage**：`pack_10`/`pack_50` 无真实商品交付逻辑 → `overageAllowed=false, overageProductId=null`（DISABLED），不虚构增量包。
- **测试**：`backend_deploy/ai_phase1_test.js`（服务器隔离库）**33 PASS / 0 FAIL**，零真实模型调用、零真实用户数据。
- **生产状态**：已部署（后端 MD5 与源仓库一致 + PM2 online + health 200 + DB 幂等迁移 + 前端 v25.0.65 同批含成本中心页面）。

## 21. 会员 / 权益

- **权威 SSOT：`users.membership_expiry` + `users.member_level`**（写入宪法）。`user_assets.member_expire_at` 只能派生/兼容，禁止当第二权威源（存量 NULL 无功能影响）。
- 档位：basic（免费）/ monthly / quarterly(99元) / yearly / lifetime。
- 权益恢复：`GET /api/auth/entitlements` 登录即恢复（换设备/重装不丢）。
- 后台会员调整全流程 24/24 验收通过（每步双表 DB + AI 权限即时生效 + 审计日志一致）。
- AI 额度与会员权益**解耦**：AI 每日额度由 `aiUsagePolicy.js` 唯一裁决（禁止前端文案 / middleware 常量 / 后台配置三套打架）；前端只展示剩余额度，localStorage 篡改不生效（服务端强制）。历史 yearly/lifetime 无限承诺已 `LEGACY_UNLIMITED_PROTECTED`。

## 22. 分佣 / 合伙人

- 两级分佣：**一级 15% + 二级 5%，层级冻结禁止再增**。
- 表：`commission_accounts`（账户）/ `commission_records`（明细）/ `withdrawals`（提现，需审核）。
- 合伙人渠道 V2：`partners` / `partner_order_log` / `partner_settlements`。
- 后台 `/admin/commission` 可视化配置；合规红线已内置（层级封顶）。
- 裂变：邀请海报（`/share` 引擎）+ `user_invite_relation`（`invited_by` 归因）+ `invite_rewards`。

### 22.1 Commission Router（唯一结算引擎 · 2026-08-30 上线）

- 定位：`backend_deploy/commissionRouter.js` 是分佣唯一入口，替代 `paymentRoutes.js` 对 `commissionEngine.grantCommission` / `partnerEngine.grantPartnerCommission` 的独立双调用（**旧双引擎残留 = 0**），杜绝重复计提。
- 入口：PAID → `processPaidOrder(order)`；REFUNDED → `processRefund(orderId, refundAmount)`；对账 → `reconcileOrder`（read-only，不一致只告警不改历史佣金）。
- 快照：`commission_router_snapshots`（order_no UNIQUE 幂等，首次新订单幂等建表），记录 `gross/paymentFee/referralL1+L2/aiCost/partnerRevenue/nurtureRevenue/refund/platformRevenue` 全部分计账，`conservation_ok` 守恒校验（gross = 各分项之和）。
- 双身份策略（Partner 同时为下单用户 L1 直接推荐人）：`REVIEW_REQUIRED`（默认）·`STACK_ALLOWED`·`REFERRAL_PRIORITY`·`PARTNER_PRIORITY`·`PARTNER_NET_OF_REFERRAL`。**默认 REVIEW_REQUIRED：普通 L1/L2 照发，Partner 侧暂停自动结算，待项目方决策（BUSINESS_DECISION_REQUIRED）**。
- 金额单位：整数「分」，禁止 JS float 直接算钱。
- 测试：`backend_deploy/commission_router_test.js` 隔离库 77 PASS / 0 FAIL，零真实支付。

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
| COMMISSION | **VERIFIED** | 两级分佣 + 提现审核 + 合规红线 + Commission Router 唯一结算引擎（防重复计提） |
| FRIEND | **VERIFIED** | S1 全过含并发/幂等边界 |
| PRIVATE_CHAT | **VERIFIED** | clientMsgId 幂等/分页/未读全过 |
| GROUP_CHAT | **VERIFIED** | 三角色 + 无主群不变量直接验证 |
| GROUP_ADMIN | **VERIFIED** | 权限矩阵 + 越权 403 |
| SOCIAL_FEED | **VERIFIED** | 文字链路全过（图片 API 支持未端到端验收） |
| COMMENT | **VERIFIED** | 基础评论 + parentId 两级层级拍平 + 作者/管理员软删除（MASTER-05 第 118~120 章，64 PASS E2E 内含） |
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
| BACKUP | **VERIFIED**（本地） | 三库每日 02:00 + 每周核心表导出 + integrity_check + SOCIAL_BACKUP_GATE 红灯 + 恢复演练 ok + MASTER-05 加密备份软件链（AES-256-GCM+manifest+retention+drill）；腾讯云快照/安全加固方案已就绪（D23） |
| SOURCE_SYNC | **VERIFIED** | 四端一致 add0f56 + GitHub clone 构建实证 |

**MASTER-05 新模块矩阵（2026-08-30 最终封板口径）**：

| 模块 | 状态 | 证据 |
|------|------|------|
| SOCIAL_RATE_LIMIT | **VERIFIED** | 六类接口限频（好友申请/私聊/群聊/动态/评论/举报），userId+IP 双维度，429+短期窗口，后台可调+Audit；64 PASS |
| PARTNER_ATTRIBUTION | **VERIFIED** | 归属快照（版本递增+REBOUND 保留）+改绑审计+3年合同+渠道子码；134 PASS |
| PARTNER_ACCOUNTING | **VERIFIED** | 结算快照字段全集+逐单透明账（脱敏）+双身份 PARTNER_NET_OF_REFERRAL 生产落地 |
| PROVIDER | **VERIFIED** | 五表+申请审核+服务+订单状态机+支付复用（SERVICE_ORDER 类型）+评价防刷+退款+争议+解冻调度；167 PASS |
| OFFLINE_CORE/PACK | **VERIFIED** | Manifest+SHA256+.part 原子+幂等同步事件（eventId）+/offline 页面+六分区 StorageManager+自动清理红线跳过；76 PASS |
| SERVER_GC | **VERIFIED** | /api/admin/storage（report/gc/forbidden/config）+Release 保留+禁止区；公网验证 PASS |
| QUESTION_FACTORY | **VERIFIED** | 蓝图/库存/生成队列/AI 五态/Exact+Structural 去重（Semantic=PARTIAL 如实）/质量指标/坏题自动复审/成本控制；119 PASS |
| OBJECT_STORAGE | **VERIFIED**（LOCAL） | 统一 ObjectStorageService+三逻辑分区+访问控制；LOCAL Provider 生产运行，COS=BLOCKED_EXTERNAL_CONFIG |
| USER_STORAGE | **VERIFIED** | 四类型（SYSTEM_CONTENT/USER_PRIVATE/ORG_PRIVATE/PUBLIC_CONTRIBUTION）+三层（RAW/PARSED/AI_STRUCTURED） |
| UNIFIED_ADMIN | **VERIFIED** | /api/admin/unified overview 接入 QF/Storage/Backup-DR 真实状态+健康灯；24 PASS |
| COS_OFFSITE | **BLOCKED_EXTERNAL_CONFIG** | adapter+dry-run 完成不伪称 VERIFIED；Owner Action 配 Secret |
| TENCENT_SNAPSHOT | **BLOCKED_EXTERNAL_OWNER_ACTION** | 控制台操作，AI 无法替代 |
| IOS | **BLOCKED_EXTERNAL_OWNER_ACTION** | PLA 未签，软件不重复开发 |

**NICHE-TOOLS-07 四工具矩阵（2026-08-31 v25.0.68/v25.0.69 封板口径）**：

| 模块 | 状态 | 证据 |
|------|------|------|
| QIZHENG_ENGINE | **VERIFIED** | 十一曜+二十八宿宿度（今制/恒星制）+十二人事宫+命身宫度+洞微大限；Astronomy Engine 对拍±0.02°+三大拓扑不变量+古法规则+边界鲁棒，86 PASS（净室开发，Horosa 只做结果参考未抄代码） |
| COMPASS_ENGINE | **VERIFIED** | WMM2025 磁偏角引擎（NOAA 公共领域系数净室键入，GeomagneticField 为 fallback）+磁北真北切换+二十四山+干扰监测；126+25 PASS |
| LIJI_ENGINE | **VERIFIED** | 户型图本地处理+罗盘叠加+立极定位+±0.1°精调；20 PASS |
| LUBAN_ENGINE | **VERIFIED** | 多尺制+分位吉凶+双尺合参+曲尺压白+吉尺寸推荐；57 PASS |
| FOUR_TOOLS_PAGES | **VERIFIED** | /yixue/qizheng/ /yixue/compass/ /yixue/liji/ /yixue/luban/ 四页公网 200，黄金测试合计 314/314 |
| SHARE_NATIVE | **VERIFIED**（服务端+二进制） | @capacitor/share 原生插件替代 WebView 假成功；APK 内 SharePlugin 二进制核验；真机 Share Sheet 见 §27 PARTIAL |
| SEO_CLUSTER_V25_0_69 | **VERIFIED** | 四落地页+sitemap 28 URL+矩阵登记 FREE/ON+IndexNow 200 受理+百度队列待推；verify_v25_0_69 68/68 |
| OLD_TOOLS_REGRESSION | **VERIFIED** | 八字（2000-01-01 戊午锚点+立春边界双测）/紫微/奇门/中医算法净室对拍 42/42；老 SEO 18 页+矩阵 8 抽查全在位 |

**SEO 增长引擎模块（2026-08-31 v25.0.69 批次口径）**：

| 模块 | 状态 | 证据 |
|------|------|------|
| SEO_LANDING_PAGES | **VERIFIED** | 18个C端差异化关键词页+1个B端方案页+4目录索引（v25.0.69 增四工具集群页：qizheng-siyu/luopan/liji-ruler/luban-ruler，含 toolUrl「网页版在线使用」直链），nginx try_files 直出；公网 verify_v25_0_69 68/68 PASS |
| SEO_PIPELINE | **VERIFIED** | 配置唯一源 seoPagesConfig.json + 生成器 generateSeoPages.js（toolUrl 字段支持）+ 质量门禁 seoQualityGate.js（222项 PASS，SUPP-01 三项强制+扩展校验） |
| SEO_COMPLIANCE | **VERIFIED** | 每页 ICP 备案悬挂+工信部链接+免责声明+canonical+JSON-LD；描述全部基于 APP 真实能力（四工具含 WMM2025/二十八宿/洞微大限/双尺合参真实锚定） |
| ROBOTS_SITEMAP | **VERIFIED** | robots.txt 指向 sitemap；sitemap.xml 28 URL（6主站+18落地页+4目录），公网实测 |
| SEARCH_SUBMIT | **VERIFIED**（文件层+API层） | 国学站+主站 www.yandao.vip 验证文件公网可访问（双持久目录+nginx 精确 location；头条按真实文件名 ByteDanceVerify.html 双文件名部署）；平台侧「完成验证」点击与 sitemap 提交待 Owner；IndexNow 四工具批次 10 URL HTTP 200 受理（indexnow_push_local.cjs）；百度队列头部已插四新页，次日 09:10 cron 自动推 |
| TOOL_MATRIX_SSOT | **VERIFIED** | 后端 DEFAULT_MATRIX 登记四工具 qizheng/compass/liji/luban 全部 FREE/ON（矩阵总数 27），`/api/public/tool-matrix` 公网实证，SEO「免费」口径单一事实源 |

## 27. 当前已知 PARTIAL

1. **OFFSITE_BACKUP**：腾讯云基础设施层快照能力可用（轻量服务器系统盘快照），但 COS 应用层异地同步未配置（coscmd 装了但 `/root/.cos.conf` 缺失）。P0 优先：在腾讯云控制台开启自动快照策略（每日，保留 7 天）+ 跨地域复制（北京→上海）。完整操作清单见 `docs/TENCENT_CLOUD_PROTECTION_CHECKLIST.md`。
2. **ANDROID 真机**：开发环境无 Android 物理设备（DEVICE_UNAVAILABLE），真机下载→安装→登录→AI→社交全链路待项目方执行（服务端已三重验证 APK）。
3. **SHARE 真机**：排盘→分享→Share Sheet→微信/QQ→接收→注册→归因，真机链路未验。
4. **iOS**：PLA 未签。
5. **COMMENT**：见 §26。
6. **hy3 极限场景**：5000+ 字提示词可能推理耗尽 8192 token（已有明确报错不扣额）；根治靠流式改造或提示词瘦身，**禁止堆 max_tokens**。
7. **`/api/sync` 404 噪音**：旧 APK 调用不存在的端点（8/26 32 次），无功能影响；新版已无此调用。
8. **AI Fair Usage + Cost Center 第一阶段**：已生产部署（33 PASS 隔离测试 + 后端/前端 v25.0.65 同批上线 + DB 幂等迁移）。遗留：模型价格表仍 `ESTIMATED` 待按混元/DeepSeek 真实账单校准后，Partner 结算方可从 ESTIMATED 转 FINALIZED。

## 28. 当前 NOT_IMPLEMENTED / 已消化（如实，禁止为全绿临时新增）

1. ~~评论层级回复~~ / ~~评论删除~~ / ~~社交频率保护~~ / ~~Provider 后端~~ / ~~Offline / Question Factory~~ / ~~双身份自动结算~~ —— **以上 6 项已于 MASTER-05（2026-08-30）全部完成并生产上线**，见 §26 新模块矩阵与总账 12.20。
2. 动态图片端到端验收（API 支持 posts.images ≤9 张，未做真实上传验收）——剩余。
3. QF 语义去重（Semantic）：**PARTIAL 如实**——Embedding 能力未稳定接入，仅 Exact+Structural 生效，未假装实现。

## 29. 当前风险（按优先级）

1. **单机单盘**：全部数据在一台腾讯云北京轻量服务器；**腾讯云快照是性价比最高的第一道防线**（控制台开启自动快照策略，3 分钟搞定）。COS 异地同步是第二道防线（需提供 API 密钥后开通，MASTER-05 adapter+dry-run 已备）。完整方案见 `docs/TENCENT_CLOUD_PROTECTION_CHECKLIST.md`。
2. **旧 APK 用户 AI 不可用**：≤2058 版不带 token 被 401；观测影响 1-2 台设备；升级 latest.apk 即恢复——**推广前应引导存量用户升级**。
3. ~~无社交限频~~ **已消化**：MASTER-05 六类接口限频已上线（好友申请 10/时、私聊 30/分、群聊 30/分、动态 6/10分、评论 20/10分、举报 10/时；后台可调）。
4. **服务器直连 GitHub 不稳**：发布依赖本地推送 + bundle 中转，流程勿改（见 §30）。
5. PM2 累计重启 204 次（历史累计，unstable_restarts=0，当前稳定无 error）。
6. **PowerShell→SSH 引号剥离坑**（本轮实测确诊）：Windows PowerShell 经 ssh 传双引号命令时引号被剥离，`Authorization: Bearer` header 变空值——**生产鉴权本身正常**；后续远程 curl 验证一律写 .sh 脚本上传执行（verify_modules3.sh 模式），勿内联。

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
## 2026-10-04 交接增量：v25.0.97

- 版本：Web v25.0.97、Android 2084、iOS build 5；生产当前仍为 v25.0.96。
- 已完成：本机中文听学、安全 AI 富文本、学习类目与标签、两张真实签名链接海报、活动/Partner 兼容、COS 私有学习包架构与后台发布门禁。
- 可安全导出：中医 1348 知识点/1698 题，易学 2048 知识点/2228 题；仅取 APPROVED/PUBLISHED。
- 验证：Web 185 页；离线 76/0；佣金 121/0。
- 阻塞：生产后端尚无 COS 四项环境变量；Android 本机无 Java 21，需 Codemagic 构建后真机验收；听学宣传保持关闭。
- 完整报告：`docs/reports/20261004_v25.0.97_学习听学对象存储与传播接入报告.md`。

## 39. 2026-10-07 增量：v25.0.106 紫微联动与排盘历史专项修复

- 源码提交：`302bc35`，仅修改紫微页面、公共日期/地点历史链、排盘本地存储及版本/构建门禁；未修改排盘算法核心、学习、营销、价格、支付或会员权益。
- 紫微联动：用户点击大运后，从现有引擎读取该大运流年序列，首项立即选中并滚到列表开头；流月、流日、流时旧状态清空。历史恢复使用独立路径，不被“大运初始化”覆盖。生产样本大运起始 35 岁，首个流年 35 岁/2024 年，切换往返一致。
- 历史记录：公共记录 schemaVersion=2 保存原始日期时分、输入历法、性别、出生地省市区快照/地区键、经纬度/坐标来源、时区/UTC 偏移、早晚子时、夏令时、真太阳时、校正说明和工具原有专用参数；紫微另保存计算时刻、结构化结果快照和本命/大运/流年/月/日/时及三合/飞星查看状态。旧记录缺地点时明确要求补充，不默填北京。未登录用户本地保存/导入恢复。
- 布局：紫微专属 4×4 宫格纵向收紧约 10%，未修改全局样式、宫位顺序、星曜内容或点击逻辑。360×800、390×844、412×915 均完成流年→流月→流日→流时和三合/飞星真实点击。
- Web：`v25.0.106_D20261007` 已原子切换至 `/root/yandaoguoxue/releases/v25.0.106`，公网三视口 E2E 通过。
- Android：`25.0.106` / versionCode `2093`，GitHub Actions run `37615244927` 成功；包名 `com.yandao.guoxue`；签名 SHA-256 `8ca0c414573d4b05fc2bd1ba9c6a2a8090c90c58e3815119494607443dc6d5a0`；APK SHA-256 `911d2bd1f891f4d1d7525b250ff6102c02d0143406debc4fec70d15d9315656c`，大小 26,143,349 字节。唯一入口 `https://yandaoguoxue.yandao.vip/app-download/latest.apk`（301 到对象存储分发域后 200，内容与正式包哈希一致）。
- 生产升级接口：`latestVersion=25.0.106`、`latestVersionCode=2093`、`forceUpdate=true`；旧配置已生成 `pre-25.0.106-*` 备份。
- 证据：`docs/reports/assets/ziwei_fix_03/`（三尺寸修前/修后图、本地及生产 E2E JSON、旧记录缺地点测试）。
- 未完成/限制：本轮未检测到 ADB 设备，因此“正式 APK 已包含修复、已公开分发”已验证，物理手机覆盖安装与触控回归标记 `NOT_TESTED`；云端会员跨设备同步未在测试账号执行，标记 `NOT_TESTED`。其余工具仅验证公共字段保存链未做逐工具真机往返，不宣称全量真机通过。
## 40. 2026-10-07 增量：v25.0.107 紫微大运—流年严格联动

- 根因与修复：页面大运为起运年龄序，引擎大运为宫序；现优先按“起止年龄＋宫位”绑定同一柱，年龄范围次级匹配、干支兜底。点击大运立即重置并选中该运首个流年。
- 显示：选中大运使用品牌紫高亮；流年格直接显示完整年份、干支和虚岁。
- 专项实测：男1982-07-15 12时命例，点击23–32岁大运后流年为23至32岁；十二柱逐柱验证首末年龄、10格数量和首格选中，360/390/412三视口及生产公网全部通过。
- 发布：Web `v25.0.107_D20261007`；Android `25.0.107` / `2094`；GitHub Actions run `37625909881`；APK SHA-256 `02c748febf7dd8ad7aaaec20bfddda0191b50869f7c7e73a3651076bb57f0430`；签名指纹保持 `8ca0c414573d4b05fc2bd1ba9c6a2a8090c90c58e3815119494607443dc6d5a0`。
- 分发：唯一入口 `https://yandaoguoxue.yandao.vip/app-download/latest.apk` 已替换；升级接口为25.0.107/2094且强制更新。
- 限制：收尾时ADB无设备，未完成本版实体机覆盖安装，不将其标为已验收。

## 2026-10-15 接手后交接增量：OPPO权限整改与三产品后台入口

### OPPO隐私安全智护体系反馈

- OPPO邮件针对应用版本号 **2096** 的权限材料审核：未通过项为“写入文件与文档”。审核给出的具体原因是申请截图与实际功能不一致，要求清晰演示视频及权限触发路径。
- 当前候选源码在仓库 `codex/tencent-store-compliance`，HEAD `3b5caa0`，Android `25.0.112 / versionCode 2099`。`android/app/src/main/AndroidManifest.xml` 使用 `tools:node="remove"` 明确移除 `WRITE_EXTERNAL_STORAGE`、`READ_EXTERNAL_STORAGE` 和误带入的设备管理权限。此前 2097 包仍声明过 Android 9 存储权限；2098 期间有移除提交，但不能据此认定 OPPO 实际收到的包已更新。请以提交到 OPPO 的**最终 APK 合并清单**为准复核，不要只看源码声明。
- 该版本不应再申请“写入文件与文档”，因此旧申请的截图/视频不应继续沿用；在 OPPO 权限申请界面删除该项。若平台要求说明，可填：**“当前版本不申请读写用户共享文件权限。用户主动检查更新并选择下载时，由系统下载管理流程处理安装包；应用不扫描、读取或管理用户文档。”** 这段话仅用于说明当前候选版本，提交前应以最终 APK 的权限扫描结果复核。
- 旧包 `25.0.110 / 2097` 位于 `应用商店统一提交包_20261011/01_安装包/`，不能代表 2099。该目录目前没有 2099 的 OPPO 签名 APK；不得把 2097 冒充 2099 上传。Google Play AAB 也不能替代 OPPO 所需的 APK。
- **未完成项**：当前浏览器停在 OPPO 欢太账号登录页，尚未进入开发者控制台；因此未保存权限申请变更或重新提交。也尚未取得/验证 2099 的 OPPO APK。只有在控制台移除该权限、并确认待提交 APK 的最终权限列表后，才可将此项标为完成。只有当最终 APK 仍声明该权限时，才需要补拍真实触发路径视频；不能用截图代替视频，也不能演示不存在的弹窗。

### 后台入口和认证修复（2026-10-15）

- 国学生产后台先前出现 `/admin/` 404：Nginx 精确路由指向不存在的 `software-home.html`。已在生产站点增加三产品选择页 `/admin/software-home.html`，并令 `/admin/` 提供该页；入口分别指向国学 `/admin/login.html`、外语 `https://yandao.vip/xuewaiyu/ai-ops-admin.html`、数字管家 `https://shuziguajia.yandao.vip/pay-admin/`。Nginx 配置备份为 `yandaoguoxue.vip.conf.bak-admin-root-20261015`；`nginx -t` 与 reload 通过。公网验收：`/admin/`、国学登录页均 200，页面含三个产品入口。
- 国学管理页此前登录后空白的根因是登录页把管理员 token/role 存在 `sessionStorage`，后台请求端只读 `localStorage`。已恢复独立登录页并修复两种存储的兼容；生产 release 为 `/root/yandaoguoxue/releases/v25.0.107-admin-session-20261015`，dashboard 和登录页均返回 200。未用自动化代输管理员凭证；最终人工登录仍应由管理员确认。
- 数字管家是广州服务器 `111.230.155.30` 上独立的 Commerce 服务（8791），页面路径 `/pay-admin/`，接口前缀 `/pay-api/`；不要把国学后台 token/key 用于它。生产公网页面与登录接口已做服务端验收，登录接口返回超级管理员角色。密钥和口令不写入交接文档；帐号仍应按独立产品的账号安全制度管理。

### 其他关键状态与交接边界

- Google Play：截至用户提供的 2026-10-14 控制台截图，正式版访问权限已批准，但发布向导尚未走完；因此不能声称 Google Play 已上架。旧封闭测试包与新候选版本应分开处理。详见 §41 的证据级状态及下一步。
- 本次未更改排盘算法、学习内容、商品价格、支付、会员权益或其他产品业务数据。外语后台和数字管家仍使用各自的管理员认证与权限体系。
- 接手人首要动作：①确认 OPPO 控制台权限清单是否已撤掉“写入文件与文档”；②从受控构建渠道取得 25.0.112/2099 的 OPPO APK 并核验包名、签名、versionCode、合并权限；③再提交 OPPO 审核并保存回执；④用管理员本人在三产品入口分别做登录验收。不要把“源码删除权限”写成“OPPO已复审通过”。

## 41. 2026-10-17 增量：Google Play 与国内应用商店状态、接手优先级

本节只记录应用商店事实、证据日期和接手操作，不包含公安机关审核材料。平台状态必须以控制台当前页面和提交回执为准；“开发者账号获准发布”不等于“某个应用版本通过审核”，`上传成功`、`保存草稿`、`测试轨道可用`也都不等于生产版已上架。

### Google Play：逐项区分权限、审核和上架

| 项目 | 已知证据与状态 | 结论 |
|---|---|---|
| Google Play 正式版访问权限 | 用户转发的 Google Play Console 团队通知称，应用 `言道国学`（`com.yandao.guoxue`）的 Production access 申请已批准；控制台截图亦显示正式版权限获批。 | **账号/应用获得正式版发布资格：已批准。** |
| 已批准的具体生产发布版本 | 2026-10-14 用户截图显示，应用列表中的“言道国学”状态为“封闭式测试”、安装用户数 11、更新状态“可以发布”；发布概览显示仅完成 2/5 项任务，创建版本已完成，“预览并确认”“送交 Google 审核”“在 Google Play 中发布”仍未完成。 | **没有证据证明任何生产版已获审或已发布。** “可以发布”是可启动发布流程，不是审核通过。 |
| 当前实时状态 / 商店可搜索性 | 本次接手时桌面浏览器自动化因无法可靠确认页面 URL 而停止；公开搜索未找到可核实的 `com.yandao.guoxue` 商店详情页，直接打开该包名的 Google Play 公开详情地址返回 404。搜索未命中或页面不可抓取仍不能单独证明未上架。 | **截至 2026-10-17 未能实时核实。当前不得声称 Google Play 已审核通过、已发布或已可搜索。** 必须由下一位开发者在已登录 Console 中查看生产轨道及商店详情链接，并保存当前状态证据。 |
| 旧封闭测试版本与新版 | 用户明确要求先将已经完成测试的旧版本推进生产发布，再另行上传新版供审核。旧版 AAB 的实际版本代码、草稿/测试轨道状态以及新版 AAB 的版本代码，须在 Console 和构建产物中逐项核对；聊天截图不足以确认二进制身份。Google 版本需保留用户要求的社交功能，不可误用国内去社交版本。 | **先核实 AAB 文件、包名、签名证书、versionCode、社交功能及 Play Console 轨道；先完成旧测试包生产发布流程，再以新的、更高且未占用的 versionCode 单独建立新版更新。每一步保留 Console 回执。** |

### 国内应用商店：最新已知状态

以下渠道状态由原 `CHANNEL_STATUS_20261011.md`（更新时间 2026-10-11）并结合 2026-10-15 的 OPPO 邮件与 Console 记录合并整理。原状态表已清理；本节是其保留位置。它们不是 2026-10-17 各平台的实时查询结果。

| 渠道 | 最新可证状态 | 关键阻塞 / 接手动作 |
|---|---|---|
| 腾讯应用宝 | 旧提交 `25.0.108 / 2095` 需整改；来自项目交付记录。 | 先读取 Console 当前驳回意见与待办；提交包、资料、平台回执逐项核对后才可重提。不要把资料准备或上传草稿当成已提交。 |
| OPPO | 2026-10-15 邮件显示版本 `2096` 的“写入文件与文档”权限材料审核未通过，原因是申请场景截图与实际功能不符，平台要求真实清晰的视频及权限触发路径。源码候选为 `25.0.112 / 2099`，但尚无证据证明 OPPO 收到该包或已复审。 | 取得签名后的目标 APK；检查 APK 合并 Manifest、包名、签名与版本号；再按真实权限清单修改 Console 申请并提交，保存提交回执。不得用 2097 包替代 2099，也不得声称已复审通过。 |
| 华为 AppGallery | 2026-10-11 渠道表记录 `25.0.109 / 2096` 审核中；缺少之后的终审回执。 | 查看当前审核状态和历史版本；保存审核结果。 |
| vivo | 未形成独立提交回执；此前 OPPO 联盟同步不证明 vivo 已提交。 | 登录 vivo 控制台，确认是否同步为草稿；核对包、资料并独立提交，保存回执。 |
| 小米 | 未形成独立提交回执。 | 登录小米开发者后台核对应用、包名和版本，完成独立提审并保存回执。 |
| 荣耀 | 已知用户曾在开发者平台登录/准备，但无可核验的该版本提交回执。 | 检查应用状态与版本记录；没有回执就按未提交处理。 |
| 应用汇 | 对话中用户报告升级流程第五步图标上传失败，平台要求 PNG；当前仓库记录未证明上传成功或更新提交。 | 准备符合平台尺寸/体积要求的 PNG 图标，在 Console 检查图片预览及保存结果，再核对提交状态。 |
| 360、百度、魅族、三星等 | 2026-10-11 渠道表列为未处理或未核实。 | 先核实平台是否接受企业新应用、账号主体和在架应用状态，再决定是否投入；未经 Console 回执不标“已提交”。 |

### 下一位开发者的商店接手顺序

1. 在 Google Play Console 重新打开 `com.yandao.guoxue`：记录访问资格、生产轨道中每个 release 的状态、最新已提交版本代码、审核状态、国家/地区和商店详情链接。截取包含应用名与状态的证据；若商店详情链接尚未生成或打不开，记录原始错误，不用搜索引擎未命中替代 Console 结论。
2. 对照构建系统/AAB 元数据核验用户所称“已经测试通过的旧包”及新版候选：包名必须为 `com.yandao.guoxue`；比对 versionCode、签名证书指纹、构建来源和社交功能；确认旧包确实在封闭测试中完成测试且可用于生产。严禁仅凭文件名认包。
3. 按用户要求先推进已验证的旧测试 AAB 至生产轨道；逐页完成 Play Console 的预览、确认、审核提交与发布动作，并逐步留存结果。出现必须由账号持有人确认的最后发布动作时，及时请求用户接手；没有成功回执前不要写“已发布”。
4. 旧版发布流程完成后，才以新的、更高且未占用的 versionCode 上传新版并提交审核；确保新版 Google Play 构建包含用户要求的社交功能，并与国内渠道的去社交候选包区分清楚。
5. 国内渠道按上表逐个核对当前 Console；区分“材料已准备、草稿已保存、包已上传、已提交审核、审核通过、已上架”六种状态。将每个阶段的版本号和回执记录进本交接文档对应的下一次增量，不另造互相矛盾的状态总表。
6. 检查营销素材必须来自当前待审 APK 的真实界面，分别按商店的尺寸、格式、文案政策提交。禁用旧“发现/聊天”截图代表无社交版本；Google 版素材和国内版素材不得混用。准备目录见项目资料中的 `营销图片与相关文案`，先核验文件实际存在及版本匹配。

**本次核验结论**：Google 正式版访问资格已由官方通知/截图确认获批；具体生产发布是否审核通过或已在商店上线，当前没有新的 Console 证据，且 2026-10-14 截图显示流程未完成。下一位开发者应先做 §41 第 1 项实时核验，严禁将资格批准写成版本审核通过或已上架。

## 42. 2026-10-17 增量：工作区过期资料与临时产物清理

- 已将原 `CHANNEL_STATUS_20261011.md` 的渠道状态并入 §41 后，删除这份重复旧表；国内渠道历史判断仍保留在 §41，并明确标注其证据日期与非实时属性。
- 清理当前 Codex 工作区内已完成的一次性合规文件/拓扑图生成脚本、旧的后台试验脚本、旧 APK 测试包和旧版本 APK、APK 109 解包目录、PDF/制度文档渲染与 QA 临时目录，以及不再使用的合规预览图。正式 PDF、ZIP、拓扑图及交付目录中的版本说明保留。
- 删除 `docs/reports` 中两份已被当前累计交接报告替代的旧交接副本（2026-08-22、2026-09-23）；其他版本验收、事故处理和安全记录保留，避免丢失仍有追溯价值的历史证据。
- 保留 Google 可能仍需推进生产发布的旧测试 AAB（`work/final-google.aab` 与 `outputs/yandao-guoxue-v25.0.92-google-internal.aab` 内容校验一致，SHA-256 `6757DD4A28B05AB3E38B8A7F66B5ECE6C315791C3AA94220CC1B2FFB5EDF2190`）；保留当前有记录的 `work/yandao-25.0.109.apk`、商店截图证据和所有 Google AAB。清理旧 APK 不代表这些版本曾上架。
- 保留 `docs/reports` 中历史技术验收与事故记录、老版本 AAB、国内商店营销文案、源码归档包、三款软件正式 PDF/ZIP 和最终网络拓扑图，供审计、恢复及后续发布追溯；没有清理 D/E 盘源资料、密钥或生产配置。
- 本次只清理临时与确认过时文件，不改应用源码、服务器状态或商店 Console 数据。下一位接手人仍须按 §41 实时确认 Google Play 与国内商店状态；删除了 APK 副本不影响服务器/应用商店中的版本。
- 已将更新后的同一份 `FINAL_PROJECT_HANDOVER.md` 同步到 E 盘现存的 v25.0.107 核心备份目录；工作区与 E 盘副本 SHA-256 一致。后续仍在本报告续写，不另建交接报告。

## 43. 2026-10-17 增量：交接报告唯一目录与强制更新制度

- 已建立工作区权威交接目录 `C:\Users\ZhuanZ\Documents\Codex\2026-09-20\referenced-chatgpt-conversation-this-is-an\tencent-store-compliance\交接报告\`，权威报告文件名固定为 `FINAL_PROJECT_HANDOVER.md`；制度文件为 `交接报告更新与工作区清理制度.md`。该目录位于实际 Git 仓库内，作为唯一编辑源。
- E 盘固定同步目录为 `E:\八字命理类文档包括排盘方式电子版\言道国学项目归档\交接报告\`。工作区报告是唯一编辑源，E 盘及旧兼容路径是镜像，不允许分别维护或另建“最新/最终2”报告。交付时需用 SHA-256 校验镜像一致。
- 工作区根目录与项目目录已新增 `AGENTS.md` 强制指引；每位开发者开始前必须阅读制度、权威报告、主账本及项目局部指引。工作区根目录的 `交接报告\README.md` 只是入口，不保存第二份报告。每次完成前必须补充有日期的具体变更、绝对路径、验证证据、真实发布状态、未完成事项和清理结果，并同步镜像。
- 制度要求每次收工盘点并清除已完成任务的临时脚本、日志、缓存、解包目录、失败产物、重复报告和过期安装包；保留源码、用户原始资料、密钥/生产配置、正式交付物、有效审核证据和仍在使用/回滚所需的包。D/E 盘用户归档与生产数据不得被默认当作可清理临时文件。
- 本次建立的是项目作业制度与路径指引；后续开发须按该制度执行。若报告或镜像同步失败，任务必须标为未完成，不得只作口头承诺。

## 44. 2026-10-17 增量：荣耀拒审接手核查（待取得本次拒审原文）

- 用户报告荣耀已拒绝上架，要求认真核查功能问题并突出中医与学习。此为用户提供的新状态，覆盖 §41 荣耀“无提交回执”的历史判断；被拒版本、拒审原文、问题截图、规则编号及控制台当前状态尚未取得，不将推测记为平台原话。
- 接手仓库绝对路径：`C:\Users\ZhuanZ\Documents\Codex\2026-09-20\referenced-chatgpt-conversation-this-is-an\tencent-store-compliance`，分支 `codex/tencent-store-compliance`，HEAD `3b5caa0`。已有未提交交接、台账、旧报告删除及 AGENTS.md 变更，未覆盖或回滚。候选源码 package.json 为 v25.0.112；E 盘荣耀填写表仍指向25.0.110/2097，不能据此确认荣耀实际拒审包。
- 官方依据：2026-10-17 搜索核对荣耀《不收录应用类型》https://developer.honor.com/cn/doc/guides/101536 ，官方搜索索引明确列出含算命、占卜、打卦或风水等封建迷信内容的应用。正文为动态页面，本次直接抓取仅返回页面壳；结论来自该官方页面的搜索索引，仍需对照本次拒审原文。
- 代码证据：`src/lib/releaseFeatures.ts` 只为 google/tencent 定义既有差异，尚无荣耀学习版；`src/lib/platformGate.ts` 与 `backend_deploy/platformFeatureGate.js` 的 Android 预测类能力仍开启；`src/app/HomePage.tsx` 首页保留易学排盘入口、八字个性化养生与出行建议；`src/app/page.tsx` 的服务端导航仍展示排盘及风水工具，不能仅改首页可见按钮；`src/lib/toolNavData.ts` 仍含称骨算命、合婚、风水罗盘、号码解析等功能说明。将这些能力改称学习而保留原行为，不能作为整改完成证据。
- 另需核查：`src/app/zhongyi/page.tsx` 辨证学入口含“智能问诊”，学堂首页有“电子证书认证”措辞；突出中医学习应同步明确知识查询、练习与实际诊疗/执业资格的边界。此处仅记录现存措辞，尚未完成逐功能医疗内容审核。
- 本次已准备用户可查看的荣耀学习方向文案与整改清单：`C:\Users\ZhuanZ\Documents\Codex\2026-10-17\e-c-users-zhuanz-documents-codex\outputs\荣耀整改核查与学习介绍草稿_20261017.txt`。该文件为待核实草稿，不能当作已实施功能说明上传；未创建竞争交接报告。没有修改应用源码、APK、服务器、远程开关或任何商店资料；没有发送申诉或提审。
- 下一步：用户提供荣耀完整拒审原文/被拒版本，或可访问的已登录控制台后，逐项对照问题，确定永久面向全部荣耀用户的实际学习功能范围；如采用学习版，必须同时处理导航、直接URL、离线算法入口、AI、历史记录、后台接口、营销与自更新跳转，禁止审核后恢复被移除能力。保留其他渠道既有产品差异，不能把Google包误改为国内版。
- 验证：起始权威报告与E盘报告SHA-256一致（B3C938E89775E9FFEFDC078F243BEAD6347B1A19ACE679D049FAD2F796586D0E）；本轮仅文档核查，无源码修改，未构建或真机验证。当前可访问浏览器清单无荣耀控制台标签，因此未实时读取拒审详情。
- 清理：本轮没有生成临时脚本、日志、解包目录、缓存或安装包；仅保留上述正式核查草稿与累计记录。用户原始资料、源码、有效审核证据和已有待提审包均保留。
- 发布状态：用户报告“荣耀拒审”，具体版本/原因待核实；本轮未重新提交，未审核通过、未上架，功能整改任务尚未完成。同步方式为将本权威报告复制到E盘固定目录与两处兼容镜像，再计算四份SHA-256；具体哈希由本轮工具结果验证，避免在被校验文件中写入自身哈希造成循环。

## 45. 2026-10-17 增量：荣耀“功能简单”真实回执整改与OPPO联盟原记录恢复

### 回执与实时事实（覆盖§44的待核实假设）

- 用户提供荣耀邮件原文：2026-10-11 13:12:26从OPPO开放平台提交的“言道国学”未通过荣耀上架审核，明确意见为“应用内容/功能简单，平台暂不收录此类应用，请丰富内容及功能并提供差异化、高质量体验”；测试环境为Wi-Fi、Magic6、Magic OS 10.0、中文。该邮件没有给出具体版本号，不能据提交日期擅自匹配2097/2098；本次拒审未提及迷信违规。§44关于迷信的内容是原文到达前的风险核查，不能当作此次官方拒审原因。
- 用户完成OPPO登录后，实际进入企业移动应用列表：共有“言道国学”和“言道学外语”两项；国学仍存在，包名`com.yandao.guoxue`、OPPO appid `37853023`，当时最新审核记录为25.0.111/2098、不通过。学外语1.0.6显示上线，本轮未编辑学外语。
- OPPO当前版本另有独立驳回原因：应用介绍、版本说明是面向用户的内容，给审核人员的反馈应移到审核补充说明。不能将这条OPPO意见与荣耀的“内容/功能简单”混为同一条回执。
- 入口：`https://open.oppomobile.com/new/mcom/app/detail?app_id=37853023&pkg_symbol=0`。更新页刷新会先显示旧审核版本，稍后弹出“检测到已保存草稿内容，是否加载草稿？”；必须选“是”后核验，不能用加载草稿前的2098界面判断保存失败。本轮核验时曾过早读取旧版本并产生了额外恢复/重传，已明确纠正流程；具体最终状态见本节末尾。

### 真实功能变更与源文件

代码提交：`1d8098d`（学习入门和入口）→`a83fe4b`（中药索引与风险标签修正），已推送既有分支`codex/tencent-store-compliance`，未覆盖此前用户未提交的交接、制度、AGENTS.md及旧报告删除。源码基目录为`C:\Users\ZhuanZ\Documents\Codex\2026-09-20\referenced-chatgpt-conversation-this-is-an\tencent-store-compliance\`。

新增或修改文件绝对路径：

- `C:\Users\ZhuanZ\Documents\Codex\2026-09-20\referenced-chatgpt-conversation-this-is-an\tencent-store-compliance\src\data\studyStarter.ts`：4节原创资料阅读方法入门课、8道即时自测、解析、持久化schema与异常记录过滤。不包含个人诊断、处方或治疗操作指导，不将原创说明伪称古籍原文。
- `C:\Users\ZhuanZ\Documents\Codex\2026-09-20\referenced-chatgpt-conversation-this-is-an\tencent-store-compliance\src\app\academy\start\page.tsx`和`C:\Users\ZhuanZ\Documents\Codex\2026-09-20\referenced-chatgpt-conversation-this-is-an\tencent-store-compliance\src\app\academy\start\layout.tsx`：无需登录的阅读、自测、答案解析、错题重练、全部完成提示及本机进度恢复；存储失败时明确提示，避免声称已经保存或云同步。
- `C:\Users\ZhuanZ\Documents\Codex\2026-09-20\referenced-chatgpt-conversation-this-is-an\tencent-store-compliance\src\components\LearningEntryPanel.tsx`：首页和学堂共用的中医/经典学习入口，直接进入典籍、中药、方剂、经络穴位，以及进阶知识、章节题库和账号错题本。
- `C:\Users\ZhuanZ\Documents\Codex\2026-09-20\referenced-chatgpt-conversation-this-is-an\tencent-store-compliance\src\app\HomePage.tsx`：学习面板置于公告后；学堂入口文案改为经典阅读、章节练习、错题复习，不再用“电子证书认证”作为此处宣传。
- `C:\Users\ZhuanZ\Documents\Codex\2026-09-20\referenced-chatgpt-conversation-this-is-an\tencent-store-compliance\src\app\academy\page.tsx`：仅学堂目录移除进入即弹登录的守卫；账号题库、个人记录和权益校验仍按原规则。入门课游客体验不依赖云端题库。
- `C:\Users\ZhuanZ\Documents\Codex\2026-09-20\referenced-chatgpt-conversation-this-is-an\tencent-store-compliance\src\app\academy\layout.tsx`：补充入门课导航，区分本机进度和账号学习记录，不再把入门记录说成跨设备同步。
- `C:\Users\ZhuanZ\Documents\Codex\2026-09-20\referenced-chatgpt-conversation-this-is-an\tencent-store-compliance\src\app\academy\question-bank\page.tsx`：识别合法的`?track=`科目参数，修复中医题库直达仍停留所有科目的入口问题。
- `C:\Users\ZhuanZ\Documents\Codex\2026-09-20\referenced-chatgpt-conversation-this-is-an\tencent-store-compliance\src\app\books\page.tsx`：修复可选离线包为空的TypeScript错误，加载失败保留内置目录，避免未处理的异步异常。
- `C:\Users\ZhuanZ\Documents\Codex\2026-09-20\referenced-chatgpt-conversation-this-is-an\tencent-store-compliance\src\algorithm-core\modules\tcm\herbs.ts`：不再根据禁忌中的任意“毒”字推导药物有毒；仅转述性味栏明确毒性词。功效推断“药物分类”改为原资料中实际出现的文字索引，不编造药物类别。
- `C:\Users\ZhuanZ\Documents\Codex\2026-09-20\referenced-chatgpt-conversation-this-is-an\tencent-store-compliance\src\app\zhongyi\herb\page.tsx`：注明“资料词索引并非药物分类”，风险标签注明原资料来源，并明确没有标签不等于安全，不能据此自行用药。
- `C:\Users\ZhuanZ\Documents\Codex\2026-09-20\referenced-chatgpt-conversation-this-is-an\tencent-store-compliance\package.json`、`C:\Users\ZhuanZ\Documents\Codex\2026-09-20\referenced-chatgpt-conversation-this-is-an\tencent-store-compliance\package-lock.json`、`C:\Users\ZhuanZ\Documents\Codex\2026-09-20\referenced-chatgpt-conversation-this-is-an\tencent-store-compliance\android\app\build.gradle`、`C:\Users\ZhuanZ\Documents\Codex\2026-09-20\referenced-chatgpt-conversation-this-is-an\tencent-store-compliance\.github\workflows\android-build.yml`：最终版本25.0.114/2101，云构建检查入门页与错题功能进入内置资源。中间25.0.113/2100因补修风险标签已作废，不能替代最终2101。

本轮保留现有传统文化/排盘工具，不宣称已永久移除预测与风水能力。没有修改排盘计算、支付、会员权益、Google渠道开关、生产Web、升级接口或其他产品。突出学习不等于已完成其他内容政策的全量审查。

### 构建、验证与交付证据

- 最终云构建成功：`https://github.com/wzmpa18/minglizyi/actions/runs/39028350585`，提交`a83fe4b`，国内构建沿用`tencent`配置（公开社交与公共AI入口关闭），不用于Google Play社交版。
- APK：`C:\Users\ZhuanZ\Documents\Codex\2026-10-17\e-c-users-zhuanz-documents-codex\outputs\荣耀OPPO候选包_25.0.114_2101\app-release.apk`，25,442,965字节，包名com.yandao.guoxue，25.0.114/2101，targetSdk36。
- APK SHA-256：`ECFF45D6EEBE0DC7752CF97DEC37CE3DD9F56D514BEEE17CDFE07926BA3EF245`；apksigner验签通过，正式证书SHA-256保持`8ca0c414573d4b05fc2bd1ba9c6a2a8090c90c58e3815119494607443dc6d5a0`。
- 最终合并权限为INTERNET、ACCESS_NETWORK_STATE及应用自身DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION；无共享存储读写权限。内置app-native.json为2101/25.0.114，Capacitor无server.url，入门页已进入APK。
- 全项目`tsc --noEmit --incremental false`通过；入门数据唯一性、答案范围、异常JSON、未知ID、越界答案、已读去重通过；中药回归验证禁忌提“热毒”不触发“有毒”、性味明确毒性词保留、索引词均来自原功效文字。ESLint因仓库缺少eslint.config文件不可运行，不标为通过。
- 页面实测：游客阅读、标记已读、错答、解析、错题重练、答对移出、4课8题完成及刷新恢复通过；最终APK内置资源再次复测首页直达、错题流程、进度恢复和风险标签修复。ADB无设备，未做实体机覆盖安装或Magic6/Magic OS10回归；不把浏览器渲染说成真机验收。550条原始中药资料未逐条专业审校。
- 用户提供的荣耀回执保存于`C:\Users\ZhuanZ\Documents\Codex\2026-10-17\e-c-users-zhuanz-documents-codex\outputs\荣耀审核回执原文_用户提供_20261017.txt`。
- 填写文案沿用并改正原草稿：`C:\Users\ZhuanZ\Documents\Codex\2026-10-17\e-c-users-zhuanz-documents-codex\outputs\荣耀整改核查与学习介绍草稿_20261017.txt`，如实保留现有工具范围，不再以迷信作为本次官方拒审原因。应用介绍、版本说明与审核补充说明分栏；不在公共文案或本交接中记录测试密码。
- 候选目录内`验证记录.json`、`安装包与验证说明.txt`记录验证边界。`商店截图\`有5张1080×1920、各小于1MB的PNG，来自最终APK内置资源的实际渲染，仅裁切内容区域、转换尺寸/色板，未虚构界面或叠加手机框；并非实体机截图。
- OPPO原应用记录证据为`C:\Users\ZhuanZ\Documents\Codex\2026-10-17\e-c-users-zhuanz-documents-codex\outputs\OPPO应用记录_整改前.jpg`；最终进度恢复证据为同一outputs目录的`入门学习_最终包进度恢复.jpg`与`入门学习_最终包全页.jpg`。旧商店图片引用保存为`商店原截图引用_整改前.json`，供恢复，不删除平台历史对象。
- 正式候选包、5张截图、验证说明、文案及原回执已复制到`E:\八字命理类文档包括排盘方式电子版\言道国学项目归档\发布包\国内商店\20261017_25.0.114_2101_学习整改\`；包目录内文件与E盘对应文件逐一SHA-256一致。

### 清理与未完成边界

- 本地验证服务已停止，自动生成的next-env.d.ts开发路径已恢复。源码、用户资料、原审核证据、原正式包及E盘用户归档均保留。
- 清理本轮临时日志、复制的APK校验文件、解包资源、图片处理临时文件、.next/dev缓存和作废2100包时，自动审批返回`blocked by policy`，未提供更细原因；使用已核实绝对路径重试，以及单个日志文件的缩小范围删除，仍被拦截。没有换工具绕过，不声称已清理。临时文件仍在本轮工作区work目录及项目.next/dev；作废2100目录已加`已作废勿上传.txt`，不能作为最终交付包使用。**收尾清理仍未完成，本次整体任务不能标为全部完成。**
- 本次未发送客服邮件、申诉、聊天或其他对外消息。荣耀同步涉及接受服务协议及向荣耀提供平台要求的开发者/联系人信息，须取得账号持有人对这些具体事项的当场确认后才能勾选并提交。未提交前不写“已重审”；提交后仍需等待平台结论。
- 权威报告与E盘固定镜像及两处兼容镜像在本轮收尾同步；具体SHA-256由最终工具校验结果记录，避免将文件自身哈希写进自身造成循环。

### 实时收尾状态（2026-10-17，等待荣耀同步协议确认）

- 最终APK25.0.114/2101已上传至OPPO原应用更新表单。应用介绍、111字版本说明、207字审核补充说明与5张新截图已保存。
- 已重新打开更新页，等待“是否加载草稿”弹窗，点击“是”并等待异步加载完成后复核：包名com.yandao.guoxue、25.0.114/2101、24.26MB；介绍包含无需登录入门课，版本说明包含资料风险标签修复；5张截图与原素材URL全部不同且均为1080×1920，审核说明保存了“开始入门学习”完整路径。不能在点击“是”后立即读取旧字段，须等待加载结果再核验。
- 平台核验证据：`C:\Users\ZhuanZ\Documents\Codex\2026-10-17\e-c-users-zhuanz-documents-codex\outputs\OPPO最终2101草稿_加载核验.jpg`；同步确认页：`C:\Users\ZhuanZ\Documents\Codex\2026-10-17\e-c-users-zhuanz-documents-codex\outputs\荣耀联盟同步_待确认.jpg`。
- 当前荣耀同步及个人信息授权项未勾选，尚未点击“提交审核”。需用户当场确认接受页面列明的荣耀开发者服务协议、Distribution Connect服务协议及个人信息使用授权/三方服务说明，并允许将本次应用资料与平台要求的开发者/联系人信息同步至荣耀。收到确认后才能勾选并提交；未获确认不替用户接受协议。
- **发布事实：新版已构建、已上传、草稿已保存并核验；未重新提交审核，未过审、未上架。** 源码和材料阶段完成；平台提交与自动审批阻塞的清理仍未完成。后续状态继续追加本节，不另开报告。

### 实时提审回执（2026-10-17 21:08:15 +09:00）

- 用户当场明确答复“同意同步并提审”，授权25.0.114/2101安装包、商店资料和平台要求的开发者/联系人信息同步荣耀，接受此前列明的四项协议/授权，沿用审核后立即发布。已勾选荣耀及个人信息使用授权/三方服务说明，未勾选vivo或小米。
- 首次点击提交时平台提示“请上传包”：草稿虽显示2101元数据，实际包绑定未满足正式校验。重新上传最终app-release.apk，等待进度完成并解析为com.yandao.guoxue、25.0.114/2101、24.26MB、targetSdk36后，再次提交；对已完成的公开介绍整改提示点击确认。
- 平台返回“提交成功，预计审核时长1-2个工作日”；关闭回执后应用列表显示“言道国学 / 25.0.114 / 审核中”。这是OPPO正式接收且选择荣耀同步的证据，尚无荣耀独立接收/受理回执，不能宣称荣耀已过审或已上架。新版未过审、未发布。
- 证据：C:\Users\ZhuanZ\Documents\Codex\2026-10-17\e-c-users-zhuanz-documents-codex\outputs\OPPO荣耀同步_提交成功.jpg；C:\Users\ZhuanZ\Documents\Codex\2026-10-17\e-c-users-zhuanz-documents-codex\outputs\言道国学25.0.114_审核中.jpg。最终包SHA-256重新核对为ECFF45D6EEBE0DC7752CF97DEC37CE3DD9F56D514BEEE17CDFE07926BA3EF245。
- 本轮未修改源码或重建，沿用已验证2101学习整改包；git diff --check通过。报告、验证记录与上述回执同步E盘后核对SHA-256。未完成事项：平台审核/荣耀独立回执、Magic6实体机验证及此前被自动审批以blocked by policy拦截的临时文件/旧包清理。未再次尝试绕过清理拦截。

## 46. 2026-10-17 增量：Google Play正式上架实时核实

- 用户要求核实谷歌是否发布，未发布则处理。本次复用已登录Google Play Console，开发者“创世纪”，应用com.yandao.guoxue；仅查询，未修改商店资料、送审、发布、上传包或切换轨道，也未使用国内2101包替代Google版本。
- 生产轨道版本列表与2081详情明确显示：25.0.94 / 2081“已在Google Play上架”，页面发布时间10月17日21:26，正式版、已面向19,299款设备发布。测试和发布总览显示2081正式版发布比例100%；生产轨道178个国家/地区（非逐国可用性验证）。这覆盖§41此前无法核实的历史状态；本轮没有执行此次发布，不冒领发布操作。
- 公开地址 https://play.google.com/store/apps/details?id=com.yandao.guoxue 实际打开“言道国学 - Google Play上的应用”，开发者创世纪、显示“在更多设备上安装”及“在您的设备上可以使用此应用”；当前日本/简体中文账号环境可见。未执行安装，不声称所有国家或所有设备均可见。
- 另有生产更新25.0.112 / 2099在发布概览显示“尚未提交送审的更改 / 开始全面发布”。这不是已上架2099，也不影响2081已正式发布。用户本次条件为未发布才处理，因此本轮不额外送审该更新；后续更新需核实Google社交版构建与数据安全声明。公开页目前声明不收集/不分享数据，同时标注用户互动；本轮未完成对实际账号/社交数据流的一致性审核，不推定声明正确。
- 正式证据：C:\Users\ZhuanZ\Documents\Codex\2026-10-17\e-c-users-zhuanz-documents-codex\outputs\GooglePlay_2081正式上架_20261017.jpg；同目录GooglePlay_公开商店可安装_20261017.jpg。Console详情：https://play.google.com/console/u/0/developers/8539674148718133275/app/4973402841775693769/tracks/4698246885314028199/releases/2/details 。
- 本轮仅更新本权威报告与C:\Users\ZhuanZ\Documents\Codex\2026-09-20\referenced-chatgpt-conversation-this-is-an\tencent-store-compliance\PROJECT_MASTER_LEDGER.md，保存两张有效发布证据并归档E盘发布包/GooglePlay/20261017_2081正式发布核实。未改源码、服务器、安装包，无需重新构建；git diff --check通过。没有创建临时脚本、日志、缓存或新安装包，两张有效证据保留；上一轮被自动审批拦截的临时文件/旧包清理仍未完成，本轮未绕过拦截。
- 权威报告同步到E盘固定镜像、项目旧路径兼容镜像和E盘核心备份镜像，四份SHA-256核对一致；两张证据源/E盘副本逐一SHA-256核对一致。Google已发布核实目标已满足，后续2099送审及历史清理不标为完成。

## 47. 2026-10-17 增量：用户收窄为国学清理、停止外语与新增提审

- 用户最初要求清理国学并将国学最新Google包及学外语提审，随后明确停止学外语，交由其开发者处理，并指示“清理好你的国学项目的垃圾，就可以了”。按最新指令停止新增提审；国学正式资格已解锁，后续更新无需重走首次封闭测试，不能将学外语自身0测试人员/未解锁的要求套给国学。
- 任务收窄前已启动国学Google专用云构建39032983589，25.0.114/2101、源a83fe4b、store_channel=google，Actions成功。首次下载因制品名不匹配未取得文件；实际制品名yandao-guoxue-android-aab。没有上传Google或提交审核，没有改源码。既有Google正式2081和待送审2099状态未变；不能把本次云构建成功说成已更新商店。
- 学外语仅保存Play隐私政策网址和无广告声明；未上传包、未送审、未发布。新启动Codemagic构建6ad36b8fc25bb902c6db1c17收到用户停止指令后已取消，API读回canceled。该项目唯一D盘交接库中的总交接、机器JSON和变更总账已写停止状态，未覆盖其开发者源码/未提交工作。第三款应用完全未操作。
- 本轮精确核对国学待清理三目标：C:\Users\ZhuanZ\Documents\Codex\2026-10-17\e-c-users-zhuanz-documents-codex\work（2194文件/111548943字节）；同任务outputs\荣耀OPPO候选包_25.0.113_2100（2文件/25442879字节）；本项目.next\dev（230文件/162849899字节）。总2426文件/299841721字节，约286MiB。包含本轮复制校验APK、解包、截图中间文件、开发日志/缓存及作废2100包。
- 自动执行审批再次拒绝经绝对路径核对的Remove-Item清理操作，原文blocked by policy，未提供更细原因；命令未执行，三目标仍存在，实际删除0文件。没有更换工具/语言绕过，不能声称已清理完成。可交接精确清单C:\Users\ZhuanZ\Documents\Codex\2026-10-17\e-c-users-zhuanz-documents-codex\outputs\国学待清理清单_20261017.json；此为待删除资产清单，不是第二份交接报告。
- 当前2101正式APK仍在，SHA-256复核ECFF45D6EEBE0DC7752CF97DEC37CE3DD9F56D514BEEE17CDFE07926BA3EF245；源码、正式交付物、有效审核证据、必要回滚、Google旧测试AAB、他人任务资料与D/E归档均保留。既有预览服务已停止；本轮未生成新临时脚本/日志/安装包。其他历史work内容含参考资料、正式AAB和可能仍需回滚的产物，未因泛称垃圾擅自删除。
- 验证：清理列表JSON可解析，目标路径仍存在（阻塞事实），正式包哈希正确；git diff --check通过。更新PROJECT_MASTER_LEDGER.md及本权威报告并同步三镜像，四份SHA-256一致；清单同步E盘后哈希一致。当前任务状态：清理受自动审批阻塞，未完成；不承诺已释放磁盘空间，不把用户授权当成执行成功。

## 48. 2026-10-18 增量：再次清理执行被拦截

- 用户要求立即彻底清理本聊天工作区，释放C盘空间。再次阅读项目入口/制度/报告/主账本，沿用§47已核实的三处临时清理目标；未扩大到他人项目或用户归档。
- 使用PowerShell原生Remove-Item，执行前包含绝对路径解析与目录联接检查，但自动执行审批在进程创建前拒绝，返回blocked by policy，无进一步原因。命令未执行，实际删除0文件、未释放空间；未切换工具绕过。不宣称清理完成。
- 本次起始C盘可用7589146624字节（约7.07GiB）；§47待清理目标上次实测合计299841721字节（约286MiB），本次未重新统计其大小，不能把上次大小当本次释放量。源码、当前2101提审包及有效审核证据没有删除；没有变更源码、构建、部署、商店或外语项目。
- 本轮只追加本权威报告和PROJECT_MASTER_LEDGER.md，没有新建临时脚本、日志或重复报告。用户可在资源管理器手动删除§47三处精确目录以处理执行限制；此处仅记录阻塞，不将手动操作记成已完成。权威报告与三处镜像同步并核对SHA-256一致；git diff --check结果由工具校验。

## 49. 2026-10-18：完整盘点及用户手动CMD清理交付

- 用户要求完整盘点并给本人CMD执行的删除命令。已只读核实本任务与国学三个源码副本，共16目录+3缓存文件、284444文件、7393524207字节（约7.39GB/6.89GiB）。前述286MiB仅是任务临时物及开发缓存子目录，并非全部。
- 完整逐目录绝对路径/大小清单：C:\Users\ZhuanZ\Documents\Codex\2026-10-17\e-c-users-zhuanz-documents-codex\outputs\国学CMD清理清单_20261018.json。用户请求的命令文件同目录guoxue-clean-20261018.cmd，CP936编码，固定绝对路径rd /s /q及del /f /q；未由代理执行，不宣称已经释放空间。
- 清理范围：当前tencent-store-compliance的node_modules、.next、out、www、android/app/build、android/.gradle；旧97副本相同存在目录及.gradle-home/.gradle-home-2；旧03副本.next/out；本任务work/作废2100包；三个tsbuildinfo。03副本node_modules为目录联接，已排除。各副本候选目录git ls-files均0；97副本存在未提交源码，整副本保留。
- 不含源码/.git/密钥/生产配置/当前2101正式包/有效审核回执/其他产品/全局SDK及用途不明的历史证据。2101哈希复核ECFF45D6EEBE0DC7752CF97DEC37CE3DD9F56D514BEEE17CDFE07926BA3EF245。没有操作商店、服务器或构建。
- 命令执行后逐目录检查残留，显示FAILED则未删净；本地再构建需重新安装依赖。待用户执行后核对实际空间，目前删除0文件。未生成新的临时脚本或日志，仅保留正式清理命令和清单。
- 更新主账本，权威报告同步三镜像，四份SHA-256一致；git diff --check通过。

## 50. 2026-10-18：未提交改动根因核实、强制提交/清理/两代留存制度

- 用户明确授权加强制度：每次必须清理和提交，失败/无用临时物与指令清除，物理版本永远只留一份新版和一个旧版，新版验证正常后删除更老版本。本次已写入同目录《交接报告更新与工作区清理制度.md》第七节，并写入活动仓AGENTS.md入口；覆盖原本允许模糊“有追溯价值”无限保留旧包的宽泛做法，保留法定证据与密钥，物理备份数量按渠道实际不可互换的版本集合计算，不能各磁盘重复计数。
- 事实纠正：当前活动仓a83fe4b的功能源码已提交并推送；当前脏改动主要是累计交接/主账本、未跟踪强制制度入口、两个已清理旧报告的删除记录，不能说成“新功能代码一直没提交”。本轮审查这些文档改动后集中提交并推送，最终以实际Git读回为准。
- 旧minglizyi-release-v25.0.97为独立旧副本，HEAD7e68819/main；实时status汇总6修改/192删除/22未跟踪项目（目录项并非文件总数）。6修改具体是android/build.gradle（离线仓/依赖约束）、android/capacitor.settings.gradle（生成路径）、next-env.d.ts（开发路由生成路径）、典籍目录审计JSON、两份App Store审核维护脚本。git diff --numstat -- src为空：未发现受跟踪src业务代码差异；22项含两份Gradle缓存、离线资料包、待审语料、图像、旧脚本/报告等，不能一概称垃圾或源码。
- 根因能由证据支持的是：独立旧副本的构建本机改动、生成文件及历史清理删除未形成提交闭环，活动仓又积累了文档未提交；此前缺少对所有副本的结束检查与唯一活动源码约束。Git工作区本身不记录未提交修改者与原因，不能推断责任人或伪造测试结论。上一轮只盘点缓存并保留这些未核实项，未解决历史债务，因此不得宣称全项目零未提交。
- 处置边界：不将97副本的缓存、待审资料、审核脚本和192删除记录无审查全部提交，也不为满足“干净”强行丢弃。历史副本仍待差异审查/有效内容归并/敏感信息检查/必要验证后清除，仅此真实阻塞不能写成已经全部完成。03副本本次受跟踪工作区无改动。物理删除仍须用户执行先前命令后读回，代理删除被blocked by policy拦截的事实不变。
- 规则执行顺序：审查有效差异→测试→更新交接与同步镜像→逐路径暂存并提交推送→核对HEAD/上游和空status→停止任务服务→精确清场→确认当前新版+唯一回滚版→记录已发生结果。清理结果应在最终文档提交前纳入，最后只读核验，禁止靠不断提交后改报告形成循环。
- 本轮未修改功能源码/构建/部署/商店，未删除安装包或唯一语料。新增制度与报告/AGENTS/主账本的具体路径均在活动仓；严格按项目原制度同步E盘报告与制度镜像并校验，git diff --check验证。自动删除限制仍未解除，本次不冒称7.39GB已经释放。

### 清理命令轮换说明（2026-10-18核实后修订）

本节原16目录+3缓存文件、7393524207字节的19个清理目标已经全部核实不存在，详见51节。对应可执行旧命令已从本报告和当前CMD删除，避免以后误用同名新目录；原始逐路径盘点留在outputs/国学CMD清理清单_20261018.json，命令历史可从Git追溯，不再另存重复脚本。唯一仍待执行的4个精确目标及命令见52节，原位文件为outputs/guoxue-clean-20261018.cmd。

## 51. 2026-10-18：清理结果读回、基准应用实机对照及学习首批改进（整体尚未完成）

### 已完成的前序收口与审核事实
- 提交/清理/两代留存制度和累计交接已提交推送c94bcc5，活动仓当时status为空且HEAD/上游差异0/0；不是留在本机的文档。本次后续功能提交也逐次推送，最终状态以本节收尾工具读回为准。
- 对2026-10-18完整清理清单逐项Test-Path复核：16目录和3缓存文件全部不存在。此前已盘点大小7393524207字节约6.89GiB，不能再说清理未执行；也不能把系统总空间增量全归因于这份命令。C盘本轮读回可用22900568064字节约21.3GiB。清理不是本轮代理删除命令执行的，早前blocked by policy是当时真实结果，现已被目标不存在的新证据覆盖。两份既有JSON清单已原位改为已核实不存在，不另起重复报告。
- 用户澄清荣耀最新提示为“已有同版本在入库审查”，不是新的功能简单拒审。重新登录OPPO只读核验：应用25.0.114/2101审核中；版本审核历史只见一条2101记录，平台时间2026-10-17 20:07:32。未撤销、重提、重复同步，也未新增应用。荣耀独立后台任务数量未取得，不能断言荣耀无重复请求；一份OPPO成功回执不足以证明联盟只传送一次。制度追加同版本去重门槛。
- 之前动作回溯：首次提交被“请上传包”校验拦住，重新上传后再确认才有提交成功回执，不能仅按点击次数说“两次成功”。当前保留原审核任务，避免再制造重复。证据outputs/界面对标_20261018/OPPO_2101单条审核记录.jpg。

### 手机对照范围与准确身份
- USB调试已连接华为NAM_AL00，用户授权并解锁；只通过正常前台界面查看，不读取竞品私有数据库/代码、不购买/绕过会员。实见文墨天机基础版2.0.12（包air.com.ziwei001.zwmobilenui），采集三合盘、飞星盘与设置界面；不是已完成专业付费版全功能审计。
- 手机八字包com.zhulu.zhulubazipaipan在实际界面明确显示“问真八字”、设置页版本2.1.6。此前只按包名没识别出来，现以实机界面纠正，不以网站同名应用混淆。使用应用默认1990-01-01匿名样例，关闭保存八字后看专业细盘，没有提交用户真实出生资料或创建命例。
- 可见布局：文墨4×4十二宫围绕2×2中心，星曜竖排，宫名/干支/长生分区，三合/飞星/四化切换，大限/流年横列，常用功能/快捷排盘；问真细盘流年→大运→年/月/日/时柱，藏干/星运/自坐/空亡/纳音，下接大运/流年/流月。尚未完成全部弹层、规则设置、付费功能、六壬参考应用及逐像素一致验收，不能承诺一比一全部完成。
- 有效参考截图只留在用户outputs/界面对标_20261018及E盘发布包/学习与布局核查_20261018，9份文件逐一SHA-256一致；含设备界面，仅作内部核查，不作为本产品商店图或上传公开仓库。

### 实际源码改进（均未部署、未打新包、未提审）
源码根为C:\Users\ZhuanZ\Documents\Codex\2026-09-20\referenced-chatgpt-conversation-this-is-an\tencent-store-compliance\。
- src/app/yixue/ziwei/page.tsx：增加可选“专业大盘”（保持标准盘面默认），盘格纵横比0.74、宽屏放大及盘前飞星/三合/四化/重新排盘快捷入口；现有下方入口与算法保留。飞星视图由仅14主星+禄存扩充到原有辅星/煞星及天空天刑，修复与实见参考盘的信息缺口。未完成新页面实机渲染验收，不能说布局已一模一样。
- src/app/yixue/bazi/page.tsx：详盘增加可选“运年在左”列序，流年/大运排在原四柱之前；流月/流日/流时等原有列仍保留，仅调整展示顺序，不改排盘计算。
- src/data/nanjingOriginal.json：新增独立《难经·八十一难原文》，完整81章顺序/非空校验，来源维基文库固定修订2559517，公开原文/编排许可说明与内容SHA-256 8310e1530c67e71a966f2329bc24069c819124b745aa6da6054e11196e6985a2；排除原页编辑脚注/版权徽标，保留原文繁体。篇章齐备不等于逐字校勘或医学审校，不生成/伪造古籍原文。
- scripts/import_nanjing.py：可维护的标准库来源更新工具，属于正式源码，已审查后明确纳入Git（仓库默认忽略*.py，首次使用精确force-add，不是缓存或临时脚本）。
- src/algorithm-core/modules/tcm/classics.ts与src/app/zhongyi/classic/page.tsx：增量接入新原文版，原有所有书目/链接保留；目录和阅读页区分可追溯原文与含节选/AI整理的旧学习资料，展示来源版本/许可/核验边界。原有单篇听学、书签、搜索和AI辅助不删。
- .github/workflows/study-quality.yml：远程类型与81篇数据检查，避免在刚清理的C盘重新装依赖/产生.next。首次手动dispatch新工作流因默认分支未登记返回404，随后改为相关源文件push自动触发；最终正确实现已推送。功能提交fed133d→98f5c9e→2dfc4b1→159f82c→d2bb9ad→22f20fc；中间Bazi状态作用域错误已在22f20fc修正，最终云检查39091027971成功（tsc及内容检查均通过）。
- 验证边界：没有新APK/AAB、生产Web部署、商店更新或本次新布局的浏览器/手机安装验收。文墨/问真截图仅证明参考界面观察，不能当本产品测试证据。最新商店仍是先前2101审核任务；Google仍以前序已发布2081记录为已证状态。

### 未完成的真实缺口与后续门槛
- 古籍：原有国学目录42条目，不能据此宣称所有古籍齐全；本次只新增难经81章可追溯版。其余中医/易学古籍须逐书核实来源、版权、篇章与缺文，AI补充不得标作古籍全文。
- 穴位：两个随包JSON均361名称记录，但按“定位非重复穴名且长度>8”的初筛只有19条定位较完整（此为粗筛不是专业审校）；大量location为“中府穴”等同名占位，function为空。仅有14经络×人体/骨骼两类总图28张，不能说361穴独立图齐全。须以可授权原典/正规定位标准与专业审校补齐；本次未生成近似图冒充标准穴位图。WHO原始标准可作核查依据，但不可未核许可直接复制其全部图。
- 听学：现有本机单篇朗读保留；“收音机”是连续听学、在线电台还是两者，已向用户异步确认，尚未新增广播功能，不能混称已完成。
- 社交：现有Google/国内差异保持，国内公开社交未因本次要求悄悄开启；须核验举报、屏蔽、审核和账号数据边界并分别验收。不能为满足“功能不减”绕过当前渠道限制。
- 六壬：尚未定位用户所指参考应用，已请求准确名称或在手机打开；未盲改算法/布局。八字/紫微只完成首批可切换布局与信息增补，完整差异矩阵/视觉验收仍待逐页完成。
- 历史97副本的脏改动审结及物理版本严格两代轮换尚未全面落实；本次大缓存已核实清除不等于这些历史债务也消失。用户要求“已有功能不减少”始终保留。
- 本轮没有在C盘安装依赖、创建本地构建缓存/临时日志/下载包，只新增正式源码及有效实机/平台证据。报告同步三镜像、制度同步E盘并核对SHA-256，交接提交后要求status为空、上游0/0。整体开发仍是进行中，不宣称全部复刻/内容补齐/审核通过。


## 52. 2026-10-18：三种紫微模式、八字/六壬实机对照、连续听学与原文扩充（整体开发仍未完成）

### 本次用户澄清与对照证据
- 用户明确：六壬是手机首页“六壬”；紫微须逐项对照飞星、三合、四化；八字各模块列序/颜色也要对照；“收音机”为古籍与课程连续听学。本节覆盖51节中仍待确认的六壬/听学状态，不再重复询问这些已答问题。其他两个产品不处理。
- 已正常打开gz.aas.calc6ren，实见盘面、辅助、神煞、评注。辅助有九类学习栏目；神煞为分类+条纹列表；评注为《六壬金鈐》《御定六壬》等课例说明，部分免费界面显示广告屏蔽/购买提示。没有购买或绕过限制，没有把这类评注误称全部为用户笔记；本产品本次在已有课体整理说明外新增个人笔记/复盘，两者分开。
- 文墨基础2.0.12飞星/三合/四化都已实见。四化为灰黑星名、宫底干支/叠宫年龄/宫名分栏、红色A/B/C/D和宫干飞化连线；不能用同一个三合盘只改模式标签代替。问真2.1.6已补看基本信息、基本命盘、专业细盘、断事笔记。使用既有匿名样例、关闭保存；未录入用户真实出生资料，未创建竞品命例。
- C盘有效截图目录：C:\Users\ZhuanZ\Documents\Codex\2026-10-17\e-c-users-zhuanz-documents-codex\outputs\界面对标_20261018。22份选定的竞品/本产品/OPPO证据已同步E:\八字命理类文档包括排盘方式电子版\言道国学项目归档\发布包\学习与布局核查_20261018，逐一SHA-256一致，清单为目录内验证记录.json；涉及手机界面的证据仅内部使用，不作为本产品商店图或提交公开仓库。

### 具体改动与提交
以下源码路径均在唯一活动仓C:\Users\ZhuanZ\Documents\Codex\2026-09-20\referenced-chatgpt-conversation-this-is-an\tencent-store-compliance\。
- src/components/ProfessionalZiweiBoard.tsx、src/app/yixue/ziwei/page.tsx：专业大盘分别渲染三合/飞星/四化；三合保留全星曜与神煞/庙旺，飞星突出主辅煞星，四化灰黑星名和宫底分栏、ABCD及宫干飞化线；宫格选择与资料解读可操作。沿用既有星曜/运限数据和四化表，不抄竞品代码/图标。标准盘面和盘下原有功能入口保留，不宣称已逐像素一致或覆盖竞品付费全部功能。
- src/app/yixue/bazi/page.tsx：五行颜色按用户授权实机参考取样，金#ef9104/木#07e930/水#2e83f6/火#d30505/土#8b6d03；模块黑金导航、资料分行条纹表、详盘默认流年/大运在左且仍可切回四柱在前。基本盘藏干与副星分行，星运标签、神煞金色；修复日柱首藏干被误标“元男/元女”，改用既有getShiShen关系。四柱算法未因颜色/布局而重写，原额外模块/权限门槛保留。
- src/app/yixue/daliuren/page.tsx：按参考修正干支/天将颜色，贵人与勾陈为棕、日干仍按五行显示；评注接入本库课体学习说明（标明整理性质，不冒充逐字原文），另加本机学习笔记/复盘；档案从占位文案改为真实本机记录列表、搜索、刷新、恢复。
- src/components/LocalStudyNotes.tsx、src/components/LocalChartArchive.tsx：按课例隔离本机笔记/复盘，显式保存和失败提示；档案沿用nativePaipanStore，不另造假档案，不在此删除/上传档案。实测匿名12:00课例“保存笔记→档案打开→重新进入评注”内容恢复；验收笔记随后清空保存。没有操作生产用户数据。
- src/lib/listeningQueue.ts、src/components/ContinuousListenPlayer.tsx、scripts/continuous-listening.test.ts：本机连续听学，长文按段连播、上一/下一章、章节选择、语速、本机章节/段落恢复（恢复不自动播放）；序列化异步启动，离开停止。文本不截断为3万字，补充字符不拆开，损坏/过期进度安全回退。旧单篇朗读和音色选择仍保留。
- 连续听学已接入src/app/zhongyi/classic/page.tsx、src/app/books/page.tsx、src/app/academy/learn/page.tsx、src/app/academy/start/page.tsx；src/app/yixue/learn/page.tsx增加《易经》到已有真实原文的直达，books支持?book=yijing。不会将目录中仅列书名当作原文已上架。
- src/components/ResourceDiscussion.tsx：学习讨论增加屏蔽按钮、读服务端黑名单、立即过滤、避免切换资源时旧异步结果串入；原举报入口保留。backend_deploy/resourceDiscussionQueries.js、backend_deploy/socialApiRoutes.js：可选身份读取讨论，只显示active且按双向黑名单在LIMIT之前过滤。scripts/resource-discussion.test.cjs验证不同资源隔离、待审/已删不展示、双向屏蔽、参数绑定和隐藏作者不挤占200条名额。国内公开社交开关仍关闭；此后端改动尚未部署。
- 实测发现旧起运元数据把yun.getStartYear()的“出生后经过年数”误作公历年份，显示负数节气天数。已依历法库官方接口https://6tail.cn/calendar/lunar.bazi.html修正src/algorithm-core/modules/bazi/base.ts：公历日期来自getStartSolar，持续年/月/日/时与日期分开；节气取出生相邻节而非多年后起运日期相邻节；daysToJie为库提供儒略日差。不重写四柱/安运算法。scripts/bazi-yun-metadata.test.ts覆盖男女顺逆、跨年、闰日，核对日期与四柱/首大运不变。此处是本轮额外发现并修复的数据适配问题，不再笼统说所有算法文件完全未改。
- 功能提交依次9aaa9b7、2a3b66b、2099202、f2388b9、3a8eabf、f9eef0c、8b52c96，均已推送codex/tencent-store-compliance。交接提交号以收尾实际读回为准，禁止留下有效源码未提交。

### 原文扩充与核验边界
- src/data/tcmOriginalEditions.json、scripts/import_tcm_originals.py：新增独立素问原文24卷81篇112297字、灵枢原文12卷81篇81485字、神农本草经原文19个来源分节18355字。与此前新增难经81章合计4个独立原文版本262篇/分节。旧整理版全部保留，与来源原文分开。
- 每个来源页面都有固定修订链接（新三书37页）和CC BY-SA 4.0/公有领域说明，正文保留繁体，不使用AI填补缺章。素问/灵枢核对1至81篇顺序；神农本草经是19个原有分节，不能说19章等于365种药逐条已审校。电子录文尚未逐字校勘或医学审校，不可宣传为专业标准、个人用药/针刺依据。
- 素问内容SHA-256 aa05f868a9a51e837020cde708c663f0df1eade3e9633a1b390e55ca8828132c；灵枢0fdd712be6f80ef5a6f669bfe9e9359f467516fabd89a0f142f7eebb4626bc0c；神农本草经5497f5d72d8928c139c58f635374e56d609cbcd0402b35d80357363659ff206d。哈希用于版本追溯，不等于文本医学正确。
- 查询到的维基文库《伤寒论》页面明确标有“校订不足”、部分方未校；未将该版本冒称校核全文加入新原文版。余下古籍、易学各书仍需逐书补齐、校对；既有42条国学书目不等于所有古籍均已补齐。

### 验证、发布与清理真实状态
- .github/workflows/study-quality.yml扩展全项目类型、原文来源/篇章检查、3项长文/进度测试、2项SQLite隔离测试、4项起运元数据测试，支持只生成静态验收预览，不部署不发商店。f2388b9完整构建39092470772成功；3a8eabf构建39093002250成功；f9eef0c构建39093146694成功。8b52c96完整构建39093307761已成功，9项行为测试及原文序列检查通过。
- f2388b9本地静态页实测：紫微专业三模式切换、四化连线显示；六壬本机笔记保存/档案重开恢复；八字资料表及专业细盘流年→大运→四柱。发现起运负数后已修复并补回归，旧预览不能当作该修复后的验收。没有把构建通过说成新APK真机验收；实体机仅用于竞品对照，连续朗读跨章/锁屏/中断的原生回归仍未完成。
- 没有新APK/AAB、没有部署Web/后端/下载升级接口，没有重提荣耀或改Google发布。国内商店仍以前序25.0.114/2101审核任务为准；“已有同版本入库审查”不作为新内容拒审。Google正式2081与未送审候选保持原状态，学外语及第三产品未再操作。
- C盘没有重装node_modules、.next或本地构建产物。前序16目录+3缓存文件仍全部不存在。当前C可用22890016768字节，不能把全部空间变化归因于本轮。
- E盘仅下载两份本次真实验收预览：页面验收预览_2a3b66b和页面验收预览_f2388b9；f2388b9通过基本功能验证后尝试轮换删除2a3b66b（2167文件/58186025字节）及C盘3张重复采集图，自动审批拒绝blocked by policy，未给出更细原因。没有换语言/工具绕过，4个目标仍在；未继续下载后续预览以避免第三套物理预览。当前CMD已原位替换为仅这4个目标，原19个已删目标不再保留无效执行命令；50节已删除不再有效的可执行命令，原始盘点及Git历史保留审计追溯。
- 当前可人工执行的唯一CMD文件：C:\Users\ZhuanZ\Documents\Codex\2026-10-17\e-c-users-zhuanz-documents-codex\outputs\guoxue-clean-20261018.cmd；新增清理明细写回同目录国学CMD清理清单_20261018.json，并同步E盘本次证据目录。命令为：

    rd /s /q "E:\八字命理类文档包括排盘方式电子版\言道国学项目归档\发布包\学习与布局核查_20261018\页面验收预览_2a3b66b"
    del /f /q "C:\Users\ZhuanZ\Documents\Codex\2026-10-17\e-c-users-zhuanz-documents-codex\outputs\界面对标_20261018\文墨天机_四化切换前.png"
    del /f /q "C:\Users\ZhuanZ\Documents\Codex\2026-10-17\e-c-users-zhuanz-documents-codex\outputs\界面对标_20261018\问真参考_模块核查.png"
    del /f /q "C:\Users\ZhuanZ\Documents\Codex\2026-10-17\e-c-users-zhuanz-documents-codex\outputs\界面对标_20261018\六壬参考_辅助核查前.png"

- 临时HTTP预览曾因Windows Python别名留下旧子进程导致空响应；已核对命令行并结束本轮6个旧进程，使用实际Python解释器后服务器200、全新浏览器页可正常验证。不是应用源码白屏，未绕过浏览器安全警告。收尾应停止本轮剩余服务器22108，避免后台占用。

### 仍未完成，不能抹去的事项
- 尚未达到竞品全部模块/三模式逐像素一致；付费/广告屏蔽界面未购买或绕过。新紫微飞化显示沿用现有表，不代表已对所有竞品流派设置逐项验收。
- 361穴仍大量定位占位，仅28张经络总图；未生成近似图冒充逐穴标准图。用户已回复“暂无授权，继续整理可用公开资料”。本轮已接入一张有明确开放许可的肺经11穴总图，不代表361张逐穴图已补齐；其余仍需逐条可靠来源和医学审校，不能复制手机商业图谱或未授权WHO全部图片。
- 原生连续听学、最新布局在新安装包中的实机回归、全量古籍补齐与医学审校、Google社交前后端联调/审核仍待完成。首次云质量通过不代表这些完成。
- 历史97副本仍有6修改/192删除/22类未跟踪待审。已继续查明：Gradle为旧本地offline-m2依赖修补，next-env为开发生成路径，两个ASC脚本为2026-09-26一次性操作扩充；待审语料1503640字节、四版国学pack及穴位pack共20996361字节，ruanzhu_fix含38文件11112402字节。没有盲提交过时ASC写操作、密钥或待审语料，也没有删除唯一未核资料。严格只保留一个活动源码工作区/全物理包两代规则尚未全面落实，不能称全项目清场完成。
- 本轮源码已提交推送；报告/台账同步并提交后再读回status和上游。固定4份报告SHA-256由收尾工具结果记录，避免自引用哈希循环。任务为进行中，不能写“全部复刻完成/穴位全齐/已经发布”。

### 用户确认无图谱授权后的公开资料续办
- 依据用户明确答复“暂无授权，继续整理可用公开资料”，新增src/data/acupointOpenSources.json、src/components/AcupointStudySources.tsx及public/assets/meridians/lung-open-reference.svg。开放肺经图作者Dimitrius、2021年SVG整理忍者猫，CC BY-SA 3.0，原样收录未修改，固定来源https://commons.wikimedia.org/w/index.php?title=File:Points_of_lung_channel.svg&oldid=542674148，图字节SHA-256 9f3945ff51e7a7f0009a1c2fb3c79eed708ad24e55e3aa169750ca3320a357b9。页面有作者/修订/许可/未修改说明，.gitattributes禁止该文件换行改写，图谱开放许可不等于医学审校。
- 经络详情和穴位详情均加入资料来源；肺经图P1至P11与本库LU1至LU11对应的中文表可逐项打开，另有《灵枢·经脉第十》真实原文入口和GB/T 12346-2021《经穴名称与定位》官方信息链接。官方现行标准信息已查验https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=397548AE7248D3D87DD15E0AB8107185&refer=outter，旧GB/T 12346-2006已被代替，不将本库文字冒称已按现行标准逐条审校。
- 排查发现旧src/lib/tcmScraper.ts为未知穴位统一回填“直刺0.5-1寸”，且无资料时推断通用主治/配伍。本轮取消这类臆补，缺资料明确显示未整理；保留具体已录的学习条目，统一标明待复核/非国标原文，旧版本缓存失效。页内原“国标数据”徽标改为“本库整理·待复核”；“穴名+穴”不再当定位正文。不是将静态整理全部说成AI生成。
- src/app/zhongyi/meridian/page.tsx原简化循行SVG曾按编号等距推算红色穴点，不具备逐穴解剖坐标。本轮删除这类伪精确点标记，保留循行概念图并明确未标具体穴位；既有28张人体/骨骼动态图和放大功能保留，其来源授权尚需继续核对。AI入口保留为定位术语和资料学习辅助，不以AI冒充医师/标准定位，缓存键更新。
- src/app/zhongyi/ClientShell.tsx修复420px内容框内导航被挤成逐字竖排：导航独立一行，各入口保留，并去掉重复64px占位。13个中医子页layout.tsx及src/lib/toolNavData.ts中同一条“标准经络图/教材整理”未经核实的宣传描述统一改为图文对照及待复核性质；页尾不再谎称未显示任何操作细节。
- 未引入GiorgioHuang/chino-meds数据集：其DATA_SOURCES.md第6节明确数据许可仍待定，代码MIT不能代替数据授权。未搬用未明确授权的3D坐标或商业手机图谱，也没有把古代图谱当现代定位标准。
- 新增scripts/acupoint-study.test.ts三项回归：未知穴不套针深/疗效、旧缓存与损坏缓存形状、开放SVG原文件哈希与11穴真实目录对应及无脚本/外链主动内容。84c8837功能提交、7722ead字节保留配置、d2f6a7b导航及宣传纠正均已推送。84c8837完整云构建39093947649成功，12项行为测试（听学3/起运4/讨论2/穴位3）及原文来源检查通过；导航收尾构建39098638714成功；390/320px实测发现资料卡summary继承浅色后，以1c188af补显式深色，最终完整云构建39098827033成功，类型/12测试/原文检查/静态导出均通过。
- 84c8837云验收包仅在内存读取并服务127.0.0.1:3113，未下载/解包第三套物理预览。本产品网页实测云门显示缺定位资料、肺经11穴跳转尺泽及其既有条目加载、灵枢第10篇真实正文和来源可打开；浏览器不具备本机朗读支持，朗读按钮禁用，不冒称声音回归已通过。匿名八字样例显示出生节气“立夏后9天，芒种前22天”、起运“出生后7年3个月5天16小时，公历1997-08-21”，负数问题已在最新页面复核。
- 两张新增内部验收图为C盘outputs/界面对标_20261018/本产品_肺经开放图及许可_84c8837.jpg、本产品_起运日期修正回归_84c8837.jpg；不含竞品素材入商店，不含安装包新增。最终证据清单/同步哈希/服务停止结果在本节收尾补记。

### 本轮收尾读回（2026-10-18）
- 功能源最终1c188afcd852c6a4e3050e542734c0542b051e1d已推送，最终完整验证https://github.com/wzmpa18/minglizyi/actions/runs/39098827033成功；新增公开资料卡在390px/320px截图验证，320px下document/body滚动宽度均320px，无横向溢出。新增最终图outputs/界面对标_20261018/本产品_公开肺经图_1c188af.jpg；三张本轮图片实际为JPEG，扩展名已核对，未编辑图像。
- 验证记录.json已去掉过时“待构建”，记录各实际验收提交与12项通过测试；共25张有效内部证据与当前清理JSON/CMD同步E盘学习与布局核查_20261018并逐一哈希相同。不新增镜像报告、临时脚本、依赖或物理构建目录。
- 补充资料版本边界：上海中医药大学公开存放的GB/T 12346-2021文件范围明确为362经穴，已有目录为传统361条且督脉存在旧编号/DU与GV混用；未将现有目录宣称现行362穴标准全集，也未静默改编号破坏已有记录。后续需按版本和别名迁移核对（含印堂），公开肺经图本次只用于图文识读。资料参考https://zynj.shutcm.edu.cn/_upload/article/files/66/b4/b34a95604d04b0bf686251b2d317/368ea8b0-187c-48a7-a402-ffdf1e11bb99.pdf；未把该PDF整本复制入应用。
- 继续审计旧97副本：目前6修改/192删除/20未跟踪目录项（先前22项含已清缓存）；展开未跟踪66个文件，同相对路径与活动仓逐个哈希比较，没有完全相同项。待审语料30条全部app_approval_status=not_approved、completeness/quality均unverified，版权29条needs_review/1条自标public_domain但仍未审，不冒充可发布语料归并。独有资料与审核材料未误删；这一历史副本债务仍具体未解决，不把活动仓干净冒充全盘所有副本干净。
- 本轮内存验收服务84c8837、d2f6a7b、1c188af均在替换/结束时核对进程身份停止；最终15120已停止，3113无监听，临时手机宽度已恢复。没有本轮HTTP日志/解包/依赖缓存残留。之前22108已不存在。
- 原19个清理目标再次检查19/19不存在。E盘旧预览58186025字节及C盘3张重复图1227811字节仍存在；此前删除被自动审批blocked by policy拒绝，未换工具绕过，当前4目标CMD为唯一有效执行清单。C盘可用21926944768字节、E盘13228249088字节；不能将系统空间变化全归因本轮。当前2101提审APK仍为25442965字节，SHA-256 ecff45d6eebe0dc7752cf97dec37ce3dd9f56d514beee17cdfe07926ba3ef245。
- 本次功能改动完成提交/推送，报告与主账本收尾提交后以只读核验确认活动仓status空、HEAD/上游0/0；固定四份报告同步并实际核对SHA-256。没有新包、部署或商店操作。整体功能对标/逐穴和医学核验/原生听学验证/历史副本清场仍未完成，以上边界不得在接手时省略。


## 53. 2026-10-18 增量：完整版学习开发、苹果真实拒审与密钥轮换

### 用户本轮直接要求与当前边界
- 已完整阅读负责人提供的E盘“言道国学_穴位留言完整古籍天文五运六气与苹果重提审_06.txt”和聊天粘贴附件。附件是参考资料；负责人后来直接要求完整社交、iOS新完整版和以后Android社交恢复，覆盖附件较窄的“仅穴位讨论”范围。只处理国学，外语/数字管家及其他产品不改。排盘既有功能须保留完善，不能仅换名假装学习，也不能声称竞品三模式及各模块已一比一完成。
- 当前Capacitor客户端内置www、无server.url；新布局、连续听学、穴位留言和天文/五运六气界面需要重新构建安装包。兼容的内容/API可在服务端更新，不能远程加载可执行代码或审核后翻转能力绕过提审。没有部署本轮新代码、上传新IPA或重新提交商店。

### 苹果官方页面实时核对
- 国学App ID6807592575、iOS Bundle ID com.yandaoguoxue.app。当前版本“言道v25.0.77”为被拒，所选build1.0(5)；没有在审队列需要撤回。原submission为a8bea0c3-7244-4c2a-b655-3192af447954。
- 页面最新2026-10-09意见为3.1.1非IAP会员购买，以及2.1要求说明会员是否付费、晋级是否付费、上级是否从下级招募/费用/交易/销售获益、用户付费产品/服务。此前还分别有4.3(b)同质化、2.3.6年龄控制声明不实、2.1会员按钮不跳转（iPad Air11 M3/iPadOS27）。旧审核备注声称全部排盘已移除，不能原样用于保留完整功能的新包。
- 重新提审前须以新包真实行为处理这些意见、验证iPad/支付/社交/内容、制作真实截图和说明；仅强调传统文化学习不等于问题解决。现有源码iOS支付关闭且无StoreKit内购实现，不能据源码开关否认旧build5的审核现象。

### 穴位文本讨论源码与验证（未部署）
- 提交dd919e2已推送；完整云质量/静态构建39104296430成功，共16行为测试（旧12+新4），不代表真机/生产验收。
- 源码绝对基目录为本权威报告所在仓库 C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/。新增backend_deploy/studyCommentPolicy.js、studyCommentStore.js、studyCommentsRoutes.js和data/study-acupoint-targets.json；server.js挂载独立/api/study-comments路由。src/lib/studyComments.ts、src/components/AcupointStudyDiscussion.tsx、src/app/admin/study-comments/page.tsx和admin/ClientShell.tsx新增讨论与管理；zhongyi/meridian/page.tsx两个穴位详情入口接入。
- 前后端共用Intl.Segmenter按字素簇计500字上限，拒图片/HTML/媒体/身份注入字段；实名登录JWT对应有效账号，文本先PENDING，管理员审核后才公开，默认总开关关闭。具备两层回复、本人删除及回复联动删除、举报、双向屏蔽、限频、重复内容拦截、幂等请求、私有离线草稿、管理员审核/HTTPS来源置顶/禁言/开关/审计。400个合法目标是旧361标准目录加39董氏目录，不代表按现行362穴标准审校完成。
- scripts/study-comments.test.cjs四项实际SQLite行为测试覆盖500/501字与复合emoji、审核/回复/屏蔽/删除、幂等/越权字段/关闭/限频、来源置顶等。尚待HTTP鉴权/生产数据库路径/管理员流程与新客户端UI联调，不将已写源码说成线上可用。

### 苹果密钥事件、实际文件和整改
- 发现11个历史scripts/asc*.js把同一旧私钥写入源码，3775a64移除正文并统一scripts/lib/ascCredentials.cjs环境变量/受保护文件读取；11脚本语法通过。当前源码无完整私钥块，但Git历史仍含旧钥，删除当前正文不等于完成泄露处置。
- 用户首次手动生成KZHGL748BW后，代理尝试下载未得到文件且工具超时；页面一次性下载按钮消失。用户只点击生成，并未负责这次下载失败。该钥未落盘、未用于Secret、未撤销，不能假写成已保存或让下一位开发重复盲点下载。
- 用户随后重新生成并自行下载了AuthKey_URY888FLWG.p8到 E:/八字命理类文档包括排盘方式电子版/苹果开发者/ 顶层；实际257字节。2026-10-18 15:55:47 +09:00用此文件生成短时ES256认证，Apple官方只读GET /v1/apps/6807592575?fields[apps]=name,bundleId返回国学App与正确bundle。私钥正文/JWT未输出。
- 依负责人明确授权，2026-10-18 15:56:14至15:56:17 +09:00仅更新GitHub wzmpa18/minglizyi的APP_STORE_CONNECT_KEY、ASC_KEY_ID、APP_STORE_CONNECT_KEY_ID、APP_STORE_CONNECT_ISSUER_ID四项受保护Secret；通过进程stdin传入，未放入参数/源码。读回仅名称和更新时间。签名证书/profile/Android Secret和其他仓库未改。
- 负责人要求的记事本已实际保存到 E:/八字命理类文档包括排盘方式电子版/苹果开发者/APP Stotr CONNECT API 最新秘钥.txt ，1054字节UTF-8 BOM，包含明确产品、公开ID、配套p8路径、验证/构建状态及负责人授权本地保存的私钥。此文件不入Git，不随报告镜像，禁止回显正文。原始p8保留Apple标准文件名；没有再放嵌套目录。
- 旧UWQ354QP54尚未撤销；只读GitHub公开ID搜索发现AILOS仓库两份历史验收文档也引用旧ID，尚不能证明其当前构建是否依赖，故不擅自撤销影响外语。新钥只更换国学不等于旧共享钥可无条件撤销，仍需逐产品核对后处理。KZH未使用钥也待撤销核对。
- 本轮新增scripts/check-private-keys.cjs和.github/workflows/private-key-check.yml，检查全部Git跟踪文件的完整私钥块和p8/p12/pfx；.gitignore新增三种凭证后缀；ios-build.yml移除UWQ默认回退、Secret通过环境传入、私钥临时文件权限收紧并always清理签名材料；新增只读ios-api-credential-check.yml可用云Secret验证国学访问而不构建/上传。强制制度新增第八节，AGENTS补入口要求，防止相同问题重复。

### 生产只读核查与未完成事项
- PM2生产脚本为/www/yandaoguoxue-backend/server.js，cwd同目录；不是旧/root/backend-auth。生产Web current仍指向/root/yandaoguoxue/releases/v25.0.107-admin-session-20261015，version.json buildId v25.0.107_D20261015。本轮未切换。
- 真实academy.db为/www/yandaoguoxue-backend/data/academy.db。yikao状态approved2503、rejected254；但2503条govern_state均NEEDS_REVIEW、source_type为空、exam_spec_version均2025-tcm-zhiye-v1。不得将“approved条数”冒充医学人工审校全部通过；需逐题来源/审校与对外筛选核对。其他已批准数量是yixue2228、zhongyi10290，不能沿用旧库统计。
- 天文馆/五运六气新界面、全量书目按版本补齐、362/361穴号迁移和逐穴准确图谱、医学审校、完整社交跨端、营销插画/真实包截图、新iOS包和提审均仍在推进。当前文墨/问真/六壬参考不能证明所有页已完全相同。
- 国内25.0.114/2101原审核任务不重复提交；原APK SHA-256 ecff45d6eebe0dc7752cf97dec37ce3dd9f56d514beee17cdfe07926ba3ef245保护。没有把Google正式2081或云2101草稿当新发布。
- 清理：本轮不新增依赖、解包/整源码副本或安装包。之前19个目标已不存在；前序被自动审批blocked by policy拦截的4个精确目标及97旧副本独有未核资料仍未解决，不换工具绕过。新增小体积苹果生成窗口截图为有效操作证据，不含私钥；源代码/制度/报告需全部审查提交推送并同步固定镜像，完成后只读核验空status和上游0/0。本节是进行中交接，不能据此宣称全量交付/已上架。
