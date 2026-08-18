"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// P9-首发裁剪：个人开店/商城功能未开放，入口已隐藏，直达链接重定向首页
export default function YixueShopPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/");
  }, [router]);

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ backgroundColor: "#f5f5f5", maxWidth: "420px", margin: "0 auto" }}
    >
      <p className="text-sm text-gray-400">正在返回首页...</p>
    </div>
  );
}
