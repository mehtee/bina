import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";
export type SidebarVariant = "ice" | "deep";
export type DensityPreset = "compact" | "comfortable" | "accessible";

const PREF_KEY = "bina.staffWeb.uiPrefs.v2";

interface StoredUiPrefs {
  theme: ThemePreference;
  sidebarVariant: SidebarVariant;
  density: DensityPreset;
  sidebarCollapsed: boolean;
}

const DEFAULT_PREFS: StoredUiPrefs = {
  theme: "light",
  sidebarVariant: "ice",
  density: "compact",
  sidebarCollapsed: false,
};

function readStoredPrefs(): StoredUiPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREF_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<StoredUiPrefs>;
    return {
      theme: parsed.theme === "dark" || parsed.theme === "system" ? parsed.theme : "light",
      sidebarVariant: parsed.sidebarVariant === "deep" ? "deep" : "ice",
      density:
        parsed.density === "comfortable" || parsed.density === "accessible"
          ? parsed.density
          : "compact",
      sidebarCollapsed: Boolean(parsed.sidebarCollapsed),
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function resolveSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

interface ThemeContextValue {
  readonly themePreference: ThemePreference;
  readonly resolvedTheme: ResolvedTheme;
  readonly sidebarVariant: SidebarVariant;
  readonly density: DensityPreset;
  readonly sidebarCollapsed: boolean;
  setThemePreference: (next: ThemePreference) => void;
  setSidebarVariant: (next: SidebarVariant) => void;
  setDensity: (next: DensityPreset) => void;
  setSidebarCollapsed: (next: boolean) => void;
  resetPreferences: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<StoredUiPrefs>(() => readStoredPrefs());
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => resolveSystemTheme());

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (ev: MediaQueryListEvent) => {
      setSystemTheme(ev.matches ? "dark" : "light");
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  const resolvedTheme: ResolvedTheme = prefs.theme === "system" ? systemTheme : prefs.theme;

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
    root.lang = "fa-IR";
    root.dir = "rtl";
    try {
      window.localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore storage quota / private mode failures for non-clinical UI prefs
    }
  }, [prefs, resolvedTheme]);

  const setThemePreference = useCallback((theme: ThemePreference) => {
    setPrefs((prev) => ({ ...prev, theme }));
  }, []);

  const setSidebarVariant = useCallback((sidebarVariant: SidebarVariant) => {
    setPrefs((prev) => ({ ...prev, sidebarVariant }));
  }, []);

  const setDensity = useCallback((density: DensityPreset) => {
    setPrefs((prev) => ({ ...prev, density }));
  }, []);

  const setSidebarCollapsed = useCallback((sidebarCollapsed: boolean) => {
    setPrefs((prev) => ({ ...prev, sidebarCollapsed }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPrefs(DEFAULT_PREFS);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themePreference: prefs.theme,
      resolvedTheme,
      sidebarVariant: prefs.sidebarVariant,
      density: prefs.density,
      sidebarCollapsed: prefs.sidebarCollapsed,
      setThemePreference,
      setSidebarVariant,
      setDensity,
      setSidebarCollapsed,
      resetPreferences,
    }),
    [prefs, resolvedTheme, setThemePreference, setSidebarVariant, setDensity, setSidebarCollapsed, resetPreferences]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return ctx;
}
