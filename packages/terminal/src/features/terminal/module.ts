import { defineModule } from "../../core/contracts/module";
import { PACKAGE } from "../../core/package-info";
export const module = defineModule({
  id: "terminal",
  dependencies: [],
  flag: { key: "features.terminal", defaultEnabled: false },
  disablePolicy: "finish",
  operations: ["terminal.inspect"],
  publicExports: ["src/features/terminal/index.ts"],
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
