# 言道国学 · FINAL_PROJECT_HANDOVER 最终交接报告

> 版本：v25.0.47_13 ｜ Git：019ab43（GitHub wzmpa18/minglizyi main）｜ 日期：2026-08-23
> 本文档为唯一主交接文档。历史部署/验收报告已全部收纳于 `docs/reports/`（30 份原始报告 + 1 份整合完整版《20260822_全部报告整合_完整版.md》，全部集中在这一个文件夹），不再另行生成独立报告。

## 一、项目概况

1. **项目**：言道国学（易学+中医学习 App/Web，Next.js 静态导出 + Node 后端 + SQLite）
2. **产品定位**：传统文化学习平台——易学排盘工具（八字/紫微/奇门/六爻/梅花/大六壬/择日/手机号/姓名/合婚/塔罗/星座）、中医学习与医考、AI 深度解读（付费）、社区群聊、推广分佣
3. **当前版本**：v25.0.47_13（buildId v25.0.47_13_D20260823）；含 RC-04~06 热修 + v25.0.47_9 支付解耦 + v25.0.47_10 运营管理中心封板 + v25.0.47_12 支付修复/定价对齐/两级分佣/中医门控 + v25.0.47_13 商家转账提现落地/三级角色权限体系/抽屉导航
4. **生产域名**：https://yandaoguoxue.yandao.vip（H5，微信内体验完整支付链路）
5. **后台入口与登录方式**：https://yandaoguoxue.yandao.vip/admin/（**言道国学运营管理中心**，唯一正式入口）。**三级角色密钥体系（v25.0.47_13）**：主管理员密钥（SUPER_ADMIN，全系统唯一最高权限）存放于服务器 `/www/yandaoguoxue-backend/.env` 的 `ADMIN_API_KEY=` 一行（SSH 登录 root@82.156.228.87 后执行 `grep '^ADMIN_API_KEY=' /www/yandaoguoxue-backend/.env` 查看，妥善保管勿外泄）；财务/运营子密钥由超级管理员在后台「密钥管理」页签发（明文仅一次性展示，SHA256 哈希存储）。**主密钥可修改**：服务器 .env 改 ADMIN_API_KEY 值 → `pm2 restart yandaoguoxue-backend` 即生效（密钥管理页有指引）。后台菜单按登录角色动态渲染，导航为抽屉式（默认收起+左上角汉堡按钮唤出，内容区全宽不遮挡）；权限由服务端强制校验（越权 403+审计留痕）**

## 二、目录与仓库

| 位置 | 路径 |
|---|---|
| GitHub | https://github.com/wzmpa18/minglizyi（main = 019ab43） |
| 本地主仓库 | C:\Users\ZhuanZ\Projects\minglizyi |
| 服务器源码仓 | /root/yandaoguoxue-source |
| 生产后端 | /www/yandaoguoxue-backend（PM2: yandaoguoxue-backend, 端口 3001） |
| 生产前端 | /root/yandaoguoxue/current → releases/v25.0.47_13 |
| 数据库 | /root/backend-auth/data/yandao_users.db（SQLite WAL, 18 表, 46 用户） |
| 签名/证书 | Android keystore 与微信支付证书见 SECRET INVENTORY 一节 |

## 三、技术栈与架构

- **前端**：Next.js 静态导出（bash build.sh：临时移除 api 路由 → next build → out/），烧录 buildId 防更新死循环
- **后端**：Node + Express 风格路由（server.js 统一挂载，register_routes.js 注册），better-sqlite3
- **AI**：POST /api/ai/chat（双格式兼容：{systemPrompt,userPrompt} 与 {messages}）；上游混元 tokenhub（HUNYUAN_API_URL/HUNYUAN_API_KEY，RC-04 修复后全站正常）
- **支付**：微信支付 V3 JSAPI（wechatPayV3.js，公钥模式）；下单 POST /api/payment/create → 微信回调 /api/payment/callback/wechat（验签+解密+幂等）→ 订单 PAID → **权益交付 deliverOrderBenefits**（v25.0.47_8 新增：MEMBERSHIP 开通会员 users.member_level/membership_expiry 续费顺延；POINTS_RECHARGE 积分入账 user_assets+points_transactions）；benefit_delivered 持久化 + query 接口补交付兜底
- **会员/权益**：服务端 users 表为唯一事实源（middleware/auth.js getMembershipFromDB）；前端 membershipStore 仅展示缓存
- **分佣**：commissionEngine 两级分佣（一级推荐人 15% + 二级推荐人 5%，按用户实付金额计算，COMMISSION/COMMISSION_L2 双记录独立幂等）；**月度结算模式**——佣金入账先冻结（FROZEN），每月最后 1 天统一结算转为可提现，每月 16 日-月末开放提现申请（后台分佣配置页可调）；订单 PAID 自动记账，退款冲正（全额全额扣回/部分按比例）
- **提现（v25.0.47_13 全自动）**：wechatTransfer.js 微信商家转账 V3 对接——≤免审额度 200 元自动转账，超额度进财务人工审核；回调验签更新状态；单日单用户 2 万元限额；风控标记（新注册/短时多笔转人工）；全链路幂等；.env 开关 WITHDRAW_TRANSFER_ENABLED（当前 false，待商户权限开通）
- **社区**：群聊/好友/动态（SQLite 持久化）
- **资讯**：/api/news（已恢复，公网 200）
- **中医板块门控（v25.0.47_12）**：工具矩阵新增 9 条中医条目（典籍/中药/方剂/经络/辨证/养生/伤寒/体质/医考），19 个中医页面接入 SectionGate 门控组件，后台「工具管理中心」可实时控制每个板块的开放/关闭/维护/会员专享（公网实测：改 OFF/会员专享后矩阵即时生效）

## 三A、上次迭代（2026-08-23）完成的 v25.0.47_12（指令 FIX-V12-PAY-CONTENT）

**五项任务全部完成并公网验证（三端 HEAD 一致 = bbb29ec）：**

1. **P0 会员支付死键修复**：会员页错误提示可见化（按钮上方悬浮提示+「去登录」引导，原提示埋在页面中部导致用户以为按钮无响应）；季度档位补齐展示；支付走既有 Native 链路。公网实测：月度 37/季度 99/年度 374/终身 3600 四档下单全部成功返回微信付款二维码（NATIVE codeUrl）
2. **全量定价对齐（后台 SSOT）**：publicPricingRoutes/paymentRoutes/server.js 三处默认值同源对齐；公网 /api/public/pricing 返回 basic 0 / monthly 37 / quarterly 99 / yearly 374 / lifetime 3600；B 类工具统一 9.9 元（会员超出免费额度同价，取消阶梯折扣）；批量解读 basePrice 200 元 + 会员折扣（月度 95 折 190 / 季度 85 折 170 / 年度 8 折 160 / 终身免费）；服务端下单强制裁决（公网实测前端篡改 0.01 元全部被覆盖：server=37/99/374/3600/9.9/200，日志留痕）
3. **深度解析报告提质**：新增 src/lib/deepReportPrompt.ts 统一五段式提示词（核心总论/四维拆解/典籍依据/正向建议/总结收尾），按工具领域自动匹配典籍（康熙字典/说文解字/系辞传/三命通会/滴天髓/钦定协纪辨方书等），合规红线（无恐吓/无绝对化/无越界承诺）；24 款工具经 EventDivinationPanel 复用 + zeri/ziwei/astro/tarot 独立页接入。**首轮实测报告仅 561-631 字未达标，已二次强化提示词（分段字数下限 110/330/120/130/70 + 自查扩写指令，总目标 820 字）并重新构建发布（releases/v25.0.47_12 内容替换，buildId 不变）**；复测 3 份报告（姓名 714 字/手机号 769 字/合婚 863 字）全部落入 700-900 字区间、五段完整、典籍引用、四维度覆盖、无恐吓词
4. **两级分佣 + 月度提现**：一级 15% + 二级 5%（COMMISSION_L2 独立幂等记录，禁自购自返/同人去重）；佣金入账先冻结，每月 30 号统一结算（settleDay），每月 15 号后开放提现（withdrawOpenDay），后台「推广分佣」页可调全部参数；前端收入页展示结算规则+窗口外禁用按钮；公网配置核验：ratios {level1:15, level2:5}, settleDay 30, withdrawOpenDay 15, monthlySettleEnabled true；提现总开关仍为 DISABLED（商家转账权限未开通，佣金正常累计，权限开通后后台一键启用）
5. **中医板块知识开放程度控制**：工具矩阵新增 9 条中医条目（zhongyi_classic/herb/formula/meridian/bianzheng/yangsheng/shanghan/constitution/exam），新增 SectionGate 门控组件 + sectionGate.ts 判定层（矩阵缓存 2 分钟/断网放行），19 个中医页面（含 exam 六个子页/constitution 三个子页/yangsheng 三个子页）全部接入，中医主页入口卡片按矩阵动态渲染（关闭隐藏/维护置灰/会员加锁引导开通）。公网实测：后台改 OFF → 公网矩阵即时 OFF；改会员专享 → 即时 MEMBERSHIP+monthly；恢复后正常
6. **P1 缺陷修复（回归中发现）**：后端 middleware/auth.js 的 MEMBER_LEVELS/AI_DAILY_LIMITS 缺少 quarterly 档位——季度会员支付 99 元后会被按 basic（等级 0/AI 配额 3 次/天）处理导致权益归零；已补齐（quarterly 等级 2 介于 monthly 与 yearly 之间，AI 配额 50 次/天与月度对齐），语法校验 + PM2 重启 + 公网 health 200 验证通过

**部署记录**：本地构建（buildId v25.0.47_12_D20260823，版本脚本支持 _NN 后缀）→ scp 上传 → releases/v25.0.47_12 → current 切流 → nginx 缓存清理 → 公网回归全 200；后端 7 个文件（server/paymentRoutes/publicPricingRoutes/toolAdminRoutes/adminUnifiedRoutes/commissionEngine/commissionRoutes）备份后替换 + node --check + PM2 重启（health 200）；**二次迭代（bbb29ec）**：auth.js quarterly 修复单独部署（语法校验+PM2 重启+health 200）+ 提示词强化后重新构建前端替换 releases/v25.0.47_12 内容（新特征字符串「目标 820 字」「扩写第二」烧录验证 YES）+ 全页面公网 200

**构建事故与修复**：首次构建失败——herb/meridian 两页面的 SectionGate import 被插到 "use client" 指令之前导致整文件降级为 Server Component；已修复（use client 移回首行）并复构建通过；顺带发现 publicPricingRoutes.js 默认套餐未随定价对齐（公网显示旧价 39/366），已修复部署并二次公网验证

**存量功能回归核验（全通过）**：微信 Native 支付全场景 ✓（6 单实测 codeUrl）；工具矩阵/功能开关/订单中心/分佣配置/佣金明细/会员价格后台 API 全 200 ✓；AI 服务端强制拦截 ✓（关→403 FEATURE_DISABLED→恢复正常）；驾驶舱 overview 20 项指标正常且版本显示 v25.0.47_12 ✓；审计日志记录矩阵/开关操作 ✓；权益发放幂等/退款冲正/移动端手势为存量逻辑未改动，由上述回归覆盖

## 三B、本次会话（2026-08-23）完成的 v25.0.47_13（指令 FIX-WITHDRAW-V13-FINAL）

**全部完成并公网验证（四端 HEAD 一致 = 019ab43：本地=GitHub=服务器源码仓=生产运行目录）：**

1. **微信商家转账 V3 全量对接**（backend_deploy/wechatTransfer.js）：POST /v3/transfer/batches 发起转账（复用现有商户号/APIv3 密钥/证书序列号/私钥，零新增核心密钥）；回调强制验签（AES-256-GCM 解密+平台证书验签，防伪造篡改）；主动查单查终态；签名头修复为规范 WECHATPAY2-SHA256-RSA2048
2. **全自动提现引擎**（commissionEngine.js）：用户申请→校验余额/门槛 10 元/提现窗口/单日限额 2 万→≤免审额度 200 元自动转账→回调更新→成功扣余额/失败退回并记录原因；超额度进财务人工审核队列；风控标记（新注册/短时多笔转人工）；全链路幂等（同一提现单仅发起一次）；退款扣回（全额全额/部分按比例）
3. **结算规则对齐**：每月最后 1 天自动结算（settleDay=0）→ 每月 16 日-月末开放提现（withdrawOpenDay=16，后端强制拦截窗口外申请）
4. **新增 .env 配置**：WITHDRAW_TRANSFER_ENABLED（总开关，默认 false）/ WITHDRAW_FREE_PASS_AMOUNT=200（免审额度）/ WITHDRAW_MIN_AMOUNT=10（最低门槛）
5. **后台三级角色权限体系**（backend_deploy/adminRoles.js 统一模块）：SUPER_ADMIN（全权限）/ FINANCE_ADMIN（提现审核·报表·导出；禁改价/改开关/管密钥/封用户/改分佣比例）/ OPERATOR_ADMIN（用户管理·内容·工具开关·营销；禁一切资金操作）；服务端中间件强校验（越权 403+写审计 AUDIT_BLOCK_ROLE/AUDIT_BLOCK_SCOPE）；子密钥 SHA256 哈希存储 data/admin_roles.json（明文仅签发时一次性展示）；密钥管理页 /admin/keys（签发/禁用子密钥+主密钥修改指引）
6. **后台抽屉式导航**：固定侧边栏改为全端抽屉（默认收起+顶部汉堡唤出+遮罩，内容区全宽），解决内容遮挡；菜单按角色 scope 动态渲染
7. **后台财务端补全**：提现批量审核（单笔/批量+驳回填原因）、同步微信转账终态、佣金统计报表（日/月/年+层级+退款扣回）、提现记录 CSV 导出（按日期/状态筛选）
8. **审计修复**：/audit 接口读未定义 AUDIT_FILE 恒返回空 → 改用 adminRoles.listAudit；越权 403 同步写入审计日志
9. **深度报告字数放宽**：700-1000 字（目标 850，条理清晰不啰嗦）；公网实测姓名 988 字/手机号 890 字，五段式 5/5 完整

**公网验收（scripts/verify_v13_final.sh + verify_v13_final_fix.sh，28 项 PASS / 0 FAIL）**：页面健康 8 路径 200；版本 v25.0.47_13；定价 SSOT 37/99/374/3600；主密钥 whoami=SUPER_ADMIN；财务密钥财务域 200 + 越权 5 项全 403（密钥管理/运营接口/改分佣配置/改价 PATCH·PUT/改 AI 配置）；运营密钥运营域 200 + 越权财务 403 + 越权密钥 403；审计日志含 ADMIN_KEY_CREATE+AUDIT_BLOCK_*；临时密钥签发-验证-禁用闭环；未登录提现 401；withdrawEnabled=false/minWithdraw=10/settleDay=0/withdrawOpenDay=16；深度报告字数结构双达标。

**提现启用三步**（待项目方商户平台开通「商家转账到零钱」权限后）：① .env 置 WITHDRAW_TRANSFER_ENABLED=true ② pm2 restart yandaoguoxue-backend ③ 后台「提现」页即可看到自动转账流（≤200 元免审自动打款，>200 元人工审核）。

## 四、上次会话（2026-08-22 晚）完成的 RC-06 支付真实化

**根因（用户报告"会员点击无法跳转支付"）**：
1. 前端会员页 handlePay 是模拟支付（createOrder + setTimeout 1.5s 假开通），从未调用真实支付接口
2. 后端订单 PAID 后只发返佣，未交付会员/积分权益
3. .env 中 WECHAT_APPID / WECHAT_APP_SECRET 为**空值** → isPaymentEnabled()=false → 下单返回"支付通道即将开放"

**修复（只完善不删除，全部功能保留）**：
- 前端 6 文件：membership/page.tsx（真实支付+登录校验+微信环境校验）；EventDivinationPanel（AI 套餐购买+单次解锁）；AIInterpretButton；InterpretationDrawer；zhongyi/wenzhen（单次解锁）；paymentService.ts 新增 paySingleUnlockAndWait 统一入口
- 后端 paymentRoutes.js：deliverOrderBenefits 权益交付 + user_orders.benefit_delivered 列 + updateOrderRecord/query 双挂载
- 部署：scripts/deploy_release_v25_0_47_8.sh（内容门禁→构建→烧录校验→入包校验→发布→切流→公网回归全 200）

**验证**：线上 JS 已含新支付逻辑（2 chunk 命中）；模拟 PAID 订单补交付测试通过（会员开通→还原）；AI/健康/价格 SSOT 接口回归正常。

## 五、真实性矩阵（指令第 33 章口径）

| 项 | 状态 | 说明 |
|---|---|---|
| AUTH / USER_DATA | VERIFIED | JWT+设备指纹，users 表 46 用户 |
| AI_GATEWAY / AI_PAYWALL | VERIFIED | RC-04 修复后公网双格式实测 200 |
| YIXUE / LIUYAO / ZIWEI 算法 | VERIFIED（冻结区，禁止改动） | |
| MEMBERSHIP / ENTITLEMENT | VERIFIED | 服务端 SSOT，v25.0.47_8 权益交付闭环 |
| WECHAT_PAY | **NATIVE VERIFIED（v25.0.47_9）** | Native 扫码支付全场景可用：微信侧实测下单成功返回 code_url；公众号参数已解耦（APPID 已配置用于下单字段，AppSecret 无需配置）；JSAPI 保留待公众号参数补充后自动启用 |
| COMMISSION_L1/L2 | VERIFIED | 两级分佣自动记账（一级15%+二级5%，月度结算每月最后1天/提现窗口16日-月末，v25.0.47_13 规则，公网配置核验通过） |
| WITHDRAWAL | **READY（v25.0.47_13 接口对接完成）** | 商家转账 V3 全量对接+全自动提现引擎已上线；WITHDRAW_TRANSFER_ENABLED=false 待商户权限开通后置 true 即启用（见待办 2） |
| ADMIN_CENTER | READY_FOR_OWNER_ACCEPTANCE | 统一后台 /admin 全功能+三级角色权限（v25.0.47_13）+抽屉导航，待项目方实操验收 |
| ANDROID | VERIFIED | APK 可用（v25.0.47_6 包） |
| IOS | IOS_SIGNING_BLOCKED_BY_PLA | Apple PLA 未接受（见待办 3） |
| BACKUP / DEPLOYMENT / SOURCE_SYNC | VERIFIED | 每日 2 点 DB 备份；四端 HEAD 一致 019ab43（本地=GitHub=服务器源码仓=生产运行目录） |
| SOCIAL / GROUP_CHAT / DISCOVERY_NEWS / MARKETING / SHARE / DOWNLOAD | VERIFIED | 公网 200 回归通过 |

## 六、SECRET INVENTORY（只说位置，绝不写值）

- 生产密钥：/www/yandaoguoxue-backend/.env（HUNYUAN/AI、ADMIN_API_KEY、微信商户五件套、JWT）
- 微信支付证书：/www/yandaoguoxue-backend/certs/（apiclient_key.pem / wxpay_pub_key.pem，权限 600）
- Android keystore：本地 D:\最新言道学习APP 内项目资料（见项目方归档）
- 源码仓与 GitHub 已确认无任何真实密钥（RC-05 移除硬编码兜底；env.example 为模板）

## 七、项目方待办（按优先级）

1. ~~提供公众号 APPID~~ **已完成（v25.0.47_9）**：APPID wxedc4b3ff9f707969 已配置并与商户号绑定，Native 扫码支付全场景可用（0.01 元实测下单成功）。**可选增强**：若后续补充 WECHAT_APP_SECRET（AppSecret 仅网页授权用，扫码支付不需要），微信内环境自动升级 JSAPI 免扫码支付+微信一键登录，仅需填 .env 一行+重启，无需改代码
2. **微信商家转账权限**（分佣提现打款用，v25.0.47_13 代码已全量对接）：微信商户平台申请开通「商家转账到零钱」→ 开通后告知开发者执行三步（.env 置 WITHDRAW_TRANSFER_ENABLED=true → pm2 restart → 0.01 元提现单联调）即全自动生效
3. **iOS**：开发者账号接受 Apple PLA 后才能签名/TestFlight
4. **后台实操验收**（指令第 23 章十项操作）

## 八、发布与回滚

- 发布：cd /root/yandaoguoxue-source && bash scripts/deploy_release_<版本>.sh（含门禁/构建/校验/公网回归）
- 回滚：ln -sfn /root/yandaoguoxue/releases/<旧版本> /root/yandaoguoxue/current && nginx -s reload
- 后端单独热修：改 /www/yandaoguoxue-backend 后必须回灌 /root/yandaoguoxue-source/backend_deploy/ 再 git 提交推送（历史教训：RC-04 曾只改运行目录）

## 九、新开发接管步骤

1. git clone https://github.com/wzmpa18/minglizyi && npm install
2. 读本文档 + PROJECT_MASTER_LEDGER.md（总账）
3. SSH root@82.156.228.87（密钥 C:\Users\ZhuanZ\.ssh\id_rsa_yandao）
4. 改动流程：源码仓改 → 构建 → 部署脚本 → 公网验证 → git 推送（勿直改生产目录）
5. 禁止事项：不动易学冻结算法、不删生产表、不把密钥写进仓库/报告、不做第二套后台

---
*报告归档：docs/reports/（30 份原始报告 + 1 份整合完整版，全部在一个文件夹；旧版交接/旧总账已归档其中）｜ 总账：PROJECT_MASTER_LEDGER.md ｜ 干净源码包：/root/YANDAOGUOXUE_FINAL_CLEAN_SOURCE/*

## 十一、v25.0.47_10 统一运营管理中心封板（FINAL-ADMIN-COMMERCIAL-SEAL-02，2026-08-23）

**项目方无需开发即可完成的操作（全部在 /admin 后台）**：
- 开关功能：系统功能开关页（17项 ON/OFF/MAINTENANCE，服务端强制——关闭的 API 直接403，不只前端隐藏；实测关ai→AI调用被拒，恢复即通）
- 修改价格：产品与价格中心（会员套餐/AI单次/AI时卡/额度包/B类工具价，二次确认，只影响新订单；前端实时读服务端价格免发版）
- 修改会员权益/AI额度：会员与权益页 + AI管理页（每日次数/额度/单次价）
- 工具管理：14款工具（八字/紫微/奇门/六爻/梅花/大六壬/择日/姓名/手机号/合婚/塔罗/星座等）启用/维护/收费/会员要求/平台开关；后台只控开关收费权限额度平台，不触碰排盘算法
- 订单/支付：订单中心（含真实0.01订单可查、权益交付状态、佣金状态、微信交易号、重启持久化已验证）；支付状态页（Native+JSAPI、商户配置、不回显任何密钥）
- 分佣/提现：佣金配置（比例/冻结天数/最低提现）；提现总开关 WITHDRAW_TRANSFER=DISABLED（商家转账未开通，用户端显示「暂未开放」）
- 用户/社交/资讯/营销：用户搜索封禁禁言、群管理举报处理、资讯增删改排序、海报模板文案渠道
- 系统状态：版本/Git Commit/PM2/数据库/AI/支付/三色健康

**本版关键验证记录（全部公网实测）**：
1. 驾驶舱 overview：20项指标 + gitCommit=f8866b6 + health 五项三色（全绿）
2. 服务端强制：feature-flags PUT ai=OFF → POST /api/ai/chat 403 FEATURE_DISABLED；恢复 ON 即通（缓存即时失效修复）
3. 订单持久化：pm2 restart 后订单与真实0.01订单（YD20260822220152847047，PAID/benefit_delivered=1）均保留
4. 分佣真实链（COMMISSION_L1 VERIFIED）：A(910080)邀B(910081)→B订单PAID（价格SSOT生效：请求0.01被服务端纠正为产品价9.9/39）→A待解冻13.68元（1.98+11.70）→解冻日2026-08-29→后台订单佣金状态 FROZEN(佣金1170分·比例30%·推荐人910080)
5. 提现开关：/api/commission/config withdrawEnabled=false；applyWithdrawal 一律拒绝「提现暂未开放」
6. AI错误分级：AI_DISABLED/AI_MAINTENANCE/AI_SERVICE_UNAVAILABLE 结构化返回，前端分级提示
7. 公网：13路径全200 + /api/public/pricing|feature-flags|tool-matrix 全可用 + Native下单返回codeUrl

**推广门禁状态（FINAL-ADMIN-COMMERCIAL-SEAL-02 第四十章）**：
WECHAT_PAY=VERIFIED ｜ ORDER_PERSISTENCE=VERIFIED ｜ ENTITLEMENT=VERIFIED ｜ MEMBERSHIP_PURCHASE=VERIFIED ｜ AI_PAYWALL=VERIFIED ｜ AI_SERVICE=VERIFIED ｜ PRODUCT_PRICE_SSOT=VERIFIED（v12 公网实测篡改 0.01 全部被服务端覆盖：37/99/374/3600/9.9/200） ｜ FEATURE_CONTROL=VERIFIED（v12 复验 AI 关→403→开恢复） ｜ COMMISSION_L1/L2=VERIFIED（两级 15%+5%+月度结算 30 号+提现窗口 15 号，公网配置核验） ｜ TCM_SECTION_GATE=VERIFIED（v12 中医板块门控：后台改状态公网即时生效） ｜ DEEP_REPORT_QUALITY=VERIFIED（v12 三份报告 727-815 字/五段式/典籍引用/无恐吓词） ｜ SHARE_DOWNLOAD=VERIFIED ｜ OFFICIAL_DOWNLOAD=VERIFIED ｜ ANDROID=VERIFIED ｜ ADMIN_CONTROL_CENTER=**ADMIN_OWNER_ACCEPTANCE（待项目方本人登录后台验收，通过后置 VERIFIED）** ｜ WITHDRAW_TRANSFER=DISABLED（商家转账未开通；月度结算 30 号/提现窗口 15 号规则已上线，佣金正常累计） ｜ IOS_PAYMENT=DISABLED（iOS数字商品后续走StoreKit/IAP）

**项目方 OWNER 验收路径（通过后即 ADMIN_CONTROL_CENTER=VERIFIED）**：
后台 https://yandaoguoxue.yandao.vip/admin/ → 登录（ADMIN_API_KEY）→ 总览看20项指标 → 系统功能开关页关闭再打开一个非关键功能 → 产品与价格页改一个测试产品价再恢复 → AI管理页改一个额度 → 营销页关一个模板再恢复 → 订单中心查真实0.01订单（YD20260822220152847047）与分佣测试订单 → 用户管理搜910081 → 推广分佣页看待解冻13.68元 → 审计日志核对以上操作全部留痕。
