import { resolve } from "node:path";
import { sessionAllowed, sessionCookieName } from "./auth";
import { assetResponse } from "./assets";
import { mkdir } from "node:fs/promises";
import { createFiles } from "./files";
import { createGit } from "./git";
import { createOperations, type HostInput } from "../core/operations";
import { createLedger } from "./ledger";
import {
  openTerminal,
  terminalMessage,
  closeSocket,
  type SocketData,
} from "./terminal";
import { PATHS } from "../core/paths";
export async function createHost(options: {
  root: string;
  assets: string;
  index: string;
  state: string;
  port?: number;
  pages?: Record<string, string>;
  recordMeasurements?(value: unknown): Promise<void>;
}) {
  let files = await createFiles(options.root);
  let git = createGit({ root: files.root, files });
  let execute = createOperations({
    root: files.root,
    files,
    git,
    runtime: Bun.version,
    recordMeasurements: options.recordMeasurements,
  });
  const sockets = new Set<import("bun").ServerWebSocket<SocketData>>();
  await mkdir(resolve(options.state, ".."), { recursive: true });
  const ledger = createLedger(
    options.state,
    (id, input) => execute(id, input),
    () => files.root,
  );
  const token = crypto.randomUUID();
  let origin = "";
  const server = Bun.serve<SocketData>({
    hostname: "127.0.0.1",
    port: options.port ?? 4318,
    async fetch(request, server) {
      try {
        const url = new URL(request.url);
        if (url.host !== new URL(origin).host)
          return Response.json({ error: "Invalid host." }, { status: 403 });
        const permitted = sessionAllowed(request, origin, token);
        if (url.pathname === PATHS.terminal || url.pathname === PATHS.events) {
          if (!permitted) return new Response("Forbidden", { status: 403 });
          if (url.searchParams.get("root") !== files.root)
            return new Response("Workspace changed", { status: 409 });
          const kind = url.pathname === PATHS.terminal ? "terminal" : "events";
          if (server.upgrade(request, { data: { root: files.root, kind } }))
            return;
          return new Response("WebSocket upgrade failed", { status: 400 });
        }
        if (url.pathname === PATHS.workspace) {
          if (
            !permitted ||
            request.headers.get("x-pane-token") !== token ||
            request.method !== "POST"
          )
            return new Response("Forbidden", { status: 403 });
          const body: unknown = await request.json();
          if (
            !body ||
            typeof body !== "object" ||
            !("root" in body) ||
            typeof body.root !== "string" ||
            !("currentRoot" in body) ||
            body.currentRoot !== files.root
          )
            throw new Error("Supply the current folder and a new folder.");
          const next = await createFiles(body.root);
          await next.list("");
          for (const socket of sockets) socket.close(1000, "Workspace changed");
          git.dispose();
          files = next;
          git = createGit({ root: files.root, files });
          execute = createOperations({
            root: files.root,
            files,
            git,
            runtime: Bun.version,
            recordMeasurements: options.recordMeasurements,
          });
          return Response.json({ root: files.root });
        }
        if (url.pathname === PATHS.operations) {
          if (
            !permitted ||
            request.headers.get("x-pane-token") !== token ||
            request.method !== "POST"
          )
            return Response.json({ error: "Forbidden" }, { status: 403 });
          const body: unknown = await request.json();
          if (
            !body ||
            typeof body !== "object" ||
            !("id" in body) ||
            typeof body.id !== "string" ||
            !("input" in body) ||
            !body.input ||
            typeof body.input !== "object"
          )
            throw new Error("Supply an operation and input.");
          const key =
            "key" in body && typeof body.key === "string"
              ? body.key
              : crypto.randomUUID();
          if (
            "root" in body &&
            body.root !== undefined &&
            body.root !== files.root
          )
            return Response.json(
              { error: "Workspace changed. Reload the page." },
              { status: 409 },
            );
          const run = await ledger.run(
            body.id,
            body.input as HostInput,
            JSON.stringify([files.root, key]),
          );
          if (run.status === "failed")
            return Response.json(
              { error: run.error, runId: run.id },
              { status: 400 },
            );
          return Response.json({
            result: run.result,
            runId: run.id,
            status: run.status,
          });
        }
        if (url.pathname.startsWith(PATHS.api + "runs")) {
          if (!permitted || request.headers.get("x-pane-token") !== token)
            return new Response("Forbidden", { status: 403 });
          const id = url.searchParams.get("id");
          if (!id) return Response.json(ledger.list());
          const action = url.searchParams.get("action");
          if (request.method === "POST" && action === "reconcile") {
            const body: unknown = await request.json();
            if (
              !body ||
              typeof body !== "object" ||
              !("reason" in body) ||
              typeof body.reason !== "string"
            )
              throw new Error("Supply a reconciliation reason.");
            return Response.json(
              ledger.reconcile(
                id,
                "result" in body ? body.result : undefined,
                body.reason,
              ),
            );
          }
          if (
            request.method === "POST" &&
            (action === "pause" || action === "resume" || action === "stop")
          )
            return Response.json(await ledger.control(id, action));
          return Response.json(ledger.get(id));
        }
        if (url.pathname.startsWith(PATHS.assets)) {
          const name = decodeURIComponent(
            url.pathname.slice(PATHS.assets.length),
          );
          const base = resolve(options.assets);
          const file = resolve(base, name);
          if (!file.startsWith(base + "/"))
            return new Response("Forbidden", { status: 403 });
          const asset = Bun.file(file);
          if (!(await asset.exists()))
            return new Response("Not found", { status: 404 });
          return assetResponse(request, file, asset);
        }
        const index =
          options.pages?.[url.pathname] ??
          (url.pathname === "/" ? options.index : undefined);
        if (!index) return new Response("Not found", { status: 404 });
        const html = (await Bun.file(index).text()).replace(
          "__PANE_TOKEN__",
          token,
        );
        return new Response(html, {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "set-cookie":
              sessionCookieName(origin) +
              "=" +
              token +
              "; HttpOnly; SameSite=Strict; Path=/",
            "cache-control": "no-store",
            "content-security-policy":
              "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self' ws://127.0.0.1:*; worker-src 'self' blob:; frame-src 'self'; object-src 'none'; base-uri 'self'",
          },
        });
      } catch (error) {
        return Response.json({ error: String(error) }, { status: 400 });
      }
    },
    websocket: {
      open(socket) {
        sockets.add(socket);
        if (socket.data.kind === "terminal") openTerminal(socket);
        else
          socket.data.dispose = files.watch?.((path) =>
            socket.send(path),
          ).dispose;
      },
      message(socket, message) {
        try {
          if (socket.data.kind === "terminal") terminalMessage(socket, message);
        } catch {
          socket.close(1003, "Invalid terminal message");
        }
      },
      close(socket) {
        sockets.delete(socket);
        closeSocket(socket);
      },
    },
  });
  origin = "http://127.0.0.1:" + server.port;
  return {
    url: origin,
    get files() {
      return files;
    },
    get git() {
      return git;
    },
    ledger,
    dispose() {
      git.dispose();
      server.stop(true);
      ledger.dispose();
    },
  };
}
