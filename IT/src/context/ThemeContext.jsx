import { createContext, useContext, useEffect } from "react";

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

export function useTheme() {
  return useContext(ThemeContext);
}
