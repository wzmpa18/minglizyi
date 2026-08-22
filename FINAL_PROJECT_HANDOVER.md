# 言道国学 · FINAL_PROJECT_HANDOVER 最终交接报告

> 版本：v25.0.47_10 ｜ Git：f8866b6（GitHub wzmpa18/minglizyi main）｜ 日期：2026-08-23
> 本文档为唯一主交接文档。历史部署/验收报告已全部收纳于 `docs/reports/`（30 份原始报告 + 1 份整合完整版《20260822_全部报告整合_完整版.md》，全部集中在这一个文件夹），不再另行生成独立报告。

## 一、项目概况

1. **项目**：言道国学（易学+中医学习 App/Web，Next.js 静态导出 + Node 后端 + SQLite）
2. **产品定位**：传统文化学习平台——易学排盘工具（八字/紫微/奇门/六爻/梅花/大六壬/择日/手机号/姓名/合婚/塔罗/星座）、中医学习与医考、AI 深度解读（付费）、社区群聊、推广分佣
3. **当前版本**：v25.0.47_10（buildId v25.0.47_D20260823）；含 RC-04~06 热修 + v25.0.47_9 支付解耦 + v25.0.47_10 运营管理中心封板
4. **生产域名**：https://yandaoguoxue.yandao.vip（H5，微信内体验完整支付链路）
5. **后台入口**：https://yandaoguoxue.yandao.vip/admin（**言道国学运营管理中心**，唯一正式入口；密钥在服务器 .env ADMIN_API_KEY，env 密钥映射 SUPER_ADMIN 最高权限；17项固定菜单：总览/用户管理/工具管理/产品与价格/会员与权益/AI管理/学习中医/社交群聊/发现资讯/营销海报/推广分佣/支付订单/提现/内容审核/系统功能开关/审计日志/系统状态；移动端抽屉导航可用）

## 二、目录与仓库

| 位置 | 路径 |
|---|---|
| GitHub | https://github.com/wzmpa18/minglizyi（main = f3eaeda） |
| 本地主仓库 | C:\Users\ZhuanZ\Projects\minglizyi |
| 服务器源码仓 | /root/yandaoguoxue-source |
| 生产后端 | /www/yandaoguoxue-backend（PM2: yandaoguoxue-backend, 端口 3001） |
| 生产前端 | /root/yandaoguoxue/current → releases/v25.0.47_10 |
| 数据库 | /root/backend-auth/data/yandao_users.db（SQLite WAL, 18 表, 46 用户） |
| 签名/证书 | Android keystore 与微信支付证书见 SECRET INVENTORY 一节 |

## 三、技术栈与架构

- **前端**：Next.js 静态导出（bash build.sh：临时移除 api 路由 → next build → out/），烧录 buildId 防更新死循环
- **后端**：Node + Express 风格路由（server.js 统一挂载，register_routes.js 注册），better-sqlite3
- **AI**：POST /api/ai/chat（双格式兼容：{systemPrompt,userPrompt} 与 {messages}）；上游混元 tokenhub（HUNYUAN_API_URL/HUNYUAN_API_KEY，RC-04 修复后全站正常）
- **支付**：微信支付 V3 JSAPI（wechatPayV3.js，公钥模式）；下单 POST /api/payment/create → 微信回调 /api/payment/callback/wechat（验签+解密+幂等）→ 订单 PAID → **权益交付 deliverOrderBenefits**（v25.0.47_8 新增：MEMBERSHIP 开通会员 users.member_level/membership_expiry 续费顺延；POINTS_RECHARGE 积分入账 user_assets+points_transactions）；benefit_delivered 持久化 + query 接口补交付兜底
- **会员/权益**：服务端 users 表为唯一事实源（middleware/auth.js getMembershipFromDB）；前端 membershipStore 仅展示缓存
- **分佣**：commissionEngine 一级分佣（7 天冻结/幂等/退款冲正）；订单 PAID 自动记账
- **社区**：群聊/好友/动态（SQLite 持久化）
- **资讯**：/api/news（已恢复，公网 200）

## 四、本次会话（2026-08-22 晚）完成的 RC-06 支付真实化

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
| COMMISSION_L1 | VERIFIED | 一级分佣自动记账 |
| WITHDRAWAL | IMPLEMENTED_NOT_VERIFIED | 需商家转账权限（见待办 2） |
| ADMIN_CENTER | READY_FOR_OWNER_ACCEPTANCE | 统一后台 /admin 全功能，待项目方实操验收 |
| ANDROID | VERIFIED | APK 可用（v25.0.47_6 包） |
| IOS | IOS_SIGNING_BLOCKED_BY_PLA | Apple PLA 未接受（见待办 3） |
| BACKUP / DEPLOYMENT / SOURCE_SYNC | VERIFIED | 每日 2 点 DB 备份；三端 HEAD 一致 f3eaeda |
| SOCIAL / GROUP_CHAT / DISCOVERY_NEWS / MARKETING / SHARE / DOWNLOAD | VERIFIED | 公网 200 回归通过 |

## 六、SECRET INVENTORY（只说位置，绝不写值）

- 生产密钥：/www/yandaoguoxue-backend/.env（HUNYUAN/AI、ADMIN_API_KEY、微信商户五件套、JWT）
- 微信支付证书：/www/yandaoguoxue-backend/certs/（apiclient_key.pem / wxpay_pub_key.pem，权限 600）
- Android keystore：本地 D:\最新言道学习APP 内项目资料（见项目方归档）
- 源码仓与 GitHub 已确认无任何真实密钥（RC-05 移除硬编码兜底；env.example 为模板）

## 七、项目方待办（按优先级）

1. ~~提供公众号 APPID~~ **已完成（v25.0.47_9）**：APPID wxedc4b3ff9f707969 已配置并与商户号绑定，Native 扫码支付全场景可用（0.01 元实测下单成功）。**可选增强**：若后续补充 WECHAT_APP_SECRET（AppSecret 仅网页授权用，扫码支付不需要），微信内环境自动升级 JSAPI 免扫码支付+微信一键登录，仅需填 .env 一行+重启，无需改代码
2. **微信商家转账权限**（分佣提现打款用）：商户平台申请开通
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
WECHAT_PAY=VERIFIED ｜ ORDER_PERSISTENCE=VERIFIED ｜ ENTITLEMENT=VERIFIED ｜ MEMBERSHIP_PURCHASE=VERIFIED ｜ AI_PAYWALL=VERIFIED ｜ AI_SERVICE=VERIFIED ｜ PRODUCT_PRICE_SSOT=VERIFIED ｜ FEATURE_CONTROL=VERIFIED ｜ COMMISSION_L1=VERIFIED（服务端链+补单状态机；待项目方真实扫码复验） ｜ SHARE_DOWNLOAD=VERIFIED ｜ OFFICIAL_DOWNLOAD=VERIFIED ｜ ANDROID=VERIFIED ｜ ADMIN_CONTROL_CENTER=**ADMIN_OWNER_ACCEPTANCE（待项目方本人登录后台验收，通过后置 VERIFIED）** ｜ WITHDRAW_TRANSFER=DISABLED（商家转账未开通，不影响Web/Android首期推广） ｜ IOS_PAYMENT=DISABLED（iOS数字商品后续走StoreKit/IAP）

**项目方 OWNER 验收路径（通过后即 ADMIN_CONTROL_CENTER=VERIFIED）**：
后台 https://yandaoguoxue.yandao.vip/admin/ → 登录（ADMIN_API_KEY）→ 总览看20项指标 → 系统功能开关页关闭再打开一个非关键功能 → 产品与价格页改一个测试产品价再恢复 → AI管理页改一个额度 → 营销页关一个模板再恢复 → 订单中心查真实0.01订单（YD20260822220152847047）与分佣测试订单 → 用户管理搜910081 → 推广分佣页看待解冻13.68元 → 审计日志核对以上操作全部留痕。
