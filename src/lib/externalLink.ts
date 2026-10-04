"use client";

import { isNativeShellSync } from "@/lib/nativeDetect";

/** Open a trusted external http(s) URL in the system browser from the native shell. */
export function openExternalLink(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return;
  if (isNativeShellSync()) {
    window.location.href = parsed.toString();
    return;
  }
  window.open(parsed.toString(), "_blank", "noopener,noreferrer");
}
