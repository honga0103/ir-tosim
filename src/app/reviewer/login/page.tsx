"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function ReviewerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/reviewer/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    let data: { error?: string } = {};
    try { data = await res.json(); } catch { /* 빈 응답 무시 */ }
    if (res.ok) {
      router.push("/reviewer");
    } else {
      setError(data.error || "로그인 실패");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image src="/logo-vertical.png" alt="Digital Healthcare Partners" width={120} height={90} priority />
          </div>
          <div className="text-sm text-gray-400 mt-1">투심위원 로그인</div>
        </div>
        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="email"
            required
            placeholder="이메일"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#24AF64]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            required
            placeholder="비밀번호"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#24AF64]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
            style={{ background: "#24AF64" }}
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
        <div className="mt-4 text-center space-y-2">
          <a href="/" className="text-xs text-gray-400 hover:text-gray-600">← 홈으로</a>
          <p className="text-xs text-gray-300">비밀번호를 잊으셨나요? 관리자에게 문의해주세요.</p>
        </div>
      </div>
    </div>
  );
}
