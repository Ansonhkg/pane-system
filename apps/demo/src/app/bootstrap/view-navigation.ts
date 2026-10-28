import type { Workbench } from "@pane-system/workbench";
export function installViewNavigation(
  workbench: Workbench,
  status: HTMLElement,
) {
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "[data-view]",
  )) {
    button.onclick = () => {
      const kind = button.dataset.view;
      if (kind) {
        for (const pane of workbench.panes.values()) {
          const tab = pane.tabs.find((t) => t.kind === kind);
          if (tab) {
            pane.select(tab.id);
            tab.content.focus?.();
            return;
          }
        }
      }
      if (kind)
        void workbench.open(kind).catch((error: unknown) => {
          status.textContent = String(error);
        });
    };
  }
}
