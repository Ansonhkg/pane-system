import { SCRIPT_LANGUAGES } from "./protocol";
import { createWorkspace } from "./workspace";
import { definitionProvider } from "./definitions";
import type { FilePort } from "@pane-system/contracts";
import { editor, languages } from "@pane-system/upstream/editor";
import { createWorkerClient } from "./rpc";
import type { Diagnostic, Completion, Hover } from "./protocol";
type Model = ReturnType<typeof editor.createModel>;
export function createLanguageServices(options: {
  worker: Worker | (() => Worker);
  files?: FilePort;
  resolveModel?(path: string, text: string): Model;
  error?(error: unknown): void;
}) {
  const client = createWorkerClient(options.worker);
  const workspace = createWorkspace(client, options.files);
  const handles: { dispose(): void }[] = [];
  const models = new Map<Model, { dispose(): void }>();
  let disposed = false;
  const path = (model: Model) => "file://" + model.uri.path;
  async function sync(model: Model) {
    await workspace.load({
      path: path(model),
      text: model.getValue(),
      version: model.getVersionId(),
    });
  }
  async function diagnose(model: Model) {
    const version = model.getVersionId();
    try {
      await sync(model);
      const diagnostics = await client.request<Diagnostic[]>({
        kind: "diagnostics",
        path: path(model),
      });
      if (disposed || model.isDisposed() || model.getVersionId() !== version)
        return;
      editor.setModelMarkers(
        model,
        "typescript",
        diagnostics.map((d) => {
          const start = model.getPositionAt(d.start ?? 0);
          const end = model.getPositionAt((d.start ?? 0) + (d.length ?? 1));
          return {
            severity: d.category === 1 ? 8 : 4,
            code: String(d.code),
            message: messageText(d.messageText),
            startLineNumber: start.lineNumber,
            startColumn: start.column,
            endLineNumber: end.lineNumber,
            endColumn: end.column,
          };
        }),
      );
    } catch (error) {
      if (!disposed) options.error?.(error);
    }
  }
  function attach(model: Model) {
    if (
      model.uri.scheme !== "pane" ||
      !SCRIPT_LANGUAGES.includes(model.getLanguageId()) ||
      models.has(model)
    )
      return;
    let timer: ReturnType<typeof setTimeout>;
    const changed = model.onDidChangeContent(() => {
      clearTimeout(timer);
      timer = setTimeout(() => void diagnose(model), 180);
    });
    const closed = model.onWillDispose(() => {
      clearTimeout(timer);
      changed.dispose();
      closed.dispose();
      models.delete(model);
      workspace.invalidate(path(model));
      void client
        .request({ kind: "remove", path: path(model) })
        .catch((error: unknown) => {
          if (!disposed) options.error?.(error);
        });
    });
    models.set(model, {
      dispose() {
        clearTimeout(timer);
        changed.dispose();
        closed.dispose();
      },
    });
    timer = setTimeout(() => void diagnose(model), 1500);
  }
  handles.push(
    definitionProvider({
      client,
      workspace,
      prepare: sync,
      resolveModel: options.resolveModel,
    }),
  );
  handles.push(editor.onDidCreateModel(attach));
  for (const model of editor.getModels()) attach(model);
  for (const language of SCRIPT_LANGUAGES) {
    handles.push(
      languages.registerCompletionItemProvider(language, {
        triggerCharacters: ["."],
        async provideCompletionItems(model, position) {
          await sync(model);
          const result = await client.request<
            { entries: Completion[] } | undefined
          >({
            kind: "completions",
            path: path(model),
            offset: model.getOffsetAt(position),
          });
          const word = model.getWordUntilPosition(position);
          return {
            suggestions: (result?.entries ?? []).map((entry) => ({
              label: entry.name,
              insertText: entry.name,
              sortText: entry.sortText,
              kind: languages.CompletionItemKind.Variable,
              range: {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
              },
            })),
          };
        },
      }),
    );
    handles.push(
      languages.registerHoverProvider(language, {
        async provideHover(model, position) {
          await sync(model);
          const result = await client.request<Hover | undefined>({
            kind: "hover",
            path: path(model),
            offset: model.getOffsetAt(position),
          });
          if (!result) return;
          return {
            contents: [
              {
                value:
                  "```typescript\n" +
                  (result.displayParts ?? []).map((p) => p.text).join("") +
                  "\n```",
              },
              {
                value: (result.documentation ?? []).map((p) => p.text).join(""),
              },
            ],
          };
        },
      }),
    );
  }
  return {
    dispose() {
      disposed = true;
      for (const handle of handles) handle.dispose();
      for (const handle of models.values()) handle.dispose();
      models.clear();
      workspace.dispose();
      client.dispose();
    },
  };
}
function messageText(message: Diagnostic["messageText"]): string {
  if (typeof message === "string") return message;
  return [message.messageText, ...(message.next ?? []).map(messageText)].join(
    "\n",
  );
}
