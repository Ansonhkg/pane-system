import { editor } from "@pane-system/upstream/editor";
import type { Content } from "@pane-system/contracts";
export function createProblems(options: {
  open(path: string, line: number, column: number): void;
}): Content {
  const element = document.createElement("div");
  element.className = "problems-content";
  function render() {
    const markers = editor.getModelMarkers({});
    element.replaceChildren();
    if (!markers.length) {
      element.textContent = "No problems found.";
      return;
    }
    for (const marker of markers) {
      const row = document.createElement("button");
      row.className = "problem-row";
      row.textContent =
        marker.resource.path +
        ":" +
        marker.startLineNumber +
        "  " +
        marker.message;
      row.dataset.severity = String(marker.severity);
      row.onclick = () =>
        options.open(
          marker.resource.path.slice(1),
          marker.startLineNumber,
          marker.startColumn,
        );
      element.append(row);
    }
  }
  const changed = editor.onDidChangeMarkers(render);
  render();
  return {
    element,
    dispose() {
      changed.dispose();
    },
  };
}
