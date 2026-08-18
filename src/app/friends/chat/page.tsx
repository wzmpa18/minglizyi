"use client";

// 20260819：静态导出修复——动态路由 /friends/chat/[id] 仅生成 placeholder，
// 真实ID跳转404被兜底到首页；改为本静态页 + ?id= 查询参数（与 /clients/detail 同模式）
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ChatClient from "./[id]/ClientPage";

function ChatInner() {
  const sp = useSearchParams();
  const id = sp.get("id") || "";
  if (!id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-gray-400">缺少好友参数</p>
      </div>
    );
  }
  return <ChatClient routeId={id} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ChatInner />
    </Suspense>
  );
}
