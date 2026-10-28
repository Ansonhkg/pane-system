import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import { createFiles } from "../../platform/files";
import { createGit } from "../../platform/git";
import {
  createOperations,
  OPERATION,
  type HostInput,
} from "../../core/operations";
import { createLedger } from "../../platform/ledger";
import { createHostClient } from "../../platform/transport/client";
import { PATHS } from "../../core/paths";
const args = process.argv.slice(2);
function option(name: string) {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}
const id = args[0] === "doctor" ? OPERATION.DOCTOR : args[0];
const raw: unknown = JSON.parse(option("--input") ?? "{}");
if (!raw || typeof raw !== "object" || Array.isArray(raw))
  throw new Error("Supply an input object.");
const input = raw as HostInput & {
  runId?: string;
  result?: unknown;
  reason?: string;
};
if (
  (id === OPERATION.REMOVE ||
    id === OPERATION.DISCARD ||
    id === OPERATION.STASH) &&
  !args.includes("--yes")
)
  throw new Error("Supply --yes to confirm file removal.");
async function main() {
  const url = option("--url");
  if (url) {
    const token = Bun.env.PANE_HOST_TOKEN;
    if (!token) throw new Error("Set PANE_HOST_TOKEN.");
    const client = createHostClient({ base: url, token });
    await client.doctor();
    const runId = input.runId ?? "";
    switch (id) {
      case "runs.list":
        return client.listRuns();
      case "runs.get":
        return client.getRun(runId);
      case "runs.pause":
        return client.pauseRun(runId);
      case "runs.resume":
        return client.resumeRun(runId);
      case "runs.stop":
        return client.stopRun(runId);
      case "runs.reconcile":
        return client.reconcileRun(runId, input.result, input.reason ?? "");
      default:
        return client.run(id, input, option("--key"));
    }
  }
  const root = resolve(option("--root") ?? process.cwd());
  const files = await createFiles(root);
  const git = createGit({ root, files });
  const state = resolve(root, PATHS.state);
  await mkdir(resolve(state, ".."), { recursive: true });
  const ledger = createLedger(
    state,
    createOperations({ root, files, git, runtime: Bun.version }),
    () => root,
  );
  try {
    const runId = input.runId ?? "";
    switch (id) {
      case "runs.list":
        return ledger.list();
      case "runs.get":
        return ledger.get(runId);
      case "runs.pause":
        return await ledger.control(runId, "pause");
      case "runs.resume":
        return await ledger.control(runId, "resume");
      case "runs.stop":
        return await ledger.control(runId, "stop");
      case "runs.reconcile":
        return ledger.reconcile(runId, input.result, input.reason ?? "");
      default:
        return await ledger.run(
          id,
          input,
          option("--key") ?? crypto.randomUUID(),
        );
    }
  } finally {
    git.dispose();
    ledger.dispose();
  }
}
try {
  const result = await main();
  console.log(JSON.stringify(result, null, 2));
  if (
    result &&
    typeof result === "object" &&
    "status" in result &&
    result.status === "failed"
  )
    process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({ error: String(error) }));
  process.exitCode = 1;
}
