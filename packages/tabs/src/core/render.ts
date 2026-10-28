import { installTabDrag } from "./tab-drag";
import { createActionBar } from "@pane-system/layout";
import { setFileIcon } from "@pane-system/contracts/file-icons";
import { setIcon } from "@pane-system/contracts/icons";
import type { Pane } from "./pane";
import { showTabMenu } from "./menu";
const closeActions = new WeakMap<Pane, { dispose(): void }[]>();
export function disposePaneTabs(pane: Pane) {
  closeActions.get(pane)?.forEach((bar) => bar.dispose());
  closeActions.delete(pane);
}
export function renderPaneTabs(pane: Pane) {
  disposePaneTabs(pane);
  const actions: { dispose(): void }[] = [];
  closeActions.set(pane, actions);
  pane.tablist.replaceChildren();
  pane.element.dataset.kind =
    pane.tabs.find((tab) => tab.id === pane.active)?.kind ?? "empty";
  for (const tab of pane.tabs) {
    const item = document.createElement("div");
    item.className = "tab";
    item.dataset.tabId = tab.id;
    item.dataset.kind = tab.kind;
    item.title = tab.title;
    item.dataset.active = String(tab.id === pane.active);
    item.draggable = true;
    item.dataset.preview = String(!pane.isPinned(tab.id));
    item.dataset.sticky = String(pane.isSticky(tab.id));
    item.ondblclick = () => pane.setPinned(tab.id, true);
    item.oncontextmenu = (event) => {
      event.preventDefault();
      showTabMenu(pane, tab, event.clientX, event.clientY);
    };
    const button = document.createElement("button");
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(tab.id === pane.active));
    button.textContent = tab.title + (tab.content.dirty ? " •" : "");
    button.onclick = () => pane.select(tab.id);
    button.onkeydown = (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const i = pane.tabs.indexOf(tab);
      const next =
        pane.tabs[
          (i + (e.key === "ArrowRight" ? 1 : pane.tabs.length - 1)) %
            pane.tabs.length
        ];
      pane.select(next.id);
      pane.tablist
        .querySelector<HTMLButtonElement>('[aria-selected="true"]')
        ?.focus();
    };
    const close = document.createElement("div");
    close.className = "tab-actions";
    actions.push(
      createActionBar(
        close,
        [
          {
            id: "tab.close." + tab.id,
            title: "Close " + tab.title,
            icon: "close",
            run: () => pane.closeTab(tab.id),
          },
        ],
        "Tab actions",
      ),
    );
    const icon = document.createElement("span");
    icon.className = "tab-kind-icon";
    const names = {
      explorer: "file",
      "source-control": "branch",
      terminal: "terminal",
      output: "doc",
      problems: "error",
      context: "remote",
    } as const;
    if (tab.kind in names) setIcon(icon, names[tab.kind as keyof typeof names]);
    else {
      icon.className += " file-icon";
      setFileIcon(icon, tab.resource ?? tab.title);
    }
    button.prepend(icon);
    button.setAttribute("aria-label", tab.title);
    item.append(button, close);
    actions.push(installTabDrag(pane, tab, item));
    pane.tablist.append(item);
    tab.content.element.hidden = tab.id !== pane.active;
  }
}

export function sameTabNodes(pane: Pane) {
  return (
    pane.tablist.children.length === pane.tabs.length &&
    pane.tabs.every(
      (tab, i) =>
        (pane.tablist.children[i] as HTMLElement).dataset.tabId === tab.id,
    )
  );
}
export function refreshPaneTabs(pane: Pane) {
  pane.element.dataset.kind =
    pane.tabs.find((tab) => tab.id === pane.active)?.kind ?? "empty";
  for (const [i, tab] of pane.tabs.entries()) {
    const item = pane.tablist.children[i] as HTMLElement;
    if (item) {
      item.dataset.active = String(tab.id === pane.active);
      item.dataset.preview = String(!pane.isPinned(tab.id));
      item.dataset.sticky = String(pane.isSticky(tab.id));
      item
        .querySelector('[role="tab"]')
        ?.setAttribute("aria-selected", String(tab.id === pane.active));
    }
  }
  const buttons =
    pane.tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]');
  for (const [i, tab] of pane.tabs.entries()) {
    const button = buttons[i];
    if (button?.lastChild?.nodeType === Node.TEXT_NODE)
      button.lastChild.textContent =
        tab.title + (tab.content.dirty ? " •" : "");
  }
}
