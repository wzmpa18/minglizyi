"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isIOSNative } from "@/lib/platformGate";

// IOS-4.3B-RECOVERY-EDUCATION-EDITION-14 §18：旧排盘深链接防护
// iOS 壳内访问旧排盘工具 URL 时跳转到易学学习中心对应学科，
// 防止旧深链接/书签让 App Review 再次看到 fortune-telling 页面。
// Web/Android 不受任何影响。
// 注意：这是 iOS 正式产品 Profile（非审核模式），对所有 iOS 用户一致生效。

const SUBJECT_BY_TOOL: Record<string, string> = {
  bazi: "bazi",
  ziwei: "ziwei",
  qizheng: "qizheng",
  qimen: "qimen",
  liuyao: "liuyao",
  meihua: "meihua",
  daliuren: "daliuren",
  xiaoliuren: "daliuren",
  taiyi: "qimen",
  "taiyi-sanshi": "qimen",
  xuankong: "yixue_basic",
  "xuankong-feixing": "yixue_basic",
  yizhangjing: "bazi",
  chenggu: "bazi",
  hehun: "bazi",
  zeri: "calendar",
  name: "yixue_basic",
  qiming: "yixue_basic",
  phone: "yixue_basic",
  carplate: "yixue_basic",
  jiemeng: "yixue_basic",
  astro: "yixue_basic",
  tarot: "yixue_basic",
  ai: "yixue_basic",
};

export function useIOSLearningRedirect(tool: string) {
  const router = useRouter();

  useEffect(() => {
    if (!isIOSNative()) return;
    const subject = SUBJECT_BY_TOOL[tool];
    router.replace(subject ? `/academy/yixue/${subject}?from=${tool}` : "/academy/yixue");
  }, [tool, router]);
}
