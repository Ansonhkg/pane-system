import type { IDisposable, Event } from "./lifecycle.js";
export interface TreeNode<T> {
  element: T;
}
export interface TreeRenderer<T, D> {
  templateId: string;
  renderTemplate(container: HTMLElement): D;
  renderElement(node: TreeNode<T>, index: number, template: D): void;
  disposeTemplate(template: D): void;
}
export declare class AsyncDataTree<I, T, D> implements IDisposable {
  constructor(
    user: string,
    container: HTMLElement,
    delegate: {
      getHeight(element: T): number;
      getTemplateId(element: T): string;
    },
    renderers: TreeRenderer<T, D>[],
    source: {
      hasChildren(element: I | T): boolean;
      getChildren(element: I | T): Promise<T[]>;
    },
    options: {
      identityProvider: { getId(element: T): string };
      accessibilityProvider: {
        getAriaLabel(element: T): string;
        getWidgetAriaLabel(): string;
      };
      keyboardNavigationLabelProvider: {
        getKeyboardNavigationLabel(element: T): string;
      };
      multipleSelectionSupport?: boolean;
      multipleSelectionController?: {
        isSelectionSingleChangeEvent(event: {
          browserEvent: MouseEvent;
        }): boolean;
        isSelectionRangeChangeEvent(event: {
          browserEvent: MouseEvent;
        }): boolean;
      };
      expandOnlyOnTwistieClick?: boolean;
      indent?: number;
      defaultIndent?: number;
      renderIndentGuides?: "none" | "onHover" | "always";
      collapseByDefault?: (element: T) => boolean;
      dnd?: unknown;
    },
  );
  readonly onDidChangeSelection: Event<{
    elements: T[];
    browserEvent?: UIEvent;
  }>;
  readonly onPointer: Event<{ element?: T; browserEvent: MouseEvent }>;
  readonly onMouseDblClick: Event<{ element?: T; browserEvent: MouseEvent }>;
  readonly onContextMenu: Event<{
    element?: T;
    anchor: HTMLElement | { x: number; y: number };
    browserEvent: MouseEvent | KeyboardEvent;
  }>;
  updateOptions(options: {
    expandOnlyOnTwistieClick?: boolean;
    multipleSelectionController?: {
      isSelectionSingleChangeEvent(event: {
        browserEvent: MouseEvent;
      }): boolean;
      isSelectionRangeChangeEvent(event: { browserEvent: MouseEvent }): boolean;
    };
  }): void;
  getSelection(): T[];
  setSelection(elements: T[]): void;
  setFocus(elements: T[]): void;
  reveal(element: T): void;
  expand(element: T): Promise<boolean>;
  getViewState(): unknown;
  setInput(input: I, viewState?: unknown): Promise<void>;
  updateChildren(element?: I | T, recursive?: boolean): Promise<void>;
  layout(height?: number, width?: number): void;
  style(styles: {
    treeIndentGuidesStroke?: string;
    treeInactiveIndentGuidesStroke?: string;
  }): void;
  domFocus(): void;
  collapseAll(): void;
  dispose(): void;
}
