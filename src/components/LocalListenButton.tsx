"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getLocalTtsStatus,
  listLocalTtsVoices,
  speakLocalText,
  stopLocalTts,
  type LocalTtsStatus,
  type LocalTtsStyle,
  type LocalTtsVoice,
} from "@/lib/localTts";

const RATE_KEY = "local_tts_rate";
const LAST_CONTENT_KEY = "local_tts_last_content";
const STYLE_KEY = "local_tts_style";
const VOICE_KEY = "local_tts_voice";

export function LocalListenButton({ text, contentId, compact = false }: { text: string; contentId: string; compact?: boolean }) {
  const [status, setStatus] = useState<LocalTtsStatus | null>(null);
  const [state, setState] = useState<"idle" | "speaking" | "error">("idle");
  const [message, setMessage] = useState("");
  const [rate, setRate] = useState(0.84);
  const [style, setStyle] = useState<LocalTtsStyle>("warmMale");
  const [voices, setVoices] = useState<LocalTtsVoice[]>([]);
  const [voiceName, setVoiceName] = useState("");
  const cleanupRef = useRef<null | (() => void)>(null);

  const stop = useCallback(() => {
    cleanupRef.current?.(); cleanupRef.current = null;
    void stopLocalTts(); setState("idle"); setMessage("");
  }, []);

  useEffect(() => {
    let active = true;
    try {
      const savedRate = Number(window.localStorage.getItem(RATE_KEY));
      const migratedRate = savedRate === 0.75 ? 0.72 : savedRate === 0.9 ? 0.84 : savedRate === 1.1 ? 0.96 : savedRate;
      if ([0.72, 0.84, 0.96].includes(migratedRate)) setRate(migratedRate);
      const savedStyle = window.localStorage.getItem(STYLE_KEY);
      if (["warmMale", "warmNatural", "softFemale"].includes(savedStyle || "")) setStyle(savedStyle as LocalTtsStyle);
      setVoiceName(window.localStorage.getItem(VOICE_KEY) || "");
    } catch { /* localStorage unavailable */ }
    void getLocalTtsStatus().then((result) => { if (active) setStatus(result); }).catch(() => {
      if (active) setStatus({ ready: true, available: false, message: "本机语音服务暂不可用", source: "unavailable" });
    });
    void listLocalTtsVoices().then((result) => {
      if (!active) return;
      setVoices(result);
      setVoiceName((current) => result.some((voice) => voice.name === current) ? current : "");
    }).catch(() => {});
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
        window.localStorage.setItem(STYLE_KEY, style);
        if (voiceName) window.localStorage.setItem(VOICE_KEY, voiceName);
        else window.localStorage.removeItem(VOICE_KEY);
        window.localStorage.setItem(LAST_CONTENT_KEY, contentId);
      } catch { /* localStorage unavailable */ }
      cleanupRef.current = await speakLocalText(text, rate, style, voiceName || undefined, (event) => {
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
        <select aria-label="朗读音色" value={style} onChange={(e) => setStyle(e.target.value as LocalTtsStyle)}
          className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600">
          <option value="warmMale">沉稳男声</option>
          <option value="warmNatural">温润原声</option>
          <option value="softFemale">柔和女声</option>
        </select>
      )}
      {!compact && voices.length > 1 && (
        <select aria-label="手机离线语音" value={voiceName} onChange={(e) => setVoiceName(e.target.value)}
          className="max-w-[180px] rounded-full border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600">
          <option value="">自动选择柔和音色</option>
          {voices.map((voice) => <option key={voice.name} value={voice.name}>{voice.label}</option>)}
        </select>
      )}
      {!compact && (
        <select aria-label="朗读速度" value={rate} onChange={(e) => setRate(Number(e.target.value))}
          className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600">
          <option value={0.72}>舒缓</option><option value={0.84}>标准</option><option value={0.96}>稍快</option>
        </select>
      )}
      {!compact && <span className="self-center text-[10px] text-gray-400">离线朗读；音色设置保存在本机</span>}
      {message && <span className="w-full text-[11px] text-red-600">{message}</span>}
    </div>
  );
}
