# 言道国学项目总账（PROJECT_MASTER_LEDGER）

> **本文档是项目唯一权威账簿（Single Source of Truth）。**
> 最后更新: 2026-08-22（生产版本 v25.0.47_8 支付真实化，Git HEAD 80d3a4c）
> 历史详细记录见 `PROJECT_LEDGER_FINAL.md`（v25.0.0 ~ v25.0.20 阶段账，冻结归档）。
> 本账簿只记录 v25.0.21 之后增量与当前全局事实；冲突时以本文为准。
> 纪律：停止新增 xx_REPORT 编号报告，一切状态只更新本账簿。

---

## 一、项目身份

| 项 | 值 |
|----|-----|
| 产品名 | 言道国学（医易命理 APP，iOS/Android 原生壳 + 内置 Web 资源） |
| 仓库 | https://github.com/wzmpa18/minglizyi（main 分支） |
| 域名 | https://yandaoguoxue.yandao.vip（APP）/ www.yandao.vip（官网下载页） |
| ICP 备案 | 粤ICP备2026071165号-4A（服务名：言道国学，域 yandao.vip） |
| 当前生产版本 | **v25.0.47_8**（buildId v25.0.47_D20260822，2026-08-22 晚发布：全站付费点真实微信支付接入 + 订单权益交付） |
| Git HEAD | 见 `git log -1`（main，本地=GitHub=服务器源码仓 三端一致） |
| 正式 APK | https://yandaoguoxue.yandao.vip/app-download/yandao-guoxue-v25.0.47-release.apk（MD5 d0b4d90857ffce0edb4c89daf6c75ce4，10.82MB，1639 文件内置，v2 签名） |

---

## 二、基础设施（生产）

| 项 | 值 |
|----|-----|
| 服务器 | 82.156.228.87（腾讯云轻量 北京，root） |
| 前端发布 | /root/yandaoguoxue/releases/&lt;tag&gt; + current 软链（SPA 静态导出）；**仅保留 v25.0.47_5（回滚）+ v25.0.47_6（当前）** |
| 后端服务 | /www/yandaoguoxue-backend，PM2 名 yandaoguoxue-backend，端口 3001 |
| 数据库 | PostgreSQL 15（127.0.0.1:5432/yandaoguoxue）+ SQLite（用户核心库 /root/backend-auth/data/yandao_users.db、academy.db、commission_accounts/records） |
| Nginx | / → 静态前端；/api/* → 127.0.0.1:3001；/app-download/ → APK 分发 |
| SSL | Let's Encrypt（certbot，每日自动续期 cron） |
| 备份 | 每日 02:00 users_db（cron /root/backend-auth/backup_db.sh → /root/backup/，保留7天）；03:00 一致性校验；周日 04:00 VACUUM+REINDEX；归档区 /root/backup/archive/（数据库备份+nginx配置+导入材料压缩包） |
| 日志轮转 | /etc/logrotate.d/yandao-guoxue（nginx+PM2，daily/rotate 14/压缩） |
| SSH 工具 | scripts/ssh_exec.py（paramiko，密钥 id_rsa_yandao 优先/密码降级） |

**服务器磁盘（2026-08-22 最终清理后）**：12.1G / 50G（本次回收 4.4G：swapfile2 2G、android-sdk+.gradle+gradle zip 1.75G、.npm 275M、旧 releases 六版 158M、releases 根散落旧构建 20M、git bundle、散落脚本、旧备份目录归档删除）。

---

## 三、版本演进（v25.0.21 → v25.0.47_6 摘要）

| 版本 | 日期 | 要点 |
|------|------|------|
| v25.0.24~43 | 08-17~19 | 正骨/医考导入、平台门禁、海报配置、质量门禁、账号删除 |
| v25.0.44~46 | 08-20 | 账号删除流程、热修复迭代 |
| v25.0.47 | 08-21 | 最终热修包：BottomActionLayout、六爻动爻像素对齐、legacy group_* 治理、群聊页脚修复、海报合规、资讯恢复、六爻/梅花伏神 UI |
| v25.0.47_2 | 08-21 | 资讯模块发布（NEWS-TAB/API/管理页/伏神入包门禁） |
| v25.0.47_3 | 08-21 | 梅花 HexagramDisplay 补齐 FU_SHEN_ROW（三卦层全覆盖，FuShenCore 统一数据源，冒烟 13/13） |
| v25.0.47_4 | 08-22 | 群聊页隐藏 BottomNav（输入框贴底 safe-area）；群资料/好友按钮 z-[10001] 修复遮挡；微信支付 V3 JSAPI 后端全量实现（wechatPayV3.js，通道 OFF 待凭证）；Android 原生 APK 发布（GitHub Actions run 32541997259） |
| v25.0.47_5 | 08-22 | **Share Engine 统一分享系统**：25 个易学工具页全接入、/share/result 签名 Token 落地页、复制链接/海报/二维码/系统分享四通道、复用 HMAC 邀请归因 |
| **v25.0.47_6** | 08-22 | **P8 分佣系统阶段一 + 统一运营后台**：commissionEngine（一级分佣/7天解冻/幂等/退佣冲正）+ commissionRoutes + adminUnifiedRoutes + 统一后台前端四页 + 用户端「我的收益」页 |
| **v25.0.47_8** | 08-22 | **RC-06 支付真实化（前端+后端）**：会员页模拟支付(1.5s假开通)替换为真实微信支付链路；EventDivinationPanel(AI套餐+单次解锁)/AIInterpretButton/InterpretationDrawer/中医问诊 5个付费组件全部接真实支付；后端订单权益交付(MEMBERSHIP开通会员+POINTS_RECHARGE积分入账,benefit_delivered持久化,query补交付兜底)；已发布releases/v25.0.47_8,公网全200 |
| **v25.0.47_7** | 08-22 | **后端热修（无前端变更）**：RC-04 AI契约修复（前端{systemPrompt,userPrompt}与后端{messages}双格式兼容+响应顶层content/usage，根治全站「AI服务暂时不可用」）+ 价格SSOT（admin ai-config timePlans/单次解锁价兜底）+ RC-05 ADMIN_KEY去硬编码兜底（未配置503）+ 后端11文件首次入版本控制（server.js/middleware/auth/register_routes/wechatPayV3等，运行目录=源码仓） |

---

## 四、功能真实性矩阵（2026-08-22）

> 状态只允许：VERIFIED / PARTIAL / DISABLED / NOT_IMPLEMENTED

| 系统 | 状态 | 证据 |
|------|------|------|
| SHARE_ENGINE（分享系统） | PARTIAL（Web E2E 通过，待真机扫码终验） | v25.0.47_5 发布，25 工具页接入，clipboard_real=10 入包门禁，/share/result 200 |
| ADMIN_CONTROL_CENTER（统一后台） | VERIFIED（部署+鉴权验证） | /admin/unified·commission·moderation·orders 四页 200，接口 401 鉴权，操作审计入库 |
| WECHAT_PAYMENT（微信支付） | IMPLEMENTED+CONFIGURED（待 APPID/SECRET 激活，未实付） | wechatPayV3.js 全量（下单/回调验签含公钥模式/解密/查单/关单），前端 OAuth openid 流；材料已安全导入服务器 ENV |
| P8_COMMISSION_STAGE1（自动分佣记账） | VERIFIED | 生产服务器集成测试 **18/18 PASS**（入账/幂等/比例热更/明细/退款冲正/解冻），测试数据零残留 |
| P8_COMMISSION_STAGE2（提现+商家转账打款） | NOT_IMPLEMENTED（框架就绪） | withdraw 接口+审核状态机已有；微信「商家转账到零钱」产品需商户后台开通后激活 |
| AI_CHAT_PROXY（AI解读全链路） | VERIFIED | RC-04 修复后公网实测双格式 200（systemPrompt/userPrompt 与 messages），上游混元 tokenhub 直连成功；AI配额/会员校验端点正常 |
| LIUYAO_FUSHEN / MEIHUA_FUSHEN | VERIFIED（待用户真机终验） | v25.0.47_3 冒烟 13/13，HexagramRow 统一模型，FuShenCore 共享 |
| GROUP_CHAT（群聊） | VERIFIED（待用户真机终验） | v25.0.47_4：聊天页输入框/发送/右上角群资料入口（成员/邀请/踢人/公告/禁言/转让/退出/解散） |
| DISCOVER_EXTERNAL（发现精选） | VERIFIED | /api/news/public 返回真实资讯+来源标注，AI 摘要标注 |
| ANDROID | VERIFIED | 原生 APK（内置资源模式，API 改写脚本内联），MD5 三端一致，公网可下载 |
| WEBSITE（官网分发） | VERIFIED | 2026-08-22 DNS 切换完成（www.yandao.vip / yandao.vip A 记录 → 82.156.228.87 已生效，公网解析+200 验证）；官网/APP 站下载链接统一 v25.0.47 APK；旧 APK 404；「言道学外语」死链（APK 在旧服务器不可达）已改「敬请期待」防错 |
| IOS | PARTIAL（管道就绪，PLA 未签） | 33 项就绪校验通过，xcarchive 产出验证，签名三件套入 Secrets |
| CLEAN_SOURCE（本地工作区） | VERIFIED | 构建产物/verify/临时脚本/旧快照/node_scratch 全清，仅存正式源码 |
| SERVER_CLEAN（服务器） | VERIFIED | 12.1G/50G，仅生产+回滚版+备份+证书 |
| MASTER_LEDGER（本账簿） | VERIFIED | 本文档 |

---

## 五、P8 分佣系统（2026-08-22 上线阶段一）

### 5.1 架构

- **引擎**：backend_deploy/commissionEngine.js —— 严格一级分销（复用 user_invite_relation level=1 / users.invited_by，不新建绑定体系）
- **幂等**：commission_records(order_no, record_type) 唯一索引，同订单只发一次佣金
- **金额**：全部整数「分」存储，杜绝浮点误差
- **账户三字段**：total_earnings_cents（累计）/ withdrawable_cents（可提现）/ frozen_cents（待解冻）
- **解冻**：支付后 7 天（后台可配）→ 定时任务（启动即扫+每6小时+懒解冻三重保障）
- **退款冲正**：全额/按比例，冻结期直接扣待解冻，已解冻优先扣可提现，不足记负收益
- **钩子**：订单 PAID → grantCommission；REFUNDED → reverseCommission（复用订单状态机）

### 5.2 配置（后台可视化，/admin/commission）

默认比例：MEMBERSHIP 30% / SINGLE_UNLOCK 20% / POINTS_RECHARGE 25%；解冻期 7 天（可关）；最低提现 10 元；每日提现 1 次；转账备注「言道国学推荐收益」；税务提示文案内置。
配置存储：/www/yandaoguoxue-backend/data/commission_config.json。

### 5.3 用户端入口

「我的」→「我的收益」：三余额概览 + 佣金明细（来源/金额/状态/到账时间）+ 提现记录 + 提现申请（微信零钱，1-3 工作日，税务提示）。
接口：GET /api/commission/my/summary|records|withdrawals，POST /my/withdraw（JWT 鉴权）。

### 5.4 验收记录

生产服务器 E2E（p8_commission_e2e_test.js）：**18/18 PASS** —— 验收1 入账（100元×30%=30元入待解冻）、验收2 幂等（重复回调 DUPLICATE 拒绝、记录仅1条）、验收3 比例热更（新订单新比例、历史订单不变）、验收4 明细字段一一对应、验收5 退款冲正（可提现扣回+冻结期精确归零+重复冲正拒绝）、解冻机制（FROZEN→UNFROZEN、可提现增加、待解冻回落）。

### 5.5 合规红线（已内置）

严格一级分销（无二级/团队/下线字样）；禁止自购自返；同设备/手机号/IP 互荐不计佣；单日收益超阈值冻结提现待人工审核；提现页税务提示；所有资金操作有流水可审计可导出。

---

## 六、统一运营后台（/admin，2026-08-22 上线）

| 页面 | 路径 | 能力 |
|------|------|------|
| 统一控制中心 | /admin/unified | 总览（用户/订单/收入/AI调用/群/动态/举报/待审核/服务器/版本）+ 角色体系（SUPER_ADMIN/ADMIN/CONTENT_ADMIN/FINANCE_ADMIN/SUPPORT_ADMIN）+ 操作审计（operator/time/oldValue/newValue/reason/IP） |
| 分佣与提现 | /admin/commission | 分佣比例配置 + 佣金订单明细（筛选/导出）+ 提现审核（通过/驳回/批量）+ 对账报表 |
| 内容审核 | /admin/moderation | 用户（禁言/封禁/解封）+ 动态（下架）+ 举报处理 + 群（关闭违规群）+ 黑名单 |
| 订单管理 | /admin/orders | 订单列表 + 状态 + 补单（SUPER_ADMIN+二次确认+原因+审计） |

后端：adminUnifiedRoutes.js（JWT+角色鉴权，全部变更写审计表）。
使用：项目方管理员账号登录 /admin 即可操作，无需开发者介入。

---

## 七、微信支付状态（2026-08-22）

| 项 | 状态 |
|----|------|
| 代码 | IMPLEMENTED —— wechatPayV3.js（V3 JSAPI 下单/回调验签[平台证书+公钥双模式]/AES-256-GCM 解密/主动查单/关单/OAuth） |
| 商户材料 | 项目方 TXT 材料已安全导入服务器 ENV（商户号/私钥/证书序列号/APIv3 Key），未入 Git/日志/前端 |
| 缺口 | **WECHAT_APPID + WECHAT_APP_SECRET**（公众号 OAuth 换 openid 用）——等待项目方提供 |
| 激活后验证 | 0.01 元真实实付 E2E：下单→真实支付→回调验签→解密→金额校验→PAID→权益到账→返佣触发→审计；另测伪造/重放/金额不匹配等安全场景 |
| iOS | IOS_PAYMENT_ENABLED=false 硬隔离，数字商品后续走 StoreKit |
| 凭证变量名（仅名，禁真值入 Git） | WECHAT_MCH_ID / WECHAT_APPID / WECHAT_API_V3_KEY / WECHAT_CERT_SERIAL_NO / WECHAT_PRIVATE_KEY_PATH / WECHAT_APP_SECRET |

---

## 八、移动端打包状态

### 8.1 Android ✅ VERIFIED

- 原生内置资源模式：1639 前端文件打入 APK（无 server.url），API 经内联改写脚本指向生产域名
- 版本 v25.0.47_D20260822 烧录；GitHub Actions run 32541997259 SUCCESS
- 分发：/var/www/yandao.vip/app-download/yandao-guoxue-v25.0.47-release.apk，MD5 d0b4d90857ffce0edb4c89daf6c75ce4（本地=服务器=公网下载三端一致）
- 签名：yandao-release.keystore（SECURE_EXTERNAL_ASSET，仓库根；wrong-0801.bak 为废弃误签备份勿用）

### 8.2 iOS ⏳ PARTIAL（管道就绪，唯一缺口 PLA）

| 项 | 状态 |
|----|------|
| 工程 | ios/App（Capacitor），Bundle ID com.yandao.guoxue，DEVELOPMENT_TEAM=WM586465ZD |
| 就绪校验 | 33 项全通过（scripts/ios-build-readiness-verify.mjs） |
| 云打包 | GitHub Actions ios-build.yml（签名失败自动降级未签名 xcarchive） |
| 签名材料 | APP_STORE_CONNECT_KEY / KEY_ID=UWQ354QP54 / ISSUER_ID=ee663add-…-8110 全入 Secrets |
| API 认证 | ES256 JWT 实测有效 |
| **唯一缺口** | ⚠️ 账号持有人 ZHIMIN WU 登录 developer.apple.com/account 接受最新 PLA → 重跑 workflow 即出签名 ipa → TestFlight |

---

## 九、清理记录（FINAL-SEAL-03 第三十六~四十章，2026-08-22 完成）

### 9.1 本地/TRAE 工作区

| 项 | 回收 | 处置 |
|----|------|------|
| verify 验证产物目录 | 4.27 GB | DELETE |
| .next / out 构建产物 | 514 MB | DELETE（发布时重建） |
| TRAE 旧日志（>3天） | 7.3 GB | DELETE |
| 主项目会话快照 snapshot/6a7ee9cd | 2.2 GB | DELETE（Git 远程+本地工作区完整） |
| scripts/node_scratch 临时 node_modules | 91 MB | DELETE（PDF 解析一次性产物） |
| Temp（yandao_apk_verify/paste/playwright） | 76 MB | DELETE |
| VMCache（11.5G） | — | **KEEP：确认为活动沙箱 VM 磁盘（文件时间戳至 8/5），非垃圾** |
| 其他项目工作区（AILOS 等） | — | KEEP：非国学范畴，未动 |

清理后工作区仅存：正式源码（node_modules 563M 为构建依赖）。

### 9.2 服务器（16.5G → 12.1G，回收 4.4G）

| 项 | 大小 | 处置 |
|----|------|------|
| /root/swapfile2 | 2.0 G | DELETE（swapoff 后删，保留 /www/swap 1G） |
| .gradle + android-sdk + gradle zip + .android | 1.75 G | DELETE（APK 构建已迁 GitHub Actions，服务器零引用） |
| /root/.npm 缓存 | 275 M | DELETE |
| 旧 releases 六版（v25.0.45~47_4） | 158 M | DELETE（保留 _5 回滚 + _6 当前） |
| releases/ 根散落旧构建 | 20 M | DELETE（8/15 误部署产物） |
| git bundle ×3 | 7.4 M | DELETE（远程仓库完整） |
| backup_20260815 + cleanup_backup | 58 M | 归档关键配置后 DELETE |
| nihaixia_import 等导入材料 | 14 M | ARCHIVE → /root/backup/archive/import_materials_20260822.tar.gz |
| academy 备份 db + nginx conf + pm2 dump | — | ARCHIVE → /root/backup/archive/ |
| /root/backup 旧快照（>7天） | — | DELETE（保留机制内新备份） |

清理后校验：首页/API/下载页/APK 全 200，PM2 online，current→v25.0.47_6，内存/swap 正常。

---

## 十、运维手册（速查）

```bash
# SSH 执行（密钥优先）
python scripts/ssh_exec.py run "<命令>"
python scripts/ssh_exec.py put <本地> <远程>

# 发布新版本（示例 v25.0.47_7）
# 1) 本地改代码 → git commit → push（origin + serverdev）
# 2) 服务器拉取并执行部署脚本
python scripts/ssh_exec.py run "cd /root/yandaoguoxue-source && git pull --ff-only origin main && bash scripts/deploy_release_v25_0_47_7.sh"

# 回滚（秒级）
python scripts/ssh_exec.py run "ln -sfn /root/yandaoguoxue/releases/v25.0.47_5 /root/yandaoguoxue/current && nginx -s reload"

# P8 分佣集成测试（生产库安全，测试数据自动清理）
python scripts/ssh_exec.py run "cd /www/yandaoguoxue-backend && node p8_commission_e2e_test.js"

# Android 云打包（触发）
gh workflow run android-build.yml --repo wzmpa18/minglizyi --ref main

# iOS 云打包（触发；PLA 接受后即出签名 ipa）
gh workflow run ios-build.yml --repo wzmpa18/minglizyi --ref main
```

**发布门禁（必须全过）**：版本号 v25.0.47 / 公网 200 / PM2 online / 内容合规词零匹配 / 构建产物入包校验（legacy_regex/bottom_nav/share_engine/clipboard_real）。

---

## 十一、遗留事项（交接必读）

| 项 | 说明 | 责任方 |
|----|------|--------|
| ~~官网DNS切换~~ | **已完成（2026-08-22 18:22）**：www.yandao.vip 与 yandao.vip 两条 A 记录已由项目方在腾讯云 DNS 控制台改为 82.156.228.87 并生效；公网解析验证 + 官网 200 + v25.0.47 APK 直链 206 + 旧 APK 404 + 学外语死链改「敬请期待」全通过。旧服务器 111.230.155.30 不再承载任何域名，待项目方确认后可退订回收 | ~~项目方~~ 已闭环 |
| **iOS 签署 PLA** | 账号持有人 ZHIMIN WU 登录 developer.apple.com/account 接受最新《计划许可协议》→ 重跑 iOS workflow 出签名 ipa → TestFlight | 项目方 |
| **微信支付激活** | 提供 WECHAT_APPID + WECHAT_APP_SECRET（公众号 OAuth 用）→ 服务器 ENV 写入 → 0.01 元真实实付 E2E | 项目方 |
| **商家转账开通** | 微信商户平台开通「商家转账到零钱」产品 → P8 阶段二（提现自动打款）激活 | 项目方 |
| 真机终验 | 分享扫码链路（奇门/六爻/梅花/紫微任选）、伏神视觉、群聊 UI | 项目方 |
| 言道学外语下载恢复（可选） | 官网「言道学外语」卡片/详情页下载按钮现为「敬请期待」（APK 仅存于不可达的旧服务器）。若项目方后续提供 yandao-xuewaiyu APK，上传 /var/www/yandao.vip/app-download/yandao/ 并还原按钮即可 | 项目方 |
| 用户实机回归 | 六爻/梅花伏神、群聊、海报二维码 | 项目方 |
| ~~AI TokenHub 白名单~~ | **已闭环（2026-08-22）**：服务器直连 tokenhub.tencentmaas.com 实测返回正常补全（IP 82.156.228.87 出口畅通）；此前全站AI不可用真因为 RC-04 前后端契约不匹配，已修复 | ~~项目方~~ 已闭环 |
| 内容运营 | 资讯 /admin/sources；审核 /admin/moderation；分佣 /admin/commission | 项目方 |

**红线**（冻结约束）：版本号保持 v25.0.47 直至全部验证；只允许修改指定区域（六爻 UI/群聊/底部导航/中医搜索/营销海报/资讯/分享/后台/分佣）；紫微/八字/奇门/梅花算法核心、医考引擎、邀请体系、数据库结构禁止改动；分佣严格一级；禁止新报告文件，只更新本账簿。
