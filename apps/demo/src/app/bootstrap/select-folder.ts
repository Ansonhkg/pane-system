import { askText, confirmAction } from "@pane-system/contracts/dialogs";
import type { Workbench } from "@pane-system/workbench";
import type { createHostClient } from "@pane-system/host/client";

export function createFolderSelector(
  workbench: Workbench,
  client: ReturnType<typeof createHostClient>,
) {
  return async function selectFolder() {
    const dirty = [...workbench.panes.values()].some((pane) =>
      pane.tabs.some((tab) => tab.content.dirty),
    );
    if (
      dirty &&
      !(await confirmAction("Switch folders and discard unsaved file changes?"))
    )
      return;
    const metadata = await client.doctor();
    const root = await askText("Folder path", metadata.root);
    if (!root || root === metadata.root) return;
    await client.selectWorkspace(root);
    location.reload();
  };
}
