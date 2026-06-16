'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, UserCog } from 'lucide-react';

type EditableRole = 'student' | 'teacher';

const ROLE_LABEL: Record<EditableRole, string> = {
  student: 'Học viên',
  teacher: 'Giáo viên',
};

export default function AdminRoleForm({ userId, currentRole }: { userId: string; currentRole: EditableRole }) {
  const router = useRouter();
  const [role, setRole] = useState<EditableRole>(currentRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const changed = role !== currentRole;

  const submit = async () => {
    if (!changed) return;
    const confirmed = window.confirm(`Chuyển tài khoản này sang ${ROLE_LABEL[role]}?`);
    if (!confirmed) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Không thể đổi role');
        return;
      }
      router.refresh();
    } catch {
      setError('Không thể đổi role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 7, width: 150 }}>
      <select value={role} onChange={event => setRole(event.target.value as EditableRole)} style={fieldStyle}>
        <option value="student">Học viên</option>
        <option value="teacher">Giáo viên</option>
      </select>
      <button type="button" disabled={loading || !changed} onClick={submit} style={{ ...buttonStyle, opacity: changed ? 1 : 0.58 }}>
        {loading ? <Loader2 size={13} style={{ animation: 'spin-slow 1s linear infinite' }} /> : <UserCog size={13} />}
        Cập nhật
      </button>
      {error && <p style={{ fontSize: 11, color: '#EF4444', lineHeight: 1.4 }}>{error}</p>}
    </div>
  );
}

const fieldStyle = {
  width: '100%',
  padding: '8px 9px',
  borderRadius: 7,
  border: '1px solid #D1D5DB',
  background: '#FFFFFF',
  color: 'var(--text-primary)',
  fontSize: 12,
  boxSizing: 'border-box' as const,
};

const buttonStyle = {
  padding: '8px 10px',
  borderRadius: 7,
  border: '1px solid #BFDBFE',
  background: '#EFF6FF',
  color: 'var(--primary)',
  fontSize: 12,
  fontWeight: 800,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
};
