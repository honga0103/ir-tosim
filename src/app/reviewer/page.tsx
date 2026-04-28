"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

type MySession = {
  reviewerId: string;
  token: string;
  submittedAt: string | null;
  hasOpinion: boolean;
  session: { id: string; companyName: string; status: string; createdAt: string };
};

type Me = { id: string; name: string; email: string; sealImage: string | null };

const STATUS_COLOR: Record<string, string> = {
  OPEN: "bg-green-100 text-green-700",
  CLOSED: "bg-yellow-100 text-yellow-700",
  DONE: "bg-gray-100 text-gray-500",
};
const STATUS_LABEL: Record<string, string> = { OPEN: "진행 중", CLOSED: "마감", DONE: "완료" };

export default function ReviewerDashboard() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [sessions, setSessions] = useState<MySession[]>([]);
  const [loading, setLoading] = useState(true);

  // 비밀번호 변경
  const [showPwChange, setShowPwChange] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  // 전자도장 설정
  const [showSealPanel, setShowSealPanel] = useState(false);
  const [sealPreview, setSealPreview] = useState<string | null>(null); // 업로드 미리보기
  const [sealSaving, setSealSaving] = useState(false);
  const [sealError, setSealError] = useState("");
  const [sealSuccess, setSealSuccess] = useState("");
  const sealFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/reviewer/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) { router.push("/reviewer/login"); return; }
        setMe(data);
        return fetch("/api/reviewer/sessions").then((r) => r.json());
      })
      .then((data) => { if (data) setSessions(data); })
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    await fetch("/api/reviewer/logout", { method: "POST" });
    router.push("/reviewer/login");
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    if (pwForm.next !== pwForm.confirm) { setPwError("새 비밀번호가 일치하지 않습니다."); return; }
    if (pwForm.next.length < 4) { setPwError("비밀번호는 4자 이상이어야 합니다."); return; }
    setPwSaving(true);
    const res = await fetch("/api/reviewer/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
    });
    const data = await res.json();
    if (res.ok) {
      setPwSuccess(true);
      setPwForm({ current: "", next: "", confirm: "" });
      setTimeout(() => { setPwSuccess(false); setShowPwChange(false); }, 2000);
    } else {
      setPwError(data.error || "변경 실패");
    }
    setPwSaving(false);
  }

  function handleSealFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setSealError("5MB 이하 이미지를 선택해주세요."); return; }
    setSealError("");
    const reader = new FileReader();
    reader.onload = (ev) => setSealPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function saveSeal() {
    if (!sealPreview) return;
    setSealSaving(true);
    setSealError("");
    setSealSuccess("");
    const res = await fetch("/api/reviewer/seal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sealImage: sealPreview }),
    });
    const data = await res.json();
    if (res.ok) {
      setMe((prev) => prev ? { ...prev, sealImage: sealPreview } : prev);
      setSealPreview(null);
      if (sealFileRef.current) sealFileRef.current.value = "";
      setSealSuccess("도장이 저장되었습니다.");
      setTimeout(() => setSealSuccess(""), 3000);
    } else {
      setSealError(data.error || "저장 실패");
    }
    setSealSaving(false);
  }

  async function resetSeal() {
    setSealSaving(true);
    setSealError("");
    setSealSuccess("");
    const res = await fetch("/api/reviewer/seal", { method: "DELETE" });
    if (res.ok) {
      setMe((prev) => prev ? { ...prev, sealImage: null } : prev);
      setSealPreview(null);
      if (sealFileRef.current) sealFileRef.current.value = "";
      setSealSuccess("자동 생성 도장으로 변경되었습니다.");
      setTimeout(() => setSealSuccess(""), 3000);
    }
    setSealSaving(false);
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 text-sm">불러오는 중...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Image src="/logo-horizontal.png" alt="Digital Healthcare Partners" width={100} height={24} className="sm:w-[120px]" />
          <span className="text-gray-300 hidden sm:inline">|</span>
          <span className="text-sm text-gray-500 hidden sm:inline">투심 의견서</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-gray-700">{me?.name}</div>
            {me?.email && <div className="text-xs text-gray-400">{me.email}</div>}
          </div>
          <span className="text-sm text-gray-600 sm:hidden font-medium">{me?.name}</span>
          <button
            onClick={() => { setShowSealPanel(!showSealPanel); setSealError(""); setSealSuccess(""); setSealPreview(null); }}
            className="text-xs px-2 sm:px-3 py-1.5 rounded-lg border border-gray-200 hover:border-[#24AF64] hover:text-[#24AF64] transition"
          >
            <span className="hidden sm:inline">🔏 전자도장 설정</span>
            <span className="sm:hidden">🔏</span>
          </button>
          <button
            onClick={() => { setShowPwChange(!showPwChange); setPwError(""); setPwSuccess(false); }}
            className="text-xs px-2 sm:px-3 py-1.5 rounded-lg border border-gray-200 hover:border-[#24AF64] hover:text-[#24AF64] transition"
          >
            <span className="hidden sm:inline">🔑 비밀번호 변경</span>
            <span className="sm:hidden">🔑</span>
          </button>
          <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-600">로그아웃</button>
        </div>
      </header>

      {/* 전자도장 설정 패널 */}
      {showSealPanel && (
        <div className="border-b border-gray-100 bg-white px-6 sm:px-8 py-5">
          <div className="max-w-sm">
            <h3 className="text-sm font-semibold mb-1">전자도장 설정</h3>
            <p className="text-xs text-gray-400 mb-4">의견서 제출 시 성명 옆에 날인되는 도장입니다.</p>

            {/* 현재 도장 미리보기 */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2 font-medium">현재 도장</p>
              <div className="flex items-center gap-4">
                {me?.sealImage ? (
                  <>
                    <img src={me.sealImage} alt="내 도장" className="w-16 h-16 object-contain border border-gray-100 rounded-lg p-1" />
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">직접 업로드한 도장</p>
                      <button
                        onClick={resetSeal}
                        disabled={sealSaving}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:border-red-300 hover:text-red-500 transition disabled:opacity-50"
                      >
                        자동 생성으로 되돌리기
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 flex items-center justify-center border border-gray-100 rounded-lg bg-gray-50">
                      <span className="text-2xl text-red-600 font-bold" style={{ fontFamily: "serif" }}>
                        {me?.name?.slice(-1) ?? "인"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">이름으로 자동 생성됨</p>
                  </>
                )}
              </div>
            </div>

            {/* 업로드 영역 */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-500 font-medium mb-2">새 도장 업로드</p>
              <p className="text-xs text-gray-400 mb-3">PNG, JPG 투명 배경 권장 · 5MB 이하</p>
              <input
                ref={sealFileRef}
                type="file"
                accept="image/*"
                onChange={handleSealFileChange}
                className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-gray-200 file:text-xs file:bg-white file:text-gray-600 hover:file:border-[#24AF64] hover:file:text-[#24AF64] cursor-pointer"
              />

              {sealPreview && (
                <div className="mt-3 flex items-center gap-4">
                  <img src={sealPreview} alt="미리보기" className="w-16 h-16 object-contain border border-gray-100 rounded-lg p-1" />
                  <div>
                    <p className="text-xs text-gray-400 mb-2">미리보기</p>
                    <button
                      onClick={saveSeal}
                      disabled={sealSaving}
                      className="text-xs px-4 py-1.5 rounded-lg text-white font-semibold disabled:opacity-50"
                      style={{ background: "#24AF64" }}
                    >
                      {sealSaving ? "저장 중..." : "이 도장으로 저장"}
                    </button>
                  </div>
                </div>
              )}

              {sealError && <p className="text-red-500 text-xs mt-2">{sealError}</p>}
              {sealSuccess && <p className="text-xs font-medium mt-2" style={{ color: "#24AF64" }}>✓ {sealSuccess}</p>}
            </div>
          </div>
        </div>
      )}

      {/* 비밀번호 변경 패널 */}
      {showPwChange && (
        <div className="border-b border-gray-100 bg-white px-8 py-5">
          <div className="max-w-sm">
            <h3 className="text-sm font-semibold mb-3">비밀번호 변경</h3>
            <form onSubmit={changePassword} className="space-y-2.5">
              <input
                type="password"
                placeholder="현재 비밀번호"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#24AF64]"
                value={pwForm.current}
                onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
              />
              <input
                type="password"
                placeholder="새 비밀번호 (4자 이상)"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#24AF64]"
                value={pwForm.next}
                onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
              />
              <input
                type="password"
                placeholder="새 비밀번호 확인"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#24AF64]"
                value={pwForm.confirm}
                onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
              />
              {pwError && <p className="text-red-500 text-xs">{pwError}</p>}
              {pwSuccess && <p className="text-xs font-medium" style={{ color: "#24AF64" }}>✓ 비밀번호가 변경되었습니다.</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={pwSaving}
                  className="px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
                  style={{ background: "#24AF64" }}
                >
                  {pwSaving ? "저장 중..." : "변경"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPwChange(false)}
                  className="px-5 py-2 rounded-xl text-sm text-gray-500 bg-gray-100 hover:bg-gray-200"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-6 py-8">
        <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wide mb-4">배정된 투심 건</h2>

        {/* 미제출 건 안내 배너 */}
        {(() => {
          const pending = sessions.filter((s) => !s.hasOpinion && s.session.status === "OPEN");
          return pending.length > 0 ? (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2" style={{ background: "#e8f8ef", color: "#1a7a47" }}>
              <span>📝</span>
              <span>아직 제출하지 않은 의견서가 <strong>{pending.length}건</strong> 있습니다.</span>
            </div>
          ) : null;
        })()}

        {sessions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-300 text-sm">
            배정된 투심 건이 없습니다
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-50">
              {sessions.map((s) => {
                const needsAction = !s.hasOpinion && s.session.status === "OPEN";
                const dateStr = new Date(s.session.createdAt).toLocaleDateString("ko-KR");
                return (
                  <Link
                    key={s.reviewerId}
                    href={`/reviewer/sessions/${s.session.id}`}
                    className={`flex items-center justify-between px-6 py-4 transition group ${needsAction ? "bg-green-50 hover:bg-green-100" : "hover:bg-gray-50"}`}
                  >
                    <div>
                      <div className="font-semibold text-sm">{s.session.companyName}</div>
                      <div className="text-xs mt-0.5 flex items-center gap-2">
                        <span className="text-gray-400">{dateStr}</span>
                        {s.hasOpinion ? (
                          <span style={{ color: "#24AF64" }} className="font-medium">✓ 제출 완료</span>
                        ) : (
                          <span className="font-semibold" style={{ color: "#1a7a47" }}>작성 필요</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[s.session.status]}`}>
                        {STATUS_LABEL[s.session.status]}
                      </span>
                      <span className="text-gray-300 group-hover:text-gray-500 transition">→</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
