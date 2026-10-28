import type { FilePort } from "@pane-system/contracts";
import type { Workbench } from "@pane-system/workbench";
import { PATHS } from "../../core/paths";
export function createIgnoreAction(files: FilePort, workbench: Workbench) {
  return async function ignore(paths: string[]) {
    const open = [...workbench.panes.values()].some((pane) =>
      pane.tabs.some(
        (tab) => tab.kind === "editor" && tab.resource === PATHS.gitignore,
      ),
    );
    if (open) throw new Error("Close .gitignore before updating it.");
    const entries = await files.list("");
    const text = entries.some((entry) => entry.path === PATHS.gitignore)
      ? await files.read(PATHS.gitignore)
      : "";
    const existing = new Set(text.split("\n"));
    const escaped = new Set(["\\", "*", "?", "[", "]", "#", "!", " "]);
    const lines: string[] = [];
    for (const path of paths) {
      if (
        !path ||
        path.includes("\n") ||
        path.includes("\r") ||
        path.startsWith("/") ||
        path.split("/").includes("..")
      )
        throw new Error("Cannot ignore this path.");
      const rule =
        "/" +
        [...path]
          .map((char) => (escaped.has(char) ? "\\" + char : char))
          .join("");
      if (!existing.has(rule)) {
        existing.add(rule);
        lines.push(rule);
      }
    }
    if (!lines.length) return;
    await files.write(
      PATHS.gitignore,
      text +
        (text && !text.endsWith("\n") ? "\n" : "") +
        lines.join("\n") +
        "\n",
    );
  };
}
