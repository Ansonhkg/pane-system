import { setFileIcon } from "@pane-system/contracts/file-icons";
import { setIcon } from "@pane-system/contracts/icons";
import type { Change } from "@pane-system/contracts";
import type { ChangeNode } from "./tree-model";
export function renderChangeRow(
  node: ChangeNode,
  row: HTMLDivElement,
  options: {
    stage(change: Change): void;
    openFile?(change: Change): void;
    discard?(change: Change): void;
  },
) {
  row.replaceChildren();
  if (node.change) {
    const icon = document.createElement("span");
    icon.className = "file-icon";
    setFileIcon(icon, node.name);
    row.append(icon);
  }
  const name = document.createElement("span");
  name.className = "scm-tree-name";
  name.textContent = node.name;
  row.append(name);
  if (!node.change) return;
  const change = node.change;
  const actions = document.createElement("span");
  actions.className = "scm-row-actions";
  function button(
    label: string,
    icon: "open" | "trash" | "plus" | "minus",
    action: () => void,
    enabled: boolean,
  ) {
    const control = document.createElement("button");
    if (icon === "minus") control.textContent = "−";
    else setIcon(control, icon);
    control.title = label;
    control.setAttribute("aria-label", label);
    control.disabled = !enabled;
    control.onclick = (event) => {
      event.stopPropagation();
      action();
    };
    actions.append(control);
  }
  button(
    "Open file " + change.path,
    "open",
    () => options.openFile?.(change),
    !!options.openFile,
  );
  button(
    "Discard changes " + change.path,
    "trash",
    () => options.discard?.(change),
    !!options.discard,
  );
  button(
    (change.staged ? "Unstage " : "Stage ") + change.path,
    change.staged ? "minus" : "plus",
    () => options.stage(change),
    true,
  );
  const status = document.createElement("small");
  status.textContent = change.status;
  row.append(actions, status);
  row.title = change.path;
}
