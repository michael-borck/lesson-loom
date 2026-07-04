/**
 * Managed-mode detection. A self-hosted (Docker) instance exposes
 * GET <base>/api/config; on GitHub Pages / plain static hosting the fetch
 * 404s and the app runs in bring-your-own-key mode.
 */
export interface ServerConfig {
  managed: true;
  requiresPassword: boolean;
  anthropic: { models: string[] } | null;
  openaiCompat: { label: string; models: string[] } | null;
}

/** Directory of the current page, always ending in "/". */
export function appBasePath(): string {
  const p = window.location.pathname;
  return p.endsWith("/") ? p : p.replace(/[^/]*$/, "");
}

export function apiBase(): string {
  return `${window.location.origin}${appBasePath()}api`;
}

export async function fetchServerConfig(): Promise<ServerConfig | null> {
  try {
    const resp = await fetch(`${appBasePath()}api/config`, {
      cache: "no-store",
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as Partial<ServerConfig>;
    if (json && json.managed === true) {
      return {
        managed: true,
        requiresPassword: Boolean(json.requiresPassword),
        anthropic: json.anthropic ?? null,
        openaiCompat: json.openaiCompat ?? null,
      };
    }
    return null;
  } catch {
    return null;
  }
}
