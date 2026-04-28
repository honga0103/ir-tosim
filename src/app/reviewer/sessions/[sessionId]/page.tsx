"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type ReviewerData = {
  id: string;
  name: string;
  token: string;
  submittedAt: string | null;
  session: { companyName: string; status: string; meetingDate: string | null };
  opinion: {
    positiveFactors: string;
    riskFactors: string;
    decision: string;
    valuationOpinion: string;
    appropriateValuation: string | null;
    otherOpinions: string | null;
    sealType: string | null;
  } | null;
};

type SealChoice = "auto" | "registered" | "draw";

const DECISION_OPTIONS = [
  { value: "YES", label: "O  (찬성)" },
  { value: "CONDITIONAL", label: "조건부 O" },
  { value: "NO", label: "X  (반대)" },
];
const DECISION_LABEL: Record<string, string> = { YES: "O (찬성)", CONDITIONAL: "조건부 O", NO: "X (반대)" };
const DECISION_COLOR: Record<string, string> = { YES: "text-green-700", CONDITIONAL: "text-yellow-700", NO: "text-red-600" };

export default function ReviewerSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();

  const [data, setData] = useState<ReviewerData | null>(null);
  const [partnerSealImage, setPartnerSealImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // 임시저장
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 도장 선택
  const [sealChoice, setSealChoice] = useState<SealChoice | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const [canvasEmpty, setCanvasEmpty] = useState(true);

  const [form, setForm] = useState({
    positiveFactors: "",
    riskFactors: "",
    decision: "YES",
    valuationOpinion: "",
    appropriateValuation: "",
    otherOpinions: "",
  });

  const draftKey = `ir-draft-${sessionId}`;

  const dateStr = (() => {
    const md = data?.session.meetingDate;
    if (md) {
      const [y, m, d] = md.split("-");
      return `${y}년 ${Number(m)}월 ${Number(d)}일`;
    }
    const today = new Date();
    return `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
  })();

  async function loadData() {
    const meRes = await fetch("/api/reviewer/me");
    if (!meRes.ok) { router.push("/reviewer/login"); return; }
    const me = await meRes.json();
    setPartnerSealImage(me.sealImage ?? null);

    const res = await fetch(`/api/reviewer/opinions?sessionId=${sessionId}`);
    if (!res.ok) { router.push("/reviewer"); return; }
    const d: ReviewerData = await res.json();
    setData(d);

    if (d.opinion) {
      setForm({
        positiveFactors: d.opinion.positiveFactors,
        riskFactors: d.opinion.riskFactors,
        decision: d.opinion.decision,
        valuationOpinion: d.opinion.valuationOpinion,
        appropriateValuation: d.opinion.appropriateValuation || "",
        otherOpinions: d.opinion.otherOpinions || "",
      });
      // 이전에 선택한 도장 방식 복원
      if (d.opinion.sealType === "AUTO") setSealChoice("auto");
      else if (me.sealImage) setSealChoice("registered");
      else setSealChoice("auto");
    } else {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setForm(parsed);
          setDraftRestored(true);
        } catch { /* 손상된 draft 무시 */ }
      }
      // 기본 도장 선택: 등록된 도장이 있으면 registered, 없으면 auto
      setSealChoice(me.sealImage ? "registered" : "auto");
      setEditing(true);
    }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [sessionId]);

  // 폼 변경 시 자동 임시저장 (1초 디바운스)
  useEffect(() => {
    if (!editing) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify(form));
      setDraftSavedAt(new Date());
    }, 1000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [form, editing]);

  // 수동 임시저장
  function handleManualSave() {
    setManualSaving(true);
    localStorage.setItem(draftKey, JSON.stringify(form));
    setDraftSavedAt(new Date());
    setTimeout(() => setManualSaving(false), 800);
  }

  // ── 캔버스 함수 ──────────────────────────────────────────────
  function getCanvasPos(e: { clientX: number; clientY: number }, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }
  function initCanvas(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#CC0000";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }
  function clearCanvas() {
    const canvas = canvasRef.current;
    if (canvas) initCanvas(canvas);
    setCanvasEmpty(true);
  }
  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current; if (!canvas) return;
    isDrawing.current = true;
    const ctx = canvas.getContext("2d")!;
    const pos = getCanvasPos(e.nativeEvent, canvas);
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
  }
  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const pos = getCanvasPos(e.nativeEvent, canvas);
    ctx.lineTo(pos.x, pos.y); ctx.stroke();
    setCanvasEmpty(false);
  }
  function onMouseUp() { isDrawing.current = false; }
  function onTouchStart(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const canvas = canvasRef.current; if (!canvas) return;
    isDrawing.current = true;
    const ctx = canvas.getContext("2d")!;
    const pos = getCanvasPos(e.touches[0], canvas);
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
  }
  function onTouchMove(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const pos = getCanvasPos(e.touches[0], canvas);
    ctx.lineTo(pos.x, pos.y); ctx.stroke();
    setCanvasEmpty(false);
  }
  function onTouchEnd() { isDrawing.current = false; }
  // ─────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sealChoice) return;
    setSubmitting(true);
    setError("");

    // "직접 그리기" 선택 시 먼저 도장 저장
    if (sealChoice === "draw") {
      const canvas = canvasRef.current;
      if (!canvas || canvasEmpty) { setError("도장을 그려주세요."); setSubmitting(false); return; }
      const sealImage = canvas.toDataURL("image/png");
      const sealRes = await fetch("/api/reviewer/seal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sealImage }),
      });
      if (!sealRes.ok) { setError("도장 저장 실패"); setSubmitting(false); return; }
      setPartnerSealImage(sealImage);
    }

    const sealType = sealChoice === "auto" ? "AUTO" : "CUSTOM";

    const res = await fetch("/api/reviewer/opinions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, ...form, sealType }),
    });
    const result = await res.json();
    if (res.ok) {
      localStorage.removeItem(draftKey);
      setDraftSavedAt(null);
      setDraftRestored(false);
      await loadData();
      setEditing(false);
      alert("제출을 완료했습니다.\n수정을 원하시면 다시 제출해주세요.");
    } else setError(result.error || "제출 실패");
    setSubmitting(false);
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 text-sm">불러오는 중...</p>
    </div>
  );
  if (!data) return null;

  const isClosed = data.session.status !== "OPEN";
  const previewUrl = `/print/my-opinion/${sessionId}`;
  const opinion = data.opinion;
  const display = editing ? form : opinion;
  const canSubmit = sealChoice !== null && (sealChoice !== "draw" || !canvasEmpty);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 px-4 sm:px-8 py-3 sm:py-4 flex items-center gap-3 sm:gap-4 shrink-0">
        <a href="/reviewer" className="text-gray-400 hover:text-black text-sm transition shrink-0">← 목록</a>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-base truncate">{data.session.companyName}</h1>
          <p className="text-xs text-gray-400">투심 의견서</p>
        </div>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="hidden sm:block text-sm px-4 py-2 rounded-xl border-2 font-semibold transition shrink-0"
          style={showPreview
            ? { background: "#24AF64", color: "white", borderColor: "#24AF64" }
            : { borderColor: "#24AF64", color: "#24AF64" }}
        >
          {showPreview ? "미리보기 닫기" : "📄 미리보기"}
        </button>
        <a href={previewUrl} target="_blank" rel="noopener noreferrer"
          className="sm:hidden text-sm px-3 py-2 rounded-xl border-2 font-semibold shrink-0"
          style={{ borderColor: "#24AF64", color: "#24AF64" }}>
          📄
        </a>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className={`overflow-y-auto transition-all duration-300 w-full ${showPreview ? "sm:w-1/2" : ""}`}>
          <div className="py-4 sm:py-8 px-2 sm:px-4 flex justify-center">
            <div className="bg-white shadow-md w-full max-w-2xl" style={{ minHeight: "900px" }}>

              {/* 상태 바 */}
              {opinion && !editing && (
                <div className="flex items-center justify-between px-4 sm:px-8 pt-5 pb-0">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                    ✓ 제출 완료 {data.submittedAt && `· ${new Date(data.submittedAt).toLocaleDateString("ko-KR")}`}
                  </span>
                  {!isClosed && (
                    <button onClick={() => setEditing(true)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:border-[#24AF64] hover:text-[#24AF64] transition">
                      ✏️ 수정
                    </button>
                  )}
                </div>
              )}
              {opinion && editing && (
                <div className="flex items-center justify-between px-4 sm:px-8 pt-5 pb-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">의견서 수정 중</span>
                    {draftSavedAt && (
                      <span className="text-xs text-gray-300">
                        · 임시저장됨 {draftSavedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                  <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600">취소</button>
                </div>
              )}
              {!opinion && editing && draftRestored && (
                <div className="px-4 sm:px-8 pt-5 pb-0">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-600 font-medium">임시저장된 내용을 불러왔습니다</span>
                </div>
              )}
              {!opinion && editing && !draftRestored && draftSavedAt && (
                <div className="px-4 sm:px-8 pt-5 pb-0">
                  <span className="text-xs text-gray-300">
                    임시저장됨 {draftSavedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* 문서 헤더 */}
                <div className="text-center pt-8 sm:pt-10 pb-5 sm:pb-6 px-4 sm:px-10">
                  <div className="text-xl font-bold tracking-wide">{data.session.companyName}</div>
                  <div className="text-xl font-bold mt-1">투심의견서</div>
                </div>

                <div className="px-4 sm:px-10 pb-2">
                  <div className="text-right text-sm text-gray-500 mb-4">{dateStr}</div>
                  <div className="flex items-end gap-3 mb-5">
                    <span className="text-sm font-bold">성명:</span>
                    <span className="text-sm border-b border-gray-400 min-w-[80px] pb-0.5 font-medium">{data.name}</span>
                  </div>
                  <hr className="border-gray-300 mb-6" />

                  {/* 1. 평가 의견 */}
                  <section className="mb-6">
                    <div className="text-sm font-bold mb-4">1. 평가 의견</div>
                    <div className="ml-3 mb-5">
                      <div className="text-sm font-semibold text-gray-700 mb-2">1.1 긍정적 요인 <span className="text-red-400 font-normal text-xs">*</span></div>
                      {editing ? (
                        <textarea required rows={4}
                          className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-[#24AF64] bg-gray-50"
                          placeholder="긍정적 요인을 입력해주세요."
                          value={form.positiveFactors}
                          onChange={(e) => setForm({ ...form, positiveFactors: e.target.value })} />
                      ) : (
                        <div className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 min-h-[80px]">{display?.positiveFactors}</div>
                      )}
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-semibold text-gray-700 mb-2">1.2 리스크 요인 <span className="text-red-400 font-normal text-xs">*</span></div>
                      {editing ? (
                        <textarea required rows={4}
                          className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-[#24AF64] bg-gray-50"
                          placeholder="리스크 요인을 입력해주세요."
                          value={form.riskFactors}
                          onChange={(e) => setForm({ ...form, riskFactors: e.target.value })} />
                      ) : (
                        <div className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 min-h-[80px]">{display?.riskFactors}</div>
                      )}
                    </div>
                  </section>

                  <hr className="border-gray-100 mb-6" />

                  {/* 2. 투자 여부 */}
                  <section className="mb-6">
                    <div className="text-sm font-bold mb-3">2. 투자 여부 (O, 조건부 O, X) <span className="text-red-400 font-normal text-xs">*</span></div>
                    <div className="ml-3">
                      {editing ? (
                        <div className="flex gap-6">
                          {DECISION_OPTIONS.map((opt) => (
                            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" name="decision" value={opt.value}
                                checked={form.decision === opt.value}
                                onChange={(e) => setForm({ ...form, decision: e.target.value })}
                                className="w-4 h-4 accent-[#24AF64]" />
                              <span className="text-sm font-medium">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <span className={`text-base font-bold ${DECISION_COLOR[display?.decision ?? "YES"]}`}>
                          {DECISION_LABEL[display?.decision ?? "YES"]}
                        </span>
                      )}
                    </div>
                  </section>

                  <hr className="border-gray-100 mb-6" />

                  {/* 3. 밸류에이션 */}
                  <section className="mb-6">
                    <div className="text-sm font-bold mb-4">3. 밸류에이션</div>
                    <div className="ml-3 mb-5">
                      <div className="text-sm font-semibold text-gray-700 mb-2">a. 밸류에이션에 대한 의견 <span className="text-red-400 font-normal text-xs">*</span></div>
                      {editing ? (
                        <textarea required rows={3}
                          className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-[#24AF64] bg-gray-50"
                          value={form.valuationOpinion}
                          onChange={(e) => setForm({ ...form, valuationOpinion: e.target.value })} />
                      ) : (
                        <div className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 min-h-[60px]">{display?.valuationOpinion}</div>
                      )}
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-semibold text-gray-700 mb-2">
                        b. 적정 밸류에이션에 대한 의견이 있으시다면 <span className="text-gray-400 font-normal text-xs">(선택)</span>
                      </div>
                      {editing ? (
                        <textarea rows={2}
                          className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-[#24AF64] bg-gray-50"
                          value={form.appropriateValuation}
                          onChange={(e) => setForm({ ...form, appropriateValuation: e.target.value })} />
                      ) : (
                        <div className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3 min-h-[48px]">
                          {display?.appropriateValuation || <span className="text-gray-300">—</span>}
                        </div>
                      )}
                    </div>
                  </section>

                  <hr className="border-gray-100 mb-6" />

                  {/* 4. 기타 의견 */}
                  <section className="mb-8">
                    <div className="text-sm font-bold mb-3">4. 기타 의견 <span className="text-gray-400 font-normal text-xs">(선택)</span></div>
                    <div className="ml-3">
                      {editing ? (
                        <textarea rows={3}
                          className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-[#24AF64] bg-gray-50"
                          value={form.otherOpinions}
                          onChange={(e) => setForm({ ...form, otherOpinions: e.target.value })} />
                      ) : (
                        <div className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 min-h-[60px]">
                          {display?.otherOpinions || <span className="text-gray-300">—</span>}
                        </div>
                      )}
                    </div>
                  </section>

                  {/* 제출 영역 */}
                  {editing && !isClosed && (
                    <div className="space-y-4 pb-6">

                      {/* 임시저장 버튼 */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {draftSavedAt
                            ? `임시저장됨 ${draftSavedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`
                            : "작성 내용이 자동 저장됩니다"}
                        </span>
                        <button
                          type="button"
                          onClick={handleManualSave}
                          disabled={manualSaving}
                          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:border-[#24AF64] hover:text-[#24AF64] transition disabled:opacity-50"
                        >
                          {manualSaving ? "저장됨 ✓" : "임시저장"}
                        </button>
                      </div>

                      <hr className="border-gray-100" />

                      {/* 전자도장 선택 */}
                      <div>
                        <div className="text-xs font-semibold text-gray-600 mb-3">🔏 전자도장 선택</div>
                        <div className="space-y-2">

                          {/* 자동 생성 */}
                          <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${sealChoice === "auto" ? "border-[#24AF64] bg-green-50" : "border-gray-100 hover:border-gray-200"}`}>
                            <input type="radio" name="sealChoice" value="auto"
                              checked={sealChoice === "auto"}
                              onChange={() => setSealChoice("auto")}
                              className="accent-[#24AF64]" />
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-10 h-10 rounded-full border-2 border-red-500 flex items-center justify-center shrink-0">
                                <span className="text-xs text-red-600 font-bold" style={{ fontFamily: "serif" }}>
                                  {data.name.slice(-1)}
                                </span>
                              </div>
                              <div>
                                <div className="text-xs font-medium">자동 생성 도장</div>
                                <div className="text-xs text-gray-400">이름으로 자동 생성</div>
                              </div>
                            </div>
                          </label>

                          {/* 등록된 도장 (있을 때만) */}
                          {partnerSealImage && (
                            <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${sealChoice === "registered" ? "border-[#24AF64] bg-green-50" : "border-gray-100 hover:border-gray-200"}`}>
                              <input type="radio" name="sealChoice" value="registered"
                                checked={sealChoice === "registered"}
                                onChange={() => setSealChoice("registered")}
                                className="accent-[#24AF64]" />
                              <div className="flex items-center gap-3 flex-1">
                                <img src={partnerSealImage} alt="등록된 도장"
                                  className="w-10 h-10 object-contain border border-gray-100 rounded-lg bg-white shrink-0" />
                                <div>
                                  <div className="text-xs font-medium">등록된 도장</div>
                                  <div className="text-xs text-gray-400">내 전자도장 사용</div>
                                </div>
                              </div>
                            </label>
                          )}

                          {/* 직접 그리기 */}
                          <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${sealChoice === "draw" ? "border-[#24AF64] bg-green-50" : "border-gray-100 hover:border-gray-200"}`}>
                            <input type="radio" name="sealChoice" value="draw"
                              checked={sealChoice === "draw"}
                              onChange={() => { setSealChoice("draw"); setCanvasEmpty(true); }}
                              className="accent-[#24AF64]" />
                            <div>
                              <div className="text-xs font-medium">직접 그리기</div>
                              <div className="text-xs text-gray-400">아래 칸에 서명 또는 도장을 그려주세요</div>
                            </div>
                          </label>

                          {/* 캔버스 (직접 그리기 선택 시) */}
                          {sealChoice === "draw" && (
                            <div className="pl-6 pt-1">
                              <canvas
                                ref={(el) => {
                                  if (el && canvasEmpty) initCanvas(el);
                                  canvasRef.current = el;
                                }}
                                width={280} height={180}
                                className="w-full border-2 border-dashed border-gray-200 rounded-xl bg-white cursor-crosshair touch-none"
                                onMouseDown={onMouseDown} onMouseMove={onMouseMove}
                                onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
                                onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
                              />
                              <button type="button" onClick={clearCanvas} disabled={canvasEmpty}
                                className="mt-1.5 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30">
                                지우기
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <hr className="border-gray-100" />

                      {error && <p className="text-red-500 text-xs">{error}</p>}
                      <button
                        type="submit"
                        disabled={submitting || !canSubmit}
                        className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-40 transition"
                        style={{ background: "#24AF64" }}
                      >
                        {submitting ? "제출 중..." : opinion ? "수정 제출하기" : "의견서 제출하기"}
                      </button>
                      {!canSubmit && (
                        <p className="text-center text-xs text-gray-400">도장을 선택해야 제출할 수 있습니다</p>
                      )}
                    </div>
                  )}

                  {isClosed && !opinion && (
                    <div className="text-center text-gray-400 text-sm py-6">제출이 마감되었습니다.</div>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* 오른쪽: PDF 미리보기 (데스크탑) */}
        {showPreview && (
          <div className="hidden sm:flex w-1/2 flex-col border-l border-gray-200 bg-white">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
              <span className="text-sm font-semibold text-gray-600">📄 내 의견서 미리보기</span>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:border-[#24AF64] hover:text-[#24AF64] transition">
                새 탭 / 저장
              </a>
            </div>
            <iframe src={previewUrl} className="flex-1 w-full" style={{ border: "none" }} title="의견서 미리보기" />
          </div>
        )}
      </div>
    </div>
  );
}
