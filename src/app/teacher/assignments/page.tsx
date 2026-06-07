'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import {
  AlertCircle,
  Archive,
  ClipboardList,
  Edit3,
  Loader2,
  PlusCircle,
  School,
  Trash2,
  Users,
} from 'lucide-react';

type Assignment = {
  id: string;
  title: string;
  instruction: string | null;
  deadline: string | null;
  minDurationSec: number;
  minMessages: number;
  status: string;
  class: { id: string; name: string; students?: unknown[] };
  topic: { id: string; title: string; icon: string; level: string };
  sessions: Array<{ id: string; status: string }>;
};

const STATUS_LABEL: Record<string, string> = {
  published: 'Đang mở',
  draft: 'Nháp',
  archived: 'Đã lưu trữ',
};

const STATUS_COLOR: Record<string, string> = {
  published: '#10B981',
  draft: '#F59E0B',
  archived: '#6B7280',
};

export default function TeacherAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('active');

  const loadAssignments = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/assignments', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Không thể tải danh sách bài tập');
        return;
      }
      setAssignments(data.assignments || []);
    } catch {
      setError('Không thể tải danh sách bài tập');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  const filteredAssignments = useMemo(() => {
    if (statusFilter === 'all') return assignments;
    if (statusFilter === 'active') return assignments.filter(item => item.status !== 'archived');
    return assignments.filter(item => item.status === statusFilter);
  }, [assignments, statusFilter]);

  const totals = useMemo(() => {
    const active = assignments.filter(item => item.status === 'published').length;
    const archived = assignments.filter(item => item.status === 'archived').length;
    const completed = assignments.reduce((sum, item) => sum + item.sessions.filter(s => s.status === 'completed').length, 0);
    return { active, archived, completed };
  }, [assignments]);

  const handleArchiveOrDelete = async (assignment: Assignment) => {
    const hasSessions = assignment.sessions.length > 0;
    const message = hasSessions
      ? 'Bài này đã có dữ liệu luyện tập. Hệ thống sẽ lưu trữ thay vì xóa hẳn để giữ tiến độ học viên. Tiếp tục?'
      : 'Xóa bài tập này? Hành động này không thể hoàn tác.';
    if (!window.confirm(message)) return;

    setBusyId(assignment.id);
    setError('');
    try {
      const res = await fetch(`/api/assignments/${assignment.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Không thể xóa bài tập');
        return;
      }
      await loadAssignments();
    } catch {
      setError('Không thể xóa bài tập');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 26, color: 'var(--text-primary)', marginBottom: 6 }}>
            Bài tập đã giao
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Quản lý, chỉnh sửa và theo dõi tiến độ các bài luyện nói theo lớp.
          </p>
        </div>
        <Link href="/teacher/assignments/create" style={{ textDecoration: 'none' }}>
          <button className="btn-primary" style={{ padding: '10px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <PlusCircle size={15} /> Giao bài mới
          </button>
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 22 }}>
        {[
          { label: 'Tổng bài tập', value: assignments.length, icon: ClipboardList, color: '#7C3AED' },
          { label: 'Đang mở', value: totals.active, icon: School, color: '#10B981' },
          { label: 'Lượt hoàn thành', value: totals.completed, icon: Users, color: '#06B6D4' },
          { label: 'Đã lưu trữ', value: totals.archived, icon: Archive, color: '#6B7280' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="glass-card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} style={{ color: item.color }} />
                </div>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>{item.label}</p>
                  <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>{item.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {[
          { value: 'active', label: 'Đang quản lý' },
          { value: 'published', label: 'Đang mở' },
          { value: 'draft', label: 'Nháp' },
          { value: 'archived', label: 'Lưu trữ' },
          { value: 'all', label: 'Tất cả' },
        ].map(filter => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setStatusFilter(filter.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: `1px solid ${statusFilter === filter.value ? 'rgba(124,58,237,0.45)' : 'rgba(255,255,255,0.1)'}`,
              background: statusFilter === filter.value ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)',
              color: statusFilter === filter.value ? 'var(--primary-light)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} style={{ color: '#EF4444' }} />
          <p style={{ fontSize: 13, color: '#EF4444' }}>{error}</p>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 260 }}>
          <Loader2 size={32} style={{ animation: 'spin-slow 1s linear infinite', color: 'var(--primary-light)' }} />
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
          <ClipboardList size={46} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, color: 'var(--text-primary)', fontSize: 20, marginBottom: 8 }}>
            Chưa có bài tập phù hợp
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 22 }}>Tạo bài luyện nói đầu tiên để học viên bắt đầu thực hành.</p>
          <Link href="/teacher/assignments/create" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ padding: '11px 22px' }}>+ Giao bài mới</button>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
          {filteredAssignments.map(assignment => {
            const studentsCount = assignment.class.students?.length ?? 0;
            const completedCount = assignment.sessions.filter(s => s.status === 'completed').length;
            const completionRate = studentsCount > 0 ? Math.round((completedCount / studentsCount) * 100) : 0;
            const statusColor = STATUS_COLOR[assignment.status] || '#7C3AED';
            const deadlineLabel = assignment.deadline
              ? new Date(assignment.deadline).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
              : 'Không deadline';

            return (
              <div key={assignment.id} className="glass-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(124,58,237,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                    {assignment.topic.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <Link href={`/teacher/assignments/${assignment.id}`} style={{ textDecoration: 'none' }}>
                      <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', marginBottom: 4 }}>
                        {assignment.title}
                      </h2>
                    </Link>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {assignment.topic.title} · {assignment.topic.level}
                    </p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: `${statusColor}18`, color: statusColor, whiteSpace: 'nowrap' }}>
                    {STATUS_LABEL[assignment.status] || assignment.status}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)' }}>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Lớp</p>
                    <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 700 }}>{assignment.class.name}</p>
                  </div>
                  <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)' }}>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Deadline</p>
                    <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 700 }}>{deadlineLabel}</p>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Hoàn thành</span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700 }}>{completedCount}/{studentsCount} · {completionRate}%</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${completionRate}%`, background: 'var(--gradient-primary)', borderRadius: 999 }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link href={`/teacher/classes/${assignment.class.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                    <button style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid rgba(6,182,212,0.25)', background: 'rgba(6,182,212,0.08)', color: '#06B6D4', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                      Xem lớp
                    </button>
                  </Link>
                  <Link href={`/teacher/assignments/${assignment.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                    <button style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.08)', color: '#10B981', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                      Kết quả
                    </button>
                  </Link>
                  <Link href={`/teacher/assignments/${assignment.id}/edit`} style={{ textDecoration: 'none' }}>
                    <button style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.1)', color: 'var(--primary-light)', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Edit3 size={13} /> Sửa
                    </button>
                  </Link>
                  <button
                    type="button"
                    disabled={busyId === assignment.id}
                    onClick={() => handleArchiveOrDelete(assignment)}
                    style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    {assignment.sessions.length > 0 ? <Archive size={13} /> : <Trash2 size={13} />}
                    {busyId === assignment.id ? '...' : assignment.sessions.length > 0 ? 'Lưu trữ' : 'Xóa'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
