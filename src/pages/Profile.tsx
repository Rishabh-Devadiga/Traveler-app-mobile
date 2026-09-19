import { useMemo, useRef, useState, type ReactNode } from 'react';
import { ProfileInfoCard, ProfileMenuCard } from '../components/content';
import { travelerUser } from '../mocks/traveler';
import { useUserProfile } from '../state/useUserProfile';
import { validateEmail, validateName, validatePhone } from '../utils/profileValidation';
import { AVATAR_ACCEPT_ATTR, fileToAvatarDataUrl } from '../utils/avatar';
import {
  PREFERENCE_GROUPS,
  SUPPORTED_CURRENCIES,
  SUPPORTED_LANGUAGES,
  currencyLabel,
  languageLabel,
  preferenceSummary,
} from '../data/profileOptions';
import { getSupportConfig } from '../config';
import type { ProfileInfoRow, ProfileMenuItem } from '../types';
import type { ProfileSettings } from '../api/profile';

type FieldId = 'name' | 'phone' | 'email';
type PhotoSheet = 'actions' | 'preview' | 'confirm-remove' | null;
type MenuSheet = 'prefs' | 'lang' | 'currency' | 'settings' | 'help' | 'about' | null;

const FIELD_META: Record<
  FieldId,
  { title: string; inputLabel: string; autoComplete: string; inputMode?: 'tel' | 'email' | 'text'; type: string }
> = {
  name: { title: 'Edit name', inputLabel: 'Full name', autoComplete: 'name', type: 'text' },
  phone: { title: 'Edit phone', inputLabel: 'Phone number', autoComplete: 'tel', inputMode: 'tel', type: 'tel' },
  email: { title: 'Edit email', inputLabel: 'Email address', autoComplete: 'email', inputMode: 'email', type: 'email' },
};

function validateField(field: FieldId, value: string): string | null {
  if (field === 'name') return validateName(value);
  if (field === 'phone') return validatePhone(value);
  return validateEmail(value);
}

/** Shared mobile bottom-sheet shell — same chrome for every Profile sheet. */
function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-float"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
        checked ? 'bg-tourflow-primary' : 'bg-gray-200'
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`}
      />
    </button>
  );
}

export default function Profile() {
  const { profile, saving, save, removeAvatar } = useUserProfile();
  const [toast, setToast] = useState('');
  const [editingField, setEditingField] = useState<FieldId | null>(null);
  const [draft, setDraft] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [photoSheet, setPhotoSheet] = useState<PhotoSheet>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [menuSheet, setMenuSheet] = useState<MenuSheet>(null);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [prefsDraft, setPrefsDraft] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const support = useMemo(() => getSupportConfig(), []);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2500);
  };

  const rows: ProfileInfoRow[] = [
    { id: 'name', label: 'Name', value: profile.name },
    { id: 'phone', label: 'Phone', value: profile.phone, verified: profile.phoneVerified },
    { id: 'email', label: 'Email', value: profile.email, verified: profile.emailVerified },
  ];

  const primaryItems: ProfileMenuItem[] = [
    { id: 'prefs', title: 'Travel Preferences', subtitle: preferenceSummary(profile.travelPreferences), icon: 'tune' },
    { id: 'lang', title: 'Language', subtitle: languageLabel(profile.language), icon: 'language' },
    { id: 'currency', title: 'Currency', subtitle: currencyLabel(profile.currency), icon: 'currency_rupee' },
    { id: 'settings', title: 'Settings', subtitle: 'Notifications, privacy, sync', icon: 'settings' },
  ];

  const supportItems: ProfileMenuItem[] = [
    { id: 'help', title: 'Help & Support', subtitle: 'Concierge and trip help', icon: 'support_agent' },
    {
      id: 'about',
      title: 'About TourFlow',
      subtitle: `${travelerUser.appVersion} (${travelerUser.build})`,
      icon: 'info',
    },
  ];

  const openEditor = (id: string) => {
    if (id !== 'name' && id !== 'phone' && id !== 'email') return;
    setDraft(profile[id]);
    setFieldError(null);
    setEditingField(id);
  };

  const closeEditor = () => {
    if (saving) return;
    setEditingField(null);
    setFieldError(null);
  };

  const handleFieldSave = async () => {
    if (!editingField || saving) return;
    const trimmed = draft.trim();
    const validationError = validateField(editingField, trimmed);
    if (validationError) {
      setFieldError(validationError);
      return;
    }
    setFieldError(null);
    try {
      await save({ [editingField]: trimmed });
      setEditingField(null);
      showToast('Profile updated.');
    } catch (err) {
      // Keep the sheet open so the user can retry; surface the failure.
      setFieldError(err instanceof Error ? err.message : 'Could not save your changes. Please try again.');
    }
  };

  const openPhotoActions = () => {
    setPhotoError(null);
    setPhotoSheet('actions');
  };

  const closePhotoSheet = () => {
    if (photoSaving) return;
    setPhotoSheet(null);
    setPhotoError(null);
  };

  const handleFileSelected = (file: File | undefined) => {
    if (!file) return;
    setPhotoError(null);
    setPreviewFile(file);
    // Transient preview only — the persisted value is the processed data URL
    // written on Save. The object URL is revoked when replaced or on save.
    setPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(file);
    });
    setPhotoSheet('preview');
  };

  const closePreview = () => {
    if (photoSaving) return;
    setPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
    setPreviewFile(null);
    setPhotoError(null);
    setPhotoSheet(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePhotoSave = async () => {
    if (!previewFile || photoSaving) return;
    setPhotoSaving(true);
    setPhotoError(null);
    try {
      const dataUrl = await fileToAvatarDataUrl(previewFile);
      await save({ avatarDataUrl: dataUrl });
      setPreviewUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return null;
      });
      setPreviewFile(null);
      setPhotoSheet(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      showToast('Profile photo updated.');
    } catch (err) {
      // Stay on the preview so the user can pick another photo or cancel.
      setPhotoError(err instanceof Error ? err.message : 'Could not save your photo. Please try again.');
    } finally {
      setPhotoSaving(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (photoSaving) return;
    setPhotoSaving(true);
    setPhotoError(null);
    try {
      await removeAvatar();
      setPhotoSheet(null);
      showToast('Profile photo removed.');
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Could not remove your photo. Please try again.');
    } finally {
      setPhotoSaving(false);
    }
  };

  const openMenuSheet = (id: string) => {
    if (id !== 'prefs' && id !== 'lang' && id !== 'currency' && id !== 'settings' && id !== 'help' && id !== 'about') return;
    setMenuError(null);
    if (id === 'prefs') setPrefsDraft([...profile.travelPreferences]);
    setMenuSheet(id);
  };

  const closeMenuSheet = () => {
    if (saving) return;
    setMenuSheet(null);
    setMenuError(null);
  };

  const togglePrefDraft = (id: string) => {
    setPrefsDraft((previous) => (previous.includes(id) ? previous.filter((p) => p !== id) : [...previous, id]));
  };

  const handlePrefsSave = async () => {
    if (saving) return;
    setMenuError(null);
    try {
      await save({ travelPreferences: prefsDraft });
      setMenuSheet(null);
      showToast('Travel preferences updated.');
    } catch (err) {
      setMenuError(err instanceof Error ? err.message : 'Could not save your preferences. Please try again.');
    }
  };

  const handleLanguageSelect = async (id: string) => {
    if (saving || id === profile.language) return;
    setMenuError(null);
    try {
      await save({ language: id });
      showToast('Language updated.');
    } catch (err) {
      setMenuError(err instanceof Error ? err.message : 'Could not save your language. Please try again.');
    }
  };

  const handleCurrencySelect = async (code: string) => {
    if (saving || code === profile.currency) return;
    setMenuError(null);
    try {
      await save({ currency: code });
      showToast('Currency updated.');
    } catch (err) {
      setMenuError(err instanceof Error ? err.message : 'Could not save your currency. Please try again.');
    }
  };

  const handleSettingsChange = async (next: ProfileSettings) => {
    if (saving) return;
    setMenuError(null);
    try {
      await save({ settings: next });
    } catch (err) {
      setMenuError(err instanceof Error ? err.message : 'Could not save your settings. Please try again.');
    }
  };

  const avatarSrc = profile.avatarDataUrl ?? travelerUser.avatarUrl;
  const meta = editingField ? FIELD_META[editingField] : null;
  const settings = profile.settings;

  return (
    <div className="flex flex-col gap-4">
      <section className="flex items-center gap-3 rounded-2xl border border-tourflow-cardBorder bg-white p-4 shadow-card">
        <div className="relative">
          <img
            src={avatarSrc}
            alt={`${profile.name} profile photo`}
            className="h-16 w-16 rounded-full border-2 border-tourflow-primary object-cover"
          />
          <button
            type="button"
            aria-label="Change avatar"
            onClick={openPhotoActions}
            className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-tourflow-primary text-xs text-white"
          >
            ✎
          </button>
        </div>
        <div className="flex-1">
          <h2 className="text-base font-extrabold">{profile.name}</h2>
          <p className="text-xs text-tourflow-textMuted">{travelerUser.tier}</p>
          <p className="mt-1 inline-block rounded-full bg-tourflow-primarySoft px-2 py-0.5 text-[11px] font-bold text-tourflow-primary">
            {travelerUser.activeTripLabel}
          </p>
        </div>
      </section>

      <ProfileInfoCard rows={rows} onEdit={openEditor} />
      <ProfileMenuCard title="Preferences & Settings" items={primaryItems} onSelect={openMenuSheet} />
      <ProfileMenuCard title="Support & About" items={supportItems} onSelect={openMenuSheet} />

      <button
        type="button"
        onClick={() => showToast('Logged out of TourFlow (mock, no auth in Phase 1).')}
        className="w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50"
      >
        Log out
      </button>

      {/* Hidden device image picker: JPG, JPEG, PNG, WebP only. */}
      <input
        ref={fileInputRef}
        type="file"
        accept={AVATAR_ACCEPT_ATTR}
        aria-hidden="true"
        tabIndex={-1}
        className="hidden"
        onChange={(event) => handleFileSelected(event.target.files?.[0])}
      />

      {/* Name / phone / email edit bottom sheet */}
      {editingField && meta ? (
        <Sheet label={meta.title} onClose={closeEditor}>
          <h3 className="text-base font-extrabold text-tourflow-dark">{meta.title}</h3>
          <label htmlFor="profile-field-input" className="mt-3 block text-xs font-bold uppercase tracking-wide text-tourflow-textMuted">
            {meta.inputLabel}
          </label>
          <input
            id="profile-field-input"
            type={meta.type}
            inputMode={meta.inputMode}
            autoComplete={meta.autoComplete}
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
          {editingField !== 'name' ? (
            <p className="mt-1.5 text-[11px] text-tourflow-textMuted">
              Changing this will remove its Verified badge until it is verified again.
            </p>
          ) : null}
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

      {/* Photo action sheet */}
      {photoSheet === 'actions' ? (
        <Sheet label="Profile photo options" onClose={closePhotoSheet}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-tourflow-dark hover:bg-tourflow-bg"
          >
            Change Photo
          </button>
          <button
            type="button"
            onClick={() => {
              setPhotoError(null);
              setPhotoSheet('confirm-remove');
            }}
            className="w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50"
          >
            Remove Photo
          </button>
          <button
            type="button"
            onClick={closePhotoSheet}
            className="mt-1 w-full rounded-xl border border-tourflow-cardBorder bg-white px-4 py-3 text-sm font-bold text-tourflow-dark"
          >
            Cancel
          </button>
        </Sheet>
      ) : null}

      {/* Photo preview sheet */}
      {photoSheet === 'preview' ? (
        <Sheet label="Preview new profile photo" onClose={closePreview}>
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
              onClick={closePreview}
              disabled={photoSaving}
              className="flex-1 rounded-xl border border-tourflow-cardBorder bg-white px-4 py-2.5 text-sm font-bold text-tourflow-dark disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handlePhotoSave()}
              disabled={photoSaving || !previewFile}
              className="flex-1 rounded-xl bg-tourflow-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-tourflow-primaryHover disabled:opacity-60"
            >
              {photoSaving ? 'Saving…' : 'Use Photo'}
            </button>
          </div>
        </Sheet>
      ) : null}

      {/* Remove-photo confirmation */}
      {photoSheet === 'confirm-remove' ? (
        <Sheet label="Remove profile picture?" onClose={closePhotoSheet}>
          <h3 className="text-base font-extrabold text-tourflow-dark">Remove profile picture?</h3>
          <p className="mt-1 text-xs text-tourflow-textMuted">
            Your photo will be removed and the default avatar will be shown instead. Your other profile details stay the same.
          </p>
          {photoError ? (
            <p role="alert" className="mt-2 text-xs font-semibold text-red-600">
              {photoError}
            </p>
          ) : null}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={closePhotoSheet}
              disabled={photoSaving}
              className="flex-1 rounded-xl border border-tourflow-cardBorder bg-white px-4 py-2.5 text-sm font-bold text-tourflow-dark disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleRemovePhoto()}
              disabled={photoSaving}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {photoSaving ? 'Removing…' : 'Remove'}
            </button>
          </div>
        </Sheet>
      ) : null}

      {/* Travel preferences sheet */}
      {menuSheet === 'prefs' ? (
        <Sheet label="Travel preferences" onClose={closeMenuSheet}>
          <h3 className="text-base font-extrabold text-tourflow-dark">Travel Preferences</h3>
          <p className="mt-1 text-xs text-tourflow-textMuted">Current: {preferenceSummary(prefsDraft)}</p>
          {PREFERENCE_GROUPS.map((group) => (
            <div key={group.id} className="mt-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-tourflow-textMuted">{group.title}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {group.options.map((option) => {
                  const selected = prefsDraft.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={selected}
                      disabled={saving}
                      onClick={() => togglePrefDraft(option.id)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
                        selected
                          ? 'border-tourflow-primary bg-tourflow-primarySoft text-tourflow-primary'
                          : 'border-tourflow-cardBorder bg-white text-tourflow-dark'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {menuError ? (
            <p role="alert" className="mt-3 text-xs font-semibold text-red-600">
              {menuError}
            </p>
          ) : null}
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={closeMenuSheet}
              disabled={saving}
              className="flex-1 rounded-xl border border-tourflow-cardBorder bg-white px-4 py-2.5 text-sm font-bold text-tourflow-dark disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handlePrefsSave()}
              disabled={saving}
              className="flex-1 rounded-xl bg-tourflow-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-tourflow-primaryHover disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Sheet>
      ) : null}

      {/* Language sheet */}
      {menuSheet === 'lang' ? (
        <Sheet label="Language" onClose={closeMenuSheet}>
          <h3 className="text-base font-extrabold text-tourflow-dark">Language</h3>
          <p className="mt-1 text-xs text-tourflow-textMuted">
            Saved as a preference. The app interface is not translated yet.
          </p>
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
      {menuSheet === 'currency' ? (
        <Sheet label="Currency" onClose={closeMenuSheet}>
          <h3 className="text-base font-extrabold text-tourflow-dark">Currency</h3>
          <p className="mt-1 text-xs text-tourflow-textMuted">
            Saved as your preference. Trip prices are currently shown in INR.
          </p>
          <div className="mt-3 overflow-hidden rounded-2xl border border-tourflow-cardBorder">
            {SUPPORTED_CURRENCIES.map((option, index) => {
              const selected = profile.currency === option.code;
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

      {/* Settings sheet */}
      {menuSheet === 'settings' ? (
        <Sheet label="Settings" onClose={closeMenuSheet}>
          <h3 className="text-base font-extrabold text-tourflow-dark">Settings</h3>

          <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-tourflow-textMuted">Notifications</p>
          <div className="mt-1 overflow-hidden rounded-2xl border border-tourflow-cardBorder">
            {(
              [
                { id: 'tripUpdates', title: 'Trip Updates' },
                { id: 'bookingUpdates', title: 'Booking Updates' },
                { id: 'promotionalUpdates', title: 'Promotional Updates' },
              ] as const
            ).map((row, index) => (
              <div
                key={row.id}
                className={`flex items-center justify-between gap-3 bg-white px-4 py-3 ${
                  index > 0 ? 'border-t border-tourflow-cardBorder' : ''
                }`}
              >
                <span className="text-sm font-bold text-tourflow-dark">{row.title}</span>
                <Toggle
                  checked={settings.notifications[row.id]}
                  disabled={saving}
                  label={row.title}
                  onChange={() =>
                    void handleSettingsChange({
                      ...settings,
                      notifications: { ...settings.notifications, [row.id]: !settings.notifications[row.id] },
                    })
                  }
                />
              </div>
            ))}
          </div>

          <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-tourflow-textMuted">Privacy</p>
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-tourflow-cardBorder bg-white px-4 py-3">
            <span>
              <span className="block text-sm font-bold text-tourflow-dark">Profile Visibility</span>
              <span className="block text-xs text-tourflow-textMuted">
                {settings.profileVisibility === 'private' ? 'Private · stored on this device' : 'Public'} · local-only
              </span>
            </span>
            <Toggle
              checked={settings.profileVisibility === 'public'}
              disabled={saving}
              label="Profile visibility"
              onChange={() =>
                void handleSettingsChange({
                  ...settings,
                  profileVisibility: settings.profileVisibility === 'public' ? 'private' : 'public',
                })
              }
            />
          </div>

          <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-tourflow-textMuted">Sync</p>
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-tourflow-cardBorder bg-white px-4 py-3">
            <span>
              <span className="block text-sm font-bold text-tourflow-dark">Sync Profile</span>
              <span className="block text-xs text-tourflow-textMuted">Local-only · no server sync yet</span>
            </span>
            <Toggle
              checked={settings.syncProfile}
              disabled={saving}
              label="Sync profile"
              onChange={() => void handleSettingsChange({ ...settings, syncProfile: !settings.syncProfile })}
            />
          </div>
          <button
            type="button"
            onClick={() => showToast('Sync is not available yet — your profile stays on this device.')}
            className="mt-2 w-full rounded-xl border border-tourflow-cardBorder bg-white px-4 py-2.5 text-sm font-bold text-tourflow-primary"
          >
            Sync Now
          </button>

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
        <Sheet label="About TourFlow" onClose={closeMenuSheet}>
          <h3 className="text-base font-extrabold text-tourflow-dark">TourFlow</h3>
          <p className="mt-1 text-xs text-tourflow-textMuted">
            {travelerUser.appVersion} ({travelerUser.build})
          </p>
          <p className="mt-3 text-xs leading-relaxed text-tourflow-textMuted">
            TourFlow is your AI travel companion for hyper-personalized escapes across India — plan journeys, track
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

      {toast ? (
        <p role="status" className="fixed bottom-24 left-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-full bg-tourflow-dark px-4 py-2.5 text-center text-xs font-semibold text-white shadow-float">
          {toast}
        </p>
      ) : null}
    </div>
  );
}
