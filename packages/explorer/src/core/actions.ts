import { createContextActions } from "./context";
import { createViewHeading } from "@pane-system/layout";
import {
  askText,
  confirmAction,
  showActionMenu,
  enableActionMenuKeys,
} from "@pane-system/contracts/dialogs";
import type {
  FilePort,
  FileEntry,
  TreeSettingsPort,
  TreeOpenOptions,
} from "@pane-system/contracts";
export function createExplorerActions(options: {
  files: FilePort;
  rootPath?: string;
  selected(): FileEntry | undefined;
  selection(): FileEntry[];
  refresh(): Promise<void>;
  open(path: string, behavior?: TreeOpenOptions): void;
  selectFolder?(): Promise<void>;
  collapse(): void;
  focus(): void;
  settings?: TreeSettingsPort;
  error(error: unknown): void;
}) {
  const buttons: HTMLButtonElement[] = [];
  function directory() {
    const selected = options.selected();
    if (!selected) return "";
    if (selected.directory) return selected.path;
    return selected.path.split("/").slice(0, -1).join("/");
  }
  function input(label: string) {
    const base = directory();
    return askText(label, base ? base + "/" : "");
  }
  async function run(action: () => Promise<void>) {
    try {
      await action();
      await options.refresh();
    } catch (error) {
      options.error(error);
    }
  }
  const contextOnly = createContextActions({ ...options, run, directory });
  const items = [
    {
      title: "Select folder",
      label: "▱",
      enabled: !!options.selectFolder,
      action: async () => {
        await options.selectFolder?.();
      },
    },
    {
      title: "New file",
      label: "+",
      enabled: true,
      action: async () => {
        const path = await input("File path");
        if (!path) return;
        const parts = path.split("/");
        const name = parts.pop();
        const entries = await options.files.list(parts.join("/"));
        if (entries.some((e) => e.name === name))
          throw new Error("This file exists.");
        await options.files.write(path, "");
        options.open(path);
      },
    },
    {
      title: "New folder",
      label: "⊞",
      enabled: !!options.files.createDirectory,
      action: async () => {
        const path = await input("Folder path");
        if (path) await options.files.createDirectory?.(path);
      },
    },
    {
      title: "Rename selection",
      label: "✎",
      enabled: !!options.files.rename,
      action: async () => {
        const entry = options.selected();
        if (!entry) return;
        const target = await askText("New path", entry.path);
        if (target && target !== entry.path)
          await options.files.rename?.(entry.path, target);
      },
    },
    {
      title: "Delete selection",
      label: "×",
      enabled: !!options.files.remove,
      action: async () => {
        const entries = options.selection();
        if (!entries.length) return;
        if (
          await confirmAction(
            "Delete " +
              entries.length +
              " selected item(s) and their child files?",
          )
        )
          for (const entry of entries.filter(
            (item, _, all) =>
              !all.some(
                (other) =>
                  other !== item && item.path.startsWith(other.path + "/"),
              ),
          ))
            await options.files.remove?.(entry.path);
      },
    },
    {
      title: "Refresh files",
      label: "↻",
      enabled: true,
      action: options.refresh,
    },
  ];
  items.push({
    title: "Collapse folders",
    label: "",
    enabled: true,
    action: async () => options.collapse(),
  });
  const context = document.createElement("dialog");
  context.className = "pane-tab-menu";
  document.body.append(context);
  enableActionMenuKeys(context);
  context.onclose = () => {
    if (context.returnValue !== "action") options.focus();
  };
  for (const action of contextOnly) {
    const button = document.createElement("button");
    button.textContent = action.title;
    button.onclick = () => {
      context.close("action");
      action.run();
    };
    context.append(button);
  }
  for (const item of items) {
    const button = document.createElement("button");
    button.title = item.title;
    button.setAttribute("aria-label", item.title);
    button.textContent = item.label;
    const icon: Record<string, string> = {
      "Select folder": "open",
      "New file": "new-file",
      "New folder": "new-folder",
      "Rename selection": "rename",
      "Delete selection": "trash",
      "Refresh files": "refresh",
      "Collapse folders": "collapse-all",
    };
    button.dataset.icon = icon[item.title];
    button.disabled = !item.enabled;
    button.onclick = () => {
      context.close("action");
      void run(item.action);
    };
    if (
      [
        "Select folder",
        "New file",
        "New folder",
        "Rename selection",
        "Delete selection",
      ].includes(item.title)
    ) {
      button.textContent = item.title;
      context.append(button);
    }
    buttons.push(button);
  }
  const bar = createViewHeading({
    title: "Workspace",
    className: "explorer-actions",
    label: "File actions",
    actions: items
      .filter(
        (item) =>
          !["Select folder", "Rename selection", "Delete selection"].includes(
            item.title,
          ),
      )
      .map((item) => ({
        id: item.title,
        title: item.title,
        icon:
          buttons.find((b) => b.title === item.title)?.dataset.icon ?? "more",
        enabled: item.enabled,
        run: () => run(item.action),
      })),
  });
  return {
    element: bar.element,
    titleElement: bar.titleElement,
    setTitle: bar.setTitle,
    perform(title: string) {
      const command = contextOnly.find((item) => item.title === title);
      if (command) {
        command.run();
        return;
      }
      const item = items.find(
        (entry) => entry.title === title && entry.enabled,
      );
      if (item) void run(item.action);
    },
    menu(x: number, y: number) {
      context.returnValue = "";
      showActionMenu(context, x, y);
    },
    dispose() {
      bar.dispose();
      context.remove();
      for (const button of buttons) button.onclick = null;
    },
  };
}
