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


## 54. 2026-10-18 增量：真实学习页面、iOS完整版候选与宣传纠正（进行中）

### 密钥实际验证完成范围
- §53的新钥URY888FLWG已在GitHub真实Secret环境只读验证成功：https://github.com/wzmpa18/minglizyi/actions/runs/39105948548 。该次只运行API验证，Archive & Export明确跳过，不是上传/提审。私钥提交门禁39105942656成功。
- 222c2c8提交保护门禁/制度/构建凭证处理并推送。E盘专区顶层保留AuthKey_URY888FLWG.p8及负责人指定“APP Stotr CONNECT API 最新秘钥.txt”；后者有私钥，不入仓、不随报告镜像、不打开截图或回显。原始p8不可再从Apple重下；后续接手先核实本地文件和公开ID，再读取受保护配置。
- 再次用新钥只读核对：苹果仍只有“言道v25.0.77” REJECTED；build5/4/2/1为既有VALID上传，未出现新build6/7。inAppPurchasesV2列表为空，没有任何国学内购商品。用户关于“撤下重提”的问题：没有正在审核的提交可撤回，保留原App记录，待完整真实新包/截图/说明就绪后更新原App，不以另建App绕过原意见。
- 用户仅更换国学的要求保持；未修改其他仓库Secret/应用/密钥。旧UWQ和未取得文件的KZH均未撤销，不能写整项泄露轮换已闭环。

### 天文馆与五运六气实际开发
- 040d581新增 src/lib/astronomyStudy.ts、src/app/academy/astronomy/page.tsx及layout.tsx、src/app/zhongyi/yunqi/page.tsx及layout.tsx、scripts/astronomy-study.test.ts；首页/学堂共用LearningEntryPanel.tsx和学堂导航、toolNavData加入实用入口，LocalStudyNotes支持领域相关提示。均在本活动仓绝对基目录 C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/ 下。
- 天文馆用既有MIT Astronomy Engine 2.1.19计算9个日月行星目标，时间明确UTC+8，经纬度与4城预设，真实高度/方位/赤经赤纬/视星等、月相照明比例及当天日月升落；天顶投影东在左、北在上，地平线下不假画天体。没有虚构恒星背景，不把“地平线上”当肉眼可见，不申请定位或上传地点；含观察自测与本机笔记。极区没有升落时如实显示无事件。
- 五运六气选择1900—2099年，明确采用大寒至次年大寒学习周期、按太阳黄经交节分六步；中运依年干、司天依年支，客气第三步司天、第六步在泉，主气与客气顺序分别列出。不是复用旧huangli.ts中的简化节气映射。界面提供六步交界、推导、自测、本机笔记、素问66/67/68/69/70/71/74七篇完整原文链接和全文连续听学。未把六步日期冒称五步主客运交运时刻，未据年份给个人疾病/用药结论。
- 方法参考：Astronomy Engine官方 https://github.com/cosinekitty/astronomy/tree/v2.1.19/source/js ；上海中医药大学 https://zynj.shutcm.edu.cn/2023/0920/c4359a155053/page.htm 及天津中医药大学学报 https://tjzhongyiyao.tjutcm.edu.cn/html/tjzyydxxb/2020/5/20200507.htm 。页面保留不同交司观点及现代天文计算边界。
- 5项计算回归覆盖UTC+8与非法日期、投影方向/地平线、时间地点实算/极地无升落/新月案例、60年年干支映射、六步边界前含后不含。完整构建39106464209成功。实测发现datetime-local填值未进入React状态，7788f3f补onInput；浏览器实测2026-06-21 12:00北京太阳高度73.2°，改时/改城市后计算真实更新。

### 新版iOS能力与原生听学修复
- abc7f56新增backend_deploy/releaseProfilePolicy.js、scripts/ios-full-profile.test.cjs；src/lib/releaseFeatures.ts、platformGate.ts、HomePage.tsx、yixue/page.tsx、IOSLearningRedirect.tsx、public/native-api-patch.js及app/layout.tsx为新编译渠道ios-full-learning提供完整工具/社交入口。新请求显式携带平台/渠道/25.0.115版本；服务端只有新iOS profile且版本达25.0.115才允许该profile的排盘辅助API，旧iOS/小程序矩阵保持原有行为。这是新安装包产品版本，不按审核账号/审核状态/远程开关临时翻转。
- 会员外部购买仍关闭，不把“全功能”包装成已完成StoreKit。新iOS商业招募/佣金推广入口与纯学习宣传插画分别处理；此前苹果询问会员付费/晋级/下级收益，尚未提交答案。只读生产价格实际为37元30天、99元90天、374元365天、3600元终身。已向负责人询问保留收费并接苹果内购或苹果版学习全免费，等待明确方案，未擅自改价或历史权益。
- iOS版本改25.0.115、build6；Android未来源码版本为25.0.115/2102，未构建/替换国内在审2101。package与lock版本一致。
- build6云签名构建39107533797成功，IPA包名com.yandaoguoxue.app、25.0.115/6、内置www无server.url、ios-full-learning标记及签名资源存在，SHA-256 44aa5105ff96f939304bff262e99425e5f0b22d7bbfcefe46c9db30faef529aa，27536757字节。唯一物理候选存 E:/八字命理类文档包括排盘方式电子版/言道国学项目归档/发布包/iOS/20261018_25.0.115_6/言道国学_25.0.115_6.ipa ，同目录候选包核验.json。未复制IPA到C盘，未上传Apple或提审。该包随后已被更晚中医阅读样式/原生朗读源码超越，不能再称最终最新完整版。
- 继续核查发现iOS工程没有注册LocalTts，旧前端只能尝试浏览器语音，存在原生按钮不可用问题。7cf9e8b新增ios/App/App/LocalTtsPlugin.swift，以AVSpeechSynthesizer系统中文音色输出；通过GuoxueBridgeViewController在SceneDelegate与Main.storyboard注册并纳入pbxproj Sources；无麦克风、上传文本或额外服务密钥。支持实际音色枚举、语速、开始/完成/停止事件、来电音频中断停止，旧utterance事件不误触发新段。长篇单次超过32000字符明确引导连续听学，不截断全文。不声明锁屏跨章节已验证。
- localTts.ts新增ios来源，停止旧段后才订阅新段、旧控件清理不能停止新播放；LocalListenButton用播放轮次避免延迟启动/结束后的假“正在朗读”，错误不永久禁用语音服务。3项带原生桥模拟的行为测试覆盖来源识别、控件交接、取消等待中的播放及失败监听器释放；不能代替iPhone扬声器/锁屏实机验证。
- 新版build7云构建39108618419进行中（本段记录时处于Archive）；31项完整质量/静态构建39108616097已成功。后续必须读回构建7结果、核对包哈希和实际版本，并在本节追加真实结果。没有把尚在构建的7写成上传成功。

### 真页面设计与宣传素材
- 负责人后续明确“图片也要真实截图”“用阴符经、黄帝内经，不要论语”。宣传主题调整不删除原有其他书籍/学习功能。
- 6ccadff生成三张原创1024x1536宣传插画；随后7788f3f按负责人纠正，将第一张论语图替换为黄帝内经/阴符经封面，不再使用旧图作当前宣传。当前正式素材在 docs/marketing/20261018/01_经典阅读.png、02_中医资料.png、03_天文学习.png；素材说明与提示词.json记录built-in image_gen、完整提示词/编辑提示词、尺寸、SHA及候选未投放状态。E盘发布包/学习与布局核查_20261018/学习宣传插画逐文件同步。图内均明示学习主题插画，不冒充App截图/人体穴位定位图/真实星图，不宣称已过审。
- 当前三图SHA：经典2202e29fb574eef84ec5fced1768842a499c7390ff17a0ed5bdede85c8af6592；中医968ba31144a521a41aa831dfb071b5f9cc5f5265e7e62ef1f8b767432d91a2cd；天文77a598aa3a09fe28ac20ff8eb8faa965f01068e6ae1e1fc5f3aac12152989d7d。旧图仅在Git历史/生成器原始输出保留，不在当前应用/宣传目录继续分发。
- 7788f3f改进src/app/books/page.tsx真实国学阅读页：书籍封面、字号、本机阅读位置、段落与三篇标题、听学折叠区；正文排版不截断，新增classicReading.ts兼容数据包校验（内容/来源/版本/唯一ID/范围），不能只信full标签。2项测试对所有内置书籍逐字去空白比较不丢正文、拒绝坏数据包/重复ID/非HTTPS来源。books/layout.tsx纠正“22部医籍/账号云同步/通行校注本”等不对应本页事实的旧宣传。
- 8bd2a8b及7cf9e8b继续统一中医classic阅读页为青绿/纸色设计，保留章节目录、字号/主题、书签和原文辅助；来源版本可展开查验，无来源的节选/AI整理提示仍明确可见。去掉独立零宽字符造成的空白段，未删除原文可见文字。对现有黄帝阴符经完整三篇已与维基文库公开页面核对，源页oldid11120544，古代原文公有领域；未据此宣称所有医籍已经逐字校勘。
- 真实网页截图已在任务outputs/界面对标_20261018保留：本产品_阴符经新版阅读页_7788f3f.jpg、本产品_天文馆新版观测页_7788f3f.jpg、本产品_黄帝内经原文阅读_7788f3f.jpg。均为浏览器390x844实际渲染JPEG，不是AI界面图；第三张是后续8bd2a8b改进前的对照，需补最终中医阅读截图。不是已完成iPhone/iPad原生商店截图。
- 28项完整检查39107525281已通过（含真实Express/JWT/账号数据库/管理员角色的HTTP生命周期：未登录/失效/封禁/注销/不存在账号、500/501字、来源/大小限制、先审后显、幂等、举报、屏蔽、本人删除）；临时账户/SQLite仅在云端随机隔离目录，子进程退出后按确认路径清除。生产依赖版本只读核对为express4.22.2、better-sqlite3 13.0.3、jsonwebtoken9.0.3。

### 生产与清理状态：不得省略
- 尚未部署新后端、切换生产Web或打开穴位留言总开关。生产platformFeatureGate与审阅基线SHA一致，但server.js与基线哈希不同；未来不能用仓库server.js整文件盲覆盖，须仅在现有extraRoutes锚点添加新挂载并保留线上差异。真实服务器路径沿用§53，禁止旧/root/backend-auth/academy.db空库误统计。
- 完整社交的生产审核/屏蔽/后台流程、原生iPhone/iPad交互和听学、逐穴图谱准确性与授权、医学题库真实人工复核、其余书目全本补齐及逐字校勘仍未完成；只恢复前端入口不代表社交闭环完成。现有数据的待复核状态必须保留，不能用宣传图片掩盖。
- 本轮只在内存下载/服务云验收包，先前040d581内存服务PID16048已核实停止，未解包第三套物理预览。现行验收服务临时使用3113，结束需检查身份并停止，恢复手机视口；最终状态续记。新增有效图片/正式源素材与E盘IPA是实际交付/审核证据，不算临时缓存。
- 前序4个精确清理目标仍因自动审批blocked by policy未删；97历史副本未核独有资料继续保留，不能宣称所有旧物已清。国内2101在审包与Google已发布2081未替换。源码提交推送至7cf9e8b，当前活动仓此前读回空status、上游0/0；本段文档提交后再核对，四份报告按同字节同步计算SHA，不在文件内部自引用最终SHA。


## 55. 2026-10-18 增量：签名候选7、真实截图验收与社交隔离修复

### 实际交付和未发布状态
- 承接负责人“实际页面截图、阴符经/黄帝内经为主、重新完善再提审”的直接要求；不以宣传插画代替实际界面，不删原有书目或工具。本次七张实拍界面图均为本产品静态构建7cf9e8b的真实浏览器渲染，JPEG原样保存；不是原生iPhone/iPad验收，也没有上传商店。
- 签名构建 https://github.com/wzmpa18/minglizyi/actions/runs/39108618419 已真实成功。候选包唯一位置：E:/八字命理类文档包括排盘方式电子版/言道国学项目归档/发布包/iOS/20261018_25.0.115_7/言道国学_25.0.115_7.ipa ，同目录候选包核验.json。包大小27567828字节，SHA-256 `3dca00c5baeead13fc05df65b0c1fdde5c552345c6fc00d1049a80ab1db4b227`；包名com.yandaoguoxue.app、25.0.115(7)，源提交7cf9e8b0053c1594bc8eadb582a055d0cbf6dc08。已核对签名资源、内置www且无server.url、ios-full-learning标记及Mach-O中LocalTtsPlugin/GuoxueBridgeViewController。
- 该7包没有上传Apple/TestFlight，没有送审或发布；不是“全部验收稳定版”。后续2cdcaea修复社交后端和13个中医页面的通用说明文案，尚未编入新的IPA。最终提审须重新核对最终包和源码，禁止拿6包或7包冒充已包含全部后续修改。
- 本轮没有撤销/删除苹果原App，旧版仍为REJECTED，无在审任务可撤。新会员方案仍等待负责人明确回答：保留收费接苹果内购，或苹果版学习全免费；不能擅自改现有37/99/374/3600价格或历史权益。苹果现有内购目录为空，不能仅改学习文案就假称3.1.1已解决。
- 新国学钥URY888FLWG已通过真实云Secret验证及签名构建；E:/八字命理类文档包括排盘方式电子版/苹果开发者/APP Stotr CONNECT API 最新秘钥.txt 已补真实构建/未上传状态，私钥部分与同目录AuthKey_URY888FLWG.p8在内存比对相同，正文未输出。只更新国学配置；UWQ/KZH撤销问题沿用§53/54边界。

### 真页面实际核对与证据
- C盘证据基目录：C:/Users/ZhuanZ/Documents/Codex/2026-10-17/e-c-users-zhuanz-documents-codex/outputs/界面对标_20261018/ 。E盘镜像：E:/八字命理类文档包括排盘方式电子版/言道国学项目归档/发布包/学习与布局核查_20261018/ 。以下7张已逐个核对SHA相同；验证记录.json现有39条有效证据记录。
- 本产品_黄帝内经新版阅读页_7cf9e8b.jpg：青绿章节封面、纸色衬底、可读原文；390px下document/body均390，未隐藏来源入口或未审校标记。
- 本产品_阴符经新版阅读页_7cf9e8b.jpg、本产品_阴符经窄屏书签恢复_7cf9e8b.jpg：实际字号22切换、本机记住位置提示；离开重进后“继续上次阅读”仍存在并可用。三篇标题均在DOM正文中；390及320px的document/body宽度均等于视口，无横向溢出。字号本身并未宣称跨次保存。
- 本产品_天文馆新版观测页_7cf9e8b.jpg：真实9天体实算和天顶投影，390px无横向溢出；时地计算沿用§54已实测的输入修复。图上方位、天顶与地平线说明完整，无伪造星空。
- 本产品_五运六气学习首页_7cf9e8b.jpg、本产品_五运六气学习页_7cf9e8b.jpg、本产品_五运六气自测听学_7cf9e8b.jpg：实际切下一年到2027，丁未/木运不及/太阴湿土司天重新计算；选择三之气显示小满起止2027/05/21 14:17至07/23 09:04，主少阳相火、客太阴湿土；自测初之气错误、改三之气正确有实际解释。听学切第7篇至真要大论显示全文16段，不是导读充数。未声称实际扬声器、来电、锁屏连播已通过真机验收。
- 继续查找全本时，维基文库《伤寒论》页面 https://zh.wikisource.org/wiki/傷寒論 明示录文校订不足、方未校等问题，本轮未将这一版本直接批量塞入并宣传为医学准确全本。其余书目、逐字校勘及逐穴医学审校仍未完成，不能用数量替代来源/准确性。

### 社交实际缺陷、源码和验证
- 6f8c035和2cdcaea已推送。源码基目录为C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/ 。新增backend_deploy/socialVisibilityQueries.js、scripts/social-visibility.test.cjs；修改backend_deploy/socialApiRoutes.js、scripts/study-comments-http.test.cjs及.github/workflows/study-quality.yml。
- 修复此前屏蔽用户仍可从动态流、直达页、评论或收藏列表见到的问题：SQL按双向黑名单先过滤再LIMIT和游标分页；隐藏/删除的动态不能通过直达评论、点赞、收藏或新回复访问；屏蔽根评论下的回复不再脱离根泄露，已删除评论统一返回占位，不回传旧正文。
- 社交写入鉴权改为真实账号存在且未封禁/注销；查库缺失或异常时503阻断，不再因数据库异常默认放行。账号路径与现有鉴权一致，DB_PATH优先、USER_DB_PATH为回退。三组真实SQLite测试覆盖筛选/分页/直达、评论层级与500条前置隔离、收藏100条前置隔离和参数绑定；沿用已有学习讨论2组测试也通过。
- 真实HTTP生命周期增加社交实际Express路由：动态/直达/收藏/评论双向屏蔽、下架动态的交互404、屏蔽或删除根回复拒绝、旧删除正文不泄露、无效/封禁/注销/不存在账号、查库故障503，以及正常点赞评论成功。仅随机隔离云测试库；生产开关未改。
- 首轮39110060035失败原因是测试继承仓库comments_enabled=false，写入按原开关返回403；未将失败称通过。2cdcaea只在隔离worker显式启用测试开关，未降低断言或打开生产。最终 https://github.com/wzmpa18/minglizyi/actions/runs/39110171770 全部成功：34项行为测试、TypeScript、来源结构检查及ios-full-learning静态构建；私钥门禁通过。
- 13个中医layout.tsx（ai/bianzheng/classic/constitution/diagnosis/exam/formula/herb/meridian/shanghan/wenzhen/yangsheng/zhenggu）删除不实的通用“免费/计算即时/账号同步历史”承诺，改为具体资料来源/复核状态/记录保存方式以页面功能说明为准，不改变价格或已有学习能力。
- 新后端/前端没有部署生产，完整社交的实际管理审核、运行配置和端到端用户流程仍未完成；没有因前端入口恢复就打开生产posts/comments/groups，也不假称全社交可用。后端部署须保留§54指出的线上server.js差异。生产医考2503条NEEDS_REVIEW、362穴版本迁移/逐穴图谱与竞品全部页面差异继续列为未完。

### 本轮清理、命令和提交收尾
- 临时验收包全在内存，未在C盘安装依赖、解包或存IPA。本轮预览Python PID16016已核对进程身份后停止，3113无监听；浏览器临时视口已reset、临时验收标签已关闭。保存的小体积截图是有效验收证据，非临时日志。
- 原16目录加3缓存共19目标再次实查19/19不存在。此前4目标（旧58,186,025字节预览和3张重复图1,227,811字节）仍在；新增过时build6目录2文件27,537,550字节已核对不再需用，正常PowerShell删除仍被自动审批`blocked by policy`拒绝，实际删除0，未换语言或工具绕过。当前待清理明确为5目标合计86,951,386字节，不宣称清场完成。97旧副本独有待审资料债务仍未解决，不盲删/盲提交。
- 当前唯一可供负责人手工执行的精确CMD仍是 C:/Users/ZhuanZ/Documents/Codex/2026-10-17/e-c-users-zhuanz-documents-codex/outputs/guoxue-clean-20261018.cmd ，CP936编码，及同目录国学CMD清理清单_20261018.json；两文件同步E盘学习与布局核查目录且SHA相同。旧19目标已从可执行清单移除。调用命令：

    cmd /c "C:\Users\ZhuanZ\Documents\Codex\2026-10-17\e-c-users-zhuanz-documents-codex\outputs\guoxue-clean-20261018.cmd"

- CMD新增的过时6包清理段如下；先核对7包实际SHA，再允许删除精确6目录，不能删苹果专区私钥、国内2101提审包或任何源资料：

    if not exist "E:\八字命理类文档包括排盘方式电子版\言道国学项目归档\发布包\iOS\20261018_25.0.115_7\言道国学_25.0.115_7.ipa" goto skip_obsolete_ios6
    certutil -hashfile "E:\八字命理类文档包括排盘方式电子版\言道国学项目归档\发布包\iOS\20261018_25.0.115_7\言道国学_25.0.115_7.ipa" SHA256 | find /i "3dca00c5baeead13fc05df65b0c1fdde5c552345c6fc00d1049a80ab1db4b227" >nul
    if errorlevel 1 goto skip_obsolete_ios6
    if exist "E:\八字命理类文档包括排盘方式电子版\言道国学项目归档\发布包\iOS\20261018_25.0.115_6\" rd /s /q "E:\八字命理类文档包括排盘方式电子版\言道国学项目归档\发布包\iOS\20261018_25.0.115_6"
    :skip_obsolete_ios6

- C盘读回可用20,453,433,344字节、E盘13,098,622,976字节，仅为当时系统读数，不能把空间变化全归为本轮清理。四份固定报告本段同步同字节并在提交后只读核验SHA一致；活动仓有效源码推送至2cdcaea16a6a55ed4594e1c0a5c397f767d135fa，文档独立提交后须核验status空和上游0/0。当前整体任务仍未完成：会员方案、原生验收、生产联调、医学内容/对标完整性、旧钥撤销和被拦清理不得省略。


## 56. 2026-10-18 增量：八折促销、苹果价档落地、AI点数交付与远程控制

### 已确定的商业方案（覆盖54/55节的等待答复）
- 负责人确认手机实际为原会员价37/99/374/3600元，并明确要求“基础价不改，促销期间全部八折”，保留可管理的会员锁定与广告入口；随后明确同意苹果版使用相同或不高于安卓八折价的最近苹果中国区价档。此前“收费内购或全免费”二选一不再待答，不得再次擅自改为免费或把原价改成新基础价。
- 安卓/网页会员活动价：30天29.60、90天79.20、365天299.20、终身2880元。AI10/50/100/500次包活动价：22.40/104/160/640元，原价28/130/200/800元不变。活动未指定截止日，当前由后台手动关闭；不能自行捏造结束日期或倒计时。
- 苹果已批准并实际配置的中国区价格：30天29、90天79、365天299、终身2849元；AI10/50/100/500点22/104/160/639元。苹果价格由App Store管理，远程促销配置不能冒称已经改变Apple实际扣费价。将来改变活动须先核对Apple价档，并以StoreKit返回的当地币种/实际价格展示。
- 促销覆盖本平台会员、AI包/时卡、单次数字工具与批量解读；现金充值与有第三方服务者结算的服务单不按虚拟折扣减少现金价值。同类优惠取更优、不二次叠加；活动期间不消耗原助力八折券，券的存储记录未清除。苹果购买AI点数按苹果规则不得过期，数量与通用AI用途一致；安卓原包30/90/180/365天规则暂保留。未用本机余额假冒付款到账。

### 源码、真实行为与验证
- 本节全部源码绝对基目录：C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/ 。提交链包括202680a、ef19ffd、010efc0、d0f2e29、ddf65b6、1a1f361、a232f06、ffb93ff、e2e21ce、28fc309、5df0e0c、e1d1a95。主要开发源码e1d1a95b8a65fd33a0e3d7fa8e6a016bb30a3487已推送；随后8e7289c仅修正Apple商品审核草稿备注逻辑（配置成功后才写已配置），实际8个商品备注已读回与未提审状态一致，不改变已构建网页/后端。文档提交另行核验。
- backend_deploy/salesPromotion.js及publicPricingRoutes.js/paymentRoutes.js：以整数分计算折扣，原价格配置不改写，服务端统一报价，固定订单活动快照；管理写入需要ADMIN及ops域、配置版本一致、记录审计。损坏配置不能静默恢复高价；客户端显示金额小于当前应付价时409拒绝下单，不创建高价订单。公开聚合价格no-store。前端src/lib/salesPromotion.ts、pricingStore.ts与membership/page.tsx显示活动及原价，初始/焦点/定时刷新；admin/pricing/SalesPromotionPanel.tsx提供启停、比例、起止时间、商品范围和变更确认。
- backend_deploy/paymentAiCredits.js、middleware/auth.js、paymentRoutes.js及src/app/ai-credits/page.tsx：增量包原来配置存在但服务端购买被503维护拦截，现恢复真实订单交付。包数量与有效期只取服务端可信快照，PAID前不发放，重复支付查询不重复增加，退款不恢复已撤销点数；老数据增量添加purchased/expires_at，账号余额与本人记录需登录。通用AI先用每日包含额度，再扣购买点数；有效时卡不扣购买点数，按最早到期顺序原子扣减。新购买页区分AI点数和签到积分，未登录转登录，到账需实际订单支付及权益交付，未进行真实收费测试。新版iOS在StoreKit未完成前仍禁止外部购买；国内tencent编译渠道AI关闭时不出售不可用AI包。
- backend_deploy/contentSponsorPolicy.js/toolAdminRoutes.js、src/components/ContentSponsor.tsx/SectionGate.tsx、src/lib/sectionGate.ts、src/lib/admin/client.ts、src/app/admin/tool-control/ToolSponsorEditor.tsx/page.tsx：添加静态广告与会员最低档控制；天文馆academy_astronomy、五运六气zhongyi_yunqi、国学阅读guoxue_books接入。默认ON/FREE/basic/无广告，未实际启用任何广告。广告仅受控标题/自有HTTPS图片/明确点击链接，拒绝脚本、私网地址、未定义字段，付费有效会员不显示。页面标广告并链接投诉入口；配置有权限/审计，不下载执行代码，不按审核账号或审核状态隐藏功能。已随包公开的原文不是加密DRM，前端会员门禁不能冒称原文无法提取。
- 新发现旧backend_deploy/feedbackRoutes.js的公开list接口可以越权返回反馈及联系方式，提交还信任body.userId。28fc309/e1d1a95修复为JWT真实有效账号归属，缺库异常503，查询本人、客户端身份不能冒充他人；限制文字/附件与频率，服务异常不回传内部错误或日志正文。新middleware/activeAccount.js只读真实账号库，不创建替代空库。反馈管理仅客服/运营域可看及回复，状态变更采用乐观版本防覆盖，审计不复制联系方式和投诉正文。
- src/lib/feedbackService.ts同步Bearer并按当前账号过滤本机缓存；src/app/profile/feedback/page.tsx接广告投诉预填；新增src/app/admin/feedback/page.tsx与admin/ClientShell.tsx入口，管理员可筛选最近200条、查看和回复，用户只在本人记录看到结果。没有在生产创建测试投诉或替负责人给真实用户发回复。
- scripts/sales-promotion.test.cjs、paid-ai-credits.test.cjs、content-sponsor.test.cjs及study-comments-http.test.cjs验证真实价格解析、Express/JWT/SQLite/角色隔离、陈旧价409、受信数量、支付幂等/过期/退款/优先额度、静态链接限制和私有反馈/后台处理。测试使用云端随机隔离库且无支付商户凭证。此前checkout夹具使用TEXT用户与生产INTEGER不一致导致401而非预期409，已d0f2e29修正；ddf65b6的packageId类型漏项由1a1f361修正，没有把失败CI当通过。
- 最终质量运行 https://github.com/wzmpa18/minglizyi/actions/runs/39114811581 成功：44项行为测试、TypeScript、古籍来源/篇章结构及完整default网页构建；HTTP用例额外覆盖反馈防越权、联系方式隔离、运营回复、并发409、限流与账号库异常503。44为测试框架计数，不把每个HTTP断言虚增为测试项；仍不代替Apple付款/真机/医学人工校勘。私钥门禁检查1716条已跟踪路径通过。

### 苹果商品实际配置与提审边界
- 新增backend_deploy/appleIapCatalog.json与scripts/asc-learning-products.mjs。脚本为长期维护用途，默认只读，--apply才允许配置本App已批准商品/价格/版本化中英文本；按产品ID复用、读取全部分页，已有不同价格/文案先停止核查，不自动覆盖，也没有提交审核的能力。凭据仅来自保护文件与环境，日志/回执不含JWT、私钥或签名下载URL。
- 苹果App仍为6807592575/com.yandaoguoxue.app。以下8个商品价格均从Apple价格计划再次读回一致，简体中文/英文描述均已核对；状态均MISSING_METADATA，尚缺最终材料/可售地区准备，不等于商品审核通过或已能购买：

|权益|Apple商品ID后缀（前缀com.yandaoguoxue.app.）|资源ID|类型|中国区元|
|---|---|---|---|---:|
|30天会员|membership.monthly.v1|6824178134|NON_RENEWING_SUBSCRIPTION|29|
|90天会员|membership.quarterly.v1|6824180449|NON_RENEWING_SUBSCRIPTION|79|
|365天会员|membership.yearly.v1|6824180486|NON_RENEWING_SUBSCRIPTION|299|
|终身会员|membership.lifetime.v1|6824180543|NON_CONSUMABLE|2849|
|10点|ai.credits10.v1|6824180440|CONSUMABLE|22|
|50点|ai.credits50.v1|6824179933|CONSUMABLE|104|
|100点|ai.credits100.v1|6824180451|CONSUMABLE|160|
|500点|ai.credits500.v1|6824180544|CONSUMABLE|639|

- 月/季/年采用固定期限、不自动续费，与安卓购买方式对应；不能写成自动续订订阅。终身为非消耗权益；AI为可重复购买且购买额度不过期的消耗商品。此处配置了会员和四个AI增量包，不虚称AI时卡、所有单工具/批量内购均已完成。
- Apple官方核对资料：https://developer.apple.com/documentation/appstoreconnectapi/managing-in-app-purchases （含版本化localizations、价格计划与首个内购随binary送审）及 https://developer.apple.com/app-store/review/guidelines/ 3.1.1（购买点数不过期）。800个中国区价格点已全分页核查，不把29.8向上冒充29.6。
- 实际非敏感证据在 E:/八字命理类文档包括排盘方式电子版/言道国学项目归档/发布包/iOS/内购配置/ ：苹果商品与八折价档核查.json（配置前历史快照）、苹果商品配置回执_20261018.json（实际写入）、苹果商品只读复核_20261018.json（8/8价格及16条本地化读回）。未给其他App创建商品、改价或换密钥。
- 原App此前REJECTED，无进行中审核可撤；本轮未删除原App、未上传新binary、未提审、未发布。现有E盘签名候选仍25.0.115(7)/7cf9e8b，不包含本节后续促销、AI购买页及反馈修复。不可用7包冒充全功能最终版。StoreKit2客户端、服务端JWS/订单归属与跨平台会员权益、恢复/退款/通知、沙盒购买、原生iPhone/iPad听学与全页面验证还没完成，须完成后重新构建8或更高、核对实际包，再把首批内购随新版送审。审核说明应如实披露学习辅助排盘及真实商业模式，不能临时隐藏后再远程放开。

### 线上部署与真实页面
- 已实际部署/www/yandaoguoxue-backend/下paymentRoutes.js、publicPricingRoutes.js、toolAdminRoutes.js、paymentAiCredits.js、middleware/auth.js、salesPromotion.js、contentSponsorPolicy.js，再补feedbackRoutes.js及middleware/activeAccount.js。线上register_routes.js有既有差异，只在唯一syncUser锚点补4行活动券展示控制，其余线上差异保留；server.js未覆盖，新社交/学习留言profile尚未挂载。
- 唯一后端回滚集合为/www/yandaoguoxue-backend/.release-backup-commerce-latest/，含改前文件与manifest。所有部署文件及原基础价配置SHA已读回一致，PM2 yandaoguoxue-backend重启后正常响应。data/sales-promotion.json从默认关闭切为enabled=true/revision2/discountPercent20，并记入管理员审计。没有开启广告。
- 最终生产网页current → /root/yandaoguoxue/releases/v25.0.115-study-commerce-e1d1a95；唯一网页回滚 /root/yandaoguoxue/releases/v25.0.107-admin-session-20261015。采用default编译渠道保留普通网站AI能力，未用tencent或iOS profile替代普通网页。版本25.0.115，buildId v25.0.115_D20261018，builtAt 2026-10-18T09:19:51.534Z；源提交e1d1a95，云产物12131609097，24946979字节，SHA-256 dec50a6c7c68fc373662ec32d803209e2edbc38cdb3f36e0e2683b325e9bf1ae。全部2218文件逐个核对后原子切换。
- 最终公网会员/AI点数/后台反馈/经典阅读/天文馆/五运六气均HTTP200。public/pricing与payment/pricing读回会员0/29.60/79.20/299.20/2880，AI包22.40/104/160/640，aiGlobalEnabled=true。未登录/api/feedback/list、/api/feedback/admin/queue、/api/payment/ai-credits均401。新增学习模块仍FREE且adEnabled=false。
- 负责人明确同意首次协议后，在生产域名390x844实测活动横幅、原价与活动价；点月度卡底部应付29.60，会员购买协议未勾选，未付款。未登录AI购买转登录。最终e1d1a95切换后重载会员及AI页，价格再次正确，document/body均390；不是iOS内购测试。
- 同域天文馆切北京/2026-06-21 12:00得太阳高度73.2°；五运六气切2027得丁未木运不及，三之气起止2027/05/21 14:17至07/23 09:04、主少阳相火/客太阴湿土；原典链接到素问66/81篇，DOM原文1369字；阴符经三篇标题、字号22和本机记住位置均正常。学习页在初次a232f06生产网页实测，最终e1d1a95仅反馈改动、这些学习页源码不变。均无390px溢出，未宣称医学逐字审校或原生扬声器/锁屏验证。
- C盘任务outputs/界面对标_20261018新增8张真实网页PNG：新版网页_待用户协议确认_20261018.png（确认前证据，现已接受）、线上会员八折与原价_20261018.png、线上AI次数包八折_20261018.png、线上AI购买未登录保护_20261018.png、线上天文馆北京夏至计算_20261018.png、线上五运六气2027三之气_20261018.png、线上黄帝内经完整章节_20261018.png、线上阴符经整本阅读字号22_20261018.png。会员/AI为最终部署后重拍，其余保留实际源构建说明。E盘发布包/学习与布局核查_20261018逐文件同步，验证记录共47项。
- 上述E盘内购配置目录的线上八折部署核验_20261018.json、新版网页部署核验_20261018.json、服务器旧网页清理核验_20261018.json保存实际回执/价格/SHA。最终移除中间a232f06候选2208文件/61,138,741字节；累计清42套/1,421,815,190字节，服务器releases仅2目录。回滚包不包含旧生产订单库，禁止用旧数据库覆盖当前订单。
- 浏览器临时视口已恢复，保留生产会员页作交付入口；无3113本机预览服务。

### 清理、同步与下一步
- 本次所有云构建依赖/SQLite测试库在云端，预览zip只在内存，C盘未重新创建node_modules/.next/out/www、解包目录、IPA副本或一次性物理脚本。保留的asc-learning-products.mjs为入仓维护工具，静态发布清理/部署过程没有另存一次性脚本。
- 服务器旧网页实际清除41套静态发布目录，合计1,360,676,449字节；事前核对绝对路径、无软链接、无运行进程/NGINX引用、仅网页静态文件，保留新网页与已验证的v25.0.107-admin-session-20261015回滚版。后续中间候选清除及最终两代读回见上一段部署回执。服务器释放量不得计成C盘释放量。证据服务器/root/yandaoguoxue/cleanup-static-releases-20261018.json及E盘服务器旧网页清理核验_20261018.json。
- C/E旧19个清理目标再次实查19/19不存在；前序自动审批拒绝的5个精确目标仍5/5存在、86,951,386字节。本轮未再次尝试删除、未换工具/语言绕过拒绝、实际这5项新增删除量0。原唯一CP936精确CMD与JSON清单仍按55节路径保留，需负责人手工执行后读回；97历史副本独有语料/变更仍待审，不盲删。不能声称全部旧物已清或所有物理版本已达两代。
- 用户协议首次弹窗经负责人明确回复“同意，继续验收”后才点击接受；不默认代接受其他购买协议。未登录购买只验证转登录，不登录他人账号、不做真实收费。浏览器临时390x844视口已reset，生产会员页明确留作交付；无3113临时服务。
- C盘当时可用20,777,537,536字节、E盘13,078,200,320字节，为系统快照，不把后台系统空间变化全归于本次清理。固定四份报告同字节同步，最终SHA另在验证记录中读回，避免报告内自引用自身哈希；收尾diff-check、私钥门禁、Git提交推送及空status/上游0 0另读回。
- 下一步必须继续StoreKit及权益验证、新原生包/最终截图和审核答复；生产学习留言与全社交后端尚未挂载/联调，当前广告未启用。古籍其余书目全本/逐字校勘、医考真实医学审校、362穴版本与逐穴准确授权图、竞品各模块全面对照、旧泄露密钥撤销及历史副本/被拦清理仍未闭环。以上不因本轮价格上线而变成已完成。


## 57. 2026-10-18 苹果内购、原包上传与负责人测试资格（开发检查点，整项仍未完成）

### 当前真实状态
- 用户再次要求全部完成并提审，随后明确“我要测试”。截至本节：25.0.115（8）已签名、上传Apple并处理有效；本人内部测试邀请已建立。尚未重新提交App Store正式审核、未发布，不能称“全功能全部验收完成”。当前原App审核版本仍REJECTED；不能把TestFlight“准备提交”误说成正式版等待审核。
- App ID 6807592575，bundle com.yandaoguoxue.app。构建ID 9d4785d8-d513-47ba-a4d3-218b676311a1。签名运行 https://github.com/wzmpa18/minglizyi/actions/runs/39118718256 ，源d494e0ad5a7e91206d60499f00448d128f6b099b；IPA 27,684,859字节，SHA-256 b009748ef8487ca8f9cfe5d0e19be681de8c9be256de9d5676c89b1925d8373f。下载ZIP和IPA仅在内存核验，没有新增C/E实体IPA。Mach-O含AppleLearningStorePlugin、LocalTtsPlugin；Info.plist为25.0.115/8，消耗品历史键开启，内置资源无server.url。
- 首次8构建39118384910因归档实际仍用项目内旧构建号而被核验阻止，未上传；d494e0a将RELEASE_BUILD和RELEASE_VERSION显式传入xcodebuild，并关闭导出自动改构建号。没有删掉断言把失败当成功。
- 上传运行 https://github.com/wzmpa18/minglizyi/actions/runs/39119431505 成功，上传的是上述已核验的同一IPA，先校验来源成功运行、包名/版本/构建号及SHA，再查询Apple防止重复上传，没有重编另一个同号包。
- 浏览器重新登录后检查付费App协议有效、银行可用、税表使用中；Developer账户显示新版许可协议签发2026-10-14、已于2026-10-18接受。代理未接受新的法律协议，未改银行/税务信息，也未改其他App。
- 原内部群组“言道国学”已有构建8但0测试员；只选择当前账户持有人本人，添加后Apple显示内部群组1人、本人“已邀请”。未邀请其他候选成员。负责人应在iPhone TestFlight用当前开发者对应Apple账号接受邀请并安装25.0.115（8）；这是阶段测试，不能当全部完成。测试内容已保存并明确剩余事项。

### 代码、验证与生产部署
- dd9a38a新增跨渠道会员账本；cf97f52完成StoreKit2客户端、官方Apple签名验证服务、购买/恢复/退款与UI；81246e2把生产已有后台会话/联系方式脱敏改进合回源码，避免后续覆盖退化；4aa5d47新增上传既有已核验IPA的维护工作流；3f894da新增服务器专有沙盒账号配置。全部已推送codex/tencent-store-compliance。
- 主要文件位于本活动仓绝对目录 C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/ ：backend_deploy/membershipLedger.js、appleIapLedger.js、appleIapVerifier.js、appleIapPolicy.js、appleIapRoutes.js、appleIapCatalog.json、apple-iap-runtime/{package.json,package-lock.json,README.md}、apple-root-certificates/{manifest.json,三张公共CER}；paymentRoutes.js、adminUnifiedRoutes.js、accountDeleteRoutes.js、adminRoles.js、adminPrivacy.js、server.js；ios/App/App/AppleLearningStorePlugin.swift、LocalTtsPlugin.swift、Info.plist及App.xcodeproj/project.pbxproj；src/lib/appleIap.ts、auth.ts，src/components/AppleLearningStore.tsx、ApplePurchaseInit.tsx、shared/brand-header.tsx，src/app/layout.tsx、membership/page.tsx、ai-credits/page.tsx、membership-agreement/page.tsx；scripts/apple-iap-{ledger,client,http}.test.cjs、membership-ledger.test.cjs、admin-session-privacy.test.cjs及三个相关workflow。
- 购买只接受服务器固定8个已批准SKU。客户端显示StoreKit实际displayPrice，不用安卓原价充当苹果历史价。取消/待家长批准不提前发放；服务器验证并提交权益后才finish，失败留待恢复。启动/前台/网络恢复及人工恢复会核对全部历史，账号切换不会把购买转给他人。苹果购买点数永久有效且重复恢复不补回已消耗点数；iOS外部收款仍关闭，不触发安卓返佣上报。会员服务协议补充苹果购买、固定期限、恢复与退款说明。
- 会员投影保留既有安卓基线及后来独立订单；低档续购不降有效高档，历史已到期苹果时卡不能给当前安卓权益加时；按订单退款只撤对应赠予，旧回执不能复活退款，官方退款撤销通知只恢复未用剩余点数/原赠予。管理员调整/注销界限不会被旧购买恢复覆盖。未知历史订单退款不猜测扣除遗留权益，需个别对账。
- 使用官方 @apple/app-store-server-library 3.1.0及Apple官网三张公共根证书，SHA固定，开启在线证书撤销检查。Production/Sandbox严格验证，拒绝Xcode/LocalTesting、错应用、错SKU/数量、未绑定appAccountToken及不匹配账号。私钥不需部署到业务服务器。Production/Sandbox交易分名空间，沙盒只允许服务器配置的当前App Store审核演示账号，不向真实顾客普遍开放；测试账本须排除实际收入统计。演示账号身份/密码不写本报告。
- 质量运行 https://github.com/wzmpa18/minglizyi/actions/runs/39119711664 成功：64项行为测试、TypeScript、来源/篇章结构校验；cf97f52的ios-full-learning静态预览39118382932亦成功。测试覆盖交付/恢复/过期/跨渠道退款/撤销退款/账号归属/切换、真实HTTP/JWT/SQLite、官方验签器拒绝伪造载荷、后台会话和脱敏。不能替代真实Apple沙盒购买及iPhone/iPad听学验收。
- 实际部署 /www/yandaoguoxue-backend/ 下20个文件；线上server.js有既有差异，仅在唯一extraRoutes锚点插入appleIapRoutes，未全覆盖。platformFeatureGate与releaseProfilePolicy同步使新正式ios-full-learning版本按已编译功能工作，旧版策略不变。adminUnified保留生产手机号/邮箱脱敏；adminRoles会话代码已先合回Git，无源码漂移遗失。旧会员/安卓付款代码已接新账本。
- /api/health=200，/api/apple-iap/context未登录401、当前审核演示账号200且8SKU/受限沙盒=true；无效签名POST=409且交易账本没有变化；公开价格接口200、原活动保留。未做真实扣款或伪造成功Apple交易。服务器唯一后端回滚集合现为 /www/yandaoguoxue-backend/.release-backup-backend-previous/，已逐文件核验manifest。新服务正常验证后才清理旧commerce备份213,470字节，候选/安装缓存/暂存目录已不存在。

### 证据、剩余任务与清理
- 非敏感回执：E:/八字命理类文档包括排盘方式电子版/言道国学项目归档/发布包/iOS/内购配置/苹果内购候选包核验_20261018.json、苹果内购服务部署核验_20261018.json、苹果审核账号映射核验_20261018.json。真实后台截图C盘 outputs/界面对标_20261018/苹果TestFlight_25.0.115_8_已保存测试说明.png 与 苹果TestFlight_本人已邀请_20261018.png，均同步E盘学习与布局核查目录并加入验证记录。
- 本轮核查《温病条辨》公开来源8部分时，原病篇和卷六来源明确标注校订不足/错误百出，未将它们作为准确全文上线。试导数据已恢复原有已核验数据，临时导入脚本已删除，未提交失败语料。素问/灵枢/难经/神农原文现有来源结构齐备，仍不能声称全部古籍已逐字医学校勘。金匮、伤寒、温病的完整可靠版本及逐穴定位/逐穴图仍待继续核对。
- 新社交/穴位文字留言服务本轮尚未挂载或开启，不能把已有源码测试通过写成线上全社交完成。三模式紫微/八字/六壬已有改进，但仍非全模块一比一、逐像素验收完成；本轮未改竞品布局代码。最终真实iPhone/iPad截图、全链内购沙盒验收、8个商品余下可售地区/审核图片、所有专项工具/AI时卡苹果购买、正式审核说明更新及重新送审仍待完成。
- C/E原5项待用户CMD清理未由代理删除；本轮创建的 C:/Users/ZhuanZ/AppData/Local/Temp/guoxue-iap-lock-cache 100文件15,645,522字节删除也被自动审批拒绝（仅返回blocked by policy，非文件系统权限不足）。没有改用其他工具/语言绕过。已将精确第6项加入同一CMD与E镜像，未执行；不能写成已清场。历史97副本独有源码/语料审结债务仍未处理，不能盲删/盲提交。
- 当前CMD：cmd /c "C:/Users/ZhuanZ/Documents/Codex/2026-10-17/e-c-users-zhuanz-documents-codex/outputs/guoxue-clean-20261018.cmd"；CP936/CRLF，最新SHA-256 f9a6b6183396d47cb275a71cdb9c555d3909f14c67d87a3334c25604745407ac。原7号实体IPA保留校验后方允许删除过时6号；8号仅云端及Apple，无新增本地整包/解包/node_modules/.next/www。下一步先完成商品与负责人测试可用性，再补布局/社交/准确完整资料及最终正式提审，不重复提交已有审核任务。

## 58. 2026-10-18 增量：恢复首页学堂、排盘笔记、天文运气联动、整本资料与苹果新版准备

### 范围与真实状态
- 本轮仅处理言道国学。负责人明确要求首页中间保留言道学堂，紫微不能对齐则恢复旧默认布局且不删已有功能，八字加个人断事笔记/仅本机图片，六壬左列字与线条加大，天文馆定位并增加五运六气介绍；授权全球可用地区，并要求核实华为。外语和其他App不改。
- 业务源码已推送至042822e（此前5dbf0a8、31ec7c8、b5b5373、fce394d、78f883f、2b4d514、41f0b57、c903130、3cb32fe）。最终网页源042822e已上线，84项行为检查、TypeScript、来源结构检查及静态构建39130895745通过。文档另行提交后必须只读核对空status和上游0/0。本轮整体仍未完成：原生/内购验收、最终审核素材及正式送审等见末尾，不得声称全功能已验收或已上架。

### 实际改动、路径与验证
- 所有本轮改动的绝对路径、状态及SHA-256保存在 C:/Users/ZhuanZ/Documents/Codex/2026-10-17/e-c-users-zhuanz-documents-codex/outputs/界面对标_20261018/本轮源码改动与核验_20261018.json，E盘发布包/学习与布局核查_20261018有同名镜像。活动源码根为 C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/ 。
- src/components/BottomNav.tsx恢复iOS完整渠道“首页/发现/言道学堂/聊天/我的”的中间学堂，默认国内网页三项中间同为学堂。src/app/yixue/ziwei/page.tsx恢复旧盘面为默认，专业大盘保留可选，三合/飞星/四化均可切换。390px实测三模式无横向溢出；不宣称全模块一比一或像素级完成。
- src/components/LocalChartNotebook.tsx、src/lib/chartNotebook.ts及src/app/yixue/bazi/page.tsx：断事笔记对游客也可用；以账号、姓名/档案、出生年月日时分、地点及排盘设置区别记录；文字和最多6张本机图片均入USER_PRIVATE_DATA分区，不发网络、不参加云同步，旧文本经用户确认归属再导入。单图5MB/合计20MB，校验格式与解码，保存失败不覆盖旧记录。实际UI添加文字和一张自有学习截图，保存后换标签重开，内容与图片均恢复，显示“文字和图片均未上传”。未用真实个人资料。
- src/app/yixue/daliuren/page.tsx左列加宽至至少112px，标签约12px、值约14px，主要分隔线1.5px。78f预览320px及390px验收；线上390px核对。src/algorithm-core/modules/daliuren/index.ts修复把公历月日套字当农历的旧错误，改用lunar-javascript真实换算，春节/中秋/闰月/重阳日期回归通过；2026-10-18线上正确显示“农历九月初九”。已纠正一张证据文件原先误标320的名称，实际为390，不能当线上320证据。
- src/app/academy/astronomy/page.tsx、src/components/SkyYunqiLesson.tsx、src/lib/astronomyStudy.ts、src/lib/localSkyLocation.ts及ios/App/App/LocalSkyLocationPlugin.swift：新增主动一次定位、手工经纬度/城市、时间前后步进与播放暂停、太阳视黄经/24节气/六主气环图、年干五运和主客气/司天在泉学习，六步可跳到交节后首个整分钟的天空。固定UTC+8，天空演示公元1—3000年；运气分步采用大寒起点的节气约定，标明1900—2099年及学说差异。主页HomePage.tsx共用同一交节算法，纠正寒露错误标“六之气”为“五之气·主气阳明燥金”。实际UI初之气联动黄经300.00°，1054年可计算，时间推进与暂停通过。仅绘日月及行星9天体，不冒充Stellarium完整恒星目录/极长年表/DE431精度；真实GPS允许、拒绝及iPhone/iPad听学仍待实机。
- 周鹏说历法公开目录已核对（https://www.bilibili.com/list/406929249?bvid=BV1Wg411Z7uT&oid=513640566），包含天文馆设置、干支历法及五运六气相关题目；未完整观看视频，不称已全面复刻其教学或验证其论点，未复制其视频/图片/文案。自编课程链接《素问》整篇与自测/连续听学，学说与现代天文计算分开，参考上海中医药大学及天津中医药大学学报公开论文；已纠正一条旧论文链接。
- src/data/tcmClinicalOriginalEditions.json及scripts/import_tcm_clinical_editions.py：按中医笈成固定Git版本、CC0编辑声明导入伤寒论宋本12节45123字、金匮要略26节41546字、温病条辨9节120580字，共47节207249字。保留异体字与全部序/卷，未收录来源图片。与原有素问81、灵枢81、难经81、神农19分节合计7部309篇卷。读者可查固定来源、原文校验和来源自标品质；“65%/90%”不是本应用医学准确率，目录完整不是逐字医学校勘。原13条学习整理继续保留且标明节选/AI整理，不能统称全部书籍都已补齐完整校勘。
- src/lib/tcmEditionPack.ts、src/components/TcmEditionProvider.tsx、src/app/zhongyi/classic/page.tsx与backend_deploy/build_tcm_original_editions_pack.js提供纯JSON原文更新，不执行远程代码，不得移除内置完整书或截短为摘要。阅读中保持当前原文，进入下一章采用已校验更新；042822e补上初始读取门槛，直接打开章节先读本机版本再冻结正文，并显示本章版本。线上实际下载、校验、安装1.0.0，重开直达伤寒论章节显示“文献版本：1.0.0”。
- 中医整本包tcm-original-editions-approved/1.0.0已真实发布COS，1324422字节，SHA-256 f71334be284eed1403527d42535f40d16837fc0ff86723265d6308795cbe17b9，最低App25.0.115。41f0b57修复v25版本前缀导致全部包误判“需升级”。c903130只给已有COS只读规则补三个公开客户端头，不改来源、方法、其他规则，不增加Authorization。仅修CORS仍下载失败，3cb32fe改为现有鉴权端点先解析短期直连地址，再单独向COS取文件；App JWT不传COS，大小/版本/哈希及合法域名校验保留，会员包未登录仍401，旧307兼容保留。真实网页显示“已下载并校验通过”“已安装”，不是仅接口200。新增服务器转发方案的代码写入曾被自动审批blocked by policy拒绝，未落地；最终采用不同的客户端COS直连方案，没有换工具执行被拒方案。

### 服务器、社交与真实商店记录
- /www/yandaoguoxue-backend挂载400个穴位目标（standard:LU1、dong:DT.01实查200），文字留言上限500字，不收图片，登录/有效账号/来源/频率/审核/举报/屏蔽/作者撤回均有门禁；501字与携图实际认证请求400，匿名401，没有在生产发表有效测试留言。iOS25.0.115完整渠道对普通用户启用社交，不按审核账号开隐藏功能；默认国内配置仍关闭。新公开动态先pending，作者可见状态/撤回，失败保留草稿；社区人工值守和全部真机聊天链路未核实，不能写全社交已运营验收。
- 保留生产已有后台会话/联系方式脱敏改进，不全覆盖server.js，仅补必要挂载；真实DB_PATH与.env生效。一次维护漏载dotenv曾把新草稿写进非运行的默认users.db，已只移除本次误建草稿并保留原有记录，正式内容包写入真实运行库。后端唯一回滚集合仍为 /www/yandaoguoxue-backend/.release-backup-backend-previous/，扩展原文件与COS规则备份；订单、会员和内购账本不回滚删表。
- 当前网页 /root/yandaoguoxue/current -> /root/yandaoguoxue/releases/v25.0.115-learning-042822e，唯一网页回滚为v25.0.115-learning-3cb32fe（同样实测过下载/安装）；最终version.json builtAt=2026-10-18T13:18:58.313Z。构建ZIP SHA a83b04ff9c8e4cb3fcac5f3d37ce1e98e9b8401632b9bcf6ccfc049158cdb7ad。先逐文件哈希再切换，实际网页验收后删除五个更老阶段目录，共307172875字节，最终只留两套。服务器删除量不计作C盘释放。一次服务器直拉构建超时已停止本任务下载进程，改用已核验文件差量传输；不留解包临时目录或第三套最终发布目录。
- 华为App119286157、包com.yandao.guoxue实时查看：正式25.0.109/2096待修改，历史2026-10-15 21:27:33明确“未通过审核”；25.0.111为开放式测试草稿、准备提交。历史共两条。全网发布是版本类型，“审核通过立即上架”是设置，均不代表通过。未改动、未重复提交华为。OPPO/荣耀原2101及Google本轮未新提交；其他App不动。
- Apple原App6807592575、原版本记录299afd61-88b3-4f82-b0dd-54847928f1e8保留，未删除重建。已将错误旧版本串“言道 v25.0.77”更正为25.0.115，草稿由REJECTED进入PREPARE_FOR_SUBMISSION；当前最终构建选择须以以下收尾读回为准。审核说明草稿如实列出保留的八字/紫微/六壬、学习与社交、StoreKit，移除原先“排盘已下线”的不实说法；结构化演示账号/密码与联系字段均保留，不在本报告重复。App及8个内购均175地区（发布时供应），8品仍缺审核截图等元数据，不当作已可售。
- iOS25.0.115（13）签名运行39130898368成功，源码042822e，IPA27948190字节、SHA-256 1ddd415af44d533a975458be03c36282b12eaf4e68b67b749194b27328369813；仅内存核验，未下载实体IPA/解包到C/E。已核对包名、版本、构建号、原生听学/StoreKit/定位符号、无远程server.url及消耗品恢复配置；上传既有同一哈希包运行39131477119已发起。此前8/9/10/11/12仅阶段测试，不以旧包冒充最新源码，不复用已上传构建号。
- 苹果正式及沙盒通知地址均已在App信息页真实保存为 https://yandaoguoxue.yandao.vip/api/apple-iap/notifications 。官方当前API域名api.storekit.apple.com/api.storekit-sandbox.apple.com；真实沙盒TEST请求和状态200，sendAttemptResult=SUCCESS，证明签名通知已送达服务端。生产TEST仍401，未伪称通过，原因尚未确认。不发送真实付费订单、不虚构沙盒购买或退款成功。

### 证据、清理制度与剩余事项
- 主证据目录 C:/Users/ZhuanZ/Documents/Codex/2026-10-17/e-c-users-zhuanz-documents-codex/outputs/界面对标_20261018/ 与 E:/八字命理类文档包括排盘方式电子版/言道国学项目归档/发布包/学习与布局核查_20261018/ ：验证记录.json、本轮源码改动与核验_20261018.json、华为当前审核状态核验_20261018.json、穴位文字讨论与中医整本内容包部署核验_20261018.json、新版iOS社交部署核验_20261018.json、新版页面与天文运气上线核验_20261018.json、对象存储公开版本头核验_20261018.json、内容包直连解析核验_20261018.json，以及实际环图/笔记/原版紫微三模式/六壬/下载成功/直达章节截图。苹果回执在 E:/八字命理类文档包括排盘方式电子版/言道国学项目归档/发布包/iOS/内购配置/苹果内购候选包核验_20261018.json、苹果商品全球销售范围回执_20261018.json、苹果服务器通知核验_20261018.json、苹果审核说明草稿核验_20261018.json。网页截图不冒充iPhone/iPad或真实购买画面。
- 原19个目标及上一批旧预览/三重复图/build6共5目标，重查24/24不存在；不把无法归因的删除写成代理完成。当前只剩 C:/Users/ZhuanZ/AppData/Local/Temp/guoxue-iap-lock-cache（100文件15645522字节）及活动仓scripts/__pycache__（1文件16360字节），合计15661882字节。原生删除仍被自动审批blocked by policy拒绝，实际未执行，没有换CMD/其他工具绕过。已从唯一可执行CMD移除已不存在的旧目标及过时build6删除指令，并修复CRCRLF为标准CP936/CRLF。当前只含两个精确缓存目录；正式2101 APK及实体7号IPA的SHA保护复核通过。
- 唯一当前手工命令：cmd /c "C:/Users/ZhuanZ/Documents/Codex/2026-10-17/e-c-users-zhuanz-documents-codex/outputs/guoxue-clean-20261018.cmd" 。CMD SHA-256 06a64a99c61c5d860bd8a748492813f876f6fb1ff603aa8b19207513651abad7；同目录国学CMD清理清单_20261018.json与E盘学习与布局目录镜像已同步。负责人执行后必须重新检查，不能把命令已给当已删除。
- AGENTS.md、唯一制度第七节与入口README已明确当前命令只取最新增量/唯一CMD；第50节等旧命令仅是历史证据，不再指向旧目标执行。制度与入口同步E盘。RAM预览PID24376已按端口/进程/父进程身份核对停止，3113无监听；保留用户无关8768服务。未新建本地node_modules/.next/out/www/实体IPA或整源码副本。
- 历史97副本仍6修改/192删除/66独有未跟踪（含待审原始资料）未审结，不能盲删、盲提交或声称全项目零未提交；活动仓源码已推送，文档本次收尾提交后必须空status/上游0/0。苹果新钥仍为E盘苹果专区顶层URY888FLWG，国学构建可用，其他产品未改；历史UWQ及未落盘KZH未撤销，不能把源码私钥门禁通过当成实际撤销。
- 剩余：负责人已确认有iPhone/iPad，需接受现有本人TestFlight邀请安装最终包，验证GPS允许/拒绝、连续听学前后台、图片笔记、社交举报/屏蔽、StoreKit真实沙盒商品/取消/购买/恢复/退款；补8商品审核图及正式iPhone/iPad宣传图，核对专项工具/AI时卡苹果购买映射、版权/ICP/医疗信息声明等实际资料后，在原App仅提交一次。医学来源逐字审校、361逐穴准确授权图、题库来源与医学审核、竞品全模块对标、社交人工值守与历史97债务仍未闭环，不能宣称全部完成。本文四份固定镜像将逐字节同步，实际SHA见主账本本次增量与C/E验证记录。

### 最终13号包与收尾读回（2026-10-18）
- 上传运行39131477119已成功。Apple实际处理状态VALID，构建ID7051af61-933b-4389-a8fc-b4fce258a36c；原App的25.0.115草稿已选择构建13，状态PREPARE_FOR_SUBMISSION，尚未正式提审。上述“已发起”已由此最终读回替代。
- TestFlight 25.0.115（13）测试说明已保存，保存按钮禁用，现有“言道国学”内部组1名测试员可访问；没有新增外部联系人或替负责人发送消息。实际截图：C:/Users/ZhuanZ/Documents/Codex/2026-10-17/e-c-users-zhuanz-documents-codex/outputs/界面对标_20261018/苹果TestFlight_25.0.115_13_测试说明已保存.jpg，与E盘证据镜像一致。负责人已确认有iPhone/iPad，尚未返回安装及原生验收结果；测试说明已写明定位、连续听学、图片笔记、整本离线安装与StoreKit限制。不得把内部组可访问写成真机已验收或正式已发布。
- 最终网页源码042822e、质量39130895745成功84项行为测试及完整构建；签名39130898368和上传39131477119均成功。不再生成同源码重复包；TestFlight应选择13，旧8至12均仅历史阶段包。网页直接重开伤寒论章节已实际显示已安装文献版本1.0.0，下载、校验、安装证据与新读版证据已归档。
- 本节及入口/制度/主账本需逐项审查提交推送；最终提交号、空status、上游0/0、四份报告SHA和截图哈希写入同一C/E验证记录，避免将提交号写回受跟踪报告再次产生未提交改动。两个受审批拦截缓存和97历史副本债务仍未完成，不宣称彻底清理或全功能验收完毕。


## 59. 2026-10-18至19日 反馈、排盘互跳、罗盘与学习内容整改（开发检查点，整体未完成）

### 负责人指令、顺序和保留边界
- 本轮只处理言道国学；先修反馈/误触缩放，再修紫微、八字、六爻、梅花、七政和奇门，随后罗盘/定位、中医预览与图谱、天文馆、公司介绍。保留原功能，不改变其他产品。iOS继续学习入口；安卓与普通网站保留原工具首页，中央言道学堂入口保留。
- 最新追加：紫微中宫点击四柱，弹出应用内确认后，直接进入同一人的八字基本信息；八字基本信息按钮直接进入对应紫微三合盘，不要求重新填写。负责人报告月度及季度会员均在Apple沙盒提示购买成功；不能据此写成服务端到账或真实收费。
- 源码基址 C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/ 。本轮60个变动的完整绝对路径保存在下述证据目录“本轮源码与实际验收状态.json”；不另起竞争交接报告。实现提交0c65618、0415f15、2ab9ed3、f37a734、b74ba1c、342321e均已推送，最终产品源码342321e7204a8304bb328a16698f996109ffa644。

### 实际实现与文件
- src/app/discover/page.tsx、src/components/AcupointStudyDiscussion.tsx改Next Link到/profile/feedback/，入口写“用户反馈 / 联系开发者”，沿用私有反馈及运营处理后台，避免原生壳整页加载回首页。最终原生反馈链路仍待新包验收。
- src/components/GlobalZoomProvider.tsx、SwipeBackProvider.tsx、src/hooks/useSwipeBack.ts及globals.css：全局屏幕放大默认关闭，仅“我的”设置显式开启；去掉双击放大，恢复原大小按钮在独立层，局部盘面/星图缩放不触发全局缩放；移动端输入避免小字号触发焦点放大。开启状态读取曾漏设false，已修复；不能只凭静态代码称捏拉/拖动实机通过。
- src/app/yixue/ziwei/page.tsx、ClientShell.tsx、src/components/ProfessionalZiweiBoard.tsx：保留原默认盘与三种模式；去掉新增两行顶栏和真太阳时横幅，保留修改出生资料入口；辅星最小10px并可换列；中宫姓名/资料及宫位资料跟随选择；AI学习解读折叠成一处，移除紫微通用顶栏的重复分享，盘下保留一个真实结果分享按钮。AI/分享遵循已有后台工具矩阵开关。实际390px线上图已保存，不宣称全面1:1一致。
- src/lib/chartHandoff.ts、scripts/chart-handoff.test.ts及八字/紫微页面：一次性sessionStorage传递，10分钟有效，不将出生资料放URL；分开保存原始公历时间与实际计算时间，跳转直接用计算时间，避免二次真太阳时校正。保留姓名、性别、分钟、经度/地点与校时选项；历史无原始时间者保留原计算时间而不反推。紫微去八字落基本信息，反向落三合盘。原浏览器confirm造成旧验收页阻塞，已改为应用内确认；由于旧浏览器弹窗仍待用户关闭，最终双向点击流程还未端到端验收，不冒充通过。早晚子/夏令开关的历史算法口径仍需专项核验，保留选项不等于本轮全部算法已验证。
- src/lib/baziRelations.ts及八字页面：补柱位标识的天干五合/冲/五行克、地支六合/冲/害/刑/自刑/破、完整三合三会；合与化分开，不把六合误写半合。不移除本机断事笔记及图片备注。
- src/app/yixue/liuyao/page.tsx仅补变卦每爻及卦名释义点击；梅花页面黑色卦爻、红色动爻、深灰伏神，修正动爻行高/体用对齐及低对比。src/algorithm-core/modules/meihua/index.ts时间起卦改按年支数、农历月日、时支数；经典观梅、春节及64卦×6爻单爻翻转测试通过。明确自然日午夜换日、闰月按月数；现代编码起卦标明非古籍笔画法，未宣称所有流派方法等同。
- src/app/yixue/qizheng/page.tsx、src/components/QizhengDetailedChart.tsx：简洁/详细按钮写清当前与切换目标；两种盘均支持全屏、安全区外再留18px；详细盘四柱/十一曜/状态表移到圆盘下面并保留整图导出。第五圈更细的宽度优化及多款刘海手机完整截图仍待视觉验收。奇门页面按实机参考调整神/星/门/天干地干位置，保留原算法与附加功能，增加安全区全屏。
- android/app/src/main/java/com/yandao/guoxue/plugins/LocalSkyLocationPlugin.java、MainActivity.java、AndroidManifest.xml、ios/App/App/LocalSkyLocationPlugin.swift、src/hooks/useCompassSensor.ts与罗盘页：Android本地前台GPS/网络定位、旋转向量方向传感器；iOS CLLocation磁北方向，停止/后台清理；Web保留支持的传感器降级和手动模式。GPS位置与方向测量分开，未知方向不伪造；罗盘文字改深色提高对比，只自动保存用户手选位置，不自动持久化实时GPS。两平台编译通过不等于实际转动/GPS通过。
- backend_deploy/zhengguPreviewPolicy.js、academyRoutes.js、src/components/ZhengguPreview.tsx、正骨页：第一统计写“传承核心资料”；逐知识点服务端截取最多48码点且不超过20%，游客可见短预览，其余接口付费校验；补知识点直达、来源追溯和宽泛列表/题库的保护，防前端隐藏后仍泄露。线上212知识点预览HTTP200，实际最长20码点，exportAllowed=false。前端不提供导出，已付费可看；不承诺防截图/绝对防复制。每知识点接入既有文字讨论，审核/举报/屏蔽沿用原规则，国内社交仍按原渠道政策。
- src/components/AnatomyStudyAtlas.tsx、public/assets/anatomy/：LadyofHats全身骨架正面公版SVG、Gray388腰背筋膜局部公版图，来源/作者/许可/SHA已记录sources.json；图可独立放大查看，另列主要关节学习索引。并非完整全身筋膜与逐关节全套图，未生成不准确的临床定位图冒充。
- 中药页改“本草性味归经”，按实际字段筛性味/归经，古代三品与现代功效体系分开；保留旧检索标签；链接《神农本草经》整本。src/components/TcmStudyRoadmap.tsx加入四诊、八纲、气血津液脏腑、六经、温病三焦、治法方义配伍学习路径，链接原典；辨证页/方剂页保留原查询与工具。药典只补2025版规范介绍与官方来源，不冒充全部药典各论均已收录校验。董氏仍39条旧数据，去掉搜索只显示10条的截断，详情注明非全集/未专家核定位；不虚构“全董氏已补齐”。医考题库医学审核未完成。
- src/components/InteractivePlanetarium.tsx、src/lib/planetariumProjection.ts、public/assets/astronomy/与scripts/import_bright_star_catalog.py：固定HYG v4.1来源，8920颗6.5等及以上亮星子集，CC BY-SA4.0许可和来源随包；星空地平坐标、太阳系、近邻恒星空间，拖动、按钮/双指缩放、英文名/HIP检索、全屏，沿用原定位/时间与五运六气课程。保留原日月行星图。明确岁差处理但未外推恒星自行，空间图不等于整个宇宙，不具备全部Stellarium/星云纹理/望远镜/DE431功能；官方Stellarium网页版作为明确外部链接。
- backend_deploy/companyProfile.default.json、posterConfigRoutes.js、src/components/CompanyIntroduction.tsx及src/app/admin/company/page.tsx：个人中心公司/产品/软件开发服务及官网，可由已有受保护后台编辑纯文本与HTTPS网址；公开读取/API不提供编辑权限；保留原运营配置，不加入外部数字权益购买引导。

### 验证、部署、包与平台状态
- 本轮最初几次云检查分别发现农历API类型、正骨残留登录包装、星图JSX闭合和AstroTime参数问题，均修复后重跑。最终质量39140644826：TypeScript、93项测试0失败、完整default静态构建成功；包含年月日算法/384爻变换/跨盘一次性交接/星图投影及真实Express/SQLite正骨权限测试。私钥门禁1784路径通过。不能把这些结果冒充iPhone/iPad实机验收。
- 后端五文件已部署 /www/yandaoguoxue-backend/ ：academyRoutes.js、zhengguPreviewPolicy.js、posterConfigRoutes.js、companyProfile.default.json、appleIapRoutes.js，PM2 reload后online。线上academy与改前仓库仅换行差异已归一核对；server.js不全覆盖。唯一回滚集合仍.release-backup-backend-previous，补存首次改前文件；不回滚用户/订单数据库。内购新增有限枚举诊断，不记录JWS/账号/交易ID或私钥。
- 新网页current实际指向 /root/yandaoguoxue/releases/v25.0.115-chart-learning-342321e，2235文件64250322字节逐文件SHA核验后原子切换；/version.json、/yixue/ziwei/、/academy/astronomy/、/profile/feedback/均200。default编译渠道，builtAt=2026-10-18T15:29:47.630Z；构建ZIP SHA d2b92c68751b02457a274aad5eebe5c9fa78e9fd77b9d6765317dceceb74f8f1。真实390px紫微截图已证实单顶栏、中宫四柱及单分享入口；最终点击/缩放/反馈等端到端验收仍待旧浏览器确认框解除。未将读取DOM和截图写成全部交互通过。
- 网页唯一回滚为v25.0.115-learning-042822e。新站HTTP核验后已移除更老v25.0.115-learning-3cb32fe，2220文件62248305字节，实际残留只2套；删除量属于服务器，不计C盘释放。
- Android 25.0.115/2102，构建39140649036成功；版本/包名/正式签名SHA门禁通过，签名指纹8ca0c414573d4b05fc2bd1ba9c6a2a8090c90c58e3815119494607443dc6d5a0。实体仅E:/八字命理类文档包括排盘方式电子版/言道国学项目归档/发布包/Android_25.0.115_2102/言道国学_25.0.115_2102.apk（27071304字节，SHA57b8f8aab75d2faff19ad816dc7da0119cd0adcb579dc70a7363b23c2e7217d3）及同目录.aab（27436033字节，SHAb79f103c3d161cd2ede1073035e910bbbf73515991a57224c863006b1f37a5f7）。已向连接手机覆盖安装，但卡在华为系统账号/安装验证，安全页面截图返回空；需负责人亲自完成，原数据不清空。最后安装版本读回仍2094/25.0.107，不称2102已装/实机已通过。没有提交任何安卓市场新审核，不重复荣耀同版本任务；Google/华为本轮未新操作。
- iOS 25.0.115（14）：签名39140646867，IPA28579307字节、SHA1f866775501b28410452f3e0d8f74b6859a93609b8111d39fa336a585ad39e2f；只在内存验包，未复制IPA到C盘。上传39141269553回执UPLOAD SUCCEEDED；Apple构建7443ed0f-83a5-4092-83f4-77cf12dfa6ee为VALID、IN_BETA_TESTING，内部组hasAccessToAllBuilds=true，已有本人测试资格可用。14号测试说明API保存并读回，列明实机待验与医学/天文限制；查询build betaGroups关系API403，未声称该关系调用成功，已从现有内部组全构建权限和buildBetaDetail实际确认测试状态。原App25.0.115草稿已换14，仍PREPARE_FOR_SUBMISSION，未正式提审、未正式发布。8个内购均仍MISSING_METADATA，审核图片等资料待补。
- 月度/季度沙盒：截至2026-10-18T15:50:14Z，真实库apple_iap_transactions为0、apple会员grant为0；新增诊断发现两次sandbox_not_enabled，说明交易签名通过后被指定沙盒测试名单挡住。既有审核演示账号在名单，另一个已建IAP上下文的普通账号不在；尚未确认后者就是负责人所用账号，不凭推测向普通账号发会员。已询问测试用户编号/手机号末四位供核对，确认后仅配置该账号并恢复原签名订单，无需重复购买；正式收费政策不扩大。取消/恢复/退款及实际到账未验收，不把沙盒提示写成真实付费或到账。

### 证据、清场与待办
- 证据目录C:/Users/ZhuanZ/Documents/Codex/2026-10-17/e-c-users-zhuanz-documents-codex/outputs/实机整改_20261018/ 与 E:/八字命理类文档包括排盘方式电子版/言道国学项目归档/发布包/实机整改_20261018/ ，沿本轮起始日命名不另开重复目录。含本轮源码与实际验收状态、完整检查93项、新版包校验、网页发布/两代轮换、正骨预览/公司介绍、Apple14与沙盒诊断JSON，以及真实文墨中宫/热卜梅花/奇门/罗盘参考和线上紫微图。参考图只作授权设备对照证据，未把竞品截图当产品素材或复制付费内容。名称“参考_热卜待查界面.png”的最终有效内容是实际罗盘；两个误命名/中间图已列待清而非假证据。
- C盘删除临时截图的PowerShell操作再次被自动审批blocked by policy拒绝；不是缺少Windows文件权限，未执行、未换语言/执行器绕过。当前唯一CMD仍C:/Users/ZhuanZ/Documents/Codex/2026-10-17/e-c-users-zhuanz-documents-codex/outputs/guoxue-clean-20261018.cmd，已重建为标准CP936/CRLF并仅列当前5个精确目标：Temp/guoxue-iap-lock-cache（15645522字节）、活动仓scripts/__pycache__（16360字节）、本轮参考_热卜工具切换.png（418289字节）、参考_热卜罗盘入口.png（197751字节）、空的本次安卓安装状态.png（0字节）。合计16277922字节，尚未删除。CMD SHA f74e6e8a9c033f335e85db49ad0e7fc025da0a3530c7f95dcaa935cf81d3a0f5；最新清单为outputs/国学CMD清理清单20261018.json并同步E证据目录。旧节命令仅历史证据不得照搬。
- 负责人手动执行：cmd /c "C:/Users/ZhuanZ/Documents/Codex/2026-10-17/e-c-users-zhuanz-documents-codex/outputs/guoxue-clean-20261018.cmd" 。执行后必须读回目标不存在，再更新实际删除量；给命令不等于已删。正式2101包、E盘7号旧IPA尚有回滚/比对用途，在新原生包完成真实验收前不盲删；全物理两代轮换尚未闭环。
- 旧内存预览14744已停止，最终22928须结束前按端口/进程身份核对停止；没有创建本地node_modules/.next/out/www、实体ZIP/IPA解包或新整源码副本；本次手机/sdcard/window_dump.xml临时UI文件79560字节已删除并核对不存在，不计C盘释放。安卓安装进程属待用户完成的有效任务，不杀共享ADB服务。C盘只读快照可用16802480128、E盘12919480320字节，不将系统空间波动冒充本轮释放。
- 历史minglizyi-release-v25.0.97实时只读仍6修改/192删除/66未跟踪，src受跟踪差异为空；独有待审语料/历史配置未审结，禁止盲删或盲提交，不称全项目零未提交。当前活动仓产品源码已推送；本节及主账本同步提交后只读核对空status/上游0 0，最终SHA写C/E验证记录，避免自引用导致再脏。
- 苹果新钥仍仅E盘苹果开发者专区顶层URY888FLWG，国学构建与API可用，其他产品未改；旧UWQ/KZH未撤销的历史事项继续保留，不把私钥扫描通过等同实际撤销。
- 下一步顺序：①负责人提供测试账号标识→受限配置沙盒→恢复月/季原订单并查签名账本/权益；②负责人完成华为安装验证、关闭旧浏览器原生确认框→新包双向排盘/反馈/缩放/罗盘/GPS实机与网页交互验收；③iPhone14连续听学/本机图片笔记/完整社交举报屏蔽及沙盒取消恢复退款；④完善8商品审核图、真实iPhone/iPad宣传图和审核资料，原App只提交一次；⑤董氏与361穴准确授权图、全身筋膜/逐关节图、药典/方剂/题库的专业来源审校、星馆更完整功能、历史97与被拦垃圾逐项收口。整体任务仍未完成，不能说全部1:1或已上架。


## 60. 2026-10-19 同辰、国风日历、系统组件、整本医籍与苹果21号候选（开发检查点，整体未完成）

### 本轮执行边界和真实版本
- 已完整阅读负责人《言道国学_同辰互动国风日历桌面组件增量指令_07.txt》及前序对话；仅处理言道国学，不操作学外语/数字管家，不恢复旧群聊、附近用户。保留旧排盘功能、笔记、历史和互跳；本轮不改支付定价、佣金和会员权益。原始指令是需求输入，不替代源码/平台实证。
- 活动源码唯一目录 C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/ 。最新产品源码dc949a72c6006bbc9ab47f90f8cf4534a7d252bb；其后的904309a移除5个旧一次性发布脚本，c608da8将仍需使用的内存部署工具纳入源码。与上一检查点342321e相比161条改动的完整UTF-8绝对路径、状态和逐文件SHA保存在C/E既有证据“本轮日历同辰与内容实际验收.json”，使用Git NUL格式解析，已消除中文转义伪路径。最终文档提交、活动仓空status、上游0/0及四份报告SHA写入外部“本次收尾验证.json”，避免报告自引用再次变脏。
- 当前产品：网页已上线dc949a7；iOS25.0.115（21）签名构建39160453973成功、单次上传39161403225成功、Apple build c27f7ac7-dca8-4619-bfc0-e3118ef97733为VALID并已选原App草稿，尚未正式提审/发布；Android25.0.115/2109签名构建39160456200成功，正式APK/AAB仅E盘留存，覆盖安装停在华为系统风险/承担责任确认，实际已装仍2102，不能称2109已装/实机通过。19、20为已上传的前阶段内部候选；2107、2108已被2109替代、均未成功安装，列唯一CMD待清理。未操作其他产品。

### 交流、同辰与账号隔离
- backend_deploy/studyCommentsRoutes.js、studyCommentStore.js、studyToolTargets.js、data/study-zhenggu-targets.json；src/components/AcupointStudyDiscussion.tsx、ToolStudyDiscussion.tsx、ResourceDiscussion.tsx及相关工具页面：统一500个字素的纯文字学习交流，覆盖32个工具目标、400个穴位目标和212个正骨公开知识点。新留言审核后公开，含回复、自己的撤回/删除、举报、屏蔽与受保护后台；不开放图片评论，不在工具留言传出生排盘数据。不能把接口200当双人实际交流已验收。
- backend_deploy/tongchenStore.js、tongchenRoutes.js、socialApiRoutes.js；src/components/TongchenEntry.tsx、StudyCommunityHome.tsx及src/app/discover/tongchen/page.tsx：同辰雅集自愿18岁以上加入，同生日/同公历或农历月日/完整年月日/同时辰/自选四柱与兴趣匹配；时辰不详不伪造；双向申请同意后才可文字交流；拒绝、撤回、退出、举报、屏蔽与删除账号清索引已接既有数据库设施。旧私人客户档案和生日不会自动加入，未匹配时不造用户，不承诺婚恋/性格/健康相合。
- 出生条件仅用于确定性匹配与HMAC索引，生产data/tongchen-index.key实际32字节、权限600；不把原始出生资料写入公开档案。规则版本lunar-javascript-1.7.7/sect1/instant-jieqi-local-day-v2，节气年/月切换按UTC+8原始瞬间换算用户时区，当地23时换日；DST重叠取第一遍、缺失钟点拒绝。自愿加入前明确精细条件可反推出生日/时辰；不能假称完全不可推断。
- src/hooks/useAccountScope.ts及三种交流界面在登录/退出/跨页账号变化时重新挂载，避免旧账号草稿和消息残留；请求主体仍由服务端JWT确认。后台 /admin/tongchen/ 已能改名称、总开关、搜索/申请限额并审消息；/admin/study-comments/ 能改各目标及30秒/20条每天/同目标5条每天等限制。默认配置同辰enabled=true、搜索30/天、申请5/天，对审核与普通用户一致，未生成生产测试用户/公开留言。
- 完成隔离的真实Express/JWT/SQLite HTTP测试，包括无登录/权限、成年与同意、精度、互相接受、先审后发、重复申请幂等、旧消息入口不可绕过、退出/举报/屏蔽和账号清理。普通访客线上/mine真实401，页面显示“当前未参与搜索”。真实两个人生产交流及运营持续人工值守尚未验收。

### 日历、提醒、国风与系统组件
- src/lib/calendarEventsStore.ts、calendarLearning.ts、calendarSnapshot.ts、nativeCalendar.ts，backend_deploy/calendarRules.js及calendar-runtime/：复用现有历法与私有记事，修复旧记录归属、保存失败读回、非法日期、时区、DST、农历/闰月/缺三十/2月29、年月重复、暂停、删除、完成单次重复、撤销及稍后提醒。生日可不记录出生年，内部锚年不冒充本人年份；未知归属旧记录只能主动认领，不自动合并到当前账号。不同账号和游客数据分别存储，切换时同步取消/重排原生任务。
- src/app/calendar/page.tsx、calendar/widgets/page.tsx、yixue/wannianli/events/page.tsx、src/components/CalendarClock.tsx、CalendarLearningPreferences.tsx：言道日历区分“此刻四柱/观察时区”与出生四柱；本机私有日程、日/月视图、生日/学习任务、完成与稍后、前台全屏时钟、组件与权限说明。修复新建按钮被底栏挡住及重复标题，农历保存确认准确显示实际所选闰月/月日、年份是否记录、缺日规则和时区，生产浏览器只填表后取消，未保存假生日。
- 文化提醒默认全部关闭，按自选钟点/时区确定性生成24节气和六步五运六气学习，不调用AI、不读出生资料，不据八字发药方/疾病/天气/灾祸预测。六步明确大寒起始学习约定；地母经六十年原典尚无核准完整来源，搜索发现同名宗教文本，未错当该书导入。原典和现代健康信息仍分开标识。
- Android android/app/src/main/java/com/yandao/guoxue/CalendarSystemReceiver.java, CalendarDreamService.java, CalendarAgendaWidgetProvider.java, HuangliWidgetProvider*.java 与plugins/LocalCalendarPlugin.java、MainActivity.java、AndroidManifest.xml、res/xml/及layout/：真实三类AppWidget、系统TextClock、前台主动授权、本地通知、64条/30天有界预排、开机/时间/时区恢复和替换取消；未授权精确闹钟时诚实使用可能延迟的调度；DreamService仅设备支持的充电闲置屏保，不宣称所有机型接管息屏/锁屏。原生同步串行防旧请求覆盖。安卓系统桌面实际添加、闹钟送达/取消和屏保仍待2109完成安装后验证。
- iOS ios/App/CalendarWidget/、App/LocalCalendarPlugin.swift、SceneDelegate.swift、AppDelegate.swift、project.pbxproj、共享entitlements及构建流程：一个真实CalendarWidget.appex内含时钟/四柱/私有安排三种WidgetKit组件，支持系统允许的桌面/锁屏/待机形态；iOS17+；主App保留15+。AppGroup group.com.yandaoguoxue.calendar，私有日程只以通用提示/时间进入快照，文件completeUntilFirstUserAuthentication；七天共用引擎快照，系统时间视图，DST切换边界；过期提示回App刷新。不靠网页后台永久运行，不把网页快捷方式算系统组件。真实手机组件展示、点入、锁屏隐私和通知尚未验收。
- src/lib/interfaceLocale.ts、src/locales/四语言、InterfaceControls.tsx/InterfaceLanguageSettings.tsx、ThemeProvider.tsx及工具/日历页面：新增简体/繁体/日语/英语关键按钮与系统组件/通知词条，不自动翻译古籍/原始留言，不改变计算输入。保留原主题并加素雅国风/朱砂鎏金/墨夜。已在真实线上游客设置页切换en/ja/zh-TW再恢复简体，日历按钮和底栏随变，四柱相同；三种主题390px实测无横向溢出，前台时钟默认常亮关闭、退出正常。不是所有历史页面说明和按钮都已全量四语，不能宣称整App全本地化。

### 算法与中医资料实证
- src/lib/chartTimeInput.ts、chartHandoff.ts、src/algorithm-core/modules/bazi/、ziwei/与八字/紫微页面：查出旧早晚子和夏令开关未真实传入，现沿用既有sect1/sect2和iztro dayDivide进行显式传递；DST与真太阳时只校正一次，界面原始民用时/计算时分开，分钟、姓名与新输入不滞后；紫微计算/horoscope调用均在作用域内设置且finally恢复配置，缓存包含日界口径。没有重写排盘内核或升级依赖。scripts/chart-time-options.test.ts与固定资料fixture核对四柱、十二宫主星、元数据、23时/跨日/DST与配置还原。
- 吉时雨本轮已进一步找到作者官方仓库 https://github.com/chxb/jishiyu ，master固定bb1cb9ddccb654ec3471e27719453843137a6b73；README给出真实在线版 https://ji.js.cn/ ，AGPLv3/商业授权说明已核对。仅阅读公开许可和可见计算字段、未复制AGPL代码/图片/现代命理解说。作者在线部署SHA未公开，不冒称等于该仓库版本。公开默认样例2026-10-19 04:36男命，双方四柱丙午戊戌丙寅庚寅、十神、星运/自坐、空亡、纳音等可见基础字段一致；不是全部模块/全部神煞一致。证据“吉时雨公开样例与规则核验.json”只保留可见计算字段，已去除误读的隐藏现代解说。七政E盘资料仍含OCR/待溯源项，六项既有专项通过不等于全历史天文精度/全流派/竞品一比一。
- 新增真实错误修复：src/algorithm-core/modules/shensha/index.ts按本项目已有规则定义，ganzhi/season日柱专属神煞只在日柱判定；bazi/base.ts魁罡亦限日柱，修复年丙午/月份戊戌被标阴阳差错/魁罡/十恶大败。scripts/shensha-scope.test.ts保留正负样例及天赦/四废等边界，不复制竞品代码。src/lib/boneWeightCalendar.ts及八字页面将民俗称骨输入由公历日/节气月支改为实际农历年/月/日，明确农历年春节换年、闰月按同月数、午夜日界；1990-05-15对应农历四月廿一、2023闰二月和2024立春前后样例通过。既有称骨表未重写，未把民俗歌诀当人生预测。
- 真实浏览器另发现并修复八字新排盘将校正分钟覆盖原分钟、历史恢复丢原始资料的问题：src/lib/chartTimeInput.ts、src/app/yixue/bazi/page.tsx保留原民用时、计算时、姓名/地点/所有校时选项；线上1990-05-15 14:30→真太阳14:19，新排盘与刷新均显示正确，八字→紫微三合→中宫四柱确认→八字基本信息实际互跳通过，没有二次校正。
- scripts/import_tcm_clinical_editions.py、src/data/tcmClinicalOriginalEditions.json、tcmOriginalEditions.json、nanjingOriginal.json、src/lib/tcmClassicsData.ts、tcmEditionPack.ts、backend_deploy/build_tcm_original_editions_pack.js：新增《针灸甲乙经》序例+十二卷共15篇、《脉经》序+十卷11篇、《医学衷中参西录》医方/药物/医论/医话/医案五部分全文；合计十部340篇卷，来源固定Git版本、原始/正文SHA、许可和原书品质说明，不用AI补原文。中医笈成原作公版/编辑CC0，未拿该站图片；另有维基文库来源按对应署名许可保留。来源自标品质不是本站医学准确率，尚未逐字对影印本和完成医学审校。
- 医籍纯数据包tcm-original-editions-approved已真实发布1.1.0，3701375字节，SHA0508637f5bb695609247b110637f1745d87e777cf60d6e33838761dcd6bf94b1，十部340篇；清单/实际COS内容读回一致，旧1.0.0只保留一个回退登记。线上浏览器实际点击更新，显示“已下载并校验通过v1.1.0/已是最新”；再次打开脉经卷十正文、11/11目录、来源及1.1.0版本正常；截图保存在既有证据目录。
- 仍未完成且不能提审掩盖：400穴=361标准+39董氏，28旧经络动画来源清单指向网易文章及用户资料，未见转载授权；一张开放肺经图和两张公版解剖图有许可证，不等于其余28张获授权或361张位置都已专业审校。新增版权核查明确定位 public/assets/meridians/SOURCE-MANIFEST.json；未在Apple声明全部第三方内容拥有权利。旧辨证提示 src/data/wenzhen_data.ts、src/app/zhongyi/bianzheng/page.tsx 仍要求针对症状给方药/取穴，正骨还请求骨错位→触诊→轻手法方向；与“只学习”描述有冲突，不能仅加免责声明当作无诊疗功能，也未擅自申报非受监管医疗设备。必须完成实际学习场景整改及权利核查，再作准确商店声明。现代药典全量、医考题库专业审核、逐穴准确图、完整董氏/筋膜及Stellarium全功能均未完成。

### 构建、上线、苹果资料与真实发布状态
- 最新产品质量39160246833成功：TypeScript、119项Node测试（40个TAP汇总步骤，119通过0失败）、六项七政专项及default完整静态构建；私钥扫描1836跟踪路径通过。新增独立香港天文台2023/2024/2026三年1096天原始CSV与固定SHA，对UTC+8农历月日/农历年干支逐日核对0差异；不把此证据扩大为全四柱、全神煞、所有年代或医学准确率。脚本scripts/fixtures/hko-calendar-reference.json、calendar-snapshot.test.ts可复核；官方2030数据404未猜填。
- 前端2268文件68881001字节逐个SHA比对，内存部署后current实际为/root/yandaoguoxue/releases/v25.0.115-calendar-community-dc949a7；ZIP SHA f6db8fd69f305cf708e9c87173f88e905fa4b99dc74d1507513f2ecb42b7925c，清单SHA72f54309e102a55bad4972b1bb8cfdd372ad5ad4663d9565aeccd5d0b13c161f。真实生产浏览器重新排公开样例，年/月已无日柱专属神煞误标，基本信息称骨取真实农历初十；日历仍显示正确九月初十与此刻四柱、私有日程为空/文化提醒默认关闭。唯一网页回退48fe52d；浏览器验收后删除f413b83旧目录2268文件68878446字节，服务器读回严格两套。这不是C盘释放量；此前阶段移除342321e/042822e另有历史证据。
- 后端12文件已部署，主server.js未全覆盖；现有生产差异归一校验后再写入，PM2重载online，/api/health200、/tongchen/config200、未登录/mine401。限额/同辰名称可在既有管理员后台更改；不以审核用户特判隐藏功能。临时安装缓存只用/dev/shm并已移除，生产HMAC密钥600不入Git/报告。
- iOS最新签名运行39160453973，25.0.115（21），IPA29893347字节，SHA5d7f3747fc83c0b083c239cd8fcebcb5a90900a0fc8aa73e2a3479c63b668f33；内存核验主App com.yandaoguoxue.app、唯一真实CalendarWidget.appex、版本21、AppGroup及两份分发profile、无get-task-allow/远程server.url。单次上传39161403225成功，Apple build c27f7ac7-dca8-4619-bfc0-e3118ef97733处理VALID；现有内部组全构建可用，无需另发邮件/新增测试人。原25.0.115草稿选21，仍PREPARE_FOR_SUBMISSION；历史2.1/3.1.1拒审未当作新提交。当前处理状态、内部测试及截图以“最新原生完整包校验.json”和“苹果TestFlight_25.0.115_21_真实状态.jpg”为准。
- Android最新构建39160456200成功，25.0.115/2109，com.yandao.guoxue，正式证书SHA8ca0c414573d4b05fc2bd1ba9c6a2a8090c90c58e3815119494607443dc6d5a0门禁通过。唯一新版实体E:/八字命理类文档包括排盘方式电子版/言道国学项目归档/发布包/Android_25.0.115_2109/言道国学_25.0.115_2109.apk，28235991字节SHA78abf116c3050115ff8eeaee9843501425332919f08c5f231333a8433e60ddd6；同目录.aab，28601849字节SHA1e1bf425afb2bc2d46b87d6a0a7e87423f8bed0d9fad83a8814e66634885d79b。2108旧安装由代理主动取消后换2109，不是负责人拒绝；系统日志通用User rejected不能误写用户行为。2109待华为风险承担确认，本轮不能代负责人接受新免责承诺。保留已装2102为唯一回退，源数据不清空。未新提安卓市场/未重复荣耀同版本；华为/Google是否新通过本轮未实时核实。
- Apple商店描述真实改十部原典/日历/组件/自愿交流及图谱等局限；支持网址改有效反馈页，关键词去掉未经授权名家营销用词；年龄声明如实包含交流/UGC/频繁医疗信息，当前地区16+/巴西15+、旧OS17+。没有宣称政府实名/Apple年龄API已接入；同辰内18岁自愿声明仍单独限制。ICP、第三方内容权利和受监管医疗设备声明未填假信息，仍需真实核实。
- 真实模拟器最终运行39159485791成功，源码25af8f4（日历/学习/IAP入口与dc949a7相同，后者仅八字计算修复）。iPhone16ProMax1320x2868、iPadPro13M4 2064x2752，真实本地Capacitor应用：首页、课文连续听学、中医整本、日历与组件设置实际可见；调用真实原生桥后AppGroup容器calendar-v1.json存在，92条合并后的7天快照、168小时有效，0条私人提醒。92条不是仅一天，不凭数组条数误判；测试采用真实adhoc模拟器签名，未移除原生能力断言或伪造成功。系统桌面添加、锁屏/待机实际展示及提醒送达仍待物理设备。源、共享容器和SHA清单位于C/E“苹果真实学习与组件验收”。
- Apple宣传图最终10张原始真实应用页（iPhone/iPad各5张），学习/连续听学/整本典籍/言道日历/原生组件设置，API读回全部COMPLETE；旧8张草稿已删，错误Open确认框图片排除并列CMD清理。8个原内购商品分别有审核图，API全部READY_TO_SUBMIT、8图COMPLETE，不等于已审核通过。50/100/500三种AI商品共用一张真实完整卡片画面，未伪造3张不同图、未修改模拟器Unavailable状态/添加假价格；重复或100卡片不完整的图排除。当前价格/权益未改。真实取消/恢复/退款/到账仍未验收；Apple沙盒月/季/年成功弹窗不能代替服务端权益，已知sandbox_not_enabled但测试言道账号未确认，不能猜测或给普通账号普遍放沙盒权限。
- 新密钥仍E:/八字命理类文档包括排盘方式电子版/苹果开发者/ 顶层AuthKey_URY888FLWG.p8，国学API可用；同目录“APP Stotr CONNECT API 最新秘钥.txt”已追加21号VALID/上传运行、组件profile及真实未提审状态，只写公开ID/profile信息，无私钥正文。主profile M88786VD7R/UUID1e8e18d4-8ddd-4284-9de3-1074c9c60211、widget PQSH2V4FMV/UUID83a41c92-a07f-4761-90fb-46c43eee8d94，中文mobileprovision均专区顶层；国学IOS_APPSTORE_PROFILE_B64、IOS_WIDGET_PROFILE_B64由签名21验证。其他产品未动；旧UWQ/KZH未撤销，历史泄露风险未称消除。

### 清理实证、回退和下位开发第一步
- 本轮没有在C盘装node_modules/输出.next/out/www、下载实体ZIP/IPA、解包原生工程或复制源码。云产物在内存核验；临时RAM预览11548已停止，3113监听为0。手机/sdcard/yandao_codex_ui.xml已删并读回不存在，不杀共享ADB/其他开发服务。
- 维护工具 scripts/deploy_verified_web_preview.py 已正式纳入Git（.gitignore仅豁免此维护文件）；限定官方构建/分支/SHA、路径和文件哈希、预期current，RAM传输、原子切换，无私钥参数。下一次先核验云构建，再用：python -X utf8 -B scripts/deploy_verified_web_preview.py --artifact-id <真实新构建产物ID> --sha256 <产物ZIP的SHA256> --source <真实提交> --expect-current v25.0.115-calendar-community-dc949a7 --evidence <既有证据路径>。以上尖括号是文档参数，不得原样运行；当前版本已部署，不再重复发布。正式回退可在服务器先核实48fe52d目录再原子切换current到/root/yandaoguoxue/releases/v25.0.115-calendar-community-48fe52d；不能回滚生产用户/订单数据库。
- 真实删除5个过时跟踪脚本 deploy_release_v25_0_47_16.sh、17.sh、18.sh、19.sh、build_android_v25_0_48.sh，总73154字节；904309a提交并推送，历史在Git。唯一有效新维护工具仍保留源码，不把全部部署工具当垃圾。
- 旧03工作树已核验跟踪status干净、148a9f0为活动历史祖先、22个ignored项逐项分类。先将7份有效旧版360/390/412验收图与web-e2e-results.json复制并核SHA到E证据/旧版紫微有效验收_25.0.107/，再由Git正规移除并解除注册，实际清除1662文件124329101字节。根目录仅剩悬空node_modules联接与空父目录，0字节；删除这两个条目被自动审批拒绝，不换工具绕过。证据“旧03工作树清理核验.json”，不能说连空目录都已清净。
- 唯一最新人工CMD：C:/Users/ZhuanZ/Documents/Codex/2026-10-17/e-c-users-zhuanz-documents-codex/outputs/guoxue-clean-20261018.cmd，CP936/CRLF，SHA078e6e7b02c16d3dbdd2f4ef5ea262cc776bf465fc8cb3fd205d5575edbef373；36个精确目标，总156864311字节（C30407879，E126456432），仍未执行。包括原5缓存/诊断、4张错误Open日历图、2个03空条目、2107/2108两个无效候选APK/AAB及空目录、旧空白启动图和逐SHA比对的重复截图；新2109、已验证回退2102、原始素材/密钥/有效审核证据不在删单。最新“国学CMD清理清单20261018.json”及E镜像为准，旧9/14目标清单作废。联接和空目录只用不带/s的rd，不递归共享目录。
- 负责人手动CMD执行命令：cmd /c "C:\Users\ZhuanZ\Documents\Codex\2026-10-17\e-c-users-zhuanz-documents-codex\outputs\guoxue-clean-20261018.cmd"。自动审批已明确拒绝原删除，代理不执行这份CMD绕过；新增过时候选同列人工处置，未假称每条都曾被拦。执行后逐目标复查不存在并重核正式包，才可统计实际释放量。报告固定镜像不是多余备份；正式包新/旧两代尚因人工清理和真机未闭环，仍未完全达标。
- 历史97副本仍6修改/192删除/66未跟踪，受跟踪src无差异，独有语料/配置未审结，不能盲提交/盲删。97/.git是ios-review-fix和knowledge-integration等有效树的共享Git目录；03已解除注册，不能因此删除整个97、损坏其他树。活动仓最终干净不能掩盖此历史债。
- 后端唯一回退仍/www/yandaoguoxue-backend/.release-backup-backend-previous；生产tongchen-index.key32字节/600已在该唯一受保护回退目录同权限备份并核一致，只记录结果，未下载/泄露密钥。两代回退只读核验，勿覆盖生产账号、订单和留言。
- 既有C证据目录 C:/Users/ZhuanZ/Documents/Codex/2026-10-17/e-c-users-zhuanz-documents-codex/outputs/实机整改_20261018/ ，E镜像 E:/八字命理类文档包括排盘方式电子版/言道国学项目归档/发布包/实机整改_20261018/ 。本轮161绝对路径、原生包校验、1096天独立核对、吉时雨公开对照、日历四语/主题、整本1.1.0下载、脉经最后卷、真实AppGroup与10宣传图/8IAP回读、21号TestFlight、清理实证均在此，不另起竞争交接。最终“本次收尾验证.json”记录提交/推送、四份报告SHA、工作区/上游、权限阻塞和最新渠道状态。
- 下一步必须先解决：28张经络动画许可与完整逐穴图专业审校；旧AI个体诊断/方药/手法用途与学习定位冲突，不能仅改商店文案或加免责声明；核对具体测试言道账号后窄范围沙盒授权、恢复既有签名订单并验权益，不能普遍放行；华为主人接受安装提示后验2109通知/组件/定位/缩放/反馈/笔记；iPhone21物理验WidgetKit/锁屏隐私、连续听学、图片笔记、定位及购买取消恢复；准确完成第三方内容、医疗类别、隐私/ICP声明后，原App正式提交一次，不重复荣耀原审查任务。
- 尚未完成全量历史界面四语、现代药典全文/医考医学审核、361逐穴准确图与董氏全集、完整筋膜、地母经60年核准原典、Stellarium全部能力以及所有竞品模块一比一。不得写“全功能已齐/所有算法零错/全图专业准确/已正式提审或发布/全项目垃圾全清”。此记录是可核验开发检查点，整体任务未完成。


## 61. 2026-10-19 指令07再次确认、紫微另一盘式三方线与小星竖排（本次显示修正已上线，07整体仍未完成）

### 收到指令与范围
- 负责人再次提供 E:/八字命理类文档包括排盘方式电子版/言道国学_同辰互动国风日历桌面组件增量指令_07.txt ，本轮已再次完整阅读，SHA46715deba7c8428c81b6396e889071b71b886b4caa4c829c99d71727d09cb404；明确回复“已收到/读过，部分完成而非全部完成”。07的交流、同辰、国风日历、四语和原生组件的真实实现/验收边界仍见60节，未把指令本身当成功证据。
- 本轮新任务只调整紫微“另一盘式”的三角形/中间线、小星随主星竖排、左下36神及流羊等动态字大小。源码b347ebbdf656e7c84c91c2ac4642de0468aa3acf已提交推送。没有改排盘内核、天干四化表、原默认盘、主星落宫、会员权益、支付、其他产品；原三合/飞星/四化和中宫互跳等入口保留。Git对比b08a213..b347ebb的src/algorithm-core为空，不以布局修正冒充全面算法重审。

### 文件与实际行为
- C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/components/ProfessionalZiweiBoard.tsx ：旧虚线将对宫当作闭合多边形顶点，出现不该有的对宫→三合宫斜边；现本宫/+4/+8组成闭合三角，另起独立子路径连本宫到+6对宫。三合/飞星均修正，四化的四条红箭头逻辑保持。
- 同一文件：原三合的otherStars不再在主星区下方另列横排文字，而是与主星/副星同一个流式容器逐字竖排，保持现有分组顺序/颜色；破碎、孤辰、寡宿等均在。三组神煞移至宫格左下各一行，7px增至9px；动态星曜含流羊7px增至10px，支持换行且与宫名/干支分区。十二长生保留于干支上方，运限叠宫标识保留，没有删星曜/原控制。
- C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/android/app/build.gradle 、同仓.github/workflows/android-build.yml ：versionCode和各构建/原生标记门禁同步2109→2110；versionName仍25.0.115，签名不变。

### 验证与网页发布
- 质量39189546173成功，119项Node用例（40TAP步骤）、六项七政既有专项、TypeScript与完整default静态构建。仅用云产物RAM预览，没有C盘依赖树/构建目录/解包/ZIP/IPA。私钥1836跟踪路径扫描及云39189545140成功。自动push质量39189545182因与手动完整preview重复，主动取消，未冒充失败或再跑无意义重复检查。
- 真实浏览器以1990-05-15 12:00男、真太阳时关闭/夏令关闭为同口径公开样例；修改前后12宫文本去空白/分隔符按字符计数完全一致；38个小星列全部flex-column，36个神煞保留，9/10px计算样式可见。逐一点击12宫均为三角形+独立中线；320/390/430视口无页面/宫格横向溢出；三合/飞星各12宫和三方线、四化12宫/4条红箭头正常。切大限15-24、流年2005实际显示流羊等动态标签；线上重新设置同口径后12宫内容也一致。不是所有出生样例/全部真机验收。
- 证据沿用 C:/Users/ZhuanZ/Documents/Codex/2026-10-17/e-c-users-zhuanz-documents-codex/outputs/实机整改_20261018/ 与 E:/八字命理类文档包括排盘方式电子版/言道国学项目归档/发布包/实机整改_20261018/ ：紫微另一盘式布局核验.json、紫微另一盘式_修改前390.jpg、紫微另一盘式_竖排小星与流羊_新版390.jpg、紫微另一盘式_线上竖排神煞与中线390.jpg。测试只用游客本地公开样例，不发生产评论或虚构同辰用户。
- 线上current=/root/yandaoguoxue/releases/v25.0.115-calendar-community-b347ebb，唯一回退/root/yandaoguoxue/releases/v25.0.115-calendar-community-dc949a7；2268文件68881495字节逐文件SHA核验，ZIP SHA5e09410687e45b8a30060fbf039c3343f3fa589c2e72d5e67da7b52eb6d35036，清单SHA76914b2f85523de0729eb97e41cce51330406db5e056f7b36c9b71ac10994c03。浏览器复核后删除48fe52d旧网页2268文件68879577字节，服务器只留两套；此量不算C盘释放。回退仅原子切current回dc949a7，不动生产用户/订单。
- 额外观察但未混入本次显示修改：旧紫微整页重开未完整恢复原时间/校时选项，复用旧缓存曾显示11时并默认开启真太阳时；已显式恢复12时/校正关闭再进行本次内容对照。src/app/yixue/ziwei/page.tsx持久化仍只存部分计算输入，原时间/选项恢复需独立专项修复；本轮未改该页面，不能把异口径结果差异写成显示改动影响算法，也不宣称整页刷新恢复通过。

### 新测试包与真实渠道状态
- iOS25.0.115（22）签名39189548700成功，IPA29894142字节，SHAe5ca3f8c907a004a383b081262453062c198fd2146acb887901535651b549297，只在RAM验证，主App/唯一WidgetKit扩展/版本/AppGroup/两份profile/无调试和远程server.url通过；单次上传39190321426成功，Apple a6cd6675-6400-4e87-8954-3542308cba97为VALID/IN_BETA_TESTING，原25.0.115草稿已选22/PREPARE_FOR_SUBMISSION。现有本人内部组可用，没有新发邀请消息；没有正式提审或发布。商店10真实图/8内购元数据维持60节已准备状态，不因这次改盘式就声称医学版权、沙盒到账、正式审核已完成。
- Android25.0.115/2110签名39189551425成功，原证书8ca0c414573d4b05fc2bd1ba9c6a2a8090c90c58e3815119494607443dc6d5a0。唯一新版实体 E:\八字命理类文档包括排盘方式电子版\言道国学项目归档\发布包\Android_25.0.115_2110\言道国学_25.0.115_2110.apk ，28236935字节/SHAef47251885eada299aee14b9e188ea2fa41fc13cef46ffccfa5e450a116c6843；同目录.aab，28602874字节/SHAe740ec0de52603602a2d34ff0dd1ce6f9541d32a9d9323e001222b6c97a90a78。本轮ADB没有设备，未安装/未真机验2110；最后已确认实装仍2102，不能推测负责人是否完成过2109。保留2102正式APK/AAB作唯一已确认回退，未操作任何安卓市场/未重复荣耀入库提交。
- E:/八字命理类文档包括排盘方式电子版/苹果开发者/APP Stotr CONNECT API 最新秘钥.txt 只追加22号公开构建状态；私钥仍专区顶层，未动其他产品/旧钥，不写正文进报告。IPA未落C/E。

### 清理、提交和未完成
- 旧CMD36个精确目标本轮按lexists逐项复查均不存在，含旧03残余联接/空目录；前清单合计156864311字节，仅确认这些文件已不存在，不把来源未核实的删除冒称代理本轮完成或等同磁盘净增加。旧03源码124329101字节的正规Git移除证据仍保留；新增“旧03工作树清理核验.json”已注明残余现已不存在。36旧命令已从唯一可执行CMD移除。
- 新旧版本轮换仅剩2109候选APK/AAB及空目录待清。先核新版2110和回退2102真实SHA、确认2109目录仅2文件，PowerShell按精确路径删除被自动审批blocked by policy拒绝；未改工具/语言绕过。唯一人工CMD仍 C:/Users/ZhuanZ/Documents/Codex/2026-10-17/e-c-users-zhuanz-documents-codex/outputs/guoxue-clean-20261018.cmd ，仅3目标56837840字节，CP936/CRLF，SHA4e931fef5a1e51ac1ca0f189626e93910f5dcc94e7b6d046b6fa8d3ccd033b56；待负责人执行：cmd /c "C:\Users\ZhuanZ\Documents\Codex\2026-10-17\e-c-users-zhuanz-documents-codex\outputs\guoxue-clean-20261018.cmd"。不会删2110/2102/源码/密钥；CMD没有由代理执行，不能称两代物理清理已全部闭环。
- 新RAM预览进程27228已停止并读回3113监听0；无本次临时脚本/日志/依赖/解包落盘。必要源码、维护工具、正式包和前后真实布局证据保留。历史97共享Git仍6修改/192删除/66独有未跟踪（按全部文件计数），tracked src无差异，不因本次活动仓干净而称全项目零债务。
- 指令07整体未完成项仍承接60节：真实双人交流及运营值守、历史全界面四语、物理组件/通知与原生回归、沙盒订单实际到账/恢复、医学资料授权和专业审校、个体诊疗AI用途整改、正确隐私/ICP/权利声明及正式提审。新增旧紫微原时间缓存恢复专项。只确认本次提出的三处显示问题已实现、网页实测上线，不写“全部完成”。
- 本节有效源码及文档须审查提交推送；四份固定报告逐字节镜像和制度/入口核验、最终提交/空status/上游0 0、3目标清理状态均写入既有C/E“本次收尾验证.json”。不另建竞争交接报告，不把提交号写回已提交报告造成新脏改动。
