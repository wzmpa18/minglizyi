"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AcupointStudyDiscussion } from "./AcupointStudyDiscussion";
import { STUDY_TOOL_IDS } from "../../backend_deploy/studyToolTargets";

export function ToolStudyDiscussion() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 2 || parts[0] !== "yixue" || !STUDY_TOOL_IDS.includes(parts[1])) return null;
  return <><Link href="/discover/live/" className="mx-3 my-3 block rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-purple-900">分享活盘 · 先预览，再指定学友交流 ›</Link><AcupointStudyDiscussion targetId={`tool:${parts[1]}`} title="学习交流" /></>;
}
