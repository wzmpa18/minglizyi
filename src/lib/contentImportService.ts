/**
 * ============================================================================
 * 内容导入服务 - v20.4
 * ============================================================================
 *
 * 将混元AI生成的内容保存到服务器文件系统
 * 支持：中医典籍、易学题库、中医题库
 *
 * 保存路径：
 *   /data/imported/tcm_classics/   - 导入的典籍
 *   /data/imported/yixue_exams/    - 导入的易学题目
 *   /data/imported/zhongyi_exams/  - 导入的中医题目
 *
 * 安全：仅在服务端运行，不暴露到前端
 *
 * 创建日期：2026-08-11
 * ============================================================================
 */

import { promises as fs } from "fs";
import path from "path";

// ==================== 保存路径配置 ====================

const DATA_ROOT = path.join(process.cwd(), "data", "imported");

const PATHS = {
  tcm_classics: path.join(DATA_ROOT, "tcm_classics"),
  yixue_exams: path.join(DATA_ROOT, "yixue_exams"),
  zhongyi_exams: path.join(DATA_ROOT, "zhongyi_exams"),
  import_log: path.join(DATA_ROOT, "import_log.json"),
} as const;

// ==================== 类型定义 ====================

export type ContentType = "tcm_classic" | "yixue_exam" | "zhongyi_exam";

export interface ImportResult {
  saved: boolean;
  filePath: string;
  count: number;
  error?: string;
}

export interface ImportLog {
  id: string;
  type: ContentType;
  timestamp: string;
  success: boolean;
  filePath: string;
  count: number;
  error?: string;
}

// ==================== 核心保存接口 ====================

/**
 * 保存导入的内容到服务器
 */
export async function saveImportedContent(
  type: ContentType,
  data: any
): Promise<ImportResult> {
  try {
    // 确保目录存在
    const targetDir = getPathForType(type);
    await fs.mkdir(targetDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `${type}_${timestamp}.json`;
    const filePath = path.join(targetDir, fileName);

    // 添加元数据
    const contentWithMeta = {
      _meta: {
        importedAt: new Date().toISOString(),
        source: "hunyuan_ai",
        type,
      },
      data,
    };

    await fs.writeFile(filePath, JSON.stringify(contentWithMeta, null, 2), "utf-8");

    // 记录导入日志
    await logImport({
      id: `import_${Date.now()}`,
      type,
      timestamp: new Date().toISOString(),
      success: true,
      filePath,
      count: Array.isArray(data) ? data.length : 1,
    });

    return {
      saved: true,
      filePath,
      count: Array.isArray(data) ? data.length : 1,
    };
  } catch (error: any) {
    console.error("[ContentImportService] save failed:", error);

    // 记录失败日志
    await logImport({
      id: `import_${Date.now()}`,
      type,
      timestamp: new Date().toISOString(),
      success: false,
      filePath: "",
      count: 0,
      error: error.message,
    });

    return {
      saved: false,
      filePath: "",
      count: 0,
      error: error.message,
    };
  }
}

/**
 * 获取已导入的内容列表
 */
export async function getImportedContentList(type?: ContentType): Promise<
  Array<{
    type: ContentType;
    fileName: string;
    filePath: string;
    importedAt: string;
    count: number;
  }>
> {
  const types = type ? [type] : (Object.keys(PATHS) as ContentType[]);
  const results: any[] = [];

  for (const t of types) {
    const dir = getPathForType(t);
    try {
      const files = await fs.readdir(dir);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const fullPath = path.join(dir, file);
        try {
          const content = await fs.readFile(fullPath, "utf-8");
          const parsed = JSON.parse(content);
          results.push({
            type: t,
            fileName: file,
            filePath: fullPath,
            importedAt: parsed._meta?.importedAt || "",
            count: Array.isArray(parsed.data) ? parsed.data.length : 1,
          });
        } catch {
          // 跳过无法解析的文件
        }
      }
    } catch {
      // 目录不存在，跳过
    }
  }

  return results;
}

/**
 * 读取已导入的内容
 */
export async function readImportedContent(
  type: ContentType,
  fileName: string
): Promise<any | null> {
  const filePath = path.join(getPathForType(type), fileName);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * 获取导入日志
 */
export async function getImportLog(): Promise<ImportLog[]> {
  try {
    const content = await fs.readFile(PATHS.import_log, "utf-8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

// ==================== 工具函数 ====================

function getPathForType(type: ContentType): string {
  switch (type) {
    case "tcm_classic":
      return PATHS.tcm_classics;
    case "yixue_exam":
      return PATHS.yixue_exams;
    case "zhongyi_exam":
      return PATHS.zhongyi_exams;
    default:
      return PATHS.tcm_classics;
  }
}

async function logImport(entry: ImportLog): Promise<void> {
  try {
    await fs.mkdir(DATA_ROOT, { recursive: true });
    const log = await getImportLog();
    log.unshift(entry);
    // 只保留最近100条日志
    const trimmed = log.slice(0, 100);
    await fs.writeFile(PATHS.import_log, JSON.stringify(trimmed, null, 2), "utf-8");
  } catch (error) {
    console.error("[ContentImportService] log failed:", error);
  }
}
