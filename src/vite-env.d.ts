/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SICOOB_TEST_USER_PASSWORD?: string;
  readonly VITE_SICOOB_TEST_EMAIL_PA?: string;
  readonly VITE_SICOOB_TEST_EMAIL_SINGULAR?: string;
  readonly VITE_SICOOB_TEST_EMAIL_CENTRAL?: string;
  readonly VITE_SICOOB_TEST_EMAIL_GESTOR?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
