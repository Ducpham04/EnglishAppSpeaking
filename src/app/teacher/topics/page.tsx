'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import {
  AlertCircle,
  ClipboardList,
  Edit3,
  Eye,
  EyeOff,
  Loader2,
  Mic,
  PlusCircle,
  Trash2,
} from 'lucide-react';

type TeacherTopic = {
  id: string;
  title: string;
  description: string | null;
  level: string;
  icon: string;
  openingQuestion: string | null;
  isPublic: boolean;
  createdAt: string;
  _count?: { assignments: number; sessions: number };
};

export default function TeacherTopicsPage() {
  const [topics, setTopics] = useState<TeacherTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const loadTopics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/teacher/topics', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Không thể tải thư viện hội thoại');
        return;
      }
      setTopics(data.topics || []);
    } catch {
      setError('Không thể tải thư viện hội thoại');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopics();
  }, []);

  const filteredTopics = useMemo(() => {
    if (filter === 'public') return topics.filter(topic => topic.isPublic);
    if (filter === 'private') return topics.filter(topic => !topic.isPublic);
    return topics;
  }, [filter, topics]);

  const toggleVisibility = async (topic: TeacherTopic) => {
    setBusyId(topic.id);
    setError('');
    try {
      const res = await fetch(`/api/teacher/topics/${topic.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !topic.isPublic }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Không thể cập nhật topic');
        return;
      }
      await loadTopics();
    } catch {
      setError('Không thể cập nhật topic');
    } finally {
      setBusyId(null);
    }
  };

  const deleteTopic = async (topic: TeacherTopic) => {
    if (!window.confirm('Xóa topic này? Chỉ topic chưa có bài tập/buổi luyện mới xóa được.')) return;
    setBusyId(topic.id);
    setError('');
    try {
      const res = await fetch(`/api/teacher/topics/${topic.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Không thể xóa topic');
        return;
      }
      await loadTopics();
    } catch {
      setError('Không thể xóa topic');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, marginBottom: 26 }}>
        <div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 28, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 6 }}>
            Thư viện hội thoại AI
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Quản lý các conversation do bạn tạo để dùng lại khi giao bài cho lớp.
          </p>
        </div>
        <Link href="/teacher/topics/new" style={{ textDecoration: 'none' }}>
          <button className="btn-primary" style={{ padding: '10px 16px', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <PlusCircle size={15} /> Tạo hội thoại
          </button>
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Tổng topic', value: topics.length, color: '#7C3AED' },
          { label: 'Đang public', value: topics.filter(topic => topic.isPublic).length, color: '#10B981' },
          { label: 'Riêng tư', value: topics.filter(topic => !topic.isPublic).length, color: '#F59E0B' },
        ].map(item => (
          <div key={item.label} className="glass-card" style={{ padding: 18 }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{item.label}</p>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 26, fontWeight: 850, color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {[
          ['all', 'Tất cả'],
          ['public', 'Public'],
          ['private', 'Riêng tư'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: `1px solid ${filter === value ? 'rgba(124,58,237,0.45)' : 'rgba(255,255,255,0.1)'}`,
              background: filter === value ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)',
              color: filter === value ? 'var(--primary-light)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            {label}
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
        <div style={{ minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={32} style={{ animation: 'spin-slow 1s linear infinite', color: 'var(--primary-light)' }} />
        </div>
      ) : filteredTopics.length === 0 ? (
        <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
          <Mic size={44} style={{ color: 'var(--text-muted)', marginBottom: 14 }} />
          <h2 style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)', fontSize: 20, marginBottom: 8 }}>Chưa có hội thoại nào</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>Tạo conversation đầu tiên để giao bài luyện nói có mục tiêu rõ ràng.</p>
          <Link href="/teacher/topics/new" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ padding: '11px 20px' }}>+ Tạo hội thoại</button>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filteredTopics.map(topic => {
            const assignments = topic._count?.assignments ?? 0;
            const sessions = topic._count?.sessions ?? 0;
            const canDelete = assignments === 0 && sessions === 0;
            return (
              <article key={topic.id} className="glass-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(124,58,237,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                    {topic.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, color: 'var(--text-primary)', fontWeight: 850, marginBottom: 4 }}>{topic.title}</h2>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Level {topic.level} · {assignments} bài · {sessions} buổi</p>
                  </div>
                  <span style={{ padding: '4px 8px', borderRadius: 7, fontSize: 10, fontWeight: 850, color: topic.isPublic ? '#10B981' : '#F59E0B', background: topic.isPublic ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)' }}>
                    {topic.isPublic ? 'PUBLIC' : 'PRIVATE'}
                  </span>
                </div>

                <p style={{ minHeight: 42, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 14 }}>
                  {topic.description || topic.openingQuestion || 'Chưa có mô tả.'}
                </p>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link href={`/teacher/assignments/create?topicId=${topic.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                    <button style={actionButton('#10B981')}>
                      <ClipboardList size={13} /> Giao bài
                    </button>
                  </Link>
                  <Link href={`/teacher/topics/${topic.id}/edit`} style={{ textDecoration: 'none' }}>
                    <button style={iconButton('var(--primary-light)', 'rgba(124,58,237,0.12)', 'rgba(124,58,237,0.25)')} title="Sửa topic">
                      <Edit3 size={14} />
                    </button>
                  </Link>
                  <button type="button" disabled={busyId === topic.id} onClick={() => toggleVisibility(topic)} style={iconButton('#06B6D4', 'rgba(6,182,212,0.09)', 'rgba(6,182,212,0.22)')} title={topic.isPublic ? 'Ẩn topic' : 'Public topic'}>
                    {topic.isPublic ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button type="button" disabled={busyId === topic.id || !canDelete} onClick={() => deleteTopic(topic)} style={iconButton(canDelete ? '#EF4444' : '#6B7280', canDelete ? 'rgba(239,68,68,0.08)' : 'rgba(107,114,128,0.08)', canDelete ? 'rgba(239,68,68,0.22)' : 'rgba(107,114,128,0.18)')} title={canDelete ? 'Xóa topic' : 'Topic đã có dữ liệu, không thể xóa'}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}

function actionButton(color: string): CSSProperties {
  return {
    width: '100%',
    padding: '9px 10px',
    borderRadius: 8,
    border: `1px solid ${color}33`,
    background: `${color}14`,
    color,
    fontWeight: 800,
    fontSize: 12,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  };
}

function iconButton(color: string, background: string, border: string): CSSProperties {
  return {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: `1px solid ${border}`,
    background,
    color,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
}
