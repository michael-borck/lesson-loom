import { useEffect, useState } from "react";
import { Dashboard } from "./components/Dashboard";
import { NewLesson } from "./components/NewLesson";
import { PlanView } from "./components/PlanView";
import { SettingsPage } from "./components/SettingsPage";
import { loadPlans, loadSettings } from "./lib/storage";
import { fetchServerConfig, type ServerConfig } from "./lib/serverConfig";
import type { LessonPlan, Settings } from "./types";

// True when running inside the Tauri desktop app.
export const isDesktop =
  "__TAURI_INTERNALS__" in window ||
  window.location.protocol === "tauri:" ||
  window.location.hostname === "tauri.localhost";

function currentRoute(): string {
  return window.location.hash.replace(/^#/, "") || "/";
}

export function navigate(to: string): void {
  window.location.hash = to;
}

export default function App() {
  const [route, setRoute] = useState(currentRoute());
  const [plans, setPlans] = useState<LessonPlan[]>(loadPlans);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [server, setServer] = useState<ServerConfig | null>(null);

  useEffect(() => {
    const onHash = () => setRoute(currentRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    void fetchServerConfig().then(setServer);
  }, []);

  let page;
  if (route === "/new") {
    page = (
      <NewLesson
        settings={settings}
        server={server}
        plans={plans}
        onPlansChange={setPlans}
      />
    );
  } else if (route === "/settings") {
    page = (
      <SettingsPage settings={settings} server={server} onChange={setSettings} />
    );
  } else if (route.startsWith("/plan/")) {
    const id = route.slice("/plan/".length);
    const plan = plans.find((p) => p.id === id);
    page = plan ? (
      <PlanView
        key={plan.id}
        plan={plan}
        settings={settings}
        server={server}
        onPlansChange={setPlans}
      />
    ) : (
      <div className="empty">
        <p>Plan not found.</p>
      </div>
    );
  } else {
    page = <Dashboard plans={plans} onPlansChange={setPlans} />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <a href="#/" className="brand">
          <span className="brand-icon">🧵</span> Lesson Loom
        </a>
        <nav>
          <a href="#/new" className="btn btn-primary">
            + New lesson plan
          </a>
          <a href="#/settings" className="btn btn-ghost" title="Settings">
            ⚙︎ Settings
          </a>
        </nav>
      </header>
      <main>{page}</main>
      {!isDesktop && (
        <footer className="footer">
          {server
            ? "Managed instance — API keys are held on the server; plans are stored in your browser."
            : "Runs entirely in your browser — your API key and plans never leave this device except for calls to your chosen AI provider."}
        </footer>
      )}
    </div>
  );
}
