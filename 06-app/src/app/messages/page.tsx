"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MessagesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/friends");
  }, [router]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-400">正在跳转...</p>
    </div>
  );
}
