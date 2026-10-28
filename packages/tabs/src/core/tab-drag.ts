import { DragAndDropObserver } from "@pane-system/upstream/chrome";
import { TAB_DRAG_OVER_OPEN_THRESHOLD } from "@pane-system/upstream/drop";
import {
  clearDropFeedback,
  clearTabDrag,
  isTabDrag,
  readTabDrag,
  startTabDrag,
  isCopyDrag,
  pinDragSource,
  registerDragFeedback,
} from "./drag-state";
import type { Pane } from "./pane";
import type { Tab } from "@pane-system/contracts";
export function installTabDrag(pane: Pane, tab: Tab, item: HTMLElement) {
  function clear() {
    item.classList.remove(
      "drop-target-left",
      "drop-target-right",
      "dragged-over",
    );
  }
  const registered = registerDragFeedback(item.ownerDocument, clear);
  const side = (event: DragEvent) =>
    event.clientX - item.getBoundingClientRect().left <=
    item.getBoundingClientRect().width / 2
      ? "before"
      : "after";
  const observer = new DragAndDropObserver(item, {
    onDragStart(event) {
      event.stopPropagation();
      startTabDrag(event, pane, tab, item);
    },
    onDragOver(event, duration) {
      if (!isTabDrag(event)) return;
      event.stopPropagation();
      clearDropFeedback();
      const source = readTabDrag(event);
      if (source?.pane === pane.id && source.tab === tab.id) return;
      item.classList.add(
        "dragged-over",
        side(event) === "before" ? "drop-target-right" : "drop-target-left",
      );
      if (event.dataTransfer)
        event.dataTransfer.dropEffect = isCopyDrag(event) ? "copy" : "move";
      if (duration >= TAB_DRAG_OVER_OPEN_THRESHOLD && pane.active !== tab.id)
        pane.select(tab.id);
    },
    onDragLeave: clear,
    onDragEnd: clearTabDrag,
    onDrop(event) {
      const data = readTabDrag(event);
      if (!data) return;
      event.preventDefault();
      event.stopPropagation();
      let index = pane.tabs.indexOf(tab) + (side(event) === "after" ? 1 : 0);
      const sourceIndex = pane.tabs.findIndex((t) => t.id === data.tab);
      const copy = isCopyDrag(event);
      if (!copy && data.pane === pane.id && sourceIndex < index) index--;
      pinDragSource();
      clearTabDrag();
      if (copy)
        pane.actions.drop(data.tab, data.pane, pane, "center", true, index);
      else pane.actions.move(data.tab, data.pane, pane.id, index);
    },
  });
  return {
    dispose() {
      observer.dispose();
      registered.dispose();
    },
  };
}
