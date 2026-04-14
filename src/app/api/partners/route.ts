import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

function isAdmin(req: NextRequest) {
  return req.headers.get("x-admin-password") === process.env.ADMIN_PASSWORD;
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const partners = await prisma.partner.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(partners.map((p) => ({ ...p, password: undefined, hasPassword: !!p.password })));
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, email } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
  // 기본 비밀번호 1234 설정
  const defaultPassword = await bcrypt.hash("1234", 10);
  const partner = await prisma.partner.create({
    data: { name: name.trim(), email: email?.trim() || null, password: defaultPassword },
  });
  return NextResponse.json({ ...partner, password: undefined, hasPassword: true }, { status: 201 });
}
