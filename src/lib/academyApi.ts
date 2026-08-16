"use client";

// ============================================================================
// P6 言道学堂 API 客户端 - v25.0.19
// 知识工厂/题库/考试/证书/学习进度 的后端通道
// 后端：/api/academy/*（academyRoutes.js，SQLite academy.db）
// ============================================================================

import { getUserToken } from "./auth";

const API_BASE = typeof window !== "undefined" ? window.location.origin : "";

function tokenHeader(): Record<string, string> {
  const token = getUserToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// 审核工作台管理员密钥（会话级保存，不落盘）
export function setAcademyAdminKey(key: string) {
  try { sessionStorage.setItem("yandao_academy_admin_key", key); } catch {}
}
export function getAcademyAdminKey(): string {
  try { return sessionStorage.getItem("yandao_academy_admin_key") || ""; } catch { return ""; }
}
function adminHeader(): Record<string, string> {
  const key = getAcademyAdminKey();
  return key ? { "x-admin-key": key } : {};
}

async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...tokenHeader(), ...(init?.headers || {}) },
  });
  return res.json();
}

async function adminApi<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...tokenHeader(), ...adminHeader(), ...(init?.headers || {}) },
  });
  return res.json();
}

export const TRACK_LIST = [
  { key: "tcm", name: "中医" },
  { key: "bazi", name: "八字" },
  { key: "qimen", name: "奇门" },
  { key: "ziwei", name: "紫微" },
  { key: "general", name: "国学通识" },
] as const;

export const LEVEL_NAMES: Record<number, string> = { 1: "初级", 2: "中级", 3: "高级" };
export const GRADE_NAMES: Record<string, string> = { S: "S·官方精选", A: "A·专家贡献", B: "B·社区优质", C: "C·普通上传" };
export const TYPE_NAMES: Record<string, string> = {
  single: "单选题", multi: "多选题", judge: "判断题", fill: "填空题", qa: "问答题", case: "案例分析题",
};

// ==================== 赛道概览 ====================

export interface TrackOverview {
  key: string; name: string; code: string;
  knowledgeCount: number; questionCount: number;
  myLevel: number; myTitle: string;
  myCertificates: Array<{ level: number; title: string; cert_no: string; status: string; issued_at: string; expire_at: string }>;
}

export async function fetchTracks() {
  return api<{ success: boolean; tracks?: TrackOverview[] }>(`/api/academy/tracks`);
}

// ==================== P6-A 知识工厂 ====================

export interface MaterialVo {
  id: string; title: string; track: string; trackName: string; format: string;
  grade: string; status: string; parseNote: string; uploaderId: string; uploaderName: string;
  textPreview: string; createdAt: string; updatedAt: string;
}

export async function uploadMaterial(data: {
  title: string; track: string; format?: string; textContent?: string;
  fileBase64?: string; fileName?: string; grade?: string;
}) {
  return api<{ success: boolean; materialId?: string; message?: string; error?: string }>(`/api/academy/materials`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchMaterials(opts?: { track?: string; status?: string; mine?: boolean }) {
  const q = new URLSearchParams();
  if (opts?.track) q.set("track", opts.track);
  if (opts?.status) q.set("status", opts.status);
  if (opts?.mine) q.set("mine", "1");
  return api<{ success: boolean; materials?: MaterialVo[] }>(`/api/academy/materials?${q.toString()}`);
}

export async function parseMaterial(materialId: string) {
  return adminApi<{ success: boolean; message?: string; error?: string }>(`/api/academy/materials/${materialId}/parse`, { method: "POST" });
}

export async function reviewMaterial(materialId: string, action: "approve" | "reject", grade?: string) {
  return adminApi<{ success: boolean }>(`/api/academy/materials/${materialId}/review`, {
    method: "POST",
    body: JSON.stringify({ action, grade }),
  });
}

// ==================== 知识点 ====================

export interface KnowledgeVo {
  id: string; materialId: string; chapter: string; title: string; content: string;
  tags: string[]; difficulty: string; status: string; sourceText: string; createdAt: string;
}

export async function fetchKnowledge(opts?: { track?: string; status?: string; materialId?: string }) {
  const q = new URLSearchParams();
  if (opts?.track) q.set("track", opts.track);
  if (opts?.status) q.set("status", opts.status);
  if (opts?.materialId) q.set("materialId", opts.materialId);
  return api<{ success: boolean; points?: KnowledgeVo[] }>(`/api/academy/knowledge?${q.toString()}`);
}

export async function reviewKnowledge(id: string, action: "approve" | "reject", patch?: { title?: string; content?: string }) {
  return adminApi<{ success: boolean }>(`/api/academy/knowledge/${id}/review`, {
    method: "POST",
    body: JSON.stringify({ action, ...patch }),
  });
}

// ==================== P6-B 题库 ====================

export interface QuestionVo {
  id: string; knowledgeId: string; track: string; type: string; stem: string;
  options: string[]; difficulty: string; status: string;
  analysis: string; answer?: string; keywords?: string[]; createdAt: string;
}

export async function generateQuestions(data: { track: string; level: number; count?: number }) {
  return adminApi<{ success: boolean; created?: number; message?: string; error?: string }>(`/api/academy/questions/generate`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchQuestions(opts?: { track?: string; status?: string; type?: string }) {
  const q = new URLSearchParams();
  if (opts?.track) q.set("track", opts.track);
  if (opts?.status) q.set("status", opts.status);
  if (opts?.type) q.set("type", opts.type);
  return api<{ success: boolean; questions?: QuestionVo[] }>(`/api/academy/questions?${q.toString()}`);
}

export async function reviewQuestion(id: string, action: "approve" | "reject", patch?: { stem?: string; answer?: string; analysis?: string }) {
  return adminApi<{ success: boolean }>(`/api/academy/questions/${id}/review`, {
    method: "POST",
    body: JSON.stringify({ action, ...patch }),
  });
}

// ==================== P6-C 考试 ====================

export interface ExamQuestion extends QuestionVo {
  score: number;
}

export interface ExamPaper {
  success: boolean; empty?: boolean; error?: string;
  examId: string; track: string; trackName: string; level: number; levelTitle: string;
  minutes: number; passScore: number; questions: ExamQuestion[]; startedAt: string;
}

export async function startExam(track: string, level: number) {
  return api<ExamPaper>(`/api/academy/exams/start`, {
    method: "POST",
    body: JSON.stringify({ track, level }),
  });
}

export interface ExamDetailItem {
  questionId: string; type: string; stem: string; options: string[];
  myAnswer: string; correctAnswer: string; analysis: string;
  score: number; full: boolean; ratio: number;
}

export interface ExamResult {
  success: boolean; passed: boolean; score: number; totalScore: number; passScore: number;
  detail: ExamDetailItem[];
  certificate?: CertificateVo | null;
  error?: string;
}

export async function submitExam(examId: string, answers: Record<string, string>) {
  return api<ExamResult>(`/api/academy/exams/${examId}/submit`, {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
}

export async function fetchMyExams() {
  return api<{ success: boolean; exams?: Array<{ id: string; track: string; trackName: string; level: number; score: number; passed: boolean; startedAt: string; submittedAt: string }> }>(`/api/academy/exams/mine`);
}

// ==================== P6-F 证书 ====================

export interface CertificateVo {
  id: string; certNo: string; userId: string; userName: string;
  track: string; trackName: string; level: number; title: string;
  examId: string; issuedAt: string; expireAt: string | null; status: string;
}

export async function fetchMyCertificates() {
  return api<{ success: boolean; certificates?: CertificateVo[] }>(`/api/academy/certificates/mine`);
}

export async function verifyCertificate(certNo: string) {
  return api<{ success: boolean; valid?: boolean; certificate?: CertificateVo; message?: string; error?: string }>(`/api/academy/certificates/verify/${encodeURIComponent(certNo)}`);
}

// ==================== 学习进度 / 错题本 ====================

export async function checkinProgress(track: string, chapter: string) {
  return api<{ success: boolean }>(`/api/academy/progress/checkin`, {
    method: "POST",
    body: JSON.stringify({ track, chapter }),
  });
}

export async function fetchProgress(track?: string) {
  const q = track ? `?track=${track}` : "";
  return api<{ success: boolean; progress?: Array<{ track: string; chapter: string; completedAt: string }> }>(`/api/academy/progress${q}`);
}

export async function fetchWrongAnswers() {
  return api<{ success: boolean; wrongs?: Array<{ id: string; questionId: string; myAnswer: string; type: string; track: string; stem: string; options: string[]; answer: string; analysis: string; createdAt: string }> }>(`/api/academy/wrong-answers`);
}
