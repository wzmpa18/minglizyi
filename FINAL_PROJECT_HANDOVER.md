# 言道国学 · FINAL_PROJECT_HANDOVER（唯一交接文档）

> 本文档是全项目唯一交接文件，采用持续增量维护；**最新 dated section 在本文末尾，遇到旧版信息冲突时以最新且有证据的增量为准**。原始封板基线为 2026-08-26 FINAL-HANDOVER-STABILITY-SEAL。
> 目标：一位全新的 AI/开发只读本文档即可独立接管项目。历史细节见仓库根 `PROJECT_MASTER_LEDGER.md` 与《01_项目总账_宪法.md》（项目方持有副本）。
> 本文档只写密钥**位置**，绝不写密钥**值**（第五十一章红线）。

## 最新接管入口（2026-10-24，完整接手总览见78.15，交付证据见78.14）

- **交付首页**：E:/言道国学3D评估_12A/宣传图片营销/00_交付首页.html；当前目录顶层有完整源码ZIP，首页链接129张逐功能手机图、逐图说明、营销文案和原生包，不需翻旧截图目录。
- **实际版本**：Android25.0.115/2143（原签名覆盖安装、系统读回、首页实拍）；Apple25.0.115(52)（官方VALID/IN_BETA_TESTING，现有内部组可测试）。同源7c0cf30；完整质量成功、网站同源上线。不是所有功能真机验收完成。
- **Google**：17:59东京最后只读核查：旧版在线、新更新被拒；学外语转移已接受/平台待处理，国学未迁入。负责人本轮要求删除定时任务，google已实际删除，**不得自行恢复或重建**。未改迁移、未改其他产品，未处理未上架商店。
- **内容更新**：已有课程、原典资料包、模型/照片及AI规则优先服务器更新；药材/方剂基础字典、逐穴静态说明及部分本机配置仍不是全部远程化。核对docs/requirements/client-content-update-boundary.json，禁止承诺所有内容已经免打包。新原生/算法/安全能力正常合并构建。
- **清理/备份**：35个精确目标约3.29GB CMD仅准备、未执行；保留2143/52当前和2139/47有效旧版，核心资料不删除。C唯一报告、C根入口、非保护E评估只读镜像核SHA；受保护E主资料目录原镜像不覆盖。下方早期“当前事实”是历史证据。


## 历史接管快览（2026-10-23，东京时间；本轮最新状态见第78.1节）

**10月23日更新：完整Web5313854已上线；Android2128双渠道签名包已生成；Apple36已正式提交且等待审核。OPPO/华为上传整改中，腾讯包归属提示待核，尚无本轮安卓商店受理回执。自评估通过截图已收到，不代表全店批准。重复短信体验已整改，公共交流首次核验与内容治理保留。下表77节为10月21日历史快照，冲突以78.1为准。E主资料目录依负责人要求只读，镜像同步未完成。**

**先看此处与第77节，再查历史。旧版本、旧main分支及历史“完成”只代表当时范围，不能直接用于今天发布。**

| 事项 | 当前明确事实 | 完整交接 |
| --- | --- | --- |
| 官网及安卓直接下载 | Web f7a5926已上线，Android25.0.115/2127已在COS/官网发布；不等于商店过审 | 77.2、77.3 |
| 苹果正式审核 | 25.0.115仍关联build30，WAITING_FOR_REVIEW | 77.3 |
| 苹果内部测试 | build35为VALID/IN_BETA_TESTING；短信验证、原订单恢复到账仍待实际验收 | 77.3、77.6 |
| Google | 旧2081仍上架，2118更新被拒；国学迁移需等待原学外语迁移完成 | 77.3 |
| 其他安卓商店 | 2127没有本轮新提审回执；资质渠道暂停，按最后有证据状态分别处理 | 77.3 |
| 安全与数据 | 业务手机号验证、真实审计后台、日志留存及内容筛选已部署；不等于三要素实名/安全评估通过 | 77.5 |
| 首要阻塞 | 苹果原账号到账/审核账号验证、COS自动备份403、07/09/10真机与医学专业/版权验收 | 77.6 |
| 源码与清理 | 本轮仅整理核查，不改功能/提审/删除；最终提交、镜像SHA与未清理事项见E盘21_最终交接提交与同步核验.json | 77.8 |


---

## 1. 历史项目基线（当前功能与渠道见第77节）

**言道国学**（yandaoguoxue）：传统文化命理学习平台。
- **命理工具**：八字、紫微斗数、奇门遁甲、六爻、梅花易数、姓名解析（算法全部本地计算，前端完成）+ **四专业工具（v25.0.68 起）**：七政四余（十一曜/二十八宿宿度/洞微大限）、专业罗盘（WMM2025 磁偏角真北校正/二十四山）、立极尺（户型图叠加罗盘）、鲁班尺丁兰尺（双尺合参）。
- **AI 深度解读**：以上工具结果接入 AI 深度分析（服务端代理转发上游大模型）。
- **中医/学习**：中医百科（中药/经络/伤寒/问诊/养生/体质）+ 学习院（academy 课程/考试/证书）。
- **社交**：好友、私聊、群聊（群主/管理员/成员三级）、动态流、点赞、收藏、评论、通知、拉黑、举报、后台审核。
- **商业化**：会员订阅（月/季/年/终身）、单项解锁、AI 时卡、积分充值；微信支付；两级分佣（15%+5%）+ 合伙人渠道体系。
- **形态**：Next.js 静态导出 Web（nginx 托管）+ Capacitor Android APK + Node.js(Koa) 后端 API。

## 2. 历史正式版本快照（2026-09-02；当前见第77节）

| 组件 | 版本 |
|------|------|
| Web（生产 current） | **v25.0.79**（buildId `v25.0.79_D20260902`，2026-09-02 上线；iOS 提审整改批次：入口改名（手机号码解析/车牌号民俗解读）+全局吉凶清零+黄历古籍定性（《钦定协纪辨方书》注解）+AI 输出合规红线与免责声明+隐私政策补充；含 v25.0.74~78 全部功能：排盘云端保存链路/安卓返回手势/微信服务号17模块/NewsCard 原生壳跳转修复。**本地工作区另有 v25.0.80 六问题修复已构建未部署**（等苹果审核结果一次性部署，见总账十二.35）） |
| 后端 API | package 1.1.0（PM2: yandaoguoxue-backend，online；v25.0.72 批次后端变更=academyRoutes 正骨专区服务端门控+paymentRoutes 两修复（价格SSOT/订单回灌）+toolAdminRoutes 正骨三态开关；**v25.0.75/76 批次新增微信服务号后端 17 模块**（wechatContentEngine AI 文章生成+SafetyGate 查重+TokenManager+调度器 cron 流水线+OAuth 防护守卫，ai_call_logs 记账）；矩阵总数 28；QF/OSS/Offline/存储GC/统一后台 全挂载。**v25.0.80 批次待部署后端**：newsAiScheduler.js 资讯 AI 维护（cron 07:10） |
| Android APK | **v25.0.79 / versionCode 2072**（2026-09-02 发布：iOS 提审整改同步安卓，内置资源与 Web 生产一致（1931 文件）；统一分发源 latest.apk 原子替换（12,174,027 字节，MD5 `f1a50c4beebd546c9dd00c230b8bda1c`，三份分发名 MD5 一致）、公网版本接口与 APK MD5 终验一致、升级公告已发布；构建脚本 `backend_deploy/build_android_v25_0_79.sh` 可复跑。**审核结果后需重打包 2073（内置 v25.0.80）**） |

## 3. 历史提交快照（当前分支与部署源见第77节）

- **四端 HEAD 一致**：LOCAL = GITHUB origin/main = SERVER_SOURCE = 生产构建源（2026-09-01 核实；发布基线 `cf99433`，其后的文档回灌提交经 git bundle 中转同步服务器（服务器直连 GitHub 不稳），unpushed=0；接管后第一步：`git log --oneline -3` 四端核对）。
- 当前代码批次：`657dc5f`（双身份 PARTNER_NET_OF_REFERRAL）→ `b493913`（Partner 归属快照/合同/改绑审计/结算快照/逐单账）→ `852c5fd`（总账回灌）→ `ac45013`（**MASTER-05 六模块后端**：Provider/对象存储+备份灾备/Offline Pack/社交限频+评论层级/Question Factory/统一后台总控+全量回归矩阵）→ `7a0750d`（Offline 前端四库）→ `6a16c4e`（bump v25.0.66）→ `d9bde64`（/offline 页面接线）→ `4fd6cc5`（MASTER-05 封板回灌）→ `add0f56`（SEO 增长引擎首批：seoPagesConfig+生成器+质量门禁+18页+robots/sitemap+bump v25.0.67）→ `3370fe4`（APK v25.0.67/2067 重建+统一分发源+升级公告+主站 robots/sitemap 修复）→ `7624c15`（IndexNow 免登录主动推送双站 28 URL 202 受理+百度/头条/IndexNow 推送工具固化入仓）→ `2a148da`（**NICHE-TOOLS-07 四工具引擎上线 v25.0.68**：七政四余净室引擎/罗盘 WMM2025/立极尺/鲁班尺丁兰尺+Share 原生修复+APK 2068）→ `6fd3289`/`f53fe12`/`3707220`（v25.0.68 构建/验证脚本三坑修复）→ `d8f476a`（v25.0.69 四工具 SEO 集群页+矩阵登记+IndexNow 推送）→ `875ebfc`（v25.0.70 小众工具收尾：罗盘多门派Profile+立极尺专业盘+SEO五Cluster+Growth编排器）→ `5ece32b`（v25.0.71 七政断语引擎六节+开关管控+用户活跃统计）→ `cf99433`（v25.0.72 七政学习资料+正骨专区¥89付费+支付两修复）→ `9afd6b1`（v25.0.74 排盘云端保存+安卓返回手势）→ `03d7443`（v25.0.75 微信服务号17模块）→ `bbf0188`（v25.0.76 OAuth防护）→ `4290249`（v25.0.77 iOS合规收口）→ `35f2a4b`（v25.0.78 TestFlight VALID）→ `dcadb47`+`a1fec51`（v25.0.79 整改+安卓2072）→ **`9366314`（v25.0.79 报告+台账8.1/8.2，HEAD）**。**本地工作区有 v25.0.80 六问题修复未提交**（30 文件改动+8 新文件：GlobalBackButton/newsAiScheduler/DNS修复脚本/批次报告；接管后先 `git status` 核对再决定提交时机）。后端运行时已随 v25.0.72 重启（正骨门控+支付修复生效，PM2 online，fixture 生产实测全过）。四工具代码位置：`src/algorithm-core/modules/qizheng|compass|liji|ruler/index.ts`（净室开发：Astronomy Engine MIT 只做对拍基准、Horosa AGPL 只做结果参考未抄一行、Swiss Ephemeris 弃用；WMM2025 系数 NOAA 公共领域净室键入）。

## 4. GitHub（以下main说明为历史；当前活动分支见第77节）

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


## 62. 2026-10-19 09工作报告（执行中；07与09整体未完成，未正式提审）

本次已完整阅读07、09及09配套沟通原文。09允许共享最小副本走联网服务，但人生记录、健康原件、OCR和搜索默认本机；不把截图/二维码冒充活盘。07其他要求继续有效。只处理国学，不改外语及其他产品。输入与44项验收契约在`docs/requirements/life-records-09.acceptance.json`，其状态不是完成证明。

### 62.1 当前运行与发布事实（2026-10-19本次后续核验覆盖本节历史检查点）
- 生产Web现为 `/root/yandaoguoxue/releases/v25.0.115-calendar-community-d62d60e`，本次可回退的上一上线目录为 `v25.0.115-calendar-community-3d9be68`；更老目录尚未物理清理，不宣称服务器仅剩两代。已按固定成功云产物RAM校验逐文件清单、原子切换并实际浏览器验收。本机私库前端随此包上线；活盘/治理群后端尚未部署，不因前端存在而称可用。
- 华为EMH0222224000340已由负责人完成25.0.115（2113）系统确认。独立读回versionCode和已装APK SHA-256 `c8cf166aef7a888ddd3de619e912af0d4050e9e620fc451c0b8ba4320d2c73df`，与d62d60e成功签名产物一致，保留应用数据。2113新增提交按钮、评论安全联动及紫微工具栏交流入口，手机实际打开500字面板并返回原命盘。没有把ADB传输当安装成功，没有提交安卓市场。
- 上次已上传Apple仍为原App6807592575的25.0.115（22）；23号是较早e05ca1a签名候选，未上传，不能代表本次d62d60e最新包。本轮未撤回、上传或正式提审Apple，没有发布成功回执。测试沙盒权益问题仍需核准具体言道账号，不向全体放开沙盒权限。
- 本轮产品源码已推送至 `d62d60e0743e31c5d83c6ab47b23d6feb948ff0f`（含e79eb57/3d9be68/f0d32ab/a499d05/918c043/ab393dd/53c8922/733d3d1）。最终文档另提交、上游一致及空status证据保存在E盘收尾核验，不将最终提交号写回文档制造新脏改动。未改排盘内核、价格、会员权益、佣金或其他产品。

### 62.2 已实现的软件范围（上线及未部署边界以62.1/62.6为准）
- `src/lib/lifeRecords.ts/lifeVault.ts/lifeVaultCrypto.ts/lifeVaultStorage.ts/lifeVaultView.ts`、`src/app/profile/life/page.tsx`：独立档案锁、免社交账号使用、长文字、多分类/标签/人物、外部原话来源、自述与原话分离、草稿/版本/回收站/置顶收藏、原件分块AES-GCM、SHA核验、本机索引、并发CAS、防锁定后迟到数据重新挂载、跨账号切换清屏、应急加密草稿和可取消索引读取。版本不再只取前1000份；旧排盘保存不再驱逐100/200条，Android按游标读全历史。旧档案仅提供主动选择复制，未静默迁移/删除或更改原云权益。
- `src/lib/lifeDocument.ts/lifeReminderExport.ts`及原生LifeVault插件：独立密码加密备份、读回检查、独立临时档案恢复后才登记、原库不覆盖、恢复提醒默认不启用；TXT/MD/HTML/CSV/JSON、原生PDF及私有ICS导出。用户选择系统文件/自有云位置，不存在平台明文备份代理或自动云同步成功声明。共享受限原话/盘不锁住自己的后续整理。
- Web复用`storageManager.USER_PRIVATE_DATA`密文IndexedDB；Android为NoBackup私有SQLite，iOS为Application Support/PrivateLifeVault、完整文件保护且排除系统自动备份。密码/独立恢复码为本机主密钥包装；没有新增密钥上传或后台读私人档案接口，也没有声称已实现生物识别/硬件密钥托管。
- 健康字段区分原件、医生原文、本人核对/补充、规格/剂量/频次/途径/按需/期限、单位/参考区间/采样与方法。就诊准备默认不含梦境、命盘、聊天和日记正文。仅在本人确认且同项目、单位、机构、方法下作原数值对照；同名药只提示并列出处，不合并方案、不调药。提醒需具体时间/时区/期限及本人确认，不从OCR或AI自动建用药计划。
- Android离线OCR改用固定Tesseract4Android4.9.0/Tesseract5.5.1和tessdata_fast提交87416418，简繁英模型总约9MB，官方来源/尺寸/SHA和完整许可证在`scripts/fixtures/life-ocr-models.json`、`public/legal/life-ocr/`；`prepare_life_ocr_models.py`只在干净云构建准备资产，本机审计全RAM，8个64位原生库已核16KiB对齐。无MLKit/GMS依赖或云识字回退。iOS用Vision，禁语言自动补全；识字/模型置信度不等于医学核对。
- 5c3fb2a新增原生PDF指定页渲染/识字、原件不截断、页码坐标/模型/原件hash、旧识字版本和其他页保留；原生逐页PDF、坏图和损坏模型缓存自修复已实际通过AOSP29四项测试（39203550695）；非物理手机结果。Android系统解析需短暂私有解密PDF，排除备份，用后及下次启动清理，不能写成全程只在内存。
- `backend_deploy/liveChartPolicy.js/liveChartRoutes.js`及`discover/live`：已有好友/拉黑/JWT/审核设施复用，10工具最小序列化（新增小六壬、玄空飞星、太乙）、嵌套白名单、可隐个别八字柱、固定版本、多盘、对方接受、500可见字符、幂等、前后消息分页、按解读者原话留档、到期/撤销/延期、授权导出和再转发。转发保留原版本，不复制旧会话，权限不能扩大且源撤销会阻止后续访问。服务器共享副本和消息可被治理，未宣称E2EE。其余工具/缺原参数的限运层明确UNSUPPORTED，尚非32工具全部适配。
- `AcupointStudyDiscussion`/`ResourceDiscussion`默认折叠且关闭时不加载；最近/精选/我的及游标复用原500字审核/举报/屏蔽。`tongchenStore`增加单独同意的自填同校标签，未认证，不从健康/医院资料取值；医院/病种/病房找人仍封闭。未擅自开放旧陌生群聊或受限付费预测/医疗交易。
- `lifeSearchTraditional.json`为OpenCC ver.1.1.9官方4113条字形表第一候选派生，仅索引归一，不改原文、不合并药名；源SHA/许可证在`public/legal/life-search`。短中文/多关键词/人物/医院/OCR/日期和页码命中位置已接线，语义/拼音并非已交付能力。私人页不计活动心跳，不挂营销浮窗。

### 62.3 实际验证与未通过项
- 完整质量构建：75d79ef运行39193267206、e7d25a7运行39193682595、938a3f6运行39197501271、15e27a7运行39197929130、b14e798运行39199001821已通过，覆盖TS、私库/真实HTTP ACL、既有119项学习/历法/社交/支付等及6项七政对拍；每个结论只对应其源码。051的字形测试曾错把NFKC后的半角逗号预期为全角，已保留断言并修正预期后通过；未删断言掩盖失败。
- Win11/Node24.17合成纯RAM索引覆盖1千/1万/10万；新位图100000条建索引约2.8–2.9秒、热查询约0.03–0.07ms，posting数据约2.17MB。进程RSS随运行约134–264MB。不是原生SQLite吞吐、OCR、磁盘或物理设备过夜耗电结果。
- 实际浏览器938a3f6：无账号保存864字和一张合成PNG，重载仍在；繁体短词能查；锁定后私有标题不再出现在页面；错误备份密码明确报错且不改原库；正确备份经结构/原件SHA核查，恢复到新独立档案，新旧两份并存，新档案可打开同一原图。实际截图`09_独立恢复原件核对.png`；没有用页面200代替上述动作。
- 合成备份126552字节，SHA`9578c41ef375848d1d62270010f441869afe2164453950612033ddac267ae223`，E证据目录`09_合成测试可恢复备份.ydlife`。C下载重复文件现已合入唯一CMD，未由代理执行删除。合成原图SHA`26ea827115692ed2ef28b09d2d80be0d3bafe64f25e24de595a1b4813e4843f7`。
- Android实际AOSP29模拟器、无GMS、飞行模式：39199000776的2个原生测试通过，包括0.5/5.0、不能、左/右、原字节不变及坏图拒绝；正式XML`09_Android无GMS实际OCR测试.xml`，测试总1.73秒/识字用例0.967秒。不是手机实测。测试后Gradle卸载合成测试应用导致外部JSON未留存，不能伪造识字明文；后续已增加专用合成日志留存与PDF第二页测试，等待新跑结果。
- iOS真实应用模拟器39197510690：学习页面流程通过，私库新建失败。真实UI树显示空库读取的原生返回undefined未被处理，证据`09_iOS原生新建失败_实际界面.txt`（SHA a42cdef8a5a25cf1e0ea650fc7dbbc2222f012ed03c921c9dc4ce33673794971）。fe41f44已修空读，39199504513专测已成功新建并到达记录编辑；随后发现自动保存禁用编辑框导致原生键盘失焦，测试真实失败。后续改为后台保存不禁用输入、保留保存期间新输入并推进自己的版本基线，再重跑，不能以新建成功冒充完整通过；没有凭猜测替换加密方案。
- 本机RAM预览当前源dc2ceae、官方构建artifact12164667909/SHA88000900838286b51881098d4ffd1b9c2e1922e08bb60ad73741b571d77f746d。进程26096/3113以offline-private运行，API代理关闭，浏览器CSP connect-src none、form-action none、frame-src none。合成全文1046字符在该限制下保存、锁定、重载、解锁后逐字一致；不是全域抓包或物理飞行模式结果。这是当时的运行状态；该验收服务及后续RAM服务均已停止，本次读回3113监听0，详见62.6。

### 62.4 继续顺序与严格未完成清单
1. 完成当前PDF/native/私库专测，修实测失败；再以同一最终源跑完整质量、新包、实际浏览器恢复/提醒/大字/四语/三主题与两用户交互，不以源码存在为验收。
2. 补齐未适配活盘/授权层、私人导入/搜索/导出交互及逐项44端到端记录，兼容部署前先对比生产socialApiRoutes真实源，不能整文件覆盖线上额外修复或用户/订单库。本机底座前端和本节紧急修正已Web上线，活盘/治理群等后端仍待验证部署，禁止混同。
3. 07历史界面四语全覆盖、桌面/锁屏/强停/重启/权限拒绝及实际过夜功耗；两真实账户两设备完整链、Apple沙盒实际到账与恢复仍待具体验证。用户此前购买成功不等于服务端授权完成，不能猜账号放宽全体沙盒权限。
4. 古籍全本已有十部340篇卷包不等于所有医籍/药典/图谱完成；28动画权利、逐穴定位/董氏/医学审校、旧个体诊疗AI用途、准确医疗/隐私/第三方权利与商店披露仍是实质发布门槛。未取得权利/专业确认不编造、不能只改“学习”文案。
5. 私人端侧大模型/供应商官方安全直连未具备时保持CAPABILITY_UNSUPPORTED，无平台代理回退；自有云为系统文件向导，未实现自动云接口。治理群/服务者教学按渠道准入逐项开放，医院敏感发现和未核准交易关闭，不影响可独立验收的本机底座。
6. 清理仅准备负责人CMD，按本轮最新授权不代执行。旧2109及C合成下载重复件四个目标已重盘点并更新唯一CMD；不得删除唯一源码、现行2110或已验证2102、有效证据、苹果密钥。97共享Git历史债务仍不得整目录盲删。最终要更新此同一62节、总账、四镜像SHA及空status/上游一致证据，不能宣布全部完成或工作区彻底清空。
### 62.5 2026-10-19 继续开发检查点（负责人6点返回前先做代码与自动验证）
- 负责人现不在电脑旁；不再重复安装或替其确认华为风险提示。手机2109不是2111，未卸载/清数据。维护工具 `scripts/install_verified_android_from_ram.py` 只从固定成功CI全RAM验证官方签名包，新增 `--verify-installed` 仅读回版本及已安装APK SHA；已有安装确认窗口时拒绝再次传包。不得把ADB传输返回成功写成安装成功。
- e05ca1a质量39205015147成功；Android2111签名39205260324成功，APK SHA978855ae4fc277ba07ecbc9aa2c9053c100e12c4870bf122dd31fdec833d7cd9。iOS23签名39205263625成功，官方IPA压缩artifact12165915389/SHA6703e897872b980ed8904514a80c385916101e446d9e71cafe0c1284f75034c1；未上传Apple。不能用同版本号代替源码/包SHA一致。
- e05ca1a实际应用模拟器39205686260成功：iPhone和iPad均完成学习、组件共享容器、8商品页面（非购买）及人生记录新建、长文保存、锁定重开。各原生私库6条密文记录、合成明文未出现；AppGroup92条快照、私人日程内容0。E证据为 `09_iOS最新通过_source.json`、`09_iOS最新通过_iphone_private-vault.json`、`09_iOS最新通过_ipad_private-vault.json` 及共享容器JSON。早期iOS空读/键盘遮挡保存失败已经修复；原失败证据保留，不伪装从未失败。
- dc2ceae实际浏览器：1007字符UTF8文件完整导入，保留原件及自己的前言；禁止联网后又保存，总1046字符，锁定重载后逐字相同，末尾可搜索。实际截图 `09_禁止联网后长文保存重开.png`、`09_浏览器UTF8全文导入后重开.png`；验收后已锁定。CSP排除了连接请求，不等于设备抓包、所有外域请求审计或另一独立设备恢复。
- 251b626已把精确提醒改成逐条本人选择，普通/文化提醒不要求精确唤醒；Android应用队列预算128、iOS应用保留预算48，展示递延数/排到日期及失败状态，不声称这些是所有系统的硬上限。iOS从UN读取本应用当前待发数，Android显示“上次登记”。文化提醒遵守自选安静时段，同日文化内容合并；仍待真机送达/取消/重启/强停/功耗。
- e05ca1a保留紫微全部三模式小星竖排，36神11px、流羊等12px，闭合三角加对宫中线；实际12宫几何/小星列测试通过，不改计算内核，不宣称与竞品全部模块逐像素一致。
- 7f54036新增 `backend_deploy/governedGroupRoutes.js`，复用同一social.db、groups、chat_messages、好友/屏蔽/审核/后台；移除旧直接入群和未审核群消息的七处重复处理。创建需成年确认及专题、名字审核；管理员邀请双向好友，受邀者明确同意后才入群，50人上限、过期/拒绝/限频；新成员不能看加入前消息。500可见字符、不可变重试ID、待审仅本人、审核失败保留原内容；群名/公告修改待审前不覆盖原资料。后台原群管理加入通过/拒绝及待审修改。保留原管理/禁言/移除/退出/解散/举报；关闭渠道仍可退出/举报/拒绝邀请/解散。尚未部署，未打开渠道开关；群盘卡ACL与客户端完整两用户验收仍未完成。
- 群缓存改用已登录服务端账号，不再使用设备游客ID；未知归属旧缓存保留但不自动挂到新账号。发送回包检查账号归属，聊天分页、审核状态刷新、旧消息阅读时不强制跳到底部。创建页不再展示无法兑现的100/200/500人群等级或批量建群；现行服务端每群50人、每日3群。
- 7f54036云检查39207680711在TypeScript发现错误（可选错误文案传入必填参数）；e19b320修复并完整重跑，不能在结果出来前写通过。新四项HTTP场景与账号隔离测试待该最终源执行。未改支付/会员/佣金/排盘/医考。
- 验收契约当前实际40个拆分分项、44案例；此前“26”是原文节数口径，不能冒作已完成数。全量历史四语、私库容量/备份状态/裁剪派生件/批量撤销、群盘卡ACL/服务者审核、医学资料权利审校/临床AI用途和07物理组件/功耗仍有具体软件或外部验收缺口，继续做，不把全部归为用户阻塞。
- 当前仅准备负责人唯一CMD，代理未执行文件删除。2026-10-19 C可用15148924928字节（一次实际盘点）；没有新C依赖、构建包或解包目录。C合成备份下载重复件已E核SHA保全，待加CMD；历史97共享Git及密钥债务仍需逐项处置。
- 上述源码路径均相对于唯一活动仓 `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/`；上述证据唯一E目录 `E:/八字命理类文档包括排盘方式电子版/言道国学项目归档/发布包/实机整改_20261018/`。四固定报告同步哈希见同目录 `09_开发检查点核验.json`；这是执行中检查点，非全功能交付/正式提审证明。


### 62.6 2026-10-19 工具交流、安卓排盘、天文馆、知识工厂权限及“提交”整改（已局部上线，整体仍未完成）

**具体代码与用户操作**
- 以下代码路径相对唯一活动仓 `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/`，不是新源码副本。`src/components/shared/date-picker.tsx` 修正旧记录缺出生地时静默return：现在明确提示、核对地区后由用户点“使用上述出生地并排盘”，异常就地显示，未更改历法/排盘算法或擅自确认默认出生地。华为2112用当日合成资料实际从表单生成紫微；2113继续可打开已保存同一合成命盘。
- `src/components/ToolStudyDiscussion.tsx` 按32工具稳定ID挂接500字文本交流，通用入口在左侧避免官网品牌链接遮挡；`src/app/yixue/ziwei/page.tsx` 专用入口合并到原底部工具栏第四格，保留宫位资料/另一盘式/快捷排盘及四化/三合/飞星，避免浮动入口盖住飞星。应用内弹层支持返回键/Escape关闭且保留命盘。`AcupointStudyDiscussion.tsx` 按负责人最新要求将按钮改“提交”，四语对应文案同步；未去除真实审核、举报或屏蔽机制，未公开合成测试留言。
- `sectionGate.ts` 的公开矩阵请求增加8秒超时，`src/app/academy/astronomy/error.tsx` 增加失败重试；`src/app/guide/astronomy/page.tsx` 是自有官网使用说明。星图与说明不再直接跳Git仓库；Astronomy Engine/HYG作者、许可、原始源码链接集中 `src/app/privacy/page.tsx` 的第三方政策。明确8920恒星子集、现有算法/范围、主动定位和五运六气1900–2099，不能声称完整宇宙或DE431严谨古天文精度。
- `src/lib/academyApi.ts`、`src/app/academy/factory/review/page.tsx` 改服务端真实管理员会话验证、临时内存凭证和持续错误提示，不再任意非空密码打开待审内容。`AcademyReviewerApplication.tsx` / `AcademyReviewerApplications.tsx` 提供登录用户学科、经验和说明登记/复核，单项500字；申请审核不自动授权，真实管理员仍需另行明确白名单。`backend_deploy/academyRoutes.js` 使用恒时密钥比对/失败限频、活跃账号校验、审计和no-store；普通用户待审接口403。a499d05补审批后私人/机构原件的派生知识、直达、题库、考试/旧错题继承来源可见范围，不能因APPROVED变成全站公开。

**评论内置筛查与人工复核，不能写成云安全已经启用**
- `backend_deploy/studyCommentSafety.js`、`studyCommentStore.js`、`studyCommentsRoutes.js`、`src/app/admin/study-comments/page.tsx`：公开学习留言做NFKC/零宽字符处理和涉政风险语境、暴恐仇恨、违法营销、危险医学指导标记；语境标记不等于判定某观点/引文违法，要求审核员结合原文阅读。
- 预留真实腾讯TMS签名适配，固定官方端点、8秒超时、响应大小上限、正文UTF8/base64和不含用户身份的散列DataId；只允许专用TMS凭证且 `STUDY_TMS_PRIVACY_READY=true`，不借用短信/邮件/对象存储密钥。仅面向主动公开的学习留言，不传私人健康原件、人生记录/OCR、出生盘、设备或位置。
- 当前生产只读确认 `configured=false, manualReviewRequired=true, politicalCoverageRequired=true`。没有配置专用云安全，不产生TMS调用或费用。所有新留言始终pending；云不可用、未配置、缺Polity结果都不能自动公开，机器Pass也仍需人工。管理员必须逐条确认正文和昵称并写依据；机器Block禁止直接通过，只能重新检测/申诉，失败重试不能洗掉旧Block；删除后的留言和回复不能被迟到检测恢复公开。
- 发布还检查已有可信注册账号的手机号字段；这不是新接入的独立实名供应商或全套合规认证。举报/屏蔽/500字/限频/角色鉴权保持。此新安全门限于学习留言体系；旧资源评论、动态、私聊/群等未全部改成同一TMS门限，仍有治理债务，禁止声称全站所有UGC均完成涉政自动检测。人工值守和真实专项云安全开通仍未闭环。

**真实测试、上线与包**
- 本地10项评论安全/状态测试通过；d62d60e完整质量39230616308成功（TS、真实HTTP权限/学习留言、私库/既有功能回归、全静态构建）。新安全测试覆盖未配置/异常不放行、缺涉政覆盖需复核、逐条确认、Block不能绕过及删除不复活。没有以模拟接口结果冒充TMS线上已开通。
- d62d60e Web官方artifact12176359295/ZIP SHA `58fd29671dce2ad0d878eced70b873cbfb137d81aa6e6d3f84a88b095a23c91c`，2307文件67760757字节，清单SHA `631b654d070ee67f3a2461731bd1322d334712ee89d1447911b0f1110e6511de`。原子部署回执 `09_提交按钮与评论安全官网部署.json`；实际线上评论面板已加载、按钮“提交”、0/500、空列表，未使用加载中截图冒充完成。
- 后端PM2 yandaoguoxue-backend路径 `/www/yandaoguoxue-backend`，先比对线上差异再仅更新所需模块，不覆盖server.js、用户/订单/社交库。academyRoutes SHA `b217f9d5204bf514b27e157fc4ce383cc4947099d95e367a78f8787e1ac4b62a`，上一文件9375fcd9b52eb23b9fa32e456badfee20a9152e4e83d31e0585a64865869d17e。评论Store SHA `d9cbd25a952437b74439db00dbf65a5d354c3c70db2807fa6ad864f78f03c8b8`，Routes `4063cf6a29f2c74a79a0a428cc860832627675f331d304f27f10147a73bc72c5`，Safety `4862c983fcd8ec40a4ebe20242118e8d049154b62f863368c5837ce64938cad9`；前两文件各留一份.previous。实际公开读取200/无权限管理401或403/有效凭证200、no-store、源资料ACL保护均有读回。只记结果与hash，不记录密钥值。
- 安卓25.0.115/2113签名39231080237成功，artifact12177725332/ZIP SHA `bc3cf504536dfbf1b7cecdb0e3ab41642a860ef5e63c54f1c4d63d866bb8058c`，APK62741732字节，包/安装哈希见62.1；原证书不变。APK/AAB只在云/RAM核验与传到指定手机，没有新增C/E实体包。负责人确认后 `--verify-installed` 仅读回，不再次传输。安装后真实手机截图显示中央言道学堂仍在、紫微三模式/底部交流可见，500字面板按钮“提交”，返回仍是原合成命盘。
- 华为2112还实际打开天文馆、8920恒星加载、FOV100→71→100、全屏成功，证据 `09_安卓2112天文馆星图.png` / `09_安卓2112天文馆全屏.png`。2113仅验证本次变化，不把2112截图改名冒充2113星图专项。
- 最新实际iPhone/iPad模拟器39227847915在源码918c043成功，包括本机容量数值UI、长文、锁定重开/原生SQLite、学习及8商品页面（非购买）。artifact12176369263，ZIP SHA `9df0d03cb4603c4b27ae067ab23d55eeb9f5c2b71dde494d1508f25cdb5eedb5`；E `09_iOS容量本轮通过_source.json` 与各机型private-vault/shared-container JSON证明各6密文记录、无合成明文、AppGroup92条/私人日程0。早期隐私协议弹层等待时序失败按真实UI修复，没有放松断言。新Android容量AOSP39226292649被取消，不能称新增容量真机/模拟器通过；较早39203550695仅证明四项原生OCR/PDF，分别记录。

**待审资料检查与剩余开发**
- 生产资料approved21/parsed76/pending1/rejected2；知识approved12204/deprecated130；题库approved15021/pending4/rejected254，是盘点数量而非医学审校完成数。唯一pending资料id106《紫微斗数》源原文此前为空，实际文件为GB18030/18138字节。核原文件SHA `5e8177a1e4960557e51975a2404a3a5f5546d5a09238fec71f249d19d9c28a0e`，解码往返逐字节一致，受条件事务恢复9716字正文并留操作审计，原文件未动。仍pending，未声明来源/授权，不公开、不调用AI；未来上传入口通用GBK解码仍需修复。4道pending题均有NEEDS_REVIEW/重复或医学解读问题，不盲批其中专有制剂剂量资料。证据 `09_待审记事本原文恢复核验.json`。
- 7f/e19群治理及e79的 `backend_deploy/studyGroupCards.js` 完成服务端成员nonce/离群关闭即时失效、最小盘副本、单独导出/留档权限与新成员不看旧卡ACL测试；尚未部署或开群渠道，群盘卡前端仍未实现。私人容量/备份元数据已补，裁剪派生件、批量撤销、导出脱敏、服务者授权等仍有具体软件缺口。
- 07/09契约40拆分分项/44例不等于完成数。全部历史四语、物理组件/通知/强停重启/功耗、两用户多设备全链、沙盒实际到账/恢复、28动画权利/逐穴与董氏/医考专业审校、临床AI用途、隐私/医疗/ICP/权利准确披露仍待完成。苹果正式新版截图、最新源签名包和正式提审尚未做；不隐瞒功能给审核，不重复荣耀已有任务。

**证据、清理和下一步**
- 唯一E证据基址 `E:/八字命理类文档包括排盘方式电子版/言道国学项目归档/发布包/实机整改_20261018/`。主要读回为 `09_安卓2113最终整改安装验证.json`、`09_评论提交与权限实际界面核验.json`、`09_知识工厂权限线上验证.json`、`09_资料权限继承线上核验.json`、`09_评论安全线上核验.json`；实际图 `09_安卓2113交流提交按钮.png`、`09_安卓2113交流返回命盘.png`、`09_官网紫微交流提交已加载.jpg`、`09_官网管理员错误凭证持续拒绝.jpg`、`09_官网审核员登记独立授权.jpg`。部分中间手机图含用户旧出生资料，不能拿来做商店宣传，展示图只用当日合成资料。
- 已停本轮RAM预览PID2508及其自身wrapper8652，核实命令归属后停止，不杀共享ADB；读回3113监听0。没有C盘新依赖/构建目录/源码副本/ZIP/APK/IPA/解包。2026-10-19本次C盘可用17232228352字节，仅盘点，不声称由本轮删除释放。
- 按负责人最新要求仅提供CMD，代理未删除文件/服务器旧目录，本轮释放0。唯一有效命令文件 `C:/Users/ZhuanZ/Documents/Codex/2026-10-17/e-c-users-zhuanz-documents-codex/outputs/guoxue-clean-20261018.cmd` 为CP936/CRLF，SHA `6bc78b38a9a33fd75b0d251926a480fc9b93ff72bc756c75a8710e83cb98796a`。4精确目标共56964392字节：E发布包旧2109 APK28235991/AAB28601849、同目录仅非递归空目录rd、C下载合成备份126552字节。原文件与E合成保全备份SHA均再核一致，命令逐文件hash匹配才删，备份先验证E副本；不删2110/2102、源码、密钥或真实审计证据。
- 负责人执行命令：`cmd /c "C:\Users\ZhuanZ\Documents\Codex\2026-10-17\e-c-users-zhuanz-documents-codex\outputs\guoxue-clean-20261018.cmd"`。尚未执行，四目标当前仍在；不能说物理两代/彻底清理已达标。新2113仅云/RAM/手机，E仍2110+已验证2102并有2109待CMD；不得将其误称当前正式市场版本。历史97共享Git的6改/192删/66独有未跟踪与历史密钥债务尚未审结，不盲删共享Git或盲提交私有资料。
- 下一步先处理剩余07/09软件与逐项验收、旧UGC治理/真实内容安全和医学权利问题，再同一最终源做iOS签名/TestFlight/两端实机、截图与真实提审。清理待负责人CMD后逐目标核验；版本轮换必须保留已验回退。四固定报告已按同一权威源同步，最终SHA及文档提交/推送、上游0/0和空status写到本E目录 `09_本轮收尾核验.json`，不在报告内自引用最终SHA。这里只是可核查的紧急整改检查点，07/09及整体正式交付未完成。

## 63. 2026-10-19 10号同证研习、同辰人生及负责人改为自动审核（阶段上线，07/09/10整体未完成）

### 63.1 指令核对、边界与本轮真实范围
- 已读唯一活动仓/父级AGENTS、强制制度、总账、最近三个交接增量及10号原件。10号唯一原件为 `E:/八字命理类文档包括排盘方式电子版/yandao_instruction_10.txt`，SHA-256 `96d14a8064a1895cf01373f8bf5b648f4f1054aeee79bf729a51d64dd79e3826`。验收契约 `docs/requirements/research-10.acceptance.json`列17节/25案例，overallComplete=false；数量不是完成数。不改学外语、其他产品、支付价格、佣金、会员权益或排盘内核，不盲批医学资料。
- 负责人最新直接回复：“内置相关，敏感词汇来审查，内置，涉及比较模糊的可能敏感的，AI审查！人工肯定没办法搞定！”因此取消本轮此前设计的每条人工通过及每日值守前置，改为规则＋明确授权的机器分类；管理员开放条件改为实际自动审核已配置、渠道披露及依据，不虚构已安排人工。异常/冲突/举报保持隔离，申诉入口仍在；无处理结论时不恢复，不能承诺完全无人治理、专项认证或全部风险都被识别。
- 以下为10号阶段交付，不替代62.6的07/09剩余清单。当前真实源码930c6d9已官网上线、安卓2115实装、苹果25内部测试可用；真机发现持续时间选择框在夜间主题太暗，152346d补白底深色字/原生日期与分享选择控件，正在生成最终2116/苹果26。后续本节63.7以最终核验覆盖本段候选状态，不能把旧包说成新源。

### 63.2 学习内容、原文证据和私人资料边界
- 复用原有11类79症状，并建立s001–s079稳定概念ID；别名保守使用现有字面名称，未编造医学同义词。多选、任一字面命中、多个命中优先、分页、清选及仅古籍记载医案筛选均有测试。
- 只对已有9部来源版本生成派生原文索引，不另建医学数据库。1053卡逐一与原章节Unicode码点位置核对；其中95段来自《医学衷中参西录》“五、醫案”，沿原文37个案名标记为古籍记载医案；其他条文不冒充临床案例。卡列书名/作者/版本/章节/自然段/位置/许可/校核边界，链接同一来源完整章节和高亮自然段，不伪造页码/医生签名。原文截段检索不等于把整本古籍改成节选。
- 46/79概念目前有字面命中，33概念无字面命中，明确空结果并保留整本检索；现代同义词、传统证候/治法结构化标注、现代释义和全部医学专业/影印本复核仍未完成。不能把1053卡、9来源索引或书架数量说成药典、全部医籍/董氏穴位和医考专业审校全部齐全。
- 辨证学习保留症状、流派/老师/方向参数，持续时间和自述只在页面内存。原个人输入→AI生成证候/方药/触诊和手法的本页流程改为本机确定性原文对照与学习问题，不把所选老师标签冒作已建学术知识链，不改支付额度服务。此处修正不等于其他旧医疗AI页全部已整改。
- 两个折叠抽屉为相关经典医案/原文依据、同证研习；同辰页新增四主题人生交流。知识/化名/本人经历（人生域为本人片段）逐字段选择、核对脱敏、含标题/依据合计500字，服务端重新组装并与预览逐字比对。固定引用卡ID验证当前主题，不接受自造作者/出处。拒绝原库/附件/未知字段、联系方式、医院身份线索、具体日期年龄位置及可照用剂量、停药或侵入操作指导；不是保证任意自然语言都已无敏感信息。
- 继续复用同一study-comments.db、用户、审核/举报/屏蔽与本机加密人生记录。研习使用域内随机稳定化名，后台受限关联原账号；登录、活跃账号与现有短信验证手机号校验。成年日期仅本次应用层核验，不保存到研习表；不是独立政府实名/年龄认证。未加入、未成年、游客/退出者由服务端拒绝研习读取，不靠隐藏按钮保护。
- 同辰人生沿原匹配、双方同意与退出规则，公开主题不证明两人真的同辰；成员public_id/joined_ms/ruleVersion nonce变化后旧人生授权失效，重新加入/编辑不会静默恢复。本人删除或退出清除本研习正文/结构化副本、昵称/hash与检测副本，保留最小处置审计及受限反骚扰映射；别人此前获准保存的本机摘录不能远程收回。
- 已公开且允许留档的摘录经本人动作进入原加密库的RAM导入交接，带来源/作者/时间及未独立核实标记；可另行选同一本机库既有就诊记录，或明确选择提醒时间。日历锁屏不放健康正文、姓名或生日，保留本应用来源返回。没有给好友或同辰用户原库访问权。摘录/就诊关联/原生提醒的两真实用户完整UI和送达验收仍待完成。

### 63.3 自动审核已上线：实际模型、授权、隔离与成本边界
- 新模块 `backend_deploy/studyModerationAutomation.js`使用已配置腾讯云TokenHub混元Hy3，固定官方HTTPS端点、禁止重定向、关闭思考/工具、要求JSON，输出上限512 token，12秒超时和64KiB响应上限。没有复用旧资源评论的简单PASS字符串匹配，也没开通新付费TMS/WAF产品、没换短信/邮件/存储密钥。
- 内置NFKC/零宽/拆空格处理后先挡联系方式、身份线索和危险操作；涉政风险语境、暴恐仇恨、违法营销、医疗风险等规则标记不自动判定历史观点/引文违法。所有自由文字余项仍需机器逐类确认：违法政治煽动、暴恐、仇恨骚扰、色情未成年人、诈骗赌博、广告联系、隐私、危险医学操作及提示注入。类别缺失、非JSON、截断、上下文不明、模型不确定、规则冲突、服务异常或预算耗尽保持隔离；模型自报confidence门限不是经过标定的98%准确率。
- 提交前新增不预选的单独授权，列明腾讯云TokenHub隐私说明、拟公开正文/显示化名与用途；服务端存版本。没有该版本授权的旧客户端/旧投稿不调用混元、不自动公开。只向机器发送public_text/public_display_name，研习使用系统化名，不附账号ID、出生盘、定位、私人健康原件、OCR或人生原库。拒绝授权不会影响本机资料，不能静默代用户勾选。
- 平台审核不扣用户AI点数。复用已有模型调用额度，实际可能产生原服务的调用费用；每日全局最多50次、2并发，相同公开文字/显示名/策略hash缓存15分钟，SQLite持久预算不因重启归零，缓存不存正文。只能说有限调用，不能称免费或专项内容安全已开通。隐私与审核政策已更新，旧动态/资源评论/私聊群并未全部迁入此模块，不声称全站UGC完成同等治理。
- 每条先入PENDING；只有当前授权/内容hash/策略版本匹配、账号和主题仍可用、父留言已公开、没有未处理举报/旧Block且完整机器通过，才自动APPROVED。机器Block不能被异常重试洗掉，用户删除后迟到结果不复活；后续不确定结果会撤下已公开项。举报立即隔离本条及回复，未处理举报不能直接恢复；支持用户反馈申诉、屏蔽、删除及本人待处理项重检，未取得通过结论不公开。日常不要求逐条人工点击；异常申诉未解决时会继续隔离，不能说已经实现无人治理闭环。
- 真实混元合成探针2次：正常节气原文问题PASS，要求绕过系统并发布赌博广告的合成文字BLOCK；finish=stop，输出122/125 token，未创建公开帖子、未读取私人记录。此为实际通道可用与样例结果，不能当作完整政治/医疗分类准确率验证。证据 `10_混元合成文字真实审核探针.json`。
- 生产模块部署仅7个明确文件/派生JSON，先核旧Store/Routes SHA与d62现行完全一致，再依赖优先原子替换、node --check、PM2重启。原两模块各一份.previous回退；没有覆盖server.js、用户/订单/社交库或其他服务；现有.env只改3个公开审核开关为true/true/50，不复制或打印私钥。模块SHA、旧SHA和重启回执为 `10_后端同证研习与自动审核部署.json`。
- 真实公开读回schemaVersion2、configured/automatic=true、manualReviewRequired=false、dailyLimit50、no-store；两个新研习域经管理员真实接口确认披露/自动审核后开放，原始回执 `10_自动审核生产能力读回.json`（开放前）与 `10_自愿研习域开放回执.json`。古籍学习无须参加，公开域没有伪造人群/帖子。后台入口 `/admin/study-comments/`，公开入口 `/zhongyi/bianzheng/`、`/discover/tongchen/`，反馈 `/profile/feedback/`。

### 63.4 实际测试、官网/安卓/Apple及失败纠正
- 本地21个评论/安全/研习/自动审核测试通过；6个研习测试覆盖全部1053字面位置、500/501、未成年/字段权限/两身份/编辑重审/退出明文清除/同辰nonce；5个自动审核测试覆盖完整判定、授权、零宽/全角隐私、持久预算与hash缓存、异常/删除/举报/旧Block不复活、固定第三方最小载荷。3个TSX原文学习测试和原有回归由云执行。
- 实际Express/JWT/SQLite HTTP两合成身份验证了开放权限、短信/成年人、pending→通过、域内化名、屏蔽/举报/退出删除；新增机器通过→公开、举报→立即隔离、重检权限。第三方传输在HTTP测试内专门模拟，不是两个人两台实机，不用生产假用户。旧资源/支付/会员等回归保持，通过不能替代Apple真机沙盒到账。
- 初次8c83bb6质量39235970724在两处TS类型推断失败，691ce72修复，完整质量39236318403通过。e819b65完整质量39237316204及自动39237317457通过；e819安卓2114签名39237643795、苹果24签名39237642850通过但均被后续功能源替代，未传本机/未上传Apple。55ac1f2质量39238844361、2f61f7c质量39239020084通过。2f61安卓2115首次39239020295因workflow仍写死2114门限失败，不是安装成功；930c6d9用 `scripts/verify-android-identity.js` 直接核Gradle/package/实际复制marker与源码，避免下一次重复漏改门限。
- 930c6d9最终质量39239274255成功，官方预览artifact12180198115/ZIP SHA d54dc2a0143a2df5384ee4ae33d3614c1bcfb898af319db9dc532ff9dbd48b86，2309文件68555344字节、manifest SHA a432f7ac9adf045a306b294a672d52fba827e8b745fcc65e80f41fb3c48d7232。官网全文件hash核对、原子切换到 `/root/yandaoguoxue/releases/v25.0.115-calendar-community-930c6d9`，前一可回退d62。源包全程RAM，未在C/E写ZIP或解包。回执 `10_同证研习官网原子部署.json`。
- 官网真实移动视口：选择头痛＋咳嗽，共374条字面相关段；勾只看医案后71段，首例2．虛勞兼勞碌過度，点击进入同源“醫案”完整章节并准确高亮第16自然段。真实工具交流显示“提交”、500字、未预选第三方授权；输入17字而未授权时按钮仍disabled，随后清空合成草稿并关闭，没有投稿。图 `10_官网同症状古籍医案实际页面.png`、`10_官网医案全文定位高亮.png`、`10_官网工具交流机器审核授权.png`。
- 安卓25.0.115/2115，签名39239277760成功；APK artifact12180552310/ZIP SHA00236c129000749e7af00a2c7e3347cb35232c6511f1a3a8e61e60d75702ffa6，62999348字节、APK SHA9ac2a86dd4327efef76d2841f374241cec840dc3601c0fcf7ce649d6da8925aa，证书仍8ca0c414573d4b05fc2bd1ba9c6a2a8090c90c58e3815119494607443dc6d5a0。负责人回复后只读真实versionCode2115及已装APK hash匹配；保留数据/未卸载。真实首页仍有中央言道学堂，中医→辨证学习→同证研习可打开、选择头痛并显示最小分享/成年范围告知；没有代填真实/伪造成年日期或代发帖子。证据 `10_安卓2115签名与安装核验.json`、实际首页/辨证/研习PNG。持续时间暗色问题是本轮真实发现，152346d修，2116另验，不能改图冒充修后。
- 苹果25来自2f61f7c签名39239024594，IPA artifact12179279870/ZIP SHA40061bf8e911f334d8ecaca3192b6bffe4c8e59105be4f7df0a79aecb4a39c87；IPA30399551字节/SHA f19168e27abeb95486dc639dbf9c0fcaf1df07448c5b8c0608c1a08d64236862，bundle com.yandaoguoxue.app，App/WidgetKit构建均25；RAM核实际包内同证UI、机器授权、医案筛选。iOS未内置Android的sourceCommit marker，来源取官方artifact/run，不伪造包内标记。930与2f仅Android门限/核验脚本不同，iOS客户端相同。
- 单独上传workflow不在默认分支，首次dispatch404未执行；转用既有ios-build upload_existing_run只上传核过的上述IPA，运行39239839485成功，没有重复重打或重复上传。Apple真实build bf3ce08e-34db-41df-b2ed-1a24a21cba0a 为VALID、internal IN_BETA_TESTING、external READY_FOR_BETA_SUBMISSION；网页实际见25及原“言道国学”组/邀请1。API查组403，未执行任何组变更，网页已证实原组自动关联；未添加测试人员。证据 `10_iOS25签名包核验.json`、`10_苹果25上传与真实平台状态.json`、`10_TestFlight25实际平台页面.png`、`10_TestFlight25原内部组页面核验.json`。
- 苹果正式App Store25.0.115仍PREPARE_FOR_SUBMISSION，旧草稿仍连build22；本轮尚未正式提审。正确的年龄声明GET为appInfos/{id}/ageRatingDeclaration，旧appStoreVersions关系404已更正；读回UGC、聊天、社交、健康=true，medical FREQUENT_OR_INTENSE；没有重复修改准确申报。原件 `10_苹果年龄申报正确接口核验.json`。全球销售设置沿既有授权，本轮不冒称重新验证所有国家。Apple26及2116对比度修正版后续核验见63.7。

### 63.5 具体改动文件（完整绝对路径，均在同一活动仓）
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/.github/workflows/android-build.yml`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/.github/workflows/study-quality.yml`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/.gitignore`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/android/app/build.gradle`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/backend_deploy/data/study-research-evidence.json`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/backend_deploy/data/study-research-topics.json`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/backend_deploy/studyCommentStore.js`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/backend_deploy/studyCommentsRoutes.js`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/backend_deploy/studyModerationAutomation.js`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/backend_deploy/studyResearchDomain.js`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/backend_deploy/studyResearchPolicy.js`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/docs/requirements/research-10.acceptance.json`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/scripts/build_study_research_index.py`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/scripts/research-learning.test.ts`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/scripts/study-comments-http.test.cjs`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/scripts/study-comments.test.cjs`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/scripts/study-moderation-automation.test.cjs`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/scripts/study-research.test.cjs`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/scripts/verify-android-identity.js`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/algorithm-core/modules/tcm/classics.ts`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/app/admin/study-comments/page.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/app/calendar/page.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/app/discover/tongchen/page.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/app/privacy/page.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/app/profile/life/page.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/app/zhongyi/bianzheng/page.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/app/zhongyi/classic/page.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/components/AcupointStudyDiscussion.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/components/ResearchAccess.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/components/ResearchComposer.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/components/ResearchExcerptActions.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/components/ResearchLearningDrawers.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/lib/calendarEventsStore.ts`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/lib/lifeRecords.ts`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/lib/researchLearning.ts`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/lib/studyComments.ts`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/locales/en.json`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/locales/ja.json`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/locales/zh-CN.json`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/locales/zh-TW.json`

### 63.6 剩余、清理与回退（当前仍未完成事项）
- 本机摘录→既有就诊→提醒、所有分享模式/编辑/退出与两个真实成年人两设备UI、iOS新研习物理UI、通知送达/取消/重启强停/功耗仍待逐项实测。既有Apple沙盒“付款成功”尚未匹配已授权测试账号及恢复到账，不能给所有用户开放沙盒，不再重复扣款。07/09群盘卡前端/渠道、私库裁剪派生/批量撤销/导出脱敏/服务者准入、历史界面四语全覆盖仍有软件缺口。10号AI资料概括/自动分歧归类未开放，当前AI仅公开内容审核，不混同两者。
- 33概念缺字面命中、全部医籍/药典/逐穴/董氏/图像授权与医学专业审校、旧个体诊疗AI用途、健康/权利/隐私完整披露与正式商店截图/提审仍未完成。不能仅凭“学习”免责声明放行未经核实医学知识或把本轮真实通道样例当法务/医学认证。没有重复荣耀已有审核、改其他产品或用假数据冒充交流人数。
- 本轮只增加维护源码、测试及小体积真实E证据；未建C盘node_modules/.next/out/www/ZIP/APK/IPA/源码副本，未启动本地RAM预览，3113监听0。本次盘点C可用17462808576字节，是读数而非释放量。脚本/模型依赖和打包在云/RAM；验收有效PNG/JSON留E同一证据目录，不另建交接报告。源码及文档按具体路径审查提交，不为清场提交密钥、数据或包。
- 按负责人要求删除只交CMD，代理本轮未执行文件/服务器旧release删除，释放0。唯一CMD仍 `C:/Users/ZhuanZ/Documents/Codex/2026-10-17/e-c-users-zhuanz-documents-codex/outputs/guoxue-clean-20261018.cmd`，SHA6bc78b38a9a33fd75b0d251926a480fc9b93ff72bc756c75a8710e83cb98796a，执行前须重新核本节/62.6精确清单。其E归档2109 APK/AAB/非递归空目录及C合成备份重复件4目标共56964392字节仍待负责人CMD；E已核SHA保全合成备份。未删源码、原始资料、有效证据、密钥、归档2110及回退2102。当前新包仅云/RAM/手机，E实体仍2110+2102并有2109待清，不能宣称“物理只两代”已达标。
- 历史97共享Git的6改/192删/66独有未跟踪及历史共享密钥债务仍未审结；不能整目录盲删/盲交。苹果新钥仍唯一E苹果开发者顶层AuthKey_URY888FLWG.p8/中文说明，未改其他产品凭证、未新生成/撤销共享旧钥、私钥不入源码/交接/日志。每次提交前私钥扫描通过。
- 回退：网站回到本轮切换前已验源d62（后续152稳定后以63.7最近已验源为准）；后端Store/Routes.previous为d62原文件，停用STUDY_COMMENT_AUTOMATION/STUDY_AI_MODERATION_READY及关闭研习域后原模块回退，保留新增表而不删用户数据，新依赖可留置不加载。不能把“上一目录”当已验回滚而不核hash。原生TestFlight旧已验22/安卓2113证据仍在，禁止卸载或降级清数据来回退。
- 下一位先读63.7与验收契约：补剩余软件/真实两端验收、沙盒到账和医学权利后，才更新准确商店截图/草稿关联新包并正式提审。唯一报告四固定镜像以同一字节同步；最终SHA、提交推送/上游0/0/空status及清理盘点另存本E目录 `10_本轮收尾核验.json`，不在报告内自引用最终SHA。本节为执行中可接手检查点。

### 63.7 2026-10-19 本轮最终读回：统一源152346d、安卓2116、TestFlight26（仍非07/09/10全部完成或正式上架）
- 所有本轮最终客户端均固定152346da1a287c2d994b26f46c4b8e3196d35d66。完整质量39241147478及自动39241146000成功，私钥检查39241146018成功；21条评论/安全/研习/自动审核、3条TSX原文学习、真实隔离HTTP和既有回归及完整构建通过。没有把初次失败抹去，也没有在源变更后沿用旧成功假称新包。
- Web最终artifact12181142353/ZIP SHA dcb471042270da19165c9511ae3a4606d2d307fa042c4f121a73f24137962746，2309文件68556280字节，manifest SHA cf1c41d99acfd6cd55061d832e64d83e4edfa1551651e61cc97e9207e552495f。真实原子切换/current为v25.0.115-calendar-community-152346d，前一已验回退930c6d9；回执 `10_最终对比度官网部署.json`。浏览器等加载完成后，实测持续时间控件白底/深色字、默认选填、两个学习抽屉仍在，截图 `10_官网最终夜间表单对比度.png`；第一次早期截到加载页的同名临时画面已被最终实测图覆盖，未拿加载中画面做通过证据。之前930的检索/全文/授权门限证据不改名冒充152重新执行全流程。
- 后端与最终源的7个模块/派生索引字节相同，沿63.3已部署hash；未再改数据库内容、支付或AI额度。最终只读 `10_最终线上审核与研习权限读回.json`：自动审核true、两域enabled=true、未加入的匿名健康交流401、no-store/noindex。仅主动成年/单独授权后的最小分享，代理本轮生产帖子0、私有原库读取0；没有在真实用户账号上替其填写生日/同意公开。
- 安卓最终2116签名39241150994成功，APK artifact12181252435/ZIP SHA c47b1a46ae9b43c66d89b349d38392366979fee340ef7d8c34d4f50040b8315e，62999516字节，APK SHA66050ad4d790350728ae23f0f618f42f830d4ec888204a1841d70ff8c054572e，证书仍原证书。官方ADB替换后先读回版本2116，再从/data/app原装包读SHA完全一致，保留数据/未卸载/未绕系统安全。手机实际首页→中医→辨证学习，并在夜间主题确认持续时间白底深字、原文/同证入口保留；证据 `10_安卓2116签名与安装核验.json`、`10_安卓2116夜间对比度实际页面.png`。2115手机截图只证明上一阶段研习选题/告知，不冒作2116的双人发帖/原生提醒验收。
- 苹果最终26签名39241154945成功，IPA artifact12181077585/ZIP SHA96ed211b334e75062c98daee06d288ce96f4248a7307bb21bbd5b8a81a4ffdb9，IPA30399941字节/SHA211bc4239eb019d8ceaed5ace16f362a89cf40f817745ef5176d3dbb4ec0a4c5；App与Widget均26，RAM核同证/医案/授权及对比度代码确在包中。由既有upload_existing_run上传准确同一IPA，39241969906成功，只上传一次。
- 上传后第一次GET26暂未出现，未因此重传；随后网页实际出现构建26，沿原“言道国学”组。最终2026-10-19T11:12:20Z Apple读回build fef053d1-4fd0-4a1a-8158-05229229eee1，VALID、未过期、internal IN_BETA_TESTING、external READY_FOR_BETA_SUBMISSION。网页“准备提交”不等于App Store正式审核中，正式25.0.115仍PREPARE_FOR_SUBMISSION且关联22。本轮26仅内部TestFlight可测，未新增测试人员、未正式提审或声称上架。证据 `10_iOS26最终签名包核验.json`、`10_苹果26最终上传与真实平台状态.json`、`10_TestFlight26最终实际平台页面.png`；26物理iPhone/iPad、沙盒到账/恢复仍待实际验收。
- 10号契约已逐案记代码/自动化/真实UI/物理/未验收，overallComplete仍false；63.6列出的07/09/10软件、医学权利/审校和两真实用户/原生提醒/全部四语/支付恢复等缺口没有因为新包通过而消失。此回合完成可测试增量和自动审核上线，不能交成“全部功能全部审核发布完成”。
- 本轮没有本机RAM预览/依赖/源码副本/包或解包目录。所有下载、包核验、网站传输和安装helper已正常结束，未杀共享ADB；3113未启动。小体积真实证据统一E目录，索引 `10_阶段验收证据索引.json`最终刷新；本轮删除0/释放0，唯一CMD4目标重核仍在56964392字节、E保全备份hash匹配，见 `10_唯一CMD精确清理目标重新核验.json`。旧服务器目录及97债务仍未删/未解决，两代物理轮换与全局清理未达标。最后盘点C可用16332480512字节仅为时点读数，不推断系统占用变化原因。
- 修正文档新增EOF空行后再跑diff --check；唯一报告及三个固定镜像全部同步同一字节，提交前私钥检查。最终文档提交/推送、HEAD上游0/0、活动仓空status、四镜像SHA和未执行清理，写入同E `10_本轮收尾核验.json`。后续以此节优先，不能继续把旧25/2115当最新候选。剩余任务第一步按契约核验真正两用户/苹果真机与到账，并补专业来源和07/09软件；达标后才改正式草稿关联并真实提审。

## 64. 2026-10-19全部完成后才正式提审：继续补齐活盘、私库、学习与自动审核（阶段验收，整体仍未完成）

### 64.1 负责人优先级与提审门禁
- 已收到最新明确要求“请全部完成，全部完成才能提交审核”。本轮没有新建、组装或提交App Store正式审核，也未重复荣耀/OPPO同版本任务。制度新增第九节、AGENTS及release-readiness契约记录此前提；本仓三个历史ASC审核写脚本已接正式审核门禁，并交叉检查09的40分项/44用例和10的17分项/25用例及逐案证据，不能仅把总开关设true就放行。读取状态/内部TestFlight与正式审核明确分开；门禁不是苹果账号级锁。
- 当前07/09/10总体仍false。不能把本轮补软件、CI通过、模块部署或内部TestFlight可用写成全部完成。正式提审继续禁止，剩余软件、资料权利/审校和物理验收见64.6。

### 64.2 本轮实际软件改动
- 群内授权盘卡：新增/groups/cards/，复用原social.db、群成员、原排盘历史与同一脱敏快照。选1至4张、逐一勾选当前成员、原始姓名/生日/位置/私人备注不随盘发送；预览、独立留档/导出许可、有效期、缩放全屏、举报隔离与本人撤销。成员nonce使新加入、离群重入者不继承旧卡。接群聊天入口和授权通知，群内普通聊天不自动透露其他成员的私卡。群卡目前逐张撤销；群内消息盘锚点及批量群卡撤销仍未全部补齐，不误写成完整09群协作验收。
- 定向活盘支持一次1至50份本人分享的批量撤销，先全量校验归属再事务写入，含非本人一项则整批不变；重复请求不重复审计。关闭渠道、过期或好友关系断开仍保留撤销入口。原分享撤销后转发链后续读取一并失效，不能收回他人此前获准留存或截图的副本。
- 本机图片独立裁剪：20MiB内图片可在本机预览区域、生成PNG独立副本并加密保存；原图/原识字不覆盖，记录原件ID/SHA、比例范围和生成时间，副本需重新识字。输出上限1600万像素，不宣称所有原图任意大小均可处理。浏览器实际1100×470原图裁取10%/15%/80%/60%区域，读回副本880×282且原图仍在。
- 明文导出先预览：默认隐藏已登记人物/医生/机构/科室、常见日期时刻/联系方式，另可最多50项字面隐藏；原话、命盘和原件名称索引默认不含，未授权的他人原话/盘始终排除，本机原件/正文不改写。实际内容完整预览并另行确认后保存；ICS明确保留安排日期及通用标题，恢复用独立加密备份。不能保证任意自然语言匿名，用户仍须核对。首轮实际发现日期被电话规则吃掉前缀后残留ISO时间，8268d23改日期优先/完整时间遮盖且补回归；首轮问题截图只作失败证据，不当作修复后PASS。
- 知识工厂上传先校验全文，支持UTF-8、GBK/GB18030、带BOM的UTF-16；保留原字节并填充完整text_content/来源哈希/实际编码响应。1MiB/20万字符超限、坏base64、二进制/不完整编码拒绝，不再静默截掉后文或留下空正文。文件UUID防重名；资料仍pending，不自动变成已授权/医学审校完成。真实HTTP测试核GBK完整末卷、原字节一致、无效文件不落盘、其他账号不可读私有资料。
- 旧wenzhen/zhongyi-ai：自由症状/补充文字只在本机确定性原文对照，不发送模型，不扣用户AI次数；通用AI只收固定公开文献问题/阅读分类，不注入私人自述和骨错位→触诊→手法方案。旧缓存换命名空间，来源抽屉接同一索引，简繁字形归一不补造医学同义词；13处旧工具说明同步此页实际行为。此修正只覆盖已点名路径，不等于旧diagnosis、constitution、shanghan等医疗输出与全部医学内容已完成专项审校。
- 新增44项控件四语并覆盖新裁剪/导出/发送确认标题；干支、原文和用户留言不机器翻译。全量历史UI与错误/帮助文字四语仍未完成，404个原字典键加本批控件不等于全APP完成。

### 64.3 复用统一机器审核与逐次授权
- 活盘消息、同辰定向消息、治理学习群资料/消息及资源评论不再以“模型输出PASS前缀”决定通过。改复用study-comments同一个严格Hy3审核器、SQLite预算/近期哈希缓存及2并发；仍全局50次/日，不扣用户AI点数，异常/疑点/无预算保持隔离。其他旧动态/评论/普通私聊尚未全部迁移，不能称所有UGC已统一整改。
- 新客户端每次发送显示实际所选文字及公开/定向/群资料用途，单独未预选授权；取消或账号切换不发网络请求。只交文字与固定“学习者”标签，不另送账号ID/整盘/健康原库/OCR。用户自己写在文字内的信息仍是所选正文，预览明确须移除隐私；定向交流不是端到端加密。供应商与平台说明均有链接。
- 无本版逐次授权的旧客户端保持pending且不调用模型。只有匹配策略版本、原文SHA、automatic=true、PASS且无规则标记才active；篡改/类PASS字符串/错hash/不明结果不可激活。审核审计入social.db仅保存受限账号关联、文字hash、策略版本、结果和时间，审计失败不公开；私人本机库不进入该链。
- 新发送确认层高于旧群页z=10001顶部条，避免确认按钮被遮住。删除/举报/关系与成员检查仍是独立门槛；本轮没有自动批准历史待审材料或申诉。

### 64.4 已部署后端与真实开关
- 2026-10-19T11:52:20Z已部署固定源码eba736ca50873830396ac8dff377ac95b4550223的11个指定模块；上线前生产socialApiRoutes与历史cc6be0a逐字节一致，academyRoutes与a499d05一致。维护脚本deploy_verified_learning_backend.py先核每个旧SHA，再检查JS语法、保留一份.previous、切换并重启后核源SHA与health；不覆盖server.js、.env、密钥或用户/订单数据库。新增表兼容迁移前SQLite在线备份data/social.db.pre-live-chart-migration，未用工作区数据库替换生产。
- 证据同一E盘发布包/实机整改_20261018内：10_活盘学习群上线前逐模块基线.json、10_活盘学习群后端部署预检.json、10_活盘学习群实际后端部署.json、10_活盘学习群上线后游客权限与渠道开关.json。
- 上线后health200；游客live及群卡401；普通无凭证知识工厂管理员403。无渠道头默认社交五开关friends/private/posts/comments/groups均false，未把代码已部署混称所有渠道已向用户开放。新社交服务可验证不代表旧群、旧私聊或未治理动态已自动恢复。受控开放和渠道真实操作仍须继续验收。
- 本轮Web已上线f003626cbe4a7c86d10b38b949b2bbcd842f841c；最终构建/实际预览/上线结果见64.7。安卓仍是前轮真实2116/源码152346d，iOS仍前轮内部TestFlight26/源码152346d；本轮新增客户端功能尚未进新的已验原生包，绝不把旧包当本轮全功能新包。

### 64.5 验证证据与范围
- 本轮阶段成功云验收39245609369（2fa2c0b）、39245949584（6dd0b33）、39246900171（eba736c）、39247279376（1e98499，包含真实路由与逐次授权/隔离测试）。包含TypeScript、原排盘/历法/支付回归、原文核查、SQLite/Express/JWT权限与本机加密库测试；合成模型响应并非真人两端验证或医学签审。最初75a9630的39245461377因裁剪回调JSX括号报错，2fa2c0b修复后通过，没有删断言掩盖失败。
- 本机原20项加密/版本/离线索引测试通过，含1千/1万/10万条合成短记录基准；新增4项导出/裁剪来源测试、2项编码、2项审核策略、正式审核门禁测试通过。基准是Windows RAM索引，不是安卓/iOS数据库吞吐、OCR或耗电结论。
- 隔离localhost真实浏览器首轮使用固定eba736c云产物12183394633，RAM静态服务+CSP connect-src none，API代理关闭；裁剪/私库保存/导出预览/回看原文、本机自述原文对照已实际操作。统计apiGetRequests=0、blockedMutations=0、privateCanaryRequests=0；不是生产环境完整抓包或两真实用户。首轮本机预览PID18180已停止；无ZIP/APK/IPA/解包写入C盘。
- 首轮证据：10_离线裁剪与医疗学习首轮真实验收.json、10_新增裁剪副本真实页面.png、10_导出脱敏预览首轮实际页面.png。首轮导出截图含已发现旧ISO残留问题；修复后的最终UI证据须另行验证，不能拿该截图当PASS。

### 64.6 尚未全部完成、下一步与清理边界
- 继续补07/09剩余软件：历史全界面四语、群内盘锚点/批量群卡操作、服务者资质/授权与付费服务准入验收、备份/换机/全部分享编辑撤销的完整UI链；10主动AI公开资料整理及分歧归类尚未开放。旧医疗输出与旧动态/评论/普通私聊治理仍需专项实际整改。以上不是一概归为外部阻塞。
- 外部/物理验收尚缺：两个自愿成年人两设备全链，Android/iOS真组件添加/锁屏/通知送达修改取消/强停重启/功耗，Apple沙盒指定账号识别后的恢复与真实到账。本轮未放宽所有用户沙盒资格，未让用户重复付款；不能用Apple成功弹框代替到账。
- 医学资料仍缺33概念有来源的映射与专业校核；逐穴定位/董氏完整内容、28旧经络图授权、现代药典/医考/全部书籍和图谱权利/专业审校、完整天文软件能力均未因本轮补UI而完成。没有伪造签审、授权或复制手机竞品素材。正式截图、准确渠道披露及正式提审仍须在全部完成后处理。
- 本轮删除用户文件0字节，未代执行CMD。唯一CMD仍为C:/Users/ZhuanZ/Documents/Codex/2026-10-17/e-c-users-zhuanz-documents-codex/outputs/guoxue-clean-20261018.cmd；四既定目标待本人执行核验。旧2109和C合成备份重复件尚不能称已清，E物理版本轮换未达仅两代。本轮源码/维护工具、正式回滚包和真实证据保留；临时产物仅RAM，验收结束须停本次专属预览进程，不停共享ADB/浏览器。
- 历史97共享Git债务仍承接，不盲删共享Git或归并未知私有资料；本轮只读看到共有Git主树C:/Users/ZhuanZ/Projects/minglizyi存在另外22个受跟踪修改及历史删除，包含其他开发中的源码，不能冒称同前次6修改完全相同，更不能替其他工作树盲提交/抹去。活动仓本轮有效改动已逐批审查提交推送，最终空status/上游0/0另由E收尾核验记录。
- 苹果钥仍E盘苹果开发者顶层既有AuthKey_URY888FLWG.p8，未复制/回显私钥、未生成或撤销共享旧钥、未改其他产品。提交前跟踪文件私钥扫描均通过，不能把扫描成功当历史密钥已撤销。

### 64.7 最终网页验收与收尾（本轮增量完成核验，整体07/09/10未完成）
- 最终产品源f003626cbe4a7c86d10b38b949b2bbcd842f841c，完整质量39248787242成功；阶段8268d23/47ec24c亦各自构建检查，最终只以f003626为新Web源。官方云产物12184367934、ZIP SHA-256 8e19d1aa806942d2d207f591eaa875aeb085c8bdfb4e7c6f96354f124cb56e57，2320文件/70198826字节，逐文件清单hash c7e6f919b9ca3887bd9ffb4984bf7decf85069c9ced59322c115ec04e89c2bc9。
- 2026-10-19T12:12:41Z Web已原子切换到/root/yandaoguoxue/releases/v25.0.115-calendar-community-f003626，明确可回退到前轮已验152346d。官网真实浏览器已出现“中医文献研习——原文对照与阅读学习”及新抽屉，保存10_继续完善官网实际页面.png；部署回执10_继续完善官网实际部署.json。更老服务器目录尚未物理退役，不称全盘只剩两代；本轮无Android/iOS新包上传或正式提审。
- 修复后用同一合成档案跨Web源升级重开：原正文和原图+裁剪副本两份附件均保留。导出实际预览姓名/机构/日期/ISO时刻尾部/测试号码均无残留，默认无原件索引；确认后保存按钮可用，编辑隐藏词后确认自动取消并禁用保存，未实际生成多余下载文件。原记录未被脱敏改写。证据10_导出脱敏修复后实际页面.png及10_修复后导出与繁体医案真实验收.json。
- 最终文献学习输入“頭痛、咳嗽”查同两概念，374条原文；医案筛选71条。实际打开《医学衷中参西录》同一完整五、醫案章的classic-p-16，原文对应并有2px定位描边，sourceHash=546272df85248358f16b5e92b1312c23432627a6b1f61ec95bd516dab2d1f1ce。10_文献研习繁体与医案抽屉最终页面.png、10_文献研习完整章节定位最终页面.png为证。不是新增全部医学概念、现代解释或医学签审。
- 最终隔离预览PID21388也已停止，3113不再监听；两次预览均RAM，无本轮依赖/构建/安装包/解包落C盘。合成数据在原隔离浏览器档案内保留作下一阶段升级/恢复验收，不删除其他档案。最终代理统计仍apiGetRequests=0、blockedMutations=0、privateCanaryRequests=0（CSP禁止外联范围内，不冒作生产完整抓包）。旧清理CMD哈希仍6bc78b38a9a33fd75b0d251926a480fc9b93ff72bc756c75a8710e83cb98796a，三文件及空目录四目标仍在/共56964392字节待负责人手动；本轮实际删除0，C盘可用16121815040字节为当时盘点，不归因于本轮释放。
- 收尾增强正式门禁须交叉核对09的40分项/44用例、10的17分项/25用例及每案证据；新增“总开关true但分案未通过/证据空/重复用例”拒绝测试通过。当前整体、逐案与正式允许值仍false/未完成；不是改一个总布尔值就能正式提审。权威报告四固定副本、制度和入口按唯一源同步，最终实际SHA/文档提交推送/上游0/0/空status在E盘10_继续完善收尾核验.json读回，避免报告自引用最终hash。

### 64.8 本轮实际源文件位置
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/.github/workflows/study-quality.yml`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/.gitignore`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/backend_deploy/academyRoutes.js`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/backend_deploy/governedGroupRoutes.js`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/backend_deploy/liveChartRoutes.js`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/backend_deploy/socialApiRoutes.js`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/backend_deploy/socialModerationPolicy.js`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/backend_deploy/studyCommentStore.js`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/backend_deploy/studyCommentsRoutes.js`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/backend_deploy/studyGroupCards.js`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/backend_deploy/studyTextImport.js`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/backend_deploy/tongchenRoutes.js`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/docs/requirements/release-readiness.json`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/scripts/academy-admin-http.test.cjs`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/scripts/asc_diag_item.js`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/scripts/asc_probe_item2.js`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/scripts/asc_submit_review2.js`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/scripts/deploy_verified_learning_backend.py`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/scripts/formal-review-gate.test.cjs`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/scripts/governed-groups-http.test.cjs`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/scripts/lib/formalReviewGate.cjs`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/scripts/life-export.test.cjs`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/scripts/live-chart-http.test.cjs`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/scripts/medical-learning.test.ts`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/scripts/social-moderation-policy.test.cjs`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/scripts/study-text-import.test.cjs`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/app/discover/live/page.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/app/groups/cards/page.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/app/groups/chat/[id]/ClientPage.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/app/layout.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/app/privacy/page.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/app/profile/life/page.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/app/zhongyi/ai/layout.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/app/zhongyi/ai/page.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/app/zhongyi/bianzheng/layout.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/app/zhongyi/classic/layout.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/app/zhongyi/constitution/layout.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/app/zhongyi/diagnosis/layout.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/app/zhongyi/exam/layout.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/app/zhongyi/formula/layout.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/app/zhongyi/herb/layout.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/app/zhongyi/meridian/layout.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/app/zhongyi/shanghan/layout.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/app/zhongyi/wenzhen/layout.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/app/zhongyi/wenzhen/page.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/app/zhongyi/yangsheng/layout.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/app/zhongyi/zhenggu/layout.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/components/LifeExportPreview.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/components/LifeImageCrop.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/components/SocialModerationConsent.tsx`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/data/wenzhen_data.ts`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/data/zhenggu_knowledge.ts`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/lib/lifeExport.ts`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/lib/lifeExportPrivacy.ts`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/lib/lifeRecords.ts`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/lib/liveCharts.ts`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/lib/medicalLearning.ts`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/lib/socialApi.ts`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/lib/socialModerationConsent.ts`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/lib/studyGroupCards.ts`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/lib/tongchenApi.ts`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/locales/en.json`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/locales/ja.json`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/locales/zh-CN.json`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/locales/zh-TW.json`

本次收尾同时更新的权威制度、入口约束、验收契约与总账：
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/AGENTS.md`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/PROJECT_MASTER_LEDGER.md`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/docs/requirements/life-records-09.acceptance.json`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/docs/requirements/research-10.acceptance.json`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/docs/requirements/release-readiness.json`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/交接报告/FINAL_PROJECT_HANDOVER.md`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/交接报告/交接报告更新与工作区清理制度.md`
- `C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/FINAL_PROJECT_HANDOVER.md`

### 64.9 截图复查追加：导出/裁剪/发送确认脱离底栏层级（Web已验收）
- 64.7后逐像素查看真实截图，发现f003626的导出弹窗仍被底部导航栏盖住，保存按钮可能无法点到；“按钮enabled”不等于实际命中可点击。因此f003626只能作为上一增量，不能把该弹窗UI记成完整验收通过。旧截图保留失败证据，不抹去问题。
- 603b731/cb19bb4/0a0acf5增加统一ModalSurface，三个新增弹窗通过React Portal挂到body，z=30000且避开安全区、约束滚动；不受页面缩放/顶部条/底栏层级覆盖。初始焦点留在对话框说明，不主动打开手机键盘或跳过预览；Tab/Shift+Tab约束在当前可用控件，Escape可取消未处理中操作，导航变化取消待确认发送，处理中不误取消。关闭恢复原触发控件焦点；不改变公开文字授权和原件保存规则。
- 新文件绝对路径：`C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/components/ui/ModalSurface.tsx`；并修改同目录上级LifeExportPreview.tsx、LifeImageCrop.tsx、SocialModerationConsent.tsx。源码0a0acf5b9c2fd38bedc089edd2738217218c7b29完整质量39251968475成功。真实390×844页面确认保存按钮y=766至804，中心命中按钮本身且enabled/focused；Tab正向回环、Shift+Tab反向回环、Escape关闭并恢复JSON触发按钮焦点均通过。裁剪弹窗同为body直接子层、z=30000、初始焦点在说明且scrollTop=0。证据10_弹窗层级与键盘真实验收.json、10_弹窗底栏遮挡修复后实际页面.png。

- 0a0官网产物12186202147，ZIP SHA-256 59583a89ee7b6de39617c9cf3b910eda99f4a686565cfad408016422da9b3312；2320文件/70200302字节，清单SHA 7168c4b9b5972ad534e10d9ca1f8f3c11d8ee056ed46dcccc51d876fab53ea3b，12:40:45Z逐文件核验并原子上线/root/yandaoguoxue/releases/v25.0.115-calendar-community-0a0acf5。上一f003保留作增量回退（有已记录的旧弹窗遮挡限制，不称完全验收版）；更老152346d为原增量回退，物理目录清理尚未执行。
- 实际正式站为https://yandaoguoxue.yandao.vip/，真实浏览器已读回新文献研习标题与抽屉，截图10_弹窗修复官网实际页面.png。www.yandao.vip是公司主站，不应把公司站下/zhongyi路径404误认为国学发布失败；此次未更改公司站或其他产品。部署回执10_弹窗修复官网实际部署.json已补浏览器验收事实。隔离预览专属PID12340已停；不关闭用户浏览器或共享ADB。

### 64.10 分享者退群再加入不能复活旧群盘卡
- 检查发现旧卡只绑定接收人入群nonce，分享者退群后再加入可能让旧授权恢复。因此studyGroupCards.js增owner_membership并将分享者本次入群身份写入固定指纹；读取、留档、导出均核对当前nonce。旧无stamp数据保持不可读，不猜测回填。退群再加入的旧请求重试409，必须重新预览明确分享；新分享才可访问。群内个人禁言/全员禁言同时约束盘卡通知，与文字使用同一canSpeak规则；原读取与本人撤销不受禁言阻断。
- 产品源de53826d5b4552ebb6f9c6f546ffc4d0cca572ec；9ac346281c340c53bd2a4bed4aefcfa35fee2f7d仅修测试fixture为真实有效12宫数据，未删授权断言。完整质量39253780391成功，包含分享者/接收者各自退群重入、旧无stamp、幂等、群禁言与原权限回归。de53826阶段运行39253648952失败为fixture无效，已纠正后重跑，不记失败为通过。
- 12:45:42Z按eba部署后11模块原hash严格比对，实际仅替换governedGroupRoutes.js与studyGroupCards.js，PM2健康/逐模块SHA读回通过；没有替换环境、主服务或用户订单库。10_群盘退群授权修复部署基线.json、10_群盘退群授权修复部署预检.json、10_群盘退群授权修复实际部署.json为证；原无渠道头关闭策略不因这次代码部署而打开。真实成年人两设备仍需另验。

### 64.11 旧动态、动态评论和普通私聊的统一文字审核（最终验证见64.12）
- a597830/ccbbf8b新增旧入口逐次正文授权，复用同一个Hy3预算/严格结构化判定/最小审计；模型不读私人库或原盘。短动态包含正文与标签，普通私聊只送本次正文。没有本版授权、不确定、失败或超过自动审核500字范围的长稿均保持隔离；不将长稿截断拆段后假称整体通过。旧动态5000/私聊3000上限内保留完整待审，超上限明确拒绝；图片保留待单独核验，不用文字模型代审图片。
- 动态评论采用500个可见字符、待审不进评论列表/计数/通知，不能回复待审父项，删除待审不误减已有计数。举报后动态/评论/资源评论先隔离。普通私聊先写pending，审核后再次查双方有效账号、好友、屏蔽、禁言和渠道；失败或关系改变不通知接收人。发送ID绑定发送者/正文/类型，篡改重试409；待审与通过消息一并按原会话近100条限制保存，避免待审堆积。
- 前端明确“未送达·待核验/请修改”，同ID状态变化可同步；快照一次写缓存。普通聊天、好友/申请/黑名单缓存另按已登录账号分区，未归属旧缓存原件保留且不自动迁给新账号，清聊天只作用当前账号；异步回执在换号卸载后不写入新账号。动态评论网络失败或取消授权不再本地伪造成功，保留输入待本人重试。没有自动恢复范围外旧群聊或全局打开社交。
- 463c540875a5c0ef297d946609cc5bbcff77c088的39255903027实际发现64.12所述跨用途问题，未部署此失败源。a597830阶段39255545726失败来自测试重复添加认证层已迁移的member_level，463仅修重复fixture，仍保留实际HTTP权限与隔离断言；被替代的ccbb和重复自动测试已取消，未把取消写成通过。
- 追加实际文件：backend_deploy/socialVisibilityQueries.js；scripts/study-comments-http.test.cjs、social-visibility.test.cjs、group-cache.test.ts、deploy_verified_learning_backend.py；src/app/discover/[id]/ClientPage.tsx、src/app/friends/chat/[id]/ClientPage.tsx、src/lib/socialApi.ts、src/lib/socialStore.ts、src/app/privacy/page.tsx（以上均相对64.8所列同一绝对仓根）。部署器新增socialVisibilityQueries.js后要求12模块完整精确基线；远端该旧文件SHA e0868d64fea03a0c333978e724f568a79480bf3fcb85fdea895d73db2b2a170c已核对9ac源一致，未盲覆盖。
- 本轮新增测试使用隔离SQLite、真实JWT/HTTP/现有依赖，只有第三方传输为合成应答，不向真实用户发送或消耗真实模型额度；不当作两个成年人实际设备验收。历史已公开内容没有本轮逐条重审、图片/长稿/申诉待核验不能冒称自动治理闭环。旧diagnosis/constitution/shanghan等医学流程及64.6全部其他剩余继续承接；整体完成与正式提审允许均false。

### 64.12 真实HTTP回归发现同辰与普通私聊混用，追加用途隔离（完整CI与后端上线通过）
- 463阶段39255903027已通过新增旧文字审核用例，但随后原同辰“待审前对方0条”断言实际返回2条，证明普通私聊与同辰原来复用同一private会话，不能把这当fixture差异直接清测试记录掩盖。1a051ad211d1dd0bb6c4b81e64bb3eba0e84d950改同辰消息为独立用途会话，绑定双方当前自愿加入的public_id；仍复用同一个chat_messages/好友库，不复制账户或私人库。退出再加入的新身份不能自动读取旧会话，旧混用行保留待明确核验，不猜测归属迁移。
- 同辰审核队列和批准接口只接收本用途会话，不能通过该入口批准普通私聊、群聊或活盘的待审文本；批准前核对当前双方加入、有效账号、关系和屏蔽。机器审核返回后也核对双方同一入群身份/当前禁言，异步期间改变不得恢复旧授权。
- 消息中心在取预览/计未读前检查真实好友、双向屏蔽、用途、当前同辰身份/开关，或群当前成员/已加入历史下限。退出、未加入、旧同辰身份、已屏蔽的内容不能靠消息预览漏出；同辰会话链接到同辰页已有获准学友，不跳到普通私聊。新状态文案已加四语，并放在消息气泡内避免占用旁边一整列。
- 新增修改绝对路径：`C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/app/friends/page.tsx`、`C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/app/discover/tongchen/page.tsx`。其余文件沿64.8/64.11同一源位置。完整质量39256673357的57个工作流步骤及静态构建成功，保留原“同辰审核前0条”断言并通过；完整质量与阶段失败回执10_旧社交与同辰隔离完整检查.json。自动重复39256673752已取消节省重复构建，不记成通过。13:04:28Z后端按12模块旧SHA精确基线部署同一1a051源，实际修改socialApiRoutes.js、socialVisibilityQueries.js、tongchenRoutes.js，其余模块核对未变；服务健康与12模块SHA读回通过，见10_旧社交审核修复实际部署.json。游客私有接口仍401/no-store，后台会话403，无渠道头五社交开关均false，见10_旧社交修复后游客权限与开关.json，不冒称全渠道/真用户验收。Web新产物12188295297仍在逐文件部署，最后切换事实以64.13为准；原生仍2116/26旧源。

### 64.13 最终上线/未完成/清理读回（本轮增量核验，不是全任务完成）
- 最终产品源1a051ad211d1dd0bb6c4b81e64bb3eba0e84d950，完整质量39256673357成功；官方产物12188295297，ZIP SHA-256 e9a61289c17fc369320172ebcd2e5023095600449294ce12ab96d78697898fc9。Web2320文件/70211185字节、逐文件清单SHA 39b46138e02a9ec9910cf856ff58e7775d9c2d9e979b3aed286453a213b3612d，13:08:24Z原子切换到/root/yandaoguoxue/releases/v25.0.115-calendar-community-1a051ad；上一已验增量回退0a0acf5。更老目录尚未物理删除，不能说服务器只剩两代。
- 浏览器真实正式站隐私新文案已显示普通私聊/动态/评论的逐次授权，截图10_同辰用途隔离官网隐私实际页面.png；同辰页确有登录后自愿加入、活盘入口、同辰人生折叠区域，游客未参与匹配，截图10_同辰用途隔离官网入口实际页面.png。10_同辰用途隔离官网实际部署.json补完整浏览器验收事实，未注册假用户/给真实用户发消息/代为加入匹配。本次底栏遮挡修复实际图仍见64.9，不用仅enabled冒称按钮可点。
- 本轮后续12模块后端与官网均已更新到该源，只有本轮各自改变的模块被替换。回退必须先核current与逐模块SHA，网页可原子回到0a0增量，后端对应.previous只恢复代码；已增列保持兼容，不覆盖当前生产用户/订单/讨论库，不把迁移前备份当当前数据库整体替换。回退会失去该轮已记录的旧入口治理/用途隔离修复，须先停对应写入口并重新验证，不能盲回退。
- 本次后续未新打包、上传或正式提审Android/iOS。此前最后实机验收Android2116、Apple内部TestFlight26都是152346d源，本轮新UI/规则未因此自动成为原生新包；原生新增功能仍需重新打包与物理验收。苹果草稿最后读回仍选22/PREPARE_FOR_SUBMISSION属前轮记录，本轮没有改选构建、组装审核、撤回审核或提交；未重复提交荣耀。Apple购买成功弹框仍不等于到账，指定沙盒账号识别/恢复/权益核验未完成，未普遍放开沙盒资格。
- 剩余必须继续：历史四语全界面/错误/说明；群盘消息锚点与群卡批量撤销；服务者资质/授权/收费服务验收及09其余备份恢复分享全链；10主动选择公开材料的AI整理与分歧分类；其余旧医学诊断/体质/伤寒流程整改；完整天文软件能力的代码和数据；旧已公开内容、图片/长稿/举报申诉的治理闭环。不能因短文字接了严格审核就说所有UGC和全部医学功能完成。
- 外部验收继续承接64.6：两自愿成年人两台物理设备，Android/iOS真组件/锁屏/通知送达与修改取消/重启强停/权限/功耗，Apple指定沙盒账号到账恢复，全部医学来源、逐穴准确性/董氏图谱/28旧动画权利及专业校核、现代药典/医考/全部书籍权利，完整天文软件能力。没有医学专业签审、授权或全部功能真实操作证据的不改成PASS；07/09/10整体与正式允许继续false。
- 唯一CMD未改，SHA仍6bc78b38a9a33fd75b0d251926a480fc9b93ff72bc756c75a8710e83cb98796a，三个文件均重新读SHA吻合/共56964392字节，旧2109目录仅可在文件删后空目录RD。10_继续完善清理目标重新核验.json为证；代理未执行文件删除，四目标仍待负责人本人运行，物理两代轮换未达标。不得重复执行报告50等过时清理目标。
- 本轮未在C生成依赖树、构建输出、APK/IPA/ZIP或解包；node_modules/.next/out/www/android/app/build均不存在。本次隔离预览3113的专属进程已停，Windows Get-NetTCPConnection确认监听数0；一次socket探针超时不作为关端口证据。C可用16551292928字节为观察值，不归因于本轮释放。共享ADB、用户浏览器、其他产品、主树其他开发改动及密钥均未清除。有效源码、失败原因/回归截图、正式回滚与审计证据继续保留。
- 本轮活动仓有效修改已审查并逐批提交推送；最终文档提交、空status、上游0/0、权威报告四副本SHA及制度/入口SHA由E盘10_继续完善收尾核验.json最终读回记录，避免报告自引用。旧共享主树22个修改为此前只读盘点，不是本轮可以盲提交/清除的源码；历史债务与本轮活动仓状态分开，不说整个所有工作树全干净。

## 65. 2026-10-19 群盘原话、旧医学流程与服务交易防护继续整改（整体未完成，禁止正式提审）

### 65.1 负责人最新要求与原指令核对
- 本轮直接指令为“全部完成以后一次清理，所有任务不能遗漏”。承接07/09/10和前64节全部未完项；只处理言道国学，不改学外语等产品，不把阶段修复写成全部交付。不在功能未完时让负责人反复运行清理命令，也不新建竞争的报告/清单入口。
- 三份E盘原始指令重新核SHA：07为46715deba7c8428c81b6396e889071b71b886b4caa4c829c99d71727d09cb404；09为ae8b9bfe97fece6999622ac6d57c6cb0bd973a995b5def6e620fba5760cd8e3d；10为96d14a8064a1895cf01373f8bf5b648f4f1054aeee79bf729a51d64dd79e3826，均与此前登记一致。证据07_09_10_本轮原指令核对.json；不将“收到”写成“全部完成”。

### 65.2 群盘固定位置引用、批量撤销和原话核验
- c0173965d94ff408cb5997dd7250e7032cba542d新增可见宫位/四柱/星曜/卦爻锚点白名单；隐藏四柱等不能创建引用。群消息仍进原chat_messages，固定cardId/version/anchor；接收者每次取消息时查当前卡授权、成员nonce、有效期、双向屏蔽，未授权者只见通用不可用提示，不返回卡号、版本或标题。审核等待期间撤销不产生通过消息。
- 群卡“我分享的盘卡”最多50项整批撤销，先核对全部归属再事务更新；混入他人的卡整批403、不部分修改；重复撤销不重复审计。退群/群关闭仍可撤销本人旧卡，新加入/退群再加入不继承旧卡。
- 4ae06c2ba980f3247f616105adf72285330af83e补原话留档服务端核验及换号/卸载后的异步失效。群盘留档由POST archive-messages根据当前获准卡、原会话、active消息ID重新取作者/原文/时间/固定引用，不信本机改写的“原话”；前端预览与服务器返回不一致时停止。对方未给留档权限、其他会话/缺失/待审/被屏蔽/被撤销的项目拒绝。
- 新共用LiveChartViewport复用ModalSurface的body层全屏、安全区与焦点处理，保留紫微三模式，支持缩放/复位/折叠/高度调整；输入收盘、跟随引用需本人点击。切盘不改旧消息版本。不是重新实现排盘算法。
- 072db69eb84ac2051df5163002c168d78e4f25b4及47b5db453592f1bfd0c2130234f180bf9249c2d2将同样的原话预览/服务端原件核验补到定向活盘；最多50条已发布原话，不能借转发线程读原线程消息。消息审核结束还检查当前禁言和渠道开关；关闭新交流后，已获准的隐私留档仍可用，不能借此重新发消息。已获准另存的副本/截图不能远程收回。
- 以上使用隔离SQLite、真实JWT/Express/HTTP和合成身份验证；不冒充两名真实成年人及两个物理客户端验收。

### 65.3 旧医学流程改为可核对来源的学习，避免个人治疗输出
- f702ee5566923dcb76a19d486475ce8c8111e1b1将diagnosis的症状/疼痛选择接到本机文献对照，不再由加权匹配自动输出个人证型、方剂、取穴。保留症状分类、体系/流派选读、方剂和穴位目录、会员门禁；后者由本人独立选择主题，整理概述不冒充原典或名医本人。相关经典医案与同证研习复用现有9部完整来源/1053文字卡和固定完整章节入口，不补造缺失引文。
- shanghan的关键词包含关系明确是目录检索，不再用进度条当匹配概率，也不把关键词对数说成症状项数；停止按输入推荐方剂，保留自主选择六经目录与方剂名录。多术语分别搜索去重、清空旧结果、异步过期不回填。
- 查实旧constitution注释引用“GB/T 21156-2007”为错误，不能改一个编号就宣称实现新标准。2026-10-19只核对官方公开信息：现行《中医体质分类与判定》为GB/T 46939-2025，自2026-04-01实施，来源https://std.samr.gov.cn/gb/search/gbDetailedCNF?id=473EBB99D729455EE06397BE0A0ABB9A。历史66题/阈值未与现行标准逐项专业验证，现明确标为历史问卷计分学习；不据最高标签断定健康，不自动给本人调养/穴位方案。缺答、非整数、越界、NaN等拒绝，不再以0替缺项推算；反向题和转化分界限新增测试。
- 80af9422645d3298a13145bf1a55d92892890061进一步修复未归属明文历史与跨账号显示：问卷路由只在当前页面进程、当前账号临时交接，30分钟过期；不新写sessionStorage/localStorage结果。辨证会话历史只在本页内存；本人预览术语/备注并明确确认后，交给独立密文人生档案草稿解锁核对保存，不经过旧客户档案云同步。旧未归属原件不删、不自动迁移/展示给当前账号。无账号也能进行本机草稿交接，换号清空旧视图、拒绝旧异步结果。未证明历史无归属数据可以安全归属，不能盲迁。
- be2ac91b72b4b3846534f4c1c5452bc443942e26统一医学工具目录说明，多个layout改引用同一toolNavData，删除重复且过时的“输出证型/调理建议/按现行标准”等描述。改本学习页浅底文字和占位文字对比度，手机端隐藏会挡底部按钮的服务器浮动公司链接；个人中心公司入口保留。补本批按钮四语，不宣称105个历史页面全部四语已完成。

### 65.4 服务者权限漏洞及旧本机模拟交易停止
- e45a8a34bfea9cb0e0e497946303b1aa84360c80修服务修改接口请求正文可覆盖JWT用户/路径服务编号的问题，改明确字段白名单；公开服务详情只取真正ONLINE且服务者APPROVED的公开列表，不再回退返回已下架/冻结原行。新增真实HTTP/JWT验证篡改userId/serviceId/admin/status不能越权，私有占位串不出现在公开详情。
- 继续核查发现前端consultServiceStore是旧本机原型，支付失败可生成本机status=paid订单，页面巡检可改本机钱包余额；与真正providerEngine/支付回调/佣金账本无关，不能当“已有交易功能完成”。209ccb78b1dbdac6d74c26a3aa78a00fadd12cd6暂停这套本机申请/审核/上架/订单/退款/结算模拟，入口如实提示核验中，旧本机原件保留；不伪造身份/教学/医疗资格或真实付款。伪造到期本机订单也不能写钱包或产生已结算通知，专门回归验证写入次数为0。
- 本轮未改真实价格、平台服务费、佣金比例、支付/退款状态机、生产订单或余额。完整服务端准入、三类资质证据、收费服务和退款佣金对账的前端接线/真实验收仍未完成；暂停危险原型不算该功能正式交付，后续必须复用原providerEngine与真实统一支付，不能另建第二钱包。

### 65.5 文件与检查证据
- 本节以下代码路径均属于唯一活动仓C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/：backend_deploy/liveChartPolicy.js、liveChartRoutes.js、governedGroupRoutes.js、studyGroupCards.js、providerRoutes.js；src/components/GroupCardDiscussion.tsx、LiveChartViewport.tsx、LiveChartBoard.tsx、ProfessionalZiweiBoard.tsx、ui/ConfirmDialog.tsx、ResearchLearningDrawers.tsx；src/app/groups/cards/page.tsx、groups/chat/[id]/ClientPage.tsx、discover/live/page.tsx；src/lib/studyGroupCards.ts、socialApi.ts、socialStore.ts、liveCharts.ts、lifeImport.ts、medicalStudySession.ts、consultServiceStore.ts、toolNavData.ts；src/app/zhongyi/diagnosis/page.tsx、shanghan/page.tsx、constitution/page.tsx、constitution/quiz/page.tsx、constitution/result/page.tsx及中医各layout、src/app/profile/life/page.tsx、src/app/globals.css、四个src/locales/*.json；src/app/featured/[category]/ConsultLive.tsx、profile/consult/provider-apply/page.tsx、admin/consult/page.tsx。
- 维护与回归路径：scripts/live-chart-policy.test.cjs、governed-groups-http.test.cjs、live-chart-http.test.cjs、provider-auth-http.test.cjs、medical-learning.test.ts、consult-prototype.test.ts、deploy_verified_learning_backend.py、.github/workflows/study-quality.yml。部署器当前要求13个精确旧源SHA，新增providerRoutes前先与线上旧e6ff1b48a88e673e2a39edff592772f6500896881f97fef9246c4c01979ac628核同，不盲覆盖。
- 完整质量39260819841/39261622001/39262343316/39263489420/39263962592/39264260958/39264608719/39264707045均成功，实际57个工作流步骤，包含TypeScript、原回归、真实HTTP依赖、Apple签名拒绝/认证购买接口与适用静态构建；最后47b5无网页改动以preview=false运行，网页072运行含完整静态构建。初期c017的39259873719因validateStudyText.text的可选类型报错失败，修正后重跑；未删除原断言掩盖。重复自动运行适用者取消，不写成通过。详见E实机整改_20261018/09_群盘中医与交易防护完整检查.json。
- 所有新HTTP测试均为隔离合成账号/数据库，不向真实学友发消息，不产生真实付费。浏览器通过正式站HTTPS实际选择头痛→体系→查原文，显示196段来源且有完整章入口；截图10_辨证学习原文流程_官网.png。曾尝试localhost验收页，被浏览器URL安全策略拒绝；未绕过，改验公开正式HTTPS站。问卷页加载和第1/66题实际看到，但连续作答因页面跳转中断，未冒称66题完整UI已验。

### 65.6 版本、上线、清理与后续硬门槛
- 本轮backend先f702群盘13:39:45Z，再e45a服务者13:45:19Z，最后47b5定向原话14:01:07Z，均使用当时线上精确SHA基线、变更模块逐项读回与服务健康核对。最后13模块结果09_原话留档更新实际部署.json；未替换server.js/.env/生产用户或订单数据库。保留.previous用于代码回退，禁止整库回退覆盖现有用户数据。
- Web先f702（2322文件/70150063字节、清单7321dc8228b04fda3505258d036366fc6fbaf4e2923e89b7a585c35763693c9a）13:44:42Z上线；最终072网页正在按官方产物12192146978逐文件核SHA并原子更新，最终切换与截图以65.7实际读回为准。ZIP SHA89850e5bba070995a4b5abde451597cb8871b7731a30b6eb31b7a08ebfa6eb72。正式站https://yandaoguoxue.yandao.vip/，www.yandao.vip是公司站，不能用公司站子路径404判断产品故障。
- 本轮未打新Android/iOS包、未上传内部TestFlight、未正式提审或重复同步荣耀，也未撤旧审核。华为手机安装实际只读读回25.0.115/2116（不是AppGallery审核通过回执）；原Apple内部26/原草稿连22是前轮最后事实，不作本轮新读取结果或本轮新UI入包证据。新的客户端功能仍须重包与实机验收。
- 负责人要求最后一次清理：唯一CMD本轮未改未执行，SHA6bc78b38a9a33fd75b0d251926a480fc9b93ff72bc756c75a8710e83cb98796a。3文件/56964392字节仍存在且SHA重读一致，旧2109目录仅可在已删目标后空目录RD；E合成可恢复备份继续保留。代理删除0、释放0；两代物理轮换和共享主树历史债务未完成。证据09_全部完成后一次清理目标核验.json。不得照搬历史50节等删除清单或声称全部工作区已清净。
- 本轮无C盘node_modules/.next/out/www/android/app/build、APK/IPA/ZIP/解包目录。RAM预览21284已核命令归属后停止，Get-NetTCPConnection确认3113监听0，未误停ADB或用户浏览器。C剩余16516923392字节只是本轮观察值，不归因于本轮释放。有效源码/审计截图/回归证据保留。
- 仍须完成：历史全界面四语与原生通知组件文案；服务者真正资格/服务/交易前后端接线验收；10号主动选择已审公共资料、成本和第三方确认后的AI概括/分歧整理；09其余备份恢复/多解读者/分享全链与所有工具真实两用户操作；全部天文软件所需代码/星表/精度边界；旧已公开UGC、图片/长稿、举报/申诉例外处置。群盘锚点/批量撤销、本节三种医学旧流程现已代码整改，但不因此抹掉真实UI/原生/专业验收缺项。
- 外部必需条件继续：两位自愿成年人两台真实设备；Android/iOS真组件、锁屏、通知、修改取消、重启强停、权限、功耗；准确Apple测试账号和签名沙盒订单的到账/恢复；361逐穴与董氏定位图谱、旧28动画、现代药典、医考和书籍的授权/专业签审。原文来源与已完成医学专业核验分开，不能凭文字索引或AI生成图冒称准确图谱。未全部完成前release-readiness与09/10整体/正式提交允许保持false。

### 65.7 最终网页读回、实际UI与本轮交接收口（仍不是全部功能交付）
- 最终Web072db69eb84ac2051df5163002c168d78e4f25b4于14:04:43Z逐2322文件/70164319字节核SHA后原子切换，清单SHA c72674d998aa13e006bbec52c3fccf534af27d86860ecf55d9bc938a1b8f04b2；上一有效增量回退f702ee5。后端最终47b5与072网页之间只有隐私留档的渠道关闭边界改动，前端内容相同；源码和运行源分别记录，未称原生包也随网站自动更新。
- 正式站390×844实际看见新页标题、共享目录的新学习说明、可读搜索占位文字，窄屏不再出现压在底部按钮上的公司浮动入口。再次真实完成头痛→体系→查找原文，资料主题默认“请选择，不默认个人证型”；本机留档预览可见术语/备注，默认确认未勾选、保存禁用。明确勾选后，游客可进入人生记录独立档案锁，无需平台登录。本次在该HTTPS来源没有新建/解锁私人档案，不冒称本轮完成密文持久保存全链；合成内存草稿通过完整页面刷新结束，没有删除已有原件或账号。
- 真实服务者旧入口已显示“学习服务核验中”，不再展示可执行的本机模拟申请/结算按钮。以上四张实际截图与browserAcceptance已补入09_原话留档与私人学习网页实际部署.json；原文段数和章节入口的先前图仍属于本轮f702阶段，未改写证据时间。游客保护端点的最终只读结果见09_本轮最终游客权限读回.json。
- 当前仅是这批软件整改已验证上线。65.6列明其余软件与外部验收仍继续，未触发任何正式审核。最终本批文档、制度与四镜像哈希/提交/工作树和上游核验由E盘09_本轮65节收尾核验.json记录，避免报告自引用；不因本批仓库干净就声称历史主树、物理两代轮换或所有工作全部完成。

## 66. 2026-10-19—20 导航语言、真实营销与Google2118送审检查点（历史阶段，已被67节后续状态覆盖）

### 66.1 负责人范围及源码
- 仅处理言道国学。按负责人澄清，四语只覆盖导航、按钮及操作界面，正文不做日英机器翻译；实际真机项目可在上传内部测试后验，不冒称已全部完成。产品最终ade8e42726bd37198620e778be2330a08c947c72，维护营销4f3b58f17a188a8d9a9966ffdb35328363381e46均已推送。主要变更为96条界面文案/前缀、49个服务端导航边界、48个工具导航，以及生成AI缓存专用清理，避免误清登录、私人笔记、档案、日历和设置。79个源文件绝对路径索引：E:/八字命理类文档包括排盘方式电子版/言道国学项目归档/发布包/实机整改_20261018/11_本轮源文件变更索引.json。
- 完整质量39274016630、Android国内39274031208/Google39274038091、iOS28签名39274023535及原IPA上传39274629480成功。Web ade于2026-10-19T15:06:51Z上线，2322文件70717534字节逐SHA；后端仍47b5的13模块。该网页、2118和iOS28已在67节被新候选替代，不得再当最新版。

### 66.2 实际包、内部测试与营销
- Android25.0.115/2118国内APK63157961字节，SHA24cf79efb6b584bda1436030f5aaa1fedb40ec219b783160137a127f3a4e9527；GoogleAAB47440058字节，SHAc7a0a2c56227a59bf5803fc0e09f54efe52e4b498c822cdb5e3764c94319c9ce。实际包仅在E发布包对应2118渠道目录；没有C盘依赖、安装包或解包副本。国内官网/testing/2118真实全包读回曾通过，当前新网页不再沿用该旧测试下载。
- Apple28 ae85bd09-8d51-4b6e-a2a1-0f02bb6b645f VALID/现有言道国学内部组可测，IPA SHAa862c5a28676628560405210b536f6e6e28da70111cf39c6d073d868599e2ce1；当时正式草稿仍连22，并未正式提交。真实iPhone/iPad应用模拟器39280534043成功，不等于物理组件/通知/沙盒到账已验。
- docs/marketing/20261020/store-copy.json三语言介绍突出原典/连续听学/500字文字学习交流/成年自愿同辰/学习工具/文献医案/天文五运六气/日历/本机密文记录；未宣传旧群聊开关、全量专业校核、命运预测或婚恋保证。Google短描述31/31/72字，完整介绍1056/930/3168字。六张1080×1920和一张1024×500营销图由真实未改动网页界面与代码布局组成，非AI造图、非安卓物理手机截图。有效图片与逐SHA在E实机整改_20261018/商店营销_20261020。Apple简中1023字已实际更新，不混入Google无内购说明。
- 官网/marketing/20261020/account-deletion.html提供账号/部分数据删除说明，67节补公开支持邮箱并确保随原子部署保留。

### 66.3 Google真实送审及随后拒审
- 个人账号8539674148718133275，App4973402841775693769/com.yandao.guoxue。旧未送审2099撤回，既有线上2081(25.0.94)保留。2118从已上传的版本库加入正式release4，一次提交11项更改，包含新版、三语介绍、实际截图、健康声明与数据安全。受理证据11_Google2118已送审实际状态.txt/11_Google2118十一项已送审_实际页面.png。受理不等于通过；托管发布仍开。
- 实际功能开关已读：旧社交五项false；新同辰enabled、500字学习评论enabled/Hy3异常隔离与每日50预算。Google按实际增加医学参考教育/患者学习交流类健康声明，数据安全改为13类，保留18+。两项非阻断警告是6旧设备不兼容及缺调试符号，不称警告已消除。
- 2026-10-20最新平台/负责人通知确认2118更改被拒，原因是健康功能必须由组织开发者账号提交，当前线上旧版仍可用。具体组织迁移按67节，禁止以删真实健康申报规避要求，禁止重复把2118送个人账号。

### 66.4 其他商店的最后真实状态
- OPPO37853023线上25.0.114/2101，进入2118升级草稿并填写学习介绍/更新说明；最后未点击保存和正式提交，截图替换未完成，不能冒称草稿已保存或2118已提审。页面可能留下新包与旧图混合的未保存状态，恢复操作时必须先读回，不盲点正式提交。
- 荣耀同公司应用列表仅“言道学外语”901055770，无国学独立记录；未创建重复应用或重做联盟同步。华为119286157旧25.0.109仍“待修改”，真实5问题涉及测试账号、AI解读内容、AI安全评估、生成内容标识和付费/提现客服。67节负责人要求其他渠道等资质后再办，因此本轮不正式提交这些渠道。

## 67. 2026-10-20 组织账号迁移核查、版权与定位隐私整改、苹果专项提审（苹果已受理，整体07/09/10仍未完成）

### 67.1 最新直接授权与Google迁移现状
- 负责人明确要求已具备条件的商店先完成，其他等资质，特别要求完成苹果正式提交；制度第十三节与docs/requirements/apple-owner-release.json记录窄范围授权。不得把该授权改写成全部功能验收通过。负责人确认自己是东莞言道科技有限公司法人、唯一股东，新注册邮箱xblyl33@gmail.com，公司邮箱wuzhimin@yandao.vip。
- 已在官方已登录会话核实：目标8056957676688740507，开发者名称“西伯利亚狼”，真实类型组织机构，公司名东莞言道科技有限公司，官网及公司邮箱均已验证。原个人账号仍为8539674148718133275。
- 官方转移页目前已有其他开发者办理的“言道学外语/com.yandao.xuewaiyu”请求，目标已接受，仍待Google处理；表格不含国学，且没有新建转移入口。代理未改动/取消该请求，也未改学外语。国学尚未填入或提交迁移，账号验证码/注册费交易ID尚未由本轮读取或填入；当前真正障碍是在途请求占用，不能误写为“邮箱已提供即迁移完成”。真实页面12_Google迁移现状.txt、12_Google迁移当前被另一请求占用.jpg。
- 业务关系准备如实写：原账号为本人个人账号，目标公司由本人任法人并持有全部股权，为本人业务重组将国学转入本人公司；不是无关第三方收购。具体选项及验证字段必须在表单开放后按实际界面填写。健康声明保持真实。其他产品/旧个人账号不得整体关闭。

### 67.2 先排除已知版权缺口，生成29/2119中间候选
- 源码79885a4573798bc8a9fb034715cb0c88f96ff082已推送。src/app/zhongyi/meridian/page.tsx停止请求28张无转载授权旧动画，保留穴位文字、原典、交流、缩放与图文/骨骼对照；肺经用已标许可的开放图，其他经络为自有明确标注的循行示意，骨骼用LadyofHats公有领域原图。不捏造穴位坐标，不声称全部图谱已校核。
- scripts/filter-unlicensed-meridians.cjs在生成out产物中逐文件排除固定28动画，源资料不动；package.json统一postbuild，覆盖网站/Android/iOS。新增脚本测试实测28图排除、开放图保留、原件未改。私钥扫描通过。
- 质量39399415253成功（取消同源重复自动39399411444）；Android2119国内39399424600、Google39399856460、iOS29签名39399411320及准确IPA上传39400502632均过。包内实际检查0张旧动画、28条排除清单，非只凭代码推断。29 VALID UUID7c13604e-1a19-4953-a0a8-5e2a0caa8ce2且现有组可测；曾实际把正式草稿22换29并更正第三方内容声明/审核说明/8商品备注，仍未提交。该中间候选被67.3最终隐私修正30/2120替代。
- 真实iPhone16ProMax/1320×2868、iPadPro13M4/2064×2752应用模拟器39399419521成功；E实机整改_20261018/Apple29_actual_screenshots保存10张原始界面及原生私库/AppGroup证据。不是物理真机，不把StoreKit不可用价格画成成功购买。五个宣传页面在30源码未改，沿用29真实画面时必须明确截图源798/构建29，不冒称30物理截图。

### 67.3 定位隐私实缺口与最终候选53e4f36
- 浏览器验收发现罗盘saveRecord会走会员普通同步与首次/api/sync迁移，原“GPS完全临时、不存储不上云”的说明不成立。修复源53e4f3608202ce770c3565fb805fb9e83038f340已推送：cloudRecordPrivacy.ts剔除compass载荷各层位置名称/经纬度等字段，recordSync.ts统一覆盖直接与离线补传，clientStore.ts首次迁移也过同一边界。云端刷新按原ID或measuredAt合并本机私有记录，防止移除上云位置后把本机原记录抹掉。其他工具数据不变。
- 隐私说明明确本机主动保存与临时定位的差别，不声称已经清除了历史旧云端资料；罗盘保存提示写明位置仅留本机。太冲LR3“趾骨”误字按北京市卫健委公开资料改为“跖骨”，同时修基础库、完整JSON与题库4处；只纠此已确认术语，不冒称全361穴医学签审。经络旧“动态图”标题改为图文学习。
- 最终质量39402134764成功（取消重复自动39402130297），新增3项GPS剔除/本机保留/两同步入口回归过。Android2120国内39402139150/Google39402143686及iOS30签名39402130346成功。最终包实际路径及SHA在E发布包/Android_25.0.115_2120_tencent/verified-packages.json、Apple_25.0.115_30/verified-package.json；本轮没有C构建依赖/包/解包目录。
- Web53e4f36于2026-10-20T09:50:48Z逐SHA原子上线，2295构建文件61141700字节，清单SHA979ac2697c48061d9a76126fb6325e7fc384fb22103f67adde5c38dac9b3786c；额外逐SHA保留14个已发布营销/注销公开资料（非旧测试APK），避免Google删除入口更新后404。回退79885a4；后端仍47b5，无生产用户、订单、钱包或密钥修改。部署证据12_最终定位隐私网页实际部署.json。

### 67.4 苹果审核与隐私实际整理
- 只操作6807592575/com.yandaoguoxue.app/25.0.115。审核登录字段原样保留；在RAM用苹果审核用户名精确匹配服务端得到唯一有效账号，且已在窄范围沙盒白名单，无需扩大沙盒到所有用户；未输出密码、账号原文、令牌或订单。本人其他未知测试账号的到账/恢复仍未得到确证，不能凭Apple成功弹窗发正式权益。
- 旧拒审2026-10-09对旧build5要求IAP及会员商业关系说明。按实际源码说明：免费账号/基础学习，付费为数字学习权益与AI点数，月季年是时长，iOS产品档不提供招募/分佣/提现，Apple账本不调用旧分佣引擎；并非否认其他平台存在旧推广业务。价格、权益和佣金计算没有改动。旧22备注已被29真实整改说明替换，最终30的实际更新/正式受理以后记为准。
- App隐私原仅5类且旧精确定位未关联；现按新30行为完成15类：姓名/邮箱/电话、健康、App内社交联系人关系（不读取手机通讯录）、消息、头像照片、用户反馈/其他内容、账号ID/设备安全ID、购买记录、产品交互、其他诊断及生日等其他资料。均按可关联账号申报，交互/诊断另有分析用途；不做跨App广告追踪，不申报银行卡/HealthKit/通讯录读取。新30不上传罗盘GPS，旧历史数据管理例外已说明。每类完成配置并发布，无待设置漏项；12_苹果15类隐私披露完成.txt及12_苹果隐私披露实际页面.jpg。
- 隐私选择URL已实际保存到公开账号删除说明。页面新增无法登录时support@yandao.vip入口，未发送邮件。新声明不等于用户健康资料自动外发，仍须逐次预览授权/审核。既有健康/UGC/消息/社交年龄声明已读为真，未隐瞒真实功能。

### 67.5 本轮维护工具及收尾边界
- 新增/完善维护脚本asc-guoxue-review-audit.cjs（只读脱敏）、lib/guoxueAscClient.cjs（默认只读，正式写操作走门禁）、asc-guoxue-prepare.cjs（固定候选草稿/备注/内容权利，不改价）、asc-guoxue-screenshots.cjs（真实原图、先COMPLETE再换旧引用）、asc-guoxue-submit.cjs（将旧拒审App引用移入既有空草稿并带8商品，不另建审核）。旧脚本默认仍被全部验收门禁拦截，只有固定owner专项App/版本/构建/源码及CI核对上下文可办理；3项门禁测试过，不改overallComplete=false。
- deploy_verified_web_preview.py增加公开营销和删除URL的限类型、限体积、无联接逐SHA保留，不带旧APK测试下载；publish_store_gallery.py区分实际截图源与目标部署源。源码路径详见本节E绝对文件索引，正式提交、最终CMD与四镜像哈希以后记读回为准。
- 仍未完成：07/09/10全部逐项、两成年真实用户多设备、原生物理组件/通知/功耗、本人沙盒实际到账恢复、全部医学/董氏/药典/医考专业校核与完整资料授权、完整天文软件能力、历史主树97债务、全物理两代清理。负责人专项提审不是这些事项的PASS。资质渠道本轮停，不碰其他产品，不假称全部完成。

### 67.6 苹果最终正式受理、原图及去重证据
- 最终25.0.115（30），VALID构建2100a433-90fc-413f-8e87-e9768a182d9a，源53e4f3608202ce770c3565fb805fb9e83038f340；签名IPA准确上传39403517381成功。E发布包/Apple_25.0.115_30/YandaoGuoxue_25.0.115_30.ipa为20994536字节，SHA-256为137fb16f02318890a1dd024c1df6954010aabd53c7e9f017aa1989eebb3e4b33。既有内部组可测试30，未增加测试人员或发送邀请。
- 正式任务复用既有b574a73e-d8d3-42fb-95d3-0776ccdad897，于2026-10-20T10:10:13.106Z（东京19:10）受理，状态WAITING_FOR_REVIEW。包含准确App版本及8个既有IAP版本，共9项；独立只读API及官方页面再次读回一致。保留“审核通过后自动发布”，当前不是批准或正式上架，不再撤回/重交本任务。
- 旧拒审a8bea0c3-7244-4c2a-b655-3192af447954只移除App版本引用，原审核历史保留，现COMPLETE/网页“已移除”。原拒审任务不能接首次8内购，首次添加返回409；只移出App引用后Apple过渡期又返回409，待独立读回后复用原空草稿组装成功。一次命令会话未留下明确提交结果时，先独立核对仍READY且无在运行进程，再处理同一任务；最终仅一个有效等待审核任务，未新建第二任务。
- iPhone/iPad各5张真实原图，10张均COMPLETE；实际捕获源798/build29，五页在30未改，不假称30物理真机图。15类隐私已发布、第三方开放来源如实申报，8商品与App同批送审；价格权益未改，负责人本人沙盒到账/恢复仍待核对。
- 正式回执、最终9项独立读取、页面证据均在E发布包/实机整改_20261018：12_苹果30正式提交实际回执.json、12_苹果提交后独立状态读回.json、12_苹果30九条审核独立核验.json、12_苹果正式九项目等待审核实际页面.jpg。

### 67.7 Google保留在途迁移与后续安排
- 负责人最新明确“保留学外语迁移，完成后再转国学”。再次只读官方页面：仍只有学外语、目标公司已接受、Google待处理；未取消或改该请求，没有国学迁移正式受理，未填验证码/交易凭据。其他产品表单既有业务关系选项不是代理本轮填写，不冒用为国学关系。
- 已创建本线程心跳自动跟进“跟进国学 Google 迁移”，ID为google，每6小时一次，状态ACTIVE；前一请求未完成时安静，实质变化/完成/失败/需协助才通知。待其完成再办理国学，保留真实健康申报、本人法人/唯一股东关系；如后续表单要求当时协议或所有权确认，先做具体准备再按规则办理。迁移结束停止跟进。该安排不是已迁移或已发布。
- Google最新2120签名AAB已备妥但尚未上传/提交，避免继续在个人账号重交相同账号类型问题。Google旧线上2081仍保留，2118更改当前为拒审；其他资质渠道按负责人要求暂停，不重复荣耀联盟提交。最新页面证据12_Google保留既有迁移实际页面.jpg。

### 67.8 安卓官网同步、唯一清理命令与交接收尾
- Android最终2120与网站同源53。公开测试入口https://yandaoguoxue.yandao.vip/testing/2120/，APK53572864字节，公开完整读回SHA-256为468082d87278e50f20408fd0a7d663ab5b6a5baf71b9a93d1b78fd3fed15e427；12_最终安卓2120官网下载实际验证.json及实际浏览器页面确认。稳定旧下载/自动升级未擅改，不把测试页称为商店发布。
- 唯一人工CMD仍为C:/Users/ZhuanZ/Documents/Codex/2026-10-17/e-c-users-zhuanz-documents-codex/outputs/guoxue-clean-20261018.cmd，CP936/CRLF，SHA-256为6a88cfeadfde5633494181eb6c256fb7d1b3cd5aee04ca3fe8ca04a6dec8c835。11个精确已核SHA目标共381180186字节，增加2110/2117/2119失败或过时候选及旧Apple7；删除前先核2120国内APK/GoogleAAB和Apple30均存在且准确。仅删匹配旧文件及空目录，无通配递归，合成备份重复件另先核E原件。
- 保留当前2120、Apple30及前29、仍在商店/回滚决策使用的包、源资料、密钥和有效小体积证据。前2119测试地址曾真实发布，后被53原子部署替代；不误写为未发布。全物理两代轮换仍未完成，历史共享主树97债务和服务器更老发布目录未冒然清除。按负责人要求整批验收后由本人一次清理，本轮CMD未执行、代理实际删除0字节。
- 本轮维护源码、文档需审查后统一提交推送，保持活动仓空status与上游0/0；产品候选仍53，不因维护提交另打包。所有源码/维护/文档及CMD绝对路径索引、最终测试/提交/镜像四SHA、C空间及残留核对保存E实机整改_20261018/12_本轮修改绝对路径索引.json和12_本轮最终收尾核验.json。唯一源报告同步根目录兼容镜像与E两个固定镜像，制度/入口同步E并逐SHA核对；最终证据在提交后只读生成，避免报告自引用导致新的脏改动。


## 68. 2026-10-21 创世纪连续编号、跨板块入门学习与真实高清天体图像

### 68.1 本轮边界、源码及起点
- 负责人要求新注册ID从创世纪顺序递增，丰富学习内容，并增加可放大观察月球、行星的高清开放素材。只改言道国学；未改言道学外语、数字管家、公司官网或其他产品。开始已读父级/项目AGENTS、唯一制度、交接及主账本；活动仓起点e773b396fe211cd740d1635b4615dc5f120eeb36干净。
- 活动仓绝对根路径为C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance，分支codex/tencent-store-compliance。产品源码d93dd21fea680e17ac80bb5610badb054d3687fe；最终同界面候选f541d5dc6dced98272c552b83cad17433a5218d6增加维护脚本及Android2121版本号。全部源码路径在E:/八字命理类文档包括排盘方式电子版/言道国学项目归档/发布包/实机整改_20261018/13_本轮源码绝对路径索引.json，后文E证据路径均相对此实机整改目录。文档收尾提交不作为另一次产品构建。

### 68.2 账号乱号根因与真实生产修复
- 只读核实正式库/root/backend-auth/data/yandao_users.db：创世纪唯一账号100000，161个现存用户，普通范围最后100075；历史高位账号使users的SQLite自增序列到999999939。历史910xxx/999999xxx中不能假设都是无效测试，不删除、不重排，避免破坏会员、订单、好友等引用。普通范围及相关表引用最高100075已核。
- 新增backend_deploy/userIdPolicy.js及src/lib/backend/userIdPolicy.js一致镜像，修改两条register_routes.js镜像。手机号、邮箱、微信的createUser统一在IMMEDIATE事务取得编号并写用户/资产/设备；失败整笔回滚。新持久account_number_sequence固定创世纪100000和本次已审计迁移基线100075，account_number_reservations永久保留已用号。8个触发器拒绝自动/随机/时间戳插入、改user_id、重置/删除序列及删除旧号预留，注销不回收号，重启不重置。未来碰到保留旧号冲突须审计处理，不能随机跳过。匿名u_内部标识保留本机用途，src/app/profile/page.tsx游客改显示“登录后查看账号编号”，不再当正式账号展示。
- 部署前发现生产register_routes.js有源码未收录的手机号/邮箱日志脱敏，已保留并纳入新写入器，未盲覆盖。scripts/deploy_account_number_policy.py固定生产主机82.156.228.87、Guoxue进程及原SHA，默认只核查，显式apply才部署；首次辅助探测缺少base64导入已在任何生产修改前修正。
- 2026-10-20T15:57:22.854083Z（东京10月21日00:57）完成增量迁移并仅重启yandaoguoxue-backend，健康200。生产161账号未变、重排0、外发联系0。真better-sqlite3隔离完整createUser分配100076/100077、资产2、重复拒绝、下一号100078；生产插入再ROLLBACK探测成功且持久测试用户0。上线后独立只读仍161、8触发器、下一正式新号100076；这是该时刻快照，真实注册后应正常递增，不得把100076永久写死。
- 部署register_routes.js SHA-256 a244b07af4b542ca5c8c5fa3ba1c869f0abb3f2113a10621ef24345ff6ca29aa，策略54fe08cae87725b820dafb338ee4cd8261e02eb36097ac3fecccfcf8e1e36137。证据13_账号编号策略部署前核对.json、13_账号编号策略真实部署.json、13_账号编号上线后独立读回.json。
- 唯一一致迁移备份/root/backend-auth/data/yandao_users.db.pre-creator-sequence（权限600）是有效生产恢复证据，不能当垃圾删。旧register_routes.js.previous仍自动取被污染SQLite序列，禁止直接恢复；新策略已激活时必须保留兼容写入器，不能覆盖整库丢新用户/订单。制度新增第十四节，约束后续所有注册/导入/恢复开发。

### 68.3 增加12课、36题，保留原4课与进度
- 新增src/data/studyExpansion.ts，src/data/studyStarter.ts合并后共16课44题。覆盖历法时间口径、八字干支十神关系、紫微宫位与三模式、六爻梅花动爻、六壬奇门分层、七政四余坐标、天文读图、五运六气、四诊八纲、本草方剂性味归经/配伍、骨关节经络对照、同辰同证与私人记录。每课至少三段原创解释及三道有答案解析的题，连到真实对应板块；五运六气主气使用厥阴风木等完整术语。
- 修改src/app/academy/start/page.tsx和src/components/LearningEntryPanel.tsx，课程选择折叠，避免16课占满手机首屏；原四课ID和旧进度解析保留。连续听学章节包括新增课，未擅自翻译古籍；没有声称完整古籍、药典、董氏穴位或全医考资料已经补齐授权/医学签审。新增为原创入门教学，不能冒充古籍原文或个体处方。

### 68.4 高清月球与行星：实际像素、来源和研究边界
- 新增src/components/PlanetSurfaceExplorer.tsx，集成src/app/academy/astronomy/page.tsx。保留原8920恒星、太阳系/近邻空间、日期地点、五运六气与笔记；新增月球、地球、火星、木星球面图像。拖动旋转、按钮/双指/滚轮缩放、复位、全屏、Escape退出；安全区留边、焦点恢复。默认按需4K，提供2K/8K并按GPU最大纹理自动降级；30秒加载超时有明确错误和平面图后备。关闭或离开时取消加载、释放纹理/几何/渲染器，不用永久动画循环占资源。
- public/assets/astronomy/surfaces/内11张真实JPEG合计24632902字节及manifest.json。月球NASA SVS2019 CGI Moon Kit/LRO LROC-LOLA实际8192×4096；地球/火星Solar System Scope/INOVE NASA衍生实际8K。木星虽然源URL含8k，实际仅4096×2048，已按4K标注，禁止选择8K，不做插值冒充细节。NASA公有领域保留署名，Solar System Scope按CC BY4.0标出处/衍生；艺术增强、缺失区域补绘和月面极区低清填补均在界面说明。
- scripts/import_planet_surface_assets.py只允许四个已核官方源，在RAM读原图并按实际尺寸生成JPEG和2K/4K衍生，记录源/衍生SHA、尺寸、许可与出处；不会自动覆盖已审manifest，不在C留TIFF/下载缓存。曾因统一假设源图全8K停止导入，核实木星4K后修正，不把失败尝试写成8K成功。
- 科学来源https://svs.gsfc.nasa.gov/4720/及https://www.solarsystemscope.com/textures/。球面图是均匀照明静态读图，不等于实时月相、云层或月面测量。LROC https://quickmap.lroc.asu.edu/与开源MIT的WorldWide Telescope https://worldwidetelescope.org/webclient/是用户主动点击的外部研究入口；本轮没有嵌入完整WWT引擎或承诺专业天文馆全宇宙功能。测量应使用具有数据说明的原始观测产品。

### 68.5 真实测试、构建与故障记录
- scripts/user-id-policy.test.cjs五项本地及CI测试通过：高位污染/重启/注销不复用、原始绕过拒绝、失败回滚/重复不消耗、缺基线拒绝、8个独立连接同SQLite并发分配100076—100083且下一100084。测试库仅E临时测试子目录，每次结束删除自身临时文件。scripts/learning-expansion.test.ts验证16课44题、原进度、实际板块路径、逐图片SHA及木星不假8K。
- d93质量39452488988成功（重复自动39452488000取消）；最终f541全质量与Web39453444062成功，原算法/隐私/资料测试未跳过。Android2121国内签名39453450025、iOS31签名39453455351成功。私钥检查通过，未下载任何密钥到源码或日志。旧28张无授权经络动画的产物过滤继续保留；另在2121 APK/AAB和31 IPA实际ZIP逐个检查，三包均0张旧动画、28条排除证据、开放图仍在，13_原生包经络权利过滤核验.json。
- RAM预览d93与f541界面代码相同（后者仅版本号及两维护脚本）。实际操作月球8K显示8192×4096、旋转放大、切木星降4K并禁8K、Escape退全屏；390像素视口scrollWidth390，关闭后该视图canvas0。16课44题可见，选天文课程、标读、答错→解析→重答答对→刷新仍1课1题1正确；游客个人页不显示u_随机编号。课程连续听学章节可选，不冒称本轮已完成苹果物理设备音频播放。
- 浏览器检查发现继承故障：src/lib/clientStore.ts旧initCloudSync把匿名getClientUserId当非空账号，在旧GET /api/sync取得404；与真正会员排盘/api/auth/records/save不是同一接口。该历史批量同步故障本轮没有完成修复，不得用主功能验收盖过。下一位先核实登录/游客/会员及旧迁移行为、真实生产路由再替换，禁止删除本机原始资料或凭空接通未鉴权接口。13_本轮验证与故障记录.json已列OPEN，不宣称无故障。
- Native包核验最初错误假设iOS也有Android app-native.json，验证中止未上传；核实iOS工作流本来不生成该标记后改用固定CI源码、真实Info.plist/WidgetKit签名门禁、内置11张逐SHA图及渠道脚本核验。不是放过失败校验或编造iOS标记。正式保留包均在E，不在C保存ZIP/解包/依赖树。

### 68.6 发布限制与继承未完项
- 后端连续编号已经生产生效；Web本轮新部署、安卓公开测试入口、Apple31内部测试及最终平台状态，以本节随后独立读回为准。构建成功不等于可安装/可测/正式发布。苹果30原正式审核任务b574a73e-d8d3-42fb-95d3-0776ccdad897保持WAITING_FOR_REVIEW，本轮不撤、不替换、不重提，不把31内部测试替换成正式受理。
- Android当前测试候选2121、前可用2120；苹果内部候选31、前30仍有正式审核用途，29及更老候选待统一清理复核。Google组织迁移依旧等待学外语原请求完成，其他资质商店暂停；未改Google拒审申报或重交个人账号包。本轮只建国内2121，不冒称已有同号Google候选。
- 07/09/10整体仍未全验：真实双成年用户多设备、原生物理通知/组件/功耗、本人苹果到账恢复、完整药典/董氏/医案/图谱/古籍授权及医学专业审校、完整专业天文馆、历史主树97债务、物理两代清理仍缺；另登记上述旧sync404；新天体视图部分按钮仍为简体，新增控件的四语界面接线/原生验收也未冒称完成，正文日英翻译不作为要求。不能将本轮16课或高清贴图宣称这些全部完成。


### 68.7 本轮Web真实上线与Apple31内部可测试
- 最终Web于2026-10-20T16:18:42.655625Z（东京10月21日01:18）切换至/root/yandaoguoxue/releases/v25.0.115-calendar-community-f541d5d；上一可回退53e4f36保留。质量产物12279458384，ZIP SHA-256 ca0e2d2ccc287a3ab09cee21955ce22d04e8212d9ea8e1de824f781620eb3dbb，2312构建文件86031101字节逐文件核验，清单SHA fe8a29c5670f9003b3414fbd06f59adf29712c1a30d7f2ab1a87dd4e52ed936e。另保留14个已核营销/删除公开资料，未让账号注销URL失效。证据13_高清天文正式网页部署.json。
- 正式浏览器https://yandaoguoxue.yandao.vip/academy/astronomy/#planet-surfaces实际打开月球并加载8192×4096，截图13_账号与高清天文_20261021/正式网站_月球8K实际页面.jpg；正式课程显示16课44题，截图正式网站_16课44题.jpg。课程/天文/个人页/官网说明/注销页/素材manifest六个公开读回200并核SHA，见13_正式网页公开回读.json；不是仅拿接口200代替上述真实控件操作。退出全屏、关闭图像释放资源，正式天文入口保留，三张临时预览标签已关，原公司官网/后台等用户标签未动。
- 国内Android25.0.115（2121）签名APK78281889字节，SHA-256 5840989037430ea0fe2cb5109ef0b2bc2cf810b9773617f88bed6f9d26e27e54；AAB62292281字节，SHA bdfea4a9e80aa4f9db44449e3371239a48e6a79b948ec46dcdf22faf75f10d46。实际E发布包/Android_25.0.115_2121_tencent/及verified-packages.json。两包Android标记sourceCommit=f541、versionCode2121、storeChannel=tencent，11图逐SHA与源码一致；没有用此国内AAB冒充Google渠道包。官网测试分发最终读回另列，不擅改stable latest.apk/自动升级/各商店审核。
- Apple25.0.115（31）真实IPA45452742字节，SHA-256 43e0aa08afbc12d34ab25bff1700bfd39ed3842e84d371ef1cc213693abe7bdd，E发布包/Apple_25.0.115_31/YandaoGuoxue_25.0.115_31.ipa及verified-package.json。身份com.yandaoguoxue.app、版本/真实WidgetKit扩展签名门禁通过，内置11图逐SHA一致。只上传已核同一IPA，39455257724成功，未重新打包重用构建号。
- 2026-10-20T16:16:32.285Z独立Apple API：31 UUID9acb2e6b-43ee-4432-9231-6f1604f1e6a8、VALID、IN_BETA_TESTING，既有内部组言道国学已关联，assignedNow=false；没有新测试者/外部邀请或正式审核。证据13_苹果31内部测试状态.json。正式30/既有任务仍WAITING_FOR_REVIEW，13_苹果正式审核独立核对.json；31内部可测不等于已批准发布。
- 本轮仍使用国学既有URY888FLWG配套密钥，Issuer ee663add-beb6-40d2-92ad-e09fafec8110，唯一p8为E:/八字命理类文档包括排盘方式电子版/苹果开发者/AuthKey_URY888FLWG.p8。API读取31内部状态和30正式状态、既有CI准确上传均成功；本轮未新建/轮换/撤销密钥，未改任何Secret或其他产品。旧钥是否已撤销本轮未重新核实，不冒称历史泄露已消除；APP Stotr CONNECT API 最新秘钥.txt内旧构建记载不是当前上架状态依据，以上API证据为准。私钥正文/JWT/临时下载签名URL均不入报告、日志或Git。

### 68.8 本轮清理、唯一命令与剩余工作
- 本轮没有C安装包、ZIP解包、TIFF缓存、node_modules、.next、out、www或一次性脚本落盘。24.6MB图像是已入仓正式来源资产，保留；构建/预览/验证ZIP全部RAM，正式APK/AAB/IPA及有效证据仅E。临时预览Ctrl+C未真正结束子进程，随后按PID18928及脚本/产物ID精确核对后停止；3113已无监听。不得把仅终端退出写成进程已停。
- 自动审批审查拦截删除E实机整改_20261018/临时测试空目录，返回仅blocked by policy；未绕过，目录无文件且保留。曾将停止进程与目录删除合并的命令整体被拦，拆为更窄、经进程身份核实的停止操作后允许执行；单独空目录删除仍被拦。当前删除字节0，不能宣称全部清干净。证据13_本轮本地残留核对.json。
- 唯一人工CMD仍为C:/Users/ZhuanZ/Documents/Codex/2026-10-17/e-c-users-zhuanz-documents-codex/outputs/guoxue-clean-20261018.cmd。本轮对原11文件全部重新核SHA，仍共381180186字节，未执行。新增保留2121/31的存在及SHA门槛，原2120国内/Google和正式30保护仍在；只增加上述空目录的rd（无/s，非空不会删除），未扩展到磁盘根、私人资料或其他产品。修正历史CRCRLF为CP936/标准CRLF，最新CMD SHA-256 b2ebc307c21844328586aa0b9290741135dbcd9f2cf136a8786610a461ec2660，13_唯一CMD重新核对.json。按负责人要求整批验收后由本人一次执行；当前/前版及仍在审核包保留，更老包/服务器历史目录/共享97债务未冒称两代物理轮换完成。
- 下一位先读本节与制度十四，核查生产持久序列，禁止再用高位测试ID污染正式库；处理旧/api/sync真实鉴权和数据迁移故障，继续07/09/10实质缺项、医学授权审校及物理设备验收。当前源码维护提交/上游一致、四报告及制度/入口镜像SHA以E实机整改_20261018/13_本轮最终收尾核验.json提交后只读记录为准，避免自引用修改制造新脏树。


### 68.9 安卓测试分发的准确包与传输核验
- 维护scripts/publish_verified_android_test.py，新增--reuse-previous-proof：只复用已核SHA的上一公开测试APK压缩字节及当前同源11张天体JPEG，原封不动传输其余APK字节（包括新签名块和ZIP结构），服务端逐片SHA后再核完整78281889字节APK的原CI哈希。不重新压缩、不重签名、不修改原安装包；未知片段/越界/错误来源即失败，不生成伪包。目标只为既定Guoxue当前release的testing/2121/，稳定下载、自动升级、商店状态均不改。
- 本轮普通服务器直取GitHub产物及8路Range试取均过慢，先独立确认目标APK不存在，再核实并停止本任务专属RAM传输进程1470904/1473271，未重复创建审核/安装包。已从维护源码移除这条不合适的临时签名URL/令牌下载方案，未把GitHub令牌、临时URL或ZIP落盘。最后使用精确字节复用，传送APK差异数据5611275字节（另含校验计划元数据），复用前版48037712字节和当前网页24632902字节；完整APK原SHA不变。
- 服务器已完成原包哈希核验并生成https://yandaoguoxue.yandao.vip/testing/2121/，实际浏览器显示25.0.115（2121）及准确测试APK链接，截图13_账号与高清天文_20261021/安卓2121_实际下载页.jpg；此入口明确是测试候选而不是商店发布。公开完整回读状态以下段最终结果为准。

- 最终公开完整回读已通过：78281889字节，SHA-256 5840989037430ea0fe2cb5109ef0b2bc2cf810b9773617f88bed6f9d26e27e54，与CI/E正式保留包一致；13_安卓2121官网下载实际验证.json记录原子存放2026-10-20T16:38:28.846952Z、复用/传输字节及完整公开SHA。真实公开测试入口已可用，不是仅上传中或草稿。
- 2026-10-20T16:42:05Z最终Apple只读仍30 WAITING_FOR_REVIEW、31 VALID；16:42:07Z生产最终161用户/下一100076、健康200、Webcurrent=f541。源、发布、内部测试、正式审核和未完成项保持分开。docs/requirements整体完成门禁未篡改为true，未修改价格/权益/佣金或其他产品。


## 69. 2026-10-21 Google迁移定期只读跟进
- 核对时间2026-10-20T16:47:19.275286+00:00。已重读父/项目AGENTS、唯一制度、交接和主账本；活动仓开始干净。官方个人账号8539674148718133275的app-transfer页仍显示：言道学外语/com.yandao.xuewaiyu，目标8056957676688740507“西伯利亚狼”已接受，2026年10月20日请求仍“待处理”，完成后Google另通知。列表没有国学；当前没有新增国学转移入口。与67.7相同，无实质变化。
- 按负责人选择保留原请求，未点击取消、关闭通知或提交，未修改学外语、其他产品或国学健康声明；未猜验证码/交易ID，未读取或保存私密凭据。国学尚未迁移/新提审，不以目标已接受代替转移完成。现有google跟进继续，按无变化静默，不重复询问。待原请求完成后再验证公司账号与国学可迁移条件。
- 本次只有只读页面核验与交接/总账更新；本轮临时Google标签已关闭，无新增脚本、包、缓存或解包，无物理删除。既有69以前的代码/网站/Apple状态未在本次变更，历史清理/未验事项保留。结构化最新核验及最终提交/四镜像SHA在E发布包/实机整改_20261018/google-transfer-monitor-latest.json，固定文件持续更新，不另起竞争报告。

- 定期复核2026-10-20T23:25:39.823589+00:00：官方同一转移页仍为com.yandao.xuewaiyu、目标8056957676688740507已接受、Google待处理；国学不在列表，未出现新的办理入口。无实质变化，未改/取消原请求、未动其他产品/健康声明/凭据，继续等待并静默。仅更新本节/主账本和固定最新证据，临时检查标签已关，无本轮临时文件或物理删除。


## 70. 2026-10-21 学习课程扩充、远程资料更新、2122/32与Google跟进
### 70.1 范围、源码及完成边界
- 本轮按负责人“继续完善学习、尽量服务器修改、给最新包、看Google”的要求，只处理言道国学。开始HEAD b477afc干净。客户端/后端候选源码bdc4f1f6cbfef1719610b01be5ef2e499996922a；后续a501d4279d492548a465ebca30036ba4c847c6bd只更新资料revision2、测试固定夹具及维护工具，没有重新构建同一客户端。绝对文件索引见E发布包/实机整改_20261018/14_本轮源码绝对路径索引.json。
- 新增8篇本站原创研习练习，联网课程合计24课68题：八字条件复盘、紫微宫位对照、卦爻逐项核验、七政观测记录、《黄帝内经》《难经》篇章研读、医案证据分栏、方剂组成方义、本草名称基原炮制。保留原有课程、工具、原典入口及连续听学。不是把原创练习冒称古籍全文、完整药典或专业医学审校；未擅改排盘算法、价格、权益、佣金或其他产品。
### 70.2 客户端及管理功能的实际文件
- 新src/lib/studyCatalog.ts、src/hooks/useStudyCatalog.ts：固定HTTPS公开资料接口，2MB/8秒/格式校验，进入页面检查一次及手动检查，不持续轮询、不调用AI；合格资料存本机，网络失败保留缓存，首次离线无缓存回退原16课44题。只读纯文本数据，不执行下载代码。
- src/app/academy/start/page.tsx、layout.tsx、src/components/LearningEntryPanel.tsx接动态课程、当前资料状态、手动更新与动态听学目录。src/data/studyStarter.ts增加正文与题目版本对照，旧进度不丢；修改题干/选项/答案仅使相应题重测，正文改变仅该课已读需重读，暂时未显示课程的历史仍保留在本机。
- backend_deploy/studyContentPolicy.js、studyContentStore.js、academyRoutes.js、data/study-starter-public.json：公开GET /api/academy/starter-content；GET/PUT /api/academy/admin/starter-content沿用既有服务端管理员鉴权。发布需编辑核对、expectedRevision匹配、revision加一、排他锁、原子替换、一次.previous及最多100条无凭据审计。不允许移除原16课、任意链接/HTML/脚本；最多200课1000题。部署只初始化缺失种子，不覆盖以后线上编辑资料。
- src/components/StarterContentEditor.tsx与src/app/academy/factory/review/page.tsx、src/lib/academyApi.ts提供已授权管理员课程编辑/新增及题目解析编辑界面。入口https://yandaoguoxue.yandao.vip/academy/factory/review/，验证进入后展开“入门课程远程发布”，先读取→编辑→核对→发布；不是用户注册即获授权。未登录/普通/撤销账号的读取和写入均有真实HTTP拒绝测试；本轮真实发布经过同一受保护API，未在聊天、源码或日志输出凭据。
- src/components/PlanetSurfaceExplorer.tsx及四份src/locales词典接新增高清天体控件的简/繁/日/英，现场切换验证；学术正文/许可保留原文，不冒称全应用历史控件都已经四语。src/lib/clientStore.ts补游客无token不走旧批量/api/sync，防止游客身份触发历史404；已登录旧批量同步路径仍单独待核，未伪造新云接口或删除原始档案。
### 70.3 后端、资料版本和网页真实上线
- scripts/deploy_starter_content_backend.py固定Git提交、精确旧SHA、三模块允许列表、语法检查、单份旧模块及PM2健康读回。2026-10-21T03:44:18Z部署到/www/yandaoguoxue-backend；未替换server.js/.env/业务数据库/用户编号。14_远程课程后端部署.json及原始哈希/预检为证。
- 使用scripts/publish_starter_content.py通过服务器既有管理员凭证、同一管理API把课程revision1更新到2，补八字复盘五栏笔记说明；2026-10-21T03:46:29Z读回24课68题，SHA-256 26cdb6cd9a7d7e882659e0381172cdbd3232f82685dba0cbc20c40cdd5e20497。没有重打安装包。线上.previous为revision1、无残留.lock/.next。后台/工具失败不自动重复提交。
- 全质量及Web构建39540020814成功；同一源码自动重复39540010478取消。资料/维护工具提交a501全质量39540714647再次成功。Web产物12318977439 ZIP SHA 54804f8e45faa659929eedeffbb649d809b9cf19509d4b1eee9a1be9c85cb7bf；2312文件86055563字节逐SHA核对。scripts/deploy_verified_web_preview.py增加先查旧版SHA并复核后复用文件：490文件56935761字节服务器内复制，仅传变化文件，避免重复传高清图；仍校验全部最终文件。
- Web于2026-10-21T03:47:45Z原子切换/root/yandaoguoxue/releases/v25.0.115-calendar-community-bdc4f1f，上一f541d5d保留。14个营销/账号注销公开文件保留，未动言道科技官网或产品子站。14_远程课程正式网页部署.json、14_正式网页公开回读.json核对课程/天文/管理登录页/说明/注销/2122测试下载六项200和SHA；不是以200替代操作验收。
### 70.4 实际操作与安装包
- RAM固定CI预览及正式站操作：原天文课1课1正确继承；选新增八字复盘→标读→答错出现解析与错题→重答正确→刷新仍保留2课2题2正确；同一客户端点检查更新取revision2，新增正文显示，仅改过正文的八字课已读退回1/24，2题2正确保留。以connect-src none阻断联网后仍显示已下载revision2/24课及答题记录。正式网站24课68题及《内经》《难经》新课正文/自测均可见，连续听学目录24项；不冒称本轮完成苹果物理音频播放。
- 本地scripts/study-content.test.cjs四项通过：有界数据/非法HTML或URL拒绝、真实文件并发发布与单份旧版、进度迁移、流式下载大小/异常格式；另三项云端记录隐私本地回归通过。scripts/academy-admin-http.test.cjs在完整CI实际Express/SQLite账号夹具测试公开读、游客/普通/禁用拒绝、合法发布、未核对400及冲突409。截图14_远程学习验收_20261021/，问题状态14_浏览器操作与问题核验.json。
- Android25.0.115（2122）国内签名构建39540024022成功；APK78298809字节、SHA bb49b04ae0728023e1e361aa11bfe75b60b6a94c28240f5c72434f36a588de68；AAB62309323字节、SHA 14e0dec20ac974141250704ef45189baf320f905ce44a50ac18d17d5a2cab00f。E发布包/Android_25.0.115_2122_tencent/保留真实包及verified-packages.json，前版2121仍留；不是Google渠道AAB。
- Apple25.0.115（32）签名构建39540027219成功；IPA45470094字节、SHA 2a0400875a5178007d18ebb1ba2cc0316ce64ffd509c0d492cdd563c810f2890，E发布包/Apple_25.0.115_32/及verified-package.json。身份com.yandaoguoxue.app、实际Info.plist32及WidgetKit签名门禁核对；只上传同一已核IPA的39540629737于03:49:59Z成功。处理/内测最终状态另列，不等同正式审核。
- scripts/retain_verified_study_packages.py在RAM下载已固定Git的官方CI产物，核ZIP digest、真实native标记/Info.plist、11图逐SHA、0张未授权旧动画及28条排除证据；新8课标识不在原生JS，远程阅读器及原16课在包。只保留E最终包，没有C本机依赖/ZIP/解包。包中有阅读器不代替真实手机离线/定位/音频测试。
- 安卓公开测试入口https://yandaoguoxue.yandao.vip/testing/2122/，原签名精确字节复用传输6457922字节替代全包传输，完整公开回读78298809字节及bb49一致（14_安卓2122官网测试分发.json）。仅明确测试分发，未改stable latest.apk/自动升级或各商店审核。下载说明已改为实际远程学习能力及“已适配控件”，无全应用语言完成暗示，14_安卓下载说明更新核验.json。
### 70.5 Google与正式审核的真实状态
- 2026-10-21本轮官方个人账号8539674148718133275迁移页仍为言道学外语/com.yandao.xuewaiyu，8056957676688740507已接受、Google待完成（2026-10-20）；列表没有国学/新增入口。14_Google迁移状态.json与固定google-transfer-monitor-latest.json记录。本轮未点击取消、修改、重新提交学外语请求，未改其他产品、国学健康声明或在个人账号重复提交被拒版本。原google定期跟进继续。
- 03:50:36Z Apple正式25.0.115关联build30/2100a433-90fc-413f-8e87-e9768a182d9a，任务b574a73e-d8d3-42fb-95d3-0776ccdad897仍WAITING_FOR_REVIEW；本轮不撤回、不替换、不重复提审。32只内部TestFlight。正式状态证据14_苹果正式审核独立核对.json；32最终处理状态以14_苹果32内部测试状态.json及下文为准。
### 70.6 清理、回退及未完成事项
- 单一人工CMD继续原路径outputs/guoxue-clean-20261018.cmd，未执行。逐个重核11个已登记目标381180186字节；追加2122/32保护，保留2121/31以及实际审核/Google用途2120/30。发现旧文件实际为CRCRLF，虽前次记录写CRLF，本轮以原始bytes复核并修正CP936+准确CRLF，原SHA b2ebc307…、新SHA 8cfd9bbacfc12e4a3c1e855b2f83ef208b5ac35b113a6d192b14a578e0733caf。禁止复制旧删除清单立即运行；仍待07/09/10和真实设备验收后负责人一次执行。14_唯一CMD重新核对.json列原/新SHA和全部目标。
- 本轮仅最终包、维护源码、审计证据留存；测试仅创建并移除自身E合成子目录，旧空临时测试父目录仍保留，未绕过早先自动审核拒绝删除（原因仅blocked by policy）。历史共享主树97项及旧物理候选/服务器release债务未全部消除，不宣称已完成物理两代轮换或所有垃圾清理。
- 网页回退可切回已留f541d5d；新课程是独立后端数据，回退页面不覆盖它。资料内容回退把.previous内容按当前revision+1通过受保护发布；不能直接降版本。新后端模块可按精确模块.previous恢复，但不得恢复旧register_routes.js或整库覆盖，连续账号策略不变。正式安装包未自动推送，测试包可退用已留2121/31，保留本机数据。
- 整体07/09/10仍未全验：真实双成年用户、多设备定位/音频/组件/通知/功耗、本人苹果权益到账恢复、完整药典/董氏/医案/图谱/古籍权利及医学专业审校、完整专业天文馆、全应用历史导航语言、已登录旧/api/sync等仍需完成。docs/requirements/release-readiness.json的overallComplete保持false，不能用24课/高清图/接口或安装包替代全量验收。用户本轮允许真机后测，因此未反复请求安装确认。
- 03:55:09Z独立只读生产：161用户、创世纪100000/lastIssued100075/下一100076（当时快照）、注册模块SHA a244b07a…及编号策略54fe08ca…均与前轮相同；健康200、course2/SHA26cdb6…、单份previous1，无.lock/.next。14_最终生产独立核对.json。最终提交/四镜像和本轮RAM预览关闭另列，不以计划代替事实。

### 70.7 最终Apple32内测、报告同步及本轮临时物收尾
- 2026-10-21T03:59:42.340Z Apple独立API：build32 UUIDfe7e0647-b68b-4fa8-aa95-1b54ee1a7a6f、VALID、IN_BETA_TESTING，既有内部组“言道国学”已附，assignedNow=false；没有新测试者、外部邀请或正式提审。04:00:24.682Z再次只读确认正式30任务仍WAITING_FOR_REVIEW；32是内部可测版本，不是商店已批准发布。
- 本轮两个专属RAM预览进程21372/16516分别确认命令行后停止，3113无监听；活动仓无本轮node_modules/.next/out/scripts/__pycache__，合成测试子目录已自行清理，旧空父目录仍在。预览第一次在监听就绪前打开产生本地连接拒绝，确认监听后重开成功并完成验收，未把它当成生产故障或绕过安全页面。临时课程/Google/正式验收标签已关闭，仅保留最新版下载页为交付；原公司官网及既有用户标签保留。
- 唯一制度新增第十五节写明远程内容边界、旧客户端不自动支持、管理员审核/版本并发与单份回退、后端种子不覆盖线上、正式审核分离。唯一报告、兼容根镜像和E两镜像、制度/入口及E原有主账本镜像同步并逐SHA核对；14_镜像同步核对.json记录。最终源码提交、上游一致和干净状态以14_本轮最终收尾核验.json为准，该外部证据在最后提交后写入，避免报告写入自身commit产生脏循环。未完成项仍按70.6，不以本轮收尾宣布07/09/10全完成。


## 71、2026-10-21 倪海厦本人书单溯源、22部原典录文及服务器内容更新
### 71.1 已完成范围与事实边界
- 依负责人本轮要求，仅处理言道国学。依据倪海厦本人汉唐中医三篇文章 goodbook.htm（2010-03-16）、jian-kwa1.htm（2007金匮前言）、acupuncdvd.htm（2005针灸说明）整理15位书目所涉医家、21条书目记录；不是其历年所有认可人物的穷尽清单，不暗示本人授权或代言。原始出处逐条可查；现代观点、政治文本和医疗夸大不复制为平台结论。
- 新增22部、250篇卷、2,586,657正文字符：曹颖甫伤寒发微原作正文及金匮发微原作正文；唐宗海血证论、本草问答、中西汇通医经精义、伤寒论浅注补正；陆懋修内经运气病释、内经运气表；傅青主女科（传统题傅山）；戴天章广瘟疫论；徐大椿难经经释、神农本草经百种录、医学源流论、伤寒论类方、兰台轨范、医贯砭、慎疾刍言、洄溪医案；孙思邈备急千金要方、千金翼方；杨继洲针灸大成；高武针灸聚英。与原10部340篇卷逐对象完全相同保留，合计32部590篇卷。
- 基于jicheng公开录文及版权说明，固定GitLab jc.data提交fce547b73db49408b34a4144d12e09f09eebafd3、原始HTML SHA、章节数和结尾。曹氏1956合刊中现代序跋未复制，只收完整曹氏原作范围并明确版本名称；唐氏金匮浅注补正因所见秦伯未重校版权未明未收全文，因此不称唐氏五种齐全。徐氏八种分别列版，不伪称现代全集。余无言、姜佐景、杨力、刘力红等相关现代6条仅书目待授权。经方实验录作者归姜佐景，不能把曹颖甫临床来源等同著作版权归属。
- 256处原图未收录，书名与正文明确“录文版/不含原图”及原图位置；不能用文本版代替针灸定位图。源站录文许可不自动覆盖图片。字序/完整章节核验不等同医学专业审校；未宣称药典全部收齐、医学准确性全部完成或07/09/10全部验收。
### 71.2 修改文件与校验
- 数据：backend_deploy/data/tcm-jingfang-sources.json、tcm-jingfang-originals.json、jingfang-bibliography.json。scripts/import_jingfang_originals.py固定来源导入/字符顺序与SHA复核，保留混合h2序文、无标题卷前题署及原图占位；不把正文“必待補而愈”误判为缺文。scripts/jingfang-import.test.py四项测试通过。
- backend_deploy/build_tcm_original_editions_pack.js合并32部；scripts/tcm-edition-pack.test.cjs三项测试通过：旧十部完全保留、实际客户端schema兼容、书目解析与图像/现代权利边界。backend_deploy/data/study-starter-public.json追加书单研读课及三题，总计25课71题；scripts/study-content.test.cjs四项通过。scripts/academy-admin-http.test.cjs动态夹具及.github/workflows/study-quality.yml更新，云端全质量39544609099成功、密钥检查39544609084成功。
- scripts/publish_tcm_original_pack.py先整包核旧十部、上传COS并整包回读，最后对既有单一PUBLIC目录行CAS；首次预检因COS Not Found严格拒绝、原1.1保持，确认错误语义后修复再发布，未先下线旧包。scripts/publish_jingfang_guide.py只新增两份静态文件；scripts/deploy_verified_web_preview.py保留这两份后续独立更新文件，未重部署客户端。
- 主要源码提交9e0bee604636dddb11ee0f8d618d205807d9df7a、维护工具c5698a6，均已推送。未改账号连续编号、支付权益、排盘算法、其他产品或官网主站。
### 71.3 真实上线、入口及证据
- 2026-10-21T04:36:28Z COS原典包tcm-original-editions-approved版本1.2.0正式发布，11,433,003字节，SHA-256 45084b5f3e61697f09bbed8caeb0428060f2c6f938b3e44f598ba02c419191a9。04:42:36Z公开下载解析并整包重新读回同SHA、32部590篇卷；签名下载地址不写日志。权威库/root/backend-auth/data/yandao_users.db目录行PUBLIC未变；保留原1.1对象及单份registry.previous回退资料。
- 04:36:54Z受保护课程发布API把revision2更新至3，25课71题，SHA 99b5ed7dcbcb70a347e988fef49dcd9c25ff2f59970e1240079437857bf42d9f；新增倪海厦书单溯源与版本学习课，原24课不变。课程可以现有管理员入口继续编辑，无需原生打包。
- 04:36:57Z https://yandaoguoxue.yandao.vip/guide/jingfang/ 医家书目页上线，HTML SHA 73eadfa94a224ea17fbdc6c36ca4b49e9f689b0e7918921c17cbaa978313de78；bibliography.json SHA 752e8d6f89c10cd6264b3c8b169b35a472f420defecb4a4550b19822174d6a6d。真实浏览器显示15位/21条/32部590篇卷、原文出处及逐项版权/插图边界，截图见E证据目录。
- 既有网页离线内容页实际识别1.2.0/32部590篇卷及“有新版本”。点击一次更新后原生JavaScript下载确认造成tab9焦点超时；未重复点击、未绕过浏览器机制。确认框和键盘恢复均未成功，因此浏览器实际安装完成、读书/搜索/听学最终操作本轮仍待验，不能用接口成功或schema测试替代。书目页tab10正常，截图留存。安卓/苹果真机本轮未测。
- E正式包：发布包/学习内容包/tcm-original-editions-approved_1.2.0.pack。证据均在发布包/实机整改_20261018/15_*：来源预核、COS发布、书目研读课发布、医家书目索引发布、公开整包回读与验收边界；截图15_经方医家原典实际验收_20261021/医家书目索引.png。
### 71.4 打包、审核、清理与回退
- 本轮只有已支持schema的纯内容更新，不增加客户端执行能力，不需要重打安卓2122/Apple32；Web客户端仍bdc4f1f。用户在“离线内容包”更新“中医原典录文扩充”至1.2.0后使用；课程联网检查revision3。未自动改stable APK、商店素材或正式审核。
- Apple正式30及Google学外语迁移状态沿用70节最近一次核对，本轮未刷新、撤回或提交；保留学外语迁移、不动其他产品。不得把本轮内容上线称为各商店审核通过。
- 仍待：现代全文与原图授权、医学专业审校、整套07/09/10功能及双用户/原生真机验证、历史同步等既有问题。原有classics整理中“倪海厦解读”的来源/权利仍需独立审查，不能据新书目声称旧整理已获授权。
- C盘未建依赖、构建包、ZIP或HTML图片缓存；只保留维护源码及E正式内容包/审核证据，无本轮临时物。服务器发布锁和自身stage按finally清理。唯一人工CMD SHA 8cfd9bbacfc12e4a3c1e855b2f83ef208b5ac35b113a6d192b14a578e0733caf保持未执行，物理历史清理/两代轮换不能冒称完成。内容包1.1保留回退，回退需核对原SHA再CAS目录；课程用.previous内容按当前revision+1受保护发布，不能降revision或整库覆盖。


## 72、2026-10-21 归真医学公开资源索引、成尤原典与六篇经方研习
### 72.1 负责人要求、来源与授权边界
- 承接“归真老师网上资料教材整理、尽可能丰富经典经方家”的要求，仅修改言道国学。开始HEAD282bf58干净，读AGENTS、制度、唯一交接及主账本后执行。以蜻蜓FM公开“归真医学”账号主页与相互链接的三张专辑为目前可核对象，不猜测讲者实名、执业资格，不与同名人物混并。主页https://www.qtfm.cn/podcasters/a5ed899d3b0a43319d4888b93934ea61/；基础篇/channels/465154/、伤寒篇/channels/469224/、经典诵读/channels/468823/。核查日目录分别61、14、2项，只是页面快照，不宣称全部网络资料或每段媒体已审查。
- 原页可核“归真老师注解-伤寒教材一”题名；未取得整套教材、讲义、音频、视频转载许可，故只登记题名、原入口和范围，不转录、搬运、代播或抓取网盘课程。经典诵读中“医学三字经（择要）”保持择要范围，不冒称整本。本轮原创研读课清楚标为言道国学独立方法，不冒用老师原话或授权。
- 从相同中医笈成固定Git来源fce547b73db49408b34a4144d12e09f09eebafd3新增四部完整来源版：尤怡（在泾）《伤寒贯珠集》卷前题署+八卷9篇、《金匮要略心典》徐序/自序+上中下5篇；成无己《伤寒明理论》两序+三卷5篇、《注解伤寒论》三段卷前文+卷一至十13篇。合计32篇、333739正文字符；新四部无插图，原256处缺图标记仍保留。独立核固定HTML SHA、全部可见字符顺序、章节和末句；医学逐字校勘仍未完成。《注解伤寒论》原来源品质60%只是文本标签，不是疗效或医学准确率。
- 候选《伤寒寻源》原序明确中卷未备，本轮不列完整教材；所见《伤寒来苏集》四卷与合集范围另需核，不拼接冒充全集。四部新古籍与归真/倪氏书单各自列示，不声称现代老师逐本推荐或授权。
### 72.2 具体文件与测试
- backend_deploy/data/tcm-jingfang-sources.json及tcm-jingfang-originals.json追加四书，原22新增版对象及先前十部不变。backend_deploy/build_tcm_original_editions_pack.js核36部622篇卷。原文包仍是现有reader支持的数据schema，不向客户端下发程序。
- backend_deploy/data/jingfang-continuing-study.json维护三张归真专辑、账号来源、版权待核、四书研读索引。scripts/publish_jingfang_guide.py扩充现有/guide/jingfang/页面，保留倪氏15人21条书目；明确白名单外链、HTML转义、旧双文件SHA预核、排他锁、双文件先stage/逐项替换及失败还原、单份/root/yandaoguoxue-guide.previous.json。后续Web部署原有保留路径覆盖这两份索引，不另建相互竞争官网。
- backend_deploy/data/study-starter-public.json追加六课：归真公开课程与原典对读、成氏症候方论、尤氏六经治法分组、金匮心典证据、徐唐注本对读、脉经跨书检索；每课六段完整原创正文、三题解析，原25课不变，现31课89题。先前存在过短题目解析被格式门禁拒绝，已补清解释后通过，未绕过校验。
- scripts/publish_tcm_original_pack.py增加显式更高内容版本及源文件导出数量，仍先核旧包全部书籍完全相同，再COS上传、整包SHA回读、最后对唯一PUBLIC登记行CAS；不改访问权限、注册编号、付款、会员、佣金和算法。scripts/study-content.test.cjs、tcm-edition-pack.test.cjs、jingfang-import.test.py及.github/workflows/study-quality.yml更新。7项Node+7项Python针对性测试通过，后者新增旧25课/22书规范化SHA不变、三专辑只含元数据、渲染转义与非法链接拒绝。全质量39546463595成功，密钥检查39546463403成功。
- 内容和工具源码baa08019f98a04db5cc1ab91b5e98cd58a9cda59已提交推送；不是重新构建客户端的提交。无其他产品改动。
### 72.3 发布与整包公开回读
- 04:53:52Z通过既有受保护API发布课程revision4，31课89题，SHA bff296e5888f3970f83db1912af075321f696e3290598eb5eba7e82c0ccd66b8；前25课完全保留，.previous为revision3。课程和自测仍为现有客户端远程资料，不下载脚本。
- 04:55:34Z COS原典包1.3.0上线，36部622篇卷、12434646字节、SHA 420ae1e3a086669fc87648dae1b56c4e087eceb4288f9286b34acf11f2121085；先真实读回旧1.2.0全部32书一致，再发布。保留原1.2对象和单份registry.previous。E正式文件发布包/学习内容包/tcm-original-editions-approved_1.3.0.pack；04:56:42Z公开下载重新整包核SHA与E字节一致，未保存临时签名地址。
- 04:56:07Z更新https://yandaoguoxue.yandao.vip/guide/jingfang/#continuing ，HTML22309字节SHA49c4dc8c16b4f0a4528c913fa255d8c05608273e1e8e4d85040fda82456249a1；bibliography.json18182字节SHA73dd38b65ae11a8e783584a4f09d879af8bd9445bd781c7e847bd255e37f1d32。公开读回核同，三专辑原平台链接和四原文入口实际显示。Web客户端仍bdc4f1f，未动公司官网和其他产品子站。
### 72.4 现有客户端实际操作验收与前次待验更新
- 网页入门课自动从本机旧revision2更新至4，显示31课89题、六篇新增正文和31项听学目录。归真课标读→答错出现解析及错题→重答正确并完成另两题→刷新后仍1课已读/3题3正确/错题0。未登录，记录只在本机；未制造真实用户或云端医疗记录。
- 现有离线包页正确识别1.3.0及36部622篇卷。本轮点击更新一次后读取明确JavaScript confirm并accept，下载后显示“已下载并校验通过（v1.3.0），断网可用”“已是最新/已安装”。解决71节本次浏览器确认阻塞的后续验收；不是改客户端代码或绕过浏览器安全流程。
- 实际打开新《伤寒贯珠集》9篇目录及卷八原文，版本1.3.0、末句“傷寒貫珠集終。”可见；收藏末卷后刷新仍“取消本章书签/选中”，原文仍可读。《注解伤寒论》13篇完整目录（序文及卷一至十）可见，搜“四逆加人參”命中卷六、卷七、卷十。连续听学目录随新书加载；本轮未验证物理设备发声、真机离线重启或全部36部逐页专业校勘，不冒称这些完成。
- 证据统一E发布包/实机整改_20261018/16_*：来源权限与实际验收、原典包发布预检/COS发布、六篇研习课发布、书目页发布、公开整包与课程索引回读、临时物清理；截图在16_经方研习实际验收_20261021/，包括三专辑索引、31课进度、原典1.3安装、贯珠末卷书签及成氏十卷目录。
### 72.5 审核、清理、回退与未完成
- 本轮无需重新打包：继续使用Android25.0.115/2122与Apple25.0.115/32；联网课检查revision4，离线包页更新原典1.3.0。未上传新原生包、替换stable或变更商店正式审核。Apple30与Google迁移仅沿用70节最近核对，本轮没有新平台状态证据，不取消或修改学外语迁移。
- C未安装node_modules、未生成ZIP/解包/原HTML图像缓存；仅维护源码，E保留合法原典包和必要证据。服务器本人发布lock/next/stage逐个核不存在。单一人工清理CMD保持未执行；新包虽浏览器已验，原生与07/09/10整体尚未全验，未自动清理历史用途包/旧COS对象及所有历史债务，不能宣称物理两代轮换或全工作区清理完成。
- 课程回退用.previous内容按当前revision+1通过受保护接口发布，不能直接降版本；原典回退核1.2.0整包SHA后CAS，不能覆盖数据库；索引按单份previous双文件核验恢复。新现代教材全文、原图授权、医学专业审校、双用户和原生全套测试、历史同步等仍未完成，原07/09/10整体状态保持false。


## 73、2026-10-21 大六壬十二宫解析与共用AI购买入口整改
### 73.1 实际原因及范围
- 负责人反馈“大六壬宫位点击无解析、AI不能购买，所有工具应可用”。开始HEADfca193f干净，按AGENTS读制度、交接与主账本后核查。已异步询问发生问题的平台和页面提示，截止本轮收尾尚未收到该项回答；未据此停止可独立完成的修复。
- 大六壬DIPAN_POSITIONS十二格原来只是div，无点击事件；仅三传/四课/中宫有事件且资料嵌在右侧下方。新版十二格绑定本格数据并弹出可关闭抽屉，支持Enter/空格；基础本地资料无需AI或购买。
- AI共用组件有旧外部支付入口：苹果版已提供StoreKit会员/点数，但局部解锁仍调被平台拦截的微信路径。额度不足时部分界面只留文本，没有可用购买入口；AI失败有被当作成功报告截断/锁定的情况。getPermissionStatusFromServer仅在可用时覆盖本机，明确用完时仍回退旧本机会员；新买会员的服务端level没有同步用于展示。已逐项整改，不改服务器计费权益与基础价。
- 原AI缓存只保留请求前50—80字，不同宫位/命盘相同前缀可能误用结果且缓存未按账号隔离；改完整请求+账号摘要键。紫微独立AI函数设置aiContent但没有实际渲染结果，另有服务端已允许后又被本地额度否决的重复检查；新增所选范围结果抽屉并移除此重复否决。
- Android2122为既有tencent渠道，PUBLIC_AI_ENABLED编译关闭，服务器改资料不能恢复。未擅改在审商店渠道：新增明确internal测试渠道，提供AI完整测试能力，原tencent与Google/社交资质开关保持原规则。internal仅测试分发，不充当商店已审版本；Google未接Play Billing的购买仍关闭，不能声称所有渠道已可付款。
### 73.2 修改路径及行为
- src/algorithm-core/modules/daliuren/index.ts仅导出现有getLiuQin供同盘解析复用，不改排盘算法。src/lib/daliuren-interpretations.ts新增getPalaceInterpretation，解释所点地盘、对应天盘、天将、遁干、六亲及两层空亡，按已有结果读取不重新排课。src/app/yixue/daliuren/page.tsx给12格加按钮语义/键盘与事件，基础详情复用InterpretationDrawer，AI由用户另点AIInterpretButton，不在点宫位时自动扣额度。
- 新src/components/AIAccessLinks.tsx统一会员/点数/购买反馈的真实入口；苹果版进入既有App Store商品页和恢复购买，不能走外部支付；Google显示限制不提供违规付款链接。src/components/AIInterpretButton.tsx修额度不足入口、错误状态、重入保护、Apple分流及错误会员链接。src/components/EventDivinationPanel.tsx改服务端权限、点数/会员完整显示、失败不生成/不累加本机成功次数、支付套餐变更不静默、回调读取当前套餐，Apple解锁分流；没有新建苹果单次解锁商品或给已购权益重复收费。
- src/components/shared/InterpretationDrawer.tsx支持可选children供六壬详情里放显式AI按钮，原调用不受此新增属性影响；服务器确认会员或点数时不再错误遮挡，失败不当成内容。src/app/yixue/ziwei/page.tsx新增AI范围结果抽屉（宫位/大运/流年/月/日/时），失败与生成内容分开，移除旧本机第二次否决。src/app/yixue/ai/page.tsx额度不足有购买入口，服务提示不冒称AI生成。
- src/lib/aiService.ts先鉴权，WebCrypto SHA256完整systemPrompt/userPrompt/cacheKey与当前账号生成request-v2缓存键，防不同尾部/宫位/账号混读；账号中途切换丢弃返回，不写错账号缓存。没有WebCrypto时不退回危险截断键，直接正常请求且不使用本机缓存。requireAIContent让文字包装器在失败时传播错误；缓存命中不累加本机成功次数。旧单次解锁key与服务端订单未迁移/重排。
- .github/workflows/android-build.yml增加internal可选测试渠道，android/app/build.gradle递增2123；scripts/retain_verified_study_packages.py、publish_verified_android_test.py接受明确internal，签名/来源/marker仍严格核验；scripts/templates/android-test-download.html标明内部完整AI测试与非商店审核。所有维护源码已提交；绝对路径明细在17_修改文件绝对路径索引.json。
### 73.3 验证证据及真实边界
- scripts/ai-tool-access.test.cjs四项：服务器0额度覆盖过时本机会员、已购点数和新购会员不被本机误拒、401、完整相似前缀/不同账号隔离与同请求缓存命中、失败传播和切账号丢弃、12格映射。scripts/ai-purchase-links.test.cjs两项实际React服务端渲染验证Apple进真实会员/点数页无外部付款、Web入口和Google拦截。原paid-ai-credits三项、membership-ledger五项等完整支付回归持续通过；本地Apple客户端测试因无typescript依赖未执行，云端以真实依赖执行通过，未在C盘安装依赖补跑。
- 最终源码bbc5601207d8b47407d957ba621526025374df8a，质量/默认Web构建39548659692成功；签名Android39548662765和Apple39548665493成功。早期aeca类型检查发现旧getPermissionStatus调用残留，已修正后ef61079及之后全检查通过；较早候选的重复/未完构建取消或自然完成，均未上传TestFlight，未留成本轮正式包。最终只留bbc候选实际包，不以失败候选充交付。
- 固定CI产物RAM预览：逐点巳午未申辰酉卯戌寅丑子亥12格，均出现正确地盘/天盘标题并能关闭，午宫用Enter；点所选宫AI，游客得到登录提示，取消后盘面仍保留。预览仅GET代理，统计21个GET、0生产写请求、0隐私探针。正式网站亦实际起课→点子宫，出现“子宫·天盘酉”、本格天地盘/天将/遁干与AI按钮。截图/12项结果在17_解析购买整改实际验收_20261021/。
- 同一源码审查27个含共用/直接AI入口的易学页面，见17_工具解析购买覆盖范围.json；其余历法/尺规/目录等没有共用AI入口，不擅称已有所有AI功能。本轮未逐个27页真实购买，更未验证全应用每种功能。真实账号付款到账、沙盒恢复/取消、原生触摸/重启/音频仍待本人真机验收；历史沙盒账号权限问题需原购买账号证据核对，未扩大为任意账号可领沙盒权益。
- 05:19:32Z沿服务端现有智谱通道发纯合成连通测试，200且5字非空；没有客户盘面、没有消费客户额度、密钥不落日志。05:20:08Z微信SDK对固定不存在测试单作只读商户查单，成功返回NOT_FOUND，未创建订单/付款；证明签名连通，不代替真实支付与交付。配置Native/JSAPI就绪，公众号appSecret布尔为false，微信OAuth需另核，不能把配置READY当成全部交易成功。17_AI上游实际连通验证.json、17_微信商户只读查单连通.json、17_支付与AI服务只读诊断.json为据。
### 73.4 网页、安卓及苹果真实发布状态
- 05:23:15Z以固定产物12322677576、ZIP SHA2a776f81761874a258a5a9f649745030125adabdfdacd1b8cced6bc23cc63866核2312文件86935615字节，Web原子切到/root/yandaoguoxue/releases/v25.0.115-calendar-community-bbc5601，上一bdc4f1f保留。服务器复用699文件56586210字节，仅传变化文件；营销/账号注销和两份独立书目索引保留。课程revision4/31课与归真索引36部622篇卷再次公开核对仍在，没有覆盖后端学习内容或修改公司官网。
- Android25.0.115/2123 internal APK78355341字节SHA f3aee0d5bbc390ccfd13a8de818d3022e0924b9d91b0b53ee4d3904b047471c0；AAB62365832字节SHA bd51abc7b1dfd9da330c6dcd80863610cdbbce0a6017acc857c04fd3b4f9b3d1。E发布包/Android_25.0.115_2123_internal/及verified-packages.json留真实文件。不是Google或国内商店正式包。源commit/渠道标记、原签名8ca0c414…、11幅已许可高清图、28项未授权旧图排除及远程阅读器门禁核验。
- https://yandaoguoxue.yandao.vip/testing/2123/明确内部完整AI测试，传输复用旧2122精确字节，只传6614976字节、原签名不变；05:25:03Z服务器完整校验后上线，随后公网读取整包78355341字节同SHA通过（17_安卓2123完整AI测试分发.json）。未改stable latest.apk/升级接口，旧商店渠道不被静默换成internal。
- Apple25.0.115/33 IPA45482082字节SHA 7da56aff32e75dae665a47f626cc8eb0864b5ef71dcca2f51e5a524c7df58cc7，E发布包/Apple_25.0.115_33/。核真实Info.plist、身份com.yandaoguoxue.app及WidgetKit签名；39549162237只上传已核同一IPA成功，没有重打上传。05:27:26Z ApplebuildUUID4e8bec2b-22f5-4d5e-bdc1-3421c05c9d43为VALID、IN_BETA_TESTING、既有“言道国学”内部组已附，可供本人安装；未新增测试人或发送邀请。
- 05:29:37Z正式Apple仍25.0.115关联build30、任务b574a73e-d8d3-42fb-95d3-0776ccdad897 WAITING_FOR_REVIEW，未撤换/重提/覆盖审核素材。33为内部测试。Google本轮未再核迁移，仍按保留学外语迁移后再转国学规则，不改变健康声明或其他产品。
### 73.5 清理、回退与剩余
- 只在RAM下载/校验云产物，未在C生成node_modules、构建目录、ZIP、解包或日志副本；E留正式包及有效证据。专属RAM预览PID11596确认命令行后停止，3113无监听，临时验收标签关闭；正式修复页与最新版下载页保留作为交付。历史共享清理和物理两代轮换仍未全部完成，不能冒称全盘无垃圾。
- 单一人工CMD原SHA8cfd9bbacfc12e4a3c1e855b2f83ef208b5ac35b113a6d192b14a578e0733caf，仅加2123internal/Apple33精确文件SHA保护，保留2122/32与所有既有用途保护和11个旧删除目标；新SHA b01bbc25b659daa372f792a7e618673b044912b842f41500249b17ab923bbc11。CP936/准确CRLF；未执行删除。未因测试新版存在就删待审核/Google用途包或未验旧版。
- 网页可按已留bdc4f1f原子回退；回退不改后端课程/原典COS版本、连续注册序列、订单和权益。测试包可退用已留2122/32（该安卓为AI关闭渠道，必须如实说明），个人数据不自动清除。07/09/10整体false保持，27页源码覆盖、12格操作和模型连通不替代真实付款/原生全量验收。账户对应的真实购买到账仍需后续核对。

### 73.6 Google迁移定时只读核查（2026-10-21T05:35:52.324539+00:00）
- 已登录Google Play应用转移页实读：言道学外语com.yandao.xuewaiyu仍为2026-10-20待处理，目标8056957676688740507已接受，等待Google完成；本轮无实质变化。未取消、修改或重提交另一产品迁移，未启动国学迁移；个人账号国学更改已拒绝/旧正式版保留，不重复提审或改健康声明。
- 覆盖更新E盘google-transfer-monitor-latest.json，临时核查标签已关闭；无安装包、缓存、日志或临时脚本新增。后续继续等待既有迁移完成再核对公司账号及国学迁移资格，无需用户操作。

## 74. 2026-10-21 解读专业度、古籍出处与大六壬日干漏判整改
### 74.1 目标、实际缺陷与源码
- 负责人截图中的解读停留在术语释义，出现亥水克申金等基础错误、四柱用途混淆、Markdown符号直接显示及“含流月流日”虚泛锁定承诺。本轮不以追加“来自经典”替代核对，不声称AI整体无误。
- 查实src/algorithm-core/modules/daliuren/index.ts的zhiKe只查地支五行，第一课下神为日干戊时被忽略，导致2026-10-21未时样例错标遥克/蒿矢。修正为地支或天干五行查表，三传720表未改；同例第一课寅/戊、三传寅亥申不变，课体改元首、取法贼克。依据《六壬指南》卷一唯一上神克下取元首的原文核验，未重写全算法。
- src/app/yixue/daliuren/page.tsx补全三传天将/遁干/六亲、四课编号和上下标签，区分起课与出生四柱、日旬空与时空；旧课体说明仅作为待核传统术语。src/lib/deepReportPrompt.ts与src/lib/aiService.ts共享研习规范要求本盘事实→规则→推演→反证/缺项，不再强迫只列术语，不以书名候选冒充已核原文；八字专用报告同步去除固定典籍来源及个人命运/体质推断指令。
- src/components/EventDivinationPanel.tsx去除400px内滚动，安全纯文本清除#/**显示；锁定说明改为本次报告剩余内容，不保证生成流月流日。脚注区分经典体系、AI归纳和现实预测。支付、会员价格权益、订单和其他产品未改。
- 新增backend_deploy/liurenStudyQuality.js，服务端识别全盘和宫位大六壬请求，覆盖旧客户端冲突提示；确定性核对三传五行/相对日干六亲和四课标签矛盾，提供4段短引及篇卷/转录链接。复杂大六壬优先现有混元模型，免费模型仅作为传输失败回退；结果仍须检查。backend_deploy/server.js在扣额度前拦截过短、缺来源/AI归纳说明、已知五行错误、绝对化结果或截断报告，返回AI_REPORT_QUALITY，不扣本次解读额度。规则检查覆盖有限，不等于全面事实审校。
- 引文核查入口：https://zh.wikisource.org/zh-hant/六壬指南/1 、https://zh.wikisource.org/zh-hant/六壬大全/2 。只引用已核短句，正文推演明确为AI归纳，非原书原文或现代效验依据。其他工具已改善共享提示规范，但逐工具专属文献核验和专家审校仍未全完成，不可宣称全部专业验收。
### 74.2 验证与可维护设施
- scripts/liuren-study-quality.test.cjs、scripts/ai-tool-access.test.cjs本地8项通过；新scripts/daliuren-course-relations.test.ts在真实依赖CI验证截图日期样例的第一课/三传/元首课。最终a269fca4d99c7564010145d7384623f11116121c质量39553860833、安卓39553864294、苹果39553867506均success。前一次CI因新增测试误用对象参数被TS拦截，已改为实际函数的7+位置参数；失败候选未发布。
- 真实模型合成案例未用客户资料、未扣客户额度：免费模型两次出现五行错误均判失败；更高质量模型样例经确定性提示与矛盾校正后约1995字，通过当前规则，并人工读核关键方向及课体区别。18_大六壬研习最终模型样例.json留实际输出，不是预置回复；无专业人员签署审校，不得冒称全语料医学/术数验证完成。
- scripts/deploy_liuren_study_policy.py仅对固定源commit、原服务器SHA与精确上下文挂接，不用本地server覆盖远程差异；留一份.previous、语法检查、PM2健康失败回退；--policy-only可单独维护服务端规则。首次健康地址误用/health被自动回退，改/api/health后正式成功。scripts/verify_liuren_study_sample.py用于无个人资料的真实模型回归，不输出密钥。
- 证据统一在E盘项目归档/发布包/实机整改_20261018/18_*；18_修改文件绝对路径索引.json列明活动仓文件绝对路径。服务端最终规则source0926c91d96bca9a20e5a84c588f0924250c52b76，server SHA9533e0e63d8699438c6002280499bbf5ec1ead72a642b90ec28a7f385f1fd028，policy SHA534d8d0596747c0e2bc3fee0d947db13a91fd4282317edfbd4ee3c0305a96978，06:14:15Z读回成功；未改数据库或密钥。
### 74.3 网页、测试包及真实审核状态
- Web固定产物12324134541（ZIP SHA80ac001afd92c37977681ff6c2f0ae4ef270b89a9aec1b19dc4e420a5c753ed8）核2312文件86900542字节，06:15:54Z原子切到/root/yandaoguoxue/releases/v25.0.115-calendar-community-a269fca，回退bbc5601保留。复用707文件57100327字节；保留14营销/注销文件和2份独立原典索引。scripts/deploy_verified_web_preview.py对已验证2123测试APK硬链接保留，不复制78MB字节，原测试链接没有因更新失效。
- 正式网页真实操作：选未时开始起课，显示元首课、贼克法，三传寅亥申；截图18_正式网页元首课修正.png。该网页演示起课时钟15:00、占事未时，非伪造14:00截图。书目索引、课程接口、2123/2124入口均HTTP200，独立书目SHA保持73dd38b65ae11a8e783584a4f09d879af8bd9445bd781c7e847bd255e37f1d32。未把HTTP200当AI用户付款验收。
- Android25.0.115/2124 internal：APK78338605字节SHA6d6d38999097227ccd578e32fd9f554d9f112b34fc613d4f88d3021e466bb26a，AAB62349086字节SHA7c60f08dd6493955df65515ec7b0af754f8580b84389053013e740fee3d7902f。E发布包/Android_25.0.115_2124_internal/留真实文件和verified-packages.json。原签名不变，非Google或国内商店审核包。https://yandaoguoxue.yandao.vip/testing/2124/ 已上线，逐字节复用71898909、仅传6439696字节，公网整包读回同SHA。publish_verified_android_test.py补内部测试前版复用，不改签名和stable自动更新。
- Apple25.0.115/34：IPA45467159字节SHA2fced9915bce2a0978e362ee43ba37394e458226d4869372d02514ed17439e10，E发布包/Apple_25.0.115_34/及verified-package.json。39554323249只上传已核同一IPA成功，未重建。06:21:03Z build7128bc0e-d6d7-450c-a70e-3698a2f1a652为VALID/IN_BETA_TESTING、既有言道国学内部组已附，无新增测试人/邀请。
- 06:19:11Z只读核实苹果正式仍build30、任务b574a73e-d8d3-42fb-95d3-0776ccdad897 WAITING_FOR_REVIEW；34仅内部测试，不冒充正式审核受理/发布。未撤原审核、重复提审、操作Android商店或学外语迁移。
### 74.4 清理、限制与下一步
- C盘未新增node_modules、构建/ZIP/解包/模型日志；产物在RAM校核后只留E盘正式测试文件和有效失败/成功证据，维护脚本纳入Git。远程*.next.js残留检查为空。正式验收标签保留作交付，没有绕过登录或真实用户购买。
- 唯一人工CMD仅加2124/34存在和SHA保护，删除目标不变、未执行；SHA由b01bbc25b659daa372f792a7e618673b044912b842f41500249b17ab923bbc11变为db3548e89e603fc04cef15570c667619c138cd71f0614784191973b65c387e18（18_唯一CMD新版保护.json）。未经真机验收不删除唯一回退或审核用途包；历史物理两代清理与07/09/10全量验收仍未完成，不能写全部完成。
- 后续：用户更新TestFlight34/安卓2124后重新生成（旧客户端本地已缓存文本不自动重写），核验会员/AI点数实际扣次和完整报告；不得要求已付费用户重复付款。新报告核心规则/来源可在服务器维护，无需只为文案反复打包；算法与客户端UI变更仍须正常更新。网页可回退bbc5601，服务端原server.js.previous可恢复；须连同模块.previous按本节部署证明选择，不能恢复数据库或密钥。
- 收尾要求：本轮有效源码已审查提交并推送，最终文档提交后再次核对git空状态及上游0/0；权威报告、根兼容副本及两份E镜像逐字节与SHA-256核对一致，最终提交号/镜像哈希/清理范围见E盘18_最终提交与同步核验.json，避免把文档自身提交号写入自身造成反复脏改动。

## 75. 2026-10-21 全部已有易学AI工具：细致推演、温和回应及真实典籍统一
### 75.1 目标与覆盖
- 负责人要求所有工具解析细致、满足情绪需要且专业、引经据典。已核实旧独立按钮、紫微专用入口与号码辅助函数提示不一致，不能只修改共享深度报告。新增backend_deploy/chartStudyQuality.js、backend_deploy/toolStudySources.js，backend_deploy/server.js三处精确挂接统一规则；大六壬专用核对保留并叠加共情标准。
- 现有27个命名入口：占星解读、八字、车牌号码、称骨算命、大六壬、干支查询、八字合婚、周公解梦、空亡查询、六爻、梅花易数、姓名解析、纳音五行、手机号码、奇门遁甲、智能起名、七政四余、神煞、太乙神数、塔罗牌阵、五行查询、小六壬、玄空飞星、一掌经、择日深度分析、择日、紫微斗数。支持共享Event、独立AI按钮、紫微命盘及旧号码辅助调用；普通易学问答按领域识别。未为没有AI的导航工具虚构新功能，也未把中医结构化JSON、课程题解或公司客服改成长篇排盘报告。
- 统一结构是回应具体问题→本次输入事实→规则/条件/推演→不同解释及反证→温和限制和可操作复盘→具体来源/AI归纳。完整盘通常1400—2200字、局部/基础通常600—1100字只是目标，不凑字或补造缺项。宫位、爻位、牌阵先答所选局部，不换盘。分别配置16类分析重点，如紫微三方四正/四化层次、六爻世应动变、梅花体用互变、奇门星门神干、七政宿度/数学点等。
- 情绪关怀限于用户明示困惑和事实，语言温和，不假装知道过去或人格，不巴纳姆奉承、恐吓、贬低、依赖诱导或引导购买化解；不保证好结果，不根据盘面决定疾病、投资、就业和关系。不是以情绪安慰代替专业，也不是冷淡堆术语。
### 75.2 引文、核对与限制
- 新材料表11条已核短引：三命通会、紫微斗数全书、增删卜易、梅花易数、奇门遁甲统宗、周易正义、说文解字、庄子、尚书精义、太乙金镜式经、钦定协纪辨方书；大六壬原有4条保留。每条带书名篇卷、原文、核对URL及适用边界，背景引文不冒充具体算法或现代效验依据。无复制现代译文、课程音视频或未授权图片。
- 择日专属来源补核Kanripo四库文渊阁本卷四KR3g0051_004.txt引历书“其法從月建上起建”，源blob ad91a9ee7e4a90a41dc5cdb1cef7fe0d50830927、文本SHA e6a130bd92c80a328af5872067d906e0734d47a6bce5ff62586d7796bca486ae，原文证据19_择日原典核对来源.json。只支持月建起建，不保证活动结果，也未据此重新计算用户黄历。
- 占星、塔罗的专属原典短引尚未核实；手机号/车牌现代公式没有本次已核古籍依据，明确“未核原文”，不能硬套中国经典。姓名五格、称骨等具体歌诀/公式若只给了文字或八卦背景，也不能把背景当其原文来源。不得宣称每工具全部规则已经完成文献审校。
- 品质检查在实际扣额度前运行：过短、缺来源/AI归纳/限制、伪造引文、错误生克、体系混用、操纵性断言或截断结果返回失败，不当已交付付费报告。受控繁简字形与书名+原文可核对，漏编号不等于伪造；明确反驳错误或方向对照问句不按错误断言误杀。只是有限规则保障，不保证全部语义、古籍版本和理论均正确。
### 75.3 测试与真实部署
- scripts/chart-study-quality.test.cjs扫描现有工具源入口，逐个验证覆盖，另验医疗JSON隔离、号码老格式、紫微命盘、自由问答、独立学科重点、伪引文/诱导收费拦截、繁简原文、反驳句和教学对照句。连同原AI额度/缓存与六壬检查，本地15项通过。云质量39558000586（7acddfe）、39558645741（1b6015a）均success；本轮不生成Web预览或原生安装包。
- scripts/fixtures/chart-study-samples.json保存27个明确合成、缺项受控的案例；scripts/verify_chart_study_samples.py在服务器使用现有混元、最多同时2请求，不用真实客户信息，不建用户、不扣客户解读额度。初轮发现八字季节体系、梅花生克方向错误及原文编号/字形误杀，修正后重跑全27；最终原始全量26/27，余一条“五行方向如何区分”的对照问句经复核为合法教学内容，补精确判别测试而不是放过错误肯定句。另新增择日原文后2项真实重测均通过。
- 最终交付证据按原始真实输出逐项复核27/27通过当前门禁，见19_最终交付案例逐项核对.json；每项保留实际输出源commit及原证据文件，不把早先失败记录改成成功。生成正文约1079—1916字，抽读关键方向、原典边界与语气；没有专家逐条签署或全部真机/客户会员验收，不能用此称全内容准确无误。初轮、重测和最终输出均是有效核查证据，保留于E盘19_*。
- scripts/deploy_chart_study_quality.py按固定Git源、当前server与模块SHA进行精确三处替换/模块更新，语法和加载检查、PM2健康、失败回退、仅留一份.previous；以后可用--modules-only与19_后续规则更新基线.json做受控服务器更新。旧deploy_liuren_study_policy.py已注明只适用统一包装器之前的钩子，不得重套旧钩子。
- 06:51:51Z全工具挂接上线；06:58:14Z追加择日原典服务器更新，源1b6015aa647041784b874b179fc6896614fd456e。server SHA589b88b733db1910878697b16b5aae92b66719ddc118080e56eb021ebf39e93b，chartStudyQuality SHA371767e5cca86d7604495dd3b66d12d85fd1ea1335310ff406dc1f6ed132c3d5，toolStudySources SHAea9a0a64db108196eaf84d4d3dc538fe826ffbac93769d401c4b59e9e810f4ee，大六壬模块仍534d8d0596747c0e2bc3fee0d947db13a91fd4282317edfbd4ee3c0305a96978。正式服务器模块加载逐个识别27项，PM2健康通过，无*.next.js残留；不是仅凭代码在仓宣布生效。
- 本轮只改服务器报告内容规则，不改客户端能力，无需再打包；网页与Android2124/Apple34仍为74节已有交付，正式Apple30及各商店本轮未操作、未冒称新提审。旧本机AI缓存最长7天，不自动重写，只有到达服务器的新请求受本次规则控制；不得为刷新内容删用户数据或要求重复购买。后台开关、渠道限制、支付权益与数据库/密钥未修改。
### 75.4 制度、收尾与下一步
- 唯一制度新增第十六节，将全入口覆盖、细节与共情、真实引文、不能编造、服务器维护及验收边界写成强制要求；根AGENTS已要求每次阅读该制度，无需复制第二套指令。具体修改绝对路径见E盘19_修改文件绝对路径索引.json。
- 本轮不在C生成node_modules、ZIP、构建、解包或临时脚本；合成案例/检查器/维护部署器有明确长期用途已入Git。远程暂存*.next.js清除并读回为空；E只留真实回归和部署证据，不新增竞争交接报告。原单一CMD及包保护SHA db3548e89e603fc04cef15570c667619c138cd71f0614784191973b65c387e18未改、未执行；历史物理两代清理/07/09/10及全量专家真机验收仍未完成，不借本轮更新宣称全部完成。
- 当前可回退到server.js.previous（9533e0...、原大六壬534d8d模块仍在）并重启服务，再验/api/health；不恢复数据库、订单或密钥。后续单改共情/文献内容优先走已核服务器模块更新，算法、原生交互或新能力仍须正常客户端发布。
- 下一步是继续完善尚未核专属文献并由专业人员审校，用户用已有34/2124发起新请求做实际购买扣次及报告阅读验收。源码有效改动已提交推送；权威报告、根兼容及两份E镜像、制度、入口和总账同步核SHA，最终提交/空git状态/上游0/0见E盘19_最终提交与同步核验.json，不能把文档自身提交号写回自身造成反复脏改动。


## 76. 2026-10-21 安全评估整改、真实审计后台、安卓2127与苹果35内部测试
### 76.1 本轮目标与真实边界
- 负责人要求修复安全评估指出的后台、身份鉴权、日志和敏感内容筛选问题，更新安卓下载；随后明确TestFlight购买提示不合理、所有易学AI要有专业依据与情绪关怀，并尽量由服务器维护。只处理言道国学，未操作学外语迁移、其他产品或新建正式商店审核。开始已读父级/本仓AGENTS、唯一制度、75节与总账；起点9c50ce5干净。
- 核实修订后的《网络安全法》第二十三条第（三）项、第二十六条和GB/T22239-2019官方信息。后台可访问、手机号验证与留存配置不等于本轮安全评估已通过；手机号短信验证证明号码控制权，不冒充身份证/运营商三要素实名或专家合规签审。没有补造六个月历史日志。
- 正式国学数据库只做加字段/索引等前向兼容变更，未恢复旧库、重排用户或改购买权益。最终162账号、手机号验证完成0个（尚无真人短信验收）；独立公开号序列founder100000、last_issued100076，仍沿用68节不可回收编号机制；SQLite历史高位seq999999939不是公开编号分配器，不能误重置。验收没有在正式库创建合成用户/订单或扣客户额度。
### 76.2 身份、权限与真实管理后台
- 新增backend_deploy/businessIdentityGate.js，在业务路由前统一校验访问JWT、实际存活账号和phone_verified_at；只有登录/短信引导、公开版本价格、必要自助注销/私密反馈及签名回调等精确method+path例外。拒绝refresh作为访问令牌、缺失/停用/删除账号；不能用客户端传phoneVerified或仅有phone字段跳过。认证入口另加IP+路径限流，OTP安全随机且错误5次失效。
- backend_deploy/register_routes.js、middleware/auth.js、verificationStore.js补真实短信绑定同一原账号、密码/短信/refresh停用检查、注册DTO读取修正；不历史回填验证，不解绑别人号码，不重建用户。src/components/BusinessIdentityBoundary.tsx全局阻止未验证业务视图渲染，保留原号/权益，提供登录、短信绑定、账号设置、注销和私密反馈入口；login取消游客业务放行。
- adminRoles.js未知角色不再默认超级管理员，分离后台身份与用户身份、独立角色/范围及稳定操作者标识，新增SECURITY_AUDITOR仅可GET审计与whoami；旧1000行审计截断去除。adminPrivacy.js递归隐藏敏感凭证字段。真实后台入口https://yandaoguoxue.yandao.vip/admin/security/，不是数据库导出截图。管理密钥沿既有受保护配置，不公开、不新建长期验收密钥。
- src/app/admin/security/page.tsx真实查询分页日志，admin shell按whoami收敛导航；src/lib/admin/client.ts等退出事件立即卸载后台视图，已在真实浏览器复现旧退出残留并修复、再次验证退出直接回登录页。使用明确标记、300秒只读验收会话，无更广数据操作；该临时会话已过期，文件删除被自动审批拒绝，见76.7。
### 76.3 六个月日志、备份与敏感内容
- securityAudit.js建立独立SQLite持久审计库，记录请求开始/完成、拒绝、用户/管理员主体、操作和请求编号；同步FULL、0600、append-only触发器与逐事件SHA链。业务接口不能更新删除审计；不自动清理，不收正文、验证码、令牌或查询字符串。首次真实事件2026-10-21T08:43:46.109Z；最终抽查179条链有效。请求开始时尚未识别身份可为anonymous，完成/拒绝记录对应已核主体，不能把开始事件误当鉴权放行。
- /etc/logrotate.d/yandao-guoxue原14轮改daily rotate200，去maxsize避免一天多轮侵蚀留存；nginx guoxue_log去query/referer，写同一X-Security-Request-ID。nginx -t、logrotate --debug和真实HTTPS请求/实际访问日志逐项匹配通过，未删除旧日志。保留至少六个月是持续运营责任，不能当前只有当天记录就声称已经六个月。
- securityBackupJob.js与backupEngine.js使用既有AES256GCM加密配置，不下载密钥；每天03:20服务器时区任务，独立目录/root/yandao-security-backup。先快照、加密、隔离解密、SQLite integrity_check与审计链验证，保留当前+一个可恢复前版；失败尝试不淘汰最后成功恢复点。最终178条快照77858字节，SHA60bacf4e7ddbcbf45c76ea2021d0f9ecd0ce5a0e3bedbf2eaa09b0f8a25cba5f。隔离明文临时文件已由维护任务清除；backup_work另保留两次COS失败尝试的密文与manifest共4个小文件，供故障重传/核查，不冒称该目录已空，COS恢复后按有效备份再轮换。
- E盘独立密文副本位于归档/.private/安全审计备份/security-audit-current.enc，旧current轮为previous，SHA与服务器一致；目录限制本用户访问。COS既有静态存储身份仍403，最终job明确ok=false/offsite_upload_not_confirmed，不能把控制台已登录、APK上传成功或E副本冒充自动COS备份/云端恢复成功；未扩大IAM或公开私密日志，权限仍待处理。
- publicTextGuard.js在旧写接口增加本地风险语境筛选和真实留痕，回调原文/私人举报豁免；复用既有studyCommentSafety本地词规则+混元AI审核、用户明确同意、失败/模糊/预算不足hold、举报/屏蔽/处置。实际恶意医疗保证语境写入前422；不能宣称一个敏感词表覆盖所有政治/违法语义或已有正式TMS认证。国内公共社交继续原渠道门禁，未为过审隐藏开放能力、未绕过评估要求。
### 76.4 购买提示与有依据的情绪关怀
- EventDivinationPanel原“暂不开通”改为次要“返回解读”，去“会员无限看”；AIAccessLinks把开通会员、购买AI点数改醒目按钮，iOS另有恢复购买直达锚点、购买反馈。AppleLearningStore原生StoreKit购买/恢复流程、商品ID/价格/幂等及同账号保护保留，未跳外部iOS支付。
- 查实getPermissionStatusFromServer旧逻辑在非200时回退本地权益，可能把验证/网络失败误成购买条件。现在服务端手机号未验证、服务故障、网络异常均不可用但needPayment=false；明确验证或稍后重试且无需重复付款，并触发全局身份重查。共享事件、独立按钮、紫微、易学问答、号码批量等不把这些状态展示购买入口。真实日志确有苹果context与AI quota的手机号验证403，不能将其解释成“没有会员”；新包需完成原账号验证。
- 服务端chartStudyQuality.js v2（7beed9f）已原位上线，SHA865a444f04a358646aada826ae4cb6ecfbfa29d3a724abc1dc68cc0365ed7f55，toolStudySources.js SHA7b0897bdb51b27315292103d628dbd3ad025fc647b805411ff418ea92434e01f；不改服务器主文件三处钩子，保持75节27个现有命名入口覆盖。先回应真实问题并充分解释当前字段、推演链、条件与对照；不强迫反复显示“未核原文”等内部状态，不用缺项/免责代替服务。有可靠原文才引用，其他自然标AI辅助方法解析，仍禁止伪造篇卷、奉承、恐吓及付费化解。
- 本地AI/来源12项及安全7项通过，真实HTTP/JWT/SQLite/短信fixture、苹果鉴权/幂等等云回归通过。实际混元合成复测八字、手机号码通过；六壬初次出现土克土等错误，被质量门禁拦住，保留失败原输出；再单独生成1764字通过。不是专家全工具签审，未将75节旧27例冒称全部按v2重新生成。真实购买仍未核对负责人账号/恢复提示，生产苹果订单表此前0笔、只允许一个既有沙盒账号；不扩大白名单，不要求重复付款，不冒称会员到账已修复。
- 这些分析规范、文献材料、服务器开关与价格继续由受保护后端维护，普通规则/文案更新不必反复打包；旧本机缓存不自动重写。购买按钮/身份边界属于客户端改动，本次正常重新构建，不能用远程可执行代码绕审核。
### 76.5 最新包、官网与平台真实状态
- 原生候选源9daff6306a45b81b849c32a8879a4ce1be1238d3。Android25.0.115/2127：tencent APK78333319字节SHA3efda290c7820546c36bf555a15c9f2e2e4d17ec74b680b2033da7a370afec7f，AAB62344758字节SHAd2909e514d60a466d75822a36b3ff27a8eb544c0f97de64cf7ece7dc34fee4ef；internal APK78379963字节SHA7272ce622299918b2709d3e74c65cc0c377d1b1bf608536dd07a3fd8d6fa36a0，AAB62391401字节SHAb13defa31ed09d74bc07cada0a0cf32fed3c5049b6462bfea91a75e1fbf1092c。云39577052845/39577058459成功、原签名8ca0c414…不变，11天体贴图核SHA、28未授权动画未入包。tencent维持国内公共AI/社交审核门禁，internal仅供已有授权功能测试，不混称同渠道开放。
- E发布包/Android_25.0.115_2127_tencent及_internal/保留APK、AAB、verified-packages.json。COS yandao-guoxue-1300262413/app-download已上传版本化2127与latest.apk，www.yandao.vip及yandao.vip两域固定地址CDN刷新完成，两个URL整包回读同2127 SHA、78333319字节、Age0。2094旧版同SHA备份yandao-guoxue-25.0.107.apk保留可回退，未盲删云端历史包/其他产品。版本化正式入口https://www.yandao.vip/app-download/YandaoGuoxue_25.0.115_2127.apk。
- publish_verified_android_release.py先核CI源/成功、整包公网SHA，CAS替换data/app-release-config.json并留一个.security-previous；真实版本接口已从2094更新2127，downloadUrl使用不可变版本链接，forceUpdate=false，不强推未经真机验证的国内包。appVersionRoutes.js给Google返回Play渠道且无APK、iOS继续无APK/无强更；未改Google迁移。配置SHA67c46369e7be5aae878689483c9eb94e7cb89cb34ddfad28274b31be5f881fc2，模块SHAd744b92b9e5fbf502e681c0039f137710444940351666c2832d9897ea4f8d84c，实机与商店发布仍未验证。
- Web最终源f7a5926910c4548e14579875534c5d391e751718：39578524329成功，artifact12335885804 ZIP SHA8b2a574e96f497b2ba767986ef98e705345432698dda01d8361b9af32624b829；2322文件86546874字节逐SHA核验，09:43:00Z切/root/yandaoguoxue/releases/v25.0.115-calendar-community-f7a5926，上一版9daff63保留。只多8个传输文件，维护原营销/原典索引和已验证2124链接。官网纠正“永久登录”“全功能免费”“下载安装即用”及苹果未上架即跳商店等旧说明，未为此网站文案再发一轮原生包。公司官网真实国学入口仍指向国学/download，其他子站与产品不动。
- 苹果25.0.115/35：云39577063693签名IPA45504132字节SHAc79226a07f7ba5110875f82827740912c77d8f665db9d2aa78e417486249b92e；E发布包/Apple_25.0.115_35/核Info.plist、资源与SHA。39577751247只上传已核同一IPA成功，未重建；2026-10-21T09:41:52Z build ebc237bb-a52b-4fd0-a3d9-5e3d7e7345e8为VALID/IN_BETA_TESTING、既有“言道国学”内部组已附，无新测试人/邀请。正式仍build30、任务b574a73e-d8d3-42fb-95d3-0776ccdad897 WAITING_FOR_REVIEW，35没有被声称正式提审/发布；未撤原审核或重复提交。
### 76.6 验收证据、未完成与回退
- 全部本轮证据在E归档/发布包/实机整改_20261018/20_*；20_修改文件绝对路径索引.json列本仓具体改动。关键为线上真实鉴权与审计验收、真实访问日志关联脱敏、最终账号序列与链、最终加密备份状态、真实后台截图/退出状态、原生verified文件、云构建与上传结果、两个固定下载整包核验、苹果35内部/正式只读状态。截图来自真实后台/官网，接口200、代码入包、合成回归都没有冒充实际用户购买或等保结论。
- 尚待：负责人用35/2127同一原账号做真实短信绑定、购买恢复/权益到账、手机号未注册与存量账户、设备安装等验收；COS自动身份权限与云端恢复；内容专家与全部07/09/10、历史两代物理清理仍未全验。现有账号尚未完成手机号验证，不能提前把新门禁写成真人已通过。真正身份证/运营商实名或安全评估验收须另有实际服务/机构证据。正式待审30也会受新服务端门禁约束，审核演示账号尚未做真实手机号验证，不能声称审核访问不受影响；不得伪造验证时间或对审核放宽门禁，应由负责人验证实际演示账号后核验访问并如实更新审核说明。
- 回退必须保持安全门禁：Web可回9daff63，服务器模块/版本配置按本轮CAS证据与.security-previous恢复并验health，但不得恢复用户/订单库、删除日志、恢复旧匿名业务/未知角色放行、停用过滤或改密钥。公开2094只作为历史回退证据，不能因客户端旧就放松服务端鉴权。
### 76.7 清理、唯一交接与收尾
- 本轮维护脚本/测试有长期用途入Git；C盘不生成node_modules、ZIP、构建、解包或模型输出，云产物RAM校验后仅E归档。服务器隔离备份明文临时物由备份程序清理；日志与审计证据依法保留。E的latest.apk为同文件硬链接，不复制第二份包字节。2125/2126为过程候选，没有新增商店提交，明确纳入人工清理。
- 既有唯一CMD C:/Users/ZhuanZ/Documents/Codex/2026-10-17/e-c-users-zhuanz-documents-codex/outputs/guoxue-clean-20261018.cmd已加2127双渠道/Apple35存在与SHA保护、保留2124/34及活跃审核包保护，执行前要求人工确认新版已测试；规范CP936 CRLF。新增逐文件SHA删除2125/2126过程APK/AAB及过期只读session.json，保留有效部署/验收JSON，不删任何源码、审计日志、私钥或其他产品。CMD SHA6c7bc2271372aba4346da2bda9ff8f99457ee9d2673132dd0f3c4ed17542576c，未执行，不宣称物理清理已完成。
- 自动审批曾拒绝删除归档/.private/安全验收临时/session.json，仅返回blocked by policy；未通过其他方式绕过删除。会话已过期、目录限本人；准确删除已在唯一CMD。负责人也可单独CMD执行：del /f /q "E:\八字命理类文档包括排盘方式电子版\言道国学项目归档\.private\安全验收临时\session.json"。需读回结果后才记删除完成。
- 制度第十六节按最新关怀要求修正内部核验话术，第十七节固化身份/真实后台、六个月日志、备份失败如实、敏感内容与购买错误分流、服务器维护及发布校验。继续只编辑本目录报告，根与E均是镜像；最终文档提交推送、空git状态/上游0/0、四份报告及制度/入口/主账本SHA见20_最终提交与同步核验.json。不把当前文档自身提交号写回自身造成无限脏改动。


## 77. 2026-10-21 完整接管报告：版本、功能、部署、应用商店与待办

### 77.1 范围、阅读顺序与工作区
- 本节统整当前接管事实；76节是安全/购买具体整改证据，67节是苹果正式提交授权与回执，65及68—75节是具体功能、资料与验证历史。开始前必须阅读父级和本仓AGENTS、唯一制度、主账本与本节，不把本次整理称全部需求验收完成。
- 活动仓唯一位置：C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance；GitHub wzmpa18/minglizyi，分支codex/tencent-store-compliance。本轮起点d79ca5f8f3c43ee9717d1ff40e18d7ffc25d7ea2干净。旧main/2072说明仅历史，不切错仓、盲提交继承源码或整仓覆盖服务器。
- 可编辑交接位置为本仓/交接报告，报告FINAL_PROJECT_HANDOVER.md及制度/README在此维护。根同名文件、E盘归档/交接报告与归档/核心备份/20261007_v25.0.107_紫微大运流年联动只是镜像，不另建第二个“最新报告”。
- 本轮重新实查Apple API、Google官方迁移/发布/正式版本列表、OPPO/华为读取边界、公开接口、服务器部署及5个实体包。没有修改应用业务逻辑、重新打包/部署、变更用户/订单/权益、扩大权限、操作其他产品或发新正式审核。核对时间统一看21_*的checkedAtTokyo（UTC+9）。

### 77.2 当前版本与交付文件

| 交付物 | 版本/来源 | 实际使用边界 |
| --- | --- | --- |
| 国学网站 | f7a5926910c4548e14579875534c5d391e751718 | 正式https://yandaoguoxue.yandao.vip/；本轮current与HTTP重新读回。与原生9daff安全/功能主体相同，另有网站下载说明修正，不宣称所有字节同源 |
| 国内安卓 | 25.0.115/2127，tencent，源9daff6306a45b81b849c32a8879a4ce1be1238d3 | 已在COS/官网直接下载；仍保留国内公共AI/社交资质门禁，不等于各商店受理或全部功能开放 |
| 安卓完整功能测试 | 同号2127、同源码，internal | E盘独立internal目录；只作授权测试，不改名当国内正式/Google渠道包，真机未全验 |
| 苹果内部 | 25.0.115/35，同原生源9daff | 已上传、VALID/IN_BETA_TESTING、既有内部组可测；不是正式审核候选 |
| 苹果正式 | 25.0.115/30，源53e4f3608202ce770c3565fb805fb9e83038f340 | 原任务仍WAITING_FOR_REVIEW，未被35替换 |
| Google已备专用候选 | 最后已核2120 Google，源53e4f36 | 尚未成为已发布更新；2127只构建tencent/internal，不存在本轮2127 Google构建证明 |

- 实体根E:/八字命理类文档包括排盘方式电子版/言道国学项目归档/发布包；当前目录Android_25.0.115_2127_tencent、Android_25.0.115_2127_internal、Apple_25.0.115_35。verified-packages.json/verified-package.json给出源、任务、渠道、字节、SHA，本轮5个APK/AAB/IPA再次逐文件核SHA通过，见21_本轮最新版包重新核验.json。
- 国内APK SHA3efda290c7820546c36bf555a15c9f2e2e4d17ec74b680b2033da7a370afec7f；internal APK SHA7272ce622299918b2709d3e74c65cc0c377d1b1bf608536dd07a3fd8d6fa36a0；Apple35 IPA SHAc79226a07f7ba5110875f82827740912c77d8f665db9d2aa78e417486249b92e。安卓原签名8ca0c414573d4b05fc2bd1ba9c6a2a8090c90c58e3815119494607443dc6d5a0。
- 下载页https://yandaoguoxue.yandao.vip/download/，版本化APK https://www.yandao.vip/app-download/YandaoGuoxue_25.0.115_2127.apk；两个公司域名latest.apk在76节已全包核SHA/CDN刷新，本轮版本接口重新确认2127、不可变地址和forceUpdate=false，不因整理报告重复传包。公开旧2094备份仍有回退用途。
- Web current=/root/yandaoguoxue/releases/v25.0.115-calendar-community-f7a5926，上一9daff63保留。构建、上传、官网发布、内部可测、商店审核与真机验收是不同状态，不互相代替。

### 77.3 各应用商店完整交接

| 平台 | 实际版本与状态 | 本轮依据 | 下一步及禁止误操作 |
| --- | --- | --- | --- |
| Apple App Store | App6807592575/com.yandaoguoxue.app，25.0.115（30）WAITING_FOR_REVIEW；任务b574a73e-d8d3-42fb-95d3-0776ccdad897 | 本轮API重新实查，无错误 | 先处理审核演示账号真实手机号验证与原用户恢复到账，再按实际审核状态决定候选；不盲撤重交，不把内部35写成正式35已受理 |
| Apple TestFlight | 35，VALID/IN_BETA_TESTING，build ebc237bb-a52b-4fd0-a3d9-5e3d7e7345e8，原言道国学内部组已附 | 本轮API重新实查 | 用户更新35，用原账号短信验证和恢复购买；以服务端幂等账本/实际权益确认，不凭Apple弹窗发权益、不重复付款、不扩大沙盒白名单 |
| Google Play | com.yandao.guoxue/App4973402841775693769；2081（25.0.94）明确已上架；2118（25.0.115）更新被拒，发布概览仍有11项待送审，自管式发布开启 | 本轮已登录发布概览和正式版本列表实查 | 健康功能需组织账号，先迁移再做最新Google专用候选和准确申报；不要点当前“提交11项”重交个人账号2118，不把2127国内AAB改名上传 |
| Google迁移 | 个人8539674148718133275→公司8056957676688740507；当前仅com.yandao.xuewaiyu，目标已接受、Google待处理（2026-10-20），没有国学转移条目 | 本轮已登录官方转移页实查；固定监测JSON更新 | 保留原学外语请求，不取消/修改/重提交、不关闭个人账号；完成后才办国学，法人/唯一股东关系如实填、不猜验证码/注册交易ID、不删真实健康声明 |
| OPPO | App37853023；最后实证线上25.0.114/2101，2118进入升级编辑但最终保存/提审未有回执，截图替换未完成 | 本轮指定详情页回欢太登录，不能重新确认当前线上/草稿 | 下次登录先读已保存草稿/当前版本/联盟记录，再核包和图；不能称官网2127已进OPPO，也不盲点提交 |
| 荣耀 | 最后公司列表只有学外语901055770、无国学独立记录；历史有经OPPO联盟拒审/同版入库提示 | 本轮沿用66/67节最后证据，未刷新荣耀 | 待资质后从原OPPO分发/入库核归属与受理，不因无列表就重复创建国学或再次同步同版，不称通过 |
| 华为AppGallery | App119286157/com.yandao.guoxue；最后商店实证25.0.109/2096待修改/未通过，另25.0.111开放测试草稿；旧5问题见11_华为旧版拒审_* | 本轮审核URL仅空壳回首页，未读出应用详情，没有新通过证据 | 等资质/可用登录后重核测试账号、AI内容/安全评估、生成标识、购买/客服等拒审问题。“华为已装2116”是手机安装读回，不是商店回执；65节已加注澄清 |
| 腾讯应用宝 | 最后项目记录25.0.108/2095需整改 | 历史记录，本轮未登录/未提交 | 等资质，先读最新拒审和待办再核候选，不能写2127已受理 |
| vivo/小米/其他 | 尚无独立有效提交/批准回执 | 本轮未操作 | 按“其他等资质”暂停；OPPO联盟或目录有安装包不证明独立商店发布，不操作其他产品 |

- Apple正式原30包含App+8内购共9项；“审核后自动发布”只是设置，不代表已经批准。旧拒审历史COMPLETE不等于当前正式任务已通过。
- Google本轮明确读到旧2081上架，2118被拒是更新被拒，不是全应用下架。原学外语请求的业务关系选项是已有填写，本轮未改，也不能照抄给国学。既有google安静跟进计划本轮未改。
- 表中实查级别不得删除：不能把Apple/Google本轮读回日期套给荣耀/应用宝。OPPO登录失效和华为空壳也不能推断为应用被删除/审核通过。暂停渠道没有本轮新提审。

### 77.4 功能和学习内容覆盖

| 模块 | 已实现/已有证据 | 未完成或待验收边界 |
| --- | --- | --- |
| 八字、紫微、六壬等 | 计算、局部研习、笔记/跨盘跳转与讨论等接线；六壬课体纠错见74；27个AI命名入口统一服务器标准 | 不宣称竞品全功能1:1；每种盘式/副星/连线/算法边界及双用户真实操作仍需逐项验收 |
| AI与购买 | 具体输入→规则/条件→对照复盘→来源/AI归纳，温和回应；购买按钮与验证/故障分流已入2127/35 | 原账号月/季/年订单到账、恢复/取消/退款、跨设备额度仍未全链确认，模型长文不代替付费交付证据 |
| 工具/穴位文字交流 | 500字、账号、审核/举报/屏蔽和异常hold基础已接 | 国内公共社交门禁仍在；旧已公开资料、图片/长稿、申诉例外和真实处置未全部验证，不宣称全渠道开放 |
| 同辰/同证研习 | 成年自愿、目的隔离、字段授权、主题讨论/医案引用/私人摘录等既有实现 | 两名自愿成年人双设备加入/接受/撤回/屏蔽/退出；10号分歧整理与主动AI提供商/费用确认等仍未全验 |
| 活盘/人生记录/本地健康档案 | 09号数据域、本机密文/图片、主动分享副本、锚点和ACL等已开发 | 全工具分享/撤销/接收权限、不同解读者、密文备份恢复和持久性须真实验收，不把本机模拟当服务者批准/真实交易 |
| 日历/导航四语/国风/组件 | 日历、农历生日规则、主题、提醒、WidgetKit/AppWidget已有代码和构建；日英仅导航按钮 | 真桌面/锁屏、通知权限、闰月/2月29日、取消修改、重启/强停/功耗未有全量设备证据，不承诺任意机型接管息屏 |
| 古籍、课程、连续听学 | 整本内容包、远程revision4/31课、医案/经方原典、归真36部622篇卷索引等见70—72；原文/来源保留 | 索引不等于现代教材均获授权；现代医家讲义/音视频及药典/题库/方剂仍需合法来源、完整性与专业逐项核验，不以节选冒充全书 |
| 穴位/中医/正骨图 | 开放许可骨骼图、原文/循行示意与术语纠错；28张未授权动画从实际包剔除 | 361/现行362版本、董氏逐穴准确图、筋膜/逐关节及医学/医考专业审校仍不足，不能称精确全集或个人诊疗功能 |
| 天文馆/五运六气 | 定位、时间/历法学习和11张已核高清天体贴图、观察缩放/介绍等基础 | 非Stellarium全功能替代，星表/长期精度/全部天体及宇宙尺度未全验；传统运气不能冒充现代疾病/天气预测 |
| 学堂管理/反馈/公司信息 | 管理员验证、用户反馈、既有配置设施/公司与子站入口保留 | 注册不能自动授管理权；公司官网AI业务闭环属另一项目，不混入国学本次完成范围 |

- docs/requirements的07/09/10契约本轮仅加最新交接指针，保留原阶段IN_PROGRESS/NOT_ACCEPTED等状态，不改PASS。release-readiness.overallComplete仍false，candidateSource仍原正式30并注明范围；apple-owner-release.json没有被扩为35授权。
- 按负责人要求保留已有功能、完善增加。未验项不能通过删入口、改布尔完成标记、换宣传图或AI写长文销账。完整原始证据仍在65、68、70—76节及相应E归档。

### 77.5 部署、后台、数据及远程维护
- 公司主站www.yandao.vip/yandao.vip静态官网及APK主要走COS/CDN；国学网站目前仍是82.156.228.87 nginx/current托管，API=/www/yandaoguoxue-backend，PM2=yandaoguoxue-backend。不能写成全部网站已迁COS。公司国学下载仍链接产品/download，不改其他产品。
- 账号权威库/root/backend-auth/data/yandao_users.db；本轮只读162账号，手机号验证0个，持久公开号创世纪100000→已发100076。未来注册读独立持久序列，不把100077写成永久下一号；历史高位SQLite自增不是分配源，不改旧用户ID/订单/好友，不整库回退。
- 后台https://yandaoguoxue.yandao.vip/admin/security/为真实分角色、范围与只读审计入口，退出已清空视图。业务统一有效访问JWT+实际账号+手机号验证；管理另鉴权，精确回调仍验签。本轮匿名admin/AI/social实际401，health/版本/下载说明200。
- 日志最少六个月，访问/错误/PM2配置200天日轮换，不记录凭证/正文/query。首次真实审计自10月21日，不补造历史；手机号控制权验证不等于身份证/运营商三要素实名，具备后台/日志不等于已通过安全评估。
- 服务器审计加密current/previous和E独立密文实际解密/完整性/链校验已过；自动COS私有备份仍403/offsite_upload_not_confirmed。本轮只读确认失败状态，不能拿APK上传成功当备份权限已修好；需最小权限与真实云端恢复，不公开日志或密钥。
- AI规范/原典材料主要由后端chartStudyQuality.js、toolStudySources.js及六壬模块维护，既有阅读器课程可从受保护学堂资料发布更新，既有价格/开关沿原设施。纯文本/已支持资料优先服务器；新交互、算法、原生权限/支付/组件仍须正常重包验证，不能远程执行脚本绕审核，旧本机缓存不自动改写。
- 维护工具为scripts/deploy_chart_study_quality.py、deploy_security_assessment.py、configure_security_operations.py、deploy_verified_web_preview.py、retain_verified_study_packages.py和publish_verified_android_release.py。先读参数、固定源码/旧SHA与对应证据，再部署；服务器server.js有历史运行差异，不能整仓强盖，不能拿旧期望SHA盲执行。
- 苹果私钥唯一专区E:/八字命理类文档包括排盘方式电子版/苹果开发者/；国学最新AuthKey_URY888FLWG.p8及负责人指定中文说明，报告只写位置/公开ID。私钥、口令、JWT、验证码、注册交易凭据不进Git/聊天/日志；不撤其他产品仍依赖旧钥、不改外语/数字管家构建。

### 77.6 问题台账与接手优先次序

| 优先级/责任 | 待办 | 真实完成判据 |
| --- | --- | --- |
| P0 负责人协助+开发 | 原账号短信与Apple原月/季/年订单恢复到账 | 更新35，在原账号验证短信→恢复原签名交易→账本幂等→实际会员/点数可用；只为确认账号配沙盒，不猜用户、不重复付款 |
| P0 负责人协助+开发 | 正式待审30演示账号受新门禁影响 | 实际审核账号验证手机号并核完整访问/购买，按真实状态更新说明；不假验证、不对审核降门禁、不盲撤重提，未验不能称审核准备齐全 |
| P0 云账号负责人+开发 | 自动COS私有审计备份403 | 明确最小私有前缀权限，修身份配置后真实上传/隔离下载解密/完整性与链恢复；失败保持红状态，不用公开访问换通过 |
| P1 开发+负责人 | Google公司迁移与新渠道候选 | 等原学外语完成→公司验证/国学表单→必要当时条款确认→迁移完成→最新Google专用包和准确营销申报，去重后送审 |
| P1 专业内容人员+开发 | 医学/古籍完整性与版权 | 原文版本/许可、穴位/董氏图定位、题目答案及医药术语逐项专业核验；未授权不入包，原始资料不当垃圾删，不将AI图当精准图谱 |
| P1 两位自愿成年人+开发 | 07/09/10、工具/交互、组件/提醒全量验收 | 同候选双人双设备真实操作与异常/重启/权限证据，截图录屏归档；不是仅API200/编译或接口占位 |
| P1 商店负责人 | OPPO/荣耀/华为/应用宝资质与版本 | 登录先读真实拒审/草稿/同版，满足资质后核渠道包/截图/说明/账号，并取得独立受理及批准回执 |
| P2 负责人执行+开发核验 | 一次清理、两代轮换及历史主树/服务器目录 | 新版确认正常后保护当前/一份有效回退及仍审核/迁移用途，执行唯一CMD并实读删除结果，再核Git/SHA，准备清单不等于清理完成 |

### 77.7 营销与正式提审操作说明
- 文案基础docs/marketing/20261020/store-copy.json，E实机整改_20261018/商店营销_20261020保留真实界面组成图；Apple29_actual_screenshots保留iPhone/iPad模拟器原图。原正式30沿用29未改页面，不标成35物理截图；下一正式候选需要核新手机号/购买/社交界面，更新真实图与申报。本轮没有更换商店图片。
- 按实际渠道宣传原典研读、连续听学、学习工具、主动自愿同辰/文字讨论、私人记录和日历，不宣称精准预测/个人诊疗/全资料专家认证或全部渠道开放。国内关闭功能不写可用；Google不加外部数字支付，iOS原生IAP；年龄、UGC、健康、隐私/数据安全按实际核对。
- 恢复任一市场时依次：读应用/版本/草稿/审核记录→核正确包名、渠道签名与版本码→验证审核账号→核真实图和文案/声明→处理资质→同版去重→按授权提交→保存回执并独立回读。上传、草稿保存、受理、通过、自动发布各自记录。
- 本轮未点Google“提交11项”、未改/取消学外语迁移、未撤Apple30或把35当正式、未重同步荣耀。原apple-owner-release仅授权30，未来换正式构建应据负责人新指令与具体准备更新，不能改授权文件假装新构建早已获准。

### 77.8 清理、回退、证据与交接收尾
- 本轮不打包/部署、不建预览进程，C盘未新增依赖/构建/ZIP/解包，不删生产数据或历史证据；3个商店临时只读标签已关闭，原用户标签保留。有效21_*证据只留E归档/发布包/实机整改_20261018，Google监测沿固定文件更新，不建竞争报告。
- 唯一CMD C:/Users/ZhuanZ/Documents/Codex/2026-10-17/e-c-users-zhuanz-documents-codex/outputs/guoxue-clean-20261018.cmd，SHA6c7bc2271372aba4346da2bda9ff8f99457ee9d2673132dd0f3c4ed17542576c；本轮重核而未执行。当前2127双渠道/Apple35、2124/34及活跃审核保护仍在；过期会话/过程2125—26具体目标见76.7。物理清理/两代轮换尚未完成，不重复催用户零散删除。
- 回退照76节固定代码与配置证据，Web前版9daff63；必须保留安全门禁/编号策略、原用户订单库和审计，不用老包恢复匿名/未知角色放行，不整库恢复/删日志/替旧钥。源码有效改动须提交推送、status空、上游0/0，不把文档自身最终commit写入自身造成循环脏改动。
- 本轮实查证据：21_苹果正式审核复核.json、21_苹果35内部测试复核.json、21_Google迁移实际页面.txt、21_Google国学发布概览.txt、21_Google正式旧版与拒审候选.txt、21_OPPO本轮登录边界.txt、21_华为本轮未能读取应用页.txt、21_部署与关键配置只读复核.json、21_公网版本与鉴权复核.json、21_本轮最新版包重新核验.json。历史真实回执、模型失败/复测、用户与设备结果继续保留67节/20_*，不涂改失败。
- 本节/首页快览、入口、主账本、需求检查点同轮提交；四份报告及制度/README/主账本E镜像逐字节与SHA核对。最终提交、干净工作树、上游0/0、全部镜像与本轮清理界限见21_最终交接提交与同步核验.json。本节是完整可接管报告，不是全部需求通过或所有商店已发布的声明。


### 77.9 Google定期只读跟进（2026-10-21T20:32:38.506255+09:00，东京时间）
- 官方转移页仍只有言道学外语/com.yandao.xuewaiyu，目标8056957676688740507已接受、Google待处理；国学没有迁移条目，无实质变化。未取消/修改/重提交原请求、未动其他产品或健康申报，继续安静等待。迁移页原始读回与固定监测JSON已更新，Google旧2081/2118状态沿77.3本轮早先实查，不冒充本次心跳重新核对生产轨道；临时标签已关闭。
- 本次同时收尾负责人此前要求的完整交接整理，提交的文档改动为本线程前段已生成并审查的77节/首页快览、入口、主账本与三个需求最新检查点，不是未知来源脏改动。没有运行删除、构建、部署或正式提审。最终提交/镜像核SHA见21_最终交接提交与同步核验.json。

### 77.10 Google原因核实与Doubao重复资料清理（2026-10-21）
- 官方Google转移页本轮重新读取：只有言道学外语，目标公司账号已接受，Google自2026-10-20仍待处理；国学尚无迁移条目。国学此前组织账号要求的拒审不能靠个人账号重复上传解决；遵照负责人保留现有迁移，不取消、不修改、不重复提交其他产品。
- 负责人本轮明确禁止改动 E:\八字命理类文档包括排盘方式电子版，故只读比较，跳过向该目录内E镜像同步。7899份文件前后路径/字节/修改时间核对无变化；本轮没有改动保护目录。
- E:\Doubao共4320文件、2586869864字节（约2.41GiB）；内嵌资料343份中338份与保护目录存在SHA-256完全相同副本，5份不同资料已复制至 E:\Doubao_独有资料保留_20261021，保留原相对目录，49838字节，逐份SHA-256通过。涉及银行/签名/服务器/苹果资料，不在聊天或源码披露内容。
- 自动审批在启动命令前拒绝整个删除操作，仅返回blocked by policy；没有执行删除，Doubao目录仍存在，不绕过审批。已另行完成不含删除的独有资料保留。用户可自行在CMD执行：rmdir /s /q "E:\Doubao"。只删除此确切目录；不操作保护主目录或新保留目录。不宣称应用注册项、用户配置或磁盘实际释放已完成。
- 全量文件对比、SHA-256与保护目录元数据证据：C:\Users\ZhuanZ\Documents\Codex\2026-10-17\e-c-users-zhuanz-documents-codex\outputs\Doubao_对比与清理核验_20261021.json。无新增构建、安装包、部署或商店提交；本次仅更新C盘唯一报告、C兼容镜像和主账本。

### 77.11 Google只读心跳（2026-10-22，东京时间）
- 转移页仍显示公司已接受言道学外语、2026-10-20待处理；应用表读取两次出现Google意外错误，表格无结果不能解释为迁移完成。未取消、修改、重新提交任何迁移，国学不在个人账号重复提审。继续等待后续真实完成信号，无需用户操作。
- 本轮仅读官方页面并更新C报告和账本；按77.10负责人保护主资料目录要求，不写E镜像，同步仍未完成。临时浏览器标签关闭，无构建或临时包。

- 2026-10-23T07:21:33+09:00心跳复核：官方页仍显示已接受/2026-10-20待处理，应用表继续意外错误（4FD81EE2），无完成信号。未改其他产品、未发起国学迁移。临时页已关闭；保护E目录不写入，镜像同步未完成。

- 2026-10-23T13:25:06+09:00复核：目标公司已接受/10月20日待处理不变；应用表Google错误62CDF859，无完成信号。未动现有迁移/其他产品/健康申报，未启动国学迁移；临时标签已关闭，无临时包。E保护目录不写，镜像同步未完成。

## 78. 安全评估通过后的功能恢复与验证体验整改（2026-10-23，进行中）

### 78.1 最新进展（以下覆盖本节早先“未构建/未部署”快照）
- 客户端源码a5361d7：Android25.0.115/2128双渠道签名构建成功（腾讯39960315648、完整版internal39970667205），Apple25.0.115/36构建及TestFlight上传39960320991成功。后端5313854只改服务端身份体验，不需为同一客户端再打包。
- 完整APK：E:/言道国学本轮发布_20261023/完整版/app-release.apk，78378647字节，SHA-256 acd82963e737f3ada1b8a9447f53b69de4e8bab13a562409b23a2c17b9e29474；腾讯APK同目录顶层言道国学25.0.115_2128_腾讯.apk，78333743字节，SHA-256 1dbf5c52ad955d578dbfaec990901a2b0148faa573abf4624664e1f170b57de1。腾讯仍沿已有AI关闭渠道配置，不得把完整APK或营销冒充腾讯全部功能已开放。
- 后端社会功能五项配置已部署并读回有效true，仍保留鉴权、内容审核、举报、屏蔽、审计及总停止开关。生产social_feature_config.json SHA-256 16df9a51ce90fbe753a92f881715a1b4e1313a6ea101b17cdde2f7305ff9d5be，上一份为social_feature_config.before-assessment-restoration.json。账号、订单、用户编号未改。
- 后端businessIdentityGate.js已按固定旧SHA原子部署并重启健康核验，现SHA-256 2f4aec4b694cdd55e26bea0a1f0a7ec67639a82a52b8bad43cca8eef2a487de0，回退文件businessIdentityGate.identity-previous。私密AI/payment/apple-iap仍须有效令牌、存在且未停用的真实账号，但不再强制二次短信绑定；社交及未知业务命名空间继续要求首次手机号验证。不伪造phone_verified_at，不将控制权验证称为三要素实名。
- 本地安全/社交回归12/12通过。早先HTTP测试因本地缺express失败保留；后续云端完整质量39960315606、39960755115、39971608481、39973064818均成功，未往C盘安装完整依赖。私钥扫描2025跟踪路径通过。
- 完整default配置Web已部署为/root/yandaoguoxue/releases/v25.0.115-calendar-community-5313854，2322文件87392293字节，artifact12509489264 ZIP SHA-256 47b0b3f614c4768f3808e0f6473a517b2d0dcbaa2e3bd1a58afa415ba4f8d8da。前一a5361d7为腾讯配置的过渡发布，不能将其误报为完整AI网页。新版首页浏览器实读，显示学堂/发现/聊天，游客无整页短信墙，实际截图E:/言道国学本轮发布_20261023/完整网页版首页_2128同源.png。
- Apple正式：负责人本轮明确授权恢复并重新上传各商店，已撤原应用项30、选36、更新审核说明并实际提交；新submission e7beba76-98cf-4d8b-9161-cbd32618c60b，页面明确25.0.115(36)等待审核，非批准/发布。截图E:/言道国学本轮发布_20261023/苹果36_正式提审成功.png。build ID2d111b34-1729-426c-8a00-b98fdc715ca3。旧提交8个内购项目与新1个App项独立，内购状态尚须再次核对；没有宣称沙盒订单已到账或所有07/09/10通过。
- OPPO：旧25.0.114/2101上线，新2128完整APK正在上传；已填写学习/交流/同辰真实介绍、版本说明、18+，补盖章安全评估PDF及通过截图，正在替换真实截图，尚无保存/受理回执。原勾选荣耀联盟，不新增vivo/小米；提交前再次核荣耀同版状态与协议确认，不能将OPPO上传等同荣耀受理。
- 华为：已恢复正确公司账号hid77689652；原25.0.109/2096待修改，10月15日报告五项为VIP审核账号、AI解读内容违规、评估通过截图、AI标识说明函及客服联系方式。新2128完整包开始上传，尚未选取/保存/提审。原AI安全评估两页盖章照片不等同平台指定AI内容标识说明函；未找到专门说明函与本公司生成合成算法备案证明，不造证、不套供应商备案冒充自身资质。
- 腾讯：原25.0.111/2098拒审六项，含评估结果截图、生成合成算法备案及标识、截图不一致、暂不收录、气功外市场上线证明和视频跳网页。OPPO旧版已上线可作为真实外市场事实，仍需整理证明。替换2128腾讯包上传后平台提示包名com.yandao.guoxue已有同名应用、要求认领；尚未点击认领、没有新建应用、没有提交。必须先核原appId1112461593与包归属/签名，不能为绕提示另建重复应用。
- 证据在C:/Users/ZhuanZ/Documents/Codex/2026-10-17/e-c-users-zhuanz-documents-codex/outputs/：assessment-social-restoration-20261023.json、identity-experience-deployment-20261023.json、assessment-web-deployment-20261023.json、assessment-full-web-deployment-20261023.json。部署维护脚本scripts/deploy_identity_experience.ps1已入仓。
- 继续待办：完成各店包解析/真实图和资质草稿、核IAP及Google迁移、逐平台获取受理回执；Google须保留学外语迁移且不得个人账号重复提审国学。真机支付到账、双用户社交与医学授权专业审校等原缺项不因本轮构建或提审变成PASS。
- 清理：C盘未新增整套依赖/解包/安装包；两个正式2128渠道包与实际证据保存在保护主目录之外。OPPO草稿重复证明附件已去重为一份，原始证据未删除。全项目物理清理仍未完成；用户保护E主资料目录要求继续有效，该目录只读，E镜像未同步，不宣称交付收尾全部完成。

### 78.0 早先过程快照（仅供追溯，以上述78.1为最新）
- 负责人提供四张beian.mps.gov.cn截图，言道国学APP自评估审核结果为审核通过；显示版本1.0.0，并载明手机号验证码注册核验、人工+AI审核、举报处置与日志留存。截图是通过证据，不推断所有新增功能/商店审核自动通过，不撤后台鉴权或首次交流核验。
- 已修改src/components/BusinessIdentityBoundary.tsx：移除首页、古籍、本地排盘等非交流路由的整页手机号阻断，交流账号入口保留首次核验；已验证账号继续读取服务端持久标记，不因换页面重新发短信。服务器业务接口校验未解除，需联网的受保护服务仍可能要求核验，不能宣称全面免验证。
- src/lib/releaseFeatures.ts恢复国内候选社交界面；backend_deploy/data/social_feature_config.json候选默认恢复动态/评论/群组，运行服务端热加载、同名环境变量总停止、内容筛选、举报屏蔽仍保留。尚未部署生产配置，旧安装包不会仅因源码修改自动恢复。
- Android候选versionCode2128/25.0.115，Apple拟候选36；尚未构建/上传/提交，不能写成已上架。负责人此次明确要求重新上传各商店；逐店先核当前审核防重，Google公司迁移阻塞仍须处理。
- 本地安全/社交测试11项通过；真实HTTP测试因本机缺express未运行通过，不能抹去失败；私钥扫描2024路径通过。将用云环境继续完整构建验证，不在C盘新增整套依赖。
- 用户要求保护E主资料目录，本轮只读原截图，不写该目录镜像；C唯一报告与兼容镜像更新，E镜像同步仍未完成。没有清理或删除用户文件；服务端变更、原生测试、商店新回执与全功能验收均待续记。

### 78.2 2026-10-24 当前正式审核、更正回执与审核账号阻塞
- 本节覆盖78.1内过时的平台过程状态。Apple最终正式任务为8033d82a-74a0-4497-9ff3-57bcaad22f16，25.0.115（36）与8项内购共9项，2026-10-23T15:19:51.573Z实际提交并读回WAITING_FOR_REVIEW。先前仅App项e7任务已撤回，不是当前任务；没有宣称批准或发布。证据：本工作区outputs/assessment-apple36-nine-items-submitted-20261024.json；E:/言道国学本轮发布_20261023/苹果36_九项正式等待审核.png。
- OPPO2128完整包已解析并保存草稿，重新打开加载草稿确认；五张实际学习/听学/交流/同辰/日历界面营销图、安全评估材料、18+及权限用途已保存。华为正确公司账号2128完整包也已上传、选取并明确保存成功，安全评估补件ZIP已上传。两平台尚无本轮正式受理回执，荣耀也未独立确认受理，不能写成全店已提审。
- 腾讯官方空白认领挑战已由原签名证书签名并核对匹配；维护流程.github/workflows/tencent-claim-proof.yml及android-build.yml条件调用已提交bcad055，云运行39979834533成功。签名证明与proof.json在E:/言道国学本轮发布_20261023/腾讯认领签名证明/。负责人当时明确同意国学认领后只点击提交一次，平台转404，没有成功回执。重新读取原应用仍是2098旧驳回记录；当前认领状态未确认，不得盲目重复提交。截图腾讯认领提交后404_待核回执.png保存于同一发布目录。
- 审核专用账号999999927通过现有受保护管理员接口获30天免费测试会员，截止2026-11-22T23:59:59.999Z，没有收费订单、扣款或伪造手机号验证。证据outputs/assessment-review-account-entitlement-20261024.json。负责人提供手机号并尝试短信绑定后，服务端返回手机号已绑定其他账号；审核账号未完成绑定。不得合并账号、转移权益、改原账号密码或伪造phone_verified_at。须使用未绑定的审核专用号码由负责人在页面完成验证；验证码不写聊天复述、报告、源码或日志。
- Google最近实读仍仅学外语迁移：目标公司已接受，Google待完成，国学未迁移。未取消、修改或重提外语；未在个人账号重复提交国学健康功能版本。证据Google迁移仍待平台完成.png位于本轮发布目录。
- 已收到并完整读取粘贴的12号3D整合指令；已通过聊天读取工具看到“聊天版国学项目App”的用户文字和三张解剖图，但该聊天最近助手回答只返回内容引用占位，未取得其中完整来源网址。现有anatomy3d页面为四层模型，不能宣称已具备逐器官隔离、动态血管神经层、截面和准确穴位。公开模型许可与远程离线包接口继续核查，尚未部署新的3D资源或完整新查看器。
- 本轮更新唯一报告及主账本和C兼容镜像；有效源码仍为已推送bcad055及前述提交。本轮没有删除用户资料、安装包或证据，没有新增依赖/解包目录。全量物理清理与真机/双用户/医学专业核验仍未完成。E主资料目录继续按用户要求只读，E旧镜像未同步；不将本次记录更新称为全项目完成。


### 78.3 2026-10-24 12A首选样机、图谱接入候选与验证体验
- 完整读取保护目录内yandao_3d_repository_handoff_12A.txt；仅在独立E:/言道国学3D评估_12A/tcm-3d拉取首选仓库，精确提交e8b9ad1c17e67a25e94406100e3fb5c296c24f7a。先读README/LICENSE/NOTICE/ATTRIBUTION/package及锁文件；Node24.17符合要求，npm ci --ignore-scripts隔离安装。真实模型31文件93838158字节，非LFS占位；未下载九套项目，未混入其他产品依赖。
- 上游类型检查通过，拖动10项、教学25项通过，build:tcm成功。原样机运行于3016后关闭释放内存；未以CPU测试冒充临床或手机验收。
- 新增src/components/anatomy-atlas/{AtlasViewer,AtlasScene,atlasPack,teaching-skin}，复用上游分块网格解码/GPU结构掩码及教学体表适配，接入现有anatomy3d路由且保留原四层。含结构搜索/复合器官隔离/隐藏/恢复、15系统开关、透明度、水平截面、按系统展开、362穴名筛选及现有穴位详情/题库链接。没有引入针刺六工具或疼痛治疗模拟，没有复制AGPL代码；中文尚仅常用词，解释主要为系统概述，不能称全部结构专篇已完善。
- 数据包E:/言道国学3D评估_12A/发布资源/tcm-anatomy-atlas-v3_3.0.0.pack为33799696字节，SHA b1c9a4826551cb54152141e104f405f89dcf497434c6bd3ca7987683b40d2f4b；2234来源网格/3432概念/15系统/362穴名/670体表工程实例。全部点位未经逐穴医学审校。scripts/build_tcm_atlas_pack.py固定源码，资源内分文件SHA及许可；offlinePackClient新增启用前内层验证回调，避免不兼容坏包覆盖已有索引。尚未上传我方对象存储或注册生产资源，不能称线上已可下载。
- 新增/open-source/及public/licenses/tcm-3d，代码MIT与模型CC BY4.0分开署名，完整保留原通知。独立3017样机实际渲染、搜索心脏并隔离已有浏览器画面；图片E:/言道国学3D评估_12A/言道接入_心脏隔离实际画面.png。该图是接入样机，不是安卓/iOS真机或正式上线证明。
- 依据负责人取消重复注册核验的明确要求，BusinessIdentityBoundary取消整页短信表单，仅保留正常登录；服务端已登录账号GET/HEAD读取、私密离线学习服务免二次短信，offline manifest改为精确公开只读例外。发布/发送等写操作仍核验真实既有身份，手机号验证码注册原有成功标记沿用；邮箱验证不伪称自然人实名认证。不改历史账号编号、付费权益或验证记录。此处为源码候选，尚未替换生产，旧APK/IPA内置页面不会自动改变。
- 本轮候选安卓2129/25.0.115，苹果下一构建37待云端构建；36九项正式审核仍以78.2为准，尚未再次撤回。安全本地回归10/10通过；首次旧断言失败已保留过程并修正读写分离测试，不掩盖失败。完整云构建/手机/坏包断网/对象存储/正式提审尚待执行。
- 当前第三方依赖/评估文件仅E独立评估目录，保护主资料目录只读未同步；未删除用户文件或发布证明。样机依赖与临时预览收尾需精确清理，整体07/09/10及医学专业核验仍不标完成。


### 78.4 2026-10-24 01:35东京 12A实际部署、签名产物与本轮剩余项
- 正式源码6087a87de3f0aa8529c4df0f7d1b867c35446f6d：后续修复了双指缩放误触点选、复合器官（FMA概念）选择、隔离时隐藏体表点及按需渲染降耗。完整质量39985579105/39986076027/39986355209成功；后者包含正式Web构建。中途早期原生候选为纳入手势修复已取消，不重复上传相同苹果构建。
- 正式Web现为/root/yandaoguoxue/releases/v25.0.115-calendar-community-6087a87；2333文件87540490字节、artifact12515837622、ZIP SHA e1bfc389a5f55e6ccc248ec5599a945c9edb30651894aa55e74ef3564aa7b3a2。逐文件校验切换，回退5313854。生产聊天页实际读取为会话页，没有整页短信墙；没有冒充邮箱认证为自然人实名，没有删除发布/发送所需真实身份校验。网站截图：E:/言道国学3D评估_12A/正式网页版_聊天无整页短信墙.png。
- 服务端门禁01:24东京已部署6087a87，SHA 0c5758a676b060c0bb6aed0484a08890d365863a2bf8ac16a7c95ab05d00e80a，健康通过，数据库未修改。新规则仅取消账号读访问和私密学习的再次核验；管理员、真实账号、封禁、审计、公开写操作与内容筛选仍保留。原手机号验证码注册已在注册成功时写持久验证标记并经HTTP测试核对，不需换页重验。
- 图谱资源3.0.0已经现有引擎注册、分发我方私有COS的learning_content分区并发布，33799696字节及SHA b1c9a4826551cb54152141e104f405f89dcf497434c6bd3ca7987683b40d2f4b一致，仍为原3D学习会员权益，不改价格、订单或佣金。生产URL为/api/offline/packs/tcm-anatomy-atlas-v3/download，由现有登录/会员检查后返回受控下载；不记录临时签名URL。生产网页登录会员真实完成下载、内外校验、本机启用和心脏隔离，截图正式网页版_COS下载校验与器官隔离.png；不是作者演示站热链。学习分区上传成功不代表旧审计备份403也已解决。
- 发布维护scripts/publish_tcm_atlas_pack.py已入仓，首次注册前因列表返回形状使用错误失败、生产未发布；修正为.list并复用已完整传输且核SHA的暂存包后，实际COS分发/发布成功，未重复传输33.8MB。临时许可探测txt先被扩展名白名单拒绝，合法JSON署名上传成功；没有扩大扩展名白名单或公开存储权限。证据E同目录/发布资源/生产分发回执.json。
- 实际资源解码测试：原包2234网格/362穴名可读取，篡改单个网格字节被拒绝，协议2不兼容被拒绝；测试隔离、无网络，不代替真机/临床校核。证据发布资源/资源校验异常测试.json。完整原生构建验证了11张天体高清图、原学习内容和许可排除规则。
- 安卓25.0.115/2129，CI39986344770成功，APK78420028字节，SHA 515a9f802b1eac23b76cd94e4eb7fbf4f15d6de58967be0528f9209b25b7ba28；AAB62432573字节，SHA 0fbd6cbacb6c579613f1eca68fed22c769d8b99cb9b317cfdb3272605873b6c7。路径E:/言道国学3D评估_12A/原生安装包/Android_25.0.115_2129_internal/。已在连接华为手机执行保留数据覆盖安装，安装Success，读回2129及正常首页启动；未宣称手机内3D触控、断网或购买均已验。真实启动截图安卓2129_实际启动.png。
- 苹果25.0.115（37），CI39986350581签名/上传TestFlight成功，日志明确UPLOAD SUCCEEDED with no errors；IPA45548841字节，SHA 0d7001ef83ef55c350442cd8445809d528480d2193cfd9726506111be40e4236，路径E同目录/原生安装包/Apple_25.0.115_37/。01:31东京API尚未出现37记录，需等待处理，不重复上传；尚不能称内部组可安装。正式仍是36九项等待审核，本轮未盲撤/重提。
- 当前只升级国学Web、后端门禁和3D数据包；未改其他产品/Google迁移/定价。OPPO及华为仍是2128草稿，腾讯认领仍待正式回执，荣耀独立状态未新核；不能把2129本机安装称为所有商店已更新。各商店替换前需真实回归、资质及同版去重；Google继续等待原学外语迁移。
- 首次需要客户端重包，因为Capacitor配置确为内置www而非远程server.url；旧2128/36无法靠服务器获得新查看器。新查看器协议1可后续通过版本化资源包更新模型、坐标、目录与来源，含SHA/本机缓存/不兼容拒绝；新增代码逻辑或原生能力仍需正常审核。专业逐穴坐标、所有结构中文专篇、按穴自动筛题、Android/iOS全3D与断网验收仍未完成，不能把题库首页链接称为精准专题联动。
- 清理：隔离3016/3017预览已停且无监听；本轮临时目录8项871702396字节的递归删除被自动审批拦截，删除0，未绕过。已生成固定范围E:/言道国学3D评估_12A/本轮评估临时物清理.cmd（GBK/CRLF），仅删除本轮node_modules、npm-cache、preview-runtime、dist-tcm、隔离预览与三个一次性脚本，不含源码/模型原件/发布包/证明；该CMD是本轮评估清理增量，不可拿旧全盘命令替换执行。对应发布资源/本轮临时物清理.json。全项目两代轮换仍待新版完整验收，不删有效2128回退和当前审核包。
- C唯一交接与兼容镜像同步校验；E主资料目录仍按负责人保护要求只读，E旧镜像未同步。私钥扫描2037跟踪路径通过，源码提交推送已核；本节文档收尾后再次核Git及SHA。下步先验手机3D下载/触控/离线和Apple37实际可安装，再按各平台真实状态更新草稿；没有用开关或报告把07/09/10整体改为完成。


### 78.5 2026-10-24 04:11东京 Google迁移静默核查
- 官方个人账号8539674148718133275转移页仍显示目标8056957676688740507已接受言道学外语，2026年10月20日请求待处理。国学未列入已迁移；应用表无结果且页面提示意外错误53B5AEDD，不能把空表或读取异常视为迁移完成。
- 未取消、修改、重新提交学外语请求，未启动国学重复转移或个人账号健康应用重提审；原监测继续。证据覆盖E:/言道国学本轮发布_20261023/Google迁移仍待平台完成.png，临时只读标签已关闭，没有新脚本、依赖或删除。
- C唯一报告与兼容镜像同步并核SHA；E主资料目录继续只读，旧E镜像未同步。本轮仅记录监测，不改变其他发布、功能与验收状态。


### 78.6 2026-10-24 10:23东京 抽屉全屏与手机验收候选（执行中）
- 负责人最新要求：未完成手机内3D验收不正式提审；所有可支持的数据更新走服务器，不能承诺新增执行逻辑免审核。暂停新增正式商店提交，不改原学外语迁移或其他产品。
- 修改src/components/anatomy-atlas/AtlasViewer.tsx和AtlasScene.tsx：图层/搜索/穴位/结构说明默认收进可关闭抽屉；点选网格或搜索结构后收起抽屉、隔离其他结构并进入全屏；保留恢复全身/退出全屏/按需说明。全屏隐藏原页面标题与底导航，按安全区避让顶部，适配390×844竖屏。说明专用页不再先堆搜索结果。复用现有滚动锁和返回拦截；尺寸改变后重新计算取景；隔离时隐藏的体表点不能误抢器官点选。
- 真实隔离样机操作已验证搜索心脏→自动全屏、收起说明、浏览器返回退出；不是原生真机证据。截图E:/言道国学3D评估_12A/新版抽屉_器官自动全屏隔离.png及新版抽屉_手机尺寸说明抽屉.png。初次布局改造一处多余JSX括号导致样机解析失败，修正后实际显示通过；未把失败候选上传商店。
- 安卓候选25.0.115/2130待云端构建及手机覆盖验收；苹果下一38待确认同源候选后上传内部测试，不代表正式提审。现有37/2129不含此次抽屉交互，不能用服务器数据包让旧内置查看器执行新代码。既有3.0.0模型包无需重复制作或上传。
- 注册验证码成功后的既有持久验证标记继续复用，整页二次核验不恢复；不将邮箱认证伪称自然人实名、不修改用户验证记录。真实发布/发送身份要求仍按已披露规则，不对审核员造身份。
- 10:17东京已结束前一Google静默核查：原学外语仍目标已接受/待处理，应用表读取异常5EC7DA9B；未改迁移，临时Google标签已关闭。
- 本节为源码候选进展，不宣称手机3D/离线/苹果已全部验收或所有商店更新；保护E主目录只读不写，唯一C镜像同步。继续复用既有隔离依赖，不重复安装；清理拦截及完整资源/医学缺项仍按78.4登记。

- 手机真实入口核查发现旧中医首页与正骨静态图均无三维页跳转，本轮补src/app/zhongyi/page.tsx显著入口及src/components/AnatomyStudyAtlas.tsx关联入口；不是为了测试加入隐藏后门，不修改原有单独付费设置。正式手机验收以包含此修正的同源候选为准。


### 78.7 2026-10-24 10:46东京 同源抽屉版网站上线、2131实装与Apple38内部上传
- 本轮最终功能源码a6401b67e4c63344cad20b6f6fa1a7c7acb4d1ef（前置2498857/b106343/f5b3524）：新增真实中医首页及静态图谱入口；三维工具/说明抽屉默认收起，点选或检索结构后自动隔离并全屏，恢复全身/说明/退出入口保留。修复原生深色背景下文字对比不足。src/components/anatomy-atlas/{AtlasViewer,AtlasScene,atlasPack}.tsx/ts、src/app/zhongyi/page.tsx、src/components/AnatomyStudyAtlas.tsx及android/app/build.gradle。
- 手机2130实测发现未登录下载显示HTTP401，不是二次短信墙。src/lib/offlinePackClient.ts改用既有fetchWithAuth静默续期，应用内下载续期后使用新令牌，COS签名下载不携带应用凭证。401提供普通登录并保存返回图谱路径；403提供会员权益/恢复购买/反馈，不自动购买或改权益。AtlasAccessError保留状态供界面操作。2131真实手机已验证免短信进入图谱、浅底文字可读、匿名下载显示登录继续且入口可用；未登录时不伪造会员权限。
- 注册成功的既有phone_verified_at继续复用；邮箱用户正常登录阅读，整页短信墙不恢复。手机号已验证不能被客户端假造，公共发布/发送身份校验、封禁、审计和内容筛选仍保留。普通登录不等于二次短信认证。手机系统输入未实际填入审核专用登录内容，已请负责人在手机正常登录，未反复输入/修改密码/假绑定。真实会员下载、触控旋转/双指缩放、缓存重开及断网仍待该步骤后验收。
- 远程协议1新增可选zhName、learningDescription、learningSource纯文本字段；限定显示长度，不执行HTML或脚本。技术说明docs/requirements/anatomy-atlas-data-protocol.md；本地合成资料验收证明无需新代码可更新这些字段，不能把合成示例当成正式医学内容。实际3.0.0仍有大量英文名、系统级概述和未专业核校穴位；逐结构专篇、逐穴定位专业核校、按穴精准筛题未完成。
- 云端40050798734质量/类型/回归/预览成功；本机HTTP测试因缺express未运行，不将其写为本机通过。私钥扫描2037跟踪路径通过。网站使用该成功产物12543042567、ZIP SHA027e828f17291509689710965146d0c73b0ab06f58665b7490db6b9b5aea2303，2333文件87545287字节逐项核验后切换/root/yandaoguoxue/releases/v25.0.115-calendar-community-a6401b6，回退f5b3524。回执E:/言道国学3D评估_12A/发布资源/抽屉与登录续期网站部署.json。正式网页已重新打开、本机资源复用、搜索FMA7088心脏→隔离全屏通过，截图正式网页版_最新全屏隔离.png。
- Android25.0.115/2131内部渠道CI40050801170成功，APK78414436字节SHA043323752b9c60d3e7c7a80d4b2d4e4de669f3b3f7be163003cc4c5c57d0ba0d；AAB62426777字节SHAf0d0e4fe9c9d5fa2885680594253d13a5aca5d6f8491183e3361cd230d829821。E:/言道国学3D评估_12A/原生安装包/Android_25.0.115_2131_internal/，签名CI与包身份、11张天体纹理及排除28份未授权动画核验。adb覆盖安装Success，设备读回2131/25.0.115；截图安卓2131_免短信进入与登录继续下载.png。不等于原生全3D验收通过；未上传正式商店。
- Apple25.0.115/38同源CI40050934197签名上传成功，IPA45543068字节SHA4fec52b8102ff6c7fee2c576a9a836df0b59c4e8a8c7e7c2d91fbe7a9dd47bbc，E:/言道国学3D评估_12A/原生安装包/Apple_25.0.115_38/。10:45官方API尚未列出38，等待Apple处理，不重复上传；现有37已VALID/内部组IN_BETA_TESTING，但无此次抽屉。10:48官方再次读回38已VALID、内部组364f4cc7-415b-4010-89f1-5947c3c0edf2已关联、IN_BETA_TESTING可供既有内部人员安装（buildId af11b573-c9fb-45e1-a22d-7e17b5585772），证据发布资源/苹果38内测读回.json；iPhone物理操作未验。原36正式审核未撤回，本轮没有新正式提交。OPPO/华为2128草稿、腾讯认领未知回执、荣耀未新核不变；Google原外语迁移仍按78.6，不修改其他产品。
- 后续更新：既有客户端协议内的模型/术语/说明/来源/坐标可走版本化COS资源、SHA校验、缓存和回退；查看器新交互/原生能力仍须正常客户端升级，不承诺所有未来功能免打包。3.0.0模型未因改抽屉重复上传。后端门禁生产SHA仍0c5758a676b060c0bb6aed0484a08890d365863a2bf8ac16a7c95ab05d00e80a。
- 收尾：临时样机标签关闭、3017隔离服务停止，正式网页保留供查看；没有新增C盘依赖。前轮8项871702396字节删除被自动审批拒绝仍未执行，不绕过；本轮继续沿用固定CMD，源码/合法模型/证据不删。2130为发现缺陷的中间候选，未完整验收新版前未宣称完成全项目两代轮换；旧审核包不得盲删。E主资料目录继续按负责人要求只读，未同步其中旧镜像；C唯一报告与兼容镜像同步并核SHA。所有源码/技术说明已提交推送，文档本节收尾后再核空状态及上下游一致。


### 78.8 2026-10-24 11:21东京 持久登录修复、模型直接交互及负责人暂停抽屉改版
- 负责人确认手机已登录，要求不主动退出就保持登录。实机2131结束应用进程再启动后仍显示同一已登录账号与原权益；该测试不是物理关机重启。未退出账号、未改密码/手机号/编号/订单/会员。没有假造认证记录，真实发送/发布校验仍保留。
- 查明旧src/lib/authInterceptor.ts续期有三处实际缺陷：生产登录只给httpOnly refresh cookie，却要求JS读到refresh token；生产返回data.accessToken而客户端读取顶层字段并要求refreshToken；成功续期未替换auth.ts访问凭据。fa4c281修复为credentials:include、兼容真实嵌套响应、replaceUserToken只旋转原存储的令牌且保留会话/长期登录选择、网络与503等临时故障不清登录、服务端明确拒绝才引导重新登录；并发共用一次刷新，主动换号/退出期间不写回旧续期结果。没有延长服务端令牌期限或删除鉴权。手机本来开启记住登录，普通关闭/后台/重开保留；凭据被撤销或服务端明确过期仍需正常登录。
- 6项scripts/auth-session-refresh.test.cjs真实模块行为回归通过：cookie-only生产响应、新Bearer重试、断网/503不误退出、真实拒绝、并发一次续期、保持session-only选择。加入study-quality云端必跑。本机借用已有隔离评估typescript依赖，无新增C盘依赖；不是用真实用户令牌或订单做合成测试。
- 负责人新增模型操作要求后参考BioDigital官方Anatomy Tree/导航及Complete Anatomy官方工具说明，未复制商用模型、界面素材或课程。src/components/anatomy-atlas/atlasInteraction.ts新增单击/同结构双击/原地约3秒长按识别，拖动、多指、取消不误选；Viewer与Scene实现默认全屏收起面板、轻点高亮就地操作、双击聚焦隔离、长按组织操作、局部工程观察框、15系统四组显示层、逐个隐藏、20步有界撤销、恢复全身，保留原搜索/原四层图谱。区域框依据当前模型心脏/肺/肝/膀胱等实际bounds校准；框外几何裁切不补造切面，不冒充全部组织学深浅层。6项atlas-interaction.test.cjs通过并加入云端。
- 源码阶段：1bf878c622deb3c4dc5c820b6c2db58b2bd67a6a为实际网站/2133/40同源；其前置ebc49ec提交的空白行diff检查问题已用1bf878c修正，重新检查通过。质量40052679286、Android40052681512、iOS40052683433均成功。2132/39是仅登录修复的中间云端候选，没有重复正式提审，也没有下载其物理包到本机。
- 网站1bf878c已逐项SHA验证上线：2333文件87552433字节，产物12544038024 ZIP SHAc276f08e3d80757f002e0f6f1e83640f2f1c752dec0c35669ca814026e731adf，当前/root/yandaoguoxue/releases/v25.0.115-calendar-community-1bf878c，回退a6401b6。回执发布资源/直接操作与持久登录网站部署.json，正式页面真实读回初始全屏截图正式网页版_直接操作初始全屏.png。3.0.0图谱仍复用既有COS包，未因交互修改重复上传33.8MB模型。
- Android2133已覆盖安装Success并读回25.0.115/2133，APK78420428字节SHA69eb4f07fad1fd67bfa53b93d4b0ebe2749b510b07aec67f8b755bb17c7a802d，AAB62432953字节SHA5b95e9ed0645b9a89ff486b1fcab7f4161910f5f183778cb87319eb1312722a1。E:/言道国学3D评估_12A/原生安装包/Android_25.0.115_2133_internal/。原有账号、权益和已下载图谱保留，不用重买或再短信核验。实机通过默认全屏、轻点操作、原地3250ms长按、切换脏器血管层、双击器官聚焦；前一2131通过心脏拖动旋转、说明抽屉、系统返回不丢模型、进程重开保持登录。截图安卓2133_默认纯模型全屏.png/轻点组织就地操作.png/长按三秒操作抽屉.png/脏器血管分层.png/双击器官聚焦.png。11:19负责人回复双指可放大缩小且方便，拖动/缩放按负责人实际确认登记，不冒充ADB多点注入结果。
- Apple40已签名上传成功，IPA45548372字节SHAde6ecf95f89a4da8e5bca4b0dca1256d6d02fae92b923039c8409478dd11cb86，文件E:/言道国学3D评估_12A/原生安装包/Apple_25.0.115_40/；未新查40处理/可安装状态，不凭上传成功写为内部验收完成。原38已可内部测试，原36正式审核未改，本轮无新正式提交。
- 95ff764f8d78aaaf02384986d8a7f74df247dc00是已冻结的手机取景/折叠帮助修正候选：默认镜头3.35/目标高度0.90避让顶部按钮，帮助默认折叠；atlas.json可选viewerPreferences限幅有限数值，后续可通过兼容资料包微调，不执行远程代码。质量40053288277、Android2134运行40053290231、Apple41运行40053292156均成功，41签名上传后11:20API尚未列出，等待Apple处理，不重传。95ff网站产物12544222837 ZIP SHA2f26beaab9b2b0931c931a6d5303da22b0b13f7939ed2dc77339ec73e5b76628尚未部署；2134/41未下载到本机新增堆积，2134未覆盖手机。不能把候选与当前1bf网站/2133混写。
- 最新负责人反馈优先：双指方便，但现有抽屉不好用，将由负责人整理新的完整操作方案再发来。因此暂停新的抽屉改版、95ff候选UI推广及新的正式商店审核，不再操作手机以免干扰；不把现有方案强行宣布通过或擅自继续重画。已受理36不盲撤；其他平台草稿/Google迁移不变。收到新方案后统一实施，而不是重复做零碎正式提审。
- 证据汇总E:/言道国学3D评估_12A/发布资源/本轮手机与交互验收.json，区分样机、真实2131/2133、负责人确认及未验。仍待真实断网模式、物理iPhone、逐穴专业坐标核校、完整中文结构名/专篇说明；原07/09/10整体状态不改。不能将工程模型/框裁切称为商用全解剖或临床精准。
- 收尾：隔离3017样机停止，临时标签关闭，正式网站保留待后续；源码与测试已提交推送，私钥扫描2041路径通过。没有本轮物理删除；前轮临时物删除自动审批拒绝仍不绕过，固定CMD未变；完整新候选未最终验收前不盲删前版/审核包。E保护主资料目录只读，旧E镜像未同步；C唯一交接/兼容镜像同步并核SHA，本节文档收尾后核空仓与上下游一致。

### 78.9 2026-10-24 12:17东京 12B左侧组织目录、可逆剥离与真机交付
- 负责人完整新方案已收到并实施，替代78.8的等待：仅改言道国学现有三维图谱导航/交互，不换模型、不改排盘、支付/权益或其他产品。专项操作约定在本仓docs/requirements/anatomy-sidebar-12B.md；不是把底部大弹窗挪到侧边后仍遮满屏幕。
- 源码a9380f7e96840b4837d5fd9dab175c650ed35e06。修改文件（均在本项目绝对根目录C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/之下）：src/components/anatomy-atlas/AtlasViewer.tsx、AtlasScene.tsx、atlasPack.ts、atlasInteraction.ts；新增atlasState.ts、atlasStructureTree.ts；新增scripts/atlas-sidebar.test.cjs及scripts/fixtures/atlas-structure-units.json，更新scripts/atlas-interaction.test.cjs、.github/workflows/study-quality.yml、android/app/build.gradle（2135）。
- 返回键下常驻“组织”，默认收起，手机47vw/上限320px左侧目录，无全屏遮罩。打开保留模型方向与相机目标，按有效画布适配距离；不重新加载模型。树为系统→参考模型区域→来源结构，箭头仅展开，名称选中/聚焦，眼睛显隐，“只看”临时隔离。手机具体结构选择后收起，可固定；资料仍同侧，返回目录恢复展开/滚动位置。原全屏、旋转、缩放、截面、系统展开、经络穴位、题库入口保留。
- 轻点紧凑标签；长按500ms隐藏一个来源结构的全部网格，拖动超过8CSS像素、第二指、取消、失焦立即停止，不在松手追加隐藏。连剥默认关闭，在“更多”主动开启后650ms逐件，松手停止。撤销/重做30步；恢复隐藏不改视角，视角复位不恢复隐藏；退出只看恢复之前显隐/透明/相机。修正了只看内选中/剥离误恢复外层、跨系统器官目录归属与实际眼睛状态。
- 来源心脏FMA7088确有83块跨系统网格，作为总成保留，同时保留动脉等细分结构，不重复渲染或计为新资产。无校对中文名时保留英文；资料缺专篇时明确展示系统概述。模型区域为工程观察分组，全部穴位仍待专业坐标核校；不宣称全中文/临床精准/完整组织学深浅层。资源仍3.0.0/协议1、33799696字节、原SHA b1c9a4826551cb54152141e104f405f89dcf497434c6bd3ca7987683b40d2f4b，没有另传模型或热链作者服务器，原MIT代码/CCBY4模型许可不变。
- 本机18项相关回归通过（侧栏状态6、手势6、登录续期6）；修改模块语义检查零诊断。最初Node strip-only不支持参数属性，已改为可擦除TS语法并重跑通过。完整云端类型、业务回归和Web构建40056439897成功；重复push质量40056430828已取消，不重复发布。Android40056442063、Apple40056444142均成功，正式私钥扫描收尾再次执行。
- 正式网站已切换/root/yandaoguoxue/releases/v25.0.115-calendar-community-a9380f7，2333文件87563313字节，artifact12545013524 ZIP SHA437dda4d7e5cf2a3fd77a2fa598ac471ac09a4966a7053985a228e02ccc1070f，逐文件校验，回退1bf878c。正式登录页已实际重新加载并展开左侧目录，证据E:/言道国学3D评估_12A/正式网站12B_左侧目录.png及发布资源/左侧目录12B网站部署.json。
- Android25.0.115/2135内部候选已下载验签、核源提交/内容并在华为保留数据覆盖安装Success，包版本读回2135。原登录与已下载图谱保留，未再次购买/验证手机。APK78423904字节 SHA bc4f35e3a6ac119086006ac681cb586c11beaf08e7a3f050a543338dc6b037a7；AAB62436369字节 SHA a2d0b44410998a807f32f00a52bd29033a2418443aa3216263470fa769e1e80b。实际文件E:/言道国学3D评估_12A/原生安装包/Android_25.0.115_2135_internal/。11张天体图、原课程与28项未授权动画排除规则核验通过。
- 真机实际验收：默认收起全屏、左侧目录模型可见、只看骨骼自动收起、650ms长按隐藏左股骨、撤销恢复、重做、恢复隐藏、点选中文骨名/高亮、同侧资料、主动连剥颅骨。结束关闭连剥、恢复场景。截图E同目录/安卓2135_12B_默认收起.png、安卓2135_12B_左侧展开.png、安卓2135_12B_长按剥离.png、安卓2135_12B_撤销恢复.png、安卓2135_12B_同侧资料.png、安卓2135_12B_连剥.png。视频安卓2135_12B_完整验收.mp4为真实手机画面，21.24秒/590×1280，已解码核内容，SHA99ef4fad175031abae7afd9cbfd19216d82f1748a524a1c055c084f5b05e29f6；步骤和解码证据在发布资源/12B录屏步骤.json、12B视频解码验证.json。不是把静态图拼成假录屏。
- 华为无screenrecord命令，使用官方Genymobile/scrcpy5.0.1录制（官方ZIP SHA b12a2c4ee8be317422451fc7dcf8ee20a71b5ea7ef9ad73ddd825a25316227a5），无控制/无音频，仅录当前应用。首次40秒草稿较多等待及通知，最终交付上面22秒限时真实操作版；草稿列入清理、不作交付证据。
- Apple25.0.115（42）已签名上传，IPA45551859字节 SHA65e79d945904c8b3b93d89ea589c3052c6a4469445bb867f325970d22373bb3b，存放E同目录/原生安装包/Apple_25.0.115_42/。12:15东京API实际读回VALID、原内部组已附加且IN_BETA_TESTING，可在原TestFlight内部组更新；证据发布资源/苹果42内测读回.json。没有新正式审核/外部测试提交，原36正式任务不盲撤，OPPO/华为2128草稿/腾讯认领/荣耀及Google迁移没有本轮新状态证据，不能说所有商店已换2135。内部组自动附加不是物理iPhone验收。
- 仍待：当前2135真人双指加入时取消长按复查、真实断网冷启动、物理iPhone；原逐穴/完整专篇中文/精准题库联动及07/09/10发布门槛仍按原缺项，不因12B完成主要操作而整体改为通过。新交互涉及内置www，旧包需正常升级；以后兼容模型、坐标、说明、既有镜头参数可走已支持资料包，新增代码/原生功能仍需正常构建审核，不能保证所有更新免打包。
- 清理：隔离3017预览已停止，临时样机标签关闭，正式网站标签保留。此次删除录屏工具及草稿/冗余样机截图被自动审批整体拒绝，删除0，未更换方式绕过；新增待清临时物27441390字节。已在原E:/言道国学3D评估_12A/本轮评估临时物清理.cmd追加6个精确目标；原8项临时依赖目标不变。保留正式源、资源原件、2135/42及有效回退/审核包与验收证据；完整两代物理轮换未完成，不能报告全盘清干净。汇总发布资源/12B左侧组织目录验收.json。负责人执行CMD后需读回残留和实际空间。
- C唯一交接与兼容镜像同步核SHA；E主资料目录继续按负责人保护要求只读，旧E镜像未同步，不能称镜像制度全部收尾。源码已提交推送，文档收尾后核Git为空/上下游一致。下一步从TestFlight42物理机验收与上述剩余项目继续，未满足前不新正式提审。


### 78.10 2026-10-24 原经络动图恢复、四层离线下载修复、详细照片追查及素材保全
- 负责人指出两项真实回退：3D系统名称点“骨骼”没有直接显示完整骨骼，原经络动图被误用古籍图替换。本轮已纠正：不以古籍/简化SVG替代原动图；错误中间候选61f7358（2136/43）、31a7321（2137/44）的古籍替代方案已撤销，不能作为最终营销。保留源Git历史作追溯，不重写历史或声称此前没有错误。
- 最终功能源码0b00a6be50bd1ffab525e99d74ab03986d174771。src/components/anatomy-atlas/AtlasViewer.tsx、AtlasScene.tsx、atlasPack.ts及src/lib/anatomy3dPack.ts：系统名称直接隔离整个系统并收起侧栏，重复点击不跳回全身；眼睛/只看、显隐、撤销/恢复保持。剥离模式轻点一件，长按500ms后每650ms继续；移动超过8px或第二指取消，松手不补操作。空间拉杆准确标“系统分散观察”，不冒充医学组织深浅层。经穴页签与已有经络/穴位详情相互跳转；修复全屏返回清理逻辑把正常穴位详情导航拉回的问题，正式浏览器已实际从神门模型进入神门图文/原文/交流详情。
- src/app/zhongyi/page.tsx恢复紧凑的言道学堂和三维图谱双入口，不删除其他板块。legacy anatomy3d/page.tsx修复DPR画布撑出边界与四层包大小/许可说明。没有改支付、会员价格、排盘算法、其他产品或用户私人档案。
- 离线下载根因：既有四层阅读器请求tcm-anatomy-3d-v2，但此前未发布这个ID。已从同源3.0.0参考模型实际生成体表3、肌肉442、骨骼296、脏腑血管神经1491网格共2232结构四组GLB（不含两件毛发），并用真实GLTFLoader解码/边界及每层SHA验证。不是将三层v1改名为四层。构建scripts/build-anatomy-four-layer.cjs；发布scripts/publish_anatomy_four_layer.py；原v1/v3均未改，MEMBER权限不改。
- tcm-anatomy-3d-v2/2.0.0已真实发布到私有COS，41550977字节，SHA719b2c62d55bb062a49680b1a92c69419d84b1271a38f6a2d86c804fcb3cd126，E:/言道国学3D评估_12A/发布资源/tcm-anatomy-3d-v2_2.0.0.pack，证据四层兼容包生产发布.json及.pack.json/.pack.gltf-verified.json。旧2135手机已不重新安装即下载成功，2136实际切换肌肉和脏腑血管神经；截图旧2135_服务器修复四层包下载.png、旧2135_骨骼包实测.png、安卓2136_四层肌肉包实测.png、安卓2136_四层脏腑血管神经实测.png。实体iPhone下载尚未验证，不以共享服务器修复冒充iOS实测。
- 原动图：只读核对负责人指定E:/八字命理类文档包括排盘方式电子版/整理出来的倪师课件已上传网站的资料/经络动图，11个.png实际是GIF；无损转为动画WebP，逐帧RGBA像素与时序相同，保留640×960或720×1080原分辨率、水印与文字。其余3幅人体及14幅骨骼循行动图沿用项目原资源，合计28幅/14经络/11544010字节。不是重绘人体或用现代模型冒充照片。public/assets/meridians/ANIMATION-MANIFEST.json记录每图SHA、尺寸、帧时序、11原件文件名/来源SHA及权利状态。
- 删除误加的14幅古籍替代JPG、索引和专用导入/测试（约39.6MB源码资产，不是删除负责人原件）。原SOURCE-MANIFEST保留来源线索；原公开文章/水印不自动构成新版权授权，正式权利核验与专业逐穴定位仍待。原361标准穴及39董氏条目没有减少，不称已补齐全部董氏或逐穴临床精准。
- src/app/zhongyi/meridian/page.tsx恢复“人体穴位动图/骨骼循行动图”、真实动画和全屏1—3倍放大、错误重试；保留文字、古籍、交流及3D入口。移除会在导出时静默删28幅的filter-unlicensed-meridians脚本，改scripts/verify-meridian-media.cjs：任一丢失/改坏即失败；package.json postbuild及retain_verified_study_packages.py核验最终Web/APK/AAB/IPA均含28幅实际SHA，included28/excluded0。新增/更新meridian-animation.test.cjs、meridian-publication.test.cjs、anatomy-download-compat.test.cjs等。
- 13项相关回归（5下载、6侧栏、2动图/发布）通过；本轮收尾直接运行一度因C无typescript依赖导致两套测试未能加载，复用既有E:/言道国学3D评估_12A/tcm-3d/node_modules重新运行全部13通过，没有另装依赖。完整质量40064893633成功；Android40064896219与Apple40064898594成功。重复自动质量任务已取消，不算额外正式提交。私钥扫描2051跟踪路径通过（收尾提交前再核），无私钥进仓。
- 正式网站已逐文件校验切换/root/yandaoguoxue/releases/v25.0.115-calendar-community-0b00a6b，2362文件99154363字节，artifact12549321047，ZIP SHA540751d1a53f6b779715903d7011ad5a354560b12443a7510e674bb8dfcde54a；证据E:/言道国学3D评估_12A/发布资源/恢复原经络动图网站部署.json。前一31a版本有已撤销古籍替代，不作为建议回退；需功能回退先核已验a9380f7，数据库、账号和订单不回退。现有兼容模型资料可以服务器发包，新增交互代码仍须正常构建，不能保证所有未来升级免审核。
- Android25.0.115/2138内部候选已验签和内容核对，APK89981846字节 SHA23d8d3f161de0e0da909d351cc5168b0c865ba9563e6f85c103da10acd83f185；AAB73972111字节 SHA22b58f0b840fb9f7443fd2f33f4cf3f7da22e6b9704280e7e85e65d727efacfb，E同根/原生安装包/Android_25.0.115_2138_internal/。华为保留数据覆盖安装Success，读回2138，登录和已下图谱保留；真实原心经、骨骼动图、行间图文有截图。误命名“安卓2138_动图全屏放大.png”已更正为“安卓2138_行间图文原动图.png”，不以错误文件名充当全屏测试。浏览器另已实际打开全屏并点击放大。未操作购买、短信、用户网络或注销。
- Apple25.0.115（45）已签名上传且VALID/原内部组IN_BETA_TESTING，build9159aa09-07d2-4c21-8534-63b5fd5b72f7；IPA57088856字节 SHA707e24abbee452ed892fa5749c5af86c434ac5b85a247387ae921e1eeb2a6b8d，E同根/原生安装包/Apple_25.0.115_45/；证据苹果45内测读回.json。不是物理iPhone验收，不能称已正式发布。原36正式任务在本轮04:25Z读回WAITING_FOR_REVIEW，未撤未替；证据苹果本轮正式审核与营销状态.json。Google迁移/OPPO/华为/荣耀/腾讯本轮无新受理或完成证据，未更改其他产品或重复提审。
- 局部穴位照片专项仍OPEN：负责人说手臂等详细照片以前存在，与28张经络动图区分追查。已查本地保护资料/旧95和96包目录、旧knowledge-integration源码/资源、Git对象路径、生产服务器公开资源目录及COS旧meridian/tcm/tcm-acupuncture-sim/materials/guoxue-web/app/app-pages/yandao-1300262413等前缀。COS四棵旧资料树列2043项，25幅图片均非所述局部穴位照片，证据原经络动图核对/COS旧资料检索.json。旧tcmScraper.ts确有image_url置空逻辑和10条未核外链，未假装已恢复这些外链，未抓取私人聊天图片或复制竞品截图。不能写成“原来没有”，继续从旧部署/资源索引追查，禁止生成假照片补数。
- 负责人要求已加入唯一制度第十八节：分开保全动图/局部照片/模型，禁止未经要求简化替换，原件只读、COS固定映射、逐份SHA读回、缺图如实登记，清理不得删有效学习原件。scripts/archive-study-media.py负责实际归档当前44个系统图片资产、11份原GIF原件、两份来源清单（包括SVG完整快照），不上传私人资料；COS完成状态以本节后续回读增量为准，归档不等于前台改为COS读取。
- 宣传截图位于E:/言道国学3D评估_12A/宣传图片营销/20261024_2135_全页面实拍（历史目录名保留）。135张真实截图逐SHA和尺寸核对，网页与安卓真机分开标注；204—206为恢复动图后的正式Web，207—209为2138真机。原190源路由已分类，后台/隐私/参数不全/重定向页不伪造展示。补原典阴符经阅读/听学、课程等；已撤销古籍截图202移出营销目录，索引和四张总览不再引用。用户原有营销文件未删改。新docs/marketing/20261024/store-copy.json、营销与截图方案.txt及E副本为待上传方案，不冒充所有商店已保存；本批无苹果实体机商店图。
- 清理清单已重盘，仅准备未执行：原E:/言道国学3D评估_12A/本轮评估临时物清理.cmd保留单一入口，25个精确临时/过时内部候选目标2209408872字节；SHA58b09fc47d32642bf3f10c69a515cb2fcfd7abb7c61d80ebb3b0aebfc850c0fc。保留当前2138/45及唯一已验旧2135/42，先归档旧候选JSON到发布资源/历史候选包元数据_轮换保留.json；CMD有新旧包存在保护，不碰源码、正式36、原始学习素材、密钥或保护E目录。自动删除前轮被拒，本轮不换方式绕过；仍需负责人最终验收后一次执行，读回残留才可称已物理清理。无新增本地node_modules/预览进程，服务器归档临时物以脚本实际清理回执为准。
- E:/八字命理类文档包括排盘方式电子版继续按负责人保护要求只读，旧E报告镜像未写入；不能称镜像制度全部完成。C唯一交接与根兼容镜像会同步核SHA，源码/制度/营销方案收尾后提交推送并核Git空/上下游0 0。仍待局部照片恢复、实体iPhone、医学逐穴/内容许可、原07/09/10完整验收及最终物理清理，不把本轮恢复宣布为全项目完成。

- COS先行核对：当前public/assets下42份非SVG图片已通过统一存储入口存入私有learning-content/system-media/2026102401/public/assets/对应原相对目录，36723822字节，全部完整下载SHA一致；证据发布资源/学习图片COS归档_2026102401/COS当前发布图片先行回读.json。另两份SVG保留在完整ZIP，不放宽扩展名/权限。先行核对遇本机与云导出两份JSON的换行字节不同，已停在该项而未冒充相同；最终归档按本机冻结ZIP内清单字节上传并读回，不修改既有云端导出。原GIF11份与完整ZIP此时仍在传输，全部保全完成须有后续57对象回执。

- COS最终完成回执（2026-10-24T05:47:43.030Z）：57对象已逐份完整下载核SHA通过，桶yandao-guoxue-1300262413/ap-beijing，私有前缀learning-content/system-media/2026102401/。42份当前图片和11份GIF原件分别存原相对目录，两份SVG在完整快照内；来源JSON、MEDIA-INVENTORY.json及system-study-media.zip均已核。完整快照93914248字节 SHAef581102ec1fb05283d9be5fa23c3070d801b042d3d62590278d9a5801761a08。原件在originals/meridians/<原文件名>.png（实际GIF），发布图在public/assets/<原相对路径>；机器台账docs/requirements/study-media-storage.json，完整本地清单及回执E:/言道国学3D评估_12A/发布资源/学习图片COS归档_2026102401/。这次归档未改前台读取地址或公开权限，不能当作缺失局部照片已找回。93.9MB上传结束后服务端本次专用/tmp暂存及读回文件已由脚本校验限定路径清除；本地ZIP作为正式保全交付保留。
- 收尾补正：原动图恢复与四层下载最终验收.json记录真实范围；全项目未完成项仍保持OPEN。135张截图及撤销图排除最终复核通过。此次收尾私钥扫描2054路径通过；最终新增存储台账后再扫。C根兼容报告与唯一交接逐字节同步；E保护目录未写。以下文档/归档脚本/制度为维护提交，不另触发原生打包或冒称新的商店构建；提交推送最终读回以E发布资源/原动图恢复最终收尾核验.json为证据。


### 78.11 2026-10-24 经穴名称分色、原体表恢复、双向资料联动与近几天安装包追查
- 负责人补充旧版为“前几天的版本”，不再要求其记忆具体版本。只处理国学三维图谱、经络资料关联及缺图追查；不改支付、价格、命理算法、账号记录或其他产品。局部穴位详细照片与经络总动图是不同资料，局部照片仍未定位到原文件，不把恢复28幅动图称为照片恢复完成。
- 已核对15个实际APK（2117、2118、2119、2120、2121、2122、2123、2124、2125内部/腾讯、2126内部/腾讯、2127内部/腾讯、2128），逐项登记图片路径/大小/SHA、编译版本、JS图片外链与image_url上下文。2117/2118含28经络动图，2119以后被79885a4的未授权素材排除规则从交付中移除；这一原因有实际包及Git依据，恢复见78.10。未找到手臂等逐穴局部照片，不推断照片从未存在。57历史归档TOC、242历史Git图片对象、2043旧COS匹配对象及保护目录823图片（40条医学路径候选）亦已只读盘点；最早可追踪定位窗已是通用BodyDiagramSVG，tcmScraper初始可追踪版本image_url为空。不能把这一事实当成所有历史部署均无照片的证明。
- 追查证据位于E:/言道国学3D评估_12A/原经络动图核对/：旧版局部照片追查_20261024.json、前几天安装包图片与外链逐版核对.json、保护资料目录只读图片盘点.json及原COS检索记录。直接从2118原APK只读提供静态旧图回看，不解包写入保护目录；旧SPA首次协议未代用户接受，仅查看公开原图片，不冒充旧版账号功能已验收。
- src/components/anatomy-atlas/atlasPointLabels.ts新增14经独立颜色、标签避让与规范显示名；AtlasScene.tsx将穴位名称作为可点选投影按钮，点线/侧栏同色，选中穴名优先、避开控制区，手机全身图有限显示、放大后增加，不把362个名字挤在一屏。AtlasViewer.tsx点击后显示原库定位卡、查看详情与左右侧保持；src/app/zhongyi/meridian/page.tsx提供返回3D。由模型到原库再返回同侧神门已在真实华为手机2139验证，不是仅查HTTP200。
- 全362模型身份对照原361正经穴及1印堂经外奇穴；不增加或改写361标准数组。模型GV24+显示及查询为EX-HN3，经外奇穴；瘛脉规范匹配原库瘈脉TE18。印堂仅新增有来源的额部眉间定位及原文入口，不编造操作深度；参考新加坡中医管理委员会STRE2019考试大纲第46页。getMeridianByName兼容手少阴心经等全名及心经简称，361穴返回归属均测试；印堂返回总目录不落入不存在分类。涉及src/algorithm-core/modules/tcm/meridians.ts、src/lib/tcmScraper.ts。既有多穴详细定位缺项仍存在，未声称逐穴医学内容已补齐。
- 原人体表现修正：AtlasScene.tsx撤销FJ2813/FJ2815硬排除与运行时体表简化，恢复全部2234来源网格；atlasState.ts默认体表加感觉器官，避免内脏穿出表面；atlasStructureTree.ts恢复真实毛发目录与可逆隐藏，atlasPack.ts补毛发/眉/唇名称。保留原法线，按真实部件设置肤色、毛发、眉唇与透明眼介质、适当光照；删除不再使用的teaching-skin.ts。没有另造人体、没有把展示改色宣称医学准确；仍为BodyParts3D成年男性参考体，不是完整所有体型或组织学层次。
- 四层兼容包由scripts/build-anatomy-four-layer.cjs生成2.1.0，皮肤5/肌肉442/骨骼296/脏腑血管神经1491，共2234，实际GLTFLoader解码四组GLB后每个来源positions缓冲逐字节一致。E发布资源/tcm-anatomy-3d-v2_2.1.0.pack，41748876字节，SHAfeadf6c3b5db170c338b2d72559a56b8d7bae95ae8cd01a7a155301a95ef5cbb。7:00:04UTC生产统一引擎私有COS发布learning-content/offline-packs/tcm-anatomy-3d-v2/2.1.0.pack并整包读回SHA一致。原2.0仍作一份资源回退，v1/v3编号保留客户端兼容，不算独立多模型。
- 传输先停止本轮缓慢SCP；差量初次因旧本地包已卸载而失败，后从既有私有COS取已核2.0基线，精确压缩字节复用40708356字节、仅传1040520字节，合成后再整包核SHA；不是改压缩或假读回。scripts/publish_anatomy_four_layer.py新增--reuse-staged只复用已核暂存。发布与COS读回/tmp专用包均已删除，不改ACL。证据四层2.1精确字节复用传输.json、四层原始体表2.1生产发布.json及.pack.gltf-verified.json。
- 华为2139真实从“我的→离线内容”发现四层2.1更新，确认下载后页面“已安装/已是最新”，重新打开原四层页成功解码并显示恢复体表/毛发；未清应用数据、未再次短信验证或购买。实际截图安卓2139_四层2.1实际下载结果.png、安卓2139_四层2.1实际页面.png。该页另一个旧批量资料卡显示Failed to fetch、105/106组完成，单独保持OPEN，不把3D成功称全部离线同步通过。iPhone2.1下载及物理操作尚未验证。
- 本地相关23项回归通过，新增scripts/atlas-point-labels.test.cjs及362身份fixture；atlas-sidebar.test.cjs覆盖真实毛发隐藏和撤销，study-quality加入实际执行。云端40071267025/40071767376/40072011229/40073438696/40073994130/40074201258质量通过。返回总目录浏览器不响应，进一步发现同名脚本长缓存风险，next.config.ts新增官方deploymentId以GITHUB_SHA区分请求；最后客户端源与质量/部署/内测读回见本节末完成增量，不能把旧候选通过替代新候选验收。官方机制说明https://nextjs.org/docs/app/api-reference/config/next-config-js/deploymentId。
- 中间候选4dcea7a安卓与质量成功，苹果运行取消且未上传；9d3bf75上传内部Apple46，后被bda99ea的Android2139/Apple47替代。2139已手机覆盖安装，Apple47官方读回VALID/IN_BETA_TESTING既有内部组关联；没有正式提交，也未下载所有中间包堆本地。后续最终包及两代保留按本节末增量。不撤原36正式任务；本轮没有重新核所有商店，OPPO/华为原2128草稿、腾讯认领受理未明、荣耀未新核仅沿用78.2的历史状态，不能称现已全部上传。
- 本轮原动图28幅与COS57对象保全未改，目录位置见78.10和docs/requirements/study-media-storage.json。网页与原生包包含原动图门禁；三维不替代原图片。截图补充到E:/言道国学3D评估_12A/宣传图片营销/20261024_经穴联动补拍，原生/正式网站/样机来源分别标注，样机不作为商店真机图。营销稿为待正式验收后上传方案，不用截图或文案替代平台受理证据。
- 远程能力：既有协议1可更新兼容模型/中文名/学习说明/来源/点位与目录，仍按COS版本/SHA/缓存/回退；新穴名交互、颜色和导航是内置代码变更，需要新包，不能承诺所有未来功能免打包审核。文档docs/requirements/anatomy-atlas-data-protocol.md已补明确边界。未临床校核的穴位仍是学习参考，不改为“精准取穴”。
- 未完成：原逐穴局部照片找回、逐穴及资料专业核校/版权、实体iPhone、本轮前全部07/09/10总验收、旧批量同步失败及物理清理；本轮不新正式提审，不改总需求完成标记。保护E:/八字命理类文档包括排盘方式电子版按负责人只读要求未改，E旧报告镜像未同步；唯一C报告与根兼容镜像收尾逐SHA核对。清理及最终原生版本见下方增量。


- 负责人随后明确要求：阴毛不要显示，头部穴位可以去除头发，缺失图片应补真人部位摄影，并永久保全。本节前面恢复全部网格是原件保全与当时显示状态；现已按最新要求在Scene显示蒙版及目录排除FJ2815、原四层读入后隐藏对应网格，原模型包不删除。头发FJ2813单独“隐藏头发/恢复头发”，不切头皮、不移动穴位，标签/资料避让控制区；新增8项侧栏回归及照片回归均通过。2139仍旧客户端，不声称已经具备最新显示修正。
- 新取得公开许可原始真人照片两份，实际覆盖七个标准穴位：Mk2010合谷LI4原图1114×1671、380682字节、SHA30389ea5805cb868ae8e70c80a4bd1b31c2030b7a0c050c7b140966122d33dbb，CC BY-SA3.0；Sun等2026 Frontiers in Neurology图3原始组合照片1535×1066、246338字节、SHA6e212a43ee3ec82a479b4b0797e3c971b979e07f0da6d5566c99ad208063e3d3，CC BY4.0，关联PC6/LU5/GV26/SP6/CV23/BL40。该论文明确图3可识别图片已取得发表书面同意；保留红色研究穴位及蓝色Sham对照的原标记和中文解释，不把蓝点或Lower HT1冒充标准穴位。没有用AI生成照片或替换已知医学标点，没有宣称361穴照片已全部补齐或照片临床定位已核校。
- 原件本地E:/言道国学3D评估_12A/核心学习资料_禁止删除/真人穴位照片/，新增public/assets/acupoint-photos/{MANIFEST.json,NOTICE.txt,hegu-li4-mk2010.jpg,regional-sun-2026-fig3.webp}逐原字节一致。源码AcupointPhotoGallery.tsx、acupointPhotos.ts：原穴位详情与图文弹窗显示原始真人图、作者/许可/出处及放大关闭；仅七个实际对应穴位展示，不拿同一照片填充其他穴位。远程有界纯资料清单支持schema1/revision、最多1000项、固定本站图片路径与可信出处域、离线内置回退，不执行远程HTML/脚本或隐藏业务；后续合规照片和图注可以数据更新，不必为每张新图重包。原内置客户端首次需要升级才有此读图能力，不能称旧包已更新。
- 真人图增量COS保全已完成5对象完整读回，PRIVATE learning-content/system-media/2026102403/，两照片、原清单、MEDIA-INVENTORY.json及623751字节完整ZIP，SHA247d4d4fe5e02e4c1edc3b3503d7b12cadb821e47aebbff26748975920c5c1dc；NOTICE.txt在ZIP内。首次02因扩展名白名单拒绝TXT而失败，保留真实失败状态，不放宽白名单/ACL；修正为新不可变归档03，不覆盖02已有对象。脚本archive-study-media.py新增photo-only及独立归档revision，只传0.6MB照片增量，不重复上传旧93.9MB。完整回执在该核心目录/COS保全_2026102403/；docs/requirements/study-media-storage.json登记本地与COS位置，AGENTS及制度十九明确禁止清理。
- 40075041180安卓与40075044011苹果48运行在负责人新增毛发/真人图要求后主动取消，均未上传；不拿已取消构建称可测试。后续最终代码和内测交付以本节最终增量为准。原36正式审核继续不动，未向任何正式商店提交缺图候选。


- 真机发现并修复本轮引入的问题：部署区分试验deploymentId除了缓存参数还引入Next.js服务端版本握手；本项目实际是Nginx静态导出及Capacitor本地资源，2140出现底导航高亮改变但正文停在首页。不能只凭SSR截图认定启动正常。已撤销该设置，新增scripts/verify-static-cache-boundary.cjs进入网页/安卓/苹果构建硬门禁，检查三条实际导出页无dpl脚本请求。9b54637质量40077319506通过，网站回退到静态兼容方式，2141真机已验证首页→中医首页→3D→尺泽资料→真人照片的真实导航恢复，保留原登录和缓存，不清应用数据。相关官方机制只作为定位依据，本项目不采用；本节先前deploymentId候选不是最终方案。
- Android2140／Apple49（66885fc）云端成功并实际留包，2140真机发现导航问题后判为不通过，不作为有效回退；此前f42内部Apple48也有相同设置。没有把这些问题包送正式审核。scripts/asc-internal-release.cjs新增仅限48/49、确认未关联任何正式App版本才允许的停测分支；2026-10-24T08:22:10/12Z官方读回两者expired=true，未改36正式任务、其他版本或其他产品。证据苹果48问题内部候选停测.json、苹果49问题内部候选停测.json。
- 临时修正候选2141/Apple50（9b54637）：质量40077319506、Android40077321918、iOS40077324354均成功；2141原签名覆盖安装Success并读回版本，原人体实际加载、阴毛不显示、头发隐藏/恢复、目录点尺泽LU5→原资料→真人图窗口→放大→关闭后保留资料窗口均真实操作。Apple50官方08:22:09Z已VALID/IN_BETA_TESTING，既有内部组关联；没有实体iPhone验收。手机深色主题下缩放按钮对比度偏低，再作明确白底修正，最终2142/51以末尾读回为准，2141不冒称最终交付。
- 新的真实证据E评估根目录/安卓2141_中医导航复核.png、安卓2141_原人体加载完成.png、安卓2141_隐藏头发实际效果.png、安卓2141_尺泽名称与定位.png、安卓2141_尺泽真人部位照片.png、安卓2141_真人照片两倍放大.png、安卓2141_关闭放大保留资料窗口.png。本轮UI也发现并修正嵌套放大关闭会带走父资料窗口、头顶俯视投影出躯干穴名的问题；限制头部标签只影响显示，不移动穴位坐标或改算法。资料库中尺泽等仍有旧定位字段待补，原图/三维关联成功不等于这些字段已学术审校。
- 清理安全措施：发现2140不通过后，先将准备中的CMD停用，避免错误地把问题包当有效当前版本后删除旧回退；待2142/51完成后再生成带实际SHA校验的29项以上精确清理清单。核心真人原图/模型/动图不在目标内，当前尚未执行物理清理。03成功归档和初次02失败的本轮/tmp专用暂存已核路径及SHA后移除，COS原对象未删除；证据真人照片失败尝试暂存清理.json。


### 78.11 最终候选读回补记（2026-10-24）
- Android2142构建40078154665成功，APK90,624,679字节，SHA256 3b7e3e07b9f4b3568454f5bf7165c3fb7cedd3b2890010c29d65acf2f8bee701；AAB74,609,206字节，SHA256 a75280ae8a91d18dc62e821c832926e074bf158ecb6c9bacb33b43a63b264a86。已覆盖安装Success且系统读回2142/25.0.115；新增2142完整交互验收尚未完成，2141证据不得改写版本。
- Apple51构建40078156737成功，IPA57,726,317字节，SHA256 c7fbf631dcbb41478d4dbc28c7b6169b5894ed9a0d93ee5391de03ddf2c5a41e。08:46:46Z官方API读回VALID、IN_BETA_TESTING、既有内部组关联，未新邀请用户或新正式提审。证据E评估/发布资源/苹果51内测读回.json及原生安装包中的verified文件；iPhone实测待完成。
- Web f9432fd已按2366文件逐SHA部署，证据真人图与头发控制最终交付网站部署.json。后续图片署名整理另见78.12，不把2142/51说成已包含该后续调整。
- 原始局部照片新增追查：服务器41份历次发布共5458图片/模型文件只读盘点，独有25哈希为14张古籍图及11旧低分辨率动图，未找到用户所述详细局部照片；证据原经络动图核对/服务器历次发布独有图片只读核对.json。新增两张真人原图实际只覆盖7穴，不是361穴齐备。
- 核心照片已在永久E评估目录及COS system-media/2026102403/完整回读，5对象，623751字节快照SHA 247d4d4fe5e02e4c1edc3b3503d7b12cadb821e47aebbff26748975920c5c1dc。不得清理原图、模型、28动图或有效审核证据。
- 清理CMD仍停用；此前清单保留版本已过时，不能执行。待2142最终交互及新署名展示合并候选验收后重新生成，保持2139/47可用回退，不把问题2140/49视为有效回退。未执行本地物理清理，未清理服务器41历史发布。主E资料目录按负责人要求只读，因此未写E报告镜像；C根入口报告同字节同步。

## 78.12 图片说明集中到官网（2026-10-24）
- 负责人要求图片旁不重复堆放开源声明。src/components/AcupointPhotoGallery.tsx移除每图标题重复、长出处、作者/许可/修改说明，缩略与放大视图仅保留一个简短“图片署名与许可”入口，指向官网privacy/#acupoint-photo-credits。研究图保留红点/蓝点及下极泉区别，属于防止误认穴位的读图信息，不是版权文案。没有新增未经审校的功效或治疗承诺。
- src/app/privacy/page.tsx新增集中来源专区，完整列作者、作品、对应穴位、原始链接、CC许可与修改情况，原图/资料manifest未修改。CC BY4.0与BY-SA3.0官方条款均允许合理方式署名，未删除许可义务。照片位置与原学习数据库、头发隐藏/恢复、阴毛不显示、经络动图均未改。
- 本次源码544069b已推送；13项照片/目录/穴名相关回归全部通过，私钥扫描2065路径通过。完整云质量与Web构建40079347516进行中，正式部署回执后补；没有为这次纯展示调整立即重复打原生包。2142/51仍含上一版图片说明，须在下一次合并客户端候选中带入本改动，不能宣称现有安装包已自动修改。
- Google迁移与其他商店此轮未重新核查，不沿用历史记录冒称实时状态；正式Apple36未更改。07/09/10全项目、医学逐穴审校、原始照片恢复、iOS实体设备、离线105/106失败、双用户与购买原缺项仍待，不宣布全部完成。

- 实际网页复核时发现旧肺经图文组件仍逐图展示作者和许可，因此继续统一处理AcupointStudySources.tsx：保留肺经P/LU对照及原图/穴名跳转，将作者、修订、许可、标准出处全部移入同一官网专区。不是只处理新真人图。最终源码b6c6c30，合并质量构建40079692689，之前544069b质量已成功并于08:50:52Z上线，最终发布另补。

- 本轮将3张样机截图从宣传图片营销移到E评估/开发样机证据/20261024_经穴联动，保留原件，不混作正式客户端营销图。正式照片简洁展示截图及平台/源码说明保存在营销补拍目录。仅移走草稿、未删除学习素材。

- 78.12最终交付：合并源码b6c6c3054056124cc811dcd055112fb2f87a9f4b，完整云质量40079692689成功；Web制品12554448761/ZIP SHA c7def555b524923f37b4902f710bf8275652eb5bd3e5bedeadf9a08f9f1fff5a，2366文件逐SHA核对后08:56:01Z切换上线，网站清单SHA de0161778d2f8f3bfc40dadcc50da0b044906fdc734f0a5e1e585095c23001af。证据E评估/发布资源/全部穴位图片说明集中官网部署.json；回退为544069b，但其旧肺经图尚未集中，完整功能有效旧版f9432fd仍保留。
- 正式浏览器真实操作通过：尺泽详情见“经络图文对照”，原穴名跳转与原图保留；逐图“来源及修订”数为0；真人照片放大/关闭正常，只有必要读图提示和简短许可入口。官网集中页可见肺经SVG完整作者/修订/许可及两张真人照片完整出处；真实手机尺寸网页截图正式网站_真人照片集中署名简洁展示.png，不冒称iPhone真机。
- 本轮只清理新生成两份py_compile缓存，3张样机截图移出营销目录但未删除；安装包/缓存整体轮换仍未完成，清理CMD维持停用。主E目录只读未同步报告镜像；C两报告已逐字节同步。用户要求的后续合并原生打包仍待，不把网站上线等同原生UI已更新或正式商店已发布。


### 78.13 Google静默跟进（2026-10-24 17:59东京）
- 仅只读核对个人账号8539674148718133275的Google官方应用转移页；仍显示“西伯利亚狼已接受”言道学外语、2026-10-20待处理，目标8056957676688740507。应用表无结果并出现Google读取错误4C3D8749，不能当作迁移完成。未取消、更改、重新提交该请求，未启动国学转移或向个人账号重提健康应用。
- 首页实际读回国学仍在个人账号，正式版存在、更新被拒/1政策问题；无新完成证据。证据E评估/发布资源/Google迁移_20261024_1759.png；仅保存本次状态，不记录验证码、交易ID或密钥。临时Google标签已关闭，没有新脚本、安装包或缓存。无需要用户操作的变化，按要求静默继续监测。
- 更新唯一报告及主账本，C根入口副本同字节核SHA；负责人保护的E主资料目录不写入，因此该E镜像仍未同步，不冒称完成。原清理CMD停用与整体待验收状态不变。


## 78.14 取消Google定时、合并2143/52、逐功能截图及完整交付（2026-10-24）

### 负责人本次范围与Google
- 负责人要求删除定时跟进，未上架商店暂不处理，整理最新包/源码/各功能一图及说明，并交完整报告。automation_update(mode=delete,id=google)返回deleted；未暂停冒充删除，也未新增替代任务。最后真实Google状态沿用78.13的17:59东京只读回执，旧版仍在线、更新被拒、语言应用迁移待Google处理；国学公司迁移未完成，不能写“最新版已发布”。本次没有再次提交、修改或取消任何产品转移。
- 本轮没有访问或提交未上架的OPPO/荣耀/华为/腾讯新审核，不撤苹果原正式36任务；其正式当前状态本轮未重查，不能把历史等待状态当新回执。

### 实际客户端与网站
- 原生同源提交7c0cf3038da0a17cb7a1673826860cfcd2607e74：Android2143构建40080758448成功；Apple52构建40080761184成功并上传；完整质量及Web构建40080763416成功。本轮仅提高Android构建号，合并78.12的来源精简及此前毛发、3D、图片和学习功能，不为单条文案再独立打包。
- Android APK90,627,191字节，SHA e6296e6475d2ec30ca0e0be318fb6cb5bd06189c87c2667fe2b4b2dabe7fd507；AAB74,611,697字节，SHA 3c4dc937eba704b267bf1a2f987cf462aa8cccfd3349bc153272799c629b1666。位于E评估/原生安装包/Android_25.0.115_2143_internal；这是internal配置，不可冒充Google渠道AAB直接提审。已保留原数据覆盖安装Success、系统读回2143/25.0.115，真实首页截图在本轮图册08_安卓真机/2143_首页.png。后续截图时前台已回到手机桌面，停止继续操作，未将桌面帧当导航通过；完整手机触控和付款等仍待，不用网站结果代替。
- IPA57,726,834字节，SHA 1084e048bd1f1dde54b13c5e4a59f6b75ea98695d3ba52eefd1a8d272decde9d。位于E评估/原生安装包/Apple_25.0.115_52。Apple官方09:28:33Z读回build f43ad057-6740-4acc-8d0d-006af8bd30da，VALID/IN_BETA_TESTING、原内部组关联；首次09:15记录尚未可见时只等处理，没有重复上传。证据发布资源/苹果52内测读回.json。用户用已有TestFlight内部组安装；签名IPA不是网页直接安装包，实体iPhone仍未由代理实测。
- 逐包验证28张经络动图、11份原尺寸动图、11天体纹理、两张真人原图与manifest SHA；APK/AAB/IPA各有verified清单，未复制私钥到源码。
- 网站09:16:00Z同源上线/root/yandaoguoxue/releases/v25.0.115-calendar-community-7c0cf30；2366文件全SHA核对，制品12554718099/ZIP SHA 665265cf4287f3caed9fb523dca1349ff578958fb267c63d15aa8752d7a51068，清单SHA eebaa194155da4f571983aaca5e813d51fa8ee30235fc65e9da4789b8e13c52b。相对b6c6c30只有1文件变化、2365复用，截图UI同源。回退b6c6c30。证据发布资源/2143_52合并同源网站部署.json。网站发布不是商店发布。

### 图册、源码与营销
- E评估/宣传图片营销/00_交付首页.html为非技术入口；E评估根00_言道国学最新交付首页.html和当前工作目录outputs/言道国学_最新交付入口.html仅指向它，不是新交接报告。272个本地链接已检验存在。最新版图册20261024_最新版逐功能截图/页面索引.html包含129个非管理员、非私人会话独立路由各一张真实390×844网页手机竖屏图及说明，另有1张2143安卓首页真机图。截图清单逐张记录尺寸、字节与SHA。原总190路由中管理员、私人档案/具体会话、缺上下文及旧未拍路由仍排除，不能叫190路由全验收。
- 捕捉后先核实际尺寸并重拍为390×844；等待异步正文/真实结果，不以输入弹窗或加载页充数。八字、紫微三合、大六壬、奇门、六爻、梅花和七政补真实排算结果；紫微回顶部防裁掉宫位，七政核退出全屏；阴符经等到正文而非目录，3D等人体/穴名可见，原心经动图实际放大。QA拼图在发布资源/本轮截图质检。无会话/无收藏等保留实际空列表；学习服务核验中、合伙人、私密或缺上下文页只作盘点，不作营销主图。全部网页图不冒充iPhone真机图；苹果上架尺寸和真机资料另需依平台准备。
- 每个功能截图说明.txt、商店中文介绍与配图方案.txt及最新商店介绍_2143_52.json已生成。先经典/听学、3D与原动图、题库，再同辰与同证学习、天文/五运六气、本机记录、工具规则对照；不宣传诊疗、婚恋保证、完整宇宙、全部古籍/逐穴照片或全部专业核校。通用中文稿移除Google独有购买段；JSON保留按渠道区分标志。文件是素材/设计稿，本轮未向任何商店上传营销图。
- 源码包在宣传图片营销顶层言道国学_完整源码_2143_52.zip，86,262,474字节，SHA a02be9596db0d233f0a5b09064e06b160d0d70fc470cc9f0652b1c77cd5be672；2448 ZIP条目CRC通过，来自git archive精确7c0cf30，不含.git/依赖缓存/签名密钥。源码包校验说明.json列复现信息；大型模型/原典等走既有资料包，核心原件仍在永久目录/COS，最新交接通过首页指向唯一文档，不把代码提交时的历史报告冒称本次最新报告。

### 后续减少打包的真实边界
- 新增docs/requirements/client-content-update-boundary.json逐项登记支持的现有课程API、学堂、原典离线包、3D包、照片清单和AI规则更新路径、限制及来源文件；也明确herbs/formulas构建时import、tcmScraper静态字典、原经络部分资源和toolConfigStore本机配置尚非统一远程管理。overallAllContentServerEditable=false。这个清单是审计结果，不把文档或占位入口当远程化开发完成。
- 原生权限、支付、组件、算法、新交互和新数据格式仍须正常客户端发布，不远程下载执行代码绕审核。后续仅改已支持内容时优先受控后台/COS发布，先核版本/许可/原件/SHA/兼容/回退，不为该类文案重复打包；尚未接入项的迁移需具体开发与验收后统一合并。

### 清理、回退、交接与仍待事项
- 统一E评估/本轮评估临时物清理.cmd已重建为35个精确目标3,286,598,575字节，SHA 544aacc78c18eb822135284ae36575037973316dbcc598b9f026865feb8b685b；仅准备，未执行。先由负责人确认2143/52，再核当前APK/IPA整包SHA及新旧文件夹存在、拒绝目标重解析点，才逐条删除临时依赖/缓存/本轮样机产物及过时包。保留2143/52与一个已验证2139/47旧版，坏2140/49不是回退。旧包verified清单归档发布资源/经穴联动历史包元数据_轮换保留.json。C旧清理入口和营销目录CMD只转发到本轮唯一E清单，不再保留历史广泛删除目标。模型、原图、28动图、源码、有效证据、日志和密钥不在清单中。
- C唯一报告与根入口同字节；本轮在非保护E评估/交接报告镜像_只读/新增同字节镜像（不可独立编辑）。原E:/八字命理类文档包括排盘方式电子版/受负责人保护，不覆盖其历史镜像，明确不把该旧目录写成已同步。
- 07/09/10全项目、旧局部照片找回、全医学逐条/坐标专业审校、实体iPhone离线/手势/支付到账、双用户/原离线105/106等旧缺项仍OPEN；两张新真人照片仅覆盖7穴，不是全套。源码提交推送、报告镜像和素材交付不代表这些缺项已通过。未执行的35项物理清理仍待负责人CMD操作。


## 78.15 给接手开发的完整接管总览与执行顺序（2026-10-24，东京时间）

> 本节是对当前事实的集中交接，不是又一份报告，也不代表历史全部任务已经完成。先读本节，再按78.14的证据和各专题历史章节核对。此轮只整理文档，不改应用、不重打包、不再次提审；以下商店状态均注明最后核验边界。

### 一、项目身份、唯一工作区和接管起点

| 项目 | 接管事实 |
| --- | --- |
| 产品范围 | 只处理言道国学；不改言道学外语、AI推广平台及其他产品 |
| 活动仓库 | C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance |
| Git远端/分支 | wzmpa18/minglizyi；codex/tencent-store-compliance。禁止因main旧版或另一个同名目录而覆盖当前工作区 |
| 当前客户端代码 | 7c0cf3038da0a17cb7a1673826860cfcd2607e74；后续549cb31等为交接/营销文档提交，功能代码仍以此为构建基线 |
| 安卓身份 | com.yandao.guoxue，25.0.115，versionCode2143；当前交付为internal配置，不能改名冒充Google专用包 |
| 苹果身份 | App6807592575，com.yandaoguoxue.app，25.0.115，build52；与安卓包名不同是既有签名身份，不要统一改名 |
| 唯一可编辑交接 | 本文件交接报告/FINAL_PROJECT_HANDOVER.md；根FINAL_PROJECT_HANDOVER.md为兼容副本，E评估目录只读镜像不单独编辑 |
| 必读文件 | 父级AGENTS.md、仓库AGENTS.md、交接报告更新与工作区清理制度.md、PROJECT_MASTER_LEDGER.md、本节及78.14 |
| 本轮交付首页 | E:/言道国学3D评估_12A/宣传图片营销/00_交付首页.html |
| 当前工作区入口 | C:/Users/ZhuanZ/Documents/Codex/2026-10-17/e-c-users-zhuanz-documents-codex/outputs/言道国学_最新交付入口.html，只转到同一交付首页 |

接管第一步必须核git status、分支、HEAD与上游；发现未提交改动，先确认来源和目的，不能盲删/盲提交。源码ZIP不是新的活动仓库，也不包含最新交接文档后续增量；日常修改继续使用上表活动仓库。

### 二、已交付的包、源码、网站和证据

1. 安卓APK与AAB：E评估/原生安装包/Android_25.0.115_2143_internal/。云构建40080758448成功，覆盖安装Success、系统读回2143/25.0.115、首页真机实拍。已验证原签名构建、版本与入包资源；完整真机全功能测试尚未完成。
2. 苹果IPA：E评估/原生安装包/Apple_25.0.115_52/。云构建40080761184成功，Apple在2026-10-24 18:28:33东京读回VALID、IN_BETA_TESTING、现有内部组关联，可用TestFlight测试。未冒称实体iPhone离线、购买到账、组件与全部手势已验收。
3. 完整质量构建40080763416成功；网站 https://yandaoguoxue.yandao.vip/ 于18:16:00东京切到同源7c0cf30，2366文件全量SHA核验。当前静态发布/root/yandaoguoxue/releases/v25.0.115-calendar-community-7c0cf30，current软链接；回退b6c6c30。不得把网站更新当作旧内置APK/IPA也自动改了UI。
4. 资源入包验证覆盖28张经络动画、11份恢复原尺寸的自有动图、11天体纹理、两张许可真人原图及清单。构建成功仅证明这些检查，不等于逐穴医学准确、所有书全文或全部手机功能通过。
5. 源码ZIP在营销目录顶层：言道国学_完整源码_2143_52.zip，86,262,474字节，2448 ZIP条目CRC通过。由git archive精确7c0cf30导出，不含.git、node_modules或签名私钥；依赖用仓库锁文件安装，大模型/资料包沿原存储渠道取得。

| 交付物 | SHA-256 |
| --- | --- |
| APK2143 | e6296e6475d2ec30ca0e0be318fb6cb5bd06189c87c2667fe2b4b2dabe7fd507 |
| AAB2143 | 3c4dc937eba704b267bf1a2f987cf462aa8cccfd3349bc153272799c629b1666 |
| IPA52 | 1084e048bd1f1dde54b13c5e4a59f6b75ea98695d3ba52eefd1a8d272decde9d |
| 同源源码ZIP | a02be9596db0d233f0a5b09064e06b160d0d70fc470cc9f0652b1c77cd5be672 |

主要外部证据集中在E评估/发布资源：2143_52合并同源网站部署.json、苹果52内测读回.json、2143_52截图交付核对.json、2143_52最终交接校验.json；各原生目录内还有verified-packages.json或verified-package.json。校验当前文件，不根据文件名或旧聊天断言交付成功。

### 三、商店真实状态和禁止误操作

| 渠道 | 最后已核事实 | 接手要求 |
| --- | --- | --- |
| Google Play | 2026-10-24 17:59东京：旧版仍在线，新版更新被拒；个人账号8539674148718133275。目标公司8056957676688740507；现有学外语转移对方已接受/Google待处理，国学尚未迁入 | 保留原请求；不取消、不修改学外语，不在个人账号重提相同健康版本，不删除真实健康声明。本轮未再复查，不能虚构今天之后的状态 |
| Google定时 | google自动跟进已通过应用工具实际删除 | 用户要求删除，不得自行重建或换一个任务继续轮询；以后只有明确需要或再次授权才手动处理 |
| Apple | 最新52为内部可测；原正式36任务曾提交，本轮未核其最新审批结果 | 内部上传、Apple处理完成、TestFlight可测、正式提审、正式发布必须分开。不要为文案盲撤36，不重复提交 |
| OPPO/荣耀、华为、腾讯 | 历史有草稿、退回、账号归属/认领等记录，不能把历史登录或上传当批准 | 用户最新要求“未上架先不管”，此轮不操作。以后恢复前先读实际退回原因、包归属与在途审核，再决定，不重复创建或认领 |

此前Google拒审的组织账号要求与真实健康功能有关，不是把类别或声明隐藏就解决。当前internal AAB不是Google渠道构建；迁移条件解决后，如需要Google发布，必须核Google对应渠道能力、购买策略、健康/UGC/隐私申报，再生成正确渠道候选。

### 四、3D、穴位与原学习图片的当前功能

- 当前三维基于固定来源的TCM-3D/Human Atlas共同基座，保留原真实几何；并非把多个同源模型重复计数当作更多人体。组织窄侧栏位于左侧，默认收起；名称选择/定位、显隐、只看、隐藏、半透明、撤销/重做、恢复隐藏和视角复位各有明确行为。
- 长按逐件剥离、显式连剥、触摸移动/双指取消长按、按真实解剖结构整体而非碎网格隐藏已有实现与专题测试。2135/2141等旧版有真机交互证据，不能把它们的截图标成2143或iPhone。
- 阴毛在显示和组织目录排除，原模型文件不删除；头发可独立隐藏和恢复，供看头部穴位。不得切掉头皮或移动穴位来假装没有遮挡。
- 经络分14种颜色；显示中文穴名，缩放后允许展开更多名称，点穴名/圆点接原数据库详情，详情能返回同侧3D。印堂与别名有独立映射处理；当前自动映射检查不是逐穴临床认证。
- 原十四经人体动图与十四经骨骼循行动图共28张已恢复；其中11份原件按分辨率、帧数和时长恢复。不能再用古籍图、简化线条或3D替代原动图、局部照片。
- 用户所说前几天的整套真人局部穴位照片仍未找回。已经核查旧APK2117–2128、历史Git图片、57归档目录、旧COS索引、保护E文件和服务器41份发布（5458图片/模型文件）；没有证据证明整套原件已恢复，也不能断言从未存在。
- 新增真实许可摄影只有2张原图、关联7个标准穴位。研究图红点与蓝色Sham对照点严格区分；下极泉不能冒充HT1极泉。AI仿真图不能当真人摄影、医学精确点位或旧照片找回。
- 图片作者、原始出处、许可与修改情况集中到官网/privacy/#acupoint-photo-credits；图片附近仅留简短入口和必要读图提示，不反复堆许可文案。其他学习正文的来源/准确性边界不能因此伪造或删除。

关键文件：src/components/anatomy-atlas/{AtlasViewer.tsx,AtlasScene.tsx,atlasState.ts,atlasStructureTree.ts,atlasPointLabels.ts,atlasPack.ts}；src/app/zhongyi/anatomy3d/page.tsx；src/app/zhongyi/meridian/page.tsx；src/algorithm-core/modules/tcm/meridians.ts；src/lib/tcmScraper.ts；src/lib/acupointPhotos.ts；src/components/{AcupointPhotoGallery.tsx,AcupointStudySources.tsx}；src/app/privacy/page.tsx。

### 五、核心资料位置与不可删除规则

| 资料 | 位置/证据 |
| --- | --- |
| 永久本地核心目录 | E:/言道国学3D评估_12A/核心学习资料_禁止删除/；真人穴位照片原件、清单、NOTICE和COS回读在其真人穴位照片子目录 |
| 用户原经络动图 | E:/八字命理类文档包括排盘方式电子版/整理出来的倪师课件已上传网站的资料/经络动图；主资料目录保持只读 |
| 私有COS保全桶 | yandao-guoxue-1300262413，ap-beijing，learning_content分区；不放开ACL |
| 原图片完整保全 | learning-content/system-media/2026102401/，57对象完整读回；含42发布图片、11GIF原件和SVG完整快照；ZIP SHA ef581102ec1fb05283d9be5fa23c3070d801b042d3d62590278d9a5801761a08 |
| 真人图增量保全 | learning-content/system-media/2026102403/，5对象完整读回；ZIP623751字节，SHA247d4d4fe5e02e4c1edc3b3503d7b12cadb821e47aebbff26748975920c5c1dc |
| 四层模型包 | learning-content/offline-packs/tcm-anatomy-3d-v2/2.1.0.pack；41,748,876字节，SHA feadf6c3b5db170c338b2d72559a56b8d7bae95ae8cd01a7a155301a95ef5cbb |
| 来源/存储台账 | docs/requirements/study-media-storage.json、anatomy-atlas-data-protocol.md、anatomy-sidebar-12B.md和public/assets下对应MANIFEST |

数据、代码、模型、文本与标准的许可分别核对。MIT代码不代表第三方模型/图片随意用；meridian-atlas的AGPL-3.0代码不得未评估义务就并入闭源APP。自有存储的归档许可不自动扩大为前台所有用户公开下载许可。只能保全合法取得的材料，不能因网上可见就整站复制现代课程/药典。

### 六、服务器更新：哪些已支持，哪些必须继续做

先读docs/requirements/client-content-update-boundary.json；overallAllContentServerEditable=false，是实情，不得改标志冒充完成。

| 内容/能力 | 当前方式 | 接手动作 |
| --- | --- | --- |
| 入门课正文/自测/解析 | studyCatalog.ts，schema1/reader1；受保护/api/academy/admin/starter-content，原16课内置备用 | 按现有格式补审核后的纯文本，不为这种文案打包；核revision、离线备用和旧作答兼容 |
| 学堂知识点/章节/题库 | academyApi.ts及现有学堂后端 | 复用真实管理员权限和发布流程；上传解析不等于可直接上线，不向普通注册者授管理权 |
| 原典版本 | TcmEditionProvider.tsx + tcmEditionPack.ts，已安装的tcm-original-editions-approved资料包 | 核完整篇章、来源版本、兼容和本机听学定位，不能把正文接口200当整书已全 |
| 3D/模型资料 | atlasPack.ts与offlinePackClient.ts，现有格式、版本、校验、缓存 | 模型放自有COS按需取，异常保留最后有效包；新手势/渲染能力不是数据更新 |
| 真人照片 | acupointPhotos.ts受限清单与自有图片路径 | 原件不改，扩充前做授权/署名/医学核校；固定域/路径/大小限制，不接受脚本/任意外链 |
| AI规则与原文依据 | backend_deploy既有规则模块 | 受保护后端更新并留真实模型样例；不改支付/额度语义，不为服务端文案重打包 |
| 药材/方剂基础字典 | herbs.ts/formulas.ts当前构建时import | **尚待远程化**。先设计有界资料包、旧ID兼容、来源与审核、SHA与revision、缓存、原子替换/回退，再接现有列表/搜索/详情 |
| 逐穴静态说明/部分原图路径 | tcmScraper.ts、原动图清单与内置路径 | **尚待远程化**。不能只在服务器放JSON而不改读者；必须真实演示旧客户端能力内更新与离线回退 |
| 部分工具开关 | toolConfigStore.ts仍存在本机localStorage | **不等于跨设备后台配置**。复用既有后端权限/审计补服务端配置，保留安全的本机缓存和默认值 |

迁移资料的共同验收：保留全部旧有效ID/章节/图片与历史引用；字段白名单、文本渲染，不执行远程HTML/JS；有版本和长度/数量上限；断网仍读有效缓存/内置资料；坏包/低版本/未知格式拒绝；发布原子化且并发冲突不盲覆盖；回退作为更高revision发布；新版资料验证成功前不清旧版。医学正文更新必须有适当专业复核。原生权限、内购、系统组件、算法、安全或新交互仍须正常客户端更新，不能承诺“永不打包”。

### 七、账号、购买、安全及交流的接管底线

1. 登录态沿用现有refresh/恢复机制；不能临时断网就登出或清记录，不把重启等同用户主动注销。手机号注册成功时真实验证码结果持久保存，随后沿用，不给交流整页再加短信墙；邮箱用户正常登录浏览。公开发布/发送需要的真实校验仍由服务端负责，不伪造verified，不把手机号字段存在、客户端布尔值当验证成功。
2. 新账号ID走持久序列，从创世纪100000之后按既有已用编号继续递增；100075只是迁移时基线，不能每次重置。保留历史高位编号、订单/好友等引用，失败事务不耗号、注销不重用、并发唯一；不得导入/测试绕过写入器。
3. Apple购买链路看appleIap.ts、AppleLearningStore.tsx、ApplePurchaseInit.tsx以及backend_deploy/appleIap{Routes,Verifier,Ledger,Policy}.js。用户成功弹窗不等于服务端权益到账；核签名、产品/交易、环境、去重、原账号、会员/点数入账和恢复。未知测试账号缺沙盒许可时只为实际测试账号核验配置，不全量放行、不要让用户再付钱。
4. 当前购买/恢复故障仍需真机账户对应和原订单回读。只在真实额度不足时引导开通/点数；网络、身份或服务器错误不能劝重复购买；主按钮明确开通、购买、恢复，不以“暂不开通”作为主要动作。价格/八折活动和既有权益不擅改。
5. 真实管理后台、角色权限、审计和举报处置必须保留；安全评估截图通过不代表这些能力可以删除。业务日志按制度至少六个月，不记验证码、私钥、口令、令牌和敏感正文；有效审计/备份不是垃圾。不得以数据库导出拼图冒充后台能力。
6. 工具/穴位文字交流500字上限，服务端审核、举报、屏蔽、删除、申诉和预算/超时隔离；规则或AI不确定不能自动放行。不能宣称敏感词过滤保证所有风险都覆盖。用户不接受每条都写“提交审核”，按钮用“提交”，流程依然真实存在。
7. 同辰/同证成年人自愿加入、可退出、双方同意、稳定化名；不导入客户、亲友、未成年资料，不制造假用户。私人健康/人生记录默认本机，只有本人选择并预览确认的副本才分享。症状相同不等于病因/治疗相同，传统盘面不证明两人合适，不把用户治疗经历变成平台处方。
8. AI需要具体盘面字段、推演步骤、成立条件和反例、可复盘问题、温和关怀及可核经典出处；不用重复套话、恐吓、夸大保证或伪造书名原文制造情绪价值。不把已知错误报告扣点后交付；不能所有工具都用同一篇泛化内容。

### 八、各功能未完成/待验收清单（不可一笔写成全完成）

| 优先级/主题 | 必须继续做的事情 | 验收证据 |
| --- | --- | --- |
| P0购买与权益 | 定位用户真实TestFlight账号及原沙盒交易；验证月/季/年权益与AI点数恢复、重复回调、取消/失败及账号切换隔离 | 真实iPhone操作+对应服务端去重入账记录，不能以成功弹窗/接口200替代 |
| P0离线包 | 复核iPhone的3D包下载/校验/换版本/断网启动；安卓完整走一遍；历史离线批量105/106失败逐包定位 | 网络失败、坏SHA、权限、空间不足、重启和保留旧有效包的记录；不自动清私有数据 |
| P0身份/管理 | 确保一次注册核验沿用、不新增整页验证墙；越权、被封禁、普通注册混入管理权限等回归 | 真实HTTP鉴权/角色拒绝、实际管理UI和持久日志 |
| P1资料远程化 | 完成第六节尚内置的药材/方剂/逐穴/配置读者迁移；服务器资料更新不反复重打包 | 同一安装包更新前后真实内容变化、旧数据兼容、断网与回退全过程 |
| P1原资料恢复 | 继续追查局部真人照片，合法补图并关联准确点位；原动画不减；董氏、经方、医考等做来源和覆盖审计 | 每份原件/授权/SHA/显示位置/COS完整回读；专业核校，不用AI照片冒充 |
| P1经典学习 | 按每本书逐篇核完整范围、来源/版本、听学顺序与书签；倪海厦/归真等现代内容先核授权 | 书目录与原文篇章对照、许可、真实连续听学；不能宣称“全部古籍/全部教材” |
| P1工具准确 | 八字合冲刑害、紫微三合/飞星/四化、小星/虚线、六壬宫位解析、六爻本变爻、梅花动爻、七政盘式全屏与罗盘传感器逐项复核 | 已有资料和边界例，真实交互/计算结果；不因改布局改算法、不删笔记或旧功能 |
| P2社交闭环 | 07/09/10的工具交流、同辰/同证、活盘分享、本机记录与日历联动逐条对照现有验收表 | 两位自愿成年人、两台真实设备；权限/撤回/举报/删除/隔离和不泄露私人库 |
| P2组件/提醒 | Android/iOS桌面/锁屏组件、通知、修改取消、农历生日/闰月/缺日、重启强停、省电及功耗 | 对应物理设备和系统支持范围；不拿网页时钟/快捷方式冒充原生组件 |
| P2天文馆 | 定位拒绝/手动地点、日期边界、日月行星及高清纹理、五运六气原典对照与来源 | 真实时地结果/交互和科学边界；当前不是完整宇宙、全功能Stellarium或JPL扩展 |
| P2语言/主题 | 只按用户要求完成导航/按钮的简繁/日英，正文不强制全量翻译；国风主题不破坏盘位、可读性或历史恢复 | 主要页面控件覆盖、切换后旧记录可用，不凭截图宣称全部正文已翻译 |
| 发布前 | 正确渠道包、真实商店截图、权限/UGC/健康/隐私/内购申报与同版本去重 | 商店实际回执；当前用户暂停未上架渠道，不得擅自恢复发布 |

整体状态文件docs/requirements/release-readiness.json仍有历史候选及INCOMPLETE/NOT_ACCEPTED；docs/requirements/life-records-09.acceptance.json、research-10.acceptance.json亦需逐项复核。旧candidateSource不能直接当2143/52验收。更新这些表时逐条附证据，不能为了让发布脚本通过而改成true。

### 九、开发从哪里下手：模块地图

| 工作 | 主要入口 |
| --- | --- |
| 页面/工具 | src/app/yixue/、src/app/zhongyi/、src/app/academy/，算法在src/algorithm-core/ |
| AI质量 | backend_deploy/chartStudyQuality.js、toolStudySources.js及对应部署/回归脚本；先核服务器文件SHA再更新 |
| 身份/登录 | src/lib/auth.ts、authInterceptor.ts、AuthRestoreInit；backend_deploy/businessIdentityGate.js及现有账号注册/序列模块 |
| 评论、研习、同辰 | ToolStudyDiscussion、backend_deploy/studyResearch*、tongchenRoutes.js/tongchenStore.js、studyModerationAutomation.js |
| 私人档案/分享 | src/lib/life*.ts、对应活盘/私有资料页面；保持本机加密与逐项授权边界 |
| 历法/提醒 | src/lib/calendar*.ts、nativeCalendar、NativeCalendarInit、原生平台组件工程；复用既有历法，不另写一套不一致算法 |
| 离线 | src/lib/offlinePackClient.ts、offlineDownloadLink.ts、offlineVersions.ts；backend_deploy/offlinePackEngine.js、offlinePackRoutes.js |
| 发布/资料保全 | scripts/deploy_verified_web_preview.py、retain_verified_study_packages.py、archive-study-media.py、publish_tcm_atlas_pack.py |
| 构建与门禁 | .github/workflows/{study-quality,android-build,ios-build}.yml；verify-static-cache-boundary.cjs、verify-meridian-media.cjs、verify-android-identity.js、check-private-keys.cjs |

部署脚本记录的后端工作目录为/www/yandaoguoxue-backend，PM2名yandaoguoxue-backend，健康接口127.0.0.1:3001/api/health；认证数据另有独立目录。以上是现有脚本/历史部署位置，不是本轮重新登录核过的服务器快照。先只读确认现况及SHA，禁止直接全仓覆盖后端、整库恢复、复制旧注册代码或改其他产品。只更新明确清单内文件，留当前+一个有效前版，健康/回读失败回退。

### 十、构建、验证和回退的要求

- 环境以锁文件和工作流为准；Next.js16静态导出、React19、Capacitor8，CI Node22；不要在生产依赖中混装多个包管理器或在C盘再复制整树node_modules。需要依赖时优先现有云构建与隔离评估目录。
- 本轮只改交接文档，不需要重新运行全套构建或再打一个2144/53。开发发生实质代码变化后按影响跑测试；客户端功能合并完成再提高版本并构建，禁止为改说明、更新报告或支持格式内资料每次重打包。
- 静态站和内置客户端不能启用Next.js的deploymentId握手。2140及Apple48/49因此出现“首页可见但导航无内容切换”；已修复并新增verify-static-cache-boundary.cjs，48/49内部包已停测。不要复活该实验或把问题包作为回退。
- 相关已有测试：acupoint-photos、atlas-sidebar、atlas-point-labels、offline-versions/download-link、auth-session-refresh、apple-iap-client/http/ledger、历法/分享/评论/研习等。完整study-quality成功是基础，仍需实际页面/真机验收。
- 网站回退使用已核资源目录切换current，先看当前实际指向；后端按文件级previous回退，不覆盖账号、订单、日志、密钥、用户新数据。原生回退涉及安装兼容/版本限制，保留包不等于能无损直接降级，不卸载或清数据来“证明修复”。

### 十一、截图和营销交接

当前最新版资料统一在E评估/宣传图片营销：00_交付首页.html、20261024_最新版逐功能截图/页面索引.html、每个功能截图说明.txt、截图与页面清单.json、商店中文介绍与配图方案.txt、最新商店介绍_2143_52.json、源码ZIP与校验说明。旧2135/2138图仅历史证据，不混成当前图。

129张390×844为正式网站手机尺寸实拍，另1张2143安卓首页；不是129张iPhone真机截图，也不是190路由全验收。苹果正式截图还需按平台要求准备真实对应设备内容。设计只在外部版式加标题/留白，不重绘按钮、伪造用户/回复、修改盘面或包装未开放服务。主卖点先典籍与连续听学、题库、3D与原经络、同辰/同证自愿学习交流、天文与五运六气、本机日历记录；不宣传算命保证、诊疗疗效、婚恋匹配保证或已完成全部内容。

### 十二、清理、唯一报告镜像与接手后的交付闭环

- 当前唯一实际清理命令E评估/本轮评估临时物清理.cmd，35个目标3,286,598,575字节，仅准备未执行。C工作区outputs/guoxue-clean-20261018.cmd及营销目录同名入口都只转发，不照搬旧报告清理目标。
- 先由负责人确认当前2143/52正常，再核APK/IPA SHA及回退存在；只保留当前2143/52和一个有效旧版2139/47。问题2140/49不能作为回退。源码、核心资料、原图、有效证据/审计/备份密钥不进入清理；清理前必须再次确认每个解析绝对路径都在明确范围内，执行后逐目标核结果并记实际释放空间。
- 受保护E:/八字命理类文档包括排盘方式电子版/不动。可编辑C唯一报告→C根兼容副本→E:/言道国学3D评估_12A/交接报告镜像_只读/同字节自动同步并核SHA；原受保护目录历史镜像未覆盖，不冒称已更新。
- 每轮完成后记录：具体改动/文件、代码提交、资料revision、实际测试与证据、真实网站/内测/审核/发布状态、未完成项、回退、清理结果和镜像SHA。有效代码提交推送，git status为空、HEAD与上游一致；不能用“后续持续更新”代替交付。
- 第一轮接手建议交付：当前安装包/网站只读复核记录；P0购买和离线问题定位；内置资料远程化迁移方案及首个真实闭环；07/09/10对照清单的证据差距。先解决真实缺口，不重新做已有阅读器/评论/历法，不撤审核、不重复上传、不自动重启Google跟进。

### 十三、本次文档整理的边界

本次新增本集中接管总览与“接手开发执行说明.txt”，更新主账本、C兼容副本、非保护E只读镜像及交付入口。没有修改功能、价格、账号、数据库、密钥、资料包或商店状态，没有新打包、新提审或新定时任务；不把文档完善当作未完成研发已经完成。核对报告镜像SHA、diff与私钥扫描后提交推送，后续开发按以上优先级继续。


## 78.16 2026-10-24本轮接管、素材保全及离线下载首批修复（执行中）
- 最新直接要求：阅读E评估只读交接镜像并完成现有版本，完整社交和全部模块不删减；历史留存改为今天之前已上传商店的最近三个，今天不计入。已按负责人指定读取旧工作对话近期记录，特别核实原图片不可替代、登录保持、抽屉方案和离线失败原话。历史旧要求仅作证据，不能覆盖最新要求。
- 接管基线1c38d42，分支codex/tencent-store-compliance，开工status空、上游0/0。与7c0cf30相比仅文档/素材台账变化；源ZIP实际SHA与既有a02be9一致，2448项CRC完整通过。E镜像与C报告/总账开工同SHA；镜像按负责人提供的只读范围未改，收尾C增量尚未同步镜像，不写已同步。
- C:/Users/ZhuanZ/Documents/Codex/2026-09-20/referenced-chatgpt-conversation-this-is-an/tencent-store-compliance/src/lib/offlinePackClient.ts修复断网丢失已收分段、完整残片未重置起点、错误Content-Range混接及超大小响应；没有进度回调也保存网络中断前已收字节。SHA与数据协议先验后才启用，坏包/权限失败保留旧有效资料。src/lib/storageManager.ts新增activateOfflinePack，单IndexedDB事务写内容/索引/元数据并删除临时片段，存储失败整体回滚，并发不同包不丢索引、旧下载不能覆盖新版本或同号异SHA资料。没有修改教学正文、模型、原图、价格、订单和账户。
- scripts/offline-pack-client.test.cjs新增6项，连同既有苹果客户端/离线版本/下载链接共17项通过；基线网络中断测试实际失败（残片为null），修复后通过。更广106项105通过；既有security-assessment-http最后清理因Windows未关闭SQLite单例EPERM失败，功能断言已走完但不能写全通过。完整日志在D恢复点。新增测试已接入study-quality工作流，云端完整质量尚待本轮提交后回执。
- src/app/yixue/page.tsx仅按本轮明确要求将“一卦知天命，数理定乾坤”改为“研习易学资料，理解传统历法与术数文化”。仍有智能问诊旧文案，需要结合真实输出核实，不以改名冒充医疗行为核验。既有SafeRichText已接主AI入口，本轮没有重复重写；截图来源和各页实际渲染仍需逐项复测。
- D恢复点：D:/言道国学项目备份/20261024_接管前恢复点。repository.bundle全历史校验、独立bare恢复、fsck及读取package通过；原源码ZIPCRC和SHA通过。19个初始复制文件236930048字节逐SHA一致，包含核心保护目录现有文件、当前APK/AAB/IPA和营销原图；另保全三历史源码快照和对应包，以及3份模型包与原图保全ZIP。敏感生产配置/数据库及逐版所有远程内容尚非完整恢复，不能据此执行历史删除。历史候选Apple33/34/35与同源2123/2124/2127（含2127腾讯渠道）先保全并核原verified SHA，最终上传日期/渠道回执及完整资料依赖仍待核验，不称三个版本已全部恢复通过。
- AGENTS与本制度追加最新优先规则；E:/言道国学3D评估_12A/本轮评估临时物清理.cmd已加首段exit停用，原字节保存在D恢复点旧清理脚本_仅留证据.cmd.disabled；旧目标未执行，项目/历史资料删除0。E只读镜像、核心原件和营销原图未改。
- 证据：docs/requirements/takeover-20261024.json、D恢复点backup-files-sha256.json及本轮恢复与校验.json。未新构建2144/53、未部署网站/后端、未上传商店、未撤已有审核、未改Google迁移或恢复定时。下一步继续完整社交服务端链路、实际账号/设备购买和离线、资料远程化、源内容审校及最终素材；总体任务仍未完成。记录时间2026-10-24T21:29:37.306230+09:00。


### 78.16续：视频链接、AI排版与现有中医学习入口核查
- 首批1482451云端完整study-quality运行40094234368成功，包含类型检查、专题测试和Web构建；私钥检查40094234440成功。不能据此写实体设备/线上已修。
- src/lib/discoverService.ts改为解析真实hostname与pathname白名单，拒绝仿冒域名、查询参数伪装、凭证、特殊端口与非法路径；AV号正确用aid而非bvid。B站BV/AV、西瓜/头条原有支持范围保留，短链仍明确提示需完整地址。新增discover-video-link.test.cjs三项通过。视频提交/评论/举报服务端迁移尚未完成，未以此修复冒称社交闭环。
- 查实zhongyi/wenzhen和meridian两处aiResult仍纯文本输出，接入既有SafeRichText，保留内容和AI来源提示；新增两项真实React渲染验证标题/加粗/列表及HTML转义/危险协议拒绝。wenzhen另修iOS旧单次外部付款入口：使用现有AIAccessLinks进入App Store会员/AI点数与恢复购买，阻止旧支付弹层及处理函数；不改商品、价格、会员权限或服务器订单。
- 根据现有diagnosis实际返回空个人证型/方剂推荐、wenzhen个人自述走本机原文检索而固定公共问题才调用AI的代码，修正中医首页、会员、个人页及网站首页残留“智能问诊”介绍为文献研习/助学。仅使介绍符合已存在行为，没有删资料/路由，没有宣称所有医学输出或资质已核验。相关购买导航/iOS profile六项及新五项共11项通过。
- 安卓已连接，系统只读核实25.0.115/2143；手机当前前台为其他应用，未切换或操控，不把连接成功当图谱操作/购买/离线验收。实体iPhone仍无本轮测试证据。当前新增代码的云质量待本轮推送；手机安装包仍2143/52，未部署/发布。新增视频链接/排版代码和测试均纳入同一工作流。


## 78.17 2026-10-24 Apple53与密码恢复修复（仍在执行）
- 负责人最新直接授权撤回等待审核旧版，使用新版和最新学习介绍、真实截图重新提交；该授权覆盖此前不撤审核的旧要求。尚不能将TestFlight状态写成正式提审完成。
- b9c4c4a质量40094664966及私钥检查通过；同源Apple53构建40094969156成功，官方VALID且内部组IN_BETA_TESTING。真实iPhone/iPad模拟器40095020666通过，取回十张五主题截图待画面核对及替换。IPA已核Info.plist、原28动图/原图和资源SHA，E与D保全SHA为2fc413ca4ac0ded951bedd69d94bc5c4df951cd52c97f46f6589ce9adb573593。
- 官方上传日期核查：东京今天以前最近三个Apple为36、35、34，36已补存IPA、对应2128渠道包及a5361d7源码快照；先前33候选继续保留，未删除。各版远程资源和运行配置完整恢复仍未全部完成。
- 审核专用账号实测登录成功，按既有审计管理员接口赋予30天月会员，图谱授权返回200，Apple沙盒上下文有效；未改价格、创建付款或伪造手机号核验，审核账号手机号核验仍未完成。正式36及8项内购此记录时仍等待审核。
- 用户反馈手机号和QQ邮箱重置失败：只读核实为两个独立有效账号，未合并、改密或发验证码。根因是客户端已有reset-password请求，服务端无相应处理，身份拦截先返回401。补充真实一次性验证码恢复入口、限流白名单及auth_version旧会话撤销，短信真实验证成功才记手机号核验；邮箱恢复不会伪造手机验证。保留会员、用户ID、原资料。新增真实HTTP/SQLite/JWT隔离测试和既有社交HTTP测试全部通过，私钥扫描与diff检查通过。
- 生产server.js与仓库存在先前差异：部署工具只替换三份完全匹配基线文件，并对运行中server.js精确替换一次账户字段查询，不全文件覆盖；先私有备份数据库/代码、校验SHA、语法和健康，失败回退代码。此记录阶段尚未部署，不写已修复线上。
- 自动审批拒绝清理本轮两个临时验证目录，已保留且未换方法绕过。原工程、原图、教学资料及历史版本删除0。E只读交接镜像未改；C报告较镜像新增，不能称四处同步完成。


### 78.17续：线上恢复、已验证审核账号与Apple53正式受理
- 33b165e同源完整质量40098083986成功。密码恢复部署前SHA预览一致；线上仅四处精确变更，运行server.js原有差异保留，代码/账户库私有备份后重启健康通过，空恢复请求400。未替用户改密或发送验证码。部署证据保存在本聊天work/recovery-deployed.json，线上恢复点data/password-recovery-33b165e9d3ae。
- 负责人指定测试账户并明确允许用于各商店私密审核栏。本机记事本已在项目私密测试账户目录保存，ACL仅当前Windows用户及SYSTEM，账号密码不入Git/报告/营销图。实际登录200、真实phoneVerified=true；通过既有审计接口授予30天月会员，原手机号验证不改；精确追加苹果沙盒白名单，原白名单保留。实际Apple context、图谱授权200，私密审核字段读回一致；不把沙盒可用当真实订单到账证据。
- 按最新明确授权撤回原36等待审核submission8033d82a-74a0-4497-9ff3-57bcaad22f16，官方结束、版本DEVELOPER_REJECTED；保留历史二进制和商品。随后原版本关联VALID53，中文学习介绍/关键词/宣传说明与审核说明已保存，十张同源iPhone/iPad真实模拟器截图均COMPLETE后才删除旧截图引用。初次发布whatsNew不可编辑返回409，保留独立更新说明而未反复强改该字段。
- Apple53正式重新提交成功：submission5af19faf-5237-4059-9551-a14dc3513361，含一个App与八个既有内购；官方WAITING_FOR_REVIEW，submittedDate2026-10-24T13:36:36.285Z（东京22:36:36）。不是批准或上线。D:/言道国学项目备份/20261024_Apple53候选/苹果53正式提审回执.json及苹果53商店截图替换.json保存真实回执；不再运行旧assemble36脚本。
- 负责人再次强调注册一次完成验证，不能反复妨碍用户。本轮未新增普通用户验证步骤。追加真实HTTP测试：短信注册一次→验证码已消费→密码再次登录→刷新凭证→三个会话分别访问受保护POST全部200，数据库验证时间保持不变。已有验证手机号无需再发短信。邮箱注册只验证邮箱、首次交流仍可能要求手机，是现存差异，未擅自增加第二套注册短信，也未把邮箱用户伪造为手机已验证，作为待协调修复项如实保留。
- 总体仍未完成：完整双设备社交验收、视频服务端迁移、逐药材/方剂/穴位受控更新、医学来源审校、其他市场实际状态与替换、三版完整依赖恢复和安全清理等继续OPEN。没有将Apple受理写成所有商店已提交；没有删除项目资料，E只读镜像未同步。


## 78.18 2026-10-24渠道验证拆分及重启后商店核查（执行中）
- 负责人最新明确：国内与海外分开，Apple/iOS及Google Play海外不强制中国手机号核验；内容过滤独立，保留所有社交、举报、拉黑及私密授权。此项覆盖78.17把所有邮箱注册延后补手机一概视为待强制补齐的理解，不给海外注册增加手机号步骤。
- 查明businessIdentityGate与studyCommentsRoutes两处全渠道手机号拦截。新增channelIdentityPolicy，以既有原生platform/store-channel声明统一识别iOS和Android/google；海外仍需有效账号、未封禁和未注销，国内原要求不变。无伪造phone_verified_at，无审核专用身份例外。
- 实际HTTP回归通过：同一无手机号邮箱账号在iOS/Google可走受保护POST，在国内/未知渠道仍403；未登录401、封禁403不变。学习留言对两个海外独立邮箱账号均进入待审核，危险联系方式/疗效文本400，公开列表仍不显示待审，后续举报拉黑权限回归通过。先前跨渠道共用账号触发429为测试安排错误，已改两个独立合成账号，未放宽真实频率限制。
- 重启后IAB重新打开Google后台成功。个人8539674148718133275仍有国学、旧正式存在、一个政策问题与更改拒绝。公司8056957676688740507确为组织账号，目前显示外语、记忆训练、Rift Strike三项，无国学。个人转移页仍显示外语旧待处理请求，应用表无结果并报平台意外错误；刷新一次仍相同。未取消、修改其他应用转移，未新建重复包名，国学迁入和公司提交尚未完成。
- 本条记录时渠道修复尚未部署；商店材料与正式回执逐项核查中，不以本地文件准备完成冒称全渠道提交。Apple53上轮正式WAITING_FOR_REVIEW证据保留，尚待本轮独立读回。


## 78.19 2026-10-25商店提交、官网2144与停止桌面控制（总体未完成）
- 本轮跨东京午夜继续负责人10月24日交接任务。最新要求：完整现有社交/学习功能保留，国内与Apple/Google海外验证分开；产品为学习交流平台，不提供医疗咨询、个人诊断、处方或药品销售。阅读/图谱/药材方剂文献仍按实际功能申报，不用学习定位掩盖内容或冒称已有资质。
- 渠道修复529673f完整质量40100680193通过，已精确部署businessIdentityGate、studyCommentsRoutes和新channelIdentityPolicy；服务器备份data/channel-identity-backup-fb8a7a948e8d，健康及渠道策略检查通过。实际HTTP本地回归已验证无手机号邮箱账号iOS/Google可进入、国内仍拦截，账号、封禁、内容过滤、举报、拉黑不放宽；没有伪造手机号验证，也未声称真实生产双账号社交全验收。
- Android2144同源fb8a7a948e8d374c00df9fc56d007dedc08f358d，internal40100710594、tencent40100713328、google40100715694三次构建均成功，E原生包与D候选目录逐SHA保全。internal已保留原数据覆盖安装、系统读回2144；源码/资源/28动图/11天文图片/2真人照片完整性校验通过，不等于所有原生功能或医学点位已全部验收。
- 苹果53再次官方读回WAITING_FOR_REVIEW，submission5af19faf-5237-4059-9551-a14dc3513361；10张同源真实模拟器图COMPLETE，中文学习介绍和关键词已核实。不是批准或上线，不重撤本轮新审核。
- 华为119286157：2144包、新审核专用账号、4种语言介绍已保存，清除各语言“公开社交未开放”的旧说明，每种3张1080x1920实拍排版图，附原公安通过截图与旧盖章AI报告（明确原日期/版本）。实际提交后显示“已提交审核”及“正在审核”。
- OPPO37853023：2144及3张实拍排版图、完整学习社交介绍、真实审核账号提交成功。负责人在操作时确认接受vivo同步协议，vivo已勾选；荣耀原同步保持。两渠道仅记同步请求，尚无独立后台受理/通过回执，不另注册vivo。原审核账号密码只在私密文件及获授权商店栏使用，不入Git/报告。
- 小米2882303761520590489：2144、5张新实拍排版PNG、8个学习关键词、15字简介和完整介绍已保存并正式提交成功，后台审核中。纠正原“不涉及特殊功能”旧评估，按实际聊天/文献药品介绍展示/深度合成申报，药品销售、在线问诊未勾选；明确不开方不卖药不诊疗。补入10页既有盖章评估和公安通过截图PDF，原日期与签字印章不改。此前药品信息资质、医疗承诺及AI备案/标识拒绝意见未冒称已全部消除，等待商店按实际学习用途复核。
- 应用宝1112461593仍“应用认领正在审核中”，未打开版本提交能力；腾讯2144已保全。不能把包已构建写成已进应用宝。
- Google：个人国学政策问题4987360453772803751明确要求组织账号分发，旧2081仍提供、2118更新被拒，发布概览12项“尚未送审”，不是正在审核。公司组织8056957676688740507仍无国学，另3个应用审核中。源转移页持续错误7A43B12E，并有另一应用旧待处理请求；无法仅凭AI建议断言根因或取消其他应用。本轮两个账号均创建真实人工支持工单，后台待处理、编号待系统分配，已附错误和政策截图并要求不影响其他应用。9-9452000041462是10月20日既有转移工单，不能冒充本轮新编号。Google新名称/介绍及3张学习图已保存商品详情草稿，未提交2144生产审核；还需检查并取代旧2118待发布项、校对声明/其他语言并完成公司迁入。
- 宣传原件保护：E最新营销大图原5张不改。新5张使用2144真实手机截图在外部HTML排版，不重画UI；去除系统通知栏，不含私人聊天、健康记录或出生资料。两张新增文献/学习交流图按负责人要求手机直接连接取得。JPG转PNG仅格式编码，已比对解码像素完全一致，每张1080x1920且小于1MB。既有安全评估PDF/盖章AI报告仅原件汇编，未复制印章到新承诺函。
- Web同源fb8a7a9全质量及预览40107066080成功，制品12565680280，SHA0acedadd37ac2248be72e0ee414369b3e50980dfb6c77a14525909c8ec082a88。2366文件逐SHA切换上线，保留7c0cf30原发布目录回退；未声称受控目录外所有内容已远程化。安卓2144公网测试完整读回90625299字节与ab9b4895f437de38e47d50498a9acd62c6c50c77fc781c04a685c0a45abb296c一致。
- 官网原版本接口仍2127，固定COS旧分发源与本机旧文件不一致。本轮COS legacy app-download写入AccessDenied，未提升凭据权限或改私有内容ACL；转用现有应用站已校验的版本化downloads/2144路径，版本接口及国学站、yandao.vip固定入口升级2144，Nginx先备份、语法校验、重载及读回，forceUpdate=false，不增加注册/身份验证。www直接COS旧别名仍未更新，如实保留外部权限缺口。具体地址、四个重定向、完整SHA与回退见docs/requirements/store-submission-20261025.json及聊天outputs官网回执。
- 负责人反复要求关闭投影/电脑控制。已关闭本任务全部浏览器页、停止本任务临时HTTP预览；仅关scrcpy并不完整，随后重置两个控制会话、结束三个codex-computer-use组件进程，复查零残留。不再启动CUA/桌面控制或投屏，除非负责人明确重新授权；后台CLI/API及负责人允许的手机直连检查可继续。不能为了截图再次拉起桌面控制。
- 原教学资料、全部原图、模型、许可、源码ZIP、今天之前最近三个上传版本36/35/34及额外候选均未删。旧清理CMD仍停用，历史完整远程依赖恢复仍未完成。所有实际结果与未完成项分开，E只读交接镜像本轮不改，C较镜像新增，整体任务未完成。完整双账号社交、视频服务端持久化、医学来源审校、三历史全依赖恢复、Google迁移/应用宝认领及遗留CDN入口继续OPEN。

## 78.20 2026-10-25分类归档与本轮缓存清理（总体未完成）
- 按负责人要求建立D:/言道国学项目资料总库，指令、交接、源码版本、分商店资料、教材知识、营销、开源来源、服务器、执行证据和历史过程分开。活动源码、永久教材原件、E营销原稿及既有D备份保持原路径，以目录联接提供分类入口，禁止把这些入口当重复副本递归删除。D最新言道学习APP实际为外语及共享凭证，未清理。
- 本轮聊天outputs20文件6230740字节、work60文件9119686字节全量复制到D，全部SHA256和长度逐项读回一致后移除C原数据，原路径改目录联接，兼容旧引用。商店资料按Apple/Google/华为/OPPO/小米分类硬链接，不额外复制数据；vivo/荣耀/应用宝单独目录保留状态边界。教材中医/易学/现代医学参考/原始资料/课程/版权待核隔离分入口，未冒称学术审校完成。
- 已清除本轮npm缓存416文件76330894字节、临时验证node_modules1284文件63922813字节、Python字节码1文件12091字节，合计1701文件140265798字节（约133.77MiB）。保留package.json与lock供npm ci重建；未删除历史安装包、源码包、教材、模型、照片、许可、密钥、数据库恢复或不确定文件。D盘没有把备份认定垃圾删除。
- 整理过程中一次复制目录层级校验失败，未删源；修正后全量SHA通过才移除C副本。权限检查发现使用目录联接递归改权限涉及目标工程，立即停止并恢复继承，数字SID方式修复完成26922项零失败，源码可读、git状态及后续验证再次核查。无资料丢失；以后只对无联接的确切目录设置权限，不对总库递归改ACL。
- 清单D:/言道国学项目资料总库/99_整理清单/本轮实际整理结果.json，以及outputs-SHA256.json、work-SHA256.json。总入口整理说明标记Google“待授权发送”旧工单与旧总览截图仅为历史证据，不能据此重复发送或判断最新商店状态。原有自动审批拒绝路径未重试清除。未启动桌面控制、投屏或浏览器。
- Apple53、华为/OPPO/小米2144先前回执保持；Google组织迁移/正式提交、应用宝认领、vivo/荣耀独立回执、www旧COS别名、全社交双账号及三历史完整依赖恢复仍OPEN。未宣称全项目、全C/D盘垃圾或所有内容审校完成。E交接镜像按只读要求未同步，唯一C交接继续有效。

## 78.21 2026-10-25负责人要求优先解决荣耀、华为、OPPO、腾讯（尚未完成）
- 负责人新报告荣耀等有退回，要求全部渠道完成上架。此为新状态线索，尚未取得本次完整原文、版本和时间，不能用旧回执推断当前2144退回原因。
- 已复读原始20261017荣耀回执，历史明确意见为内容/功能简单、Magic6/MagicOS10环境；OPPO2098另因公开介绍/更新说明混入审核答复被退。两类意见分开处理，不将历史风险推测写为新平台结论，不擅自删社交或退旧配置。
- D:/言道国学项目资料总库/04_应用商店新增荣耀针对性复核说明、华为OPPO逐项检查单、应用宝认领补充说明，全部明确待核对最新后台、未发送。内容围绕真实学习流程、完整版本、账号权限、图谱下载、医疗文献与诊疗行为边界、真实原件、公开文案与私密审核分栏。
- 腾讯2144APK重新SHA256：90cd2cf3b8c3f28dfe73f1e03b22f83b654e1b3620adbf58fd7e9a35e88c72a4，90579043字节；不误用Google或internal包。应用宝上一实际状态仍认领审核中，没有新后台证据不能声称可更新或已上架。
- 未找到可直接读取华为/OPPO/荣耀/腾讯审核状态的已连接接口工具。遵守负责人此前禁止启动CUA/桌面控制要求，已向负责人请求仅商店网页操作授权、不启动手机投屏、不操作其他窗口；答复未到前不启动控制组件。材料准备与离线核查已进行，后台最新回执读取和实际补交待授权；本轮未声称正式发送申诉或重新提交。
- 交接镜像E仍只读未同步，Google迁移及原OPEN事项不变。本轮没有清理或修改学习资料、代码功能、商店当前审核、签名或其他应用。
## 78.22 2026-10-25东京上午：OPPO隐私机审整改后重提成功，其他渠道据实跟进（总体未完成）
- 负责人本轮明确允许仅操作商店网页，不启动手机投屏、不操作其他窗口；本条覆盖78.21等待网页授权状态，授权范围之外原禁止要求继续有效。应用宝登录页需要协议与QQ登录，负责人选择自行完成，尚未回复已登录。
- OPPO37853023最新2144实际退回原文为隐私政策URL机审：无法访问/正文不含关键隐私信息/中文或HTML格式不符的四项提示，不是本次要求删除学习或社交。现场发现/privacy浏览器执行JS能显示正文，而原始HTML有30个script、没有政策章节；已定位客户端加载造成自动检测不可读。
- 新增scripts/export-static-privacy.cjs，从既有PrivacyPolicyDocument源码与原许可/照片清单生成public/legal/privacy-zh-cn.html，中文完整正文不依赖JS、登录或跳转，不另写政策条款。正文去空白8141字符，SHAac8ba63259f33dee5963bbd01dcbb83e39b9f3ed56dfdeb9ef624ee1900651f9与当时应用内实际DOM完全一致。静态源38521字节、SHA934a10d79e90e83d318c2addb5c4fabd5ea0ff2eaff60a5d9f80d41561ea0d8f；Nginx原主站浮动链接保留后公网38890字节、SHA9805829d8640242981cd7255dbee836c25f51938ffd98881881a323d32be1c3c。
- /privacy与/privacy/最终保留原路由、JS和返回导航，添加同正文noscript兜底；独立/legal/privacy-zh-cn.html为无JS静态正文。早期纯静态覆盖已进一步修正为保留导航，避免下次原生构建破坏返回体验。prebuild生成独立页、postbuild补导出路由兜底。增加有意义隔离回归，证明脚本、返回按钮、原HTML保持且重复导出不叠加，测试1/1通过；不改认证、数据处理或条款内容。
- 服务器只精确补两文件，未切换整个Web版本、修改权限、签名或数据；第一次严格整文件校验因原Nginx主站浮动链接注入不一致触发回滚，查明后按既有注入校验并成功。保留data/privacy-static-rollback-20261025、-v2和-v3恢复资料；末次/privacy含原JS与兜底的公网SHA015321609873f75da4e1126d1f10cc71a5feb0cd9873702da7e0b10086df28a8。独立页六次路径/UA读回及导航保留二次读回均200、零跳转；原件及教学内容未动。
- OPPO新隐私网址改为https://yandaoguoxue.yandao.vip/legal/privacy-zh-cn.html，258字私密审核说明说明根因和修复。退回编辑页提示必须重上传包，使用已校验internal2144原包重新上传并解析，25.0.115/2144、86.43MB、targetSdk36正确。确认机审问题已修复后正式提交，出现提交成功；列表和详情再读回审核中，后台时间2026-10-25 09:27:02（后台显示，东京时间约10:27），预计1-2工作日。3张2144实拍宣传图、学习介绍、审核账号及已勾选vivo/荣耀同步保留。回执D:/言道国学项目资料总库/04_应用商店/OPPO/2144隐私整改后重新提交成功.jpg。
- OPPO版本历史另外显示2101/25.0.114曾人工通过且上架；不能把旧包上架当2144已批准，也不下架旧正式造成无包可用。荣耀独立账号仍只显示外语；国学认领资格查询提示新包名，未创建新应用、未签名认领。官方应用跨平台同步FAQ13272明确勾选后无需重复创建/上传同版本，已保留本轮同步请求，独立荣耀/vivo受理与上架仍未取得，不能写已通过。https://open.oppomobile.com/documentation/page/info?id=13272
- 华为119286157当前2144仍正在审核。其审核报告明确提交2026-10-10、生成2026-10-15，不是新2144报告：VIP测试账号、AI解读封建迷信内容、AI文本安全评估通过截图、生成标识材料、付费客服联系方式共5项。本轮原账号权益、既有附件及私密说明保持，不冒称旧评估足够或内容已获认可；现有3+年龄评级与成年人交流范围仍须按真实问卷核对。尝试催审返回正常进度，首次需提交后36小时，未受理催审；不重复撤销当前审核。
- 小米概览实际读回25.0.115/2144人工审核中、5张新图及学习介绍，未批准。应用宝目前已退出登录，负责人选择自行完成QQ登录，未获新认领结果、未上传新版，不使用旧登录状态冒称完成。
- Google新人工工单编号已实际出现：来源个人国学1-9537000042322、目标公司6-0755000042443，均未解决、邮件回复；旧9-9452000041462仍未知应用，不能混用。转移页继续显示其他应用旧待处理且表无结果，没有贸然取消其他产品或删除12项未送审资料。迁入及2144正式提交未完成。官方转移说明未证明删除草稿能修复报错，不盲删：https://support.google.com/googleplay/android-developer/answer/6230247?hl=zh-Hans
- 代码6ead53a基础静态页、ffb3f827d649d374a3f7728129d800840d1bd370保留导航修正均已推送。最终完整质量+网页构建40150752513成功，制品12582354795、ZIP SHA4d4ff09088dda2af77c58ae3a9fc0e7b5c6ba0b7c20b546374d7aa61c05661c2，全ZIP CRC通过；仅留两页核查结果，不保留临时54MB ZIP。云制品独立页与线上源SHA完全相同，导出隐私路由保留JS和唯一noscript。未重新发布原生包，不将本次静态页源提交冒称已有新原生版本。
- 本轮无教材/图片/模型/历史包清理。新产生临时渲染依赖及npm缓存已完成核验，但删除命令执行前被自动审批拒绝（blocked by policy，无更多理由），原目录保留，未通过替代方式重试删除；本次临时清理未完成。保留锁文件与有用部署证据。总回执JSON与D分类材料更新。E只读镜像不写，原07/09/10及全功能、历史全依赖恢复等OPEN没有改成通过；总体尚未完成。

## 78.23 2026-10-25 腾讯登录、上游备案证明、原创微课与2145候选（整体未完成）
- 负责人已登录腾讯并授权官网公开算法查询，亲自完成验证码；未启动桌面投屏。腾讯旧2098退回原因实际包括公安通过截图不可核验、算法备案证明、截图与APK不一致、暂不收录、气功需外市场上架证明、学习视频外跳。不能仅改名或免责声明冒称解决实际行为问题。
- 11份现有版权、安全评估、公安通过及AI标识原件逐SHA集中于D:/言道国学项目资料总库/09_共用资质原件与上架证明，E原件不动。04_上游模型备案公开查询保存腾讯混元官方网信办左右互补截图、55700字节官方公示PDF及来源SHA清单；备案网信算备440305295988701230071号、主体深圳市腾讯计算机系统有限公司、生成合成类（深度合成）、发放2023-09-01、状态正常。这是上游备案，不能写成本公司/应用独立备案。生产有混元hy3与智谱glm-4.5-flash配置，混元材料不覆盖所有备用服务；真实调用关联/服务合同与智谱对应证明仍待核对。
- 腾讯基础资料实际保存成功：学习介绍、18+、五张2144真实学习宣传图、静态HTML隐私链接及两张腾讯备案截图。保留原分发终端，避免顺带下架车载/其他设备；没有接受新协议。证据D:/言道国学项目资料总库/04_应用商店/应用宝/腾讯新版资料与备案证明已保存_20261025.jpg。保存不是提交审核。
- 源码51e8c6858d16c15388de6936c95505ef5d738cab已推送：Android2145，恢复腾讯学习AI，保留完整社交；导引养生法仅UI类别名改，古籍原文未删改。新增两节48秒720x1280原创无配音字幕微课、完整文字要点和三题自测，在应用内video控件播放，已有外部参考保留。既有视频提交/评论/举报服务端闭环仍OPEN，不以本次微课冒充补齐。
- 完整质量40152699068成功；安卓腾讯40152699965成功，官方签名SHA256 8ca0c414573d4b05fc2bd1ba9c6a2a8090c90c58e3815119494607443dc6d5a0。APK制品12582948587、ZIP SHA fcb25695475665e2b62fe6697758fbe473982eb20279c8c685e52ce2df0f05e1；AAB制品12583650872、ZIP SHA ccb1fb4f9a54e2b0c7a5e0a24d5d673f4777c051d07a1fd8709373dc1559014b。完整ZIP CRC、内包来源2145标记已核；APK91014992字节SHA ae2d54158db50620537610f0db3489df0e5185c1fceffa5ebcc4eb8d7796221d；AAB74947103字节SHA98831a4fe7a95077067d7d5558b34abe84612526b3031dd4efd2f4e9a0b812a7。E原生安装包/Android_25.0.115_2145_tencent与D:/言道国学项目备份/20261025_Android2145候选逐文件核SHA，2144及保护历史未删。
- 已用ADB数据保留升级手机，返回Streamed Install Success。后续版本读回/打开应用核验命令执行前被自动审批拒绝（blocked by policy，无具体理由），未换方式绕过；实际交互/视频播放没有完成验收。腾讯更新草稿已替换旧删社交说明为2145全功能说明，选择64位上传、32位不上传，新APK传输中；未正式提交。
- Google已先保存2118版本详情，再使用后台可恢复的舍弃版本移除旧2118未送审候选。正式轨仅2081/25.0.94、178地区、15安装、10/17显示已上架；其余11项新资料保留。转移仍未解决，来源旧请求空表/目标接受的是学外语，不能取消其他产品或假称删草稿可修复国学迁移。双工单1-9537000042322和6-0755000042443仍未解决。Google外部包名直链本轮404，公开可访问性未证实，控制台历史上架不冒充可访问下载。
- OPPO实际历史2101/25.0.114上架，2144重提审核中；华为、小米2144仍审核，荣耀入库失败环节尚未定位，无独立荣耀/vivo受理回执。Apple53上轮等待审核，本条未刷新。下一步先完成腾讯上传解析及实际验收/资质关联，保存或提交状态分开记；继续读荣耀联盟通知和Google迁移实际错误，不能盲删他应用。
- 本条未删除任何教材、图片、源码包、历史版本或原件。此前临时渲染依赖/缓存删除自动审批拒绝的目录保持，不重试；新增渲染工具仍待清理。E只读交接镜像未写，总体与07/09/10保持未完成。

- 78.23平台校验末次读回：2145上传后腾讯弹出包名com.yandao.guoxue已存在、要求认领；独立刷新原认领页仍明确“您的应用认领正在审核中”。当前直接阻挡是平台认领审核，不是新包成功受理；没有重复认领或创建应用。版本说明/64位选择为未保存更新草稿，已保存的是基础资料及两张备案截图。证据应用宝/腾讯认领仍审核中_阻止2145上传_20261025.jpg。OPPO站内系统消息仅两条10/15、10/16历史通知，产品消息为空，未找到荣耀入库失败原文。


## 78.24 2026-10-25 C/E国学文件盘点与可逆压缩（删除整理尚未完成）
- 负责人明确要求清理C/E国学过时指令、无用副本和旧删社交宣传，保护课程教材、知识资料、有效源码和原图；补充要求解决执行策略。截图说明：备案证明为真实浏览器截图，窄表分左右两张互补，并非一张包含全列的完整长截图；另有官方公示PDF原件，不把拼接或改图当原始证明。
- 盘点E评估目录、最新营销原稿、C活动仓及同项目父目录，并扩展C:/Users/ZhuanZ/Projects/minglizyi、minglizyi-admin-session-fix与两个历史工作树。E安装包77文件3551156429字节，包含17APK、17AAB、13IPA、30JSON；当前2144各审核包、2145候选及历史恢复资料保护。没有删除教学素材、源码包或历史版本。
- 执行前被自动审批拒绝两条独立操作：①逐SHA备份核验后将E原生安装包集中迁往D并保持原路径联接；②删除已核实E npm-cache与tcm-3d/node_modules重建缓存。均返回blocked by policy，没有具体理由，整条未执行。没有改变执行方式重试这些删除/搬迁，也没有把未执行说成完成。
- 采用不同的低风险空间措施：NTFS可逆压缩，原文件、内容和路径保留，不关停保护、不改ACL。E npm-cache、E tcm-3d/node_modules及C同项目.research/旧97资料逐路径排除联接后处理；另完成C旧管理修复工作树node_modules与.next压缩，40134文件，逻辑747631127字节、实际分配404245131字节，原仓git status仍空。执行前后C可用空间8774467584→9170223104字节（系统后台也可能影响卷空间，不能当文件级精确释放量）。末次总结果见D99整理清单压缩核查JSON。
- 重复盘点9397文件得到751组SHA完全相同、90037622字节重复量，含教材正文、源码引用与跨平台必要资源，绝非751组全部可删；营销相关114组17689176字节。仅不出现聊天画面不能判定课程、穴位、图谱或模块宣传无用。用户原始五幅生成营销图及新版真实宣传图保留，旧删社交文案不得继续用于上架。
- 主仓有324项既有变化、旧97有218项、knowledge-integration有未提交数据库、ios-review-fix有版本与outputs修改；只记录保护，不重置、盲删或提交这些其他工作区内容。C主仓tmp内有浏览器资料，未按“tmp”名字删除。活动仓源码不受压缩任务影响。
- 沿用D:/言道国学项目资料总库既有分类，不新复制整套源码/教材。新增统一分类入口.html，99_整理清单集中本轮盘点、重复SHA、保护原件23项SHA、源码保护清单和阻挡情况。部分条目是原路径链接，不是物理重复；禁止递归清理联接。E只读交接镜像不写，总体删除整理未完成；没有声称全部垃圾已清完。

- 78.24最终读回：两压缩任务exit0；6目录86355文件核查、86353文件具有压缩属性（旧97两个长路径文件原状保留），零不可读。逻辑1830887245字节、压缩后占用1180137428字节，相差650749817字节。重点保护原件23份再次SHA一致；不是卷空间净增，C/E同时有其他后台写入。删除0、迁移0，清理总体未完成。


## 78.25 2026-10-25 精确重复清除与实物归类（不再仅压缩，总体仍有阻挡）
- 负责人要求彻底清理、分类，指出前轮仅压缩不足。本轮继续核对具体对象，实际执行了独立的新清理项目，没有重试78.24被拒绝的E缓存删除或原生包目录迁移。
- 已删除134文件34269914字节：C下载5份完全相同指令（保留D01现行总控，旧接入原件归D98）；E根目录39张与宣传归档完全相同的截图12775451字节；宣传目录内部76张SHA完全相同副本2741968字节；C work/final-google.aab与另一份v25.0.92完全相同，删除12837387字节副本；活动仓13张旧appstore-screenshots截图5744102字节已先逐个核Git e567de0原始blob、确认可恢复，再移出活动素材。新2144真实学习交流图保留，实际代码、课程正文、原图/模型未删除。13旧图删除会随本条入Git，旧原件仍在历史提交。
- E根目录71份图与录像31984150字节移入E:/言道国学3D评估_12A/开发样机证据/历史验收，逐SHA读回；不把历史2135–2141界面用于新版上架。C散落5包共89716724字节先完整复制校验，再单文件移出原位置：Google92/93/94 AAB归D04/Google/历史原生包_保留回退，2096/25.0.109归D03/历史原生包_待历史版本匹配，2098/25.0.111归D04/应用宝/历史原生包_不可用于本轮提审。包全部保留，不冒称已匹配三个完整历史版本。
- 现行总控集中D01；旧资料接入指令原件、已停用的E根清理CMD、D99已执行一次性PS1集中D98，后两者改不可执行TXT，防止误跑旧当前加一个历史版规则。以上与71证据、5旧包共79文件归类。原E最新营销五图、课程/图谱及原经络动图等不按是否有聊天画面盲删。
- 修两个页面索引150处引用，使删除重复副本/移动证据后仍指向唯一保留文件。读回核验152保留或迁移文件SHA一致，23重点保护原件SHA一致，532个本地素材引用零缺失。D99/精确重复清理实际汇总_20261025.json、素材整理后读回复核_20261025.json为最终数量；统一分类入口.html及C_E清理状态TXT已更新，不宣称全盘均已清完。
- C deliverables旧模型28文件67218827字节已复制到D05/既有三维模型与许可并全SHA校验，但清除C原位置和建立兼容链接的操作被自动审批拒绝，整条未执行，C原文件仍在；D副本是受控保护备份，未冒称已迁移。E临时录屏工具11文件删除、C已归档构建包留下3层空目录清理也分别执行前被拒绝。均仅给blocked by policy，无具体理由；没有换方式重试这些目标。这三项与前轮受阻E项目保持未完成，不能以134文件成功掩盖。
- Git历史原图校验首次遇Windows资源不足，未删除；改只读低内存窗口cat-file后13图全量验证通过才移出。未修改系统内存/安全配置。所有新清理限于已核对精确文件，不执行递归源码清除，未运行旧CMD。E只读交接镜像未写，总体清理/全功能验收及商店缺项状态不变。


## 78.26 2026-10-25 离线实测、Apple54交付及三维资料一键准备（新内容整理执行中）
- 正式Apple53实读WAITING_FOR_REVIEW，TestFlight53已内部可用；用户原来只报25.0.115，版本号不区分构建号。本轮构建40179663420上传Apple54，官方VALID/IN_BETA_TESTING且既有内部组已关联，未邀请新用户、未变账号验证。用户已亲自更新54并确认可以打开；随后要求人体分层模型与经络图谱一次下载，不能继续两次操作。正式53未撤或更换，54没有冒称正式审核已提交。
- 用现有私密审核账号、iOS-full-learning请求完整下载全部8个已发布离线包，总114221518字节；授权/对象均200，逐大小/SHA与manifest一致。资料包有既有会员权益，未放开他人私密数据或凭空赠送权益。两个PUBLIC包也仍需正常账号登录，但没有新增中国手机号前置。AI、聊天、外链视频需联网，不宣称所有服务都离线。
- 四层V2四模型逐GLB头、内部SHA/大小核对，2234网格且无外部材质/解码器网络依赖；AtlasV3十五系统2234部分、15块和21内部资源全SHA验证。Apple54 IPA58,088,300字节SHA e9ff3ca3feb129568ad1afbf17d9180fd93f9e4f851eca24f0bb4507ffa0a709，ZIP制品12594416074 SHA191abca4f3155bc441046c34a3b443bc05949f3630755125b3a41f7f29b88c60，Info标识/构建54正确、两节微课及28原动图全部保留验证。仅D03当前原生包归档，未增加C/E大包；新下载临时制品ZIP已删除。IPA没有Android式app-native.json，源提交7465f29按成功工作流/制品关联证明，不伪造包内标记。
- 当前线上businessIdentityGate/channelIdentityPolicy SHA与本地LF源码一致；27项合成账户检查证明iOS/Google免中国手机号前置，国内一次验证保留，匿名/封禁仍拒绝，内容审核分离；4项社交策略测试通过。完整云质量40179878355和真实iPhone/iPad UI40179880683均成功，后者为7465f29既有页面及原生存储验收，不冒称新合并下载页面已验。Apple54测试说明已保存读回；先错用whatToTest字段被409拒绝，按官方字段whatsNew修正成功，无错误写入。
- Android2145 internal40180075048及Google40180077700均成功。D03已核APK91039280字节SHAd70b6456009ef2a0a03eaaf4f67dac5f33d10935970d292a5abdee44ca5e8cb7及Google AAB74971383字节SHA0d9fae6466aa01e0a26b39a3bf43574cf9e098d94ad98ff550872753419fbb09；内包标记7465f29/2145和CRC通过。官网仍2144，Google迁入/提审未完成；因用户紧接要求合并下载，2145尚未提升稳定入口。
- 新实现anatomyLearningBundle：离线中心只展示一个完整三维学习资料项，两个查看器也调用同一操作；自动跳过已装资料、单次蜂窝确认、统一进度、并发入口共享下载、中断后只补剩余。仍保留两个原协议/校验资源，避免破坏54已下载数据或重下。每个新资源在原子启用前做结构校验，任一失败保留已完成和旧有效资料；登录/权益错误仍能返回原入口。显式移除采用单事务更新内容/索引，只操作指定OFFLINE_PACK，私有学习数据和其他包保留；存在性检查用IDB count避免克隆几十MB模型。修复旧删除后索引仍显示已安装问题。
- 新合并流程7项、原下载与兼容/版本/存储回滚等共26测试通过；CI纳入回归。补真实iOS一键入口UI测试，Android递增2146；计划Apple55，尚未构建或上传，不能把54说成已含合并入口。
- 用户新增主治、配穴、经典出处与董氏全部资料完善任务；已读取E指定NI针灸课件（610386字符/19312行），定位D原始教材目录93相关路径。现有361经穴只有定位/功效等字段，主治/配穴未结构化接入；董氏仅39条，27条存在无特殊禁忌模板，不能称完整或已逐条核校。正在逐书、逐穴核对本地原件与公开来源，区分原典/课件/后世董氏扩展，未用生成内容冒充文献，未删改原件。此内容任务及完整医疗资料审校仍OPEN。
- 证据集中D99：苹果渠道八个离线包_实际账号完整下载SHA核验、四层人体与分系统图谱_逐内部资源及离线依赖核验、海外无中国手机号前置_国内及账户保护分离；D04 Apple54开放和测试说明回执。D07本地核验依赖复用TypeScript既有环境，新增fake-indexeddb/fflate两轻量依赖，用于真实IndexedDB回归，不写C缓存。E只读镜像不写、原清理阻挡/商店缺项不冒称完成。


## 78.27 2026-10-25 穴位主治/配穴真实缺项修复第一批（整体内容补全仍未完成）
- 负责人要求逐穴补主治、经典配穴及董氏完整资料，指定E盘倪师课件原件。经核现有361经穴341条功效为空；旧离线安装器又要求每条功效非空，导致合法基线内容包整体无法启用。现允许真实空字符串，不捏造功效；坏记录、重复编码或无效来源仍整包拒绝，旧可用内容保留。
- 公开原典采用识典古籍《针灸大成》NCM011X411999030508经穴篇章及百症赋等；保存37篇原始HTML、SHA、原繁体及Windows简体检索转写到D05/穴位文献整理_20261025/经典公开原文/针灸大成_经穴篇章。新增采集与索引脚本只读源库，不复制平台现代译注、不生成主治。修正UTF16古字截断问题；头/足临泣、头/足窍阴按原书不同段落分别绑定，不混同。
- 第一批内置354经穴主治原句及26组明确经典配穴（406条逐穴展示记录）；全部406条实际回读为对应来源原文精确子串，URL与原页SHA一致。仍缺扶突、乳中、筑宾、四渎、急脉、中枢、灵台的主治引用，部分原书无独立主治或转录缺标题，未抄相邻穴填空。未声称临床审校、全部配穴或全部361已补齐。D99/穴位主治原文逐穴覆盖核对_20261025.json、穴位新增原文逐条出处读回校验_20261025.json记录缺项与实核。
- 新PointStudyIndex独立接入源文本、段落、原篇章链接、审核状态；穴位详情直接展示主治原文和经典配穴，3D图谱中心卡显示文献主治、资料面板显示完整引用，无需依赖AI抓取。保留原位置、图片、交流与左右侧。支持tcm-acupoints既有离线包附带pointStudy，校验来源/协议/编码/重复/文本/HTTPS；后续受控资料更新不必每次改客户端代码。旧1.0包继续兼容。
- 候选学习资料包1.1.0已生成D05/穴位文献整理_20261025/候选离线内容包，312062字节SHA9182fe2798e4fe49f889456b7d2925102112202f9031eb6f909fc82ce42b4d2c；仅候选，未注册发布或冒称手机已获得。字段reviewState的APPROVED_EXISTING_BASELINE仅继承基础361数据；新增原典记录均明确SOURCE_TRANSCRIPTION，不冒称医疗审核。
- 4项真实回归通过：本包完整来源结构、头足同名穴区分及DU/GV和RN/CV兼容、恶意/未审核更新回滚、341空字段基线更新与坏包原子拒绝；纳入CI。两同义编码测试首次揭露既有基线混用DU/GV与RN/CV，已修复查询兼容，无改动源库编码。完整CI及真机新版尚待。
- 本地董氏《针穴发挥》164页已只读渲染/OCR保存D05，识别结果全标OCR_UNREVIEWED，竖排普通OCR串栏未直接导入。OCR工具现保留逐字坐标供重排核对。另对《董氏奇穴精要整理--王敏》262页本地原件执行横排提取中，未把待核扫描识别当已上线内容、未上传现代整书原件。原始教材、源码、课件、图片、签名均未删改。
- 649e009一键三维的后续类型修正e04e569已通过完整Study quality40182723068；dee9919修正iOS UI查询，40183189078仍在执行，尚无55/2146新构建交付。Apple54用户确认能开，正式53等待审核的事实不变。本条不是全任务完成回执，董氏全部内容、剩余经穴、全配穴及商店阻挡继续OPEN。E只读镜像未写。

- 78.27续：25fe566已提交第一批内容，CI40185048394在旧Atlas身份测试的隔离加载器因新增point-study依赖失败，尚非生产运行故障；370b912修复测试使用真实新模块，连同原图/模型身份共17项本地通过。由于该测试文件未命中CI路径，需对后续最终源提交手动触发完整质量，不能声称该轮CI已通过。dee9919原生iOS合并入口40183189078现已成功。
- 董氏横排原件262页提取完成，连同竖排164页全部保持OCR_UNREVIEWED；27无依据的无特殊禁忌模板已改为明确未核对，不作为安全结论。新增董氏受控资料协议dong-catalog.v1，可附于既有穴位离线包，至少39条且每条必须书名/版本/页码/原件SHA、有效部位/编码/文本，坏包/重复/无出处/未审核全拒绝并保留旧库。现有39条并未冒称已重核或已扩为全量，未发布新董氏目录。新增第5项回归验证有出处更新、拒绝残缺和OCR待核替换、拒绝外部图及调用方后续篡改；本地相关8项通过。

- 78.27交付进度续（截至2026-10-25T10:48Z）：b04fae7完整质量40185396719 SUCCESS。Apple55构建40185523638 SUCCESS，官方buildId863408f8-6394-4afd-81f0-726d83e71736为VALID/IN_BETA_TESTING，既有内部组已附；测试说明保存并读回，明确354经穴/26配穴为第一批、董氏未全量，不新增海外手机号验证。未发新邀请或变更正式审核。正式仍53 WAITING_FOR_REVIEW。
- Apple55 IPA58126289字节SHA2d8ffe09c86a01ae4121c0906cd50cfa341c7b5198bf4d460bc431de37f080aa，制品12595453495 ZIP SHA4cc49c28b1829436718712793cebd41ffc845e96f01a01ef5934aefa15067371；完整ZIP、55/25.0.115/包名、28原动图及2原MP4全核对；包中经典数据与一次下载标识均存在。D03/当前原生包/Apple_25.0.115_55保存唯一实体与校验记录，未覆盖54。
- Android2146 internal构建40185526193 SUCCESS，制品12595847641 ZIP SHA380311930dfbdc5d52dbadd69da0444e8278283ee41ad318ffb5fa8feea320c0；APK91079028字节SHAaa3c8d3dc0333072d400b367765873f5148846cda303e578f040e09ec1c2da85，原生标记明确b04fae7/2146/internal，ZIP及两项新内容标识通过。仅D03/当前原生包/Android_25.0.115_2146_internal保存校验，尚未安装真机、未提升官网或任一商店；官网仍2144，不能说安卓已公共更新。
- 董氏本地两原件再次全SHA与OCR开始时一致。262页提取中仅PDF30–114穴位篇形成241条定位/主治待核索引，含合组及图中文字误串风险，全部NOT_PUBLISHED/OCR_UNREVIEWED；不能把241当241个已核对穴位。D99/穴位内容补齐本轮真实交付状态_20261025.json汇总实物与缺项。
- 本轮临时制品ZIP全程内存校验，未新增C/E安装包副本。本轮两个Python自动缓存pyc及其空目录的限定清除执行前也被自动审批拒绝，仅blocked by policy；未换方式重试，缓存仍在scripts/__pycache__。此前阻挡范围不变。源码已推，报告更新后继续查Git一致；只读E交接镜像未写，总体全穴位/董氏/配穴及全商店/清理仍未完成。


## 78.28 2026-10-25 负责人要求一次统筹药穴各家见解、原图与全渠道持久离线（执行中，禁止分批冒称完成）
- 新范围：不仅经穴和董氏，还包括550药材、倪师各穴/各药讲解、主流本草/针灸各家原典、主治与配伍/配穴、具体图片及云端更新与手机长期保存。负责人不接受每次一点点打包汇报；本轮尚未启动新原生构建，后续在同一轮整体验证后再决定完整候选，不以旧55冒称本轮已交付。
- 查E指定05本草MD确实仅264字说明，所指10MB扫描原件不在E主资料、项目保护目录或D总库。负责人已授权网上补找。公开199页本草PDF可网页检索但直读403，未绕过；有明确未授权删改说明及NC限制的其他资源未整书复制上线。转用用户本地01–04四部讲稿及原有36部可溯源原典，另找到公开MulanPSL2课程笔记贡献；固定Shanemen/hantang-nihaixia提交27b8ce5b942ca166610ac5e38b9eac0afa913ff9，394篇其中333有笔记，2435个引用块129819字符，仅采集作者标明为学习笔记的>块，未复制其夹带的倪师教材正文。全许可证随资料及public/legal/medical-study-notes-license.txt保留，社区笔记不冒称倪师原著逐字稿。
- 新medical-study-library数据协议把来源、作者、原篇章/行、原文SHA与药穴关联分开；不是把共现自动推断为主治/配伍。候选950条目（361经穴、550药材、既有39董氏）、373来源、3323段6200余KB。现361经穴全部有相关来源，351有本地倪师讲稿、24另有公开课程笔记；550药材492有相关来源，212有本地倪师讲稿、360有公开课程笔记。董氏39均未移用古籍同名穴或普通“其正”等字句，仍待其自有文献审校；58药材暂无匹配名家段落，绝不写成全部完成。D99/穴位药材各家文献覆盖核查_20261025.json为实际覆盖；客户端结构及3323段完整SHA通过，当前候选6503758字节SHA181e926f4eba267cb5f050eee8f8ae04954fc02f7748e5275734c0767e438530，尚未注册发布。进一步本草来源补齐与身份核对仍执行中。
- 药库查见漏字与误读，已基于原文条目/对应主治原句及NRCM、广东中医药局、林草局等来源纠正9个派生库名称：丹砂、析蓂子、芎藭、黄芪、肉苁蓉、藁本、萆薢、栀子、厚朴；ID、原功效/用量/禁忌不改，原误读与依据入元数据。其余古名单字或物种/炮制未定者不盲套现代名称，不删用户原教材。
- 图片核查：现30原件为28动图+2真人局部原图，仅对应7穴，55IPA中2原图实际存在且SHA一致；云端29件首次全读SHA一致，脾经件首次网络超时，后补读一致，并非发现缺件。详情页原照片在底部、其他穴位无单穴照片，且静态站无CORS。现照片前移，所有经穴详情直接给所属经络原动图并标非单穴真人照；双代码DU/GV、RN/CV正规化。新增StudyImage按SHA保存并读回，每份图在本机长期资料区而非LRU缓存，保留图像作者与许可，不把生成图充当原图。
- 云端已仅为/assets/meridians、/assets/acupoint-photos及/data/tcm-study-media.json增加跨域GET/HEAD/OPTIONS响应；不改API认证或会员权限。服务器30图全SHA核对，Nginx -t/reload成功；公开HTTPS从capacitor://localhost Origin读取目录、原合谷照及原脾经动图均200/CORS*/SHA一致。回滚在服务器data/study-media-cors-20261025，D99有修复及读回回执。媒体目录仍只有30原件，未声称361单穴照片已齐。
- 发现iOS确无OfflineFiles插件，旧durableOfflineStore在苹果实际退回IndexedDB，安卓已有原生文件。新增iOS插件注册及Xcode源引用：Application Support/OfflineLearning、哈希文件名、8MB每份上限、串行IO与原子写，不触碰私人档案或鉴权。文献逐药穴存本机独立文件，图逐SHA存本机文件；退出后不依赖WebKit缓存。新离线中心一键保存文献与已收录原图；对应栏目接入药材、经穴及董氏详情。没有新增身份/手机号/验证码校验。
- 新增5项存储与媒体回归均通过（与上轮5项共10通过）：坏出处/悬空关联/URL拒绝、冷启动缺IDB时读回和代码别名、错误摘要不覆旧、磁盘满仍能在线阅读、原图SHA保存与重启离线读取、坏图不落盘、远端目录不能移除原件或植入外部执行文件。新iOS真UI测试包含原照片与动图保存、杀进程重启、CI专用fetch/XHR阻断后读回；CI测试目标才注入断网故障，生产源码不含该开关。新增容器脚本实查原生文件和两原图SHA；尚未跑完，不冒称已通过或真机已验。
- 本条为中途可接手记录，全任务仍OPEN：需补余药/董氏自有文献、缺失具体穴位图的来源、完整CI与真实iOS模拟器证据、云端候选发布及最终统一原生包交付。无新原件删除；先前自动审批拒绝的清理对象不重试，E只读镜像不写。


## 78.29 2026-10-25 补十部本草原典、整书本机保存及实际测试缺项（继续执行）
- 用户已授权缺本草讲稿网上补找；公开完整倪师讲稿仍未取得可直接再分发的可靠原件，未用社区笔记冒充。新增固定GitLab jc.data提交fce547b73db49408b34a4144d12e09f09eebafd3的十部古代本草录文（汪昂、吴仪洛、黄宫绣、陈士铎、邹澍、张璐、严洁施雯等、王好古、李时珍、赵学敏）。逐字比较HTML去标签正文与提取正文，十部均一致；《本经疏证》原列表曾漏1922字，已修正提取，不宣称已与扫描底本专业审校。
- 新独立tcm-materia-originals候选10书154章11384711字节SHA6998436401cfde18ca853426e63b2922a5b2208a0ebe2c63c4ff8a9000256b46。客户端既有协议通过，最大单书5817440字节，低于原生8MB文件限制。原36书不替换，新增库独立；新整书文件逐书SHA、写后读回、最后切换目录，旧版本目录保留。原典阅读器支持新旧两个包并在WebKit资料丢失后读原生文件；下载中心同一学习资料按钮统筹整书、药穴段落与原图。还未发布上线或新原生交付。
- 重新候选药穴关联库950条、383来源、6067段8259510字节SHA086814c6790d6fbc66995d548432c1fc0db46c80e681316c70b7f5dde03e7785。经穴361均有相关段落，药材513/550，董氏仍0条自有文献审校通过。各家为相关原文，不能称完整主治/配伍均已专业核验。37药材缺项包括漏字古名/待定物种与现代药材，持续核对。
- 又见部分本经原始导入条目统一3–9g且无篇章依据；保全原始JSON，在展示映射中停止把该模板称为典籍用量，说明尚缺出处，直接提供各家原文对照。不能仅贴免责声明继续冒充原典剂量。
- bf2d完整质量CI40191682309通过；实际iOS模拟器40191684225失败在重启测试找不到“离线内容”入口，未到图片读回断言；不得冒称真实离线已验。已修正测试对个人中心抽屉持久状态恢复的等待，准备重跑。新增整书缺IDB读回/坏摘要拒绝/不完整更新不覆旧测试；连同文献与原图本机存储共6项通过。CI及内容补全仍OPEN，未开始56/2147原生发布，未删原件或写E只读镜像。


## 78.30 2026-10-25 本草同步稿来源已找到，药名复核与iOS真实导航修复（未最终交付）
- 从qhsxzh公开直链正常下载《人纪03本草2025-11》325页PDF14584258字节，SHAa82338f83cc77822551072317dacf4e1a659342ced3942ffd77d909edfd16251；D05/穴位文献整理_20261025/公开文献研究/倪师本草同步文稿_原件研究保全原件与来源。并非用户所述10MB旧版。原件标明仅限自用、公益传播、请勿商用；现仅来源研究，未将整部现代讲稿并入应用公开包，也不以社区许可证覆盖其版权。后续可据此核对药名与页码，不再要求用户寻找原件。
- 另16项药名漏字/误读已用原典对应句恢复：太一禹余粮、青蘘、蓬蘽、秦椒、蚱蝉、蟅虫、大豆黄卷、薤、礜石、雚菌、扁蓄、狼毒、䕡茹、蜀椒、螌蝥、水斳。只改派生库名称，保留IDs/原始临床字段及改前名称；不据古名推断现代植物基原。来源章节/URL/原句SHA均附元数据与D99核验。原本经导入327条统一3–9g在展示停止冒称原典剂量，原件保留。
- 药穴候选现6174段、383来源、8359354字节SHA0b98664f202c59acc1b5c858be909781d707ca9a7e6790d78c016b0e9f14dc23；当前890/950条有相关原文（经穴361、药材529、董氏仍未通过其自有文献审校）。本地倪师相关段落569条目，经文中的五里/通谷仅按肘臂/曲骨气冲及肾经上脘/膀胱束骨等上下文区分，禁止跨经同名混用。全部6174段SHA、客户端协议以及新增十书的篇章跳转目标均通过；未称主治配伍全量医学审校已完成。
- 4692a09完整质量40193436228通过；iOS40193436144失败已由导出的真实AX树定位：点击新示例原生a链接发生整页跳转，实际停在首页，不是已经验证图片未写盘。新内部链接改Next路由并增加真实合谷详情断言与失败现场截图，准备继续实测。原生读回尚不能算通过。
- 两个新数据包仅准备独立私有存储草稿，未覆盖既有八个PUBLISHED包；来源候选在D，服务器上传逐SHA预检后才注册。不发布未完的董氏识别候选，不分批冒称全量完成。整体仍OPEN，尚未发56/2147；E原件、只读镜像均未改。


## 78.31 2026-10-25 本轮受控资料草稿、原页索引及离线故障测试范围修正（仍执行）
- 两新包已通过正常SUPER_ADMIN接口注册并分发至私有COS，服务端重算SHA与D候选一致，状态仅DRAFT/storageReady=true，未发布。公开manifest仍8包且不含新ID，未动任何旧包文件/状态/授权。D99/药穴文献与十部本草_服务器草稿读回_20261025.json保存无敏感URL的回执。
- 对325页公开同步稿仅生成437药名的提及页码索引，不含讲稿正文；D05原件研究目录与索引脚本可复现。页码命中不等于专章或倪师逐药完整见解，不纳入“已补齐正文”统计。覆盖审计现区分实际选入作者数与所有候选作者数，不把被24条上限截掉的作者计入已展示覆盖。
- 为后续有出处的图谱/董氏资料增加声明式illustrations+STUDY_REFERENCE：图必须有来源、标题、说明，路径仅限既有资料目录，实际图片另经云目录SHA/原生文件校验；不是执行代码更新。当前草稿尚无这些新图片，不宣称361单穴图已齐。倪师筛选改为明确倪师来源/作者，不把后续其他教师资料归为倪师。
- 读整书时已存在并SHA正确的本机原件不反复重写；坏文件可用有效包修复。新增图谱路径/出处拒绝回归。c28完整质量40194806240通过；真iOS40194693757首轮已跨过合谷原图保存断言，后在杀进程后进入系统中心失败。其测试故障原方案拒绝全部fetch/XHR，连本机打包的Next页面资源也误阻断，非真实无网条件；现仅阻断外部服务、API与原图fetch，保留打包UI路由，并原生写回实际阻断探针。来源图像仍需原生文件才能通过，绝未向测试注入图片或假数据。CI用脚本不入生产包。
- 相关存储/原文/门控12项本地回归通过（原5+新7），新完整CI与iOS实测待继续；正式56/2147仍未启动，董氏和部分药材审校仍OPEN。原件/教学资料/只读镜像未删改。


## 78.32 2026-10-25 药穴原页图谱、550药材出处与持久云目录（完整候选继续验收）
- 董氏王敏《董氏奇穴精要整理》用户原扫描PDF SHA ca98d58c76cbb969f86da63afd814510be932c3ba896baf0761e8b70af889c8f。262处“位置”识别标记逐原页核对，剔除一处非标题、补6处漏识别标题，共267原书条目（包含多穴组合，不是267单穴/董氏全集）。同名木枝按大腿/头面分开，正土等按原页订正；197整页无损WEBP与渲染原像素逐一相等，含跨页与明确同名穴讨论。旧39条目仅37项可唯一关联；双龙、喉灵未获得对应原页，不移用双灵/喉蛾。原导入定位针法仍待按版本逐项核校，不宣称已完成医学审校。
- 经穴真人教材已在用户原库找到《针灸经络取穴全真图解（真人全彩版）》，蓝晓步、乔成平、纪剑峰等，江苏科学技术出版社2010，ISBN9787534573606，原PDF SHA7715ec0b706700f7937d685f650450c47715379f3c92ad99941b68b39fd57428。361经穴逐代码关联353表格代码锚点＋8项原页目视补核；每经序号完整连续、表页顺序单调且无一穴多页歧义。72原JPEG整页按原文件字节提取，包含本经真人总图和本穴表页；不得宣传361张单穴独立近照。用户原扫描不改、不伪标CC许可或新版专业审校。中心3D穴位信息和定位弹窗均接同一资料面板，支持原页放大及分组阅读。
- 原30素材保留＋新增197董氏原页＋72经穴原页，共299文件49908709字节。全部原图/新图SHA与长度、4159条图页链接通过。已放服务器独立/root/yandaoguoxue/learning-content，Nginx仅6处公有图片/目录location改root，API/私有对象鉴权未改，nginx -t通过；站点发版不会覆盖这套云资料。公网全299件完整读回、SHA及Origin capacitor://localhost CORS通过，D99/299图谱原图_云端全量读回与苹果来源跨域校验_20261025.json留证。新目录SHA2d26789073cf0ea9b65f92b999085265c4360068fa04da6760b56c2c40624c1a；Nginx变更前86681a4a…、后12fc39da4a7e4edcf5885063dee4292b7a7b96da580bca758a8c6d7337d6a29c，原配置备份在服务器本轮stage。
- 药穴完整候选1217条目、405来源、6194段（含20条明确标为编辑摘要的现代院校/官方资料），9878279字节SHA0fd5cb9f27dfc7fafce66fedcde8818cdf62239ab995551b2d2a5c6405822973。550药材均有可追溯相关出处，但不得说每味都有倪师专论/每项临床字段已审校；原典、用户课程、公开学习笔记、现代资料摘要分别呈现，摘要不装作逐字引文。新增药名麻贲→麻蕡仅改名和误字元数据，古籍关于花/实的异说保留，不推断现代植物部位；名称改正现共26项。旧关木通导入标签与普通剂量展示存在误导，展示端改历史品种辨析、停止给其使用剂量，并附卫生署2004原公告；其他药典导入注明版次待核，原始导入字段/用户原教材不删。
- 20条现代摘要与1条麻蕡古籍原句为小型独立overlay，可复现叠加到已上传整包，传输及服务端重组SHA与D候选完全相同。正常管理接口更新前已把旧medical DRAFT的注册行与私有对象完整备份并核SHA；两个新包仍DRAFT，私有COS全量下载分别核9878279/11384711字节及SHA一致，原8个PUBLISHED包版本/SHA/状态不变。十部本草包仍SHA6998436401cfde18ca853426e63b2922a5b2208a0ebe2c63c4ff8a9000256b46。D99/完整药穴与十本原典_私有存储全量读回_20261025.json留证。未把草稿写成已可供用户下载。
- 完整质量90eac/cd3713/b6ed079/f921d86均通过；本地14项存储、来源、旧版回退、图像SHA、摘要与安全链接等回归通过。实际iPhone UI四项已多次通过，包含原图原生保存与杀进程重启；但40202105063的真实网络探针显示fetch/image阻断成功、XHR=false，因此不得算完整断网通过。已定位Capacitor XHR在实例上覆写send，原型拦截无效；26ce8d0改拦实际构造出的实例，保留原生存储/无假数据，新的真iPhone/iPad测试40203392993执行中。生产包不含这些CI注入脚本。尚未正式提审，07/09/10门禁未关闭；苹果正式53/TF55及官网2144状态沿用最后实证，绝不把本轮未完成验收说成已更新用户手机。
- 大文件只在D总库及服务器；未删除用户教材、源码包、原图或E只读镜像，也未启动桌面投屏/控制。旧阻挡的清理目标未重试；全商店上线、全部历史清理和专业逐项审校仍OPEN。下一步为完整原生候选Apple56/Android2147构建与核验，未上传正式审核前继续按门禁执行。


## 78.33 2026-10-26 最新合并要求与权益确认（覆盖此前分包交付安排，继续执行）
- 负责人新增明确要求：真人取穴/原有绘图必须核对位置；中医对用户只呈现一个完整资料包、一次下载，核心正文图谱/教材资料本地完整一份、云存储桶全部齐备且逐项核对；防盗链与批量抓取，避免影响学习的验证和反复提示；来源用小字注解倪海厦老师讲课或具体经典；补全易学工具所涉原典；连续听典籍提供清晰、自然、可试听的音色选择；后续纯正文/图片/既有资料的更新不得每次再构建原生安装包，代码/系统能力变化仍依法构建。
- 已异步明确权益并获负责人回复：正文、图谱全部账号可下载，三维人体保留现有会员权益。不得把会员模型无条件改PUBLIC，也不得以下载资料为由加中国手机号/身份校验。现两个新文献DRAFT不再作为多包用户交付方案，准备合并为受控中医资料包；底层来源与恢复文件仍保留，旧8发布包不能盲删。
- 26ce8d0真实iPhone/iPad运行40203392993已SUCCESS，完整截图20.6MB已下载到D90/真实苹果重启断网验证_40203392993；两台native-learning-files回执分别证明fetch/XHR/原图fetch阻断后，从原生Application Support读回合谷原照/大肠经动图且全SHA一致。此非实机用户验收。后f3a0fef运行40203864721失败在人生记录测试第89行，未把该次记成全通过；医学原图成功回执按对应提交记录，不伪改CI完成标记。
- f3a0fef追加每条药穴文献写后读回一致才标已保存、目录不得同名替换原30图SHA。16本地回归通过；真实候选1217条目＋299图全部通过客户端持久逻辑在D实际写盘，清空包缓存后的重新实例全部读回：1520文件91610684字节，目录point361/herb550/dong267；这项是本地逻辑验证，不冒充手机验收。见D99/1217药穴条目与299原图_全量写盘及冷读回逻辑验证_20261025.json。
- 已构建过的Apple56/Android2147候选均未上传TestFlight/正式商店，不能向用户说手机已更新。本轮新增合并资料与朗读要求后，暂不提升这些未含新要求的候选，整体验证后再生成完整最终候选。f3a0fef构建为Apple40203879376/Android40203881954，供追溯，不算三个负责人认可的已上架历史版本。
- 连续朗读问题确认：原ContinuousListenPlayer硬编码默认音色，未用单篇已保存选择。ecef923已让连续听学读取/保存同一local_tts_voice/style/rate，列出本机真实音色、增加试听，iOS同语言优先较高quality，浏览器不再变调伪装男女声；来源面板说明收为小字与可展开来源，原引文/摘要区别仍保留，毒性与出处实质问题不删除。3项原生听学并发/取消回归通过，最新完整质量待查。
- 云桶现有10个包（8PUBLISHED＋2DRAFT）清单已读，原模型v2为41748876字节feadf6c3…，atlas33799696字节b1c9a482…；D旧12MB同名v2归档不能冒称现行41MB完整模型，正在补整份现行云对象本地副本。新299图片已逐公网SHA通过，正按内容SHA键复制至私有learning_content并逐对象下载读回；未完成前不得写“全桶齐备”。后续需收拢完整TCM正文/图谱/原典数据、三维按既有权益合并入口、收录易学原典、补内容型更新钩子与资料授权防盗链。E只读镜像不改；未启动CUA/桌面投影。全商店上线/全面清理及全部专业审校仍未完成。

## 78.34 2026-10-26 完整中医单包与易学原典底本（仍在整体验收）
- 负责人确认正文、图谱全部账号可下载，三维人体保留现有会员。新完整中医单包63804323字节，SHA2cf675a12377ab7bb4d3643891787d6b089dfc9fb0d649d9547a7360e2b9b7cc，308文件/8虚拟板块，含550药材、316方剂、361经穴、267董氏原书条目（含组合）、46部原典与299图；不含会员模型字节。D05/完整中医资料包候选_20261026保留整包与来源。源包内每文件校验、虚拟子目录原子启用与异常回退6项在服务器隔离目录实际运行通过；本机大包测试因系统内存不足退出，未记通过。
- 单包正常管理接口注册、分发至私有COS后整包完整读回SHA一致，accessLevel PUBLIC、状态DRAFT；原10条资料记录不变，未宣称用户已可下载该新包。D99实际目录为99_整理清单，完整中医单包_私有云完整读回_20261026.json和中医单包服务器实际客户端校验_20261026.json存证。新单包客户端dd96012的完整质量40210999460含类型检查通过；后续修改仍需复核。三维与课程既有权益未变。
- 299图片全部复制到私有learning_content并逐对象完整读回；现行10个云资料包完整本地副本也已核SHA保留于D05/现行云端资料完整本地副本_20261026。旧匿名新图静态路径尚未封闭，短期授权按需取图/合并会员三维一次入口仍需完成，不能仅凭私有副本宣称防盗链完成。离线合法内容不能保证绝对不可复制，不增加用户身份验证。
- 新增数据型中医单包协议与子包原子索引、药材/方剂已知字段更新钩子，原典逐本原生保存，原图由单个归档直接解出并核SHA保存，不再分299次网络下载。完整保存按钮改用新单包流程，后台通用更新不误启用未解析复合归档。会员三维完整入口、旧版兼容和最终真实iOS重启测试仍待收口，未上传56/2147。
- 已从汉籍库固定提交取得15部术数原典所列卷册138文件，约1997245字；每原仓库压缩件SHA、各卷原文/页标出处保留。候选yixue-classics-library-1.0.0.pack为5603047字节SHA8e3044bd2a5b311f47b6b2bd592f1235bdf8ac7bc918a2d9fff875103b2f43d4。含三命通会、六壬大全、星学大成、太乙金镜式经、遁甲演义、协纪辨方书等；不代表全部工具引用书目已齐或已逐字专业校勘。宅经旧题黄帝明确作者成书待考，六壬大全按所据四库本阙名，不凭另一版本乱署作者。新通用书库接逐本原生保存与易学附加书目，候选仍未发布，现代课程不假装古籍公版。
- 当前仍OPEN：全部易学引用书目补核、私有图片授权入口/静态限制、所有账号实际下载验证、会员三维一次准备、声音选择实际原生验收、最终完整安装包与商店提交、历史版本认定和剩余安全清理。未启动桌面/手机投屏，未改E只读镜像，未删教材原图源码包。
## 78.35 2026-10-26 账号原图授权、匿名直链收拢与19部易学原典
- 新教材图片改走既有账号登录下的/api/offline/study-image-link，仅允许已核验目录中的路径，按图片SHA映射私有对象，签名180秒；每账号120次/分钟抑制批量探测。正常登录的专用审核账号实际取图200并完整核SHA，匿名401；没有新增短信、国内手机或身份核验。现有30幅动图/照片公有路径不变，新269教材图片匿名直链全部403；299路径全量HEAD核对零失败，授权私有原图在封闭直链后再次完整读回通过。原已下载内容不受影响。对应D99/原图普通账号授权_实际下载完整核验_20261026.json及全部299图像路径_新增269防直链与原30可用核验_20261026.json。受权离线阅读无法保证绝对防复制，未作此承诺。
- 服务器offlinePackRoutes原SHAa8c72bfc…，新整包普通账号门控后f8a99dcd…，加原图路由后3245ef67ae2816315240a6f9a1276e8f04c903403bfc2ef74d9ffad090601aed；每步先保全原件、node语法检查后PM2 reload，公开manifest仍8条，新整包未发布。新目录文件和图片服务已部署。Nginx原12fc39da…，新56937b7111c445678efc33d7818d27a881b80b384e3cff5c303811c8f3ebbffb，-t及reload通过，备份在服务器tcm-complete-20261026；授权签名及密码未写入回执。
- 客户端新图优先原生文件、完整归档内文件，再申请短期链接；COS请求不携带应用JWT，按目录SHA/尺寸核验后读回保存。单次中医准备同时按已有会员状态下载两套三维模型，仍由服务端验证权益；非会员不请求这些模型，不改其他课程权益。移动网络合计仅一次下载确认。57569a1与b8edd41完整质量40211529256/40211806112均通过；后新增私有图接口与客户端仍待新质量复核。4项普通账号/会员门控与图片授权单测通过。
- 易学候选扩为19部、218个所据卷册文件、2621801字，补周易注疏、集解、原本/别本本义；注疏按目录明确王弼、韩康伯注/陆德明音义/孔颖达疏及附录，未只归王弼。1.1.0候选7369454字节SHAcb4eb9fe93f37a8fe3e3c6625465d75dbfde09a49ab40f97e6cd92400669198f，正常接口私有COS分发、完整读回一致，状态DRAFT/PUBLIC，之前11记录不变。19整本客户端实际保存/新实例清空包后逐正文相等、坏正文拒绝、部分更新保留旧书3项通过（服务器模拟原生文件接口，不是手机实测）；D99/19部易学原典_实际客户端保存与冷读核验_20261026.json与私有云回执存证。原15部1.0.0候选保留不覆盖，但不再作为最终最新包。
- 新IOS真实测试40211840425已完成原生编译并在iPhone/iPad测试阶段，结束前不得标记通过；最终56/2147仍未上传。全部工具引用典籍尚未收齐、专业医学审校、实机全包离线、商店整体更新与安全清理仍OPEN。未开启CUA或桌面投屏。
## 78.36 2026-10-26 内容协议最低版本与最新原生验证
- 确认旧25.0.115客户端不识别复合归档，不能沿用同一营销版本号让旧版误下载。因此新版客户端统一改25.0.116（苹果拟56、安卓拟2147），package/lock、客户端常量、安卓versionName、iOS主应用/组件营销版本和上传校验同步。两新包正常管理接口改最低25.0.116，内容字节/SHA与PUBLIC权益不变、仍DRAFT，其他10个资料记录未动，D99/新资料最低版本25116_云端配置读回_20261026.json留证。25.0.115候选构建40213368045/40213370463/40213372877/40213409439已请求取消，未向商店上传，不作为最终候选。
- b8edd41原生实测40211840425成功，iPhone+iPad均有原生Application Support、重启实际fetch/XHR/API/原图fetch阻断及原合谷照片380682字节30389ea5…/大肠经动图452044字节a5315ea1…完整SHA读回。包括私人档案创建、保存、锁定后解锁与完整正文检查通过。实际回执已下载D90/真实苹果重启断网验证_40211840425，artifact12607005901；这是模拟器实际应用证据，不是用户实机或完整299图原生验收。5d2f1a8新增私有取图后的完整质量40213117394也成功。
- 追加归档内图片恢复：已下载主归档但某原生图文件尚未保存时，可直接从归档取出并核SHA，无需再次下载。完成299图原生保存后释放64MB归档读取引用，再准备会员模型，降低并行大文件内存占用。后续内容升级沿已知字段/目录更新，不会执行云端脚本。
- 缓存维基公开修订继续串行研究，取得奇门统宗、渊海子平、滴天髓、火珠林、烟波钓叟歌、玉匣记、紫微斗数全书全览等原页，未将索引页当全集。请求返回429后停止该批次，原始修订和文本仅保存在D研究库，尚未补进19部已核卷文件的正式候选，不虚增已发布数。后续仍须区分古代原典与现代整理、确定篇卷范围。
## 78.37 2026-10-26 负责人权益确认落实、原生发布与实际下载核验
- 负责人明确：正文、图谱全部账号可下载，三维人体保留现有会员权益。已发布tcm-learning-complete 1.0.0与yixue-classics-library 1.1.0，均PUBLIC、最低客户端25.0.116；普通账号经已发布目录实际完整下载63804323/7369454字节，SHA分别2cf675a12377ab7bb4d3643891787d6b089dfc9fb0d649d9547a7360e2b9b7cc与cb4eb9fe93f37a8fe3e3c6625465d75dbfde09a49ab40f97e6cd92400669198f。无新增短信或手机验证；匿名仍需正常登录。三维MEMBER校验保持，会员可在中医准备一次操作中准备已有模型。
- 最终应用源码63c803815a8983fb15f98161fbba5261f7bd4160；完整质量40215498964、密钥检查40215498243通过。苹果构建40215878370及同一IPA上传40216465046成功，TestFlight 25.0.116(56) VALID/IN_BETA_TESTING、已有内部组可用；实际IPA SHA a177a6f30981309beea2c319011711932bf32e12e06078563f511c0b5029c36f。正式App Store最后实证仍25.0.115(53) WAITING_FOR_REVIEW，不能把TestFlight写成正式提审成功。
- 安卓2147/25.0.116 internal、Google、Tencent构建40215881071/40215883664/40215886150均成功。internal实际APK 91147526字节、SHA94fd7906ca604ce1d008d5d63b8028889e0025bc557cc9bf6643bf0afb26c0ae，实际包名/版本/签名及原30图像均核验。iOS与Android均含归档协议且原30素材SHA一致；最新同源iPhone/iPad测试40215888322成功，但不等于用户实机所有资料逐项审校。
- 官网主应用已部署同源25.0.116，2382文件逐SHA校验；下载API2147、forceUpdate=false，持久下载目录与旧2144保留。主应用downloads/latest及app-download入口已指新APK，公网整包读回SHA一致。公司www.yandao.vip的两条旧COS/CDN下载入口仍旧：现有角色COS写入403、CDN只读API也未获授权，未改ACL或其他应用。已另行询问仅两路径CDN网页转发授权，未获回复前不扩展网页操作范围。
- 商店统一学习介绍、关键词、更新说明已存D04各渠道待提交文件，不冒称全部商店已提交2147。Google个人号实际有11项尚未送审变更（营销、数据安全、健康声明等），不是当前审核中；组织账号要求退回仍有效。个人转移页有已接受外语的遗留空记录且报7083C7D3，公司仅收到外语、无国学；是否该残留阻塞尚不能证明。不得为试错删除健康申报、取消外语转移或改其他应用。公司既有工单6-0755000042443仍未解决，本轮未冒称已新发支持回复。
- 现行资料含550药材、316方剂、361标准经穴、267董氏原书条目（含组合）、46部中医所据版本及299图，另19部易学原典；不代表每项倪师专论/所有工具典籍/专业医学审校已全部补齐。用户教材、原扫描及现代课程版权范围仍区分。听学已共用可选系统声音，实际可用数量以设备为准。
- 清理尚未完成。经边界和恢复证据核查，拟删D90本轮模拟读回临时副本1520文件91610684字节，但自动审批在命令启动前返回blocked by policy且无具体原因；未删除，未换方法重试。详见D99/模拟读回临时副本_删除审批被拒_20261026.json。原教材、源码包、原图、E只读镜像未删改。未开启桌面或手机投屏；商店核查仅后台网页。
## 78.38 2026-10-26 中医参考实机、布局改版与TestFlight58/安卓2149交付
- 负责人明确女性模型不存在可不补做；本轮直接查看已连接华为NAM-AL00上的知源(com.mc.acupoint_3d)与中医经络穴位(com.hutuxo.acupoint)，未开启投屏或桌面控制。实际看到后者模型、内裤、左右工具及经络侧栏，点击肺经遇会员提示，未购买或声称实测其付费动画；知源免费药材列表、紫苏详情、中府概述/定位等已查看。截图及SHA、观察范围在D90/20261026手机竞品参考，不把竞品图片或正文导入本产品。
- 药材/标准经穴/董氏详情保留既有内容，把经典及倪师对照移至基础资料后，保持逐源筛选、原页、配穴等；重复姓名/别名仅去重复展示，原字段仍在标题。加入页内目录、药材本机听学入口，基础信息先于图片和长引用；旧操作整理折叠保留，未删除模拟诊断、辨证、题库、AI、社交或原有课程。古籍来源小字展示、正文应用内读，不再从这些古籍引用和书库来源链接跳到第三方网站。版权/版本元数据保留。
- 模型改深色画布、右侧经络简称快捷选择，默认先看清完整模型，选经络再显示对应线/穴名；保留全部组织、分层、剥离、隐藏、透明、撤销重做、头发及原四层入口。不常用操作收进“操作工具”。以独立可隐藏衣物网格遮挡默认人体外轮廓，侧边设置支持关闭与恢复；不改原模型或穴位坐标。新增沿已有模型线路的动态高亮、暂停和速度控制；不宣称新增专业审校的内部循行拓扑或临床精准定位。
- 华为实测发现初版衣物遮挡不足、工具拥挤以及旧药材搜索输入字体发白，均已修正。最后同修药材/方剂/穴位搜索文字与光标颜色。最终2149已以保留数据方式安装，实际桂枝文字清楚并筛得1条，原已缓存模型可打开、肺经侧栏选择及动态高亮/暂停可用。衣物开关在9394实测、最终模型代码同一实现，默认覆盖完整；原教学源文件未改。D90/20261026中医布局实机/实机核验记录.json及相应2149截图存证。不是iPhone实机全功能验收，不把所有医学条目写成已专业校对。
- 最终应用源码e3a99e2e866d8053f5c18003cb225692ee856ed3；完整质量及网页预览40265150241成功，苹果构建40265153268成功；安卓internal/Google/Tencent构建40265155912/40265405428/40265407658均同源成功。实际IPA25.0.116(58)58214210字节SHA47aaa7b056e194a9e0130dfca8ec23b517ee37158a72b64917d439710f25f5ce，安卓25.0.116(2149)91149234字节SHA915a673969872b3c8e355c781d48cd31ca99440d958242c8f342a7505a24e072；两包原30媒体完整SHA校验、内容协议及嵌入网页版本通过。原生成中间候选均不作为最终版。
- 已验证原IPA经40266029534直接上传（未重新打包），Apple构建9fb2c237-fbe5-485e-8733-0ade2b98d12b为VALID/IN_BETA_TESTING，已连原有内部组，TestFlight25.0.116(58)可安装；D04/Apple/TestFlight_25.0.116_58_实际状态.json存证。此前本轮57也已上传，但58为本轮最终最新。此为内部测试，不代表正式App Store或其他全部商店已重新提交。D04既有各店待提交资料已补本轮功能说明，明确待提交状态；未伪造商店回执。
- 官网现行/root/yandaoguoxue/current指向v25.0.116-study-layout-e3a99e2，2381文件逐SHA核验，保留76个旧散列资源供已打开页面继续使用，之前63完整网页和2147安装包保留。Nginx八处主应用下载重定向已改2149，更新接口forceUpdate=false。新Nginx SHA3377cfde4fd0333eaa44b6ae3f7911c2c51ca038ed01c05d799cf7fa15e9b8d5、发布配置SHA5e65bdec1ae0378f6f241e1a0c55c51e96b2deb9045f977eb610bf9e9093fa38。源站经保留真实域名/证书的HTTPS完整回读91149234字节与签名原包SHA一致；外部网络五条下载入口HEAD及更新接口、十条学习/辨证/模型等页面均200。外部全包流式进程曾被终止，未冒称跨网络完整下载成功；D99分别保留源站完整读回与公网入口证据。公司www.yandao.vip两条旧COS/CDN链接仍为先前授权阻塞项，本轮未改其权限或其他产品。
- 发布传输仅复用已核SHA的旧静态文件与已签名ZIP压缩块，重建后逐字节SHA必须等于完整CI原件，不是客户端热更新代码。scripts/release-zip-delta.py与release-web-delta.py及5项防错/精确恢复测试已纳源码；实际2149差分229923字节恢复完整91149234字节且SHA一致，临时还原副本自动清理；静态最终目录逐文件完整校验。运维提交1a4e225不改变上述应用源码。正文/图谱仍所有登录账号可下载、三维仍原会员权益，没有新增短信或身份验证。
- 本轮清理两个约200MB、各2381文件的旧生成网页预览D03/当前网页包/25.0.116_e68acc4与25.0.116_b80cae0时，自动审批在命令启动前返回blocked by policy，没有具体理由。两目录未删，未换方式重试；D99/本轮临时网页预览_删除审批被拒_20261026.json存证。旧91MB清理阻挡目标也未重试。教材、源码包、原图、模型原件及只读E镜像未删除。清理与全商店正式更新仍未完成。本报告/root副本及D02镜像同步；E镜像按负责人只读要求不写入。

## 78.39 2026-10-26 穴位主卡纠错、倪师笔记专区、117版实机与TestFlight59
- 负责人本轮要求解决空字段、大标签遮挡、误剥皮，补充D盘倪师资料并按笔记方式阅读；随后明确“有授权”且原限制为本人此前说明，可继续整理。原17份TXT/Word/RTF只读逐SHA保全，严格提取至D05/课程课件/倪师专区_用户补充原件整理_20261026。整理12门、1141章/阅读段，含6门人纪、3组研习记录与3组补充研习；扶阳讲记署卢崇汉，跟诊和转载分别署名，未都冒充倪师原著。Word内嵌图片未宣称已抽齐；原稿缺字、文章集2处替换字符仍在版本质量说明中，原件完整保留。授权依据待负责人归档，不伪造证书。
- 修复主卡只取少量静态字典、把“暂无”当真内容和7天旧缓存的问题。src/lib/acupointOverview.ts、src/data/acupointOverviewEvidence.json、tcmScraper.ts与AcupointOverviewCard.tsx统一解析真实出处；361穴有来源定位，含359经典条目与独立现代参考，经典/现代分寸区别展示。实际主治覆盖357、明确经典配穴52；这不是全量现代国标或专业医学审校完成，不硬凑缺项。SP1/SP14白话学习说明与原文可切换；有效受控定位数据优先，后续补正文无需改客户端。src/app/zhongyi/meridian/page.tsx去空卡、将图文/操作/原文分开，目录可打开折叠内容，切穴重置旧资料与朗读，来源小字保留。
- 医学资料1.2.0修正2419条症状子串错链，例如“心腹结气”不再冒充腹结穴专论；原段落/图片/董氏资料仍保留。新增倪师精确药名及经穴课程关联293药/303穴，共903链接，明确同经范围只算课程上下文。最终库408来源、7456段、1217主题；包含既有材料后432药/348穴具倪师相关上下文，不代表每项都有倪师专论。经穴共享段落ID覆盖错误也经逐条回归修复。D99/穴位主卡与最终倪师关联候选核验_20261026.json及两维护Python脚本可复现。
- 新增src/app/zhongyi/ni-study/page.tsx、niTeacherCourses.ts和元数据目录：按课程分章、正文查找、听学、原稿/笔记排版、阅读进度及按账号隔离的个人笔记。原文不会被个人笔记覆盖。修复异步保存旧快照误报新编辑已保存；初次读取/JSON错误时禁用空白覆盖并允许重试，新增storageManager.getStrict和readOfflineFileStrict区分读取失败与不存在。未增加验证码、手机号绑定、私人资料锁或额外会员校验。
- 完整中医包最终为1.1.1（67018105字节，SHA a6973cbac314df9ce5b1f0049bafce4db19dc46cf28b68ca609a7ba252b74509），309文件/9虚拟板块，原299图与28动图均保留；会员三维仍为既有权限对象，同一次准备补齐。新Ni集合1.0.1仅按原【栏目】及句号分段，11门966章调整，全部1141章去空白字词与1.0.0一致。合集文件SHA25f31e8bc663f4f489cb5714bd935feca4da07e905e48394c1207d2f3c573052；已用未改的客户端模块安装新版并冷启动断网读取12门，实际无需重构。新书/内容通过已校验资料集合更新，支持版本递增、同版异内容拒绝、篡改拒绝、原子目录及失败保旧；执行代码变更仍需正常发布。
- 云端私有learning_content已完整上传/流式回读SHA，匿名对象403、下载入口401，真实普通登录下载200且67018105字节全SHA一致。发布前私有对象核验，再原子更新指定资料记录，其他11行/会员权益不变；不设置全桶公开，不宣称离线资料绝对防提取。最新凭据不进报告，回执D99/中医笔记资料包1.1.1_私有云发布核验.json及中医笔记资料包最新_真实账号全流下载及SHA核验_20261026.json。
- AtlasViewer/AtlasScene/atlasState改暗色窄工具、右侧当前经穴列表、小字贴近点位、局部聚焦及底部短卡，初始沉浸且目录覆盖画布。普通长按不再触发识别/剥离；剥离需明确启用，选经/穴恢复完整体表。竖屏点穴距离按宽高比修正，保留周边结构。默认衣物可在设置关闭；保留组织、透明、分散、截面、撤销重做、左右侧、循环/速度、头发及“原四层模型”切换。原模型缺真人贴图，未冒称达到竞品写实外观或穴位全部专业定位校核；未导入竞品图片/正文、未购买付费内容。
- 华为NAM-AL00实际由2149保留数据安装2150/25.0.117，已核默认完整体表、普通长按1.3秒不剥皮、肺经列表、中府聚焦、底卡跳转、一次完整下载、检索人参和正文。关闭Wi-Fi及移动数据后首次打开本草课程成功，原两项网络已恢复；未冒充本项为冷启动。再由同一2150下载1.1.1并显示【本经原文】【产地】【性味】分段，没有重装应用。D90/20261026笔记改版/华为2150实机存21张原始截图、网络状态、SHA与实机核验记录。隔离无头浏览器使用已核资料作测试夹具，390×844另实渲染7页；生产网络被CSP禁用，预览端口3117与专用浏览器进程已停止，未开启投屏或桌面控制。没有iPhone物理设备全功能验收声明。
- 最终网页/安卓应用源码120ada5d17c1db95f1454cdcea1a2eae0559ad57，完整类型/回归/网页构建40305691724成功；新针对测试含资料升级/失败保旧/读取保护，真实资料与合成样本均通过。Android internal40306097341、Google40306477586、Tencent40306481674同源成功。内测APK91370992字节SHAab0f3d94843e797079775cce01e1da9bf9827858453a7c7f83ddfcedf930739b；Google AAB75305540字节SHA29de5cc3c98408eb30a9237e70c6ecc941b382403a13697915d0ee72bc0f4244；腾讯APK91345560字节SHA0ee07dd463efc763121b63944ec076bca5b9caab5c09ea6bbc510bc2c8575ce9。D03按渠道保存，实际三包原30媒体及内容协议均验证，无匿名Ni正文目录/远程应用代码地址。
- 苹果构建过程抓出旧RELEASE_VERSION及上传门禁仍写116，未上传错误候选；修复为读取来源package.json并核主应用、组件、内置网页一致。应用网页仍同120，仅原生版本元数据修正源码47fe67ccdcf66b5b35e2206e015c2a1efae90031；最终构建40307249334成功，IPA58436886字节SHA6a05243469a022856d3497ce3cc1b8cbd4ca669126f9c64448ebdd63511a939d。第一次上传40309037139在旧门禁前置断言停止；门禁e696953改为按精确来源manifest核验，未放宽身份/SHA/防重规则；40309678705将同一已核IPA成功上传。Apple构建f8bc73d0-c7ed-41f5-8cba-4f47b32473c8为25.0.117(59)、VALID/IN_BETA_TESTING，原内部组364f4cc7-415b-4010-89f1-5947c3c0edf2已关联，D04/Apple/TestFlight_25.0.117_59_实际状态.json存证。这是内部测试，不冒充正式App Store批准。
- 官网/root/yandaoguoxue/current现指v25.0.117-calendar-community-120ada5，2394文件逐SHA验证，复用70263976字节并保留95个旧散列资源，旧116网页回退仍在。八处主应用下载入口及更新接口改2150，forceUpdate=false；公网7入口/页面及版本接口200。源站保留真实域名/证书的HTTPS全量91370992字节SHA一致，未把源站回读冒充跨网络全量下载。Nginx SHA6653cc1d1c3ef8930245118891a1d9d5092edbf71c838c29e5030d1ebfe763d3，发布配置SHA2b89a435235deea496ec64b62a93ec922533c410fe00fb008b6ae347a0d24690；D08现行副本和D99回执已同步。公司www.yandao.vip两条旧COS/CDN链接仍是先前授权缺项，本轮未擅改权限。
- D04八店最新介绍/更新说明/关键词草稿已更新117，明确学习、原典、图谱、课程笔记和交流，不宣称医疗咨询、开方或售药。八店正式重提、Google组织迁移、华为/OPPO/荣耀等实际审核问题本轮未完成；旧实际回执保留，草稿均标DRAFT_NOT_SUBMITTED。具体未得出处的配穴/逐条白话、专业医学与图谱校核及原稿缺字仍待补，不能把本轮当全项目全部验收通过。
- 清理仅移除本轮服务器临时验证副本1073文件25293165字节及7916976字节传输文件，确认共享node_modules仍在；D99/本轮服务器临时验证副本清理核验.json。D盘12份本轮生成public课程副本与5份早期medical中间候选的删除被自动审批在启动前以blocked by policy拒绝，无具体理由，0删除，未换方式重试；相关D99两份拒绝回执保留。public/data/ni-study明确gitignore且最终原生校验拒绝该目录，未将全文匿名发布。其他先前被拒目标、教材、源码包、28动图、原照片、模型、签名和生产配置未删；本轮失败/中间原生候选未冒充当前发布，清理/历史完整版本轮换仍未全部完成。
- 活动仓绝对路径依制度；本轮所有变更绝对路径及SHA列于D99/117本轮源码改动绝对路径清单.json。唯一权威本报告、仓根兼容副本与D02/FINAL_PROJECT_HANDOVER.md逐字节同步，台账同D02；最终SHA/提交/上游差异在D99/117本轮交接与收尾核验.json。E:/言道国学3D评估_12A/交接报告镜像_只读/按负责人要求未写入，不冒称E同步。收尾提交仅文档，应用源与渠道证据以上述固定提交为准。

## 78.40 2026-10-27 118贴体衣物、返回恢复、真实课程笔记及完整发布增量

本轮继续负责人10月26日三条开发指令及明确答复“直接15%，二级0”，保持完整社交/所有既有学习功能、正文图谱所有账号可下载、三维人体原会员权益。E盘只读交接镜像不写，活动工程原路径保留；引用材料与附加建议不自动变成已批准的新规则。

[78.40_FINAL_STATUS] 本轮实际交付：苹果25.0.118(60)已于东京2026-10-27 02:59:34正式受理，审核bee69018-5b8d-4b49-9674-6514b14fcc50为WAITING_FOR_REVIEW；TestFlight60可更新，安卓2151已安装华为及官网发布。正式尚未批准上架，国内/Google本轮尚未重新提交；COS公网APK加速禁用回源、清理受阻及其余未验项不冒称完成。

- 最终产品源码 ac13a433cfb5f5e8f2c2e3e0946f7181339fc079，25.0.118；应用质量/预览40349892381成功，artifact12663476998、ZIP SHA e2336012f243d47a7a399d39a8d8e4f52a54aa1ef0dd5f7f88b2c136e0bb37d1。网页2414文件101858301字节逐SHA核验，current指向v25.0.118-calendar-community-ac13a43，上一117/120ada5保留，123旧散列块保持可读。官网没有强制升级。
- 关闭上一版本的厚块遮挡方案，衣物现为贴体曲面蓝色平角内裤（4339顶点、8416面），支持原有隐藏/分层/透明与设置切换，原模型和定位坐标不改。正背面及侧面独立渲染、真人机和iOS真实模拟器均可见衣着；几何检查不替代医学定位审校。按本轮新要求恢复默认长按1000ms后逐800ms连续剥离，双指/移动/离开/隐藏/卸载停止；修正空撤销步骤。此条覆盖78.39“默认长按关闭”的旧实现。
- 返回处理覆盖模型→穴位→原观察状态、图片弹层、目录/课程与中医父级，保存左右、镜头、组织隐藏/透明/隔离、撤销重做、检索与滚动，不依赖外部浏览历史。三次往返历史长度[12,12,12]、18项导航/手势及真实14页操作证据在D90/20261026笔记改版/118交互。首轮点穴旋转未稳定复现失败及其后对照都保留，不删失败记录。华为2151以install -r保留数据安装，实际见新内裤前/旋转、肺经中府、经典定位主治、原书第5页放大、返回仅关闭图片；返回模型完成观察时另一应用已前台，后续USB断开，未把该中断当作实机返回全通过。实机记录在D90/20261026笔记改版/华为2151实机。
- Ni专区保留12门1141章原课与原稿，同时新增6705条源句锚定摘记、284例句、结构/术语对照、阅读复习题及解析；179短章不硬凑摘记。可回源定位、原文批注、收藏、按账号隔离的私人笔记及导出；公共更新不覆盖个人笔记，旧格式迁移、版本冲突、迟回写和读取失败保护均测试。联系方式仅按实际显示/导出脱敏，不冒充课件原作者新写的诊疗结论。17份用户原件SHA不变；D99/118资料与笔记交接增量_20261027.txt含准确字段与所有证据。
- 新增《针灸资生经》《十四经发挥》《奇经八脉考》固定CC0来源录文，34章顺序读回。该已核底本集合36→39，原36对象不变；并非宣称全部中医书目只有39或完整古籍均已专业审校。新中医整包1.1.2为67219662字节，SHA f214938bff5e9e3501422bc698e328789d8aca58a0eb0a332326d9833be8229e，309文件/9板块，仅一份原典集合JSON替换，其余308文件完整SHA不变。已私有COS上传并完整读回、正常登录全流下载通过，PUBLIC最低117、其他11资料记录与三维权益不变。真实下载账号为premium，不把它冒充实测非会员；PUBLIC规则及普通权限单测另有证据。
- 旧已发布117的准确来源120ada5d17c1db95f1454cdcea1a2eae0559ad57已实测原生持久冷读39底本/12课，0网络；苹果47fe67c的11个内容依赖与它一致。此前把f745e48当最终117的验证仅历史过程，不作为兼容性结论。内容/图片以后继续走受控数据更新，功能与执行代码仍走正常原生发布。
- 299图现支持只安装原始资料包而图片目录保存被中断的恢复，真实1.1.2归档恢复全部目录、新页182377字节SHA a6d252…和原30保护图片读回正确，0HTTP/0短链；加载/错误重试、旧请求竞争、换穴首帧与卸载保护8项通过。原28动图、2原真人照片及269教材页均保留；不把299图片称为每穴独立真人近照。董氏附件仍是旧39且有27条无据“无特殊禁忌”，未用它覆盖已整理数据；39兼容条与267原书条（含组合）保护，37重复仅抑制展示，269可展示。完整主治/配伍/禁忌专业核验仍有缺项；核实成药产品和厂商说明书仍为0，不把550药材当成药库。
- 内置协议与资料来源含离线MIT/CC及署名，Creative Commons原文与下载来源全SHA保留。旧外部古籍跳转不恢复；设置统一入口可读。不新增海外手机号前置或反复身份弹窗，私密授权/举报审核继续生效。
- Android internal40349943208：91492400字节，SHA 2ce3de1ccc6d92ffb31e0fd30479142d6d86731249773c3ef96007e7d6f7fd9d；Tencent40349958417：91468032字节，SHA 5c1f8dd8f5a8551fbdfa5a6c44b837866cb8a2693d1d53551deae76969af39f7；Google AAB40349951886：75402709字节，SHA da2efa8c89570d65e1861c2d3dc0d6b5a31cfaebe3810cb3ca9dea514b4fd9ae。均118/2151/ac13，实际manifest、正式证书8ca0c414573d4b05fc2bd1ba9c6a2a8090c90c58e3815119494607443dc6d5a0、渠道marker和30原媒体全SHA通过。原包在D03当前原生包，凭据D99分别列明。
- Apple build40349935638：58559512字节，SHA 92286aba6e04034e00c66588c0c064d0a4f8f61b0e909df4b23c94146a6c1878，主App/真实Widget均118(60)、com.yandaoguoxue.app，30原媒体和内容协议核验通过。原IPA经40351096382直接上传，buildId0500d915-4275-4e15-bd0c-9367e763f40d VALID/IN_BETA_TESTING，原内部组364f4cc7-415b-4010-89f1-5947c3c0edf2已附，无重复IPA构建上传。D04/Apple/TestFlight_25.0.118_60_实际状态.json为内部回执，不等于正式提审。
- 新真实营销截图40363346235 attempt2成功，应用固定ac13、QA35ceb780469196247dc3ee9c3ea9cafcaf497549；只为截图改测试，不改应用。14原图全审，每设备选中医首页、衣物模型、Ni摘记、古籍正文、学习分享5张；iPhone1320×2868、iPad2064×2752全RGB无alpha，保留真实iPad居中布局，不裁造界面。manifest全SHA ee73dcaa2328f4fc94c00ce562ef5475054ce62785b035429b6309a485a2933d；首次固定底栏误滚失败、第二次模拟器准备code60及原图/attempt均保留。旧基础38截图不是这套新营销齐备证据，也不是IAP购买成功证据。
- Apple专项授权精确118/60/ac13及新截图run/QA源/manifest，整体07/09/10完成标记未改；17项授权/归属/新图容量/故障恢复及语言字段回归通过。新图之前旧中文两槽各5，65槽0；新图每槽5，先共存10且全部COMPLETE后才移除旧引用。私密审核账号只保留后台字段、正常ios登录/Sandbox/atlas+整包权限实测，CI仅两项加密secret，未把密码写入报告或公开材料。正式动作以D04/Apple各阶段实际回执为准。
- 按负责人确认部署15%直接、二级0；新支付必须有真实交易及已冻结规则，商店/来源不明不自动现金计佣，历史132订单/5佣金SHA不改。公司下载票据15分钟单次、完整文件流SHA/字节完成才记下载事实，保留“已下载但最初安装来源未知”，不会把重装猜成原始官网安装。117已替换2151固定文件/配置，真实普通JWT2151签发200只签发未消费。商店学习分享码正常，提现仍关闭。十人非AI活动仍DRAFT_NOT_LAUNCHED，真实学习证据链/渠道政策未齐，不能宣传已启用；非AI不增加AI点数。完整退款历史L1/L2可一次反向，旧多笔部分退款仍须唯一事件证据，不宣称全部补齐。
- 官网2151八个跳转与forceUpdate=false已核。首次切换读取Nginx旧worker导致误回退，修成两完整连续轮收敛后成功，原失败和回滚核验记录保留。维护脚本18项通过。现nginx SHA65636bdd9589f545e589872e6943443adc5b4602b169bd758b9859f481a7ec08、发布cfg8aae7c871a8f70e2bcf4d9f9383e01c51b57fd8241b0f9b9c1289decbe5a0929、company cfg7fa7c43038b76b3092eafd7a0036a28ffda8877f646e809619d2bb518fc5f9de，D08已核同步及原117备份。源站保TLS全91MB读回SHA通过；Windows外网慢流/超时记录保留，不把HEAD通过说成全流已过。
- 为下载速度新增仅固定2151 APK的独立私有COS对象，一次Put、全云端SHA与匿名403正确；不接受任意课程key、不改bucket/其他对象ACL，现网身份实际为STATIC/CAMUser，不能误记CVM_ROLE。第一次启用被生产身份gate401，已立即禁用，补固定GET/HEAD精确例外及真实生产gate链45项测试后第二次启用；共2次国学后台restart、1次Put、同一UUID e000c46c-ce36-4134-9f67-162b1fb2818c，无第二对象。外网实测COS默认域名返回DownloadForbidden：公网APK需自定义域名；云内全流不代表公网交付。已再次禁用并恢复静态下载，不宣称加速上线。全局Nginx代理HEAD→GET已三层证实，但缓存过期造成GET403并未证实，先前工作说明已纠正。www既有CDN的新私有对象signed/unsigned均403，当前身份无cdn:DescribeDomainsConfig/cos:GetBucketDomain只读权限，无法确认复用；未改DNS、CDN、Nginx、域名或扩展名。D99/118_COS公网APK限制与既有自定义域名_只读核验_20261027.json及独立禁用/失败/回滚记录为准。核心资料.pack不受APK扩展名公网限制，本轮正常真实iOS资料下载已通过。
- 后端推广部署先失败回滚再成功，共3次该轮restart，保留live partner独有隐私逻辑，仅精确并入两项规则；当前partner SHA dba67b374747bcd059928dccefe0508713e7efca7fe8ec73fe9e34fb87a2d2f1。后来安装包准备独立2次restart如上一条，不混成一次。新公网模块引发CI旧fixture缺Express的40366155339失败，已将该回归放到既有HTTP依赖后执行，374f85c的40366939960完整质量成功；不重出产品IPA。此前本机一次复测漏TS路径失败也有原输出，补现有路径后36/45全过，无新源码依赖安装。
- D04各渠道草稿统一118/ac13、学习向介绍/关键词/更新说明，Google/Abo分别用正确AAB/Tencent APK；未把准备稿写作提交回执。国内店网页工具两次初始化都报failed to write kernel assets/os error3，reset后仍失败，未因此启动桌面控制。Google迁移两旧case及各国内店最新退回，本轮不能以旧记录冒充新后台状态。11资质原件仍D09集中，不把上游混元算法备案当本公司独立备案。公司www两条下载CDN转发方案只更新到2151目标，仍待有权限控制台，不改其他产品。
- 文件整理：14旧原生目录19文件1029635639字节移入D03/历史原生包_待历史版本匹配/20261027_118收口归档，SHA全部相同，有完整旧新路径映射和恢复说明。当前目录仅118四渠道+117四个已验证回退；不是删除、不计释放空间、不冒称已选完负责人认可的三个历史完整版本。全部旧候选仍保护，未使用旧“当前+一个历史”脚本。
- 清理未完成。六个新已关闭专用浏览器缓存1833文件286092907字节，边界/无链接/无进程重新核查后单次Remove-Item在启动前自动审批拒绝，仅blocked by policy无具体理由，目录仍在且不换方法重试；新HTTP测试依赖911文件8225281字节同样被拒，未重试。此前所有被拒目标不再尝试。教材、源码包、课程、原模型/纹理、原动图/照片均未删，E只读镜像未写。D总库分类入口新增90/98与本轮实际清理状态，素材只建索引不重复复制PNG；本任务自有RAM预览3120已停，无新投屏或桌面操作。

本轮资料/推广完整增量分别见D99/118资料与笔记交接增量_20261027.txt、D90/20261026笔记改版/本轮推广与安卓官网发布交接增量_20261027.txt。未完成项目必须继续以真实验收补齐：所有条目专业校核/成药说明书、10人真实证据活动、全店正式更新/Google迁移、独立公网APK自定义分发、受自动审批拦截的清理及三个历史完整版本匹配；不能用本轮新包交付替代这些完成标记。
78.40最终正式审核读回：D04/Apple/Apple118正式提审回执.json（3151字节，SHA43f12433c6b3804fa173ad49d2d39b8718cfdbe59640c2ed012666bd04b20750），阶段09受理回执SHA f4526e24caa5deb261a4f6f9de57cfafc3dd37ca644c27d9534087d1980f5b90；根任务另独立GET核验在Apple118_根任务最终独立读回_20261027.json。实际118/60 VALID，AppStoreVersion与唯一审核均WAITING_FOR_REVIEW，submittedDate2026-10-26T17:59:34.859Z；恰好1应用+原8个IAP version IDs，没有新建商品、改价格或历史订单。新中英4槽20图全部COMPLETE且各5图后才清原中文10条旧引用，65原为0，原PNG保留。Apple自动新增en-US AppInfo条目曾导致旧快照重复409，已刷新同一locale再PATCH；英文缺supportUrl导致组装409，按AssociatedErrors只补同App已核支持地址https://yandaoguoxue.yandao.vip/profile/feedback/，两语privacy原已有且未改。两次失败、原唯一草稿及补齐步骤全部留证，没有反复新建审核。中英最新稿状态已按实际改SUBMITTED_WAITING，未写成审核批准。

网页运行环境排查：按OpenAI Docs的官方分层排错资料检查，本机日志未找到具体缺失路径；专用商店浏览器工具两次初始化/reset后失败，通用JS运行工具再独立调用亦返回同一failed to write kernel assets/os error3。没有读浏览器Cookie/会话内容，没有擅自重装、重启客户端或使用桌面控制替代，无法据此读取国内及Google的新状态；不是开发者账号密码错误。只读诊断摘要见D99/118_商店网页运行环境只读排查_20261027.json。

源码恢复交付以D99/118_当前源码完整恢复包_20261027.json记录的最终提交、包SHA与独立完整历史验证结果为准。D03保存一个当前完整Git恢复包，不再仅依赖旧缺前置增量；教材、课程、三维原资产、保护签名和服务器配置仍分别按D05/D08及原保护路径恢复，Git包不冒充包含这些受控资料。不得为清理删掉最后恢复链。最终规范C报告、根副本与D02逐字节相同，ledger同步；E指定镜像继续只读。

## 78.41 2026-10-27 模型与商店实际退回整改（执行中）

- 统一候选25.0.119/Android2152/Apple61，当前尚未构建、部署或提审119；118(60)正式审核保留。设置/组织/工具改独立侧栏，模型局部限制文字菜单，资料仍可复制；document末指结束后折栏，保留观察状态。原26路线保留，8处大肠经短缺口接续；六额外奇经82段仅有出处的经典体表示意，不冒充完整内部循行或临床精确定位。薄型三角裤2962条真实原模型遮挡射线通过，17项真实数据回归和66项公告/分享/版本/维护回归通过；实际产品预览与新原生验收仍待继续。头面全黑未完整复现，转角补光改善不等于已查明全部原因。
- 新三维3.0.1完整包34021950字节、SHA55c22ee2fa0b81c4ab5c2d9aafecbcbfb3582aa879f11ef03307e5a37ee9b77b，真实客户端读回通过；21原资源逐字节不变，2234模型/362穴位/670目标/原26路保留。仅在已鉴权且SHA验证的可选JSON加载派生路线，支持同协议内容更新，不能下载执行代码。本节时仍未云端提升；原包保留，三维MEMBER权益不改。
- 普通学习分享与公司现金推广分开；商店无现金招募/官网数字付费引导，新规则合格直接15%/间接0，历史不重算。关闭旧邀请/首次消费/本地回调的新奖励路径；无可信逐单旧合同须待核，不能写已结算。纯文本学习/服务通知默认关闭，可即时关闭并限频、修订审核、保留历史，不增隐藏功能。最终后端部署与历史账本不变证明待续。
- 商店网页环境已恢复，只操作商店网页、不启投屏桌控。OPPO国学25.0.115/2144实际“上线”，并非仅Google上架；新意见仍指向启动及我的公司APK更新提示。发现VersionChecker/AppUpgradeChecker及手动检查未隔离渠道，正在彻底隔离所有商店包的公司APK提示与跳转，保留内容包更新，不能靠当前版本碰巧最新验收。
- 华为已切回已认证企业东莞言道科技有限公司；10/26实际7项：我的更新提示、AI权益与退出异常、AI解读内容、合作方算法备案及含名称/编号盖章合作协议、药品信息服务资质、AI显式标识图、会员客服。腾讯实际6项退回也已取全；逐项核当前代码/材料，不能仅写学习平台或改名即算修复。D90/20261027模型与商店修复保存原文，待最终新包与材料一致后提交。
- Google平台于10/26取消旧转移，真实原因仍无支持定论；个人11项未送审变更未删。正确公司账号注册收据ID只在内存填官方字段，不落源码、报告或截图。负责人10/27明确接受协议后，仅提交com.yandao.guoxue由8539674148718133275转至8056957676688740507，并在公司侧接受；回执明确“言道国学”，待Google完成迁移。未改外语和其他应用。旧取消/外语通知仍并列，不得误判；新证据Google_公司接受国学_实际名称确认.png。
- 原教材、课程、原图、模型源文件、旧包及恢复链保护，E镜像只读不写。清理仍未完成，之前自动审批拒绝目标不换方式重试。新模型证据归D90/20261027模型路线与薄型三角裤，商店整改归D90/20261027模型与商店修复，新包与正式回执按D03/D04分类，不重复复制资料。

78.41构建前增量：所有商店启动、手动检查、下载/分享落地页均先按编译渠道拒绝公司APK；实际HTTP版本接口也对明确商店信号清空APK/强制标志，79项相关联合回归通过，旧internal/default标记不能凭猜测识别商店。退出本机立即清除，资料/权益迟回与旧refresh不能恢复旧会话；登录等待全部有界cookie退出请求，24项相关回归通过。AI后台新增泛问学习约束，修三类个人命运断言及句内否定漏拦，普通术语可简答，17项AI/联系入口回归通过；旧本地假AI如实标离线笔记、保留检索，一掌经12宫/6类改为明确词义整理，真实联网AI保留，旧断言缓存不复用。会员购买按钮旁加入已有公开support@yandao.vip及反馈入口。生产仅只读核四指定key是否非空，智谱与混元两上游配置有效，未披露key值、未宣称最近调用或双边合作合同齐全。九个精确后台模块候选可按源码hunk合并，server/.env/业务配置/原账本保护，尚未部署。本机额外security-assessment-http复跑因既有本地库缺jsonwebtoken未执行，不能算通过；完整CI已有正式依赖安装步骤，待其结果。各八店119中文资料与逐条退回清单已D04整理，source待pin/NOT_SUBMITTED明确，旧118和D09原件不覆盖。

## 78.42 2026-10-28 全功能营销文案与特色功能分层（候选，未提交）

- 按负责人要求把营销主线整理为“读经典、看人体、找同好”，突出三维人体/经络与穴位学习、同年同月同日及同时辰的成年学习同伴、同证主题研习、倪海厦自学专区、原典与笔记、易学/历法/天文、统一中医离线资料包和完整社交。Apple、Google及国内渠道短文案和统一长介绍保存在 `docs/marketing/20261028/store-copy-v120.json`；逐平台适配暂列候选，不代表已回填后台或提交。
- 营销采用真实功能边界：源代码可选生日/出生时辰匹配，但 `backend_deploy/tongchenStore.js` 初始配置为 disabled，公开页面会提示暂未开放；`backend_deploy/studyCommentsRoutes.js` 对应研习域在测试与管理员配置中默认关闭。故同辰雅集与同证研习只能作为已准备的营销特色，正式对外声称已可用前必须读回生产开关并通过实际流程。将“同病相怜”改写为按主题自愿学习交流；不建立疾病找人名单、不公开个人病情、不暗示诊疗或病友转介。
- 新增活动要点和真实素材脚本 `docs/marketing/20261028/feature-campaign-kit-v120.md`，内容覆盖三维人体、同辰、主题研习、自学笔记、离线学习、易学历法、社交七个卖点；明确真实截图顺序、演示数据边界和两项服务开放门槛。D04八家应用商店索引均指向相同候选文案，并注明截图与后端开关未满足，不做正式提交。
- 真实营销截图工作流40608056759失败：测试账号没有完成“一份资料包＋会员模型”完整下载。仅有一张实际模拟器首页图，未作为宣传素材；用户敏感内容未用于营销。完整证据路径与失败状态写入25.0.120的 `D:\言道国学项目资料总库\03_源码与版本恢复\候选25.0.120_2153_待审核_20261028\package-verification.json`，活动图文须等下载验收修复和全套真实截图重新采集后再用于上架。
- 25.0.120/2153/iOS62只作为候选；iOS62 TestFlight上传回执为成功但App Store Connect处理状态未读回。25.0.120未正式提交任何商店；当前Google公司账号后台不可读回，旧正式审核记录未撤；项目正式Apple门禁仍未满足。官网未更新。本次未启动投屏/桌面控制、未删资料、课程、图片、源码包或历史版本，也未清理只读E目录。
- D04已同步候选文案与营销要点，八店候选索引都标为NOT_SUBMITTED；文案和脚本SHA、截图失败证据及候选包回执摘要保存在 `D:\言道国学项目资料总库\90_执行证据\20261028功能营销候选\`。工作区/D02/兼容镜像/E盘权威交接镜像按本节后续同步核对；负责人指定只读路径 `E:\言道国学3D评估_12A\交接报告镜像_只读\` 本轮不写。没有删除临时或原始资料文件；项目完整验收、截图、商店审核、全盘清理均保持未完成。下一步先核对同辰和同证生产配置，再修复真实资料下载并重新采集特色功能截图。

## 78.43 2026-10-28 同辰/同证开关溯源、课程按讲重排、Google迁移及官网营销

- 负责人要求查明同辰与同证为何在源码初始值为关闭、确认Google迁移，并突出三维人体、同年同月同日同时辰同好、课程自学和官网15%直接分享规则。`backend_deploy/tongchenStore.js`、`studyResearchDomain.js` 中 `false` 是新数据库的 fail-closed 初值；均用 `INSERT OR IGNORE`，服务重启不会覆盖既有管理员选择。同证开放还要求管理员确认自动审核、渠道披露并留审计说明。这不是商店明文禁止功能的证据，也不是当前线上状态证明。既往交接记有2026-10-19管理员开放及生产读回；本轮未能以管理员身份读取当前服务器配置，故不改成新实例默认开放，也不宣称线上当前可用。营销文案现区分“安全初值”与“当前线上须认证读回”，要求双账号实测后再称当前开放。管理员界面旁注已修正，见 `src/app/admin/study-comments/page.tsx`。
- 重新排整倪师课程数据：`scripts/import-ni-teacher-courses.py` 按针灸课件内录像编号/时间戳划分完整讲次，同一录像中的多个题头归于一讲，不再按任意字符长度切分。D盘新增整理输出，原课件保持不动。`src/data/niTeacherCourseCatalogue.json` 与 `niTeacherCourseRelease.json` 当前记录课程版1.1.0，12门共890个自然单元。阅读器增加“编者学识有限、按课件保留原稿字词、不作解释性改写”说明及来源审查投稿邮箱。自测仅从课件章节/讲课时间段生成复述题，直接引用原文供核对；已移除误导性的通用元数据选择题，不冒充专业编写的考试题。听课完成后默认切换到下一讲并尝试自动播放；设备禁止自动播放时用户可点播放，自动下一讲可关闭。
- 新建中医资料包候选 `D:\言道国学项目资料总库\05_教材与知识资料\完整中医资料包候选_20261028\tcm-learning-complete-1.1.3.pack`，67,203,159字节，SHA-256 `e83bc123b29b3e4b90a94941623166ebf8de08a2f277f09db9fb2919d0c9b526`。从已校验1.1.2包构建，仅替换倪师课程JSON，其余308个声明文件逐项读回不变；共309文件、9分区、12课程、890单元，完整性回执为同名`.receipt.json`。此为D盘本地候选，未上传COS/云端；分发权证明未归档，不能把候选称为公开下载版本，原课件和旧包均保留。
- 3D内裤几何改为较低腰三角裤形状，默认显示保持；独立遮挡面不改原模型或穴位坐标。官网本地首页源码增加特色介绍：三维人体/经络、倪师课程听学与笔记、同辰自愿匹配、同证主题研习、好友/动态/群组、离线资料及三维会员权益。非商店站点按既定规则展示：符合条件的官网来源直接订单15%，二级0，商店订单不计佣；商店构建渠道仍隐藏现金推广。只更新了本机源码及候选文案，未部署官网或回填商店后台；没有找到已验证的官网发布通道。
- 2026-10-28 10:48 JST只读核对Google Play官方后台。个人账号“创世纪”的`com.yandao.guoxue`仍在，正式版显示2081/25.0.94、100%分阶段发布。政策中心显示10月20日“Play管理中心要求”更新被拒，原文说明所选应用类别或申报功能要求组织账号提交。个人发布概览仍有“某些近期更改被拒”，11项更改尚未提交且提交按钮禁用；包含中/英文商品详情、截图、轨道、数据安全问卷和健康类声明。公司账号“西伯利亚狼”(8056957676688740507)正式版应用数为0，应用列表没有国学；迁移页显示个人账号请求已接受，转移完成并在公司账号出现后才通知。因此迁移已接受、尚未完成。本轮未在错误账号新建重复应用、未删个人草稿、未上传AAB、未点提交。等待应用真正出现在公司账号，再绑定同源候选并检查申报。
- 网络检索只用于课程结构/授权风险判断，没有下载或导入第三方题库、笔记或语料。GitHub公开人纪语料页标注数据为CC BY-NC-SA 4.0且相关课程权利归倪海厦及继承人；商业用途授权不明前不纳入产品。允中未来学习中心课程页声明课程版权归该中心，亦未复制内容。链接：`https://github.com/Renhuai123/nihai-renji-corpus`、`https://edu.deyin.org/course/85`。
- 验证：课程数据测试9项、模型表面测试2项通过；课程解析测试4项通过；资料包构建测试3项通过；TypeScript 5.9.3全项目`tsc --noEmit`通过；`node scripts/check-private-keys.cjs`检查2242个跟踪路径通过；`git diff --check`通过。仓库ESLint因没有ESLint 9所需`eslint.config.*`未能运行；未做正式Next构建或设备新包回归。资料包本地哈希与308项保真回读通过，不替代云端或手机完整下载验证。
- 收尾未完成：本轮未删除教材、课件、模型、图片、源码包、历史版本或只读E镜像。新生成的项目级`node_modules`目录测得634,360,121字节；删除请求在启动前被自动审批拦截，未删除、未换方式重试，pnpm共享缓存也未动。源码仍未提交/推送。唯一报告已同步到工作区根兼容副本、D02活动副本、E盘权威与E盘兼容镜像，复制后五份可写报告逐文件SHA-256读回一致。因此报告同步项完成，但整体任务因未提交源码、Google迁移待完成、线上功能开关未读回、官网未部署等仍为未完成。下一步按此顺序处理：完成代码提交/推送；Google迁移完成后从公司账号处理旧草稿、补数据安全/健康声明、构建匹配源码的最新包并验收；以管理员权限读回同辰/同证；官网部署后读回页面。指定只读镜像 `E:\言道国学3D评估_12A\交接报告镜像_只读\` 仍不写。

## 78.44 2026-10-28 本轮落实与提交回读

- 上节末尾“源码仍未提交/推送”仅反映提交前状态，现已完成：`fae0469`（Improve course study and learning marketing）已推送至`origin/codex/tencent-store-compliance`。改动含倪师课程按原录制讲次整理、默认完成后续播、阅读笔记式说明、基于原文的复习提示、3D默认低腰三角裤、官网本地首页特色与合规佣金说明，以及同辰/同证安全初值的代码注释。没有覆盖旧课程包、模型、源教材、其他板块或E只读镜像。
- 验证最终回读：Node测试11项通过；课程导入4项、资料包构建3项通过；TypeScript 5.9.3检查通过；私钥扫描2242路径通过；`git diff --check`通过。ESLint和正式Next/手机安装包验证仍未完成。D盘候选完整中医包仅本地生成并核验，未上传云桶或商店。
- 线上营销页未部署：本仓库未核实官网发布入口/凭据，避免把本地代码改动冒称线上更新。文案已准备在本地页面和渠道候选中；正式发布需取得/确认官网发布通道并部署回读。
- Google Play迁移在控制台仍显示接受后处理中；公司账号尚无言道国学，个人账号仍有旧应用及未提交更改。未上传新版本或删除旧草稿。收到公司账号中应用实际出现的官方状态后，才可针对公司账号继续绑定并提交最新版。
- 同辰/同证不是应用商店禁止项。新安装/新数据库的关闭值是防止无审核配置时开放用户生成内容的安全初值；数据库`INSERT OR IGNORE`不覆盖已配置的生产开关。当前服务端实时值本轮没有管理员认证读回，因此不谎称线上已开。需认证读回并检查审核、举报、屏蔽、退出和双账号流程，再确认生产开启。E只读交接镜像保持未触碰。


## 78.45 2026-10-28 商店实况、线上社交配置与发布门禁复核

- 负责人已登录华为后台、公司 Google Play 后台、应用运营后台与腾讯编辑页；本轮只进行页面读取，没有点击提交、上传新包、撤回审核、删除草稿或更改权限。未启动手机投屏/桌面控制；E 盘指定只读镜像未改。
- 华为企业应用 `com.yandao.guoxue` 当前 `25.0.115（2144）待修改`，并非审核中。当前页面显示旧APK（86.43 MB，2026-10-24上传）。最新可读拒审报告（版本25.0.115，2026-10-26）共7项：我的页提示更新；AI额度提示无法核权益及退出登录失败；AI解读被判封建迷信；AI生成/深度合成需要算法备案或合作方备案及协议；药品信息功能需要药品信息服务资质；需补AI显式标识证明材料；会员开通流程缺客服联系方式。未用“学习用途”文案掩盖真实模块和资质要求。材料依据 `D:\言道国学项目资料总库\90_执行证据61027模型与商店修复\华为_20261026实际7项审核原文.txt` 及登录后台当前版本页。新候选未上传华为。
- 腾讯应用宝当前编辑页仍是25.0.111/版本标识2098；版本说明仍称无社交功能，签名包也为旧版本。不能以该表单代表新版或直接提交，否则会与用户要求、最新候选内容和商店宣传冲突。本轮未改表单、未上传/提交。其2026-10-27六项实际退回包括安全评估在线提交证明、生成合成算法备案与配套材料/身份校验/显隐式标识、截图和APK不符、类型暂不收录、要求主流外部市场已上线、学习视频需原生内容。原文保存在D盘 `腾讯_实际6项退回原文.txt`。当下这个账号会话处于可编辑页，但尚无新版本包及完整资质证据，未点提交。
- Google公司账号（8056957676688740507，“西伯利亚狼”）当前应用导航仍未显示 `com.yandao.guoxue`；最新可读支持工单5-0692000041394仍“未解决”，记录正在从“创世纪”迁移该包并通过邮件回复。公司侧迁移页的“接受”尚非迁移完成，故公司账号没有可选的国学应用供绑定最新版；未在公司账号新建重复应用、未上传AAB。外语应用和其他迁移记录未动。
- 运营后台管理员认证读回（2026-10-28）：`/admin/tongchen/`显示“状态：开放”；`/admin/study-comments/`显示同证研习和同辰人生均“已开放”，规则筛查＋混元机器审核队列启用、每日最多50次，异常/不确定/举报隔离，当前1条待人工复核、0条待处理举报。故 `tongchenStore.js`、`studyResearchDomain.js` 中默认 `false` 是新数据库安全初值，不等于线上已关，也不是商店违规证据。本轮只读，没有批准待审内容或更改服务设置。双账号在候选安装包内的匹配、同意、私信、退出、屏蔽与举报端到端验收仍未完成。
- `/admin/offline-content/`显示完整中医学习包`tcm-learning-complete v1.1.2`为公开、COS就绪并已发布（64.1 MB，SHA-256 `f214938bff5e9e3501422bc698e328789d8aca58a0eb0a332326d9833be8229e`）；`medical-study-library v1.0.0`（9.4 MB）和`tcm-materia-originals v1.0.0`（10.9 MB）均为公开、COS已就绪但仍为DRAFT。D盘`tcm-learning-complete v1.1.3`候选仍只有本地文件；管理端当前流程只接受服务器文件路径，再分发COS，没有网页本地上传控件。本轮未找到已核实的C端上传/部署传输方式，故未伪称已把v1.1.3发布云端。现有公开1.1.2仍可用，会员三维权益没有更改。
- `25.0.120 / Android 2153 / iOS build 62`为先前已构建候选，但其`sourceCommit=dbde0cda`早于当前推送源码HEAD `2f1f50c6`，因此不含本轮以来的倪师课程、营销及模型更改；不应将该旧候选作为“当前源码最新包”提交。该候选先前IOS62仅记录上传TestFlight成功、等待ASC处理，未读回处理完成；25.0.120没有正式商店受理记录。要形成匹配包，须先完成源树合并、质量门禁与同版本清单，再统一构建各渠道；目前没有提交新包。
- 已修订 `docs/marketing/20261028/store-copy-v120.json` 与 `docs/marketing/20261028/feature-campaign-kit-v120.md`：将同辰/同证的旧“开放后/默认关闭”改为准确的2026-10-28后台开放读回、同证审核队列状态，同时明示待目标包双账号验收。宣传稿仍是候选，不是商店已回填资料。验证：JSON解析通过，`git diff --check`通过。未生成新安装包、未部署官网；本仓未发现已配置的服务器上传凭据/部署脚本。
- 本轮未清除磁盘或项目文件，尤其未删除课程、教材、图片、模型、源码包、审核证据、云端资料、历史包或任何清理范围不确定的文件。新增/修改仅上述两个营销候选文件和本交接记录；`node_modules`、pnpm共享缓存不动。工作区文档/根兼容副本/D02/E权威及E兼容副本同步并逐字节回读校验；负责人指定 `E:\言道国学3D评估_12A\交接报告镜像_只读\` 未写。
- **整体状态仍未完成。** 下一步阻塞顺序：①取得/核实华为需要的算法合作备案协议、药品信息服务证明及AI标识证据，同时修复审核路径体验问题；②等待Google工单和迁移真正完成，确认公司账号出现应用；③准备包含当前源码的单一统一版本包并完成双账号和离线包完整下载验收；④核对学习视频原生内容、腾讯要求的资质和真实截图差异，再逐家更新商店资料与提交；⑤找到受控服务器文件传输链后发布v1.1.3并做COS/普通账号完整读回。未将无法保证审核结果的材料描述为必过。

## 78.46 2026-10-28 中医整合资料包1.1.3云端发布与应用商店发布门禁复核

- 更正78.43/78.45当时记录的“1.1.3仍为本地候选”：在本次续做中，已将D盘完整中医包1.1.3通过已核验SSH传输到服务器暂存名，核远端大小及SHA后原子改为正式源文件；运营后台注册为PUBLIC并复核发布到COS。文件：`D:\言道国学项目资料总库\05_教材与知识资料\完整中医资料包候选_20261028\tcm-learning-complete-1.1.3.pack`，67,203,159字节，SHA-256 `e83bc123b29b3e4b90a94941623166ebf8de08a2f277f09db9fb2919d0c9b526`；含309项/9分区、12门课程/890自然单元；相较已校验1.1.2仅更换课程JSON，其余308项SHA不变。云端公共manifest于2026-10-28 11:32 JST读回：`tcm-learning-complete` v1.1.3、PUBLISHED、PUBLIC、COS、storageReady=true、同字节数及SHA；总资料包10项。此前“仅本地”结论截至78.43，现由此项更新。
- 此为资料包内容版本更新，无应用代码执行，安卓/iOS安装包未因该次资料更新而重构。服务器manifest/COS状态已证实；普通账号从C端完成67,203,159字节下载并逐字节SHA、在手机打开的验收本轮未完成，故只确认云端发布，不能确认所有设备下载成功。会员三维模型包仍为独立MEMBER权限；未改变3D会员权益。
- 对外商店仍未提交本轮最新客户端。项目version仍25.0.120 / Android 2153；候选包源码提交dbde0cda早于包含新课程结构和模型改动的应用源码2f1f50c6，不能作为当前最新版。最新源码改动尚无统一新包，官网主应用及渠道页面本轮未部署/回填。此前广告文案和营销脚本仅为候选，不能把真实设备宣传截图说成已完成。
- 小米后台可见25.0.115/2144审核未通过，原文为启动后更新提示及已提交隐私链接需可访问、完整可读；当前公网 `https://yandaoguoxue.yandao.vip/privacy/` 返回HTTP 200、UTF-8主体含言道国学、隐私政策、联系邮箱与更新日期。此只证明响应可达及页面有相应文本，未通过小米页面可读性复核，也未用新包更新小米记录。
- 华为企业后台旧包25.0.115/2144“待修改”，存在7项历史退回；腾讯应用宝编辑页仍2098旧版及与功能不符的旧文案。算法备案/合作协议、药品信息服务资质、AI标识以及腾讯安全评估等材料和截图仍有缺口；新包与渠道真实截图未备妥。Google公司账号仍未读回`com.yandao.guoxue`迁移完成，因此不能向公司账号上传AAB。Apple正式审核、荣耀、OPPO/vivo及其余国内商店的本轮当前状态均未在本节重新核读；不得推断全部正在审核。
- 本轮未对小米、华为、腾讯、Google、Apple或其他商店点击提交/撤回/删除，也未更改商店权限；未清理磁盘或项目目录。课程/古籍/董氏资料、原模型、照片/动图、源码包、版本备份及审核原件均保留；E盘负责人指定只读镜像`E:\言道国学3D评估_12A\交接报告镜像_只读\`仍未触碰。更新后的权威报告镜像同步核验按本记录收尾结果；无法确认的设备下载、各店当前页面状态、专业医学审校与正式审核继续列为未完成项。
- 发布判断：该资料包上线是已完成的单项交付；“所有商店最新包均已提交/审核通过”“所有功能全验收”“所有资料均已由普通用户下载”均未完成。先形成包含当前源码的统一新客户端版本并通过版号/签名/渠道与真实设备回归，再逐家完成待修复退回项、资格材料、截图、关键词与审核入口校对；Google须等待转移真正完成。应用商店审核结果不可预先保证。

## 78.47 2026-10-28 商店状态续查与统一候选版25.0.121

- 荣耀开发者后台当前记录显示25.0.115为“已上架”，因此该旧版不需要手动发布；本次尚无25.0.121审核通过记录。商店状态只代表该后台当前记录，不代表本轮候选已发布。
- 本地统一候选版已对齐为25.0.121：Android versionCode 2154，iOS app/widget build 63；修复了小屏安全区与类型检查等问题。旧版v120营销材料保留，新建v121商店介绍和特色活动说明，突出三维人体学习、成年人自愿寻找同辰同好、主题研习、课程笔记、统一中医资料包和完整社交；不含现金或二级分佣承诺。v121材料明确为未提交候选，不能冒充真实商店截图。
- 本机Web production build、定向学习/离线/社交回归、TypeScript、密钥扫描及差异格式检查已通过；本机Android签名失败，因本机keystore口令不匹配，不能据此交付安装包。GitHub Actions已有可信的签名构建工作流，本轮将先提交当前源码和版本材料，再用公司项目既有Actions构建渠道包及TestFlight build 63；CI成功只代表包构建/上传状态，不代表商店审核或正式发布。
- 当前读回仍显示华为旧版待修改、小米旧版退回、腾讯后台仍为旧包及不匹配旧描述；Google公司账号尚未显示国学应用，转移支持工单未结。官网version.json仍为25.0.118，没有找到可安全执行的官网发布入口。Apple网页本轮未登录，未读回正式审核状态。上述渠道未在本轮点击正式提交或发布。
- 项目发布门禁`docs/requirements/release-readiness.json`仍有医疗内容资质与专业核验、完整双账号/双设备验收、苹果权益恢复、真实商店截图、源码签名回归等未完成项。根据此前既定的“全部完成再正式提审”要求，本轮只准备统一候选和签名构建，不声称所有功能已验收，也不把尚未完成的商店正式审核资料提交为完成。
- 中医统一资料包v1.1.3已公开发布到COS，67,203,159字节及SHA已与本地包和后台manifest核对；普通账号完整下载及手机离线打开还未完成读回。三维模型会员权益保持原样。未删除课程、教材、图片、模型、原始源码、审核资料或历史版本。


## 78.48 2026-10-28 最新版122正式苹果提审与各店续办（东京22:32以后）

- 当前统一应用候选25.0.122、Android2155、iOS65，应用来源c4ff5272f7d8f727ae780dfcfb1b262ed07309c1；此前78.47的121已由本节覆盖。官网122已部署的交付凭证、各渠道签名包和真实iOS模拟器截图统一见D03候选25.0.122_2155_候选待验收_20261028/package-verification.json。整体发布完成门禁未改为通过。
- Apple原118(60)等待审核已按负责人明确授权撤回；企业新付费协议由负责人自行接受，后台有效。现有同一版本记录299afd61-88b3-4f82-b0dd-54847928f1e8更新至122并关联唯一VALID65，非重新构建。真实应用source c4；签名/上传40669142200成功，质量40669427157的QA源f16与c4的src/public/ios/android逐树diff相同。截图40670758036固定应用c4、QA1cf，分别逐张查看iPhone/iPad五张，未把iOS图片充作Android截图。
- Apple中英文介绍、学习定位、特色、审核路径、数字付费说明已回填；中文关键词81字符。两语言各iPhone/iPad五张共20个新引用全COMPLETE后才移除旧图引用，原图保留。审核账号原私密字段保留，正常登录、Sandbox资格、图谱及完整中医资料包权限通过；此不等于真机购买/恢复验收全部通过。八项原内购版本身份经旧审核回执与Apple历史审核items双重读回保持一致，未改产品、价格、订单、测试人员或其他应用。
- Apple正式提交时间2026-10-28T13:32:32.458Z（东京22:32:32），实际状态WAITING_FOR_REVIEW。凭证D04/Apple/Apple122_20261028_09正式提审回执.json；配套01至08记录准备、素材处理与组装，不能把准备阶段冒充提交。苹果专项18项回归及2249路径密钥扫描通过，首次旧质量模拟fixture未适配QA源差异的1项失败已修复并复测18全过。
- Google个人至公司8056957676688740507迁移仍待平台处理：当前支持case5-0692000041394。已在原工单邮件明确催办，仅com.yandao.guoxue，不取消本次或其他应用迁移；发送结果截图D04/Google_转移催办_20261028/原工单催办已发送.png。已接受迁移请求不等于完成，公司尚未出现国学，未向个人号提交最新版。
- Huawei本轮七项退回原文已分项保全D04/华为/20261028_七项退回原文；2155解析成功。补充新版说明及共用版权、安全评估、公安通过、AI既有原件、腾讯混元上游公开备案ZIP，保存成功已读回。原件日期版本未改，未冒充本公司独立算法备案或合作协议；应用资料与Android新截图及正式提交仍待完成。
- Tencent最新版2155、87.47MB及新更新说明/负责人授权的审核账号已保存并从详情独立读回；SDK自查查询与记录保存于D04/应用宝/20261028_2155SDK自查。基本资料、最新真实Android截图、资格缺项及正式提交仍未完成，不能称已审核。
- 小米2155、122已保存，更新说明明确商店不弹官网APK升级、资料独立更新、隐私独立正文；共用公开备案截图已补交，最新统一介绍草稿保存。当前仍为待重提草稿，截图待真实Android补齐。荣耀115已上架且立即发布，不需要手动发布；122仍准备提交。应用介绍、新特性、企业联系人已保存；问卷按实际学习为主、具备用户互动与交友、医学图谱及数字付费如实填写，计算结果18+（全球），不是拒绝评级，已提交该评级。AI显式标识及ICP证明图、Android截图、最终提审仍待办。
- 新增AppChina专属2155包构建40690653288成功，应用树与c4一致，包91,719,776字节SHA256 bb0d9ad17ae51dee268c645613f34f371f3d0c4378b31d591b90ebb278977dca，正式签名8ca0c414…已核；渠道appchina、SDK24/36与版号均核。此前后台已选择上传，仍须重新打开读回上传/保存结果和补齐材料；不能认定正式提交。
- Android真实模拟器营销截图测试仍未通过：40691997582卡首次同意页，40695186352卡中医入口，40696801942遇WebView回调超时。已仅改隔离测试，保留真实首次同意、真实链接及失败截图诊断，不改应用/权限/数据，不伪造截图或权益；新40698250852在运行。缺少可用完整Android五图，不能用iOS截图代替。OPPO按负责人安排最后处理，现消息页保留一页；待上述Android核验及最新包/营销资料完整后继续正式提审。华为/腾讯登录本轮可用。
- 本轮未删除教材、课程、图片、模型、核心源码或历史版本，既有继承的scripts/deploy_verified_web_preview.py改动与life-ocr未跟随本轮提交。E只读交接镜像不写；仅同步明确可写的兼容报告。全店提交、全功能真机验收、普通账号完整下载SHA、专业内容审校和磁盘清理仍未完成；不得以苹果正式提审替代这些结项。
