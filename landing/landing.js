// Platform-detected download buttons fed by the GitHub Releases API.
// Mirrors the cite-sight / playable-lessons pattern.
const REPO = "michael-borck/lesson-loom";
const RELEASES_API = `https://api.github.com/repos/${REPO}/releases/latest`;
const FALLBACK_URL = `https://github.com/${REPO}/releases/latest`;

const PLATFORM_LABEL = { mac: "macOS", windows: "Windows", linux: "Linux" };

function detectPlatform() {
  const ua = navigator.userAgent.toLowerCase();
  const platform = (navigator.platform || "").toLowerCase();
  if (platform.includes("mac") || ua.includes("macintosh") || ua.includes("mac os")) return "mac";
  if (platform.includes("win") || ua.includes("windows")) return "windows";
  if (ua.includes("linux") || platform.includes("linux")) return "linux";
  return "mac";
}

// Tauri release asset conventions: .dmg (mac), -setup.exe / .msi (windows),
// .AppImage (linux).
function assetFor(release, platform) {
  if (!release) return null;
  const byName = (test) => release.assets.find((a) => test(a.name.toLowerCase()));
  if (platform === "mac") return byName((n) => n.endsWith(".dmg"));
  if (platform === "windows")
    return byName((n) => n.endsWith(".exe")) || byName((n) => n.endsWith(".msi"));
  return byName((n) => n.endsWith(".appimage")) || byName((n) => n.endsWith(".deb"));
}

let selectedPlatform = detectPlatform();
let release = null;

function render() {
  const asset = assetFor(release, selectedPlatform);
  const url = asset ? asset.browser_download_url : FALLBACK_URL;
  const label = `Download for ${PLATFORM_LABEL[selectedPlatform]}`;

  for (const id of ["dl-primary", "dl-secondary"]) {
    const el = document.getElementById(id);
    if (el) {
      el.href = url;
      el.textContent = label;
    }
  }

  const versionEl = document.getElementById("dl-version");
  if (versionEl) {
    versionEl.textContent = release?.tag_name
      ? `Latest release: ${release.tag_name}`
      : "See all releases →";
    if (!release) {
      versionEl.innerHTML = `<a href="${FALLBACK_URL}">See all releases →</a>`;
    }
  }

  const otherEl = document.getElementById("dl-other");
  if (otherEl) {
    const others = Object.keys(PLATFORM_LABEL)
      .filter((p) => p !== selectedPlatform)
      .map((p) => {
        const a = assetFor(release, p);
        return `<a href="${a ? a.browser_download_url : FALLBACK_URL}">${PLATFORM_LABEL[p]}</a>`;
      });
    otherEl.innerHTML = `Also for ${others.join(" · ")}`;
  }

  document.querySelectorAll(".platform-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.platform === selectedPlatform);
  });
}

async function loadRelease() {
  try {
    const res = await fetch(RELEASES_API);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    release = { tag_name: data.tag_name, assets: data.assets || [] };
  } catch {
    release = null; // rate-limited or no release yet — fall back to releases page
  }
  render();
}

document.querySelectorAll(".platform-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    selectedPlatform = btn.dataset.platform;
    render();
  });
});

render();
loadRelease();

// ---- Screenshot slider ----
const slider = document.getElementById("slider");
if (slider) {
  const slides = [...slider.querySelectorAll(".slide")];
  const dotsWrap = document.getElementById("slider-dots");
  let index = 0;
  let timer = null;

  const dots = slides.map((_, i) => {
    const dot = document.createElement("button");
    dot.className = "slider-dot";
    dot.setAttribute("aria-label", `Screenshot ${i + 1}`);
    dot.addEventListener("click", () => {
      show(i);
      restart();
    });
    dotsWrap.appendChild(dot);
    return dot;
  });

  function show(i) {
    index = i;
    slides.forEach((s, j) => s.classList.toggle("active", j === i));
    dots.forEach((d, j) => d.classList.toggle("active", j === i));
  }

  function next() {
    show((index + 1) % slides.length);
  }

  function restart() {
    clearInterval(timer);
    timer = setInterval(next, 5000);
  }

  slider.addEventListener("mouseenter", () => clearInterval(timer));
  slider.addEventListener("mouseleave", restart);

  show(0);
  restart();
}
