'use client';

import { getPointStudy } from '@/algorithm-core/modules/tcm/point-study';

export function AcupointClassicStudy({ code }: { code: string }) {
  const records = getPointStudy(code);
  if (!records.length) return null;
  return <section aria-label="穴位主治与经典配穴" style={{ margin: 12, padding: 14, background: 'white', borderRadius: 14, lineHeight: 1.8, color: '#333', fontSize: 13 }}>
    <h2 style={{ fontSize: 17, color: '#7B2FBE', marginTop: 0 }}>经典原文对照</h2>
    {records.map((record, index) => <details key={`${record.chapterId}-${record.paragraph}-${index}`} style={{ borderTop: '1px solid #eee', paddingTop: 12, marginTop: 10 }}>
      <summary style={{fontSize:14,cursor:'pointer'}}>{record.kind === 'CLASSIC_PAIRING_QUOTE' ? '配穴原文' : '主治原文'} · 《{record.source?.title}》</summary>
      <blockquote style={{ margin: '6px 0', whiteSpace: 'pre-wrap' }}>{record.text}</blockquote>
      <p style={{ fontSize: 12, color: '#666', margin: 0 }}>《{record.source?.title}》{record.chapterTitle || '考正穴法'} · 原文第{record.paragraph}段</p>
    </details>)}
  </section>;
}
