/**
 * v18.2: 排盘状态本地持久化工具（增强版）
 * 
 * 存储范围：每个易学工具的全部输入参数 + 排盘结果
 * 留存规则：永久保留，除非用户主动清空或清理浏览器缓存
 * 独立存储：每个工具独立 key，互不干扰
 * 扩展预留：存储结构预留 serverSync 字段，后续付费用户可一键同步至服务器
 * 
 * @module paipanPersistence
 * @since v18.1
 * @enhanced v18.2
 */

const STORAGE_PREFIX = 'yandao_paipan_';
const OLD_STORAGE_PREFIX = 'yixue_paipan_';

/** 排盘输入参数 */
export interface PaipanInput {
  /** 姓名 */
  name?: string;
  /** 性别 */
  gender?: string;
  /** 历法类型：solar(公历) / lunar(农历) / ganzhi(干支) */
  calType?: string;
  /** 年 */
  year?: number;
  /** 月 */
  month?: number;
  /** 日 */
  day?: number;
  /** 时 (0-23) */
  hour?: number;
  /** 分 (0-59) */
  minute?: number;
  /** 是否早晚子时 */
  ziShiType?: 'early' | 'late';
  /** 是否使用真太阳时 */
  useTrueSolar?: boolean;
  /** 真太阳时经度 */
  longitude?: number;
  /** 其他扩展参数 */
  [key: string]: unknown;
}

/** 持久化状态 */
export interface PaipanPersistState {
  /** 输入参数 */
  input: PaipanInput;
  /** 排盘结果（各工具自有类型，序列化为 JSON） */
  result?: unknown;
  /** 是否显示排盘表单 */
  showForm?: boolean;
  /** 时间戳 */
  _ts: number;
  /** v18.2: 服务端同步预留字段 */
  _serverSync?: {
    /** 是否已同步到服务器 */
    synced: boolean;
    /** 上次同步时间 */
    lastSyncAt?: number;
    /** 服务端记录 ID */
    serverId?: string;
  };
}

/**
 * 保存排盘状态到 localStorage
 * @param toolKey 工具标识（如 "bazi", "daliuren"）
 * @param state 排盘状态
 */
export function savePaipanState(toolKey: string, state: PaipanPersistState): void {
  try {
    if (typeof window === 'undefined') return;
    const data: PaipanPersistState = {
      ...state,
      _ts: Date.now(),
      _serverSync: state._serverSync || { synced: false },
    };
    localStorage.setItem(STORAGE_PREFIX + toolKey, JSON.stringify(data));
  } catch (e) {
    console.error(`[paipanPersistence] 保存 ${toolKey} 排盘状态失败:`, e);
  }
}

/**
 * 从 localStorage 读取排盘状态
 * @param toolKey 工具标识
 * @returns 排盘状态，不存在则返回 null
 */
export function loadPaipanState(toolKey: string): PaipanPersistState | null {
  try {
    if (typeof window === 'undefined') return null;
    let data = localStorage.getItem(STORAGE_PREFIX + toolKey);
    // 兼容旧键名迁移（yixue_paipan_ → yandao_paipan_）
    if (!data) {
      const oldData = localStorage.getItem(OLD_STORAGE_PREFIX + toolKey);
      if (oldData) {
        data = oldData;
        localStorage.setItem(STORAGE_PREFIX + toolKey, oldData);
        localStorage.removeItem(OLD_STORAGE_PREFIX + toolKey);
      }
    }
    if (!data) return null;
    return JSON.parse(data) as PaipanPersistState;
  } catch (e) {
    console.error(`[paipanPersistence] 读取 ${toolKey} 排盘状态失败:`, e);
    return null;
  }
}

/**
 * 清除指定工具的排盘状态
 * @param toolKey 工具标识
 */
export function clearPaipanState(toolKey: string): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_PREFIX + toolKey);
  } catch (e) {
    console.error(`[paipanPersistence] 清除 ${toolKey} 排盘状态失败:`, e);
  }
}

/**
 * v18.2: 获取所有已保存的工具列表
 * @returns 工具标识数组
 */
export function getAllSavedTools(): string[] {
  try {
    if (typeof window === 'undefined') return [];
    const tools: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(STORAGE_PREFIX) || key.startsWith(OLD_STORAGE_PREFIX))) {
        tools.push(key.replace(STORAGE_PREFIX, '').replace(OLD_STORAGE_PREFIX, ''));
      }
    }
    return tools;
  } catch (e) {
    console.error('[paipanPersistence] 获取工具列表失败:', e);
    return [];
  }
}

/**
 * v18.2: 标记为已同步到服务器
 * @param toolKey 工具标识
 * @param serverId 服务端记录 ID
 */
export function markSynced(toolKey: string, serverId: string): void {
  const state = loadPaipanState(toolKey);
  if (state) {
    state._serverSync = { synced: true, lastSyncAt: Date.now(), serverId };
    savePaipanState(toolKey, state);
  }
}

/**
 * v18.2: 检查是否有未同步的数据
 * @returns 未同步的工具标识数组
 */
export function getUnsyncedTools(): string[] {
  const tools = getAllSavedTools();
  return tools.filter(toolKey => {
    const state = loadPaipanState(toolKey);
    return state && !state._serverSync?.synced;
  });
}
