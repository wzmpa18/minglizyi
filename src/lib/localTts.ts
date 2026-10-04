"use client";

import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export interface LocalTtsStatus {
  ready: boolean;
  available: boolean;
  voiceName?: string;
  message: string;
  source: "android" | "browser" | "unavailable";
}

export type LocalTtsStyle = "warmMale" | "warmNatural" | "softFemale";

export interface LocalTtsVoice {
  name: string;
  label: string;
  locale: string;
  likelyGender: "male" | "female" | "unknown";
}

interface StateEvent { state: "speaking" | "finished" | "stopped" | "error"; message?: string }
interface NativeLocalTts {
  getStatus(): Promise<Omit<LocalTtsStatus, "source">>;
  listVoices(): Promise<{ voices: LocalTtsVoice[] }>;
  speak(options: { text: string; rate: number; style: LocalTtsStyle; voiceName?: string }): Promise<{ accepted: boolean; chunks: number; voiceName: string }>;
  stop(): Promise<void>;
  addListener(eventName: "stateChange", listener: (event: StateEvent) => void): Promise<PluginListenerHandle>;
}

const NativeTts = registerPlugin<NativeLocalTts>("LocalTts");
let browserUtterance: SpeechSynthesisUtterance | null = null;

function browserOfflineChineseVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices().filter((v) => v.localService && /^zh(?:-|_)/i.test(v.lang));
}

function browserOfflineChineseVoice(preferredName?: string): SpeechSynthesisVoice | null {
  const voices = browserOfflineChineseVoices();
  return voices.find((voice) => voice.name === preferredName) || voices[0] || null;
}

export async function getLocalTtsStatus(): Promise<LocalTtsStatus> {
  if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("LocalTts")) {
    let result = await NativeTts.getStatus();
    // Android initializes its speech engine asynchronously. Avoid showing a
    // false "voice pack missing" state when a page opens during onInit.
    for (let attempt = 0; !result.ready && attempt < 8; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      result = await NativeTts.getStatus();
    }
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

export async function listLocalTtsVoices(): Promise<LocalTtsVoice[]> {
  if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("LocalTts")) {
    const result = await NativeTts.listVoices();
    return result.voices || [];
  }
  return browserOfflineChineseVoices().map((voice) => ({
    name: voice.name,
    label: voice.name,
    locale: voice.lang,
    likelyGender: "unknown" as const,
  }));
}

export async function speakLocalText(
  text: string,
  rate: number,
  style: LocalTtsStyle,
  voiceName?: string,
  onState?: (event: StateEvent) => void,
): Promise<() => void> {
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
      await NativeTts.speak({ text: value, rate, style, voiceName });
    } catch (error) {
      if (handle) await handle.remove();
      throw error;
    }
    return () => { void NativeTts.stop(); void handle?.remove(); handle = null; };
  }
  const status = await getLocalTtsStatus();
  const voice = browserOfflineChineseVoice(voiceName);
  if (!status.available || !voice || typeof window === "undefined") throw new Error(status.message);
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(value);
  browserUtterance = utterance;
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = Math.max(0.6, Math.min(1.15, rate));
  utterance.pitch = style === "warmMale" ? 0.78 : style === "softFemale" ? 0.94 : 0.86;
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
