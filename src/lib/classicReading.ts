export function classicReadingBlocks(content: string) {
  return content.split(/\n\s*\n/).map(text => text.trim()).filter(Boolean).map((text, index) => ({
    id: `reading-block-${index}`, text,
    heading: text.length < 40 && !/[。！？：；]/.test(text) && /[卷篇章节][上中下甲乙丙丁一二三四五六七八九十百\d]*$/.test(text),
  }));
}

/** A data-only compatible pack; completeness labels alone do not validate content. */
export function isCompatibleGuoxuePack(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const pack = value as Record<string, unknown>;
  if (pack.schema !== "yandao.guoxue.classics.v1" || typeof pack.version !== "string" || !Array.isArray(pack.books) || pack.books.length < 1 || pack.books.length > 200) return false;
  const ids = new Set<string>();
  let characters = 0;
  for (const candidate of pack.books) {
    if (!candidate || typeof candidate !== "object") return false;
    const book = candidate as Record<string, unknown>;
    if (!["id", "title", "category", "author", "content", "sourceName", "sourceUrl", "license"].every(key => typeof book[key] === "string" && (book[key] as string).trim().length > 0)) return false;
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(book.id as string) || ids.has(book.id as string)) return false;
    if (book.completeness !== "full" || !Number.isInteger(book.sectionCount) || Number(book.sectionCount) < 1) return false;
    if (typeof book.verifiedAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(book.verifiedAt)) return false;
    try { const url = new URL(book.sourceUrl as string); if (url.protocol !== "https:" || url.username || url.password) return false; } catch { return false; }
    characters += (book.content as string).length;
    if (characters > 12000000) return false;
    ids.add(book.id as string);
  }
  return true;
}
