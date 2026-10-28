import { DECLARATION_EXTENSION, DECLARATION_SUFFIX } from "./paths";
import type { FilePort, FileEntry } from "@pane-system/contracts";
import type { WorkerDocument } from "./protocol";
import { createWorkerClient } from "./rpc";
interface PackageManifest {
  name?: string;
  workspaces?: string[] | { packages: string[] };
  exports?:
    | Record<string, string | { types?: string; default?: string }>
    | string;
  types?: string;
  main?: string;
}
export function createWorkspace(
  client: ReturnType<typeof createWorkerClient>,
  files?: FilePort,
) {
  const texts = new Map<string, string>();
  const directories = new Map<string, Promise<FileEntry[]>>();
  const packages = new Map<
    string,
    { directory: string; manifest: PackageManifest }
  >();
  const toUri = (path: string) => new URL(path, "file:///").href;
  const relative = (uri: string) =>
    decodeURIComponent(new URL(uri).pathname).slice(1);
  let discovery: Promise<void> | undefined;
  const list = (path: string) => {
    let entries = directories.get(path);
    if (!entries) {
      entries = files?.list(path).catch(() => []) ?? Promise.resolve([]);
      directories.set(path, entries);
    }
    return entries;
  };
  async function manifest(directory: string) {
    try {
      return JSON.parse(
        await files!.read(
          directory ? directory + "/package.json" : "package.json",
        ),
      ) as PackageManifest;
    } catch {
      return undefined;
    }
  }
  async function discover() {
    if (!files) return;
    const root = await manifest("");
    if (!root) return;
    if (root.name) packages.set(root.name, { directory: "", manifest: root });
    const patterns = Array.isArray(root.workspaces)
      ? root.workspaces
      : (root.workspaces?.packages ?? []);
    const paths = (
      await Promise.all(
        patterns.map(async (pattern) => {
          if (!pattern.endsWith("/*")) return [pattern];
          return (await list(pattern.slice(0, -2)))
            .filter((e) => e.directory)
            .map((e) => e.path);
        }),
      )
    ).flat();
    await Promise.all(
      paths.map(async (directory) => {
        const value = await manifest(directory);
        if (value?.name)
          packages.set(value.name, { directory, manifest: value });
      }),
    );
  }
  async function find(path: string): Promise<string | undefined> {
    const normalized = relative(toUri(path));
    if (!normalized || normalized.startsWith("../")) return;
    const parts = normalized.split("/");
    const name = parts.pop()!;
    const entries = await list(parts.join("/"));
    const stem =
      name.endsWith(".js") || name.endsWith(".jsx")
        ? name.slice(0, name.lastIndexOf("."))
        : name;
    for (const candidate of [
      stem + ".ts",
      stem + ".tsx",
      stem + DECLARATION_EXTENSION,
      name,
      name + ".ts",
      name + ".tsx",
      name + ".js",
      name + ".jsx",
    ]) {
      const entry = entries.find((e) => !e.directory && e.name === candidate);
      if (entry) return toUri(entry.path);
    }
    if (entries.some((e) => e.directory && e.name === name)) {
      const nested = await list(normalized);
      for (const extension of ["ts", "tsx", DECLARATION_SUFFIX, "js", "jsx"]) {
        const entry = nested.find((e) => e.name === "index." + extension);
        if (entry) return toUri(entry.path);
      }
    }
  }
  async function resolve(specifier: string, from: string) {
    if (specifier.startsWith("."))
      return find(relative(new URL(specifier, from).href));
    const name = specifier.startsWith("@")
      ? specifier.split("/").slice(0, 2).join("/")
      : specifier.split("/")[0];
    const pkg = packages.get(name);
    if (!pkg) return;
    const key = specifier === name ? "." : "." + specifier.slice(name.length);
    const exported =
      typeof pkg.manifest.exports === "string"
        ? pkg.manifest.exports
        : pkg.manifest.exports?.[key];
    const target =
      typeof exported === "string"
        ? exported
        : (exported?.types ?? exported?.default);
    return find(
      [
        pkg.directory,
        target ??
          (key === "."
            ? (pkg.manifest.types ?? pkg.manifest.main ?? "index")
            : key.slice(2)),
      ]
        .filter(Boolean)
        .join("/"),
    );
  }
  async function sync(document: WorkerDocument) {
    texts.set(document.path, document.text);
    await client.request({ kind: "sync", document });
  }
  async function load(document: WorkerDocument) {
    await sync(document);
    if (!files) return;
    await (discovery ??= discover());
    const visited = new Set<string>();
    let queue = [document.path];
    while (queue.length) {
      const batch = queue.splice(0, 8).filter((path) => !visited.has(path));
      for (const path of batch) visited.add(path);
      const children = await Promise.all(
        batch.map(async (path) => {
          const imports = await client.request<string[]>({
            kind: "imports",
            path,
          });
          return Promise.all(
            imports.map(async (specifier) => {
              const target = await resolve(specifier, path);
              if (!target) return undefined;
              if (!texts.has(target))
                await sync({
                  path: target,
                  text: await files.read(relative(target)),
                  version: 1,
                });
              await client.request({
                kind: "resolve",
                path,
                specifier,
                target,
              });
              return target;
            }),
          );
        }),
      );
      queue.push(
        ...children.flat().filter((p): p is string => !!p && !visited.has(p)),
      );
    }
  }
  const watch = files?.watch?.((path) => {
    texts.delete(toUri(path));
    directories.clear();
  });
  return {
    invalidate(path: string) {
      texts.delete(path);
    },
    load,
    sync,
    text: (uri: string) => texts.get(uri),
    dispose: () => watch?.dispose(),
  };
}
