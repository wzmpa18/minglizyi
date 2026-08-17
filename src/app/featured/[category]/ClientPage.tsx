"use client";

import { useParams, useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { getCategory, getItemsByCategory, type FeaturedCategoryKey } from "@/lib/featuredStore";
import ConsultLive from "./ConsultLive";

const BRAND = "#7B2FBE";

export default function FeaturedCategoryPage() {
  const router = useRouter();
  const params = useParams<{ category: string }>();
  const categoryKey = params?.category as string;

  const category = getCategory(categoryKey);
  if (!category) {
    return (
      <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
        <BrandHeader title="言道精选" showBack />
        <div className="flex flex-col items-center justify-center pt-32">
          <p className="text-sm text-gray-400">分类不存在或已下线</p>
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

  const items = getItemsByCategory(category.key as FeaturedCategoryKey);

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <BrandHeader title={category.name} showBack />

      {/* 分类头图 */}
      <div className="px-4 py-4" style={{ background: category.gradient }}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{category.emoji}</span>
          <div>
            <p className="text-lg font-bold text-white">{category.name}</p>
            <p className="text-[11px] text-white/85">{category.subtitle}</p>
          </div>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-white/90">{category.description}</p>
      </div>

      {/* 商品列表 */}
      <div className="px-3 py-3 pb-24">
        {/* 咨询类目：优先渲染实时可预约服务区（P6-TOOL-04 §3.3） */}
        {category.key === "consult" && <ConsultLive />}

        {category.key === "consult" && items.length > 0 && (
          <p className="mb-2 mt-4 text-[12px] font-semibold text-gray-500">精选服务展示</p>
        )}

        {items.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">该分类暂无内容，持续上架中</div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => router.push(`/featured/${item.category}/${item.id}`)}
                className="rounded-2xl bg-white p-4 text-left shadow-sm active:scale-[0.99] transition-transform"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {item.tag && (
                      <span
                        className="mb-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: "#f5f0fa", color: BRAND }}
                      >
                        {item.tag}
                      </span>
                    )}
                    <p className="text-[15px] font-bold text-gray-800">{item.title}</p>
                    <p className="mt-1 text-xs text-gray-500">{item.summary}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.highlights.slice(0, 3).map((h, i) => (
                        <span key={i} className="rounded bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-400">
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-base font-bold" style={{ color: BRAND }}>{item.price}</p>
                    {item.originalPrice && (
                      <p className="text-[10px] text-gray-300 line-through">{item.originalPrice}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <p className="mt-4 text-center text-[10px] text-gray-300">
          {category.key === "consult"
            ? "真人服务由平台审核服务者提供 · 统一下单 · 担保结算 · 售后仲裁"
            : "下单与支付链路即将开放，当前为内容展示"}
        </p>
      </div>

      <div className="page-bottom-nav-safe" aria-hidden="true" />
    </div>
  );
}
