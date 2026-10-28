import { defineModule } from "../../core/contracts/module";
import { PACKAGE } from "../../core/package-info";
export const module = defineModule({
  id: "layout",
  dependencies: [],
  flag: { key: "features.layout", defaultEnabled: false },
  disablePolicy: "finish",
  operations: ["layout.inspect"],
  publicExports: ["src/features/layout/index.ts"],
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
