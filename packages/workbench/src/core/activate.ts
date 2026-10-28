import type { Pane } from "@pane-system/tabs";
import type { Context } from "./context";
export function activatePane(
  pane: Pane,
  panes: Map<string, Pane>,
  context: Context,
) {
  const tab = pane.tabs.find((item) => item.id === pane.active);
  context.set("pane.id", pane.id);
  context.set("pane.kind", tab?.kind ?? null);
  context.set("pane.count", panes.size);
  context.set("pane.resource", tab?.resource);
  for (const item of panes.values())
    item.element.dataset.focused = String(item === pane);
}
