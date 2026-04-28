import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "이메일을 입력해주세요." }, { status: 400 });

  // 이메일 존재 여부와 관계없이 동일한 응답 반환 (보안)
  const partner = await prisma.partner.findUnique({ where: { email: email.trim().toLowerCase() } });

  if (partner && partner.password && process.env.RESEND_API_KEY) {
    // 기존 미사용 토큰 무효화
    await prisma.passwordResetToken.updateMany({
      where: { partnerId: partner.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // 새 토큰 생성 (1시간 유효)
    const resetToken = await prisma.passwordResetToken.create({
      data: {
        partnerId: partner.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dhp-ir-committee.vercel.app";
    const resetUrl = `${appUrl}/reviewer/reset-password/${resetToken.token}`;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "DHP 투심 시스템 <noreply@dhp-ir-committee.vercel.app>";

    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: fromEmail,
        to: partner.email!,
        subject: "[DHP 투심] 비밀번호 재설정 안내",
        html: `
          <div style="font-family: 'Malgun Gothic', Apple SD Gothic Neo, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; color: #111;">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="font-size: 20px; font-weight: 700; color: #111;">DHP 투심 시스템</div>
              <div style="font-size: 13px; color: #888; margin-top: 4px;">비밀번호 재설정</div>
            </div>
            <p style="font-size: 14px; line-height: 1.8; margin-bottom: 8px;">안녕하세요, <strong>${partner.name}</strong> 님.</p>
            <p style="font-size: 14px; line-height: 1.8; margin-bottom: 24px;">
              비밀번호 재설정 요청이 접수되었습니다.<br/>
              아래 버튼을 클릭하여 새 비밀번호를 설정하세요.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}"
                style="display: inline-block; background: #24AF64; color: white; padding: 14px 32px;
                       border-radius: 10px; font-size: 15px; font-weight: 700; text-decoration: none;">
                비밀번호 재설정하기
              </a>
            </div>
            <p style="font-size: 12px; color: #999; line-height: 1.8;">
              이 링크는 <strong>1시간</strong> 동안 유효합니다.<br/>
              본인이 요청하지 않은 경우 이 이메일을 무시하세요.<br/>
              링크: ${resetUrl}
            </p>
          </div>
        `,
      });
    } catch (e) {
      console.error("비밀번호 재설정 이메일 발송 실패:", e);
    }
  }

  // 이메일 존재 여부 노출 방지
  return NextResponse.json({ success: true });
}
