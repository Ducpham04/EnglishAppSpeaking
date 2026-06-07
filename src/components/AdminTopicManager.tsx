'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Globe, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { Topic } from '@/lib/types';

type AdminTopic = Topic & {
  id: string;
  isPublic: boolean;
  createdAt: string;
  createdBy?: { name?: string | null } | null;
};

const INITIAL_FORM = {
  title: '',
  description: '',
  level: 'A1',
  icon: '💬',
  openingQuestion: '',
  systemPrompt: '',
  isPublic: true,
};

export default function AdminTopicManager() {
  const [topics, setTopics] = useState<AdminTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingTopic, setEditingTopic] = useState<AdminTopic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchTopics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/topics');
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Không thể tải danh sách topic' }));
        throw new Error(data.error || 'Failed to load topics');
      }
      const data = await res.json();
      setTopics(data.topics || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load topics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTopics();
  }, []);

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditingTopic(null);
    setError(null);
    setSuccess(null);
  };

  const handleInput = (field: keyof typeof INITIAL_FORM, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    if (!form.title.trim() || !form.openingQuestion.trim() || !form.systemPrompt.trim()) {
      setError('Tiêu đề, câu mở đầu và nội dung system prompt là bắt buộc');
      return;
    }

    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        openingQuestion: form.openingQuestion.trim(),
        systemPrompt: form.systemPrompt.trim(),
      };

      const url = editingTopic ? `/api/admin/topics/${editingTopic.id}` : '/api/admin/topics';
      const method = editingTopic ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Lỗi khi lưu topic' }));
        throw new Error(data.error || 'Failed to save topic');
      }

      await fetchTopics();
      setSuccess(editingTopic ? 'Cập nhật topic thành công' : 'Thêm topic thành công');
      resetForm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể lưu topic');
    }
  };

  const handleEdit = (topic: AdminTopic) => {
    setEditingTopic(topic);
    setForm({
      title: topic.title,
      description: topic.description ?? '',
      level: topic.level,
      icon: topic.icon,
      openingQuestion: topic.openingQuestion,
      systemPrompt: topic.systemPrompt,
      isPublic: topic.isPublic,
    });
    setError(null);
    setSuccess(null);
  };

  const handleDelete = async (topicId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa topic này không?')) return;
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/topics/${topicId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Lỗi khi xóa topic' }));
        throw new Error(data.error || 'Failed to delete topic');
      }
      await fetchTopics();
      setSuccess('Xóa topic thành công');
      if (editingTopic?.id === topicId) resetForm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể xóa topic');
    }
  };

  const levelOptions = useMemo(() => ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 20, color: 'var(--text-primary)', margin: 0 }}>Quản lý topic</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '6px 0 0', fontSize: 13 }}>Thêm, sửa hoặc xóa chủ đề AI cho bài luyện nói.</p>
        </div>
        <button
          type="button"
          onClick={resetForm}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', cursor: 'pointer' }}
        >
          <Plus size={16} /> Thêm topic mới
        </button>
      </div>

      {(error || success) && (
        <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {error && (
            <div style={{ padding: '14px 18px', borderRadius: 14, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ padding: '14px 18px', borderRadius: 14, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={16} />
              {success}
            </div>
          )}
        </div>
      )}

      <div className="glass-card" style={{ padding: 24, marginBottom: 32 }}>
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr', marginBottom: 24 }}>
          <label style={{ display: 'block' }}>
            <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>Tiêu đề</span>
            <input
              value={form.title}
              onChange={e => handleInput('title', e.target.value)}
              placeholder="Self Introduction"
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)' }}
            />
          </label>
          <label style={{ display: 'block' }}>
            <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>Level</span>
            <select
              value={form.level}
              onChange={e => handleInput('level', e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)' }}
            >
              {levelOptions.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'block' }}>
            <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>Biểu tượng</span>
            <input
              value={form.icon}
              onChange={e => handleInput('icon', e.target.value)}
              placeholder="🌍"
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)' }}
            />
          </label>
          <label style={{ display: 'block' }}>
            <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>Hiển thị công khai</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.isPublic} onChange={e => handleInput('isPublic', e.target.checked)} />
                <span style={{ color: 'var(--text-primary)' }}>Công khai</span>
              </label>
            </div>
          </label>
        </div>

        <label style={{ display: 'block', marginBottom: 16 }}>
          <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>Mô tả</span>
          <textarea
            value={form.description}
            onChange={e => handleInput('description', e.target.value)}
            rows={2}
            placeholder="Mô tả ngắn gọn về chủ đề"
            style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)' }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: 16 }}>
          <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>Câu mở đầu</span>
          <textarea
            value={form.openingQuestion}
            onChange={e => handleInput('openingQuestion', e.target.value)}
            rows={2}
            placeholder="Hello! My name is Alex..."
            style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)' }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: 24 }}>
          <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>System prompt</span>
          <textarea
            value={form.systemPrompt}
            onChange={e => handleInput('systemPrompt', e.target.value)}
            rows={5}
            placeholder="You are a friendly English speaking partner..."
            style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)' }}
          />
        </label>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleSave}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderRadius: 12, border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer' }}
          >
            <Save size={16} />
            {editingTopic ? 'Cập nhật topic' : 'Lưu topic'}
          </button>
          {editingTopic && (
            <button
              type="button"
              onClick={resetForm}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', cursor: 'pointer' }}
            >
              <X size={16} /> Hủy
            </button>
          )}
        </div>
      </div>

      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Danh sách topic</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '6px 0 0' }}>{topics.length} topic</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isLoading && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đang tải...</span>}
            <Globe size={18} style={{ color: 'var(--text-muted)' }} />
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {['Tiêu đề', 'Level', 'Public', 'Người tạo', 'Ngày tạo', 'Hành động'].map(header => (
                <th key={header} style={{ padding: '14px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topics.map(topic => (
              <tr key={topic.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <td style={{ padding: '14px 18px', fontSize: 13, color: 'var(--text-primary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>{topic.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700 }}>{topic.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{topic.description}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '14px 18px', fontSize: 13, color: 'var(--text-secondary)' }}>{topic.level}</td>
                <td style={{ padding: '14px 18px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '6px 10px', borderRadius: 999, background: topic.isPublic ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: topic.isPublic ? '#10B981' : '#EF4444' }}>
                    {topic.isPublic ? 'Công khai' : 'Riêng tư'}
                  </span>
                </td>
                <td style={{ padding: '14px 18px', fontSize: 13, color: 'var(--text-secondary)' }}>{topic.createdBy?.name ?? 'Hệ thống'}</td>
                <td style={{ padding: '14px 18px', fontSize: 12, color: 'var(--text-muted)' }}>{new Date(topic.createdAt).toLocaleDateString('vi-VN')}</td>
                <td style={{ padding: '14px 18px', display: 'flex', gap: 10 }}>
                  <button type="button" onClick={() => handleEdit(topic)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    <Pencil size={14} /> Sửa
                  </button>
                  <button type="button" onClick={() => handleDelete(topic.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', cursor: 'pointer' }}>
                    <Trash2 size={14} /> Xóa
                  </button>
                </td>
              </tr>
            ))}
            {topics.length === 0 && !isLoading && (
              <tr>
                <td colSpan={6} style={{ padding: '28px 18px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Chưa có topic nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
