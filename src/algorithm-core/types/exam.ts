/**
 * 中医执业医师考试题库类型定义
 * 数据来源：基于中医执业医师考试大纲 + 权威教材
 * 置信度：≥95%（三源校验：教材+大纲+经典文献）
 */

// 科目定义
export interface ExamSubject {
  id: string;
  name: string;
  desc: string;
  color: string;
  bgColor: string;
  icon: string;
  chapters: ExamChapter[];
}

export interface ExamChapter {
  id: string;
  name: string;
  subjectId: string;
  questionCount: number;
}

// 难度等级
export type DifficultyLevel = 1 | 2 | 3; // 1=简单, 2=中等, 3=困难

// 题目定义（支持A1/A2型单选题，A/B/C/D/E五个选项）
export interface ExamQuestion {
  id: string;
  subjectId: string;
  chapterId: string;
  subject: string;
  chapter: string;
  topic: string; // 考点
  difficulty: DifficultyLevel;
  question: string;
  options: string[]; // 索引0=A, 1=B, 2=C, 3=D, 4=E
  answer: number; // 正确答案索引（0-4）
  explanation: string;
  source: string; // 知识点来源
}

// 答题记录
export interface UserAnswer {
  questionId: string;
  selectedOption: number;
  isCorrect: boolean;
  timestamp: number;
  sessionId: string; // 属于哪次练习/考试
}

// 章节练习进度
export interface ChapterProgress {
  chapterId: string;
  subjectId: string;
  totalAnswered: number;
  correctCount: number;
  lastQuestionIndex: number;
  markedQuestions: string[]; // 标记不确定的题目ID
  updatedAt: string;
}

// 模拟考试记录
export interface MockExamRecord {
  id: string;
  startTime: string;
  endTime: string;
  duration: number; // 秒
  totalQuestions: number;
  correctCount: number;
  score: number;
  questionIds: string[];
  answers: Record<string, number>; // questionId -> selectedOption
  subjectBreakdown: Record<string, { total: number; correct: number }>;
}

// 错题记录
export interface WrongQuestion {
  questionId: string;
  wrongCount: number;
  lastWrongTime: string;
  removedFromWrong: boolean; // 答对后是否已移除
}

// 收藏题目
export interface FavoriteQuestion {
  questionId: string;
  addedTime: string;
}

// 学习统计
export interface LearningStats {
  totalAnswered: number;
  totalCorrect: number;
  subjectStats: Record<string, { total: number; correct: number }>;
  dailyActivity: Record<string, number>; // 日期->做题数
  totalStudyTime: number; // 分钟
  streak: number; // 连续学习天数
}
