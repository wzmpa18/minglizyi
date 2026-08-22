"use client";

import { SectionGate } from "@/components/SectionGate";
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

function PageOriginal() {
  return (
    <Suspense fallback={null}>
      <YangshengDetailInner />
    </Suspense>
  );
}

// v25.0.47_12: 中医板块知识开放程度门控（后台工具矩阵实时控制：开放/会员专享/维护/关闭）
export default function Page() {
  return (
    <SectionGate toolId="zhongyi_yangsheng" title="养生功法">
      <PageOriginal />
    </SectionGate>
  );
}
