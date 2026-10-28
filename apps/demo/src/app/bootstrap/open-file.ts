import type { TreeOpenOptions } from "@pane-system/contracts";
import type { Workbench } from "@pane-system/workbench";
import type { Pane } from "@pane-system/tabs";

export function createFileOpener(
  workbench: Workbench,
  target: () => Pane,
  log: (text: string) => void,
) {
  return function open(path: string, behavior?: TreeOpenOptions) {
    const current = target();
    const pane = behavior?.sideBySide ? workbench.split(current) : current;
    void workbench
      .open(
        "editor",
        path,
        pane,
        undefined,
        undefined,
        undefined,
        behavior?.pinned ?? true,
      )
      .then((tab) => {
        if (behavior && !behavior.preserveFocus) tab.content.focus?.();
      })
      .catch((error: unknown) => log(String(error)));
  };
}
