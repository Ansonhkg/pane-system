import { SCRIPT_LANGUAGES } from "./protocol";
import { editor, languages, Uri } from "@pane-system/upstream/editor";
import type { WorkerDefinition, WorkerDocument } from "./protocol";
import type { createWorkerClient } from "./rpc";
import type { createWorkspace } from "./workspace";
type Model = ReturnType<typeof editor.createModel>;
export function definitionProvider(options: {
  client: ReturnType<typeof createWorkerClient>;
  workspace: ReturnType<typeof createWorkspace>;
  prepare(model: Model): Promise<void>;
  resolveModel?(path: string, text: string): Model;
}) {
  const owned = new Set<Model>();
  const registrations = SCRIPT_LANGUAGES.map((language) =>
    languages.registerDefinitionProvider(language, {
      async provideDefinition(model, position, token) {
        await options.prepare(model);
        if (token.isCancellationRequested) return [];
        const definitions = await options.client.request<WorkerDefinition[]>({
          kind: "definitions",
          path: "file://" + model.uri.path,
          offset: model.getOffsetAt(position),
        });
        return (definitions ?? []).flatMap((definition) => {
          if (token.isCancellationRequested) return [];
          const text = options.workspace.text(definition.fileName);
          if (text === undefined) return [];
          const path = decodeURIComponent(
            new URL(definition.fileName).pathname,
          ).slice(1);
          const uri = Uri.from({
            scheme: model.uri.scheme,
            path: "/" + path,
            query: model.uri.query,
          });
          let target = editor.getModel(uri);
          if (!target) {
            target =
              options.resolveModel?.(path, text) ??
              editor.createModel(
                text,
                path.endsWith(".js") ? "javascript" : "typescript",
                uri,
              );
            if (!options.resolveModel) owned.add(target);
          }
          const start = target.getPositionAt(definition.textSpan.start);
          const end = target.getPositionAt(
            definition.textSpan.start + definition.textSpan.length,
          );
          return [
            {
              uri: target.uri,
              range: {
                startLineNumber: start.lineNumber,
                startColumn: start.column,
                endLineNumber: end.lineNumber,
                endColumn: end.column,
              },
            },
          ];
        });
      },
    }),
  );
  return {
    dispose() {
      registrations.forEach((r) => r.dispose());
      owned.forEach((model) => model.dispose());
    },
  };
}
