import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPaymentConfig, savePaymentConfig, type PaymentConfig } from '@/lib/payment';

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const payment = await getPaymentConfig();
  return NextResponse.json({ payment });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => ({})) as Partial<PaymentConfig>;
  const qrImageUrl = cleanText(body.qrImageUrl);
  if (qrImageUrl && !qrImageUrl.startsWith('/') && !/^https?:\/\//i.test(qrImageUrl)) {
    return NextResponse.json({ error: 'URL ảnh QR phải bắt đầu bằng http(s):// hoặc /' }, { status: 400 });
  }

  const payment: PaymentConfig = {
    qrImageUrl,
    bankName: cleanText(body.bankName),
    accountName: cleanText(body.accountName),
    accountNumber: cleanText(body.accountNumber),
    notePrefix: cleanText(body.notePrefix) || 'GBSPEAKING',
    contactText: cleanText(body.contactText) || 'Admin sẽ kích hoạt gói sau khi xác nhận chuyển khoản.',
  };

  await savePaymentConfig(payment);
  return NextResponse.json({ payment });
}
