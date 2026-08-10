/**
 * 中医执业医师考试题库 - 完整数据模块
 * 数据来源：exam_questions.json（1447题，5个科目）
 */

import examQuestionsData from "./data/exam_questions.json";

// ============================================================================
// 类型定义
// ============================================================================

export interface ExamQuestion {
  id: string;
  subjectId: string;
  chapterId: string;
  subject: string;
  chapter: string;
  topic: string;
  difficulty: 1 | 2 | 3;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  source: string;
}

export interface ExamChapter {
  id: string;
  name: string;
  subjectId: string;
  questionCount: number;
}

export interface ExamSubject {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  chapters: ExamChapter[];
  questionCount: number;
}

export interface UserAnswer {
  questionId: string;
  selectedOption: number;
  isCorrect: boolean;
  timestamp: number;
}

export interface WrongAnswerRecord {
  questionId: string;
  wrongCount: number;
  lastWrongAt: number;
  subjectId: string;
  chapterId: string;
}

export interface FavoriteItem {
  questionId: string;
  addedAt: number;
}

export interface ExamRecord {
  id: string;
  startTime: number;
  endTime: number;
  totalQuestions: number;
  correctCount: number;
  score: number;
  duration: number; // seconds
  questionIds: string[];
  answers: { questionId: string; selected: number; correct: boolean }[];
  subjectBreakdown: { subjectId: string; subjectName: string; total: number; correct: number }[];
}

export interface LearningStats {
  totalAnswered: number;
  totalCorrect: number;
  correctRate: number;
  studyDays: number;
  streakDays: number;
  totalStudyTime: number; // minutes
  subjectStats: { subjectId: string; subjectName: string; answered: number; correct: number; rate: number }[];
  dailyActivity: { date: string; count: number }[];
}

export interface PracticeProgress {
  [key: string]: {
    // key: `${subjectId}_${chapterId}` or "daily_${date}" or "wrong" or "favorites"
    answers: UserAnswer[];
    currentIndex: number;
    updatedAt: number;
  };
}

export interface DailyCheckin {
  date: string; // YYYY-MM-DD
  completed: boolean;
  score: number;
  total: number;
}

// ============================================================================
// 常量
// ============================================================================

const STORAGE_KEYS = {
  PROGRESS: "tcm_exam_progress",
  WRONG: "tcm_exam_wrong",
  FAVORITES: "tcm_exam_favorites",
  RECORDS: "tcm_exam_records",
  CHECKIN: "tcm_exam_checkin",
  MOCK_STATE: "tcm_exam_mock_state",
  STATS: "tcm_exam_stats",
};

const SUBJECT_META: Omit<ExamSubject, "chapters" | "questionCount">[] = [
  { id: "jichu", name: "中医基础理论", icon: "☯", color: "#1565C0", bgColor: "#E3F2FD" },
  { id: "zhenduan", name: "中医诊断学", icon: "🔍", color: "#7B1FA2", bgColor: "#F3E5F5" },
  { id: "zhongyao", name: "中药学", icon: "🌿", color: "#2E7D32", bgColor: "#E8F5E9" },
  { id: "fangji", name: "方剂学", icon: "📜", color: "#C62828", bgColor: "#FFEBEE" },
  { id: "zhenjiu", name: "针灸学", icon: "📍", color: "#E65100", bgColor: "#FFF3E0" },
];

// ============================================================================
// 数据加载与派生
// ============================================================================

const ALL_QUESTIONS: ExamQuestion[] = examQuestionsData as ExamQuestion[];

/**
 * 从题目数据中派生章节列表
 */
function deriveChapters(subjectId: string): ExamChapter[] {
  const chapterMap = new Map<string, { name: string; count: number }>();
  for (const q of ALL_QUESTIONS) {
    if (q.subjectId === subjectId) {
      const existing = chapterMap.get(q.chapterId);
      if (existing) {
        existing.count++;
      } else {
        chapterMap.set(q.chapterId, { name: q.chapter, count: 1 });
      }
    }
  }
  const chapters: ExamChapter[] = [];
  for (const [id, data] of chapterMap) {
    chapters.push({ id, name: data.name, subjectId, questionCount: data.count });
  }
  // Sort by chapter id for consistent ordering
  chapters.sort((a, b) => a.id.localeCompare(b.id));
  return chapters;
}

const SUBJECTS: ExamSubject[] = SUBJECT_META.map((meta) => {
  const chapters = deriveChapters(meta.id);
  const questionCount = chapters.reduce((sum, ch) => sum + ch.questionCount, 0);
  return { ...meta, chapters, questionCount };
});

// ============================================================================
// 种子随机数（mulberry32）
// ============================================================================

export function createSeededRandom(seed: number) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStringToSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ============================================================================
// 查询函数
// ============================================================================

export function getAllQuestions(): ExamQuestion[] {
  return ALL_QUESTIONS;
}

export function getSubjects(): ExamSubject[] {
  return SUBJECTS;
}

export function getSubjectById(subjectId: string): ExamSubject | undefined {
  return SUBJECTS.find((s) => s.id === subjectId);
}

export function getChapterById(subjectId: string, chapterId: string): ExamChapter | undefined {
  const subject = getSubjectById(subjectId);
  return subject?.chapters.find((c) => c.id === chapterId);
}

export function getQuestionsBySubject(subjectId: string): ExamQuestion[] {
  return ALL_QUESTIONS.filter((q) => q.subjectId === subjectId);
}

export function getQuestionsByChapter(subjectId: string, chapterId: string): ExamQuestion[] {
  return ALL_QUESTIONS.filter((q) => q.subjectId === subjectId && q.chapterId === chapterId);
}

export function getQuestionsByIds(ids: string[]): ExamQuestion[] {
  const idSet = new Set(ids);
  return ALL_QUESTIONS.filter((q) => idSet.has(q.id));
}

export function getQuestionById(id: string): ExamQuestion | undefined {
  return ALL_QUESTIONS.find((q) => q.id === id);
}

export function searchQuestions(keyword: string): ExamQuestion[] {
  if (!keyword.trim()) return [];
  const kw = keyword.toLowerCase();
  return ALL_QUESTIONS.filter(
    (q) =>
      q.question.toLowerCase().includes(kw) ||
      q.topic.toLowerCase().includes(kw) ||
      q.explanation.toLowerCase().includes(kw) ||
      q.options.some((o) => o.toLowerCase().includes(kw))
  );
}

// ============================================================================
// localStorage 工具函数
// ============================================================================

function safeGet<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

function safeSet(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

function safeRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

// --- 练习进度 ---
export function getProgress(): PracticeProgress {
  return safeGet<PracticeProgress>(STORAGE_KEYS.PROGRESS, {});
}

export function saveProgress(progress: PracticeProgress): void {
  safeSet(STORAGE_KEYS.PROGRESS, progress);
}

export function savePracticeSession(
  key: string,
  answers: UserAnswer[],
  currentIndex: number
): void {
  const progress = getProgress();
  progress[key] = { answers, currentIndex, updatedAt: Date.now() };
  saveProgress(progress);
}

export function getPracticeSession(key: string): PracticeProgress[string] | null {
  const progress = getProgress();
  return progress[key] || null;
}

export function clearPracticeSession(key: string): void {
  const progress = getProgress();
  delete progress[key];
  saveProgress(progress);
}

// --- 错题本 ---
export function getWrongAnswers(): WrongAnswerRecord[] {
  return safeGet<WrongAnswerRecord[]>(STORAGE_KEYS.WRONG, []);
}

export function addWrongAnswer(question: ExamQuestion): void {
  const wrongs = getWrongAnswers();
  const existing = wrongs.find((w) => w.questionId === question.id);
  if (existing) {
    existing.wrongCount++;
    existing.lastWrongAt = Date.now();
  } else {
    wrongs.push({
      questionId: question.id,
      wrongCount: 1,
      lastWrongAt: Date.now(),
      subjectId: question.subjectId,
      chapterId: question.chapterId,
    });
  }
  safeSet(STORAGE_KEYS.WRONG, wrongs);
}

export function removeWrongAnswer(questionId: string): void {
  const wrongs = getWrongAnswers().filter((w) => w.questionId !== questionId);
  safeSet(STORAGE_KEYS.WRONG, wrongs);
}

export function clearWrongAnswers(): void {
  safeRemove(STORAGE_KEYS.WRONG);
}

// --- 收藏 ---
export function getFavorites(): FavoriteItem[] {
  return safeGet<FavoriteItem[]>(STORAGE_KEYS.FAVORITES, []);
}

export function isFavorite(questionId: string): boolean {
  return getFavorites().some((f) => f.questionId === questionId);
}

export function toggleFavorite(questionId: string): boolean {
  const favs = getFavorites();
  const idx = favs.findIndex((f) => f.questionId === questionId);
  if (idx >= 0) {
    favs.splice(idx, 1);
    safeSet(STORAGE_KEYS.FAVORITES, favs);
    return false;
  } else {
    favs.push({ questionId, addedAt: Date.now() });
    safeSet(STORAGE_KEYS.FAVORITES, favs);
    return true;
  }
}

export function removeFavorites(questionIds: string[]): void {
  const idSet = new Set(questionIds);
  const favs = getFavorites().filter((f) => !idSet.has(f.questionId));
  safeSet(STORAGE_KEYS.FAVORITES, favs);
}

// --- 考试记录 ---
export function getExamRecords(): ExamRecord[] {
  return safeGet<ExamRecord[]>(STORAGE_KEYS.RECORDS, []);
}

export function saveExamRecord(record: ExamRecord): void {
  const records = getExamRecords();
  records.unshift(record);
  // Keep last 50 records
  safeSet(STORAGE_KEYS.RECORDS, records.slice(0, 50));
}

// --- 每日签到 ---
export function getCheckins(): DailyCheckin[] {
  return safeGet<DailyCheckin[]>(STORAGE_KEYS.CHECKIN, []);
}

export function saveCheckin(date: string, score: number, total: number): void {
  const checkins = getCheckins();
  const existing = checkins.find((c) => c.date === date);
  if (existing) {
    existing.completed = true;
    existing.score = Math.max(existing.score, score);
    existing.total = total;
  } else {
    checkins.push({ date, completed: true, score, total });
  }
  safeSet(STORAGE_KEYS.CHECKIN, checkins);
}

export function isTodayCheckedIn(): boolean {
  const today = getDateString();
  return getCheckins().some((c) => c.date === today && c.completed);
}

// --- 学习统计 ---
export function getLearningStats(): LearningStats {
  const progress = getProgress();
  const checkins = getCheckins();
  const wrongs = getWrongAnswers();

  const allAnswers: UserAnswer[] = [];
  const subjectAnswered = new Map<string, { answered: number; correct: number; name: string }>();

  for (const key of Object.keys(progress)) {
    const session = progress[key];
    if (session && session.answers) {
      for (const ans of session.answers) {
        allAnswers.push(ans);
        const q = getQuestionById(ans.questionId);
        if (q) {
          const sid = q.subjectId;
          const s = getSubjectById(sid);
          const existing = subjectAnswered.get(sid);
          if (existing) {
            existing.answered++;
            if (ans.isCorrect) existing.correct++;
          } else {
            subjectAnswered.set(sid, {
              answered: 1,
              correct: ans.isCorrect ? 1 : 0,
              name: s?.name || sid,
            });
          }
        }
      }
    }
  }

  const totalAnswered = allAnswers.length;
  const totalCorrect = allAnswers.filter((a) => a.isCorrect).length;

  // Daily activity from checkins
  const dailyActivity: { date: string; count: number }[] = [];
  const dateCountMap = new Map<string, number>();
  for (const c of checkins) {
    if (c.completed) {
      dateCountMap.set(c.date, c.total);
    }
  }
  // Also count from progress answers by date
  for (const ans of allAnswers) {
    const d = new Date(ans.timestamp);
    const ds = formatDate(d);
    dateCountMap.set(ds, (dateCountMap.get(ds) || 0) + 1);
  }
  for (const [date, count] of dateCountMap) {
    dailyActivity.push({ date, count });
  }
  dailyActivity.sort((a, b) => a.date.localeCompare(b.date));

  // Streak calculation
  const streakDays = calculateStreak(checkins);

  const subjectStats = Array.from(subjectAnswered.entries()).map(([subjectId, data]) => ({
    subjectId,
    subjectName: data.name,
    answered: data.answered,
    correct: data.correct,
    rate: data.answered > 0 ? Math.round((data.correct / data.answered) * 100) : 0,
  }));

  return {
    totalAnswered,
    totalCorrect,
    correctRate: totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
    studyDays: checkins.filter((c) => c.completed).length,
    streakDays,
    totalStudyTime: Math.round(totalAnswered * 0.75), // rough estimate: ~45 sec per question
    subjectStats,
    dailyActivity,
  };
}

function calculateStreak(checkins: DailyCheckin[]): number {
  const completedDates = new Set(checkins.filter((c) => c.completed).map((c) => c.date));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = formatDate(d);
    if (completedDates.has(ds)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

// ============================================================================
// 每日一练
// ============================================================================

function getDateString(d?: Date): string {
  const date = d || new Date();
  return formatDate(date);
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const DAILY_QUESTION_COUNT = 5;

export function getDailyQuestions(dateStr?: string): ExamQuestion[] {
  const date = dateStr || getDateString();
  const seed = hashStringToSeed("daily_" + date);
  const rng = createSeededRandom(seed);

  // Pick questions distributed across subjects
  const result: ExamQuestion[] = [];
  const used = new Set<string>();
  const subjects = getSubjects();

  // Try to pick one from each subject first, then fill remaining
  const picksPerSubject = Math.ceil(DAILY_QUESTION_COUNT / subjects.length);

  for (const subject of subjects) {
    const subjQuestions = getQuestionsBySubject(subject.id);
    // Deterministic shuffle
    const shuffled = deterministicShuffle(subjQuestions, rng);
    let added = 0;
    for (const q of shuffled) {
      if (result.length >= DAILY_QUESTION_COUNT) break;
      if (!used.has(q.id)) {
        result.push(q);
        used.add(q.id);
        added++;
        if (added >= picksPerSubject) break;
      }
    }
    if (result.length >= DAILY_QUESTION_COUNT) break;
  }

  // Fill remaining if needed
  if (result.length < DAILY_QUESTION_COUNT) {
    const allShuffled = deterministicShuffle(ALL_QUESTIONS, createSeededRandom(seed + 1));
    for (const q of allShuffled) {
      if (result.length >= DAILY_QUESTION_COUNT) break;
      if (!used.has(q.id)) {
        result.push(q);
        used.add(q.id);
      }
    }
  }

  return result.slice(0, DAILY_QUESTION_COUNT);
}

export function deterministicShuffle<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ============================================================================
// 模拟考试
// ============================================================================

export interface MockExamState {
  examId: string;
  startTime: number;
  duration: number; // minutes
  questionIds: string[];
  answers: { [questionId: string]: number };
  flagged: string[];
  subjectIds: string[];
}

export function generateMockExam(
  questionCount: number,
  subjectIds: string[],
  seed?: number
): { questionIds: string[]; examId: string } {
  const examSeed = seed ?? Date.now();
  const examId = `mock_${examSeed}`;
  const rng = createSeededRandom(examSeed);

  let pool: ExamQuestion[];
  if (subjectIds.length === 0 || subjectIds.length === SUBJECTS.length) {
    pool = ALL_QUESTIONS;
  } else {
    pool = ALL_QUESTIONS.filter((q) => subjectIds.includes(q.subjectId));
  }

  const shuffled = deterministicShuffle(pool, rng);
  const count = Math.min(questionCount, shuffled.length);
  const selected = shuffled.slice(0, count);

  return { questionIds: selected.map((q) => q.id), examId };
}

export function saveMockExamState(state: MockExamState): void {
  safeSet(STORAGE_KEYS.MOCK_STATE, state);
}

export function getMockExamState(): MockExamState | null {
  return safeGet<MockExamState | null>(STORAGE_KEYS.MOCK_STATE, null);
}

export function clearMockExamState(): void {
  safeRemove(STORAGE_KEYS.MOCK_STATE);
}

// ============================================================================
// 薄弱知识点分析
// ============================================================================

export interface WeakTopic {
  topic: string;
  subjectId: string;
  subjectName: string;
  wrongCount: number;
}

export function getWeakTopics(limit: number = 5): WeakTopic[] {
  const wrongs = getWrongAnswers();
  const topicMap = new Map<string, WeakTopic>();

  for (const w of wrongs) {
    const q = getQuestionById(w.questionId);
    if (!q) continue;
    const key = `${q.subjectId}_${q.topic}`;
    const existing = topicMap.get(key);
    if (existing) {
      existing.wrongCount += w.wrongCount;
    } else {
      const s = getSubjectById(q.subjectId);
      topicMap.set(key, {
        topic: q.topic,
        subjectId: q.subjectId,
        subjectName: s?.name || q.subject,
        wrongCount: w.wrongCount,
      });
    }
  }

  const topics = Array.from(topicMap.values());
  topics.sort((a, b) => b.wrongCount - a.wrongCount);
  return topics.slice(0, limit);
}

// ============================================================================
// 清除所有数据
// ============================================================================

export function clearAllExamData(): void {
  safeRemove(STORAGE_KEYS.PROGRESS);
  safeRemove(STORAGE_KEYS.WRONG);
  safeRemove(STORAGE_KEYS.FAVORITES);
  safeRemove(STORAGE_KEYS.RECORDS);
  safeRemove(STORAGE_KEYS.CHECKIN);
  safeRemove(STORAGE_KEYS.MOCK_STATE);
  safeRemove(STORAGE_KEYS.STATS);
}

// ============================================================================
// 选项标签
// ============================================================================

export const OPTION_LABELS = ["A", "B", "C", "D", "E"];

// ============================================================================
// 合规文本
// ============================================================================

export const COMPLIANCE_TEXT = "题目仅供学习练习参考，不构成考试通过承诺";
export const EXPLANATION_SOURCE = "来源：《中医执业医师考试大纲》统编教材";
