import { installExplorerKeys } from "./keys";
import { createFileReveal } from "./reveal";
import { setFileIcon } from "@pane-system/contracts/file-icons";
import { AsyncDataTree } from "@pane-system/upstream/tree";
import type {
  Content,
  FileEntry,
  FilePort,
  TreeOpenOptions,
  TreeSettingsPort,
} from "@pane-system/contracts";
import { createExplorerActions } from "./actions";
import { explorerDrag } from "./drag";
import {
  selectionController,
  treeSettingsValue,
  TREE_GUIDE_STYLES,
} from "@pane-system/contracts/tree-settings";
export function createExplorer(options: {
  treeScale?: number;
  files: FilePort;
  open(path: string, options?: TreeOpenOptions): void;
  name?: string;
  rootPath?: string;
  selectFolder?(): Promise<void>;
  settings?: TreeSettingsPort;
}): Content & { revealFile(path: string): Promise<void> } {
  const element = document.createElement("div");
  element.className = "explorer-content";
  const errorStatus = document.createElement("div");
  errorStatus.className = "explorer-error";
  errorStatus.setAttribute("role", "status");
  errorStatus.hidden = true;
  const treeHost = document.createElement("div");
  treeHost.className = "explorer-tree";
  const scale = options.treeScale ?? 1;
  treeHost.style.setProperty("--pane-tree-scale", String(scale));
  let selected: FileEntry | undefined;
  const entries = new Map<string, FileEntry>();
  const actions = createExplorerActions({
    files: options.files,
    collapse: () => tree.collapseAll(),
    focus: () => tree.domFocus(),
    rootPath: options.rootPath,
    selected: () => selected,
    selection: () => tree.getSelection(),
    open: options.open,
    selectFolder: options.selectFolder,
    refresh: async () => {
      await ready;
      await tree.updateChildren(root, true);
    },
    settings: options.settings,
    error: reportError,
  });
  const title = actions.titleElement;
  title.classList.add("explorer-title");
  title.title = options.name ?? "Workspace";
  title.oncontextmenu = (event) => {
    event.preventDefault();
    selected = undefined;
    tree.setSelection([]);
    actions.menu(event.clientX, event.clientY);
  };
  actions.setTitle(options.name ?? "Workspace");
  element.append(actions.element, errorStatus, treeHost);
  function reportError(error: unknown) {
    element.title = String(error);
    errorStatus.textContent = String(error);
    errorStatus.hidden = false;
    tree.layout(
      Math.max(
        0,
        element.clientHeight -
          actions.element.offsetHeight -
          errorStatus.offsetHeight,
      ),
      element.clientWidth,
    );
  }
  const tree = new AsyncDataTree<FileEntry, FileEntry, HTMLDivElement>(
    "Pane files",
    treeHost,
    { getHeight: () => 22 * scale, getTemplateId: () => "file" },
    [
      {
        templateId: "file",
        renderTemplate(container) {
          const row = document.createElement("div");
          row.className = "file-row";
          container.append(row);
          return row;
        },
        renderElement(node, _index, row) {
          row.replaceChildren();
          if (!node.element.directory) {
            const icon = document.createElement("span");
            icon.className = "file-icon";
            setFileIcon(icon, node.element.name);
            row.append(icon);
          }
          row.append(document.createTextNode(node.element.name));
          row.title = node.element.path;
          row.dataset.directory = String(node.element.directory);
        },
        disposeTemplate(row) {
          row.remove();
        },
      },
    ],
    {
      hasChildren: (entry) => entry.directory,
      getChildren: async (entry) => {
        const children = await options.files.list(entry.path);
        for (const child of children) entries.set(child.path, child);
        return children;
      },
    },
    {
      identityProvider: { getId: (entry) => entry.path },
      accessibilityProvider: {
        getAriaLabel: (entry) => entry.name,
        getWidgetAriaLabel: () => "Files",
      },
      keyboardNavigationLabelProvider: {
        getKeyboardNavigationLabel: (entry) => entry.name,
      },
      multipleSelectionSupport: true,
      indent: 8 * scale,
      defaultIndent: 8 * scale,
      renderIndentGuides: "onHover",
      multipleSelectionController: selectionController(options.settings),
      expandOnlyOnTwistieClick:
        treeSettingsValue(options.settings).expandMode === "doubleClick",
      dnd: explorerDrag({
        files: options.files,
        refresh: async () => {
          await ready;
          await tree.updateChildren(root, true);
        },
        error: reportError,
      }),
    },
  );
  tree.style(TREE_GUIDE_STYLES);
  const selection = tree.onDidChangeSelection((event) => {
    selected = event.elements[0];
    if (
      event.browserEvent instanceof KeyboardEvent &&
      !event.browserEvent.shiftKey &&
      event.elements.length === 1 &&
      selected &&
      !selected.directory
    )
      options.open(selected.path, {
        pinned: event.browserEvent.key === "Enter",
        sideBySide: false,
        preserveFocus: event.browserEvent.key !== "Enter",
      });
  });
  function openEntry(
    entry: FileEntry | undefined,
    event: MouseEvent,
    pinned: boolean,
  ) {
    if (
      !entry ||
      entry.directory ||
      (event.target instanceof Element &&
        event.target.closest(".monaco-tl-twistie"))
    )
      return;
    options.open(entry.path, {
      pinned,
      sideBySide: event.altKey || event.ctrlKey || event.metaKey,
      preserveFocus: !pinned,
    });
  }
  const pointer = tree.onPointer(({ element, browserEvent }) => {
    if (
      browserEvent.detail !== 2 &&
      treeSettingsValue(options.settings).openMode === "singleClick"
    )
      openEntry(element, browserEvent, browserEvent.button === 1);
  });
  const doubleClick = tree.onMouseDblClick(({ element, browserEvent }) =>
    openEntry(element, browserEvent, true),
  );
  const context = tree.onContextMenu(({ element, browserEvent }) => {
    browserEvent.preventDefault();
    selected = element;
    if (element) {
      if (!tree.getSelection().some((entry) => entry.path === element.path))
        tree.setSelection([element]);
    } else tree.setSelection([]);
    const anchor =
      browserEvent instanceof MouseEvent
        ? { x: browserEvent.clientX, y: browserEvent.clientY }
        : treeHost.getBoundingClientRect();
    actions.menu(anchor.x, anchor.y);
  });
  const keys = installExplorerKeys(treeHost, actions.perform);
  const settings = options.settings?.subscribe((value) =>
    tree.updateOptions({
      expandOnlyOnTwistieClick: value.expandMode === "doubleClick",
    }),
  );
  const root = { path: "", name: options.name ?? "Workspace", directory: true };
  const ready = tree.setInput(root).catch((error: unknown) => {
    element.textContent = String(error);
  });
  const watch = options.files.watch?.(() => {
    void ready
      .then(() => tree.updateChildren(root, true))
      .catch((error: unknown) => {
        reportError(error);
      });
  });
  return {
    element,
    layout(width, height) {
      tree.layout(
        Math.max(
          0,
          height - actions.element.offsetHeight - errorStatus.offsetHeight,
        ),
        width,
      );
    },
    focus() {
      tree.domFocus();
    },
    revealFile: createFileReveal(tree, entries, ready),
    dispose() {
      watch?.dispose();
      settings?.dispose();
      keys.dispose();
      actions.dispose();
      selection.dispose();
      pointer.dispose();
      doubleClick.dispose();
      context.dispose();
      tree.dispose();
    },
  };
}
