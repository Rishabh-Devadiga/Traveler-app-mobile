/**
 * Canonical option lists for the TourFlow Profile page.
 *
 * No preference/language/currency catalogs existed anywhere in the project
 * (verified by search), so these minimal lists are defined here and seeded
 * from the values the app already displays:
 * - `travelerUser.preferences` → 'Pure Veg, Mountain Scenic, Moderate Pace'
 * - `travelerUser.language` → 'English (IN)'
 * - `travelerUser.currency` → 'Indian Rupee (INR ₹)'
 *
 * This is DATA only — persistence stays in `src/api/profile.ts` (single
 * `tourflow.profile.v1` key). No exchange rates are defined here on purpose:
 * trip prices are stored in INR and there is no rate service, so the app
 * must never fabricate converted amounts.
 */

export interface PreferenceOption {
  id: string;
  label: string;
}

export interface PreferenceGroup {
  id: string;
  title: string;
  options: PreferenceOption[];
}

export const PREFERENCE_GROUPS: PreferenceGroup[] = [
  {
    id: 'food',
    title: 'Food preference',
    options: [
      { id: 'pure-veg', label: 'Pure Veg' },
      { id: 'vegetarian', label: 'Vegetarian' },
      { id: 'eggetarian', label: 'Eggetarian' },
      { id: 'non-veg', label: 'Non-Veg' },
      { id: 'vegan', label: 'Vegan' },
      { id: 'jain', label: 'Jain' },
    ],
  },
  {
    id: 'scenery',
    title: 'What you love',
    options: [
      { id: 'mountain-scenic', label: 'Mountain Scenic' },
      { id: 'beach', label: 'Beach' },
      { id: 'heritage', label: 'Heritage' },
      { id: 'backwaters', label: 'Backwaters' },
      { id: 'desert', label: 'Desert' },
      { id: 'city', label: 'City' },
      { id: 'wildlife', label: 'Wildlife' },
      { id: 'adventure', label: 'Adventure' },
    ],
  },
  {
    id: 'pace',
    title: 'Travel pace',
    options: [
      { id: 'relaxed-pace', label: 'Relaxed Pace' },
      { id: 'moderate-pace', label: 'Moderate Pace' },
      { id: 'fast-pace', label: 'Fast Pace' },
    ],
  },
];

/** Default selection matching the app's long-standing displayed summary. */
export const DEFAULT_PREFERENCE_IDS = ['pure-veg', 'mountain-scenic', 'moderate-pace'];

const ALL_PREFERENCE_OPTIONS = new Map<string, string>(
  PREFERENCE_GROUPS.flatMap((group) => group.options.map((o) => [o.id, o.label] as [string, string])),
);

export function isKnownPreferenceId(id: string): boolean {
  return ALL_PREFERENCE_OPTIONS.has(id);
}

/** Human-readable summary, e.g. 'Pure Veg, Mountain Scenic, Moderate Pace'. Unknown ids are dropped. */
export function preferenceSummary(ids: string[]): string {
  const labels = ids.map((id) => ALL_PREFERENCE_OPTIONS.get(id)).filter((l): l is string => !!l);
  return labels.length > 0 ? labels.join(', ') : 'Not set';
}

export interface LanguageOption {
  id: string;
  label: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { id: 'en-IN', label: 'English (IN)' },
  { id: 'hi', label: 'Hindi (IN)' },
  { id: 'mr', label: 'Marathi (IN)' },
];

export const DEFAULT_LANGUAGE_ID = 'en-IN';

export function languageLabel(id: string): string {
  return SUPPORTED_LANGUAGES.find((l) => l.id === id)?.label ?? 'English (IN)';
}

export function isKnownLanguageId(id: string): boolean {
  return SUPPORTED_LANGUAGES.some((l) => l.id === id);
}

export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
];

export const DEFAULT_CURRENCY_CODE = 'INR';

export function currencyLabel(code: string): string {
  const found = SUPPORTED_CURRENCIES.find((c) => c.code === code);
  return found ? `${found.name} (${found.code} ${found.symbol})` : 'Indian Rupee (INR ₹)';
}

export function isKnownCurrencyCode(code: string): boolean {
  return SUPPORTED_CURRENCIES.some((c) => c.code === code);
}
