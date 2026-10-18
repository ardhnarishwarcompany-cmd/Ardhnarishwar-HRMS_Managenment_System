import { createContext, useContext, useEffect } from "react";

/**
 * The sales portal ships light-only. This provider exists so older code
 * importing `useTheme` keeps working, and so a stale `hrms-theme=dark`
 * value left in localStorage from previous builds can never flip the UI.
 */
const LEGACY_STORAGE_KEY = "hrms-theme";

const LIGHT = { theme: "light", resolved: "light", setTheme: () => {} };

const ThemeContext = createContext(LIGHT);

export function ThemeProvider({ children }) {
  useEffect(() => {
    document.documentElement.classList.remove("dark", "theme-transition");
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      /* storage unavailable — nothing to clean */
    }
  }, []);

  return <ThemeContext.Provider value={LIGHT}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext) || LIGHT;
}
