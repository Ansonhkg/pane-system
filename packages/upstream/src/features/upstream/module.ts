import { defineModule } from "../../core/contracts/module";
import { PACKAGE } from "../../core/package-info";
export const module = defineModule({
  id: "upstream",
  dependencies: [],
  flag: { key: "features.upstream", defaultEnabled: false },
  disablePolicy: "finish",
  operations: ["upstream.inspect"],
  publicExports: ["src/features/upstream/index.ts"],
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
