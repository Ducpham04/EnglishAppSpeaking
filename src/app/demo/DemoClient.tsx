'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mic, MicOff, Square, Volume2, VolumeX, ChevronLeft, RotateCcw, CheckCircle, AlertCircle, Loader2, Star, BookOpen, Send } from 'lucide-react';
import { useConversation } from '@/hooks/useConversation';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { TOPICS, LEVEL_INFO } from '@/lib/topics';
import { CEFRLevel, ConversationEvaluation, Topic, Message } from '@/lib/types';

type Step = 'level' | 'topic' | 'speaking';
type SpeechLanguage = 'auto' | 'en-US' | 'vi-VN';
type SpeechEngine = 'cloud' | 'browser';
type AssignmentBrief = {
  title: string;
  instruction: string | null;
  minDurationSec: number;
  minMessages: number;
  className: string;
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
          ? `linear-gradient(135deg, ${info.color}25 0%, ${info.color}10 100%)`
          : 'rgba(15, 15, 30, 0.5)',
        border: `2px solid ${selected ? info.color : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 16,
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
          ? 'linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(6,182,212,0.1) 100%)'
          : 'rgba(15, 15, 30, 0.5)',
        border: `2px solid ${selected ? 'var(--primary)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 16,
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
          background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4,
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
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--gradient-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13,
            }}>🤖</div>
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
    <aside className="glass-card" style={{
      padding: 16,
      position: 'sticky',
      top: 92,
      maxHeight: 'calc(100vh - 220px)',
      overflowY: 'auto',
    }}>
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
              border: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,255,255,0.035)',
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

      <div style={{ padding: 12, borderRadius: 8, background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.16)' }}>
        <p style={{ fontSize: 12, color: '#06B6D4', fontWeight: 800, marginBottom: 5 }}>Mẹo nhỏ</p>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          Bạn có thể nói tiếng Việt khi cần, nhưng hãy thử nói lại ý chính bằng tiếng Anh để điểm speaking tốt hơn.
        </p>
      </div>
    </aside>
  );
}

// ---- Main Component ----
export default function DemoClient() {
  const [step, setStep] = useState<Step>('level');
  const searchParams = useSearchParams();
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [availableTopics, setAvailableTopics] = useState<Topic[]>(TOPICS);
  const [pendingAutoStart, setPendingAutoStart] = useState(false);
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
  const [speechDraft, setSpeechDraft] = useState<{ text: string; language: 'vi' | 'en' | 'mixed' } | null>(null);
  const [finalEvaluation, setFinalEvaluation] = useState<ConversationEvaluation | null>(null);
  const [assignmentBrief, setAssignmentBrief] = useState<AssignmentBrief | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const ttsRef = useRef<SpeechSynthesisUtterance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
        setStep('topic');
      } catch {
        // keep URL-based topic resolution below as fallback
      }
    };

    loadAssignmentTopic();
  }, [searchParams]);

  useEffect(() => {
    const topicId = searchParams?.get('topicId');
    const levelParam = searchParams?.get('level') as CEFRLevel | null;
    const autoParam = searchParams?.get('autoStart');

    if (levelParam && ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(levelParam)) {
      setSelectedLevel(levelParam as CEFRLevel);
    }

    if (autoParam === '1' || autoParam === 'true') {
      setPendingAutoStart(true);
    }

    if (topicId && (levelParam || selectedLevel)) {
      setStep('topic');
    }
  }, [searchParams, selectedLevel]);

  useEffect(() => {
    const topicId = searchParams?.get('topicId');
    if (!topicId) return;

    const match = availableTopics.find(t => t.id === topicId);
    if (match) {
      setSelectedTopic(match);
      if (!selectedLevel) {
        setSelectedLevel(match.level);
      }
      setStep('topic');
    }
  }, [availableTopics, searchParams, selectedLevel]);

  const handleStartSession = useCallback(() => {
    if (!selectedLevel || !selectedTopic) return;
    setFinalEvaluation(null);
    const assignmentId = searchParams?.get('assignmentId');
    startSession(selectedTopic, selectedLevel, assignmentId);
    setStep('speaking');
  }, [searchParams, selectedLevel, selectedTopic, startSession]);

  useEffect(() => {
    if (!pendingAutoStart || !selectedTopic || !selectedLevel || step === 'speaking' || isLoading) return;
    handleStartSession();
    setPendingAutoStart(false);
  }, [pendingAutoStart, selectedTopic, selectedLevel, step, isLoading, handleStartSession]);

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
      setSpeechDraft({ text, language: detectLanguage(text) });
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
      recorder.start();
      setIsRecording(true);
    } catch {
      setCloudSpeechError('Không thể mở microphone. Vui lòng cấp quyền mic và thử lại.');
      stopMediaTracks();
      setIsRecording(false);
    }
  }, [isCloudSpeechSupported, stopMediaTracks, transcribeAudio]);

  const stopCloudRecording = useCallback(() => {
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
    setSpeechDraft({ text: text.trim(), language: detectLanguage(text) });
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
  }, [clearConversation, endSession, isLoading]);

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
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ width: '100%', maxWidth: 520, borderRadius: 24, background: 'rgba(10,10,20,0.98)', border: '1px solid rgba(255,255,255,0.12)', padding: '28px', boxShadow: '0 30px 80px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <AlertCircle size={28} style={{ color: '#F59E0B' }} />
              <div>
                <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 22, color: 'white', margin: 0 }}>Đã chuyển API AI</h2>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Hệ thống tự động sử dụng API khác khi API chính gặp giới hạn.</p>
              </div>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7, marginBottom: 24 }}>{providerNotice}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={dismissProviderNotice}
                style={{ padding: '12px 22px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.08)', color: 'white', cursor: 'pointer', fontSize: 13 }}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
      {finalEvaluation && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 220, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ width: '100%', maxWidth: 760, maxHeight: '90vh', overflowY: 'auto', borderRadius: 24, background: 'rgba(10,10,20,0.98)', border: '1px solid rgba(255,255,255,0.12)', padding: 28, boxShadow: '0 30px 90px rgba(0,0,0,0.45)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, marginBottom: 22 }}>
              <div>
                <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 24, color: 'white', marginBottom: 6 }}>Kết quả buổi luyện</h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{finalEvaluation.summary}</p>
              </div>
              <div style={{ minWidth: 96, height: 96, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 30, fontWeight: 900, color: 'white' }}>{finalEvaluation.overallScore}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.78)' }}>điểm</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 22 }}>
              {[
                ['Nhiệm vụ', finalEvaluation.taskScore, '#10B981'],
                ['Trôi chảy', finalEvaluation.fluencyScore, '#06B6D4'],
                ['Ngữ pháp', finalEvaluation.grammarScore, '#F59E0B'],
                ['Từ vựng', finalEvaluation.vocabularyScore, '#8B5CF6'],
                ['Mạch lạc', finalEvaluation.coherenceScore, '#EC4899'],
              ].map(([label, value, color]) => (
                <div key={label} style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 22, fontWeight: 800, color: color as string }}>{value as number}</p>
                </div>
              ))}
            </div>

            {(finalEvaluation.tooMuchVietnamese || finalEvaluation.offTopic) && (
              <div style={{ marginBottom: 18, padding: '12px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <p style={{ fontSize: 13, color: '#EF4444', lineHeight: 1.6 }}>
                  {finalEvaluation.tooMuchVietnamese && 'Bạn đã dùng quá nhiều tiếng Việt trong bài speaking. '}
                  {finalEvaluation.offTopic && 'Một phần nội dung chưa bám sát chủ đề/nhiệm vụ. '}
                  Điểm đã được điều chỉnh theo yêu cầu luyện nói.
                </p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: 14, color: '#10B981', fontWeight: 800, marginBottom: 10 }}>Điểm mạnh</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {finalEvaluation.strengths.map((item, index) => (
                    <p key={index} style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '9px 11px', borderRadius: 10, background: 'rgba(16,185,129,0.08)' }}>{item}</p>
                  ))}
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: 14, color: '#F59E0B', fontWeight: 800, marginBottom: 10 }}>Cần cải thiện</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {finalEvaluation.improvements.map((item, index) => (
                    <p key={index} style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '9px 11px', borderRadius: 10, background: 'rgba(245,158,11,0.08)' }}>{item}</p>
                  ))}
                </div>
              </div>
            </div>

            {finalEvaluation.importantNotes.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <h3 style={{ fontSize: 14, color: 'var(--primary-light)', fontWeight: 800, marginBottom: 10 }}>Lưu ý cho lần luyện tiếp theo</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {finalEvaluation.importantNotes.map((item, index) => (
                    <p key={index} style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '9px 11px', borderRadius: 10, background: 'rgba(124,58,237,0.08)' }}>{item}</p>
                  ))}
                </div>
              </div>
            )}

            {finalEvaluation.suggestedSentences.length > 0 && (
              <div style={{ marginBottom: 22 }}>
                <h3 style={{ fontSize: 14, color: '#06B6D4', fontWeight: 800, marginBottom: 10 }}>Câu nên nói lại tốt hơn</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {finalEvaluation.suggestedSentences.map((item, index) => (
                    <div key={index} style={{ padding: 12, borderRadius: 12, background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.14)' }}>
                      {item.original && <p style={{ fontSize: 13, color: '#EF4444', textDecoration: 'line-through', marginBottom: 4 }}>{item.original}</p>}
                      <p style={{ fontSize: 13, color: '#10B981', fontWeight: 700, marginBottom: 4 }}>{item.improved}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setFinalEvaluation(null)}
                className="btn-primary"
                style={{ padding: '12px 22px' }}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Top bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        padding: '14px 24px',
        background: 'rgba(10, 10, 20, 0.9)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <button style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
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
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
                <span>tối đa {conversationProgress.maxUserMessages}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <Star size={13} style={{ color: '#F59E0B' }} fill="#F59E0B" />
              <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{score}</span>
              <span style={{ color: 'var(--text-muted)' }}>pts</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 3, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
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
                      background: active ? 'rgba(124,58,237,0.18)' : 'transparent',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 3, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
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
                      background: active ? 'rgba(6,182,212,0.18)' : 'transparent',
                      color: active ? '#06B6D4' : 'var(--text-muted)',
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
                background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
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
                background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
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
                background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
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
            <div style={{
              maxWidth: 1120,
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: '260px minmax(0, 800px)',
              gap: 20,
              alignItems: 'start',
            }}>
            <VocabularyPanel topic={selectedTopic} words={vocabularySuggestions} />
            <main style={{ minWidth: 0 }}>
            {assignmentBrief && (
              <div className="glass-card" style={{ padding: 16, marginBottom: 16, borderColor: 'rgba(16,185,129,0.22)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ fontSize: 11, color: '#10B981', fontWeight: 800, marginBottom: 4 }}>Bài luyện được giao</p>
                    <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 5 }}>
                      {assignmentBrief.title}
                    </h2>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{assignmentBrief.className}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ padding: '6px 9px', borderRadius: 7, background: 'rgba(6,182,212,0.12)', color: '#06B6D4', fontSize: 11, fontWeight: 800 }}>
                      {Math.round(assignmentBrief.minDurationSec / 60)} phút
                    </span>
                    <span style={{ padding: '6px 9px', borderRadius: 7, background: 'rgba(124,58,237,0.14)', color: 'var(--primary-light)', fontSize: 11, fontWeight: 800 }}>
                      {assignmentBrief.minMessages} lượt nói
                    </span>
                  </div>
                </div>
                {assignmentBrief.instruction && (
                  <p style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 12, lineHeight: 1.6, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: 140, overflow: 'auto' }}>
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
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--gradient-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>🤖</div>
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
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 12, padding: '12px 16px',
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
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: 12,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                margin: '8px 0',
              }}>
                <CheckCircle size={16} style={{ color: '#10B981', flexShrink: 0 }} />
                <p style={{ fontSize: 13, color: '#10B981' }}>
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
              background: 'rgba(124,58,237,0.08)',
              borderTop: '1px solid rgba(124,58,237,0.15)',
              padding: '12px 24px',
              maxWidth: 800, width: '100%', margin: '0 auto',
            }}>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                🎙️ {interimTranscript}
              </p>
            </div>
          )}

          {/* Transcript ready to send */}
          {speechDraft && !isRecording && (
            <div style={{
              background: 'rgba(124,58,237,0.1)',
              borderTop: '1px solid rgba(124,58,237,0.2)',
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
              borderTop: '1px solid rgba(255,255,255,0.05)',
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
                  flex: 1, background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(124,58,237,0.3)',
                  borderRadius: 12, padding: '12px 16px',
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
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Bottom control bar */}
          <div style={{
            background: 'rgba(10, 10, 20, 0.95)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            padding: '20px 24px',
          }}>
            <div style={{
              maxWidth: 800, margin: '0 auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
            }}>
              {/* Status text */}
              <div style={{ textAlign: 'center', minWidth: 120 }}>
                {isRecording && (
                  <p style={{ fontSize: 13, color: '#EF4444', fontWeight: 600 }}>
                    🔴 Đang nghe... bấm nút vuông để xem lại
                  </p>
                )}
                {isLoading && (
                  <p style={{ fontSize: 13, color: '#F59E0B', fontWeight: 600 }}>
                    🤔 AI đang suy nghĩ...
                  </p>
                )}
                {isTranscribing && (
                  <p style={{ fontSize: 13, color: '#06B6D4', fontWeight: 600 }}>
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
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 16,
                }}>
                  <MicOff size={24} style={{ color: '#EF4444' }} />
                  <p style={{ fontSize: 12, color: '#EF4444', textAlign: 'center', maxWidth: 200 }}>
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
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10, padding: '8px 14px',
                    cursor: isConversationLocked ? 'not-allowed' : 'pointer', color: 'var(--text-muted)',
                    fontSize: 12, display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  ⌨️ Gõ thay vì nói
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
                <div style={{ width: 220, maxWidth: '70vw', height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden', margin: '8px auto 0' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, Math.round((conversationProgress.userMessages / conversationProgress.minMessages) * 100))}%`,
                    background: conversationProgress.shouldFinish ? '#10B981' : 'var(--gradient-primary)',
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
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 700,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};
