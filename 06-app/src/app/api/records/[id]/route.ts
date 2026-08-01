import { NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth-server";
import { getRecord, updateRecord, deleteRecord } from "@/lib/db";

// GET /api/records/:id - 获取单条记录
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getServerUserId();
    const record = getRecord(userId, id);
    if (!record) {
      return NextResponse.json(
        { success: false, error: "记录不存在或无权限访问" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, userId, data: record });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message || "获取记录失败" },
      { status: 400 }
    );
  }
}

// PUT /api/records/:id - 更新记录（断语、状态等）
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getServerUserId();
    const body = await request.json();
    const record = updateRecord(userId, id, body);
    if (!record) {
      return NextResponse.json(
        { success: false, error: "记录不存在或无权限访问" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, userId, data: record });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message || "更新记录失败" },
      { status: 400 }
    );
  }
}

// DELETE /api/records/:id - 删除记录
export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getServerUserId();
    const ok = deleteRecord(userId, id);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: "记录不存在或无权限访问" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, userId });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message || "删除记录失败" },
      { status: 400 }
    );
  }
}
