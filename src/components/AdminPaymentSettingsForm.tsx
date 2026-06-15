'use client';

import { useState } from 'react';
import { Loader2, QrCode, Save } from 'lucide-react';
import type { PaymentConfig } from '@/lib/payment';

export default function AdminPaymentSettingsForm({ initialPayment }: { initialPayment: PaymentConfig }) {
  const [form, setForm] = useState(initialPayment);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const update = (field: keyof PaymentConfig, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const submit = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/payment-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Không thể lưu cấu hình thanh toán');
        return;
      }
      setForm(data.payment);
      setMessage('Đã lưu cấu hình thanh toán QR.');
    } catch {
      setError('Không thể lưu cấu hình thanh toán');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
        <div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', marginBottom: 6 }}>Thanh toán QR</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>Cấu hình này sẽ hiển thị ở trang “Gói của tôi” cho học viên và giáo viên.</p>
        </div>
        <div style={{ width: 42, height: 42, borderRadius: 8, background: '#ECFDF5', border: '1px solid #BBF7D0', display: 'grid', placeItems: 'center', color: '#047857' }}>
          <QrCode size={20} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 220px', gap: 18, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <Field label="URL ảnh QR" value={form.qrImageUrl} placeholder="/payment-qr.png hoặc https://..." onChange={value => update('qrImageUrl', value)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Ngân hàng" value={form.bankName} placeholder="VD: Vietcombank" onChange={value => update('bankName', value)} />
            <Field label="Số tài khoản" value={form.accountNumber} placeholder="VD: 0123456789" onChange={value => update('accountNumber', value)} />
          </div>
          <Field label="Chủ tài khoản" value={form.accountName} placeholder="Tên chủ tài khoản" onChange={value => update('accountName', value)} />
          <Field label="Tiền tố nội dung chuyển khoản" value={form.notePrefix} placeholder="GBSPEAKING" onChange={value => update('notePrefix', value)} />
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={labelStyle}>Ghi chú hướng dẫn</span>
            <textarea
              value={form.contactText}
              onChange={event => update('contactText', event.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </label>
        </div>

        <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: 12, background: '#FFFFFF' }}>
          {form.qrImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.qrImageUrl} alt="Preview QR thanh toán" style={{ width: '100%', borderRadius: 6, display: 'block' }} />
          ) : (
            <div style={{ height: 196, borderRadius: 6, background: '#F8FAFC', border: '1px dashed #CBD5E1', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 16 }}>
              <div>
                <QrCode size={38} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>Nhập URL ảnh để xem preview QR</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
        <button type="button" className="btn-primary" onClick={submit} disabled={loading} style={{ padding: '10px 16px', fontSize: 13 }}>
          {loading ? <Loader2 size={15} style={{ animation: 'spin-slow 1s linear infinite' }} /> : <Save size={15} />}
          Lưu cấu hình QR
        </button>
        {message && <p style={{ fontSize: 13, color: '#047857', fontWeight: 700 }}>{message}</p>}
        {error && <p style={{ fontSize: 13, color: '#DC2626', fontWeight: 700 }}>{error}</p>}
      </div>
    </div>
  );
}

function Field({ label, value, placeholder, onChange }: { label: string; value: string; placeholder: string; onChange: (value: string) => void }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={labelStyle}>{label}</span>
      <input value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} style={inputStyle} />
    </label>
  );
}

const labelStyle = {
  fontSize: 12,
  fontWeight: 800,
  color: 'var(--text-secondary)',
};

const inputStyle = {
  width: '100%',
  border: '1px solid #D1D5DB',
  borderRadius: 8,
  padding: '10px 11px',
  fontSize: 13,
  color: 'var(--text-primary)',
  background: '#FFFFFF',
  boxSizing: 'border-box' as const,
};
