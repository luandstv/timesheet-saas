"use client";

import * as React from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = Exclude<Theme, "system">;

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  storageKey?: string;
  attribute?: "class" | `data-${string}`;
  disableTransitionOnChange?: boolean;
  enableColorScheme?: boolean;
};

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;
  themes: Theme[];
  setTheme: (theme: Theme) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getInitialTheme(storageKey: string, defaultTheme: Theme): Theme {
  if (typeof window === "undefined") return defaultTheme;

  try {
    return (window.localStorage.getItem(storageKey) as Theme | null) ?? defaultTheme;
  } catch {
    return defaultTheme;
  }
}

function applyTheme(
  theme: Theme,
  attribute: ThemeProviderProps["attribute"],
  enableSystem: boolean,
  disableTransitionOnChange: boolean,
  enableColorScheme: boolean,
) {
  const root = document.documentElement;
  const resolvedTheme =
    theme === "system" && enableSystem
      ? getSystemTheme()
      : theme === "dark"
        ? "dark"
        : "light";

  const removeTransitions = disableTransitionOnChange
    ? (() => {
        const style = document.createElement("style");
        style.appendChild(
          document.createTextNode(
            "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;transition:none!important}",
          ),
        );
        document.head.appendChild(style);
        return () => {
          window.getComputedStyle(document.body);
          setTimeout(() => style.remove(), 1);
        };
      })()
    : undefined;

  if (attribute === "class") {
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
  } else if (attribute?.startsWith("data-")) {
    root.setAttribute(attribute, resolvedTheme);
  }

  if (enableColorScheme) {
    root.style.colorScheme = resolvedTheme;
  }

  removeTransitions?.();
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  enableSystem = true,
  storageKey = "theme",
  attribute = "data-theme",
  disableTransitionOnChange = false,
  enableColorScheme = true,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(() =>
    getInitialTheme(storageKey, defaultTheme),
  );
  const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>(() =>
    enableSystem && typeof window !== "undefined" ? getSystemTheme() : "light",
  );

  React.useEffect(() => {
    applyTheme(
      theme,
      attribute,
      enableSystem,
      disableTransitionOnChange,
      enableColorScheme,
    );
  }, [attribute, disableTransitionOnChange, enableColorScheme, enableSystem, theme]);

  React.useEffect(() => {
    if (!enableSystem) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const nextSystemTheme = getSystemTheme();
      setSystemTheme(nextSystemTheme);
      if (theme === "system") {
        applyTheme(
          "system",
          attribute,
          enableSystem,
          disableTransitionOnChange,
          enableColorScheme,
        );
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [attribute, disableTransitionOnChange, enableColorScheme, enableSystem, theme]);

  React.useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      const nextTheme = (event.newValue as Theme | null) ?? defaultTheme;
      setThemeState(nextTheme);
      applyTheme(
        nextTheme,
        attribute,
        enableSystem,
        disableTransitionOnChange,
        enableColorScheme,
      );
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [
    attribute,
    defaultTheme,
    disableTransitionOnChange,
    enableColorScheme,
    enableSystem,
    storageKey,
  ]);

  const setTheme = React.useCallback(
    (nextTheme: Theme) => {
      setThemeState(nextTheme);
      window.localStorage.setItem(storageKey, nextTheme);
      applyTheme(
        nextTheme,
        attribute,
        enableSystem,
        disableTransitionOnChange,
        enableColorScheme,
      );
    },
    [attribute, disableTransitionOnChange, enableColorScheme, enableSystem, storageKey],
  );

  const resolvedTheme =
    theme === "system" && enableSystem
      ? systemTheme
      : theme === "dark"
        ? "dark"
        : "light";
  const value = React.useMemo(
    () => ({
      theme,
      resolvedTheme,
      systemTheme,
      themes: enableSystem
        ? (["light", "dark", "system"] as Theme[])
        : (["light", "dark"] as Theme[]),
      setTheme,
    }),
    [enableSystem, resolvedTheme, setTheme, systemTheme, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
