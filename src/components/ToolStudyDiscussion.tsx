"use client";
import { usePathname } from "next/navigation";
import { AcupointStudyDiscussion } from "./AcupointStudyDiscussion";
import { STUDY_TOOL_IDS } from "../../backend_deploy/studyToolTargets";

export function ToolStudyDiscussion() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 2 || parts[0] !== "yixue" || !STUDY_TOOL_IDS.includes(parts[1])) return null;
  return <AcupointStudyDiscussion targetId={`tool:${parts[1]}`} title="学习交流" />;
}
