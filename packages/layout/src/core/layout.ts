import {
  Direction,
  SerializableGrid,
  Sizing,
  type IView,
  type SerializedGrid,
} from "@pane-system/upstream/layout";
export { Direction, Orientation } from "@pane-system/upstream/layout";
export type { IView, SerializedGrid } from "@pane-system/upstream/layout";
export interface LayoutOptions<T extends IView> {
  container: HTMLElement;
  initial: T;
  saved?: SerializedGrid;
  revive?: (value: unknown) => T;
}
export function createLayout<T extends IView>(options: LayoutOptions<T>) {
  let grid: SerializableGrid<T>;
  if (options.saved && options.revive)
    grid = SerializableGrid.deserialize(options.saved, {
      fromJSON: options.revive,
    });
  else
    grid = new SerializableGrid(options.initial, { proportionalLayout: true });
  options.container.append(grid.element);
  const measure = () =>
    grid.layout(options.container.clientWidth, options.container.clientHeight);
  const observer = new ResizeObserver(measure);
  observer.observe(options.container);
  measure();
  return {
    engine: grid,
    split(view: T, reference: T, direction: Direction) {
      grid.addView(view, Sizing.Distribute, reference, direction);
      measure();
    },
    move(view: T, reference: T, direction: Direction) {
      if (view !== reference)
        grid.moveView(view, Sizing.Distribute, reference, direction);
    },
    remove(view: T) {
      grid.removeView(view, Sizing.Distribute);
    },
    resize(view: T, width: number, height: number) {
      grid.resizeView(view, { width, height });
    },
    serialize: () => grid.serialize(),
    layout: measure,
    dispose() {
      observer.disconnect();
      grid.dispose();
      grid.element.remove();
    },
  };
}
export type PaneLayout<T extends IView> = ReturnType<typeof createLayout<T>>;
