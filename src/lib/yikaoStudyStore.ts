"use client";

// ============================================================================
// 医考题库专区学习进度 Store - P6-补04
// 仅记录用户练习进度（掌握度进度条数据源），题目/判分/错题全部走唯一题库引擎后端。
// 掌握度口径：已答对题数 / 已答题数 的正确率，未答题显示 0；禁止展示具体题量。
// ============================================================================

export interface YikaoSubjectProgress {
  answered: number; // 已作答题数（内部计数，不对外展示）
  correct: number; // 答对题数
  lastAt: string; // 最近练习时间
}

const KEY = "yandao_yikao_progress";
const MAX_AGE_DAYS = 365;

function safeGet(): Record<string, YikaoSubjectProgress> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw) as Record<string, YikaoSubjectProgress>;
    const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    for (const k of Object.keys(obj)) {
      if (!obj[k] || !obj[k].lastAt || new Date(obj[k].lastAt).getTime() < cutoff) delete obj[k];
    }
    return obj;
  } catch {
    return {};
  }
}

function safeSet(data: Record<string, YikaoSubjectProgress>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
}

/** key 形如 `zyzy:针灸学`（考试类别前缀 + 科目名） */
export function recordAnswer(categoryKey: string, isCorrect: boolean): void {
  if (!categoryKey) return;
  const data = safeGet();
  const cur = data[categoryKey] || { answered: 0, correct: 0, lastAt: "" };
  cur.answered += 1;
  if (isCorrect) cur.correct += 1;
  cur.lastAt = new Date().toISOString();
  data[categoryKey] = cur;
  safeSet(data);
}

/** 掌握度百分比（0-100，内部用正确率折算，未答题=0） */
export function getMastery(categoryKey: string): number {
  const p = safeGet()[categoryKey];
  if (!p || p.answered === 0) return 0;
  return Math.round((p.correct / p.answered) * 100);
}

export function getProgress(categoryKey: string): YikaoSubjectProgress | null {
  return safeGet()[categoryKey] || null;
}

export function getAllProgress(): Record<string, YikaoSubjectProgress> {
  return safeGet();
}

/** 历史数字索引答案（0 基）兼容归一为字母；字母/文本原样返回（P7-TCM-EXAM-01 3.3 双端兼容） */
function normalizeChoiceAnswer(s: string): string {
  const t = s.trim();
  if (/^\d+(,\d+)*$/.test(t)) {
    return t.split(",").map((x) => String.fromCharCode(65 + parseInt(x, 10))).join(",");
  }
  return t;
}

/** 判分（与唯一题库引擎口径一致：客观题精确匹配；multi 逗号排序拼接比较；兼容历史数字索引答案） */
export function isAnswerCorrect(qType: string, myAnswer: string, refAnswer: string): boolean {
  if (!myAnswer || !refAnswer) return false;
  const norm = (s: string) => normalizeChoiceAnswer(s).split(",").filter(Boolean).sort().join(",");
  if (qType === "multi") return norm(myAnswer) === norm(refAnswer);
  if (qType === "judge" || qType === "single") return normalizeChoiceAnswer(myAnswer) === normalizeChoiceAnswer(refAnswer);
  // 主观题（fill/qa/case）不自动判分，不计入掌握度
  return false;
}
