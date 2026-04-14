import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { COOKIE_NAME } from "@/lib/reviewer-auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email?.trim() || !password?.trim()) {
      return NextResponse.json({ error: "이메일과 비밀번호를 입력해주세요." }, { status: 400 });
    }

    const partner = await prisma.partner.findUnique({ where: { email: email.trim() } });

    if (!partner) {
      return NextResponse.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
    }

    // 비밀번호 미설정 파트너: 1234로 첫 로그인 시 자동 설정
    if (!partner.password) {
      if (password !== "1234") {
        return NextResponse.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
      }
      const hashed = await bcrypt.hash("1234", 10);
      await prisma.partner.update({ where: { id: partner.id }, data: { password: hashed } });
    } else {
      const valid = await bcrypt.compare(password, partner.password);
      if (!valid) {
        return NextResponse.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
      }
    }

    // 세션 토큰 생성 (7일 유효)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const record = await prisma.reviewerToken.create({
      data: { partnerId: partner.id, expiresAt },
    });

    const res = NextResponse.json({ success: true, name: partner.name });
    res.cookies.set(COOKIE_NAME, record.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });
    return res;
  } catch (err) {
    console.error("[reviewer/login]", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }
}
