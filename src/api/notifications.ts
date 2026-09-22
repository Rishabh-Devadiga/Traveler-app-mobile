import { ApiError, apiClient } from './client';
import { safeText } from './traveler';

/**
 * Traveler notifications (Bearer JWT) — real backend data only, no mocks.
 *
 * Contract (base prefix /api, all 401 without a valid session):
 * - GET /api/traveler/notifications → { notifications, total, unread_count }
 * - GET /api/traveler/notifications/unread-count → { count }
 * - PATCH /api/traveler/notifications/{id}/read → updated notification
 * - POST /api/traveler/notifications/mark-all-read → { updated }
 * Rows the backend doesn't know (or not owned) 404 — never fabricated.
 */

export interface TravelerNotification {
  id: string;
  trip_id?: string | null;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationListResponse {
  notifications?: unknown;
  unread_count?: unknown;
}

function toNotification(raw: unknown): TravelerNotification | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const rawId = record.id;
  const id = typeof rawId === 'string' ? rawId : typeof rawId === 'number' ? String(rawId) : null;
  if (!id) return null;
  const rawTrip = record.trip_id;
  return {
    id,
    trip_id: typeof rawTrip === 'string' && rawTrip.trim() ? rawTrip : null,
    title: safeText(record.title).trim() || 'Update',
    message: safeText(record.message).trim(),
    type: safeText(record.type).trim() || 'info',
    is_read: record.is_read === true,
    created_at: safeText(record.created_at),
  };
}

/** GET /api/traveler/notifications — newest first, with the unread count. */
export async function listNotifications(): Promise<{ items: TravelerNotification[]; unread: number }> {
  const data = await apiClient.authGet<unknown>('/api/traveler/notifications');
  const body = (data ?? {}) as NotificationListResponse;
  const rawList = Array.isArray(body.notifications) ? body.notifications : [];
  const items: TravelerNotification[] = [];
  for (const raw of rawList) {
    const parsed = toNotification(raw);
    if (parsed) items.push(parsed);
  }
  const unread =
    typeof body.unread_count === 'number' && Number.isFinite(body.unread_count)
      ? body.unread_count
      : items.filter((item) => !item.is_read).length;
  return { items, unread };
}

/** GET /api/traveler/notifications/unread-count — light badge poll. */
export async function getUnreadCount(): Promise<number> {
  const data = await apiClient.authGet<unknown>('/api/traveler/notifications/unread-count');
  const count = (data as { count?: unknown })?.count;
  return typeof count === 'number' && Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0;
}

/** PATCH …/{id}/read — marks one owned notification read (404 unless owned). */
export async function markNotificationRead(id: string): Promise<TravelerNotification | null> {
  const data = await apiClient.authPatch<unknown>(
    `/api/traveler/notifications/${encodeURIComponent(id)}/read`,
    {},
  );
  return toNotification(data);
}

/** POST …/mark-all-read — returns how many rows flipped. */
export async function markAllNotificationsRead(): Promise<number> {
  const data = await apiClient.authPost<unknown>('/api/traveler/notifications/mark-all-read', {});
  const updated = (data as { updated?: unknown })?.updated;
  return typeof updated === 'number' && Number.isFinite(updated) ? updated : 0;
}

/** True for expired/invalid-session responses — callers clear the token and route to /login. */
export function isNotificationAuthError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}
