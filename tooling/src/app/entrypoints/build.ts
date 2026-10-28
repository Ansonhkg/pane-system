import { generateNativeDrop } from "../../platform/native-drop";
import { verifySource } from "../../platform/integrity";
import { compressAssets } from "../../platform/compress";
import { BUILD_PATHS, LANGUAGE_WORKER } from "../../core/paths";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
const root = resolve(import.meta.dir, "../../../..");
const upstream = join(root, "packages/upstream");
const source = join(upstream, "dist/source");
await mkdir(source, { recursive: true });
const unpack = Bun.spawnSync([
  "tar",
  "-xzf",
  join(upstream, "vendor/vscode-source.tar.gz"),
  "-C",
  source,
]);
if (unpack.exitCode) throw new Error(unpack.stderr.toString());
console.log("Source integrity", await verifySource(upstream, source));
await generateNativeDrop(source);
const entries = {
  drop: "export {NativeDropGeometry,TAB_DRAG_OVER_OPEN_THRESHOLD} from './standalone-drop.ts';\nimport './src/vs/workbench/browser/parts/editor/media/editordroptarget.css';",
  chrome:
    "export { Color } from './src/vs/base/common/color.ts';\nexport { ActionBar } from './src/vs/base/browser/ui/actionbar/actionbar.ts';\nexport { DragAndDropObserver } from './src/vs/base/browser/dom.ts';\nexport { applyDragImage } from './src/vs/base/browser/ui/dnd/dnd.ts';\nexport { isMacintosh } from './src/vs/base/common/platform.ts';\nexport { Action } from './src/vs/base/common/actions.ts';\nexport { ThemeIcon } from './src/vs/base/common/themables.ts';\nexport { Codicon } from './src/vs/base/common/codicons.ts';\nexport { getIconsStyleSheet } from './src/vs/platform/theme/browser/iconsStyleSheet.ts';\nimport './src/vs/base/browser/ui/codicons/codiconStyles.ts';",

  keys: "export { KeybindingParser } from './src/vs/base/common/keybindingParser.ts';\nexport { StandardKeyboardEvent } from './src/vs/base/browser/keyboardEvent.ts';\nexport { ScanCodeChord, KeyCodeChord } from './src/vs/base/common/keybindings.ts';\nexport { ScanCodeUtils } from './src/vs/base/common/keyCodes.ts';\nexport { isMacintosh } from './src/vs/base/common/platform.ts';\nexport { ContextKeyExpr } from './src/vs/platform/contextkey/common/contextkey.ts';",
  groups:
    "export { EditorGroupModel } from './src/vs/workbench/common/editor/editorGroupModel.ts';\nexport { EditorInput } from './src/vs/workbench/common/editor/editorInput.ts';\nexport { EditorsOrder } from './src/vs/workbench/common/editor.ts';",
  layout:
    "export * from './src/vs/base/browser/ui/grid/grid.ts';\nexport { Emitter, Event } from './src/vs/base/common/event.ts';\nexport { DisposableStore, toDisposable } from './src/vs/base/common/lifecycle.ts';",
  tree: "export { AsyncDataTree } from './src/vs/base/browser/ui/tree/asyncDataTree.ts';\nexport { Emitter, Event } from './src/vs/base/common/event.ts';",
  editor: "export * from './src/vs/editor/editor.main.ts';",
  "editor-worker":
    "import { start } from './src/vs/editor/editor.worker.start.ts';\nself.onmessage = () => { start(() => ({})); };",
};
for (const [name, content] of Object.entries(entries)) {
  const entry = join(source, name + ".ts");
  await writeFile(entry, content);
  const result = await Bun.build({
    entrypoints: [entry],
    outdir: join(upstream, "dist"),
    target: "browser",
    format: "esm",
    minify: true,
    loader: { ".ttf": "file", ".svg": "file", ".png": "file" },
    naming: { entry: "[name].[ext]", asset: "[name]-[hash].[ext]" },
    define: { "process.env.NODE_ENV": '"production"' },
  });
  if (!result.success) {
    console.error(result.logs);
    process.exit(1);
  }
  console.log(
    name,
    result.outputs
      .map((o) => `${o.path.split("/").at(-1)}: ${o.size} bytes`)
      .join(", "),
  );
}
const demo = await Bun.build({
  entrypoints: [
    join(root, BUILD_PATHS.demo),
    join(root, BUILD_PATHS.layoutDemo),
  ],
  outdir: join(root, "dist"),
  target: "browser",
  format: "esm",
  minify: true,
  loader: { ".ttf": "file", ".svg": "file", ".png": "file" },
  naming: { entry: "[name].[ext]", asset: "[name]-[hash].[ext]" },
});
if (!demo.success) {
  console.error(demo.logs);
  process.exit(1);
}
for (const name of [BUILD_PATHS.worker])
  await writeFile(
    join(root, "dist", name),
    await readFile(join(upstream, "dist", name)),
  );
console.log(
  "demo",
  demo.outputs
    .map((o) => `${o.path.split("/").at(-1)}: ${o.size} bytes`)
    .join(", "),
);

const languageWorker = await Bun.build({
  entrypoints: [join(root, LANGUAGE_WORKER)],
  outdir: join(root, "dist"),
  target: "browser",
  format: "esm",
  minify: true,
  naming: { entry: "language-worker.js" },
});
if (!languageWorker.success) {
  console.error(languageWorker.logs);
  process.exit(1);
}
console.log("language worker", languageWorker.outputs[0].size);

await writeFile(
  join(root, "dist", BUILD_PATHS.logoName),
  await readFile(join(root, BUILD_PATHS.logo)),
);
await compressAssets(join(root, "dist"));
