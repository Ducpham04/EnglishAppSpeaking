'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Save,
  Send,
  Sparkles,
  Target,
} from 'lucide-react';

interface ClassOption {
  id: string;
  name: string;
  level: string | null;
  students?: unknown[];
}

interface TopicOption {
  id: string;
  title: string;
  icon: string;
  level: string;
  description?: string;
  openingQuestion?: string;
}

const RUBRIC_OPTIONS = [
  'Trả lời đúng chủ đề và theo vai hội thoại',
  'Dùng tiếng Anh trong phần lớn câu trả lời',
  'Đặt câu đầy đủ, dễ hiểu và có liên kết',
  'Sử dụng từ vựng phù hợp với tình huống',
  'Hỏi lại hoặc mở rộng ý khi cần thiết',
];

const COMPLETION_PRESETS = [
  { label: 'Nhanh', minutes: 3, messages: 4 },
  { label: 'Chuẩn', minutes: 5, messages: 6 },
  { label: 'Kỹ', minutes: 8, messages: 8 },
];

function getQueryValue(key: string) {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get(key) || '';
}

function buildInstruction(input: {
  goal: string;
  scenario: string;
  instruction: string;
  rubricItems: string[];
}) {
  const parts = [
    input.goal.trim() ? `Mục tiêu: ${input.goal.trim()}` : '',
    input.scenario.trim() ? `Tình huống/vai hội thoại: ${input.scenario.trim()}` : '',
    input.rubricItems.length > 0 ? `Tiêu chí cần đạt:\n${input.rubricItems.map(item => `- ${item}`).join('\n')}` : '',
    input.instruction.trim() ? `Hướng dẫn thêm: ${input.instruction.trim()}` : '',
  ].filter(Boolean);

  return parts.join('\n\n');
}

export default function CreateAssignmentPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [classId, setClassId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [scenario, setScenario] = useState('');
  const [instruction, setInstruction] = useState('');
  const [deadline, setDeadline] = useState('');
  const [minDuration, setMinDuration] = useState(5);
  const [minMessages, setMinMessages] = useState(6);
  const [rubricItems, setRubricItems] = useState<string[]>(RUBRIC_OPTIONS.slice(0, 4));
  const [isLoading, setIsLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const queryClassId = getQueryValue('classId');
      const queryTopicId = getQueryValue('topicId');
      if (queryClassId) setClassId(queryClassId);
      if (queryTopicId) setTopicId(queryTopicId);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true);
      try {
        const [classesRes, topicsRes] = await Promise.all([
          fetch('/api/classes', { cache: 'no-store' }),
          fetch('/api/topics', { cache: 'no-store' }),
        ]);
        const [classesData, topicsData] = await Promise.all([classesRes.json(), topicsRes.json()]);
        setClasses(classesData.classes || []);
        setTopics(topicsData.topics || []);
      } catch {
        setError('Không thể tải danh sách lớp hoặc chủ đề.');
      } finally {
        setLoadingOptions(false);
      }
    };

    loadOptions();
  }, []);

  const selectedClass = classes.find(item => item.id === classId);
  const selectedTopic = topics.find(item => item.id === topicId);
  const composedInstruction = useMemo(
    () => buildInstruction({ goal, scenario, instruction, rubricItems }),
    [goal, scenario, instruction, rubricItems]
  );
  const readyToPublish = Boolean(classId && topicId && title.trim() && goal.trim() && scenario.trim());

  const toggleRubric = (item: string) => {
    setRubricItems(current =>
      current.includes(item) ? current.filter(value => value !== item) : [...current, item]
    );
  };

  const applyPreset = (minutes: number, messages: number) => {
    setMinDuration(minutes);
    setMinMessages(messages);
  };

  const handleSubmit = async (status: 'draft' | 'published') => {
    if (!classId || !topicId || !title.trim()) {
      setError('Vui lòng chọn lớp, chủ đề và nhập tiêu đề bài học.');
      return;
    }
    if (status === 'published' && (!goal.trim() || !scenario.trim())) {
      setError('Trước khi giao bài, giáo viên cần nhập mục tiêu và tình huống hội thoại.');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          topicId,
          title: title.trim(),
          instruction: composedInstruction,
          deadline: deadline || null,
          minDurationSec: minDuration * 60,
          minMessages,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Tạo bài học thất bại');
        return;
      }
      router.push(status === 'published' ? '/teacher/assignments' : `/teacher/assignments/${data.id}/edit`);
    } catch {
      setError('Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 1120 }}>
        <div style={{ marginBottom: 22 }}>
          <Link href="/teacher/assignments" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
            <ArrowLeft size={14} /> Quay lại danh sách bài tập
          </Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 28, color: 'var(--text-primary)', marginBottom: 8 }}>
              Tạo bài luyện hội thoại
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 700 }}>
              Thiết kế bài học theo đúng mục tiêu, tình huống, tiêu chí chấm điểm và điều kiện hoàn thành trước khi giao cho học viên.
            </p>
          </div>
          <Link href={`/teacher/topics/new${classId ? `?classId=${classId}` : ''}`} style={{ textDecoration: 'none' }}>
            <button className="btn-secondary" style={{ padding: '10px 14px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={15} /> Tạo AI conversation
            </button>
          </Link>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 18, display: 'flex', gap: 8 }}>
            <AlertCircle size={16} style={{ color: '#EF4444', flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: '#EF4444' }}>{error}</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.45fr) minmax(320px, 0.85fr)', gap: 20, alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: 16 }}>
            <section className="glass-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <BookOpenCheck size={18} style={{ color: '#06B6D4' }} />
                <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>1. Lớp và conversation</h2>
              </div>

              {loadingOptions ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 13 }}>
                  <Loader2 size={16} style={{ animation: 'spin-slow 1s linear infinite' }} /> Đang tải dữ liệu...
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <label style={{ display: 'block' }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Lớp học *</span>
                    <select value={classId} onChange={event => setClassId(event.target.value)} required style={fieldStyle}>
                      <option value="">-- Chọn lớp --</option>
                      {classes.map(item => <option key={item.id} value={item.id}>{item.name}{item.level ? ` (${item.level})` : ''}</option>)}
                    </select>
                  </label>

                  <label style={{ display: 'block' }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Chủ đề AI *</span>
                    <select value={topicId} onChange={event => setTopicId(event.target.value)} required style={fieldStyle}>
                      <option value="">-- Chọn conversation --</option>
                      {topics.map(item => <option key={item.id} value={item.id}>{item.icon} {item.title} ({item.level})</option>)}
                    </select>
                  </label>
                </div>
              )}

              {selectedTopic && (
                <div style={{ marginTop: 14, padding: 14, borderRadius: 8, background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.14)' }}>
                  <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 800 }}>{selectedTopic.icon} {selectedTopic.title} · {selectedTopic.level}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{selectedTopic.description || selectedTopic.openingQuestion || 'Conversation này sẽ được dùng làm ngữ cảnh cho AI.'}</p>
                </div>
              )}
            </section>

            <section className="glass-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <Target size={18} style={{ color: '#10B981' }} />
                <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>2. Mục tiêu bài học</h2>
              </div>

              <div style={{ display: 'grid', gap: 16 }}>
                <label style={{ display: 'block' }}>
                  <span style={labelStyle}>Tiêu đề bài học *</span>
                  <input value={title} onChange={event => setTitle(event.target.value)} placeholder="VD: Role-play đặt bàn tại nhà hàng" style={fieldStyle} />
                </label>

                <label style={{ display: 'block' }}>
                  <span style={labelStyle}>Mục tiêu cần đạt *</span>
                  <input value={goal} onChange={event => setGoal(event.target.value)} placeholder="VD: Học viên đặt bàn, hỏi về thực đơn và xác nhận thời gian bằng tiếng Anh." style={fieldStyle} />
                </label>

                <label style={{ display: 'block' }}>
                  <span style={labelStyle}>Tình huống / vai hội thoại *</span>
                  <textarea value={scenario} onChange={event => setScenario(event.target.value)} rows={3} placeholder="VD: Học viên là khách hàng, AI là nhân viên nhà hàng. Học viên cần đặt bàn cho 4 người vào tối thứ Bảy." style={textareaStyle} />
                </label>

                <label style={{ display: 'block' }}>
                  <span style={labelStyle}>Hướng dẫn thêm cho học viên</span>
                  <textarea value={instruction} onChange={event => setInstruction(event.target.value)} rows={3} placeholder="Từ vựng gợi ý, yêu cầu tránh tiếng Việt, lưu ý về ngữ pháp..." style={textareaStyle} />
                </label>
              </div>
            </section>

            <section className="glass-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <ClipboardCheck size={18} style={{ color: '#F59E0B' }} />
                <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>3. Chấm điểm và hoàn thành</h2>
              </div>

              <div style={{ display: 'grid', gap: 18 }}>
                <div>
                  <span style={labelStyle}>Tiêu chí chấm điểm</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
                    {RUBRIC_OPTIONS.map(item => {
                      const checked = rubricItems.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleRubric(item)}
                          style={{
                            textAlign: 'left',
                            padding: '10px 12px',
                            borderRadius: 8,
                            border: `1px solid ${checked ? 'rgba(16,185,129,0.45)' : 'rgba(255,255,255,0.1)'}`,
                            background: checked ? 'rgba(16,185,129,0.11)' : 'rgba(255,255,255,0.03)',
                            color: checked ? '#6EE7B7' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 700,
                            lineHeight: 1.4,
                          }}
                        >
                          {checked && <CheckCircle2 size={13} style={{ marginRight: 6, verticalAlign: -2 }} />}
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span style={labelStyle}>Mức hoàn thành gợi ý</span>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                    {COMPLETION_PRESETS.map(item => (
                      <button key={item.label} type="button" onClick={() => applyPreset(item.minutes, item.messages)} style={presetStyle(minDuration === item.minutes && minMessages === item.messages)}>
                        {item.label}: {item.minutes}p · {item.messages} lượt
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                    <label style={{ display: 'block' }}>
                      <span style={labelStyle}>Deadline</span>
                      <input type="datetime-local" value={deadline} onChange={event => setDeadline(event.target.value)} style={fieldStyle} />
                    </label>
                    <label style={{ display: 'block' }}>
                      <span style={labelStyle}>Tối thiểu phút</span>
                      <input type="number" min={1} max={30} value={minDuration} onChange={event => setMinDuration(Number(event.target.value))} style={fieldStyle} />
                    </label>
                    <label style={{ display: 'block' }}>
                      <span style={labelStyle}>Tối thiểu lượt nói</span>
                      <input type="number" min={2} max={20} value={minMessages} onChange={event => setMinMessages(Number(event.target.value))} style={fieldStyle} />
                    </label>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside style={{ position: 'sticky', top: 20 }}>
            <div className="glass-card" style={{ padding: 22, marginBottom: 14 }}>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', marginBottom: 12 }}>
                Preview bài giao
              </h2>
              <div style={{ display: 'grid', gap: 10, fontSize: 13 }}>
                <PreviewRow label="Lớp" value={selectedClass?.name || 'Chưa chọn'} />
                <PreviewRow label="Conversation" value={selectedTopic ? `${selectedTopic.icon} ${selectedTopic.title}` : 'Chưa chọn'} />
                <PreviewRow label="Tiêu đề" value={title.trim() || 'Chưa nhập'} />
                <PreviewRow label="Điều kiện" value={`${minDuration} phút · ${minMessages} lượt nói`} />
                <PreviewRow label="Trạng thái" value={readyToPublish ? 'Sẵn sàng giao bài' : 'Cần bổ sung mục tiêu'} />
              </div>
            </div>

            <div className="glass-card" style={{ padding: 22, marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>Nội dung sẽ lưu vào bài học</h3>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'Inter, sans-serif', fontSize: 12, lineHeight: 1.55, color: 'var(--text-secondary)', maxHeight: 280, overflow: 'auto' }}>
                {composedInstruction || 'Nhập mục tiêu, tình huống và tiêu chí để học viên và AI có ngữ cảnh rõ ràng.'}
              </pre>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <button type="button" className="btn-secondary" disabled={isLoading} onClick={() => handleSubmit('draft')} style={{ width: '100%', padding: '13px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {isLoading ? <Loader2 size={16} style={{ animation: 'spin-slow 1s linear infinite' }} /> : <Save size={16} />}
                Lưu nháp
              </button>
              <button type="button" className="btn-primary" disabled={isLoading || !readyToPublish} onClick={() => handleSubmit('published')} style={{ width: '100%', padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {isLoading ? <Loader2 size={16} style={{ animation: 'spin-slow 1s linear infinite' }} /> : <Send size={16} />}
                Giao bài cho học viên
              </button>
            </div>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)' }}>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</p>
      <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 800 }}>{value}</p>
    </div>
  );
}

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--text-secondary)',
  marginBottom: 8,
};

const fieldStyle: CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: 'var(--text-primary)',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
  boxSizing: 'border-box',
};

const textareaStyle: CSSProperties = {
  ...fieldStyle,
  resize: 'vertical',
  lineHeight: 1.5,
};

function presetStyle(active: boolean): CSSProperties {
  return {
    padding: '8px 11px',
    borderRadius: 8,
    border: `1px solid ${active ? 'rgba(124,58,237,0.45)' : 'rgba(255,255,255,0.1)'}`,
    background: active ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)',
    color: active ? 'var(--primary-light)' : 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 800,
  };
}
