"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { getCategory, getItem, CATEGORY_NAMES } from "@/lib/featuredStore";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";

const BRAND = "#7B2FBE";

export default function FeaturedItemPage() {
  const router = useRouter();
  const params = useParams<{ category: string; id: string }>();
  const [showBuyTip, setShowBuyTip] = useState(false);

  const categoryKey = params?.category as string;
  const itemId = params?.id as string;

  const category = getCategory(categoryKey);
  const item = getItem(categoryKey, itemId);

  useBodyScrollLock(showBuyTip);
  usePopupBackHandler(() => setShowBuyTip(false), showBuyTip);

  if (!category || !item) {
    return (
      <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
        <BrandHeader title="内容详情" showBack />
        <div className="flex flex-col items-center justify-center pt-32">
          <p className="text-sm text-gray-400">内容不存在或已下线</p>
          <button
            onClick={() => router.push("/featured")}
            className="mt-4 rounded-full px-5 py-2 text-xs font-semibold text-white"
            style={{ backgroundColor: BRAND }}
          >
            返回言道精选
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <BrandHeader title={CATEGORY_NAMES[item.category]} showBack />

      <div className="pb-28">
        {/* 头部卡片 */}
        <div className="px-4 py-4" style={{ background: category.gradient }}>
          <div className="flex items-start gap-3">
            <span className="text-4xl">{category.emoji}</span>
            <div className="min-w-0 flex-1">
              {item.tag && (
                <span className="mb-1 inline-block rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {item.tag}
                </span>
              )}
              <h1 className="text-lg font-bold leading-snug text-white">{item.title}</h1>
              <p className="mt-1 text-xs text-white/85">{item.summary}</p>
            </div>
          </div>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-2xl font-bold text-white">{item.price}</span>
            {item.originalPrice && (
              <span className="pb-1 text-xs text-white/60 line-through">{item.originalPrice}</span>
            )}
          </div>
        </div>

        {/* 亮点 */}
        <div className="mx-3 mt-3 overflow-hidden rounded-2xl bg-white shadow-sm">
          <p className="px-4 pb-2 pt-3.5 text-sm font-semibold text-gray-800">核心亮点</p>
          {item.highlights.map((h, i) => (
            <div key={i} className="flex items-center gap-2.5 px-4 py-2.5" style={{ borderTop: "1px solid #f8f8f8" }}>
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "#f5f0fa" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span className="text-sm text-gray-700">{h}</span>
            </div>
          ))}
        </div>

        {/* 图文详情 */}
        <div className="mx-3 mt-3 overflow-hidden rounded-2xl bg-white shadow-sm">
          <p className="px-4 pb-2 pt-3.5 text-sm font-semibold text-gray-800">详细介绍</p>
          <div className="px-4 pb-4">
            {item.detail.map((d, i) => (
              <div key={i} className="mb-2.5 flex gap-2 last:mb-0">
                <span className="mt-0.5 shrink-0 text-xs font-semibold" style={{ color: BRAND }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-[13px] leading-relaxed text-gray-600">{d}</p>
              </div>
            ))}
          </div>
        </div>

        {item.contactNote && (
          <div className="mx-3 mt-3 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-start gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <p className="text-xs leading-relaxed text-gray-500">{item.contactNote}</p>
            </div>
          </div>
        )}

        <p className="mt-4 px-6 text-center text-[10px] leading-relaxed text-gray-300">
          内容仅供传统文化学习参考，不构成医疗诊断、投资建议或人生决策依据
        </p>
      </div>

      {/* 底部操作栏（避开导航栏） */}
      <div
        className="modal-safe-bottom fixed bottom-0 left-1/2 z-30 flex w-full max-w-[420px] -translate-x-1/2 items-center gap-3 border-t border-gray-100 bg-white px-4 py-3"
      >
        <button
          onClick={() => router.push(`/featured/${item.category}`)}
          className="rounded-xl border px-4 py-2.5 text-sm font-semibold active:bg-gray-50"
          style={{ borderColor: "#e5e5e5", color: "#666" }}
        >
          返回列表
        </button>
        <button
          onClick={() => setShowBuyTip(true)}
          className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white active:opacity-85"
          style={{ backgroundColor: BRAND }}
        >
          {item.category === "consult" ? "预约咨询" : "立即获取"}
        </button>
      </div>

      {/* 下单提示弹窗（第一版：支付链路后续迭代） */}
      {showBuyTip && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowBuyTip(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 text-center shadow-xl">
            <div
              className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: "#f5f0fa" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <p className="text-sm font-bold text-gray-800">下单链路暂未开放</p>
            <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
              当前为内容架构展示阶段，支付与下单功能暂未开放
            </p>
            <button
              onClick={() => setShowBuyTip(false)}
              className="mt-4 w-full rounded-xl py-2.5 text-sm font-semibold text-white active:opacity-85"
              style={{ backgroundColor: BRAND }}
            >
              我知道了
            </button>
          </div>
        </>
      )}
    </div>
  );
}
