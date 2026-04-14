import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isAdmin(req: NextRequest) {
  return req.headers.get("x-admin-password") === process.env.ADMIN_PASSWORD;
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  // 이미 제출한 참여자는 삭제 불가
  const reviewer = await prisma.reviewer.findUnique({ where: { id } });
  if (!reviewer) return NextResponse.json({ error: "참여자를 찾을 수 없습니다." }, { status: 404 });
  if (reviewer.submittedAt) return NextResponse.json({ error: "이미 제출한 참여자는 삭제할 수 없습니다." }, { status: 400 });

  await prisma.reviewer.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
