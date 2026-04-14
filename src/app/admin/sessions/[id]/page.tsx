"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type Reviewer = {
  id: string;
  name: string;
  email: string | null;
  token: string;
  submittedAt: string | null;
  opinion: {
    positiveFactors: string;
    riskFactors: string;
    decision: string;
    valuationOpinion: string;
    appropriateValuation: string | null;
    otherOpinions: string | null;
  } | null;
};

type Session = {
  id: string;
  companyName: string;
  status: string;
  meetingDate: string | null;
  meetingTime: string | null;
  meetingLocation: string | null;
  gpName: string | null;
  fundName: string | null;
  investmentMethod: string | null;
  investmentAmount: string | null;
  valuation: string | null;
  investmentSource: string | null;
  reviewers: Reviewer[];
};

type Partner = { id: string; name: string; email: string | null };

const DECISION_LABEL: Record<string, string> = { YES: "O (찬성)", CONDITIONAL: "조건부 O", NO: "X (반대)" };
const DECISION_COLOR: Record<string, string> = { YES: "text-green-600", CONDITIONAL: "text-yellow-600", NO: "text-red-500" };

const LOCATIONS = ["헤이그라운드 서울숲점 10층 회의실", "헤이그라운드 서울숲점 9층 회의실", "직접 입력"];
const FUND_NAMES = ["디에이치피(DHP)디지털헬스케어1호", "디에이치피(DHP)개인투자조합8호", "직접 입력"];
const INVEST_METHODS = [
  "조건부 지분인수 계약 (SAFE)",
  "보통주 인수",
  "우선주 인수",
  "전환사채 (CB)",
  "신주인수권부사채 (BW)",
  "직접 입력",
];

function SelectOrInput({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const isCustom = value !== "" && !options.slice(0, -1).includes(value);
  const [showCustom, setShowCustom] = useState(isCustom);

  return (
    <div className="space-y-2">
      <select
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#24AF64] bg-white"
        value={showCustom ? "직접 입력" : value}
        onChange={(e) => {
          if (e.target.value === "직접 입력") { setShowCustom(true); onChange(""); }
          else { setShowCustom(false); onChange(e.target.value); }
        }}
      >
        <option value="">선택하세요</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      {showCustom && (
        <input
          type="text"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#24AF64]"
          placeholder={placeholder || "직접 입력"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const password = searchParams.get("pw") || "";

  const [session, setSession] = useState<Session | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "minutes" | "notice">("overview");

  // 참여자 선택 체크박스
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<Set<string>>(new Set());
  const [addingReviewers, setAddingReviewers] = useState(false);

  // 의사록 폼
  const [mf, setMf] = useState({
    meetingDate: "", meetingTime: "", meetingLocation: "",
    gpName: "", fundName: "", investmentMethod: "",
    investmentAmountCurrency: "KRW", investmentAmountValue: "",
    valuation: "", investmentSource: "",
  });
  const [savingMinutes, setSavingMinutes] = useState(false);
  const [minutesLocked, setMinutesLocked] = useState(false);

  // 공지
  const [noticeText, setNoticeText] = useState("");
  const [copied, setCopied] = useState(false);

  // 투심 날짜 잠금
  const [dateLocked, setDateLocked] = useState(false);

  // 미리보기 패널
  const [previewType, setPreviewType] = useState<"opinion" | "minutes" | null>(null);

  async function loadSession() {
    const res = await fetch(`/api/sessions/${id}`, { headers: { "x-admin-password": password } });
    if (res.ok) {
      const data: Session = await res.json();
      setSession(data);

      // 투자금 파싱 (예: "KRW 68,000,000" → currency + value)
      const amtRaw = data.investmentAmount || "";
      const currencyMatch = amtRaw.match(/^(KRW|USD)\s*(.*)$/);
      setMf({
        meetingDate: data.meetingDate || "",
        meetingTime: data.meetingTime || "",
        meetingLocation: data.meetingLocation || "",
        gpName: data.gpName || "",
        fundName: data.fundName || "",
        investmentMethod: data.investmentMethod || "",
        investmentAmountCurrency: currencyMatch ? currencyMatch[1] : "KRW",
        investmentAmountValue: currencyMatch ? currencyMatch[2] : amtRaw,
        valuation: data.valuation || "",
        investmentSource: data.fundName || data.investmentSource || "",
      });
      // 이미 저장된 의사록 정보가 있으면 잠금 상태로 시작
      const hasSavedData = !!(data.meetingDate || data.investmentMethod || data.fundName);
      setMinutesLocked(hasSavedData);
      setDateLocked(!!data.meetingDate);
    }
    setLoading(false);
  }

  async function loadPartners() {
    const res = await fetch("/api/partners", { headers: { "x-admin-password": password } });
    if (res.ok) setPartners(await res.json());
  }

  useEffect(() => { loadSession(); loadPartners(); }, [id]);

  async function addSelectedReviewers() {
    if (selectedPartnerIds.size === 0) return;
    setAddingReviewers(true);
    const selectedPartners = partners.filter((p) => selectedPartnerIds.has(p.id));
    for (const p of selectedPartners) {
      await fetch("/api/reviewers", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ sessionId: id, name: p.name, email: p.email, sendEmail: false, sendSlack: false }),
      });
    }
    setSelectedPartnerIds(new Set());
    await loadSession();
    setAddingReviewers(false);
  }

  async function saveMinutes(e: React.FormEvent) {
    e.preventDefault();
    setSavingMinutes(true);
    const investmentAmount = `${mf.investmentAmountCurrency} ${mf.investmentAmountValue}`.trim();
    await fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({
        meetingDate: mf.meetingDate,
        meetingTime: mf.meetingTime,
        meetingLocation: mf.meetingLocation,
        gpName: mf.gpName,
        fundName: mf.fundName,
        investmentMethod: mf.investmentMethod,
        investmentAmount,
        valuation: mf.valuation || null,
        investmentSource: mf.investmentSource || mf.fundName,
      }),
    });
    setSavingMinutes(false);
    setMinutesLocked(true);
  }

  async function loadNotice() {
    const res = await fetch(`/api/notice?sessionId=${id}`, { headers: { "x-admin-password": password } });
    if (res.ok) { const d = await res.json(); setNoticeText(d.text); }
  }

  function openPreview(type: "opinion" | "minutes") {
    setPreviewType(type);
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 text-sm">불러오는 중...</p>
    </div>
  );
  if (!session) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-red-500 text-sm">세션을 찾을 수 없습니다.</p>
    </div>
  );

  const submitted = session.reviewers.filter((r) => r.submittedAt);
  const pending = session.reviewers.filter((r) => !r.submittedAt);
  const existingNames = new Set(session.reviewers.map((r) => r.name));
  const availablePartners = partners.filter((p) => !existingNames.has(p.name));

  // 날짜 표시용 변환
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  const previewUrl = previewType ? `/print/${previewType}/${id}?pw=${password}` : "";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center gap-4 shrink-0">
        <a href={`/admin`} className="text-gray-400 hover:text-black text-sm transition">← 목록</a>
        <div className="flex-1">
          <h1 className="font-bold text-base">{session.companyName}</h1>
          <p className="text-xs text-gray-400">제출 {submitted.length}/{session.reviewers.length}명</p>
        </div>
      </header>

      {/* 본문: 스플릿 레이아웃 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 왼쪽: 관리 패널 */}
        <div className={`flex flex-col overflow-y-auto transition-all duration-300 ${previewType ? "w-1/2" : "w-full"}`}>
          <div className={`py-8 space-y-5 ${previewType ? "px-5" : "max-w-3xl mx-auto w-full px-6"}`}>

        {/* PDF 버튼 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-3">
          <button
            onClick={() => openPreview("opinion")}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition"
            style={previewType === "opinion"
              ? { background: "#24AF64", color: "white", borderColor: "#24AF64" }
              : { borderColor: "#24AF64", color: "#24AF64" }}
          >
            📄 의견서 수합본
          </button>
          <button
            onClick={() => openPreview("minutes")}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition"
            style={previewType === "minutes"
              ? { background: "#24AF64", color: "white", borderColor: "#24AF64" }
              : { borderColor: "#e5e7eb", color: "#6b7280" }}
          >
            📋 투심의사록
          </button>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 p-1.5">
          {[
            { key: "overview", label: "제출 현황" },
            { key: "minutes", label: "의사록 정보" },
            { key: "notice", label: "공지 텍스트" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => { setActiveTab(t.key as typeof activeTab); if (t.key === "notice") loadNotice(); }}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${
                activeTab === t.key ? "text-white" : "text-gray-500 hover:bg-gray-50"
              }`}
              style={activeTab === t.key ? { background: "#24AF64" } : {}}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 탭 1: 제출 현황 */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* 투심 날짜 빠른 설정 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wide">투심 날짜</h2>
                {dateLocked && (
                  <button
                    type="button"
                    onClick={() => setDateLocked(false)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:border-[#24AF64] hover:text-[#24AF64] transition font-medium"
                  >
                    ✏️ 수정
                  </button>
                )}
              </div>
              {dateLocked ? (
                <div className="text-sm font-medium text-gray-800">
                  {formatDateDisplay(mf.meetingDate)}
                  <p className="text-xs text-gray-400 mt-1">투심의견서 및 투심의사록에 이 날짜로 표시됩니다</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <input
                      type="date"
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#24AF64]"
                      value={mf.meetingDate}
                      onChange={(e) => setMf({ ...mf, meetingDate: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/sessions/${id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json", "x-admin-password": password },
                          body: JSON.stringify({ meetingDate: mf.meetingDate }),
                        });
                        setDateLocked(true);
                      }}
                      disabled={!mf.meetingDate}
                      className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold shrink-0 disabled:opacity-40"
                      style={{ background: "#24AF64" }}
                    >
                      저장
                    </button>
                  </div>
                  {mf.meetingDate && (
                    <p className="text-xs text-gray-400 mt-1.5">→ {formatDateDisplay(mf.meetingDate)}</p>
                  )}
                </>
              )}
            </div>

            {/* 참여자 추가 - 체크박스 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wide mb-4">참여자 선택</h2>
              {availablePartners.length === 0 ? (
                <p className="text-sm text-gray-400">
                  {partners.length === 0
                    ? "등록된 파트너가 없습니다. 파트너 관리에서 먼저 추가해주세요."
                    : "모든 파트너가 이미 참여자로 추가되었습니다."}
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {availablePartners.map((p) => (
                      <label key={p.id} className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-100 hover:border-[#24AF64] hover:bg-green-50 cursor-pointer transition">
                        <input
                          type="checkbox"
                          checked={selectedPartnerIds.has(p.id)}
                          onChange={(e) => {
                            const next = new Set(selectedPartnerIds);
                            e.target.checked ? next.add(p.id) : next.delete(p.id);
                            setSelectedPartnerIds(next);
                          }}
                          className="w-4 h-4 rounded accent-[#24AF64]"
                        />
                        <span className="text-sm font-medium">{p.name}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={addSelectedReviewers}
                    disabled={selectedPartnerIds.size === 0 || addingReviewers}
                    className="w-full py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-40 transition"
                    style={{ background: "#24AF64" }}
                  >
                    {addingReviewers ? "추가 중..." : `선택한 ${selectedPartnerIds.size}명 참여자로 추가`}
                  </button>
                </>
              )}
            </div>

            {/* 제출 완료 */}
            {submitted.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                  <h2 className="font-semibold text-sm">제출 완료</h2>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-medium">{submitted.length}명</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {submitted.map((r) => (
                    <div key={r.id} className="px-5 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">{r.name}</span>
                        <span className={`text-sm font-bold ${DECISION_COLOR[r.opinion!.decision]}`}>
                          {DECISION_LABEL[r.opinion!.decision]}
                        </span>
                      </div>
                      <details className="text-sm">
                        <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">의견 펼치기</summary>
                        <div className="mt-3 space-y-2.5 bg-gray-50 rounded-xl p-4 text-xs text-gray-600">
                          <div><span className="font-semibold text-gray-800">긍정적 요인</span><p className="mt-1 whitespace-pre-wrap">{r.opinion!.positiveFactors}</p></div>
                          <div><span className="font-semibold text-gray-800">리스크 요인</span><p className="mt-1 whitespace-pre-wrap">{r.opinion!.riskFactors}</p></div>
                          <div><span className="font-semibold text-gray-800">밸류에이션 의견</span><p className="mt-1 whitespace-pre-wrap">{r.opinion!.valuationOpinion}</p></div>
                          {r.opinion!.appropriateValuation && <div><span className="font-semibold text-gray-800">적정 밸류에이션</span><p className="mt-1">{r.opinion!.appropriateValuation}</p></div>}
                          {r.opinion!.otherOpinions && <div><span className="font-semibold text-gray-800">기타 의견</span><p className="mt-1 whitespace-pre-wrap">{r.opinion!.otherOpinions}</p></div>}
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 미제출 */}
            {pending.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                  <h2 className="font-semibold text-sm">미제출</h2>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 font-medium">{pending.length}명</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {pending.map((r) => {
                    return (
                      <div key={r.id} className="px-5 py-3.5 flex items-center justify-between">
                        <span className="text-sm font-medium">{r.name}</span>
                        <button
                          onClick={async () => {
                            if (!confirm(`"${r.name}"을 참여자에서 삭제하시겠습니까?`)) return;
                            await fetch(`/api/reviewers/${r.id}`, { method: "DELETE", headers: { "x-admin-password": password } });
                            await loadSession();
                          }}
                          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:border-red-400 hover:text-red-500 transition"
                        >
                          삭제
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 탭 2: 의사록 정보 */}
        {activeTab === "minutes" && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wide">투심의사록 정보</h2>
              {minutesLocked && (
                <button
                  type="button"
                  onClick={() => setMinutesLocked(false)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:border-[#24AF64] hover:text-[#24AF64] transition font-medium"
                >
                  ✏️ 편집
                </button>
              )}
            </div>

            {/* 잠금 상태: 읽기 전용 요약 */}
            {minutesLocked ? (
              <div className="space-y-3">
                {[
                  { label: "의결일자", value: formatDateDisplay(mf.meetingDate) },
                  { label: "일시", value: mf.meetingTime },
                  { label: "장소", value: mf.meetingLocation },
                  { label: "보고자", value: mf.gpName },
                  { label: "펀드명", value: mf.fundName },
                  { label: "투자방식", value: mf.investmentMethod },
                  { label: "투자금", value: `${mf.investmentAmountCurrency} ${mf.investmentAmountValue}`.trim() },
                  { label: "밸류에이션", value: mf.valuation || "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex gap-3 text-sm py-2 border-b border-gray-50 last:border-0">
                    <span className="text-gray-400 w-24 shrink-0">{label}</span>
                    <span className="font-medium text-gray-800">{value || "—"}</span>
                  </div>
                ))}
              </div>
            ) : (
            <form onSubmit={saveMinutes} className="space-y-4">

              {/* 의결일자 */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">의결일자</label>
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#24AF64]"
                  value={mf.meetingDate}
                  onChange={(e) => setMf({ ...mf, meetingDate: e.target.value })}
                />
                {mf.meetingDate && (
                  <p className="text-xs text-gray-400 mt-1">→ {formatDateDisplay(mf.meetingDate)}</p>
                )}
              </div>

              {/* 일시 */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">일시</label>
                <input
                  type="time"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#24AF64]"
                  value={mf.meetingTime}
                  onChange={(e) => setMf({ ...mf, meetingTime: e.target.value })}
                />
              </div>

              {/* 장소 */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">장소</label>
                <SelectOrInput
                  options={LOCATIONS}
                  value={mf.meetingLocation}
                  onChange={(v) => setMf({ ...mf, meetingLocation: v })}
                  placeholder="장소를 직접 입력하세요"
                />
              </div>

              {/* 보고자 */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">보고자 (GP 대표 이름)</label>
                <input
                  type="text"
                  placeholder="예: 최윤섭"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#24AF64]"
                  value={mf.gpName}
                  onChange={(e) => setMf({ ...mf, gpName: e.target.value })}
                />
              </div>

              {/* 펀드명 */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">펀드명 (투자재원)</label>
                <SelectOrInput
                  options={FUND_NAMES}
                  value={mf.fundName}
                  onChange={(v) => setMf({ ...mf, fundName: v, investmentSource: v })}
                  placeholder="펀드명을 직접 입력하세요"
                />
              </div>

              {/* 투자방식 */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">투자방식</label>
                <SelectOrInput
                  options={INVEST_METHODS}
                  value={mf.investmentMethod}
                  onChange={(v) => setMf({ ...mf, investmentMethod: v })}
                  placeholder="투자방식을 직접 입력하세요"
                />
              </div>

              {/* 투자금 */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">투자금</label>
                <div className="flex gap-2">
                  <select
                    className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#24AF64] bg-white w-24"
                    value={mf.investmentAmountCurrency}
                    onChange={(e) => setMf({ ...mf, investmentAmountCurrency: e.target.value })}
                  >
                    <option value="KRW">KRW</option>
                    <option value="USD">USD</option>
                  </select>
                  <input
                    type="text"
                    placeholder="예: 68,000,000"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#24AF64]"
                    value={mf.investmentAmountValue}
                    onChange={(e) => setMf({ ...mf, investmentAmountValue: e.target.value })}
                  />
                </div>
              </div>

              {/* 밸류에이션 */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">밸류에이션 <span className="text-gray-300 font-normal">(선택)</span></label>
                <input
                  type="text"
                  placeholder="예: $11,268,000 또는 120억원"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#24AF64]"
                  value={mf.valuation}
                  onChange={(e) => setMf({ ...mf, valuation: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={savingMinutes}
                className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition"
                style={{ background: "#24AF64" }}
              >
                {savingMinutes ? "저장 중..." : "저장"}
              </button>
            </form>
            )}{/* end minutesLocked conditional */}
          </div>
        )}

        {/* 탭 3: 공지 텍스트 */}
        {activeTab === "notice" && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wide">공지 텍스트</h2>
              <button
                onClick={async () => { await navigator.clipboard.writeText(noticeText); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold transition"
                style={copied ? { background: "#24AF64", color: "white" } : { background: "#f3f4f6", color: "#374151" }}
              >
                {copied ? "✓ 복사됨" : "복사"}
              </button>
            </div>
            {noticeText ? (
              <textarea
                readOnly
                rows={14}
                className="w-full border border-gray-100 rounded-xl p-4 text-sm font-mono bg-gray-50 resize-none focus:outline-none"
                value={noticeText}
              />
            ) : (
              <p className="text-gray-400 text-sm text-center py-10">의사록 정보를 저장하면 공지 텍스트가 생성됩니다.</p>
            )}
          </div>
        )}
          </div>{/* end inner div */}
        </div>{/* end left panel */}

        {/* 오른쪽: 미리보기 패널 */}
        {previewType && (
          <div className="w-1/2 flex flex-col border-l border-gray-200 bg-white">
            {/* 미리보기 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
              <span className="text-sm font-semibold text-gray-600">
                {previewType === "opinion" ? "📄 의견서 수합본 미리보기" : "📋 투심의사록 미리보기"}
              </span>
              <div className="flex gap-2 items-center">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:border-[#24AF64] hover:text-[#24AF64] transition"
                >
                  새 탭에서 열기
                </a>
                <button
                  onClick={() => setPreviewType(null)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition"
                >
                  닫기 ✕
                </button>
              </div>
            </div>
            {/* iframe */}
            <iframe
              key={previewUrl}
              src={previewUrl}
              className="flex-1 w-full"
              style={{ border: "none" }}
              title="문서 미리보기"
            />
          </div>
        )}
      </div>{/* end flex */}
    </div>
  );
}
