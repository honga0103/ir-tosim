import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getReviewerFromCookie } from "@/lib/reviewer-auth";
import { Decision } from "@prisma/client";

// 세션별 내 의견서 조회
export async function GET(req: NextRequest) {
  const partner = await getReviewerFromCookie();
  if (!partner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId 필요" }, { status: 400 });

  const reviewer = await prisma.reviewer.findFirst({
    where: { partnerId: partner.id, sessionId },
    include: { opinion: true, session: { select: { companyName: true, status: true } } },
  });

  if (!reviewer) return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });

  return NextResponse.json(reviewer);
}

// 의견서 제출/수정
export async function POST(req: NextRequest) {
  const partner = await getReviewerFromCookie();
  if (!partner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId, positiveFactors, riskFactors, decision, valuationOpinion, appropriateValuation, otherOpinions } =
    await req.json();

  const reviewer = await prisma.reviewer.findFirst({
    where: { partnerId: partner.id, sessionId },
    include: { session: true },
  });

  if (!reviewer) return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
  if (reviewer.session.status !== "OPEN") return NextResponse.json({ error: "제출이 마감되었습니다." }, { status: 400 });
  if (!["YES", "CONDITIONAL", "NO"].includes(decision)) return NextResponse.json({ error: "투자여부 값 오류" }, { status: 400 });

  await prisma.opinion.upsert({
    where: { reviewerId: reviewer.id },
    create: {
      sessionId,
      reviewerId: reviewer.id,
      positiveFactors, riskFactors,
      decision: decision as Decision,
      valuationOpinion,
      appropriateValuation: appropriateValuation || null,
      otherOpinions: otherOpinions || null,
    },
    update: {
      positiveFactors, riskFactors,
      decision: decision as Decision,
      valuationOpinion,
      appropriateValuation: appropriateValuation || null,
      otherOpinions: otherOpinions || null,
    },
  });

  await prisma.reviewer.update({
    where: { id: reviewer.id },
    data: { submittedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
