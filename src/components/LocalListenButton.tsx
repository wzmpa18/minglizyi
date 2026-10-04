"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getLocalTtsStatus, speakLocalText, stopLocalTts, type LocalTtsStatus } from "@/lib/localTts";

const RATE_KEY = "local_tts_rate";
const LAST_CONTENT_KEY = "local_tts_last_content";

export function LocalListenButton({ text, contentId, compact = false }: { text: string; contentId: string; compact?: boolean }) {
  const [status, setStatus] = useState<LocalTtsStatus | null>(null);
  const [state, setState] = useState<"idle" | "speaking" | "error">("idle");
  const [message, setMessage] = useState("");
  const [rate, setRate] = useState(0.9);
  const cleanupRef = useRef<null | (() => void)>(null);

  const stop = useCallback(() => {
    cleanupRef.current?.(); cleanupRef.current = null;
    void stopLocalTts(); setState("idle"); setMessage("");
  }, []);

  useEffect(() => {
    let active = true;
    try {
      const savedRate = Number(window.localStorage.getItem(RATE_KEY));
      if ([0.75, 0.9, 1.1].includes(savedRate)) setRate(savedRate);
    } catch { /* localStorage unavailable */ }
    void getLocalTtsStatus().then((result) => { if (active) setStatus(result); }).catch(() => {
      if (active) setStatus({ ready: true, available: false, message: "本机语音服务暂不可用", source: "unavailable" });
    });
    // Native reading may continue while the screen is locked or another app is
    // briefly opened. Stop only after this reading component is actually left.
    window.addEventListener("pagehide", stop);
    return () => { active = false; window.removeEventListener("pagehide", stop); stop(); };
  }, [stop]);

  const play = async () => {
    if (state === "speaking") { stop(); return; }
    setMessage("");
    try {
      try {
        window.localStorage.setItem(RATE_KEY, String(rate));
        window.localStorage.setItem(LAST_CONTENT_KEY, contentId);
      } catch { /* localStorage unavailable */ }
      cleanupRef.current = await speakLocalText(text, rate, (event) => {
        if (event.state === "speaking") setState("speaking");
        if (event.state === "finished" || event.state === "stopped") { setState("idle"); cleanupRef.current = null; }
        if (event.state === "error") { setState("error"); setMessage(event.message || "朗读失败"); }
      });
      setState("speaking");
    } catch (error) {
      setState("error"); setMessage(error instanceof Error ? error.message : "本机语音服务暂不可用");
      setStatus((current) => current ? { ...current, available: false } : current);
    }
  };

  if (status && !status.available) {
    return <p className="text-[11px] text-amber-700">
      {status.ready ? `${status.message}，可在手机系统的“文字转语音”设置中安装中文语音包。` : status.message}
    </p>;
  }
  return (
    <div className={`flex ${compact ? "items-center" : "items-start"} flex-wrap gap-2`}>
      <button type="button" onClick={play} disabled={!status?.available}
        className="rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
        style={{ borderColor: "#7B2FBE55", color: "#7B2FBE", background: "#7B2FBE0d" }}>
        {state === "speaking" ? "■ 停止朗读" : "▶ 本机听学"}
      </button>
      {!compact && (
        <select aria-label="朗读速度" value={rate} onChange={(e) => setRate(Number(e.target.value))}
          className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600">
          <option value={0.75}>慢速</option><option value={0.9}>标准</option><option value={1.1}>快速</option>
        </select>
      )}
      {!compact && <span className="self-center text-[10px] text-gray-400">正文只在本机朗读，不上传</span>}
      {message && <span className="w-full text-[11px] text-red-600">{message}</span>}
    </div>
  );
}
