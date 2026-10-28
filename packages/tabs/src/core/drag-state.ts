import { applyDragImage, isMacintosh } from "@pane-system/upstream/chrome";
import type { Pane } from "./pane";
import type { Tab } from "@pane-system/contracts";
export const TAB_TRANSFER = "application/x-pane-tab";
export interface TabTransfer {
  tab: string;
  pane: string;
}
let active: { pane: Pane; tab: Tab; element: HTMLElement } | undefined;
const clearers = new Set<() => void>();
export function startTabDrag(
  event: DragEvent,
  pane: Pane,
  tab: Tab,
  element: HTMLElement,
) {
  clearTabDrag();
  active = { pane, tab, element };
  event.dataTransfer?.setData(
    TAB_TRANSFER,
    JSON.stringify({ tab: tab.id, pane: pane.id }),
  );
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "copyMove";
  element.classList.add("dragged");
  element.ownerDocument.documentElement.classList.add("pane-tab-dragging");
  applyDragImage(event, element, tab.title);
}
export function isTabDrag(event: DragEvent) {
  return event.dataTransfer?.types.includes(TAB_TRANSFER) ?? false;
}
export function readTabDrag(event: DragEvent): TabTransfer | undefined {
  if (active) return { tab: active.tab.id, pane: active.pane.id };
  try {
    const data: unknown = JSON.parse(
      event.dataTransfer?.getData(TAB_TRANSFER) ?? "null",
    );
    if (
      data &&
      typeof data === "object" &&
      "tab" in data &&
      "pane" in data &&
      typeof data.tab === "string" &&
      typeof data.pane === "string"
    )
      return { tab: data.tab, pane: data.pane };
  } catch {}
}
export function isCopyDrag(event: DragEvent) {
  return isMacintosh ? event.altKey : event.ctrlKey;
}
export function splitsEnabled(event: DragEvent) {
  return !(isMacintosh ? event.shiftKey : event.altKey);
}
export function isSingleSelfDrop(pane: Pane, event: DragEvent) {
  return active?.pane === pane && pane.tabs.length < 2 && !isCopyDrag(event);
}
export function pinDragSource() {
  if (active) active.pane.setPinned(active.tab.id, true);
}
export function clearDropFeedback() {
  for (const clear of clearers) clear();
}
export function clearTabDrag() {
  active?.element.classList.remove("dragged");
  active?.element.ownerDocument.documentElement.classList.remove(
    "pane-tab-dragging",
  );
  active = undefined;
  clearDropFeedback();
}
const documents = new WeakMap<Document, { count: number; dispose(): void }>();
export function registerDragFeedback(document: Document, clear: () => void) {
  clearers.add(clear);
  let entry = documents.get(document);
  if (!entry) {
    const window = document.defaultView!;
    const ended = () => clearTabDrag();
    const cancelled = (event: KeyboardEvent) => {
      if (event.key === "Escape") clearTabDrag();
    };
    window.addEventListener("dragend", ended);
    window.addEventListener("drop", ended);
    window.addEventListener("keydown", cancelled);
    window.addEventListener("blur", clearDropFeedback);
    entry = {
      count: 0,
      dispose() {
        window.removeEventListener("dragend", ended);
        window.removeEventListener("drop", ended);
        window.removeEventListener("keydown", cancelled);
        window.removeEventListener("blur", clearDropFeedback);
      },
    };
    documents.set(document, entry);
  }
  const registered = entry;
  registered.count++;
  return {
    dispose() {
      clearers.delete(clear);
      clear();
      if (--registered.count === 0) {
        registered.dispose();
        documents.delete(document);
      }
    },
  };
}
