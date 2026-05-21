import React, { createContext, useContext, useEffect, useState } from "react"

export type ThemePreference = "dark" | "light" | "system"
export type AccentColor = "green" | "blue" | "purple" | "pink" | "orange" | "red"
type ResolvedTheme = Exclude<ThemePreference, "system">

interface ThemeContextType {
  theme: ThemePreference
  resolvedTheme: ResolvedTheme
  accentColor: AccentColor
  setTheme: (theme: ThemePreference) => void
  setAccentColor: (accentColor: AccentColor) => void
}

const THEME_STORAGE_KEY = "clubrm-theme"
const ACCENT_STORAGE_KEY = "clubrm-accent"
const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const ACCENT_PALETTES: Record<
  AccentColor,
  {
    light: {
      primary: string
      primaryForeground: string
      accent: string
      accentForeground: string
    }
    dark: {
      primary: string
      primaryForeground: string
      accent: string
      accentForeground: string
    }
  }
> = {
  green: {
    light: {
      primary: "oklch(0.68 0.16 154)",
      primaryForeground: "oklch(0.985 0 0)",
      accent: "oklch(0.95 0.05 154)",
      accentForeground: "oklch(0.42 0.11 154)",
    },
    dark: {
      primary: "oklch(0.78 0.16 154)",
      primaryForeground: "oklch(0.12 0 0)",
      accent: "oklch(0.78 0.16 154 / 0.18)",
      accentForeground: "oklch(0.78 0.16 154)",
    },
  },
  blue: {
    light: {
      primary: "oklch(0.63 0.2 258)",
      primaryForeground: "oklch(0.985 0 0)",
      accent: "oklch(0.95 0.05 258)",
      accentForeground: "oklch(0.39 0.1 258)",
    },
    dark: {
      primary: "oklch(0.74 0.17 258)",
      primaryForeground: "oklch(0.12 0 0)",
      accent: "oklch(0.74 0.17 258 / 0.18)",
      accentForeground: "oklch(0.74 0.17 258)",
    },
  },
  purple: {
    light: {
      primary: "oklch(0.63 0.24 300)",
      primaryForeground: "oklch(0.985 0 0)",
      accent: "oklch(0.95 0.06 300)",
      accentForeground: "oklch(0.4 0.14 300)",
    },
    dark: {
      primary: "oklch(0.72 0.22 300)",
      primaryForeground: "oklch(0.12 0 0)",
      accent: "oklch(0.72 0.22 300 / 0.18)",
      accentForeground: "oklch(0.72 0.22 300)",
    },
  },
  pink: {
    light: {
      primary: "oklch(0.66 0.22 355)",
      primaryForeground: "oklch(0.985 0 0)",
      accent: "oklch(0.95 0.06 355)",
      accentForeground: "oklch(0.42 0.13 355)",
    },
    dark: {
      primary: "oklch(0.75 0.19 355)",
      primaryForeground: "oklch(0.12 0 0)",
      accent: "oklch(0.75 0.19 355 / 0.18)",
      accentForeground: "oklch(0.75 0.19 355)",
    },
  },
  orange: {
    light: {
      primary: "oklch(0.72 0.18 55)",
      primaryForeground: "oklch(0.14 0 0)",
      accent: "oklch(0.95 0.05 55)",
      accentForeground: "oklch(0.47 0.12 55)",
    },
    dark: {
      primary: "oklch(0.79 0.16 55)",
      primaryForeground: "oklch(0.12 0 0)",
      accent: "oklch(0.79 0.16 55 / 0.18)",
      accentForeground: "oklch(0.79 0.16 55)",
    },
  },
  red: {
    light: {
      primary: "oklch(0.65 0.22 25)",
      primaryForeground: "oklch(0.985 0 0)",
      accent: "oklch(0.95 0.05 25)",
      accentForeground: "oklch(0.42 0.14 25)",
    },
    dark: {
      primary: "oklch(0.75 0.18 25)",
      primaryForeground: "oklch(0.12 0 0)",
      accent: "oklch(0.75 0.18 25 / 0.18)",
      accentForeground: "oklch(0.75 0.18 25)",
    },
  },
}

function isAccentColor(value: string | null): value is AccentColor {
  return value === "green" || value === "blue" || value === "purple" || value === "pink" || value === "orange" || value === "red"
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") {
    return "dark"
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement
  root.classList.remove("dark", "light")
  root.classList.add(theme)
  root.style.colorScheme = theme
}

function applyAccent(accentColor: AccentColor, theme: ResolvedTheme) {
  const root = document.documentElement
  const tokens = ACCENT_PALETTES[accentColor][theme]

  root.style.setProperty("--primary", tokens.primary)
  root.style.setProperty("--primary-foreground", tokens.primaryForeground)
  
  // Create a darker variant for active state backgrounds
  root.style.setProperty("--primary-dark", `oklch(from ${tokens.primary} calc(l - 0.2) c h)`)

  root.style.setProperty("--accent", tokens.accent)
  root.style.setProperty("--accent-foreground", tokens.accentForeground)
  root.style.setProperty("--ring", tokens.primary)
  root.style.setProperty("--sidebar-primary", tokens.primary)
  root.style.setProperty("--sidebar-primary-foreground", tokens.primaryForeground)
  root.style.setProperty("--sidebar-accent", tokens.accent)
  root.style.setProperty("--sidebar-accent-foreground", tokens.accentForeground)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") return "dark"
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (storedTheme === "dark" || storedTheme === "light" || storedTheme === "system") return storedTheme
    return "system"
  })
  const [accentColor, setAccentColor] = useState<AccentColor>(() => {
    if (typeof window === "undefined") return "red"
    const storedAccent = window.localStorage.getItem(ACCENT_STORAGE_KEY)
    return isAccentColor(storedAccent) ? storedAccent : "red"
  })
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => getSystemTheme())

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const syncTheme = () => {
      const nextResolvedTheme = theme === "system" ? getSystemTheme() : theme
      setResolvedTheme(nextResolvedTheme)
      applyTheme(nextResolvedTheme)
      applyAccent(accentColor, nextResolvedTheme)
    }
    syncTheme()
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    window.localStorage.setItem(ACCENT_STORAGE_KEY, accentColor)
    mediaQuery.addEventListener("change", syncTheme)
    return () => mediaQuery.removeEventListener("change", syncTheme)
  }, [accentColor, theme])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, accentColor, setTheme, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme must be used within a ThemeProvider")
  return context
}