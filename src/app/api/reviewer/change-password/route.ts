import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getReviewerFromCookie } from "@/lib/reviewer-auth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const partner = await getReviewerFromCookie();
  if (!partner) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword?.trim()) {
    return NextResponse.json({ error: "현재 비밀번호와 새 비밀번호를 입력해주세요." }, { status: 400 });
  }
  if (newPassword.trim().length < 4) {
    return NextResponse.json({ error: "비밀번호는 4자 이상이어야 합니다." }, { status: 400 });
  }

  const fresh = await prisma.partner.findUnique({ where: { id: partner.id } });
  if (!fresh?.password) return NextResponse.json({ error: "비밀번호 정보를 찾을 수 없습니다." }, { status: 400 });

  const valid = await bcrypt.compare(currentPassword, fresh.password);
  if (!valid) return NextResponse.json({ error: "현재 비밀번호가 올바르지 않습니다." }, { status: 400 });

  const hashed = await bcrypt.hash(newPassword.trim(), 10);
  await prisma.partner.update({ where: { id: partner.id }, data: { password: hashed } });

  return NextResponse.json({ success: true });
}
