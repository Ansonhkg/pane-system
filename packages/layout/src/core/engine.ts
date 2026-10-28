import type { PackageProvider, Run } from "@pane-system/contracts/module";
export async function executeRun(provider: PackageProvider, run: Run) {
  if (run.status !== "queued") return run;
  const policy = provider.application.disabledPolicy(run.operation);
  try {
    run.result = await provider.application.step({
      run,
      services: provider.services,
      invoke: provider.invoke,
    });
    run.status = "completed";
  } catch (error) {
    run.error = String(error);
    run.status = "failed";
  }
  provider.runs.save(run);
  return { ...run, disablePolicy: policy };
}
export async function runOperation(
  provider: PackageProvider,
  operation: string,
  input: unknown,
) {
  provider.application.assertEnabled(operation);
  const run = provider.runs.create(operation, input);
  return executeRun(provider, run);
}
