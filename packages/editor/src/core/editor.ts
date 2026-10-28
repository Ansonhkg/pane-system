import { createDocuments, type Documents } from "./documents";
import { editor } from "@pane-system/upstream/editor";
import type { Content, FilePort } from "@pane-system/contracts";
export interface EditorOptions {
  path: string;
  text: string;
  files: FilePort;
  documents?: Documents;
  state?: unknown;
  changed?(): void;
  theme?: string;
  readOnly?: boolean;
}
const languages: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  json: "json",
  css: "css",
  html: "html",
  md: "markdown",
  py: "python",
  sh: "shell",
  yaml: "yaml",
  yml: "yaml",
};
export function languageFor(path: string) {
  return languages[path.split(".").at(-1) ?? ""] ?? "plaintext";
}
export function createEditor(options: EditorOptions): Content {
  const element = document.createElement("div");
  element.className = "editor-content";
  const breadcrumbs = document.createElement("div");
  breadcrumbs.className = "editor-breadcrumbs";
  for (const [index, segment] of options.path.split("/").entries()) {
    if (index) breadcrumbs.append(document.createTextNode("›"));
    const label = document.createElement("span");
    label.textContent = segment;
    breadcrumbs.append(label);
  }
  const viewport = document.createElement("div");
  viewport.className = "editor-viewport";
  element.append(breadcrumbs, viewport);
  const documents =
    options.documents ??
    createDocuments({ files: options.files, changed: options.changed });
  let draft: string | undefined;
  if (
    options.state &&
    typeof options.state === "object" &&
    "draft" in options.state &&
    typeof options.state.draft === "string"
  )
    draft = options.state.draft;
  const lease = documents.acquire(
    options.path,
    options.text,
    languageFor(options.path),
    draft,
  );
  const model = lease.model;
  const view = editor.create(viewport, {
    model,
    readOnly: options.readOnly ?? false,
    theme: options.theme ?? "pane-dark",
    fontSize: 11,
    lineHeight: 18,
    glyphMargin: true,
    lineNumbersMinChars: 3,
    renderLineHighlight: "all",
    fontFamily: '"SFMono-Regular", Consolas, monospace',
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: false,
    padding: { top: 5 },
    fixedOverflowWidgets: true,
  });
  let savedView: ReturnType<typeof view.saveViewState> = null;
  if (
    options.state &&
    typeof options.state === "object" &&
    "view" in options.state
  ) {
    const value = options.state.view;
    if (
      value &&
      typeof value === "object" &&
      "cursorState" in value &&
      Array.isArray(value.cursorState) &&
      "viewState" in value
    )
      savedView = value as NonNullable<ReturnType<typeof view.saveViewState>>;
  }
  return {
    element,
    get dirty() {
      return lease.dirty;
    },
    layout(width, height) {
      view.layout({
        width,
        height: Math.max(0, height - breadcrumbs.offsetHeight),
      });
      if (savedView && width > 0 && height > 0) {
        const state = savedView;
        savedView = null;
        view.restoreViewState(state);
        view.render(true);
      }
    },
    focus() {
      view.focus();
    },
    reveal(line, column = 1) {
      view.setPosition({ lineNumber: line, column });
      view.revealLineInCenter(line);
      view.focus();
    },
    async save() {
      if (!options.readOnly) await lease.save();
    },
    serialize() {
      return { draft: model.getValue(), view: view.saveViewState() };
    },
    dispose() {
      view.dispose();
      lease.dispose();
      if (!options.documents) documents.dispose();
    },
  };
}
export function createDiff(options: {
  path: string;
  original: string;
  modified: string;
  theme?: string;
}): Content {
  const element = document.createElement("div");
  element.className = "editor-content";
  const original = editor.createModel(
    options.original,
    languageFor(options.path),
  );
  const modified = editor.createModel(
    options.modified,
    languageFor(options.path),
  );
  const view = editor.createDiffEditor(element, {
    theme: options.theme ?? "vs-dark",
    readOnly: true,
    renderSideBySide: true,
    originalEditable: false,
    diffAlgorithm: "advanced",
    automaticLayout: false,
  });
  view.setModel({ original, modified });
  return {
    element,
    layout(width, height) {
      view.layout({ width, height });
    },
    focus() {
      view.focus();
    },
    dispose() {
      view.dispose();
      original.dispose();
      modified.dispose();
    },
  };
}
editor.defineTheme("pane-dark", {
  base: "vs-dark",
  inherit: true,
  rules: [],
  colors: {
    "editor.background": "#121314",
    "editorGutter.background": "#121314",
    "editorLineNumber.foreground": "#858585",
    "editor.lineHighlightBackground": "#161616",
    "editor.selectionBackground": "#264f78",
    "editorCursor.foreground": "#cccccc",
  },
});
export function setEditorTheme(
  theme: "dark" | "light",
  colors?: { background: string; foreground: string; selection: string },
) {
  if (!colors) {
    editor.setTheme(theme === "dark" ? "pane-dark" : "vs");
    return;
  }
  editor.defineTheme("pane-custom", {
    base: theme === "dark" ? "vs-dark" : "vs",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": colors.background,
      "editorGutter.background": colors.background,
      "editor.foreground": colors.foreground,
      "editorCursor.foreground": colors.foreground,
      "editor.selectionBackground": colors.selection + "66",
    },
  });
  editor.setTheme("pane-custom");
}
