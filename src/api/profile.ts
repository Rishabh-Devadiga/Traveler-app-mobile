/**
 * TourFlow Profile store — the persistence layer behind the Profile page.
 *
 * Inspection summary (required before creating anything new):
 * 1. User/profile APIs: NONE exist. `src/api/` only wraps trip endpoints
 *    (`POST /api/trips`, `GET /api/trips/{id}`, `GET /api/possible-options`).
 *    There is no `/api/users`, `/api/profile`, or avatar endpoint.
 * 2. Auth/session system: NONE exists. The trip endpoints used by this app are
 *    open (only `Depends(get_db)` — no JWT, see `src/api/trips.ts`), and the
 *    app is a single-user frontend (Phase 1: "mock data only").
 * 3. File/image upload: NONE exists anywhere in the app or its API layer.
 *
 * Therefore — per the "smallest appropriate mechanism consistent with the
 * existing project" rule — this module implements a single-user profile store
 * backed by `localStorage` (synchronous, survives refresh, scoped to the
 * device's own user so a user can only ever modify their own profile):
 *
 * - `tourflow.profile.v1`: `{ name, phone, email, phoneVerified,
 *   emailVerified, avatarDataUrl | null, travelPreferences, language,
 *   currency, settings, updatedAt }` — ONE key, no competing stores.
 *   Older stored records (name/phone/email/avatar only) are migrated forward
 *   with defaults on load, never wiped.
 * - Seeded ONCE from the existing mock defaults in `src/mocks/traveler.ts`
 *   (the app's single source of default user data — no duplicate seed copy).
 * - A changed phone/email is stored with `verified: false` (never
 *   auto-re-verified; there is no verification endpoint to confirm against).
 * - A removed avatar is stored as `avatarDataUrl: null` so refresh keeps
 *   showing the default avatar; other fields are untouched.
 * - Storage failures (private mode, quota) surface as thrown `ProfileError`
 *   so the UI shows an error state instead of a false success.
 */

import { travelerUser } from '../mocks/traveler';
import {
  DEFAULT_CURRENCY_CODE,
  DEFAULT_LANGUAGE_ID,
  DEFAULT_PREFERENCE_IDS,
  isKnownCurrencyCode,
  isKnownLanguageId,
  isKnownPreferenceId,
} from '../data/profileOptions';

export interface NotificationSettings {
  tripUpdates: boolean;
  bookingUpdates: boolean;
  promotionalUpdates: boolean;
}

export interface ProfileSettings {
  notifications: NotificationSettings;
  /** Local-only until a real backend/auth system exists. */
  profileVisibility: 'private' | 'public';
  /** Local-only toggle: queues the profile for server sync once sync exists. */
  syncProfile: boolean;
}

export interface UserProfile {
  name: string;
  phone: string;
  email: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  /** Persistent downscaled `data:` URL, or null for the default avatar. */
  avatarDataUrl: string | null;
  /** Selected preference option ids (see `src/data/profileOptions.ts`). */
  travelPreferences: string[];
  /** Selected language id (see `SUPPORTED_LANGUAGES`). */
  language: string;
  /** Selected ISO currency code (preference only — no conversions). */
  currency: string;
  settings: ProfileSettings;
  updatedAt: string;
}

export type ProfilePatch = Partial<
  Pick<
    UserProfile,
    'name' | 'phone' | 'email' | 'avatarDataUrl' | 'travelPreferences' | 'language' | 'currency' | 'settings'
  >
>;

export class ProfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProfileError';
  }
}

export const PROFILE_STORAGE_KEY = 'tourflow.profile.v1';

const DEFAULT_SETTINGS: ProfileSettings = {
  notifications: { tripUpdates: true, bookingUpdates: true, promotionalUpdates: false },
  profileVisibility: 'private',
  syncProfile: true,
};

function defaultProfile(): UserProfile {
  return {
    name: travelerUser.name,
    phone: travelerUser.phone,
    email: travelerUser.email,
    phoneVerified: true,
    emailVerified: true,
    avatarDataUrl: null,
    travelPreferences: [...DEFAULT_PREFERENCE_IDS],
    language: DEFAULT_LANGUAGE_ID,
    currency: DEFAULT_CURRENCY_CODE,
    settings: { ...DEFAULT_SETTINGS, notifications: { ...DEFAULT_SETTINGS.notifications } },
    updatedAt: new Date().toISOString(),
  };
}

/** Forward-migrate records stored before newer fields existed. */
function migrateStoredProfile(p: Record<string, unknown>): UserProfile {
  const defaults = defaultProfile();
  const prefs = Array.isArray(p.travelPreferences)
    ? (p.travelPreferences as unknown[]).filter((id): id is string => typeof id === 'string' && isKnownPreferenceId(id))
    : defaults.travelPreferences;
  const language = typeof p.language === 'string' && isKnownLanguageId(p.language) ? p.language : defaults.language;
  const currency = typeof p.currency === 'string' && isKnownCurrencyCode(p.currency) ? p.currency : defaults.currency;
  const rawSettings = (p.settings ?? {}) as Partial<ProfileSettings>;
  const rawNotifications = (rawSettings.notifications ?? {}) as Partial<NotificationSettings>;
  return {
    name: p.name as string,
    phone: p.phone as string,
    email: p.email as string,
    phoneVerified: p.phoneVerified as boolean,
    emailVerified: p.emailVerified as boolean,
    avatarDataUrl: (p.avatarDataUrl as string | null) ?? null,
    travelPreferences: prefs,
    language,
    currency,
    settings: {
      notifications: {
        tripUpdates: typeof rawNotifications.tripUpdates === 'boolean' ? rawNotifications.tripUpdates : true,
        bookingUpdates: typeof rawNotifications.bookingUpdates === 'boolean' ? rawNotifications.bookingUpdates : true,
        promotionalUpdates: typeof rawNotifications.promotionalUpdates === 'boolean' ? rawNotifications.promotionalUpdates : false,
      },
      profileVisibility: rawSettings.profileVisibility === 'public' ? 'public' : 'private',
      syncProfile: typeof rawSettings.syncProfile === 'boolean' ? rawSettings.syncProfile : true,
    },
    updatedAt: typeof p.updatedAt === 'string' ? (p.updatedAt as string) : defaults.updatedAt,
  };
}

function isValidStoredProfile(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.name === 'string' &&
    typeof p.phone === 'string' &&
    typeof p.email === 'string' &&
    typeof p.phoneVerified === 'boolean' &&
    typeof p.emailVerified === 'boolean' &&
    (typeof p.avatarDataUrl === 'string' || p.avatarDataUrl === null)
  );
}

function readStorage(): UserProfile | null {
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidStoredProfile(parsed)) return null;
    return migrateStoredProfile(parsed);
  } catch {
    return null; // Corrupt JSON or unavailable storage → fall back to defaults.
  }
}

function writeStorage(profile: UserProfile): void {
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (error) {
    if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      throw new ProfileError('Profile photo is too large to save on this device. Try a smaller image.');
    }
    throw new ProfileError('Could not save your profile on this device. Please try again.');
  }
}

/** Load the authenticated (single-device) user's profile; seeds from mock defaults on first run. */
export function loadProfile(): UserProfile {
  const stored = readStorage();
  if (stored) return stored;
  const seeded = defaultProfile();
  // Best-effort seed so a refresh always finds the profile; a seed failure
  // still returns the defaults for this session (persistence retries on save).
  try {
    writeStorage(seeded);
  } catch {
    /* handled on next save */
  }
  return seeded;
}

function applyPatch(current: UserProfile, patch: ProfilePatch): UserProfile {
  const next: UserProfile = { ...current };
  if (patch.name !== undefined) next.name = patch.name;
  if (patch.phone !== undefined) {
    next.phone = patch.phone;
    // No verification endpoint exists: a changed number loses its badge.
    if (patch.phone !== current.phone) next.phoneVerified = false;
  }
  if (patch.email !== undefined) {
    next.email = patch.email;
    if (patch.email !== current.email) next.emailVerified = false;
  }
  if (patch.avatarDataUrl !== undefined) next.avatarDataUrl = patch.avatarDataUrl;
  if (patch.travelPreferences !== undefined) {
    next.travelPreferences = patch.travelPreferences.filter(isKnownPreferenceId);
  }
  if (patch.language !== undefined && isKnownLanguageId(patch.language)) next.language = patch.language;
  if (patch.currency !== undefined && isKnownCurrencyCode(patch.currency)) next.currency = patch.currency;
  if (patch.settings !== undefined) {
    next.settings = {
      notifications: { ...patch.settings.notifications },
      profileVisibility: patch.settings.profileVisibility,
      syncProfile: patch.settings.syncProfile,
    };
  }
  next.updatedAt = new Date().toISOString();
  return next;
}

/**
 * Persist a profile patch for the current user and return the updated profile.
 * Throws ProfileError when the write fails — callers must NOT update the UI
 * as if the save succeeded in that case.
 */
export function saveProfilePatch(patch: ProfilePatch): UserProfile {
  const current = loadProfile();
  const next = applyPatch(current, patch);
  writeStorage(next);
  return next;
}

/** Remove only the stored avatar (all other profile data is preserved). */
export function removeStoredAvatar(): UserProfile {
  return saveProfilePatch({ avatarDataUrl: null });
}
