"use client";

import Link from "next/link";
import sources from "@/data/acupointOpenSources.json";

export function AcupointStudySources({ meridianName, selectedCode }: { meridianName: string; selectedCode?: string }) {
  const image = sources.images.find(item => item.meridians.includes(meridianName));
  return <section aria-label="穴位学习资料与来源" style={{ margin: "12px", padding: "14px", borderRadius: "14px", background: "white", fontSize: "12px", lineHeight: 1.7 }}>
    <strong style={{ fontSize: "14px", color: "#7B2FBE" }}>图文对照与来源</strong>
    {image && <details open={!!selectedCode} style={{ marginTop: "10px" }}>
      <summary style={{ cursor: "pointer", fontWeight: 700 }}>{image.title} · 11穴对照</summary>
      <img src={image.asset} width={576} height={1024} alt="肺经学习图，原图标注P1至P11，下方提供中文穴名对照" style={{ display: "block", width: "100%", maxWidth: "340px", height: "auto", margin: "10px auto" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "6px" }}>
        {image.points.map(point => <Link key={point.code} href={`/zhongyi/meridian?acupoint=${encodeURIComponent(point.name)}`} aria-current={point.code === selectedCode ? "page" : undefined} style={{ padding: "5px 8px", borderRadius: "6px", color: "#5D237F", background: point.code === selectedCode ? "#E9D6FA" : "#F8F4FC", textDecoration: "none" }}>
          {point.label} / {point.code} {point.name}
        </Link>)}
      </div>
      <p style={{ color: "#666" }}>{image.notice}</p>
      <p style={{ color: "#777" }}>
        作者：{image.author}；{image.contributors}。<a href={image.revision} target="_blank" rel="noopener noreferrer">来源及修订</a> · <a href={image.licenseUrl} target="_blank" rel="noopener noreferrer">{image.license}</a><br />{image.changes}
      </p>
    </details>}
    <p style={{ marginBottom: "8px", color: "#666" }}>
      <a href={sources.standard.url} target="_blank" rel="noopener noreferrer">查阅{sources.standard.title}官方信息</a><br />{sources.standard.notice}
    </p>
    <Link href="/zhongyi/classic?book=lingshu-original&chapter=lingshu-original-10" style={{ color: "#7B2FBE" }}>阅读《灵枢·经脉第十》原文与听学 →</Link>
  </section>;
}
