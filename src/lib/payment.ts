import { prisma } from '@/lib/prisma';

export type PaymentConfig = {
  qrImageUrl: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  notePrefix: string;
  contactText: string;
};

const PAYMENT_SETTING_KEYS = {
  qrImageUrl: 'payment.qrImageUrl',
  bankName: 'payment.bankName',
  accountName: 'payment.accountName',
  accountNumber: 'payment.accountNumber',
  notePrefix: 'payment.notePrefix',
  contactText: 'payment.contactText',
} as const;

export const PAYMENT_SETTING_PUBLIC_FIELDS = Object.keys(PAYMENT_SETTING_KEYS) as Array<keyof typeof PAYMENT_SETTING_KEYS>;

export function getEnvPaymentConfig(): PaymentConfig {
  return {
    qrImageUrl: process.env.NEXT_PUBLIC_PAYMENT_QR_IMAGE_URL || '',
    bankName: process.env.NEXT_PUBLIC_PAYMENT_BANK_NAME || '',
    accountName: process.env.NEXT_PUBLIC_PAYMENT_ACCOUNT_NAME || '',
    accountNumber: process.env.NEXT_PUBLIC_PAYMENT_ACCOUNT_NUMBER || '',
    notePrefix: process.env.NEXT_PUBLIC_PAYMENT_NOTE_PREFIX || 'GBSPEAKING',
    contactText: process.env.NEXT_PUBLIC_PAYMENT_CONTACT || 'Admin sẽ kích hoạt gói sau khi xác nhận chuyển khoản.',
  };
}

export async function getPaymentConfig(): Promise<PaymentConfig> {
  const fallback = getEnvPaymentConfig();
  const settings = await prisma.appSetting.findMany({
    where: { key: { in: Object.values(PAYMENT_SETTING_KEYS) } },
  });
  const map = Object.fromEntries(settings.map(setting => [setting.key, setting.value]));

  return {
    qrImageUrl: map[PAYMENT_SETTING_KEYS.qrImageUrl] ?? fallback.qrImageUrl,
    bankName: map[PAYMENT_SETTING_KEYS.bankName] ?? fallback.bankName,
    accountName: map[PAYMENT_SETTING_KEYS.accountName] ?? fallback.accountName,
    accountNumber: map[PAYMENT_SETTING_KEYS.accountNumber] ?? fallback.accountNumber,
    notePrefix: map[PAYMENT_SETTING_KEYS.notePrefix] ?? fallback.notePrefix,
    contactText: map[PAYMENT_SETTING_KEYS.contactText] ?? fallback.contactText,
  };
}

export async function savePaymentConfig(input: PaymentConfig) {
  const entries: Array<[keyof PaymentConfig, string]> = [
    ['qrImageUrl', input.qrImageUrl],
    ['bankName', input.bankName],
    ['accountName', input.accountName],
    ['accountNumber', input.accountNumber],
    ['notePrefix', input.notePrefix || 'GBSPEAKING'],
    ['contactText', input.contactText || 'Admin sẽ kích hoạt gói sau khi xác nhận chuyển khoản.'],
  ];

  await prisma.$transaction(
    entries.map(([field, value]) =>
      prisma.appSetting.upsert({
        where: { key: PAYMENT_SETTING_KEYS[field] },
        update: { value: value.trim() },
        create: { key: PAYMENT_SETTING_KEYS[field], value: value.trim() },
      })
    )
  );
}

export function formatVnd(value: number) {
  if (value <= 0) return 'Miễn phí';
  return `${value.toLocaleString('vi-VN')}đ`;
}
