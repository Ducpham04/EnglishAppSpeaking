'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mic, MicOff, Square, Volume2, VolumeX, ChevronLeft, RotateCcw, CheckCircle, AlertCircle, Loader2, Star, BookOpen, Send, Target, TrendingUp, MessageSquareText } from 'lucide-react';
import { useConversation } from '@/hooks/useConversation';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { TOPICS, LEVEL_INFO } from '@/lib/topics';
import { CEFRLevel, ConversationEvaluation, Topic, Message } from '@/lib/types';

type Step = 'level' | 'topic' | 'ready' | 'speaking';
type SpeechLanguage = 'auto' | 'en-US' | 'vi-VN';
type SpeechEngine = 'cloud' | 'browser';
type AssignmentBrief = {
  title: string;
  instruction: string | null;
  minDurationSec: number;
  minMessages: number;
  className: string;
};
type PracticeRecap = {
  topic: Topic;
  level: CEFRLevel;
  durationSec: number;
  assignmentBrief: AssignmentBrief | null;
  userMessages: number;
};

const SPEECH_LANGUAGES: Array<{ label: string; value: SpeechLanguage }> = [
  { label: 'Auto EN/VI', value: 'auto' },
  { label: 'English', value: 'en-US' },
  { label: 'Tiếng Việt', value: 'vi-VN' },
];

const PREFERRED_ENGLISH_VOICES = [
  'Google US English',
  'Microsoft Aria',
  'Microsoft Jenny',
  'Microsoft Guy',
  'Samantha',
  'Alex',
  'Daniel',
  'Karen',
  'Moira',
];

function selectEnglishVoice(voices: SpeechSynthesisVoice[]) {
  const englishVoices = voices.filter(voice => voice.lang.toLowerCase().startsWith('en'));
  if (englishVoices.length === 0) return null;

  return englishVoices.find(voice =>
    PREFERRED_ENGLISH_VOICES.some(preferred => voice.name.includes(preferred))
  ) || englishVoices.find(voice => voice.lang === 'en-US') || englishVoices[0];
}

function splitForSpeech(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(part => part.trim())
    .filter(Boolean);
}

function detectLanguage(text: string): 'vi' | 'en' | 'mixed' {
  const lower = text.toLowerCase();
  const hasVietnameseMarks = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text);
  const vietnameseWords = /\b(tôi|mình|em|anh|chị|là|và|của|muốn|không|có|được|vì|nên|nhưng|hôm nay|giáo viên|học)\b/i.test(lower);
  const englishWords = /\b(i|you|we|they|am|is|are|want|like|because|today|usually|would|could|should|think)\b/i.test(lower);
  if ((hasVietnameseMarks || vietnameseWords) && englishWords) return 'mixed';
  if (hasVietnameseMarks || vietnameseWords) return 'vi';
  return 'en';
}

function speechPace(text: string, durationSec?: number) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (!durationSec || durationSec <= 0 || words === 0) return null;
  const wordsPerMinute = Math.round((words / durationSec) * 60);
  if (wordsPerMinute < 80) return { wordsPerMinute, label: 'Hơi chậm', color: '#D97706' };
  if (wordsPerMinute > 165) return { wordsPerMinute, label: 'Hơi nhanh', color: '#DC2626' };
  return { wordsPerMinute, label: 'Tốc độ ổn', color: '#16A34A' };
}

function buildSpeechDraft(text: string, durationSec?: number) {
  return {
    text: text.trim(),
    language: detectLanguage(text),
    durationSec,
    pace: speechPace(text, durationSec),
  };
}

function speechLangForRecognition(language: SpeechLanguage) {
  if (language === 'auto') {
    const browserLanguage = typeof navigator !== 'undefined' ? navigator.language : '';
    return browserLanguage.toLowerCase().startsWith('vi') ? 'vi-VN' : 'en-US';
  }
  return language;
}

function extractPromptVocabulary(prompt: string) {
  const vocabularyLine = prompt.match(/Vocabulary:\s*([^\n]+)/i)?.[1];
  if (!vocabularyLine) return [];
  return vocabularyLine
    .replace(/["“”]/g, '')
    .split(/,\s*/)
    .map(item => item.trim().replace(/\.$/, ''))
    .filter(Boolean)
    .slice(0, 10);
}

function fallbackVocabulary(topic: Topic | null) {
  if (!topic) return [];
  const title = topic.title.toLowerCase();
  if (title.includes('introduction')) return ['My name is...', 'I am from...', 'I live in...', 'I like...', 'Nice to meet you'];
  if (title.includes('routine')) return ['wake up', 'go to school', 'in the morning', 'after that', 'usually'];
  if (title.includes('food')) return ['I would like...', 'Can I have...', 'the menu', 'the bill', 'no spicy'];
  if (title.includes('shopping')) return ['How much is it?', 'I am looking for...', 'Can I try it on?', 'Do you have...', 'too expensive'];
  if (title.includes('travel')) return ['I am planning to...', 'I would like to visit...', 'book a hotel', 'go sightseeing', 'local food'];
  if (title.includes('hobbies')) return ['in my free time', 'I enjoy...', 'I have been...', 'I prefer...', 'It helps me relax'];
  if (title.includes('interview')) return ['My strength is...', 'I have experience in...', 'I am responsible for...', 'I solved...', 'I am interested in'];
  return ['In my opinion...', 'I think that...', 'For example...', 'Could you explain?', 'That sounds interesting'];
}

function topicVocabulary(topic: Topic | null) {
  const extracted = extractPromptVocabulary(topic?.systemPrompt ?? '');
  return extracted.length > 0 ? extracted : fallbackVocabulary(topic);
}

function scoreBand(score: number) {
  if (score >= 85) return { label: 'Rất tốt', color: '#16A34A', bg: '#DCFCE7' };
  if (score >= 70) return { label: 'Đạt mục tiêu', color: '#2563EB', bg: '#DBEAFE' };
  if (score >= 55) return { label: 'Cần luyện thêm', color: '#D97706', bg: '#FEF3C7' };
  return { label: 'Nên luyện lại', color: '#DC2626', bg: '#FEE2E2' };
}

function weakestSkill(evaluation: ConversationEvaluation) {
  const skills = [
    { label: 'bám sát nhiệm vụ', score: evaluation.taskScore },
    { label: 'độ trôi chảy', score: evaluation.fluencyScore },
    { label: 'ngữ pháp', score: evaluation.grammarScore },
    { label: 'từ vựng', score: evaluation.vocabularyScore },
    { label: 'mạch lạc', score: evaluation.coherenceScore },
  ];
  return skills.sort((a, b) => a.score - b.score)[0];
}

function nextPracticeActions(evaluation: ConversationEvaluation, recap: PracticeRecap | null) {
  const weakest = weakestSkill(evaluation);
  const actions = [
    `Luyện lại 2 câu về ${weakest.label} trước khi chuyển topic.`,
    'Đọc to câu mẫu tốt hơn, sau đó nói lại bằng ý của bạn.',
  ];

  if (evaluation.tooMuchVietnamese) {
    actions.unshift('Nói lại cùng ý nhưng giới hạn tiếng Việt dưới 20%.');
  }
  if (evaluation.offTopic) {
    actions.unshift('Trả lời lại bằng cách nhắc trực tiếp tình huống hoặc nhiệm vụ trong câu đầu tiên.');
  }
  if (recap?.assignmentBrief) {
    actions.push(`Kiểm tra lại yêu cầu: ${recap.assignmentBrief.minMessages} lượt nói và ${Math.round(recap.assignmentBrief.minDurationSec / 60)} phút.`);
  }

  return actions.slice(0, 4);
}

function normalizeTopic(topic: Partial<Topic> & { title: string; id: string }): Topic {
  return {
    id: topic.id,
    title: topic.title,
    description: topic.description ?? '',
    level: (topic.level ?? 'A1') as CEFRLevel,
    openingQuestion: topic.openingQuestion || `Let's talk about ${topic.title}.`,
    systemPrompt: topic.systemPrompt ?? '',
    icon: topic.icon ?? '📚',
  };
}

function mergeTopics(...topicGroups: Array<Array<Partial<Topic> & { title: string; id: string }> | undefined>) {
  const merged = new Map<string, Topic>();

  for (const group of topicGroups) {
    for (const topic of group ?? []) {
      const normalized = normalizeTopic(topic);
      const duplicateByTitle = Array.from(merged.values()).find(
        existing => existing.title.toLowerCase() === normalized.title.toLowerCase()
      );
      merged.set(duplicateByTitle?.id ?? normalized.id, {
        ...(duplicateByTitle ?? normalized),
        ...normalized,
        systemPrompt: duplicateByTitle?.systemPrompt || normalized.systemPrompt,
      });
    }
  }

  return Array.from(merged.values());
}

// ---- Sub-components ----

function LevelCard({ level, info, selected, onClick }: {
  level: CEFRLevel;
  info: { label: string; description: string; color: string };
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      id={`level-${level}-btn`}
      onClick={onClick}
      style={{
        background: selected
          ? `${info.color}12`
          : '#FFFFFF',
        border: `1px solid ${selected ? info.color : '#E5E7EB'}`,
        borderRadius: 8,
        padding: '24px 20px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        textAlign: 'left',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {selected && (
        <div style={{ position: 'absolute', top: 12, right: 12 }}>
          <CheckCircle size={18} style={{ color: info.color }} />
        </div>
      )}
      <div style={{
        fontSize: 28, fontFamily: 'Outfit, sans-serif', fontWeight: 900,
        color: info.color, marginBottom: 6,
      }}>{level}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
        {info.label}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{info.description}</div>
    </button>
  );
}

function TopicCard({ topic, selected, onClick }: {
  topic: Topic;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      id={`topic-${topic.id}-btn`}
      onClick={onClick}
      style={{
        background: selected
          ? '#EFF6FF'
          : '#FFFFFF',
        border: `1px solid ${selected ? 'var(--primary)' : '#E5E7EB'}`,
        borderRadius: 8,
        padding: '20px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        textAlign: 'left',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}
    >
      <div style={{ fontSize: 32 }}>{topic.icon}</div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          {topic.title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {topic.description}
        </div>
      </div>
      {selected && (
        <CheckCircle size={16} style={{ color: 'var(--primary-light)', marginTop: 'auto' }} />
      )}
    </button>
  );
}

function RepeatToMaster({ sentence }: { sentence: string }) {
  const [practiced, setPracticed] = useState(false);

  const playSentence = () => {
    if (typeof window === 'undefined') return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.lang = 'en-US';
    utterance.rate = 0.88;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: '#FFFFFF', border: '1px solid #FDE68A', display: 'grid', gap: 8 }}>
      <p style={{ fontSize: 11, color: '#92400E', fontWeight: 850, textTransform: 'uppercase' }}>Repeat to master</p>
      <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 750, lineHeight: 1.5 }}>{sentence}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={playSentence} style={miniPracticeButtonStyle}>
          <Volume2 size={13} /> Nghe mẫu
        </button>
        <button type="button" onClick={() => setPracticed(true)} style={{ ...miniPracticeButtonStyle, borderColor: practiced ? '#86EFAC' : '#D1D5DB', color: practiced ? '#166534' : 'var(--text-secondary)', background: practiced ? '#F0FDF4' : '#FFFFFF' }}>
          <CheckCircle size={13} /> {practiced ? 'Đã luyện lại' : 'Đánh dấu đã luyện'}
        </button>
      </div>
    </div>
  );
}

function CorrectionDisplay({ message }: { message: Message }) {
  if (!message.correction) return null;

  if (!message.correction.hasCorrection) {
    return (
      <div className="correction-card-good correction-card" style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CheckCircle size={14} style={{ color: '#10B981' }} />
          <span style={{ fontSize: 12, color: '#10B981', fontWeight: 600 }}>Good sentence!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="correction-card" style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <AlertCircle size={13} style={{ color: '#F59E0B' }} />
        <span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600 }}>Correction</span>
        <span style={{
          fontSize: 10, color: 'var(--text-muted)',
          background: '#F3F4F6', padding: '2px 6px', borderRadius: 4,
          marginLeft: 'auto',
        }}>
          {message.correction.type}
        </span>
      </div>
      <div style={{ fontSize: 13, marginBottom: 6 }}>
        <span style={{ color: '#EF4444', textDecoration: 'line-through', marginRight: 6 }}>
          &ldquo;{message.correction.wrong}&rdquo;
        </span>
        <span style={{ color: 'var(--text-muted)', marginRight: 6 }}>→</span>
        <span style={{ color: '#10B981', fontWeight: 600 }}>
          &ldquo;{message.correction.right}&rdquo;
        </span>
      </div>
      {message.correction.explanation && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {message.correction.explanation}
        </p>
      )}
      <RepeatToMaster sentence={message.correction.right} />
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 16,
      animation: 'fade-in-up 0.3s ease forwards',
    }}>
      <div style={{ maxWidth: '80%' }}>
        {!isUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Mic size={13} style={{ color: 'var(--primary)' }} />
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>AI Partner</span>
          </div>
        )}
        <div className={isUser ? 'message-user' : 'message-ai'} style={{ padding: '12px 16px' }}>
          <p style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.7 }}>
            {message.content}
          </p>
          {!isUser && <CorrectionDisplay message={message} />}
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: isUser ? 'right' : 'left' }}>
          {message.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

function VocabularyPanel({ topic, words }: { topic: Topic | null; words: string[] }) {
  return (
    <aside className="glass-card practice-side-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <BookOpen size={16} style={{ color: 'var(--primary-light)' }} />
        <div>
          <h3 style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 800 }}>Từ vựng gợi ý</h3>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{topic?.title ?? 'Speaking practice'}</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {words.map(word => (
          <button
            key={word}
            type="button"
            title="Gợi ý từ/cụm từ thường dùng"
            style={{
              textAlign: 'left',
              padding: '9px 10px',
              borderRadius: 8,
              border: '1px solid #E5E7EB',
              background: '#F9FAFB',
              color: 'var(--text-primary)',
              fontSize: 12,
              lineHeight: 1.4,
              cursor: 'default',
            }}
          >
            {word}
          </button>
        ))}
      </div>

      <div style={{ padding: 12, borderRadius: 8, background: '#F0FDFA', border: '1px solid #99F6E4' }}>
        <p style={{ fontSize: 12, color: '#0F766E', fontWeight: 800, marginBottom: 5 }}>Mẹo nhỏ</p>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          Bạn có thể nói tiếng Việt khi cần, nhưng hãy thử nói lại ý chính bằng tiếng Anh để điểm speaking tốt hơn.
        </p>
      </div>
    </aside>
  );
}

function MissionPanel({
  topic,
  assignmentBrief,
  conversationProgress,
  sessionTime,
}: {
  topic: Topic | null;
  assignmentBrief: AssignmentBrief | null;
  conversationProgress: { userMessages: number; minMessages: number; maxUserMessages: number; shouldFinish?: boolean } | null;
  sessionTime: number;
}) {
  const minDuration = assignmentBrief?.minDurationSec ?? 180;
  const targetMessages = conversationProgress?.minMessages ?? assignmentBrief?.minMessages ?? 4;
  const userMessages = conversationProgress?.userMessages ?? 0;
  const messagePct = Math.min(100, Math.round((userMessages / targetMessages) * 100));
  const timePct = Math.min(100, Math.round((sessionTime / minDuration) * 100));

  return (
    <section className="glass-card practice-mission-panel">
      <div className="practice-mission-header">
        <div>
          <p>Speaking mission</p>
          <h2>{assignmentBrief?.title ?? topic?.title ?? 'Free speaking practice'}</h2>
          <span>{assignmentBrief?.className ?? (topic ? `Level ${topic.level}` : 'AI speaking room')}</span>
        </div>
        <div className="practice-mission-topic" aria-hidden="true">{topic?.icon ?? '🎙️'}</div>
      </div>

      <div className="practice-mission-grid">
        <ProgressMini label="Lượt nói" value={`${userMessages}/${targetMessages}`} pct={messagePct} color={conversationProgress?.shouldFinish ? '#16A34A' : 'var(--primary)'} />
        <ProgressMini label="Thời gian" value={`${Math.floor(sessionTime / 60)}:${String(sessionTime % 60).padStart(2, '0')}`} pct={timePct} color="#0F766E" />
      </div>

      <div className="practice-coach-note">
        <Target size={16} />
        <p>
          {conversationProgress?.shouldFinish
            ? 'Bạn đã đủ điều kiện. Kết thúc buổi để nhận điểm và feedback.'
            : 'Nói thành câu đầy đủ, bám sát tình huống, rồi xem lại transcript trước khi gửi.'}
        </p>
      </div>
    </section>
  );
}

function ProgressMini({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
  return (
    <div className="practice-progress-mini">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="practice-progress-track">
        <span style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function FinalEvaluationModal({
  evaluation,
  recap,
  onClose,
  onPracticeAgain,
}: {
  evaluation: ConversationEvaluation;
  recap: PracticeRecap | null;
  onClose: () => void;
  onPracticeAgain: () => void;
}) {
  const band = scoreBand(evaluation.overallScore);
  const weakest = weakestSkill(evaluation);
  const nextActions = nextPracticeActions(evaluation, recap);
  const suggestedSentences = evaluation.suggestedSentences.slice(0, 3);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 220, background: 'rgba(17,24,39,0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 900, maxHeight: '90vh', overflowY: 'auto', borderRadius: 8, background: '#FFFFFF', border: '1px solid #E5E7EB', padding: 28, boxShadow: '0 30px 90px rgba(16,24,40,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 22, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>
              Kết quả buổi luyện
            </p>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 28, color: 'var(--text-primary)', marginBottom: 8 }}>
              {recap?.topic.title ?? 'Speaking practice'}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              {evaluation.summary}
            </p>
          </div>
          <div style={{ minWidth: 150, borderRadius: 8, background: band.bg, border: `1px solid ${band.color}33`, padding: '16px 18px', textAlign: 'center' }}>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 38, lineHeight: 1, fontWeight: 900, color: band.color }}>{evaluation.overallScore}</span>
            <p style={{ fontSize: 12, color: band.color, fontWeight: 800, marginTop: 6 }}>{band.label}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 22 }}>
          {[
            ['Nhiệm vụ', evaluation.taskScore, '#16A34A'],
            ['Trôi chảy', evaluation.fluencyScore, '#0F766E'],
            ['Ngữ pháp', evaluation.grammarScore, '#D97706'],
            ['Từ vựng', evaluation.vocabularyScore, '#2563EB'],
            ['Mạch lạc', evaluation.coherenceScore, '#7C3AED'],
          ].map(([label, value, color]) => (
            <div key={label} style={{ padding: '12px 14px', borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 24, fontWeight: 850, color: color as string }}>{value as number}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 0.9fr)', gap: 18, alignItems: 'start', marginBottom: 22 }}>
          <section style={{ display: 'grid', gap: 14 }}>
            <div style={{ borderRadius: 8, border: '1px solid #E5E7EB', padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Target size={17} style={{ color: '#D97706' }} />
                <h3 style={{ fontSize: 15, fontWeight: 850, color: 'var(--text-primary)' }}>Ưu tiên luyện tiếp</h3>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
                Điểm thấp nhất hiện tại là <strong>{weakest.label}</strong> ({weakest.score}/100). Tập trung sửa phần này trước sẽ giúp buổi sau tiến bộ rõ nhất.
              </p>
              <div style={{ display: 'grid', gap: 8 }}>
                {nextActions.map(action => (
                  <div key={action} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 8, background: '#F9FAFB' }}>
                    <CheckCircle size={15} style={{ color: '#16A34A', flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.45 }}>{action}</p>
                  </div>
                ))}
              </div>
            </div>

            {suggestedSentences.length > 0 && (
              <div style={{ borderRadius: 8, border: '1px solid #E5E7EB', padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <MessageSquareText size={17} style={{ color: 'var(--primary)' }} />
                  <h3 style={{ fontSize: 15, fontWeight: 850, color: 'var(--text-primary)' }}>Câu nên luyện lại</h3>
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {suggestedSentences.map((item, index) => (
                    <div key={`${item.improved}-${index}`} style={{ padding: 12, borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                      {item.original && <p style={{ fontSize: 13, color: '#DC2626', textDecoration: 'line-through', marginBottom: 5 }}>{item.original}</p>}
                      <p style={{ fontSize: 13, color: '#166534', fontWeight: 800, marginBottom: 5 }}>{item.improved}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <aside style={{ display: 'grid', gap: 14 }}>
            <div style={{ borderRadius: 8, border: '1px solid #E5E7EB', padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <TrendingUp size={17} style={{ color: '#16A34A' }} />
                <h3 style={{ fontSize: 15, fontWeight: 850, color: 'var(--text-primary)' }}>Điểm mạnh</h3>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {evaluation.strengths.slice(0, 4).map(item => (
                  <p key={item} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, padding: 10, borderRadius: 8, background: '#F0FDF4' }}>{item}</p>
                ))}
              </div>
            </div>

            <div style={{ borderRadius: 8, border: '1px solid #E5E7EB', padding: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 12 }}>Cần cải thiện</h3>
              <div style={{ display: 'grid', gap: 8 }}>
                {evaluation.improvements.slice(0, 4).map(item => (
                  <p key={item} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, padding: 10, borderRadius: 8, background: '#FFFBEB' }}>{item}</p>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {(evaluation.tooMuchVietnamese || evaluation.offTopic) && (
          <div style={{ marginBottom: 18, padding: '12px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA' }}>
            <p style={{ fontSize: 13, color: '#B91C1C', lineHeight: 1.6 }}>
              {evaluation.tooMuchVietnamese && 'Bạn đã dùng quá nhiều tiếng Việt trong bài speaking. '}
              {evaluation.offTopic && 'Một phần nội dung chưa bám sát chủ đề/nhiệm vụ. '}
              Hãy luyện lại với câu trả lời ngắn hơn, rõ nhiệm vụ hơn.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {recap ? `${recap.userMessages} lượt nói · ${Math.floor(recap.durationSec / 60)}:${String(recap.durationSec % 60).padStart(2, '0')} · Level ${recap.level}` : 'Kết quả đã được lưu nếu bạn đang đăng nhập.'}
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={onClose} className="btn-secondary" style={{ padding: '11px 18px' }}>
              Đóng
            </button>
            <button onClick={onPracticeAgain} className="btn-primary" style={{ padding: '11px 18px', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <RotateCcw size={15} /> Luyện lại topic này
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Main Component ----
export default function DemoClient() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>('level');
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [availableTopics, setAvailableTopics] = useState<Topic[]>(TOPICS);
  // Vào từ bài tập/URL có sẵn chủ đề: khoá luôn, không được rơi về màn chọn level/chủ đề.
  const isGuidedEntry = Boolean(searchParams?.get('topicId') || searchParams?.get('assignmentId'));
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);
  const [sessionTime, setSessionTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [manualText, setManualText] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [aiVoice, setAiVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [speechLanguage, setSpeechLanguage] = useState<SpeechLanguage>('auto');
  const [speechEngine, setSpeechEngine] = useState<SpeechEngine>('cloud');
  const [isCloudSpeechSupported, setIsCloudSpeechSupported] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [cloudSpeechError, setCloudSpeechError] = useState<string | null>(null);
  const [speechDraft, setSpeechDraft] = useState<ReturnType<typeof buildSpeechDraft> | null>(null);
  const [finalEvaluation, setFinalEvaluation] = useState<ConversationEvaluation | null>(null);
  const [assignmentBrief, setAssignmentBrief] = useState<AssignmentBrief | null>(null);
  const [lastPracticeRecap, setLastPracticeRecap] = useState<PracticeRecap | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const ttsRef = useRef<SpeechSynthesisUtterance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<number | null>(null);
  const lastRecordingDurationRef = useRef<number | undefined>(undefined);

  const {
    messages,
    isLoading,
    error,
    providerNotice,
    conversationProgress,
    isConversationLocked,
    sendMessage,
    startSession,
    endSession,
    clearConversation,
    dismissProviderNotice,
    score,
  } = useConversation();
  const {
    interimTranscript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    getCurrentTranscript,
    error: speechError,
  } = useSpeechRecognition();

  useEffect(() => {
    setIsCloudSpeechSupported(
      typeof window !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== 'undefined'
    );
  }, []);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Session timer
  useEffect(() => {
    if (step === 'speaking') {
      timerRef.current = setInterval(() => setSessionTime(t => t + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step]);

  // Fetch public topics from server so admin-created topics are available in the demo.
  // Merge instead of replacing so built-in practice topics never disappear if DB is empty.
  useEffect(() => {
    const loadTopics = async () => {
      try {
        const res = await fetch('/api/topics');
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.topics)) {
          setAvailableTopics(prev => mergeTopics(TOPICS, prev, data.topics));
        }
      } catch {
        // keep default topics if the API call fails
      }
    };

    loadTopics();
  }, []);

  // Vào từ bài tập: chỉ đưa tới màn chuẩn bị, và không bao giờ kéo ngược học viên
  // ra khỏi phòng nói khi các request (topics, assignment) trả về muộn.
  const enterGuidedStep = useCallback(() => {
    setStep(current => (current === 'speaking' ? current : 'ready'));
  }, []);

  // Assignment practice can use private teacher topics that are not returned by /api/topics.
  useEffect(() => {
    const assignmentId = searchParams?.get('assignmentId');
    if (!assignmentId) return;

    const loadAssignmentTopic = async () => {
      try {
        const res = await fetch(`/api/assignments/${assignmentId}`);
        if (!res.ok) return;
        const assignment = await res.json();
        if (!assignment?.topic?.id || !assignment?.topic?.title) return;

        const assignmentTopic = normalizeTopic(assignment.topic);
        setAssignmentBrief({
          title: assignment.title,
          instruction: assignment.instruction,
          minDurationSec: assignment.minDurationSec,
          minMessages: assignment.minMessages,
          className: assignment.class?.name || 'Lớp học',
        });
        setAvailableTopics(prev => mergeTopics(TOPICS, prev, [assignmentTopic]));
        setSelectedTopic(assignmentTopic);
        setSelectedLevel(assignmentTopic.level);
        enterGuidedStep();
      } catch {
        // keep URL-based topic resolution below as fallback
      }
    };

    loadAssignmentTopic();
  }, [searchParams, enterGuidedStep]);

  useEffect(() => {
    const levelParam = searchParams?.get('level') as CEFRLevel | null;

    if (levelParam && ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(levelParam)) {
      setSelectedLevel(levelParam as CEFRLevel);
    }

    if (isGuidedEntry) {
      enterGuidedStep();
    }
  }, [searchParams, isGuidedEntry, enterGuidedStep]);

  useEffect(() => {
    const topicId = searchParams?.get('topicId');
    if (!topicId) return;

    const match = availableTopics.find(t => t.id === topicId);
    if (match) {
      setSelectedTopic(match);
      if (!selectedLevel) {
        setSelectedLevel(match.level);
      }
      enterGuidedStep();
    }
  }, [availableTopics, searchParams, selectedLevel, enterGuidedStep]);

  const handleStartSession = useCallback(() => {
    if (!selectedLevel || !selectedTopic) return;
    setFinalEvaluation(null);
    const assignmentId = searchParams?.get('assignmentId');
    startSession(selectedTopic, selectedLevel, assignmentId);
    setStep('speaking');
  }, [searchParams, selectedLevel, selectedTopic, startSession]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoice = () => {
      const selectedVoice = selectEnglishVoice(window.speechSynthesis.getVoices());
      setAiVoice(selectedVoice);
    };

    loadVoice();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoice);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoice);
    };
  }, []);

  // TTS for AI messages
  const speakText = useCallback((text: string) => {
    if (!isTTSEnabled || typeof window === 'undefined') return;
    window.speechSynthesis.cancel();

    const chunks = splitForSpeech(text);
    let index = 0;

    const speakNext = () => {
      const chunk = chunks[index];
      if (!chunk) return;

      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = aiVoice?.lang || 'en-US';
      utterance.voice = aiVoice;
      utterance.rate = 0.92;
      utterance.pitch = 1.03;
      utterance.volume = 1;
      utterance.onend = () => {
        index += 1;
        window.setTimeout(speakNext, 140);
      };
      ttsRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    };

    speakNext();
  }, [aiVoice, isTTSEnabled]);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'assistant') {
        speakText(lastMsg.content);
      }
    }
  }, [messages, speakText]);

  // Handle mic button
  const transcribeAudio = useCallback(async (blob: Blob) => {
    setIsTranscribing(true);
    setCloudSpeechError(null);
    try {
      const formData = new FormData();
      const extension = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
      formData.append('audio', blob, `speech.${extension}`);
      if (speechLanguage === 'en-US') formData.append('language', 'en');
      if (speechLanguage === 'vi-VN') formData.append('language', 'vi');

      const res = await fetch('/api/speech/transcribe', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setCloudSpeechError(data.error || 'Không thể nhận diện giọng nói.');
        return;
      }
      const text = typeof data.text === 'string' ? data.text.trim() : '';
      if (!text) {
        setCloudSpeechError('Chưa nghe được nội dung. Hãy nói rõ hơn hoặc thử chế độ Web.');
        return;
      }
      setSpeechDraft(buildSpeechDraft(text, lastRecordingDurationRef.current));
    } catch {
      setCloudSpeechError('Không thể gửi audio để nhận diện. Hãy thử lại hoặc chuyển sang Web.');
    } finally {
      setIsTranscribing(false);
    }
  }, [speechLanguage]);

  const stopMediaTracks = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;
  }, []);

  const startCloudRecording = useCallback(async () => {
    if (!isCloudSpeechSupported) {
      setCloudSpeechError('Trình duyệt không hỗ trợ ghi âm cloud. Hãy dùng Chrome hoặc chuyển sang Web.');
      return;
    }
    try {
      setCloudSpeechError(null);
      setSpeechDraft(null);
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = event => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        stopMediaTracks();
        mediaRecorderRef.current = null;
        if (blob.size > 0) void transcribeAudio(blob);
      };
      mediaRecorderRef.current = recorder;
      recordingStartedAtRef.current = Date.now();
      lastRecordingDurationRef.current = undefined;
      recorder.start();
      setIsRecording(true);
    } catch {
      setCloudSpeechError('Không thể mở microphone. Vui lòng cấp quyền mic và thử lại.');
      stopMediaTracks();
      setIsRecording(false);
    }
  }, [isCloudSpeechSupported, stopMediaTracks, transcribeAudio]);

  const stopCloudRecording = useCallback(() => {
    if (recordingStartedAtRef.current) {
      lastRecordingDurationRef.current = Math.max(1, Math.round((Date.now() - recordingStartedAtRef.current) / 1000));
      recordingStartedAtRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      stopMediaTracks();
    }
    setIsRecording(false);
  }, [stopMediaTracks]);

  const handleMicToggle = useCallback(() => {
    if (isRecording) {
      if (speechEngine === 'cloud') stopCloudRecording();
      else {
        stopListening();
        setIsRecording(false);
      }
    } else {
      setSpeechDraft(null);
      resetTranscript();
      if (speechEngine === 'cloud') void startCloudRecording();
      else {
        recordingStartedAtRef.current = Date.now();
        startListening(speechLangForRecognition(speechLanguage));
        setIsRecording(true);
      }
    }
  }, [isRecording, resetTranscript, speechEngine, speechLanguage, startCloudRecording, startListening, stopCloudRecording, stopListening]);

  const handleSpeechLanguageChange = useCallback((language: SpeechLanguage) => {
    setSpeechLanguage(language);
    setSpeechDraft(null);
    if (!isRecording) return;

    resetTranscript();
    startListening(speechLangForRecognition(language));
  }, [isRecording, resetTranscript, startListening]);

  // Stop speech recognition and keep a draft so the learner can retry before sending.
  const handleStopForReview = useCallback(async () => {
    if (speechEngine === 'cloud') {
      stopCloudRecording();
      return;
    }
    let text = getCurrentTranscript();
    stopListening();
    setIsRecording(false);
    if (!text) {
      await new Promise(resolve => window.setTimeout(resolve, 250));
      text = getCurrentTranscript();
    }
    if (!text) return;
    const durationSec = recordingStartedAtRef.current
      ? Math.max(1, Math.round((Date.now() - recordingStartedAtRef.current) / 1000))
      : undefined;
    recordingStartedAtRef.current = null;
    setSpeechDraft(buildSpeechDraft(text, durationSec));
    resetTranscript();
  }, [getCurrentTranscript, resetTranscript, speechEngine, stopCloudRecording, stopListening]);

  const handleSendTranscript = useCallback(async () => {
    const text = speechDraft?.text.trim();
    if (!text || isLoading || isConversationLocked) return;
    setSpeechDraft(null);
    window.speechSynthesis.cancel();
    await sendMessage(text);
  }, [speechDraft, isConversationLocked, isLoading, sendMessage]);

  const handleRetrySpeech = useCallback(() => {
    setSpeechDraft(null);
    resetTranscript();
    window.speechSynthesis.cancel();
    if (speechEngine === 'cloud') void startCloudRecording();
    else {
      recordingStartedAtRef.current = Date.now();
      startListening(speechLangForRecognition(speechLanguage));
      setIsRecording(true);
    }
  }, [resetTranscript, speechEngine, speechLanguage, startCloudRecording, startListening]);

  const handlePlayDraft = useCallback(() => {
    if (!speechDraft || typeof window === 'undefined') return;
    const text = speechDraft.text.trim();
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechDraft.language === 'vi' ? 'vi-VN' : 'en-US';
    utterance.rate = 0.92;
    window.speechSynthesis.speak(utterance);
  }, [speechDraft]);

  // Send manual text
  const handleSendManual = useCallback(async () => {
    const text = manualText.trim();
    if (!text || isLoading || isConversationLocked) return;
    setManualText('');
    setShowManualInput(false);
    window.speechSynthesis.cancel();
    await sendMessage(text);
  }, [manualText, isConversationLocked, isLoading, sendMessage]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleFinishSession = useCallback(async () => {
    if (isLoading) return;
    if (selectedTopic && selectedLevel) {
      setLastPracticeRecap({
        topic: selectedTopic,
        level: selectedLevel,
        durationSec: sessionTime,
        assignmentBrief,
        userMessages: messages.filter(message => message.role === 'user').length,
      });
    }
    const result = await endSession();
    if (result?.evaluation) {
      setFinalEvaluation(result.evaluation);
    }
    clearConversation();
    window.speechSynthesis.cancel();
    setStep('level');
    setSelectedLevel(null);
    setSelectedTopic(null);
    setSessionTime(0);
    setIsRecording(false);
  }, [assignmentBrief, clearConversation, endSession, isLoading, messages, selectedLevel, selectedTopic, sessionTime]);

  const handlePracticeAgain = useCallback(() => {
    if (!lastPracticeRecap) {
      setFinalEvaluation(null);
      return;
    }
    setFinalEvaluation(null);
    setSelectedTopic(lastPracticeRecap.topic);
    setSelectedLevel(lastPracticeRecap.level);
    setAssignmentBrief(lastPracticeRecap.assignmentBrief);
    setSessionTime(0);
    startSession(lastPracticeRecap.topic, lastPracticeRecap.level, searchParams?.get('assignmentId'));
    setStep('speaking');
  }, [lastPracticeRecap, searchParams, startSession]);

  const levelList = Object.entries(LEVEL_INFO) as [CEFRLevel, typeof LEVEL_INFO[CEFRLevel]][];
  const filteredTopics = selectedLevel ? availableTopics.filter(t => t.level === selectedLevel) : availableTopics;
  const vocabularySuggestions = topicVocabulary(selectedTopic);

  // ---- RENDER ----
  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      {/* BG Orbs */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'var(--gradient-hero)',
      }} />
      {providerNotice && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(17,24,39,0.38)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ width: '100%', maxWidth: 520, borderRadius: 8, background: '#FFFFFF', border: '1px solid #E5E7EB', padding: '28px', boxShadow: '0 30px 80px rgba(16,24,40,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <AlertCircle size={28} style={{ color: '#F59E0B' }} />
              <div>
                <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 22, color: 'var(--text-primary)', margin: 0 }}>Đã chuyển API AI</h2>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Hệ thống tự động sử dụng API khác khi API chính gặp giới hạn.</p>
              </div>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7, marginBottom: 24 }}>{providerNotice}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={dismissProviderNotice}
                style={{ padding: '12px 22px', borderRadius: 8, border: '1px solid #D1D5DB', background: '#FFFFFF', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13 }}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
      {finalEvaluation && (
        <FinalEvaluationModal
          evaluation={finalEvaluation}
          recap={lastPracticeRecap}
          onClose={() => setFinalEvaluation(null)}
          onPracticeAgain={handlePracticeAgain}
        />
      )}
      {/* Top bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        padding: '14px 24px',
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <button style={{
              background: '#FFFFFF', border: '1px solid #D1D5DB',
              borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              color: 'var(--text-secondary)', fontSize: 13,
            }}>
              <ChevronLeft size={15} />
              Trang chủ
            </button>
          </Link>
          {step !== 'level' && (
            <>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>/</span>
              {selectedLevel && (
                <span className={`level-${selectedLevel}`} style={{
                  fontSize: 12, fontWeight: 700, padding: '3px 10px',
                  borderRadius: 6, border: '1px solid',
                }}>
                  {selectedLevel}
                </span>
              )}
              {step === 'speaking' && selectedTopic && (
                <>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>·</span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{selectedTopic.icon} {selectedTopic.title}</span>
                </>
              )}
            </>
          )}
        </div>

        {step === 'speaking' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', animation: 'speak-pulse 1s ease infinite alternate' }} />
              {formatTime(sessionTime)}
            </div>
            {conversationProgress && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
                <span>{conversationProgress.userMessages}/{conversationProgress.minMessages} lượt</span>
                <span style={{ color: '#D1D5DB' }}>|</span>
                <span>tối đa {conversationProgress.maxUserMessages}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <Star size={13} style={{ color: '#F59E0B' }} fill="#F59E0B" />
              <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{score}</span>
              <span style={{ color: 'var(--text-muted)' }}>pts</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 3, borderRadius: 8, border: '1px solid #D1D5DB', background: '#F9FAFB' }}>
              {(['cloud', 'browser'] as SpeechEngine[]).map(engine => {
                const active = speechEngine === engine;
                return (
                  <button
                    key={engine}
                    type="button"
                    onClick={() => {
                      if (isRecording || isTranscribing) return;
                      setSpeechEngine(engine);
                      setSpeechDraft(null);
                    }}
                    title={engine === 'cloud' ? 'Groq Whisper speech engine' : 'Browser Web Speech engine'}
                    style={{
                      border: 0,
                      borderRadius: 6,
                      padding: '5px 8px',
                      background: active ? '#DBEAFE' : 'transparent',
                      color: active ? 'var(--primary-light)' : 'var(--text-muted)',
                      cursor: isRecording || isTranscribing ? 'not-allowed' : 'pointer',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {engine === 'cloud' ? 'CLOUD' : 'WEB'}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 3, borderRadius: 8, border: '1px solid #D1D5DB', background: '#F9FAFB' }}>
              {SPEECH_LANGUAGES.map(language => {
                const active = speechLanguage === language.value;
                return (
                  <button
                    key={language.value}
                    type="button"
                    onClick={() => handleSpeechLanguageChange(language.value)}
                    title={`Ngôn ngữ nghe: ${language.label}`}
                    style={{
                      border: 0,
                      borderRadius: 6,
                      padding: '5px 8px',
                      background: active ? '#CCFBF1' : 'transparent',
                      color: active ? '#0F766E' : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {language.value === 'auto' ? 'AUTO' : language.value === 'en-US' ? 'EN' : 'VI'}
                  </button>
                );
              })}
            </div>
            <button
              id="tts-toggle-btn"
              title={aiVoice ? `AI voice: ${aiVoice.name} (${aiVoice.lang})` : 'AI voice: browser default'}
              onClick={() => {
                setIsTTSEnabled(!isTTSEnabled);
                if (isTTSEnabled) window.speechSynthesis.cancel();
              }}
              style={{
                background: '#FFFFFF', border: '1px solid #D1D5DB',
                borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
                color: isTTSEnabled ? 'var(--accent-light)' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
              }}
            >
              {isTTSEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              {isTTSEnabled ? 'AI Voice On' : 'AI Voice Off'}
            </button>
            <button
              id="end-session-btn"
              onClick={handleFinishSession}
              style={{
                background: '#FFFFFF', border: '1px solid #D1D5DB',
                borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
              }}
            >
              <CheckCircle size={13} />
              Kết thúc buổi
            </button>
            <button
              id="restart-btn"
              onClick={handleFinishSession}
              style={{
                background: '#FFFFFF', border: '1px solid #D1D5DB',
                borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
              }}
            >
              <RotateCcw size={13} />
              Đổi topic
            </button>
          </div>
        )}
      </div>

      {/* ===== STEP: LEVEL SELECTION ===== */}
      {step === 'level' && (
        <div style={{ position: 'relative', zIndex: 1, padding: '100px 24px 60px', maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h1 style={{
              fontFamily: 'Outfit, sans-serif', fontWeight: 800,
              fontSize: 'clamp(28px, 5vw, 44px)',
              color: 'var(--text-primary)', marginBottom: 12,
            }}>
              Chọn <span className="gradient-text">trình độ</span> của bạn
            </h1>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)' }}>
              AI sẽ điều chỉnh ngôn ngữ và độ khó theo level bạn chọn
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 40,
          }}>
            {levelList.map(([level, info]) => (
              <LevelCard
                key={level}
                level={level}
                info={info}
                selected={selectedLevel === level}
                onClick={() => setSelectedLevel(level)}
              />
            ))}
          </div>

          {selectedLevel && (
            <div style={{ textAlign: 'center', animation: 'fade-in 0.3s ease' }}>
              <button
                id="continue-to-topic-btn"
                className="btn-primary"
                onClick={() => setStep('topic')}
                style={{ padding: '14px 36px', fontSize: 16 }}
              >
                Tiếp tục chọn chủ đề →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== STEP: TOPIC SELECTION ===== */}
      {step === 'topic' && (
        <div style={{ position: 'relative', zIndex: 1, padding: '100px 24px 60px', maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h1 style={{
              fontFamily: 'Outfit, sans-serif', fontWeight: 800,
              fontSize: 'clamp(28px, 5vw, 44px)',
              color: 'var(--text-primary)', marginBottom: 12,
            }}>
              Chọn <span className="gradient-text">chủ đề</span> hội thoại
            </h1>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)' }}>
              {filteredTopics.length} chủ đề dành cho level {selectedLevel}
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
            marginBottom: 40,
          }}>
            {filteredTopics.map(topic => (
              <TopicCard
                key={topic.id}
                topic={topic}
                selected={selectedTopic?.id === topic.id}
                onClick={() => setSelectedTopic(topic)}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              id="back-to-level-btn"
              className="btn-secondary"
              onClick={() => setStep('level')}
              style={{ padding: '14px 28px' }}
            >
              ← Đổi level
            </button>
            {selectedTopic && (
              <button
                id="start-session-btn"
                className="btn-primary"
                onClick={handleStartSession}
                style={{ padding: '14px 36px', fontSize: 16, animation: 'fade-in 0.3s ease' }}
              >
                <Mic size={18} />
                Bắt đầu luyện nói!
              </button>
            )}
          </div>
        </div>
      )}

      {/* ===== STEP: READY — chuẩn bị trước khi nói ===== */}
      {step === 'ready' && selectedTopic && (
        <div style={{ position: 'relative', zIndex: 1, padding: '100px 24px 60px', maxWidth: 720, margin: '0 auto' }}>
          <div className="glass-card" style={{ padding: '32px 30px', textAlign: 'center' }}>
            <span style={{ fontSize: 52, display: 'block', marginBottom: 12 }}>{selectedTopic.icon}</span>

            {assignmentBrief && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
                {assignmentBrief.className} · {assignmentBrief.title}
              </p>
            )}

            <h1 style={{
              fontFamily: 'Outfit, sans-serif', fontWeight: 800,
              fontSize: 'clamp(24px, 4vw, 34px)', color: 'var(--text-primary)', marginBottom: 8,
            }}>
              {selectedTopic.title}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
              Level {selectedTopic.level}
            </p>

            <div style={{
              padding: '18px 20px', borderRadius: 12, background: '#F9FAFB',
              border: '1px solid #E5E7EB', textAlign: 'left', marginBottom: 20,
            }}>
              <p style={{ fontSize: 11, fontWeight: 850, color: 'var(--text-muted)', marginBottom: 6 }}>
                AI SẼ MỞ ĐẦU BẰNG CÂU
              </p>
              <p style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                “{selectedTopic.openingQuestion}”
              </p>
            </div>

            {assignmentBrief && (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
                <ReadyChip label={`Tối thiểu ${Math.round(assignmentBrief.minDurationSec / 60)} phút`} />
                <ReadyChip label={`Tối thiểu ${assignmentBrief.minMessages} lượt nói`} />
              </div>
            )}

            <div style={{
              padding: '14px 18px', borderRadius: 12, background: '#FFFBEB',
              border: '1px solid #FDE68A', textAlign: 'left', marginBottom: 24,
            }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                Chuẩn bị xong hãy bấm bắt đầu. Trình duyệt sẽ xin quyền dùng micro —
                hãy chọn <strong>Cho phép</strong>, rồi trả lời AI bằng tiếng Anh.
              </p>
            </div>

            <button
              id="start-ready-btn"
              className="btn-primary"
              onClick={handleStartSession}
              style={{
                width: '100%', padding: '15px 0', fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <Mic size={18} />
              Bắt đầu nói
            </button>

            {!isGuidedEntry && (
              <button
                onClick={() => setStep('topic')}
                className="btn-secondary"
                style={{ width: '100%', padding: '12px 0', fontSize: 14, marginTop: 10 }}
              >
                ← Chọn chủ đề khác
              </button>
            )}
          </div>
        </div>
      )}

      {/* ===== STEP: SPEAKING INTERFACE ===== */}
      {step === 'speaking' && (
        <div style={{
          position: 'relative', zIndex: 1,
          paddingTop: 70,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Conversation area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            width: '100%',
            margin: '0 auto',
          }}>
            <div className="practice-room-grid">
            <VocabularyPanel topic={selectedTopic} words={vocabularySuggestions} />
            <main style={{ minWidth: 0 }}>
            <MissionPanel
              topic={selectedTopic}
              assignmentBrief={assignmentBrief}
              conversationProgress={conversationProgress}
              sessionTime={sessionTime}
            />
            {assignmentBrief && (
              <div className="glass-card" style={{ padding: 16, marginBottom: 16, borderColor: '#BBF7D0' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ fontSize: 11, color: '#16A34A', fontWeight: 800, marginBottom: 4 }}>Bài luyện được giao</p>
                    <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 5 }}>
                      {assignmentBrief.title}
                    </h2>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{assignmentBrief.className}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ padding: '6px 9px', borderRadius: 7, background: '#F0FDFA', color: '#0F766E', fontSize: 11, fontWeight: 800 }}>
                      {Math.round(assignmentBrief.minDurationSec / 60)} phút
                    </span>
                    <span style={{ padding: '6px 9px', borderRadius: 7, background: '#EFF6FF', color: 'var(--primary)', fontSize: 11, fontWeight: 800 }}>
                      {assignmentBrief.minMessages} lượt nói
                    </span>
                  </div>
                </div>
                {assignmentBrief.instruction && (
                  <p style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #E5E7EB', fontSize: 12, lineHeight: 1.6, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: 140, overflow: 'auto' }}>
                    {assignmentBrief.instruction}
                  </p>
                )}
              </div>
            )}

            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Mic size={14} style={{ color: 'var(--primary)' }} />
                </div>
                <div className="glass-card" style={{ padding: '12px 20px' }}>
                  <div className="loading-dots" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}

            {/* Error display */}
            {(error || speechError || cloudSpeechError) && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: 8, padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: 10,
                margin: '8px 0',
                animation: 'fade-in 0.3s ease',
              }}>
                <AlertCircle size={16} style={{ color: '#EF4444', flexShrink: 0 }} />
                <p style={{ fontSize: 13, color: '#EF4444' }}>{error || speechError || cloudSpeechError}</p>
              </div>
            )}

            {conversationProgress?.shouldFinish && (
              <div style={{
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: 8,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                margin: '8px 0',
              }}>
                <CheckCircle size={16} style={{ color: '#16A34A', flexShrink: 0 }} />
                <p style={{ fontSize: 13, color: '#166534' }}>
                  Bạn đã đạt mốc của bài luyện. Hãy bấm “Kết thúc buổi” để hệ thống chấm điểm và lưu kết quả.
                </p>
              </div>
            )}

            <div ref={messagesEndRef} />
            </main>
            </div>
          </div>

          {/* Interim transcript */}
          {interimTranscript && (
            <div style={{
              background: '#EFF6FF',
              borderTop: '1px solid #BFDBFE',
              padding: '12px 24px',
              maxWidth: 800, width: '100%', margin: '0 auto',
            }}>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                {interimTranscript}
              </p>
            </div>
          )}

          {/* Transcript ready to send */}
          {speechDraft && !isRecording && (
            <div style={{
              background: '#FFFFFF',
              borderTop: '1px solid #E5E7EB',
              padding: '14px 24px',
              maxWidth: 800, width: '100%', margin: '0 auto',
              display: 'grid', gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
                    Bản nháp trước khi gửi · {speechDraft.language === 'vi' ? 'Tiếng Việt' : speechDraft.language === 'mixed' ? 'EN/VI mixed' : 'English'}
                  </p>
	                  <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>
	                    {speechDraft.text}
	                  </p>
                  {speechDraft.pace && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 9 }}>
                      <span style={{ padding: '4px 8px', borderRadius: 7, background: `${speechDraft.pace.color}12`, border: `1px solid ${speechDraft.pace.color}33`, color: speechDraft.pace.color, fontSize: 11, fontWeight: 850 }}>
                        {speechDraft.pace.label} · {speechDraft.pace.wordsPerMinute} wpm
                      </span>
                      {speechDraft.durationSec && (
                        <span style={{ padding: '4px 8px', borderRadius: 7, background: '#F9FAFB', border: '1px solid #E5E7EB', color: 'var(--text-muted)', fontSize: 11, fontWeight: 750 }}>
                          {speechDraft.durationSec}s ghi âm
                        </span>
                      )}
                    </div>
                  )}
	                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handlePlayDraft}
                  style={draftButtonStyle}
                >
                  <Volume2 size={13} /> Nghe lại
                </button>
                <button
                  type="button"
                  onClick={handleRetrySpeech}
                  disabled={isLoading || isConversationLocked}
                  style={draftButtonStyle}
                >
                  <RotateCcw size={13} /> Nói lại
                </button>
                <button
                  id="send-transcript-btn"
                  className="btn-primary"
                  onClick={handleSendTranscript}
                  disabled={isLoading || isConversationLocked}
                  style={{ padding: '8px 18px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {isLoading ? <Loader2 size={14} style={{ animation: 'spin-slow 1s linear infinite' }} /> : <Send size={13} />}
                  Gửi
                </button>
              </div>
            </div>
          )}

          {/* Manual text input */}
          {showManualInput && (
            <div style={{
              borderTop: '1px solid #E5E7EB',
              padding: '12px 24px',
              maxWidth: 800, width: '100%', margin: '0 auto',
              display: 'flex', gap: 10,
            }}>
              <input
                id="manual-text-input"
                type="text"
                value={manualText}
                onChange={e => setManualText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendManual()}
                placeholder="Nhập câu tiếng Anh hoặc tiếng Việt..."
                style={{
                  flex: 1, background: '#FFFFFF',
                  border: '1px solid #D1D5DB',
                  borderRadius: 8, padding: '12px 16px',
                  color: 'var(--text-primary)', fontSize: 14,
                  outline: 'none', fontFamily: 'Inter, sans-serif',
                }}
              />
              <button
                id="send-manual-btn"
                className="btn-primary"
                onClick={handleSendManual}
                disabled={!manualText.trim() || isLoading || isConversationLocked}
                style={{ padding: '10px 20px' }}
              >
                Gửi
              </button>
              <button
                onClick={() => setShowManualInput(false)}
                style={{
                  background: '#FFFFFF', border: '1px solid #D1D5DB',
                  borderRadius: 8, padding: '10px 14px', cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Bottom control bar */}
          <div style={{
            background: '#FFFFFF',
            borderTop: '1px solid #E5E7EB',
            padding: '20px 24px',
            boxShadow: '0 -8px 24px rgba(16,24,40,0.05)',
          }}>
            <div style={{
              maxWidth: 800, margin: '0 auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
            }}>
              {/* Status text */}
              <div style={{ textAlign: 'center', minWidth: 120 }}>
                {isRecording && (
                  <p style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>
                    Đang nghe... bấm nút vuông để xem lại
                  </p>
                )}
                {isLoading && (
                  <p style={{ fontSize: 13, color: '#D97706', fontWeight: 600 }}>
                    AI đang suy nghĩ...
                  </p>
                )}
                {isTranscribing && (
                  <p style={{ fontSize: 13, color: '#0F766E', fontWeight: 600 }}>
                    Đang nhận diện giọng nói...
                  </p>
                )}
                {!isRecording && !isLoading && !isTranscribing && (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {isConversationLocked ? 'Đã đạt mốc, hãy kết thúc buổi' : speechDraft ? 'Kiểm tra câu rồi gửi' : 'Nhấn mic để nói'}
                  </p>
                )}
              </div>

              {/* Main Mic Button */}
              {(speechEngine === 'cloud' ? isCloudSpeechSupported : isSupported) ? (
                <button
                  id="main-mic-btn"
                  className={`mic-button ${
                    isRecording ? 'mic-button-listening' :
                    (isLoading || isTranscribing) ? 'mic-button-processing' :
                    'mic-button-idle'
                  }`}
                  onClick={isRecording ? handleStopForReview : handleMicToggle}
                  disabled={((isLoading || isTranscribing) && !isRecording) || (!isRecording && isConversationLocked)}
                  title={isRecording ? 'Dừng để xem lại' : 'Bấm để nói'}
                >
                  {(isLoading || isTranscribing) && !isRecording ? (
                    <Loader2 size={32} color="white" />
                  ) : isRecording ? (
                    <Square size={28} color="white" fill="white" />
                  ) : (
                    <Mic size={32} color="white" />
                  )}
                </button>
              ) : (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  padding: '16px 24px',
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: 8,
                }}>
                  <MicOff size={24} style={{ color: '#EF4444' }} />
                  <p style={{ fontSize: 12, color: '#B91C1C', textAlign: 'center', maxWidth: 200 }}>
                    Browser không hỗ trợ mic. Vui lòng dùng Google Chrome.
                  </p>
                </div>
              )}

              {/* Type instead button */}
              <div style={{ textAlign: 'center', minWidth: 120 }}>
                <button
                  id="type-instead-btn"
                  onClick={() => setShowManualInput(!showManualInput)}
                  disabled={isConversationLocked}
                  style={{
                    background: 'transparent',
                    border: '1px solid #D1D5DB',
                    borderRadius: 8, padding: '8px 14px',
                    cursor: isConversationLocked ? 'not-allowed' : 'pointer', color: 'var(--text-muted)',
                    fontSize: 12, display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  Gõ thay vì nói
                </button>
              </div>
            </div>

            {/* Messages count */}
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {conversationProgress
                  ? `${conversationProgress.userMessages}/${conversationProgress.minMessages} lượt nói · tối đa ${conversationProgress.maxUserMessages} · ${formatTime(sessionTime)}`
                  : `${messages.filter(m => m.role === 'user').length} lượt nói · ${formatTime(sessionTime)}`}
              </p>
              {conversationProgress && (
                <div style={{ width: 220, maxWidth: '70vw', height: 5, background: '#E5E7EB', borderRadius: 999, overflow: 'hidden', margin: '8px auto 0' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, Math.round((conversationProgress.userMessages / conversationProgress.minMessages) * 100))}%`,
                    background: conversationProgress.shouldFinish ? '#16A34A' : 'var(--primary)',
                    borderRadius: 999,
                  }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const draftButtonStyle = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #D1D5DB',
  background: '#FFFFFF',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 700,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

const miniPracticeButtonStyle = {
  padding: '7px 10px',
  borderRadius: 8,
  border: '1px solid #D1D5DB',
  background: '#FFFFFF',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 800,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

function ReadyChip({ label }: { label: string }) {
  return (
    <span style={{
      fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 999,
      background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE',
    }}>
      {label}
    </span>
  );
}
