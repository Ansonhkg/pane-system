import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, dirname, resolve, extname, relative } from "node:path";
import { ARTIFACT_PATHS as P, DECLARATION_EXTENSION } from "../core/paths";
type ExportTarget = string | { types: string; default: string };
interface Manifest {
  name: string;
  version: string;
  private?: boolean;
  type: string;
  exports: Record<string, ExportTarget>;
  dependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  license?: string;
}
async function copyDeclarations(source: string, destination: string) {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const from = join(source, entry.name);
    const to = join(destination, entry.name);
    if (entry.isDirectory()) await copyDeclarations(from, to);
    else if (entry.name.endsWith(DECLARATION_EXTENSION)) await cp(from, to);
  }
}
export async function createArtifacts(root: string) {
  const typed = Bun.spawn(
    ["bun", "x", "--no-install", "tsc", "--project", P.buildConfig],
    { cwd: root, stdout: "inherit", stderr: "inherit" },
  );
  if (await typed.exited) throw new Error("Declaration build failed.");
  const archives = join(root, P.archives);
  await mkdir(archives, { recursive: true });
  const results: { name: string; archive: string; bytes: number }[] = [];
  const names = await readdir(join(root, P.packages));
  const versions = new Map<string, string>();
  for (const name of names) {
    const pkg = (await Bun.file(
      join(root, P.packages, name, P.manifest),
    ).json()) as Manifest;
    versions.set(pkg.name, pkg.version);
  }
  const upstream = join(root, P.upstream);
  const monacoRoot = resolve(
    dirname(Bun.resolveSync(P.monaco, upstream)),
    "../..",
  );
  for (const name of names) {
    const source = join(root, P.packages, name);
    const pkg = (await Bun.file(join(source, P.manifest)).json()) as Manifest;
    const stageParent = join(root, P.staging, name);
    const stage = join(stageParent, "package");
    await mkdir(stage, { recursive: true });
    await cp(join(root, P.declarations, name, P.source), join(stage, P.types), {
      recursive: true,
    });
    await copyDeclarations(join(source, P.source), join(stage, P.types));
    await cp(join(root, P.license), join(stage, P.license));
    const exports: Record<string, ExportTarget> = {};
    if (name === "upstream") {
      await mkdir(join(stage, P.native), { recursive: true });
      for (const entry of await readdir(join(source, P.output), {
        withFileTypes: true,
      })) {
        if (entry.isFile())
          await cp(
            join(source, P.output, entry.name),
            join(stage, P.native, entry.name),
          );
      }
      await cp(join(source, "vendor"), join(stage, "vendor"), {
        recursive: true,
      });
      await cp(join(source, P.license), join(stage, P.license));
      await cp(
        join(monacoRoot, P.monacoDeclaration),
        join(stage, P.monacoTypes),
      );
      const types = await readFile(join(stage, P.editorTypes), "utf8");
      await writeFile(
        join(stage, P.editorTypes),
        types.replace(
          'import type * as Monaco from "monaco-editor";',
          'import type { m as Monaco } from "./monaco";',
        ),
      );
    }
    await cp(join(monacoRoot, P.monacoNotices), join(stage, P.monacoNotices));
    const ownNotices = Bun.file(join(source, P.monacoNotices));
    if (await ownNotices.exists())
      await writeFile(
        join(stage, P.monacoNotices),
        (await Bun.file(join(stage, P.monacoNotices)).text()) +
          "\n" +
          (await ownNotices.text()),
      );
    for (const [subpath, target] of Object.entries(pkg.exports)) {
      const file = typeof target === "string" ? target : target.default;
      if (file.startsWith("./dist/")) {
        const next = "./" + P.native + "/" + file.slice("./dist/".length);
        if (typeof target === "string") exports[subpath] = next;
        else
          exports[subpath] = {
            types: target.types
              .replace("./src/", "./types/")
              .replace("/lifecycle.ts", "/lifecycle.d.ts"),
            default: next,
          };
        continue;
      }
      const entry = join(source, file);
      const id =
        subpath === "." ? "index" : subpath.slice(2).replaceAll("/", "-");
      if (file.endsWith(".css")) {
        const css = await Bun.build({
          entrypoints: [entry],
          outdir: join(stage, "styles"),
          target: "browser",
          minify: true,
          loader: { ".ttf": "file" },
          naming: { entry: "[name].[ext]", asset: "[name]-[hash].[ext]" },
        });
        if (!css.success)
          throw new AggregateError(css.logs, "CSS package build failed.");
        const output = css.outputs.find((file) => file.path.endsWith(".css"));
        if (!output) throw new Error("CSS output is missing.");
        exports[subpath] = "./" + relative(stage, output.path);
        continue;
      }
      const browser =
        (name !== "host" &&
          subpath !== "./node" &&
          subpath !== "./package-host") ||
        (name === "host" &&
          (subpath === "./client" || subpath === "./operations"));
      const result = await Bun.build({
        entrypoints: [entry],
        outdir: join(stage, P.lib),
        target: browser ? "browser" : "bun",
        format: "esm",
        minify: true,
        external: ["@pane-system/*"],
        naming: { entry: id + ".js" },
      });
      if (!result.success)
        throw new AggregateError(
          result.logs,
          "Package build failed: " + pkg.name + subpath,
        );
      exports[subpath] = {
        types:
          file.replace("./src/", "./types/").slice(0, -extname(file).length) +
          DECLARATION_EXTENSION,
        default: "./" + P.lib + "/" + id + ".js",
      };
    }
    const dependencies: Record<string, string> = {};
    for (const [dependency, version] of Object.entries(
      pkg.dependencies ?? {},
    )) {
      if (dependency.startsWith("@pane-system/"))
        dependencies[dependency] = versions.get(dependency) ?? version;
    }
    await writeFile(
      join(stage, P.manifest),
      JSON.stringify(
        {
          name: pkg.name,
          version: pkg.version,
          type: "module",
          license: "MIT",
          exports,
          dependencies,
        },
        null,
        2,
      ) + "\n",
    );
    const archive = join(archives, name + "-" + pkg.version + ".tgz");
    const packed = Bun.spawnSync([
      "tar",
      "-czf",
      archive,
      "-C",
      stageParent,
      "package",
    ]);
    if (packed.exitCode) throw new Error(packed.stderr.toString());
    results.push({ name: pkg.name, archive, bytes: Bun.file(archive).size });
  }
  return results;
}
