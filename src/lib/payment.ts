export type PaymentConfig = {
  qrImageUrl: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  notePrefix: string;
  contactText: string;
};

export function getPaymentConfig(): PaymentConfig {
  return {
    qrImageUrl: process.env.NEXT_PUBLIC_PAYMENT_QR_IMAGE_URL || '',
    bankName: process.env.NEXT_PUBLIC_PAYMENT_BANK_NAME || '',
    accountName: process.env.NEXT_PUBLIC_PAYMENT_ACCOUNT_NAME || '',
    accountNumber: process.env.NEXT_PUBLIC_PAYMENT_ACCOUNT_NUMBER || '',
    notePrefix: process.env.NEXT_PUBLIC_PAYMENT_NOTE_PREFIX || 'GBSPEAKING',
    contactText: process.env.NEXT_PUBLIC_PAYMENT_CONTACT || 'Admin sẽ kích hoạt gói sau khi xác nhận chuyển khoản.',
  };
}

export function formatVnd(value: number) {
  if (value <= 0) return 'Miễn phí';
  return `${value.toLocaleString('vi-VN')}đ`;
}
