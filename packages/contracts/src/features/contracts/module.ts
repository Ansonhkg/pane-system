import { defineModule } from "../../core/contracts/module";
import { PACKAGE } from "../../core/package-info";
export const module = defineModule({
  id: "contracts",
  dependencies: [],
  flag: { key: "features.contracts", defaultEnabled: false },
  disablePolicy: "finish",
  operations: ["contracts.inspect"],
  publicExports: ["src/features/contracts/index.ts"],
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
