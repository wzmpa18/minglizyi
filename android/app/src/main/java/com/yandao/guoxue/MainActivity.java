package com.yandao.guoxue;

import android.app.DownloadManager;
import android.content.Context;
import android.net.Uri;
import android.os.Environment;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.URLUtil;

import com.getcapacitor.BridgeActivity;

/**
 * v25.0.55: WebView 下载监听——壳内 location.href 指向 APK 等附件时，
 * 交系统 DownloadManager 下载（无此监听 WebView 会静默吞掉下载请求，
 * 「正在下载」Toast 永远不动即此因）。web 层 intent:// 兜底与此双保险。
 */
public class MainActivity extends BridgeActivity {

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
