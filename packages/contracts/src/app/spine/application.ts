import type {
  ModuleDefinition,
  Flags,
  ModuleContext,
} from "../../core/contracts/module";
export function createApplication(
  modules: readonly ModuleDefinition[],
  flags: Flags,
) {
  const services = new Map<string, unknown>();
  const registered = modules.filter((module) => flags.enabled(module.flag.key));
  for (const module of registered) module.register({ services });
  function owner(operation: string) {
    const module = modules.find((module) =>
      module.operations.includes(operation),
    );
    if (!module) throw new Error("Unknown operation: " + operation);
    return module.flag.key;
  }
  function enabled(key: string) {
    return flags.enabled(key);
  }
  return {
    services,
    assertEnabled(operation: string) {
      if (!enabled(owner(operation))) throw new Error("Feature is disabled.");
    },
    disabledPolicy(operation: string) {
      return (
        modules.find((module) => module.operations.includes(operation))
          ?.disablePolicy ?? "stop"
      );
    },
    async step(context: ModuleContext) {
      const module = registered.find((module) =>
        module.operations.includes(context.run.operation),
      );
      if (!module) throw new Error("Feature is disabled.");
      return module.step(context);
    },
    dispose() {
      for (const module of [...registered].reverse())
        module.cleanup({ services });
      services.clear();
    },
  };
}
