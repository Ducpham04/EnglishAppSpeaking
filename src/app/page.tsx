'use client';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Mic, Brain, Volume2, ChevronRight, Zap, Shield, Trophy, Star, ArrowRight } from 'lucide-react';

const FEATURES = [
  {
    icon: Mic,
    title: 'Nói và được nghe',
    description: 'Dùng micro trực tiếp trên trình duyệt. Không cần cài ứng dụng. Nhận diện giọng nói tức thì.',
    color: '#7C3AED',
    bg: 'rgba(124, 58, 237, 0.1)',
  },
  {
    icon: Brain,
    title: 'AI sửa lỗi thông minh',
    description: 'AI phân tích câu nói của bạn, chỉ sửa một lỗi quan trọng nhất mỗi lượt để bạn học dần dần.',
    color: '#06B6D4',
    bg: 'rgba(6, 182, 212, 0.1)',
  },
  {
    icon: Volume2,
    title: 'AI nói lại cho bạn nghe',
    description: 'Mỗi phản hồi của AI được đọc bằng giọng nói tự nhiên, giúp bạn học cách phát âm chuẩn.',
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.1)',
  },
  {
    icon: Zap,
    title: 'Nhiều chủ đề đa dạng',
    description: '10 chủ đề từ giao tiếp cơ bản đến thảo luận nâng cao, phù hợp mọi mục tiêu học tập.',
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.1)',
  },
  {
    icon: Shield,
    title: 'Phù hợp mọi trình độ',
    description: 'Hỗ trợ đầy đủ 6 cấp độ CEFR từ A1 (mới bắt đầu) đến C2 (thành thạo). AI tự điều chỉnh theo level.',
    color: '#EF4444',
    bg: 'rgba(239, 68, 68, 0.1)',
  },
  {
    icon: Trophy,
    title: 'Không cần đăng ký',
    description: 'Bắt đầu luyện nói ngay lập tức. Không cần tài khoản, không cần cài ứng dụng.',
    color: '#EC4899',
    bg: 'rgba(236, 72, 153, 0.1)',
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Chọn level & chủ đề',
    description: 'Chọn trình độ CEFR của bạn (A1-C2) và một trong 10 chủ đề hội thoại hấp dẫn.',
    color: '#7C3AED',
  },
  {
    step: '02',
    title: 'Nói chuyện với AI',
    description: 'Bấm micro và nói tự nhiên bằng tiếng Anh. AI sẽ phản hồi và hỏi câu tiếp theo.',
    color: '#06B6D4',
  },
  {
    step: '03',
    title: 'Nhận phản hồi & cải thiện',
    description: 'AI sửa lỗi ngữ pháp, đọc phản hồi bằng giọng nói và hỏi câu tiếp để bạn nói nhiều hơn.',
    color: '#10B981',
  },
];

const LEVELS = [
  { code: 'A1', label: 'Beginner', color: '#10B981' },
  { code: 'A2', label: 'Elementary', color: '#3B82F6' },
  { code: 'B1', label: 'Intermediate', color: '#8B5CF6' },
  { code: 'B2', label: 'Upper-Int', color: '#F59E0B' },
  { code: 'C1', label: 'Advanced', color: '#EF4444' },
  { code: 'C2', label: 'Mastery', color: '#EC4899' },
];

const TOPICS_PREVIEW = [
  { emoji: '👋', title: 'Self Introduction', level: 'A1' },
  { emoji: '🍜', title: 'Ordering Food', level: 'A2' },
  { emoji: '✈️', title: 'Travel Plans', level: 'B1' },
  { emoji: '💼', title: 'Job Interview', level: 'B2' },
  { emoji: '🤖', title: 'Technology & AI', level: 'C1' },
  { emoji: '⚖️', title: 'Ethical Dilemmas', level: 'C1' },
];

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      {/* Background gradient orbs */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'var(--gradient-hero)',
      }} />

      {/* ===== NAVBAR ===== */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        padding: '16px 24px',
        background: 'rgba(10, 10, 20, 0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--gradient-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Mic size={18} color="white" />
            </div>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 20, color: 'var(--text-primary)' }}>
              GB Speaking <span style={{ color: 'var(--primary-light)' }}>AI</span>
            </span>
          </div>
          <NavButtons />
        </div>
      </nav>

      {/* ===== HERO SECTION ===== */}
      <section style={{
        position: 'relative', zIndex: 1,
        paddingTop: 140, paddingBottom: 100,
        textAlign: 'center',
        padding: '140px 24px 100px',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px',
            background: 'rgba(124, 58, 237, 0.12)',
            border: '1px solid rgba(124, 58, 237, 0.3)',
            borderRadius: 100,
            marginBottom: 32,
          }}>
            <Star size={13} style={{ color: '#F59E0B' }} fill="#F59E0B" />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
              AI-Powered English Speaking Practice
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 'clamp(40px, 8vw, 72px)',
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: 24,
            color: 'var(--text-primary)',
          }}>
            Luyện nói tiếng Anh{' '}
            <span className="gradient-text">thông minh</span>
            {' '}cùng AI
          </h1>

          {/* Sub */}
          <p style={{
            fontSize: 'clamp(16px, 2.5vw, 20px)',
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
            marginBottom: 48,
            maxWidth: 600,
            margin: '0 auto 48px',
          }}>
            Nói chuyện với AI, nhận phản hồi tức thì, sửa lỗi ngữ pháp từng câu.
            Phù hợp mọi trình độ từ A1 đến C2. Bắt đầu miễn phí ngay.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/demo" style={{ textDecoration: 'none' }}>
              <button className="btn-primary" id="hero-cta-btn" style={{ padding: '16px 36px', fontSize: 16 }}>
                <Mic size={18} />
                Bắt đầu luyện nói ngay
              </button>
            </Link>
            <Link href="#how-it-works" style={{ textDecoration: 'none' }}>
              <button className="btn-secondary" id="hero-learn-btn" style={{ padding: '16px 36px', fontSize: 16 }}>
                Tìm hiểu thêm
                <ChevronRight size={16} />
              </button>
            </Link>
          </div>

          {/* Level chips */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 56 }}>
            {LEVELS.map(lvl => (
              <div key={lvl.code} style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: `1px solid ${lvl.color}40`,
                background: `${lvl.color}12`,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: lvl.color }}>{lvl.code}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lvl.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Demo Preview Card */}
        <div style={{
          maxWidth: 700, margin: '64px auto 0',
          position: 'relative',
        }}>
          <div className="glass-card" style={{ padding: 24, textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'var(--gradient-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Mic size={18} color="white" />
              </div>
              <div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>AI Speaking Partner</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Topic: Job Interview · Level B2</p>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
              </div>
            </div>

            {/* Mock conversation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="message-ai" style={{ padding: '12px 16px', maxWidth: '85%' }}>
                <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                  Thank you for coming in today! Could you tell me a little about yourself and your work experience?
                </p>
              </div>
              <div className="message-user" style={{ padding: '12px 16px', maxWidth: '85%', alignSelf: 'flex-end' }}>
                <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                  I have working in software company for 3 years as a developer.
                </p>
              </div>
              <div className="message-ai" style={{ padding: '12px 16px', maxWidth: '85%' }}>
                <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: 10 }}>
                  That&apos;s great experience! Three years is a solid foundation in software development.
                </p>
                <div className="correction-card" style={{ marginTop: 8 }}>
                  <p style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600, marginBottom: 4 }}>📝 Correction</p>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    <span style={{ color: '#EF4444', textDecoration: 'line-through' }}>&quot;I have working&quot;</span>
                    {' → '}
                    <span style={{ color: '#10B981', fontWeight: 600 }}>&quot;I have been working&quot;</span>
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Use present perfect continuous for ongoing actions.</p>
                </div>
                <p style={{ fontSize: 14, color: 'var(--accent-light)', marginTop: 10 }}>
                  What kind of projects have you worked on during those 3 years?
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section style={{ position: 'relative', zIndex: 1, padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{
              fontFamily: 'Outfit, sans-serif', fontWeight: 800,
              fontSize: 'clamp(28px, 5vw, 44px)',
              color: 'var(--text-primary)', marginBottom: 16,
            }}>
              Tại sao chọn <span className="gradient-text">GB Speaking AI?</span>
            </h2>
            <p style={{ fontSize: 17, color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto' }}>
              Hệ thống được thiết kế đặc biệt cho người Việt học tiếng Anh giao tiếp.
            </p>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 24,
          }}>
            {FEATURES.map((feat, i) => (
              <div key={i} className="glass-card glass-card-hover" style={{ padding: 28 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: feat.bg,
                  border: `1px solid ${feat.color}25`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 20,
                }}>
                  <feat.icon size={24} style={{ color: feat.color }} />
                </div>
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', marginBottom: 10 }}>
                  {feat.title}
                </h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  {feat.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how-it-works" style={{ position: 'relative', zIndex: 1, padding: '80px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{
              fontFamily: 'Outfit, sans-serif', fontWeight: 800,
              fontSize: 'clamp(28px, 5vw, 44px)',
              color: 'var(--text-primary)', marginBottom: 16,
            }}>
              3 bước để luyện nói
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {STEPS.map((step, i) => (
              <div key={i} className="glass-card" style={{
                padding: '28px 32px',
                display: 'flex', alignItems: 'flex-start', gap: 28,
              }}>
                <div style={{
                  minWidth: 56, height: 56, borderRadius: 16,
                  background: `${step.color}15`,
                  border: `2px solid ${step.color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 18,
                  color: step.color,
                }}>
                  {step.step}
                </div>
                <div>
                  <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 20, color: 'var(--text-primary)', marginBottom: 8 }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TOPICS PREVIEW ===== */}
      <section style={{ position: 'relative', zIndex: 1, padding: '80px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{
              fontFamily: 'Outfit, sans-serif', fontWeight: 800,
              fontSize: 'clamp(28px, 5vw, 40px)',
              color: 'var(--text-primary)', marginBottom: 16,
            }}>
              Chủ đề <span className="gradient-text">phong phú</span>
            </h2>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)' }}>
              Từ giao tiếp cơ bản đến thảo luận nâng cao
            </p>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 40,
          }}>
            {TOPICS_PREVIEW.map((t, i) => (
              <div key={i} className="glass-card glass-card-hover" style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{t.emoji}</div>
                <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 8 }}>{t.title}</p>
                <span className={`level-${t.level}`} style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 8px',
                  borderRadius: 6, border: '1px solid',
                  display: 'inline-block',
                }}>
                  {t.level}
                </span>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center' }}>
            <Link href="/demo" style={{ textDecoration: 'none' }}>
              <button className="btn-primary" id="topics-cta-btn" style={{ padding: '14px 32px', fontSize: 15 }}>
                Xem tất cả chủ đề và bắt đầu
                <ArrowRight size={16} />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section style={{ position: 'relative', zIndex: 1, padding: '80px 24px 120px' }}>
        <div style={{
          maxWidth: 700, margin: '0 auto', textAlign: 'center',
          padding: '60px 40px',
          background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(6,182,212,0.1) 100%)',
          border: '1px solid rgba(124,58,237,0.25)',
          borderRadius: 24,
        }}>
          <h2 style={{
            fontFamily: 'Outfit, sans-serif', fontWeight: 800,
            fontSize: 'clamp(28px, 5vw, 40px)',
            color: 'var(--text-primary)', marginBottom: 16,
          }}>
            Bắt đầu ngay hôm nay
          </h2>
          <p style={{ fontSize: 17, color: 'var(--text-secondary)', marginBottom: 36 }}>
            Không cần đăng ký. Không cần tải app. Chỉ cần mic và internet.
          </p>
          <Link href="/demo" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" id="final-cta-btn" style={{ padding: '18px 44px', fontSize: 17 }}>
              <Mic size={20} />
              Luyện nói miễn phí ngay
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        position: 'relative', zIndex: 1,
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '32px 24px',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Mic size={14} color="white" />
          </div>
          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
            GB Speaking AI
          </span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          © 2026 GB Speaking AI. Powered by OpenAI GPT-4o-mini.
        </p>
      </footer>
    </div>
  );
}

function NavButtons() {
  const { data: session } = useSession();
  const role = session?.user?.role;

  if (session) {
    const dashHref = role === 'admin' ? '/admin/dashboard' : role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/demo" style={{ textDecoration: 'none' }}>
          <button className="btn-secondary" style={{ padding: '9px 16px', fontSize: 13 }}>🎙️ Demo</button>
        </Link>
        <Link href={dashHref} style={{ textDecoration: 'none' }}>
          <button className="btn-primary" id="nav-dashboard-btn" style={{ padding: '9px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{session.user.name?.split(' ').pop() ?? 'Dashboard'}</span>
            <ArrowRight size={14} />
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Link href="/login" style={{ textDecoration: 'none' }}>
        <button className="btn-secondary" id="nav-login-btn" style={{ padding: '9px 18px', fontSize: 13 }}>Đăng nhập</button>
      </Link>
      <Link href="/demo" style={{ textDecoration: 'none' }}>
        <button className="btn-primary" id="nav-try-btn" style={{ padding: '9px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          Thử ngay <ArrowRight size={14} />
        </button>
      </Link>
    </div>
  );
}
