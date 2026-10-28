import { PATHS } from "../../core/paths";
export function createRunControls(options: {
  base: string;
  headers: Record<string, string>;
}) {
  async function control(
    id: string | undefined,
    action?: "pause" | "resume" | "stop" | "reconcile",
    input?: unknown,
  ) {
    const url = new URL(PATHS.api + "runs", options.base);
    if (id) url.searchParams.set("id", id);
    if (action) url.searchParams.set("action", action);
    const response = await fetch(url, {
      method: action ? "POST" : "GET",
      headers: options.headers,
      body: input === undefined ? undefined : JSON.stringify(input),
    });
    const value: unknown = await response.json();
    if (!response.ok)
      throw new Error(
        typeof value === "object" && value && "error" in value
          ? String(value.error)
          : "Run control failed.",
      );
    return value;
  }
  return {
    listRuns: () => control(undefined),
    getRun: (id: string) => control(id),
    pauseRun: (id: string) => control(id, "pause"),
    resumeRun: (id: string) => control(id, "resume"),
    stopRun: (id: string) => control(id, "stop"),
    reconcileRun: (id: string, result: unknown, reason: string) =>
      control(id, "reconcile", { result, reason }),
  };
}
