"use client";

// 20260819：静态导出修复——动态路由 /zhongyi/yangsheng/[id] 仅生成 placeholder；
// 改为本静态页 + ?id= 查询参数（/zhongyi/yangsheng 本身是列表页，故用 detail 子路径）
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import YangshengClient from "../[id]/ClientPage";

function YangshengDetailInner() {
  const sp = useSearchParams();
  const id = sp.get("id") || "";
  if (!id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-gray-400">缺少功法参数</p>
      </div>
    );
  }
  return <YangshengClient routeId={id} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <YangshengDetailInner />
    </Suspense>
  );
}
