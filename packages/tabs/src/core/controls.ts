import { createActionBar } from "@pane-system/layout";
import type { Pane, PaneActions } from "./pane";
export function paneControls(
  container: HTMLElement,
  pane: Pane,
  actions: PaneActions,
) {
  return createActionBar(container, [
    {
      id: "pane.zoom",
      title: "Pane zoom (100%)",
      icon: "zoom-in",
      run: () => pane.showZoomMenu(),
    },
    {
      id: "pane.splitRight",
      title: "Split right",
      icon: "split-horizontal",
      run: () => actions.split(pane, false),
    },
    {
      id: "pane.splitDown",
      title: "Split down",
      icon: "split-vertical",
      run: () => actions.split(pane, true),
    },
    {
      id: "pane.close",
      title: "Close pane",
      icon: "close",
      run: () => actions.close(pane),
    },
  ]);
}
