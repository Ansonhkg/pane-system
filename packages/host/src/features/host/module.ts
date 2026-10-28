import { defineModule } from "../../core/contracts/module";
import { PACKAGE } from "../../core/package-info";
import { OPERATION } from "../../core/operation-ids";
export const module = defineModule({
  id: "host",
  dependencies: [],
  flag: { key: "features.host", defaultEnabled: false },
  disablePolicy: "finish",
  operations: ["host.inspect", "files.search"],
  publicExports: ["src/features/host/index.ts"],
  register({ services }) {
    services.set(PACKAGE.name, PACKAGE);
  },
  cleanup({ services }) {
    services.delete(PACKAGE.name);
  },
  async step(context) {
    if (context.run.operation === OPERATION.SEARCH) {
      if (!context.invoke)
        throw new Error(
          "Configure the host operation adapter to search files.",
        );
      return context.invoke(OPERATION.SEARCH, context.run.input);
    }
    return PACKAGE;
  },
});
