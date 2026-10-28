import { createRequire } from "node:module";
import { resolve } from "node:path";
import { createHost } from "@pane-system/host/server";
import { PATHS } from "../../core/paths";

const root = resolve(import.meta.dir, PATHS.workspace);
const workspaceFlag = process.argv.indexOf("--workspace");
if (workspaceFlag >= 0 && !process.argv[workspaceFlag + 1])
  throw new Error("Supply a path after --workspace.");
const workspace =
  workspaceFlag >= 0 ? resolve(process.argv[workspaceFlag + 1]) : root;
const build = await Bun.build({
  entrypoints: [resolve(root, PATHS.desktopMain)],
  outdir: resolve(root, PATHS.assets),
  naming: "desktop-main.cjs",
  target: "node",
  format: "cjs",
  external: ["electron"],
});
if (!build.success) throw new Error(build.logs.join("\n"));
const host = await createHost({
  root: workspace,
  assets: resolve(root, PATHS.assets),
  index: resolve(root, PATHS.index),
  state: resolve(root, PATHS.desktopState),
  port: PATHS.desktopPort,
});
const electron = createRequire(import.meta.url)("electron") as string;
try {
  const child = Bun.spawn([electron, resolve(root, PATHS.desktopBundle)], {
    env: { ...Bun.env, PANE_DESKTOP_URL: host.url },
    stdout: "inherit",
    stderr: "inherit",
  });
  const stop = () => child.kill();
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  process.exitCode = await child.exited;
} finally {
  host.dispose();
}
