"use client";

// ============================================================================
// 板块开放程度门控组件 - v25.0.47_12
// 用法：页面默认导出外层包裹
//   <SectionGate toolId="zhongyi_classic" title="典籍文库">
//     <原页面内容 />
//   </SectionGate>
// 矩阵判定：加载中→骨架；关闭/维护→提示卡；会员专享→升级引导；开放→渲染内容
// ============================================================================

import React from "react";
import { useRouter } from "next/navigation";
import { useSectionGate } from "@/lib/sectionGate";

const BRAND = "#7B2FBE";

export function SectionGate({
  toolId,
  title,
  backHref = "/zhongyi",
  children,
}: {
  toolId: string;
  title: string;
  backHref?: string;
  children: React.ReactNode;
}) {
  const gate = useSectionGate(toolId);

  if (gate.loading) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FAFAFA",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: "3px solid #EDE3F5",
            borderTopColor: BRAND,
            animation: "gateSpin 0.8s linear infinite",
          }}
        />
        <div style={{ fontSize: 13, color: "#9E9E9E" }}>正在进入{title}...</div>
        <style>{`@keyframes gateSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!gate.allowed) {
    return <SectionGateBlock reason={gate.reason} needLevelName={gate.needLevelName} backHref={backHref} />;
  }

  return <>{children}</>;
}

/** 拦截提示卡（关闭/维护/会员专享） */
export function SectionGateBlock({
  reason,
  needLevelName,
  backHref = "/zhongyi",
}: {
  reason: string;
  needLevelName: string | null;
  backHref?: string;
}) {
  const router = useRouter();
  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FAFAFA",
        padding: "24px",
        gap: 14,
      }}
    >
      <div style={{ fontSize: 46, lineHeight: 1 }}>{needLevelName ? "🔒" : "🛠"}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "#424242", textAlign: "center", maxWidth: 300, lineHeight: 1.7 }}>
        {reason}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
        {needLevelName && (
          <button
            onClick={() => router.push("/membership")}
            style={{
              padding: "9px 22px",
              borderRadius: 999,
              border: "none",
              backgroundColor: BRAND,
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            去开通会员
          </button>
        )}
        <button
          onClick={() => router.push(backHref)}
          style={{
            padding: "9px 22px",
            borderRadius: 999,
            border: `1px solid ${needLevelName ? "#E0E0E0" : BRAND}`,
            backgroundColor: needLevelName ? "#fff" : BRAND,
            color: needLevelName ? "#666" : "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          返回{backHref === "/zhongyi" ? "中医主页" : "上一页"}
        </button>
      </div>
    </div>
  );
}
