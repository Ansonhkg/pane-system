import {
  buildChangeTree,
  findChangePath,
  type ChangeNode as Node,
} from "./tree-model";
import {
  selectionController,
  treeSettingsValue,
  TREE_GUIDE_STYLES,
} from "@pane-system/contracts/tree-settings";
import { AsyncDataTree } from "@pane-system/upstream/tree";
import { renderChangeRow } from "./row";
import type {
  Change,
  TreeOpenOptions,
  TreeSettingsPort,
} from "@pane-system/contracts";

export function createChangesTree(options: {
  scale?: number;
  open(change: Change, behavior: TreeOpenOptions): void;
  stage(change: Change): void;
  openFile?(change: Change): void;
  discard?(change: Change): void;
  settings?: TreeSettingsPort;
  context(changes: Change[], x: number, y: number, folder: boolean): void;
}) {
  const element = document.createElement("div");
  element.className = "scm-tree";
  const scale = options.scale ?? 1;
  element.style.setProperty("--pane-tree-scale", String(scale));
  const root: Node = { id: "root", name: "Changes", children: [] };
  let ready = false;
  let view: "tree" | "list" = "tree";
  let current: Change[] = [];
  const tree = new AsyncDataTree<Node, Node, HTMLDivElement>(
    "Source Control",
    element,
    { getHeight: () => 22 * scale, getTemplateId: () => "change" },
    [
      {
        templateId: "change",
        renderTemplate(container) {
          const row = document.createElement("div");
          row.className = "scm-tree-row";
          container.append(row);
          return row;
        },
        renderElement({ element: node }, _index, row) {
          renderChangeRow(node, row, options);
        },
        disposeTemplate(row) {
          row.remove();
        },
      },
    ],
    {
      hasChildren: (node) => !node.change,
      getChildren: async (node) => node.children,
    },
    {
      identityProvider: { getId: (node) => node.id },
      accessibilityProvider: {
        getAriaLabel: (node) => node.name,
        getWidgetAriaLabel: () => "Source Control changes",
      },
      keyboardNavigationLabelProvider: {
        getKeyboardNavigationLabel: (node) => node.name,
      },
      multipleSelectionSupport: true,
      indent: 8 * scale,
      defaultIndent: 8 * scale,
      renderIndentGuides: "onHover",
      multipleSelectionController: selectionController(options.settings),
      expandOnlyOnTwistieClick:
        treeSettingsValue(options.settings).expandMode === "doubleClick",
      collapseByDefault: () => false,
      dnd: {
        getDragURI: (node: Node) => node.change?.path ?? null,
        onDragStart: (data: { elements?: Node[] }, event: DragEvent) => {
          const paths = (data.elements ?? []).flatMap((node) =>
            node.change ? [node.change.path] : [],
          );
          if (paths.length)
            event.dataTransfer?.setData(
              "application/x-pane-resources",
              JSON.stringify(paths),
            );
        },
        onDragOver: () => false,
        drop() {},
        dispose() {},
      },
    },
  );
  tree.style(TREE_GUIDE_STYLES);
  function open(node: Node | undefined, event: MouseEvent, pinned: boolean) {
    if (
      !node?.change ||
      (event.target instanceof Element &&
        event.target.closest(".monaco-tl-twistie, button"))
    )
      return;
    options.open(node.change, {
      pinned,
      preserveFocus: !pinned,
      sideBySide: event.altKey || event.ctrlKey || event.metaKey,
    });
  }
  const pointer = tree.onPointer(({ element: node, browserEvent }) => {
    if (
      browserEvent.detail !== 2 &&
      treeSettingsValue(options.settings).openMode === "singleClick"
    )
      open(node, browserEvent, browserEvent.button === 1);
  });
  const doubleClick = tree.onMouseDblClick(({ element: node, browserEvent }) =>
    open(node, browserEvent, true),
  );
  const selection = tree.onDidChangeSelection(({ elements, browserEvent }) => {
    if (
      !(browserEvent instanceof KeyboardEvent) ||
      browserEvent.shiftKey ||
      elements.length !== 1 ||
      !elements[0].change
    )
      return;
    options.open(elements[0].change, {
      pinned: browserEvent.key === "Enter",
      preserveFocus: browserEvent.key !== "Enter",
      sideBySide: false,
    });
  });
  const context = tree.onContextMenu(({ element: node, browserEvent }) => {
    if (!node) return;
    browserEvent.preventDefault();
    if (!tree.getSelection().some((item) => item.id === node.id))
      tree.setSelection([node]);
    const rect = element.getBoundingClientRect();
    function changesOf(item: Node): Change[] {
      return item.change ? [item.change] : item.children.flatMap(changesOf);
    }
    const selected = [
      node,
      ...tree.getSelection().filter((item) => item.id !== node.id),
    ];
    const changes = selected
      .flatMap(changesOf)
      .filter(
        (item, index, all) =>
          all.findIndex(
            (other) => other.path === item.path && other.staged === item.staged,
          ) === index,
      );
    options.context(
      changes,
      browserEvent instanceof MouseEvent ? browserEvent.clientX : rect.left,
      browserEvent instanceof MouseEvent ? browserEvent.clientY : rect.top,
      !node.change,
    );
  });
  const settings = options.settings?.subscribe((value) => {
    tree.updateOptions({
      expandOnlyOnTwistieClick: value.expandMode === "doubleClick",
    });
    void update(current);
  });
  async function update(changes: Change[]) {
    current = changes;
    root.children = buildChangeTree(
      changes,
      view,
      treeSettingsValue(options.settings).compactFolders,
    );
    if (!ready) {
      await tree.setInput(root);
      ready = true;
    } else await tree.updateChildren(root, true);
  }
  return {
    element,
    update,
    async revealPath(path: string) {
      if (!ready) return;
      const chain = findChangePath(root.children, path);
      if (!chain) return;
      for (const node of chain.slice(0, -1)) await tree.expand(node);
      const node = chain[chain.length - 1];
      tree.setFocus([node]);
      tree.setSelection([node]);
      tree.reveal(node);
    },
    async setView(mode: "tree" | "list") {
      if (mode === view) return;
      view = mode;
      await update(current);
    },
    layout(width: number, height: number) {
      element.style.height = height + "px";
      tree.layout(height, width);
    },
    focus() {
      tree.domFocus();
    },
    dispose() {
      settings?.dispose();
      pointer.dispose();
      doubleClick.dispose();
      selection.dispose();
      context.dispose();
      tree.dispose();
    },
  };
}
