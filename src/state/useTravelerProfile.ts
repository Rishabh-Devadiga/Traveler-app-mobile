import { useCallback, useEffect, useState } from 'react';
import { getTravelerProfile, type TravelerProfile } from '../api/traveler';
import { hasTravelerToken } from '../api/auth';
import { ApiError } from '../api/client';

/** Module-level cache so header, home and profile share one fetch. */
let cached: TravelerProfile | null = null;
let inflight: Promise<TravelerProfile> | null = null;

export function clearTravelerProfileCache(): void {
  cached = null;
  inflight = null;
}

/** Push a freshly PATCHed profile into the shared cache (header stays in sync). */
export function cacheTravelerProfile(profile: TravelerProfile): void {
  cached = profile;
}

function loadShared(): Promise<TravelerProfile> {
  if (!inflight) {
    inflight = getTravelerProfile().then(
      (profile) => {
        cached = profile;
        return profile;
      },
      (error: unknown) => {
        inflight = null;
        throw error;
      },
    );
  }
  return inflight;
}

/**
 * Backend traveler profile for header/pills/home. Returns null when logged
 * out (callers fall back to neutral labels — never hardcoded names).
 * A 401 clears the shared cache; routing to /login is the caller's job.
 */
export function useTravelerProfile() {
  const [profile, setProfile] = useState<TravelerProfile | null>(() => cached);
  const [loading, setLoading] = useState(() => cached === null && hasTravelerToken());
  const [authFailed, setAuthFailed] = useState(false);

  useEffect(() => {
    if (!hasTravelerToken()) {
      setProfile(null);
      setLoading(false);
      return;
    }
    if (cached) {
      setProfile(cached);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    loadShared().then(
      (p) => {
        if (!cancelled) {
          setProfile(p);
          setLoading(false);
        }
      },
      (error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          clearTravelerProfileCache();
          setProfile(null);
          setAuthFailed(true);
        }
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async (): Promise<TravelerProfile | null> => {
    if (!hasTravelerToken()) {
      setProfile(null);
      return null;
    }
    setLoading(true);
    try {
      inflight = null;
      const p = await loadShared();
      setProfile(p);
      return p;
    } catch {
      setProfile(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { profile, loading, authFailed, refresh };
}
