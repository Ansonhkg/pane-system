import { defineModule } from "../../core/contracts/module";
import { PACKAGE } from "../../core/package-info";
export const module = defineModule({
  id: "host",
  dependencies: [],
  flag: { key: "features.host", defaultEnabled: false },
  disablePolicy: "finish",
  operations: ["host.inspect"],
  publicExports: ["src/features/host/index.ts"],
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
