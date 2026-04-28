import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// 토큰 유효성 확인 (GET)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ valid: false });

  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record) return NextResponse.json({ valid: false });
  if (record.usedAt) return NextResponse.json({ valid: false, reason: "used" });
  if (record.expiresAt < new Date()) return NextResponse.json({ valid: false, reason: "expired" });

  return NextResponse.json({ valid: true });
}

// 비밀번호 재설정 (POST)
export async function POST(req: NextRequest) {
  const { token, newPassword } = await req.json();

  if (!token || !newPassword) {
    return NextResponse.json({ error: "필수 값이 누락되었습니다." }, { status: 400 });
  }
  if (newPassword.length < 4) {
    return NextResponse.json({ error: "비밀번호는 4자 이상이어야 합니다." }, { status: 400 });
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { partner: true },
  });

  if (!record) return NextResponse.json({ error: "유효하지 않은 링크입니다." }, { status: 400 });
  if (record.usedAt) return NextResponse.json({ error: "이미 사용된 링크입니다." }, { status: 400 });
  if (record.expiresAt < new Date()) return NextResponse.json({ error: "링크가 만료되었습니다. 다시 요청해주세요." }, { status: 400 });

  const hashed = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.partner.update({
      where: { id: record.partnerId },
      data: { password: hashed },
    }),
    prisma.passwordResetToken.update({
      where: { token },
      data: { usedAt: new Date() },
    }),
    // 기존 로그인 세션 모두 무효화
    prisma.reviewerToken.deleteMany({
      where: { partnerId: record.partnerId },
    }),
  ]);

  return NextResponse.json({ success: true });
}
