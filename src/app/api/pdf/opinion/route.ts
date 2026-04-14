import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sealSvgToDataUrl } from "@/lib/seal";
import { getBrowser } from "@/lib/browser";

function isAdmin(req: NextRequest) {
  const password = req.headers.get("x-admin-password");
  return password === process.env.ADMIN_PASSWORD;
}

const DECISION_LABEL: Record<string, string> = {
  YES: "O",
  CONDITIONAL: "조건부 O",
  NO: "X",
};

// 수합본 PDF용 HTML 생성 (Puppeteer가 렌더링)
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

  if (submittedReviewers.length === 0) {
    return NextResponse.json({ error: "제출된 의견서가 없습니다." }, { status: 400 });
  }

  // 각 의견서 HTML 생성
  const pages = submittedReviewers.map((reviewer) => {
    const opinion = reviewer.opinion!;
    const sealDataUrl = sealSvgToDataUrl(reviewer.name);
    const dateStr = (() => {
      const md = session.meetingDate;
      if (md) { const [y, m, d] = md.split("-"); return `${y}년 ${Number(m)}월 ${Number(d)}일`; }
      const today = new Date(); return `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
    })();

    return `
    <div class="page">
      <div class="header">
        <div class="company-name">${session.companyName}</div>
        <div class="doc-title">투심 의견서</div>
      </div>
      <div class="date">${dateStr}</div>

      <div class="name-row">
        <span class="name-label">성명: </span>
        <span class="name-value">${reviewer.name}</span>
        <img class="seal" src="${sealDataUrl}" alt="도장" />
      </div>

      <div class="section">
        <div class="section-title">1. 평가 의견</div>
        <div class="sub-section">
          <div class="sub-title">1.1 긍정적 요인</div>
          <div class="content">${opinion.positiveFactors.replace(/\n/g, "<br/>")}</div>
        </div>
        <div class="sub-section">
          <div class="sub-title">1.2 리스크 요인</div>
          <div class="content">${opinion.riskFactors.replace(/\n/g, "<br/>")}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">2. 투자 여부 (O, 조건부 O, X)</div>
        <div class="content decision">${DECISION_LABEL[opinion.decision]}</div>
      </div>

      <div class="section">
        <div class="section-title">3. 밸류에이션</div>
        <div class="sub-section">
          <div class="sub-title">a. 밸류에이션에 대한 의견</div>
          <div class="content">${opinion.valuationOpinion.replace(/\n/g, "<br/>")}</div>
        </div>
        <div class="sub-section">
          <div class="sub-title">b. 적정 밸류에이션에 대한 의견이 있으시다면</div>
          <div class="content">${opinion.appropriateValuation?.replace(/\n/g, "<br/>") || "&nbsp;"}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">4. 기타 의견</div>
        <div class="content">${opinion.otherOpinions?.replace(/\n/g, "<br/>") || "&nbsp;"}</div>
      </div>
    </div>
    `;
  });

  const html = `
  <!DOCTYPE html>
  <html lang="ko">
  <head>
    <meta charset="UTF-8"/>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; font-size: 13px; color: #111; }
      .page {
        width: 210mm;
        min-height: 297mm;
        padding: 25mm 20mm;
        page-break-after: always;
        position: relative;
      }
      .header { text-align: center; margin-bottom: 8px; }
      .company-name { font-size: 22px; font-weight: bold; margin-bottom: 4px; }
      .doc-title { font-size: 18px; font-weight: bold; text-decoration: underline; text-decoration-color: #CC0000; text-underline-offset: 4px; }
      .date { text-align: right; margin: 16px 0; font-size: 13px; }
      .name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; font-size: 14px; }
      .name-label { font-weight: bold; }
      .name-value { min-width: 80px; border-bottom: 1px solid #333; padding-bottom: 2px; }
      .seal { width: 72px; height: 72px; }
      .section { margin-bottom: 20px; }
      .section-title { font-size: 14px; font-weight: bold; margin-bottom: 8px; }
      .sub-section { margin-left: 12px; margin-bottom: 12px; }
      .sub-title { font-weight: bold; margin-bottom: 4px; }
      .content { margin-left: 8px; line-height: 1.7; min-height: 40px; }
      .decision { font-size: 16px; font-weight: bold; }
    </style>
  </head>
  <body>
    ${pages.join("")}
  </body>
  </html>
  `;

  // Puppeteer로 PDF 생성
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
      "Content-Disposition": `attachment; filename="${encodeURIComponent(session.companyName)}_투심의견서_수합본.pdf"`,
    },
  });
}
