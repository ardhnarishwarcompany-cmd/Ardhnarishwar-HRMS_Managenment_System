import { createContext, useContext, useEffect } from "react";

/**
 * Light theme engine for the employee portal.
 * Dark mode has been completely removed to match portal UI/UX specifications.
 */
const ThemeContext = createContext({
  theme: "light",
  resolved: "light",
  setTheme: () => {},
});

export function ThemeProvider({ children }) {
  useEffect(() => {
    try {
      localStorage.removeItem("hrms-theme");
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
    } catch {}
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: "light", resolved: "light", setTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
