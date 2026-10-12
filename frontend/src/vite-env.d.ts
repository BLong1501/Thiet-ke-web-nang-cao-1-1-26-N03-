/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL gốc của API, ví dụ http://localhost:5000/api/v1 */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
