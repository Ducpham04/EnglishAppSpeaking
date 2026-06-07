import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { CheckCircle, AlertCircle, Clock, Star, ArrowLeft } from 'lucide-react';
import { ConversationEvaluation } from '@/lib/types';

export default async function SessionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect('/login');

  const practiceSession = await prisma.session.findUnique({
    where: { id },
    include: {
      topic: true,
      messages: { orderBy: { createdAt: 'asc' } },
      assignment: { include: { class: true } },
    },
  });

  if (!practiceSession || practiceSession.studentId !== session.user.id) notFound();

  const userMessages = practiceSession.messages.filter(m => m.role === 'user');
  const correctionMessages = practiceSession.messages.filter(m => {
    if (!m.corrections) return false;
    try { return JSON.parse(m.corrections).hasCorrection; } catch { return false; }
  });
  let evaluation: ConversationEvaluation | null = null;
  if (practiceSession.feedbackJson) {
    try {
      evaluation = JSON.parse(practiceSession.feedbackJson) as ConversationEvaluation;
    } catch {
      evaluation = null;
    }
  }

  function formatTime(d: Date) {
    return new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <DashboardLayout>
      {/* Back */}
      <div style={{ marginBottom: 24 }}>
        <Link href="/student/sessions" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Quay lại lịch sử
        </Link>
      </div>

      {/* Header */}
      <div className="glass-card" style={{ padding: '24px 28px', marginBottom: 24, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 48 }}>{practiceSession.topic.icon}</span>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 22, color: 'var(--text-primary)', marginBottom: 4 }}>
            {practiceSession.topic.title}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {practiceSession.assignment ? `${practiceSession.assignment.class.name} · ` : ''}{practiceSession.level} · {new Date(practiceSession.startedAt).toLocaleDateString('vi-VN')}
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, textAlign: 'center' }}>
          {[
            { label: 'Thời gian', value: `${Math.round(practiceSession.durationSec / 60)}p`, icon: Clock, color: '#06B6D4' },
            { label: 'Lượt nói', value: userMessages.length, icon: null, color: '#7C3AED' },
            { label: 'Điểm', value: practiceSession.score ?? '—', icon: Star, color: '#F59E0B' },
          ].map(item => (
            <div key={item.label} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: item.color, fontFamily: 'Outfit, sans-serif' }}>{item.value}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {evaluation && (
        <div className="glass-card" style={{ padding: '22px 24px', marginBottom: 24, borderColor: 'rgba(124,58,237,0.22)' }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', marginBottom: 10 }}>
            🎯 Nhận xét & lưu ý
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>{evaluation.summary}</p>
          {(evaluation.tooMuchVietnamese || evaluation.offTopic) && (
            <div style={{ marginBottom: 16, padding: '10px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p style={{ fontSize: 13, color: '#EF4444', lineHeight: 1.6 }}>
                {evaluation.tooMuchVietnamese && 'Bạn đã dùng quá nhiều tiếng Việt trong bài speaking. '}
                {evaluation.offTopic && 'Một phần nội dung chưa bám sát chủ đề/nhiệm vụ. '}
                Điểm đã được điều chỉnh theo yêu cầu luyện nói.
              </p>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 18 }}>
            {[
              ['Nhiệm vụ', evaluation.taskScore, '#10B981'],
              ['Trôi chảy', evaluation.fluencyScore, '#06B6D4'],
              ['Ngữ pháp', evaluation.grammarScore, '#F59E0B'],
              ['Từ vựng', evaluation.vocabularyScore, '#8B5CF6'],
              ['Mạch lạc', evaluation.coherenceScore, '#EC4899'],
            ].map(([label, value, color]) => (
              <div key={label} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</p>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 20, fontWeight: 800, color: color as string }}>{value as number}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: '#10B981', marginBottom: 8 }}>Điểm mạnh</h3>
              {evaluation.strengths.map((item, index) => (
                <p key={index} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>• {item}</p>
              ))}
            </div>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: '#F59E0B', marginBottom: 8 }}>Cần cải thiện</h3>
              {evaluation.improvements.map((item, index) => (
                <p key={index} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>• {item}</p>
              ))}
            </div>
          </div>
          {evaluation.importantNotes.length > 0 && (
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary-light)', marginBottom: 8 }}>Lưu ý</h3>
              {evaluation.importantNotes.map((item, index) => (
                <p key={index} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>• {item}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Corrections summary */}
      {correctionMessages.length > 0 && (
        <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 24, borderColor: 'rgba(245,158,11,0.2)' }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 12 }}>
            ⚠️ Các lỗi cần chú ý ({correctionMessages.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {correctionMessages.map(m => {
              try {
                const c = JSON.parse(m.corrections!);
                return (
                  <div key={m.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 14px', background: 'rgba(245,158,11,0.06)', borderRadius: 8 }}>
                    <AlertCircle size={14} style={{ color: '#F59E0B', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <span style={{ fontSize: 13, color: '#EF4444', textDecoration: 'line-through', marginRight: 6 }}>&ldquo;{c.wrong}&rdquo;</span>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)', marginRight: 6 }}>→</span>
                      <span style={{ fontSize: 13, color: '#10B981', fontWeight: 600 }}>&ldquo;{c.right}&rdquo;</span>
                      {c.explanation && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{c.explanation}</p>}
                    </div>
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(245,158,11,0.15)', color: '#F59E0B', marginLeft: 'auto', flexShrink: 0 }}>{c.type}</span>
                  </div>
                );
              } catch { return null; }
            })}
          </div>
        </div>
      )}

      {/* Conversation transcript */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 20 }}>
          💬 Transcript hội thoại
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {practiceSession.messages.map(m => {
            const isUser = m.role === 'user';
            let correction = null;
            if (!isUser && m.corrections) {
              try { correction = JSON.parse(m.corrections); } catch { /* ignore */ }
            }
            return (
              <div key={m.id} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '75%' }}>
                  {!isUser && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>🤖</div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>AI Partner · {formatTime(m.createdAt)}</span>
                    </div>
                  )}
                  <div className={isUser ? 'message-user' : 'message-ai'} style={{ padding: '12px 16px' }}>
                    <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>{m.content}</p>
                    {correction?.hasCorrection && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                          <AlertCircle size={12} style={{ color: '#F59E0B' }} />
                          <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600 }}>Correction</span>
                        </div>
                        <p style={{ fontSize: 12 }}>
                          <span style={{ color: '#EF4444', textDecoration: 'line-through' }}>&ldquo;{correction.wrong}&rdquo;</span>
                          <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>→</span>
                          <span style={{ color: '#10B981', fontWeight: 600 }}>&ldquo;{correction.right}&rdquo;</span>
                        </p>
                      </div>
                    )}
                    {correction && !correction.hasCorrection && (
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <CheckCircle size={12} style={{ color: '#10B981' }} />
                        <span style={{ fontSize: 11, color: '#10B981' }}>Good sentence!</span>
                      </div>
                    )}
                  </div>
                  {isUser && <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, textAlign: 'right' }}>{formatTime(m.createdAt)}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
