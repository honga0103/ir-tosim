import { NextResponse } from "next/server";
import { getReviewerFromCookie } from "@/lib/reviewer-auth";

export async function GET() {
  const partner = await getReviewerFromCookie();
  if (!partner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ id: partner.id, name: partner.name, email: partner.email, sealImage: partner.sealImage ?? null });
}
