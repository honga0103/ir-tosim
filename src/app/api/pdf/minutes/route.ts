import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBrowser } from "@/lib/browser";

function isAdmin(req: NextRequest) {
  const password = req.headers.get("x-admin-password");
  return password === process.env.ADMIN_PASSWORD;
}

const DECISION_LABEL: Record<string, string> = {
  YES: "찬성",
  CONDITIONAL: "조건부 찬성",
  NO: "반대",
};

// 투심의사록 PDF 생성
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
  const anyNo = submittedReviewers.some((r) => r.opinion!.decision === "NO");
  const result = anyNo ? "부결" : "가결";

  const reviewerRows = submittedReviewers
    .map(
      (r) => `
    <tr>
      <td style="text-align:center; padding: 8px;">${r.name}</td>
      <td style="text-align:center; padding: 8px;">${DECISION_LABEL[r.opinion!.decision]}</td>
    </tr>
  `
    )
    .join("");

  // 주요내용 구성
  const mainContentRows = [
    `1. 투자방식: ${session.investmentMethod || ""}`,
    `2. 투자금: ${session.investmentAmount || ""}${session.valuation ? `\n    A. 밸류에이션: ${session.valuation}` : ""}`,
    `3. 투자재원: ${session.investmentSource || ""}`,
  ];

  const mainContentHtml = mainContentRows
    .map((row) => `<div style="margin-bottom: 6px; white-space: pre-line;">${row}</div>`)
    .join("");

  const html = `
  <!DOCTYPE html>
  <html lang="ko">
  <head>
    <meta charset="UTF-8"/>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; font-size: 13px; color: #111; }
      .page { width: 210mm; min-height: 297mm; padding: 20mm; }
      h1 { text-align: center; font-size: 22px; font-weight: bold; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; }
      td, th { border: 1px solid #333; padding: 10px 14px; vertical-align: top; }
      .label { background-color: #d0d0d0; font-weight: bold; text-align: center; width: 100px; white-space: nowrap; }
      .result-row td { font-weight: bold; font-size: 15px; text-align: center; }
      .footer { margin-top: 16px; line-height: 1.8; font-size: 13px; }
      .reviewer-table { width: 80%; margin: 0 auto; border-collapse: collapse; }
      .reviewer-table th { background-color: #d0d0d0; text-align: center; padding: 8px; border: 1px solid #333; }
      .reviewer-table td { border: 1px solid #333; }
    </style>
  </head>
  <body>
    <div class="page">
      <h1>투자심의위원회 의사록</h1>
      <table>
        <tr>
          <td class="label">안 건 명</td>
          <td colspan="3">${session.companyName}에 대한 투자의 건</td>
        </tr>
        <tr>
          <td class="label">의 결 일 자</td>
          <td>${session.meetingDate || ""}</td>
          <td class="label" style="width:60px;">일 시</td>
          <td>${session.meetingTime || ""}</td>
        </tr>
        <tr>
          <td class="label">장 소</td>
          <td colspan="3">${session.meetingLocation || ""}</td>
        </tr>
        <tr>
          <td class="label">주요<br/>내용</td>
          <td colspan="3">${mainContentHtml}</td>
        </tr>
        <tr>
          <td class="label">의<br/>사<br/>록</td>
          <td colspan="3">
            <p style="margin-bottom: 16px;">
              ${session.fundName || ""}의 업무집행조합원 (주)디지털헬스케어파트너스 대표
              ${session.gpName || ""}은 ${session.companyName}의 투자 건을 보고함.
            </p>
            <table class="reviewer-table">
              <thead>
                <tr>
                  <th>투심위원</th>
                  <th>찬반</th>
                </tr>
              </thead>
              <tbody>
                ${reviewerRows}
              </tbody>
            </table>
            <table style="width:80%; margin: 0 auto; border-collapse: collapse; margin-top: 0;">
              <tr class="result-row">
                <td style="border: 2px solid #333; text-align:center; padding: 10px; width: 50%;">의 결 결 과</td>
                <td style="border: 2px solid #333; text-align:center; padding: 10px; font-weight: bold;">${result}</td>
              </tr>
            </table>
            <p class="footer" style="margin-top: 16px;">
              위와 같이 투자심의운영위원회의 협의를 통하여 본 투자심의위원회 안건이 원안대로 승인 ${result}됨. (이상)
            </p>
          </td>
        </tr>
      </table>
    </div>
  </body>
  </html>
  `;

  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });
  await browser.close();

  return new NextResponse(Buffer.from(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(session.companyName)}_투심의사록.pdf"`,
    },
  });
}
