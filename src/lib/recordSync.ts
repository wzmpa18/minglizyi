"use client";

/**
 * 排盘记录后端同步工具 (v21.4)
 * v21.4: 修复 token 读取键错误 - 使用 getUserToken() 统一读取
 * 
 * 功能：将排盘记录同步到后端服务器，支持跨设备查看历史记录
 * 依赖：用户需登录，否则仅保存到 localStorage
 */

import { getUserToken } from "./auth";
import { getMembershipStatus } from "./membershipStore";

const API_BASE_URL = "https://yandaoguoxue.yandao.vip";

function getAccessToken(): string | null {
  return getUserToken();
}

/**
 * v25.0.77: 云端同步为会员权益——非会员（含未登录）仅本地保存。
 * 用 getUserToken（含sessionStorage登录模式）+ getMembershipStatus（统一处理
 * 档位/到期降级/超管账号），避免 aiService.getUserPermissionLevel 漏判
 * 「不记住登录」的会员。所有云端同步入口统一走此判定。
 */
export function canCloudSyncRecords(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (!getUserToken()) return false;
    return getMembershipStatus().level !== "basic";
  } catch {
    return false;
  }
}

/**
 * 检查用户是否已登录
 */
export function isLoggedIn(): boolean {
  return getAccessToken() !== null;
}

/**
 * 同步排盘记录到后端服务器
 * @param recordType 记录类型 (name, qiming, bazi, ziwei, etc.)
 * @param recordData 记录数据 (任意可序列化对象)
 * @param note 备注
 * @returns 是否同步成功
 */
export async function syncRecordToBackend(
  recordType: string,
  recordData: unknown,
  note?: string
): Promise<boolean> {
  try {
    const token = getAccessToken();
    if (!token) {
      // 未登录，不同步到后端
      return false;
    }
    // v25.0.77: 非会员仅本地保存（记录仍在离线队列，升级会员后自动补传）
    if (!canCloudSyncRecords()) {
      return false;
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/records/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        record_type: recordType,
        record_data: recordData,
        note: note || "",
      }),
    });

    if (!response.ok) {
      console.warn(`[recordSync] 同步记录失败: HTTP ${response.status}`);
      return false;
    }

    const result = await response.json();
    if (result.success) {
      return true;
    } else {
      console.warn(`[recordSync] 同步记录失败: ${result.message}`);
      return false;
    }
  } catch (error) {
    console.warn("[recordSync] 同步记录异常:", error);
    return false;
  }
}

/**
 * 从后端获取用户排盘记录列表
 * @param recordType 可选，按类型筛选
 * @returns 记录数组
 */
export async function fetchRecordsFromBackend(
  recordType?: string
): Promise<Array<{
  id: number;
  record_type: string;
  record_data: unknown;
  note: string;
  status: string;
  created_at: string;
}>> {
  try {
    const token = getAccessToken();
    if (!token) return [];

    const url = recordType
      ? `${API_BASE_URL}/api/auth/records/list?type=${encodeURIComponent(recordType)}`
      : `${API_BASE_URL}/api/auth/records/list`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return [];

    const result = await response.json();
    if (result.success && result.data?.records) {
      return result.data.records;
    }
    return [];
  } catch (error) {
    console.warn("[recordSync] 获取记录异常:", error);
    return [];
  }
}

/**
 * 删除后端排盘记录
 * @param recordId 记录ID
 * @returns 是否删除成功
 */
export async function deleteRecordFromBackend(recordId: number): Promise<boolean> {
  try {
    const token = getAccessToken();
    if (!token) return false;

    const response = await fetch(`${API_BASE_URL}/api/auth/records/${recordId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return false;

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.warn("[recordSync] 删除记录异常:", error);
    return false;
  }
}