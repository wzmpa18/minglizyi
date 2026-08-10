// ============================================================================
// 验证码服务端存储 - v18.5
// 内存存储 + 自动过期清理，单机部署场景
// ============================================================================

interface CodeEntry {
  code: string;
  expires: number;
  lastSent: number;
}

const store = new Map<string, CodeEntry>();

// 每60秒清理过期条目
if (typeof globalThis !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.expires) {
        store.delete(key);
      }
    }
  }, 60000);
}

/** 存储验证码 */
export function setCode(
  key: string,
  code: string,
  ttlMs: number = 300000
): void {
  store.set(key, { code, expires: Date.now() + ttlMs, lastSent: Date.now() });
}

/** 校验验证码（一次性使用，校验后删除） */
export function verifyCode(key: string, code: string): boolean {
  const entry = store.get(key);
  if (!entry) return false;
  if (Date.now() > entry.expires) {
    store.delete(key);
    return false;
  }
  if (entry.code !== code) return false;
  store.delete(key);
  return true;
}

/** 检查是否可重发（频率限制） */
export function canResend(key: string, cooldownMs: number = 60000): boolean {
  const entry = store.get(key);
  if (!entry) return true;
  return Date.now() - entry.lastSent >= cooldownMs;
}

/** 生成6位随机验证码 */
export function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}