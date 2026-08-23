# 言道国学项目总账（PROJECT_MASTER_LEDGER）

> **本文档是项目唯一权威账簿（Single Source of Truth）。**
> 最后更新: 2026-08-23（生产版本 v25.0.47_16 + APK v25.0.48：三大运营死结收口——①后台导航桌面端遮挡（≥1280 常驻侧栏可折叠+内容区避让）②邀请海报保存仅二维码的旧版 APK 无法自更新（APK 重建 v25.0.48 内置最新资源+完整海报链路）③旧版 APK 永远停留在旧功能（新增 AppUpgradeChecker 升级提示体系：app-native.json 本地探测 + /api/public/app-version 服务端比对弹窗）；配套工作区净化（git rm 一次性脚本 203 文件）+ 干净源码包 + 核心文档独立归档，指令 FIX-V16-UPGRADE-NOTICE+WORKSPACE-CLEAN）
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
| 当前生产版本 | **v25.0.47_16**（buildId v25.0.47_16_D20260823，2026-08-23 发布：FIX-V16-UPGRADE-NOTICE 三大运营死结收口——①**后台桌面导航**：≥1280px 常驻侧栏可折叠（isDesktop 状态+内容区 marginLeft:240 避让，窄屏保持 v13 抽屉覆盖模式），彻底解决桌面端内容遮挡；②**APK 升级提示体系**：新增 AppUpgradeChecker 组件（挂载根布局，fetch /app-native.json 探测本地版本[仅原生壳内置] + fetch /api/public/app-version 拉服务器最新版本，versionCode 落后弹「发现新版本」窗：版本对比+更新说明+立即升级直达下载页+稍后再说会话级跳过+forceUpdate 强制无稍后按钮+visibilitychange 回前台复检）+ 后端 appVersionRoutes.js（/api/public/app-version 公开接口，SSOT 读 data/app-release-config.json）——解决 APK 内置资源模式旧包永远停在旧功能的运营死结，今后发新 APK 只需更新服务器配置文件即触发全量老用户升级提醒；③**APK 下载地址 SSOT 动态化**：friend/download 两页 APK 直链改运行时从 /api/public/app-version 动态获取（接口失败用 v25.0.48 兜底常量），服务器换包零前端改动；④**APK v25.0.48 重建**（versionCode 2047→2048）：内置 v25.0.47_16 最新 web 资源（含完整海报 renderViralPoster 链路+升级弹窗+桌面导航），服务器重装 Android SDK（此前磁盘清理误删 android-sdk，重装 cmdline-tools+platform-tools+platforms;android-35+build-tools 34/35）+ Gradle 8.9（wrapper 缓存也被清理，改用 /opt/gradle-8.9 本地发行版）构建，门禁关键字修正（isDesktop 等标识符被 minify 无法 grep，改用中文字符串字面量「打开导航菜单」）；⑤**工作区净化**：git rm 203 个一次性脚本（根目录 p7/p8 迁移脚本+图标生成脚本+current 指针+scripts/ 下 157 个历史验证/部署脚本+smk_patches 补丁工作区），删除未追踪垃圾（out_v25_0_47_12.tar.gz 6MB+verify_*.py 9 个+.next/out 构建缓存），scripts/ 仅保留 4 个在用文件（gen-version.js 构建链依赖/build_android_v25_0_48.sh/deploy_release_v25_0_47_16.sh/sync_server_repo.sh）+deploy/ 目录；产出干净源码包（git archive）+核心文档独立文件夹（总账/架构/交接/部署SOP/合规基线）；公网验证全通过） |
| Git HEAD | 总账收口提交（main，本地=GitHub=服务器源码仓=生产运行目录 四端一致；v25.0.47_16 代码提交 595368a[升级提示体系+桌面导航+APK SSOT]+工作区净化提交+总账收口文档提交） |
| 正式 APK | https://yandaoguoxue.yandao.vip/app-download/yandao-guoxue-v25.0.48-release.apk（v25.0.48 / versionCode 2048，v2 签名，内置 v25.0.47_16 资源）；服务器另挂别名文件 guoxue-chuancheng-v1.0-release.apk（同包，兼容存量分享海报/链接）；旧 v25.0.47 包保留在分发目录作回滚备份（不再被前端引用）；升级提示数据源 /www/yandaoguoxue-backend/data/app-release-config.json |

---

## 二、基础设施（生产）

| 项 | 值 |
|----|-----|
| 服务器 | 82.156.228.87（腾讯云轻量 北京，root） |
| 前端发布 | /root/yandaoguoxue/releases/&lt;tag&gt; + current 软链（SPA 静态导出）；当前 current→v25.0.47_16，回滚目标 v25.0.47_15；目录现状 _5/_6/_8/_9/_10/_12/_13/_14/_15/_16 十版（磁盘充足暂留，如需清理保留 _15+_16 即可） |
| 后端服务 | /www/yandaoguoxue-backend，PM2 名 yandaoguoxue-backend，端口 3001 |
| 数据库 | PostgreSQL 15（127.0.0.1:5432/yandaoguoxue）+ SQLite（用户核心库 /root/backend-auth/data/yandao_users.db、academy.db、commission_accounts/records） |
| Nginx | / → 静态前端；/api/* → 127.0.0.1:3001；/app-download/ → APK 分发 |
| SSL | Let's Encrypt（certbot，每日自动续期 cron） |
| 备份 | 每日 02:00 users_db（cron /root/backend-auth/backup_db.sh → /root/backup/，保留7天）；03:00 一致性校验；周日 04:00 VACUUM+REINDEX；归档区 /root/backup/archive/（数据库备份+nginx配置+导入材料压缩包） |
| 日志轮转 | /etc/logrotate.d/yandao-guoxue（nginx+PM2，daily/rotate 14/压缩） |
| SSH 工具 | scripts/ssh_exec.py（paramiko，密钥 id_rsa_yandao 优先/密码降级） |

**服务器磁盘（2026-08-22 最终清理后）**：12.1G / 50G（本次回收 4.4G：swapfile2 2G、android-sdk+.gradle+gradle zip 1.75G、.npm 275M、旧 releases 六版 158M、releases 根散落旧构建 20M、git bundle、散落脚本、旧备份目录归档删除）。

| **v25.0.47_16** | 08-23 | **FIX-V16-UPGRADE-NOTICE + WORKSPACE-CLEAN 三大运营死结收口 + 工作区净化（代码提交 595368a + 净化/文档收口提交，四端一致）**：①**后台桌面导航增强**——admin/layout.tsx 新增 isDesktop 状态（window.innerWidth≥1280 判定+resize 监听），桌面端侧栏默认常驻展开、汉堡按钮可折叠，主内容区 marginLeft:240 避让（transition 0.25s），彻底解决桌面端侧栏遮挡内容问题；窄屏（<1280）保持 v13 抽屉覆盖模式（遮罩+translateX 滑入）；②**APP 升级提示体系（核心新增）**——src/components/AppUpgradeChecker.tsx 挂载根布局：启动 3s 后+每次回前台（visibilitychange）双时机检测，fetch /app-native.json 探测本地版本（该文件仅 APK 内置资源存在，网页版 404 静默退出不误伤）→ fetch /api/public/app-version 拉服务器最新版本（原生壳内经 native-api-patch 改写到线上）→ versionCode 落后即弹「发现新版本」窗（旧版→新版号对比+更新说明列表+「立即升级」直达下载落地页+「稍后再说」sessionStorage 会话级跳过+forceUpdate 强更无稍后按钮+点击遮罩等同稍后）；后端 appVersionRoutes.js 提供 /api/public/app-version 公开接口（SSOT 读 /www/yandaoguoxue-backend/data/app-release-config.json，含 latestVersionCode/downloadUrl/downloadPage/releaseNotes/forceUpdate/publishedAt，配置不存在时返回 DEFAULT_RELEASE 兜底）；server.js 挂载该路由；③**APK 下载地址 SSOT 动态化**——friend 落地页与 download 页 APK 直链改运行时 fetch /api/public/app-version 动态获取 downloadUrl（接口失败回退 APK_URL_FALLBACK 常量 v25.0.48），服务器今后发新包零前端改动（网页版与 APK 内同步生效）；④**APK v25.0.48 重建（versionCode 2047→2048）**——服务器 Android SDK 已在 08-22 磁盘清理中被误删，重装 cmdline-tools（腾讯镜像）+platform-tools+platforms;android-35+build-tools 34/35；gradle wrapper 缓存同被清理且联网下载失败，改用 /opt/gradle-8.9 本地发行版（AGP 8.7.3 最低要求 Gradle 8.9，8.5 报错）；构建脚本修正为 GRADLE_BIN=/opt/gradle-8.9/bin/gradle；门禁关键字修正：isDesktop/sidebarOpen 等标识符经 Next.js minify 后无法 grep（命中 0），改用字符串字面量「打开导航菜单」（汉堡按钮 aria-label，新版独有）；APK 11.7MB v2 签名（CN=Yandao, O=DongguanYandaoTechnology），内置资源含 v25.0.47_16 完整链路（发现新版本/立即升级/renderViralPoster 完整海报/藏在手机里的国学宝藏工具/打开导航菜单/下载言道国学APP 六项关键代码全命中）；上传 /var/www/yandao.vip/app-download/yandao-guoxue-v25.0.48-release.apk + 别名 guoxue-chuancheng-v1.0-release.apk 同步覆盖（旧 v25.0.47 包保留回滚）；公网双直链 200+MIME application/vnd.android.package-archive；⑤**发布顺序保障**——APK 先行上线再切网页版流量（friend/download 页动态地址指向新 APK 时该文件已存在，动态下载地址零空窗）；⑥**工作区净化（203 文件 git rm）**——根目录：current 指针残留+p7b_fix_legacy.js+p7_tcm_exam_migration.js+p8_check_db.js+p8_yikao_batch.js 一次性迁移脚本+gen_icons_net.ps1 图标生成脚本；scripts/：157 个历史一次性脚本（verify_*/check_*/peek_*/probe_*/p7_*/p8_*/p9_*/nhx_*/yikao_*/extract_*/deploy_release_v25_0_20~15 旧版部署脚本等）+smk_patches 补丁工作区（37 文件）；仅保留 gen-version.js（prebuild 构建链依赖）+build_android_v25_0_48.sh+deploy_release_v25_0_47_16.sh+sync_server_repo.sh+deploy/ 目录（SOP+标准门禁）；未追踪垃圾删除：out_v25_0_47_12.tar.gz 6MB+verify_*.py 9 个+tsconfig.tsbuildinfo+.next/out 构建缓存；⑦**交付物**——干净源码包（git archive HEAD 导出，仅含追踪文件）+核心文档独立文件夹（01 总账宪法/02 产品架构总览[新增编写]/03 最终交接报告/04 服务器身份/05 部署SOP/06 全部报告整合/07-08 合规基线） |
| **v25.0.47_15** | 08-23 | **FIX-V15-APK-DEADLINK 下载APP链路APK直链404收尾修复（HEAD=f65f498+df45284，四端一致：本地=GitHub=服务器源码仓=生产运行目录）**：①**问题发现（收尾全面复查）**——注册/登录页下载按钮三环境可见、/friend 落地页 200、支付 19/19 全 PASS、海报模板/文案全部入包、邀请 API 全通均正常；唯一真实故障：前端 3 处 APK 引用中 2 处（src/app/friend/page.tsx 落地页 + src/lib/shareService.ts）指向 guoxue-chuancheng-v1.0-release.apk，该文件已被 FINAL-SEAL-03 品牌统一清理（scripts/fix_www_download_unify.sh 第34行 rm -f）从服务器删除，但代码引用漏改 → 新用户扫码注册→/friend 页「立即下载APP」→ **404 死链**（v25.0.47_14 交接报告未覆盖此链路，公网实测证实）；②**修复（在线热修优先，无需重新打包APK）**——服务器 /var/www/yandaoguoxue/app-download/（Nginx alias 根目录）在线复制 v25.0.47 正式包为别名文件 guoxue-chuancheng-v1.0-release.apk（MD5 一致 d0b4d90857ffce0edb4c89daf6c75ce4），存量分享海报/链接零断裂；代码侧 friend/page.tsx APK_URL 统一正式包名 yandao-guoxue-v25.0.47-release.apk（与 download 页一致），删除 shareService.ts 从未使用的失效常量 APK_DOWNLOAD_URL；③**发布与验收（scripts/deploy_release_v25_0_47_15.sh）**——内容门禁 v13+v14 全量保留+v15 新增 5 项（friend/download 页正式包直链、src 零旧APK引用、失效常量删除）全过；构建产物入包校验：正式包 APK 直链入 chunks+旧 APK 引用 0 文件+烧录 ID v25.0.47_15_D20260823+IP 脱敏 0 匹配；公网验证 20 路径全 200（新增 friend/download 两路径）；APK 直链双文件 200+MIME 正确；注册/登录页下载按钮三环境（桌面Chrome/iOS Safari UA/微信UA）可见复验；支付四环境下单回归（web/微信头/iOS头/微信UA）全 PASS；本地完整回归 19/19（四档位×四环境 codeUrl+NATIVE、SINGLE_UNLOCK、POINTS_RECHARGE、后台401拦截）；发布脚本修正：邀请页校验关键词由'邀请'（SSR壳不存在，v14脚本同缺陷）改为实际 SSR 标题'推广中心'；④**运维规则**——今后每次发布新 APK：上传 /var/www/yandao.vip/app-download/yandao-guoxue-vX.Y.Z-release.apk 后必须同步 cp 别名文件（cp 正式包 guoxue-chuancheng-v1.0-release.apk），否则存量分享链路断裂 |
| **v25.0.47_14** | 08-23 | **FIX-V14-PAY-MARKETING-VIRAL 支付死键修复 + 邀请裂变营销体系（HEAD=e6d5449，四端一致：本地=GitHub=服务器源码仓=生产运行目录）**：①**P0-1 会员支付入口全链路修复（点击无反应死键根除）**——根因：iOS 设备 `IOS_PAYMENT_ENABLED=false` + 微信内置浏览器 `payment.wechat=false` 双层门控导致按钮隐藏/接口 403；修复：四层门控全量同步放开（src/lib/platformGate.ts 与 platformGates.ts 的 IOS_PAYMENT_ENABLED=true、backend_deploy/platformFeatureGate.js 矩阵 payment.ios/wechat=true、adminUnifiedRoutes.js payment-status iosPaymentEnabled=true），Native 扫码支付不依赖平台商店，iOS Safari/微信/原生壳全环境恢复微信支付；公网回归实测（scripts/verify_v14_pay.sh）：web默认/X-Client-Platform:wechat/X-Client-Platform:ios/微信UA兜底识别 **四环境下单全部返回 codeUrl+payMode=NATIVE**，月/季/年/终身四档位下单全通过，SINGLE_UNLOCK 单次解锁+POINTS_RECHARGE 积分充值全通过，后台无密钥 401 拦截正常；②**P0-2 邀请海报保存修复（"保存相册只有二维码"根除）**——根因：invite/page.tsx 旧 handleSaveQr 直接保存 qrDataUrl 纯二维码图；修复：新增 renderViralPoster 完整海报链路（二维码就绪自动渲染），主按钮「保存完整海报图片」（handleSavePoster）导出 posterEngine 全要素画布：背景底色+主标题+副标题+卖点列表+大号二维码+邀请码+底部合规提示，分辨率 **1080×1920**（超过要求的 750×1334），「保存二维码」降级为辅助按钮；③**注册/登录页「下载言道国学APP」按钮（新用户扫码落地必见）**——a 标签 href=https://yandaoguoxue.yandao.vip/friend target=_blank（原生 HTML 锚点，不依赖 JS，任何浏览器可点），48px 高度品牌描边按钮+下载图标，公网实测桌面 Chrome/iOS Safari UA/微信内置浏览器 UA 三环境注册页+登录页全部可见；④**邀请裂变营销体系（病毒式传播重构）**——新增 src/lib/marketing/viralTemplates.ts（278 行）：3 套海报模板（朋友圈种草版[米色简约国风·"藏在手机里的国学宝藏工具"·✅卖点3条·发圈不违和]/社群引流版[信息密度高·"免费！专业级国学工具App"·▪功能4条·适合国学群中医群]/专业学习版[书卷气·"你的随身国学学习助手"·📚🎯📝卖点·主打学习者]）+4 场景分享文案库（朋友圈图文长文案种草感/群聊私聊短文案直接高效/精准兴趣群文案功能价值/私发好友话术信任转化，「注册了我们都有奖励」钩子）；invite 页新增海报卡（模板循环切换「换一个风格」+「使用通用版」回默认+系统分享 navigator.share 带海报图+文案/邀请码复制/长按兜底提示），invite/poster AI推广助手页推荐集替换为 3 套裂变模板、文案库全量替换、前端不再展示任何合规校验类文字；posterEngine 引擎升级支持 4 条卖点+✅对勾角标+▪方块符号，合规提示统一缩小字号调浅色置底部不占主视觉；⑤**部署与验收（scripts/deploy_release_v25_0_47_14.sh + verify_v14_public.sh + verify_v14_invite.sh + verify_v14_pay.sh + verify_v14_extra.sh）**——内容门禁 v13 全量保留+v14 新增 12 项（四层支付门控/下载按钮/裂变模板/海报引擎）全过；构建产物入包校验：下载按钮入 register/login 页 HTML、3 套模板标题+朋友圈长文案+完整海报标识入 chunks、烧录 ID v25.0.47_14_D20260823 一致、服务器 IP 脱敏 0 匹配；后端同步 15 文件（v13 的 14 文件+platformFeatureGate.js）；公网 18 路径全 200；邀请 API 全链路（JWT token 实测：invite/link 返回邀请码+签名链接+防伪签名、invite/overview 返回真实邀请数据 1 人/207 积分、无 token 401 拦截）；version.json 公网确认 v25.0.47_14_D20260823 |
| **v25.0.47_13** | 08-23 | **FIX-WITHDRAW-V13-FINAL 微信商家转账提现落地 + 后台三级角色权限体系（HEAD=019ab43，四端一致：本地=GitHub=服务器源码仓=生产运行目录）**：①**微信商家转账 V3 全量对接**（backend_deploy/wechatTransfer.js）：POST /v3/transfer/batches 发起转账（复用现有商户号 1116339601/APIv3密钥/证书序列号/私钥，零新增核心密钥）、回调强制验签（AES-256-GCM 解密+平台证书验签，防伪造篡改）、主动查单查终态、签名头修复为规范 WECHATPAY2-SHA256-RSA2048；②**提现引擎全自动升级**（commissionEngine.js）：新流程 用户申请→校验余额/门槛/窗口→≤免审额度(200元)自动发起转账→微信回调更新状态→成功扣可提现余额/失败退回余额并记录原因；超免审额度进财务人工审核队列；安全机制：全链路幂等（同一提现单仅发起一次转账，终态单重复处理被拦截）、单日单用户限额 2 万元超限拦截、风控标记（新注册/短时间多笔提现自动转人工审核）、退款扣回（全额退款两级佣金全额扣回/部分退款按比例）；③**结算规则对齐**：每月最后 1 天自动结算上月已解冻佣金（settleDay=0）→ 每月 16 日-月末开放提现（withdrawOpenDay=16，inWithdrawWindow 后端强制拦截，窗口外申请直接拒绝）；④**新增 .env 配置**：WITHDRAW_TRANSFER_ENABLED（提现总开关，默认 false）+ WITHDRAW_FREE_PASS_AMOUNT=200（免审额度，后台可动态覆盖）+ WITHDRAW_MIN_AMOUNT=10（最低门槛），仅当文件配置未显式保存时 .env 值生效；⑤**后台三级角色权限体系**（backend_deploy/adminRoles.js 统一模块，全后台唯一事实源）：SUPER_ADMIN（全权限：价格/密钥/封禁/财务终审/系统开关/审计）/ FINANCE_ADMIN（提现审核·订单流水·佣金报表·对账·导出；禁改价/改开关/管密钥/封用户/改分佣比例）/ OPERATOR_ADMIN（用户管理·内容管理·工具开关·营销·数据总览；禁一切资金操作/改价/密钥）；服务端中间件强校验（ROLES 分值+ROLE_SCOPES 域双拦截，403 并写审计 AUDIT_BLOCK_ROLE/AUDIT_BLOCK_SCOPE），前端仅按角色渲染菜单；子密钥 SHA256 哈希存储 data/admin_roles.json（严禁明文/入代码/入 Git），主密钥 ADMIN_API_KEY 自动映射 SUPER_ADMIN 向后兼容；密钥管理页 /admin/keys（SUPER_ADMIN 专属）：三级角色权限表/签发子密钥（明文仅一次性展示）/禁用子密钥/主密钥修改指引（服务器 .env 改 ADMIN_API_KEY 后 PM2 重启）；⑥**后台抽屉式导航**：固定侧边栏改为全端统一抽屉（默认收起+顶部汉堡唤出+遮罩层，内容区全宽），解决移动端/桌面内容遮挡；菜单按角色 scope（all/finance/ops/super）动态渲染；⑦**后台财务端补全**：提现批量审核（单笔/批量+驳回填原因）、同步微信转账终态（对账兜底）、佣金统计报表（日/月/年+分佣层级+退款扣回明细）、提现记录 CSV 导出（按日期/状态筛选，Excel 直开）；⑧**审计修复**：/audit 接口读未定义 AUDIT_FILE 恒返回空 → 改用 adminRoles.listAudit；越权 403 拦截同步写入审计日志；⑨深度报告字数放宽：700-1000 字（目标 850，用户确认「条理清晰不啰嗦，多几百字没关系」），公网实测姓名 988 字/手机号 890 字，五段式 5/5 完整；⑩**公网验收（scripts/verify_v13_final.sh + verify_v13_final_fix.sh，28 项 PASS/0 FAIL）**：页面健康 8 路径 200（301 为 trailingSlash 规范重定向，跟随即 200）/版本 v25.0.47_13/定价 SSOT 37·99·374·3600/主密钥 whoami=SUPER_ADMIN/财务密钥财务域 200+越权 5 项全 403（密钥管理/运营接口/改分佣配置/改价 PATCH·PUT/改 AI 配置）/运营密钥运营域 200+越权财务 403+越权密钥 403/审计日志含 ADMIN_KEY_CREATE+AUDIT_BLOCK_ROLE+AUDIT_BLOCK_SCOPE/临时密钥签发-验证-禁用闭环/未登录提现 401/withdrawEnabled=false+minWithdraw=10+settleDay=0+withdrawOpenDay=16/深度报告两工具字数结构双达标；提现转账开关维持 WITHDRAW_TRANSFER_ENABLED=false（商户「商家转账到零钱」权限未开通，佣金正常累计冻结，权限开通后 .env 置 true+PM2 重启即启用全自动转账，**WITHDRAW_TRANSFER=READY**） |
| **v25.0.47_12** | 08-23 | **FIX-V12-PAY-CONTENT 支付修复+定价对齐+深度报告提质+两级分佣月度提现+中医板块门控（HEAD=bbb29ec，三端一致；含 bbb29ec 二次迭代：quarterly 档位补齐+提示词强化 820 字版）**：①P0 会员支付死键修复：会员页错误提示可见化（按钮上方悬浮+「去登录」引导）+季度档位补齐，公网实测月度 37/季度 99/年度 374/终身 3600 四档下单全部返回 NATIVE codeUrl；②全量定价 SSOT 对齐：publicPricingRoutes/paymentRoutes/server.js 三处默认值同源（修复 publicPricingRoutes 旧默认 39/366 无季度档问题并部署二次验证），公网 /api/public/pricing 实测返回 basic 0/monthly 37/quarterly 99/yearly 374/lifetime 3600 + batchInterpret 200 元/次（会员折扣 95/85/8 折、终身免费、单次最多 100 条）；B 类工具统一零售 9.9 元/次（会员超出免费额度同价，取消阶梯折扣，权益文案同步「超出按¥9.9/次」）；服务端下单强制裁决公网实测：前端篡改 amount=0.01 全部被覆盖（server=37/99/374/3600/9.9/200，后端日志留痕「金额以服务端为准」）；③深度报告提质：新增 src/lib/deepReportPrompt.ts 统一五段式提示词（核心总论/多维度拆解[事业财运·感情家庭·人际社交·状态趋势]/典籍依据/正向建议 3-5 条/总结收尾），700-900 字硬约束，按工具领域匹配典籍（姓名→康熙字典+说文解字、号码→系辞传河图洛书、合婚→三命通会婚配篇、择日→钦定协纪辨方书、八字→滴天髓等 13 类映射），合规红线（无恐吓/无绝对化/无医疗投资越界）；EventDivinationPanel 24 工具复用 + zeri/ziwei/astro/tarot 独立页接入；公网实测 3 份报告：姓名 803 字/手机号 815 字/合婚 727 字，五段完整 5/5、典籍引用命中、建议 4-5 条、恐吓词零命中；**bbb29ec 二次迭代**：复测发现首轮提示词实际产出仅 561-631 字（模型欠量约 25%），强化分段字数下限（110/330/120/130/70）+自查扩写指令（总目标 820 字）后重新构建发布，复测姓名 714 字/手机号 769 字/合婚 863 字全部落入 700-900 区间；④两级分佣+月度提现：commissionEngine 一级 15%+二级 5%（COMMISSION_L2 独立 record_type 幂等，同人去重/禁自购自返），月度结算模式（佣金 FROZEN→每月 settleDay=30 号统一解冻转可提现→每月 withdrawOpenDay=15 号后开放提现申请，inWithdrawWindow 窗口校验，monthlySettleEnabled 开关可回退旧 7 天机制）；后台推广分佣页两级比例+结算日+开放日全参数可调（PUT /commission/config 合并保存）；前端收入页展示结算规则文案+窗口外禁用提现按钮；公网配置核验 ratios{level1:15,level2:5}/settleDay30/withdrawOpenDay15/monthlySettleEnabled=true；提现总开关维持 DISABLED（商家转账权限未开通，佣金正常累计，权限开通后台一键启用）；⑤中医板块知识开放程度控制：工具矩阵新增 9 条中医条目（zhongyi_classic/herb/formula/meridian/bianzheng/yangsheng/shanghan/constitution/exam），新增 SectionGate 组件+sectionGate.ts 判定层（矩阵 API 2 分钟会话缓存/断网 fail-open 放行），19 个中医页面全量接入（exam 6 子页+constitution 3 子页+yangsheng 3 子页+7 主页），中医主页入口卡片按矩阵动态渲染（OFF 隐藏/MAINTENANCE 置灰/会员专享加锁引导开通）；公网实测后台改 zhongyi_classic→OFF 即时生效→MEMBERSHIP+monthly 即时生效→恢复正常，审计日志 3 条 TOOL_MATRIX_UPDATE 留痕；⑥构建事故修复：herb/meridian 页面 SectionGate import 误插 "use client" 指令之前导致 Turbopack 构建失败（13 错误），脚本批量修复指令位置后构建通过；版本脚本 gen-version.js 支持 v25.0.47_NN 后缀，buildId 升级为 v25.0.47_12_D20260823 防混淆；⑦存量回归核验全通过：Native 支付 6 单实测/AI 开关 403 强制拦截复验/驾驶舱 overview 版本显示 v25.0.47_12/订单中心 14 单/功能开关 17 项/审计日志留痕/PM2 无新增错误（probe 测试用户订单持久化 FOREIGN KEY 失败为预期行为，真实用户订单正常）；⑧**P1 缺陷修复（bbb29ec，回归中发现）**：middleware/auth.js 的 MEMBER_LEVELS/AI_DAILY_LIMITS 缺 quarterly 档位——季度会员（99 元已开售）支付后会被按 basic（等级 0/AI 配额 3 次/天）处理导致权益归零；补齐 quarterly=2（介于 monthly=1 与 yearly=3 之间）+ AI 配额 50 次/天，已部署 PM2 重启 + 公网 health 200 验证；批量解读会员折扣公网实测：月度会员下单落库 190 元（200×95 折）正确 |
| **v25.0.47_10** | 08-23 | **FINAL-ADMIN-COMMERCIAL-SEAL-02 统一运营管理中心封板（商业控制权交付）**：①/admin 重构为「言道国学运营管理中心」统一壳：17项固定菜单（总览/用户管理/工具管理/产品与价格/会员与权益/AI管理/学习中医/社交群聊/发现资讯/营销海报/推广分佣/支付订单/提现/内容审核/系统功能开关/审计日志/系统状态）+ 移动端抽屉导航，全部子页面从 /admin 统一导航进入；②老板驾驶舱首页：版本/Git Commit/服务器/后端/数据库/AI/微信支付 三色健康状态（绿正常/黄部分可用/红故障）+ 今日新增/总用户/会员数/今日订单/今日实付/待处理订单/今日AI调用/群数/今日动态/待审举报/今日佣金/待解冻佣金/提现状态 20项指标；③featureControlRoutes 功能开关总中心：17项开关 ON/OFF/MAINTENANCE 三态 + **服务端强制拦截**（实测：后台关闭ai→POST /api/ai/chat 直接403 FEATURE_DISABLED，恢复即通；PUT后缓存即时失效）；④toolAdminRoutes 工具管理矩阵：14款正式工具服务端配置（启用/维护/免费/收费模式/会员等级/单次价格/AI开关/AI额度/每日次数/分享/Web/Android/iOS/微信小程序/QQ小程序），替代localStorage，后台只控开关收费权限额度平台、**不触碰排盘算法**；⑤publicPricingRoutes 价格SSOT公开接口 /api/public/pricing（会员套餐/AI单次/AI时卡/额度包/B类工具价），前端pricingStore消费层：会员页/AI断法面板/AI按钮/解读抽屉/中医问诊全部接入，后台改价实时生效免发版（实测：请求0.01被服务端纠正为产品价9.9/39下单）；⑥paymentRoutes 订单详情+权益重试发放（幂等benefit_delivered双校验）；订单佣金状态权威回显（读commission_records：FROZEN+佣金额+比例+推荐人）；⑦AI结构化错误码：AI_DISABLED/AI_MAINTENANCE/AI_SERVICE_UNAVAILABLE/FEATURE_DISABLED/FEATURE_MAINTENANCE 分级提示（前端aiService透传errorCode）；⑧分佣真实链验证通过：A(910080)邀B(910081)注册绑定level=1，B两笔订单PAID+权益交付，A佣金待解冻13.68元（9.9×20%=1.98 + 39×30%=11.70），解冻日2026-08-29，commission_records/commission_accounts/后台订单详情三处一致；⑨提现总开关 WITHDRAW_TRANSFER=DISABLED：commissionEngine withdrawEnabled=false（商家转账未开通一律拒绝），/api/commission/config 下发，用户端「我的收益」按钮显示「暂未开放」；⑩iOS平台门控 platformGates（IOS_PAYMENT_ENABLED=false，数字商品后续走StoreKit/IAP）；⑪管理认证统一：env ADMIN_API_KEY 映射 SUPER_ADMIN（featureControl/toolAdmin/payment三个路由模块与adminUnified一致）；⑫部署 scripts/deploy_release_v25_0_47_10.sh 全门禁（v9支付门禁全保留+v10后台封板门禁新增）+公网13路径全200+三大公开配置接口+Native下单验证通过 |

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
| **v25.0.47_8 收口** | 08-22 | **最终封板收口（f3eaeda）**：①残留硬编码管理密钥清理：backend_deploy 6 个路由文件 + src/lib/admin/auth.ts + .env.example + 部署脚本共 8 处 `WUzhimin123` 兜底全部改为空串（未配置 ADMIN_API_KEY 一律拒绝，源码仓/生产目录双确认零残留）；②报告归档整合（项目方指令）：根目录旧交接文档 YANDAO_GUOXUE_HANDOVER_FINAL.md 与旧总账 PROJECT_LEDGER_FINAL.md 归档移入 docs/reports/，全部 30 份报告合并为单一整合文档《docs/reports/20260822_全部报告整合_完整版.md》（238KB，含总目录+全文）；③三端一致：本地/GitHub/服务器源码仓 HEAD=f3eaeda；④管理接口鉴权实测：无 KEY 访问 /api/admin/stats 返回 401，安全生效 |
| **v25.0.47_9** | 08-22 | **FIX-PAY-UNBIND-WECHAT-APPID 支付通道解耦公众号专项修复**：①后端 wechatPayV3 新增 createNativeOrder（Native扫码下单，微信侧返回 code_url，实测成功）；isConfigured 改为商户4项核心参数（商户号+APIv3密钥+私钥+证书序列号），与公众号 AppID/Secret 完全解耦；②paymentRoutes 支付总开关去除 WECHAT_APPID 依赖；下单 JSAPI 优先→自动降级 Native，缺 openid/公众号参数不再报错阻断，全场景返回付款二维码；商户未绑定 appid 时返回 needAppid 结构化提示；③前端 paymentService 支持 payMode=NATIVE+codeUrl（NativePayTicket 票券），paySingleUnlockAndWait 解除微信内强校验；④新增 PayQRCodeModal 通用扫码弹层（qrcode库渲染+2秒轮询+「长按识别二维码完成支付」提示+超时过期），会员页/AI断法面板/AI按钮/解读抽屉/中医问诊 5 个付费入口三行接入全部完成；⑤JSAPI 完整保留（公众号参数补充后自动启用免扫码）；⑥WECHAT_APPID=wxedc4b3ff9f707969 已配置（项目方提供），Native 下单实测成功：0.01元测试订单返回 codeUrl=weixin://wxpay/bizpayurl?pr=...；⑦部署 v25.0.47_9 全门禁通过+公网9路径全200+NATIVE下单验证通过 |
| **v25.0.47_7** | 08-22 | **后端热修（无前端变更）**：RC-04 AI契约修复（前端{systemPrompt,userPrompt}与后端{messages}双格式兼容+响应顶层content/usage，根治全站「AI服务暂时不可用」）+ 价格SSOT（admin ai-config timePlans/单次解锁价兜底）+ RC-05 ADMIN_KEY去硬编码兜底（未配置503）+ 后端11文件首次入版本控制（server.js/middleware/auth/register_routes/wechatPayV3等，运行目录=源码仓） |

---

## 四、功能真实性矩阵（2026-08-22）

> 状态只允许：VERIFIED / PARTIAL / DISABLED / NOT_IMPLEMENTED

| 系统 | 状态 | 证据 |
|------|------|------|
| SHARE_ENGINE（分享系统） | PARTIAL（Web E2E 通过，待真机扫码终验） | v25.0.47_5 发布，25 工具页接入，clipboard_real=10 入包门禁，/share/result 200 |
| ADMIN_CONTROL_CENTER（统一后台） | VERIFIED（v25.0.47_13 三级角色+抽屉导航） | /admin 全端抽屉式导航（默认收起+汉堡唤出，内容区全宽）；adminRoles.js 统一权限模块：SUPER_ADMIN/FINANCE_ADMIN/OPERATOR_ADMIN 服务端强校验（越权 403+审计 AUDIT_BLOCK_*），子密钥 SHA256 哈希存储；公网实测财务密钥越权 5 项全 403、运营密钥越权财务 403；密钥管理页 /admin/keys 签发/禁用子密钥 |
| WECHAT_PAYMENT（微信支付） | VERIFIED（v25.0.47_14 公网实测全平台 Native 扫码收款正常） | wechatPayV3.js 全量（下单/回调验签含公钥模式/解密/查单/关单），WECHAT_APPID=wxedc4b3ff9f707969 已配置；v25.0.47_14 起支付全平台放开：web/Android/iOS/微信内置浏览器下单全部返回 codeUrl（四环境公网实测），月/季/年/终身四档+批量解读+B类工具+积分充值下单全部走通；JSAPI 保留待公众号参数（WECHAT_APP_SECRET 补齐后微信内自动升级）；iOS 门控 IOS_PAYMENT_ENABLED=true（Native 扫码不依赖平台商店，App Store 审核通过前 iOS 原生壳如需恢复关闭仅改 platformGate.ts 一处） |
| INVITE_POSTER_VIRAL（邀请裂变海报系统） | VERIFIED（v25.0.47_14） | 完整海报导出修复+3套裂变模板+4场景文案库全量上线；海报引擎 posterEngine.ts 1080×1920 全要素画布（背景/标题/卖点/二维码/邀请码/合规底栏）；viralTemplates.ts 3套模板（种草版/引流版/学习版）+4套文案入包校验通过；邀请API全链路公网实测（invite/link 签名链接+invite/overview 真实数据+401鉴权拦截）；裂变分佣规则：邀请注册+50积分/首次付费+200积分，订单分佣一级15%+二级5% |
| P8_COMMISSION_STAGE1（自动分佣记账） | VERIFIED | 生产服务器集成测试 **18/18 PASS**（入账/幂等/比例热更/明细/退款冲正/解冻），测试数据零残留 |
| P8_COMMISSION_STAGE2（提现+商家转账打款） | READY（v25.0.47_13 接口对接完成，配置参数后即可启用） | wechatTransfer.js 商家转账 V3 全量（transfer-batches/回调验签/查单）+ commissionEngine 全自动提现引擎（免审 200 元自动转账/单日 2 万限额/风控/幂等/退款扣回）已上线；WITHDRAW_TRANSFER_ENABLED=false 待商户后台开通「商家转账到零钱」权限后置 true+PM2 重启即启用；公网验证 28 项 PASS（越权拦截/提现拦截/审计/字数全达标） |
| AI_CHAT_PROXY（AI解读全链路） | VERIFIED | RC-04 修复后公网实测双格式 200（systemPrompt/userPrompt 与 messages），上游混元 tokenhub 直连成功；AI配额/会员校验端点正常 |
| LIUYAO_FUSHEN / MEIHUA_FUSHEN | VERIFIED（待用户真机终验） | v25.0.47_3 冒烟 13/13，HexagramRow 统一模型，FuShenCore 共享 |
| GROUP_CHAT（群聊） | VERIFIED（待用户真机终验） | v25.0.47_4：聊天页输入框/发送/右上角群资料入口（成员/邀请/踢人/公告/禁言/转让/退出/解散） |
| DISCOVER_EXTERNAL（发现精选） | VERIFIED | /api/news/public 返回真实资讯+来源标注，AI 摘要标注 |
| ANDROID | VERIFIED（v25.0.47_15 死链修复后全链路可用） | 原生 APK（内置资源模式，API 改写脚本内联），MD5 三端一致；下载链路三入口公网实测 200：/download 页（正式包直链）、/friend 落地页（扫码注册→立即下载APP，v25.0.47_15 修复 404 死链：正式包+别名双文件）、注册/登录页下载按钮→/friend |
| WEBSITE（官网分发） | VERIFIED | 2026-08-22 DNS 切换完成（www.yandao.vip / yandao.vip A 记录 → 82.156.228.87 已生效，公网解析+200 验证）；官网/APP 站下载链接统一 v25.0.47 APK；旧 APK 404；「言道学外语」死链（APK 在旧服务器不可达）已改「敬请期待」防错；v25.0.47_15 补充：品牌统一删除的旧 APK 文件名已在服务器补挂别名（同MD5指向正式包），存量分享链路恢复 |
| IOS | PARTIAL（管道就绪，PLA 未签） | 33 项就绪校验通过，xcarchive 产出验证，签名三件套入 Secrets |
| CLEAN_SOURCE（本地工作区） | VERIFIED | 构建产物/verify/临时脚本/旧快照/node_scratch 全清，仅存正式源码 |
| SERVER_CLEAN（服务器） | VERIFIED | 12.1G/50G，仅生产+回滚版+备份+证书 |
| MASTER_LEDGER（本账簿） | VERIFIED | 本文档 |

---

## 五、P8 分佣系统（2026-08-22 上线阶段一）

### 5.1 架构

- **引擎**：backend_deploy/commissionEngine.js —— 两级分佣（一级 15% + 二级 5%，v25.0.47_12 起；复用 user_invite_relation level=1/2 / users.invited_by，不新建绑定体系）
- **幂等**：commission_records(order_no, record_type) 唯一索引（COMMISSION_L1/COMMISSION_L2 独立 record_type），同订单每级只发一次佣金；同人去重/禁自购自返
- **金额**：全部整数「分」存储，杜绝浮点误差
- **账户三字段**：total_earnings_cents（累计）/ withdrawable_cents（可提现）/ frozen_cents（待解冻）
- **结算**：月度结算模式（monthlySettleEnabled=true）——佣金 FROZEN → 每月最后 1 天（settleDay=0）统一解冻转可提现 → 每月 16 日-月末（withdrawOpenDay=16）开放提现，窗口外后端强制拦截
- **提现（v25.0.47_13 全自动）**：用户申请 → 校验余额/最低门槛 10 元/提现窗口/单日限额 2 万 → ≤免审额度 200 元自动发起微信商家转账（wechatTransfer.js V3）→ 回调验签更新状态 → 成功扣可提现/失败退回并记录原因；超免审额度进财务人工审核队列；风控标记（新注册/短时间多笔自动转人工）；全链路幂等（同一提现单仅发起一次转账）
- **退款冲正**：全额退款两级佣金全额扣回，部分退款按比例扣回；冻结期直接扣待解冻，已解冻优先扣可提现，不足记负收益
- **钩子**：订单 PAID → grantCommission；REFUNDED → reverseCommission（复用订单状态机）

### 5.2 配置（后台可视化，/admin/commission）

分佣比例：一级 15% / 二级 5%（后台可调）；月度结算日=每月最后 1 天；提现开放日=16 号；最低提现 10 元；免审额度 200 元；单日单用户限额 2 万元；转账备注「言道国学推荐收益」；税务提示文案内置。
配置存储：/www/yandaoguoxue-backend/data/commission_config.json；.env 兜底参数：WITHDRAW_TRANSFER_ENABLED（提现总开关，默认 false）/ WITHDRAW_FREE_PASS_AMOUNT=200 / WITHDRAW_MIN_AMOUNT=10（仅当文件配置未显式保存时生效）。
**提现启用条件**：商户号在微信商户平台开通「商家转账到零钱」权限 → 服务器 .env 置 WITHDRAW_TRANSFER_ENABLED=true → PM2 重启即全自动生效。

### 5.3 用户端入口

「我的」→「我的收益」：余额展示（待解冻/可提现/累计收益/累计提现）+ 佣金明细（来源/金额/状态/到账时间）+ 提现记录（待审核/处理中/成功/失败+失败原因+到账时间）+ 提现申请（确认微信收款身份；低于最低门槛按钮置灰；非开放期后端拦截）+ 规则说明（结算周期/提现窗口 16 日-月末/到账时效/最低门槛）。
接口：GET /api/commission/my/summary|records|withdrawals，POST /my/withdraw（JWT 鉴权；未登录 401）。

### 5.4 验收记录

生产服务器 E2E（p8_commission_e2e_test.js）：**18/18 PASS** —— 验收1 入账（100元×30%=30元入待解冻）、验收2 幂等（重复回调 DUPLICATE 拒绝、记录仅1条）、验收3 比例热更（新订单新比例、历史订单不变）、验收4 明细字段一一对应、验收5 退款冲正（可提现扣回+冻结期精确归零+重复冲正拒绝）、解冻机制（FROZEN→UNFROZEN、可提现增加、待解冻回落）。

### 5.5 合规红线（已内置）

两级分销（一级 15%+二级 5%，符合《禁止传销条例》层级上限）；禁止自购自返；同设备/手机号/IP 互荐不计佣；单日单用户提现限额 2 万元；异常账号（新注册/短时间多笔提现）自动转人工审核；提现页税务提示；所有资金操作有流水可审计可导出。

### 5.6 邀请裂变营销体系（v25.0.47_14 上线，INVITE_POSTER_VIRAL=VERIFIED）

**核心文件**：src/lib/marketing/viralTemplates.ts（3套模板+4套文案+渲染编排）/ posterEngine.ts（Canvas 全要素海报引擎）/ src/app/invite/page.tsx（邀请推广中心·海报卡）/ src/app/invite/poster/page.tsx（AI推广助手）。

**3 套海报模板（用户「换一个风格」循环切换，「使用通用版」回到模板一）**：
| 模板 | 主标题 | 调性 | 适用场景 |
|------|--------|------|----------|
| 朋友圈种草版（默认） | 藏在手机里的国学宝藏工具 | 米色简约国风·✅卖点3条 | 朋友圈（像自主分享的宝藏App，不违和） |
| 社群引流版 | 免费！专业级国学工具App | 信息密度高·▪功能4条 | 国学群/中医群/兴趣社群（功能一目了然） |
| 专业学习版 | 你的随身国学学习助手 | 清雅书卷气·📚🎯📝 | 学习者人群（典籍/题库/深度解读） |

**4 场景分享文案库（一键复制，替换旧平淡文案）**：①朋友圈图文长文案（种草感：「最近挖到一个很良心的传统文化App…」）②群聊/私聊短文案（直接高效：「给你分享个国学工具App…」）③精准兴趣群文案（功能价值：「推荐一个免费的国学工具，14款排盘工具+中医典籍查询…」）④私发好友话术（信任转化：「我最近在用这个国学工具…注册了我们都有奖励」）。

**交互**：系统分享 navigator.share 一键带海报图+默认文案（不支持时自动降级复制文案）；微信内长按海报图兜底保存；合规提示统一缩小字号调浅色置底部不占主视觉；前端不展示任何合规校验类文字（仅开发端可见）。

**海报规格**：1080×1920（9:16）全要素画布——背景底色+主标题+副标题+卖点列表（≤4条）+大号二维码+邀请码+底部合规提示（东莞言道科技有限公司 出品｜内容仅供传统文化学习参考）；保存主按钮导出完整海报（修复 v25.0.47_13 前仅保存二维码的问题），「保存二维码」为辅助按钮。

**裂变分佣规则**：邀请注册 +50 积分、被邀请人首次付费 +200 积分（奖励规则经 /api/auth/invite/link 下发展示）；订单分佣一级 15% + 二级 5%（月度结算：每月最后1天结算→16日起开放提现）；邀请链接 HMAC 签名防伪造（inviteRef+inviteTs+inviteSig），首绑永久生效；同设备/手机号/IP 互荐不计佣。

**下载转化链路（v25.0.47_15 修复收口）**：新用户扫码海报 → /register?ref=xxx（注册页含「下载言道国学APP」按钮，全浏览器 a 标签可点）→ /friend 落地页（未登录非微信环境 0.5s 自动触发下载 + 手动「立即下载APP」兜底按钮；微信/QQ 内显示右上角「···」浏览器打开引导 + 「尝试下载」按钮）→ APK 直链（正式包 yandao-guoxue-v25.0.47-release.apk + 别名 guoxue-chuancheng-v1.0-release.apk 双文件，服务器 /var/www/yandao.vip/app-download/，Nginx alias + MIME application/vnd.android.package-archive + Content-Disposition attachment）。**运维注意：发布新 APK 时必须同步更新别名文件**（cp 新正式包 → guoxue-chuancheng-v1.0-release.apk），否则存量分享海报中的旧链接 404。

---

## 六、统一运营后台（/admin，2026-08-23 v25.0.47_13 升级三级角色体系）

**导航**：全端抽屉式（默认收起 + 顶部汉堡按钮唤出 + 遮罩层，内容区全宽不遮挡）；菜单按登录角色动态渲染（scope: all/finance/ops/super），前端仅渲染可见性，权限由服务端中间件强制校验。

### 6.1 三级角色权限（backend_deploy/adminRoles.js 统一模块，服务端强校验）

| 角色 | 登录方式 | 专属权限 | 禁止权限 |
|------|----------|----------|----------|
| SUPER_ADMIN 超级管理员 | 主管理员密钥（.env ADMIN_API_KEY，全系统唯一最高权限） | 全后台所有功能：价格配置/密钥管理/用户封禁/财务终审/系统开关/审计日志/创建与禁用子密钥 | 无限制 |
| FINANCE_ADMIN 财务管理员 | 独立财务密钥（SUPER_ADMIN 在 /admin/keys 签发） | 提现审核（单笔/批量/驳回填原因）/订单流水/佣金报表（日/月/年）/财务对账/提现记录 CSV 导出/同步微信转账状态 | 改产品价格/改系统开关/管理密钥/封禁用户/改分佣比例（公网实测 5 项越权全部 403） |
| OPERATOR_ADMIN 运营管理员 | 独立运营密钥（SUPER_ADMIN 签发） | 用户管理/资讯内容管理/工具开关配置/营销海报/数据总览 | 一切资金操作/价格修改/密钥管理/财务报表导出（公网实测越权财务 403+越权密钥 403） |

强制规则：越权操作服务端 403 拦截并写审计日志（AUDIT_BLOCK_ROLE/AUDIT_BLOCK_SCOPE）；子密钥独立生成互不通用、SHA256 哈希加密存储于 data/admin_roles.json（明文仅签发时一次性展示）；密钥严禁写入代码/文档/GitHub；主密钥修改方式：服务器 /www/yandaoguoxue-backend/.env 修改 ADMIN_API_KEY → PM2 重启生效（/admin/keys 页有操作指引）。

### 6.2 页面清单

| 页面 | 路径 | 能力 |
|------|------|------|
| 总览（老板驾驶舱） | /admin | 20 项核心指标（版本/Commit/服务器/数据库/AI/支付三色健康+经营数据） |
| 密钥管理 | /admin/keys | 三级角色权限表/签发子密钥（一次性明文）/禁用子密钥/主密钥修改指引（SUPER_ADMIN 专属） |
| 分佣与提现 | /admin/commission | 分佣比例配置 + 佣金明细（筛选/导出）+ 提现审核（通过/驳回/批量）+ 佣金统计报表（日/月/年/层级/退款扣回）+ 提现记录 CSV 导出 + 同步微信转账终态 |
| 用户管理 | /admin/moderation | 用户（禁言/封禁/解封）+ 动态（下架）+ 举报处理 + 群（关闭违规群）+ 黑名单 |
| 订单管理 | /admin/orders | 订单列表 + 状态 + 真实支付订单（微信交易号/权益交付）+ 幂等重试发放 + 补单（SUPER_ADMIN+二次确认+原因+审计） |
| 其他 | /admin/tools·pricing·feature-flags·ai-control 等 | 工具矩阵 23 款/产品与价格（改价二次确认）/17 项系统功能开关/AI 管理/审计日志/系统状态 |

后端：adminRoles.js（统一鉴权+审计+子密钥管理）+ adminUnifiedRoutes.js 等路由模块全部接入；所有变更操作写审计表（operator/role/time/action/target/oldValue/newValue/reason/ip/ua）。
使用：项目方管理员密钥登录 /admin 即可操作，无需开发者介入。

---

## 七、微信支付状态（2026-08-23 更新）

| 项 | 状态 |
|----|------|
| 代码 | VERIFIED —— wechatPayV3.js（V3 Native/JSAPI 下单/回调验签[平台证书+公钥双模式]/AES-256-GCM 解密/主动查单/关单/OAuth） |
| 收款通道 | **Native 扫码全场景收款正常**（v25.0.47_14 公网实测：web默认/微信头/iOS头/微信UA兜底四环境下单全部返回 codeUrl；会员月 37/季 99/年 374/终身 3600 四档+B类工具 9.9+批量解读 200+积分充值下单全部走通；服务端强制裁决篡改金额） |
| 商户材料 | 商户号 1116339601/APIv3 密钥/证书序列号 34B8C087…/私钥/公钥模式 PUB_KEY_ID 已配置于服务器 ENV（未入 Git/日志/前端）；WECHAT_APPID=wxedc4b3ff9f707969 已配置 |
| JSAPI | 保留待公众号参数——WECHAT_APP_SECRET 补齐后微信内自动升级 JSAPI（Native/JSAPI 下单均不需要 AppSecret，仅网页授权需要） |
| 商家转账（提现打款） | **READY（v25.0.47_13）**——wechatTransfer.js 商家转账 V3 全量对接（transfer-batches/回调验签/查单）；WITHDRAW_TRANSFER_ENABLED=false 待商户后台开通「商家转账到零钱」权限后置 true+PM2 重启即启用 |
| iOS | **v25.0.47_14 起全放开**（IOS_PAYMENT_ENABLED=true，四层门控同步：platformGate.ts/platformGates.ts/platformFeatureGate.js/adminUnifiedRoutes.js）——Native 扫码支付不依赖平台商店，iOS Safari/微信/原生壳全环境收款正常（公网实测 X-Client-Platform:ios 下单返回 codeUrl）；如 App Store 审核要求关闭 iOS 原生壳内支付，仅需改 platformGate.ts 一处+构建发布 |
| 凭证变量名（仅名，禁真值入 Git） | WECHAT_MCH_ID / WECHAT_APPID / WECHAT_API_V3_KEY / WECHAT_CERT_SERIAL_NO / WECHAT_PRIVATE_KEY_PATH / WECHAT_APP_SECRET / WITHDRAW_TRANSFER_ENABLED / WITHDRAW_FREE_PASS_AMOUNT / WITHDRAW_MIN_AMOUNT |

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
| **微信支付 JSAPI（可选）** | Native 扫码收款已全场景 VERIFIED（含 WECHAT_APPID）；如需微信内浏览器直接拉起支付（免扫码），提供 WECHAT_APP_SECRET → 服务器 ENV 写入即自动升级 JSAPI | 项目方 |
| **商家转账开通** | 微信商户平台开通「商家转账到零钱」权限 → 服务器 /www/yandaoguoxue-backend/.env 置 WITHDRAW_TRANSFER_ENABLED=true → pm2 restart yandaoguoxue-backend → 全自动提现生效（代码已全量对接，v25.0.47_13 READY） | 项目方 |
| 真机终验 | 分享扫码链路（奇门/六爻/梅花/紫微任选）、伏神视觉、群聊 UI | 项目方 |
| 言道学外语下载恢复（可选） | 官网「言道学外语」卡片/详情页下载按钮现为「敬请期待」（APK 仅存于不可达的旧服务器）。若项目方后续提供 yandao-xuewaiyu APK，上传 /var/www/yandao.vip/app-download/yandao/ 并还原按钮即可 | 项目方 |
| 用户实机回归 | 六爻/梅花伏神、群聊、裂变海报真机保存（v25.0.47_14 完整海报导出已上线，真机验证：邀请页→「保存完整海报图片」→相册应为一整张含背景/标题/卖点/二维码/邀请码的海报图，不再是纯二维码）；注册/登录页下载APP按钮各浏览器可见性抽查；**扫码下载全链路真机抽查（v25.0.47_15 修复后）**：任意浏览器扫海报二维码→注册页见下载按钮→/friend 页→点「立即下载APP」→应正常下载安装包（服务端已验证直链 200+MIME 正确，待安卓真机安装确认） | 项目方 |
| ~~AI TokenHub 白名单~~ | **已闭环（2026-08-22）**：服务器直连 tokenhub.tencentmaas.com 实测返回正常补全（IP 82.156.228.87 出口畅通）；此前全站AI不可用真因为 RC-04 前后端契约不匹配，已修复 | ~~项目方~~ 已闭环 |
| 内容运营 | 资讯 /admin/sources；审核 /admin/moderation；分佣 /admin/commission | 项目方 |

**红线**（冻结约束）：版本号保持 v25.0.47 直至全部验证；只允许修改指定区域（六爻 UI/群聊/底部导航/中医搜索/营销海报/资讯/分享/后台/分佣/提现）；紫微/八字/奇门/梅花算法核心、医考引擎、邀请体系、数据库结构禁止改动；分佣两级（一级 15%+二级 5%，层级不得再增加）；禁止新报告文件，只更新本账簿。
