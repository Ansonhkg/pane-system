export declare const TAB_DRAG_OVER_OPEN_THRESHOLD: number;
export declare class NativeDropGeometry {
  constructor(
    element: HTMLElement,
    container: HTMLElement,
    overlay: HTMLElement,
    titleHeight: number,
    preferRight?: boolean,
  );
  readonly currentDropOperation: { splitDirection?: 0 | 1 | 2 | 3 } | undefined;
  positionOverlay(
    x: number,
    y: number,
    isDraggingGroup: boolean,
    enableSplitting: boolean,
  ): void;
}
