import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 관리자 인증 확인
function isAdmin(req: NextRequest) {
  const password = req.headers.get("x-admin-password");
  return password === process.env.ADMIN_PASSWORD;
}

// 투심 건 목록 조회
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await prisma.session.findMany({
    include: {
      reviewers: { select: { id: true, name: true, submittedAt: true } },
      _count: { select: { opinions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(sessions);
}

// 새 투심 건 생성
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { companyName } = body;

  if (!companyName?.trim()) {
    return NextResponse.json({ error: "회사명을 입력해주세요." }, { status: 400 });
  }

  const session = await prisma.session.create({
    data: { companyName: companyName.trim() },
  });

  return NextResponse.json(session, { status: 201 });
}
