export interface ListeningItem { id: string; title: string; text: string }

/** Preserve every code point; a long lesson must not silently stop at 30,000 chars. */
export function splitListeningText(text: string, limit = 600): string[] {
  const characters = Array.from(String(text || "").trim());
  const size = Number.isInteger(limit) && limit >= 20 ? limit : 600;
  const result: string[] = [];
  for (let offset = 0; offset < characters.length;) {
    let end = Math.min(offset + size, characters.length);
    if (end < characters.length) {
      for (let index = end - 1; index >= offset + Math.floor(size / 2); index--) {
        if (/[。！？；\n]/.test(characters[index])) { end = index + 1; break; }
      }
    }
    result.push(characters.slice(offset, end).join(""));
    offset = end;
  }
  return result;
}

export function restoreListeningPosition(raw: string | null, items: ListeningItem[]) {
  try {
    const value = JSON.parse(raw || "null");
    const index = items.findIndex(item => item.id === value?.itemId);
    if (index < 0) return { index: 0, chunk: 0 };
    const count = splitListeningText(items[index].text).length;
    const chunk = Number.isInteger(value.chunk) && value.chunk >= 0 && value.chunk < count ? value.chunk : 0;
    return { index, chunk };
  } catch { return { index: 0, chunk: 0 }; }
}
