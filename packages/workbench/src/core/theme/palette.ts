import { PATTERN } from "../patterns";
export type ThemeMode = "dark" | "light";
export interface ThemePalette {
  frame: string;
  surface: string;
  editor: string;
  text: string;
  muted: string;
  accent: string;
  raised: string;
  active: string;
  field: string;
}
export interface ThemeSettings {
  mode: ThemeMode;
  colors: Partial<ThemePalette>;
}
export const THEME_PALETTES: Record<ThemeMode, ThemePalette> = {
  dark: {
    frame: "#d05c39",
    surface: "#191a1b",
    editor: "#121314",
    text: "#cccccc",
    muted: "#949596",
    accent: "#287e9f",
    raised: "#212223",
    active: "#2b2c2d",
    field: "#252627",
  },
  light: {
    frame: "#d05c39",
    surface: "#f6f6f6",
    editor: "#ffffff",
    text: "#333333",
    muted: "#626365",
    accent: "#287e9f",
    raised: "#ececec",
    active: "#e0e1e2",
    field: "#eeeeee",
  },
};
export const THEME_FIELDS = [
  ["frame", "Frame"],
  ["accent", "Accent"],
  ["surface", "Pane background"],
  ["editor", "Editor background"],
  ["text", "Text"],
  ["muted", "Icons and secondary text"],
] as const;
export function resolveTheme(settings: ThemeSettings): ThemePalette {
  return { ...THEME_PALETTES[settings.mode], ...settings.colors };
}
export function readTheme(value: unknown): ThemeSettings {
  const result: ThemeSettings = { mode: "dark", colors: {} };
  if (!value || typeof value !== "object") return result;
  if ("mode" in value && value.mode === "light") result.mode = "light";
  if ("colors" in value && value.colors && typeof value.colors === "object") {
    for (const key of Object.keys(
      THEME_PALETTES.dark,
    ) as (keyof ThemePalette)[]) {
      const color = (value.colors as Record<string, unknown>)[key];
      if (typeof color === "string" && PATTERN.THEME_HEX_COLOR.test(color))
        result.colors[key] = color;
    }
  }
  return result;
}
