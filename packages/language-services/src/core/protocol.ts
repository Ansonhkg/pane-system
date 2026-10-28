export interface WorkerDocument {
  path: string;
  text: string;
  version: number;
}
export interface Diagnostic {
  start?: number;
  length?: number;
  category: number;
  code: number;
  messageText:
    | string
    | { messageText: string; next?: Diagnostic["messageText"][] };
}
export interface Completion {
  name: string;
  sortText: string;
  kind: string;
}
export interface Hover {
  displayParts?: { text: string }[];
  documentation?: { text: string }[];
}
export interface WorkerDefinition {
  fileName: string;
  textSpan: { start: number; length: number };
}
export type WorkerRequest =
  | { id: number; kind: "imports"; path: string }
  | {
      id: number;
      kind: "resolve";
      path: string;
      specifier: string;
      target: string;
    }
  | { id: number; kind: "sync"; document: WorkerDocument }
  | { id: number; kind: "remove"; path: string }
  | { id: number; kind: "diagnostics"; path: string }
  | {
      id: number;
      kind: "completions" | "hover" | "definitions";
      path: string;
      offset: number;
    };
export interface WorkerReply {
  id: number;
  result?: unknown;
  error?: string;
}

export const SCRIPT_LANGUAGES: readonly string[] = ["typescript", "javascript"];
