import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHost } from "@pane-system/host/server";
import { PATHS } from "../../core/paths";
import { prepareWorkspace } from "../../platform/workspace";
const root = resolve(import.meta.dir, PATHS.workspace);
const index = process.argv.indexOf("--workspace");
const workspace =
  index >= 0
    ? resolve(process.argv[index + 1])
    : await prepareWorkspace(resolve(root, PATHS.fixture));
const host = await createHost({
  root: workspace,
  async recordMeasurements(value) {
    await writeFile(
      resolve(root, PATHS.performance),
      JSON.stringify(value, null, 2) + "\n",
    );
  },
  assets: resolve(root, PATHS.assets),
  index: resolve(root, PATHS.index),
  state: resolve(root, PATHS.state),
  port: Number(Bun.env.PORT ?? 4318),
  pages: { [PATHS.layoutRoute]: resolve(root, PATHS.layoutPage) },
});
console.log("Pane System: " + host.url);
console.log("Workspace: " + workspace);
process.on("SIGINT", () => {
  host.dispose();
  process.exit();
});
process.on("SIGTERM", () => {
  host.dispose();
  process.exit();
});
