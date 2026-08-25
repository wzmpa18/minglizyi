"use client";

// ============================================================================
// 登录服务层 - v18.5
// 手机号+验证码登录、手机号+密码登录、邮箱+验证码登录、邮箱注册、微信授权登录、游客模式一键转登录
// 对接腾讯云短信/邮件服务，验证码校验走服务端 API
// 密码前端加盐 hash 持久化存储，验证码发送频率限制
// ============================================================================

import { setLoginState, clearLoginState, getLoginState, getClientUserId, type UserProfile } from './auth';
import { saveTokenPair, clearAllTokens } from './authInterceptor';
import { syncMembershipFromProfile } from './membershipStore';

// v20.2: 后端 API 基础地址（ai-proxy-server.js）
const API_BASE_URL = "https://yandaoguoxue.yandao.vip";

// --- 类型 ---
export interface SmsSendResult {
  success: boolean;
  message: string;
}

export interface EmailSendResult {
  success: boolean;
  message: string;
}

export interface LoginResult {
  success: boolean;
  message: string;
  user?: UserProfile;
  isNewUser?: boolean;
}

export interface RegisterParams {
  phone: string;
  smsCode: string;
  password: string;
  inviteCode?: string;
  referrer_id?: string;
}

export interface ResetPasswordParams {
  phone: string;
  smsCode: string;
  newPassword: string;
}

export interface RegisterEmailParams {
  email: string;
  emailCode: string;
  password: string;
  inviteCode?: string;
  referrer_id?: string;
}

export interface ResetPasswordEmailParams {
  email: string;
  emailCode: string;
  newPassword: string;
}

// ============================================================================
// v20.1: 数字ID生成与管理
// ============================================================================

const NUMBER_ID_STORE_KEY = "yandao_number_id_map"; // numberId -> accountKey 映射
const ACCOUNT_NUMBER_ID_KEY = "yandao_account_number_id"; // accountKey -> numberId 映射

/** 生成唯一6-8位数字ID */
function generateNumberId(): string {
  const idMap = loadNumberIdMap();
  let attempts = 0;
  while (attempts < 100) {
    // 生成6位数字ID
    const num = String(Math.floor(100000 + Math.random() * 900000));
    if (!idMap[num]) {
      return num;
    }
    attempts++;
  }
  // 极端情况下使用7位
  return String(Math.floor(1000000 + Math.random() * 9000000));
}

/** 加载数字ID映射表 */
function loadNumberIdMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(NUMBER_ID_STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** 保存数字ID映射表 */
function saveNumberIdMap(map: Record<string, string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NUMBER_ID_STORE_KEY, JSON.stringify(map));
  } catch {}
}

/** 加载账号到数字ID的映射 */
function loadAccountNumberIdMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(ACCOUNT_NUMBER_ID_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** 保存账号到数字ID的映射 */
function saveAccountNumberIdMap(map: Record<string, string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACCOUNT_NUMBER_ID_KEY, JSON.stringify(map));
  } catch {}
}

/** 为账号绑定数字ID */
function bindNumberId(accountKey: string): string {
  const idMap = loadNumberIdMap();
  const acctMap = loadAccountNumberIdMap();

  // 如果已有数字ID，直接返回
  if (acctMap[accountKey]) {
    return acctMap[accountKey];
  }

  const numberId = generateNumberId();
  idMap[numberId] = accountKey;
  acctMap[accountKey] = numberId;
  saveNumberIdMap(idMap);
  saveAccountNumberIdMap(acctMap);
  return numberId;
}

/** 通过数字ID查找账号 */
function findAccountByNumberId(numberId: string): string | null {
  const idMap = loadNumberIdMap();
  return idMap[numberId] || null;
}

/** 检测输入类型：phone / email / numberId / unknown */
type AccountType = "phone" | "email" | "numberId" | "unknown";

function detectAccountType(input: string): AccountType {
  const trimmed = input.trim();
  if (/^1[3-9]\d{9}$/.test(trimmed)) return "phone";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "email";
  if (/^\d{6,8}$/.test(trimmed)) return "numberId";
  return "unknown";
}

// ============================================================================
// 持久化密码存储（localStorage + 前端加盐 hash）
// ============================================================================
const PWD_STORE_KEY = "yandao_pwd_store";
const PWD_SALT = "yd_$@lt_2026";

/** djb2 变体 + 盐值 hash */
export function hashPassword(password: string): string {
  const str = PWD_SALT + password + PWD_SALT;
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i); // hash * 33 + charCode
    hash = hash & 0xffffffff; // 限制为 32 位
  }
  return (hash >>> 0).toString(16);
}

/** 从 localStorage 加载密码存储 */
export function loadPasswordStore(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PWD_STORE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

/** 保存密码存储到 localStorage */
export function savePasswordStore(store: Record<string, string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PWD_STORE_KEY, JSON.stringify(store));
  } catch {}
}

// ============================================================================
// 验证码发送频率限制（同一手机号/邮箱 1 小时最多 3 次）
// ============================================================================
const RATE_LIMIT_KEY = "yandao_code_rate_limit";
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 小时
const RATE_LIMIT_MAX = 3;

function loadRateLimit(): Record<string, number[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, number[]>;
  } catch {
    return {};
  }
}

function saveRateLimit(map: Record<string, number[]>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(map));
  } catch {}
}

/** 检查频率限制，返回是否允许发送及剩余次数 */
export function checkRateLimit(identifier: string): { allowed: boolean; remaining: number } {
  const map = loadRateLimit();
  const now = Date.now();
  const sends = (map[identifier] || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  const remaining = Math.max(0, RATE_LIMIT_MAX - sends.length);
  return { allowed: sends.length < RATE_LIMIT_MAX, remaining };
}

/** 记录一次验证码发送时间 */
export function recordCodeSend(identifier: string): void {
  const map = loadRateLimit();
  const now = Date.now();
  const sends = (map[identifier] || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  sends.push(now);
  map[identifier] = sends;
  saveRateLimit(map);
}

// ============================================================================
// 客户端验证码存储（静态导出模式 - 无后端 API 时的验证码生成与校验）
// ============================================================================
const CLIENT_CODE_KEY = "yandao_client_codes";
const CODE_EXPIRY_MS = 5 * 60 * 1000; // 5分钟有效

/** 生成6位随机验证码 */
function generateClientCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** 存储验证码到 localStorage */
function storeClientCode(identifier: string, code: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(CLIENT_CODE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[identifier] = { code, expires: Date.now() + CODE_EXPIRY_MS };
    localStorage.setItem(CLIENT_CODE_KEY, JSON.stringify(map));
  } catch {}
}

/** 校验验证码（一次性使用，校验后删除） */
function verifyClientCode(identifier: string, code: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(CLIENT_CODE_KEY);
    if (!raw) return false;
    const map = JSON.parse(raw);
    const entry = map[identifier];
    if (!entry) return false;
    if (Date.now() > entry.expires) {
      delete map[identifier];
      localStorage.setItem(CLIENT_CODE_KEY, JSON.stringify(map));
      return false;
    }
    if (entry.code === code) {
      delete map[identifier];
      localStorage.setItem(CLIENT_CODE_KEY, JSON.stringify(map));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ============================================================================
// 短信验证码（v19.6: 走后端代理接口，密钥零泄露）
// ============================================================================

/** 发送短信验证码（v20.2: 直接调用后端 /api/auth/send-code） */
export async function sendSmsCode(phone: string): Promise<SmsSendResult> {
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return { success: false, message: '请输入正确的手机号' };
  }

  // v20.2: 前端频率限制校验（1小时最多3次）
  const rateCheck = checkRateLimit(phone);
  if (!rateCheck.allowed) {
    return { success: false, message: `发送过于频繁，1小时内最多3次，请稍后再试` };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    if (data.success) {
      // v20.2: 记录发送时间用于前端频率限制
      recordCodeSend(phone);
    }
    return { success: data.success, message: data.message || '发送失败' };
  } catch (err: any) {
    console.error('[SMS] 发送请求失败:', err);
    return { success: false, message: '网络异常，请稍后重试' };
  }
}

/** 校验短信验证码（v20.2: 调用后端 /api/auth/verify-code） */
async function verifySmsCode(phone: string, code: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code }),
    });
    const data = await res.json();
    return data.success === true;
  } catch (err: any) {
    console.error('[SMS] 校验请求失败:', err);
    return false;
  }
}

// ============================================================================
// 邮件验证码（v19.6: 走后端代理接口，密钥零泄露）
// ============================================================================

/** 发送邮件验证码（v20.2: 直接调用后端 /api/auth/send-code） */
export async function sendEmailCode(email: string): Promise<EmailSendResult> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, message: '请输入正确的邮箱地址' };
  }

  // v20.2: 前端频率限制校验（1小时最多3次）
  const rateCheck = checkRateLimit(email);
  if (!rateCheck.allowed) {
    return { success: false, message: `发送过于频繁，1小时内最多3次，请稍后再试` };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (data.success) {
      // v20.2: 记录发送时间用于前端频率限制
      recordCodeSend(email);
    }
    return { success: data.success, message: data.message || '发送失败' };
  } catch (err: any) {
    console.error('[EMAIL] 发送请求失败:', err);
    return { success: false, message: '网络异常，请稍后重试' };
  }
}

/** 校验邮件验证码（v20.2: 调用后端 /api/auth/verify-code） */
async function verifyEmailCode(email: string, code: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    return data.success === true;
  } catch (err: any) {
    console.error('[EMAIL] 校验请求失败:', err);
    return false;
  }
}

// ============================================================================
// v19.7_final: 注册唯一性实时校验
// ============================================================================

/**
 * 检查手机号/邮箱是否已注册（v20.2: 调用后端 /api/auth/check-duplicate）
 * @param phone 手机号（可选）
 * @param email 邮箱（可选）
 * @returns exists: true=已注册, false=未注册
 */
export async function checkUserExist(phone?: string, email?: string): Promise<boolean> {
  try {
    const resp = await fetch(`${API_BASE_URL}/api/auth/check-duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ phone: phone || null, email: email || null }),
    });
    if (resp.status === 429) {
      // 频率限制，不阻塞用户操作
      return false;
    }
    const data = await resp.json();
    return !!data.data?.exists;
  } catch {
    // 网络错误不阻塞注册流程
    return false;
  }
}

/**
 * 注册成功后通知服务端记录（v20.2: 后端注册接口已处理，此函数保留兼容）
 */
export async function registerToServer(phone?: string, email?: string): Promise<void> {
  // v20.2: 后端 /api/auth/register 已包含用户创建逻辑，无需额外通知
  // 保留空函数以兼容现有调用方
}

// ============================================================================
// 手机号注册
// ============================================================================

export async function registerWithPhone(params: RegisterParams): Promise<LoginResult> {
  const { phone, smsCode, password, inviteCode, referrer_id } = params;

  // P9-推广中心：统一读取邀请上下文（签名链接 ref/ts/sig 优先，邀请码次之）+ 设备指纹
  // P7-社交修复-01：referrer_id 一并上送（好友页纯ref场景），后端仅审计留痕不直接采信（防伪造）
  const { getInviteContext, getDeviceId, clearInviteContext } = await import('./inviteApi');
  const inviteCtx = getInviteContext();
  const inviteBody: Record<string, unknown> = {
    inviteCode: (inviteCtx?.code || inviteCode) || null,
    deviceId: getDeviceId(),
    referrer_id: referrer_id || null,
  };
  if (inviteCtx?.ref) {
    inviteBody.inviteRef = inviteCtx.ref;
    inviteBody.inviteTs = inviteCtx.ts;
    inviteBody.inviteSig = inviteCtx.sig;
  }

  // v21.0: 调用后端 /api/auth/register 接口（含 httpOnly cookie）
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // 携带/接收 httpOnly cookie
      body: JSON.stringify({ phone, code: smsCode, password, ...inviteBody }),
    });
    const data = await res.json();

    if (data.success && data.data) {
      // 后端注册成功
      const backendUser = data.data.user;
      const user: UserProfile = {
        userId: String(backendUser.userId),
        nickname: backendUser.nickname || `国学爱好者${phone.slice(-4)}`,
        avatar: backendUser.avatar || '',
        bio: backendUser.bio || '',
        gender: backendUser.gender || undefined,
        birthday: backendUser.birthday || undefined,
        tags: backendUser.tags || [],
        memberLevel: backendUser.memberLevel || 'basic',
        membershipExpiry: backendUser.membershipExpiry || null,
        memberTier: backendUser.memberTier || undefined,
        phone,
        inviteCode: backendUser.inviteCode,
        loginTime: Date.now(),
      };

      // v21.0: 不再在前端存储密码（后端 SQLite + bcrypt 已持久化）
      // 保存用户信息到 localStorage（供离线展示）
      localStorage.setItem(`yandao_user_${phone}`, JSON.stringify(user));

      // 设置登录态（使用后端返回的 JWT access token）
      const accessToken = data.data.accessToken;
      setLoginState(accessToken, user);
      // refresh token 在 httpOnly cookie 中，前端不可读
      saveTokenPair(accessToken, '');

      // P9-推广中心：邀请归因/绑定/发奖已在服务端完成，清除本地邀请上下文
      clearInviteContext();

      // P6-TOOL-04 §5.2：注册成功登记设备档案（设备农场识别）
      try {
        const { recordRegistration } = await import('./antiCheatStore');
        recordRegistration(user.userId);
      } catch { /* ignore */ }

      syncLocalData(user.userId);
      return { success: true, message: '注册成功', user, isNewUser: true };
    }

    // 后端返回业务错误（验证码错误、已注册等）
    if (!data.success) {
      return { success: false, message: data.message || '注册失败' };
    }
  } catch (err: any) {
    console.error('[REGISTER] 后端注册请求失败，回退到本地注册:', err);
    // 网络错误，继续执行下方本地注册降级流程
  }

  // === 本地注册降级流程（网络不可用时） ===
  // 服务端校验验证码
  const valid = await verifySmsCode(phone, smsCode);
  if (!valid) {
    return { success: false, message: '验证码错误或已过期' };
  }

  // 保存密码到持久化存储（加盐 hash）
  const store = loadPasswordStore();
  store[phone] = hashPassword(password);
  savePasswordStore(store);

  // 生成用户信息
  const userId = `YD${phone.slice(-4)}${Date.now().toString(36).slice(-4)}`.toUpperCase();
  const numberId = bindNumberId(phone); // v20.1: 生成数字ID
  const user: UserProfile = {
    userId,
    nickname: `国学爱好者${phone.slice(-4)}`,
    avatar: '',
    memberLevel: 'basic',
    phone,
    numberId,
    loginTime: Date.now(),
  };

  // 保存用户信息到 localStorage
  localStorage.setItem(`yandao_user_${phone}`, JSON.stringify(user));

  // 设置登录态
  const token = `token_${userId}_${Date.now()}`;
  setLoginState(token, user);

  // v20.1: 保存 token 双轨用于自动续期
  saveTokenPair(token, `rt_${userId}_${Date.now()}_reg`);

  syncLocalData(userId);

  // P6-TOOL-04 §5.2：本地降级注册同样登记设备档案
  try {
    const { recordRegistration } = await import('./antiCheatStore');
    recordRegistration(userId);
  } catch { /* ignore */ }

  // v19.7_final: 注册到服务端用户表（供后续唯一性校验）
  registerToServer(phone);

  return { success: true, message: '注册成功', user, isNewUser: true };
}

// ============================================================================
// 手机号验证码登录
// P9-推广中心：优先走后端 /api/auth/login-code（服务端校验验证码 + 自动注册 +
// 邀请归因 + 防作弊 + 单层发奖）；网络不可用时降级本地流程
// ============================================================================

export async function loginWithPhone(phone: string, code: string, inviteCode?: string): Promise<LoginResult> {
  try {
    const { loginWithCodeServer } = await import('./inviteApi');
    const result = await loginWithCodeServer({ phone, code });
    if (result.success && result.user) {
      const user: UserProfile = {
        userId: String(result.user.userId),
        nickname: result.user.nickname || `国学爱好者${phone.slice(-4)}`,
        avatar: result.user.avatar || '',
        bio: result.user.bio || '',
        memberLevel: result.user.memberLevel || 'basic',
        phone,
        inviteCode: result.user.inviteCode,
        loginTime: Date.now(),
      };
      localStorage.setItem(`yandao_user_${phone}`, JSON.stringify(user));
      setLoginState(result.accessToken || '', user);
      saveTokenPair(result.accessToken || '', '');
      syncLocalData(user.userId);
      return { success: true, message: result.message, user, isNewUser: !!result.isNewUser };
    }
    if (!result.success && result.message && !/网络异常/.test(result.message)) {
      return { success: false, message: result.message };
    }
  } catch (err) {
    console.error('[LOGIN-CODE] 后端验证码登录失败，回退本地流程:', err);
  }

  // === 本地降级流程（网络不可用时） ===
  // 服务端校验验证码
  const valid = await verifySmsCode(phone, code);
  if (!valid) {
    return { success: false, message: '验证码错误或已过期' };
  }

  // 检查是否为新用户
  const existingUser = localStorage.getItem(`yandao_user_${phone}`);
  const isNewUser = !existingUser;

  // 生成用户信息
  const userId = `YD${phone.slice(-4)}${Date.now().toString(36).slice(-4)}`.toUpperCase();
  const user: UserProfile = {
    userId,
    nickname: `国学爱好者${phone.slice(-4)}`,
    avatar: '',
    memberLevel: 'basic',
    phone,
    loginTime: Date.now(),
  };

  // 保存用户信息到 localStorage
  localStorage.setItem(`yandao_user_${phone}`, JSON.stringify(user));

  // 设置登录态
  const token = `token_${userId}_${Date.now()}`;
  setLoginState(token, user);

  // v20.1: 保存 token 双轨（access + refresh）用于自动续期
  const refreshToken = `rt_${userId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  saveTokenPair(token, refreshToken);

  syncLocalData(userId);

  return { success: true, message: isNewUser ? '注册成功' : '登录成功', user, isNewUser };
}

// ============================================================================
// v21.0: 统一密码登录（支持手机号 / 邮箱 / 纯数字ID）
// 走后端 SQLite + bcrypt 校验，不再依赖 localStorage
// 无痕模式下可正常登录：账号持久化在服务端，不依赖本地存储
// ============================================================================

export async function loginWithPassword(account: string, password: string): Promise<LoginResult> {
  const trimmed = account.trim();
  if (!trimmed) {
    return { success: false, message: '请输入账号' };
  }
  if (!password) {
    return { success: false, message: '请输入密码' };
  }

  // v21.0: 优先调用后端 /api/auth/login 接口（走 SQLite + bcrypt 校验）
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // 携带/接收 httpOnly cookie
      body: JSON.stringify({ account: trimmed, password }),
    });
    const data = await res.json();

    if (data.success && data.data) {
      // 后端登录成功
      const backendUser = data.data.user;
      const user: UserProfile = {
        userId: String(backendUser.userId),
        nickname: backendUser.nickname || '国学爱好者',
        avatar: backendUser.avatar || '',
        bio: backendUser.bio || '',
        gender: backendUser.gender || undefined,
        birthday: backendUser.birthday || undefined,
        tags: backendUser.tags || [],
        memberLevel: backendUser.memberLevel || 'basic',
        membershipExpiry: backendUser.membershipExpiry || null,
        memberTier: backendUser.memberTier || undefined,
        phone: backendUser.phone || undefined,
        email: backendUser.email || undefined,
        inviteCode: backendUser.inviteCode,
        loginTime: Date.now(),
      };

      // 保存用户信息到 localStorage（供离线展示）
      if (user.phone) {
        localStorage.setItem(`yandao_user_${user.phone}`, JSON.stringify(user));
      }
      if (user.email) {
        const emailKey = user.email.replace(/[^a-zA-Z0-9]/g, '_');
        localStorage.setItem(`yandao_email_${emailKey}`, JSON.stringify(user));
      }

      // 设置登录态（使用后端返回的 JWT access token）
      const accessToken = data.data.accessToken;
      const refreshToken = ''; // refresh token 在 httpOnly cookie 中，前端不可读
      setLoginState(accessToken, user);
      saveTokenPair(accessToken, refreshToken);

      syncLocalData(user.userId);

      return { success: true, message: '登录成功', user, isNewUser: false };
    }

    // 后端返回业务错误
    if (!data.success) {
      return { success: false, message: data.message || '登录失败' };
    }
  } catch (err: any) {
    console.error('[LOGIN] 后端登录请求失败:', err);
    // 网络错误时不降级到本地（因为本地无法安全校验密码）
    return { success: false, message: '网络异常，请检查网络后重试' };
  }

  return { success: false, message: '登录失败' };
}

// ============================================================================
// 邮箱验证码登录
// ============================================================================

export async function loginWithEmail(email: string, code: string): Promise<LoginResult> {
  const valid = await verifyEmailCode(email, code);
  if (!valid) {
    return { success: false, message: '验证码错误或已过期' };
  }

  const emailKey = email.replace(/[^a-zA-Z0-9]/g, '_');
  const existingUser = localStorage.getItem(`yandao_email_${emailKey}`);
  const isNewUser = !existingUser;

  const userId = `EM${emailKey.slice(0, 4)}${Date.now().toString(36).slice(-4)}`.toUpperCase();
  const user: UserProfile = {
    userId,
    nickname: email.split('@')[0],
    avatar: '',
    memberLevel: 'basic',
    email,
    loginTime: Date.now(),
  };

  localStorage.setItem(`yandao_email_${emailKey}`, JSON.stringify(user));
  const token = `token_${userId}_${Date.now()}`;
  setLoginState(token, user);

  // v20.1: 保存 token 双轨用于自动续期
  saveTokenPair(token, `rt_${userId}_${Date.now()}_email`);

  syncLocalData(userId);

  // P6-TOOL-04 §5.2：邮箱验证码登录新建账号视为注册，登记设备档案
  if (isNewUser) {
    try {
      const { recordRegistration } = await import('./antiCheatStore');
      recordRegistration(userId);
    } catch { /* ignore */ }
  }

  return { success: true, message: isNewUser ? '注册成功' : '登录成功', user, isNewUser };
}

// ============================================================================
// 邮箱注册
// ============================================================================

export async function registerWithEmail(params: RegisterEmailParams): Promise<LoginResult> {
  const { email, emailCode, password, inviteCode, referrer_id } = params;

  // P7-社交修复-01：邮箱注册与手机注册同口径——统一读取邀请上下文（签名链接 ref/ts/sig 优先）
  // + 设备指纹上送服务端归因（此前邮箱注册完全丢失邀请归因，导致"注册了却不在邀请人名下"）
  const { getInviteContext, getDeviceId, clearInviteContext } = await import('./inviteApi');
  const inviteCtx = getInviteContext();
  const inviteBody: Record<string, unknown> = {
    inviteCode: (inviteCtx?.code || inviteCode) || null,
    deviceId: getDeviceId(),
    referrer_id: referrer_id || null,
  };
  if (inviteCtx?.ref) {
    inviteBody.inviteRef = inviteCtx.ref;
    inviteBody.inviteTs = inviteCtx.ts;
    inviteBody.inviteSig = inviteCtx.sig;
  }

  // v21.0: 调用后端 /api/auth/register 接口（含 httpOnly cookie）
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // 携带/接收 httpOnly cookie
      body: JSON.stringify({ email, code: emailCode, password, ...inviteBody }),
    });
    const data = await res.json();

    if (data.success && data.data) {
      // 后端注册成功
      const backendUser = data.data.user;
      const emailKey = email.replace(/[^a-zA-Z0-9]/g, '_');
      const user: UserProfile = {
        userId: String(backendUser.userId),
        nickname: backendUser.nickname || email.split('@')[0],
        avatar: backendUser.avatar || '',
        bio: backendUser.bio || '',
        gender: backendUser.gender || undefined,
        birthday: backendUser.birthday || undefined,
        tags: backendUser.tags || [],
        memberLevel: backendUser.memberLevel || 'basic',
        membershipExpiry: backendUser.membershipExpiry || null,
        memberTier: backendUser.memberTier || undefined,
        email,
        inviteCode: backendUser.inviteCode,
        loginTime: Date.now(),
      };

      // v21.0: 不再在前端存储密码（后端 SQLite + bcrypt 已持久化）
      // 保存用户信息到 localStorage（供离线展示）
      localStorage.setItem(`yandao_email_${emailKey}`, JSON.stringify(user));

      // 设置登录态（使用后端返回的 JWT access token）
      const accessToken = data.data.accessToken;
      setLoginState(accessToken, user);
      saveTokenPair(accessToken, '');

      // 处理邀请码
      if (inviteCode) {
        try {
          const { addInviteRelation, getUserIdByInviteCode } = await import('./inviteStore');
          const inviterUid = getUserIdByInviteCode(inviteCode) || inviteCode;
          addInviteRelation({
            id: `inv_${Date.now()}`,
            inviterId: inviterUid,
            inviterName: '',
            inviteeId: user.userId,
            inviteeName: user.nickname,
            level: 1,
            createdAt: new Date().toISOString(),
            rewardClaimed: false,
          });
        } catch {}
      }

      // P6-TOOL-04 §5.2：注册成功登记设备档案（设备农场识别）
      try {
        const { recordRegistration } = await import('./antiCheatStore');
        recordRegistration(user.userId);
      } catch { /* ignore */ }

      // P7-社交修复-01：归因已在服务端完成，清除本地邀请上下文
      clearInviteContext();

      syncLocalData(user.userId);
      return { success: true, message: '注册成功', user, isNewUser: true };
    }

    // 后端返回业务错误（验证码错误、已注册等）
    if (!data.success) {
      return { success: false, message: data.message || '注册失败' };
    }
  } catch (err: any) {
    console.error('[REGISTER] 后端注册请求失败，回退到本地注册:', err);
    // 网络错误，继续执行下方本地注册降级流程
  }

  // === 本地注册降级流程（网络不可用时） ===
  // 服务端校验邮箱验证码
  const valid = await verifyEmailCode(email, emailCode);
  if (!valid) {
    return { success: false, message: '邮箱验证码错误或已过期' };
  }

  // 保存密码到持久化存储（以邮箱作为 key）
  const store = loadPasswordStore();
  store[email] = hashPassword(password);
  savePasswordStore(store);

  const emailKey = email.replace(/[^a-zA-Z0-9]/g, '_');
  const numberId = bindNumberId(email); // v20.1: 生成数字ID
  const userId = `EM${emailKey.slice(0, 4)}${Date.now().toString(36).slice(-4)}`.toUpperCase();
  const user: UserProfile = {
    userId,
    nickname: email.split('@')[0],
    avatar: '',
    memberLevel: 'basic',
    email,
    numberId,
    loginTime: Date.now(),
  };

  localStorage.setItem(`yandao_email_${emailKey}`, JSON.stringify(user));

  // 设置登录态（自动登录）
  const token = `token_${userId}_${Date.now()}`;
  setLoginState(token, user);

  // v20.1: 保存 token 双轨用于自动续期
  saveTokenPair(token, `rt_${userId}_${Date.now()}_regemail`);

  // 处理邀请码
  if (inviteCode) {
    try {
      const { addInviteRelation, getUserIdByInviteCode } = await import('./inviteStore');
      // v18.6: 通过邀请码反查邀请人真实userId，确保邀请关系正确绑定
      const inviterUid = getUserIdByInviteCode(inviteCode) || inviteCode;
      addInviteRelation({
        id: `inv_${Date.now()}`,
        inviterId: inviterUid,
        inviterName: '',
        inviteeId: userId,
        inviteeName: user.nickname,
        level: 1,
        createdAt: new Date().toISOString(),
        rewardClaimed: false,
      });
    } catch {}
  }

  syncLocalData(userId);

  // P6-TOOL-04 §5.2：本地降级邮箱注册同样登记设备档案
  try {
    const { recordRegistration } = await import('./antiCheatStore');
    recordRegistration(userId);
  } catch { /* ignore */ }

  // v19.7_final: 注册到服务端用户表（供后续唯一性校验）
  registerToServer(undefined, email);

  return { success: true, message: '注册成功', user, isNewUser: true };
}

// ============================================================================
// 重置密码（手机号）
// ============================================================================

export async function resetPassword(params: ResetPasswordParams): Promise<LoginResult> {
  const { phone, smsCode, newPassword } = params;

  if (!phone || !smsCode || !newPassword) {
    return { success: false, message: '请输入手机号、验证码和新密码' };
  }

  // v25.0.15: 调用后端接口更新 SQLite 密码哈希（登录以后端为权威，本地存储不再生效）
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ account: phone, smsCode, newPassword }),
    });
    const data = await res.json();
    if (data.success) {
      return { success: true, message: '密码重置成功' };
    }
    return { success: false, message: data.message || '密码重置失败' };
  } catch (err) {
    console.error('[RESET] 后端重置密码请求失败:', err);
    return { success: false, message: '网络异常，请检查网络后重试' };
  }
}

// ============================================================================
// 重置密码（邮箱）
// ============================================================================

export async function resetPasswordWithEmail(params: ResetPasswordEmailParams): Promise<LoginResult> {
  const { email, emailCode, newPassword } = params;

  if (!email || !emailCode || !newPassword) {
    return { success: false, message: '请输入邮箱、验证码和新密码' };
  }

  // v25.0.15: 调用后端接口更新 SQLite 密码哈希
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ account: email, emailCode, newPassword }),
    });
    const data = await res.json();
    if (data.success) {
      return { success: true, message: '密码重置成功' };
    }
    return { success: false, message: data.message || '密码重置失败' };
  } catch (err) {
    console.error('[RESET] 后端重置密码（邮箱）请求失败:', err);
    return { success: false, message: '网络异常，请检查网络后重试' };
  }
}

// ============================================================================
// 微信授权登录
// ============================================================================

export async function loginWithWechat(): Promise<LoginResult> {
  // TODO: 生产环境对接微信开放平台 OAuth2.0
  const mockOpenId = `wx_${Date.now().toString(36)}`;
  const mockNickname = `微信用户${mockOpenId.slice(-4)}`;

  const userId = `WX${mockOpenId.slice(-8)}`.toUpperCase();
  const user: UserProfile = {
    userId,
    nickname: mockNickname,
    avatar: '',
    memberLevel: 'basic',
    loginTime: Date.now(),
  };

  const token = `token_${userId}_${Date.now()}`;
  setLoginState(token, user);

  // v20.1: 保存 token 双轨用于自动续期
  saveTokenPair(token, `rt_${userId}_${Date.now()}_wx`);

  syncLocalData(userId);

  return { success: true, message: '微信登录成功', user, isNewUser: false };
}

// ============================================================================
// 游客模式一键转登录
// ============================================================================

export async function guestToLogin(phone: string, code: string): Promise<LoginResult> {
  const result = await loginWithPhone(phone, code);
  if (result.success && result.user) {
    const guestId = getClientUserId();
    if (guestId) {
      migrateGuestData(guestId, result.user.userId);
    }
  }
  return result;
}

// ============================================================================
// 退出登录
// ============================================================================

export function logout(): void {
  clearLoginState();
  // v20.1: 清除所有 token 数据（access + refresh + IndexedDB备份）
  clearAllTokens();
  if (typeof window !== 'undefined') {
    localStorage.removeItem('yanduo_privacy_search');
    localStorage.removeItem('yanduo_privacy_nearby');
    localStorage.removeItem('yanduo_notify_enabled');
  }
  window.location.href = '/';
}

// ============================================================================
// 辅助函数
// ============================================================================

async function syncLocalData(userId: string): Promise<void> {
  try {
    const { initCloudSync } = await import('./clientStore');
    initCloudSync();
  } catch {}
}

function migrateGuestData(guestId: string, userId: string): void {
  if (typeof window === 'undefined') return;
  const guestClients = localStorage.getItem(`yandao_clients_${guestId}`);
  if (guestClients) {
    localStorage.setItem(`yandao_clients_${userId}`, guestClients);
    localStorage.removeItem(`yandao_clients_${guestId}`);
  }
  const guestRecords = localStorage.getItem(`yandao_records_${guestId}`);
  if (guestRecords) {
    localStorage.setItem(`yandao_records_${userId}`, guestRecords);
    localStorage.removeItem(`yandao_records_${guestId}`);
  }
}

export function getCurrentUser(): UserProfile | null {
  const state = getLoginState();
  return state.isLoggedIn ? state.profile : null;
}

export function updateProfile(updates: Partial<UserProfile>): void {
  const state = getLoginState();
  if (state.isLoggedIn && state.profile && state.token) {
    const updated = { ...state.profile, ...updates };
    setLoginState(state.token, updated);
  }
}

// ============================================================================
// v21.0: 调用后端 API 更新用户资料（持久化到 SQLite 数据库）
// ============================================================================

export interface UpdateProfileParams {
  nickname?: string;
  avatar?: string;
  bio?: string;
  gender?: string;
  birthday?: string;
  tags?: string[];
}

export async function updateProfileToServer(params: UpdateProfileParams): Promise<{ success: boolean; message: string; user?: UserProfile }> {
  const state = getLoginState();
  if (!state.isLoggedIn || !state.token) {
    return { success: false, message: '请先登录' };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/profile/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`,
      },
      credentials: 'include',
      body: JSON.stringify(params),
    });
    const data = await res.json();

    if (data.success && data.data) {
      const backendUser = data.data;
      // 合并更新后的用户信息
      const updatedUser: UserProfile = {
        ...(state.profile as UserProfile),
        userId: String(backendUser.userId),
        nickname: backendUser.nickname || state.profile?.nickname || '',
        avatar: backendUser.avatar || state.profile?.avatar || '',
        bio: backendUser.bio || '',
        gender: (backendUser.gender as any) || state.profile?.gender,
        birthday: backendUser.birthday || state.profile?.birthday,
        tags: backendUser.tags || state.profile?.tags || [],
        memberLevel: backendUser.memberLevel || state.profile?.memberLevel || 'basic',
        membershipExpiry: backendUser.membershipExpiry || state.profile?.membershipExpiry || null,
        memberTier: backendUser.memberTier || state.profile?.memberTier || undefined,
        inviteCode: backendUser.inviteCode || state.profile?.inviteCode,
        loginTime: state.profile?.loginTime || Date.now(),
      };

      // 更新本地登录态
      setLoginState(state.token, updatedUser);

      // 同步到 localStorage
      if (updatedUser.phone) {
        localStorage.setItem(`yandao_user_${updatedUser.phone}`, JSON.stringify(updatedUser));
      }
      if (updatedUser.email) {
        const emailKey = updatedUser.email.replace(/[^a-zA-Z0-9]/g, '_');
        localStorage.setItem(`yandao_email_${emailKey}`, JSON.stringify(updatedUser));
      }

      return { success: true, message: '保存成功', user: updatedUser };
    }

    // 后端返回业务错误
    if (data.success === false) {
      // 401 表示登录已过期
      if (res.status === 401) {
        clearLoginState();
        clearAllTokens();
      }
      return { success: false, message: data.message || '保存失败' };
    }

    return { success: false, message: '保存失败' };
  } catch (err: any) {
    console.error('[PROFILE_UPDATE] 请求失败:', err);
    return { success: false, message: '网络异常，请稍后重试' };
  }
}

// ============================================================================
// v21.0: 从后端获取用户资料（用于页面加载时同步最新数据）
// ============================================================================

export async function fetchProfileFromServer(): Promise<{ success: boolean; user?: UserProfile; message?: string }> {
  const state = getLoginState();
  if (!state.isLoggedIn || !state.token) {
    return { success: false, message: '未登录' };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${state.token}`,
      },
      credentials: 'include',
    });
    const data = await res.json();

    if (data.success && data.data) {
      const backendUser = data.data;
      const user: UserProfile = {
        userId: String(backendUser.userId),
        nickname: backendUser.nickname || '',
        avatar: backendUser.avatar || '',
        bio: backendUser.bio || '',
        gender: (backendUser.gender as any) || undefined,
        birthday: backendUser.birthday || undefined,
        tags: backendUser.tags || [],
        phone: backendUser.phone || state.profile?.phone,
        email: backendUser.email || state.profile?.email,
        memberLevel: backendUser.memberLevel || 'basic',
        membershipExpiry: backendUser.membershipExpiry || null,
        memberTier: backendUser.memberTier || undefined,
        inviteCode: backendUser.inviteCode || state.profile?.inviteCode,
        loginTime: state.profile?.loginTime || Date.now(),
      };

      // 更新本地登录态
      setLoginState(state.token, user);

      return { success: true, user };
    }

    if (res.status === 401) {
      // 登录已过期
      clearLoginState();
      clearAllTokens();
      return { success: false, message: '登录已过期，请重新登录' };
    }

    return { success: false, message: data.message || '获取资料失败' };
  } catch (err: any) {
    console.error('[PROFILE_FETCH] 请求失败:', err);
    return { success: false, message: '网络异常' };
  }
}
