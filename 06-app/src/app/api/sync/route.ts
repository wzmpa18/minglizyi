import { NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth-server";
import { bulkImport, getClients, getRecords } from "@/lib/db";

/**
 * POST /api/sync - 本地数据迁移到云端
 * 首次升级时，前端将localStorage数据批量上传
 */
export async function POST(request: Request) {
  try {
    const userId = await getServerUserId();
    const body = await request.json();
    const { clients = [], records = [] } = body;

    // 过滤掉已带userId的（防止越权）
    const cleanClients = clients.map((c: any) => {
      const { userId: _, ...rest } = c;
      return rest;
    });
    const cleanRecords = records.map((r: any) => {
      const { userId: _, ...rest } = r;
      return rest;
    });

    const result = bulkImport(userId, cleanClients, cleanRecords);

    // 返回云端全量数据用于前端缓存刷新
    const cloudClients = getClients(userId);
    const cloudRecords = getRecords(userId);

    return NextResponse.json({
      success: true,
      userId,
      migrated: result,
      data: { clients: cloudClients, records: cloudRecords },
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message || "数据同步失败" },
      { status: 400 }
    );
  }
}

/**
 * GET /api/sync - 获取云端全量数据（用于前端缓存刷新）
 */
export async function GET() {
  try {
    const userId = await getServerUserId();
    const clients = getClients(userId);
    const records = getRecords(userId);
    return NextResponse.json({
      success: true,
      userId,
      data: { clients, records },
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message || "获取云端数据失败" },
      { status: 400 }
    );
  }
}
