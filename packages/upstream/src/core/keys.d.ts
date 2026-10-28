export interface Chord {
  equals(other: Chord): boolean;
  keyCode?: number;
  scanCode?: number;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}
export declare class KeyCodeChord implements Chord {
  readonly keyCode: number;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
  equals(other: Chord): boolean;
}
export declare class ScanCodeChord implements Chord {
  constructor(
    ctrl: boolean,
    shift: boolean,
    alt: boolean,
    meta: boolean,
    scan: number,
  );
  readonly scanCode: number;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
  equals(other: Chord): boolean;
}
export declare class StandardKeyboardEvent {
  constructor(event: KeyboardEvent);
  toKeyCodeChord(): KeyCodeChord;
}
export declare const KeybindingParser: {
  parseKeybinding(value: string): { chords: Chord[] } | null;
};
export declare const ScanCodeUtils: { toEnum(value: string): number };
export declare const isMacintosh: boolean;
export interface ContextExpression {
  evaluate(context: { getValue(key: string): unknown }): boolean;
}
export declare const ContextKeyExpr: {
  deserialize(value: string): ContextExpression | undefined;
};
