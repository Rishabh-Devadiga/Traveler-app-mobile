/**
 * Traveler <-> Operator trip chat (frontend-only).
 *
 * SEPARATE from the AI Guide (src/api/guide.ts -> /api/guide/chat).
 * Nothing here imports Guide state; Guide never imports this module.
 *
 * Contract (traveler JWT via authGet/authPost; identity from JWT, the UI
 * never sends sender_id/sender_type):
 * - GET  /api/trips/{id}/chat   -> history + enabled flag (primary)
 * - POST /api/trips/{id}/chat   body { message } -> saved message (primary)
 * - Tolerated fallbacks: .../chat/history, .../chat/messages,
 *   /api/traveler/trips/{id}/chat. First 2xx wins.
 * - Disabled chat = enabled=false body or 403/404 -> normalized to
 *   disabled (never thrown) so the page shows a waiting state.
 */

import { ApiError, apiClient } from './client';

export type OperatorChatSender = 'traveler' | 'operator' | 'system';

export interface OperatorChatMessage {
  id: string;
  sender: OperatorChatSender;
  /** True when the row was sent by the logged-in traveler. */
  mine: boolean;
  text: string;
  /** Raw backend timestamp (may be null when omitted). */
  createdAt: string | null;
}

export interface TripChatState {
  /** Backend says the traveler<->operator conversation is open. */
  enabled: boolean;
  operatorName: string | null;
  messages: OperatorChatMessage[];
  /** Human reason when disabled (e.g. waiting for approval). */
  statusNote: string | null;
}

function tripChatPaths(tripId: string): string[] {
  const id = encodeURIComponent(tripId);
  return [
    `/api/trips/${id}/chat`,
    `/api/trips/${id}/chat/history`,
    `/api/trips/${id}/chat/messages`,
    `/api/traveler/trips/${id}/chat`,
  ];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function pickString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const raw = record[key];
    if (typeof raw === 'string' && raw.trim()) return raw;
    if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
  }
  return null;
}

function toSender(raw: unknown): OperatorChatSender {
  const text = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (text.includes('operator') || text.includes('agent') || text === 'assistant') return 'operator';
  if (text.includes('system')) return 'system';
  return 'traveler';
}

function toChatMessage(raw: unknown, index: number): OperatorChatMessage | null {
  const record = asRecord(raw);
  if (!record) return null;
  const text =
    pickString(record, ['message', 'text', 'body', 'content']) ??
    (typeof raw === 'string' && raw.trim() ? raw.trim() : null);
  if (!text) return null;
  const sender = toSender(record.sender_type ?? record.sender ?? record.role ?? record.from);
  const id = pickString(record, ['id', 'message_id', 'item_id']) ?? `chat-${index}`;
  return {
    id,
    sender,
    mine: sender === 'traveler',
    text,
    createdAt: pickString(record, ['created_at', 'createdAt', 'timestamp', 'sent_at']),
  };
}

function toMessageList(raw: unknown): OperatorChatMessage[] {
  const items = Array.isArray(raw) ? raw : [];
  const out: OperatorChatMessage[] = [];
  items.forEach((entry, index) => {
    const parsed = toChatMessage(entry, index);
    if (parsed) out.push(parsed);
  });
  return out;
}

function readEnabledFlag(body: Record<string, unknown>): boolean | null {
  const keys = ['enabled', 'chat_enabled', 'is_enabled', 'chatEnabled', 'isEnabled', 'open'];
  for (const key of keys) {
    if (typeof body[key] === 'boolean') return body[key] as boolean;
  }
  const nested = asRecord(body.chat) ?? asRecord(body.conversation);
  if (nested) {
    for (const key of keys) {
      if (typeof nested[key] === 'boolean') return nested[key] as boolean;
    }
  }
  return null;
}

function readOperatorName(body: Record<string, unknown>): string | null {
  const nested = asRecord(body.operator) ?? asRecord(body.chat) ?? asRecord(body.conversation);
  const direct = pickString(body, ['operator_name', 'operatorName', 'operator', 'agent_name']);
  if (direct) return direct;
  if (nested) return pickString(nested, ['name', 'operator_name', 'display_name', 'full_name']);
  return null;
}

function normalizeChatBody(body: unknown): TripChatState {
  const record = asRecord(body) ?? {};
  const nested = asRecord(record.chat) ?? asRecord(record.conversation);
  const rawMessages =
    record.messages ?? record.history ?? nested?.messages ?? (Array.isArray(body) ? body : []);
  const messages = toMessageList(rawMessages);
  const flag = readEnabledFlag(record);
  return {
    enabled: flag ?? messages.length > 0,
    operatorName: readOperatorName(record),
    messages,
    statusNote: pickString(record, ['status_note', 'message', 'detail', 'reason', 'status']),
  };
}

function isNotEnabledError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.status === 403 || error.status === 404 || error.status === 422) return true;
  const detail = typeof error.detail === 'string' ? error.detail.toLowerCase() : '';
  return detail.includes('not enabled') || detail.includes('not approved') || detail.includes('no chat');
}

/** GET the traveler<->operator conversation (disabled normalizes, never throws). */
export async function getTripChat(tripId: string): Promise<TripChatState> {
  let lastError: unknown = null;
  for (const path of tripChatPaths(tripId)) {
    try {
      return normalizeChatBody(await apiClient.authGet<unknown>(path));
    } catch (error) {
      if (isNotEnabledError(error)) {
        const note =
          error instanceof ApiError && typeof error.detail === 'string' && error.detail.trim()
            ? error.detail.trim()
            : null;
        return { enabled: false, operatorName: null, messages: [], statusNote: note };
      }
      lastError = error;
      if (error instanceof ApiError && (error.status === 401 || error.status === 0 || error.status >= 500)) {
        throw error;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Could not load the operator chat.');
}

/** POST a traveler reply — sends ONLY { message }; identity comes from JWT. */
export async function sendTripChatMessage(tripId: string, message: string): Promise<OperatorChatMessage> {
  const clean = message.trim();
  if (!clean) throw new Error('Type a message first.');
  if (clean.length > 2000) throw new Error('Messages are limited to 2000 characters.');
  let lastError: unknown = null;
  for (const path of tripChatPaths(tripId)) {
    try {
      const raw = await apiClient.authPost<unknown>(path, { message: clean });
      const record = asRecord(raw);
      const list = record ? (record.messages as unknown) : null;
      const echoed = Array.isArray(list) && list.length > 0 ? list[list.length - 1] : raw;
      const parsed = toChatMessage(echoed, 0);
      if (parsed && parsed.text) return { ...parsed, mine: true };
      return { id: `local-${Date.now()}`, sender: 'traveler', mine: true, text: clean, createdAt: null };
    } catch (error) {
      lastError = error;
      if (error instanceof ApiError && (error.status === 401 || error.status === 0 || error.status >= 500)) {
        throw error;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Could not send your message.');
}

/** Human-readable timestamp for a chat row; '' when the backend sent none. */
export function formatChatTime(createdAt: string | null): string {
  if (!createdAt) return '';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

