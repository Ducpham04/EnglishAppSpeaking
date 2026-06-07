'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SpeechStatus } from '@/lib/types';

// Type declarations for Web Speech API (not in default TS lib)
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

interface UseSpeechRecognitionReturn {
  transcript: string;
  interimTranscript: string;
  status: SpeechStatus;
  isSupported: boolean;
  startListening: (language?: string) => void;
  stopListening: () => void;
  resetTranscript: () => void;
  getCurrentTranscript: () => string;
  error: string | null;
}

function appendTranscript(previous: string, next: string) {
  const cleaned = next.trim();
  if (!cleaned) return previous;
  return previous ? `${previous.trim()} ${cleaned}` : cleaned;
}

function bestAlternative(result: SpeechRecognitionResult) {
  let best = result[0];
  for (let i = 1; i < result.length; i++) {
    if (result[i].confidence > best.confidence) best = result[i];
  }
  return best.transcript;
}

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isSupported] = useState(() => !!getSpeechRecognition());
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const statusRef = useRef(status);
  const shouldKeepListeningRef = useRef(false);
  const finalTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const startListening = useCallback((language = 'en-US') => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }

    setError(null);
    setTranscript('');
    setInterimTranscript('');
    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    shouldKeepListeningRef.current = true;

    const SpeechRecognitionAPI = getSpeechRecognition();
    if (!SpeechRecognitionAPI) {
      setError('Speech recognition is not supported in your browser. Please use Google Chrome.');
      setStatus('error');
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setStatus('listening');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript = appendTranscript(finalTranscript, bestAlternative(result));
        } else {
          interim = appendTranscript(interim, bestAlternative(result));
        }
      }

      if (finalTranscript) {
        finalTranscriptRef.current = appendTranscript(finalTranscriptRef.current, finalTranscript);
        setTranscript(finalTranscriptRef.current);
      }
      interimTranscriptRef.current = interim;
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed') {
        setError('Microphone access was denied. Please allow microphone access and try again.');
        shouldKeepListeningRef.current = false;
      } else if (event.error === 'no-speech') {
        setError(null);
      } else if (event.error === 'network') {
        setError('Network error occurred. Please check your connection.');
        shouldKeepListeningRef.current = false;
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
      if (!shouldKeepListeningRef.current) {
        setStatus('error');
      }
    };

    recognition.onend = () => {
      setInterimTranscript('');
      if (shouldKeepListeningRef.current) {
        try {
          recognition.start();
        } catch {
          setStatus('idle');
        }
      } else if (statusRef.current === 'listening') {
        setStatus('idle');
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    shouldKeepListeningRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setInterimTranscript('');
    setStatus('idle');
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
  }, []);

  const getCurrentTranscript = useCallback(() => {
    return (finalTranscriptRef.current.trim() || interimTranscriptRef.current.trim());
  }, []);

  return {
    transcript,
    interimTranscript,
    status,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    getCurrentTranscript,
    error,
  };
}
