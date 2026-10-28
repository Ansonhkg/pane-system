import {
  readdir,
  readFile,
  writeFile,
  rename,
  realpath,
  stat,
  mkdir,
  cp,
  rm,
} from "node:fs/promises";
import { resolve, relative, dirname, basename, sep } from "node:path";
import { watch } from "node:fs";
import type { FilePort, FileEntry } from "@pane-system/contracts";
import { PATHS } from "../core/paths";
import { searchWorkspace } from "./search";
const ignored = new Set([".git", "node_modules", "dist", PATHS.scode]);
export async function createFiles(root: string): Promise<
  FilePort & {
    root: string;
    resolve(path: string, write?: boolean): Promise<string>;
  }
> {
  const base = await realpath(root);
  if (!(await stat(base)).isDirectory())
    throw new Error("The selected path is not a folder.");
  async function safe(path: string, write = false) {
    if (path.includes("\0")) throw new Error("Invalid file path.");
    const full = resolve(base, path);
    const rel = relative(base, full);
    if (rel === ".." || rel.startsWith(".." + sep))
      throw new Error("Path is outside the selected folder.");
    const physical = await realpath(write ? dirname(full) : full);
    const parent = relative(base, physical);
    if (parent === ".." || parent.startsWith(".." + sep))
      throw new Error("File link is outside the selected folder.");
    if (write) {
      try {
        const target = await realpath(full);
        const r = relative(base, target);
        if (r === ".." || r.startsWith(".." + sep))
          throw new Error("File link is outside the selected folder.");
      } catch (error) {
        if (!isMissing(error)) throw error;
      }
    }
    return full;
  }
  return {
    root: base,
    resolve: safe,
    search: (query) => searchWorkspace(base, query),
    async list(path) {
      const folder = await safe(path);
      const entries = await readdir(folder, { withFileTypes: true });
      const result: FileEntry[] = [];
      for (const entry of entries) {
        if (ignored.has(entry.name) || entry.isSymbolicLink()) continue;
        result.push({
          path: relative(base, resolve(folder, entry.name)),
          name: entry.name,
          directory: entry.isDirectory(),
        });
      }
      return result.sort(
        (a, b) =>
          Number(b.directory) - Number(a.directory) ||
          a.name.localeCompare(b.name),
      );
    },
    async read(path) {
      const full = await safe(path);
      const info = await stat(full);
      if (info.size > 4 * 1024 * 1024)
        throw new Error("File exceeds the 4 MiB editor limit.");
      const data = await readFile(full);
      if (data.includes(0)) throw new Error("Binary files need a custom pane.");
      return data.toString("utf8");
    },
    async write(path, text) {
      const full = await safe(path, true);
      const temporary = resolve(
        dirname(full),
        PATHS.temporary + crypto.randomUUID(),
      );
      try {
        const info = await stat(full).catch((error: unknown) => {
          if (isMissing(error)) return undefined;
          throw error;
        });
        await writeFile(temporary, text, { mode: info?.mode ?? 0o644 });
        await rename(temporary, full);
      } finally {
        await rm(temporary, { force: true });
      }
    },
    async createDirectory(path) {
      await mkdir(await safe(path, true));
    },
    async rename(path, destination) {
      const source = await safe(path);
      if (source === base) throw new Error("Cannot rename the workspace root.");
      const target = await safe(destination, true);
      try {
        await stat(target);
        throw new Error("The destination exists.");
      } catch (error) {
        if (!isMissing(error)) throw error;
      }
      await rename(source, target);
    },
    async copy(path, destination) {
      const source = await safe(path);
      if (source === base) throw new Error("Cannot copy the workspace root.");
      const target = await safe(destination, true);
      const inside = relative(source, target);
      if (!inside || (!inside.startsWith(".." + sep) && inside !== ".."))
        throw new Error("Cannot copy an item into itself.");
      try {
        await stat(target);
        throw new Error("The destination exists.");
      } catch (error) {
        if (!isMissing(error)) throw error;
      }
      await cp(source, target, {
        recursive: true,
        errorOnExist: true,
        force: false,
        verbatimSymlinks: true,
      });
    },
    async remove(path) {
      const full = await safe(path);
      if (full === base) throw new Error("Cannot remove the workspace root.");
      await rm(full, { recursive: true });
    },
    watch(listener) {
      const handle = watch(base, { recursive: true }, (_event, name) => {
        if (
          !name ||
          name
            .split(sep)
            .some(
              (part) => ignored.has(part) || part.startsWith(PATHS.temporary),
            )
        )
          return;
        listener(name);
      });
      return {
        dispose() {
          handle.close();
        },
      };
    },
  };
}
export function isMissing(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
