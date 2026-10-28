import { defineModule } from "../../core/contracts/module";
import { PACKAGE } from "../../core/package-info";
export const module = defineModule({
  id: "explorer",
  dependencies: [],
  flag: { key: "features.explorer", defaultEnabled: false },
  disablePolicy: "finish",
  operations: ["explorer.inspect"],
  publicExports: ["src/features/explorer/index.ts"],
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
