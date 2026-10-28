export interface TreeSettings {
  openMode: "singleClick" | "doubleClick";
  multiSelectModifier: "default" | "alt";
  expandMode: "singleClick" | "doubleClick";
  compactFolders: boolean;
  autoReveal: boolean;
}
export interface TreeSettingsPort {
  get(): TreeSettings;
  subscribe(listener: (settings: TreeSettings) => void): { dispose(): void };
  show(): void;
}
