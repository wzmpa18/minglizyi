"use client";

import { BrandHeader } from "@/components/shared";

const BRAND = "#7B2FBE";

export default function YixueShopPage() {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: "#f5f5f5", maxWidth: "420px", margin: "0 auto" }}
    >
      <BrandHeader title="言道商城" showBack />

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-20">
        <div
          className="mb-6 flex h-24 w-24 items-center justify-center rounded-full"
          style={{ backgroundColor: `${BRAND}14` }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke={BRAND}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
            <path d="M3 6h18" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
        </div>
        <h2
          className="text-lg font-semibold"
          style={{ color: BRAND }}
        >
          商城即将上线，敬请关注
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          我们正在精心准备易学好物，即将与大家见面
        </p>
      </div>
    </div>
  );
}
