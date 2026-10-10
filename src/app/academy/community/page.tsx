"use client";

import { useEffect, useState } from "react";
import { BrandHeader } from "@/components/shared";
import { ResourceDiscussion } from "@/components/ResourceDiscussion";
import { PUBLIC_SOCIAL_ENABLED } from "@/lib/releaseFeatures";

const ZONES = {
  yixue: { name: "易学交流社区", desc: "交流排盘学习、典籍理解与工具使用心得", color: "#7B2FBE" },
  zhongyi: { name: "中医交流社区", desc: "交流中医基础、典籍、中药、方剂与经络学习心得", color: "#2FAE9E" },
  yikao: { name: "医考交流社区", desc: "交流考试大纲、知识点、题目思路与备考经验", color: "#C05046" },
  yangsheng: { name: "养生交流社区", desc: "交流四时养生、食疗本草与传统功法学习心得", color: "#8B6F47" },
  guoxue: { name: "国学交流社区", desc: "交流经史子集、蒙学经典与传统文化阅读心得", color: "#B8860B" },
} as const;

type ZoneKey = keyof typeof ZONES;

export default function AcademyCommunityPage() {
  const [zoneKey, setZoneKey] = useState<ZoneKey>("guoxue");
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("zone") || "guoxue";
    setZoneKey(raw in ZONES ? raw as ZoneKey : "guoxue");
  }, []);
  const zone = ZONES[zoneKey];

  if (!PUBLIC_SOCIAL_ENABLED) {
    return (
      <div className="min-h-screen bg-gray-50" style={{ maxWidth: 520, margin: "0 auto" }}>
        <BrandHeader title="学习交流" showBack />
        <main className="px-4 py-12 text-center text-sm text-gray-500">公开交流功能暂未开放。</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ maxWidth: 520, margin: "0 auto" }}>
      <BrandHeader title={zone.name} showBack />
      <main className="pb-24 pt-1">
        <section className="mx-3 mt-3 rounded-2xl bg-white p-4 shadow-sm">
          <h1 className="text-base font-bold" style={{ color: zone.color }}>{zone.name}</h1>
          <p className="mt-1 text-xs leading-5 text-gray-500">{zone.desc}</p>
          <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-[11px] leading-5 text-gray-500">
            本区仅支持文字交流。评论先经过自动审核；违规内容不会公开展示，用户也可以举报。
          </p>
        </section>
        <ResourceDiscussion
          resourceType="academy"
          resourceId={`zone:${zoneKey}`}
          title={`${zone.name}留言`}
          accent={zone.color}
        />
      </main>
    </div>
  );
}
