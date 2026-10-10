"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function SocialDisabledGuard() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 text-center text-sm text-gray-500">
      本版本暂不提供公开交流功能，正在返回首页…
    </main>
  );
}
