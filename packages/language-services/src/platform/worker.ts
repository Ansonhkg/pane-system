import { typescript } from "monaco-editor/languages/features/typescript/lib/typescriptServices.js";
import { TypeScriptWorker } from "monaco-editor/languages/features/typescript/tsWorker.js";
import type {
  WorkerDocument,
  WorkerRequest,
  WorkerReply,
} from "../core/protocol";
const documents = new Map<string, WorkerDocument>();
const resolutions = new Map<string, string>();
class WorkspaceWorker extends TypeScriptWorker {
  resolveModuleNames(names: string[], from: string) {
    return names.map((name) => {
      const resolvedFileName = resolutions.get(from + "\0" + name);
      return resolvedFileName ? { resolvedFileName } : undefined;
    });
  }
}
const service = new WorkspaceWorker(
  {
    getMirrorModels: () =>
      [...documents.values()].map((doc) => ({
        uri: { path: doc.path, toString: () => doc.path },
        version: doc.version,
        getValue: () => doc.text,
      })),
  },
  {
    compilerOptions: {
      target: 7,
      module: 99,
      moduleResolution: 2,
      jsx: 1,
      strict: true,
      allowJs: true,
      checkJs: true,
      allowNonTsExtensions: true,
      noEmit: true,
    },
    extraLibs: {},
    inlayHintsOptions: {},
  },
);
const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(message: WorkerReply): void;
};
scope.onmessage = async (event) => {
  const message = event.data;
  try {
    let result: unknown;
    switch (message.kind) {
      case "resolve":
        resolutions.set(
          message.path + "\0" + message.specifier,
          message.target,
        );
        result = true;
        break;
      case "imports":
        result = typescript
          .preProcessFile(documents.get(message.path)?.text ?? "")
          .importedFiles.map((f) => f.fileName);
        break;
      case "definitions":
        result = await service.getDefinitionAtPosition(
          message.path,
          message.offset,
        );
        break;
      case "sync":
        documents.set(message.document.path, message.document);
        result = true;
        break;
      case "remove":
        documents.delete(message.path);
        result = true;
        break;
      case "diagnostics":
        result = [
          ...(await service.getSyntacticDiagnostics(message.path)),
          ...(await service.getSemanticDiagnostics(message.path)),
        ];
        break;
      case "completions":
        result = await service.getCompletionsAtPosition(
          message.path,
          message.offset,
        );
        break;
      case "hover":
        result = await service.getQuickInfoAtPosition(
          message.path,
          message.offset,
        );
        break;
    }
    scope.postMessage({ id: message.id, result });
  } catch (error) {
    scope.postMessage({ id: message.id, error: String(error) });
  }
};
