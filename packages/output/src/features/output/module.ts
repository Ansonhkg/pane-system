import { defineModule } from "../../core/contracts/module";
import { PACKAGE } from "../../core/package-info";
export const module = defineModule({
  id: "output",
  dependencies: [],
  flag: { key: "features.output", defaultEnabled: false },
  disablePolicy: "finish",
  operations: ["output.inspect"],
  publicExports: ["src/features/output/index.ts"],
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
