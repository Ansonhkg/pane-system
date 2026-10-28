import type { Workbench } from "@pane-system/workbench";
export function installViewNavigation(
  workbench: Workbench,
  status: HTMLElement,
) {
  async function show(kind: string) {
    for (const pane of workbench.panes.values()) {
      const tab = pane.tabs.find((item) => item.kind === kind);
      if (tab) {
        workbench.layout?.engine.setViewVisible(pane, true);
        pane.select(tab.id);
        tab.content.focus?.();
        return;
      }
    }
    const pane = workbench.panes.get("files") ?? workbench.active;
    workbench.layout?.engine.setViewVisible(pane, true);
    const tab = await workbench.open(kind, undefined, pane);
    tab.content.focus?.();
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "[data-view]",
  )) {
    button.onclick = () => {
      const kind = button.dataset.view;
      if (kind)
        void show(kind).catch((error: unknown) => {
          status.textContent = String(error);
        });
    };
  }
  workbench.commands.register({
    id: "view.search",
    title: "Search in files",
    keybinding: "mod+shift+f",
    shortcut: "⌘ ⇧ F",
    run: () => show("search"),
  });
}
