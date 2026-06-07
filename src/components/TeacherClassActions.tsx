'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Archive, Copy, Loader2, UserMinus } from 'lucide-react';

export function CopyJoinCodeButton({ joinCode }: { joinCode: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(joinCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button type="button" onClick={copy} style={smallButton('#06B6D4')}>
      <Copy size={13} /> {copied ? 'Đã copy' : 'Copy mã'}
    </button>
  );
}

export function ArchiveClassButton({ classId }: { classId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const archive = async () => {
    if (!window.confirm('Lưu trữ lớp này? Học viên sẽ không thể join/làm bài mới trong lớp đã lưu trữ.')) return;
    setLoading(true);
    try {
      await fetch(`/api/classes/${classId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button type="button" disabled={loading} onClick={archive} style={smallButton('#F59E0B')}>
      {loading ? <Loader2 size={13} style={{ animation: 'spin-slow 1s linear infinite' }} /> : <Archive size={13} />}
      Lưu trữ
    </button>
  );
}

export function RemoveStudentButton({ classId, studentId }: { classId: string; studentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const remove = async () => {
    if (!window.confirm('Tạm dừng học viên này khỏi lớp? Dữ liệu luyện tập cũ vẫn được giữ.')) return;
    setLoading(true);
    try {
      await fetch(`/api/classes/${classId}/students/${studentId}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button type="button" disabled={loading} onClick={remove} style={smallButton('#EF4444')}>
      {loading ? <Loader2 size={13} style={{ animation: 'spin-slow 1s linear infinite' }} /> : <UserMinus size={13} />}
      Tạm dừng
    </button>
  );
}

function smallButton(color: string) {
  return {
    padding: '8px 11px',
    borderRadius: 8,
    border: `1px solid ${color}33`,
    background: `${color}12`,
    color,
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  };
}
