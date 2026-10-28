import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  renameSync,
  existsSync,
} from "node:fs";
import { dirname } from "node:path";
import type { Run, RunStore } from "../core/contracts/module";
export function createFileRuns(path: string): RunStore {
  mkdirSync(dirname(path), { recursive: true });
  const data: Run[] = existsSync(path)
    ? JSON.parse(readFileSync(path, "utf8"))
    : [];
  const runs = new Map(data.map((run) => [run.id, run]));
  function flush() {
    const temporary = path + ".pending";
    writeFileSync(temporary, JSON.stringify([...runs.values()]));
    renameSync(temporary, path);
  }
  function get(id: string) {
    const run = runs.get(id);
    if (!run) throw new Error("Unknown run: " + id);
    return run;
  }
  return {
    get,
    create(operation, input) {
      const run: Run = {
        id: crypto.randomUUID(),
        operation,
        input,
        status: "queued",
      };
      runs.set(run.id, run);
      flush();
      return run;
    },
    save(run) {
      runs.set(run.id, run);
      flush();
    },
    control(id, action) {
      const run = get(id);
      if (
        run.status === "completed" ||
        run.status === "failed" ||
        run.status === "stopped"
      )
        return run;
      const next = {
        pause: "paused",
        stop: "stopped",
        resume: "queued",
      } as const;
      run.status = next[action];
      flush();
      return run;
    },
  };
}
