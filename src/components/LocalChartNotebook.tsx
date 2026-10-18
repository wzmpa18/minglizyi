'use client';

import { useEffect, useState, useRef, type ChangeEvent } from 'react';
import { get, put, listMeta } from '@/lib/storageManager';
import { CHART_NOTE_IMAGE_TYPES, CHART_NOTE_MAX_IMAGES, CHART_NOTE_MAX_IMAGE_BYTES, CHART_NOTE_MAX_TOTAL_BYTES, isChartNotebookRecord, type ChartNoteImage, type ChartNotebookRecord } from '@/lib/chartNotebook';

/** Text and original pictures stay in USER_PRIVATE_DATA. No upload/sync API. */
export function LocalChartNotebook({ storageKey, legacyKey, subject }: { storageKey: string; legacyKey: string; subject: string }) {
  const [text, setText] = useState(''), [images, setImages] = useState<ChartNoteImage[]>([]);
  const [legacy, setLegacy] = useState(''), [ready, setReady] = useState(false), [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(''), [dirty, setDirty] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true; let active = true;
    void (async () => {
      try {
        const metadata = await listMeta('USER_PRIVATE_DATA');
        const saved = await get<unknown>('USER_PRIVATE_DATA', storageKey);
        if (saved !== null && !isChartNotebookRecord(saved)) throw Error('旧数据格式不受支持，为保护内容暂不覆盖。');
        if (saved === null && metadata.some(item => item.key === storageKey)) throw Error('本机记录读取失败，为保护旧内容暂不覆盖。');
        if (!active) return;
        if (saved) { setText(saved.text); setImages(saved.images); }
        const previous = localStorage.getItem('yandao_bazi_note' + legacyKey) || localStorage.getItem('bazi_note_' + legacyKey) || '';
        setLegacy(previous); setReady(true);
      } catch (reason) { if (active) setMessage(reason instanceof Error ? reason.message : '本机存储不可用，请先复制保留文字。'); }
    })();
    return () => { active = false; alive.current = false; };
  }, [storageKey, legacyKey]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const save = async () => {
    if (!ready || busy) return;
    setBusy(true); setMessage('');
    const record: ChartNotebookRecord = { schema: 1, text, images, updatedAt: new Date().toISOString() };
    try {
      if (!isChartNotebookRecord(record)) throw Error('图片格式或数量不受支持，尚未覆盖旧笔记。');
      await put('USER_PRIVATE_DATA', storageKey, record);
      if (alive.current) { setDirty(false); setMessage('已保存到本机。文字和图片均未上传。'); }
    } catch { if (alive.current) setMessage('保存失败，尚未覆盖已保存的笔记。请保留当前页面，检查设备空间后重试。'); }
    finally { if (alive.current) setBusy(false); }
  };
  const chooseImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []); event.target.value = '';
    if (!files.length || busy || !ready) return;
    if (images.length + files.length > CHART_NOTE_MAX_IMAGES) { setMessage('每份笔记最多保存6张图片。'); return; }
    if (files.some(file => !CHART_NOTE_IMAGE_TYPES.includes(file.type) || file.size < 1 || file.size > CHART_NOTE_MAX_IMAGE_BYTES)) { setMessage('请选择JPG、PNG、WebP或GIF图片，每张不超过5MB。'); return; }
    if (images.reduce((sum, image) => sum + image.bytes, 0) + files.reduce((sum, file) => sum + file.size, 0) > CHART_NOTE_MAX_TOTAL_BYTES) { setMessage('本份笔记的图片总量不能超过20MB。'); return; }
    setBusy(true); setMessage('');
    try {
      const selected = await Promise.all(files.map(async file => {
        const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
        const image = new Image(); image.src = dataUrl; await image.decode();
        return { id: crypto.randomUUID(), name: file.name, type: file.type, bytes: file.size, dataUrl };
      }));
      if (alive.current) { setImages(previous => [...previous, ...selected]); setDirty(true); setMessage('图片已选入，点击“保存断事笔记”后留存在本机。'); }
    } catch { if (alive.current) setMessage('图片无法读取或预览，原有笔记未改动。'); }
    finally { if (alive.current) setBusy(false); }
  };
  return <section aria-label="本机断事笔记" className="m-3 rounded-2xl border border-[#dfd6c0] bg-white p-4 text-[#333]">
    <h2 className="text-lg font-bold">断事笔记</h2><p className="mt-2 text-sm font-medium">{subject}</p>
    <p className="my-3 text-xs leading-6 text-gray-500">记录此人的资料、交流内容与复盘。文字和图片只保存在这台设备，不上传、不参与云端命盘同步；清理应用数据、卸载或更换设备可能丢失。离开前请保存。</p>
    {legacy && <details className="mb-3 rounded-lg bg-amber-50 p-3 text-xs"><summary>旧版笔记（未区分姓名和分钟，请先确认归属）</summary><p className="my-3 whitespace-pre-wrap">{legacy}</p><button type="button" disabled={!ready || busy} onClick={() => { setText(previous => previous ? previous + '\n\n' + legacy : legacy); setLegacy(''); setDirty(true); }} className="rounded border px-3 py-2">导入到当前命主笔记</button></details>}
    <textarea aria-label="断事笔记内容" value={text} disabled={!ready || busy} onChange={event => { setText(event.target.value); setDirty(true); setMessage(''); }} placeholder="记录命主信息、待核实事项、断事过程与后续反馈…" rows={10} className="w-full rounded-xl border border-gray-300 p-3 text-base leading-7" />
    <div className="my-3 flex flex-wrap items-center gap-3"><label className="rounded-lg border border-[#b29450] px-3 py-2 text-sm">添加本地图片<input aria-label="选择断事笔记本地图片" type="file" accept={CHART_NOTE_IMAGE_TYPES.join(',')} multiple disabled={!ready || busy} onChange={event => void chooseImages(event)} className="mt-2 block w-full max-w-64 text-xs" /></label><span className="text-xs text-gray-500">{images.length}/6张 · 单张5MB以内</span></div>
    <div className="grid grid-cols-2 gap-3">{images.map(image => <figure key={image.id} className="rounded-lg border p-2"><a href={image.dataUrl} target="_blank" rel="noreferrer"><img src={image.dataUrl} alt={'本机图片备注：' + image.name} className="h-32 w-full rounded object-contain" /></a><figcaption className="mt-2 break-all text-xs">{image.name}</figcaption><button type="button" disabled={busy || !ready} onClick={() => { if (window.confirm('从本份笔记移除这张图片？保存笔记后生效，手机原图不受影响。')) { setImages(previous => previous.filter(item => item.id !== image.id)); setDirty(true); } }} className="mt-2 text-xs text-red-700">移除图片</button></figure>)}</div>
    <button type="button" onClick={() => void save()} disabled={!ready || busy} className="mt-4 rounded-xl bg-[#76602d] px-5 py-3 text-sm font-bold text-white disabled:opacity-40">{busy ? '处理中…' : '保存断事笔记'}</button>
    <span className="ml-3 text-xs text-gray-500">{dirty ? '有未保存内容' : ready ? '本机记录' : '正在读取本机记录'}</span>{message && <p role="status" className="mt-3 text-sm leading-6 text-[#785119]">{message}</p>}
  </section>;
}
