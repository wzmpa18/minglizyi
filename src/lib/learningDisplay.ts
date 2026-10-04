const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "基础",
  beginner: "基础",
  basic: "基础",
  medium: "进阶",
  intermediate: "进阶",
  hard: "提高",
  advanced: "提高",
};

export function learningDifficultyLabel(value?: string | null): string {
  const key = String(value || "").trim().toLowerCase();
  return DIFFICULTY_LABELS[key] || "学习";
}
