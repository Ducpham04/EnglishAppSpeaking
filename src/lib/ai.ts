import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { AIResponse, ConversationEvaluation, ConversationHistory } from './types';
import { calculateEstimatedCost, cleanJSONText as utilCleanJSONText } from './ai-utils';

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const GROQ_DEFAULT_CHAT_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_CHAT_ENDPOINT = process.env.GROQ_ENDPOINT?.includes('/v1/generate')
  ? GROQ_DEFAULT_CHAT_ENDPOINT
  : (process.env.GROQ_ENDPOINT || GROQ_DEFAULT_CHAT_ENDPOINT);
const GROQ_MODELS_ENDPOINT = 'https://api.groq.com/openai/v1/models';
const DEFAULT_GROQ_MODELS = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'qwen/qwen3-32b',
  'groq/compound-mini',
  'groq/compound',
];
const RESPONSE_FORMAT_INSTRUCTION = `
Always respond in this EXACT JSON format (no markdown, no code blocks, just raw JSON):
{
  "reply": "Your natural reply to the student (1-3 sentences, appropriate for their CEFR level)",
  "correction": {
    "hasCorrection": true or false,
    "wrong": "the exact wrong phrase from the student (empty string if no correction)",
    "right": "the corrected phrase (empty string if no correction)",
    "explanation": "short, friendly explanation (empty string if no correction)",
    "type": "grammar"
  },
  "followUpQuestion": "One engaging follow-up question to keep the conversation going"
}

Rules for correction:
- Correct ONLY ONE mistake per turn, the most important one
- Grammar errors take priority over vocabulary
- If the sentence is correct, set hasCorrection to false and leave wrong/right/explanation empty
- Be encouraging even when correcting

Rules for reply:
- Match vocabulary complexity to the student's CEFR level
- Keep replies SHORT (1-3 sentences) — you want the student to speak more
- Be warm, friendly, and encouraging
`;

type TokenUsage = {
  prompt_tokens?: number;
  input_tokens?: number;
  completion_tokens?: number;
  output_tokens?: number;
  promptTokens?: number;
  inputTokens?: number;
  completionTokens?: number;
  outputTokens?: number;
};

type GroqChatResponse = {
  choices?: Array<{ message?: { content?: string | Array<{ text?: string; content?: string }> } }>;
  output_text?: string;
  text?: string;
  output?: string;
  usage?: TokenUsage;
  error?: { message?: string };
};

type OpenAIResponseLike = {
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string; content?: string }> }>;
  usage?: TokenUsage;
};

export type GetAIResponseResult = {
  aiResponse: AIResponse;
  usage?: {
    provider: string;
    model: string;
    inputTokens?: number;
    outputTokens?: number;
    estimatedCost?: number;
  };
  fallback?: {
    from: string;
    to: string;
    reason?: string;
  };
};

export type EvaluateConversationInput = {
  topicTitle: string;
  level: string;
  assignmentTitle?: string | null;
  assignmentInstruction?: string | null;
  minMessages?: number | null;
  durationSec: number;
  userMessages: string[];
  assistantMessages: string[];
  correctionCount: number;
};

const EVALUATION_FORMAT_INSTRUCTION = `
Evaluate the student's speaking practice. Respond in this exact JSON shape only:
{
  "overallScore": 0,
  "taskScore": 0,
  "fluencyScore": 0,
  "grammarScore": 0,
  "vocabularyScore": 0,
  "coherenceScore": 0,
  "languageUseScore": 0,
  "relevanceScore": 0,
  "offTopic": false,
  "tooMuchVietnamese": false,
  "summary": "2-3 short Vietnamese sentences summarizing performance",
  "strengths": ["Vietnamese bullet"],
  "improvements": ["Vietnamese bullet"],
  "importantNotes": ["Vietnamese note the student should remember"],
  "suggestedSentences": [
    { "original": "student phrase", "improved": "better phrase", "reason": "Vietnamese reason" }
  ]
}

Scoring rubric:
- taskScore: completed the assigned conversation task and responded appropriately.
- fluencyScore: natural flow, enough speaking turns, not too fragmented.
- grammarScore: grammar accuracy for the CEFR level.
- vocabularyScore: relevant vocabulary and variety.
- coherenceScore: answers are understandable, connected, and context-aware.
- languageUseScore: how much the student used English instead of Vietnamese.
- relevanceScore: how relevant the student's answers were to the topic/task.

Rules:
- Scores must be integers from 40 to 100.
- If the student mostly uses Vietnamese in an English-speaking task, set tooMuchVietnamese=true and cap overallScore at 55.
- If the student talks about unrelated content, set offTopic=true and cap taskScore/relevanceScore at 50.
- Do not reward turn count alone. A long but irrelevant conversation should receive a low taskScore.
- Be fair but encouraging.
- Important notes must be concrete and useful for the next practice.
- Use Vietnamese for summary, strengths, improvements, importantNotes, and reasons.
- suggestedSentences should contain 1-3 useful rewrites.`;

function cleanJSONText(text: string) {
  return utilCleanJSONText(text);
}

function clampScore(value: unknown, fallback: number) {
  const numberValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.max(40, Math.min(100, Math.round(numberValue)));
}

function normalizeEvaluation(value: Partial<ConversationEvaluation>, fallbackScore: number): ConversationEvaluation {
  const taskScore = clampScore(value.taskScore, fallbackScore);
  const fluencyScore = clampScore(value.fluencyScore, fallbackScore);
  const grammarScore = clampScore(value.grammarScore, fallbackScore);
  const vocabularyScore = clampScore(value.vocabularyScore, fallbackScore);
  const coherenceScore = clampScore(value.coherenceScore, fallbackScore);
  const languageUseScore = clampScore(value.languageUseScore, fallbackScore);
  const relevanceScore = clampScore(value.relevanceScore, fallbackScore);
  const overallScore = clampScore(
    value.overallScore,
    Math.round((taskScore * 0.35) + (fluencyScore * 0.2) + (grammarScore * 0.2) + (vocabularyScore * 0.15) + (coherenceScore * 0.1))
  );

  return {
    overallScore,
    taskScore,
    fluencyScore,
    grammarScore,
    vocabularyScore,
    coherenceScore,
    languageUseScore,
    relevanceScore,
    offTopic: value.offTopic === true,
    tooMuchVietnamese: value.tooMuchVietnamese === true,
    summary: value.summary || 'Bạn đã hoàn thành buổi luyện. Hãy xem lại các lưu ý để cải thiện ở lần tiếp theo.',
    strengths: Array.isArray(value.strengths) && value.strengths.length > 0
      ? value.strengths.slice(0, 4)
      : ['Bạn đã tham gia hội thoại và phản hồi được các câu hỏi chính.'],
    improvements: Array.isArray(value.improvements) && value.improvements.length > 0
      ? value.improvements.slice(0, 4)
      : ['Cố gắng trả lời thành câu đầy đủ hơn và dùng thêm từ nối.'],
    importantNotes: Array.isArray(value.importantNotes) && value.importantNotes.length > 0
      ? value.importantNotes.slice(0, 5)
      : ['Ưu tiên nói rõ ý chính trước, sau đó thêm chi tiết.'],
    suggestedSentences: Array.isArray(value.suggestedSentences)
      ? value.suggestedSentences.slice(0, 3).map(item => ({
        original: item?.original || '',
        improved: item?.improved || '',
        reason: item?.reason || '',
      }))
      : [],
  };
}

function unique(values: string[]) {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

function configuredGroqModels() {
  const configuredList = process.env.GROQ_MODELS
    ? process.env.GROQ_MODELS.split(',')
    : [];
  const legacyModel = process.env.GROQ_MODEL ? [process.env.GROQ_MODEL] : [];

  return unique([...configuredList, ...legacyModel]);
}

async function getGroqModels() {
  const configured = configuredGroqModels();
  if (configured.length > 0) return configured;

  if (!process.env.GROQ_API_KEY) return DEFAULT_GROQ_MODELS;

  try {
    const response = await fetch(GROQ_MODELS_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) throw new Error(`Groq models API error: ${response.status} ${response.statusText}`);

    const data = await response.json() as { data?: Array<{ id?: string }> };
    const remoteModels = unique((data.data || [])
      .map(model => model.id || '')
      .filter(modelId => !modelId.includes('whisper') && !modelId.includes('guard') && !modelId.includes('orpheus')));

    return remoteModels.length > 0 ? remoteModels : DEFAULT_GROQ_MODELS;
  } catch (err) {
    console.warn('Could not fetch Groq models, using default model list:', (err as Error).message);
    return DEFAULT_GROQ_MODELS;
  }
}

function extractGroqText(response: GroqChatResponse) {
  const content = response.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map(item => item.text || item.content || '')
      .join('');
  }
  return response.output_text || response.text || response.output || '';
}

function isQuotaOrRateLimitError(status: number, message: string) {
  const normalized = message.toLowerCase();
  return status === 429
    || status === 402
    || normalized.includes('rate limit')
    || normalized.includes('quota')
    || normalized.includes('token')
    || normalized.includes('tpm')
    || normalized.includes('rpm');
}

async function tryGroqModels(fullPrompt: string): Promise<GetAIResponseResult | null> {
  if (!process.env.GROQ_API_KEY) return null;

  const models = await getGroqModels();
  const failures: string[] = [];

  for (const model of models) {
    try {
      const groqResp = await fetch(GROQ_CHAT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.7,
          messages: [{ role: 'user', content: fullPrompt }],
          response_format: { type: 'json_object' },
        }),
      });

      const groqJson = await groqResp.json().catch(() => ({})) as GroqChatResponse;
      if (!groqResp.ok) {
        const reason = groqJson.error?.message || `${groqResp.status} ${groqResp.statusText}`;
        failures.push(`${model}: ${reason}`);
        if (isQuotaOrRateLimitError(groqResp.status, reason)) continue;
        continue;
      }

      const groqText = cleanJSONText(extractGroqText(groqJson));
      const parsedGroq = JSON.parse(groqText) as AIResponse;
      const inputTokens = groqJson.usage?.prompt_tokens ?? groqJson.usage?.input_tokens ?? 0;
      const outputTokens = groqJson.usage?.completion_tokens ?? groqJson.usage?.output_tokens ?? 0;
      const estimatedCost = calculateEstimatedCost('groq', model, inputTokens, outputTokens);

      return {
        aiResponse: parsedGroq,
        usage: {
          provider: 'groq',
          model,
          inputTokens,
          outputTokens,
          estimatedCost,
        },
      };
    } catch (err) {
      failures.push(`${model}: ${(err as Error).message}`);
    }
  }

  console.warn('All Groq models failed, continuing to other providers:', failures.join(' | '));
  return null;
}

export async function getAIResponse(
  studentMessage: string,
  systemPrompt: string,
  history: ConversationHistory[],
  level: string,
  topicTitle: string,
): Promise<GetAIResponseResult> {
  // Build conversation context from history as text
  const historyText = history
    .filter(h => h.role === 'user' || h.role === 'assistant')
    .map(h => `${h.role === 'user' ? 'Student' : 'AI'}: ${h.content}`)
    .join('\n');

  const fullPrompt = `${systemPrompt}

CEFR Level: ${level}
Topic: ${topicTitle}

Language handling:
- The student may speak English, Vietnamese, or a mix. Understand Vietnamese input instead of treating it as noise.
- Keep the practice goal as English speaking. If the student uses Vietnamese, briefly acknowledge the meaning, give a simple English sentence they can say, then continue with an English follow-up question.
- Do not reward Vietnamese-only answers as strong English speaking. Corrections and final evaluation may still flag too much Vietnamese.

${RESPONSE_FORMAT_INSTRUCTION}

${historyText ? `Previous conversation:\n${historyText}\n\n` : ''}Now the student says: "${studentMessage}"

Respond with JSON only:`;

  let attemptedGemini = false;

  const groqResult = await tryGroqModels(fullPrompt);
  if (groqResult) return groqResult;

  // First try Gemini (Google) if key present
  if (process.env.GEMINI_API_KEY && genAI) {
    attemptedGemini = true;
    try {
      const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        generationConfig: { temperature: 0.7 },
      });

      const result = await model.generateContent(fullPrompt);
      let text = result.response.text();
      text = cleanJSONText(text);

      const parsed = JSON.parse(text) as AIResponse;

      // Attempt to extract token usage from Gemini result (best-effort)
      const resultWithUsage = result as typeof result & { response?: { usage?: TokenUsage }; usage?: TokenUsage };
      const gemUsageAny = resultWithUsage.response?.usage || resultWithUsage.usage || {};
      const inputTokens = gemUsageAny.input_tokens ?? gemUsageAny.promptTokens ?? gemUsageAny.inputTokens ?? 0;
      const outputTokens = gemUsageAny.output_tokens ?? gemUsageAny.completionTokens ?? gemUsageAny.outputTokens ?? 0;
      const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      const estimatedCost = calculateEstimatedCost('gemini', modelName, inputTokens, outputTokens);

      return {
        aiResponse: parsed,
        usage: {
          provider: 'gemini',
          model: modelName,
          inputTokens,
          outputTokens,
          estimatedCost,
        },
      };
    } catch (err) {
      console.warn('Gemini call failed, falling back to OpenAI:', (err as Error).message);
      if (!openai) {
        throw new Error('No OpenAI key configured and Gemini fallback failed. Set OPENAI_API_KEY or GEMINI_API_KEY.');
      }
    }
  }

  // Fallback to OpenAI Responses API
  if (!openai) {
    throw new Error('No OpenAI key configured and Gemini fallback failed. Set OPENAI_API_KEY or GEMINI_API_KEY.');
  }

  try {
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const resp = await openai.responses.create({ model, input: fullPrompt }) as OpenAIResponseLike;

    let text = '';
    if (typeof resp.output_text === 'string' && resp.output_text.length > 0) {
      text = resp.output_text;
    } else if (resp.output && Array.isArray(resp.output) && resp.output.length > 0) {
      const first = resp.output[0];
      if (first.content && Array.isArray(first.content)) {
        const contentItem = first.content.find(c => c.type === 'output_text' || c.type === 'text');
        if (contentItem) text = contentItem.text || contentItem.content || '';
      }
    }

    text = cleanJSONText(text || '');

    const parsed = JSON.parse(text) as AIResponse;

    const inputTokens = resp.usage?.prompt_tokens ?? resp.usage?.input_tokens ?? 0;
    const outputTokens = resp.usage?.completion_tokens ?? resp.usage?.output_tokens ?? 0;
    const estimatedCostOpen = calculateEstimatedCost('openai', model, inputTokens, outputTokens);

    const usage = resp.usage ? {
      provider: 'openai',
      model,
      inputTokens,
      outputTokens,
      estimatedCost: estimatedCostOpen,
    } : {
      provider: 'openai',
      model,
    };

    return {
      aiResponse: parsed,
      usage,
      fallback: attemptedGemini ? {
        from: 'gemini',
        to: 'openai',
        reason: 'Gemini đã hết quota hoặc gặp lỗi, chuyển sang OpenAI tự động.',
      } : undefined,
    };
  } catch (err) {
    console.error('OpenAI fallback failed:', (err as Error).message);
    throw new Error('AI providers failed to produce a valid response');
  }
}

function buildEvaluationPrompt(input: EvaluateConversationInput) {
  const transcript = input.userMessages
    .map((message, index) => {
      const assistant = input.assistantMessages[index] ? `\nAI: ${input.assistantMessages[index]}` : '';
      return `Student: ${message}${assistant}`;
    })
    .join('\n\n');

  return `You are an expert Vietnamese English-speaking teacher evaluating a CEFR ${input.level} speaking practice.

Topic: ${input.topicTitle}
Assignment: ${input.assignmentTitle || 'Free practice'}
Instruction: ${input.assignmentInstruction || 'No extra instruction'}
Minimum speaking turns: ${input.minMessages || 'not specified'}
Actual student turns: ${input.userMessages.length}
Duration seconds: ${input.durationSec}
Correction count during conversation: ${input.correctionCount}

${EVALUATION_FORMAT_INSTRUCTION}

Conversation transcript:
${transcript || '(No student messages)'}

Return JSON only.`;
}

function heuristicEvaluation(input: EvaluateConversationInput): ConversationEvaluation {
  const minMessages = input.minMessages || 5;
  const completion = Math.min(1, input.userMessages.length / minMessages);
  const penalty = Math.min(30, input.correctionCount * 5);
  const base = Math.max(45, Math.round(55 + completion * 40 - penalty));
  const taskScore = clampScore(base + (input.userMessages.length >= minMessages ? 5 : -8), base);
  const grammarScore = clampScore(92 - penalty, base);
  const fluencyScore = clampScore(base + (input.durationSec >= 120 ? 4 : -6), base);
  const vocabularyScore = clampScore(base - Math.max(0, 8 - new Set(input.userMessages.join(' ').toLowerCase().split(/\s+/)).size / 8), base);
  const coherenceScore = clampScore(base, base);
  const quality = analyzeConversationQuality(input);

  return normalizeEvaluation({
    overallScore: Math.round((taskScore * 0.35) + (fluencyScore * 0.2) + (grammarScore * 0.2) + (vocabularyScore * 0.15) + (coherenceScore * 0.1)),
    taskScore,
    fluencyScore,
    grammarScore,
    vocabularyScore,
    coherenceScore,
    languageUseScore: quality.languageUseScore,
    relevanceScore: quality.relevanceScore,
    offTopic: quality.offTopic,
    tooMuchVietnamese: quality.tooMuchVietnamese,
    summary: input.userMessages.length >= minMessages
      ? 'Bạn đã hoàn thành số lượt nói yêu cầu. Nội dung trả lời đã bám vào chủ đề, nhưng vẫn nên luyện thêm độ mạch lạc và độ chính xác.'
      : 'Bạn đã bắt đầu hội thoại nhưng chưa đủ số lượt nói yêu cầu. Hãy luyện thêm để thể hiện rõ nhiệm vụ hơn.',
    strengths: [
      'Bạn đã phản hồi được trong ngữ cảnh hội thoại.',
      'Bạn có cố gắng duy trì tương tác với AI.',
    ],
    improvements: [
      'Trả lời bằng câu đầy đủ hơn thay vì các cụm ngắn.',
      'Dùng thêm từ nối như because, then, also, after that để câu mạch lạc hơn.',
    ],
    importantNotes: [
      'Mỗi câu trả lời nên có ý chính rõ ràng.',
      'Nếu mắc lỗi, hãy thử nói lại câu đã được sửa trong lượt tiếp theo.',
    ],
    suggestedSentences: [],
  }, base);
}

const VIETNAMESE_DIACRITIC_RE = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/gi;
const ENGLISH_WORD_RE = /\b[a-z]{2,}\b/gi;
const COMMON_ENGLISH_WORDS = new Set([
  'the', 'and', 'you', 'are', 'for', 'that', 'this', 'with', 'have', 'want',
  'like', 'would', 'could', 'please', 'because', 'about', 'from', 'there',
  'what', 'when', 'where', 'which', 'how', 'can', 'will', 'my', 'your',
]);
const GENERIC_TOPIC_WORDS = new Set([
  'practice', 'talk', 'conversation', 'english', 'speaking', 'topic',
  'plans', 'plan', 'introduction', 'daily', 'routine',
]);

function tokenizeEnglish(text: string) {
  return (text.toLowerCase().match(ENGLISH_WORD_RE) || [])
    .filter(word => !COMMON_ENGLISH_WORDS.has(word));
}

function topicKeywords(input: EvaluateConversationInput) {
  return new Set(
    tokenizeEnglish(`${input.topicTitle} ${input.assignmentTitle || ''} ${input.assignmentInstruction || ''}`)
      .filter(word => !GENERIC_TOPIC_WORDS.has(word))
  );
}

function analyzeConversationQuality(input: EvaluateConversationInput) {
  const text = input.userMessages.join(' ').trim();
  const letters = text.replace(/[^a-zA-ZÀ-ỹ]/g, '');
  const vietnameseChars = (text.match(VIETNAMESE_DIACRITIC_RE) || []).length;
  const englishWords = tokenizeEnglish(text);
  const vietnameseRatio = letters.length > 0 ? vietnameseChars / letters.length : 0;
  const tooMuchVietnamese = vietnameseRatio >= 0.08 || (englishWords.length < Math.max(4, input.userMessages.length * 2) && vietnameseChars > 8);
  const keywords = topicKeywords(input);
  const relevantWordCount = keywords.size === 0
    ? englishWords.length
    : englishWords.filter(word => keywords.has(word)).length;
  const relevanceRatio = keywords.size === 0 ? 1 : relevantWordCount / Math.min(keywords.size, 6);
  const offTopic = keywords.size > 0 && relevanceRatio < 0.18 && englishWords.length >= 4;
  const languageUseScore = tooMuchVietnamese ? 45 : Math.min(100, 70 + englishWords.length * 2);
  const relevanceScore = offTopic ? 45 : Math.min(100, 65 + Math.round(relevanceRatio * 35));

  return {
    tooMuchVietnamese,
    offTopic,
    languageUseScore,
    relevanceScore,
  };
}

function applyQualityGate(evaluation: ConversationEvaluation, input: EvaluateConversationInput) {
  const quality = analyzeConversationQuality(input);
  let next: ConversationEvaluation = {
    ...evaluation,
    languageUseScore: Math.min(evaluation.languageUseScore ?? 100, quality.languageUseScore),
    relevanceScore: Math.min(evaluation.relevanceScore ?? 100, quality.relevanceScore),
    offTopic: evaluation.offTopic || quality.offTopic,
    tooMuchVietnamese: evaluation.tooMuchVietnamese || quality.tooMuchVietnamese,
  };

  const importantNotes = [...next.importantNotes];
  const improvements = [...next.improvements];

  if (quality.tooMuchVietnamese) {
    next = {
      ...next,
      overallScore: Math.min(next.overallScore, 55),
      taskScore: Math.min(next.taskScore, 55),
      fluencyScore: Math.min(next.fluencyScore, 60),
      vocabularyScore: Math.min(next.vocabularyScore, 55),
    };
    improvements.unshift('Bạn đã dùng quá nhiều tiếng Việt trong bài luyện nói tiếng Anh.');
    importantNotes.unshift('Ở bài speaking, hãy cố gắng trả lời bằng tiếng Anh. Nếu bí từ, dùng câu đơn giản thay vì chuyển sang tiếng Việt.');
  }

  if (quality.offTopic) {
    next = {
      ...next,
      overallScore: Math.min(next.overallScore, 58),
      taskScore: Math.min(next.taskScore, 50),
      coherenceScore: Math.min(next.coherenceScore, 58),
    };
    improvements.unshift('Nội dung trả lời chưa bám sát chủ đề hoặc nhiệm vụ được giao.');
    importantNotes.unshift(`Hãy giữ câu trả lời xoay quanh chủ đề "${input.topicTitle}" và yêu cầu của giáo viên.`);
  }

  if (quality.tooMuchVietnamese || quality.offTopic) {
    next.summary = 'Buổi luyện chưa đạt yêu cầu chính của nhiệm vụ. Bạn cần dùng tiếng Anh nhiều hơn và trả lời sát chủ đề được giao để được tính điểm cao.';
  }

  return {
    ...next,
    improvements: [...new Set(improvements)].slice(0, 5),
    importantNotes: [...new Set(importantNotes)].slice(0, 6),
  };
}

async function tryGroqEvaluation(prompt: string) {
  if (!process.env.GROQ_API_KEY) return null;

  const models = await getGroqModels();
  for (const model of models) {
    try {
      const response = await fetch(GROQ_CHAT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }),
      });

      const json = await response.json().catch(() => ({})) as GroqChatResponse;
      if (!response.ok) continue;

      const text = cleanJSONText(extractGroqText(json));
      return JSON.parse(text) as Partial<ConversationEvaluation>;
    } catch {
      continue;
    }
  }

  return null;
}

export async function evaluateConversation(input: EvaluateConversationInput): Promise<ConversationEvaluation> {
  const fallbackScore = heuristicEvaluation(input);
  const prompt = buildEvaluationPrompt(input);

  try {
    const groqEvaluation = await tryGroqEvaluation(prompt);
    if (groqEvaluation) return applyQualityGate(normalizeEvaluation(groqEvaluation, fallbackScore.overallScore), input);

    if (process.env.GEMINI_API_KEY && genAI) {
      const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        generationConfig: { temperature: 0.2 },
      });
      const result = await model.generateContent(prompt);
      const parsed = JSON.parse(cleanJSONText(result.response.text())) as Partial<ConversationEvaluation>;
      return applyQualityGate(normalizeEvaluation(parsed, fallbackScore.overallScore), input);
    }

    if (openai) {
      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      const resp = await openai.responses.create({ model, input: prompt }) as OpenAIResponseLike;
      const text = resp.output_text || resp.output?.[0]?.content?.[0]?.text || '';
      const parsed = JSON.parse(cleanJSONText(text)) as Partial<ConversationEvaluation>;
      return applyQualityGate(normalizeEvaluation(parsed, fallbackScore.overallScore), input);
    }
  } catch (err) {
    console.warn('Conversation evaluation fell back to heuristic scoring:', (err as Error).message);
  }

  return applyQualityGate(fallbackScore, input);
}
