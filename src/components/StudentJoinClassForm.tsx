'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, LogIn, TicketCheck } from 'lucide-react';

export default function StudentJoinClassForm() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');

    const code = joinCode.trim();
    if (!code) {
      setError('Nhập mã lớp do giáo viên cung cấp');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/classes/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ joinCode: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Không thể tham gia lớp');
        return;
      }

      setJoinCode('');
      setMessage(data.alreadyJoined ? `Bạn đã ở trong lớp ${data.class.name}` : `Đã tham gia lớp ${data.class.name}`);
      router.refresh();
    } catch {
      setError('Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(6,182,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TicketCheck size={17} style={{ color: '#06B6D4' }} />
        </div>
        <div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Tham gia lớp học</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nhập mã lớp giáo viên gửi cho bạn</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={joinCode}
          onChange={event => setJoinCode(event.target.value.toUpperCase())}
          placeholder="VD: A7K2P9"
          maxLength={12}
          style={{
            flex: '1 1 180px',
            minWidth: 0,
            padding: '12px 14px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            color: 'var(--text-primary)',
            fontSize: 14,
            outline: 'none',
            letterSpacing: 1,
            fontWeight: 700,
            textTransform: 'uppercase',
          }}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={isLoading}
          style={{ padding: '12px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}
        >
          {isLoading ? <Loader2 size={15} style={{ animation: 'spin-slow 1s linear infinite' }} /> : <LogIn size={15} />}
          Join lớp
        </button>
      </form>

      {(error || message) && (
        <p style={{ marginTop: 10, fontSize: 12, color: error ? '#EF4444' : '#10B981' }}>
          {error || message}
        </p>
      )}
    </div>
  );
}
