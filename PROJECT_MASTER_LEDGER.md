# 言道国学项目总账（PROJECT_MASTER_LEDGER）

> **本文档是项目唯一权威账簿（Single Source of Truth）。**
> 最后更新: 2026-08-29（P0-PRODUCTION-SEAL-AND-AI-COST-PHASE1-03：P0安全修复正式生产落地 + 生产攻击回归 + SSOT总账纠偏 + 真太阳时封板 + AI Fair Usage/Cost Center 第一阶段）
> 上一批（2026-08-25，生产版本 v25.0.47_30）：FIX-V30-PAY-CARE 支付权益彻查+防再发机制——用户投诉「会员ID 100011 充值没开通会员」彻查结论：①订单 YD20260825173625902022 ¥39.9 实为 SINGLE_UNLOCK 单次深度解读（非会员套餐），支付成功且 benefit_delivered=1 权益已正常发放；用户误将单次解读当会员购买（单次 39.9>月费 37 价格结构易混淆），支付后又连续创建 7 个未完成 PENDING 订单反复尝试；②全量对账 5 笔 PAID 订单：真实用户订单权益全部正常发放，唯一漏发为 E2E 测试订单 TEST_RC06_DELIVER（无 transaction_id 无真实扣款，已归档）；910082 yearly 会员为 E2E 测试账号（无手机号）非漏发；③处理：用户 100011 客户关怀补偿开通月度会员至 2026-09-24（与生产 deliverOrderBenefits 同口径 users+user_assets 双表）+7 个僵尸 PENDING 订单关闭+operation_logs 三条留痕（修复前 DB 备份 /root/backup/yandao_users_pre_fix100011_20260825_175346.db）；⑥应老板要求改单（2026-08-25 追加）：订单 129 YD20260825173625902022 由 SINGLE_UNLOCK 正式转为 MEMBERSHIP（实付 39.9 金额不动，benefit_delivered=1 维持，operation_logs id=302 order_type_convert 留痕），订单记录与已发月度会员权益一致；用户无推荐人（invited_by/referrer_id 空）改单对佣金结算零影响；④防再发：部署 /root/backend-auth/scripts/payment_reconcile.sh 每日 03:30 cron 自动对账——查 PAID+benefit_delivered=0+支付超10分钟的沉默漏发订单，MEMBERSHIP 按金额映射档位（37/99/374/3600）自动补交付（续费顺延同口径）、SINGLE_UNLOCK 补标记、未知类型告警人工，告警日志 payment_audit_alerts.log；⑤产品层防混淆：单次解锁弹窗新增三处明确标识「本单为单次解读解锁，非会员套餐」+「支付后仅解锁本次解读，不含会员权益」；前一版本 v25.0.47_29+APK v25.0.55(2055)：FIX-V29-DOWNLOAD-RESCUE 升级下载链路根治）
> 历史详细记录见 `PROJECT_LEDGER_FINAL.md`（v25.0.0 ~ v25.0.20 阶段账，冻结归档）。
> 本账簿只记录 v25.0.21 之后增量与当前全局事实；冲突时以本文为准。
> 纪律：停止新增 xx_REPORT 编号报告，一切状态只更新本账簿。

---

## 〇、Current Snapshot（当前事实快照 · 2026-08-29 核实）

| 项 | 值 |
|----|-----|
| 数据核实日期 | 2026-08-29 |
| 后端 Runtime Commit | `f694389`（chore(release) bump v25.0.65；含 `16608a5` P0 安全修复） |
| 前端 Web 构建版本 | v25.0.64（本轮前端运行时零变更，按部署纪律未重切前端） |
| 后端发布版本 | v25.0.65（P0 安全落地批次） |
| Document Head | `f694389`（GitHub = 本地 = 服务器源码仓 一致） |
| APK / versionCode | 25.0.60 / 2059（`/api/public/app-version` 生产下发值，published 2026-08-26） |
| 生产服务器 | 82.156.228.87（腾讯云轻量 北京，root） |
| 生产后端路径 | `/www/yandaoguoxue-backend`（PM2 `yandaoguoxue-backend`，端口 3001） |
| 前端发布路径 | `/root/yandaoguoxue/releases/<tag>` + `/root/yandaoguoxue/current` 软链（nginx root 指向） |
| 数据库架构 | SQLite（better-sqlite3）三库：`/root/backend-auth/data/yandao_users.db`（用户核心，97 用户）+ `/www/yandaoguoxue-backend/data/social.db`（社交）+ `/www/yandaoguoxue-backend/data/academy.db`（学堂，约 56MB）。PostgreSQL 15 为已迁出「学外语」项目进程残留，非本国学项目基础设施（见下方 §二 纠偏）。 |
| 备份现状 | 三库每日 02:00 备份至 `/root/backup/`（2026-08-29 备份已存在），`PRAGMA integrity_check` = ok |
| 用户/会员统计 | 97 用户（basic 93 / monthly 2 / yearly 1 / lifetime 1），统计日期 2026-08-29 |

> 冲突裁决：历史章节中「当前生产版本 / Git HEAD / APK / 数据库」等字段若与本快照冲突，以本快照为准；历史字段原文保留不删（记 SUPERSEDED·HISTORICAL）。

---

## 一、项目身份

| 项 | 值 |
|----|-----|
| 产品名 | 言道国学（医易命理 APP，iOS/Android 原生壳 + 内置 Web 资源） |
| 仓库 | https://github.com/wzmpa18/minglizyi（main 分支） |
| 域名 | https://yandaoguoxue.yandao.vip（APP）/ www.yandao.vip（官网下载页） |
| ICP 备案 | 粤ICP备2026071165号-4A（服务名：言道国学，域 yandao.vip） |
| 当前生产版本 | **v25.0.47_30**（buildId v25.0.47_30_D20260825，2026-08-25 发布，FIX-V30-PAY-CARE：支付权益彻查+对账防再发——用户 100011 投诉彻查：¥39.9 订单为单次深度解读（SINGLE_UNLOCK）非会员套餐，支付与权益发放均正常，用户因价格结构混淆（单次 39.9>月费 37）误认为买会员；全量对账 5 笔 PAID 无真实漏发；补偿开通月度会员至 2026-09-24+7 僵尸订单关闭；部署每日 03:30 自动对账 cron（沉默漏发自动补交付+告警）；单次解锁弹窗新增防混淆文案；详见版本演进表） |①**根因确诊（截图证据链）**：v28 老壳救援弹窗已生效（用户点到了升级引导），但下载环节卡死——截图显示 /friend 页「正在添加好友...」转圈 + 底部 Toast「正在下载言道国学APP...」数分钟无进展，三层叠加：**a.壳内 WebView 无法下载文件**（新老 APK 壳均无 DownloadListener，`location.href = apk直链` 被 WebView 静默吞掉，Toast 永远显示但下载永不发生）；**b./friend「正在添加好友」假转圈**（升级跳转 URL 无 ref 参数，已登录用户 autoAddFriend 前置条件 referrerId 不满足根本不执行，但加载态卡片永久渲染）；**c.升级弹窗重复弹**（handleUpgrade 未标记已处理，返回 APP visibilitychange 重新检测反复弹窗——用户报告「多次打开对话框」）；②**web 修复（v25.0.47_29 纯前端，老壳直载线上即时获救）**——nativeDetect.ts 新增 isNativeShellSync() 同步壳判定+buildAndroidIntentUrl()（https→intent:// URI，WebView shouldOverrideUrlLoading 自动交系统 ACTION_VIEW 解析拉起系统浏览器下载）；/friend 与 /download 下载触发壳感知：壳内 intent:// 拉起浏览器+顶部「正在为您升级新版本」引导卡+「下载没反应？复制下载链接」兜底按钮（clipboard+execCommand 双通道复制），浏览器保持 location.href 直下零回归；/friend 加好友卡改为仅 referrerId 存在显示（无 ref 登录态直接展示下载卡，假转圈消灭）；AppUpgradeChecker.handleUpgrade 点击即 sessionStorage DISMISS_KEY 标记+setDismissed（弹窗循环消灭），壳内统一 location.href 进落地页；③**原生永久修复（APK v25.0.55/versionCode 2055）**——MainActivity 新增 DownloadListener（onResume 注册，壳内下载请求交系统 DownloadManager：cookie+UA 透传、通知栏进度、VISIBILITY_VISIBLE_NOTIFY_COMPLETED、apk MIME 纠正、guessFileName 落 Downloads 目录），与 web 层 intent:// 双保险，未来壳内任意下载链路均不再卡死；内置资源升级 v29（含全部 web 修复）；④**交付链**——web：commit 258f8bc→build.sh 特征门禁（复制下载链接 1/intent 2/升级引导卡 1 chunks）→releases/v25.0.47_29 双软链切流（current+releases/current）→公网 version.json v29+chunks 特征线上命中；APK：scripts/build_android_v25_0_55.sh（前置校验 v29 产物+2055+DownloadListener 源码存在）→Gradle 8.9 assembleRelease 11,499,405 字节→APK 验证（内置 app-native.json 2055/version.json v29/**dex 内 setDownloadListener 符号命中**/四项特征 chunks 全中）→三文件分发同 MD5 bf050537c615cefcdb5eb7923d650d74→升级配置 2055→公网 size 一致；⑤**公告栏**——新增置顶「🎉 新版 v25.0.55 发布：升级下载问题彻底修复」（下载卡住/弹窗重复/复制兜底三条说明），旧 {APP_VERSION} 占位公告取消置顶自动渲染 25.0.55；⑥**本地归档**——核心文档/APK安装包/言道国学_v25.0.55_2055_离线完整包.apk（MD5 与线上一致）；⑦**用户侧验证路径**——老板老壳手机：打开 APP → 弹升级窗（只弹一次）→ 立即升级 → /friend 落地页自动 intent:// 打开系统浏览器 → 浏览器下载 latest.apk（v25.0.55）→ 下拉通知栏安装 → 检查更新显示「当前已是最新版本 v25.0.55」；v25.0.54 内置壳用户同样经弹窗引导升 2055；前一版本 v25.0.47_28 详见版本演进表 |
| Git HEAD | a3f43c7（main，本地=GitHub=服务器源码仓=生产运行目录 四端一致；v29 提交 258f8bc 下载链路根治+a3f43c7 v25.0.55 构建脚本；v28 提交 27b1bc7 老壳救援+c51d0d6 v28 总账收口；v27 提交 4acfe0f 检查更新双通道+1b7046b 总账收口；v26 提交链 783f517→c68b899→692ca0c→478a613） |
| 正式 APK | https://yandaoguoxue.yandao.vip/app-download/yandao-guoxue-v25.0.55-release.apk（v25.0.55 / versionCode 2055，v2 签名，内置 v25.0.47_29 资源+DownloadListener 壳内下载接管+双侧侧滑返回+检查更新修复+老壳救援）；别名文件 guoxue-chuancheng.apk 与 latest.apk 同包（三文件 MD5 一致 bf050537c615cefcdb5eb7923d650d74，11,499,405 字节）；历史包 v25.0.47~v25.0.54 保留分发目录作回滚；升级提示数据源 /www/yandaoguoxue-backend/data/app-release-config.json（已指 2055）；云端构建 codemagic.yaml android-workflow（ANDROID_KEYSTORE_B64 加密变量，值见核心文档《06_Codemagic_ANDROID_KEYSTORE_B64.txt》）；本地归档 言道国学_核心文档/APK安装包/言道国学_v25.0.55_2055_离线完整包.apk |

---

## 二、基础设施（生产）

| 项 | 值 |
|----|-----|
| 服务器 | 82.156.228.87（腾讯云轻量 北京，root） |
| 前端发布 | /root/yandaoguoxue/releases/&lt;tag&gt; + **/root/yandaoguoxue/current 软链（nginx root 真实指向，v28 切流纠偏时确认；releases/current 软链为冗余同指）**；当前 current→v25.0.47_29，回滚目标 v25.0.47_28；目录现状 _5/_6/_8/_9/_17/_21/_22/_23/_24/_25/_26/_27/_28/_29 等多版（磁盘充足暂留，如需清理保留 _28+_29 即可） |
| 后端服务 | /www/yandaoguoxue-backend，PM2 名 yandaoguoxue-backend，端口 3001 |
| 数据库 | ~~PostgreSQL 15（SUPERSEDED·HISTORICAL：为已迁出「学外语」项目进程残留，经 2026-08-29 生产核实国学后端仅 `require('better-sqlite3')`×29、零 `require('pg')`/5432 连接）~~ → **SQLite（better-sqlite3）三库**：用户核心 `/root/backend-auth/data/yandao_users.db`（97 用户 + user_orders/user_assets/commission_accounts/commission_records/partner_settlements 等全表）、社交 `/www/yandaoguoxue-backend/data/social.db`、学堂 `/www/yandaoguoxue-backend/data/academy.db`（约 56MB） |
| Nginx | / → 静态前端；/api/* → 127.0.0.1:3001；/app-download/ → APK 分发 |
| SSL | Let's Encrypt（certbot，每日自动续期 cron） |
| 备份 | 每日 02:00 users_db（cron /root/backend-auth/backup_db.sh → /root/backup/，保留7天）；03:00 一致性校验；周日 04:00 VACUUM+REINDEX；归档区 /root/backup/archive/（数据库备份+nginx配置+导入材料压缩包） |
| 日志轮转 | /etc/logrotate.d/yandao-guoxue（nginx+PM2，daily/rotate 14/压缩） |
| SSH 工具 | scripts/ssh_exec.py（paramiko，密钥 id_rsa_yandao 优先/密码降级） |

**服务器磁盘（2026-08-22 最终清理后）**：12.1G / 50G（本次回收 4.4G：swapfile2 2G、android-sdk+.gradle+gradle zip 1.75G、.npm 275M、旧 releases 六版 158M、releases 根散落旧构建 20M、git bundle、散落脚本、旧备份目录归档删除）。

| **v25.0.47_30** | 08-25 | **FIX-V30-PAY-CARE 支付权益彻查+对账防再发机制（代码提交 27cf3a9；含生产数据修复+服务器 cron 部署，非纯发版）**：①**投诉彻查**——用户报告「会员ID 100011 充值，没有开通会员」附微信支付账单截图（商户单号 YD20260825173625902022，¥39.90，2026-08-25 17:36:49 支付成功，商品「传统文化学习资料深度解读（单次）」）：SQLite user_orders 表查证订单 status=PAID+benefit_delivered=1 **支付与权益发放均正常**，但 order_type=SINGLE_UNLOCK（单次深度解读解锁）**并非会员套餐**——用户误将单次解读当会员购买，且单次 39.9 高于月度会员 37 的价格结构加剧混淆；用户支付后又连续创建 7 个 PENDING 订单（135~140+128）反复尝试支付未完成；②**全量对账（所有 PAID 订单 vs 权益发放）**——5 笔 PAID 中：910080 ¥0.01 测试、910081 ¥9.9 单次+¥39 月度会员（monthly 至 2026-09-21 正确发放）、100011 ¥39.9 单次（已发）；唯一 benefit_delivered=0 为订单 1 TEST_RC06_DELIVER（user 100000，E2E 测试数据：订单名 TEST 前缀+无 transaction_id+paid_at 非标准格式，无真实扣款）——**结论：不存在真实用户「充值成功但权益漏发」**；910082 yearly 会员（至 2027-08-23）经查为 E2E 测试账号（无手机号，operation_logs 全为测试 IP 登录）非漏发；③**生产数据修复（事务执行+修复前备份 yandao_users_pre_fix100011_20260825_175346.db MD5 b63f285c）**——用户 100011 客户关怀补偿开通月度会员至 2026-09-24（UPDATE users member_level/membership_expiry + user_assets member_level，与后端 deliverOrderBenefits 完全同口径）+7 个僵尸 PENDING 订单转 CLOSED（保留记录）+TEST 测试订单归档 CLOSED 防对账误报+operation_logs 三条留痕（admin_grant_membership/admin_close_pending_orders/admin_archive_test_order）；⑥**应老板要求改单（2026-08-25 追加）**——订单 129 YD20260825173625902022 由 SINGLE_UNLOCK 正式转为 MEMBERSHIP（应老板「把这个刚刚充值的改成为月度会员」指令：UPDATE user_orders SET order_type='MEMBERSHIP'，实付 ¥39.9 金额不动、status=PAID/benefit_delivered=1/paid_at 维持，operation_logs id=302 order_type_convert 留痕），订单记录与已发月度会员权益（monthly 至 2026-09-24）完全一致；改单安全评估：用户 100011 无推荐人（invited_by/referrer_id 均空）佣金结算零影响；对账脚本按 benefit_delivered=1 判定不会重复处理；④**防再发机制（服务器部署）**——/root/backend-auth/scripts/payment_reconcile.sh + cron「30 3 * * *」每日自动对账：查 PAID+benefit_delivered=0+paid_at<now-10min 沉默漏发订单（用户支付后再不触发 query 接口补交付的场景），MEMBERSHIP 按金额映射档位（37=monthly/99=quarterly/374=yearly/3600=lifetime，与 publicPricingRoutes 价格 SSOT 一致）自动补交付（续费在现有有效期上顺延同口径）、SINGLE_UNLOCK 补标记、金额无法映射/未知类型写 payment_audit_alerts.log 告警人工；执行日志 payment_reconcile.log，补交付写 operation_logs reconcile_auto_deliver 留痕；首次手动执行验证「无漏发订单」通过；⑤**产品层防混淆（v25.0.47_30 发版）**——AIInterpretButton 单次解锁弹窗新增：顶部提示条「本单为单次解读解锁，非会员套餐 · 开通会员每日50次更划算 →」+价格下方「支付后仅解锁本次解读，不含会员权益」+标题区徽标，杜绝价格结构混淆再次引发同类投诉；交付链：commit 27cf3a9→build.sh 特征门禁（防混淆文案 1 chunk 入包）→releases/v25.0.47_30 切流→公网 version.json v30 验证 |
| **v25.0.47_29** | 08-25 | **FIX-V29-DOWNLOAD-RESCUE 升级下载链路根治（代码提交 258f8bc+a3f43c7，四端一致：本地=GitHub=服务器源码仓=生产运行目录；APK v25.0.55/versionCode 2055 发布）**：①**根因确诊（用户三次报告+截图证据链）**——「弹窗提示升级点击后对话框多次打开自己消失，正在添加好友时钟转圈+正在下载 Toast 几分钟无进展」：v28 老壳救援弹窗已生效（用户已走到升级引导），但下载环节三叠加缺陷卡死：**a.壳内 WebView 无法下载文件**——新老 APK 壳（v25.0.47_3 老壳~v25.0.54 内置壳）MainActivity 均为空 BridgeActivity 无 DownloadListener，WebView 对非可渲染内容（apk 附件）的导航请求静默吞掉，`location.href = apk直链` 后 Toast「正在下载言道国学APP...」永远显示但系统层面下载永不发生（用户截图实证：Toast 持续数分钟无进展）；**b./friend「正在添加好友...」假转圈**——升级跳转 URL 无 ref 参数，已登录（老壳 localStorage 有登录态）用户 autoAddFriend 前置条件 referrerId 不满足根本不执行，但 isLoggedIn 分支的加载态卡片（时钟转圈+「正在添加好友...」）无条件永久渲染；**c.升级弹窗重复弹**——AppUpgradeChecker.handleUpgrade 仅 window.open 未标记已处理，返回 APP visibilitychange 重新检测再次弹窗（用户报告「多次打开这个手机端对话框」）；②**web 修复（纯前端发版，老壳 server.url 直载线上即时获救）**——src/lib/nativeDetect.ts 新增 isNativeShellSync()（同步桥判定，避免 useEffect 时序闭包过期）+buildAndroidIntentUrl()（https URL→`intent://host/path#Intent;scheme=https;action=android.intent.action.VIEW;end`，WebView shouldOverrideUrlLoading 遇非 http scheme 自动 startActivity 交系统 ACTION_VIEW 解析→拉起系统浏览器打开原 https 直链→浏览器原生下载 APK）；/friend 落地页：triggerDownload 壳感知分流（壳内 intent://+Toast「正在打开系统浏览器下载」；浏览器保持 location.href 直下）+顶部「正在为您升级新版本」引导卡（点击下载按钮将自动打开系统浏览器/下载完成后下拉通知栏点击安装）+「下载没反应？复制下载链接」兜底按钮（navigator.clipboard 优先+textarea execCommand 降级，复制后任意浏览器粘贴可下）+triggerDownload 解除 downloadTriggered 单次限制（允许重试）+加好友卡条件 isLoggedIn→isLoggedIn&&referrerId（无 ref 登录态直接展示下载卡，假转圈消灭）；/download 页 handleDownloadAPK 同步壳感知；AppUpgradeChecker.handleUpgrade：sessionStorage DISMISS_KEY 标记+setDismissed（弹窗循环消灭）+壳内 window.open 改 location.href（多窗支持关闭时 window.open 行为不可控）统一进落地页由其壳感知逻辑接管；③**原生永久修复（APK v25.0.55/2055）**——MainActivity.java 由空 BridgeActivity 升级：onResume 注册 DownloadListener（onDownloadStart 交系统 DownloadManager：仅 http(s)、apk MIME 纠正 application/vnd.android.package-archive、CookieManager cookie+UA 透传、VISIBILITY_VISIBLE_NOTIFY_COMPLETED 通知栏进度、URLUtil.guessFileName 落公共 Downloads 目录、异常静默由 web 层 intent:// 兜底双保险），未来任意壳内下载链路不再卡死；android/app/build.gradle versionCode 2055/versionName 25.0.55；④**交付链**——web：commit 258f8bc→GitHub push→bundle 6.7KB 同步服务器源码仓→build.sh 构建（buildId v25.0.47_29_D20260825+特征门禁：复制下载链接 1/intent 2/升级引导卡 1 chunks 全入包）→releases/v25.0.47_29 发布+双软链切流（/root/yandaoguoxue/current+releases/current）+nginx reload→公网验证（version.json v29+/friend//download//profile/ 200+chunks 特征线上命中：复制下载链接 1 chunk+intent:// 1 chunk）；APK：commit a3f43c7 构建脚本 scripts/build_android_v25_0_55.sh（前置校验：out/ 为 v25.0.47_29+versionCode 2055+versionName 25.0.55+MainActivity 含 setDownloadListener→资源同步 assets/public→写 app-native.json 2055→Gradle 8.9 assembleRelease 自动签名 11,499,405 字节→APK 验证：内置 app-native.json versionCode 2055+内置 version.json v29+**dex 内 setDownloadListener 符号命中**+四项特征 chunks[复制下载链接/正在为您升级新版本/当前已是最新版本/latest.apk]全中→三文件分发 yandao-guoxue-v25.0.55-release.apk+guoxue-chuancheng.apk+latest.apk 同 MD5 bf050537c615cefcdb5eb7923d650d74→app-release-config.json 2055+四条升级说明→公网 latest.apk size 逐字节一致+app-version 接口 2055）；⑤**公告栏**——announcements.json 新增置顶「🎉 新版 v25.0.55 发布：升级下载问题彻底修复」（彻底修复升级下载卡住/修复升级弹窗重复出现/下载页新增复制兜底/保留 v25.0.54 全部功能），旧 {APP_VERSION} 占位公告取消置顶（自动渲染 25.0.55），公网 /api/announcements/public 验证生效；⑥**本地归档**——核心文档/APK安装包/言道国学_v25.0.55_2055_离线完整包.apk（11,499,405 字节 MD5 bf050537 与线上一致）；⑦**用户侧验证路径**——老板老壳手机：打开 APP→弹升级窗（点击后不再重复弹）→立即升级→/friend 自动 intent:// 打开系统浏览器→浏览器下载 latest.apk v25.0.55→下拉通知栏安装→之后检查更新原生通道「当前已是最新版本 v25.0.55」；v25.0.54 内置壳用户：启动弹窗→升级→新壳 DownloadListener 直接系统下载器下载（通知栏进度）安装；若手机无默认浏览器 intent 失败→「复制下载链接」按钮手动兜底 |
| **v25.0.47_28** | 08-25 | **FIX-V28-LEGACY-SHELL-RESCUE server.url 老壳救援——检查更新「点击没用」二次报告根治（代码提交 27b1bc7，四端一致：本地=GitHub=服务器源码仓=生产运行目录；纯 web 发版，APK 2054 仍为最新无需重建）**：①**根因确诊（截图证据链推理）**——用户二次报告「手机APP还是不能更新，点击更新按键没有用」，截图显示页脚 v25.0.47_27 + 检查更新子文案「当前已是最新版本 v25.0.47_27」：该文案带 v 前缀为网页通道格式（v27 原生通道应显示 APK versionName 25.0.54），且 v25.0.53 内置壳页脚应为 v25.0.47_26 → 确证用户手机为 **server.url 老壳**（v25.0.47_3 及更早，versionCode≤2047，capacitor.config 曾用 server.url 直载线上页面，v25.0.47_4 起改内置资源模式）：该壳本地无 app-native.json → v27 双通道探测文件 404 落入网页通道 → 壳内 /version.json 走线上与运行版本恒等 → 永远「已是最新」；AppUpgradeChecker 同因静默退出升级弹窗永不触发 → **APK 本体永久停留老版本而页面内容一直跟随线上更新（极具迷惑性，用户感知「内容是新的但更新不了」）**；git 考古佐证：commit 6bbcaf8（v25.0.47_4）「capacitor 移除 server.url 切内置资源模式」；②**修复（新增 src/lib/nativeDetect.ts 统一探测三通道，两入口共用）**——detectNativeShell()：优先 fetch /app-native.json（内置资源壳≥2048 精确 versionCode）→ 404 时 window.Capacitor.isNativePlatform() 桥判定（Capacitor 桥在任何时代 APK 壳内必注入、浏览器必不存在，唯一可靠判据；项目未装 @capacitor/app/device 插件，故用桥存在性而非插件取版本）→ 桥存在即老壳（versionCode 未知但必然≤2047）→ fetchLatestRelease() 拉 /api/public/app-version，LEGACY_SHELL_MAX_CODE=2047 判定必然过时；**handleCheckUpdate 三通道化**（src/app/profile/page.tsx）：老壳点击 → Toast「检测到 APP 版本过旧，正在打开下载页，请下载安装 v25.0.54…」+900ms location.href 跳 downloadPage → latest.apk 覆盖安装一步转正为内置资源壳；**AppUpgradeChecker 同步接入**（src/components/AppUpgradeChecker.tsx 重构为消费 nativeDetect）：老壳启动 3s/回前台自动弹「发现新版本」窗（副标题「检测到旧版 APP，最新版本 v25.0.54」），存量老壳用户打开 APP 即收到升级引导无需任何手动操作；内置壳/浏览器行为与 v27 完全一致零回归；③**单一分发源复核（用户指令「所有下载APP的包括更新的全部指向一个地方，置换版本就在这一个地方上传」）**——全站唯一 APK 地址 https://yandaoguoxue.yandao.vip/app-download/latest.apk：/friend、/download 落地页（运行时动态 downloadUrl+APK_URL_FALLBACK 双保险）、检查更新跳转、AppUpgradeChecker 立即升级、app-release-config.json downloadUrl 全部指向同一地址；www.yandao.vip 服务器目录仅 app-download 分发无独立官网 HTML；发新版本唯一动作=替换 latest.apk+更新 app-release-config.json（服务器构建脚本全自动：正式包名+guoxue-chuancheng 存量别名+latest.apk 三文件同 MD5 分发）；④**交付链**——本地 tsc 快检（三改动文件零报错，存量 5 处类型错误与本版无关）→ commit 27b1bc7 → GitHub push → bundle 5.4KB 同步服务器源码仓 → build.sh 构建 46s（烧录 buildId v25.0.47_28_D20260825+特征门禁全入包：老壳救援文案「检测到 APP 版本过旧」1 chunk/isNativePlatform 8 chunks/2047 8 chunks/「当前已是最新版本」1 chunk）→ releases/v25.0.47_28 发布 → **切流纠偏**（首次 ln releases/current 软链后公网仍 v27，nginx -T 诊断发现 root=/root/yandaoguoxue/current，正确 ln -sfn 切换+reload 即生效——排查记录入基础设施表）→ 公网验证全绿：version.json v28+/、/friend/、/download/、/profile/、/membership/ 全 200（无斜杠 301 为 trailingSlash 规范重定向历史行为）+/profile 线上 chunks 救援代码命中（chunks/1ht61owrlnjrs.js）+latest.apk 200 MD5 665dfc0c 一致+app-version 2054 不变；⑤**用户侧验证路径**——老板手机（老壳）重新打开 APP：启动 3 秒自动弹「发现新版本·检测到旧版 APP」→ 点立即升级 → 下载页拉 latest.apk → 安装 v25.0.54 → 之后检查更新走原生通道显示「当前已是最新版本 v25.0.54」；若手机本是浏览器访问则无需任何操作（网页已是最新） |
| **v25.0.47_27** | 08-25 | **FIX-V27-CHECK-UPDATE 「检查更新」按钮点击无反应根治（代码提交 4acfe0f，四端一致：本地=GitHub=服务器源码仓=生产运行目录；APK v25.0.54/versionCode 2054 离线完整包发布）**：①**根因**——用户报告「v25.0.47_26 版本点检查更新没反应不能自动更新」：APK 原生壳内旧 handleCheckUpdate fetch `/version.json` 走本地内置资源（native-api-patch 仅改写 `/api/` 前缀，非 /api/ 请求全部命中本地 assets），本地 buildId 恒等于运行 buildId → 永远判定「已是最新」且子文案无变化无 Toast，用户感知「点了没反应」；网页版逻辑正常（同源对比），纯 APK 壳内缺陷；②**修复（src/app/profile/page.tsx 重写 handleCheckUpdate 双通道+接入全站 showToast）**——通道一（原生壳）：fetch `/app-native.json`（仅 APK 内置存在，网页 404 → 自动落入通道二）→ fetch `/api/public/app-version`（壳内被改写到线上）→ latestVersionCode > native.versionCode：setUpdateCheck 显示「发现新版本 vX」+Toast「发现新版本 vX，正在打开下载页…」+700ms 后 location.href 跳 downloadPage（/friend 落地页，自动拉 latest.apk 下载）一键覆盖安装；等于：Toast「当前已是最新版本 vXX」；接口 200 但无 data / fetch 异常：Toast 明确报错（版本服务暂不可用/网络异常）——所有分支必有可见反馈；通道二（网页版）：保留 version.json 对比（remote≠running → Toast+reloadWithCachePurge 清缓存刷新一步完成，sessionStorage yandao_updated_to 配合 VersionChecker 刷新后展示「已更新至最新版本」）；③**版本号同步**——package.json+public/version.json v25.0.47_27；android/app/build.gradle versionCode 2054/versionName 25.0.54；④**交付链**——GitHub push 4acfe0f（服务器直连 GitHub 超时改 git bundle 增量同步）→ 服务器 build.sh 构建（buildId v25.0.47_27_D20260825 烧录+产物含「正在打开下载页」「当前已是最新版本」特征各 1 chunk 门禁）→ releases/v25.0.47_27+current 切流+nginx reload → APK 构建（Gradle 8.9+JDK21 assembleRelease 自动签名+apksigner 验签 CN=Yandao SHA-256 8ca0c414…+内置六项关键代码检查[当前已是最新版本/正在打开下载页/发现新版本/申请成为渠道合伙人/累计培养奖励/latest.apk]全命中）→ 三文件分发 yandao-guoxue-v25.0.54-release.apk+guoxue-chuancheng-v1.0-release.apk+latest.apk（MD5 一致 665dfc0c639f72f3b9eb2dcfc3db8691，11,498,053 字节）→ app-release-config.json 2054+四条升级说明 → 公网三直链 200+MIME application/vnd.android.package-archive；⑤**公告栏**——置顶公告更新为 v25.0.54（{APP_VERSION} 占位符自动渲染），内容含修复说明+合伙人体系+侧滑返回+双更新入口（自动弹窗/我的→检查更新）；旧 v25.0.51 公告已取消置顶；⑥**本地归档**——核心文档/APK安装包/言道国学_v25.0.54_2054_离线完整包.apk（MD5 与线上一致）；⑦**存量用户升级路径**——v25.0.48~v25.0.53 旧 APK 启动即被 AppUpgradeChecker 自动弹窗引导升级至 2054；v25.0.53 用户亦可「我的→检查更新」手动触发（本版修复的正是该入口在壳内的静默缺陷） |
| **v25.0.47_26** | 08-24 | **DEV-V22-PARTNER-V2-BACKSWIPE 合伙人渠道体系V2 + APK双侧侧滑返回（代码提交 783f517+c68b899+692ca0c，四端一致：本地=GitHub=服务器源码仓=生产运行目录；APK v25.0.53/versionCode 2053 离线完整包发布）**：①**合伙人引擎 partnerEngine.js**（partners 申请审核表+partner_order_log 逐单成本留痕+partner_settlements 月度结算单；结算唯一口径：渠道净收入=用户实付-支付手续费[0.6%可调]-应用商店抽成[APK微信支付不经商店=0]-AI调用成本估算率[10%可调]-该订单普通两级分销佣金[一级15%+二级5%实发口径]；基础佣金=净收入×50%+直属培养奖励=直属一级下级每笔净收入×5%[平台留存全额承担不扣下级分成]+平台保底45%；每月1号调度器自动生成上月结算单PENDING_REVIEW→财务审核转可提现→每月16日-月末提现与普通佣金同节点走微信商家转账；渠道归属沿 invited_by 任意深度向上找最近已开通合伙人[遇下级合伙人节点即截止归下级渠道]；合伙人推荐关系仅直属一级绑定隔代不绑定；防作弊禁自推/禁互推环/禁重复申请改绑/异常订单超管标记INVALID自动扣回）；②**partnerRoutes.js 用户端+管理端双API**（用户端 /api/partner 六页数据全脱敏 maskPhone 136****4128/maskUserId 禁导出禁完整联系方式禁微信身份信息；管理端 /api/admin/partner 全量列表/审核开通驳回禁用/等级NORMAL·CORE升降/改上级SUPER_ADMIN专属/完整用户明细/渠道总览/用户层级树/合伙人关系树/结算单审核驳回调整/风控标记/参数配置，adminAuth 三级角色+audit 全程留痕）；③**paymentRoutes 支付钩子**（订单PAID后 grantPartnerCommission 幂等入账FROZEN+退款 reversePartnerCommission 按退款金额/订单实付毛额比例冲正、全额退款整单REVERSED）；④**前端合伙人工作台 /profile/partner 六页**（数据概览八指标+近7/30日趋势/我的用户脱敏筛选排序/我的合伙人直属列表+月度业绩奖励明细/佣金明细[基础+培养+提现记录]/推广物料[专属邀请码+链接+3套海报+招募合伙人专属海报扫码自动绑推荐关系]/权益说明[等级+比例+周期+核心合伙人白牌贴牌定制APK高阶权益]）+申请页 apply+三入口（invite落地页/promote推广中心底部/profile个人中心）；⑤**超管 /admin/partners 四模块**（合伙人管理/传播链路追溯[渠道总览+用户层级树+合伙人关系树]/结算管理/风控审计）；⑥**APK 双侧边缘侧滑返回 useSwipeBack 升级**（双侧边缘20dp触发区+完成阈值1/3屏宽+阻尼跟手动画+半透明遮罩返回箭头渐进+首页五Tab主页与登录注册页排除+横向滚动组件轮播横滑列表豁免+多指/垂直滚动>50px取消+与系统返回键底部导航并存）；⑦**E2E 全链路 74 PASS/0 FAIL**（申请→推荐绑定→审核→渠道归属含隔代截止→分佣金额精确到分→全额/部分退款冲正→月度出账→审核转可提现→数据看板→脱敏校验→风控标记扣回；生产库副本/tmp隔离运行零写入）+存量13页面4端点回归全绿；⑧**APK v25.0.53(2053) 离线完整包**（服务器构建链 bash build.sh→cp -a out www→npx cap sync android→gradle assembleRelease[Gradle 8.9+JDK21+签名恢复]→发布 yandao-guoxue-v25.0.53-release.apk+latest.apk+别名guoxue-chuancheng-v1.0-release.apk三文件同源，app-release-config.json latestVersionCode 2053 触发存量用户升级弹窗，内置资源无 server.url 离线可浏览）+**Codemagic android-workflow 云构建就绪**（codemagic.yaml：npm ci→build.sh→www+cap sync→ANDROID_KEYSTORE_B64解码恢复keystore→gradlew assembleRelease→aapt badging+jarsigner签名校验→产物app-release.apk；一次性配置Codemagic控制台加密变量ANDROID_KEYSTORE_B64，值存核心文档06_Codemagic_ANDROID_KEYSTORE_B64.txt） |
| **v25.0.47_25** | 08-24 | **ADMIN-USER-PAGER 后台用户列表分页浏览全部（代码提交 4d26aac，四端一致：本地=GitHub=服务器源码仓=生产运行目录；发布脚本 release_v25_0_47_25.sh 内容门禁 6 项全过[buildId v25 烧录/全部显示选项/条每页选择/上一页按钮/v24 搜索 placeholder 回归/IP 脱敏 0]+后端同步+PM2 重启健康检查+公网 7 路径 200+鉴权 401 复核；**本版含后端变更**：adminUnifiedRoutes.js size 上限 Math.min(50→500) 同步 /www/yandaoguoxue-backend+pm2 restart；APP 经 Capacitor server.url 直载线上页面无需重建 APK）**：①**分页控件（用户反馈「后台的用户列表，不能全部显示的吗？应该是多少页全部显示吧」）——用户管理表格下方新增 Pager 组件：「共 N 条 · 第 X/Y 页」概览+上一页/页码窗口按钮（totalPages≤7 全显，>7 显示首尾页+当前页±1 中间省略号）/下一页+每页条数下拉（20/50/100 条/页/全部显示=500）；当前页高亮紫底白字、首末页边界禁用置灰（opacity 0.4）；页码点击/翻页/条数切换即时调接口加载，搜索（Enter/按钮）自动重置第 1 页；fetchModerationUsers 增加 size 参数透传；②**后端 size 上限 50→500**：「全部显示」一页拉全量（当前 49 用户单页全览）；③**公网 E2E 实测 16 PASS/0 FAIL（scripts/test_v25_live.js，管理员密钥注入）**——分页控件四要素可见（概览/上一页/下一页/条数选择器）、接口 page=1&size=20 返回 20 条（total=49）、page=2 首条 user_id=100064≠第 1 页首条 910083（翻页数据正确切换）、末页 9 条=49-2×20（分页边界正确）、size=500 返回 49 条=总数（全部拉取）、页面点击「下一页」概览变第 2/3 页+表格数据切换、点击页码 1 跳回第 1 页、切「全部显示」表格 49 行=总数+概览第 1/1 页、v24 回归（表头手机号/邮箱列仍在+完整 11 位手机号渲染无脱敏星号）；④截图证据 .test-shots/v25-pager-default.png（默认 20 条/页第 1/3 页）/v25-pager-page2.png（第 2 页）/v25-pager-all.png（全部显示 49 条一页全览+分页概览 1/1） |
| **v25.0.47_24** | 08-24 | **ADMIN-USER-INFO-ZOOM-OFF 后台用户完整注册信息+屏幕放大默认关闭（代码提交 1aceff0，四端一致：本地=GitHub=服务器源码仓=生产运行目录；发布脚本 release_v25_0_47_24.sh 内容门禁 5 项全过[buildId v24 烧录/搜索 placeholder 手机号邮箱/zoom 开关键/屏幕放大文案/IP 脱敏 0]+后端同步+PM2 重启健康检查+公网 8 路径 200+鉴权 401 复核；**本版含后端变更**：adminUnifiedRoutes.js scp 前先 git pull 同步至 /root/yandaoguoxue-source 再 cp 到 /www/yandaoguoxue-backend + pm2 restart；APP 经 Capacitor server.url 直载线上页面无需重建 APK）**：①**后台用户管理完整注册信息（用户反馈「后台需要可以看到用户的注册信息，完整手机号码或者注册邮箱」）**——/admin/moderation 用户 tab 表格新增「手机号」「邮箱」两列（原仅 ID/昵称/状态/禁言至/最近登录/操作 6 列，注册信息完全不可见）；后端 /api/admin/unified/moderation/users 去脱敏直出（原 `phone: r.phone ? r.phone.slice(0, 3) + '****' + r.phone.slice(-4) : ''` 脱敏改为完整返回 phone+email 两字段，后台已鉴权 SUPPORT_ADMIN/ops 运营角色）；搜索框升级「搜索昵称 / 用户ID / 手机号 / 邮箱」（非数字查询 where 由 nickname/phone 两字段扩为 nickname/phone/email 三字段 LIKE）；②**屏幕放大默认关闭（用户反馈「个人中心通用这里这个放大缩小的要默认关闭，现在是打开状态」）**——GlobalZoomProvider.tsx 挂载逻辑翻转：`yandao_zoom_disabled` 未设置（新用户/无痕首访）时默认 `zoomDisabled=true` 禁用全部缩放交互（双指捏拉/双击切换/Ctrl+滚轮/拖动查看），仅显式开启（==="0"）才启用并恢复 localStorage 记忆的缩放级别；首次「双指捏拉可放大页面」提示仅在已开启时展示（不再骚扰默认关闭的新用户）；profile/settings/page.tsx zoomEnabled 初始 useState(false)+读取逻辑改 `zd === "0"`；历史用户不受影响（曾开启="0"保持开、曾关闭="1"保持关）；③**公网 E2E 实测 16 PASS/0 FAIL（scripts/test_v24_live.js，管理员密钥注入+真实账号 13612674128）**——[A] 后台：表头手机号/邮箱列可见+搜索 placeholder 含手机号邮箱、接口返回 20 条 18 条含手机号 0 条脱敏（样例 19943724100 完整）、表格渲染完整号码、正则无 `\d{3}\*{4}\d{4}` 脱敏星号、按手机号 13612674128 搜索命中（ID 100029 美好未来）；[B] 放大：无痕登录后设置页屏幕放大默认灰底 rgb(209,213,219) 关闭态、开启后标记=0 重进紫底 rgb(123,47,190) 保持开、关闭后标记=1 重进灰底保持关、无痕首页无首次放大提示弹层；④**工程坑记录**——PowerShell `(Get-Content -Raw) -replace | Set-Content` 会给 package.json 写入 BOM 导致 `npm run build` 的 gen-version.js JSON.parse 失败，用 node 脚本 `s.replace(/^\uFEFF/,'')` 修复（项目已知坑再现，版本号替换改用 node -e 方式最稳） |
| **v25.0.47_23** | 08-24 | **FIX-V23-MEMBER-BUY-GUIDE 会员购买引导即时可见（代码提交 5ad3a37，四端一致：本地=GitHub=服务器源码仓=生产运行目录；发布脚本 release_v25_0_47_23.sh 内容门禁 6 项全过[buildId v23 烧录/fixed 悬浮底栏/132px 占位/plan-section 锚点/safe-area 适配/IP 脱敏 0]+公网验证；v23 纯前端变更[3 文件无 backend_deploy 业务变更]后端不重启仅健康检查；APP 经 Capacitor server.url 直载线上页面无需重建 APK）**：①**「立即开通」按钮 fixed 悬浮底栏（核心修复）**——用户长期反馈「商业中心会员中心的会员按键点击后无购买引导」根因：按钮位于页面文档流最底部（会员权益介绍/兑换码/订单记录等多屏内容之后），用户点击会员卡片选中档位后需滚动多屏才能看到开通按钮，感知为「点了没反应」；修复：按钮容器改 position:fixed+left/right:0+bottom:calc(var(--bottom-nav-height,56px)+env(safe-area-inset-bottom,0px))+zIndex:1001+boxShadow 上投影（白底+顶部描边），**任何滚动位置恒定悬浮于底部导航上方**，点击卡片→按钮文案即时联动（「立即开通 · ¥37/99/374/3600」）→无障碍直达支付；132px 文档流占位 div（aria-hidden）抵消 fixed 栏高度防遮挡页面尾部内容（兑换码/订单记录仍可完整浏览）；②**中医区升级入口滚动修复**——会员状态卡「升级会员解锁全部中医功能 →」原 window.scrollTo({top:0}) 仅滚到页面顶部（用户仍需自行寻找套餐区），改为套餐标题 div 新增 id="plan-section"+scrollIntoView({behavior:"smooth",block:"start"}) 精确滚到套餐选择区；③**公网 E2E 实测 17 PASS/0 FAIL（scripts/test_membership_v23_live.js，480×900 移动视口+真实账号 13612674128）**——[1]登录（协议勾选 label:has-text("登录即同意") input[type=checkbox]+拦截/登录态校验）；[2]会员页未滚动按钮视口内可见（boundingBox y=782≤900）；[3]点击月度会员卡片按钮文案即时联动「立即开通 · ¥37」；[4]滚动 1800px 按钮位置恒定 y=782（fixed 生效）；[5]点击开通→支付二维码弹窗（「请使用微信扫一扫付款」+月度会员 ¥37.00）+取消支付可关闭弹窗；[6]四档位价格 SSOT 动态断言（测试脚本运行时 fetch /api/public/pricing 动态取服务端价 37/99/374/3600 作基准，后台改价不误报；修正本地旧常量 199/499 过时断言）；[7]未登录（无痕新上下文）按钮 fixed 可见+点击弹出登录引导；④**配套脚本三份**——test_membership_fixed_v23.js（修复前公网取证：证实按钮 y 超出视口）、test_v23_local_preview.js（本地构建预演）、test_membership_v23_live.js（公网实测权威版）；⑤**发布与验收（release_v25_0_47_23.sh）**——服务器 IP 校验（hostname -I 含 82.156.228.87）+内容门禁 6 项（grep 无匹配 pipefail 静默退出坑已修：`\|\| true` 兜底）+tar 解压 releases/v25.0.47_23+current 软链切换+nginx 缓存清理+公网验证（version.json v25.0.47_23_D20260824+membership 200+按钮 fixed 样式入包） |
| **v25.0.47_22** | 08-24 | **MARKETING-POSTER-V2-AI 邀请裂变海报营销化升级+AI智能文案生成（代码提交 c2e3741+d1eaf27，四端一致：本地=GitHub=服务器源码仓=生产运行目录；发布脚本 release_v25_0_47_22.sh 内容门禁 8 项全过+公网 16 路径 200；v22 纯前端变更[9 文件无 backend_deploy 变更]后端不重启仅健康检查；APP 经 Capacitor server.url 直载线上页面无需重建 APK）**：①**三套社交裂变模板全量重构（viralTemplates.ts）**——朋友圈种草版（默认）：主标题「私藏很久的国学宝藏工具，终于舍得分享了」+副标题两行「命理排盘 · 中医养生 · 典籍查询／手机里就能用的传统文化百宝箱」+4条✅结果型卖点（14款专业排盘工具新手一眼看懂/中医智能问诊+千年典籍库随身参考/无冗余广告纯工具纯内容/不用下载APP扫码直接免费使用）+🎁福利行动召唤条「扫码注册即得免费AI解析次数／每日签到还能领积分兑权益」；社群引流版：主标题「免费！专业级国学工具平台」+副标题「一次解锁 · 命理排盘 + 中医学习 两大板块」+【易学工具】【中医学习】两栏分组6条▪卖点+qrNote「永久免费基础功能 · 无强制广告」；学习进阶版：主标题「你的随身国学学习助手」+副标题「从排盘工具到中医典籍，系统化学习更高效」+📚🎯📝💡4条学习价值点+「适合爱好者/从业者/学生党」人群标注；②**渲染引擎视觉规范升级（posterEngine.ts）**——主标题字号≤海报宽度1/8加粗自适应两行（maxTitleSize=w/8）+视觉重心靠上；二维码尺寸≥海报宽度1/4（280unit，C09长图340）四周留白保障长按识别率；CTA行动召唤上置二维码上方+标注/邀请码/福利条依次在下（三模板统一结构）；行动召唤条浅底福利条（accent 12%透明度圆角条）；合规小字#AAAAAA置最底；副标题\n显式两行+防溢出换行；两栏分组卖点卡片渲染（pointGroups）；dense紧凑排版（h/w≤1.4自动压缩段间距/卖点行距/福利条间距，修复3:4下福利条压合规底栏重叠，9:16不受影响）；benefitLine/qrNote/pointGroups纳入合规校验（renderPoster validateCopySet全字段）；③**裂变海报比例修复**——renderViralPoster+buildViralRecs两处由R9_16（1080×1920）改R3_4（1080×1440）对齐指令「3:4竖版适配朋友圈/社群转发」规范；④**模板底色统一米色国风**——社群引流版（原深紫星空T03）改米色赭红T02、学习进阶版（原浅绿T05）改米色墨绿；模板切换按钮shortName更名（种草版→朋友圈种草/引流版→社群引流/学习版→学习进阶）；⑤**AI智能文案生成（aiCopy.ts新增）**——内置营销提示词（角色=资深国学领域营销文案专家+社交裂变自然分享无硬广感+核心卖点[14款排盘/中医典籍+智能问诊/无广告/扫码即用/免费基础]+合规约束[禁封建迷信/传统文化学习参考定位/不涉医疗诊断承诺]+行式输出格式）3风格并行生成（朋友种草风/专业干货风/简洁直接风）+行式解析（中英冒号兼容）+敏感词过滤逐套丢弃+3套内置兜底文案（AI不可用保底）；邀请页+AI推广助手页「✨AI换文案」按钮+底部弹层3风格卡片预览+一键应用实时重渲染（applyAiCopyToCopySet前端实时无需刷新）+「再来一组」无限刷新+「恢复模板文案」；系统分享优先已应用AI配文；⑥**分享文案库三场景升级**——朋友圈种草长文案（有代入感）/社群引流短文案（短平快讲功能）/私聊好友文案（信任感带福利）一键复制；⑦**配套与验收**——scripts/test_poster_v22.ts合规测试（三模板+文案库+AI兜底全合规）+test_poster_v22_live.js公网E2E（真实账号13612674128：登录/三模板切换/海报3:4尺寸断言/AI换文案生成→应用→再来一组→恢复/保存下载/三场景文案库，17 PASS/0 FAIL）+test_poster_wizard_v22.js AI推广助手4步向导（生成海报步骤AI按钮可见+3:4海报渲染正常）+preview_poster_local.js本地预演（三模板1080×1440 PNG导出目检）；发布门禁：buildId v22烧录/AI换文案按钮/三模板主标题/再来一组/二维码标注/福利条入包+IP脱敏0；公网验证16路径200+AI代理路由200+支付/订单回归OK |
| **v25.0.47_21** | 08-23 | **FIX-V21-PAY-VERSION-CACHE-FINAL 四大核心闭环（代码提交 527914a，四端一致：本地=GitHub=服务器源码仓=生产运行目录；发布脚本 release_v25_0_47_21.sh 内容门禁 11 项全过+公网验证 16 路径全 200）**：①**会员支付链路修复**——根因：旧登录态 localStorage userId 为数字，后端 /api/payment/create 强制字符串（length≥4），数字返回「用户ID无效」→ 会员页点开通无二维码；修复：auth.ts normalizeLegacyProfile（getLoginState/getUserProfile 数字→字符串）+paymentService getCurrentUserId 强制 String(uid)；会员页 payError 支付失败弹窗（明确报错禁止静默）+needLogin 登录引导弹窗（sessionStorage yandao_membership_autopay 保留档位+登录回跳 /membership?autopay=1 自动唤起支付）；E2E 实测（scripts/test_pay_v21.js，真实账号 13612674128）：未登录引导弹窗 PASS→登录 userId="100029" string→月度档「立即开通 · ¥37」→微信付款二维码弹窗 PASS→/api/payment/create 返回 codeUrl+订单落库；②**版本号单一数据源**——announcementRoutes.js getVersionPlaceholders/applyVersionPlaceholders（{APP_VERSION}←app-release-config.json、{WEB_VERSION}←current/version.json 实时替换，公网实测公告占位符零残留）；后台公告管理页占位符使用提示；个人中心检查更新点击即触发 reloadWithCachePurge 强刷+更新完成提示（yandao_updated_to）；adminUnifiedRoutes overview 双版本 version+appVersion；后台仪表盘显示「Web v25.0.47_21 + APP v25.0.52」；③**后台订单中心**——paymentRoutes user_orders 新增 transaction_id 列（ALTER TABLE 增量迁移+下单持久化）；adminUnifiedRoutes /orders 增强（LEFT JOIN users 手机号/昵称+邀请人昵称/手机号+返佣状态+status/dateFrom/dateTo 筛选+分页）+/orders/export CSV（UTF-8 BOM Excel 直开，表头含微信交易号/邀请人，审计留痕）；权限 adminAuthUnified('FINANCE_ADMIN','finance')（无密钥 401 公网实测）；admin/orders/page.tsx 11 列订单表+日期区间筛选+导出按钮；仪表盘「今日实付金额」卡片 sub「点击查看谁付费」onClick 跳转 /admin/orders?status=PAID；E2E 实测（scripts/test_admin_orders_v21.js）：用户手机号列/脱敏手机号/微信交易号列/邀请人列/导出按钮/仪表盘跳转+自动带 PENDING 筛选全 PASS；公网 API 实测：订单含 inviter_nickname/inviter_phone/rebateStatus 字段、CSV 导出 200；④**缓存机制升级**——VersionChecker.tsx 30 秒轮询（POLL_INTERVAL_MS=30000+visibilitychange 立即检查）+悬浮更新提示「发现新版本，点击立即更新」+点击 reloadWithCachePurge（清 CacheStorage+注销 SW+强刷一步）+UpdatedToast 更新完成提示；Next.js 静态资源内容哈希强制新文件名；⑤**配套**——backend_deploy/paymentRoutes.js transaction_id 迁移+17 文件后端同步+pm2 重启触发迁移；发布门禁：buildId v21 烧录/支付失败弹窗/登录引导/autopay/订单导出/交易号列/邀请人列/悬浮更新/更新完成提示/清缓存 getRegistrations 全入包+IP 脱敏 0；公网验证：version.json v21/公告占位符替换/订单 401 鉴权/订单列表/CSV 导出/支付下单 web+wechat 双通道 codeUrl/数字 userId 拒绝/价格 SSOT/升级接口/功能开关全 PASS；回归（scripts/test_regression_v21.js+test_poster_logged_v21.js）：首页公告栏+四柱白底红字+顶部无死键/关键页面 200/海报页登录态 4 步向导+保存入口正常 |
| **v25.0.47_20** | 08-23 | **首页死键清理+四柱高对比+更新自动清缓存（代码提交 b646a65，公网验证全 YES）**：①首页顶部移除刷新/齿轮两个死键按钮（齿轮无 onClick 纯摆设、刷新与自动刷新机制冲突，均删除并清理无用图标组件，顶部仅保留品牌标识）；②日期四柱改白底红字高对比（白色圆角卡片 #ffffff+干支红字 #C62828 加粗+标签深灰 #333333，替换深蓝底五行彩色低对比旧版，年月日时一眼看清）；③版本更新彻底清缓存（新增 src/lib/cachePurge.ts 清 CacheStorage+注销 Service Worker 再 reload，不碰 localStorage 保留登录态；AppUpgradeChecker 自动刷新/VersionChecker 自动+手动/个人中心检查更新三处统一接入）；④后台抽屉导航容器显式定宽 240px（修复 position:fixed aside 不撑父容器导致 translateX(-100%) 位移量为 0、抽屉桌面端不收起的根因）；⑤APK v25.0.52（versionCode 2051→2052，adf614e）内置 v25.0.47_20 资源同步以上修复，app-release-config 升级 2052 触发存量升级提示 |
| **v25.0.47_19** | 08-23 | **公告栏永久功能+APK 下载链接统一（代码提交 2684445，14 项门禁）**：①官方公告栏（首页顶部公告条+轮播+列表弹窗，未登录可见；AnnouncementBar 组件+/api/announcements/public 接口；后端 announcementRoutes.js 增删改查+置顶/定时/过期+三级角色鉴权；后台公告管理页+导航入口）解决用户长期不登录错过升级通知；②APK 下载链接全站统一 /app-download/latest.apk 永久固定名（friend/download 落地页兜底+appVersionRoutes 默认配置+APK 构建脚本 latest.apk 别名，发新包一处撤换全部自动指向）；③后台修复：useToast 的 show 用 useCallback 稳定（修复资讯/订单/分佣页无限加载闪烁）、系统状态页防御式字段访问（修复白屏）、营销海报配置 data/config 字段兼容（修复加载失败）；④排盘分享二维码弹窗营销化（品牌渐变头部+扫码指引+三卖点卡片+行动召唤，与海报同源文案）；⑤APK v25.0.51（versionCode 2051）；⑥download 页版本号/日期动态化 |
| **v25.0.47_18** | 08-23 | **搜索高对比+购买登录引导+网页版自动刷新（代码提交 293bae6）**：①典籍搜索框三处高对比改版（白底白边输入框+金色 #FFC107 深紫字搜索按钮+阴影，替换紫底紫字隐形按钮；引导性 placeholder「输入关键词，如：脉诊、桂枝」；书籍详情页筛选框同款+清除按钮+匹配计数提示；搜索结果统计行紫底卡片化+命中数橙红加粗+黄色高亮说明）；②会员购买未登录升级全屏登录引导弹窗（替代按钮上方小字条，图标+说明+立即登录/暂不登录双按钮）；③AppUpgradeChecker 新增网页版版本自动刷新（sessionStorage 基准+60 秒轮询 version.json，部署新版后旧标签页 ≤60s 自动 reload；APK 内不受影响）；④APK v25.0.50（versionCode 2050） |
| **v25.0.47_17** | 08-23 | **FIX-V17-DRAWER-MEMBER-UPDATE-CLASSICS 四大修复（代码提交 f88b12a，四端一致：本地=GitHub=服务器源码仓=生产运行目录）**：①**后台全端统一抽屉导航**——admin/layout.tsx 删除 v16 的 isDesktop 桌面常驻侧栏方案（≥1280 常驻+marginLeft 避让被用户判定为「没有抽屉式」且内容仍被挤压），全端统一抽屉覆盖式：侧边栏固定定位 fixed+left:0+transform:translateX(-100%) 默认收起，顶部汉堡按钮（aria-label「打开导航菜单」）唤出滑入 translateX(0)，遮罩层 position:fixed inset:0 rgba(0,0,0,0.45) zIndex:99 全端显示（点击关闭），内容区 minHeight:100vh 全宽无任何 marginLeft 避让，桌面/移动体验完全一致；②**商业中心会员购买跳转修复**——ZoneItem 组件新增 href?:string 参数（有 href 渲染原生 `<a>` 标签，无则保持 button onClick），会员中心入口 href="/membership/" 原生锚点跳转（不依赖 router.push/JS 执行环境，杜绝「点了没反应」死键），商业中心 Zone 设 defaultOpen 默认展开（storageKey yandao_zone_biz）；③**版本号动态化+系统中心检查更新**——IcpFooter 页脚「言道 v25.0·传承国学文化」硬编码改 fetch /version.json?t=时间戳 cache:no-store 动态读取（fetch 失败兜底 v25.0 文案），系统中心新增「检查更新」ZoneItem（updateCheck 状态机：checking 检查中→result.latest 已是最新/发现新版本，handleCheckUpdate 对比本地 appVersion，发现新版显示品牌色「新版本」角标，点击 window.location.reload() 刷新即升级；配合 v16 AppUpgradeChecker 自动检测双保险），解决「版本号永远显示 v25.0」问题；④**中医典籍混元 AI 全量导入（177 章）**——服务器 /root/tcm_gen 生成管道（gen_classics_core.js 调混元 API 按书分批生成，808 秒完成）产出 12 部典籍：素问补全 24 章/灵枢 16/金匮 16/温病 12/难经 25/神农本草 9+新增濒湖脉学 27/药性赋 5/汤头歌诀 15/千金要方 10/医宗金鉴 8/中藏经 10（含原文+白话提要，平均 200-344 字/章）；合入架构：classicsExtra.ts 外挂模块（CHAPTER_APPENDS 补全映射+EXTRA_BOOKS 新增书数组 160.2KB）+classics.ts buildMergedBooks() 自动合并（getAllBooks/getBookById/getChapterById/searchClassics 四导出函数全走合并数据，内置 CLASSICS_DATA 零改动）；工程细节：merge_classics_extra.js 转换脚本处理书 ID 映射（生成文件名 jingui/shennong→classics.ts 实际书 ID jinkui/bencao，避免补全挂空）+章节序号全局正则扫描现有最大值自动接续（suwen-4 起/jinkui-2 起/nanjing-3 起，杜绝 ID 冲突）；⑤**APK v25.0.49 重建（versionCode 2048→2049）**——build_android_v25_0_49.sh：内置 v25.0.47_17 资源（检查更新/濒湖脉学/汤头歌诀/大医精诚/发现新版本/renderViralPoster/打开导航菜单/下载言道国学APP 8 项关键代码入包全命中），app-release-config.json 更新 latestVersionCode 2049+新版 releaseNotes（四条修复说明）→ 存量 v25.0.48 用户启动即弹升级窗；11.76MB v2 签名；公网直链+别名双 200；⑥**发布与验收（deploy_release_v25_0_47_17.sh）**——内容门禁 v13~v16 全量保留+v17 新增 12 项（isDesktop 零残留/marginLeft 仅允许 auto 角标用法/translateX 抽屉动画/检查更新/handleCheckUpdate/会员 href 锚点/商业中心默认展开/页脚 version.json 动态化/classicsExtra 非空/CHAPTER_APPENDS+EXTRA_BOOKS 合并/濒湖脉学+医宗金鉴数据）全过；构建产物入包：检查更新+濒湖脉学+汤头歌诀+大医精诚+发现新版本+打开导航菜单 6 项入 chunks+烧录 ID v25.0.47_17_D20260823+IP 脱敏 0；发布 releases/v25.0.47_17（1751 文件）+后端 16 文件同步+current 切流+PM2 重启+nginx 缓存清理；公网验证 21 路径全 200+version.json 确认 v25.0.47_17+生产 chunks 典籍数据命中+注册页下载按钮三环境（桌面/iOS Safari UA/微信 UA）+价格 SSOT+功能开关+app-version 接口（2049）+支付三环境下单回归（web/wechat/ios 全 codeUrl）+邀请页 SSR；本地公网独立复验：version.json/app-version 接口/APK 直链 11.22MB/在线 chunk UTF-8 解码 7 部新增典籍全部命中 |
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
| ADMIN_CONTROL_CENTER（统一后台） | VERIFIED（v25.0.47_25 用户列表分页+完整注册信息，累计 E2E 32 PASS） | /admin 全端统一抽屉式导航（v17 删除桌面常驻侧栏方案：默认收起+汉堡「打开导航菜单」唤出+遮罩覆盖，内容区全宽零避让，桌面/移动一致）；adminRoles.js 统一权限模块：SUPER_ADMIN/FINANCE_ADMIN/OPERATOR_ADMIN 服务端强校验（越权 403+审计 AUDIT_BLOCK_*），子密钥 SHA256 哈希存储；公网实测财务密钥越权 5 项全 403、运营密钥越权财务 403；密钥管理页 /admin/keys 签发/禁用子密钥；v25.0.47_25 用户列表分页（共 N 条·第 X/Y 页+上一页/页码/下一页+每页 20/50/100/全部显示，后端 size 上限 500，E2E 16 PASS：翻页数据切换+全部显示 49 行=总数）；v25.0.47_24 用户管理表格「手机号」「邮箱」列完整直出（后端去脱敏，接口鉴权 SUPPORT_ADMIN/ops，无密钥 401），搜索支持昵称/用户ID/手机号/邮箱四字段，E2E 16 PASS |
| TCM_CLASSICS（中医典籍库） | VERIFIED（v25.0.47_17 混元AI全量导入 177 章） | 12 部典籍：素问 27/灵枢 18/伤寒论 1037/金匮 17/温病 13/难经 27/神农本草 10 章+新增濒湖脉学 27/药性赋 5/汤头歌诀 15/千金要方 10/医宗金鉴 8/中藏经 10；classicsExtra.ts 外挂模块（CHAPTER_APPENDS+EXTRA_BOOKS）+classics.ts buildMergedBooks() 自动合并，搜索/阅读/详情四导出函数全走合并数据；公网 chunk UTF-8 实测 7 部新增典籍全命中 |
| WECHAT_PAYMENT（微信支付） | VERIFIED（v25.0.47_23 购买引导 fixed 悬浮底栏+E2E 17 PASS） | wechatPayV3.js 全量（下单/回调验签含公钥模式/解密/查单/关单），WECHAT_APPID=wxedc4b3ff9f707969 已配置；v25.0.47_23 会员购买引导即时可见：「立即开通」fixed 悬浮底栏（zIndex 1001 恒悬底部导航上方，点击会员卡片任何滚动位置无需滚动即见购买引导，132px 占位防遮挡尾部），公网 E2E 17 PASS/0 FAIL（真实账号 13612674128：登录协议勾选→按钮视口 y=782 可见→卡片点击文案联动→滚动 1800px fixed 恒定→二维码弹窗+价格+取消关闭→四档位 SSOT 动态断言 37/99/374/3600→未登录引导）；v25.0.47_21 修复旧登录态数字 userId 根因（auth.ts normalizeLegacyProfile+paymentService 强制 String），真实账号 E2E：会员页月度档点击开通→微信付款二维码弹窗→订单落库全 PASS；支付下单 web/wechat 双通道 codeUrl 公网实测；数字 userId 服务端拒绝「用户ID无效」；支付失败弹窗明确报错+未登录登录引导+登录回跳自动唤起支付；月/季/年/终身四档+B类工具+批量解读+积分充值下单全部走通；JSAPI 保留待公众号参数（WECHAT_APP_SECRET 补齐后微信内自动升级）；iOS 门控 IOS_PAYMENT_ENABLED=true（Native 扫码不依赖平台商店，App Store 审核通过前 iOS 原生壳如需恢复关闭仅改 platformGate.ts 一处） |
| INVITE_POSTER_VIRAL（邀请裂变海报系统） | VERIFIED（v25.0.47_22） | v25.0.47_22 海报营销化升级+AI智能文案生成：三套社交裂变模板（朋友圈种草版4条结果型卖点+福利行动召唤条/社群引流版两栏分组6条卖点+永久免费标注/学习进阶版学习价值点+人群标注）+海报3:4竖版1080×1440+米色国风统一底色+渲染规范（主标题≤宽1/8加粗/二维码≥宽1/4/CTA上置/合规#AAAAAA/dense排版防重叠）；AI换文案（aiCopy.ts 3风格并行生成+敏感词过滤+3套兜底+一键应用实时渲染+再来一组+恢复模板文案）；分享文案库三场景一键复制；公网E2E 17 PASS/0 FAIL（真实账号：三模板切换/3:4尺寸/AI生成应用恢复/保存下载/文案库复制）；v14基础：海报引擎posterEngine.ts全要素画布；裂变分佣规则：邀请注册+50积分/首次付费+200积分，订单分佣一级15%+二级5% |
| P8_COMMISSION_STAGE1（自动分佣记账） | VERIFIED | 生产服务器集成测试 **18/18 PASS**（入账/幂等/比例热更/明细/退款冲正/解冻），测试数据零残留 |
| PARTNER_CHANNEL_V2（合伙人渠道体系V2） | VERIFIED（v25.0.47_26，E2E 74 PASS/0 FAIL） | partnerEngine.js 三表引擎（partners/partner_order_log 逐单成本留痕/partner_settlements）；结算唯一口径：渠道净收入=实付-手续费-商店抽成-AI成本-普通两级佣金，基础佣金50%+直属培养奖励5%（平台承担，不扣下级）+平台保底45%；渠道归属沿 invited_by 任意深度向上找最近已开通合伙人；每月1号自动出账→审核转可提现→16日-月末提现同普通佣金节点；用户端六页全脱敏（136\*\*\*\*4128/用户ID部分隐藏）禁导出；管理端四模块（审核/传播链路树/结算/风控标记INVALID扣回）adminAuth+audit；防作弊：禁自推/禁互推环/禁重复申请改绑；公网实测 /api/partner/my/status 401、/api/admin/partner/partners 401、工作台三页 200 |
| APK_SWIPE_BACK（侧滑返回手势） | VERIFIED（v25.0.53 APK 内置，Web 触屏同步生效） | useSwipeBack+SwipeBackProvider：双侧边缘 20dp 触发区（左缘右滑/右缘左滑）+完成阈值 1/3 屏宽+阻尼跟手动画+半透明遮罩返回箭头渐进显示；首页/五 Tab 主页/登录注册排除；横向滚动容器（轮播/横滑列表）自动豁免；多指/垂直滚动>50px 取消；与系统返回键/底部导航并存（仅手势层 router.back 不拦截系统返回） |
| P8_COMMISSION_STAGE2（提现+商家转账打款） | READY（v25.0.47_13 接口对接完成，配置参数后即可启用） | wechatTransfer.js 商家转账 V3 全量（transfer-batches/回调验签/查单）+ commissionEngine 全自动提现引擎（免审 200 元自动转账/单日 2 万限额/风控/幂等/退款扣回）已上线；WITHDRAW_TRANSFER_ENABLED=false 待商户后台开通「商家转账到零钱」权限后置 true+PM2 重启即启用；公网验证 28 项 PASS（越权拦截/提现拦截/审计/字数全达标） |
| AI_CHAT_PROXY（AI解读全链路） | VERIFIED | RC-04 修复后公网实测双格式 200（systemPrompt/userPrompt 与 messages），上游混元 tokenhub 直连成功；AI配额/会员校验端点正常 |
| LIUYAO_FUSHEN / MEIHUA_FUSHEN | VERIFIED（待用户真机终验） | v25.0.47_3 冒烟 13/13，HexagramRow 统一模型，FuShenCore 共享 |
| GROUP_CHAT（群聊） | VERIFIED（待用户真机终验） | v25.0.47_4：聊天页输入框/发送/右上角群资料入口（成员/邀请/踢人/公告/禁言/转让/退出/解散） |
| DISCOVER_EXTERNAL（发现精选） | VERIFIED | /api/news/public 返回真实资讯+来源标注，AI 摘要标注 |
| ANDROID | VERIFIED（v25.0.53 离线完整包+双侧侧滑返回，2026-08-25 发布） | 原生 APK（内置资源模式，API 改写脚本内联），v2 签名；下载链路公网实测 200：/download 页（latest.apk 固定地址）、/friend 落地页（扫码注册→立即下载APP，正式包+别名双文件）、注册/登录页下载按钮→/friend；升级链路 AppUpgradeChecker+app-release-config.json（latestVersionCode 2053）存量用户自动弹升级窗 |
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

### 5.6 邀请裂变营销体系（v25.0.47_22 海报营销化升级+AI智能文案生成，INVITE_POSTER_VIRAL=VERIFIED）

**核心文件**：src/lib/marketing/viralTemplates.ts（3套社交裂变模板+3场景文案库+AI文案应用编排 applyAiCopyToCopySet）/ posterEngine.ts（Canvas 全要素海报引擎·v22 渲染规范升级）/ aiCopy.ts（v22 新增：AI智能文案生成——营销提示词+3风格并行+敏感词过滤+3套兜底）/ src/app/invite/page.tsx（邀请推广中心·海报卡）/ src/app/invite/poster/page.tsx（AI推广助手）。

**3 套社交裂变海报模板（「换一个风格」循环切换；统一 3:4 竖版 1080×1440+米色国风底色；信息层级：主标题→价值副标题→核心卖点区→二维码行动区→底部合规小字）**：
| 模板 | 主标题 | 调性与结构 | 适用场景 |
|------|--------|------|----------|
| 朋友圈种草版（默认） | 私藏很久的国学宝藏工具，终于舍得分享了 | 朋友私藏分享调性·4条✅结果型卖点+🎁福利行动召唤条 | 朋友圈（社交货币，发圈不违和） |
| 社群引流版 | 免费！专业级国学工具平台 | 【易学工具】【中医学习】两栏分组6条▪卖点+「永久免费基础功能·无强制广告」标注 | 国学群/中医群/命理爱好者群（功能一目了然） |
| 学习进阶版 | 你的随身国学学习助手 | 📚🎯📝💡4条学习价值点+「适合爱好者/从业者/学生党」标注 | 中医学生/备考人群/国学爱好者 |

**AI 智能文案生成（v25.0.47_22 核心差异化，aiCopy.ts）**：「✨AI换文案」按钮（位于「换一个风格」旁）→ 3 风格并行生成（朋友种草风/专业干货风/简洁直接风，每套含海报主标题+副标题+3条卖点+朋友圈配文+社群配文）→ 底部弹层卡片预览 → 一键应用实时重渲染（前端实时无需刷新，海报导出完整包含 AI 文案）→「再来一组」无限刷新 →「恢复模板文案」；内置营销提示词（角色=资深国学领域营销文案专家+社交裂变自然分享无硬广感+核心卖点注入+合规约束：禁封建迷信表述、传统文化学习参考定位、不涉医疗诊断承诺）；敏感词过滤逐套丢弃不合格文案（validateCopySet 全字段校验）；AI 不可用时 3 套内置兜底文案保底；系统分享优先使用已应用的 AI 配文。

**3 场景分享文案库（一键复制）**：①朋友圈种草长文案（有代入感：「最近挖到一个很良心的传统文化工具…扫码就能免费体验👇」）②社群引流短文案（短平快讲功能：「推荐一个免费的国学工具平台，14款排盘工具+中医典籍查询…不用下载APP」）③私聊好友文案（信任感带福利：「你扫码注册试试，咱们都有免费解析次数奖励」）。

**交互**：系统分享 navigator.share 一键带海报图+文案（不支持时自动降级复制文案）；微信内长按海报图兜底保存；合规提示统一 #AAAAAA 最小号置底部不占主视觉；前端不展示任何合规校验类文字（仅开发端可见）。

**海报规格（v25.0.47_22 渲染规范）**：3:4 竖版 1080×1440 全要素画布——米色国风底色+顶部品牌小字（东莞言道科技出品）+主标题（字号≤宽度1/8加粗自适应两行，视觉重心靠上1/3）+价值副标题（\n 显式两行结构）+核心卖点区（行距1.5倍，✅/▪/📚图标对齐；社群版两栏分组卡片）+二维码行动区（尺寸≥宽度1/4，CTA上置+标注/邀请码/福利条依次在下）+底部合规小字（#AAAAAA 最弱化）；dense 紧凑排版（h/w≤1.4 自动压缩段间距/卖点行距/福利条间距，防福利条压合规底栏）；保存主按钮导出完整海报（含全部文案元素，分辨率与清晰度一致），「保存二维码」为辅助按钮。

**裂变分佣规则**：邀请注册 +50 积分、被邀请人首次付费 +200 积分（奖励规则经 /api/auth/invite/link 下发展示）；订单分佣一级 15% + 二级 5%（月度结算：每月最后1天结算→16日起开放提现）；邀请链接 HMAC 签名防伪造（inviteRef+inviteTs+inviteSig），首绑永久生效；同设备/手机号/IP 互荐不计佣。

**下载转化链路（v25.0.47_15 修复收口）**：新用户扫码海报 → /register?ref=xxx（注册页含「下载言道国学APP」按钮，全浏览器 a 标签可点）→ /friend 落地页（未登录非微信环境 0.5s 自动触发下载 + 手动「立即下载APP」兜底按钮；微信/QQ 内显示右上角「···」浏览器打开引导 + 「尝试下载」按钮）→ APK 直链（正式包 yandao-guoxue-v25.0.47-release.apk + 别名 guoxue-chuancheng-v1.0-release.apk 双文件，服务器 /var/www/yandao.vip/app-download/，Nginx alias + MIME application/vnd.android.package-archive + Content-Disposition attachment）。**运维注意：发布新 APK 时必须同步更新别名文件**（cp 新正式包 → guoxue-chuancheng-v1.0-release.apk），否则存量分享海报中的旧链接 404。

### 5.7 合伙人渠道体系 V2（v25.0.47_26 上线，DEV-V22-PARTNER-V2）

**角色与归属**：渠道合伙人由超级管理员审核开通（申请→后台审核队列→开通/驳回）；用户经合伙人渠道注册永久归属（复用 user_invite_relation/users.invited_by，不新建绑定体系）；渠道业绩=该合伙人邀请树全量（任意深度，遇下级合伙人节点即截止下钻归下级渠道）；订单渠道归属=沿 invited_by 向上找最近已开通合伙人（非本人）；合伙人推荐关系仅直属一级绑定有效（甲→乙→丙，甲与丙无关联），隔代不享受奖励；绑定关系永久生效，仅超级管理员可手动调整（/api/admin/partner/partners/:userId/referrer，SUPER_ADMIN 专属+审计）。

**结算唯一口径（禁止多口径）**：
- 渠道净收入 = 用户实付总金额 − 支付渠道手续费(0.6%可调) − 应用商店抽成(APK微信支付不经商店=0) − AI调用成本估算率(10%可调) − 该订单实际产生的普通用户两级分销佣金(一级15%+二级5%，实发口径)
- 合伙人自身渠道佣金 = 渠道净收入 × 50%
- 直属培养奖励 = 直属一级下级合伙人每笔渠道净收入 × 5%（资金来源：平台留存全额承担，不从下级分成扣除，下级50%不受影响）
- 平台保底：存在直属下级合伙人的渠道，平台最低留存渠道净收入 45%
- 逐单留痕：partner_order_log 每单记录实付/手续费/AI成本/普通佣金/净收入/基础佣金/培养奖励七项金额，结算单从留痕聚合生成（杜绝按费率反推的误差）

**结算周期（与普通佣金完全同节点）**：每月 1 号调度器自动生成上月结算单（基础佣金+培养奖励+成本扣除明细，PENDING_REVIEW）→ 财务审核（通过转可提现/驳回/超管手动调整）→ 每月 16 日-月末开放提现，走既有 withdrawals/微信商家转账体系；合伙人佣金入账即 FROZEN，不参与普通佣金 7 天自动解冻，结算单审核通过才转可提现。

**用户端工作台**（/profile/partner，六页）：数据概览（注册/付费/实付/基础佣金/培养奖励/已结算/待结算/可提现+近7/30日趋势）、我的用户（脱敏：手机号中间四位打码 136\*\*\*\*4128+用户ID部分隐藏+注册时间+是否付费+累计消费；支持时间/金额筛选；**禁止导出/禁止完整联系方式/禁止微信身份信息**）、我的合伙人（直属列表+单个月度业绩与奖励明细，不可见其下级用户隐私）、佣金明细（基础佣金逐单+培养奖励逐单+提现记录）、推广物料（专属邀请码/链接/3套海报+招募合伙人专属海报扫码自动绑推荐关系）、权益说明（等级/比例/周期+核心合伙人白牌贴牌定制APK高阶权益）。

**申请入口**：邀请落地页 /invite、推广中心 /profile/promote 底部「申请成为渠道合伙人」；申请页填姓名/联系方式/推广资源/预计规模；经招募海报进入自动绑定推荐人，自主申请无上级。

**超管后台**（/admin/partners，四模块）：合伙人管理（全量列表+审核开通驳回禁用+等级升降 NORMAL·CORE+改上级+完整用户明细）；传播链路追溯（渠道总览注册/付费/流水占比对比+任意用户完整上下级邀请树+合伙人推荐关系树）；结算管理（自动出账列表+审核/驳回/调整+共用财务提现审核流）；风控审计（全部操作留痕+禁自推/禁互推环/异常刷量虚假注册订单标记 INVALID 不计业绩奖励+手动扣回佣金/取消资格）。

**验收**：E2E 全链路 74 PASS / 0 FAIL（申请→绑定→审核→渠道归属含隔代→分佣金额精确到分→全额/部分退款冲正→月度出账→审核转可提现→看板→脱敏→风控标记扣回；生产库副本 /tmp 隔离运行零写入）；公网实测路由鉴权 401/工作台三页 200。


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
| 订单管理 | /admin/orders | **v25.0.47_21 全面升级**：订单列表 11 列（订单号/用户手机号脱敏/类型/金额/状态/渠道/微信交易号/邀请人/返佣/下单支付时间/操作）+状态筛选+日期区间筛选+分页+导出 Excel 报表（CSV UTF-8 BOM 直开，含邀请人/交易号）+真实支付订单（微信交易号/权益交付）+幂等重试发放 + 补单（SUPER_ADMIN+二次确认+原因+审计）；权限仅 SUPER_ADMIN/FINANCE_ADMIN（运营 403）；仪表盘订单卡片点击跳转明细页自动带筛选 |
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

### 8.1 Android ✅ VERIFIED（v25.0.53 / versionCode 2053，2026-08-25 发布）

- 原生内置资源模式：前端静态导出全量打入 APK（webDir www → assets/public，无 server.url），API 经内联改写脚本 native-api-patch.js 指向生产域名——**离线完整安装包**（无网可浏览全部页面，付费/AI 等接口走线上）
- v25.0.53 新增：全页面双侧边缘侧滑返回手势（见功能矩阵 APK_SWIPE_BACK）
- 服务器构建链（/root/yandaoguoxue-source，/opt/android-sdk + Gradle 8.9 + JDK21）：bash build.sh → cp -a out www → npx cap sync android → ./gradlew assembleRelease → 发布分发目录+别名文件+app-release-config.json versionCode 更新（触发存量用户升级弹窗）
- 云构建链（codemagic.yaml android-workflow，linux_x2+node20+java21）：npm ci → build.sh → www+cap sync → ANDROID_KEYSTORE_B64 解码 keystore → gradlew assembleRelease → aapt 版本校验+jarsigner 签名校验 → 产物 app-release.apk；一次性配置：Codemagic 控制台加密变量 ANDROID_KEYSTORE_B64（值=核心文档《06_Codemagic_ANDROID_KEYSTORE_B64.txt》，已 keytool 验证 yandao PrivateKeyEntry 有效）
- 分发：/var/www/yandao.vip/app-download/yandao-guoxue-v25.0.53-release.apk + latest.apk + 别名 guoxue-chuancheng-v1.0-release.apk；历史包 v25.0.47~v25.0.52 保留
- 签名：yandao-release.keystore（SECURE_EXTERNAL_ASSET，仓库根；PKCS12，yandao 别名，SHA256withRSA，有效期 2026-08-09~2126-07-16；wrong-0801.bak 为废弃误签备份勿用；密码见交接报告 SECRET INVENTORY，禁入 Git）
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

---

## 十二、FINAL-PRODUCTION-OPERATIONS-MASTER-SEAL-01 第一阶段（2026-08-29 · 生产事实终检 + 工程纪律封口）

> 依据总指令《FINAL-PRODUCTION-OPERATIONS-MASTER-SEAL-01》第一~二十七部分执行。
> 本阶段 = A.工程纪律封口 + B.生产事实终检 + C.Operations Reality Check 缺失实测。禁止新增大功能。
> 责任红线：NO GUESS / NO DIRTY BUILD / NO HALF DEPLOY / NO SILENT DATA CHANGE / NO UNTRACKED HOTFIX / NO DUPLICATE SYSTEM / NO FAKE VERIFIED / NO CROSS-PROJECT TOUCH。

### 12.1 工程纪律封口（A）

| 项 | 结论 | 证据 |
|----|------|------|
| pnpm clean install | **PASS** | 全新 worktree（`git worktree add` HEAD=2a120f8）`pnpm install --frozen-lockfile` 20.3s 成功，lunar-lite@0.2.8 安装 |
| pnpm build | **PASS** | 全新 worktree `pnpm build` 166/166 静态页生成，`✓ Compiled successfully` |
| Runtime Commit | `3a4c7ee` | 四端运行代码 blob sha1 完全一致（见 12.3） |
| Document Head（本地 main） | `2a120f8` | 本阶段 pnpm-build 修复提交（未含运行时逻辑改动） |
| Git Runtime 四端 | **一致 = `3a4c7ee`** | 本地 / GitHub / 服务器源码仓 git blob sha1 三文件（server.js、adminUnifiedRoutes.js、middleware/auth.js）逐一对齐（见 12.3） |
| NO_GUESS_RULE | 永久固化 | 见 12.4 事故一 |
| ATOMIC_DEPLOY_RULE（BUILD_ALL_BEFORE_DEPLOY） | 永久固化 | 见 12.5 事故二；SOP 已更新 |
| v25.0.63 邀请成员记录 | 已记录 | 见 12.6 |
| 临时文件 | 已清理 | 本阶段只读核查脚本（readonly_*.py / _ro_*.py / verify_invite_fields.py）用时 10 分钟后删除；临时 worktree 已移除 |

### 12.2 pnpm 问题封口结论（指令第十七~十八部分）

- 根因一：`pnpm-workspace.yaml` 此前 `allowBuilds` 三项值为占位符 `set this to true or false`（3a4c7ee 提交内容），pnpm 解析为非法值 → 触发 `[ERR_PNPM_IGNORED_BUILDS]`。
- 根因二：`package.json` 缺 `lunar-lite`（`iztro` 的幽灵依赖），`next build` 报 `Module not found: Can't resolve 'lunar-lite'`。
- 修复提交：`2a120f8`（allowBuilds 布尔化 `cpu-features/sharp/ssh2=true` + lunar-lite@^0.2.8 显式依赖 + pnpm-lock.yaml 首次入库，共 3 文件 +6113 行）。
- 最终 clean build 结果：**BUILD_PIPELINE = FULL PASS**（全新目录 install+build 均成功）。
- 遗留事实（未改，记录待项目方决策）：`build.sh` 第15行与 `codemagic.yaml` 仍用 `npm run build`/`npm ci`，而 `package.json` 声明 `packageManager: pnpm`。**存在 npm/pnpm 混用**，属指令第十六部分待封口项，本阶段仅记录不改（改构建脚本需谨慎验证线上）。

### 12.3 Git Runtime 四端一致性（指令第十九、二十部分）

判定方式：比较 `git rev-parse HEAD:<path>`（git 自身 blob sha1，排除 Windows CRLF 干扰）。

| 文件 | 本地 | GitHub | 服务器源码仓 | 生产运行目录 |
|------|------|--------|--------------|--------------|
| backend_deploy/server.js | `4f931196` | = | `4f931196` | md5 e98dc031 = 源码 blob |
| backend_deploy/adminUnifiedRoutes.js | `43cdf3d9` | = | `43cdf3d9` | md5 f1aa1f66 = 源码 blob |
| backend_deploy/middleware/auth.js | `4d43c6bd` | = | `4d43c6bd` | md5 af0a13cd = 源码 blob |

- 本地 HEAD / GitHub origin /head / 服务器源码仓 HEAD 三者 commit 相同 = `3a4c7ee`。
- 生产运行目录 `/www/yandaoguoxue-backend` **无 .git**，故用 md5 与服务器源码仓 blob 交叉比对：三文件全部一致，**生产运行代码 = 3a4c7ee**。
- 说明：本地 main 领先 origin 1 个文档/构建修复提交 `2a120f8`（仅 pnpm 构建配置，非运行时逻辑），需 push 后四端文档头才对齐。

### 12.4 事故一：NO_GUESS_ROUTE_INCIDENT（指令第二十四部分）

- 事实：此前开发凭印象猜 Admin API 前缀，把路径写成 `/api/admin/moderation/users`，请求返回 404。
- 真实路径：server.js 路由挂载数组 `{ file:'adminUnifiedRoutes', path:'/api/admin/unified' }` + 路由文件内 `router.get('/moderation/users')` → 正确前缀 `/api/admin/unified`。
- 永久规则：**NO_GUESS_ROUTE**。调任何 API 前必须确认 `ROUTE_SOURCE / MOUNT_PREFIX / METHOD / AUTH / PARAMETERS / RESPONSE_SCHEMA`，缺一不可调用。

### 12.5 事故二：NON_ATOMIC_DEPLOY_INCIDENT（指令第二十五部分）

- 事实：此前前端 build 尚未完成，后端已 `pm2 reload` 上线，形成半部署。
- 永久规则：**BUILD_ALL_BEFORE_DEPLOY**。发布必须原子化（指令第十三~十五部分），前端 build 全部通过并产出完整发布包后才允许后端切换；禁止边 build 边 deploy。

### 12.6 v25.0.63 后台「邀请成员数」工程事件（指令第二十三、三十~三十四部分）

- Version：`v25.0.63`
- 功能：admin/moderation 用户管理列表新增 `invite_count`（一级+二级）、`invite_level1`（一级）、`invite_level2`（二级）三字段，后端 `adminUnifiedRoutes.js` LEFT JOIN `user_invite_relation` 聚合。
- 功能 Commit：`cc166d5`（feat(admin): 用户管理新增邀请成员数展示(一级/二级/总数)）
- 发版 Commit：`3a4c7ee`（chore(release): bump v25.0.63）
- 生产验证：生产 `adminUnifiedRoutes.js` 已含 6 处 `invite_count/invite_level1/invite_level2` 关键字，md5 与源码 blob 一致；生产 Web `current → releases/v25.0.63`，buildId `v25.0.63_D20260827`。
- 邀请关系只读：后台仅查看，禁改绑定；人工改绑需 SUPER_ADMIN + 原因 + audit（指令第三十三部分）。
- 不新建第二套邀请系统（指令第三十四部分）：继续复用 `users.invited_by` + `user_invite_relation`。

### 12.7 生产事实终检（B+C，指令第二十八~二十九部分）

| 维度 | 事实 | 状态 |
|------|------|------|
| Web | `/root/yandaoguoxue/current → releases/v25.0.63`，buildId `v25.0.63_D20260827` | ✅ 200 |
| Backend | PM2 `yandaoguoxue-backend` online，Node v22.23.0，`/api/health` 200（version 字段为 server.js 硬编码 v23.1） | ✅ |
| PM2 | 1 进程 online，uptime 108m，restart 197 次 | ✅ |
| DB | 三库：yandao_users.db（95 用户）、social.db（232K）、academy.db（56M） | ✅ |
| AI | 服务端鉴权+配额生效；ai_call_logs 1909 条；ai-health.json 滚动窗口 | ✅ |
| Payment | 4 笔 PAID（合计 ¥88.81）；微信回调验签通过 | ✅ |
| Membership | basic 91 / monthly 2 / yearly 1 / lifetime 1（共 95，全 active） | ✅ |
| Social | chat_messages 45 行全 text（无图片 base64） | ✅ |
| Backup | /root/backup 27 个 .db（142M），三库 02:00 每日备份，retainDays 30 | ⚠️ offsite=not_configured |
| APK | v25.0.60 / versionCode 2059（未随 Web 61/62/63 后台增量重建） | ✅ |
| 磁盘 | /dev/vda1 50G，用 15G（30%） | ✅ |

**经营数字交叉核验（后台 API = DB 真实统计）**：
- 用户总数 95（全 active）；今日新增 0；7 日活跃 51。
- 会员 4（monthly 2 / yearly 1 / lifetime 1，quarterly 0）。
- 订单：PAID 4 笔 ¥88.81（MEMBERSHIP 2 笔 ¥78.9 + SINGLE_UNLOCK 2 笔 ¥9.91）；EXPIRED 105；CLOSED 9；今日 PAID 0。
- 佣金 commission_records：4 笔 ¥13.68（1368 cents，全 COMMISSION 类型，FROZEN 未解冻）。
- commission_accounts：8 用户，total_earnings 1368 cents，withdrawable 0，frozen 1368。
- withdrawals：0 笔。
- 邀请：`user_invite_relation` 48 行，**全 level=1**（无二级），distinct inviter 5 人，top 100000→32；`users.invited_by` 48 人。

### 12.8 AI 成本与权益（指令第三十六~四十三部分）

| 档位 | dailyLimit | 说明 |
|------|-----------|------|
| basic | 3 | 服务端 `AI_DAILY_LIMITS`（middleware/auth.js） |
| monthly | 50 | 同上 |
| quarterly | 50 | 同上 |
| yearly | **Infinity（无限）** | ⚠️ 存在无限 AI |
| lifetime | **Infinity（无限）** | ⚠️ 存在无限 AI |

- **无限 AI 存在 = YES**（yearly + lifetime），已如实报告，不擅自改历史权益（指令第三十七~三十九部分）。
- 服务端强制：所有限制在 `middleware/auth.js` 从数据库读取，前端仅显示（指令第四十一部分）。
- AI Cost Center：**未建**（后台无今日/本月成本、按用户/功能/模型/档位/渠道/师傅的维度面板），属后续 Phase 1 交付。
- AI 调用日志：已有 `ai_call_logs`（scene/tokens_in/tokens_out），但不含 `featureKey/model/estimatedCost/duration/status` 完整契约（指令第四十三部分待完善）。

### 12.9 Partner 渠道（指令第四十四~六十三部分）

- 现有 Partner 数：**0**（`partners` 表空）；partner_settlements 空；partner_order_log 0 行。
- Partner 引擎：`partnerEngine.js` + `partnerRoutes.js`（用户端 /api/partner + 管理端 /api/admin/partner）V2 已实现，但**无真实 Partner 数据流入**。
- 当前 Partner 50% 实现：结算口径 DISTRIBUTABLE_REVENUE = 实付 − 手续费 − 渠道可归因 AI 成本 − 普通推广佣金 − 退款；基础 50% + 培养奖励 5%。因无真实渠道数据，**未产生真实结算**。
- **普通佣金重复风险（P1 COMMERCIAL ACCOUNTING RISK）**：Reality Check 确认普通佣金 Hook（commissionEngine 15%+5% 两级，commission_records 4 笔)与 Partner Hook（partnerEngine 50%）**独立执行**——若同一用户既是 Partner 又是直接推荐人，存在 L1 15% + Partner 50% 同时计提可能。指令第五十二~五十三部分要求统一 Commission Router，属后续 Phase 2。
- 5% 培养奖励：现有 nurture 字段实现，仅直属一级，**未扩层**（指令第五十五~五十六部分）。
- Partner Console：用户端 /profile/partner 六页 + 管理端 /admin/partners 已存在，未重新开发。
- 还缺：真实 Partner 商业归属绑定（user→partner 渠道归属表字段）、合同字段（contractStart/End/Version/renewal）、月度 Settlement Snapshot 流水、透明账本视图。

### 12.10 Provider（师傅）后端缺口（指令第六十四~七十部分）

- 当前 Provider 系统：**仅前端 localStorage 原型**（/profile/consult/provider-apply 等），后端 **NOT_IMPLEMENTED**。
- 差值承诺：`providers / provider_services / service_orders / provider_reviews / provider_settlements` 五表均未建。
- 真实缺口：申请审核、擅长/介绍/服务项目/价格、预约、接单完成评价、退款、收益提现 全流程后端缺失。
- 中医合规：定位为知识学习+健康教育参考，禁止宣传确诊/处方/治疗保证（指令第七十部分）。

### 12.11 Offline / Cache / 对象存储 / 题库（指令第七十一~一百十七部分）

| 维度 | 现状 | 状态 |
|------|------|------|
| APK 内置 | 原生 APK 内置易学资源（api 改写内联），versionCode 2059 | ✅ |
| Offline Pack / Content Pack | **未建**（packId/version/sha256 清单体系缺失） | ⏳ 后续 Phase 5/6 |
| Cache Manager / Server GC | **未建**（StorageManager 统一分类、自动垃圾治理未实现） | ⏳ 后续 Phase 7 |
| 题目总量 | academy 13670（zhongyi 10294 / yikao 2757 / yixue 619） | ✅ |
| 中医执业医师题数 | 10294（zhongyi track） | ✅ |
| AI 生成题数 | 11353（source_id>0 OR govern_state=AI_GENERATED） | ✅ |
| 审核题数 | approved 13412 / pending 4 / rejected 254 | ✅ |
| Question Factory | **未建**（自动补题/库存预测/去重/质量反馈状态机缺失） | ⏳ 后续 Phase 9 |

### 12.12 Storage / Backup / 灾备（指令第一百零五~一百十二部分）

- 系统盘 30%（15G/50G）。
- 最近 30 日备份增长：users.db 由 8/15 的 156K 增长到 8/27 的 492K（+336K）；social.db 232K；academy.db 56M。总备份盘 /root/backup = 142M。
- 自动快照：**not_configured**（backup_status.json `offsite: not_configured`）。
- COS：`coscmd`/`tccli` 已装但 `.cos.conf` 缺失 → **异地备份未生效**。
- 腾讯云控制台自动快照（每日 03:00，保留 7~14 天）：需项目方在腾讯云控制台开启（已有《腾讯云控制台操作指令_照着点.md》）。
- 恢复演练：backup_drill.json 存在（曾演练），未自动化每月一次。

### 12.13 P0 / P1 / P2（本轮结论）

- **P0（本轮明确不动）**：微信支付核心、会员真实支付主链、服务端价格 SSOT、AI 服务端 Auth/Quota、AI 健康监控、好友/私聊/群聊/群管理、分享已验正常部分、APK 下载唯一源、易学算法核心、医考现有正式引擎（指令第十一~十二部分冻结区）。
- **P1（下一阶段解决）**：
  1. AI Fair Usage + Cost Center（终止 yearly/lifetime 无限 AI 需先核对历史商品文案/PAID订单/权益快照，禁单方面取消）——Phase 1。
  2. Commission Router 统一结算（消除普通佣金 + Partner 佣金重复计提）——Phase 2。
- **P2**：Provider 完整后端（Phase 4）、Offline Core + Content Pack（Phase 5/6）、Cache Manager + Server GC（Phase 7）、对象存储 (user-content/public-content/backup 三桶)（Phase 8）、Question Factory（Phase 9）、异地备份 offsite（Phase 10）。

**本轮明确不动**：Provider 大开发、Partner 重构、Offline 大开发、Question Factory 上线、数据库大迁移（指令第一百二十三部分）。

**推荐下一 Phase**：Phase 1 —— AI Fair Usage + Cost Center（先盘点历史权益后设计可后台配置的 dailyRequests/monthlyRequests/maxConcurrent/maxInputChars/maxOutputTokens/dailyCostCap/monthlyCostCap/overageAllowed/overageProduct，服务端强制）。

---

### 12.14 真太阳时均时差算法升级（Spencer → Meeus，指令 v25.0.47_23）

**根因**：均时差旧用 Spencer(1971) 傅里叶级数，注释/文档宣称 ±3 秒，实测最大偏差约 53 秒（≈0.9 分钟），精度不实；奇门模块另有独立 Spencer 内联实现，存在跨模块漂移风险。

**修复**：
- `src/algorithm-core/common/jieqi.ts`：均时差升级为 Meeus《Astronomical Algorithms》太阳位置低精度算法（儒略日 → 平黄经 → 中心差 → 视黄经 → 视赤经 → EoT），按 Date UTC 分量计算，与本地时区无关，精度约 ±2.4 秒。
- `src/algorithm-core/modules/qimen/index.ts`：删除内联 Spencer，复用 `calcTrueSolarTime`，八字/紫微/奇门三模块统一同一实现。

**验证（vs astronomy-engine 权威基准，2024/2025/2026 三年逐日全量）**：最大偏差 1.66 秒、RMS < 0.8 秒；极值 -14.20 分（2 月中旬）、+16.44 分（11 月上旬）、4 个过零点均与天文历书一致。✅ 满足 ≤±3 秒（实测 ±1.7 秒内）。

**交付报告**：docs/reports/20260829_真太阳时均时差算法Meeus升级_完整报告.md
**commit**：`0be2158`(算法升级) → `6f6e3c6`(bump v25.0.64) → `f6eb387`(回填部署/公网结论)｜**构建**：本地 `pnpm build` exit 0；服务器 `bash build.sh`(npm static export) exit 0，`out/index.html` 存在、1791 文件｜**部署**：`git reset --hard origin/main` → 后端 server.js/adminUnifiedRoutes.js 同步(md5 一致) → `pm2 reload yandaoguoxue-backend` online、健康检查 `success:true` → 前端 `releases/v25.0.64` 原子切流 → nginx 清缓存+reload｜**公网**：`version.json=v25.0.64_D20260829`、`/`+`/yixue/bazi|ziwei|qimen|zeri`+`/membership`+`/login`+`/profile`+`/admin` 均 200、`/api/health=success:true`、Meeus 算法 chunk 上线（`280.46646` 入包）

---

### 12.15 P0 安全清零 + 工程收口（FINAL-P0-SECURITY-STATE-SEAL-02，2026-08-29）

**范围**：先清零 P0 安全风险，不做大开发；禁止仅凭静态代码定罪，逐项先判定「生产活跃路径」再修复。

**核实结论（生产真实执行路径）**：

| 检查项 | 生产路径核实 | 判定 |
|--------|------------|------|
| JWT 默认回退密钥 | 生产 `.env` JWT_SECRET=64位非默认值；代码内 `yandao_default_jwt_secret_*` 为死代码回退 | **修复**：8 处 backend_deploy 路由文件（academyRoutes/accountDeleteRoutes/authRoutes/commissionRoutes/partnerRoutes/register_routes/socialApiRoutes/teamApiRoutes）+ middleware/auth.js 全部移除默认密钥回退，改为 fail-closed（未配置或 <32 位则拒绝启动） |
| 社交存储越权 | `/api/social` 路由（socialStorageRoutes.js）原全部无鉴权，可匿名读任意用户聊天记录、读/改存储统计、传图、清理 | **修复**：上传/取图/同步/读取加 `authMiddleware`+属主校验，管理端加 `adminAuth('ADMIN')`，图片路径穿越加参数白名单校验 |
| AI 单次解锁旁路 | 服务端经会员等级+AI 配额限流，订单金额以服务端 SSOT 为准 | 非 P0，生产路径无私钥旁路 |
| 批量工具价格篡改 | `resolveServerPrice` 从 admin 配置读价，覆盖前端 amount | 非 P0，服务端 SSOT 已成立 |
| 积分/钱包 localStorage | 积分不可兑核心付费权益；钱包为前端模拟数据无资金流 | 非 P0 |
| Admin Key 本地存储 | 后台密钥落盘为 sha256 哈希，明文仅签发时返回一次 | 非 P0 |
| 离线假 Token | 离线功能不发可伪造的 JWT | 非 P0 |

**工程收口**：
- 工作区文件分类：入库测试（`src/algorithm-core/tests/trueSolarTime.test.mts`+`package.json`，13/13 通过）；文档脱敏（20260816/20260822/20260829 三份混元 Key 前缀 `sk-l4iL8*` 全部改为 `sk-******` 脱敏占位，20260829 精度口径「零误差」改为可验证的 Meeus ±2.4s/实测 1.66~1.75s）；构建修复（`pnpm-workspace.yaml` 占位符 `esbuild: set this to true or false` → `esbuild: true`）；临时探针（`.gitignore` 增加 `tmp/` 忽略 Meeus 校验临时脚本）。
- `src/lib/backend/` 两份为**非活跃遗留副本**（生产入口 `ecosystem.config.js` 指向 `backend_deploy/server.js`，无任何代码 require 该目录），其中仍含死代码默认密钥，属低优先级清理项，本指令按「先判生产活跃路径」原则**不予改动**。

**回归**：
- 后端 10 文件 `node --check` 全通过；`authMiddleware`→`req.user.userId`、`adminAuth('ADMIN')` 引用链核对正确。
- 真太阳时 Golden 测试 13/13 通过（EoT vs astronomy-engine 最大偏差 ≤3s、跨日、时辰边界、奇门 Integration、八字/紫微页面提取一致性）。
- clean checkout 构建：`pnpm install --frozen-lockfile`（lockfile up to date）+ `pnpm build` exit 0（54 路由无错误）。

**提交**：见本阶段本地 commit（不推送）。**安全残余建议**：混元 Key 前缀曾在历史文档出现过（现已脱敏），建议择机在腾讯云控制台轮换混元 Key 作为卫生动作（非本次阻断项）。
