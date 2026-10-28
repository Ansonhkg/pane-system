import { createExplorer } from "@pane-system/explorer";
import type { createHostClient } from "@pane-system/host/client";
import type { TreeSettingsPort, TreeOpenOptions } from "@pane-system/contracts";
import { TREE_SCALE } from "../../core/tree-appearance";
export async function createWorkspaceExplorer(
  client: ReturnType<typeof createHostClient>,
  settings: TreeSettingsPort,
  open: (path: string, options?: TreeOpenOptions) => void,
  selectFolder: () => Promise<void>,
) {
  const info = await client.doctor();
  return createExplorer({
    treeScale: TREE_SCALE,
    files: client.files,
    settings,
    open,
    selectFolder,
    rootPath: info.root,
    name: info.root.split("/").at(-1),
  });
}
