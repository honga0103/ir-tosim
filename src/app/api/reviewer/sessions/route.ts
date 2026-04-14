import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getReviewerFromCookie } from "@/lib/reviewer-auth";

export async function GET() {
  const partner = await getReviewerFromCookie();
  if (!partner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 해당 파트너가 참여자로 등록된 모든 세션 조회
  const reviewers = await prisma.reviewer.findMany({
    where: { partnerId: partner.id },
    include: {
      session: true,
      opinion: true,
    },
  });

  // 세션 생성일 최신순 정렬
  reviewers.sort((a, b) => new Date(b.session.createdAt).getTime() - new Date(a.session.createdAt).getTime());

  return NextResponse.json(
    reviewers.map((r) => ({
      reviewerId: r.id,
      token: r.token,
      submittedAt: r.submittedAt,
      session: {
        id: r.session.id,
        companyName: r.session.companyName,
        status: r.session.status,
        createdAt: r.session.createdAt,
      },
      hasOpinion: !!r.opinion,
    }))
  );
}
