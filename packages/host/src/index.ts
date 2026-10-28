export { createFiles } from "./platform/files";
export { createGit } from "./platform/git";
export { createOperations, OPERATION, type HostInput } from "./core/operations";

import type { PackageProvider } from "@pane-system/contracts/module";
import { executeRun, runOperation } from "./core/engine";
import { PACKAGE_OPERATION } from "./core/operation-ids";
import { OPERATION } from "./core/operation-ids";
import type { SearchQuery } from "@pane-system/contracts";
export { createPackageProvider } from "./app/bootstrap/providers";
export async function inspectPackage(provider: PackageProvider) {
  return runOperation(provider, PACKAGE_OPERATION.INSPECT, {});
}
export async function searchFiles(
  provider: PackageProvider,
  search: SearchQuery,
) {
  return runOperation(provider, OPERATION.SEARCH, { search });
}
export async function resumeRun(provider: PackageProvider, id: string) {
  provider.application.assertEnabled(provider.runs.get(id).operation);
  const run = provider.runs.control(id, "resume");
  return executeRun(provider, run);
}
