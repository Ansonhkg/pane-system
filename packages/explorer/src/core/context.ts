import { availableCopyName } from "./copy-name";
import type {
  FilePort,
  FileEntry,
  TreeSettingsPort,
  TreeOpenOptions,
} from "@pane-system/contracts";
export function createContextActions(options: {
  files: FilePort;
  rootPath?: string;
  selected(): FileEntry | undefined;
  selection(): FileEntry[];
  open(path: string, behavior?: TreeOpenOptions): void;
  settings?: TreeSettingsPort;
  error(error: unknown): void;
  directory(): string;
  run(action: () => Promise<void>): Promise<void>;
}) {
  let clipboard: { entries: FileEntry[]; cut: boolean } | undefined;
  const contextOnly = [
    { title: "Tree Settings", run: () => options.settings?.show() },
    {
      title: "Open",
      run: () => {
        const entry = options.selected();
        if (entry && !entry.directory) options.open(entry.path);
      },
    },
    {
      title: "Open to the Side",
      run: () => {
        const entry = options.selected();
        if (entry && !entry.directory)
          options.open(entry.path, {
            pinned: true,
            sideBySide: true,
            preserveFocus: false,
          });
      },
    },
    {
      title: "Copy",
      run: () => {
        clipboard = { entries: options.selection(), cut: false };
      },
    },
    {
      title: "Cut",
      run: () => {
        clipboard = { entries: options.selection(), cut: true };
      },
    },
    {
      title: "Paste",
      run: () => {
        void options.run(async () => {
          if (!clipboard) return;
          const folder = options.directory();
          const names = new Set(
            (await options.files.list(folder)).map((entry) => entry.name),
          );
          const entries = clipboard.entries.filter(
            (item, _, all) =>
              !all.some(
                (other) =>
                  other !== item && item.path.startsWith(other.path + "/"),
              ),
          );
          for (const entry of entries) {
            let name = entry.name;
            if (!clipboard.cut && names.has(name))
              name = availableCopyName(entry.name, names);
            const destination = [folder, name].filter(Boolean).join("/");
            if (
              destination === entry.path ||
              destination.startsWith(entry.path + "/")
            )
              throw new Error("Invalid destination.");
            if (clipboard.cut) {
              if (!options.files.rename)
                throw new Error("Move is not available.");
              await options.files.rename(entry.path, destination);
            } else {
              if (!options.files.copy)
                throw new Error("Copy is not available.");
              await options.files.copy(entry.path, destination);
            }
            names.add(name);
          }
          if (clipboard.cut) clipboard = undefined;
        });
      },
    },
    {
      title: "Copy Path",
      run: () => {
        const entries = options.selection();
        if (options.rootPath && entries.length)
          void navigator.clipboard
            .writeText(
              entries
                .map((entry) => options.rootPath + "/" + entry.path)
                .join("\n"),
            )
            .catch(options.error);
      },
    },
    {
      title: "Copy Relative Path",
      run: () => {
        const entries = options.selection();
        if (entries.length)
          void navigator.clipboard
            .writeText(entries.map((entry) => entry.path).join("\n"))
            .catch(options.error);
      },
    },
  ];
  return contextOnly;
}
