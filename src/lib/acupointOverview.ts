import evidenceJson from '@/data/acupointOverviewEvidence.json';
import { getPointStudy } from '@/algorithm-core/modules/tcm/point-study';
import type { TcmAcupoint } from '@/algorithm-core/types/tcm';
import type { SubjectReading } from './medicalStudyLibrary';

export interface OverviewText {
  text: string;
  sourceTitle: string;
  locator: string;
  kind: 'LOCATION_REFERENCE' | 'CLASSIC_QUOTE' | 'EDITORIAL_EXPLANATION' | 'EXISTING_SUMMARY';
  sourceUrl?: string;
  label?: string;
}
export interface AcupointOverview {
  code: string;
  name: string;
  location?: OverviewText;
  indications?: OverviewText;
  combinations?: OverviewText;
  plainExplanation?: OverviewText;
  aliases?: string;
  sourceTitles: string[];
}
interface EvidenceIndex {
  source: {title:string;sourceUrl:string;edition:string;notice:string};
  points: Record<string, {name:string;originalName:string;heading:string;location:string;indications:string;chapterTitle:string;lineStart:number}>;
}
const evidence = evidenceJson as EvidenceIndex;
const canonicalCode = (code:string) => code.toUpperCase().replace(/^DU/, 'GV').replace(/^RN/, 'CV');
const normalize = (text:string) => text.replace(/谿/g,'溪').replace(/後/g,'后').replace(/崑/g,'昆').replace(/顖/g,'囟');

/** Empty library notices are state, never medical content. */
export function cleanAcupointText(value: unknown, name?: string): string {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  if (!text || /暂无|尚无|待补充|待核实|详见经典文献|未整理|未收录|请查阅|请在专业医师指导/.test(text)) return '';
  if (name && (text === name || text === name + '穴' || text === name + '穴。')) return '';
  return text;
}

/**
 * A substring such as 心腹結氣 is not evidence for the point 腹结.
 * Explicit newly curated sections carry their exact point identity. Older
 * passages need an acupuncture source plus a delimited point name, or 穴.
 */
export function isDirectAcupointPassage(
  point: Pick<TcmAcupoint,'name'|'code'>,
  entry: SubjectReading['passages'][number],
): boolean {
  const code = canonicalCode(point.code);
  if (entry.mappingNote?.startsWith('DIRECT_ACUPOINT_SECTION:')) {
    return canonicalCode(entry.mappingNote.slice('DIRECT_ACUPOINT_SECTION:'.length)) === code;
  }
  if (entry.mappingNote?.startsWith('EXACT_ACUPOINT_COURSE_TITLE:')) {
    return canonicalCode(entry.mappingNote.slice('EXACT_ACUPOINT_COURSE_TITLE:'.length)) === code;
  }
  const text = normalize(entry.text);
  const names = [...new Set([point.name,evidence.points[code]?.originalName].filter((value):value is string=>!!value).map(normalize))];
  if (names.some(name=>text.includes(name + '穴'))) return true;
  if (!/[针針鍼]灸|经穴|經穴|腧穴/.test(entry.sourceInfo.title)) return false;
  return names.some(name=>new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=[\\s，。、；：『（〔]|$)').test(text));
}

// Brief factual location paraphrases checked against the university's own
// acupoint pages. They are distinct from the old classic's measurement system.
const locationReferences: Record<string,{text:string;page:string}> = {
  SP1: {text:'在足大趾末节内侧，趾甲内侧角近端约0.1寸，甲根水平线与甲内侧缘垂线相交处。',page:'SP01'},
  SP14: {text:'在下腹部，脐中下1.3寸，前正中线旁开4寸。',page:'SP14'},
  LR12: {text:'在腹股沟区，与耻骨联合上缘同高，前正中线旁开2.5寸。',page:'LR12'},
  GV7: {text:'在背部后正中线上，第10胸椎棘突下方凹陷中。',page:'GV07'},
};
const explanations: Record<string,string> = {
  SP1: '定位时先看脚大拇趾趾甲的内侧角。古文“食不下”指吃不下东西，“暴泄”指突然明显腹泻；其余古病名保留原词，方便继续对照课文。',
  SP14: '原文主要记述绕肚脐疼痛、腹部发冷伴腹泻，以及“上抢心”“咳逆”等古代症候。这里按文献理解，不把古病名直接换成现代诊断。古籍所写旁开四寸半与上方现代定位参考不同，阅读时应区分版本。',
};

/** Main-card content is resolved from exact sources before legacy summaries. */
export function resolveAcupointOverview(point:TcmAcupoint, reading?:SubjectReading|null):AcupointOverview {
  const code = canonicalCode(point.code), row = evidence.points[code];
  const result:AcupointOverview = {code,name:point.name,sourceTitles:[]};
  const reference = locationReferences[code];
  const installedLocation = cleanAcupointText(point.location_detail, point.name) || cleanAcupointText(point.location, point.name);
  if (reference) result.location = {text:reference.text,sourceTitle:'明治国际医疗大学 MR经穴',locator:code+' · 部位条目（中文释述）',kind:'LOCATION_REFERENCE',label:'定位',sourceUrl:'https://mr.meiji-u.ac.jp/mr_keiketsu/keiketsu/'+reference.page+'-a.html'};
  else if (installedLocation) result.location = {text:installedLocation,sourceTitle:point.literature||'已保存穴位资料',locator:'既有或更新的定位整理，非逐字引文',kind:'EXISTING_SUMMARY',label:'定位'};
  else if (row && cleanAcupointText(row.location, point.name)) result.location = {text:row.location,sourceTitle:evidence.source.title,locator:row.chapterTitle+' · '+row.heading+'；经典定位，版本分寸需区分',sourceUrl:evidence.source.sourceUrl,kind:'CLASSIC_QUOTE',label:'经典定位'};
  const study = getPointStudy(point.code);
  const indication = study.find(record => record.kind === 'CLASSIC_INDICATION_QUOTE');
  if (indication) result.indications = {text:indication.text,sourceTitle:indication.source?.title||'针灸大成',locator:(indication.chapterTitle||'经穴篇')+' · 原文第'+indication.paragraph+'段',sourceUrl:indication.url,kind:'CLASSIC_QUOTE',label:'主治原文'};
  else if (row?.indications) result.indications = {text:row.indications,sourceTitle:evidence.source.title,locator:row.chapterTitle+' · '+row.heading,sourceUrl:evidence.source.sourceUrl,kind:'CLASSIC_QUOTE',label:'主治原文'};
  const pairings = study.filter(record => record.kind === 'CLASSIC_PAIRING_QUOTE');
  if (pairings.length) result.combinations = {text:pairings.map(record => record.text).filter((text,index,all)=>all.indexOf(text)===index).slice(0,3).join('\n'),sourceTitle:pairings[0].source?.title||'针灸大成',locator:[...new Set(pairings.map(record=>record.chapterTitle||'配穴篇'))].join('、'),kind:'CLASSIC_QUOTE',label:'配穴原文'};
  if (explanations[code]) result.plainExplanation = {text:explanations[code],sourceTitle:reference?'明治国际医疗大学 MR经穴；针灸大成':'针灸大成',locator:'本应用白话学习说明，非原文',kind:'EDITORIAL_EXPLANATION',label:'白话理解'};
  // A downloaded exact section may supplement a point omitted in this edition.
  // Generic "related" matches never become main-card treatment content.
  const direct = reading?.passages.filter(entry=>isDirectAcupointPassage(point,entry))||[];
  if (!result.indications) {
    const entry = direct.find(value=>value.mappingNote?.startsWith('DIRECT_ACUPOINT_SECTION:')&&value.topic==='indication_context');
    const text = entry?.text.match(/(?:^|\n)主[^\n]+/)?.[0].trim();
    if (entry && text) result.indications={text,sourceTitle:entry.sourceInfo.title,locator:entry.chapterTitle,kind:'CLASSIC_QUOTE',label:'主治原文'};
  }
  if (row) result.aliases = row.heading.match(/[（(](.+?)[）)]/)?.[1];
  result.sourceTitles = [...new Set([result.location,result.indications,result.combinations,result.plainExplanation].filter((value):value is OverviewText=>!!value).map(value=>value.sourceTitle))];
  return result;
}
