"use client";

import { useCallback, useEffect, useState } from "react";
import { listPaipanRecords, type PaipanRecord } from "@/lib/nativePaipanStore";

export function LocalChartArchive({ tool, onRestore }: { tool: string; onRestore: (record: PaipanRecord) => void }) {
  const [records, setRecords] = useState<PaipanRecord[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setMessage("");
    try { setRecords(await listPaipanRecords(tool)); }
    catch { setMessage("本机档案读取失败，请重试。"); }
    finally { setLoading(false); }
  }, [tool]);
  useEffect(() => { void load(); }, [load]);
  const filtered = records.filter(record => !query.trim() || `${record.title} ${record.note || ""}`.includes(query.trim()));
  return <section aria-label="本机课例档案">
    <div className="mb-3 flex items-center justify-between"><h2 className="font-bold text-gray-800">本机课例档案</h2><button type="button" onClick={() => void load()} className="text-purple-800">刷新</button></div>
    <input aria-label="搜索课例档案" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索课例名称或备注" className="mb-3 w-full rounded border p-2 text-sm" />
    {message && <p role="status" className="text-red-700">{message}</p>}
    {loading ? <p>正在读取…</p> : filtered.length ? <ul>{filtered.map(record => <li key={record.id} className="border-b border-gray-200 py-3">
      <button type="button" onClick={() => onRestore(record)} className="w-full text-left"><strong className="block text-sm text-gray-800">{record.title}</strong>
        <time className="text-xs text-gray-500">{new Date(record.createdAt).toLocaleString("zh-CN")}</time><span className="ml-2 text-xs text-purple-800">打开课例</span>
        {record.note && <p className="mt-1 text-xs text-gray-600">{record.note}</p>}</button>
    </li>)}</ul> : <p>{query ? "没有匹配的课例。" : "暂无本机课例，可从排盘记录入口保存后查看。"}</p>}
    <p className="mt-3 text-xs text-gray-500">沿用本机排盘记录；此处不上传、删除或合并档案。</p>
  </section>;
}
