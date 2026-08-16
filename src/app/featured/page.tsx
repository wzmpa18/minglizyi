"use client";

import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { FEATURED_CATEGORIES, FEATURED_ITEMS } from "@/lib/featuredStore";

const BRAND = "#7B2FBE";

export default function FeaturedPage() {
  const router = useRouter();

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <BrandHeader title="言道精选" showBack />

      {/* 顶部定位说明 */}
      <div
        className="px-4 pb-4 pt-4"
        style={{ background: `linear-gradient(180deg, ${BRAND} 0%, #8E44AD 60%, #f5f5f5 100%)` }}
      >
        <div className="rounded-2xl bg-white/95 p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl text-base font-bold text-white"
              style={{ backgroundColor: BRAND }}
            >
              言
            </span>
            <div>
              <p className="text-base font-bold text-gray-800">言道精选</p>
              <p className="text-[11px] text-gray-400">全品类内容变现与服务入口</p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-gray-500">
            覆盖实体好物、数字产品、咨询服务与课程专栏四大品类，为传统文化学习与研习提供完整的服务配套。
          </p>
        </div>
      </div>

      {/* 四大分类卡片 */}
      <div className="px-3 pb-24 pt-1">
        <div className="grid grid-cols-2 gap-3">
          {FEATURED_CATEGORIES.map((cat) => {
            const count = FEATURED_ITEMS.filter((i) => i.category === cat.key).length;
            return (
              <button
                key={cat.key}
                onClick={() => router.push(`/featured/${cat.key}`)}
                className="flex flex-col rounded-2xl bg-white p-4 text-left shadow-sm active:scale-[0.98] transition-transform"
              >
                <div
                  className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                  style={{ background: cat.gradient }}
                >
                  {cat.emoji}
                </div>
                <p className="text-[15px] font-bold text-gray-800">{cat.name}</p>
                <p className="mt-1 text-[11px] leading-snug text-gray-400">{cat.subtitle}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] text-gray-300">{count} 个精选</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>

        {/* 分类简介列表 */}
        <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">
          {FEATURED_CATEGORIES.map((cat, idx) => (
            <button
              key={cat.key}
              onClick={() => router.push(`/featured/${cat.key}`)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-gray-50"
              style={{ borderBottom: idx === FEATURED_CATEGORIES.length - 1 ? "none" : "1px solid #f5f5f5" }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg"
                style={{ background: cat.gradient }}
              >
                {cat.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-800">{cat.name}</p>
                <p className="truncate text-[11px] text-gray-400">{cat.description}</p>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>

        <p className="mt-4 text-center text-[10px] leading-relaxed text-gray-300">
          言道精选内容仅供传统文化学习参考<br />下单与支付链路即将开放，敬请期待
        </p>
      </div>

      <div className="page-bottom-nav-safe" aria-hidden="true" />
    </div>
  );
}
