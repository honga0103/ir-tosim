import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isAdmin(req: NextRequest) {
  const password = req.headers.get("x-admin-password");
  return password === process.env.ADMIN_PASSWORD;
}

// 투심 결과 공지 텍스트 생성
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId가 필요합니다." }, { status: 400 });
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
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

  const submittedReviewers = session.reviewers.filter((r) => r.opinion != null);
  const yesCount = submittedReviewers.filter((r) => r.opinion!.decision === "YES").length;
  const conditionalCount = submittedReviewers.filter((r) => r.opinion!.decision === "CONDITIONAL").length;
  const noCount = submittedReviewers.filter((r) => r.opinion!.decision === "NO").length;
  const anyNo = noCount > 0;
  const result = anyNo ? "부결" : "가결";

  // date input(YYYY-MM-DD) → 한국어 표시
  const formatDate = (d: string | null) => {
    if (!d) return "";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return `${dt.getFullYear()}년 ${dt.getMonth() + 1}월 ${dt.getDate()}일`;
  };

  // 긍정적 요인 / 리스크 요인 취합 (원문 그대로, 이름 없이)
  const positiveLines: string[] = [];
  const riskLines: string[] = [];
  for (const r of submittedReviewers) {
    if (r.opinion!.positiveFactors?.trim()) {
      positiveLines.push(r.opinion!.positiveFactors.trim());
    }
    if (r.opinion!.riskFactors?.trim()) {
      riskLines.push(r.opinion!.riskFactors.trim());
    }
  }

  const lines = [
    `[${session.companyName} 투자심의위원회 결과 공지]`,
    ``,
    `의결일자: ${formatDate(session.meetingDate)}`,
    `안건: ${session.companyName}에 대한 투자의 건`,
    ``,
    `■ 주요 내용`,
    `- 투자방식: ${session.investmentMethod || ""}`,
    `- 투자금: ${session.investmentAmount || ""}`,
    session.valuation ? `- 밸류에이션: ${session.valuation}` : null,
    `- 투자재원: ${session.investmentSource || ""}`,
    ``,
    `■ 투심 결과`,
    `- 총 투심위원: ${submittedReviewers.length}명`,
    `- 찬성: ${yesCount}명 / 조건부 찬성: ${conditionalCount}명 / 반대: ${noCount}명`,
    ``,
    `■ 의결 결과: ${result}`,
    ...(positiveLines.length > 0
      ? [``, `■ 긍정적 요인`, positiveLines.join(`\n\n`)]
      : []),
    ...(riskLines.length > 0
      ? [``, `■ 리스크 요인`, riskLines.join(`\n\n`)]
      : []),
  ]
    .filter((line) => line !== null)
    .join("\n");

  return NextResponse.json({ text: lines, result });
}
