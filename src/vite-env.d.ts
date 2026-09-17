/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the TourFlow backend (no trailing path), e.g. http://localhost:8000 */
  readonly VITE_TOURFLOW_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
