import { editor, Uri } from "@pane-system/upstream/editor";
import type { FilePort } from "@pane-system/contracts";
export interface DocumentLease {
  model: ReturnType<typeof editor.createModel>;
  readonly dirty: boolean;
  save(): Promise<void>;
  dispose(): void;
}
export interface Documents {
  acquire(
    path: string,
    text: string,
    language: string,
    draft?: string,
  ): DocumentLease;
  dispose(): void;
}
export function createDocuments(options: {
  files: FilePort;
  changed?(): void;
}): Documents {
  const scope = crypto.randomUUID();
  const records = new Map<
    string,
    {
      model: ReturnType<typeof editor.createModel>;
      saved: string;
      references: number;
      listener: { dispose(): void };
    }
  >();
  return {
    acquire(path: string, text: string, language: string, draft?: string) {
      let record = records.get(path);
      if (!record) {
        const model = editor.createModel(
          draft ?? text,
          language,
          Uri.from({ scheme: "pane", path: "/" + path, query: scope }),
        );
        record = {
          model,
          saved: text,
          references: 0,
          listener: model.onDidChangeContent(() => options.changed?.()),
        };
        records.set(path, record);
      }
      record.references++;
      const entry = record;
      let released = false;
      return {
        model: entry.model,
        get dirty() {
          return entry.model.getValue() !== entry.saved;
        },
        async save() {
          const text = entry.model.getValue();
          await options.files.write(path, text);
          entry.saved = text;
          options.changed?.();
        },
        dispose() {
          if (released) return;
          released = true;
          entry.references--;
          if (entry.references) return;
          entry.listener.dispose();
          entry.model.dispose();
          records.delete(path);
        },
      };
    },
    dispose() {
      for (const entry of records.values()) {
        entry.listener.dispose();
        entry.model.dispose();
      }
      records.clear();
    },
  };
}
