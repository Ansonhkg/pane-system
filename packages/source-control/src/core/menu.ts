import {
  confirmAction,
  enableActionMenuKeys,
  showActionMenu,
} from "@pane-system/contracts/dialogs";
import type { Change, GitPort, TreeOpenOptions } from "@pane-system/contracts";
export function createChangesMenu(options: {
  git: GitPort;
  rootPath?: string;
  open(change: Change, behavior?: TreeOpenOptions): Promise<void>;
  openFile?(path: string, behavior?: TreeOpenOptions): void;
  openHead?(path: string): Promise<void>;
  revealFile?(path: string): Promise<void>;
  ignore?(paths: string[]): Promise<void>;
  run(action: () => Promise<void>): Promise<void>;
  focus(): void;
}) {
  const menu = document.createElement("dialog");
  menu.className = "pane-tab-menu";
  document.body.append(menu);
  menu.onclose = () => {
    if (menu.returnValue !== "action") options.focus();
  };
  enableActionMenuKeys(menu);
  return {
    show(changes: Change[], x: number, y: number, folder = false) {
      const change = changes[0];
      if (!change) return;
      menu.returnValue = "";
      menu.replaceChildren();
      for (const action of [
        {
          title: "Open Changes",
          disabled: folder,
          run: () =>
            options.open(change, {
              pinned: true,
              sideBySide: false,
              preserveFocus: false,
            }),
        },
        {
          title: "Open Changes to the Side",
          disabled: folder,
          run: () =>
            options.open(change, {
              pinned: true,
              sideBySide: true,
              preserveFocus: false,
            }),
        },
        {
          title: "Open File",
          run: async () => {
            options.openFile?.(change.path);
          },
          disabled: folder || !options.openFile,
        },
        {
          title: "Open File (HEAD)",
          run: async () => {
            await options.openHead?.(change.path);
          },
          disabled: folder || !options.openHead || change.status === "U",
        },
        {
          title: "Stage Changes",
          run: async () => {
            for (const item of changes.filter((item) => !item.staged))
              await options.git.stage(item.path);
          },
          disabled: !changes.some((item) => !item.staged),
        },
        {
          title: "Unstage Changes",
          run: async () => {
            for (const item of changes.filter((item) => item.staged))
              await options.git.unstage(item.path);
          },
          disabled: !changes.some((item) => item.staged),
        },
        {
          title: "Discard Changes",
          run: async () => {
            const selected = new Map<string, Change>();
            for (const item of changes) {
              if (!selected.has(item.path) || item.staged)
                selected.set(item.path, item);
            }
            if (
              !options.git.discard ||
              !(await confirmAction(
                "Discard " +
                  selected.size +
                  " selected change(s)? Untracked files will be deleted.",
              ))
            )
              return;
            for (const item of selected.values())
              await options.git.discard(item.path, item.staged);
          },
          disabled: !options.git.discard,
        },
        {
          title: "Add to .gitignore",
          run: async () => {
            await options.ignore?.(
              changes
                .filter((item) => !item.staged && item.status === "U")
                .map((item) => item.path),
            );
          },
          disabled:
            !options.ignore ||
            !changes.some((item) => !item.staged && item.status === "U"),
        },
        {
          title: "Stash Changes",
          run: async () => {
            if (
              !options.git.stash ||
              !(await confirmAction("Stash the selected changes?"))
            )
              return;
            await options.git.stash([
              ...new Set(changes.map((item) => item.path)),
            ]);
          },
          disabled: !options.git.stash,
        },
        {
          title: "Copy Changes (Patch)",
          run: async () => {
            if (!options.git.patch) return;
            const patch = options.git.patch;
            const patches = await Promise.all(
              changes.map((item) => patch(item.path, item.staged)),
            );
            await navigator.clipboard.writeText(patches.join(""));
          },
          disabled: !options.git.patch,
        },
        {
          title: "Reveal in Explorer",
          run: async () => {
            await options.revealFile?.(change.path);
          },
          disabled: folder || !options.revealFile,
        },
        {
          title: "Copy Path",
          run: () =>
            navigator.clipboard.writeText(
              changes
                .map((item) => options.rootPath + "/" + item.path)
                .join("\n"),
            ),
          disabled: !options.rootPath,
        },
        {
          title: "Copy Relative Path",
          run: () =>
            navigator.clipboard.writeText(
              changes.map((item) => item.path).join("\n"),
            ),
        },
      ]) {
        const button = document.createElement("button");
        button.textContent = action.title;
        button.disabled = action.disabled ?? false;
        button.onclick = () => {
          menu.close("action");
          void options.run(action.run);
        };
        menu.append(button);
      }
      showActionMenu(menu, x, y);
    },
    dispose() {
      menu.remove();
    },
  };
}
