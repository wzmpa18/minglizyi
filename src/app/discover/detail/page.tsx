"use client";

// 20260819：静态导出修复——动态路由 /discover/[id] 仅生成 placeholder；
// 改为本静态页 + ?id= 查询参数（/discover 本身是信息流列表页，故用 /discover/detail）
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import DiscoverDetailClient from "../[id]/ClientPage";

function DiscoverDetailInner() {
  const sp = useSearchParams();
  const id = sp.get("id") || "";
  if (!id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-gray-400">缺少动态参数</p>
      </div>
    );
  }
  return <DiscoverDetailClient routeId={id} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <DiscoverDetailInner />
    </Suspense>
  );
}
