import type { Event, IDisposable } from "./lifecycle.js";
export { Event, Emitter, DisposableStore, toDisposable } from "./lifecycle.js";
export declare enum Direction {
  Up,
  Down,
  Left,
  Right,
}
export declare enum Orientation {
  VERTICAL,
  HORIZONTAL,
}
export interface IViewSize {
  width: number;
  height: number;
}
export interface IView {
  readonly element: HTMLElement;
  readonly minimumWidth: number;
  readonly minimumHeight: number;
  readonly maximumWidth: number;
  readonly maximumHeight: number;
  readonly onDidChange: Event<IViewSize | undefined>;
  layout(width: number, height: number, top: number, left: number): void;
  toJSON(): object;
}
export type SerializedNode =
  | {
      type: "leaf";
      data: unknown;
      size: number;
      visible?: boolean;
      maximized?: boolean;
    }
  | { type: "branch"; data: SerializedNode[]; size: number };
export interface SerializedGrid {
  root: SerializedNode;
  orientation: Orientation;
  width: number;
  height: number;
}
export declare const Sizing: {
  Distribute: { type: string };
  Split(view: IView): { type: string };
  Auto(view?: IView): { type: string };
};
export declare class SerializableGrid<T extends IView> implements IDisposable {
  constructor(
    view: T,
    options?: { orientation?: Orientation; proportionalLayout?: boolean },
  );
  static deserialize<T extends IView>(
    json: SerializedGrid,
    deserializer: { fromJSON(value: unknown): T },
  ): SerializableGrid<T>;
  readonly element: HTMLElement;
  readonly onDidChange: Event<IViewSize | undefined>;
  readonly onDidScroll: Event<void>;
  readonly onDidChangeViewMaximized: Event<boolean>;
  orientation: Orientation;
  layout(width: number, height: number, top?: number, left?: number): void;
  addView(
    view: T,
    size: number | object,
    reference: T,
    direction: Direction,
  ): void;
  removeView(view: T, sizing?: object): void;
  moveView(
    view: T,
    size: number | object,
    reference: T,
    direction: Direction,
  ): void;
  resizeView(view: T, size: Partial<IViewSize>): void;
  getViewSize(view: T): IViewSize;
  setViewVisible(view: T, visible: boolean): void;
  isViewVisible(view: T): boolean;
  maximizeView(view: T): void;
  exitMaximizedView(): void;
  distributeViewSizes(): void;
  serialize(): SerializedGrid;
  dispose(): void;
}
