"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [status, setStatus] = useState<"checking" | "valid" | "invalid" | "done">("checking");
  const [invalidReason, setInvalidReason] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/reviewer/reset-password?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          setStatus("valid");
        } else {
          setInvalidReason(data.reason === "expired" ? "링크가 만료되었습니다." : "유효하지 않은 링크입니다.");
          setStatus("invalid");
        }
      });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("비밀번호가 일치하지 않습니다."); return; }
    if (password.length < 4) { setError("비밀번호는 4자 이상이어야 합니다."); return; }
    setLoading(true);
    const res = await fetch("/api/reviewer/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword: password }),
    });
    const data = await res.json();
    if (res.ok) {
      setStatus("done");
      setTimeout(() => router.push("/reviewer/login"), 3000);
    } else {
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
          <div className="text-sm text-gray-400 mt-1">비밀번호 재설정</div>
        </div>

        {status === "checking" && (
          <p className="text-center text-sm text-gray-400">링크 확인 중...</p>
        )}

        {status === "invalid" && (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto text-2xl">⚠️</div>
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-1">{invalidReason}</p>
              <p className="text-xs text-gray-400">새로 비밀번호 찾기를 요청해주세요.</p>
            </div>
            <Link
              href="/reviewer/forgot-password"
              className="block w-full py-3 rounded-xl text-sm font-semibold text-center text-white"
              style={{ background: "#24AF64" }}
            >
              다시 요청하기
            </Link>
          </div>
        )}

        {status === "valid" && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-xs text-gray-400 mb-4">새로 사용할 비밀번호를 입력해주세요.</p>
            <input
              type="password"
              required
              placeholder="새 비밀번호 (4자 이상)"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#24AF64]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              type="password"
              required
              placeholder="새 비밀번호 확인"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#24AF64]"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
              style={{ background: "#24AF64" }}
            >
              {loading ? "변경 중..." : "비밀번호 변경하기"}
            </button>
          </form>
        )}

        {status === "done" && (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto text-2xl" style={{ background: "#e8f8ef" }}>✅</div>
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-1">비밀번호가 변경되었습니다</p>
              <p className="text-xs text-gray-400">잠시 후 로그인 페이지로 이동합니다.</p>
            </div>
            <Link
              href="/reviewer/login"
              className="block w-full py-3 rounded-xl text-sm font-semibold text-center text-white"
              style={{ background: "#24AF64" }}
            >
              로그인하기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
