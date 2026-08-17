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

// v25.0.20：三大板块（中医/易学/国学），板块下类目由 categories 接口管理
// v25.0.28（P6-补04）：追加医考 track（唯一题库引擎分类标签，不进 /tracks 三大板块概览）
export const TRACK_LIST = [
  { key: "zhongyi", name: "中医" },
  { key: "yixue", name: "易学" },
  { key: "guoxue", name: "国学" },
  { key: "yikao", name: "医考" },
] as const;

export const LEVEL_NAMES: Record<number, string> = { 1: "初级", 2: "中级", 3: "高级" };
export const GRADE_NAMES: Record<string, string> = { S: "S·官方精选", A: "A·专家贡献", B: "B·社区优质", C: "C·普通上传" };
export const TYPE_NAMES: Record<string, string> = {
  single: "单选题", multi: "多选题", judge: "判断题", fill: "填空题", qa: "问答题", case: "案例分析题",
};

// ==================== 赛道概览 ====================

export interface TrackOverview {
  key: string; name: string; code: string; categoryCount: number;
  knowledgeCount: number; questionCount: number;
  myLevel: number; myTitle: string;
  myCertificates: Array<{ level: number; title: string; cert_no: string; status: string; issued_at: string; expire_at: string }>;
}

export async function fetchTracks() {
  return api<{ success: boolean; tracks?: TrackOverview[] }>(`/api/academy/tracks`);
}

// ==================== 类目（板块下自定义类目） ====================

export interface CategoryVo {
  id: string; track: string; trackName: string; name: string;
  sort: number; materialCount: number;
}

export async function fetchCategories(track?: string) {
  const q = track ? `?track=${encodeURIComponent(track)}` : "";
  return api<{ success: boolean; categories?: CategoryVo[] }>(`/api/academy/categories${q}`);
}

export async function createCategory(track: string, name: string) {
  return adminApi<{ success: boolean; categoryId?: string; message?: string; error?: string }>(`/api/academy/categories`, {
    method: "POST",
    body: JSON.stringify({ track, name }),
  });
}

export async function deleteCategory(id: string) {
  return adminApi<{ success: boolean; error?: string }>(`/api/academy/categories/${id}`, { method: "DELETE" });
}

// ==================== P6-A 知识工厂 ====================

export interface MaterialVo {
  id: string; title: string; track: string; trackName: string; category: string; format: string;
  grade: string; status: string; parseNote: string; uploaderId: string; uploaderName: string;
  textPreview: string; createdAt: string; updatedAt: string;
}

export async function uploadMaterial(data: {
  title: string; track: string; category?: string; format?: string; textContent?: string;
  fileBase64?: string; fileName?: string; grade?: string;
  visibility?: "PUBLIC" | "PRIVATE" | "ORG"; orgId?: string;
}) {
  return api<{ success: boolean; materialId?: string; message?: string; error?: string }>(`/api/academy/materials`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchMaterials(opts?: { track?: string; category?: string; status?: string; mine?: boolean }) {
  const q = new URLSearchParams();
  if (opts?.track) q.set("track", opts.track);
  if (opts?.category) q.set("category", opts.category);
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
  track: string; category: string; tags: string[]; difficulty: string; status: string; sourceText: string; createdAt: string;
}

export async function fetchKnowledge(opts?: { track?: string; category?: string; status?: string; materialId?: string }) {
  const q = new URLSearchParams();
  if (opts?.track) q.set("track", opts.track);
  if (opts?.category) q.set("category", opts.category);
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
  id: string; knowledgeId: string; track: string; trackName: string; category: string; type: string; stem: string;
  options: string[]; difficulty: string; status: string;
  analysis: string; answer?: string; keywords?: string[]; createdAt: string;
}

export async function generateQuestions(data: { track: string; level: number; count?: number; category?: string }) {
  return adminApi<{ success: boolean; created?: number; message?: string; error?: string }>(`/api/academy/questions/generate`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchQuestions(opts?: { track?: string; category?: string; status?: string; type?: string }) {
  const q = new URLSearchParams();
  if (opts?.track) q.set("track", opts.track);
  if (opts?.category) q.set("category", opts.category);
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

// ==================== v25.0.22 全覆盖出题任务（P6-B 原则1/2） ====================

export interface GenTaskVo {
  id: string; track: string; category: string; level: number;
  totalGroups: number; doneGroups: number; totalKp: number; coveredKp: number;
  createdQ: number; skippedCached: number; status: string; error: string;
  createdAt: string; updatedAt: string;
}

export async function startFullGenQuestions(data: { track: string; category?: string; level?: number }) {
  return adminApi<{ success: boolean; taskId?: string; message?: string; error?: string }>(`/api/academy/questions/generate-full`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchGenTasks() {
  return adminApi<{ success: boolean; tasks?: GenTaskVo[] }>(`/api/academy/gen-tasks`);
}

// ==================== v25.0.22 P6-I 机构学习空间 SaaS ====================

export interface OrgVo {
  id: string; name: string; type: string; logo: string; intro: string; notice: string;
  ownerId: string; status: string; tier: string; memberLimit: string;
  expireAt: string; createdAt: string;
  memberCount?: number; materialCount?: number; myRole?: string;
}

export async function applyOrg(data: { name: string; type: "public" | "commercial"; intro?: string; logo?: string }) {
  return api<{ success: boolean; orgId?: string; message?: string; error?: string }>(`/api/academy/orgs/apply`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function reviewOrg(id: string, action: "approve" | "reject", tier?: string) {
  return adminApi<{ success: boolean; error?: string }>(`/api/academy/orgs/${id}/review`, {
    method: "POST",
    body: JSON.stringify({ action, tier }),
  });
}

export async function fetchOrgs(mine = false, all = false) {
  const q = mine ? "?mine=1" : all ? "?all=1" : "";
  return api<{ success: boolean; orgs?: OrgVo[] }>(`/api/academy/orgs${q}`);
}

/** LOC 运营中心：全量机构列表（含待审核，需管理员密钥） */
export async function fetchAllOrgsForAdmin() {
  return adminApi<{ success: boolean; orgs?: OrgVo[]; error?: string }>(`/api/academy/orgs?all=1`);
}

export async function fetchOrgDetail(id: string) {
  return api<{ success: boolean; org?: OrgVo; error?: string }>(`/api/academy/orgs/${id}`);
}

export async function createOrgInviteCode(orgId: string) {
  return api<{ success: boolean; code?: string; error?: string }>(`/api/academy/orgs/${orgId}/invite-code`, { method: "POST" });
}

export async function joinOrgByCode(code: string) {
  return api<{ success: boolean; message?: string; error?: string }>(`/api/academy/orgs/join`, {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function fetchOrgMembers(orgId: string) {
  return api<{ success: boolean; members?: Array<{ userId: string; role: string; joinedAt: string; checkins: number; passes: number }>; error?: string }>(`/api/academy/orgs/${orgId}/members`);
}

export async function fetchOrgRanking(orgId: string) {
  return api<{ success: boolean; ranking?: Array<{ user_id: string; checkins: number; avgScore: number; passes: number }>; error?: string }>(`/api/academy/orgs/${orgId}/ranking`);
}

export async function fetchOrgEarnings(orgId: string) {
  return api<{ success: boolean; total?: number; earnings?: Array<{ id: string; userId: string; source: string; amount: number; note: string; createdAt: string }>; error?: string }>(`/api/academy/orgs/${orgId}/earnings`);
}

// ==================== v25.0.22 P6-J 学习运营中心 LOC ====================

export interface LocDashboard {
  materials: number; knowledgePoints: number; questions: number; exams: number;
  examPasses: number; certificates: number; checkins: number;
  orgs: number; orgMembers: number;
  aiCalls: number; aiTokensIn: number; aiTokensOut: number;
  aiByScene: Array<{ scene: string; calls: number; tokens: number }>;
  aiByDay: Array<{ day: string; calls: number }>;
}

export async function fetchLocDashboard() {
  return adminApi<{ success: boolean; dashboard?: LocDashboard; error?: string }>(`/api/academy/loc/dashboard`);
}

export async function fetchLocConfig() {
  return adminApi<{ success: boolean; config?: Record<string, unknown>; editableKeys?: string[]; error?: string }>(`/api/academy/loc/config`);
}

export async function updateLocConfig(key: string, value: unknown) {
  return adminApi<{ success: boolean; message?: string; error?: string }>(`/api/academy/loc/config`, {
    method: "PUT",
    body: JSON.stringify({ key, value }),
  });
}

export async function fetchLocOpLogs() {
  return adminApi<{ success: boolean; logs?: Array<{ id: string; adminId: string; action: string; target: string; detail: string; createdAt: string }>; error?: string }>(`/api/academy/loc/op-logs`);
}

// ==================== v25.0.25 P6-TCM-02 质量治理层 ====================

/** 3.4 覆盖度引擎：真实计算动态展示（禁止写死文案） */
export interface CoverageVo {
  track: string; category: string;
  kp_total: number; kp_covered: number; kp_uncovered: number;
  coverage_rate: number; display_text: string;
  exam_points_total: number; exam_points_covered: number;
  uncovered_list: Array<{ id: number; title: string; chapter: string }>;
}

export async function fetchCoverage(track: string, category?: string) {
  const q = `?track=${encodeURIComponent(track)}${category ? `&category=${encodeURIComponent(category)}` : ""}`;
  return api<{ success: boolean; coverage?: CoverageVo; error?: string }>(`/api/academy/governance/coverage${q}`);
}

/** 7.1 题库健康度看板 */
export interface LocHealth {
  knowledge: { kp_total: number; kp_approved: number; kp_uncovered: number; kp_conflict: number; kp_no_source: number };
  question: { q_total: number; q_pending: number; q_dup: number; q_high_quality: number; q_no_score_legacy: number; q_no_kp: number };
  coverage: Array<{ category: string; kp_total: number; kp_covered: number; coverage_rate: number }>;
  cost: { ai_calls: number; tokens_in: number; tokens_out: number; gen_done: number; gen_failed: number; dedup_saved_kp: number };
}

export async function fetchLocHealth() {
  return adminApi<{ success: boolean; health?: LocHealth; error?: string }>(`/api/academy/loc/health`);
}

/** 7.2 异常报警 */
export interface AlertVo { id: string; type: string; severity: string; detail: string; status: string; createdAt: string }

export async function scanAlerts() {
  return adminApi<{ success: boolean; new_alerts?: Array<{ alert_type: string; severity: string; detail: string }>; error?: string }>(`/api/academy/loc/alerts/scan`, { method: "POST" });
}

export async function fetchAlerts() {
  return adminApi<{ success: boolean; alerts?: AlertVo[]; error?: string }>(`/api/academy/loc/alerts`);
}

export async function resolveAlert(id: string) {
  return adminApi<{ success: boolean; error?: string }>(`/api/academy/loc/alerts/${id}/resolve`, { method: "POST" });
}

/** 2.1 来源证据链反查 */
export interface KpTrace {
  knowledge: { id: number; title: string; version: number; state: string; score: number; checks: Array<{ name: string; pass: boolean; weight: number; note: string }>; conflict_group: number; superseded_by: number };
  source: { material_id: number; material_title: string; source_id: number; source_type: string; source_title: string; source_author: string; auth_level: number; source_location: string; source_text: string; track: string; category: string };
  generation: { extraction_time: string; ai_model: string; prompt_version: string; confidence_score: number; ai_calls: Array<{ scene: string; tokens_in: number; tokens_out: number; created_at: string }> };
  review: { status: string; state: string; reviewer: string; review_time: string; events: Array<{ id: number; kp_id: number; event: string; actor: string; detail: string; created_at: string }> };
  versions: Array<{ id: number; version: number; govern_state: string; created_at: string }>;
}

export async function fetchKnowledgeTrace(id: string) {
  return api<{ success: boolean; trace?: KpTrace; error?: string }>(`/api/academy/knowledge/${id}/trace`);
}

/** 2.2 状态机：废弃 / 新版本替代 */
export async function deprecateKnowledge(id: string, reason?: string) {
  return adminApi<{ success: boolean; message?: string; error?: string }>(`/api/academy/knowledge/${id}/deprecate`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function supersedeKnowledge(id: string, patch: { title?: string; content: string }) {
  return adminApi<{ success: boolean; newId?: number; version?: number; message?: string; error?: string }>(`/api/academy/knowledge/${id}/supersede`, {
    method: "POST",
    body: JSON.stringify(patch),
  });
}

/** 2.4 冲突队列与裁定 */
export async function fetchKnowledgeConflicts() {
  return adminApi<{ success: boolean; conflicts?: KnowledgeVo[]; error?: string }>(`/api/academy/knowledge/conflicts`);
}

export async function resolveKnowledgeConflict(groupId: string, keepKpId: string, note?: string) {
  return adminApi<{ success: boolean; keep?: number; dismissed?: number[]; error?: string }>(`/api/academy/knowledge/conflicts/resolve`, {
    method: "POST",
    body: JSON.stringify({ groupId, keepKpId, note }),
  });
}

/** 3.1 二级结构重复审核队列 */
export async function fetchDupQueue() {
  return adminApi<{ success: boolean; questions?: QuestionVo[]; error?: string }>(`/api/academy/questions/dup-queue`);
}

/** 4.1 来源注册库 */
export interface SourceVo { id: string; name: string; sourceType: string; author: string; authLevel: number; usage: string; licenseNote: string; createdAt: string }

export async function fetchSources() {
  return api<{ success: boolean; levels?: Record<string, { name: string; usage: string }>; sources?: SourceVo[]; error?: string }>(`/api/academy/sources`);
}

export async function createSource(data: { name: string; sourceType?: string; author?: string; authLevel: number; licenseNote?: string }) {
  return adminApi<{ success: boolean; sourceId?: string; error?: string }>(`/api/academy/sources`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function bindMaterialSource(materialId: string, sourceId: string) {
  return adminApi<{ success: boolean; message?: string; error?: string }>(`/api/academy/materials/${materialId}/bind-source`, {
    method: "POST",
    body: JSON.stringify({ sourceId }),
  });
}

/** 4.3 用户贡献版权声明（三项确认全勾选） */
export async function declareMaterialCopyright(materialId: string, confirmed: [boolean, boolean, boolean]) {
  return api<{ success: boolean; message?: string; error?: string }>(`/api/academy/materials/${materialId}/declare`, {
    method: "POST",
    body: JSON.stringify({ confirmed }),
  });
}

/** 治理配置（冲突阈值等，后台可配） */
export interface GovernanceCfg {
  kp_pass_score: number; kp_priority_score: number;
  q_pass_score: number; q_priority_score: number;
  conflict_title_sim: number; conflict_content_sim: number;
  kp_question_concentration: number;
}

export async function fetchGovernanceCfg() {
  return adminApi<{ success: boolean; governance?: GovernanceCfg; error?: string }>(`/api/academy/loc/governance`);
}

export async function updateGovernanceCfg(patch: Partial<GovernanceCfg>) {
  return adminApi<{ success: boolean; governance?: GovernanceCfg; message?: string; error?: string }>(`/api/academy/loc/governance`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}
