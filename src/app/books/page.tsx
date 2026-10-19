"use client";
import {InterfaceButton} from "@/components/InterfaceControls";
import { SectionGate } from "@/components/SectionGate";

import { useEffect, useMemo, useState } from "react";
import { BrandHeader } from "@/components/shared";
import { LocalListenButton } from "@/components/LocalListenButton";
import { ContinuousListenPlayer } from "@/components/ContinuousListenPlayer";
import AIInterpretButton from "@/components/AIInterpretButton";
import classicsData from "@/data/guoxueClassics.json";
import { loadJsonPack } from "@/lib/offlinePackClient";
import { classicReadingBlocks, isCompatibleGuoxuePack } from "@/lib/classicReading";

const BRAND = "#7B2FBE";

type GuoxueBook = (typeof classicsData.books)[number];
interface GuoxueClassicsPack {
  schema: "yandao.guoxue.classics.v1";
  version: string;
  notice: string;
  books: GuoxueBook[];
}

function BooksContent() {
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  useEffect(() => { setSelectedId(new URLSearchParams(window.location.search).get("book") || ""); }, []);
  const [catalogue, setCatalogue] = useState<{ books: GuoxueBook[]; notice: string; version: string }>({
    books: classicsData.books,
    notice: classicsData.notice,
    version: "内置",
  });
  useEffect(() => {
    let active = true;
    const reload = async () => {
      const pack = await loadJsonPack<GuoxueClassicsPack>("guoxue-classics-approved");
      if (!active || !pack) return;
      const fullTextPack = isCompatibleGuoxuePack(pack);
      if (active && pack?.schema === "yandao.guoxue.classics.v1" && fullTextPack) {
        setCatalogue({ books: pack.books, notice: pack.notice || classicsData.notice, version: pack.version });
      }
    };
    void reload().catch(() => { /* Keep the bundled catalogue when an optional pack is unavailable. */ });
    const onInstalled = (event: Event) => {
      const detail = (event as CustomEvent<{ packId?: string }>).detail;
      if (detail?.packId === "guoxue-classics-approved") void reload().catch(() => {});
    };
    window.addEventListener("offline-pack-installed", onInstalled);
    return () => { active = false; window.removeEventListener("offline-pack-installed", onInstalled); };
  }, []);
  const selected = catalogue.books.find((book) => book.id === selectedId);
  const categories = useMemo(
    () => ["全部", ...Array.from(new Set(catalogue.books.map((book) => book.category)))],
    [catalogue.books],
  );
  const visible = useMemo(() => catalogue.books.filter((book) => {
    const keywordMatched = !query.trim() || `${book.title}${book.author}${book.content}`.includes(query.trim());
    return keywordMatched && (category === "全部" || book.category === category);
  }), [catalogue.books, category, query]);

  if (selected) return <BookReader key={selected.id} book={selected} onBack={() => {
    setSelectedId("");
    const url = new URL(window.location.href); url.searchParams.delete("book");
    window.history.replaceState(window.history.state, "", url);
  }} />;

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "#f5f5f5", maxWidth: 520, margin: "0 auto" }}>
      <BrandHeader title="国学典籍库" showBack />
      <main className="flex-1 px-4 py-4">
        <section className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
          <h1 className="text-base font-bold" style={{ color: BRAND }}>经典原文 · 离线阅读 · 本地听学</h1>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            当前收录 {catalogue.books.length} 部典籍资料，可离线阅读和连续听学。各书来源与收录范围见阅读页；篇章检查不等于逐字校勘。
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a href="/zhongyi/classic" className="rounded-xl border border-purple-100 bg-purple-50 p-3 text-center text-xs font-semibold text-purple-800">中医典籍库</a>
            <a href="/yixue/learn" className="rounded-xl border border-purple-100 bg-purple-50 p-3 text-center text-xs font-semibold text-purple-800">易学典籍库</a>
          </div>
        </section>

        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索书名、作者或原文"
          className="mb-3 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none" />
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {categories.map((item) => (
            <InterfaceButton key={item} type="button" onClick={() => setCategory(item)} className="shrink-0 rounded-full border px-3 py-1.5 text-xs"
              style={{ borderColor: category === item ? BRAND : "#E5E7EB", color: category === item ? "#FFF" : "#666", background: category === item ? BRAND : "#FFF" }}>
              {item}
            </InterfaceButton>
          ))}
        </div>

        <div className="space-y-3">
          {visible.map((book, index) => (
            <InterfaceButton translate="no" key={book.id} type="button" onClick={() => setSelectedId(book.id)} className="flex w-full items-start gap-3 rounded-xl bg-white p-4 text-left shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: BRAND }}>{index + 1}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-gray-800">《{book.title}》</h2>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">{book.category}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{book.author}</p>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-400">{book.content.slice(0, 100)}</p>
              </div>
            </InterfaceButton>
          ))}
          {!visible.length && <div className="rounded-xl bg-white p-6 text-center text-sm text-gray-400">没有找到匹配内容</div>}
        </div>

        <p className="mt-5 rounded-xl bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">
          {catalogue.notice} 来源和许可统一在本页说明，正文保持清爽；新增典籍需先通过来源、完整性与错字检查。内容版本：{catalogue.version}。
        </p>
      </main>
      <div className="page-bottom-nav-safe" aria-hidden="true" />
    </div>
  );
}

function BookReader({ book, onBack }: { book: GuoxueBook; onBack: () => void }) {
  const blocks = useMemo(() => classicReadingBlocks(book.content), [book.content]);
  const [fontSize, setFontSize] = useState(18), [bookmark, setBookmark] = useState(""), [message, setMessage] = useState("");
  const bookmarkKey = `classic-reading-position-v1:${book.id}`;
  useEffect(() => {
    try { setBookmark(localStorage.getItem(bookmarkKey) || ""); } catch { setMessage("本机书签无法读取，正文仍可阅读。"); }
  }, [bookmarkKey]);
  const savePosition = () => {
    const target = blocks.find(block => { const element = document.getElementById(block.id); return element && element.getBoundingClientRect().bottom > 90; });
    if (!target) return;
    try { localStorage.setItem(bookmarkKey, target.id); setBookmark(target.id); setMessage("已记住本机阅读位置。"); } catch { setMessage("书签保存失败，请先记下段落位置。"); }
  };
  return (
    <div className="min-h-screen bg-[#f5f1e8]" style={{ maxWidth: 520, margin: "0 auto" }}>
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[#dce2d5] bg-[#fbf9f2] px-3 py-3" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
        <InterfaceButton type="button" aria-label="返回典籍目录" onClick={onBack} className="rounded-lg px-2 py-1 text-xl text-[#30483f]">‹</InterfaceButton>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold text-gray-800">《{book.title}》</h1>
          <p className="text-[10px] text-gray-400">{book.author} · {book.category}</p>
        </div>
      </header>
      <main className="px-4 py-4">
        <section className="mb-4 overflow-hidden rounded-2xl bg-[#244b40] px-5 py-6 text-[#fbf4dc]">
          <p className="text-[11px] tracking-[0.2em] text-[#b6cbb7]">{book.category} · 典籍阅读</p>
          <h2 className="mt-3 text-2xl font-semibold leading-relaxed" style={{ fontFamily: '"Noto Serif SC", "Songti SC", SimSun, serif' }}>《{book.title}》</h2>
          <p className="mt-2 text-xs leading-6 text-[#d1ddca]">{book.author}</p>
          <div className="mt-5 flex flex-wrap gap-2 text-[10px]"><span className="rounded-full border border-[#678577] px-2 py-1">原文阅读</span><span className="rounded-full border border-[#678577] px-2 py-1">连续听学</span><span className="rounded-full border border-[#678577] px-2 py-1">本机书签</span></div>
        </section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#fffdf7] p-3 text-[#30483f]"><div className="flex items-center gap-2"><span className="text-xs">字号</span>{[16, 18, 22].map(size => <InterfaceButton key={size} type="button" aria-label={`字号${size}`} aria-pressed={fontSize === size} onClick={() => setFontSize(size)} className="rounded-lg border px-3 py-2 text-xs" style={{ background: fontSize === size ? "#e4ecdf" : "transparent" }}>{size === 16 ? "小" : size === 18 ? "中" : "大"}</InterfaceButton>)}</div><InterfaceButton type="button" onClick={savePosition} className="text-xs underline">记住位置</InterfaceButton>{bookmark && <InterfaceButton type="button" onClick={() => document.getElementById(bookmark)?.scrollIntoView({ block: "start", behavior: "smooth" })} className="text-xs underline">继续上次阅读</InterfaceButton>}</div>
        {message && <p role="status" className="mb-3 text-xs text-[#2a6351]">{message}</p>}
        <details className="mb-3 rounded-xl border border-[#dce2d5] bg-[#fffdf7] p-3"><summary className="cursor-pointer text-sm font-semibold text-[#30483f]">听学与原文辅助</summary><div className="mt-3">
          <LocalListenButton text={`${book.title}。${book.content}`} contentId={`guoxue:${book.id}`} />
          <ContinuousListenPlayer collectionId={`guoxue:${book.id}`} title="全书连续听学"
            items={[{ id: book.id, title: book.title, text: book.content }]} />
          <div className="mt-2">
            <AIInterpretButton discussionEnabled discussionType="classic" discussionId={`guoxue:${book.id}`}
              discussionTitle={`${book.title}学习讨论`} toolName={`《${book.title}》`} scope="原文解读"
              buttonText="🤖 AI解读本书" cacheKey={`guoxue_interpret:${book.id}`} contextData={book.content.slice(0, 12000)}
              systemPrompt="你是国学古籍阅读助手。只能依据用户提供的古籍原文解释字词、句义、篇章结构与历史语境；不得虚构书名、篇名、页码或人物观点。明确区分原文、释义与学习提示，不把古代观念直接包装成现代事实。" />
          </div>
        </div></details>
        <article aria-label="典籍原文" className="rounded-2xl border border-[#e8e1d2] bg-[#fffdf7] px-5 py-6 text-[#273c33] shadow-sm" style={{ fontSize, lineHeight: 2.05, fontFamily: '"Noto Serif SC", "Songti SC", SimSun, serif' }}>{blocks.map(block => block.heading ? <h3 key={block.id} id={block.id} className="mb-4 mt-7 scroll-mt-24 border-l-2 border-[#b2975a] pl-3 text-lg font-bold">{block.text}</h3> : <p key={block.id} id={block.id} className="mb-5 scroll-mt-24 whitespace-pre-line text-justify">{block.text}</p>)}</article>
        <p className="my-4 text-center text-[10px] leading-5 text-gray-500">原文来源：<a href={book.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">{book.sourceName}</a> · {book.license}<br />来源记录 {book.sectionCount} 个文本区块，尚未逐字校勘。</p>
      </main>
    </div>
  );
}

export default function BooksPage() { return <SectionGate toolId="guoxue_books" title="国学典籍" backHref="/academy"><BooksContent /></SectionGate>; }
