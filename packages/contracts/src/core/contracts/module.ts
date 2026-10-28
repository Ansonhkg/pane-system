export interface Run {
  id: string;
  operation: string;
  input: unknown;
  status: "queued" | "paused" | "stopped" | "completed" | "failed";
  result?: unknown;
  error?: string;
}
export interface RunStore {
  create(operation: string, input: unknown): Run;
  get(id: string): Run;
  save(run: Run): void;
  control(id: string, action: "resume" | "pause" | "stop"): Run;
}
export interface Flags {
  enabled(key: string): boolean;
}
export interface ModuleContext {
  run: Run;
  services: Map<string, unknown>;
  invoke?: (operation: string, input: unknown) => Promise<unknown>;
}
export interface ModuleDefinition {
  id: string;
  dependencies: readonly string[];
  flag: { key: string; defaultEnabled: false };
  disablePolicy: "finish" | "pause" | "stop";
  operations: readonly string[];
  publicExports: readonly string[];
  register(context: { services: Map<string, unknown> }): void;
  cleanup(context: { services: Map<string, unknown> }): void;
  step(context: ModuleContext): Promise<unknown>;
}
export function defineModule<T extends ModuleDefinition>(definition: T): T {
  return definition;
}
export interface PackageApplication {
  assertEnabled(operation: string): void;
  disabledPolicy(operation: string): "finish" | "pause" | "stop";
  step(context: ModuleContext): Promise<unknown>;
  dispose(): void;
}
export interface PackageProvider {
  application: PackageApplication;
  runs: RunStore;
  services: Map<string, unknown>;
  invoke?: ModuleContext["invoke"];
}
