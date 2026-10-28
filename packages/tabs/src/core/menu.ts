import type { Pane } from "./pane";
import type { Tab } from "@pane-system/contracts";
export function showTabMenu(pane: Pane, tab: Tab, x: number, y: number) {
  const dialog = document.createElement("dialog");
  dialog.className = "pane-tab-menu";
  const pinned = pane.isPinned(tab.id);
  const sticky = pane.isSticky(tab.id);
  const items = [
    {
      title: pinned ? "Use as preview" : "Keep open",
      run: () => pane.setPinned(tab.id, !pinned),
    },
    {
      title: sticky ? "Unpin from start" : "Pin to start",
      run: () => pane.setSticky(tab.id, !sticky),
    },
    { title: "Close tab", run: () => void pane.closeTab(tab.id) },
  ];
  for (const item of items) {
    const button = document.createElement("button");
    button.textContent = item.title;
    button.onclick = () => {
      dialog.close();
      item.run();
    };
    dialog.append(button);
  }
  document.body.append(dialog);
  dialog.showModal();
  dialog.style.left =
    Math.min(x, window.innerWidth - dialog.offsetWidth - 8) + "px";
  dialog.style.top =
    Math.min(y, window.innerHeight - dialog.offsetHeight - 8) + "px";
  dialog.onclose = () => dialog.remove();
  const buttons = [...dialog.querySelectorAll("button")];
  let selected = 0;
  dialog.onkeydown = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      selected =
        (selected + (event.key === "ArrowDown" ? 1 : buttons.length - 1)) %
        buttons.length;
      buttons[selected].focus();
    }
  };
  dialog.onclick = (event) => {
    if (event.target === dialog) dialog.close();
  };
  buttons[0].focus();
}
