package com.yandao.guoxue.plugins;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.tencent.mm.opensdk.modelpay.PayReq;
import com.tencent.mm.opensdk.openapi.IWXAPI;
import com.tencent.mm.opensdk.openapi.WXAPIFactory;

/** Opens the official WeChat cashier. Order fulfillment is decided by the server callback/query. */
@CapacitorPlugin(name = "WeChatAppPay")
public class WeChatAppPayPlugin extends Plugin {
    @PluginMethod
    public void pay(PluginCall call) {
        String appId = call.getString("appId", "");
        String partnerId = call.getString("partnerId", "");
        String prepayId = call.getString("prepayId", "");
        String packageValue = call.getString("packageValue", "");
        String nonceStr = call.getString("nonceStr", "");
        String timeStamp = call.getString("timeStamp", "");
        String sign = call.getString("sign", "");
        if (!appId.matches("(?i)wx[0-9a-z]{16}") || partnerId.isEmpty() || prepayId.isEmpty()
                || !"Sign=WXPay".equals(packageValue) || nonceStr.isEmpty()
                || !timeStamp.matches("[0-9]{10}") || sign.isEmpty()) {
            call.reject("微信APP支付参数不完整");
            return;
        }
        final IWXAPI api = WXAPIFactory.createWXAPI(getContext(), appId, true);
        if (!api.isWXAppInstalled()) {
            call.reject("请先安装微信，再完成付款");
            return;
        }
        getContext().getSharedPreferences("wechat_app_pay", 0).edit().putString("app_id", appId).apply();
        PayReq request = new PayReq();
        request.appId = appId;
        request.partnerId = partnerId;
        request.prepayId = prepayId;
        request.packageValue = packageValue;
        request.nonceStr = nonceStr;
        request.timeStamp = timeStamp;
        request.sign = sign;
        new Thread(() -> {
            try {
                api.registerApp(appId);
                if (!api.sendReq(request)) {
                    call.reject("无法打开微信收银台，请检查移动应用包名、签名和商户绑定");
                    return;
                }
                JSObject result = new JSObject();
                result.put("launched", true);
                call.resolve(result);
            } catch (Exception e) {
                call.reject("微信支付启动失败，请稍后重试");
            }
        }, "wechat-app-pay").start();
    }
}
