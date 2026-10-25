import bundled from '../../../data/acupointClassicStudy.json';

export interface PointStudyRecord {
  sourceId: string;
  chapterId: string;
  paragraph: number;
  editionPageStart: number;
  url: string;
  sourceSha256: string;
  kind: 'CLASSIC_INDICATION_QUOTE' | 'CLASSIC_PAIRING_QUOTE';
  text: string;
  pointCodes?: string[];
  chapterTitle?: string;
  reviewState: 'SOURCE_TRANSCRIPTION';
}
export interface PointStudyIndex {
  schema: 'yandao.tcm.point-study.v1';
  version: string;
  sources: Array<{ id: string; title: string; author: string; edition: string; notice: string }>;
  points: Record<string, PointStudyRecord[]>;
}

let current = bundled as PointStudyIndex;

/** Reject the whole optional study index on malformed or unsupported content. */
export function validatePointStudyIndex(raw: unknown): PointStudyIndex | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as PointStudyIndex;
  if (value.schema !== 'yandao.tcm.point-study.v1' || typeof value.version !== 'string' || value.version.length > 40 ||
      !Array.isArray(value.sources) || !value.points || typeof value.points !== 'object') return null;
  const sources = new Set<string>();
  const plain = (text: unknown, max: number): text is string =>
    typeof text === 'string' && text.length > 0 && text.length <= max && !/[<>\u0000]/.test(text);
  for (const source of value.sources) {
    if (!source || !plain(source.id, 100) || sources.has(source.id) || !plain(source.title, 100) ||
        !plain(source.author, 100) || !plain(source.edition, 300) || !plain(source.notice, 500)) return null;
    sources.add(source.id);
  }
  if (Object.keys(value.points).length > 2000) return null;
  for (const [code, records] of Object.entries(value.points)) {
    if (!/^[A-Z]{1,4}\d{1,3}$/.test(code) || !Array.isArray(records) || records.length > 100) return null;
    for (const record of records) {
      if (!record || !sources.has(record.sourceId) || !plain(record.text, 2500) ||
          !plain(record.chapterId, 100) || !Number.isInteger(record.paragraph) || record.paragraph < 1 ||
          !Number.isInteger(record.editionPageStart) || record.editionPageStart < 1 ||
          !/^[a-f0-9]{64}$/.test(record.sourceSha256) || record.reviewState !== 'SOURCE_TRANSCRIPTION' ||
          !['CLASSIC_INDICATION_QUOTE', 'CLASSIC_PAIRING_QUOTE'].includes(record.kind)) return null;
      if (record.chapterTitle !== undefined && !plain(record.chapterTitle, 100)) return null;
      try {
        const url = new URL(record.url);
        if (url.protocol !== 'https:' || url.hostname !== 'www.shidianguji.com' || url.username || url.password ||
            !url.pathname.endsWith('/chapter/' + record.chapterId)) return null;
      } catch { return null; }
      if (record.kind === 'CLASSIC_PAIRING_QUOTE' && (!Array.isArray(record.pointCodes) ||
          record.pointCodes.length < 2 || record.pointCodes.length > 8 || !record.pointCodes.includes(code) ||
          record.pointCodes.some(point => !/^[A-Z]{1,4}\d{1,3}$/.test(point)) ||
          new Set(record.pointCodes).size !== record.pointCodes.length)) return null;
    }
  }
  // Detach from callers so later mutation cannot bypass validation.
  return JSON.parse(JSON.stringify(value)) as PointStudyIndex;
}

export function installPointStudyIndex(raw: unknown): boolean {
  const index = validatePointStudyIndex(raw);
  if (!index) return false;
  current = index;
  return true;
}
export function getPointStudy(code: string) {
  const canonical = code.replace(/^DU/, 'GV').replace(/^RN/, 'CV');
  const legacy = canonical.replace(/^GV/, 'DU').replace(/^CV/, 'RN');
  return (current.points[code] || current.points[canonical] || current.points[legacy] || []).map(record => ({
    ...record, source: current.sources.find(source => source.id === record.sourceId),
  }));
}
