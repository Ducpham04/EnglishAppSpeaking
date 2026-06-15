'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { ArrowLeft, BookOpenCheck, CheckCircle, ClipboardCheck, Eye, Loader2, Mic, Sparkles } from 'lucide-react';
import { CEFRLevel } from '@/lib/types';

const LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const TOPIC_TEMPLATES = [
  {
    id: 'daily',
    label: 'Daily conversation',
    icon: '💬',
    title: 'Daily routine and free time',
    level: 'A2' as CEFRLevel,
    goal: 'Giúp học viên nói về thói quen hằng ngày, sở thích và hoạt động sau giờ học.',
    scenario: 'AI là một người bạn mới. Hỏi học viên về một ngày bình thường, thời gian rảnh và những việc em thích làm.',
    vocabulary: 'usually, after that, in my free time, I often, because',
    openingQuestion: 'Hi! Tell me about your usual day. What do you often do after school or work?',
  },
  {
    id: 'ielts1',
    label: 'IELTS Speaking Part 1',
    icon: '🎯',
    title: 'IELTS Part 1 - Hometown',
    level: 'B1' as CEFRLevel,
    goal: 'Luyện trả lời câu hỏi ngắn, rõ ý, có mở rộng nhẹ như IELTS Speaking Part 1.',
    scenario: 'AI là giám khảo IELTS thân thiện. Hỏi 5-7 câu về quê hương, nơi sống, điều thích và điều muốn thay đổi.',
    vocabulary: 'located in, famous for, convenient, peaceful, improve',
    openingQuestion: 'Let’s talk about your hometown. Where is it, and what is it like?',
  },
  {
    id: 'travel',
    label: 'Travel role-play',
    icon: '✈️',
    title: 'Booking a hotel room',
    level: 'B1' as CEFRLevel,
    goal: 'Giúp học viên đặt phòng khách sạn, hỏi giá, tiện nghi và xác nhận thông tin.',
    scenario: 'AI là lễ tân khách sạn. Học viên là khách du lịch cần đặt phòng cho chuyến đi cuối tuần.',
    vocabulary: 'available, single room, double room, facilities, reservation',
    openingQuestion: 'Good evening! Welcome to our hotel. How can I help you with your reservation?',
  },
  {
    id: 'interview',
    label: 'Job interview',
    icon: '💼',
    title: 'Job interview practice',
    level: 'B2' as CEFRLevel,
    goal: 'Luyện trả lời phỏng vấn về kinh nghiệm, điểm mạnh, tình huống khó và mục tiêu nghề nghiệp.',
    scenario: 'AI là nhà tuyển dụng. Học viên là ứng viên, cần trả lời chuyên nghiệp và đưa ví dụ cụ thể.',
    vocabulary: 'responsible for, experience in, strength, challenge, achievement',
    openingQuestion: 'Thank you for coming today. Could you briefly introduce yourself and your experience?',
  },
  {
    id: 'debate',
    label: 'Class discussion',
    icon: '🧠',
    title: 'Technology in education',
    level: 'C1' as CEFRLevel,
    goal: 'Luyện trình bày quan điểm, đưa ví dụ, phản biện nhẹ và kết luận mạch lạc.',
    scenario: 'AI là người điều phối thảo luận. Hỏi học viên về lợi ích và rủi ro của công nghệ trong giáo dục.',
    vocabulary: 'from my perspective, evidence, drawback, benefit, long-term impact',
    openingQuestion: 'From your perspective, how is technology changing the way students learn?',
  },
];

const RUBRIC_OPTIONS = [
  'Trả lời đúng tình huống và giữ vai hội thoại',
  'Dùng tiếng Anh trong phần lớn câu trả lời',
  'Nói thành câu đầy đủ, không chỉ trả lời một từ',
  'Dùng ít nhất 3 cụm từ vựng gợi ý',
  'Hỏi lại hoặc mở rộng ý khi AI đặt câu hỏi tiếp',
];

function getClassId() {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('classId') || '';
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

function buildDescription(input: { goal: string; scenario: string; vocabulary: string; rubric: string[] }) {
  return [
    input.goal.trim() ? `Mục tiêu: ${input.goal.trim()}` : '',
    input.scenario.trim() ? `Tình huống: ${input.scenario.trim()}` : '',
    input.vocabulary.trim() ? `Từ vựng gợi ý: ${input.vocabulary.trim()}` : '',
    input.rubric.length > 0 ? `Tiêu chí: ${input.rubric.join('; ')}` : '',
  ].filter(Boolean).join('\n');
}

export default function TeacherTopicCreatePage() {
  const router = useRouter();
  const [classId] = useState(getClassId);
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState<CEFRLevel>('A1');
  const [icon, setIcon] = useState('🗣️');
  const [goal, setGoal] = useState('');
  const [scenario, setScenario] = useState('');
  const [vocabulary, setVocabulary] = useState('');
  const [openingQuestion, setOpeningQuestion] = useState('Hello! Let’s practice speaking English together. What would you like to say first?');
  const [rubric, setRubric] = useState<string[]>(RUBRIC_OPTIONS.slice(0, 4));
  const [isPublic, setIsPublic] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const generatedPrompt = useMemo(
    () => buildSystemPrompt({ level, goal, scenario, vocabulary, rubric }),
    [goal, level, rubric, scenario, vocabulary]
  );
  const systemPrompt = showAdvanced && customPrompt.trim() ? customPrompt : generatedPrompt;
  const description = useMemo(
    () => buildDescription({ goal, scenario, vocabulary, rubric }),
    [goal, rubric, scenario, vocabulary]
  );

  const applyTemplate = (template: typeof TOPIC_TEMPLATES[number]) => {
    setSelectedTemplate(template.id);
    setTitle(template.title);
    setLevel(template.level);
    setIcon(template.icon);
    setGoal(template.goal);
    setScenario(template.scenario);
    setVocabulary(template.vocabulary);
    setOpeningQuestion(template.openingQuestion);
    setRubric(RUBRIC_OPTIONS.slice(0, 4));
    setCustomPrompt('');
  };

  const toggleRubric = (item: string) => {
    setRubric(current => current.includes(item) ? current.filter(value => value !== item) : [...current, item]);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!title.trim() || !goal.trim() || !scenario.trim() || !openingQuestion.trim()) {
      setError('Vui lòng nhập tiêu đề, mục tiêu, tình huống và câu mở đầu.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/teacher/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description,
          level,
          icon: icon.trim() || '🗣️',
          openingQuestion: openingQuestion.trim(),
          systemPrompt,
          isPublic,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Tạo chủ đề thất bại.');
        return;
      }

      if (classId) {
        router.push(`/teacher/assignments/create?classId=${classId}&topicId=${data.topic.id}&title=${encodeURIComponent(title)}&goal=${encodeURIComponent(goal)}&scenario=${encodeURIComponent(scenario)}&instruction=${encodeURIComponent(vocabulary ? `Từ vựng gợi ý: ${vocabulary}` : '')}`);
      } else {
        router.push(`/teacher/assignments/create?topicId=${data.topic.id}&title=${encodeURIComponent(title)}&goal=${encodeURIComponent(goal)}&scenario=${encodeURIComponent(scenario)}&instruction=${encodeURIComponent(vocabulary ? `Từ vựng gợi ý: ${vocabulary}` : '')}`);
      }
    } catch {
      setError('Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, marginBottom: 24, flexWrap: 'wrap' }}>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>
              AI conversation builder
            </p>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 850, fontSize: 30, color: 'var(--text-primary)', marginBottom: 8 }}>
              Tạo topic speaking cho lớp học
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 760, lineHeight: 1.65 }}>
              Chọn mẫu, nhập mục tiêu và tình huống. Hệ thống sẽ tự sinh prompt cho AI để giáo viên không phải viết lệnh kỹ thuật.
            </p>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', color: 'var(--primary-dark)', fontSize: 12, fontWeight: 850 }}>
            <Mic size={15} /> Teacher tool
          </div>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', borderRadius: 8, padding: 14, marginBottom: 18, fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.45fr) minmax(320px, 0.85fr)', gap: 20, alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: 16 }}>
            <section className="glass-card" style={{ padding: 24 }}>
              <SectionTitle icon={Sparkles} color="var(--primary)" title="1. Chọn mẫu nhanh" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
                {TOPIC_TEMPLATES.map(template => {
                  const active = selectedTemplate === template.id;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => applyTemplate(template)}
                      style={{
                        textAlign: 'left',
                        padding: 14,
                        borderRadius: 8,
                        border: `1px solid ${active ? 'var(--primary)' : '#E5E7EB'}`,
                        background: active ? '#EFF6FF' : '#FFFFFF',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 24 }}>{template.icon}</span>
                        <span style={{ fontSize: 11, color: active ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 850 }}>{template.level}</span>
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 5 }}>{template.label}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45 }}>{template.title}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="glass-card" style={{ padding: 24 }}>
              <SectionTitle icon={BookOpenCheck} color="#0F766E" title="2. Thông tin topic" />
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 150px 120px', gap: 14, marginBottom: 16 }}>
                <label>
                  <span style={labelStyle}>Tên topic *</span>
                  <input value={title} onChange={event => setTitle(event.target.value)} placeholder="VD: Booking a hotel room" style={fieldStyle} />
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
                <span style={labelStyle}>Mục tiêu luyện nói *</span>
                <textarea value={goal} onChange={event => setGoal(event.target.value)} rows={2} placeholder="Học viên cần luyện kỹ năng gì sau topic này?" style={textareaStyle} />
              </label>

              <label style={{ display: 'block', marginBottom: 16 }}>
                <span style={labelStyle}>Tình huống / vai hội thoại *</span>
                <textarea value={scenario} onChange={event => setScenario(event.target.value)} rows={3} placeholder="AI đóng vai ai? Học viên cần làm nhiệm vụ gì?" style={textareaStyle} />
              </label>

              <label style={{ display: 'block', marginBottom: 16 }}>
                <span style={labelStyle}>Từ vựng / mẫu câu gợi ý</span>
                <textarea value={vocabulary} onChange={event => setVocabulary(event.target.value)} rows={2} placeholder="VD: available, reservation, Could I book..." style={textareaStyle} />
              </label>

              <label style={{ display: 'block' }}>
                <span style={labelStyle}>Câu mở đầu của AI *</span>
                <textarea value={openingQuestion} onChange={event => setOpeningQuestion(event.target.value)} rows={3} style={textareaStyle} />
              </label>
            </section>

            <section className="glass-card" style={{ padding: 24 }}>
              <SectionTitle icon={ClipboardCheck} color="#D97706" title="3. Tiêu chí và quyền hiển thị" />
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
              <button
                type="button"
                onClick={() => {
                  setShowAdvanced(value => !value);
                  if (!customPrompt) setCustomPrompt(generatedPrompt);
                }}
                style={{ border: 0, background: 'transparent', color: 'var(--primary)', fontWeight: 850, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}
              >
                <Eye size={15} /> {showAdvanced ? 'Ẩn prompt nâng cao' : 'Xem/chỉnh prompt nâng cao'}
              </button>
              {showAdvanced && (
                <label style={{ display: 'block', marginTop: 14 }}>
                  <span style={labelStyle}>System prompt gửi cho AI</span>
                  <textarea value={customPrompt || generatedPrompt} onChange={event => setCustomPrompt(event.target.value)} rows={10} style={textareaStyle} />
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
                <PreviewBlock label="Mục tiêu" value={goal || 'Chưa nhập mục tiêu'} />
                <PreviewBlock label="Tình huống" value={scenario || 'Chưa nhập tình huống'} />
                <PreviewBlock label="AI mở đầu" value={openingQuestion || 'Chưa nhập câu mở đầu'} />
              </div>
            </div>

            <div className="glass-card" style={{ padding: 22, marginBottom: 14 }}>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 10 }}>
                Prompt được tự sinh
              </h2>
              <pre style={{ maxHeight: 300, overflow: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'Inter, sans-serif', fontSize: 12, lineHeight: 1.55, color: 'var(--text-secondary)', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12 }}>
                {systemPrompt}
              </pre>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', padding: '15px 0', fontSize: 15 }}
              disabled={isLoading}
            >
              {isLoading ? <><Loader2 size={16} style={{ animation: 'spin-slow 1s linear infinite' }} /> Đang tạo...</> : <><CheckCircle size={16} /> Tạo topic và giao bài</>}
            </button>
          </aside>
        </form>
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
