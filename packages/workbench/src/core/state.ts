import type { SerializedGrid } from "@pane-system/layout";
import type { Pane } from "@pane-system/tabs";
import type { PaneState, Tab } from "@pane-system/contracts";
type SavedTab = PaneState["tabs"][number];
interface RestoreOptions {
  container: HTMLElement;
  saved: unknown;
  panes: Map<string, Pane>;
  initialize(saved?: SerializedGrid): void;
  create(
    kind: string,
    resource: string | undefined,
    state: unknown,
    id: string,
    title: string,
    pinned: boolean,
  ): Promise<Tab>;
  hasExtension(kind: string): boolean;
  activate(pane: Pane): void;
  reset(error: unknown): void;
}
export async function restoreWorkbenchState(options: RestoreOptions) {
  const visibility = options.container.style.visibility;
  options.container.style.visibility = "hidden";
  options.container.setAttribute("aria-busy", "true");
  try {
    return await restoreState(options);
  } finally {
    options.container.style.visibility = visibility;
    options.container.removeAttribute("aria-busy");
  }
}
async function restoreState(options: RestoreOptions) {
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
    const restored = await Promise.all(
      leaves.map(async (leaf) => ({
        leaf,
        tabs: await Promise.all(
          leaf.tabs.map(async (tab) => {
            try {
              if (!options.hasExtension(tab.kind))
                throw new Error(
                  "Pane extension is not registered: " + tab.kind,
                );
              const loaded = await options.create(
                tab.kind,
                tab.resource,
                tab.state,
                tab.id,
                tab.title,
                tab.pinned !== false,
              );
              loaded.sticky = tab.sticky;
              return loaded;
            } catch (error) {
              return unavailableTab(tab, error);
            }
          }),
        ),
      })),
    );
    for (const { leaf, tabs } of restored) {
      const pane = options.panes.get(leaf.id);
      if (!pane) {
        tabs.forEach((tab) => tab.content.dispose());
        continue;
      }
      if (typeof leaf.zoom === "number") pane.setZoom(leaf.zoom);
      for (const tab of tabs) pane.open(tab);
      if (leaf.active) pane.select(leaf.active);
    }
    await Promise.allSettled(
      [...options.panes.values()].map(
        (pane) =>
          pane.tabs.find((tab) => tab.id === pane.active)?.content.ready,
      ),
    );
    for (const [id, pane] of options.panes) {
      if (id === "main" && !leaves.some((leaf) => leaf.id === id)) {
        options.panes.delete(id);
        pane.dispose();
      }
    }
    const saved = options.saved;
    const activePane =
      "activePane" in saved && typeof saved.activePane === "string"
        ? options.panes.get(saved.activePane)
        : undefined;
    const first =
      activePane ??
      options.panes.get("main") ??
      options.panes.values().next().value;
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
