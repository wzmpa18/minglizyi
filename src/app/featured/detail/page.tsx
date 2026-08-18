"use client";

// 20260819：静态导出修复——动态路由 /featured/[category]/[id] 仅生成 placeholder；
// 改为本静态页 + ?category=&id= 查询参数
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import FeaturedItemClient from "../[category]/[id]/ClientPage";

function FeaturedDetailInner() {
  const sp = useSearchParams();
  const category = sp.get("category") || "";
  const id = sp.get("id") || "";
  if (!category || !id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-gray-400">缺少商品参数</p>
      </div>
    );
  }
  return <FeaturedItemClient routeCategory={category} routeId={id} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <FeaturedDetailInner />
    </Suspense>
  );
}
