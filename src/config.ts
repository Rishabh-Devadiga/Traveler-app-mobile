/**
 * Environment-driven configuration for the TourFlow frontend.
 *
 * Convention follows the existing `.env.example` (VITE_* variables, no
 * secrets). Support phone numbers are read here so the Profile Help sheet
 * never hardcodes contact numbers — the app owner configures them via:
 *
 *   VITE_SUPPORT_PHONE_PRIMARY=+911800000001
 *   VITE_SUPPORT_PHONE_SECONDARY=+911800000002
 *
 * When unset, the UI shows a "Not configured" state instead of a number.
 */

function readEnv(key: 'VITE_SUPPORT_PHONE_PRIMARY' | 'VITE_SUPPORT_PHONE_SECONDARY'): string | null {
  const raw = import.meta.env?.[key];
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed ? trimmed : null;
}

export interface SupportConfig {
  primary: string | null;
  secondary: string | null;
}

export function getSupportConfig(): SupportConfig {
  return {
    primary: readEnv('VITE_SUPPORT_PHONE_PRIMARY'),
    secondary: readEnv('VITE_SUPPORT_PHONE_SECONDARY'),
  };
}

// Re-export AI provider configuration
export * from './config/aiProviders';
