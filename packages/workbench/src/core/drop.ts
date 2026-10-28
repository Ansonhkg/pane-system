import { Direction, type PaneLayout } from "@pane-system/layout";
import type { Pane, PaneActions } from "@pane-system/tabs";
import type { Tab } from "@pane-system/contracts";
interface DropPorts {
  panes: Map<string, Pane>;
  layout(): PaneLayout<Pane> | undefined;
  createPane(): Pane;
  move(tab: string, from: string, to: string, index?: number): void;
  open(
    kind: string,
    resource?: string,
    pane?: Pane,
    state?: unknown,
    id?: string,
    title?: string,
  ): Promise<Tab>;
  status?(message: string): void;
}
const directions: Record<string, Direction> = {
  left: Direction.Left,
  right: Direction.Right,
  up: Direction.Up,
  down: Direction.Down,
};
export function createDropAction(ports: DropPorts): PaneActions["drop"] {
  return (tab, from, to, edge, copy = false, index) => {
    const original = ports.panes
      .get(from)
      ?.tabs.find((item) => item.id === tab);
    if (!original) return;
    let target = to;
    if (edge !== "center") {
      const layout = ports.layout();
      const direction = directions[edge];
      if (!layout || direction === undefined) return;
      target = ports.createPane();
      target.setZoom(to.zoom);
      layout.split(target, to, direction);
    }
    if (!copy) {
      ports.move(tab, from, target.id, index);
      return;
    }
    void ports
      .open(
        original.kind,
        original.resource,
        target,
        original.content.serialize?.(),
        undefined,
        original.title,
      )
      .then((clone) => {
        if (index !== undefined)
          ports.move(clone.id, target.id, target.id, index);
      })
      .catch((error: unknown) => {
        if (target !== to && target.tabs.length === 0) {
          ports.layout()?.remove(target);
          ports.panes.delete(target.id);
          target.dispose();
        }
        ports.status?.(String(error));
      });
  };
}
