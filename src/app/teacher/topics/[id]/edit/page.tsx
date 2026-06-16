'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { AlertCircle, ArrowLeft, BookOpenCheck, CheckCircle, ClipboardCheck, Eye, Loader2, Save, Sparkles } from 'lucide-react';
import type { CEFRLevel } from '@/lib/types';

const LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const RUBRIC_OPTIONS = [
  'Trả lời đúng tình huống và giữ vai hội thoại',
  'Dùng tiếng Anh trong phần lớn câu trả lời',
  'Nói thành câu đầy đủ, không chỉ trả lời một từ',
  'Dùng ít nhất 3 cụm từ vựng gợi ý',
  'Hỏi lại hoặc mở rộng ý khi AI đặt câu hỏi tiếp',
];

type TopicDetail = {
  id: string;
  title: string;
  description: string | null;
  level: CEFRLevel;
  icon: string;
  openingQuestion: string | null;
  systemPrompt: string;
  isPublic: boolean;
  _count?: { assignments: number; sessions: number };
};

function extractLineBlock(text: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`${escaped}:\\s*([\\s\\S]*?)(?=\\n(?:Mục tiêu|Tình huống|Từ vựng gợi ý|Tiêu chí):|$)`, 'i');
  return text.match(pattern)?.[1]?.trim() ?? '';
}

function parseDescription(description: string | null) {
  const text = description || '';
  const goal = extractLineBlock(text, 'Mục tiêu');
  const scenario = extractLineBlock(text, 'Tình huống');
  const vocabulary = extractLineBlock(text, 'Từ vựng gợi ý');
  const rubricText = extractLineBlock(text, 'Tiêu chí');
  return {
    goal,
    scenario,
    vocabulary,
    rubric: rubricText ? rubricText.split(';').map(item => item.trim()).filter(Boolean) : [],
  };
}

function buildSystemPrompt(input: {
  level: CEFRLevel;
  goal: string;
  scenario: string;
  vocabulary: string;
  rubric: string[];
}) {
  return [
    `You are a supportive English speaking coach for a ${input.level} learner.`,
    `Learning goal: ${input.goal.trim()}`,
    `Conversation scenario: ${input.scenario.trim()}`,
    input.vocabulary.trim() ? `Target vocabulary and phrases: ${input.vocabulary.trim()}` : '',
    input.rubric.length > 0 ? `Success criteria:\n${input.rubric.map(item => `- ${item}`).join('\n')}` : '',
    'Instructions:',
    '- Keep the conversation natural, friendly, and level appropriate.',
    '- Ask one question at a time and encourage the student to speak more.',
    '- Correct only the most important mistake in each turn.',
    '- Prefer short, actionable feedback before asking the next question.',
    '- If the student uses Vietnamese, help them say the same idea in English.',
  ].filter(Boolean).join('\n');
}

function buildDescription(input: { goal: string; scenario: string; vocabulary: string; rubric: string[]; fallback: string }) {
  const structured = [
    input.goal.trim() ? `Mục tiêu: ${input.goal.trim()}` : '',
    input.scenario.trim() ? `Tình huống: ${input.scenario.trim()}` : '',
    input.vocabulary.trim() ? `Từ vựng gợi ý: ${input.vocabulary.trim()}` : '',
    input.rubric.length > 0 ? `Tiêu chí: ${input.rubric.join('; ')}` : '',
  ].filter(Boolean).join('\n');

  return structured || input.fallback.trim();
}

export default function EditTeacherTopicPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [title, setTitle] = useState('');
  const [fallbackDescription, setFallbackDescription] = useState('');
  const [level, setLevel] = useState<CEFRLevel>('A1');
  const [icon, setIcon] = useState('🗣️');
  const [goal, setGoal] = useState('');
  const [scenario, setScenario] = useState('');
  const [vocabulary, setVocabulary] = useState('');
  const [rubric, setRubric] = useState<string[]>(RUBRIC_OPTIONS.slice(0, 4));
  const [openingQuestion, setOpeningQuestion] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const generatedPrompt = useMemo(
    () => buildSystemPrompt({ level, goal, scenario, vocabulary, rubric }),
    [goal, level, rubric, scenario, vocabulary]
  );
  const systemPrompt = useCustomPrompt ? customPrompt : generatedPrompt;
  const description = useMemo(
    () => buildDescription({ goal, scenario, vocabulary, rubric, fallback: fallbackDescription }),
    [fallbackDescription, goal, rubric, scenario, vocabulary]
  );

  useEffect(() => {
    const loadTopic = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/teacher/topics/${id}`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Không thể tải topic');
          return;
        }
        const loaded = data.topic as TopicDetail;
        const parsed = parseDescription(loaded.description);
        setTopic(loaded);
        setTitle(loaded.title);
        setFallbackDescription(loaded.description || '');
        setLevel(loaded.level);
        setIcon(loaded.icon || '🗣️');
        setGoal(parsed.goal);
        setScenario(parsed.scenario);
        setVocabulary(parsed.vocabulary);
        setRubric(parsed.rubric.length > 0 ? parsed.rubric : RUBRIC_OPTIONS.slice(0, 4));
        setOpeningQuestion(loaded.openingQuestion || '');
        setCustomPrompt(loaded.systemPrompt || '');
        setUseCustomPrompt(true);
        setIsPublic(loaded.isPublic);
      } catch {
        setError('Không thể tải topic');
      } finally {
        setLoading(false);
      }
    };

    loadTopic();
  }, [id]);

  const toggleRubric = (item: string) => {
    setRubric(current => current.includes(item) ? current.filter(value => value !== item) : [...current, item]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !openingQuestion.trim() || !systemPrompt.trim()) {
      setError('Tiêu đề, câu mở đầu và prompt là bắt buộc');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/teacher/topics/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          level,
          icon,
          openingQuestion,
          systemPrompt,
          isPublic,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Không thể lưu topic');
        return;
      }
      router.push('/teacher/topics');
    } catch {
      setError('Không thể lưu topic');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '8px 0 28px' }}>
        <div style={{ marginBottom: 22 }}>
          <Link href="/teacher/topics" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
            <ArrowLeft size={14} /> Quay lại thư viện hội thoại
          </Link>
        </div>

        <div style={{ marginBottom: 24 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>
            Edit AI conversation
          </p>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 30, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 8 }}>
            Sửa topic speaking
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 740, lineHeight: 1.65 }}>
            Chỉnh mục tiêu, tình huống, tiêu chí và prompt AI. Topic đang dùng trong bài tập vẫn được cập nhật cho các lượt luyện tiếp theo.
          </p>
        </div>

        {loading ? (
          <div style={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={32} style={{ animation: 'spin-slow 1s linear infinite', color: 'var(--primary-light)' }} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.45fr) minmax(320px, 0.85fr)', gap: 20, alignItems: 'start' }}>
            <div style={{ display: 'grid', gap: 16 }}>
              {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={16} style={{ color: '#EF4444' }} />
                  <p style={{ fontSize: 13, color: '#EF4444' }}>{error}</p>
                </div>
              )}

              {topic && (
                <div className="glass-card" style={{ padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    Đang dùng trong <strong>{topic._count?.assignments ?? 0}</strong> bài tập và <strong>{topic._count?.sessions ?? 0}</strong> buổi luyện.
                  </p>
                  <Link href={`/teacher/assignments/create?topicId=${topic.id}`} style={{ textDecoration: 'none' }}>
                    <button type="button" className="btn-secondary" style={{ padding: '9px 12px', fontSize: 13 }}>
                      Giao bài từ topic này
                    </button>
                  </Link>
                </div>
              )}

              <section className="glass-card" style={{ padding: 24 }}>
                <SectionTitle icon={BookOpenCheck} color="#0F766E" title="1. Thông tin topic" />
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 150px 120px', gap: 14, marginBottom: 16 }}>
                  <label>
                    <span style={labelStyle}>Tên topic *</span>
                    <input value={title} onChange={event => setTitle(event.target.value)} style={fieldStyle} />
                  </label>
                  <label>
                    <span style={labelStyle}>Level *</span>
                    <select value={level} onChange={event => setLevel(event.target.value as CEFRLevel)} style={fieldStyle}>
                      {LEVELS.map(item => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </label>
                  <label>
                    <span style={labelStyle}>Icon</span>
                    <input value={icon} onChange={event => setIcon(event.target.value)} style={fieldStyle} />
                  </label>
                </div>

                <label style={{ display: 'block', marginBottom: 16 }}>
                  <span style={labelStyle}>Mục tiêu luyện nói</span>
                  <textarea value={goal} onChange={event => setGoal(event.target.value)} rows={2} placeholder="Học viên cần luyện kỹ năng gì sau topic này?" style={textareaStyle} />
                </label>

                <label style={{ display: 'block', marginBottom: 16 }}>
                  <span style={labelStyle}>Tình huống / vai hội thoại</span>
                  <textarea value={scenario} onChange={event => setScenario(event.target.value)} rows={3} placeholder="AI đóng vai ai? Học viên cần làm nhiệm vụ gì?" style={textareaStyle} />
                </label>

                <label style={{ display: 'block', marginBottom: 16 }}>
                  <span style={labelStyle}>Từ vựng / mẫu câu gợi ý</span>
                  <textarea value={vocabulary} onChange={event => setVocabulary(event.target.value)} rows={2} style={textareaStyle} />
                </label>

                {!goal && !scenario && fallbackDescription && (
                  <label style={{ display: 'block', marginBottom: 16 }}>
                    <span style={labelStyle}>Mô tả cũ</span>
                    <textarea value={fallbackDescription} onChange={event => setFallbackDescription(event.target.value)} rows={3} style={textareaStyle} />
                  </label>
                )}

                <label style={{ display: 'block' }}>
                  <span style={labelStyle}>Câu mở đầu của AI *</span>
                  <textarea value={openingQuestion} onChange={event => setOpeningQuestion(event.target.value)} rows={3} style={textareaStyle} />
                </label>
              </section>

              <section className="glass-card" style={{ padding: 24 }}>
                <SectionTitle icon={ClipboardCheck} color="#D97706" title="2. Tiêu chí và quyền hiển thị" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10, marginBottom: 18 }}>
                  {RUBRIC_OPTIONS.map(item => {
                    const checked = rubric.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleRubric(item)}
                        style={{
                          textAlign: 'left',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: `1px solid ${checked ? '#86EFAC' : '#E5E7EB'}`,
                          background: checked ? '#F0FDF4' : '#FFFFFF',
                          color: checked ? '#166534' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 750,
                          lineHeight: 1.45,
                        }}
                      >
                        {checked && <CheckCircle size={13} style={{ marginRight: 6, verticalAlign: -2 }} />}
                        {item}
                      </button>
                    );
                  })}
                </div>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: 14, borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                  <span>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 3 }}>Cho học viên tự chọn topic này</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nếu tắt, topic chỉ dùng khi giáo viên giao bài.</span>
                  </span>
                  <input type="checkbox" checked={isPublic} onChange={event => setIsPublic(event.target.checked)} />
                </label>
              </section>

              <section className="glass-card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(value => !value)}
                    style={{ border: 0, background: 'transparent', color: 'var(--primary)', fontWeight: 850, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}
                  >
                    <Eye size={15} /> {showAdvanced ? 'Ẩn prompt nâng cao' : 'Xem/chỉnh prompt nâng cao'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUseCustomPrompt(false);
                      setCustomPrompt(generatedPrompt);
                    }}
                    style={{ border: '1px solid #BFDBFE', background: '#EFF6FF', color: 'var(--primary)', borderRadius: 8, padding: '8px 10px', fontSize: 12, fontWeight: 850, cursor: 'pointer' }}
                  >
                    Dùng prompt tự sinh
                  </button>
                </div>
                {showAdvanced && (
                  <label style={{ display: 'block', marginTop: 14 }}>
                    <span style={labelStyle}>System prompt gửi cho AI</span>
                    <textarea
                      value={useCustomPrompt ? customPrompt : generatedPrompt}
                      onChange={event => {
                        setUseCustomPrompt(true);
                        setCustomPrompt(event.target.value);
                      }}
                      rows={10}
                      style={textareaStyle}
                    />
                  </label>
                )}
              </section>
            </div>

            <aside style={{ position: 'sticky', top: 20 }}>
              <div className="glass-card" style={{ padding: 22, marginBottom: 14 }}>
                <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 12 }}>
                  Preview topic
                </h2>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ padding: 14, borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                    <p style={{ fontSize: 24, marginBottom: 8 }}>{icon || '🗣️'}</p>
                    <p style={{ fontSize: 15, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 4 }}>{title || 'Tên topic'}</p>
                    <p style={{ fontSize: 12, color: 'var(--primary)' }}>Level {level} · {isPublic ? 'Public' : 'Private'}</p>
                  </div>
                  <PreviewBlock label="Mục tiêu" value={goal || fallbackDescription || 'Chưa có mục tiêu'} />
                  <PreviewBlock label="Tình huống" value={scenario || 'Chưa có tình huống'} />
                  <PreviewBlock label="AI mở đầu" value={openingQuestion || 'Chưa nhập câu mở đầu'} />
                </div>
              </div>

              <div className="glass-card" style={{ padding: 22, marginBottom: 14 }}>
                <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 10 }}>
                  Prompt đang dùng
                </h2>
                <pre style={{ maxHeight: 300, overflow: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'Inter, sans-serif', fontSize: 12, lineHeight: 1.55, color: 'var(--text-secondary)', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12 }}>
                  {systemPrompt}
                </pre>
              </div>

              <button type="submit" className="btn-primary" disabled={saving} style={{ width: '100%', padding: '15px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {saving ? <Loader2 size={16} style={{ animation: 'spin-slow 1s linear infinite' }} /> : <Save size={16} />}
                Lưu thay đổi
              </button>
            </aside>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}

function SectionTitle({ icon: Icon, color, title }: { icon: typeof Sparkles; color: string; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
      <Icon size={18} style={{ color }} />
      <h2 style={{ fontSize: 16, fontWeight: 850, color: 'var(--text-primary)' }}>{title}</h2>
    </div>
  );
}

function PreviewBlock({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 12, borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 850, marginBottom: 5 }}>{label}</p>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{value}</p>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  marginBottom: 8,
  fontSize: 13,
  fontWeight: 800,
  color: 'var(--text-secondary)',
};

const fieldStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 8,
  border: '1px solid #D1D5DB',
  background: '#FFFFFF',
  color: 'var(--text-primary)',
  fontSize: 14,
  boxSizing: 'border-box' as const,
};

const textareaStyle = {
  ...fieldStyle,
  resize: 'vertical' as const,
  fontFamily: 'Inter, sans-serif',
  lineHeight: 1.5,
};
