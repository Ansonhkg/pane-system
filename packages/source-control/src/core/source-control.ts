import { confirmAction } from "@pane-system/contracts/dialogs";
import { createChangesMenu } from "./menu";
import { createChangesTree } from "./tree";
import { createViewHeading } from "@pane-system/layout";
import type {
  Content,
  GitPort,
  Change,
  TreeOpenOptions,
  TreeSettingsPort,
  Disposable,
} from "@pane-system/contracts";
export function createSourceControl(options: {
  treeScale?: number;
  git: GitPort;
  rootPath?: string;
  open(change: Change, behavior?: TreeOpenOptions): Promise<void>;
  openFile?(path: string, behavior?: TreeOpenOptions): void;
  openHead?(path: string): Promise<void>;
  revealFile?(path: string): Promise<void>;
  ignore?(paths: string[]): Promise<void>;
  changed?(): void;
  settings?: TreeSettingsPort;
  initialView?: "tree" | "list";
  viewChanged?(): void;
  activeResource?(): string | undefined;
  onActiveResource?(listener: (path: string) => void): Disposable;
}): Content {
  const element = document.createElement("div");
  element.className = "source-control";
  const branch = document.createElement("div");
  branch.className = "scm-branch";
  const message = document.createElement("textarea");
  message.placeholder = "Commit message";
  message.setAttribute("aria-label", "Commit message");
  const commit = document.createElement("button");
  commit.textContent = "✓ Commit";
  commit.className = "primary";
  const publish = document.createElement("button");
  publish.textContent = "Publish Branch";
  publish.disabled = true;
  const status = document.createElement("p");
  status.className = "status";
  status.setAttribute("role", "status");
  const menu = createChangesMenu({
    ...options,
    run,
    focus: () => tree.focus(),
  });
  const tree = createChangesTree({
    scale: options.treeScale,
    settings: options.settings,
    openFile: options.openFile
      ? (change) => options.openFile?.(change.path)
      : undefined,
    discard: options.git.discard
      ? (change) => {
          void run(async () => {
            if (
              await confirmAction(
                "Discard changes in " +
                  change.path +
                  "? Untracked files will be deleted.",
              )
            )
              await options.git.discard?.(change.path, change.staged);
          });
        }
      : undefined,
    open: (change, behavior) => {
      void options.open(change, behavior).catch((error: unknown) => {
        status.textContent = String(error);
        status.dataset.error = "true";
      });
    },
    stage: (change) => {
      void run(async () => {
        if (change.staged) await options.git.unstage(change.path);
        else await options.git.stage(change.path);
      });
    },
    context: (changes, x, y, folder) => menu.show(changes, x, y, folder),
  });
  let viewMode: "tree" | "list" = options.initialView ?? "tree";
  const viewTitle = () =>
    viewMode === "tree" ? "Show changes as a list" : "Show changes as a tree";
  const heading = createViewHeading({
    title: "Source Control",
    className: "scm-heading",
    label: "Source control actions",
    actions: [
      ...(options.settings
        ? [
            {
              id: "scm.settings",
              title: "Tree settings",
              icon: "settings-gear",
              run: () => options.settings?.show(),
            },
          ]
        : []),
      {
        id: "scm.view",
        title: viewTitle(),
        icon: "list-tree",
        checked: viewMode === "list",
        run: async () => {
          viewMode = viewMode === "tree" ? "list" : "tree";
          heading.update("scm.view", {
            title: viewTitle(),
            checked: viewMode === "list",
          });
          options.viewChanged?.();
          try {
            await tree.setView(viewMode);
          } catch (error) {
            status.textContent = String(error);
          }
        },
      },
      {
        id: "scm.refresh",
        title: "Refresh changes",
        icon: "refresh",
        run: load,
      },
    ],
  });
  const actions = document.createElement("div");
  actions.className = "scm-actions";
  actions.append(commit, publish);
  element.append(
    heading.element,
    branch,
    message,
    actions,
    status,
    tree.element,
  );
  let disposed = false;
  let initialRevealDone = false;
  function reveal(path: string | undefined) {
    if (!path || options.settings?.get().autoReveal === false) return;
    void tree.revealPath(path).catch((error: unknown) => {
      status.textContent = String(error);
    });
  }
  const activeResource = options.onActiveResource?.(reveal);
  const settingsChange = options.settings?.subscribe(() =>
    reveal(options.activeResource?.()),
  );
  async function load() {
    try {
      const result = await options.git.status();
      if (disposed) return;
      branch.textContent = "⑂ " + result.branch;
      publish.disabled = !result.canPublish || !options.git.publish;
      publish.hidden = publish.disabled;
      message.placeholder = 'Message (commit on "' + result.branch + '")';
      commit.disabled = !result.changes.some((change) => change.staged);
      publish.title = publish.disabled
        ? "Publish requires an origin remote and the repository root."
        : "Publish this branch to origin";
      await tree.update(result.changes);
      if (viewMode === "list") await tree.setView(viewMode);
      if (!initialRevealDone) {
        initialRevealDone = true;
        reveal(options.activeResource?.());
      }
      delete status.dataset.error;
      status.textContent = result.changes.length
        ? "Changes · " + result.changes.length
        : "";
    } catch (error) {
      status.textContent = String(error);
      status.dataset.error = "true";
    }
  }
  async function run(action: () => Promise<void>) {
    commit.disabled = true;
    heading.update("scm.refresh", { enabled: false });
    let failure: unknown;
    try {
      await action();
      options.changed?.();
    } catch (error) {
      failure = error;
    } finally {
      await load();
      if (failure) {
        status.textContent = String(failure);
        status.dataset.error = "true";
      }
      heading.update("scm.refresh", { enabled: true });
    }
  }
  publish.onclick = () =>
    void run(async () => {
      await options.git.publish?.();
      await load();
      status.textContent = "Branch published";
    });
  commit.onclick = () =>
    void run(async () => {
      if (!message.value.trim()) throw new Error("Enter a commit message.");
      const hash = await options.git.commit(message.value);
      message.value = "";
      await load();
      status.textContent = "Committed " + hash.slice(0, 8);
    });
  const ready = load();
  return {
    element,
    ready,
    serialize() {
      return { viewMode };
    },
    layout(width, height) {
      tree.layout(
        tree.element.clientWidth,
        Math.max(0, height - tree.element.offsetTop),
      );
    },
    focus() {
      tree.focus();
    },
    dispose() {
      disposed = true;
      activeResource?.dispose();
      settingsChange?.dispose();
      heading.dispose();
      tree.dispose();
      menu.dispose();
    },
  };
}
