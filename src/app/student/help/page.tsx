import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { BookOpenCheck, CheckCircle2, ClipboardList, Mic, Star, Target, TrendingUp } from 'lucide-react';

const STEPS = [
  {
    icon: ClipboardList,
    title: '1. Kiểm tra bài được giao',
    text: 'Vào Bài tập để xem giáo viên giao chủ đề nào, hạn nộp, số lượt nói tối thiểu và yêu cầu của bài.',
    href: '/student/assignments',
    cta: 'Xem bài tập',
  },
  {
    icon: Mic,
    title: '2. Vào phòng luyện nói',
    text: 'Bấm vào bài tập hoặc Luyện nói AI, cấp quyền microphone, nghe câu hỏi của AI rồi trả lời bằng tiếng Anh.',
    href: '/demo',
    cta: 'Luyện nói',
  },
  {
    icon: Star,
    title: '3. Đọc feedback sau buổi luyện',
    text: 'Khi kết thúc buổi, hệ thống hiển thị điểm tổng, điểm kỹ năng, điểm mạnh, lỗi cần sửa và câu nên luyện lại.',
    href: '/student/sessions',
    cta: 'Xem lịch sử',
  },
  {
    icon: TrendingUp,
    title: '4. Theo dõi tiến bộ',
    text: 'Trang Tiến độ gom lỗi lặp lại, tín hiệu cần chú ý và gợi ý trọng tâm luyện tiếp cho các buổi sau.',
    href: '/student/progress',
    cta: 'Xem tiến độ',
  },
];

const FEEDBACK_ITEMS = [
  'Điểm tổng và 5 kỹ năng: nhiệm vụ, trôi chảy, ngữ pháp, từ vựng, mạch lạc.',
  'Tóm tắt buổi luyện: bạn làm tốt gì và cần tập trung phần nào.',
  'Correction từng câu: câu sai, câu đúng hơn và giải thích ngắn.',
  'Câu nên luyện lại để nói tự nhiên hơn trong buổi sau.',
  'Cảnh báo nếu dùng quá nhiều tiếng Việt hoặc trả lời lệch chủ đề.',
];

export default async function StudentHelpPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'student' && session.user.role !== 'admin') redirect('/');

  return (
    <DashboardLayout title="Hướng dẫn học sinh">
      <section className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
          <div style={{ width: 44, height: 44, borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'grid', placeItems: 'center', color: 'var(--primary)' }}>
            <BookOpenCheck size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 6 }}>Lộ trình dùng GB Speaking AI</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, maxWidth: 760 }}>
              Mục tiêu là nói thật nhiều bằng tiếng Anh, đọc feedback ngay sau buổi luyện, rồi luyện lại đúng lỗi quan trọng nhất.
            </p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
          {STEPS.map(step => (
            <GuideCard key={step.title} {...step} />
          ))}
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 0.8fr)', gap: 18 }}>
        <section className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Star size={18} style={{ color: '#F59E0B' }} /> Feedback của học sinh gồm gì?
          </h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {FEEDBACK_ITEMS.map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: 11, borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                <CheckCircle2 size={16} style={{ color: '#10B981', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{item}</p>
              </div>
            ))}
          </div>
        </section>

        <aside className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={18} style={{ color: 'var(--primary)' }} /> Mẹo luyện tốt hơn
          </h2>
          <ul style={{ listStyle: 'none', display: 'grid', gap: 12 }}>
            {[
              'Trả lời thành câu đầy đủ, không chỉ một vài từ.',
              'Nếu bí từ, nói câu đơn giản trước rồi bổ sung ý sau.',
              'Đọc correction và nói lại câu đúng ít nhất 2 lần.',
              'Sau mỗi 3-5 buổi, vào Tiến độ để xem lỗi lặp lại.',
            ].map(item => (
              <li key={item} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                <CheckCircle2 size={15} style={{ color: '#10B981', flexShrink: 0, marginTop: 2 }} />
                {item}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </DashboardLayout>
  );
}

function GuideCard({ icon: Icon, title, text, href, cta }: {
  icon: typeof Mic;
  title: string;
  text: string;
  href: string;
  cta: string;
}) {
  return (
    <article style={{ padding: 18, borderRadius: 8, border: '1px solid #E5E7EB', background: '#FFFFFF' }}>
      <div style={{ width: 40, height: 40, borderRadius: 8, display: 'grid', placeItems: 'center', background: '#EFF6FF', border: '1px solid #BFDBFE', color: 'var(--primary)', marginBottom: 14 }}>
        <Icon size={20} />
      </div>
      <h3 style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 850, marginBottom: 8 }}>{title}</h3>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>{text}</p>
      <Link href={href} style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 850, textDecoration: 'none' }}>{cta} →</Link>
    </article>
  );
}
