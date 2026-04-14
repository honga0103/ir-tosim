import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const COOKIE_NAME = "reviewer_token";

export async function getReviewerFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const record = await prisma.reviewerToken.findUnique({
    where: { token },
    include: { partner: true },
  });

  if (!record) return null;
  if (record.expiresAt < new Date()) {
    await prisma.reviewerToken.delete({ where: { token } });
    return null;
  }

  return record.partner;
}
