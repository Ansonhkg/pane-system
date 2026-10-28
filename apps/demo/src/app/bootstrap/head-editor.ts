import { createEditor } from "@pane-system/editor";
import type { Workbench } from "@pane-system/workbench";
import type { createHostClient } from "@pane-system/host/client";

export function registerHeadEditor(
  workbench: Workbench,
  client: ReturnType<typeof createHostClient>,
) {
  return workbench.register({
    id: "head",
    title: "HEAD",
    async create({ resource }) {
      if (!resource || !client.git.head)
        throw new Error("HEAD content is not available.");
      return createEditor({
        path: resource,
        text: await client.git.head(resource),
        files: client.files,
        readOnly: true,
      });
    },
  });
}
