"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getLocalTtsStatus, listLocalTtsVoices, speakLocalText, stopLocalTts, type LocalTtsVoice, type LocalTtsStyle, type LocalTtsStatus } from "@/lib/localTts";
import { restoreListeningPosition, splitListeningText, type ListeningItem } from "@/lib/listeningQueue";

/** Chapter queue for local speech. Never downloads recordings or auto-starts on restore. */
export function ContinuousListenPlayer({ collectionId, items, title = "连续听学" }: {
  collectionId: string; items: ListeningItem[]; title?: string;
}) {
  const [index, setIndex] = useState(0);
  const [chunk, setChunk] = useState(0);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(0.8);
  const [voiceName,setVoiceName]=useState("");
  const [voices,setVoices]=useState<LocalTtsVoice[]>([]);
  const [style,setStyle]=useState<LocalTtsStyle>("warmNatural");
  const previewCleanup=useRef<undefined|(()=>void)>(undefined);
  const [status, setStatus] = useState<LocalTtsStatus | null>(null);
  const [message, setMessage] = useState("");
  const [storageWarning, setStorageWarning] = useState(false);
  const operation = useRef<Promise<void>>(Promise.resolve());
  const storageKey = `continuous-listening-v1:${collectionId}`;
  const item = items[index];
  const chunks = useMemo(() => splitListeningText(item?.text || ""), [item?.text]);

  useEffect(() => {
    let active = true;
    try {
      const saved = restoreListeningPosition(window.localStorage.getItem(storageKey), items);
      setIndex(saved.index); setChunk(saved.chunk);
    } catch { setStorageWarning(true); }
    try {
      const preference=window.localStorage.getItem("local_tts_voice")||"";setVoiceName(preference);
      const savedRate=Number(window.localStorage.getItem("local_tts_rate"));if([.7,.8,.92].includes(savedRate))setRate(savedRate);
      const savedStyle=window.localStorage.getItem("local_tts_style");if(["warmMale","warmNatural","softFemale"].includes(savedStyle||""))setStyle(savedStyle as LocalTtsStyle);
    } catch { /* Stored audio preferences are optional. */ }
    void listLocalTtsVoices().then(rows=>{if(active){setVoices(rows);setVoiceName(current=>rows.some(v=>v.name===current)?current:"");}}).catch(()=>{});
    setReady(true);
    void getLocalTtsStatus().then(value => { if (active) setStatus(value); }).catch(() => {
      if (active) setMessage("本机语音服务不可用，请检查系统中文语音包。");
    });
    return () => { active = false; };
    // Parents key this player by collectionId, so switching collections unmounts it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!ready || !item) return;
    try { window.localStorage.setItem(storageKey, JSON.stringify({ itemId: item.id, chunk })); }
    catch { setStorageWarning(true); }
  }, [ready, storageKey, item?.id, chunk]);

  useEffect(() => {
    if (!playing || !ready || !item || !chunks[chunk]) return;
    let active = true;
    let dispose: undefined | (() => void);
    // Serialize delayed native starts: an old request must finish cancelling
    // before a newly selected chapter starts, including rapid next/stop clicks.
    operation.current = operation.current.catch(() => {}).then(async () => {
      if (!active) return;
      await stopLocalTts();
      if (!active) return;
      const cleanup = await speakLocalText(`${chunk === 0 ? `${item.title}。` : ""}${chunks[chunk]}`, rate, style, voiceName || undefined, event => {
        if (!active) return;
        if (event.state === "finished") {
          if (chunk + 1 < chunks.length) setChunk(chunk + 1);
          else if (index + 1 < items.length) { setIndex(index + 1); setChunk(0); }
          else { setPlaying(false); setMessage("本组内容已播放完毕。"); }
        } else if (event.state === "error" || event.state === "stopped") {
          setPlaying(false);
          if (event.state === "error") setMessage(event.message || "朗读中断，请重试。");
        }
      });
      if (!active) cleanup(); else dispose = cleanup;
    }).catch(error => {
      if (active) { setPlaying(false); setMessage(error instanceof Error ? error.message : "无法开始朗读。"); }
    });
    return () => { active = false; dispose?.(); };
  }, [playing, ready, item?.id, item?.title, item?.text, index, chunk, chunks, rate, style, voiceName, items.length]);

  useEffect(() => {
    const stop = () => { setPlaying(false); void stopLocalTts(); };
    window.addEventListener("pagehide", stop);
    return () => { window.removeEventListener("pagehide", stop); };
  }, []);

  useEffect(()=>{if(!ready)return;try{window.localStorage.setItem("local_tts_rate",String(rate));window.localStorage.setItem("local_tts_style",style);if(voiceName)window.localStorage.setItem("local_tts_voice",voiceName);else window.localStorage.removeItem("local_tts_voice");}catch{/* Playback does not require preference storage. */}},[ready,rate,style,voiceName]);
  useEffect(()=>()=>{previewCleanup.current?.();},[]);
  async function preview(){setPlaying(false);setMessage("");previewCleanup.current?.();try{await stopLocalTts();previewCleanup.current=await speakLocalText("学而时习之，不亦说乎。有朋自远方来，不亦乐乎。",rate,style,voiceName||undefined,event=>{if(event.state==='error')setMessage(event.message||"试听暂不可用");});}catch(error){setMessage(error instanceof Error?error.message:"试听暂不可用");}}
  if (!items.length) return null;
  const select = (next: number) => { setIndex(next); setChunk(0); setMessage(""); };
  return <section aria-label={title} className="my-3 rounded-xl border border-purple-200 bg-purple-50 p-3 text-gray-800">
    <h2 className="text-sm font-bold">{title}</h2>
    <p className="mt-1 text-xs">{index + 1}/{items.length} · {item?.title} · 第{chunk + 1}/{chunks.length || 1}段</p>
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <button type="button" disabled={!ready || !status?.available} onClick={() => { setMessage(""); setPlaying(value => !value); }}
        className="rounded-lg bg-purple-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">{playing ? "停止连播" : "开始连续听学"}</button>
      <button type="button" disabled={index === 0} onClick={() => select(index - 1)} className="px-2 py-2 text-xs disabled:opacity-40">上一章</button>
      <button type="button" disabled={index + 1 >= items.length} onClick={() => select(index + 1)} className="px-2 py-2 text-xs disabled:opacity-40">下一章</button>
      <select aria-label="连续听学语速" value={rate} onChange={event => { setPlaying(false); setRate(Number(event.target.value)); }} className="rounded border bg-white p-1 text-xs">
        <option value={0.7}>慢速</option><option value={0.8}>适中</option><option value={0.92}>较快</option>
      </select>
    </div>
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <label className="text-xs">朗读音色 <select aria-label="连续听学音色" value={voiceName} onChange={event=>{setPlaying(false);previewCleanup.current?.();setVoiceName(event.target.value);}} className="max-w-[220px] rounded border bg-white p-2 text-xs">
        <option value="">自动选择清晰中文音色</option>{voices.map(voice=><option key={voice.name} value={voice.name}>{voice.label} · {voice.locale}</option>)}
      </select></label>
      <button type="button" disabled={!status?.available} onClick={()=>void preview()} className="rounded border bg-white px-3 py-2 text-xs">试听声音</button>
    </div>
    <select aria-label="选择听学章节" value={index} onChange={event => { setPlaying(false); select(Number(event.target.value)); }} className="mt-2 w-full rounded border bg-white p-2 text-xs">
      {items.map((entry, position) => <option key={entry.id} value={position}>{position + 1}. {entry.title}</option>)}
    </select>
    <p className="mt-2 text-[11px] leading-5 text-gray-600">使用本机中文语音，按段落顺序连播。仅记住本机章节与段落，重开后手动从段首继续；不会自动播放。</p>
    {status && !status.available && <p role="status" className="text-xs text-amber-800">{status.message}</p>}
    {storageWarning && <p role="status" className="text-xs text-amber-800">本机存储不可用，进度未保存。</p>}
    {message && <p role="status" className="text-xs text-purple-800">{message}</p>}
  </section>;
}
