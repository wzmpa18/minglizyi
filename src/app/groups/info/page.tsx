"use client";

// 20260819：静态导出修复——动态路由 /groups/info/[id] 仅生成 placeholder；
// 改为本静态页 + ?id= 查询参数
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import GroupInfoClient from "./[id]/ClientPage";

function GroupInfoInner() {
  const sp = useSearchParams();
  const id = sp.get("id") || "";
  if (!id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-gray-400">缺少群聊参数</p>
      </div>
    );
  }
  return <GroupInfoClient routeId={id} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <GroupInfoInner />
    </Suspense>
  );
}
