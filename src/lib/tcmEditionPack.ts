import type { ClassicBook } from '@/algorithm-core/modules/tcm/classics';

export interface TcmEditionPack {
  schema: 'yandao.tcm.original-editions.v1';
  version: string;
  books: ClassicBook[];
}

const safeSource = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; }
  catch { return false; }
};

/** Content only. Never replace a complete built-in edition with a partial pack. */
export function isCompatibleTcmEditionPack(value: unknown, baseline: ClassicBook[]): value is TcmEditionPack {
  if (!value || typeof value !== 'object') return false;
  const pack = value as Record<string, unknown>;
  if (pack.schema !== 'yandao.tcm.original-editions.v1' || typeof pack.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(pack.version)) return false;
  if (!Array.isArray(pack.books) || !pack.books.length || pack.books.length > 50) return false;
  const ids = new Set<string>();
  let total = 0;
  for (const candidate of pack.books) {
    if (!candidate || typeof candidate !== 'object') return false;
    const book = candidate as Record<string, unknown>;
    if (!['id', 'name', 'author', 'dynasty', 'pinyin', 'description', 'sourceName', 'license', 'verification'].every(key => typeof book[key] === 'string' && (book[key] as string).trim().length > 0 && (book[key] as string).length < 10000)) return false;
    if (!/^[a-z0-9_-]{1,100}$/.test(book.id as string) || ids.has(book.id as string) || !safeSource(book.sourceUrl)) return false;
    if (!safeSource(book.sourceRevisionUrl) || !Array.isArray(book.chapters) || !book.chapters.length || book.chapters.length > 500) return false;
    const chapterIds = new Set<string>();
    for (const candidateChapter of book.chapters) {
      if (!candidateChapter || typeof candidateChapter !== 'object') return false;
      const chapter = candidateChapter as Record<string, unknown>;
      if (typeof chapter.id !== 'string' || !/^[a-z0-9_-]{1,120}$/.test(chapter.id) || chapterIds.has(chapter.id)) return false;
      if (typeof chapter.title !== 'string' || !chapter.title.trim() || chapter.title.length > 300) return false;
      if (typeof chapter.content !== 'string' || !chapter.content.trim() || chapter.content.length > 500000) return false;
      total += chapter.content.length;
      if (total > 12000000) return false;
      chapterIds.add(chapter.id);
    }
    ids.add(book.id as string);
  }
  // Stable links and minimum extent protect bookmarks and complete editions.
  for (const original of baseline.filter(book => book.sourceUrl)) {
    const replacement = (pack.books as ClassicBook[]).find(book => book.id === original.id);
    if (!replacement) return false;
    for (const chapter of original.chapters) {
      const updated = replacement.chapters.find(item => item.id === chapter.id);
      if (!updated || updated.content.replace(/\s/g, '').length < chapter.content.replace(/\s/g, '').length * 0.8) return false;
    }
  }
  return true;
}

export function mergeTcmEditionPack(baseline: ClassicBook[], pack: TcmEditionPack): ClassicBook[] {
  const updated = new Map(pack.books.map(book => [book.id, book]));
  return [...baseline.map(book => updated.get(book.id) || book), ...pack.books.filter(book => !baseline.some(item => item.id === book.id))];
}
