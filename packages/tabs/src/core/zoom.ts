import {
  enableActionMenuKeys,
  showActionMenu,
} from "@pane-system/contracts/dialogs";
import type { Pane } from "./pane";
export const PANE_ZOOM_LIMITS = {
  minimum: 0.5,
  maximum: 2,
  step: 0.1,
} as const;
export function createPaneZoom(pane: Pane, changed: () => void) {
  let value = 1;
  let dialog: HTMLDialogElement | undefined;
  function set(next: number) {
    if (!Number.isFinite(next)) return;
    const bounded = Math.min(
      PANE_ZOOM_LIMITS.maximum,
      Math.max(PANE_ZOOM_LIMITS.minimum, next),
    );
    if (bounded === value) return;
    value = Math.round(bounded * 100) / 100;
    pane.element.dataset.zoom = String(value);
    changed();
  }
  function keydown(event: KeyboardEvent) {
    if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
    if (!["+", "=", "-", "0"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    set(event.key === "0" ? 1 : value + (event.key === "-" ? -0.1 : 0.1));
  }
  pane.element.addEventListener("keydown", keydown, true);
  return {
    get value() {
      return value;
    },
    set,
    layout() {
      pane.body.style.zoom = String(value);
      pane.body.style.width = pane.element.clientWidth / value + "px";
      pane.body.style.height =
        Math.max(0, pane.element.clientHeight - pane.header.offsetHeight) /
          value +
        "px";
    },
    show() {
      dialog?.remove();
      dialog = document.createElement("dialog");
      dialog.className = "pane-tab-menu pane-zoom-menu";
      dialog.setAttribute("aria-label", "Pane zoom");
      const title = document.createElement("strong");
      title.textContent = "Pane zoom · " + Math.round(value * 100) + "%";
      dialog.append(title);
      const update = (next: number) => {
        set(next);
        slider.value = String(value * 100);
        title.textContent = "Pane zoom · " + Math.round(value * 100) + "%";
      };
      for (const [name, next] of [
        ["Zoom in", () => value + PANE_ZOOM_LIMITS.step],
        ["Zoom out", () => value - PANE_ZOOM_LIMITS.step],
        ["Reset zoom", () => 1],
      ] as const) {
        const button = document.createElement("button");
        button.textContent = name;
        button.onclick = () => update(next());
        dialog.append(button);
      }
      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = "50";
      slider.max = "200";
      slider.step = "10";
      slider.value = String(value * 100);
      slider.setAttribute("aria-label", "Pane zoom percentage");
      slider.oninput = () => update(Number(slider.value) / 100);
      slider.onkeydown = (event) => event.stopPropagation();
      dialog.append(slider);
      enableActionMenuKeys(dialog);
      dialog.addEventListener(
        "keydown",
        (event) => {
          keydown(event);
          update(value);
        },
        true,
      );
      document.body.append(dialog);
      const bounds = pane.header.getBoundingClientRect();
      showActionMenu(dialog, bounds.right - 190, bounds.bottom);
      dialog.onclose = () => {
        dialog?.remove();
        dialog = undefined;
      };
    },
    dispose() {
      pane.element.removeEventListener("keydown", keydown, true);
      dialog?.remove();
    },
  };
}
