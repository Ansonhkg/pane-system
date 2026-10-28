import { createIgnoreAction } from "./git-ignore";
import { createSourceControl } from "@pane-system/source-control";
import { TREE_SCALE } from "../../core/tree-appearance";
import type { Workbench } from "@pane-system/workbench";
import type { Pane } from "@pane-system/tabs";
import type { TreeSettingsPort, TreeOpenOptions } from "@pane-system/contracts";
import type { createHostClient } from "@pane-system/host/client";
export function registerSourceControl({
  workbench,
  client,
  treeSettings,
  target,
  open,
  revealFile,
  log,
}: {
  workbench: Workbench;
  client: ReturnType<typeof createHostClient>;
  treeSettings: TreeSettingsPort;
  target(): Pane;
  open(path: string, options?: TreeOpenOptions): void;
  revealFile(path: string): Promise<void>;
  log(value: string): void;
}) {
  return workbench.register({
    id: "source-control",
    title: "Source Control",
    create: async ({ state }) => {
      const metadata = await client.doctor();
      return createSourceControl({
        rootPath: metadata.root,
        ignore: createIgnoreAction(client.files, workbench),
        initialView:
          state &&
          typeof state === "object" &&
          "viewMode" in state &&
          state.viewMode === "list"
            ? "list"
            : "tree",
        viewChanged: () => workbench.save(),
        treeScale: TREE_SCALE,
        git: client.git,
        settings: treeSettings,
        openHead: async (path) => {
          const tab = await workbench.open(
            "head",
            path,
            target(),
            undefined,
            undefined,
            path.split("/").at(-1) + " (HEAD)",
          );
          tab.content.focus?.();
        },
        openFile: (path, behavior) =>
          open(
            path,
            behavior ?? {
              pinned: true,
              sideBySide: false,
              preserveFocus: false,
            },
          ),
        revealFile,
        activeResource: () => {
          const pane = target();
          return pane.tabs.find((tab) => tab.id === pane.active)?.resource;
        },
        onActiveResource: (listener) =>
          workbench.context.onDidChange((event) => {
            if (
              event.key === "pane.resource" &&
              typeof event.value === "string"
            )
              listener(event.value);
          }),
        async open(change, behavior) {
          const current = target();
          const pane = behavior?.sideBySide
            ? workbench.split(current)
            : current;
          const tab = await workbench.open(
            "diff",
            change.path,
            pane,
            { staged: change.staged },
            undefined,
            change.path.split("/").at(-1) + " (Diff)",
            behavior?.pinned ?? true,
          );
          if (behavior && !behavior.preserveFocus) tab.content.focus?.();
        },
        changed: () => log("Git state updated."),
      });
    },
  });
}
