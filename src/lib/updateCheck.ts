/**
 * Manual "check for updates" against the GitHub Releases API — the same
 * mechanism the landing page uses. Check only, never auto-update: when a
 * newer release exists the user gets a download link for the standalone
 * HTML file (or the release page as a fallback).
 */
const REPO = "michael-borck/lesson-loom";
const LATEST_API = `https://api.github.com/repos/${REPO}/releases/latest`;
const LATEST_PAGE = `https://github.com/${REPO}/releases/latest`;

export interface LatestRelease {
  /** Version without the leading "v", e.g. "0.3.0". */
  version: string;
  /** Direct download of the standalone HTML asset, or the release page. */
  downloadUrl: string;
  /** Release page (release notes). */
  releaseUrl: string;
}

export async function fetchLatestRelease(): Promise<LatestRelease> {
  const resp = await fetch(LATEST_API, {
    headers: { accept: "application/vnd.github+json" },
  });
  if (!resp.ok) throw new Error(`GitHub API returned ${resp.status}`);
  const data = (await resp.json()) as {
    tag_name?: string;
    html_url?: string;
    assets?: Array<{ name?: string; browser_download_url?: string }>;
  };
  const asset = (data.assets ?? []).find(
    (a) =>
      typeof a.name === "string" &&
      a.name.includes("standalone") &&
      a.name.endsWith(".html") &&
      a.browser_download_url,
  );
  return {
    version: (data.tag_name ?? "").replace(/^v/, ""),
    downloadUrl: asset?.browser_download_url ?? data.html_url ?? LATEST_PAGE,
    releaseUrl: data.html_url ?? LATEST_PAGE,
  };
}

/** True if `latest` is a higher version than `current` (semver-ish triplets). */
export function isNewerVersion(latest: string, current: string): boolean {
  const a = latest.split(".").map((n) => parseInt(n, 10) || 0);
  const b = current.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) > (b[i] ?? 0)) return true;
    if ((a[i] ?? 0) < (b[i] ?? 0)) return false;
  }
  return false;
}
