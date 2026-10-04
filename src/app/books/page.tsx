"use client";

import { useEffect, useMemo, useState } from "react";
import { BrandHeader } from "@/components/shared";
import { LocalListenButton } from "@/components/LocalListenButton";
import AIInterpretButton from "@/components/AIInterpretButton";
import classicsData from "@/data/guoxueClassics.json";
import { loadJsonPack } from "@/lib/offlinePackClient";

const BRAND = "#7B2FBE";

type GuoxueBook = (typeof classicsData.books)[number];
interface GuoxueClassicsPack {
  schema: "yandao.guoxue.classics.v1";
  version: string;
  notice: string;
  books: GuoxueBook[];
}

export default function BooksPage() {
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [catalogue, setCatalogue] = useState<{ books: GuoxueBook[]; notice: string; version: string }>({
    books: classicsData.books,
    notice: classicsData.notice,
    version: "内置",
  });
  useEffect(() => {
    let active = true;
    const reload = async () => {
      const pack = await loadJsonPack<GuoxueClassicsPack>("guoxue-classics-approved");
      if (active && pack?.schema === "yandao.guoxue.classics.v1" && Array.isArray(pack.books) && pack.books.length) {
        setCatalogue({ books: pack.books, notice: pack.notice || classicsData.notice, version: pack.version });
      }
    };
    void reload();
    const onInstalled = (event: Event) => {
      const detail = (event as CustomEvent<{ packId?: string }>).detail;
      if (detail?.packId === "guoxue-classics-approved") void reload();
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

  if (selected) return <BookReader book={selected} onBack={() => setSelectedId("")} />;

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "#f5f5f5", maxWidth: 520, margin: "0 auto" }}>
      <BrandHeader title="国学典籍库" showBack />
      <main className="flex-1 px-4 py-4">
        <section className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
          <h1 className="text-base font-bold" style={{ color: BRAND }}>经典原文 · 离线阅读 · 本地听学</h1>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            当前只发布已核验的古籍原文，不混入现代译注。每部典籍均可听读、AI辅助理解并参与学习讨论。
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
            <button key={item} type="button" onClick={() => setCategory(item)} className="shrink-0 rounded-full border px-3 py-1.5 text-xs"
              style={{ borderColor: category === item ? BRAND : "#E5E7EB", color: category === item ? "#FFF" : "#666", background: category === item ? BRAND : "#FFF" }}>
              {item}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {visible.map((book, index) => (
            <button key={book.id} type="button" onClick={() => setSelectedId(book.id)} className="flex w-full items-start gap-3 rounded-xl bg-white p-4 text-left shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: BRAND }}>{index + 1}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-gray-800">《{book.title}》</h2>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">{book.category}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{book.author}</p>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-400">{book.content.slice(0, 100)}</p>
              </div>
            </button>
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
  return (
    <div className="min-h-screen bg-[#F7F5F2]" style={{ maxWidth: 520, margin: "0 auto" }}>
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-100 bg-white px-3 py-3">
        <button type="button" onClick={onBack} className="rounded-lg px-2 py-1 text-xl text-gray-600">‹</button>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold text-gray-800">《{book.title}》</h1>
          <p className="text-[10px] text-gray-400">{book.author} · {book.category}</p>
        </div>
      </header>
      <main className="px-4 py-4">
        <section className="mb-3 rounded-xl border border-gray-100 bg-white p-3">
          <LocalListenButton text={`${book.title}。${book.content}`} contentId={`guoxue:${book.id}`} />
          <div className="mt-2">
            <AIInterpretButton discussionEnabled discussionType="classic" discussionId={`guoxue:${book.id}`}
              discussionTitle={`${book.title}学习讨论`} toolName={`《${book.title}》`} scope="原文解读"
              buttonText="🤖 AI解读本书" cacheKey={`guoxue_interpret:${book.id}`} contextData={book.content.slice(0, 12000)}
              systemPrompt="你是国学古籍阅读助手。只能依据用户提供的古籍原文解释字词、句义、篇章结构与历史语境；不得虚构书名、篇名、页码或人物观点。明确区分原文、释义与学习提示，不把古代观念直接包装成现代事实。" />
          </div>
        </section>
        <article className="whitespace-pre-wrap rounded-2xl bg-white px-5 py-6 text-[17px] leading-9 text-gray-800 shadow-sm">{book.content}</article>
        <p className="my-4 text-center text-[10px] leading-5 text-gray-400">原文来源：{book.sourceName} · {book.license}</p>
      </main>
    </div>
  );
}
