type SendPasswordResetEmailInput = {
  to: string;
  name: string;
  resetUrl: string;
};

export async function sendPasswordResetEmail({ to, name, resetUrl }: SendPasswordResetEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.PASSWORD_RESET_FROM_EMAIL || 'GB Speaking AI <onboarding@resend.dev>';

  if (!apiKey) {
    console.info('[password-reset] RESEND_API_KEY is not configured. Reset link:', resetUrl);
    return { ok: true, skipped: true };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject: 'Đặt lại mật khẩu GB Speaking AI',
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          <h2>Đặt lại mật khẩu</h2>
          <p>Xin chào ${escapeHtml(name)},</p>
          <p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản GB Speaking AI.</p>
          <p>
            <a href="${resetUrl}" style="display:inline-block;background:#2563EB;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:700">
              Đặt lại mật khẩu
            </a>
          </p>
          <p>Liên kết này sẽ hết hạn sau 30 phút. Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email.</p>
        </div>
      `,
      text: `Xin chào ${name},\n\nMở link sau để đặt lại mật khẩu GB Speaking AI:\n${resetUrl}\n\nLink hết hạn sau 30 phút.`,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Resend email failed: ${response.status} ${detail}`);
  }

  return { ok: true, skipped: false };
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
