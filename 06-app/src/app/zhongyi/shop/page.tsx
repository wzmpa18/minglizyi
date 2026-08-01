"use client";

import React from "react";
import { ShoppingBag } from "lucide-react";
import { BrandHeader } from "@/components/shared";

// ==================== 类型定义 ====================

interface ShopProduct {
  id: string;
  name: string;
  icon: string;
  price: string;
  desc: string;
}

// ==================== 模拟数据 ====================

const PRODUCTS: ShopProduct[] = [
  { id: "p1", name: "中药饮片", icon: "🌿", price: "敬请期待", desc: "道地药材，品质保证" },
  { id: "p2", name: "养生茶饮", icon: "🍵", price: "敬请期待", desc: "调理身体，日常养生" },
  { id: "p3", name: "经络图谱", icon: "🗺️", price: "敬请期待", desc: "十二经络详解图" },
  { id: "p4", name: "中医书籍", icon: "📖", price: "敬请期待", desc: "经典中医著作" },
  { id: "p5", name: "针灸模型", icon: "🧍", price: "敬请期待", desc: "穴位定位学习模型" },
  { id: "p6", name: "艾灸器具", icon: "🔥", price: "敬请期待", desc: "温经散寒保健" },
  { id: "p7", name: "拔罐套装", icon: "🫙", price: "敬请期待", desc: "祛风散寒排毒" },
  { id: "p8", name: "刮痧板", icon: "💎", price: "敬请期待", desc: "疏通经络活血" },
  { id: "p9", name: "药膳食谱", icon: "🍲", price: "敬请期待", desc: "食疗养生大全" },
  { id: "p10", name: "脉诊垫", icon: "🫳", price: "敬请期待", desc: "切脉练习工具" },
];

// ==================== 主页面组件 ====================

export default function ZhongyiShopPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0f1419", color: "#e7e9ea" }}>
      <BrandHeader title="中医商城" showBack={true} backUrl="/zhongyi" />

      {/* ========== Header - 深色主题 ========== */}
      <header
        className="sticky top-0 z-40 flex items-center px-4 border-b"
        style={{
          backgroundColor: "#15202b",
          height: "48px",
          borderColor: "#2f3336",
        }}
      >
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-emerald-400" />
          <h1 className="text-lg font-bold" style={{ color: "#e7e9ea" }}>中医商城</h1>
        </div>
      </header>

      {/* ========== Banner ========== */}
      <div
        className="mx-4 mt-4 rounded-xl p-4 text-center"
        style={{
          background: "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.05))",
          border: "1px solid rgba(16,185,129,0.2)",
        }}
      >
        <p className="text-sm font-medium text-emerald-400">中医商城即将上线</p>
        <p className="mt-1 text-xs" style={{ color: "#71767b" }}>
          精选道地药材、养生好物，敬请期待
        </p>
      </div>

      {/* ========== 商品列表 ========== */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          {PRODUCTS.map((product) => (
            <div
              key={product.id}
              className="flex flex-col items-center rounded-xl border p-4 transition-all"
              style={{
                backgroundColor: "#15202b",
                borderColor: "#2f3336",
              }}
            >
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full text-3xl"
                style={{ backgroundColor: "rgba(16,185,129,0.1)" }}
              >
                {product.icon}
              </div>
              <h3 className="mt-3 text-sm font-semibold" style={{ color: "#e7e9ea" }}>
                {product.name}
              </h3>
              <p className="mt-1 text-xs text-center" style={{ color: "#71767b" }}>
                {product.desc}
              </p>
              <button
                disabled
                className="mt-3 w-full rounded-lg px-3 py-2 text-xs font-medium cursor-not-allowed"
                style={{
                  backgroundColor: "rgba(16,185,129,0.1)",
                  color: "rgb(16,185,129)",
                }}
              >
                敬请期待
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ========== 底部免责声明 ========== */}
      <div className="px-4 py-4 pb-8">
        <p className="text-center text-xs" style={{ color: "#536471" }}>
          商城功能开发中，所有商品敬请期待。本页面内容仅供展示参考。
        </p>
      </div>
    </div>
  );
}