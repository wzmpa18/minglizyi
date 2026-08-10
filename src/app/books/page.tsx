"use client";

import { BrandHeader } from "@/components/shared";

const BRAND = "#7B2FBE";

const BOOKS = [
  { id: 1, name: "黄帝内经", desc: "中医理论奠基之作，分《素问》《灵枢》两部分" },
  { id: 2, name: "伤寒论", desc: "张仲景著，确立辨证论治体系，外感病诊治经典" },
  { id: 3, name: "金匮要略", desc: "张仲景著，论述杂病证治，方剂实用价值极高" },
  { id: 4, name: "温病条辨", desc: "吴鞠通著，系统论述温病三焦辨证，温病学代表" },
  { id: 5, name: "本草纲目", desc: "李时珍著，集本草学大成，收载药物一千八百余种" },
];

export default function BooksPage() {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: "#f5f5f5", maxWidth: "420px", margin: "0 auto" }}
    >
      <BrandHeader title="书库" showBack />

      <div className="flex-1 px-4 py-4">
        <div
          className="mb-4 rounded-xl p-4 text-center"
          style={{ backgroundColor: "#fff", border: `1px solid ${BRAND}22` }}
        >
          <p className="text-sm font-semibold" style={{ color: BRAND }}>
            经典医籍阅读列表
          </p>
          <p className="mt-1 text-xs text-gray-400">
            以下为中医经典著作，建议按序研读
          </p>
        </div>

        <div className="space-y-3">
          {BOOKS.map((book, index) => (
            <div
              key={book.id}
              className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: BRAND }}
              >
                {index + 1}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-800">
                  {book.name}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  {book.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
