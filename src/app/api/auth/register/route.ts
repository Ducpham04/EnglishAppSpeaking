import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { isValidPhone, normalizeEmail, normalizePhone } from '@/lib/contact';

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, password } = await request.json();
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);

    if (!name || !password || (!normalizedEmail && !normalizedPhone)) {
      return NextResponse.json(
        { error: 'Vui lòng nhập họ tên, mật khẩu và email hoặc số điện thoại' },
        { status: 400 }
      );
    }

    if (normalizedPhone && !isValidPhone(normalizedPhone)) {
      return NextResponse.json(
        { error: 'Số điện thoại chưa hợp lệ' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Mật khẩu phải có ít nhất 6 ký tự' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
        ],
      },
    });

    if (existing) {
      const duplicatedPhone = normalizedPhone && existing.phone === normalizedPhone;
      return NextResponse.json(
        { error: duplicatedPhone ? 'Số điện thoại này đã được sử dụng' : 'Email này đã được sử dụng' },
        { status: 409 }
      );
    }

    // Create user
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        phone: normalizedPhone,
        passwordHash,
        role: 'student', // Default role
      },
    });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}
