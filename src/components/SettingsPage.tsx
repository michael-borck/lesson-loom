import { useState } from "react";
import type { Settings } from "../types";
import { saveSettings } from "../lib/storage";
import { MODELS } from "../lib/anthropic";

export function SettingsPage({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
}) {
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [model, setModel] = useState(settings.model);
  const [saved, setSaved] = useState(false);

  return (
    <div className="panel narrow">
      <h2>Settings</h2>
      <label className="field">
        <span>Anthropic API key</span>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-ant-..."
          autoComplete="off"
        />
        <small>
          Stored only in this browser's local storage and sent only to the
          Anthropic API. Get a key at{" "}
          <a
            href="https://platform.claude.com/"
            target="_blank"
            rel="noreferrer"
          >
            platform.claude.com
          </a>
          . Usage is billed to your own account.
        </small>
      </label>
      <label className="field">
        <span>Model</span>
        <select value={model} onChange={(e) => setModel(e.target.value)}>
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <div className="actions">
        <button
          className="btn btn-primary"
          onClick={() => {
            const s = { apiKey: apiKey.trim(), model };
            saveSettings(s);
            onChange(s);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          }}
        >
          Save
        </button>
        {saved && <span className="saved-note">Saved ✓</span>}
      </div>
    </div>
  );
}
