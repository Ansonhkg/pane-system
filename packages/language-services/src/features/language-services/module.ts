import { defineModule } from "../../core/contracts/module";
import { PACKAGE } from "../../core/package-info";
export const module = defineModule({
  id: "language-services",
  dependencies: [],
  flag: { key: "features.language-services", defaultEnabled: false },
  disablePolicy: "finish",
  operations: ["language.inspect"],
  publicExports: ["src/features/language-services/index.ts"],
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
