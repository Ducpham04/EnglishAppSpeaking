'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, PackageCheck } from 'lucide-react';

type PlanOption = {
  id: string;
  name: string;
  priceVnd: number;
};

export default function AdminSubscriptionForm({ userId, plans }: { userId: string; plans: PlanOption[] }) {
  const router = useRouter();
  const [planId, setPlanId] = useState(plans[0]?.id || '');
  const [months, setMonths] = useState(1);
  const [paymentNote, setPaymentNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!planId) return;
    setLoading(true);
    setError('');
    const endsAt = new Date();
    endsAt.setMonth(endsAt.getMonth() + months);

    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, planId, endsAt: endsAt.toISOString(), paymentNote }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Không thể cấp gói');
        return;
      }
      setPaymentNote('');
      router.refresh();
    } catch {
      setError('Không thể cấp gói');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = plans.find(plan => plan.id === planId);

  return (
    <div style={{ display: 'grid', gap: 6, minWidth: 260 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <select value={planId} onChange={event => setPlanId(event.target.value)} style={fieldStyle}>
          {plans.map(plan => (
            <option key={plan.id} value={plan.id}>{plan.name} · {plan.priceVnd.toLocaleString('vi-VN')}đ</option>
          ))}
        </select>
        <select value={months} onChange={event => setMonths(Number(event.target.value))} style={{ ...fieldStyle, maxWidth: 78 }}>
          {[1, 3, 6, 12].map(value => <option key={value} value={value}>{value}m</option>)}
        </select>
      </div>
      <input
        value={paymentNote}
        onChange={event => setPaymentNote(event.target.value)}
        placeholder={selectedPlan ? `VD: QR ${selectedPlan.name}` : 'Ghi chú thanh toán'}
        style={fieldStyle}
      />
      <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.45 }}>
        Cấp {selectedPlan?.name ?? 'gói'} trong {months} tháng. Gói active cũ sẽ tự chuyển sang expired.
      </p>
      <button type="button" disabled={loading || !planId} onClick={submit} style={buttonStyle}>
        {loading ? <Loader2 size={13} style={{ animation: 'spin-slow 1s linear infinite' }} /> : <PackageCheck size={13} />}
        Cấp gói
      </button>
      {error && <p style={{ fontSize: 11, color: '#EF4444' }}>{error}</p>}
    </div>
  );
}

const fieldStyle = {
  width: '100%',
  padding: '8px 9px',
  borderRadius: 7,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)',
  color: 'var(--text-primary)',
  fontSize: 12,
  boxSizing: 'border-box' as const,
};

const buttonStyle = {
  padding: '8px 10px',
  borderRadius: 7,
  border: '1px solid rgba(16,185,129,0.28)',
  background: 'rgba(16,185,129,0.1)',
  color: '#10B981',
  fontSize: 12,
  fontWeight: 800,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
};
