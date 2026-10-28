import { activatePane } from "./activate";
import { createDropAction } from "./drop";
import type { WorkbenchOptions } from "./options";
export type { WorkbenchOptions } from "./options";
import { createContext } from "./context";
import { restoreWorkbenchState } from "./state";
import { installWorkbenchEffects } from "./effects";
import {
  createLayout,
  Direction,
  type PaneLayout,
  type SerializedGrid,
} from "@pane-system/layout";
import { Pane, type PaneActions } from "@pane-system/tabs";
import type { PaneExtension, Tab } from "@pane-system/contracts";
import { createCommands } from "./commands";
export function createWorkbench(options: WorkbenchOptions) {
  options.container.classList.add("monaco-workbench", "monaco-enable-motion");
  const panes = new Map<string, Pane>();
  const extensions = new Map<string, PaneExtension>();
  const context = options.context ?? createContext();
  const commands = createCommands(options.status, context);
  let layout: PaneLayout<Pane> | undefined;
  let active: Pane;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  let restoring = false;
  const key = options.storageKey ?? "pane-layout-v1";
  function save() {
    if (disposed || restoring || !layout) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        options.storage?.write(key, layout?.serialize());
      } catch (error) {
        options.status?.(String(error));
      }
    }, 180);
  }
  function activate(pane: Pane) {
    active = pane;
    activatePane(pane, panes, context);
  }
  function createPane(id: string = crypto.randomUUID()) {
    const pane = new Pane(id, actions);
    panes.set(id, pane);
    for (const item of panes.values()) item.refresh();
    context.set("pane.count", panes.size);
    return pane;
  }
  function split(reference = active, vertical = false) {
    const pane = createPane();
    pane.setZoom(reference.zoom);
    layout?.split(pane, reference, vertical ? Direction.Down : Direction.Right);
    activate(pane);
    save();
    return pane;
  }
  function close(pane: Pane) {
    if (panes.size === 1) return;
    const target = [...panes.values()].find((p) => p !== pane);
    if (!target) return;
    for (const tab of [...pane.tabs]) {
      pane.take(tab.id);
      target.open(tab);
    }
    layout?.remove(pane);
    panes.delete(pane.id);
    for (const item of panes.values()) item.refresh();
    context.set("pane.count", panes.size);
    pane.dispose();
    activate(target);
    save();
  }
  function move(tabId: string, from: string, to: string, index?: number) {
    const source = panes.get(from);
    const target = panes.get(to);
    if (!source || !target) return;
    const tab = source.take(tabId);
    if (!tab) return;
    target.open(tab, index);
    activate(target);
    if (!source.tabs.length && source !== target) close(source);
    activate(target);
    save();
  }
  const actions: PaneActions = {
    activate,
    split,
    close,
    move,
    changed: save,
    canClose: () => panes.size > 1,
    drop: createDropAction({
      panes,
      layout: () => layout,
      createPane,
      move,
      open,
      status: options.status,
    }),
  };
  active = createPane("main");
  function initialize(saved?: SerializedGrid) {
    layout = createLayout({
      container: options.container,
      initial: active,
      saved,
      revive(value) {
        if (
          !value ||
          typeof value !== "object" ||
          !("id" in value) ||
          typeof value.id !== "string"
        )
          throw new Error("Invalid pane state.");
        return panes.get(value.id) ?? createPane(value.id);
      },
    });
    activate(active);
  }
  function register(extension: PaneExtension) {
    if (extensions.has(extension.id))
      throw new Error("Duplicate pane extension: " + extension.id);
    extensions.set(extension.id, extension);
    return {
      dispose() {
        extensions.delete(extension.id);
      },
    };
  }
  async function open(
    kind: string,
    resource?: string,
    pane = active,
    state?: unknown,
    id: string = crypto.randomUUID(),
    title?: string,
    pinned = true,
  ) {
    const extension = extensions.get(kind);
    if (!extension) throw new Error("Unknown pane extension: " + kind);
    if (resource) {
      const existing = pane.tabs.find(
        (t) =>
          t.kind === kind &&
          t.resource === resource &&
          (kind !== "diff" ||
            JSON.stringify(t.content.serialize?.()) === JSON.stringify(state)),
      );
      if (existing) {
        if (pinned && !pane.isPinned(existing.id))
          pane.setPinned(existing.id, true);
        pane.select(existing.id);
        activate(pane);
        return existing;
      }
    }
    const content = await extension.create({ resource, state });
    if (disposed) {
      content.dispose();
      throw new Error("Workbench is closed.");
    }
    const tab: Tab = {
      id,
      kind,
      resource,
      pinned,
      title: title ?? resource?.split("/").at(-1) ?? extension.title,
      content,
    };
    pane.open(tab);
    activate(pane);
    save();
    return tab;
  }
  async function restore(defaultLayout?: SerializedGrid) {
    restoring = true;
    try {
      return await restoreWorkbenchState({
        saved: options.storage?.read(key) ?? defaultLayout,
        panes,
        initialize,
        open,
        hasExtension: (kind) => extensions.has(kind),
        activate,
        reset(error) {
          options.status?.("Layout restore failed: " + String(error));
          layout?.dispose();
          for (const pane of panes.values()) pane.dispose();
          panes.clear();
          active = createPane("main");
          initialize();
        },
      });
    } finally {
      restoring = false;
      save();
    }
  }
  const effects = installWorkbenchEffects({
    active: () => active,
    layout: () => layout,
    panes,
    split,
    save,
    status: options.status,
  });
  return {
    panes,
    context,
    commands,
    register,
    open,
    split,
    close,
    move,
    restore,
    get active() {
      return active;
    },
    get layout() {
      return layout;
    },
    refresh() {
      for (const pane of panes.values()) pane.refresh();
      context.set(
        "pane.dirty",
        active.tabs.some((t) => t.content.dirty),
      );
      save();
    },
    save,
    dispose() {
      disposed = true;
      clearTimeout(timer);
      effects.dispose();
      commands.dispose();
      if (!options.context) context.dispose();
      for (const pane of panes.values()) pane.dispose();
      layout?.dispose();
    },
  };
}
export type Workbench = ReturnType<typeof createWorkbench>;
