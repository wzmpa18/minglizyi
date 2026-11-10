package com.yandao.guoxue.wxapi;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import com.tencent.mm.opensdk.modelbase.BaseReq;
import com.tencent.mm.opensdk.modelbase.BaseResp;
import com.tencent.mm.opensdk.openapi.IWXAPI;
import com.tencent.mm.opensdk.openapi.IWXAPIEventHandler;
import com.tencent.mm.opensdk.openapi.WXAPIFactory;

/** Required OpenSDK return target; only the server confirms whether an order was paid. */
public class WXPayEntryActivity extends Activity implements IWXAPIEventHandler {
    private IWXAPI api;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        String appId = getSharedPreferences("wechat_app_pay", 0).getString("app_id", "");
        if (appId.isEmpty()) { finish(); return; }
        api = WXAPIFactory.createWXAPI(this, appId, true);
        if (!api.handleIntent(getIntent(), this)) finish();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (api == null || !api.handleIntent(intent, this)) finish();
    }

    @Override public void onReq(BaseReq request) { finish(); }

    @Override public void onResp(BaseResp response) {
        // A client callback can be missing or forged; the WebView polls the verified server order.
        finish();
    }
}
