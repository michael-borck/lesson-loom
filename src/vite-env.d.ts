/// <reference types="vite/client" />

/** App version injected at build time from package.json (see vite configs). */
declare const __APP_VERSION__: string;

/** Hosted-demo config injected at build time; null in BYOK builds. */
declare const __DEMO_CONFIG__: {
  label: string;
  baseUrl: string;
  apiKey: string;
  model: string;
} | null;
