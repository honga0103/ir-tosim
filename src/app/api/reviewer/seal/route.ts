import { NextRequest, NextResponse } from "next/server";
import { getReviewerFromCookie } from "@/lib/reviewer-auth";
import { prisma } from "@/lib/prisma";

// GET: 현재 커스텀 도장 조회
export async function GET() {
  const partner = await getReviewerFromCookie();
  if (!partner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ sealImage: partner.sealImage ?? null });
}

// POST: 커스텀 도장 저장 (base64 Data URL)
export async function POST(req: NextRequest) {
  const partner = await getReviewerFromCookie();
  if (!partner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sealImage } = await req.json();
  if (!sealImage || typeof sealImage !== "string") {
    return NextResponse.json({ error: "이미지 데이터가 없습니다." }, { status: 400 });
  }
  // 허용: png, jpg, webp, svg
  if (!sealImage.startsWith("data:image/")) {
    return NextResponse.json({ error: "이미지 형식이 올바르지 않습니다." }, { status: 400 });
  }
  // 크기 제한 5MB
  if (sealImage.length > 7 * 1024 * 1024) {
    return NextResponse.json({ error: "이미지 크기는 5MB 이하여야 합니다." }, { status: 400 });
  }

  await prisma.partner.update({
    where: { id: partner.id },
    data: { sealImage },
  });
  return NextResponse.json({ success: true });
}

// DELETE: 커스텀 도장 삭제 (자동생성으로 복귀)
export async function DELETE() {
  const partner = await getReviewerFromCookie();
  if (!partner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.partner.update({
    where: { id: partner.id },
    data: { sealImage: null },
  });
  return NextResponse.json({ success: true });
}
