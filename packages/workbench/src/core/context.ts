import { Emitter } from "@pane-system/upstream/layout";
export type ContextValue = string | number | boolean | null | undefined;
export function createContext(initial: Record<string, ContextValue> = {}) {
  const values = new Map(Object.entries(initial));
  const changed = new Emitter<{ key: string; value: ContextValue }>();
  return {
    getValue(key: string) {
      return values.get(key);
    },
    set(key: string, value: ContextValue) {
      if (values.get(key) === value) return;
      values.set(key, value);
      changed.fire({ key, value });
    },
    delete(key: string) {
      if (values.delete(key)) changed.fire({ key, value: undefined });
    },
    entries: () => [...values.entries()],
    onDidChange: changed.event,
    dispose() {
      values.clear();
      changed.dispose();
    },
  };
}
export type Context = ReturnType<typeof createContext>;
