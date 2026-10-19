import {researchConcepts,simulateEvidenceLearning} from './researchLearning';
import {normalizeLifeText} from './lifeRecords';
export const MEDICAL_STUDY_QUESTIONS=[
 '如何阅读《黄帝内经》的篇章结构？',
 '古籍中的阴阳与五行术语怎样做文献笔记？',
 '学习中药性味归经时如何核对来源？',
 '阅读古代医案应记录哪些背景与证据？',
 '古代计量与现代药量为什么不能直接换算使用？',
 '如何区分古籍原文、现代解释与个人经历？',
] as const;
export const MEDICAL_LITERATURE_SYSTEM='你是医学文献学习助手，只讨论公开文献阅读方法、术语的历史语境、证据与来源核对。不得对本人或具体他人判断疾病、证型、体质或适用治疗，不给处方、个人药量、停换药建议、针刺或正骨操作。不冒充医师、任何医家本人或已认证临床系统。没有提供原文时不可生成看似精确的书页、引文或医家观点；未知明确说明并建议回到实际原文核查。不要把古代观点当成现代疗效证据。';
/** Only these fixed public questions can enter the general medical AI chat.
 * Free prose (including a personal history) remains an on-device search. */
export function fixedMedicalStudyRequest(input:string){return MEDICAL_STUDY_QUESTIONS.find(q=>q===input.trim())||null;}
export function localMedicalConcepts(text:string){const normalized=normalizeLifeText(text);return researchConcepts.filter(c=>[c.label,...c.aliases].some(label=>label&&normalized.includes(normalizeLifeText(label)))).map(c=>c.id);}
export async function localMedicalWorksheet(text:string,focus='zhifa'){
 const ids=localMedicalConcepts(text);
 return simulateEvidenceLearning(ids,'bagang',focus);
}
