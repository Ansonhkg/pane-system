import { AsyncDataTree } from "@pane-system/upstream/tree";
import { setFileIcon } from "@pane-system/contracts/file-icons";
import type { SearchMatch, TreeOpenOptions } from "@pane-system/contracts";
import { TREE_SCALE } from "../../../core/tree-appearance";
interface FileResult {
  path: string;
  matches: SearchMatch[];
}
type Result = FileResult | SearchMatch;
export function createSearchTree(
  host: HTMLElement,
  open: (match: SearchMatch, behavior: TreeOpenOptions) => void,
) {
  const root = { files: [] as FileResult[] };
  let disposed = false;
  const tree = new AsyncDataTree<typeof root, Result, HTMLElement>(
    "Workspace search",
    host,
    {
      getHeight: () => 22 * TREE_SCALE,
      getTemplateId: () => "search-result",
    },
    [
      {
        templateId: "search-result",
        renderTemplate(container) {
          const row = document.createElement("div");
          container.append(row);
          return row;
        },
        renderElement({ element }, _index, row) {
          row.replaceChildren();
          if ("matches" in element) {
            row.className = "search-file";
            const name = element.path.split("/").at(-1) ?? element.path;
            const icon = document.createElement("span");
            icon.className = "file-icon";
            setFileIcon(icon, name);
            const label = document.createElement("span");
            label.className = "search-file-name";
            label.textContent = name;
            const path = document.createElement("span");
            path.className = "search-file-path";
            path.textContent = element.path.slice(0, -(name.length + 1));
            if (!element.path.includes("/")) path.textContent = "";
            const badge = document.createElement("span");
            badge.className = "search-count";
            badge.textContent = String(element.matches.length);
            row.append(icon, label, path, badge);
            row.title = `${element.path} · ${element.matches.length} matches`;
          } else {
            row.className = "search-line";
            const before = document.createTextNode(element.before);
            const match = document.createElement("mark");
            match.textContent = element.text;
            row.append(before, match, document.createTextNode(element.after));
            row.title = `${element.path}:${element.line}:${element.column}  ${element.before}${element.text}${element.after}`;
          }
        },
        disposeTemplate(row) {
          row.remove();
        },
      },
    ],
    {
      hasChildren: (entry) => "files" in entry || "matches" in entry,
      getChildren: async (entry) => {
        if ("files" in entry) return entry.files;
        return "matches" in entry ? entry.matches : [];
      },
    },
    {
      identityProvider: {
        getId: (entry) =>
          "matches" in entry
            ? entry.path
            : `${entry.path}:${entry.line}:${entry.column}`,
      },
      accessibilityProvider: {
        getAriaLabel: (entry) =>
          "matches" in entry
            ? `${entry.path}, ${entry.matches.length} matches`
            : `${entry.path}, line ${entry.line}, ${entry.before}${entry.text}${entry.after}`,
        getWidgetAriaLabel: () => "Search results",
      },
      keyboardNavigationLabelProvider: {
        getKeyboardNavigationLabel: (entry) =>
          "matches" in entry ? entry.path : entry.text,
      },
      collapseByDefault: () => false,
      multipleSelectionSupport: false,
      indent: 8 * TREE_SCALE,
      defaultIndent: 8 * TREE_SCALE,
      renderIndentGuides: "none",
    },
  );
  const ready = tree.setInput(root);
  function activate(
    element: Result | undefined,
    event: MouseEvent | KeyboardEvent,
    pinned: boolean,
  ) {
    if (!element || "matches" in element) return;
    open(element, { pinned, sideBySide: event.altKey, preserveFocus: !pinned });
  }
  const listeners = [
    tree.onPointer(({ element, browserEvent }) => {
      if (browserEvent.button === 0) activate(element, browserEvent, false);
    }),
    tree.onMouseDblClick(({ element, browserEvent }) =>
      activate(element, browserEvent, true),
    ),
    tree.onDidChangeSelection(({ elements, browserEvent }) => {
      if (browserEvent instanceof KeyboardEvent && browserEvent.key === "Enter")
        activate(elements[0], browserEvent, true);
    }),
  ];
  return {
    async setMatches(matches: SearchMatch[]) {
      await ready;
      if (disposed) return;
      const files = new Map<string, FileResult>();
      for (const match of matches) {
        let file = files.get(match.path);
        if (!file) {
          file = { path: match.path, matches: [] };
          files.set(match.path, file);
        }
        file.matches.push(match);
      }
      root.files = [...files.values()];
      await tree.updateChildren(root, true);
    },
    collapseAll: () => tree.collapseAll(),
    layout: (height: number, width: number) => tree.layout(height, width),
    focusFirst() {
      const first = root.files[0];
      if (first) {
        tree.setFocus([first]);
        tree.domFocus();
      }
    },
    dispose() {
      disposed = true;
      listeners.forEach((listener) => listener.dispose());
      tree.dispose();
    },
  };
}
