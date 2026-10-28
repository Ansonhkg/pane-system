import { PACKAGE_RUN_PATH } from "../../core/paths";
import { createFileRuns } from "@pane-system/contracts/node";
import { servePackage } from "@pane-system/contracts/package-host";
import { createPackageProvider } from "../bootstrap/providers";
import { runOperation } from "../../core/engine";
import { PACKAGE_OPERATION } from "../../core/operation-ids";
import { resolve } from "node:path";
const runs = createFileRuns(resolve(process.cwd(), PACKAGE_RUN_PATH));
const provider = createPackageProvider({
  runs,
  flags: { enabled: (key) => key === "features.explorer" },
});
const execute = (operation: string, input: unknown) =>
  runOperation(provider, operation, input);
if (process.argv.includes("--serve")) {
  const server = await servePackage({
    provider,
    run: execute,
    port: Number(Bun.env.PORT ?? 4320),
  });
  console.log(JSON.stringify({ url: server.url, token: server.token }));
} else {
  try {
    const result = await execute(PACKAGE_OPERATION.INSPECT, {});
    console.log(JSON.stringify(result));
    if (result.status === "failed") process.exitCode = 1;
  } finally {
    provider.application.dispose();
  }
}
