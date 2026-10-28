import { createRequire } from "node:module";
import { resolve } from "node:path";
import { createHost } from "@pane-system/host/server";
import { PATHS } from "../../core/paths";
import { measurementFlags } from "../../core/measurement-flags";

const root = resolve(import.meta.dir, PATHS.workspace);
if (process.argv.includes("--help")) {
  console.log(
    "Desktop measurement: --workspace <path> --port <port> --disable <features>\n" +
      "Features: editor, explorer, source-control, terminal, language, auxiliary.\n" +
      "Disabling editor also disables language. Profiles use separate layout state.\n" +
      "Auxiliary covers output, problems, search, input, context, and connections.\n" +
      "Code remains loaded; the switches measure initialized feature workloads.\n" +
      "Open a file to measure the editor. Use a language feature to start its worker.",
  );
  process.exit(0);
}
const workspaceFlag = process.argv.indexOf("--workspace");
if (workspaceFlag >= 0 && !process.argv[workspaceFlag + 1])
  throw new Error("Supply a path after --workspace.");
const workspace =
  workspaceFlag >= 0 ? resolve(process.argv[workspaceFlag + 1]) : root;
const disableFlag = process.argv.indexOf("--disable");
if (disableFlag >= 0 && !process.argv[disableFlag + 1])
  throw new Error("Supply feature names after --disable.");
const flags = measurementFlags(
  disableFlag >= 0 ? process.argv[disableFlag + 1] : null,
);
console.log(
  flags.disabled.length
    ? "Measurement profile: disabled " + flags.disabled.join(", ")
    : "Measurement profile: all features enabled",
);
const portFlag = process.argv.indexOf("--port");
const port =
  portFlag >= 0 ? Number(process.argv[portFlag + 1]) : PATHS.desktopPort;
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("Supply a port between 1 and 65535.");
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
  state: resolve(
    root,
    port === PATHS.desktopPort
      ? PATHS.desktopState
      : PATHS.desktopState + "." + port,
  ),
  port,
});
const electron = createRequire(import.meta.url)("electron") as string;
try {
  const url = new URL(host.url);
  if (flags.disabled.length)
    url.searchParams.set("measure-disable", flags.disabled.join(","));
  const child = Bun.spawn([electron, resolve(root, PATHS.desktopBundle)], {
    env: { ...Bun.env, PANE_DESKTOP_URL: url.toString() },
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
