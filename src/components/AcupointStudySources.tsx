"use client";

import Link from "next/link";
import sources from "@/data/acupointOpenSources.json";

export function AcupointStudySources({ meridianName, selectedCode }: { meridianName: string; selectedCode?: string }) {
  const image = sources.images.find(item => item.meridians.includes(meridianName));
  return <section aria-label="穴位学习资料与来源" style={{ margin: "12px", padding: "14px", borderRadius: "14px", background: "white", color: "#333", fontSize: "12px", lineHeight: 1.7 }}>
    <strong style={{ fontSize: "14px", color: "#7B2FBE" }}>经络图文对照</strong>
    {image && <details open={!!selectedCode} style={{ marginTop: "10px" }}>
      <summary style={{ cursor: "pointer", fontWeight: 700 }}>肺经穴位图 · 11穴对照</summary>
      <img src={image.asset} width={576} height={1024} alt="肺经学习图，原图标注P1至P11，下方提供中文穴名对照" style={{ display: "block", width: "100%", maxWidth: "340px", height: "auto", margin: "10px auto" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "6px" }}>
        {image.points.map(point => <Link key={point.code} href={`/zhongyi/meridian?acupoint=${encodeURIComponent(point.name)}`} aria-current={point.code === selectedCode ? "page" : undefined} style={{ padding: "5px 8px", borderRadius: "6px", color: "#5D237F", background: point.code === selectedCode ? "#E9D6FA" : "#F8F4FC", textDecoration: "none" }}>
          {point.label} / {point.code} {point.name}
        </Link>)}
      </div>
      <p style={{ color: "#666" }}>图内P1–P11对应肺经LU1–LU11，可点击穴名查看详情。</p>
    </details>}
    <p style={{ marginBottom: "8px", color: "#666" }}>
      <a href="https://yandaoguoxue.yandao.vip/privacy/#acupoint-photo-credits" target="_blank" rel="noopener noreferrer">图片署名与许可</a>
    </p>
    <Link href="/zhongyi/classic?book=lingshu-original&chapter=lingshu-original-10" style={{ color: "#7B2FBE" }}>阅读《灵枢·经脉第十》原文与听学 →</Link>
  </section>;
}
