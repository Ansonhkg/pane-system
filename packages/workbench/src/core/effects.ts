import type { PaneLayout } from "@pane-system/layout";
import type { Pane } from "@pane-system/tabs";
export function installWorkbenchEffects(options: {
  active(): Pane;
  layout(): PaneLayout<Pane> | undefined;
  panes: Map<string, Pane>;
  split(pane: Pane, vertical: boolean): void;
  save(): void;
  status?(message: string): void;
}) {
  const keyboard = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      clearDrop();
      return;
    }
    if (!(event.metaKey || event.ctrlKey)) return;
    const active = options.active();
    if (event.key === "\\") {
      event.preventDefault();
      options.split(active, event.shiftKey);
    }
    if (event.key === "s") {
      event.preventDefault();
      void active.tabs
        .find((t) => t.id === active.active)
        ?.content.save?.()
        .catch((error: unknown) => options.status?.(String(error)));
    }
    if (event.altKey && event.key.startsWith("Arrow")) {
      event.preventDefault();
      const layout = options.layout();
      const size = layout?.engine.getViewSize(active);
      if (!size || !layout) return;
      let delta = 20;
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") delta = -20;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight")
        layout.engine.resizeView(active, { width: size.width + delta });
      else layout.engine.resizeView(active, { height: size.height + delta });
      options.save();
    }
  };
  function clearDrop() {
    for (const pane of options.panes.values()) delete pane.element.dataset.drop;
  }
  window.addEventListener("keydown", keyboard);
  window.addEventListener("dragend", clearDrop);
  return {
    dispose() {
      window.removeEventListener("keydown", keyboard);
      window.removeEventListener("dragend", clearDrop);
    },
  };
}
