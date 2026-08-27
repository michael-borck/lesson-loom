import { useState } from "react";
import { fetchLatestRelease, isNewerVersion } from "../lib/updateCheck";

type Status =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "current" }
  | { kind: "available"; version: string; downloadUrl: string; releaseUrl: string }
  | { kind: "error" };

/**
 * Current version + a manual "check for updates" button. Never auto-updates —
 * a newer release is offered as a download link.
 */
export function UpdateCheck() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function check() {
    setStatus({ kind: "checking" });
    try {
      const latest = await fetchLatestRelease();
      if (latest.version && isNewerVersion(latest.version, __APP_VERSION__)) {
        setStatus({
          kind: "available",
          version: latest.version,
          downloadUrl: latest.downloadUrl,
          releaseUrl: latest.releaseUrl,
        });
      } else {
        setStatus({ kind: "current" });
      }
    } catch {
      setStatus({ kind: "error" });
    }
  }

  return (
    <span className="update-check">
      <span className="update-version">v{__APP_VERSION__}</span>
      {" · "}
      <button
        className="btn-link"
        onClick={check}
        disabled={status.kind === "checking"}
      >
        {status.kind === "checking" ? "Checking…" : "Check for updates"}
      </button>
      {status.kind === "current" && (
        <span> — you're on the latest version</span>
      )}
      {status.kind === "available" && (
        <span>
          {" "}
          — <strong>v{status.version}</strong> available:{" "}
          <a href={status.downloadUrl}>download</a>
          {" · "}
          <a href={status.releaseUrl}>what's new</a>
        </span>
      )}
      {status.kind === "error" && (
        <span> — check failed (offline or rate-limited)</span>
      )}
    </span>
  );
}
