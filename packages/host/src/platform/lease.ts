import {
  openSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  closeSync,
} from "node:fs";
export function acquireLedger(path: string) {
  const lock = path + ".owner";
  function create() {
    const fd = openSync(lock, "wx", 0o600);
    try {
      writeFileSync(fd, JSON.stringify({ pid: process.pid }));
    } finally {
      closeSync(fd);
    }
  }
  try {
    create();
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "EEXIST"
    )
      throw error;
    const owner: unknown = JSON.parse(readFileSync(lock, "utf8"));
    if (
      !owner ||
      typeof owner !== "object" ||
      !("pid" in owner) ||
      typeof owner.pid !== "number" ||
      !Number.isInteger(owner.pid) ||
      owner.pid < 1
    )
      throw new Error("Invalid ledger owner record.");
    let live = true;
    try {
      process.kill(owner.pid, 0);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ESRCH")
        live = false;
      else throw error;
    }
    if (live) throw new Error("This ledger already has an active host.");
    unlinkSync(lock);
    create();
  }
  let disposed = false;
  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      unlinkSync(lock);
    },
  };
}
