import { defineModule } from "../../core/contracts/module";
import { PACKAGE } from "../../core/package-info";
export const module = defineModule({
  id: "editor",
  dependencies: [],
  flag: { key: "features.editor", defaultEnabled: false },
  disablePolicy: "finish",
  operations: ["editor.inspect"],
  publicExports: ["src/features/editor/index.ts"],
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
