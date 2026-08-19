"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageLoginGuard } from "@/components/PageLoginGuard";

// v25.0.41：消息中心统一——/messages 重定向到聊天主页（消息Tab为服务端统一会话模型）
export default function MessagesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/friends");
  }, [router]);

  return (
    <>
      <PageLoginGuard />
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-gray-400">正在进入消息中心…</p>
      </div>
    </>
  );
}
