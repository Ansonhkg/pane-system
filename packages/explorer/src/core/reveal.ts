import type { FileEntry } from "@pane-system/contracts";
import type { AsyncDataTree } from "@pane-system/upstream/tree";
export function createFileReveal(
  tree: AsyncDataTree<FileEntry, FileEntry, HTMLDivElement>,
  entries: Map<string, FileEntry>,
  ready: Promise<void>,
) {
  return async function revealFile(path: string) {
    await ready;
    const parts = path.split("/");
    let current = "";
    for (const part of parts.slice(0, -1)) {
      current = [current, part].filter(Boolean).join("/");
      const folder = entries.get(current);
      if (!folder) return;
      await tree.expand(folder);
    }
    const entry = entries.get(path);
    if (!entry) return;
    tree.setFocus([entry]);
    tree.setSelection([entry]);
    tree.reveal(entry);
    tree.domFocus();
  };
}
