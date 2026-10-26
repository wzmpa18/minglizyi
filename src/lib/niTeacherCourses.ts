'use client';

import catalogueData from '@/data/niTeacherCourseCatalogue.json';
import baselineRelease from '@/data/niTeacherCourseRelease.json';
import { readOfflineFile, writeOfflineFile } from './durableOfflineStore';
import { loadJsonPack } from './offlinePackClient';

export interface NiCourseSummary {
  id: string; title: string; author: string;
  group: '人纪课程' | '研习记录' | '补充研习';
  description: string; chapterCount: number; characters: number;
  sourceFilename: string; sourceSha256: string; version: string;
  contentSha256: string; recordSha256: string;
  distribution: 'LOCAL_IMPORT_ONLY' | 'OWNER_CONFIRMED_EVIDENCE_PENDING';
  available?: boolean;
}
export interface NiCourseChapter { id: string; title: string; content: string; lineStart: number; lineEnd: number; sha256: string; }
export interface NiCourse {
  schema: 'yandao.ni-course.v1'; version: string; id: string; title: string; author: string;
  group: NiCourseSummary['group']; description: string;
  source: { filename: string; sha256: string; kind: 'LECTURE_TRANSCRIPT' | 'COMMUNITY_COURSE_NOTES' | 'STUDY_REFERENCE'; licenseNote: string; qualityNote: string; };
  chapters: NiCourseChapter[]; contentSha256: string; persisted?: boolean;
}
export interface NiCourseCollection { schema: 'yandao.ni-course-collection.v1'; version: string; catalogue: NiCourseSummary[]; courses: NiCourse[]; }
type Directory = { schema: 'yandao.ni-course-catalogue.v1'; version: string; entries: NiCourseSummary[] };
type Head = { version: string; catalogueSha256: string; collectionSha256: string };
export const NI_COURSE_IMPORT_MAX_BYTES = 20 * 1024 * 1024;
const bundledCatalogue = catalogueData as NiCourseSummary[];
const hex = /^[a-f0-9]{64}$/;
const versionPattern = /^(?:0|[1-9]\d{0,5})\.(?:0|[1-9]\d{0,5})\.(?:0|[1-9]\d{0,5})$/;
const groups = ['人纪课程', '研习记录', '补充研习'];
const safeText = (value: unknown, max: number): value is string => typeof value === 'string' && value.length > 0 && value.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
const digest = async (text: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))).map(n => n.toString(16).padStart(2, '0')).join('');
const bodyKey = (row: NiCourseSummary) => 'ni-course-' + row.id + '-' + row.recordSha256;
const readyKey = (row: NiCourseSummary) => 'ni-course-ready-' + row.id + '-' + row.recordSha256;
const directoryKey = (head: Head) => 'ni-course-catalogue-' + head.version + '-' + head.catalogueSha256;
function compareVersions(a: string, b: string) { const left = a.split('.').map(Number), right = b.split('.').map(Number); for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] - right[i]; return 0; }
function validSummary(row: NiCourseSummary) {
  return !!row && /^[a-z0-9][a-z0-9-]{1,80}$/.test(row.id) && safeText(row.title, 200) && safeText(row.author, 300) && groups.includes(row.group) && safeText(row.description, 2000) &&
    Number.isInteger(row.chapterCount) && row.chapterCount > 0 && row.chapterCount <= 1000 && Number.isInteger(row.characters) && row.characters > 0 && row.characters <= 2000000 &&
    safeText(row.sourceFilename, 300) && hex.test(row.sourceSha256 || '') && versionPattern.test(row.version || '') && hex.test(row.contentSha256 || '') && hex.test(row.recordSha256 || '') &&
    ['LOCAL_IMPORT_ONLY', 'OWNER_CONFIRMED_EVIDENCE_PENDING'].includes(row.distribution);
}
function validRows(rows: NiCourseSummary[]) { return Array.isArray(rows) && rows.length > 0 && rows.length <= 50 && rows.every(validSummary) && new Set(rows.map(row => row.id)).size === rows.length; }
function record(course: NiCourse) { return { schema: course.schema, version: course.version, id: course.id, title: course.title, author: course.author, group: course.group, description: course.description, source: course.source, chapters: course.chapters, contentSha256: course.contentSha256 }; }

async function activeDirectory() {
  const head = await readOfflineFile<Head>('ni-course-collection-head').catch(() => null);
  if (head && versionPattern.test(head.version || '') && hex.test(head.catalogueSha256 || '') && hex.test(head.collectionSha256 || '') && compareVersions(head.version, baselineRelease.version) >= 0) {
    const directory = await readOfflineFile<Directory>(directoryKey(head)).catch(() => null);
    if (directory?.schema === 'yandao.ni-course-catalogue.v1' && directory.version === head.version && validRows(directory.entries) && await digest(JSON.stringify(directory)) === head.catalogueSha256)
      return { head, entries: directory.entries, valid: true };
  }
  return { head: { version: baselineRelease.version, collectionSha256: baselineRelease.collectionSha256, catalogueSha256: '' }, entries: bundledCatalogue, valid: !head };
}

async function validateCourseAgainst(raw: unknown, expected: NiCourseSummary): Promise<NiCourse> {
  if (!raw || typeof raw !== 'object') throw Error('课程文件内容不完整');
  const course = raw as NiCourse;
  if (course.id !== expected.id || course.schema !== 'yandao.ni-course.v1' || course.version !== expected.version || course.title !== expected.title || course.author !== expected.author || course.group !== expected.group ||
    course.description !== expected.description || course.contentSha256 !== expected.contentSha256 || !course.source || course.source.filename !== expected.sourceFilename || course.source.sha256 !== expected.sourceSha256 ||
    !['LECTURE_TRANSCRIPT', 'COMMUNITY_COURSE_NOTES', 'STUDY_REFERENCE'].includes(course.source.kind) || !safeText(course.source.licenseNote, 2000) || !safeText(course.source.qualityNote, 2000) ||
    !Array.isArray(course.chapters) || course.chapters.length !== expected.chapterCount)
    throw Error('课程版本或出处与目录不符，请选择对应的课程文件');
  const ids = new Set<string>(); let characters = 0;
  for (const chapter of course.chapters) {
    if (!chapter || !/^[a-z0-9-]{1,120}$/.test(chapter.id) || !chapter.id.startsWith(course.id + '-') || ids.has(chapter.id) || !safeText(chapter.title, 200) || !safeText(chapter.content, 100000) || !hex.test(chapter.sha256 || '') ||
      !Number.isInteger(chapter.lineStart) || chapter.lineStart < 1 || !Number.isInteger(chapter.lineEnd) || chapter.lineEnd < chapter.lineStart)
      throw Error('课程章节结构不完整，原有课程保留');
    if (await digest(chapter.content) !== chapter.sha256) throw Error('课程正文校验未通过，原有课程保留');
    characters += chapter.content.length; ids.add(chapter.id);
  }
  if (characters !== expected.characters || characters > 2000000 || await digest(JSON.stringify(course.chapters)) !== course.contentSha256 || await digest(JSON.stringify(record(course))) !== expected.recordSha256)
    throw Error('课程完整性校验未通过，原有课程保留');
  return course;
}

/** Manual imports must match a trusted edition and cannot change the catalogue. */
export async function validateNiCourse(raw: unknown): Promise<NiCourse> {
  const expected = (await activeDirectory()).entries.find(row => row.id === (raw as NiCourse)?.id);
  if (!expected) throw Error('课程不在当前目录中');
  return validateCourseAgainst(raw, expected);
}
export async function listNiCourses(): Promise<NiCourseSummary[]> {
  await ensureInstalledCollection();
  return Promise.all((await activeDirectory()).entries.map(async row => {
    const saved = await readOfflineFile<{ recordSha256: string }>(readyKey(row)).catch(() => null);
    return { ...row, available: saved?.recordSha256 === row.recordSha256 };
  }));
}
async function saveValidatedCourse(course: NiCourse, expected: NiCourseSummary) {
  await writeOfflineFile(bodyKey(expected), record(course));
  await validateCourseAgainst(await readOfflineFile(bodyKey(expected)), expected);
  const ready = { recordSha256: expected.recordSha256 };
  await writeOfflineFile(readyKey(expected), ready);
  if (JSON.stringify(await readOfflineFile(readyKey(expected))) !== JSON.stringify(ready)) throw Error('课程目录保存尚未完成，请重新准备');
}
export async function loadNiCourse(id: string): Promise<NiCourse | null> {
  await ensureInstalledCollection();
  const expected = (await activeDirectory()).entries.find(row => row.id === id);
  if (!expected) return null;
  const body = await readOfflineFile<unknown>(bodyKey(expected)).catch(() => null);
  if (body) { try { return { ...await validateCourseAgainst(body, expected), persisted: true }; } catch { return null; } }
  return null;
}
export async function importNiCourse(raw: unknown): Promise<NiCourse> {
  const course = await validateNiCourse(raw), expected = (await activeDirectory()).entries.find(row => row.id === course.id)!;
  await saveValidatedCourse(course, expected); window.dispatchEvent(new Event('ni-courses-ready')); return course;
}
export async function importNiCourseCollection(raw: unknown): Promise<NiCourse[]> {
  const collection = raw as NiCourseCollection;
  if (!collection || collection.schema !== 'yandao.ni-course-collection.v1' || !Array.isArray(collection.courses) || !collection.courses.length || collection.courses.length > 50) throw Error('请使用整理后的课程合集文件');
  const approved = (await activeDirectory()).entries, validated: NiCourse[] = [];
  for (const item of collection.courses) {
    const row = approved.find(row => row.id === item?.id); if (!row) throw Error('合集含目录之外的课程');
    validated.push(await validateCourseAgainst(item, row));
  }
  if (new Set(validated.map(course => course.id)).size !== validated.length) throw Error('课程合集含重复条目');
  for (const course of validated) await saveValidatedCourse(course, approved.find(row => row.id === course.id)!);
  window.dispatchEvent(new Event('ni-courses-ready')); return validated;
}

/** Call only after the authenticated offline package passed its outer SHA check. */
export async function validateApprovedNiCollection(raw: unknown): Promise<NiCourseCollection> {
  const collection = raw as NiCourseCollection;
  if (!collection || collection.schema !== 'yandao.ni-course-collection.v1' || !versionPattern.test(collection.version || '') || !validRows(collection.catalogue) || !Array.isArray(collection.courses) || collection.courses.length !== collection.catalogue.length)
    throw Error('课程资料包目录不完整');
  const ids = new Set<string>(); let characters = 0;
  for (const course of collection.courses) {
    const row = collection.catalogue.find(row => row.id === course?.id);
    if (!row || ids.has(course.id)) throw Error('课程资料包关联无效');
    await validateCourseAgainst(course, row); ids.add(course.id); characters += row.characters;
  }
  if (characters > 12000000) throw Error('课程资料包超出范围');
  return collection;
}

/** Preserve old bodies until every new body and directory has read back. */
export async function installApprovedNiCollection(raw: unknown): Promise<{ version: string; courses: number }> {
  const collection = await validateApprovedNiCollection(raw), current = await activeDirectory();
  if (!current.valid) throw Error('已保存课程目录需要恢复；原有课程未覆盖');
  const incomingDigest = await digest(JSON.stringify(collection)), comparison = compareVersions(collection.version, current.head.version);
  if (comparison < 0) throw Error('不接受较旧课程资料，现有课程保留');
  if (comparison === 0 && incomingDigest !== current.head.collectionSha256) throw Error('同版本课程内容不一致，现有课程保留');
  for (const previous of current.entries) {
    const next = collection.catalogue.find(row => row.id === previous.id);
    if (!next || compareVersions(next.version, previous.version) < 0 || (next.version === previous.version && next.recordSha256 !== previous.recordSha256)) throw Error('资料更新不能移除或倒退已有课程');
  }
  for (const course of collection.courses) await saveValidatedCourse(course, collection.catalogue.find(row => row.id === course.id)!);
  const directory: Directory = { schema: 'yandao.ni-course-catalogue.v1', version: collection.version, entries: collection.catalogue };
  const head: Head = { version: collection.version, catalogueSha256: await digest(JSON.stringify(directory)), collectionSha256: incomingDigest };
  await writeOfflineFile(directoryKey(head), directory);
  if (await digest(JSON.stringify(await readOfflineFile(directoryKey(head)))) !== head.catalogueSha256) throw Error('新课程目录保存未完成，原目录保留');
  await writeOfflineFile('ni-course-collection-head', head);
  if (JSON.stringify(await readOfflineFile('ni-course-collection-head')) !== JSON.stringify(head)) throw Error('新课程目录启用未完成');
  window.dispatchEvent(new Event('ni-courses-ready')); return { version: collection.version, courses: collection.courses.length };
}

export async function prepareNiCourses(progress?: (done: number, total: number) => void) {
  await (await import('./completeTcmLearning')).prepareCompleteTcm();
  installedCollection = undefined;
  await ensureInstalledCollection();
  const rows = await listNiCourses(); let done = 0;
  for (const row of rows) { const course = await loadNiCourse(row.id); if (!course?.persisted) throw Error(row.title + '尚未保存完成，已保存课程保留'); progress?.(++done, rows.length); }
  window.dispatchEvent(new Event('ni-courses-ready')); return { courses: done };
}

let installedCollection: Promise<void> | undefined;
async function ensureInstalledCollection() {
  if (!installedCollection) installedCollection = (async () => {
    const raw = await loadJsonPack<unknown>('ni-teacher-courses').catch(() => null);
    if (!raw) return;
    const incoming = raw as NiCourseCollection, current = await activeDirectory();
    if (current.valid && incoming.version === current.head.version && await digest(JSON.stringify(raw)) === current.head.collectionSha256) {
      const ready = await readOfflineFile<{ recordSha256: string }>(readyKey(current.entries[0])).catch(() => null);
      if (ready?.recordSha256 === current.entries[0].recordSha256) return;
    }
    await installApprovedNiCollection(raw);
  })().catch(() => { /* A rejected update never hides retained readable editions. */ });
  return installedCollection;
}
if (typeof window !== 'undefined') window.addEventListener('offline-pack-installed', event => {
  const id = (event as CustomEvent<{ packId: string }>).detail?.packId;
  if (id === 'ni-teacher-courses' || id === 'tcm-learning-complete') installedCollection = undefined;
});
