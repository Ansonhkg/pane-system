import { defineModule } from "../../core/contracts/module";
import { PACKAGE } from "../../core/package-info";
export const module = defineModule({
  id: "syntax",
  dependencies: [],
  flag: { key: "features.syntax", defaultEnabled: false },
  disablePolicy: "finish",
  operations: ["syntax.inspect"],
  publicExports: ["src/features/syntax/index.ts"],
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
