"use client";

// ============================================================================
// 来源署名组件（P6-TOOL-04-补02 §2.2 分级标注）
// MIT / CC BY 资源按协议要求署名；公共领域资源不强制外露（后台已留存溯源）；
// 挂载于页面底部合规说明区，不干扰主交互。
// ============================================================================

import { useEffect, useState } from "react";
import { getAttributionRequired, LICENSE_LABELS, type SourceRecord } from "@/lib/sourceRegistry";

export function SourceAttribution({ compact = false }: { compact?: boolean }) {
  const [list, setList] = useState<SourceRecord[]>([]);
  useEffect(() => {
    try {
      setList(getAttributionRequired());
    } catch {
      setList([]);
    }
  }, []);
  if (list.length === 0) return null;
  return (
    <div
      style={{
        margin: compact ? "8px 0" : "16px 12px",
        padding: "10px 14px",
        borderRadius: 10,
        backgroundColor: "#fafafa",
        border: "1px solid #eee",
        fontSize: 11,
        lineHeight: 1.8,
        color: "#888",
      }}
    >
      <div style={{ fontWeight: 700, color: "#666", marginBottom: 4 }}>开源组件与数据来源声明</div>
      {list.map((s) => (
        <div key={s.sourceId}>
          · {s.name}（{LICENSE_LABELS[s.license]}，v{s.version}）
          {s.url && s.url !== "-" && (
            <> 来源：<a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: "#7B2FBE", wordBreak: "break-all" }}>{s.url}</a></>
          )}
          <div style={{ color: "#aaa", fontSize: 10 }}>
            许可证声明：{s.license === "MIT"
              ? "本组件依 MIT 许可证使用，原作者著作权声明保留于其仓库"
              : "本内容依 CC BY 4.0 许可证使用并署名"}
          </div>
        </div>
      ))}
      <div style={{ marginTop: 6, color: "#aaa" }}>平台 AI 生成内容均标注「AI生成，仅供文化娱乐参考」；传统典籍整理自公共领域资料。完整第三方资源清单可在后台「来源注册库」导出核查。</div>
    </div>
  );
}
