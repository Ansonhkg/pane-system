import { availableCopyName } from "./copy-name";
import { confirmAction } from "@pane-system/contracts/dialogs";
import type { FileEntry, FilePort } from "@pane-system/contracts";

type DragData = { elements?: FileEntry[] };
const effectType = { copy: 0, move: 1 } as const;
const bubbleDirection = { down: 0, up: 1 } as const;
export function explorerDrag(options: {
  files: FilePort;
  refresh(): Promise<void>;
  error(error: unknown): void;
}) {
  function sources(data: DragData) {
    return (data.elements ?? []).filter(
      (item, _, all) =>
        !all.some(
          (other) => other !== item && item.path.startsWith(other.path + "/"),
        ),
    );
  }
  function destination(target: FileEntry | undefined) {
    if (!target) return "";
    return target.directory
      ? target.path
      : target.path.split("/").slice(0, -1).join("/");
  }
  return {
    getDragURI(entry: FileEntry) {
      return entry.path;
    },
    onDragStart(data: DragData, event: DragEvent) {
      const entries = sources(data).filter((item) => !item.directory);
      if (entries.length)
        event.dataTransfer?.setData(
          "application/x-pane-resources",
          JSON.stringify(entries.map((item) => item.path)),
        );
    },
    onDragOver(
      data: DragData,
      target: FileEntry | undefined,
      _index: number | undefined,
      _sector: unknown,
      event: DragEvent,
    ) {
      const copy = navigator.platform.toLowerCase().includes("mac")
        ? event.altKey
        : event.ctrlKey;
      if (
        !(copy ? options.files.copy : options.files.rename) ||
        !data.elements?.length
      )
        return false;
      const folder = destination(target);
      const valid = sources(data).every(
        (item) =>
          folder !== item.path &&
          !folder.startsWith(item.path + "/") &&
          (copy || folder !== item.path.split("/").slice(0, -1).join("/")),
      );
      if (!valid) return false;
      return {
        accept: true,
        effect: {
          type: copy ? effectType.copy : effectType.move,
          position: "drop-target",
        },
        bubble:
          target && !target.directory
            ? bubbleDirection.up
            : bubbleDirection.down,
        autoExpand: !!target?.directory,
      };
    },
    drop(
      data: DragData,
      target: FileEntry | undefined,
      _index: number | undefined,
      _sector: unknown,
      event: DragEvent,
    ) {
      const entries = sources(data);
      const copy = navigator.platform.toLowerCase().includes("mac")
        ? event.altKey
        : event.ctrlKey;
      const action = copy ? options.files.copy : options.files.rename;
      if (!entries.length || !action) return;
      const folder = destination(target);
      void (async () => {
        if (
          !copy &&
          !(await confirmAction(
            "Move " +
              entries.length +
              " item(s) to " +
              (folder || "workspace") +
              "?",
          ))
        )
          return;
        const names = new Set(
          (await options.files.list(folder)).map((entry) => entry.name),
        );
        for (const item of entries) {
          let name = item.name;
          if (copy && names.has(name))
            name = availableCopyName(item.name, names);
          await action(item.path, [folder, name].filter(Boolean).join("/"));
          names.add(name);
        }
        await options.refresh();
      })().catch(options.error);
    },
    dispose() {},
  };
}
