export {
  createWorkbench,
  type Workbench,
  type WorkbenchOptions,
} from "./core/workbench";
export { createCommands } from "./core/commands";
export {
  createThemeController,
  resolveTheme,
  type ThemeSettings,
  type ThemePalette,
  type ThemeController,
} from "./core/theme/controller";
export { createThemeEditor } from "./core/theme/editor";
export { themeContrast } from "./core/theme/color";

import type { PackageProvider } from "@pane-system/contracts/module";
import { executeRun, runOperation } from "./core/engine";
import { PACKAGE_OPERATION } from "./core/operation-ids";
export { createPackageProvider } from "./app/bootstrap/providers";
export async function inspectPackage(provider: PackageProvider) {
  return runOperation(provider, PACKAGE_OPERATION.INSPECT, {});
}
export async function resumeRun(provider: PackageProvider, id: string) {
  provider.application.assertEnabled(provider.runs.get(id).operation);
  const run = provider.runs.control(id, "resume");
  return executeRun(provider, run);
}

export { createContext, type Context, type ContextValue } from "./core/context";
