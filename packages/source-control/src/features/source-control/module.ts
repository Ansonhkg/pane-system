import { defineModule } from "../../core/contracts/module";
import { PACKAGE } from "../../core/package-info";
export const module = defineModule({
  id: "source-control",
  dependencies: [],
  flag: { key: "features.source-control", defaultEnabled: false },
  disablePolicy: "finish",
  operations: ["sourcecontrol.inspect"],
  publicExports: ["src/features/source-control/index.ts"],
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
