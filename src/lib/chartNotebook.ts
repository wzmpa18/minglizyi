export const CHART_NOTE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const CHART_NOTE_MAX_IMAGES = 6;
export const CHART_NOTE_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const CHART_NOTE_MAX_TOTAL_BYTES = 20 * 1024 * 1024;
export interface ChartNoteImage { id: string; name: string; type: string; bytes: number; dataUrl: string }
export interface ChartNotebookRecord { schema: 1; text: string; images: ChartNoteImage[]; updatedAt: string }

/** Delimited, account/subject scoped identity, including minutes and settings. */
export function chartNotebookKey(identity: readonly (string | number | boolean | null)[]) {
  return 'bazi-private-notebook-v1:' + encodeURIComponent(JSON.stringify(identity));
}

export function isChartNotebookRecord(value: unknown): value is ChartNotebookRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as ChartNotebookRecord;
  if (record.schema !== 1 || typeof record.text !== 'string' || typeof record.updatedAt !== 'string' || !Array.isArray(record.images) || record.images.length > CHART_NOTE_MAX_IMAGES) return false;
  const ids = new Set<string>();
  let total = 0;
  for (const image of record.images) {
    if (!image || typeof image.id !== 'string' || ids.has(image.id) || typeof image.name !== 'string' || !CHART_NOTE_IMAGE_TYPES.includes(image.type)) return false;
    if (!Number.isInteger(image.bytes) || image.bytes < 1 || image.bytes > CHART_NOTE_MAX_IMAGE_BYTES || typeof image.dataUrl !== 'string') return false;
    const encoded = image.dataUrl.split(',')[1] || '';
    if (!image.dataUrl.startsWith(`data:${image.type};base64,`) || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length !== 4 * Math.ceil(image.bytes / 3)) return false;
    total += image.bytes; if (total > CHART_NOTE_MAX_TOTAL_BYTES) return false;
    ids.add(image.id);
  }
  return true;
}
