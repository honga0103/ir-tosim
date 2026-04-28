import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sealSvgToDataUrl } from "@/lib/seal";
import { notFound } from "next/navigation";
import { PrintButton } from "@/app/print/PrintButton";
import { COOKIE_NAME } from "@/lib/reviewer-auth";

const DECISION_LABEL: Record<string, string> = { YES: "O", CONDITIONAL: "조건부 O", NO: "X" };

export default async function MyOpinionPrintPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return notFound();

  const tokenRecord = await prisma.reviewerToken.findUnique({
    where: { token },
    include: { partner: true },
  });
  if (!tokenRecord || tokenRecord.expiresAt < new Date()) return notFound();

  const reviewer = await prisma.reviewer.findFirst({
    where: { partnerId: tokenRecord.partner.id, sessionId },
    include: { opinion: true, session: true, partner: true },
  });

  if (!reviewer || !reviewer.opinion) return notFound();

  const opinion = reviewer.opinion;
  const seal = reviewer.partner?.sealImage ?? sealSvgToDataUrl(reviewer.name);
  const dateStr = (() => {
    const md = reviewer.session.meetingDate;
    if (md) { const [y, m, d] = md.split("-"); return `${y}년 ${Number(m)}월 ${Number(d)}일`; }
    const today = new Date();
    return `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
  })();

  return (
    <html lang="ko">
      <head>
        <meta charSet="UTF-8" />
        <title>{reviewer.session.companyName} 투심의견서</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; font-size: 13px; color: #111; background: white; }
          .page { width: 210mm; min-height: 297mm; padding: 22mm 20mm; }
          .header { text-align: center; margin-bottom: 10px; }
          .company { font-size: 20px; font-weight: 700; }
          .doc-title { font-size: 20px; font-weight: 700; margin-top: 4px; }
          .date { text-align: right; margin: 14px 0 20px; font-size: 13px; color: #444; }
          .name-row { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; font-size: 14px; }
          .name-label { font-weight: 700; }
          .name-value { min-width: 90px; border-bottom: 1.5px solid #333; padding-bottom: 2px; padding-left: 4px; }
          .seal { width: 72px; height: 72px; }
          .section { margin-bottom: 22px; }
          .section-title { font-size: 14px; font-weight: 700; margin-bottom: 8px; }
          .sub-section { margin-left: 12px; margin-bottom: 12px; }
          .sub-title { font-weight: 600; margin-bottom: 4px; font-size: 13px; }
          .content { margin-left: 8px; line-height: 1.8; min-height: 36px; font-size: 13px; white-space: pre-wrap; }
          .decision { font-size: 16px; font-weight: 700; }
          .divider { border: none; border-top: 1px solid #e0e0e0; margin: 6px 0 16px; }
          .print-bar { position: fixed; top: 0; left: 0; right: 0; background: #111; color: white; padding: 10px 20px; display: flex; align-items: center; gap: 12px; z-index: 100; font-size: 14px; }
          .print-wrap { margin-top: 48px; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .print-bar { display: none; }
            .print-wrap { margin-top: 0; }
          }
        `}</style>
      </head>
      <body>
        <div className="print-bar">
          <span>📄 {reviewer.session.companyName} 투심의견서 — {reviewer.name}</span>
          <PrintButton label="저장 / 인쇄" />
        </div>
        <div className="print-wrap">
          <div className="page">
            <div className="header">
              <div className="company">{reviewer.session.companyName}</div>
              <div className="doc-title">투심의견서</div>
            </div>
            <div className="date">{dateStr}</div>
            <div className="name-row">
              <span className="name-label">성명:</span>
              <span className="name-value">{reviewer.name}</span>
              <img className="seal" src={seal} alt="도장" />
            </div>
            <hr className="divider" />

            <div className="section">
              <div className="section-title">1. 평가 의견</div>
              <div className="sub-section">
                <div className="sub-title">1.1 긍정적 요인</div>
                <div className="content">{opinion.positiveFactors}</div>
              </div>
              <div className="sub-section">
                <div className="sub-title">1.2 리스크 요인</div>
                <div className="content">{opinion.riskFactors}</div>
              </div>
            </div>

            <div className="section">
              <div className="section-title">2. 투자 여부 (O, 조건부 O, X)</div>
              <div className="content decision" style={{ marginLeft: "8px" }}>{DECISION_LABEL[opinion.decision]}</div>
            </div>

            <div className="section">
              <div className="section-title">3. 밸류에이션</div>
              <div className="sub-section">
                <div className="sub-title">a. 밸류에이션에 대한 의견</div>
                <div className="content">{opinion.valuationOpinion}</div>
              </div>
              <div className="sub-section">
                <div className="sub-title">b. 적정 밸류에이션에 대한 의견이 있으시다면</div>
                <div className="content">{opinion.appropriateValuation || " "}</div>
              </div>
            </div>

            <div className="section">
              <div className="section-title">4. 기타 의견</div>
              <div className="content">{opinion.otherOpinions || " "}</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
