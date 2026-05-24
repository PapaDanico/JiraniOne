/// <reference types="vite/client" />

interface ImportMetaEnv {
  // "1" to surface the demo-accounts panel on /login. Anything else
  // (including unset) hides it. See client/src/components/auth/demo-bench.tsx.
  readonly VITE_DEMO_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
