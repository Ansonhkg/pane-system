export interface IDisposable {
  dispose(): void;
}
export interface Event<T> {
  (listener: (event: T) => unknown): IDisposable;
}
export declare class Emitter<T> implements IDisposable {
  readonly event: Event<T>;
  fire(event: T): void;
  dispose(): void;
}
export declare const Event: { readonly None: Event<never> };
export declare class DisposableStore implements IDisposable {
  add<T extends IDisposable>(value: T): T;
  clear(): void;
  dispose(): void;
}
export declare function toDisposable(fn: () => void): IDisposable;
