import { NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth-server";
import { getClient, updateClient, deleteClient } from "@/lib/db";

// GET /api/clients/:id - 获取单个客户
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getServerUserId();
    const client = getClient(userId, id);
    if (!client) {
      return NextResponse.json(
        { success: false, error: "客户不存在或无权限访问" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, userId, data: client });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message || "获取客户失败" },
      { status: 400 }
    );
  }
}

// PUT /api/clients/:id - 更新客户
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getServerUserId();
    const body = await request.json();
    const client = updateClient(userId, id, body);
    if (!client) {
      return NextResponse.json(
        { success: false, error: "客户不存在或无权限访问" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, userId, data: client });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message || "更新客户失败" },
      { status: 400 }
    );
  }
}

// DELETE /api/clients/:id - 删除客户（级联删除相关记录）
export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getServerUserId();
    const ok = deleteClient(userId, id);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: "客户不存在或无权限访问" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, userId });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message || "删除客户失败" },
      { status: 400 }
    );
  }
}
