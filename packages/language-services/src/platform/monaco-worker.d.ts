declare module "monaco-editor/languages/features/typescript/tsWorker.js" {
  interface Mirror {
    uri: { path: string; toString(): string };
    version: number;
    getValue(): string;
  }
  export class TypeScriptWorker {
    constructor(
      context: { getMirrorModels(): Mirror[] },
      options: {
        compilerOptions: Record<string, unknown>;
        extraLibs: Record<string, unknown>;
        inlayHintsOptions: Record<string, unknown>;
      },
    );
    getSyntacticDiagnostics(path: string): Promise<unknown[]>;
    getSemanticDiagnostics(path: string): Promise<unknown[]>;
    getCompletionsAtPosition(path: string, offset: number): Promise<unknown>;
    getDefinitionAtPosition(path: string, offset: number): Promise<unknown>;
    getQuickInfoAtPosition(path: string, offset: number): Promise<unknown>;
  }
}

declare module "monaco-editor/languages/features/typescript/lib/typescriptServices.js" {
  export const typescript: {
    preProcessFile(text: string): { importedFiles: { fileName: string }[] };
  };
}
