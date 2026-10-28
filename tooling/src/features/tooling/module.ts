import { defineModule } from "../../core/contracts/module";
import { PACKAGE } from "../../core/package-info";
export const module = defineModule({
  id: "tooling",
  dependencies: [],
  flag: { key: "features.tooling", defaultEnabled: false },
  disablePolicy: "finish",
  operations: ["tooling.inspect"],
  publicExports: ["src/features/tooling/index.ts"],
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
