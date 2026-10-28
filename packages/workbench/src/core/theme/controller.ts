import type { StoragePort } from "@pane-system/contracts";
import { THEME_STORAGE_KEY } from "./paths";
import { themeContrast } from "./color";
import {
  resolveTheme,
  readTheme,
  type ThemeSettings,
  type ThemePalette,
} from "./palette";
export { resolveTheme, type ThemeSettings, type ThemePalette } from "./palette";
const alias: Record<string, keyof ThemePalette> = {
  "pane-surface": "surface",
  "pane-frame": "frame",
  "pane-text": "text",
  "pane-muted": "muted",
  "pane-accent": "accent",
  "pane-active": "active",
  "pane-raised": "raised",
  "pane-line": "frame",
  line: "frame",
  "pane-chevron-color": "muted",
  "vscode-icon-foreground": "muted",
  "vscode-foreground": "text",
  "vscode-list-hoverBackground": "raised",
  "vscode-list-activeSelectionBackground": "active",
  "vscode-list-activeSelectionForeground": "text",
  "vscode-list-inactiveSelectionBackground": "active",
  "vscode-tab-hoverBackground": "active",
  "vscode-actionBar-toggledBackground": "active",
  "vscode-focusBorder": "accent",
};
export function createThemeController(options: {
  element: HTMLElement;
  storage?: StoragePort;
  storageKey?: string;
  initial?: ThemeSettings;
  changed?(settings: ThemeSettings, palette: ThemePalette): void;
}) {
  const key = options.storageKey ?? THEME_STORAGE_KEY;
  let committed = readTheme(options.storage?.read(key) ?? options.initial);
  let current = committed;
  const listeners = new Set<
    (settings: ThemeSettings, palette: ThemePalette) => void
  >();
  const previous = new Map<string, string>();
  const root = options.element.ownerDocument.documentElement;
  const previousMode = root.dataset.theme;
  const previousScheme = options.element.style.colorScheme;
  function put(name: string, value: string) {
    const property = "--" + name;
    if (!previous.has(property))
      previous.set(property, options.element.style.getPropertyValue(property));
    options.element.style.setProperty(property, value);
  }
  function render(settings: ThemeSettings) {
    current = readTheme(settings);
    const palette = resolveTheme(current);
    root.dataset.theme = current.mode;
    options.element.style.colorScheme = current.mode;
    for (const [name, value] of Object.entries(palette) as [string, string][])
      put(name, value);
    for (const [name, source] of Object.entries(alias))
      put(name, palette[source]);
    put(
      "pane-utility-header",
      "color-mix(in srgb, " + palette.frame + " 80%, white)",
    );
    put("pane-titlebar-foreground", themeContrast(palette.frame).foreground);
    put("pane-utility-foreground", themeContrast(palette.frame).foreground);
    put("pane-accent-foreground", themeContrast(palette.accent).foreground);
    put(
      "vscode-toolbar-hoverBackground",
      current.mode === "dark" ? "#ffffff1a" : "#00000014",
    );
    put(
      "vscode-tree-indentGuidesStroke",
      current.mode === "dark" ? "#585858" : "#a9a9a9",
    );
    put(
      "vscode-tree-inactiveIndentGuidesStroke",
      current.mode === "dark" ? "#58585866" : "#a9a9a966",
    );
    options.changed?.(current, palette);
    for (const listener of listeners) listener(current, palette);
  }
  render(committed);
  return {
    get() {
      return { mode: current.mode, colors: { ...current.colors } };
    },
    preview: render,
    apply(settings: ThemeSettings) {
      const next = readTheme(settings);
      options.storage?.write(key, next);
      committed = next;
      render(committed);
    },
    revert() {
      render(committed);
    },
    subscribe(
      listener: (settings: ThemeSettings, palette: ThemePalette) => void,
    ) {
      listeners.add(listener);
      return {
        dispose() {
          listeners.delete(listener);
        },
      };
    },
    dispose() {
      listeners.clear();
      options.element.style.colorScheme = previousScheme;
      for (const [name, value] of previous) {
        if (value) options.element.style.setProperty(name, value);
        else options.element.style.removeProperty(name);
      }
      if (previousMode) root.dataset.theme = previousMode;
      else delete root.dataset.theme;
    },
  };
}
export type ThemeController = ReturnType<typeof createThemeController>;
