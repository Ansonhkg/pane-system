import type { IDisposable, Event } from "./lifecycle.js";
export declare class Color {
  static fromHex(value: string): Color;
  static readonly white: Color;
  static readonly black: Color;
  getContrastRatio(other: Color): number;
}
export declare class Action implements IDisposable {
  constructor(
    id: string,
    label?: string,
    cssClass?: string,
    enabled?: boolean,
    run?: () => Promise<unknown>,
  );
  readonly id: string;
  label: string;
  tooltip: string;
  class: string | undefined;
  enabled: boolean;
  checked: boolean | undefined;
  dispose(): void;
}
export declare class ActionBar implements IDisposable {
  constructor(
    container: HTMLElement,
    options?: { ariaLabel?: string; highlightToggledItems?: boolean },
  );
  readonly domNode: HTMLElement;
  push(actions: Action[], options?: { icon?: boolean; label?: boolean }): void;
  focus(index?: number): void;
  dispose(): void;
}
export declare const ThemeIcon: { asClassName(icon: { id: string }): string };
export declare function getIconsStyleSheet(
  theme: undefined,
): IDisposable & { getCSS(): string; onDidChange: Event<void> };
export declare const isMacintosh: boolean;
export declare function applyDragImage(
  event: DragEvent,
  container: HTMLElement,
  label: string,
  extraClasses?: string[],
): void;
export declare class DragAndDropObserver implements IDisposable {
  constructor(
    element: HTMLElement,
    callbacks: {
      onDragStart?(event: DragEvent): void;
      onDrag?(event: DragEvent): void;
      onDragEnter?(event: DragEvent): void;
      onDragOver?(event: DragEvent, duration: number): void;
      onDragLeave?(event: DragEvent): void;
      onDragEnd?(event: DragEvent): void;
      onDrop?(event: DragEvent): void;
    },
  );
  dispose(): void;
}
