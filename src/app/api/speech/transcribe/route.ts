import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

function normalizeLanguage(value: FormDataEntryValue | null) {
  if (value !== 'en' && value !== 'vi') return undefined;
  return value;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Speech engine chưa được cấu hình GROQ_API_KEY.' }, { status: 503 });
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const rateLimit = checkRateLimit({
      key: `speech:${ip}`,
      limit: Number(process.env.SPEECH_RATE_LIMIT_PER_IP_PER_HOUR || 60),
      windowMs: 60 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Bạn đã dùng nhận diện giọng nói quá nhiều trong thời gian ngắn.', resetAt: rateLimit.resetAt },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const audio = formData.get('audio');
    if (!(audio instanceof File)) {
      return NextResponse.json({ error: 'Thiếu file audio.' }, { status: 400 });
    }
    if (audio.size <= 0) {
      return NextResponse.json({ error: 'File audio rỗng.' }, { status: 400 });
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: 'Audio quá dài. Vui lòng nói ngắn hơn rồi thử lại.' }, { status: 413 });
    }

    const language = normalizeLanguage(formData.get('language'));
    const groqForm = new FormData();
    groqForm.append('file', audio, audio.name || 'speech.webm');
    groqForm.append('model', process.env.GROQ_STT_MODEL || 'whisper-large-v3-turbo');
    groqForm.append('response_format', 'json');
    if (language) groqForm.append('language', language);

    const response = await fetch(process.env.GROQ_STT_ENDPOINT || 'https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: groqForm,
    });

    const data = await response.json().catch(() => null) as { text?: string; error?: { message?: string } } | null;
    if (!response.ok) {
      logger.warn('Groq STT failed', {
        scope: 'api.speech.transcribe',
        status: response.status,
        error: data?.error?.message,
      });
      return NextResponse.json(
        { error: data?.error?.message || 'Không thể nhận diện giọng nói. Vui lòng thử lại.' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      text: (data?.text || '').trim(),
      provider: 'groq',
      model: process.env.GROQ_STT_MODEL || 'whisper-large-v3-turbo',
    });
  } catch (error) {
    logger.error('Speech transcription error', error, { scope: 'api.speech.transcribe' });
    return NextResponse.json({ error: 'Không thể xử lý audio.' }, { status: 500 });
  }
}
