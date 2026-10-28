import { DragAndDropObserver } from "@pane-system/upstream/chrome";
import { NativeDropGeometry } from "@pane-system/upstream/drop";
import {
  clearDropFeedback,
  clearTabDrag,
  isTabDrag,
  readTabDrag,
  isCopyDrag,
  splitsEnabled,
  isSingleSelfDrop,
  pinDragSource,
  registerDragFeedback,
} from "./drag-state";
import type { Pane } from "./pane";
const edges = ["up", "down", "left", "right"] as const;
export function installPaneDrop(pane: Pane) {
  let container: HTMLElement | undefined;
  let geometry: NativeDropGeometry | undefined;
  function clear() {
    container?.remove();
    container = undefined;
    geometry = undefined;
    pane.element.classList.remove("dragged-over");
    delete pane.element.dataset.drop;
  }
  const registered = registerDragFeedback(pane.element.ownerDocument, clear);
  function position(event: DragEvent) {
    if (!isTabDrag(event)) return;
    const bounds = pane.body.getBoundingClientRect();
    if (event.clientY < bounds.top || isSingleSelfDrop(pane, event)) {
      clear();
      return;
    }
    if (!container) {
      clearDropFeedback();
      container = document.createElement("div");
      container.id = "monaco-workbench-editor-drop-overlay";
      container.style.top = pane.header.offsetHeight + "px";
      const indicator = document.createElement("div");
      indicator.className = "editor-group-overlay-indicator";
      indicator.style.backgroundColor =
        "var(--vscode-editorGroup-dropBackground, rgba(83,89,93,0.5))";
      container.append(indicator);
      pane.element.append(container);
      pane.element.classList.add("dragged-over");
      geometry = new NativeDropGeometry(
        pane.element,
        container,
        indicator,
        pane.header.offsetHeight,
      );
    }
    geometry!.positionOverlay(
      event.clientX - bounds.left,
      event.clientY - bounds.top,
      false,
      splitsEnabled(event),
    );
    const direction = geometry!.currentDropOperation?.splitDirection;
    pane.element.dataset.drop =
      direction === undefined ? "center" : edges[direction];
    if (event.dataTransfer)
      event.dataTransfer.dropEffect = isCopyDrag(event) ? "copy" : "move";
  }
  const observer = new DragAndDropObserver(pane.element, {
    onDragEnter: position,
    onDragOver: position,
    onDragLeave: clear,
    onDragEnd: clearTabDrag,
    onDrop(event) {
      const data = readTabDrag(event);
      if (!data) return;
      event.preventDefault();
      event.stopPropagation();
      const bounds = pane.body.getBoundingClientRect();
      if (event.clientY < bounds.top) {
        pinDragSource();
        clearTabDrag();
        pane.actions.drop(
          data.tab,
          data.pane,
          pane,
          "center",
          isCopyDrag(event),
          pane.tabs.length,
        );
        return;
      }
      if (isSingleSelfDrop(pane, event)) {
        clearTabDrag();
        return;
      }
      position(event);
      const edge = pane.element.dataset.drop ?? "center";
      pinDragSource();
      clearTabDrag();
      pane.actions.drop(data.tab, data.pane, pane, edge, isCopyDrag(event));
    },
  });
  return {
    dispose() {
      observer.dispose();
      registered.dispose();
    },
  };
}
