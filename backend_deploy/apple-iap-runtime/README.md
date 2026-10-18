# 言道国学 Apple 购买服务

这是持久维护的服务端依赖目录，隔离安装苹果官方签名验证库，不能对生产后端根目录执行会裁剪其他依赖的 `npm ci`。

部署时在此目录执行 `npm ci --ignore-scripts`。版本及完整性由 package-lock.json 固定。公共根证书位于相邻 apple-root-certificates，来源及 SHA-256 见 manifest.json；不需要将 App Store Connect 私钥放到业务服务器。

挂载 appleIapRoutes.createRouter() 到 `/api/apple-iap`。`/context` 和 `/transactions` 均要求真实有效账号 JWT；Apple 通知为 `/notifications`，仅接受官方库完成证书链、签名、应用、环境检查后的载荷。App Store Connect 的生产及沙盒通知地址都应配置为 `https://yandaoguoxue.yandao.vip/api/apple-iap/notifications` 并使用 V2。

只接收目录中的8个商品，数量必须为1，appAccountToken 由服务器生成并唯一绑定言道账号。未交付订单不 finish；客户端启动、前台恢复、网络恢复及人工恢复都会核对历史。点数永久有效且幂等；固定期限会员按购买时间计算，历史已过期时卡不会增加当前安卓会员的时长。

交易主键包含 Production/Sandbox，Sandbox 不进入生产收入统计。默认禁止沙盒交付；仅通过服务端 `APPLE_IAP_SANDBOX_USER_IDS` 显式列入的**专用测试账号**可交付沙盒权益，不得加入真实付费客户账号。专用测试账号的会员/点数用于 App Review 与 TestFlight 体验；其用户账本亦须作为测试数据排除统计。正式顾客的 Production 购买无需白名单。此设置按交易的 Apple 已签名环境判断，绝不以客户端请求头决定环境，亦不按审核进度改变功能。

退款和撤销只影响对应订单，重复和陈旧回执不会恢复权益。官方 REFUND_REVERSED 通知可恢复尚未使用的剩余点数/原会员赠予；不会补回消费过的点数。会员账本重新计算独立安卓购买；管理员主动调整/注销的时间界限不会被旧购买恢复覆盖。失败通知返回非2xx以由Apple重试。

当前代码接入不代表已部署、已通过苹果沙盒购买或已送审；真实状态须查项目唯一交接报告。首次上架内购需随实际新binary一起送审，并补商品可售地区、审核截图和操作说明。不能用网页价格冒充StoreKit价格，不能用伪造JWS或Xcode本地测试的交易在生产发权益。

官方依据：
- https://github.com/apple/app-store-server-library-node
- https://www.apple.com/certificateauthority/
- https://developer.apple.com/documentation/storekit/transaction/all
- https://developer.apple.com/documentation/storekit/transaction/unfinished
