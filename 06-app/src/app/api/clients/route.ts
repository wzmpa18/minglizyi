import { NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth-server";
import { getClients, createClient } from "@/lib/db";

// GET /api/clients - 获取当前用户的所有客户
export async function GET() {
  try {
    const userId = await getServerUserId();
    const clients = getClients(userId);
    return NextResponse.json({ success: true, userId, data: clients });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message || "获取客户列表失败" },
      { status: 400 }
    );
  }
}

// POST /api/clients - 创建新客户
export async function POST(request: Request) {
  try {
    const userId = await getServerUserId();
    const body = await request.json();
    const client = createClient(userId, body);
    return NextResponse.json({ success: true, userId, data: client });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message || "创建客户失败" },
      { status: 400 }
    );
  }
}
