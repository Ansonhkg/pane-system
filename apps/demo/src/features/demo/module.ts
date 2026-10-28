import { defineModule } from "../../core/contracts/module";
import { PACKAGE } from "../../core/package-info";
export const module = defineModule({
  id: "demo",
  dependencies: [],
  flag: { key: "features.demo", defaultEnabled: false },
  disablePolicy: "finish",
  operations: ["demo.inspect"],
  publicExports: ["src/features/demo/index.ts"],
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
