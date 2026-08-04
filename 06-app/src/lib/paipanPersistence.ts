/**
 * v18.1: 排盘状态本地持久化工具
 * 按工具维度分别存储到 localStorage，页面加载时自动恢复
 */

const STORAGE_PREFIX = 'yixue_paipan_';

export interface PaipanPersistState {
  /** 输入参数 */
  input: Record<string, unknown>;
  /** 是否显示排盘表单 */
  showForm?: boolean;
  /** 时间戳 */
  _ts: number;
}

export function savePaipanState(toolKey: string, state: PaipanPersistState): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_PREFIX + toolKey, JSON.stringify({ ...state, _ts: Date.now() }));
  } catch (e) {
    console.error(`[${toolKey}] 保存排盘状态失败:`, e);
  }
}

export function loadPaipanState(toolKey: string): PaipanPersistState | null {
  try {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(STORAGE_PREFIX + toolKey);
    if (!data) return null;
    return JSON.parse(data) as PaipanPersistState;
  } catch (e) {
    console.error(`[${toolKey}] 读取排盘状态失败:`, e);
    return null;
  }
}

export function clearPaipanState(toolKey: string): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_PREFIX + toolKey);
  } catch (e) {
    console.error(`[${toolKey}] 清除排盘状态失败:`, e);
  }
}