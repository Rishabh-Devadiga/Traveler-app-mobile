import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ProfileInfoCard, ProfileMenuCard } from '../components/content';
import AppSheet from '../components/Sheet';
import { EditIcon } from '../components/icons';
import { travelerUser } from '../mocks/traveler';
import { hasTravelerToken, isUnauthorized, travelerLogout } from '../api/auth';
import {
  avatarUrlFor,
  bumpAvatarVersion,
  deleteTravelerAvatar,
  dietaryDisplay,
  getTravelerProfile,
  logAvatarEndpoints,
  patchTravelerProfile,
  profileInitial,
  safeText,
  uploadTravelerAvatar,
  type TravelerProfile,
  type TravelerProfilePatch,
} from '../api/traveler';
import {
  applyServerTrip,
  fetchPersistedTrip,
  listTravelerTrips,
  seedDraftFromTrip,
  travelerTripName,
  writeActiveTripId,
  type TravelerTripSummary,
} from '../api/trips';
import { cacheTravelerProfile, clearTravelerProfileCache } from '../state/useTravelerProfile';
import { useTripDraft } from '../state/useTripDraft';
import { validateName, validatePhone } from '../utils/profileValidation';
import { SUPPORTED_CURRENCIES, SUPPORTED_LANGUAGES } from '../data/profileOptions';
import { getSupportConfig } from '../config';
import { tripDateRangeLabel } from '../utils/dates';
import type { ProfileInfoRow, ProfileMenuItem } from '../types';

type TextField = 'full_name' | 'phone' | 'bio' | 'travel_style' | 'dietary_preferences' | 'fitness_level';
type MenuSheet = 'lang' | 'currency' | 'help' | 'about' | null;
type PhotoSheet = 'actions' | 'preview' | null;

const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // 5 MB client pre-check (backend enforces too)

const TEXT_META: Record<TextField, { title: string; inputLabel: string; multiline?: boolean }> = {
  full_name: { title: 'Edit name', inputLabel: 'Full name' },
  phone: { title: 'Edit phone', inputLabel: 'Phone number' },
  bio: { title: 'Edit bio', inputLabel: 'Bio', multiline: true },
  travel_style: { title: 'Edit travel style', inputLabel: 'Travel style' },
  dietary_preferences: { title: 'Edit dietary preferences', inputLabel: 'Dietary preferences' },
  fitness_level: { title: 'Edit fitness level', inputLabel: 'Fitness level' },
};

function validateTextField(field: TextField, value: string): string | null {
  if (field === 'full_name') return validateName(value);
  if (field === 'phone') return validatePhone(value);
  if (value.length > 500) return 'Keep it under 500 characters.';
  return null;
}

/** Shared mobile bottom-sheet shell — same chrome for every Profile sheet (premium). */
function Sheet({ label, title, subtitle, onClose, children }: { label: string; title?: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <AppSheet label={label} title={title} subtitle={subtitle} onClose={onClose}>
      <div className="sheet-enter">{children}</div>
    </AppSheet>
  );
}

function displayOrNotSet(value: unknown): string {
  const trimmed = safeText(value).trim();
  return trimmed ? trimmed : 'Not set';
}

function languageDisplay(raw: unknown): string {
  const text = safeText(raw).trim();
  if (!text) return 'Not set';
  const found = SUPPORTED_LANGUAGES.find(
    (o) => o.id.toLowerCase() === text.toLowerCase() || o.label.toLowerCase() === text.toLowerCase(),
  );
  return found ? found.label : text;
}

function currencyDisplay(raw: unknown): string {
  const text = safeText(raw).trim();
  if (!text) return 'Not set';
  const found = SUPPORTED_CURRENCIES.find((o) => o.code.toLowerCase() === text.toLowerCase());
  return found ? `${found.name} (${found.code} ${found.symbol})` : text;
}

function tripSubtitle(trip: TravelerTripSummary): string {
  const destRaw = typeof trip.destination === 'string' ? trip.destination : trip.destination?.name;
  const dest = safeText(destRaw).trim() || safeText(trip.destination_name).trim();
  const start = safeText(trip.start_date).slice(0, 10);
  const end = safeText(trip.end_date).slice(0, 10);
  const dates = start && end ? tripDateRangeLabel(start, end) : '';
  return [dest, dates, safeText(trip.status)].filter(Boolean).join(' · ');
}

/**
 * Profile tab — fully backend-driven (Bearer JWT, no mock user data).
 * Without a token the tab routes to /login.
 */
export default function Profile() {
  const navigate = useNavigate();
  const { updateDraft } = useTripDraft();
  const authed = hasTravelerToken();
  const [profile, setProfile] = useState<TravelerProfile | null>(null);
  const [trips, setTrips] = useState<TravelerTripSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadKey, setLoadKey] = useState(0);
  const [toast, setToast] = useState('');
  const [editingField, setEditingField] = useState<TextField | null>(null);
  const [draft, setDraft] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [menuSheet, setMenuSheet] = useState<MenuSheet>(null);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [photoSheet, setPhotoSheet] = useState<PhotoSheet>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  // Optimistic photo: the just-uploaded image shows instantly (before the
  // reload confirms has_avatar), then swaps to the server URL. Revoked once
  // the server image takes over — never while displayed.
  const [optimisticUrl, setOptimisticUrl] = useState<string | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [openingTrip, setOpeningTrip] = useState<string | null>(null);
  const support = useMemo(() => getSupportConfig(), []);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2500);
  };

  const logout = () => {
    travelerLogout();
    clearTravelerProfileCache();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    Promise.all([getTravelerProfile(), listTravelerTrips()]).then(
      ([p, t]) => {
        if (cancelled) return;
        setProfile(p);
        cacheTravelerProfile(p);
        setTrips(t);
        setLoading(false);
      },
      (error: unknown) => {
        if (cancelled) return;
        if (isUnauthorized(error)) {
          travelerLogout();
          clearTravelerProfileCache();
          navigate('/login', { replace: true, state: { from: '/profile' } });
          return;
        }
        setLoadError(error instanceof Error ? error.message : 'Could not load your profile.');
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, loadKey]);

  // A new profile (or fresh avatar URL) gets a clean <img> attempt.
  useEffect(() => {
    setImgFailed(false);
  }, [profile?.id, profile?.has_avatar]);

  // Server image confirmed → drop the optimistic one (revoke AFTER swap).
  // Diagnostic: has_avatar without a usable id can never render — log it
  // so the Network tab + console tell the exact story.
  useEffect(() => {
    if (!profile) return;
    const src = avatarUrlFor(profile);
    if (profile.has_avatar === true && !src) {
      console.warn('[avatar] has_avatar=true but no usable user id — showing initial', {
        id: (profile as { id?: unknown }).id ?? '(missing)',
      });
    }
    if (src && optimisticUrl) {
      URL.revokeObjectURL(optimisticUrl);
      setOptimisticUrl(null);
    }
  }, [profile, optimisticUrl]);

  if (!authed) {
    return <Navigate to="/login" replace state={{ from: '/profile' }} />;
  }

  // Loading always shows a spinner (never blank). A failed load shows the
  // error + Retry in the same place — reachable whether or not `loading`
  // already flipped, so the page can never go blank.
  if (loading && !profile) {
    return (
      <div className="flex flex-col gap-4" aria-label="Loading profile">
        <div className="flex gap-1 p-1" aria-label="Loading">
          <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-1" />
          <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-2" />
          <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-3" />
        </div>
        <p className="text-xs text-tourflow-textMuted">Loading your profile…</p>
      </div>
    );
  }

  if (loadError && !profile) {
    return (
      <div className="flex flex-col gap-4" aria-label="Profile load error">
        <div role="alert" className="rounded-2xl border border-red-200 bg-white p-4 shadow-card">
          <p className="text-sm font-bold text-red-700">Couldn’t load your profile</p>
          <p className="mt-1 text-xs text-tourflow-textMuted">{loadError}</p>
          <button
            type="button"
            onClick={() => setLoadKey((k) => k + 1)}
            className="mt-3 w-full rounded-full bg-tourflow-primary px-3 py-2 text-xs font-bold text-white"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Every field below is optional-chained with a "Not set" fallback, so a
  // null profile (e.g. load failed after a previous success cleared it)
  // still renders a safe page instead of crashing on field access.
  const fullName = displayOrNotSet(profile?.full_name);
  const email = displayOrNotSet(profile?.email);
  const initial = profile ? profileInitial(profile) : '?';

  const rows: ProfileInfoRow[] = [
    { id: 'full_name', label: 'Name', value: fullName },
    { id: 'phone', label: 'Phone', value: displayOrNotSet(profile?.phone) },
    { id: 'email', label: 'Email', value: email },
  ];

  const prefItems: ProfileMenuItem[] = [
    { id: 'bio', title: 'Bio', subtitle: displayOrNotSet(profile?.bio), icon: 'edit_note' },
    { id: 'travel_style', title: 'Travel Style', subtitle: displayOrNotSet(profile?.travel_style), icon: 'tune' },
    { id: 'dietary_preferences', title: 'Dietary Preferences', subtitle: displayOrNotSet(dietaryDisplay(profile?.dietary_preferences)), icon: 'restaurant' },
    { id: 'fitness_level', title: 'Fitness Level', subtitle: displayOrNotSet(profile?.fitness_level), icon: 'fitness_center' },
    { id: 'lang', title: 'Language', subtitle: languageDisplay(profile?.language), icon: 'language' },
    { id: 'currency', title: 'Currency', subtitle: currencyDisplay(profile?.preferred_currency), icon: 'currency_rupee' },
  ];

  const tripItems: ProfileMenuItem[] = trips.map((t) => ({
    id: t.id,
    title: travelerTripName(t),
    subtitle: tripSubtitle(t) || 'Tap to open',
    icon: 'map',
  }));

  const supportItems: ProfileMenuItem[] = [
    { id: 'help', title: 'Help & Support', subtitle: 'Concierge and trip help', icon: 'support_agent' },
    {
      id: 'about',
      title: 'About WanderAI',
      subtitle: `${travelerUser.appVersion} (${travelerUser.build})`,
      icon: 'info',
    },
  ];

  const openEditor = (id: string) => {
    if (!profile) return;
    if (id === 'email') {
      showToast('Contact support to change your email.');
      return;
    }
    if (id !== 'full_name' && id !== 'phone') return;
    setDraft(id === 'full_name' ? profile.full_name : (profile.phone ?? ''));
    setFieldError(null);
    setEditingField(id);
  };

  const openPrefEditor = (id: string) => {
    if (!profile) return;
    if (id === 'lang' || id === 'currency' || id === 'help' || id === 'about') {
      setMenuError(null);
      setMenuSheet(id);
      return;
    }
    if (id !== 'bio' && id !== 'travel_style' && id !== 'dietary_preferences' && id !== 'fitness_level') return;
    setDraft(profile[id] ?? '');
    setFieldError(null);
    setEditingField(id);
  };

  const closeEditor = () => {
    if (saving) return;
    setEditingField(null);
    setFieldError(null);
  };

  const handleFieldSave = async () => {
    if (!editingField || saving || !profile) return;
    const trimmed = draft.trim();
    const validationError = validateTextField(editingField, trimmed);
    if (validationError) {
      setFieldError(validationError);
      return;
    }
    // No-op edits don't hit the backend.
    const current = editingField === 'full_name' ? profile.full_name : (profile[editingField] ?? '');
    if (trimmed === (current ?? '').trim()) {
      setEditingField(null);
      return;
    }
    setFieldError(null);
    setSaving(true);
    try {
      const patch: TravelerProfilePatch = { [editingField]: trimmed };
      const updated = await patchTravelerProfile(patch);
      setProfile(updated);
      cacheTravelerProfile(updated);
      setEditingField(null);
      showToast('Profile updated.');
    } catch (err) {
      if (isUnauthorized(err)) {
        logout();
        return;
      }
      setFieldError(err instanceof Error ? err.message : 'Could not save your changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLanguageSelect = async (id: string) => {
    if (saving || !profile || id === profile.language) return;
    setMenuError(null);
    setSaving(true);
    try {
      const updated = await patchTravelerProfile({ language: id });
      setProfile(updated);
      cacheTravelerProfile(updated);
      showToast('Language updated.');
    } catch (err) {
      if (isUnauthorized(err)) {
        logout();
        return;
      }
      setMenuError(err instanceof Error ? err.message : 'Could not save your language. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCurrencySelect = async (code: string) => {
    if (saving || !profile || code === profile.preferred_currency) return;
    setMenuError(null);
    setSaving(true);
    try {
      const updated = await patchTravelerProfile({ preferred_currency: code });
      setProfile(updated);
      cacheTravelerProfile(updated);
      showToast('Currency updated.');
    } catch (err) {
      if (isUnauthorized(err)) {
        logout();
        return;
      }
      setMenuError(err instanceof Error ? err.message : 'Could not save your currency. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const closeMenuSheet = () => {
    if (saving) return;
    setMenuSheet(null);
    setMenuError(null);
  };

  const handleOpenTrip = async (tripId: string) => {
    if (openingTrip) return;
    setOpeningTrip(tripId);
    try {
      // Owned snapshot first (404 unless owned); legacy snapshot-less rows
      // fall back to the canonical trip read — same backend record either way.
      const trip = await fetchPersistedTrip(tripId);
      const seed = seedDraftFromTrip(trip);
      writeActiveTripId(trip.id);
      updateDraft({ ...seed, ...applyServerTrip(trip, seed) });
      navigate('/itinerary');
    } catch (err) {
      if (isUnauthorized(err)) {
        logout();
        return;
      }
      showToast(err instanceof Error ? err.message : 'Could not open that trip.');
    } finally {
      setOpeningTrip(null);
    }
  };

  const meta = editingField ? TEXT_META[editingField] : null;

  const avatarSrc = profile ? avatarUrlFor(profile) : null;
  // Server image wins; optimistic (just-uploaded) photo covers the gap until
  // the reload confirms has_avatar; initial circle is the last resort.
  // <img> onError always falls back to initial — verified on both slots.
  const displaySrc = avatarSrc && !imgFailed ? avatarSrc : optimisticUrl;
  const showAvatarImg = !!displaySrc;

  const reloadProfile = async (): Promise<TravelerProfile> => {
    const updated = await getTravelerProfile();
    setProfile(updated);
    cacheTravelerProfile(updated);
    return updated;
  };

  const closePhotoSheet = () => {
    if (photoBusy) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewFile(null);
    setPhotoError(null);
    setPhotoSheet(null);
    if (galleryRef.current) galleryRef.current.value = '';
    if (cameraRef.current) cameraRef.current.value = '';
  };

  const handleFileSelected = (file: File | undefined) => {
    if (!file) return;
    // Client pre-checks (backend enforces the same): image type + 5 MB.
    if (!file.type.startsWith('image/')) {
      setPhotoError('Only image uploads are allowed. Please choose a photo file.');
      setPhotoSheet('actions');
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setPhotoError('Photo must be at most 5 MB. Please choose a smaller image.');
      setPhotoSheet('actions');
      return;
    }
    setPhotoError(null);
    setPreviewFile(file);
    setPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(file);
    });
    setPhotoSheet('preview');
  };

  const handlePhotoUpload = async () => {
    if (!previewFile || photoBusy) return;
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      await uploadTravelerAvatar(previewFile);
      bumpAvatarVersion();
      const fresh = await reloadProfile();
      logAvatarEndpoints('upload', avatarUrlFor(fresh));
      // Instant photo: hand the preview URL to the optimistic slot instead
      // of revoking it — the server image swaps in once confirmed above.
      const kept = previewUrl;
      setPreviewUrl(null);
      setPreviewFile(null);
      setPhotoError(null);
      setPhotoSheet(null);
      if (galleryRef.current) galleryRef.current.value = '';
      if (cameraRef.current) cameraRef.current.value = '';
      if (kept) setOptimisticUrl(kept);
      showToast('Profile photo updated.');
    } catch (err) {
      if (isUnauthorized(err)) {
        logout();
        return;
      }
      // 422 (and friends): exact backend message, sheet stays open.
      setPhotoError(err instanceof Error ? err.message : 'Could not upload your photo. Please try again.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const handlePhotoRemove = async () => {
    if (photoBusy) return;
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      await deleteTravelerAvatar();
      bumpAvatarVersion();
      setOptimisticUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      const freshAfterRemove = await reloadProfile();
      logAvatarEndpoints('remove', avatarUrlFor(freshAfterRemove));
      closePhotoSheet();
      showToast('Profile photo removed.');
    } catch (err) {
      if (isUnauthorized(err)) {
        logout();
        return;
      }
      setPhotoError(err instanceof Error ? err.message : 'Could not remove your photo. Please try again.');
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <section className="flex items-center gap-4 rounded-3xl border border-tourflow-cardBorder bg-white p-5 shadow-card">
        <button
          type="button"
          onClick={() => {
            setPhotoError(null);
            setPhotoSheet('actions');
          }}
          aria-label="Change profile photo"
          className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-tourflow-primary"
        >
          {showAvatarImg ? (
            <img
              src={displaySrc}
              alt={`${fullName} profile photo`}
              onError={() => {
                if (optimisticUrl && displaySrc === optimisticUrl) {
                  URL.revokeObjectURL(optimisticUrl);
                  setOptimisticUrl(null);
                } else {
                  setImgFailed(true);
                }
              }}
              className="h-[72px] w-[72px] rounded-full border-2 border-tourflow-primary object-cover"
            />
          ) : (
            <div
              role="img"
              aria-label={`${fullName} profile avatar`}
              className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 border-tourflow-primary bg-tourflow-primarySoft text-2xl font-extrabold text-tourflow-primary"
            >
              {initial}
            </div>
          )}
          <span
            aria-hidden="true"
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-tourflow-primary text-white"
          >
            <EditIcon size={14} />
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[18px] font-extrabold">{fullName}</h2>
          <p className="truncate text-[13px] text-tourflow-textMuted">{email}</p>
          <p className="mt-1 inline-block rounded-full bg-tourflow-primarySoft px-2 py-0.5 text-[11px] font-bold text-tourflow-primary">
            {trips.length === 1 ? '1 trip' : `${trips.length} trips`}
          </p>
        </div>
      </section>

      <ProfileInfoCard rows={rows} onEdit={openEditor} />
      <ProfileMenuCard title="Travel Profile" items={prefItems} onSelect={openPrefEditor} />
      {tripItems.length > 0 ? (
        <ProfileMenuCard title={`My Trips · ${trips.length}`} items={tripItems} onSelect={(id) => void handleOpenTrip(id)} />
      ) : (
        <section aria-label="My Trips" className="rounded-2xl border border-tourflow-cardBorder bg-white shadow-soft">
          <h3 className="border-b border-tourflow-cardBorder px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-tourflow-textMuted">
            My Trips · 0
          </h3>
          <p className="px-4 py-3 text-xs text-tourflow-textMuted">No trips yet — plan a journey to create your first one.</p>
        </section>
      )}
      {openingTrip ? (
        <p role="status" className="text-center text-xs font-semibold text-tourflow-textMuted">Opening your trip…</p>
      ) : null}
      <ProfileMenuCard title="Support & About" items={supportItems} onSelect={openPrefEditor} />

      <button
        type="button"
        onClick={logout}
        className="w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50"
      >
        Log out
      </button>

      {/* Text-field edit bottom sheet (name/phone/bio/preferences) */}
      {editingField && meta ? (
        <Sheet label={meta.title} onClose={closeEditor}>
          <h3 className="text-base font-extrabold text-tourflow-dark">{meta.title}</h3>
          <label htmlFor="profile-field-input" className="mt-3 block text-xs font-bold uppercase tracking-wide text-tourflow-textMuted">
            {meta.inputLabel}
          </label>
          {meta.multiline ? (
            <textarea
              id="profile-field-input"
              rows={4}
              value={draft}
              disabled={saving}
              onChange={(event) => {
                setDraft(event.target.value);
                if (fieldError) setFieldError(null);
              }}
              className="mt-1.5 w-full rounded-xl border border-tourflow-cardBorder px-3 py-2.5 text-sm font-semibold text-tourflow-dark outline-none focus:border-tourflow-primary disabled:opacity-60"
            />
          ) : (
            <input
              id="profile-field-input"
              type="text"
              autoComplete="off"
              value={draft}
              disabled={saving}
              onChange={(event) => {
                setDraft(event.target.value);
                if (fieldError) setFieldError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleFieldSave();
              }}
              className="mt-1.5 w-full rounded-xl border border-tourflow-cardBorder px-3 py-2.5 text-sm font-semibold text-tourflow-dark outline-none focus:border-tourflow-primary disabled:opacity-60"
            />
          )}
          {fieldError ? (
            <p role="alert" className="mt-2 text-xs font-semibold text-red-600">
              {fieldError}
            </p>
          ) : null}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={closeEditor}
              disabled={saving}
              className="flex-1 rounded-xl border border-tourflow-cardBorder bg-white px-4 py-2.5 text-sm font-bold text-tourflow-dark disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleFieldSave()}
              disabled={saving}
              className="flex-1 rounded-xl bg-tourflow-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-tourflow-primaryHover disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Sheet>
      ) : null}

      {/* Language sheet */}
      {menuSheet === 'lang' && profile ? (
        <Sheet label="Language" onClose={closeMenuSheet}>
          <h3 className="text-base font-extrabold text-tourflow-dark">Language</h3>
          <div className="mt-3 overflow-hidden rounded-2xl border border-tourflow-cardBorder">
            {SUPPORTED_LANGUAGES.map((option, index) => {
              const selected = profile.language === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={saving}
                  onClick={() => void handleLanguageSelect(option.id)}
                  className={`flex w-full items-center justify-between gap-3 bg-white px-4 py-3 text-left hover:bg-tourflow-bg disabled:opacity-60 ${
                    index > 0 ? 'border-t border-tourflow-cardBorder' : ''
                  }`}
                >
                  <span className="text-sm font-bold text-tourflow-dark">{option.label}</span>
                  {selected ? (
                    <span aria-label="Selected" className="text-sm font-extrabold text-tourflow-primary">
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {menuError ? (
            <p role="alert" className="mt-2 text-xs font-semibold text-red-600">
              {menuError}
            </p>
          ) : null}
          <button
            type="button"
            onClick={closeMenuSheet}
            disabled={saving}
            className="mt-4 w-full rounded-xl border border-tourflow-cardBorder bg-white px-4 py-2.5 text-sm font-bold text-tourflow-dark disabled:opacity-60"
          >
            Done
          </button>
        </Sheet>
      ) : null}

      {/* Currency sheet */}
      {menuSheet === 'currency' && profile ? (
        <Sheet label="Currency" onClose={closeMenuSheet}>
          <h3 className="text-base font-extrabold text-tourflow-dark">Currency</h3>
          <div className="mt-3 overflow-hidden rounded-2xl border border-tourflow-cardBorder">
            {SUPPORTED_CURRENCIES.map((option, index) => {
              const selected = profile.preferred_currency === option.code;
              return (
                <button
                  key={option.code}
                  type="button"
                  disabled={saving}
                  onClick={() => void handleCurrencySelect(option.code)}
                  className={`flex w-full items-center justify-between gap-3 bg-white px-4 py-3 text-left hover:bg-tourflow-bg disabled:opacity-60 ${
                    index > 0 ? 'border-t border-tourflow-cardBorder' : ''
                  }`}
                >
                  <span>
                    <span className="block text-sm font-bold text-tourflow-dark">{option.name}</span>
                    <span className="block text-xs text-tourflow-textMuted">
                      {option.code} {option.symbol}
                    </span>
                  </span>
                  {selected ? (
                    <span aria-label="Selected" className="text-sm font-extrabold text-tourflow-primary">
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {menuError ? (
            <p role="alert" className="mt-2 text-xs font-semibold text-red-600">
              {menuError}
            </p>
          ) : null}
          <button
            type="button"
            onClick={closeMenuSheet}
            disabled={saving}
            className="mt-4 w-full rounded-xl border border-tourflow-cardBorder bg-white px-4 py-2.5 text-sm font-bold text-tourflow-dark disabled:opacity-60"
          >
            Done
          </button>
        </Sheet>
      ) : null}

      {/* Help & Support sheet */}
      {menuSheet === 'help' ? (
        <Sheet label="Help and support" onClose={closeMenuSheet}>
          <h3 className="text-base font-extrabold text-tourflow-dark">Help &amp; Support</h3>
          <p className="mt-1 text-xs text-tourflow-textMuted">Need help with your trip? Contact our support team.</p>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-tourflow-textMuted">Support</p>
          <div className="mt-1 overflow-hidden rounded-2xl border border-tourflow-cardBorder">
            {(
              [
                { title: 'Concierge Support', phone: support.primary },
                { title: 'Operations Support', phone: support.secondary },
              ] as const
            ).map((row, index) => (
              <div
                key={row.title}
                className={`flex items-center justify-between gap-3 bg-white px-4 py-3 ${
                  index > 0 ? 'border-t border-tourflow-cardBorder' : ''
                }`}
              >
                <span>
                  <span className="block text-sm font-bold text-tourflow-dark">{row.title}</span>
                  <span className="block text-xs text-tourflow-textMuted">{row.phone ?? 'Not configured'}</span>
                </span>
                {row.phone ? (
                  <a
                    href={`tel:${row.phone.replace(/[^+\d]/g, '')}`}
                    className="rounded-full bg-tourflow-primary px-4 py-1.5 text-xs font-bold text-white hover:bg-tourflow-primaryHover"
                  >
                    Call
                  </a>
                ) : (
                  <span className="rounded-full bg-tourflow-surfaceMuted px-4 py-1.5 text-xs font-bold text-tourflow-textMuted">
                    Call
                  </span>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={closeMenuSheet}
            className="mt-4 w-full rounded-xl border border-tourflow-cardBorder bg-white px-4 py-2.5 text-sm font-bold text-tourflow-dark"
          >
            Done
          </button>
        </Sheet>
      ) : null}

      {/* About sheet */}
      {menuSheet === 'about' ? (
          <Sheet label="About WanderAI" onClose={closeMenuSheet}>
            <h3 className="text-base font-extrabold text-tourflow-dark">WanderAI</h3>
          <p className="mt-1 text-xs text-tourflow-textMuted">
            {travelerUser.appVersion} ({travelerUser.build})
          </p>
          <p className="mt-3 text-xs leading-relaxed text-tourflow-textMuted">
            WanderAI is your AI travel companion for hyper-personalized escapes across India — plan journeys, track
            checklists, and explore with a live AI guide.
          </p>
          <button
            type="button"
            onClick={closeMenuSheet}
            className="mt-4 w-full rounded-xl border border-tourflow-cardBorder bg-white px-4 py-2.5 text-sm font-bold text-tourflow-dark"
          >
            Done
          </button>
        </Sheet>
      ) : null}

      {/* Avatar device pickers: Camera vs Gallery */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        aria-hidden="true"
        tabIndex={-1}
        className="hidden"
        onChange={(event) => handleFileSelected(event.target.files?.[0])}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        aria-hidden="true"
        tabIndex={-1}
        className="hidden"
        onChange={(event) => handleFileSelected(event.target.files?.[0])}
      />

      {/* Avatar action sheet */}
      {photoSheet === 'actions' ? (
        <Sheet label="Profile photo options" onClose={closePhotoSheet}>
          <button
            type="button"
            disabled={photoBusy}
            onClick={() => cameraRef.current?.click()}
            className="w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-tourflow-dark hover:bg-tourflow-bg disabled:opacity-60"
          >
            📷 Take Photo
          </button>
          <button
            type="button"
            disabled={photoBusy}
            onClick={() => galleryRef.current?.click()}
            className="w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-tourflow-dark hover:bg-tourflow-bg disabled:opacity-60"
          >
            🖼️ Choose from Gallery
          </button>
          {profile?.has_avatar === true ? (
            <button
              type="button"
              disabled={photoBusy}
              onClick={() => void handlePhotoRemove()}
              className="w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              {photoBusy ? 'Removing…' : 'Remove photo'}
            </button>
          ) : null}
          {photoError ? (
            <p role="alert" className="mt-2 text-xs font-semibold text-red-600">
              {photoError}
            </p>
          ) : null}
          <button
            type="button"
            onClick={closePhotoSheet}
            disabled={photoBusy}
            className="mt-1 w-full rounded-xl border border-tourflow-cardBorder bg-white px-4 py-3 text-sm font-bold text-tourflow-dark disabled:opacity-60"
          >
            Cancel
          </button>
        </Sheet>
      ) : null}

      {/* Avatar preview + upload sheet */}
      {photoSheet === 'preview' ? (
        <Sheet label="Preview new profile photo" onClose={closePhotoSheet}>
          <h3 className="text-base font-extrabold text-tourflow-dark">Preview</h3>
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview of selected profile photo"
              className="mx-auto mt-3 h-40 w-40 rounded-full border-2 border-tourflow-primary object-cover"
            />
          ) : null}
          {photoError ? (
            <p role="alert" className="mt-2 text-center text-xs font-semibold text-red-600">
              {photoError}
            </p>
          ) : null}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={closePhotoSheet}
              disabled={photoBusy}
              className="flex-1 rounded-xl border border-tourflow-cardBorder bg-white px-4 py-2.5 text-sm font-bold text-tourflow-dark disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handlePhotoUpload()}
              disabled={photoBusy || !previewFile}
              className="flex-1 rounded-xl bg-tourflow-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-tourflow-primaryHover disabled:opacity-60"
            >
              {photoBusy ? 'Uploading…' : 'Use Photo'}
            </button>
          </div>
        </Sheet>
      ) : null}

      {toast ? (
        <p role="status" className="fixed bottom-24 left-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-full bg-tourflow-dark px-4 py-2.5 text-center text-xs font-semibold text-white shadow-float">
          {toast}
        </p>
      ) : null}
    </div>
  );
}
