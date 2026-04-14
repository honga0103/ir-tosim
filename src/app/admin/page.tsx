"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type Session = {
  id: string;
  companyName: string;
  status: string;
  createdAt: string;
  reviewers: { id: string; name: string; submittedAt: string | null }[];
  _count: { opinions: number };
};

type Partner = { id: string; name: string; email: string | null; hasPassword?: boolean };

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  OPEN: { label: "수집 중", color: "bg-green-100 text-green-700" },
  CLOSED: { label: "마감", color: "bg-yellow-100 text-yellow-700" },
  DONE: { label: "완료", color: "bg-gray-100 text-gray-500" },
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [newCompany, setNewCompany] = useState("");
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<"sessions" | "partners">("sessions");

  // sessionStorage로 로그인 상태 유지 (뒤로가기 후에도 유지)
  useEffect(() => {
    const saved = sessionStorage.getItem("admin_pw");
    if (saved) {
      setPassword(saved);
      fetch("/api/sessions", { headers: { "x-admin-password": saved } }).then(async (res) => {
        if (res.ok) {
          setAuthed(true);
          setSessions(await res.json());
          fetch("/api/partners", { headers: { "x-admin-password": saved } })
            .then((r) => r.ok ? r.json() : [])
            .then(setPartners);
        } else {
          sessionStorage.removeItem("admin_pw");
        }
      });
    }
  }, []);

  // 세션 수정
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // 파트너 추가
  const [newPartnerName, setNewPartnerName] = useState("");
  const [newPartnerEmail, setNewPartnerEmail] = useState("");
  const [addingPartner, setAddingPartner] = useState(false);
  const [pwTarget, setPwTarget] = useState<string | null>(null); // 비밀번호 설정 중인 파트너 id
  const [newPw, setNewPw] = useState("");

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/sessions", { headers: { "x-admin-password": password } });
    if (res.ok) {
      sessionStorage.setItem("admin_pw", password);
      setAuthed(true);
      setSessions(await res.json());
      loadPartners();
    } else {
      alert("비밀번호가 올바르지 않습니다.");
    }
  }

  async function loadSessions() {
    const res = await fetch("/api/sessions", { headers: { "x-admin-password": password } });
    if (res.ok) setSessions(await res.json());
  }

  async function loadPartners() {
    const res = await fetch("/api/partners", { headers: { "x-admin-password": password } });
    if (res.ok) setPartners(await res.json());
  }

  async function createSession(e: React.FormEvent) {
    e.preventDefault();
    if (!newCompany.trim()) return;
    setCreating(true);
    await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ companyName: newCompany.trim() }),
    });
    setNewCompany("");
    await loadSessions();
    setCreating(false);
  }

  async function deleteSession(id: string, name: string) {
    if (!confirm(`"${name}" 투심 건을 삭제하시겠습니까?\n모든 의견서 데이터가 함께 삭제됩니다.`)) return;
    await fetch(`/api/sessions/${id}`, {
      method: "DELETE",
      headers: { "x-admin-password": password },
    });
    await loadSessions();
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    await fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ companyName: editName.trim() }),
    });
    setEditingId(null);
    await loadSessions();
  }

  async function addPartner(e: React.FormEvent) {
    e.preventDefault();
    if (!newPartnerName.trim()) return;
    setAddingPartner(true);
    await fetch("/api/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ name: newPartnerName.trim(), email: newPartnerEmail.trim() }),
    });
    setNewPartnerName("");
    setNewPartnerEmail("");
    await loadPartners();
    setAddingPartner(false);
  }

  async function deletePartner(id: string, name: string) {
    if (!confirm(`"${name}"을 파트너 목록에서 삭제하시겠습니까?`)) return;
    await fetch(`/api/partners/${id}`, { method: "DELETE", headers: { "x-admin-password": password } });
    await loadPartners();
  }

  async function savePartnerPassword(id: string) {
    if (!newPw.trim()) return;
    await fetch(`/api/partners/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ password: newPw.trim() }),
    });
    setNewPw("");
    setPwTarget(null);
    await loadPartners();
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-84">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Image src="/logo-vertical.png" alt="Digital Healthcare Partners" width={120} height={90} priority />
            </div>
            <div className="text-sm text-gray-400 mt-1">관리자 로그인</div>
          </div>
          <form onSubmit={login} className="space-y-3">
            <input
              type="password"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#24AF64]"
              placeholder="관리자 비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit" className="w-full py-3 rounded-xl font-semibold text-white text-sm" style={{ background: "#24AF64" }}>
              로그인
            </button>
          </form>
          <div className="mt-4 text-center">
            <a href="/" className="text-xs text-gray-400 hover:text-gray-600">← 홈으로</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100">
        <div className="px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <a href="/" className="text-gray-400 hover:text-black text-sm transition shrink-0">← 홈</a>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Image src="/logo-horizontal.png" alt="Digital Healthcare Partners" width={100} height={24} className="sm:w-[120px] shrink-0" />
              <span className="text-gray-300 hidden sm:inline">|</span>
              <span className="text-sm text-gray-500 hidden sm:inline">투심 자동화</span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            {/* 탭: 데스크탑에서만 헤더 오른쪽에 표시 */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setTab("sessions")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === "sessions" ? "bg-white shadow-sm text-black" : "text-gray-500"}`}
              >
                투심 건
              </button>
              <button
                onClick={() => { setTab("partners"); loadPartners(); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === "partners" ? "bg-white shadow-sm text-black" : "text-gray-500"}`}
              >
                파트너 관리
              </button>
            </div>
            <button
              onClick={() => { sessionStorage.removeItem("admin_pw"); setAuthed(false); setPassword(""); }}
              className="text-xs text-gray-400 hover:text-gray-600 transition"
            >
              로그아웃
            </button>
          </div>
        </div>
        {/* 탭: 모바일에서는 헤더 아래 별도 행 */}
        <div className="sm:hidden flex border-t border-gray-100">
          <button
            onClick={() => setTab("sessions")}
            className={`flex-1 py-2.5 text-sm font-medium transition border-b-2 ${tab === "sessions" ? "border-[#24AF64] text-black" : "border-transparent text-gray-400"}`}
          >
            투심 건
          </button>
          <button
            onClick={() => { setTab("partners"); loadPartners(); }}
            className={`flex-1 py-2.5 text-sm font-medium transition border-b-2 ${tab === "partners" ? "border-[#24AF64] text-black" : "border-transparent text-gray-400"}`}
          >
            파트너 관리
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
        {/* 투심 건 탭 */}
        {tab === "sessions" && (
          <div className="space-y-5">
            {/* 새 투심 건 생성 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wide mb-4">새 투심 건 생성</h2>
              <form onSubmit={createSession} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#24AF64]"
                  placeholder="회사명 입력 (예: 사운더블 헬스)"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
                  style={{ background: "#24AF64" }}
                >
                  생성
                </button>
              </form>
            </div>

            {/* 투심 건 목록 */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {sessions.length === 0 ? (
                <div className="p-10 text-center text-gray-300 text-sm">생성된 투심 건이 없습니다</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {sessions.map((session) => {
                    const submitted = session.reviewers.filter((r) => r.submittedAt).length;
                    const total = session.reviewers.length;
                    const st = STATUS_LABEL[session.status];
                    const isEditing = editingId === session.id;
                    return (
                      <div key={session.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition group">
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="flex gap-2 items-center">
                              <input
                                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#24AF64] flex-1"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") saveEdit(session.id); if (e.key === "Escape") setEditingId(null); }}
                                autoFocus
                              />
                              <button onClick={() => saveEdit(session.id)} className="text-xs px-3 py-1.5 rounded-lg text-white font-medium" style={{ background: "#24AF64" }}>저장</button>
                              <button onClick={() => setEditingId(null)} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 font-medium">취소</button>
                            </div>
                          ) : (
                            <div className="font-semibold text-sm truncate">{session.companyName}</div>
                          )}
                          <div className="text-xs text-gray-400 mt-0.5">
                            {new Date(session.createdAt).toLocaleDateString("ko-KR")}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-center">
                            <div className="text-sm font-bold" style={{ color: "#24AF64" }}>{submitted}/{total}</div>
                            <div className="text-xs text-gray-400">제출</div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={() => { setEditingId(session.id); setEditName(session.companyName); }}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 text-xs"
                              title="수정"
                            >✏️</button>
                            <button
                              onClick={() => deleteSession(session.id, session.companyName)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 text-xs"
                              title="삭제"
                            >🗑️</button>
                          </div>
                          {!isEditing && (
                            <Link
                              href={`/admin/sessions/${session.id}?pw=${password}`}
                              className="text-sm text-gray-400 hover:text-black transition"
                            >→</Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 파트너 관리 탭 */}
        {tab === "partners" && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wide mb-4">파트너 추가</h2>
              <form onSubmit={addPartner} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="이름 (예: 김태호)"
                  required
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#24AF64]"
                  value={newPartnerName}
                  onChange={(e) => setNewPartnerName(e.target.value)}
                />
                <input
                  type="email"
                  placeholder="이메일 (선택)"
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#24AF64]"
                  value={newPartnerEmail}
                  onChange={(e) => setNewPartnerEmail(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={addingPartner}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
                  style={{ background: "#24AF64" }}
                >
                  추가
                </button>
              </form>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {partners.length === 0 ? (
                <div className="p-10 text-center text-gray-300 text-sm">등록된 파트너가 없습니다</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {partners.map((p) => (
                    <div key={p.id} className="px-6 py-3.5 hover:bg-gray-50 transition group">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-sm">{p.name}</span>
                          {p.email && <span className="text-xs text-gray-400 ml-3">{p.email}</span>}
                          {p.hasPassword
                            ? <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-green-100 text-green-700">로그인 가능</span>
                            : <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">비밀번호 미설정</span>}
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() => { setPwTarget(pwTarget === p.id ? null : p.id); setNewPw(""); }}
                            className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 hover:border-[#24AF64] hover:text-[#24AF64] transition"
                          >🔑 {p.hasPassword ? "비밀번호 변경" : "비밀번호 설정"}</button>
                          <button onClick={() => deletePartner(p.id, p.name)}
                            className="text-xs text-gray-400 hover:text-red-500 transition p-1">삭제</button>
                        </div>
                      </div>
                      {pwTarget === p.id && (
                        <div className="mt-2 flex gap-2">
                          <input
                            type="password"
                            placeholder="새 비밀번호"
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#24AF64]"
                            value={newPw}
                            onChange={(e) => setNewPw(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") savePartnerPassword(p.id); if (e.key === "Escape") setPwTarget(null); }}
                            autoFocus
                          />
                          <button onClick={() => savePartnerPassword(p.id)}
                            className="text-xs px-3 py-1.5 rounded-lg text-white font-medium" style={{ background: "#24AF64" }}>저장</button>
                          <button onClick={() => setPwTarget(null)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600">취소</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
