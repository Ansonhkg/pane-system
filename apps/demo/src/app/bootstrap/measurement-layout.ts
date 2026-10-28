import type { SerializedGrid } from "@pane-system/layout";
import type { MeasurementFlags } from "../../core/measurement-flags";

export function measurementLayout(
  grid: SerializedGrid,
  flags: MeasurementFlags,
) {
  if (!flags.disabled.length) return grid;
  function keep(kind: string) {
    if (["editor", "diff", "head"].includes(kind))
      return flags.enabled("editor");
    if (kind === "problems")
      return flags.enabled("editor") && flags.enabled("auxiliary");
    if (["output", "input", "context", "connections", "search"].includes(kind))
      return flags.enabled("auxiliary");
    if (kind === "explorer") return flags.enabled("explorer");
    if (kind === "source-control") return flags.enabled("source-control");
    if (kind === "terminal") return flags.enabled("terminal");
    return true;
  }
  function filter(node: SerializedGrid["root"]): SerializedGrid["root"] | null {
    if (node.type === "branch") {
      const data = node.data.map(filter).filter((item) => item !== null);
      return data.length ? { ...node, data } : null;
    }
    const pane = node.data as {
      id: string;
      tabs: { id: string; kind: string }[];
      active?: string;
    };
    const tabs = pane.tabs.filter((tab) => keep(tab.kind));
    if (!tabs.length) return null;
    return {
      ...node,
      data: {
        ...pane,
        tabs,
        active: tabs.some((tab) => tab.id === pane.active)
          ? pane.active
          : tabs[0].id,
      },
    };
  }
  const root = filter(grid.root);
  if (!root) throw new Error("The measurement layout has no panes.");
  return { ...grid, root };
}

export function filterMeasurementNavigation(flags: MeasurementFlags) {
  for (const button of document.querySelectorAll<HTMLElement>("[data-view]")) {
    const view = button.dataset.view;
    if (
      (view === "explorer" && !flags.enabled("explorer")) ||
      (view === "source-control" && !flags.enabled("source-control")) ||
      (view === "terminal" && !flags.enabled("terminal")) ||
      (["search", "context", "input", "output", "connections"].includes(
        view ?? "",
      ) &&
        !flags.enabled("auxiliary"))
    )
      button.remove();
  }
}
