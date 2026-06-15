import { ConversationEvaluation, Correction } from './types';

export type SkillScore = {
  key: 'task' | 'fluency' | 'grammar' | 'vocabulary' | 'coherence' | 'overall';
  label: string;
  value: number | null;
  color: string;
};

export type MistakeInsight = {
  wrong: string;
  right: string;
  type: Correction['type'];
  explanation: string;
  count: number;
  lastSeen: Date | null;
};

type MessageLike = {
  corrections: string | null;
  createdAt: Date;
};

type FeedbackLike = {
  feedbackJson: string | null;
};

export function average(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === 'number');
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

export function parseEvaluation(value: string | null): Partial<ConversationEvaluation> {
  if (!value) return {};
  try {
    return JSON.parse(value) as Partial<ConversationEvaluation>;
  } catch {
    return {};
  }
}

export function buildSkillScores(values: {
  taskScore?: number | null;
  fluencyScore?: number | null;
  grammarScore?: number | null;
  vocabularyScore?: number | null;
  coherenceScore?: number | null;
  overallScore?: number | null;
}): SkillScore[] {
  return [
    { key: 'task', label: 'Nhiệm vụ', value: values.taskScore ?? null, color: '#16A34A' },
    { key: 'fluency', label: 'Trôi chảy', value: values.fluencyScore ?? null, color: '#0F766E' },
    { key: 'grammar', label: 'Ngữ pháp', value: values.grammarScore ?? null, color: '#D97706' },
    { key: 'vocabulary', label: 'Từ vựng', value: values.vocabularyScore ?? null, color: '#2563EB' },
    { key: 'coherence', label: 'Mạch lạc', value: values.coherenceScore ?? null, color: '#7C3AED' },
    { key: 'overall', label: 'Tổng thể', value: values.overallScore ?? null, color: '#111827' },
  ];
}

export function weakestSkill(skills: SkillScore[]) {
  return skills
    .filter(skill => skill.key !== 'overall' && typeof skill.value === 'number')
    .sort((a, b) => (a.value ?? 0) - (b.value ?? 0))[0] ?? null;
}

export function aggregateMistakes(messages: MessageLike[]): MistakeInsight[] {
  const mistakes = new Map<string, MistakeInsight>();

  for (const message of messages) {
    if (!message.corrections) continue;

    let correction: Partial<Correction>;
    try {
      correction = JSON.parse(message.corrections) as Partial<Correction>;
    } catch {
      continue;
    }

    if (!correction.hasCorrection || !correction.wrong || !correction.right) continue;

    const type = correction.type ?? 'grammar';
    const key = `${type}:${correction.wrong.trim().toLowerCase()}:${correction.right.trim().toLowerCase()}`;
    const existing = mistakes.get(key);

    if (existing) {
      existing.count += 1;
      if (!existing.lastSeen || message.createdAt > existing.lastSeen) {
        existing.lastSeen = message.createdAt;
      }
      continue;
    }

    mistakes.set(key, {
      wrong: correction.wrong,
      right: correction.right,
      type,
      explanation: correction.explanation ?? '',
      count: 1,
      lastSeen: message.createdAt,
    });
  }

  return Array.from(mistakes.values())
    .sort((a, b) => b.count - a.count || (b.lastSeen?.getTime() ?? 0) - (a.lastSeen?.getTime() ?? 0));
}

export function aggregateFeedbackNotes(sessions: FeedbackLike[]) {
  const improvements = new Map<string, number>();
  const notes = new Map<string, number>();
  let offTopic = 0;
  let tooMuchVietnamese = 0;

  for (const session of sessions) {
    const feedback = parseEvaluation(session.feedbackJson);
    if (feedback.offTopic) offTopic += 1;
    if (feedback.tooMuchVietnamese) tooMuchVietnamese += 1;

    for (const item of feedback.improvements ?? []) {
      const normalized = item.trim();
      if (normalized) improvements.set(normalized, (improvements.get(normalized) ?? 0) + 1);
    }

    for (const item of feedback.importantNotes ?? []) {
      const normalized = item.trim();
      if (normalized) notes.set(normalized, (notes.get(normalized) ?? 0) + 1);
    }
  }

  const top = (map: Map<string, number>) =>
    Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count }));

  return {
    improvements: top(improvements),
    notes: top(notes),
    offTopic,
    tooMuchVietnamese,
  };
}

export function recommendedTeacherActions(input: {
  weakestSkillLabel?: string | null;
  mistakes: MistakeInsight[];
  offTopic: number;
  tooMuchVietnamese: number;
  completedSessions: number;
}) {
  const actions: string[] = [];

  if (input.completedSessions === 0) {
    return [
      'Giao một bài roleplay ngắn 3-5 phút để tạo baseline speaking.',
      'Bắt đầu với chủ đề quen thuộc để học viên nói được nhiều hơn.',
    ];
  }

  if (input.weakestSkillLabel) {
    actions.push(`Giao bài tiếp theo tập trung vào ${input.weakestSkillLabel.toLowerCase()}.`);
  }
  if (input.mistakes.length > 0) {
    actions.push(`Cho học viên luyện lại mẫu: "${input.mistakes[0].right}".`);
  }
  if (input.tooMuchVietnamese > 0) {
    actions.push('Đặt rule: trả lời bằng tiếng Anh trước, chỉ dùng tiếng Việt khi hỏi nghĩa từ.');
  }
  if (input.offTopic > 0) {
    actions.push('Nhắc học viên mở câu trả lời bằng một câu bám trực tiếp vào tình huống.');
  }

  actions.push('Yêu cầu học viên nghe lại mẫu và nói lại 2 câu đã sửa trong buổi kế tiếp.');
  return actions.slice(0, 5);
}
