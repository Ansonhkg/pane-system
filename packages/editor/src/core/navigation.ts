import type { Disposable } from "@pane-system/contracts";
import { editor } from "@pane-system/upstream/editor";
export function registerEditorNavigation(options: {
  open(path: string, line: number, column: number): Promise<void>;
}): Disposable {
  return editor.registerEditorOpener({
    async openCodeEditor(_source, resource, selection) {
      if (resource.scheme !== "pane") return false;
      const line =
        selection && "startLineNumber" in selection
          ? selection.startLineNumber
          : (selection?.lineNumber ?? 1);
      const column =
        selection && "startColumn" in selection
          ? selection.startColumn
          : (selection?.column ?? 1);
      await options.open(resource.path.slice(1), line, column);
      return true;
    },
  });
}
