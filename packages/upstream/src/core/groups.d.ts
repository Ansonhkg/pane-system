import type { Event } from "./lifecycle.js";
export declare abstract class EditorInput {
  abstract readonly typeId: string;
  abstract readonly resource: unknown;
  get capabilities(): number;
  protected readonly _onDidChangeDirty: { fire(value: void): void };
  getName(): string;
  isDirty(): boolean;
  matches(other: unknown): boolean;
  dispose(): void;
}
export interface GroupConfiguration {
  onDidChangeConfiguration: Event<unknown>;
  getValue(key: string): unknown;
}
export interface GroupInstantiation {
  createInstance(
    type: typeof EditorGroupModel,
    label: undefined,
  ): EditorGroupModel;
}
export declare class EditorGroupModel {
  constructor(
    label: undefined,
    instantiation: GroupInstantiation,
    configuration: GroupConfiguration,
  );
  readonly activeEditor: EditorInput | null;
  readonly count: number;
  getEditors(order: number): EditorInput[];
  openEditor(
    input: EditorInput,
    options?: {
      pinned?: boolean;
      sticky?: boolean;
      active?: boolean;
      index?: number;
    },
  ): unknown;
  closeEditor(input: EditorInput): unknown;
  setActive(input: EditorInput | undefined): unknown;
  moveEditor(input: EditorInput, index: number): unknown;
  pin(input: EditorInput): unknown;
  unpin(input: EditorInput): unknown;
  stick(input: EditorInput): unknown;
  unstick(input: EditorInput): unknown;
  isPinned(input: EditorInput): boolean;
  isSticky(input: EditorInput): boolean;
  dispose(): void;
}

export declare enum EditorsOrder {
  MOST_RECENTLY_ACTIVE,
  SEQUENTIAL,
}
