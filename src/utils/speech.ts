/**
 * Web Speech API wrapper for voice trip prompts (Chrome/Edge, secure context).
 *
 * - `isSpeechSupported()` is false on Firefox/old browsers AND on insecure
 *   origins (mic needs HTTPS; localhost counts as secure) — the UI hides the
 *   voice button there so typing always remains.
 * - Interim transcripts stream via `onInterimText`; finals arrive via
 *   `onFinalText` and must be APPENDED (never replace typed text).
 * - Raw recognizer errors map to friendly `SpeechErrorKind` messages.
 */

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: { readonly transcript: string };
}

interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function isSpeechSupported(): boolean {
  if (typeof window === 'undefined') return false;
  // Mic capture requires a secure context (https or localhost). Without it
  // Chrome exposes no usable recognizer — hide the button (auto-hide rule).
  if (window.isSecureContext === false) return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export type SpeechErrorKind = 'denied' | 'no-speech' | 'unavailable';

export function speechErrorMessage(kind: SpeechErrorKind): string {
  if (kind === 'denied') return 'Microphone blocked — browser address bar se allow karo, ya type karo';
  if (kind === 'no-speech') return 'Sunai nahi diya, phir bolo';
  return 'Voice input unavailable right now — type karo';
}

function toErrorKind(raw: string): SpeechErrorKind | 'aborted' | null {
  if (raw === 'not-allowed' || raw === 'service-not-allowed') return 'denied';
  if (raw === 'no-speech') return 'no-speech';
  if (raw === 'audio-capture' || raw === 'network' || raw === 'not-supported') return 'unavailable';
  if (raw === 'aborted') return 'aborted';
  return null;
}

export interface SpeechEvents {
  onInterimText: (text: string) => void;
  onFinalText: (text: string) => void;
  onSpeechError: (kind: SpeechErrorKind) => void;
  onSpeechEnd: () => void;
}

/**
 * Start recognition (`en-IN`, interim on, continuous). Returns a stop
 * function, or null when unsupported (caller shows the fallback note).
 * Errors from `start()` (e.g. no mic) surface as `onSpeechError`.
 */
export function startListening(lang: string, events: SpeechEvents): (() => void) | null {
  const Ctor = typeof window === 'undefined' ? undefined : window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) return null;
  let recognition: SpeechRecognitionInstance;
  try {
    recognition = new Ctor();
  } catch {
    return null;
  }
  recognition.lang = lang;
  recognition.interimResults = true;
  recognition.continuous = true;
  recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      let text = '';
      for (let j = 0; j < result.length; j += 1) text += result[j].transcript;
      if (result.isFinal) {
        const clean = text.trim();
        if (clean) events.onFinalText(clean);
      } else {
        interim += text;
      }
    }
    events.onInterimText(interim.trim());
  };
  recognition.onerror = (event) => {
    const kind = toErrorKind(event.error);
    if (kind === 'aborted' || kind === null) return;
    events.onSpeechError(kind);
  };
  recognition.onend = () => events.onSpeechEnd();
  try {
    recognition.start();
  } catch {
    return null;
  }
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    try {
      recognition.stop();
    } catch {
      try {
        recognition.abort();
      } catch {
        /* already ended */
      }
    }
  };
}

/** Append a final transcript chunk to existing text (typed text survives). */
export function appendTranscript(base: string, chunk: string): string {
  const clean = chunk.trim();
  if (!clean) return base;
  if (!base.trim()) return clean;
  return `${base.replace(/\s+$/, '')} ${clean}`;
}

/** Textarea display value: base text + live interim suffix while listening. */
export function displayWithInterim(base: string, interim: string, listening: boolean): string {
  const suffix = listening ? interim.trim() : '';
  if (!suffix) return base;
  if (!base) return suffix;
  return `${base.replace(/\s+$/, '')} ${suffix}`;
}
