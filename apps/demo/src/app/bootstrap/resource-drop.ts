import type { Workbench } from "@pane-system/workbench";

export const utilityPaneIds = ["files", "changes", "bottom"];

export function installResourceDrop(
  workbench: Workbench,
  container: HTMLElement,
) {
  function dragover(event: DragEvent) {
    if (!event.dataTransfer?.types.includes("application/x-pane-resources"))
      return;
    if (
      !(event.target instanceof Element) ||
      !event.target.closest(".pane-body")
    )
      return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }
  function drop(event: DragEvent) {
    if (
      !(event.target instanceof Element) ||
      !event.target.closest(".pane-body")
    )
      return;
    const raw = event.dataTransfer?.getData("application/x-pane-resources");
    if (!raw) return;
    event.preventDefault();
    event.stopPropagation();
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      return;
    }
    if (!Array.isArray(value)) return;
    const paths: unknown[] = value;
    if (!paths.every((item: unknown) => typeof item === "string")) return;
    const id = event.target.closest<HTMLElement>(".pane")?.dataset.pane;
    const pane = id ? workbench.panes.get(id) : undefined;
    if (!pane || utilityPaneIds.includes(pane.id)) return;
    for (const path of paths as string[])
      void workbench.open("editor", path, pane).catch(console.error);
  }
  container.addEventListener("dragover", dragover);
  container.addEventListener("drop", drop);
  return {
    dispose() {
      container.removeEventListener("dragover", dragover);
      container.removeEventListener("drop", drop);
    },
  };
}
