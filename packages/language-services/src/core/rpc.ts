import type { WorkerReply, WorkerRequest } from "./protocol";
type Request<T = WorkerRequest> = T extends WorkerRequest
  ? Omit<T, "id">
  : never;
export function createWorkerClient(factory: Worker | (() => Worker)) {
  let worker: Worker | undefined;
  let disposed = false;
  let next = 0;
  const pending = new Map<
    number,
    { resolve(value: unknown): void; reject(error: Error): void }
  >();
  const listener = (event: MessageEvent<WorkerReply>) => {
    const call = pending.get(event.data.id);
    if (!call) return;
    pending.delete(event.data.id);
    if (event.data.error) call.reject(new Error(event.data.error));
    else call.resolve(event.data.result);
  };
  const failed = (event: ErrorEvent) => {
    for (const call of pending.values()) call.reject(new Error(event.message));
    pending.clear();
  };
  function connection() {
    if (disposed) throw new Error("Language service is closed.");
    if (!worker) {
      worker = typeof factory === "function" ? factory() : factory;
      worker.addEventListener("message", listener);
      worker.addEventListener("error", failed);
    }
    return worker;
  }
  return {
    request<T>(message: Request): Promise<T> {
      const id = ++next;
      return new Promise<unknown>((resolve, reject) => {
        pending.set(id, { resolve, reject });
        connection().postMessage({ ...message, id });
      }) as Promise<T>;
    },
    dispose() {
      disposed = true;
      worker?.removeEventListener("message", listener);
      worker?.removeEventListener("error", failed);
      for (const call of pending.values())
        call.reject(new Error("Language service is closed."));
      pending.clear();
      worker?.terminate();
    },
  };
}
