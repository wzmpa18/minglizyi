# 言道国学 · FINAL_PROJECT_HANDOVER 最终交接报告

> 版本：v25.0.47_8 ｜ Git：80d3a4c（GitHub wzmpa18/minglizyi main）｜ 日期：2026-08-22
> 本文档为唯一主交接文档。历史部署/验收报告已全部收纳于 `docs/reports/`（28 份），不再另行生成独立报告。

## 一、项目概况

1. **项目**：言道国学（易学+中医学习 App/Web，Next.js 静态导出 + Node 后端 + SQLite）
2. **产品定位**：传统文化学习平台——易学排盘工具（八字/紫微/奇门/六爻/梅花/大六壬/择日/手机号/姓名/合婚/塔罗/星座）、中医学习与医考、AI 深度解读（付费）、社区群聊、推广分佣
3. **当前版本**：v25.0.47_8（buildId v25.0.47_D20260822）；后端热修含 RC-04(AI契约)/RC-05(密钥加固)/RC-06(支付真实化)
4. **生产域名**：https://yandaoguoxue.yandao.vip（H5，微信内体验完整支付链路）
5. **后台入口**：https://yandaoguoxue.yandao.vip/admin（言道国学运营管理中心；密钥在服务器 .env ADMIN_API_KEY，已配置）

## 二、目录与仓库

| 位置 | 路径 |
|---|---|
| GitHub | https://github.com/wzmpa18/minglizyi（main = 80d3a4c） |
| 本地主仓库 | C:\Users\ZhuanZ\Projects\minglizyi |
| 服务器源码仓 | /root/yandaoguoxue-source |
| 生产后端 | /www/yandaoguoxue-backend（PM2: yandaoguoxue-backend, 端口 3001） |
| 生产前端 | /root/yandaoguoxue/current → releases/v25.0.47_8 |
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
| WECHAT_PAY | **CODE_READY（差 APPID）** | 商户凭证齐全；缺公众号 APPID/SECRET（见待办 1） |
| COMMISSION_L1 | VERIFIED | 一级分佣自动记账 |
| WITHDRAWAL | IMPLEMENTED_NOT_VERIFIED | 需商家转账权限（见待办 2） |
| ADMIN_CENTER | READY_FOR_OWNER_ACCEPTANCE | 统一后台 /admin 全功能，待项目方实操验收 |
| ANDROID | VERIFIED | APK 可用（v25.0.47_6 包） |
| IOS | IOS_SIGNING_BLOCKED_BY_PLA | Apple PLA 未接受（见待办 3） |
| BACKUP / DEPLOYMENT / SOURCE_SYNC | VERIFIED | 每日 2 点 DB 备份；三端 HEAD 一致 80d3a4c |
| SOCIAL / GROUP_CHAT / DISCOVERY_NEWS / MARKETING / SHARE / DOWNLOAD | VERIFIED | 公网 200 回归通过 |

## 六、SECRET INVENTORY（只说位置，绝不写值）

- 生产密钥：/www/yandaoguoxue-backend/.env（HUNYUAN/AI、ADMIN_API_KEY、微信商户五件套、JWT）
- 微信支付证书：/www/yandaoguoxue-backend/certs/（apiclient_key.pem / wxpay_pub_key.pem，权限 600）
- Android keystore：本地 D:\最新言道学习APP 内项目资料（见项目方归档）
- 源码仓与 GitHub 已确认无任何真实密钥（RC-05 移除硬编码兜底；env.example 为模板）

## 七、项目方待办（按优先级）

1. **提供公众号 APPID + APP SECRET**（该公众号需与商户号 1116339601 绑定并开通 JSAPI 支付）：填入 /www/yandaoguoxue-backend/.env 的 WECHAT_APPID / WECHAT_APP_SECRET 两行 → `pm2 restart yandaoguoxue-backend` → 全站支付立即可用（前后端链路已全部就绪，勿需改代码）
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
*报告归档：docs/reports/（28 份历史部署/验收报告）｜ 总账：PROJECT_MASTER_LEDGER.md ｜ 干净源码包：YANDAOGUOXUE_FINAL_CLEAN_SOURCE/*