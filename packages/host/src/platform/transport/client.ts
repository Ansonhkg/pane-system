import { createRunControls } from "./runs";
import type {
  FilePort,
  GitPort,
  TerminalPort,
  TerminalSession,
  Change,
  FileEntry,
} from "@pane-system/contracts";
import { OPERATION, type HostInput } from "../../core/operations";
import { PATHS } from "../../core/paths";
import { QueryClient } from "@tanstack/query-core";
export function createHostClient(options: {
  base?: string;
  token: string;
  webSocketFactory?: (url: URL, headers: Record<string, string>) => WebSocket;
}) {
  const base = options.base ?? location.origin;
  const queries = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  let scopeRoot: string | undefined;
  const headers = {
    "content-type": "application/json",
    "x-pane-token": options.token,
    authorization: "Bearer " + options.token,
  };
  async function requestReport<T>(
    id: string,
    input: HostInput = {},
    key: string = crypto.randomUUID(),
  ): Promise<{ result: T; runId: string; status: string }> {
    const response = await fetch(base + PATHS.operations, {
      method: "POST",
      headers,
      body: JSON.stringify({
        id,
        input,
        root: scopeRoot,
        key,
      }),
    });
    const value: unknown = await response.json();
    if (!response.ok)
      throw new Error(
        typeof value === "object" && value && "error" in value
          ? String(value.error)
          : "Host request failed.",
      );
    if (!value || typeof value !== "object")
      throw new Error("Invalid host response.");
    if (
      !("runId" in value) ||
      typeof value.runId !== "string" ||
      !("status" in value) ||
      typeof value.status !== "string"
    )
      throw new Error("Invalid run report.");
    return {
      result: ("result" in value ? value.result : undefined) as T,
      runId: value.runId,
      status: value.status,
    };
  }
  async function request<T>(id: string, input: HostInput = {}): Promise<T> {
    const report = await requestReport<T>(id, input);
    if (report.status !== "completed")
      throw new Error("Run has not completed: " + report.runId);
    return report.result;
  }
  async function operation<T>(id: string, input: HostInput = {}): Promise<T> {
    const reads = new Set<string>([
      OPERATION.LIST,
      OPERATION.READ,
      OPERATION.STATUS,
      OPERATION.DIFF,
      OPERATION.PATCH,
      OPERATION.HEAD,
      OPERATION.DOCTOR,
    ]);
    if (reads.has(id))
      return queries.fetchQuery({
        queryKey: [scopeRoot, id, input],
        queryFn: () => request<T>(id, input),
      });
    const result = await request<T>(id, input);
    await queries.invalidateQueries();
    return result;
  }
  function socket(path: string) {
    const url = new URL(path, base);
    if (scopeRoot) url.searchParams.set("root", scopeRoot);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return options.webSocketFactory?.(url, headers) ?? new WebSocket(url);
  }
  const files: FilePort = {
    list: (path) => operation<FileEntry[]>(OPERATION.LIST, { path }),
    read: (path) => operation<string>(OPERATION.READ, { path }),
    write: async (path, text) => {
      await operation(OPERATION.WRITE, { path, text });
    },
    createDirectory: async (path) => {
      await operation(OPERATION.DIRECTORY, { path });
    },
    rename: async (path, destination) => {
      await operation(OPERATION.RENAME, { path, destination });
    },
    copy: async (path, destination) => {
      await operation(OPERATION.COPY, { path, destination });
    },
    remove: async (path) => {
      await operation(OPERATION.REMOVE, { path });
    },
    watch(listener) {
      const ws = socket(PATHS.events);
      ws.onmessage = (event) => {
        if (typeof event.data === "string") {
          void queries.invalidateQueries();
          listener(event.data);
        }
      };
      return {
        dispose() {
          ws.close();
        },
      };
    },
  };
  const git: GitPort = {
    status: () =>
      operation<{ branch: string; changes: Change[]; canPublish?: boolean }>(
        OPERATION.STATUS,
      ),
    diff: (path, staged) =>
      operation<{ original: string; modified: string }>(OPERATION.DIFF, {
        path,
        staged,
      }),
    stage: async (path) => {
      await operation(OPERATION.STAGE, { path });
    },
    unstage: async (path) => {
      await operation(OPERATION.UNSTAGE, { path });
    },
    discard: async (path, staged) => {
      await operation(OPERATION.DISCARD, { path, staged });
    },
    head: (path) => operation<string>(OPERATION.HEAD, { path }),
    patch: (path, staged) =>
      operation<string>(OPERATION.PATCH, { path, staged }),
    stash: async (paths) => {
      await operation(OPERATION.STASH, { paths });
    },
    commit: (message) => operation<string>(OPERATION.COMMIT, { message }),
    publish: async () => {
      await operation(OPERATION.PUBLISH);
    },
  };
  const terminal: TerminalPort = {
    create(): TerminalSession {
      const ws = socket(PATHS.terminal);
      ws.binaryType = "arraybuffer";
      const listeners = new Set<(data: string) => void>();
      const pending: string[] = [];
      let disposed = false;
      const decoder = new TextDecoder();
      ws.onmessage = (event) => {
        let data = "";
        if (typeof event.data === "string") data = event.data;
        else if (event.data instanceof ArrayBuffer)
          data = decoder.decode(event.data, { stream: true });
        for (const listener of listeners) listener(data);
      };
      ws.onopen = () => {
        if (disposed) {
          ws.close();
          return;
        }
        for (const message of pending) ws.send(message);
        pending.length = 0;
      };
      function send(value: object) {
        const message = JSON.stringify(value);
        if (ws.readyState === WebSocket.OPEN) ws.send(message);
        else if (ws.readyState === WebSocket.CONNECTING) pending.push(message);
      }
      return {
        write(data) {
          send({ type: "input", data });
        },
        resize(cols, rows) {
          send({ type: "resize", cols, rows });
        },
        onData(listener) {
          listeners.add(listener);
          return {
            dispose() {
              listeners.delete(listener);
            },
          };
        },
        dispose() {
          disposed = true;
          listeners.clear();
          ws.close();
        },
      };
    },
  };
  return {
    run: requestReport,
    ...createRunControls({ base, headers }),
    files,
    git,
    terminal,
    async doctor() {
      const result = await operation<{ ready: boolean; root: string }>(
        OPERATION.DOCTOR,
      );
      if (scopeRoot && scopeRoot !== result.root)
        throw new Error("Workspace changed. Reload the page.");
      scopeRoot = result.root;
      return result;
    },
    async selectWorkspace(root: string) {
      const response = await fetch(base + PATHS.workspace, {
        method: "POST",
        headers,
        body: JSON.stringify({ root, currentRoot: scopeRoot }),
      });
      if (!response.ok) throw new Error(await response.text());
      queries.clear();
    },
    operation,
  };
}
