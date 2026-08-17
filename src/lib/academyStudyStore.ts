// 学习笔记与题目收藏（P6-补03 阶段3：题库页快捷入口——我的笔记/我的收藏）
// 本机持久化（localStorage），与打卡/错题本同级的个人学习数据

export interface StudyNote {
  id: string;
  title: string;
  content: string;
  track: string;
  category: string;
  questionId?: string;
  createdAt: number;
}

export interface FavoriteQuestion {
  id: string;
  questionId: string;
  stem: string;
  track: string;
  category: string;
  answer: string;
  analysis: string;
  createdAt: number;
}

const NOTES_KEY = "yd_academy_notes";
const FAV_KEY = "yd_academy_favorites";

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, list: T[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(list.slice(-2000)));
  } catch {
    // 存储满时静默失败，不影响答题主流程
  }
}

// ---------------- 笔记 ----------------

export function listNotes(): StudyNote[] {
  return read<StudyNote>(NOTES_KEY).sort((a, b) => b.createdAt - a.createdAt);
}

export function addNote(note: Omit<StudyNote, "id" | "createdAt">): StudyNote {
  const n: StudyNote = { ...note, id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, createdAt: Date.now() };
  write(NOTES_KEY, [n, ...read<StudyNote>(NOTES_KEY)]);
  return n;
}

export function deleteNote(id: string): void {
  write(NOTES_KEY, read<StudyNote>(NOTES_KEY).filter((n) => n.id !== id));
}

// ---------------- 收藏 ----------------

export function listFavorites(): FavoriteQuestion[] {
  return read<FavoriteQuestion>(FAV_KEY).sort((a, b) => b.createdAt - a.createdAt);
}

export function isFavorited(questionId: string): boolean {
  return read<FavoriteQuestion>(FAV_KEY).some((f) => f.questionId === questionId);
}

export function toggleFavorite(q: Omit<FavoriteQuestion, "id" | "createdAt">): boolean {
  const list = read<FavoriteQuestion>(FAV_KEY);
  const existed = list.some((f) => f.questionId === q.questionId);
  if (existed) {
    write(FAV_KEY, list.filter((f) => f.questionId !== q.questionId));
    return false;
  }
  const fav: FavoriteQuestion = { ...q, id: `f_${Date.now()}`, createdAt: Date.now() };
  write(FAV_KEY, [fav, ...list]);
  return true;
}

export function removeFavorite(questionId: string): void {
  write(FAV_KEY, read<FavoriteQuestion>(FAV_KEY).filter((f) => f.questionId !== questionId));
}
