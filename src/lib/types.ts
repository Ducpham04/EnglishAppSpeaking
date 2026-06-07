export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface Topic {
  id: string;
  title: string;
  description: string;
  level: CEFRLevel;
  openingQuestion: string;
  systemPrompt: string;
  icon: string;
}

export interface Correction {
  hasCorrection: boolean;
  wrong: string;
  right: string;
  explanation: string;
  type: 'grammar' | 'vocabulary' | 'structure' | 'pronunciation';
}

export interface AIResponse {
  reply: string;
  correction: Correction;
  followUpQuestion: string;
}

export interface ConversationEvaluation {
  overallScore: number;
  taskScore: number;
  fluencyScore: number;
  grammarScore: number;
  vocabularyScore: number;
  coherenceScore: number;
  languageUseScore?: number;
  relevanceScore?: number;
  offTopic?: boolean;
  tooMuchVietnamese?: boolean;
  summary: string;
  strengths: string[];
  improvements: string[];
  importantNotes: string[];
  suggestedSentences: Array<{
    original: string;
    improved: string;
    reason: string;
  }>;
}

export interface AIUsage {
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCost?: number;
}

export interface ProviderFallbackInfo {
  from: string;
  to: string;
  reason?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  correction?: Correction;
  followUpQuestion?: string;
  timestamp: Date;
}

export interface ConversationHistory {
  role: 'user' | 'assistant';
  content: string;
}

export type SpeechStatus = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';
