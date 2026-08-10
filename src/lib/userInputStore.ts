/**
 * 用户输入持久化存储 v2
 * 使用 localStorage 代替 sessionStorage，确保切换页面/底部导航后参数保留
 * 用户主动退出或清空时才清除
 */
const STORE_KEY = "yandao_persist_input";

interface StoredInput {
  page: string;
  data: Record<string, any>;
  updatedAt: string;
}

function getStore(): StoredInput[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStore(store: StoredInput[]): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    console.warn("localStorage full, trimming old data");
    const trimmed = store.slice(-30);
    localStorage.setItem(STORE_KEY, JSON.stringify(trimmed));
  }
}

/** 保存用户输入 */
export function saveUserInput(page: string, data: Record<string, any>): void {
  if (!page) return;
  const store = getStore();
  const idx = store.findIndex((s) => s.page === page);
  const entry: StoredInput = { page, data, updatedAt: new Date().toISOString() };
  if (idx >= 0) store[idx] = entry;
  else store.push(entry);
  saveStore(store);
}

/** 获取用户输入 */
export function getUserInput(page: string): Record<string, any> | null {
  const store = getStore();
  const entry = store.find((s) => s.page === page);
  return entry?.data || null;
}

/** 清除指定页面输入 */
export function clearUserInput(page: string): void {
  const store = getStore().filter((s) => s.page !== page);
  saveStore(store);
}

/** 清除所有输入（用户退出时调用） */
export function clearAllUserInput(): void {
  localStorage.removeItem(STORE_KEY);
}

/** 获取所有已保存的页面 */
export function getSavedPages(): string[] {
  return getStore().map((s) => s.page);
}

/**
 * 从localStorage自动恢复表单数据
 * 返回 [savedData, saveFn]
 * 使用示例：
 * const [savedData, saveFn] = usePersistInput("yixue_bazi");
 */
export function usePersistInput(pageKey: string) {
  // 在客户端才能使用
  if (typeof window === "undefined") return [null, () => {}] as const;

  const savedData = getUserInput(pageKey);
  const saveFn = (data: Record<string, any>) => saveUserInput(pageKey, data);

  return [savedData, saveFn] as const;
}