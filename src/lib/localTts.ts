"use client";

import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export interface LocalTtsStatus {
  ready: boolean;
  available: boolean;
  voiceName?: string;
  message: string;
  source: "android" | "browser" | "unavailable";
}

interface StateEvent { state: "speaking" | "finished" | "stopped" | "error"; message?: string }
interface NativeLocalTts {
  getStatus(): Promise<Omit<LocalTtsStatus, "source">>;
  speak(options: { text: string; rate: number }): Promise<{ accepted: boolean; chunks: number; voiceName: string }>;
  stop(): Promise<void>;
  addListener(eventName: "stateChange", listener: (event: StateEvent) => void): Promise<PluginListenerHandle>;
}

const NativeTts = registerPlugin<NativeLocalTts>("LocalTts");
let browserUtterance: SpeechSynthesisUtterance | null = null;

function browserOfflineChineseVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  return window.speechSynthesis.getVoices().find((v) => v.localService && /^zh(?:-|_)/i.test(v.lang)) || null;
}

export async function getLocalTtsStatus(): Promise<LocalTtsStatus> {
  if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("LocalTts")) {
    const result = await NativeTts.getStatus();
    return { ...result, source: "android" };
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    let voice = browserOfflineChineseVoice();
    if (!voice && window.speechSynthesis.getVoices().length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      voice = browserOfflineChineseVoice();
    }
    return voice
      ? { ready: true, available: true, voiceName: voice.name, message: "本机离线中文朗读可用", source: "browser" }
      : { ready: true, available: false, message: "当前设备未提供可确认的离线中文音色", source: "unavailable" };
  }
  return { ready: true, available: false, message: "当前设备不支持本机朗读", source: "unavailable" };
}

export async function speakLocalText(text: string, rate: number, onState?: (event: StateEvent) => void): Promise<() => void> {
  const value = String(text || "").trim();
  if (!value) throw new Error("没有可朗读的文字");
  if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("LocalTts")) {
    let handle: PluginListenerHandle | null = null;
    handle = await NativeTts.addListener("stateChange", (event) => {
      onState?.(event);
      if (event.state === "finished" || event.state === "error") {
        void handle?.remove();
        handle = null;
      }
    });
    try {
      await NativeTts.speak({ text: value, rate });
    } catch (error) {
      if (handle) await handle.remove();
      throw error;
    }
    return () => { void NativeTts.stop(); void handle?.remove(); handle = null; };
  }
  const status = await getLocalTtsStatus();
  const voice = browserOfflineChineseVoice();
  if (!status.available || !voice || typeof window === "undefined") throw new Error(status.message);
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(value);
  browserUtterance = utterance;
  utterance.voice = voice; utterance.lang = voice.lang; utterance.rate = Math.max(0.6, Math.min(1.3, rate));
  utterance.onstart = () => onState?.({ state: "speaking" });
  utterance.onend = () => { browserUtterance = null; onState?.({ state: "finished" }); };
  utterance.onerror = () => { browserUtterance = null; onState?.({ state: "error", message: "本机语音朗读失败" }); };
  window.speechSynthesis.speak(utterance);
  return () => { if (browserUtterance === utterance) browserUtterance = null; window.speechSynthesis.cancel(); };
}

export async function stopLocalTts(): Promise<void> {
  if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("LocalTts")) await NativeTts.stop();
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  browserUtterance = null;
}
