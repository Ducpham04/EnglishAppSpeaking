import { CEFRLevel } from './types';

export type AssignmentScenario = {
  id: string;
  title: string;
  category: 'Daily Life' | 'Work' | 'Travel' | 'Academic' | 'IELTS';
  level: CEFRLevel;
  objective: 'fluency' | 'grammar' | 'vocabulary' | 'pronunciation' | 'task';
  goal: string;
  roleplay: string;
  targetVocabulary: string[];
  rubric: string[];
  minutes: number;
  messages: number;
};

export const ASSIGNMENT_SCENARIOS: AssignmentScenario[] = [
  {
    id: 'restaurant-complaint',
    title: 'Restaurant Complaint',
    category: 'Daily Life',
    level: 'A2',
    objective: 'task',
    goal: 'Học viên phàn nàn lịch sự về một món ăn sai yêu cầu và đề nghị phương án xử lý.',
    roleplay: 'Học viên là khách hàng trong nhà hàng. AI là nhân viên phục vụ. Học viên cần giải thích vấn đề, giữ thái độ lịch sự và yêu cầu đổi món hoặc hoàn tiền.',
    targetVocabulary: ['I ordered...', 'There seems to be...', 'Could you please...', 'I would prefer...', 'Would it be possible to...'],
    rubric: [
      'Giải thích vấn đề rõ ràng và lịch sự',
      'Dùng cấu trúc yêu cầu phù hợp với ngữ cảnh nhà hàng',
      'Giữ hội thoại bằng tiếng Anh trong phần lớn câu trả lời',
      'Đề xuất hoặc phản hồi phương án xử lý của AI',
    ],
    minutes: 5,
    messages: 6,
  },
  {
    id: 'airport-immigration',
    title: 'Airport Immigration',
    category: 'Travel',
    level: 'B1',
    objective: 'fluency',
    goal: 'Học viên trả lời tự nhiên các câu hỏi nhập cảnh về mục đích chuyến đi, nơi ở và lịch trình.',
    roleplay: 'Học viên là du khách tại quầy nhập cảnh. AI là nhân viên nhập cảnh hỏi nhanh, ngắn và thực tế. Học viên cần trả lời rõ, tự tin và không lan man.',
    targetVocabulary: ['I am here for...', 'I will be staying at...', 'for business/holiday', 'return ticket', 'itinerary'],
    rubric: [
      'Trả lời trực tiếp đúng câu hỏi',
      'Nói đủ thông tin về mục đích, thời gian và nơi ở',
      'Dùng thì tương lai và cụm từ du lịch chính xác',
      'Phản hồi mạch lạc trong tình huống áp lực nhẹ',
    ],
    minutes: 5,
    messages: 7,
  },
  {
    id: 'job-interview-strengths',
    title: 'Job Interview: Strengths',
    category: 'Work',
    level: 'B2',
    objective: 'vocabulary',
    goal: 'Học viên trình bày kinh nghiệm, điểm mạnh và ví dụ công việc theo phong cách phỏng vấn chuyên nghiệp.',
    roleplay: 'Học viên là ứng viên. AI là nhà tuyển dụng hỏi về background, strengths, teamwork và một tình huống giải quyết vấn đề. Học viên nên trả lời theo STAR method.',
    targetVocabulary: ['I was responsible for...', 'My main strength is...', 'I contributed to...', 'As a result...', 'I handled...'],
    rubric: [
      'Dùng từ vựng chuyên nghiệp về công việc',
      'Có ví dụ cụ thể thay vì trả lời chung chung',
      'Tổ chức câu trả lời theo tình huống, hành động, kết quả',
      'Trả lời follow-up question tự nhiên',
    ],
    minutes: 8,
    messages: 8,
  },
  {
    id: 'client-meeting-scope',
    title: 'Client Meeting: Scope Change',
    category: 'Work',
    level: 'C1',
    objective: 'task',
    goal: 'Học viên thương lượng thay đổi phạm vi công việc với khách hàng bằng tiếng Anh chuyên nghiệp.',
    roleplay: 'Học viên là project lead. AI là khách hàng muốn thêm yêu cầu mới nhưng giữ deadline cũ. Học viên cần xác nhận yêu cầu, giải thích trade-off và đề xuất phương án.',
    targetVocabulary: ['scope', 'timeline', 'trade-off', 'priority', 'we can accommodate this if...'],
    rubric: [
      'Xác nhận đúng yêu cầu của khách hàng',
      'Giải thích trade-off rõ ràng, lịch sự',
      'Đề xuất ít nhất một phương án khả thi',
      'Giữ register chuyên nghiệp và không quá trực diện',
    ],
    minutes: 8,
    messages: 8,
  },
  {
    id: 'ielts-part-2-story',
    title: 'IELTS Speaking Part 2',
    category: 'IELTS',
    level: 'B2',
    objective: 'fluency',
    goal: 'Học viên nói liền mạch 1-2 phút về một trải nghiệm cá nhân và trả lời follow-up question.',
    roleplay: 'AI là IELTS examiner. Học viên nhận cue card về một sự kiện đáng nhớ, chuẩn bị ngắn và nói thành đoạn có mở bài, chi tiết, cảm xúc và kết luận.',
    targetVocabulary: ['memorable', 'it took place...', 'what struck me was...', 'looking back', 'meaningful'],
    rubric: [
      'Nói thành đoạn dài, ít ngắt quãng',
      'Có cấu trúc mở bài, chi tiết, cảm xúc, kết luận',
      'Dùng từ nối thời gian và cảm xúc',
      'Trả lời follow-up question không quá ngắn',
    ],
    minutes: 6,
    messages: 5,
  },
  {
    id: 'academic-opinion-ai',
    title: 'Academic Opinion: AI at Work',
    category: 'Academic',
    level: 'C1',
    objective: 'grammar',
    goal: 'Học viên trình bày quan điểm cân bằng về AI trong công việc, dùng lập luận và cấu trúc câu phức.',
    roleplay: 'AI là người điều phối seminar. Học viên cần đưa ra quan điểm, ví dụ, phản biện nhẹ và kết luận về ảnh hưởng của AI tới công việc.',
    targetVocabulary: ['it could be argued that', 'on the other hand', 'productivity', 'automation', 'ethical concern'],
    rubric: [
      'Trình bày quan điểm có luận điểm và ví dụ',
      'Dùng cấu trúc câu phức và hedging language',
      'Nhắc tới cả lợi ích và rủi ro',
      'Phản hồi counterargument của AI',
    ],
    minutes: 8,
    messages: 8,
  },
];

export function scenarioInstructionExtra(scenario: AssignmentScenario) {
  return [
    `Từ vựng mục tiêu: ${scenario.targetVocabulary.join(', ')}`,
    'Học viên nên cố gắng dùng ít nhất 3 cụm từ mục tiêu trong buổi luyện.',
    'Nếu chưa biết từ, hãy hỏi AI bằng tiếng Anh trước khi chuyển sang tiếng Việt.',
  ].join('\n');
}
