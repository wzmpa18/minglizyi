# 微信 APP 支付接入（公司直装 Android 包）

## 渠道边界

- `NEXT_PUBLIC_STORE_CHANNEL=default` 或 `internal` 的 Android 原生包才调用 OpenSDK APP 支付。
- 华为、Google Play、iOS 和其他商店包不包含此次 OpenSDK 原生代码，原有支付政策与产品入口另按各商店审核处理。
- 微信浏览器的 JSAPI 与网页版二维码支付保持原流程。APP 支付须使用微信开放平台**移动应用** AppID，不能复用公众号 `WECHAT_APPID`。

## 商户配置

服务端 `.env` 增加 `WECHAT_OPEN_APP_ID=wx...`。原有 `WECHAT_MCH_ID`、`WECHAT_API_V3_KEY`、`WECHAT_API_CERT_PATH`、`WECHAT_CERT_SERIAL_NO` 继续使用，不在 Android 包中放入私钥。配置前核实：

1. 微信开放平台移动应用已审核，包名为 `com.yandao.guoxue`，登记的 Android 签名为正式 APK 的 MD5 签名。
2. 微信支付商户平台已开通“APP 支付”，并将该移动应用 AppID 授权绑定到当前商户号。
3. 服务端可正常接收 `/api/payment/callback/wechat`，并可主动向微信查单。

缺少移动应用 AppID 时服务端拒绝 APP 下单，不会退化为二维码以掩盖配置错误。生产启用前需在真实安装包上完成一笔授权的小额支付及退款/对账核验；不得把编译或模拟下单称为实付成功。

### 公司账号申请资料（2026-11-10 核验）

- 应用名称：言道国学；企业主体：东莞言道科技有限公司；Android 包名：`com.yandao.guoxue`。
- 从已上架的腾讯 2160 和华为 2161 正式 APK 读回的签名证书 MD5：`3726B77289A1A6771CCACCA47AFD22D9`。创建微信开放平台移动应用时填写的是该正式签名，不是调试包签名。
- 应用宝公开上架页：`https://sj.qq.com/appdetail/com.yandao.guoxue`，显示图标、介绍、开发者与下载二维码。2026-11-10 页面截图见 `C:/Users/ZhuanZ/Documents/Codex/2026-11-03/new-chat/outputs/store-status-2026-11-10/tencent-mystore-listed-introduction.jpg`。
- 官网申请顺序：开放平台账号认证 → 管理中心创建/查看“移动应用”并取得其 AppID → 商户平台「产品中心 → APP支付 → 申请开通」填写移动 AppID、上架链接和真实 App 截图 → 等待审核 → 商户平台「产品中心 → APPID授权管理」发起绑定 → 开放平台移动应用详情的「能力专区 → 微信支付」确认绑定。已有商户号申请 APP 支付，官方指引称审核在 7 个工作日内；提交申请不等于已开通。
- 申请所需真实图：应用市场上架页、App 首页、应用内售卖商品/服务页和 App 尾页（官方称尾页可用软著替代）。历史截图须核对与现行包一致。商户号与移动 AppID 的授权协议须由账号负责人阅读并确认。

## 调用与验证

客户端请求 `/api/payment/create` 时发送 `payMode: "APP"`；服务端按既有价格表裁决金额，用移动 AppID 调 `/v3/pay/transactions/app`，再用商户私钥签名 APP 拉起参数。Android OpenSDK 只负责打开收银台及返回，支付成功和权益发放只看服务端验签回调或查单，且核对商户号、金额及移动 AppID。

本地核验：`node --test scripts/wechat-app-pay.test.cjs`、`npx tsc --noEmit`、`NEXT_PUBLIC_STORE_CHANNEL=internal` 的 Android 编译。商店包还须单独构建确认没有微信 APP 支付 SDK/插件，不能直接复用直装包。

官方依据：[APP 下单](https://pay.wechatpay.cn/doc/v3/merchant/4013070347)、[APP 调起支付](https://pay.wechatpay.cn/doc/v3/merchant/4013070351)、[APP 调起签名](https://pay.wechatpay.cn/doc/v3/merchant/4012365340)。

申请依据：[官方开通流程](https://pay.wechatpay.cn/doc/v3/merchant/4015478291)、[已有商户号申请 APP 支付](https://pay.wechatpay.cn/doc/v3/merchant/4013070174)、[移动 AppID 与商户号授权绑定](https://pay.wechatpay.cn/doc/v3/merchant/4013289251)。
