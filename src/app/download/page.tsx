"use client";

import React, { useEffect, useState } from "react";
import { BrandHeader } from "@/components/shared";
import { makeQrDataUrl } from "@/lib/qrLocal";

const BRAND = "#7B2FBE";
const DOWNLOAD_URL = "https://yandaoguoxue.yandao.vip/friend";
const APK_URL = "https://yandaoguoxue.yandao.vip/app-download/yandao-guoxue-v25.0.42-release.apk";

/** 功能亮点列表 */
const FEATURES: { icon: string; title: string; desc: string }[] = [
  { icon: "🔮", title: "专业排盘", desc: "14款排盘工具，基础永久免费" },
  { icon: "📚", title: "典籍学习", desc: "中医经典古籍免费查阅" },
  { icon: "🤝", title: "同道交流", desc: "同好社区，师父咨询通道" },
  { icon: "🧘", title: "养生功法", desc: "养生功法学习模块" },
  { icon: "👈", title: "手势返回", desc: "右滑手势返回全局生效" },
  { icon: "🔐", title: "永久登录", desc: "登录态永久持久化" },
];

export default function DownloadPage() {
  // P9：本地生成 APK 下载二维码，不依赖境外 qrserver 服务
  const [downloadQrUrl, setDownloadQrUrl] = useState("");

  useEffect(() => {
    makeQrDataUrl(APK_URL, { width: 240, dark: "#7B2FBE" })
      .then(setDownloadQrUrl)
      .catch(() => {});
  }, []);

  const handleDownloadAPK = () => {
    window.location.href = APK_URL;
  };

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "#f5f5f5", maxWidth: "420px", margin: "0 auto" }}
    >
      <BrandHeader title="下载APP" showBack />

      {/* ===== 顶部 APP 图标与标题 ===== */}
      <div
        className="flex flex-col items-center px-4 pt-10 pb-8"
        style={{
          background: `linear-gradient(135deg, ${BRAND}, #9B5ECF)`,
        }}
      >
        <div
          className="flex h-24 w-24 items-center justify-center rounded-3xl mb-4"
          style={{
            backgroundColor: "rgba(255,255,255,0.2)",
            border: "2px solid rgba(255,255,255,0.3)",
          }}
        >
          <span className="text-4xl font-bold text-white">言</span>
        </div>
        <h1 className="text-2xl font-bold text-white">言道国学</h1>
        <p className="mt-2 text-sm text-white/85">
          v1.1.0 | 更新日期 2026.08.10
        </p>
        <p className="mt-1 text-xs text-white/60">
          传承千年智慧，感悟国学之美
        </p>
      </div>

      {/* ===== 功能亮点列表 ===== */}
      <div className="mx-3 mt-4 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs font-medium text-gray-400">功能亮点</p>
        </div>
        <div className="px-4 py-3 grid grid-cols-2 gap-3">
          {FEATURES.map((feature, index) => (
            <div
              key={index}
              className="flex items-start gap-2 rounded-lg p-2.5"
              style={{ backgroundColor: "#f9f5fc" }}
            >
              <span className="text-xl shrink-0">{feature.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">
                  {feature.title}
                </p>
                <p className="text-xs text-gray-500">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== 下载按钮 ===== */}
      <div className="mx-3 mt-4">
        <button
          onClick={handleDownloadAPK}
          className="w-full rounded-xl py-3.5 text-sm font-bold text-white active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          style={{ backgroundColor: BRAND }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          下载安卓APK
        </button>
        <p className="mt-2 text-center text-xs text-gray-400">
          支持 Android 8.0 及以上系统
        </p>

        {/* iOS 说明（P9：不可点击占位按钮改为纯文本说明） */}
        <p className="mt-3 text-center text-xs text-gray-400">
          iOS 版本暂未发布，可先通过 Safari 添加到主屏幕使用网页版
        </p>
      </div>

      {/* ===== 扫码下载区域 ===== */}
      <div className="mx-3 mt-4 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <p className="text-sm font-semibold text-gray-800 text-center">
            扫码下载
          </p>
        </div>
        <div className="flex flex-col items-center px-4 pb-5">
          <div
            className="flex h-48 w-48 items-center justify-center rounded-xl border-2 overflow-hidden"
            style={{ borderColor: BRAND }}
          >
            {downloadQrUrl ? (
              <img
                src={downloadQrUrl}
                alt="下载二维码"
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="text-xs text-gray-400">二维码生成中...</span>
            )}
          </div>
          <p className="mt-3 text-sm font-medium" style={{ color: BRAND }}>
            扫码下载言道国学APP
          </p>
          <p className="mt-1 text-xs text-gray-400">
            使用手机浏览器或微信扫一扫
          </p>
        </div>
      </div>

      {/* ===== 底部合规声明 ===== */}
      <div className="mx-3 mt-4 mb-6 rounded-xl bg-gray-50 p-4">
        <p className="text-xs leading-relaxed text-gray-500">
          <span className="font-semibold text-gray-600">免责声明：</span>
          本应用内容仅供传统文化学习研究参考，不构成医疗诊断、投资建议或人生决策依据。下载及使用本应用即表示您已阅读并同意《用户协议》和《隐私政策》。言道国学不对内容的准确性、完整性作任何保证。
        </p>
        <div className="mt-3 pt-3 text-center" style={{ borderTop: "1px solid #e5e5e5" }}>
          <p className="text-xs text-gray-400">© 2026 言道国学</p>
          <p className="text-xs text-gray-400 mt-0.5">东莞言道科技有限公司 · 版权所有</p>
          <p className="text-xs text-gray-400 mt-0.5">yandao.vip</p>
        </div>
      </div>

      <div className="page-bottom-nav-safe" aria-hidden="true" />
    </div>
  );
}
