'use client';

import { getPointStudy } from '@/algorithm-core/modules/tcm/point-study';

export function AcupointClassicStudy({ code }: { code: string }) {
  const records = getPointStudy(code);
  if (!records.length) return null;
  return <section aria-label="穴位主治与经典配穴" style={{ margin: 12, padding: 14, background: 'white', borderRadius: 14, lineHeight: 1.8, color: '#333', fontSize: 13 }}>
    <h2 style={{ fontSize: 16, color: '#7B2FBE', marginTop: 0 }}>主治与配穴 · 文献学习</h2>
    <p style={{ color: '#666', fontSize: 12 }}>以下为古籍记载，保留原书病名。用于原典对照学习，不作为个人诊断、治疗或自行针刺依据。</p>
    {records.map((record, index) => <div key={`${record.chapterId}-${record.paragraph}-${index}`} style={{ borderTop: '1px solid #eee', paddingTop: 10, marginTop: 10 }}>
      <strong>{record.kind === 'CLASSIC_PAIRING_QUOTE' ? '经典配穴原句' : '主治原文'}</strong>
      <blockquote style={{ margin: '6px 0', whiteSpace: 'pre-wrap' }}>{record.text}</blockquote>
      <p style={{ fontSize: 12, color: '#666', margin: 0 }}>《{record.source?.title}》{record.chapterTitle || '考正穴法'} · 原文第{record.paragraph}段</p>
      <span style={{ color: '#777', fontSize: 11 }}>原文与出处已在本页列出</span>
    </div>)}
  </section>;
}
