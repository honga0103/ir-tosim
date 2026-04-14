import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isAdmin(req: NextRequest) {
  const password = req.headers.get("x-admin-password");
  return password === process.env.ADMIN_PASSWORD;
}

// 심사역 추가 + 링크 발송
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { sessionId, name, email, sendEmail, sendSlack, partnerId } = body;

  if (!sessionId || !name?.trim()) {
    return NextResponse.json({ error: "sessionId, name은 필수입니다." }, { status: 400 });
  }

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // partnerId로 Partner 조회
  let resolvedPartnerId = partnerId || null;
  if (!resolvedPartnerId && email) {
    const partner = await prisma.partner.findUnique({ where: { email: email.trim() } });
    if (partner) resolvedPartnerId = partner.id;
  }

  const reviewer = await prisma.reviewer.create({
    data: {
      sessionId,
      name: name.trim(),
      email: email?.trim() || null,
      partnerId: resolvedPartnerId,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const submitUrl = `${appUrl}/submit/${reviewer.token}`;

  // 이메일 발송
  if (sendEmail && process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "IR 투심 자동화 <noreply@yourdomain.com>",
        to: reviewer.email ?? "",
        subject: `[투심의견서] ${session.companyName} 투자심의 의견서 제출 요청`,
        html: `
          <div style="font-family: 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a1a;">${session.companyName} 투자심의 의견서 제출 안내</h2>
            <p>${reviewer.name} 님, 안녕하세요.</p>
            <p><strong>${session.companyName}</strong>에 대한 투심 의견서 제출을 부탁드립니다.</p>
            <p style="margin: 24px 0;">
              <a href="${submitUrl}" style="background-color: #e53e3e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                의견서 제출하기
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">링크: ${submitUrl}</p>
          </div>
        `,
      });
    } catch (e) {
      console.error("이메일 발송 실패:", e);
    }
  }

  // 슬랙 발송
  if (sendSlack && process.env.SLACK_WEBHOOK_URL) {
    try {
      const { IncomingWebhook } = await import("@slack/webhook");
      const webhook = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL);
      await webhook.send({
        text: `📋 *[투심의견서 제출 요청]* ${session.companyName}\n*${reviewer.name}* 님, 아래 링크에서 의견서를 제출해주세요.\n${submitUrl}`,
      });
    } catch (e) {
      console.error("슬랙 발송 실패:", e);
    }
  }

  return NextResponse.json({ ...reviewer, submitUrl }, { status: 201 });
}
