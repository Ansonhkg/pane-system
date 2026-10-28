import type { SerializedGrid } from "@pane-system/layout";
import type { Pane } from "@pane-system/tabs";
import type { PaneState, Tab } from "@pane-system/contracts";
type SavedTab = PaneState["tabs"][number];
interface RestoreOptions {
  saved: unknown;
  panes: Map<string, Pane>;
  initialize(saved?: SerializedGrid): void;
  open(
    kind: string,
    resource: string | undefined,
    pane: Pane,
    state: unknown,
    id: string,
    title: string,
  ): Promise<Tab>;
  hasExtension(kind: string): boolean;
  activate(pane: Pane): void;
  reset(error: unknown): void;
}
export async function restoreWorkbenchState(options: RestoreOptions) {
  if (!isGrid(options.saved)) {
    options.initialize();
    return false;
  }
  try {
    options.initialize(options.saved);
    const leaves: PaneState[] = [];
    function collect(node: SerializedGrid["root"]) {
      if (node.type === "branch") {
        node.data.forEach(collect);
        return;
      }
      if (isPaneState(node.data)) leaves.push(node.data);
    }
    collect(options.saved.root);
    for (const leaf of leaves) {
      const pane = options.panes.get(leaf.id);
      if (!pane) continue;
      if (typeof leaf.zoom === "number") pane.setZoom(leaf.zoom);
      for (const tab of leaf.tabs) {
        try {
          if (!options.hasExtension(tab.kind))
            throw new Error("Pane extension is not registered: " + tab.kind);
          await options.open(
            tab.kind,
            tab.resource,
            pane,
            tab.state,
            tab.id,
            tab.title,
          );
          pane.setPinned(tab.id, tab.pinned !== false);
          if (tab.sticky) pane.setSticky(tab.id, true);
        } catch (error) {
          pane.open(unavailableTab(tab, error));
        }
      }
      if (leaf.active) pane.select(leaf.active);
    }
    for (const [id, pane] of options.panes) {
      if (id === "main" && !leaves.some((leaf) => leaf.id === id)) {
        options.panes.delete(id);
        pane.dispose();
      }
    }
    const first = options.panes.values().next().value;
    if (first) options.activate(first);
    return true;
  } catch (error) {
    options.reset(error);
    return false;
  }
}
function unavailableTab(tab: SavedTab, error: unknown): Tab {
  const element = document.createElement("div");
  element.className = "unavailable-content";
  element.textContent = String(error);
  return {
    ...tab,
    content: {
      element,
      serialize: () => tab.state,
      dispose() {
        element.remove();
      },
    },
  };
}
function isGrid(value: unknown): value is SerializedGrid {
  return (
    !!value &&
    typeof value === "object" &&
    "root" in value &&
    "orientation" in value &&
    "width" in value &&
    "height" in value
  );
}
function isPaneState(value: unknown): value is PaneState {
  return (
    !!value &&
    typeof value === "object" &&
    "id" in value &&
    typeof value.id === "string" &&
    "tabs" in value &&
    Array.isArray(value.tabs)
  );
}
