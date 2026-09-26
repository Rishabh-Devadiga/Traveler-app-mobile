/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the TourFlow backend (no trailing path), e.g. http://localhost:8000.
   * Device/APK builds MUST use the dev PC's LAN URL, e.g. http://192.168.137.100:8000. */
  readonly VITE_TOURFLOW_API_URL?: string;
  /** Legacy alias of VITE_TOURFLOW_API_URL (read as a fallback). */
  readonly VITE_API_URL?: string;
  /** Concierge support number shown on the Profile Help sheet (tel: link). */
  readonly VITE_SUPPORT_PHONE_PRIMARY?: string;
  /** Operations support number shown on the Profile Help sheet (tel: link). */
  readonly VITE_SUPPORT_PHONE_SECONDARY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
