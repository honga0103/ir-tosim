import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

function isAdmin(req: NextRequest) {
  return req.headers.get("x-admin-password") === process.env.ADMIN_PASSWORD;
}

// 비밀번호 설정/변경
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { password } = await req.json();
  if (!password?.trim()) return NextResponse.json({ error: "비밀번호를 입력해주세요." }, { status: 400 });
  const hashed = await bcrypt.hash(password.trim(), 10);
  const partner = await prisma.partner.update({ where: { id }, data: { password: hashed } });
  return NextResponse.json({ id: partner.id, name: partner.name, hasPassword: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.partner.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
