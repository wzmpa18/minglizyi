"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getUserToken } from "@/lib/auth";

type Document = { id: string; title: string; size: number; extension: string; url: string };
type Collection = { id: string; title: string; description: string; documents: Document[] };
type Group = { id: string; title: string; description: string; collections: Collection[] };

const sizeLabel = (bytes: number) => `${Math.round(bytes / 1048576)} MB`;

export default function StudyResources() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<{ title: string; filename: string; url: string } | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [fileBusy, setFileBusy] = useState(false);
  const [fileError, setFileError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const requested = new URLSearchParams(window.location.search).get("group") || "";
    const token = getUserToken();
    if (!token) { setError("登录后即可阅读学习资料"); setLoading(false); return () => controller.abort(); }
    fetch("/api/academy/study-files", { cache: "no-store", signal: controller.signal, headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error("服务器暂时无法提供资料目录");
        const data = await response.json();
        if (data.success !== true || !Array.isArray(data.groups)) throw new Error("资料目录格式异常");
        setGroups(data.groups);
        setGroupId(data.groups.some((item: Group) => item.id === requested) ? requested : data.groups[0]?.id || "");
      })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "资料目录加载失败"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selected) { setFileUrl(""); setFileError(""); return; }
    const controller = new AbortController();
    let objectUrl = "";
    setFileUrl("");
    setFileError("");
    setFileBusy(true);
    const token = getUserToken();
    if (!token) { setFileBusy(false); setFileError("登录后即可阅读学习资料"); return () => controller.abort(); }
    fetch(selected.url, { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error(response.status === 401 ? "登录已过期，请重新登录" : "文件暂时无法打开");
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        if (!controller.signal.aborted) setFileUrl(objectUrl);
      })
      .catch((cause) => { if (!controller.signal.aborted) setFileError(cause instanceof Error ? cause.message : "文件读取失败"); })
      .finally(() => { if (!controller.signal.aborted) setFileBusy(false); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [selected]);

  const group = groups.find((item) => item.id === groupId);
  const openFile = (groupTitle: string, collectionTitle: string, doc: Document) => {
    const title = `${groupTitle} ${collectionTitle} ${doc.title}`;
    setSelected({ title, filename: `${title}${doc.extension}`, url: doc.url });
  };

  return (
    <main className="mx-auto min-h-screen max-w-lg bg-[#f6f8f7] px-4 pb-28 pt-5 text-[#25332e]">
      <Link href="/academy" className="text-sm text-[#1f8a7d]">‹ 返回学习中心</Link>
      <h1 className="mt-4 text-xl font-bold">学习资料库</h1>
      <p className="mt-2 text-sm leading-6 text-gray-600">资料目录由云端更新。按类别阅读文档，新增资料无需重新安装 App。</p>
      {loading && <p className="mt-5 rounded-xl bg-white p-5 text-sm">正在读取资料目录…</p>}
      {error && <div className="mt-5 rounded-xl bg-white p-5 text-sm text-red-700">{error} {error.includes("登录") ? <Link href="/login" className="ml-3 underline">去登录</Link> : <button className="ml-3 underline" onClick={() => window.location.reload()}>重试</button>}</div>}
      {!loading && !error && groups.length === 0 && <p className="mt-5 rounded-xl bg-white p-5 text-sm">暂无可阅读资料。</p>}
      <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
        {groups.map((item) => <button key={item.id} type="button" onClick={() => { setGroupId(item.id); setSelected(null); }}
          className={`shrink-0 rounded-xl px-3 py-3 text-sm font-semibold ${groupId === item.id ? "bg-[#1f8a7d] text-white" : "bg-white text-[#1f8a7d]"}`}>{item.title}</button>)}
      </div>
      {group?.description && <p className="mt-1 text-xs leading-5 text-gray-600">{group.description}</p>}
      <section className="mt-4 space-y-3" aria-label="资料目录">
        {group?.collections.map((collection) => <div key={collection.id} className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold">{collection.title}</h2>
          {collection.description && <p className="mt-1 text-xs text-gray-500">{collection.description}</p>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            {collection.documents.map((doc) => <button key={doc.id} type="button" onClick={() => openFile(group.title, collection.title, doc)}
              className="rounded-lg bg-emerald-50 px-2 py-3 text-sm text-emerald-800">{doc.title} · {sizeLabel(doc.size)}</button>)}
          </div>
        </div>)}
      </section>
      {selected && <section className="mt-5 rounded-xl bg-white p-3">
        <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">{selected.title}</h2><button type="button" onClick={() => setSelected(null)} className="text-sm text-gray-600">关闭</button></div>
        <p className="my-2 text-xs text-gray-500">大文件首次打开建议使用 Wi-Fi；文件下载完成后在应用内阅读。</p>
        {fileBusy && <p className="rounded-lg bg-emerald-50 p-4 text-sm">正在准备文档…</p>}
        {fileError && <p role="status" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{fileError}</p>}
        {fileUrl && <><iframe key={fileUrl} src={fileUrl} title={selected.title} className="h-[72vh] w-full rounded-lg border" /><a href={fileUrl} download={selected.filename} className="mt-3 block rounded-lg bg-[#1f8a7d] px-4 py-3 text-center text-sm font-semibold text-white">保存文档</a></>}
      </section>}
    </main>
  );
}
