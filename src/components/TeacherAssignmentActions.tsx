'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';

export function RetryAssignmentButton({ assignmentId, studentId, disabled }: { assignmentId: string; studentId: string; disabled?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRetry = async () => {
    if (disabled || loading) return;
    if (!window.confirm('Yêu cầu học viên luyện lại bài này? Lần làm cũ vẫn được giữ trong lịch sử nhưng không còn tính là hoàn thành.')) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/students/${studentId}/retry`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Không thể yêu cầu luyện lại');
        return;
      }
      router.refresh();
    } catch {
      setError('Không thể yêu cầu luyện lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={handleRetry}
        style={{
          padding: '8px 10px',
          borderRadius: 8,
          border: '1px solid rgba(245,158,11,0.25)',
          background: disabled ? 'rgba(107,114,128,0.08)' : 'rgba(245,158,11,0.08)',
          color: disabled ? '#6B7280' : '#F59E0B',
          fontSize: 12,
          fontWeight: 800,
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        {loading ? <Loader2 size={13} style={{ animation: 'spin-slow 1s linear infinite' }} /> : <RotateCcw size={13} />}
        Luyện lại
      </button>
      {error && <p style={{ fontSize: 11, color: '#EF4444' }}>{error}</p>}
    </div>
  );
}
