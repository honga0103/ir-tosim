import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <Image src="/logo-vertical.png" alt="Digital Healthcare Partners" width={160} height={120} priority />
        </div>
        <p className="text-gray-400 mb-10 text-sm">투자심의 자동화 시스템</p>
        <div className="flex flex-col gap-3 items-center">
          <Link
            href="/reviewer/login"
            className="w-56 py-3 rounded-xl text-white text-sm font-semibold text-center"
            style={{ background: "#24AF64" }}
          >
            투심위원 로그인
          </Link>
          <Link
            href="/admin"
            className="w-56 py-3 rounded-xl text-sm font-semibold text-center border border-gray-200 hover:border-gray-400 transition text-gray-600"
          >
            관리자
          </Link>
        </div>
      </div>
    </div>
  );
}
