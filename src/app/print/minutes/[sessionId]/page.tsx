import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PrintButton } from "@/app/print/PrintButton";

export const dynamic = "force-dynamic";

const DECISION_LABEL: Record<string, string> = {
  YES: "찬성",
  CONDITIONAL: "조건부 찬성",
  NO: "반대",
};

export default async function PrintMinutesPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ pw?: string }>;
}) {
  const { sessionId } = await params;
  const { pw } = await searchParams;

  if (pw !== process.env.ADMIN_PASSWORD) return notFound();

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      reviewers: {
        include: { opinion: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!session) return notFound();

  const submitted = session.reviewers.filter((r) => r.opinion != null);

  const formatDate = (d: string | null) => {
    if (!d) return "";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return `${dt.getFullYear()}년 ${dt.getMonth() + 1}월 ${dt.getDate()}일`;
  };

  const formatTime = (t: string | null) => {
    if (!t) return "";
    const [h, m] = t.split(":");
    const hour = parseInt(h);
    const ampm = hour < 12 ? "AM" : "PM";
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${h12}:${m}${ampm}`;
  };
  const anyNo = submitted.some((r) => r.opinion!.decision === "NO");
  const result = anyNo ? "부결" : "가결";

  const mainContent = [
    { label: "투자방식", value: session.investmentMethod },
    { label: "투자금", value: session.investmentAmount },
    ...(session.valuation ? [{ label: "밸류에이션", value: session.valuation, indent: true }] : []),
    { label: "투자재원", value: session.investmentSource },
  ];

  return (
    <html lang="ko">
      <head>
        <meta charSet="UTF-8" />
        <title>{session.companyName} 투자심의위원회 의사록</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; font-size: 13px; color: #111; background: white; }
          .page { width: 210mm; min-height: 297mm; padding: 20mm; }
          h1 { text-align: center; font-size: 20px; font-weight: 700; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; }
          td, th { border: 1px solid #555; padding: 10px 14px; vertical-align: top; }
          .label { background: #d8d8d8; font-weight: 700; text-align: center; width: 90px; white-space: nowrap; vertical-align: middle; }
          .sub-label { background: #e8e8e8; font-weight: 600; text-align: center; white-space: nowrap; }
          .reviewer-table { width: 75%; margin: 16px auto 0; border-collapse: collapse; }
          .reviewer-table th { background: #d8d8d8; text-align: center; padding: 8px; border: 1px solid #555; font-weight: 600; }
          .reviewer-table td { border: 1px solid #555; text-align: center; padding: 8px; }
          .result-row { border: 2px solid #333; }
          .result-row td { text-align: center; font-weight: 700; font-size: 15px; padding: 10px; border: 1px solid #555; }
          .footer-text { margin-top: 14px; line-height: 1.8; font-size: 13px; }
          .content-list { line-height: 2; }
          .content-item { display: flex; gap: 8px; }
          .content-item.indent { padding-left: 20px; }
          .print-bar { position: fixed; top: 0; left: 0; right: 0; background: #111; color: white; padding: 10px 20px; display: flex; align-items: center; gap: 12px; z-index: 100; font-size: 14px; }
          .print-btn { background: #24AF64; color: white; border: none; padding: 6px 16px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; }
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
          <span>📋 {session.companyName} 투자심의위원회 의사록</span>
          <PrintButton label="저장 / 인쇄" />
        </div>
        <div className="print-wrap">
          <div className="page">
            <h1>투자심의위원회 의사록</h1>
            <table>
              <tbody>
                <tr>
                  <td className="label">안 건 명</td>
                  <td colSpan={3} style={{ fontWeight: 600 }}>{session.companyName}에 대한 투자의 건</td>
                </tr>
                <tr>
                  <td className="label">의 결 일 자</td>
                  <td>{formatDate(session.meetingDate)}</td>
                  <td className="sub-label" style={{ width: "60px" }}>일 시</td>
                  <td>{formatTime(session.meetingTime)}</td>
                </tr>
                <tr>
                  <td className="label">장 소</td>
                  <td colSpan={3}>{session.meetingLocation || ""}</td>
                </tr>
                <tr>
                  <td className="label" style={{ verticalAlign: "top", paddingTop: "12px" }}>주요<br/>내용</td>
                  <td colSpan={3}>
                    <div className="content-list">
                      {mainContent.map((item, i) => (
                        <div key={i} className={`content-item${item.indent ? " indent" : ""}`}>
                          <span>{item.indent ? "A." : `${i + 1}.`}</span>
                          <span><strong>{item.label}:</strong> {item.value || ""}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="label" style={{ verticalAlign: "top", paddingTop: "12px" }}>의<br/>사<br/>록</td>
                  <td colSpan={3}>
                    <p style={{ marginBottom: "16px", lineHeight: "1.8" }}>
                      {session.fundName || ""}의 업무집행조합원 (주)디지털헬스케어파트너스 대표{" "}
                      {session.gpName || ""}은 {session.companyName}의 투자 건을 보고함.
                    </p>
                    <table className="reviewer-table">
                      <thead>
                        <tr>
                          <th>투심위원</th>
                          <th>찬반</th>
                        </tr>
                      </thead>
                      <tbody>
                        {submitted.map((r) => (
                          <tr key={r.id}>
                            <td>{r.name}</td>
                            <td>{DECISION_LABEL[r.opinion!.decision]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <table className="reviewer-table" style={{ marginTop: 0 }}>
                      <tbody>
                        <tr className="result-row">
                          <td style={{ width: "50%" }}>의 결 결 과</td>
                          <td style={{ fontWeight: 700 }}>{result}</td>
                        </tr>
                      </tbody>
                    </table>
                    <p className="footer-text">
                      위와 같이 투자심의운영위원회의 협의를 통하여 본 투자심의위원회 안건이 원안대로 승인 {result}됨. (이상)
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </body>
    </html>
  );
}
