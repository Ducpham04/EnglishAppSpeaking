import { Suspense } from 'react';
import type { Metadata } from 'next';
import DemoClient from './DemoClient';

export const metadata: Metadata = {
  title: 'Luyện nói với AI — GB Speaking AI',
  description: 'Chọn level CEFR, chọn chủ đề và bắt đầu nói chuyện với AI. Nhận phản hồi tức thì và cải thiện kỹ năng nói tiếng Anh.',
};

export const dynamic = 'force-dynamic';

export default function DemoPage() {
  return (
    <Suspense fallback={<div>Đang tải bài tập luyện nói...</div>}>
      <DemoClient />
    </Suspense>
  );
}
