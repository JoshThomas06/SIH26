import { create } from "zustand";

export type ThemeMode = "dark" | "light";
export type FontScale = "sm" | "md" | "lg";

export type UiPrefs = {
  theme: ThemeMode;
  fontScale: FontScale;
  reduceMotion: boolean;
  highContrast: boolean;
  persistCrtDark: boolean;
};

const STORAGE_KEY = "aegis-ui-prefs";

const DEFAULTS: UiPrefs = {
  theme: "dark",
  fontScale: "md",
  reduceMotion: false,
  highContrast: false,
  persistCrtDark: true,
};

function readStored(): UiPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<UiPrefs>) };
  } catch {
    return DEFAULTS;
  }
}

export function applyUiPrefs(prefs: UiPrefs) {
  const root = document.documentElement;
  root.classList.toggle("theme-light", prefs.theme === "light");
  root.classList.toggle("theme-dark", prefs.theme === "dark");
  root.classList.toggle("high-contrast", prefs.highContrast);
  root.dataset.fontScale = prefs.fontScale;
  root.dataset.reduceMotion = prefs.reduceMotion ? "true" : "false";
  root.style.fontSize = prefs.fontScale === "sm" ? "14px" : prefs.fontScale === "lg" ? "18px" : "16px";
}

export const useUiPrefs = create<UiPrefs & { setPrefs: (patch: Partial<UiPrefs>) => void }>((set, get) => ({
  ...DEFAULTS,
  setPrefs: (patch) => {
    const next = { ...get(), ...patch };
    const { setPrefs: _, ...persist } = next;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persist));
    applyUiPrefs(persist);
    set(persist);
  },
}));

export function hydrateUiPrefs() {
  const prefs = readStored();
  applyUiPrefs(prefs);
  useUiPrefs.setState(prefs);
}
