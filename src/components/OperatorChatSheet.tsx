import { useEffect, useRef, useState } from 'react';
import AppSheet from './Sheet';
import { formatChatTime, getTripChat, sendTripChatMessage } from '../api/operatorChat';
import type { OperatorChatMessage } from '../api/operatorChat';
import { ApiError } from '../api/client';

interface OperatorChatSheetProps {
  tripId: string;
  destinationLabel: string;
  onClose: () => void;
  onAuthFail: () => void;
}

const POLL_MS = 8000;

function mergeMessages(prev: OperatorChatMessage[], next: OperatorChatMessage[]): OperatorChatMessage[] {
  if (next.length === 0) return prev;
  const seen = new Set(prev.map((m) => `${m.id}::${m.text}`));
  const fresh = next.filter((m) => !seen.has(`${m.id}::${m.text}`));
  if (fresh.length === 0 && next.length === prev.length) return prev;
  const pending = prev.filter((m) => m.id.startsWith('local-') && !next.some((n) => n.text === m.text));
  return [...next, ...pending];
}

/** Chat sheet state + polling + send (mounted only from Itinerary). */
export default function OperatorChatSheet({ tripId, destinationLabel, onClose, onAuthFail }: OperatorChatSheetProps) {
  const [operatorName, setOperatorName] = useState<string | null>(null);
  const [messages, setMessages] = useState<OperatorChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const load = async (silent: boolean) => {
      if (cancelled) return;
      if (!silent) setLoading(true);
      try {
        const state = await getTripChat(tripId);
        if (cancelled) return;
        setOperatorName(state.operatorName);
        setMessages((prev) => mergeMessages(prev, state.messages));
        setError(null);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          onAuthFail();
          return;
        }
        if (!silent) setError(err instanceof Error ? err.message : 'Could not load messages.');
      } finally {
        if (!cancelled && !silent) setLoading(false);
      }
      if (!cancelled) timer = window.setTimeout(() => void load(true), POLL_MS);
    };
    void load(false);
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [tripId, onAuthFail]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const send = async () => {
    const clean = draft.trim();
    if (!clean || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const confirmed = await sendTripChatMessage(tripId, clean);
      setMessages((prev) => mergeMessages(prev, [confirmed]));
      setDraft('');
      const state = await getTripChat(tripId);
      setOperatorName(state.operatorName);
      setMessages((prev) => mergeMessages(prev, state.messages));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onAuthFail();
        return;
      }
      setSendError(err instanceof Error ? err.message : 'Could not send.');
    } finally {
      setSending(false);
    }
  };

  const retry = () => {
    setError(null);
    setLoading(true);
    void getTripChat(tripId).then(
      (state) => {
        setOperatorName(state.operatorName);
        setMessages(state.messages);
        setLoading(false);
      },
      (err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          onAuthFail();
          return;
        }
        setError(err instanceof Error ? err.message : 'Could not load messages.');
        setLoading(false);
      },
    );
  };

  return (
    <AppSheet label="Chat with operator" title="Chat with Operator" onClose={onClose}>
      <div className="flex max-h-[60vh] flex-col gap-3">
        <p className="text-[13px] text-tourflow-textMuted">{destinationLabel}</p>
        {loading ? (
          <p className="text-sm text-tourflow-textMuted" role="status">Loading conversation…</p>
        ) : error ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-xs font-semibold text-red-600">{error}</p>
            <button
              type="button"
              onClick={retry}
              className="mt-1.5 rounded-full bg-red-600 px-3 py-1 text-[11px] font-bold text-white"
            >
              Try Again
            </button>
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-tourflow-textMuted">No messages yet — say hello.</p>
        ) : (
          <div ref={scrollRef} className="flex max-h-[42vh] flex-col gap-2 overflow-y-auto" aria-live="polite">
            {messages.map((m) => (
              <div key={`${m.id}-${m.text}`} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[14px] shadow-soft ${m.mine ? 'rounded-br-md bg-tourflow-dark text-white' : 'rounded-bl-md border border-tourflow-cardBorder bg-white text-tourflow-dark'}`}>
                  {!m.mine ? (
                    <p className="text-[11px] font-bold uppercase tracking-wide text-tourflow-textMuted">
                      {m.sender === 'system' ? 'System' : operatorName ?? 'Operator'}
                    </p>
                  ) : null}
                  <p className="leading-relaxed">{m.text}</p>
                  {formatChatTime(m.createdAt) ? (
                    <p className={`mt-1 text-[10px] ${m.mine ? 'text-white/70' : 'text-tourflow-textMuted'}`}>
                      {formatChatTime(m.createdAt)}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
        {sendError ? <p role="alert" className="text-xs font-semibold text-red-600">{sendError}</p> : null}
        <div className="flex items-center gap-2">
          <input
            type="text"
            aria-label="Message your operator"
            value={draft}
            maxLength={2000}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void send();
            }}
            placeholder="Message your operator…"
            className="min-h-[44px] flex-1 rounded-full border border-tourflow-cardBorder px-4 text-[14px] outline-none"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending || !draft.trim()}
            className="min-h-[44px] rounded-full bg-tourflow-primary px-5 text-[14px] font-bold text-white disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </AppSheet>
  );
}



