import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isAdmin(req: NextRequest) {
  const password = req.headers.get("x-admin-password");
  return password === process.env.ADMIN_PASSWORD;
}

// 투심 건 상세 조회
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      reviewers: {
        include: { opinion: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(session);
}

// 투심 건 정보 업데이트 (의사록용 상세정보 입력)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const {
    companyName,
    meetingDate,
    meetingTime,
    meetingLocation,
    gpName,
    fundName,
    investmentMethod,
    investmentAmount,
    valuation,
    investmentSource,
    status,
  } = body;

  const session = await prisma.session.update({
    where: { id },
    data: {
      ...(companyName !== undefined && { companyName }),
      ...(meetingDate !== undefined && { meetingDate }),
      ...(meetingTime !== undefined && { meetingTime }),
      ...(meetingLocation !== undefined && { meetingLocation }),
      ...(gpName !== undefined && { gpName }),
      ...(fundName !== undefined && { fundName }),
      ...(investmentMethod !== undefined && { investmentMethod }),
      ...(investmentAmount !== undefined && { investmentAmount }),
      ...(valuation !== undefined && { valuation }),
      ...(investmentSource !== undefined && { investmentSource }),
      ...(status !== undefined && { status }),
    },
  });

  return NextResponse.json(session);
}

// 투심 건 삭제
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.session.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
