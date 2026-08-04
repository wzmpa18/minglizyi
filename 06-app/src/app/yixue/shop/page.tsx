"use client";

import React from "react";
import { ShoppingBag } from "lucide-react";

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
  { id: "p1", name: "罗盘", icon: "🧭", price: "敬请期待", desc: "风水堪舆必备工具" },
  { id: "p2", name: "铜钱", icon: "🪙", price: "敬请期待", desc: "六爻起卦专用" },
  { id: "p3", name: "命理书籍", icon: "📚", price: "敬请期待", desc: "经典命理著作" },
  { id: "p4", name: "八字排盘工具", icon: "📊", price: "敬请期待", desc: "专业排盘软件" },
  { id: "p5", name: "紫微斗数资料", icon: "⭐", price: "敬请期待", desc: "紫微学习教材" },
  { id: "p6", name: "奇门遁甲图", icon: "🏛️", price: "敬请期待", desc: "奇门排盘参考" },
  { id: "p7", name: "八卦镜", icon: "🪞", price: "敬请期待", desc: "镇宅化煞之物" },
  { id: "p8", name: "五帝钱", icon: "💰", price: "敬请期待", desc: "招财避邪利器" },
  { id: "p9", name: "易经挂图", icon: "🖼️", price: "敬请期待", desc: "六十四卦详解" },
  { id: "p10", name: "文房四宝", icon: "🖊️", price: "敬请期待", desc: "传统书写工具" },
];

// ==================== 主页面组件 ====================

export default function YixueShopPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#ededed]">

      {/* ========== 红色 Header ========== */}
      <header
        className="sticky top-0 z-40 flex items-center px-4"
        style={{ backgroundColor: "#7B2FBE", height: "48px" }}
      >
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-white" />
          <h1 className="text-lg font-bold text-white">言道商城</h1>
        </div>
      </header>

      {/* ========== 商品列表 ========== */}
      <div className="flex-1 px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          {PRODUCTS.map((product) => (
            <div
              key={product.id}
              className="flex flex-col items-center rounded-xl bg-white p-4 shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl">
                {product.icon}
              </div>
              <h3 className="mt-3 text-sm font-semibold text-gray-800">
                {product.name}
              </h3>
              <p className="mt-1 text-xs text-gray-400 text-center">
                {product.desc}
              </p>
              <button
                disabled
                className="mt-3 w-full rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-[#7B2FBE] cursor-not-allowed"
              >
                敬请期待
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ========== 底部免责声明 ========== */}
      <div className="px-4 py-4">
        <p className="text-center text-xs text-gray-400">
          商城功能开发中，所有商品敬请期待。本页面内容仅供展示参考。
        </p>
      </div>
    </div>
  );
}