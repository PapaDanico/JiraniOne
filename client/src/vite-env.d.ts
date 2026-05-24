/// <reference types="vite/client" />

interface ImportMetaEnv {
  // "1" surfaces the demo-accounts panel on /login. Anything else
  // (including unset) hides it. Configured at build-time on Render.
  readonly VITE_DEMO_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
