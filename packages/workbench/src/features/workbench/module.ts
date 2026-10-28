import { defineModule } from "../../core/contracts/module";
import { PACKAGE } from "../../core/package-info";
export const module = defineModule({
  id: "workbench",
  dependencies: [],
  flag: { key: "features.workbench", defaultEnabled: false },
  disablePolicy: "finish",
  operations: ["workbench.inspect"],
  publicExports: ["src/features/workbench/index.ts"],
  register({ services }) {
    services.set(PACKAGE.name, PACKAGE);
  },
  cleanup({ services }) {
    services.delete(PACKAGE.name);
  },
  async step() {
    return PACKAGE;
  },
});
