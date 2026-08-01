import { NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth-server";
import { getRecords, createRecord } from "@/lib/db";

// GET /api/records?clientId=xxx&type=xxx - 获取排盘记录
export async function GET(request: Request) {
  try {
    const userId = await getServerUserId();
    const url = new URL(request.url);
    const clientId = url.searchParams.get("clientId") || undefined;
    const type = url.searchParams.get("type") || undefined;
    const records = getRecords(userId, clientId, type);
    return NextResponse.json({ success: true, userId, data: records });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message || "获取记录失败" },
      { status: 400 }
    );
  }
}

// POST /api/records - 保存排盘记录
export async function POST(request: Request) {
  try {
    const userId = await getServerUserId();
    const body = await request.json();
    const record = createRecord(userId, body);
    return NextResponse.json({ success: true, userId, data: record });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message || "保存记录失败" },
      { status: 400 }
    );
  }
}
