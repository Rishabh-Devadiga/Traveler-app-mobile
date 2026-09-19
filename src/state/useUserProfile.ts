import { useCallback, useEffect, useState } from 'react';
import {
  PROFILE_STORAGE_KEY,
  loadProfile,
  removeStoredAvatar,
  saveProfilePatch,
  type ProfilePatch,
  type UserProfile,
} from '../api/profile';

/**
 * Reactive hook over the single-user profile store (`src/api/profile.ts`).
 * Loads the actual stored profile (never hardcoded), persists every change,
 * and stays in sync across tabs via the `storage` event.
 */
export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === PROFILE_STORAGE_KEY) setProfile(loadProfile());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const save = useCallback(async (patch: ProfilePatch): Promise<UserProfile> => {
    setSaving(true);
    setError(null);
    try {
      // Await a microtask so the loading state paints before the sync write.
      await Promise.resolve();
      const next = saveProfilePatch(patch);
      setProfile(next);
      return next;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save your profile. Please try again.';
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const removeAvatar = useCallback(async (): Promise<UserProfile> => {
    setSaving(true);
    setError(null);
    try {
      await Promise.resolve();
      const next = removeStoredAvatar();
      setProfile(next);
      return next;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not remove your photo. Please try again.';
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  return { profile, saving, error, save, removeAvatar, setError };
}
