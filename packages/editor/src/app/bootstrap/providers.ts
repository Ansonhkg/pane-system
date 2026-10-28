import { createApplication } from "../spine/application";
import { modules } from "./modules";
import type {
  RunStore,
  Flags,
  ModuleContext,
  PackageProvider,
} from "@pane-system/contracts/module";
export function createPackageProvider(options: {
  runs: RunStore;
  flags: Flags;
  invoke?: ModuleContext["invoke"];
}): PackageProvider {
  const application = createApplication(modules, options.flags);
  return {
    application,
    runs: options.runs,
    services: application.services,
    invoke: options.invoke,
  };
}
