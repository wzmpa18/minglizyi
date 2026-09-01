package com.yandao.guoxue;

import android.app.DownloadManager;
import android.content.Context;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.URLUtil;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

/**
 * v25.0.55: WebView 下载监听——壳内 location.href 指向 APK 等附件时，
 * 交系统 DownloadManager 下载（无此监听 WebView 会静默吞掉下载请求，
 * 「正在下载」Toast 永远不动即此因）。web 层 intent:// 兜底与此双保险。
 *
 * v25.0.74: 系统返回手势/返回键处理——用户反馈「安卓右滑不能返回上一级」。
 * Capacitor 8 BridgeActivity 不处理返回键（@capacitor/app 插件亦未安装），
 * 系统返回手势（右边缘向中间滑）直接走 Activity 默认行为 finish() 退出 APP，
 * WebView 历史栈（Next.js Link/router.push 产生的 history 记录）从未被消费。
 * 本回调统一接管：WebView 可后退 → goBack()（Next.js 响应 popstate 返回上一级，
 * 弹窗打开时 usePopupBackHandler 先消费 popstate 关弹窗，符合预期）；
 * 已在首页无历史 → 双击退出防误触。
 * OnBackPressedCallback 同时兼容传统 KEYCODE_BACK 与 Android 13+ 手势两种派发路径。
 */
public class MainActivity extends BridgeActivity {

    /** 双击退出的间隔阈值（ms） */
    private static final long DOUBLE_BACK_EXIT_MS = 2000;

    private long lastBackPressAt = 0L;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = (getBridge() != null) ? getBridge().getWebView() : null;
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                    return;
                }
                long now = System.currentTimeMillis();
                if (now - lastBackPressAt > DOUBLE_BACK_EXIT_MS) {
                    lastBackPressAt = now;
                    Toast.makeText(MainActivity.this, "再按一次返回键退出言道国学", Toast.LENGTH_SHORT).show();
                } else {
                    finish();
                }
            }
        });
    }

    @Override
    public void onResume() {
        super.onResume();
        if (this.getBridge() == null || this.getBridge().getWebView() == null) return;
        this.getBridge().getWebView().setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                try {
                    if (url == null || !url.startsWith("http")) return;
                    DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                    request.setMimeType(mimetype != null && mimetype.contains("android.package")
                            ? "application/vnd.android.package-archive" : mimetype);
                    String cookies = CookieManager.getInstance().getCookie(url);
                    if (cookies != null) request.addRequestHeader("cookie", cookies);
                    request.addRequestHeader("User-Agent", userAgent == null ? "" : userAgent);
                    request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    String fileName = URLUtil.guessFileName(url, contentDisposition, mimetype);
                    request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
                    DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                    dm.enqueue(request);
                } catch (Exception ignored) {
                    // 下载器异常时由 web 层 intent:// 兜底拉起系统浏览器
                }
            }
        });
    }
}
