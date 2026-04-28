"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/reviewer/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      setSent(true);
    } else {
      const data = await res.json();
      setError(data.error || "오류가 발생했습니다.");
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
          <div className="text-sm text-gray-400 mt-1">비밀번호 찾기</div>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto" style={{ background: "#e8f8ef" }}>
              <span className="text-2xl">✉️</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-1">이메일을 확인해주세요</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                입력하신 이메일 주소로 비밀번호 재설정 링크를 발송했습니다.<br />
                이메일이 오지 않으면 스팸함을 확인해주세요.
              </p>
            </div>
            <Link
              href="/reviewer/login"
              className="block w-full py-3 rounded-xl text-sm font-semibold text-center text-white"
              style={{ background: "#24AF64" }}
            >
              로그인으로 돌아가기
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              가입 시 등록한 이메일 주소를 입력하면<br />비밀번호 재설정 링크를 보내드립니다.
            </p>
            <input
              type="email"
              required
              placeholder="이메일 주소"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#24AF64]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
              style={{ background: "#24AF64" }}
            >
              {loading ? "전송 중..." : "재설정 링크 보내기"}
            </button>
            <div className="text-center pt-1">
              <Link href="/reviewer/login" className="text-xs text-gray-400 hover:text-gray-600">
                ← 로그인으로 돌아가기
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
