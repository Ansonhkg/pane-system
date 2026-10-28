import type { TreeSettings, TreeSettingsPort } from "../../core/tree-settings";
export const TREE_GUIDE_STYLES = {
  treeIndentGuidesStroke: "var(--vscode-tree-indentGuidesStroke, #585858)",
  treeInactiveIndentGuidesStroke:
    "var(--vscode-tree-inactiveIndentGuidesStroke, #58585866)",
};
export const defaultTreeSettings: TreeSettings = {
  openMode: "singleClick",
  multiSelectModifier: "default",
  expandMode: "singleClick",
  compactFolders: true,
  autoReveal: true,
};
export function treeSettingsValue(port?: TreeSettingsPort): TreeSettings {
  return port?.get() ?? defaultTreeSettings;
}
export function selectionController(port?: TreeSettingsPort) {
  return {
    isSelectionSingleChangeEvent({
      browserEvent,
    }: {
      browserEvent: MouseEvent;
    }) {
      if (treeSettingsValue(port).multiSelectModifier === "alt")
        return browserEvent.altKey && !browserEvent.shiftKey;
      return (
        (navigator.platform.toLowerCase().includes("mac")
          ? browserEvent.metaKey
          : browserEvent.ctrlKey) && !browserEvent.shiftKey
      );
    },
    isSelectionRangeChangeEvent({
      browserEvent,
    }: {
      browserEvent: MouseEvent;
    }) {
      return browserEvent.shiftKey;
    },
  };
}
