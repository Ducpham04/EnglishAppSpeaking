import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isEmailLike, normalizeEmail, normalizePhone } from '@/lib/contact';
import { createPasswordResetToken, getAppBaseUrl, getPasswordResetExpiry, hashPasswordResetToken } from '@/lib/password-reset';
import { sendPasswordResetEmail } from '@/lib/email';

const GENERIC_MESSAGE = 'Nếu tài khoản tồn tại và có email, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as { identifier?: string };
    const identifier = typeof body.identifier === 'string' ? body.identifier.trim() : '';

    if (!identifier) {
      return NextResponse.json({ message: GENERIC_MESSAGE });
    }

    const user = isEmailLike(identifier)
      ? await prisma.user.findUnique({ where: { email: normalizeEmail(identifier) ?? '' } })
      : await prisma.user.findUnique({ where: { phone: normalizePhone(identifier) ?? '' } });

    if (!user || user.status !== 'active' || !user.email) {
      return NextResponse.json({ message: GENERIC_MESSAGE });
    }

    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });

    const token = createPasswordResetToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashPasswordResetToken(token),
        expiresAt: getPasswordResetExpiry(),
      },
    });

    const resetUrl = `${getAppBaseUrl().replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
    await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });

    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ message: GENERIC_MESSAGE });
  }
}
