import { useState } from "react";
import type { ProviderId, Settings } from "../types";
import { saveSettings } from "../lib/storage";
import {
  ANTHROPIC_MODELS,
  PROVIDERS,
  providerMeta,
} from "../lib/providers";
import type { ServerConfig } from "../lib/serverConfig";

export function SettingsPage({
  settings,
  server,
  onChange,
}: {
  settings: Settings;
  server: ServerConfig | null;
  onChange: (s: Settings) => void;
}) {
  const [draft, setDraft] = useState<Settings>(() =>
    JSON.parse(JSON.stringify(settings)) as Settings,
  );
  const [saved, setSaved] = useState(false);

  const provider = draft.provider;
  const cfg = draft.configs[provider];
  const meta = providerMeta(provider);

  const setProvider = (p: ProviderId) =>
    setDraft((d) => ({ ...d, provider: p }));
  const setCfg = (patch: Partial<typeof cfg>) =>
    setDraft((d) => ({
      ...d,
      configs: { ...d.configs, [provider]: { ...d.configs[provider], ...patch } },
    }));

  function save() {
    saveSettings(draft);
    onChange(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // ---- Managed (self-hosted) instance: keys live on the server ----
  if (server) {
    const managedProviders: Array<{ id: ProviderId; label: string; models: string[] }> = [];
    if (server.anthropic)
      managedProviders.push({
        id: "anthropic",
        label: "Anthropic (Claude)",
        models: server.anthropic.models,
      });
    if (server.openaiCompat)
      managedProviders.push({
        id: "custom",
        label: server.openaiCompat.label || "Server model (OpenAI-compatible)",
        models: server.openaiCompat.models,
      });
    const active =
      managedProviders.find((p) => p.id === provider) ?? managedProviders[0];

    return (
      <div className="panel narrow">
        <h2>Settings</h2>
        <p className="hint">
          🔒 This is a managed Lesson Loom instance — API keys are configured
          on the server, so there is nothing to paste here.
        </p>
        {managedProviders.length > 1 && (
          <label className="field">
            <span>Provider</span>
            <select
              value={active?.id}
              onChange={(e) => setProvider(e.target.value as ProviderId)}
            >
              {managedProviders.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {active && (
          <label className="field">
            <span>Model</span>
            {active.models.length > 0 ? (
              <select
                value={draft.configs[active.id].model || active.models[0]}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    provider: active.id,
                    configs: {
                      ...d.configs,
                      [active.id]: {
                        ...d.configs[active.id],
                        model: e.target.value,
                      },
                    },
                  }))
                }
              >
                {active.models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={draft.configs[active.id].model}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    provider: active.id,
                    configs: {
                      ...d.configs,
                      [active.id]: {
                        ...d.configs[active.id],
                        model: e.target.value,
                      },
                    },
                  }))
                }
                placeholder="model name"
              />
            )}
          </label>
        )}
        {server.requiresPassword && (
          <label className="field">
            <span>Access password</span>
            <input
              type="password"
              value={draft.appPassword}
              onChange={(e) =>
                setDraft((d) => ({ ...d, appPassword: e.target.value }))
              }
              placeholder="Provided by whoever runs this instance"
            />
          </label>
        )}
        <div className="actions">
          <button className="btn btn-primary" onClick={save}>
            Save
          </button>
          {saved && <span className="saved-note">Saved ✓</span>}
        </div>
      </div>
    );
  }

  // ---- Bring-your-own-key mode (static hosting / GitHub Pages) ----
  return (
    <div className="panel narrow">
      <h2>Settings</h2>
      <label className="field">
        <span>Provider</span>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as ProviderId)}
        >
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      {meta.baseUrlEditable ? (
        <label className="field">
          <span>Endpoint base URL</span>
          <input
            value={cfg.baseUrl}
            onChange={(e) => setCfg({ baseUrl: e.target.value })}
            placeholder={
              provider === "ollama"
                ? "http://localhost:11434/v1"
                : "https://your-endpoint.example.com/v1"
            }
          />
          <small>An OpenAI-compatible endpoint, including the /v1 path.</small>
        </label>
      ) : provider !== "anthropic" ? (
        <p className="hint">Endpoint: {cfg.baseUrl}</p>
      ) : null}

      <label className="field">
        <span>
          API key{meta.keyRequired ? "" : " (optional)"}
        </span>
        <input
          type="password"
          value={cfg.apiKey}
          onChange={(e) => setCfg({ apiKey: e.target.value })}
          placeholder={provider === "anthropic" ? "sk-ant-..." : "…"}
          autoComplete="off"
        />
        <small>
          {meta.keyHint} Stored only in this browser's local storage and sent
          only to the endpoint above.
        </small>
      </label>

      <label className="field">
        <span>Model</span>
        {provider === "anthropic" ? (
          <select
            value={cfg.model}
            onChange={(e) => setCfg({ model: e.target.value })}
          >
            {ANTHROPIC_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        ) : (
          <>
            <input
              list={`models-${provider}`}
              value={cfg.model}
              onChange={(e) => setCfg({ model: e.target.value })}
              placeholder={meta.modelSuggestions[0] ?? "model name"}
            />
            <datalist id={`models-${provider}`}>
              {meta.modelSuggestions.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            {meta.modelHint && <small>{meta.modelHint}</small>}
          </>
        )}
      </label>

      {provider !== "anthropic" && (
        <p className="hint">
          Note: PDF uploads are read as extracted text with this provider.
          Scanned/image-only PDFs need the Anthropic provider, which reads
          PDFs natively (including figures).
        </p>
      )}

      <div className="actions">
        <button className="btn btn-primary" onClick={save}>
          Save
        </button>
        {saved && <span className="saved-note">Saved ✓</span>}
      </div>
    </div>
  );
}
