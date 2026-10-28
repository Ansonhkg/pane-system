import { Database } from "bun:sqlite";
import type { HostInput } from "../core/operations";
import { OPERATION } from "../core/operations";
import { acquireLedger } from "./lease";
export interface RunRecord {
  id: string;
  operation: string;
  input: HostInput;
  status: "queued" | "running" | "paused" | "completed" | "failed" | "stopped";
  result?: unknown;
  error?: string;
  createdAt: string;
  definitionVersion?: 1;
  checkpoint?: "accepted" | "executing" | "complete" | "interrupted";
  scope?: string;
  reconciliation?: string;
}
export function createLedger(
  path: string,
  execute: (id: string, input: HostInput) => Promise<unknown>,
  scope?: () => string,
) {
  const owner = acquireLedger(path);
  let db: Database;
  try {
    db = new Database(path, { create: true });
  } catch (error) {
    owner.dispose();
    throw error;
  }
  let disposed = false;
  db.exec(
    "PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, request_key TEXT UNIQUE NOT NULL, data TEXT NOT NULL)",
  );
  const active = new Map<string, Promise<RunRecord>>();
  function decode(row: unknown): RunRecord | undefined {
    if (
      !row ||
      typeof row !== "object" ||
      !("data" in row) ||
      typeof row.data !== "string"
    )
      return;
    return JSON.parse(row.data) as RunRecord;
  }
  function get(id: string) {
    const run = decode(db.query("SELECT data FROM runs WHERE id = ?").get(id));
    if (!run) throw new Error("Unknown run: " + id);
    return run;
  }
  function save(run: RunRecord) {
    if (disposed) return;
    db.query("UPDATE runs SET data = ? WHERE id = ?").run(
      JSON.stringify(run),
      run.id,
    );
  }
  const reads = new Set<string>([
    OPERATION.LIST,
    OPERATION.READ,
    OPERATION.STATUS,
    OPERATION.DIFF,
    OPERATION.PATCH,
    OPERATION.HEAD,
    OPERATION.DOCTOR,
  ]);
  for (const row of db.query("SELECT data FROM runs").all()) {
    const run = decode(row);
    if (!run || run.status !== "running") continue;
    if (reads.has(run.operation) && run.definitionVersion === 1) {
      run.status = "queued";
      run.checkpoint = "accepted";
    } else {
      run.status = "failed";
      run.checkpoint = "interrupted";
      run.error =
        "Execution stopped before the result was saved. Check the file or Git state before reconciliation.";
    }
    save(run);
  }
  async function work(run: RunRecord) {
    if (run.status !== "queued") return run;
    if (run.scope && scope && run.scope !== scope()) {
      run.status = "paused";
      run.error = "Open the recorded folder to resume this run.";
      save(run);
      return run;
    }
    run.status = "running";
    run.checkpoint = "executing";
    save(run);
    try {
      run.result = await execute(run.operation, run.input);
      run.status = "completed";
      run.checkpoint = "complete";
      delete run.error;
    } catch (error) {
      run.status = "failed";
      run.error = String(error);
    }
    save(run);
    return run;
  }
  return {
    get,
    list() {
      return db
        .query("SELECT data FROM runs ORDER BY rowid DESC LIMIT 100")
        .all()
        .map(decode)
        .filter((r) => r !== undefined);
    },
    async run(operation: string, input: HostInput, key: string) {
      if (disposed) throw new Error("The host is closed.");
      const existing = decode(
        db.query("SELECT data FROM runs WHERE request_key = ?").get(key),
      );
      if (existing) {
        if (
          existing.operation !== operation ||
          JSON.stringify(existing.input) !== JSON.stringify(input)
        )
          throw new Error("Request key has different input.");
        return active.get(existing.id) ?? existing;
      }
      const record: RunRecord = {
        id: crypto.randomUUID(),
        operation,
        input,
        status: "queued",
        createdAt: new Date().toISOString(),
        definitionVersion: 1,
        checkpoint: "accepted",
        scope: scope?.(),
      };
      db.query("INSERT INTO runs (id,request_key,data) VALUES (?,?,?)").run(
        record.id,
        key,
        JSON.stringify(record),
      );
      const promise = work(record);
      active.set(record.id, promise);
      try {
        return await promise;
      } finally {
        active.delete(record.id);
      }
    },
    async control(id: string, action: "pause" | "resume" | "stop") {
      const run = get(id);
      if (run.status === "running")
        throw new Error(
          "This operation is at an atomic step. Read its final status.",
        );
      if (
        run.status === "completed" ||
        run.status === "failed" ||
        run.status === "stopped"
      )
        return run;
      if (action === "pause") run.status = "paused";
      if (action === "stop") run.status = "stopped";
      save(run);
      if (action === "resume") {
        run.status = "queued";
        save(run);
        return work(run);
      }
      return run;
    },
    reconcile(id: string, result: unknown, reason: string) {
      const run = get(id);
      if (
        run.checkpoint !== "interrupted" ||
        run.status !== "failed" ||
        !reason.trim()
      )
        throw new Error(
          "Only an interrupted run can be reconciled. Supply a reason.",
        );
      if (run.scope && scope && run.scope !== scope())
        throw new Error("Open the recorded folder before reconciliation.");
      run.status = "completed";
      run.result = result;
      run.reconciliation = reason;
      run.checkpoint = "complete";
      delete run.error;
      save(run);
      return run;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      db.close();
      owner.dispose();
    },
  };
}
