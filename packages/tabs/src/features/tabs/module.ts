import { defineModule } from "../../core/contracts/module";
import { PACKAGE } from "../../core/package-info";
export const module = defineModule({
  id: "tabs",
  dependencies: [],
  flag: { key: "features.tabs", defaultEnabled: false },
  disablePolicy: "finish",
  operations: ["tabs.inspect"],
  publicExports: ["src/features/tabs/index.ts"],
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
