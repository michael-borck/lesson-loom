/**
 * Hosted-demo mode ("try in your browser"). When the site is built with
 * DEMO_* env vars (see deploy.yml), the app is locked to a shared
 * OpenAI-compatible endpoint baked in at build time — visitors never see or
 * enter an API key. The standalone HTML and desktop builds define this as
 * null and stay bring-your-own-key.
 */
export interface DemoConfig {
  label: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export function getDemoConfig(): DemoConfig | null {
  return __DEMO_CONFIG__;
}
