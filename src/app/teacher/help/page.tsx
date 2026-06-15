import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { AlertTriangle, BookOpenCheck, CheckCircle2, ClipboardList, MessageSquareText, Mic, School, Target, Users } from 'lucide-react';

const WORKFLOW = [
  {
    icon: School,
    title: '1. Tạo lớp và mời học viên',
    text: 'Tạo lớp, lấy mã tham gia và gửi cho học viên. Học viên vào Lớp học để nhập mã.',
    href: '/teacher/classes',
    cta: 'Quản lý lớp',
  },
  {
    icon: MessageSquareText,
    title: '2. Chuẩn bị hội thoại AI',
    text: 'Dùng topic có sẵn hoặc tạo hội thoại riêng với vai trò AI, câu mở đầu và prompt rõ ràng.',
    href: '/teacher/topics',
    cta: 'Hội thoại AI',
  },
  {
    icon: ClipboardList,
    title: '3. Giao bài speaking',
    text: 'Chọn lớp, topic, mục tiêu, tình huống, số lượt nói và thời lượng tối thiểu để học viên luyện đúng yêu cầu.',
    href: '/teacher/assignments/create',
    cta: 'Giao bài mới',
  },
  {
    icon: Users,
    title: '4. Xem feedback học viên',
    text: 'Vào bài tập, lớp hoặc hồ sơ học viên để xem điểm, transcript, correction, lỗi lặp lại và tiến độ.',
    href: '/teacher/students',
    cta: 'Xem học viên',
  },
];

const FEEDBACK_GUIDE = [
  {
    title: 'Trang bài tập',
    text: 'Xem ai chưa làm, đang luyện, đã hoàn thành, điểm từng học viên và transcript của bài đó.',
    href: '/teacher/assignments',
  },
  {
    title: 'Hồ sơ học viên',
    text: 'Xem mistake bank, chủ đề đã luyện, buổi gần đây và tạo bài luyện lại từ lỗi thật.',
    href: '/teacher/students',
  },
  {
    title: 'Báo cáo lớp',
    text: 'Xem điểm trung bình, lỗi/cải thiện thường gặp và học viên cần chú ý trong từng lớp.',
    href: '/teacher/classes',
  },
];

export default async function TeacherHelpPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'teacher' && session.user.role !== 'admin') redirect('/');

  return (
    <DashboardLayout title="Hướng dẫn giáo viên">
      <section className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
          <div style={{ width: 44, height: 44, borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'grid', placeItems: 'center', color: 'var(--primary)' }}>
            <BookOpenCheck size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 6 }}>Quy trình dạy speaking bằng AI</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, maxWidth: 780 }}>
              Giáo viên nên bắt đầu từ lớp học, giao bài có mục tiêu rõ, sau đó dùng feedback để yêu cầu luyện lại đúng lỗi của từng học viên.
            </p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
          {WORKFLOW.map(step => (
            <GuideCard key={step.title} {...step} />
          ))}
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 0.8fr)', gap: 18 }}>
        <section className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={18} style={{ color: 'var(--primary)' }} /> Xem feedback ở đâu?
          </h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {FEEDBACK_GUIDE.map(item => (
              <Link key={item.title} href={item.href} style={{ textDecoration: 'none' }}>
                <article style={{ padding: 14, borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB' }}>
                  <h3 style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 850, marginBottom: 5 }}>{item.title}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{item.text}</p>
                </article>
              </Link>
            ))}
          </div>
        </section>

        <aside className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} style={{ color: '#D97706' }} /> Checklist trước khi giao bài
          </h2>
          <ul style={{ listStyle: 'none', display: 'grid', gap: 12 }}>
            {[
              'Topic có vai trò AI và câu mở đầu phù hợp trình độ.',
              'Mục tiêu bài nói rõ: học viên cần luyện tình huống nào.',
              'Số lượt nói và thời lượng tối thiểu vừa sức lớp.',
              'Sau khi chấm, xem học viên điểm thấp hoặc dùng nhiều tiếng Việt.',
              'Dùng nút yêu cầu luyện lại hoặc tạo bài sửa lỗi từ mistake bank.',
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
