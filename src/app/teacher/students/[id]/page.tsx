import { auth } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { prisma } from '@/lib/prisma';
import {
  aggregateFeedbackNotes,
  aggregateMistakes,
  average,
  buildSkillScores,
  recommendedTeacherActions,
  weakestSkill,
} from '@/lib/speaking-insights';
import { AlertTriangle, ArrowLeft, Award, BookOpen, CheckCircle2, Clock, MessageSquareText, Mic, Target, TrendingUp } from 'lucide-react';

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}g ${m}p`;
  return `${m}p`;
}

function formatDate(date: Date | null) {
  if (!date) return 'Chưa có';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default async function TeacherStudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'teacher' && session.user.role !== 'admin') redirect('/');

  const teacherId = session.user.id;

  const student = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, status: true, createdAt: true },
  });

  if (!student) notFound();

  const enrollments = await prisma.classStudent.findMany({
    where: {
      studentId: student.id,
      status: 'active',
      class: session.user.role === 'admin' ? { status: 'active' } : { teacherId, status: 'active' },
    },
    include: { class: true },
    orderBy: { joinedAt: 'desc' },
  });

  if (enrollments.length === 0 && session.user.role !== 'admin') notFound();

  const sessions = await prisma.session.findMany({
    where: {
      studentId: student.id,
      assignment: session.user.role === 'admin'
        ? undefined
        : { class: { teacherId } },
    },
    include: {
      topic: true,
      assignment: { include: { class: true } },
      messages: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { startedAt: 'desc' },
  });

  const completed = sessions.filter(item => item.status === 'completed');
  const messages = completed.flatMap(item => item.messages);
  const mistakes = aggregateMistakes(messages).slice(0, 12);
  const feedback = aggregateFeedbackNotes(completed);
  const totalDuration = completed.reduce((sum, item) => sum + item.durationSec, 0);
  const totalMessages = completed.reduce((sum, item) => sum + item.totalUserMessages, 0);
  const avgScore = average(completed.map(item => item.score));
  const lastActivity = sessions[0]?.startedAt ?? null;

  const skills = buildSkillScores({
    taskScore: average(completed.map(item => item.taskScore)),
    fluencyScore: average(completed.map(item => item.fluencyScore)),
    grammarScore: average(completed.map(item => item.grammarScore)),
    vocabularyScore: average(completed.map(item => item.vocabularyScore)),
    coherenceScore: average(completed.map(item => item.coherenceScore)),
    overallScore: avgScore,
  });
  const weakest = weakestSkill(skills);
  const actions = recommendedTeacherActions({
    weakestSkillLabel: weakest?.label,
    mistakes,
    offTopic: feedback.offTopic,
    tooMuchVietnamese: feedback.tooMuchVietnamese,
    completedSessions: completed.length,
  });
  const defaultClassId = enrollments[0]?.classId ?? '';
  const latestTopicId = sessions[0]?.topicId ?? '';

  const topicCounts = completed.reduce<Map<string, { title: string; count: number }>>((map, item) => {
    const existing = map.get(item.topicId);
    map.set(item.topicId, { title: item.topic.title, count: (existing?.count ?? 0) + 1 });
    return map;
  }, new Map());
  const topTopics = Array.from(topicCounts.values()).sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <DashboardLayout>
      <div style={{ marginBottom: 24 }}>
        <Link href="/teacher/students" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Quay lại danh sách học viên
        </Link>
      </div>

      <section className="glass-card" style={{ padding: '24px 26px', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 850, fontSize: 20 }}>
              {student.name[0]?.toUpperCase()}
            </div>
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 5 }}>
                Speaking profile
              </p>
              <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 28, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 4 }}>{student.name}</h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{student.email}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {enrollments.map(enrollment => (
              <Link key={enrollment.id} href={`/teacher/classes/${enrollment.classId}`} style={{ textDecoration: 'none' }}>
                <span style={{ display: 'inline-flex', padding: '7px 10px', borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 750 }}>
                  {enrollment.class.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 22 }}>
        <Metric icon={Mic} label="Buổi hoàn thành" value={completed.length} color="#2563EB" />
        <Metric icon={Clock} label="Thời lượng" value={formatDuration(totalDuration)} color="#0F766E" />
        <Metric icon={Award} label="Điểm TB" value={avgScore ?? '—'} color="#D97706" />
        <Metric icon={MessageSquareText} label="Lượt nói" value={totalMessages} color="#7C3AED" />
        <Metric icon={TrendingUp} label="Hoạt động cuối" value={formatDate(lastActivity)} color="#16A34A" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 0.9fr)', gap: 22, marginBottom: 22 }}>
        <section className="glass-card" style={{ padding: 22 }}>
          <h2 style={{ fontSize: 18, color: 'var(--text-primary)', fontWeight: 850, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={18} /> Kỹ năng speaking
          </h2>
          <div style={{ display: 'grid', gap: 14 }}>
            {skills.map(skill => {
              const value = skill.value ?? 0;
              return (
                <div key={skill.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{skill.label}</span>
                    <strong style={{ fontSize: 13, color: skill.color }}>{skill.value ?? '—'}</strong>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: '#E5E7EB', overflow: 'hidden' }}>
                    <div style={{ width: `${value}%`, height: '100%', borderRadius: 999, background: skill.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="glass-card" style={{ padding: 22 }}>
          <h2 style={{ fontSize: 18, color: 'var(--text-primary)', fontWeight: 850, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={18} /> Gợi ý can thiệp
          </h2>
          <div style={{ display: 'grid', gap: 9 }}>
            {actions.map(action => (
              <div key={action} style={{ padding: 11, borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <CheckCircle2 size={15} style={{ color: '#16A34A', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{action}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(320px, 0.85fr)', gap: 22, marginBottom: 22 }}>
        <section className="glass-card" style={{ padding: 22 }}>
          <h2 style={{ fontSize: 18, color: 'var(--text-primary)', fontWeight: 850, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} style={{ color: '#D97706' }} /> Mistake bank
          </h2>
          {mistakes.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>Chưa có correction nào được ghi nhận. Hãy cho học viên hoàn thành vài buổi luyện để hệ thống gom lỗi lặp lại.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {mistakes.map(mistake => (
                <div key={`${mistake.type}-${mistake.wrong}-${mistake.right}`} style={{ padding: 13, borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: '#D97706', fontWeight: 850, textTransform: 'uppercase' }}>{mistake.type}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{mistake.count} lần</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#DC2626', textDecoration: 'line-through', marginBottom: 5 }}>{mistake.wrong}</p>
                  <p style={{ fontSize: 13, color: '#166534', fontWeight: 800, marginBottom: mistake.explanation ? 5 : 0 }}>{mistake.right}</p>
                  {mistake.explanation && <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{mistake.explanation}</p>}
                  {defaultClassId && latestTopicId && (
                    <Link
                      href={`/teacher/assignments/create?classId=${defaultClassId}&topicId=${latestTopicId}&title=${encodeURIComponent(`Fix: ${mistake.type} practice`)}&goal=${encodeURIComponent(`Học viên luyện sửa lỗi: "${mistake.wrong}" thành "${mistake.right}".`)}&scenario=${encodeURIComponent('AI đóng vai speaking coach. Học viên cần dùng câu đúng trong một đoạn hội thoại ngắn và trả lời follow-up question tự nhiên.')}&instruction=${encodeURIComponent(`Câu cần luyện lại: ${mistake.right}\nGiải thích: ${mistake.explanation || 'Tập trung nói lại câu đúng trong ngữ cảnh mới.'}`)}`}
                      style={{ marginTop: 10, textDecoration: 'none', display: 'inline-flex', color: 'var(--primary)', fontSize: 12, fontWeight: 850 }}
                    >
                      Giao bài sửa lỗi này
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <aside style={{ display: 'grid', gap: 16 }}>
          <InsightPanel title="Cải thiện thường gặp" items={feedback.improvements} empty="Chưa đủ dữ liệu feedback." />
          <InsightPanel title="Chủ đề đã luyện nhiều" items={topTopics.map(item => ({ label: item.title, count: item.count }))} empty="Chưa luyện chủ đề nào." />
          <section className="glass-card" style={{ padding: 18 }}>
            <h2 style={{ fontSize: 16, color: 'var(--text-primary)', fontWeight: 850, marginBottom: 12 }}>Tín hiệu rủi ro</h2>
            <RiskRow label="Dùng nhiều tiếng Việt" value={feedback.tooMuchVietnamese} />
            <RiskRow label="Lệch chủ đề" value={feedback.offTopic} />
          </section>
        </aside>
      </div>

      <section className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: 20, borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOpen size={18} style={{ color: 'var(--primary)' }} />
          <h2 style={{ fontSize: 18, color: 'var(--text-primary)', fontWeight: 850 }}>Buổi luyện gần đây</h2>
        </div>
        {sessions.length === 0 ? (
          <p style={{ padding: 22, color: 'var(--text-muted)', fontSize: 13 }}>Chưa có buổi luyện nào trong lớp của bạn.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                {['Ngày', 'Topic', 'Lớp/Bài tập', 'Thời lượng', 'Lượt nói', 'Điểm', 'Trạng thái'].map(label => (
                  <th key={label} style={{ padding: '13px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.slice(0, 10).map((item, index) => (
                <tr key={item.id} style={{ borderBottom: index < Math.min(sessions.length, 10) - 1 ? '1px solid #F3F4F6' : 'none' }}>
                  <td style={{ padding: '13px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(item.startedAt)}</td>
                  <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--text-primary)', fontWeight: 750 }}>{item.topic.title}</td>
                  <td style={{ padding: '13px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>{item.assignment?.title ?? item.assignment?.class.name ?? 'Luyện tự do'}</td>
                  <td style={{ padding: '13px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>{formatDuration(item.durationSec)}</td>
                  <td style={{ padding: '13px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>{item.totalUserMessages}</td>
                  <td style={{ padding: '13px 16px', fontSize: 13, color: item.score !== null && item.score < 60 ? '#DC2626' : 'var(--text-primary)', fontWeight: 850 }}>{item.score ?? '—'}</td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 850, padding: '4px 8px', borderRadius: 8, background: item.status === 'completed' ? '#DCFCE7' : '#FEF3C7', color: item.status === 'completed' ? '#166534' : '#92400E' }}>
                      {item.status === 'completed' ? 'Hoàn thành' : 'Đang luyện'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </DashboardLayout>
  );
}

function Metric({ icon: Icon, label, value, color }: { icon: typeof Mic; label: string; value: string | number; color: string }) {
  return (
    <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 13 }}>
      <div style={{ width: 42, height: 42, borderRadius: 8, background: `${color}15`, border: `1px solid ${color}25`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={19} />
      </div>
      <div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 20, fontWeight: 850, color: 'var(--text-primary)' }}>{value}</p>
      </div>
    </div>
  );
}

function InsightPanel({ title, items, empty }: { title: string; items: Array<{ label: string; count: number }>; empty: string }) {
  return (
    <section className="glass-card" style={{ padding: 18 }}>
      <h2 style={{ fontSize: 16, color: 'var(--text-primary)', fontWeight: 850, marginBottom: 12 }}>{title}</h2>
      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{empty}</p>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: 10, borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.45 }}>{item.label}</span>
              <strong style={{ fontSize: 12, color: 'var(--primary)' }}>{item.count}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RiskRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '10px 0', borderTop: '1px solid #E5E7EB' }}>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      <strong style={{ fontSize: 13, color: value > 0 ? '#D97706' : '#16A34A' }}>{value}</strong>
    </div>
  );
}
