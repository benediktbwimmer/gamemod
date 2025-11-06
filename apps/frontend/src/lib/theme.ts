type ThemeConfig = {
  primary: string;
  surface: string;
  surfaceMuted: string;
  surfaceSubtle: string;
  backgroundAccentOne: string;
  backgroundAccentTwo: string;
};

const STORAGE_KEY = "gamemod.theme";

export const defaultTheme: ThemeConfig = {
  primary: "#6366f1",
  surface: "#101225",
  surfaceMuted: "#1b1e3b",
  surfaceSubtle: "#2a2e5c",
  backgroundAccentOne: "#1f2353",
  backgroundAccentTwo: "#2f347a"
};

function hexToRgbTuple(hex: string): string {
  const sanitized = hex.replace("#", "");
  const bigint = Number.parseInt(sanitized.length === 3 ? sanitized.repeat(2) : sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r} ${g} ${b}`;
}

function hexToRelativeLuminance(hex: string): number {
  const rgb = hexToRgbTuple(hex)
    .split(" ")
    .map((value) => Number.parseInt(value, 10) / 255)
    .map((channel) =>
      channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
    );

  const [r, g, b] = rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function idealForeground(hex: string): string {
  const luminance = hexToRelativeLuminance(hex);
  return luminance > 0.5 ? "17 24 39" : "255 255 255";
}

export function applyTheme(theme: ThemeConfig): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;

  root.style.setProperty("--color-primary", hexToRgbTuple(theme.primary));
  root.style.setProperty(
    "--color-primary-foreground",
    idealForeground(theme.primary)
  );
  root.style.setProperty("--color-surface", hexToRgbTuple(theme.surface));
  root.style.setProperty(
    "--color-surface-muted",
    hexToRgbTuple(theme.surfaceMuted)
  );
  root.style.setProperty(
    "--color-surface-subtle",
    hexToRgbTuple(theme.surfaceSubtle)
  );

  if (typeof document !== "undefined") {
    document.documentElement.style.setProperty("--bg-accent-1", theme.backgroundAccentOne);
    document.documentElement.style.setProperty("--bg-accent-2", theme.backgroundAccentTwo);
  }
}

export function loadTheme(): ThemeConfig {
  if (typeof window === "undefined") {
    return defaultTheme;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return defaultTheme;
    }
    const parsed = JSON.parse(stored) as ThemeConfig;
    return {
      ...defaultTheme,
      ...parsed
    };
  } catch {
    return defaultTheme;
  }
}

export type { ThemeConfig };
