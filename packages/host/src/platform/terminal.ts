import type { ServerWebSocket } from "bun";
export interface SocketData {
  root: string;
  kind: "terminal" | "events";
  terminal?: Bun.Terminal;
  process?: Bun.Subprocess;
  dispose?: () => void;
}
export function openTerminal(socket: ServerWebSocket<SocketData>) {
  const terminal = new Bun.Terminal({
    cols: 100,
    rows: 24,
    name: "xterm-256color",
    data(_terminal, data) {
      if (socket.readyState === 1) socket.send(data);
    },
  });
  const process = Bun.spawn([Bun.env.SHELL ?? "/bin/zsh", "-l"], {
    cwd: socket.data.root,
    terminal,
    env: { ...Bun.env, TERM: "xterm-256color", COLORTERM: "truecolor" },
  });
  socket.data.terminal = terminal;
  socket.data.process = process;
  void process.exited.then((code) => {
    if (socket.readyState === 1) {
      socket.send("\r\n[Process exited: " + code + "]\r\n");
      socket.close();
    }
  });
}
export function terminalMessage(
  socket: ServerWebSocket<SocketData>,
  message: string | Buffer,
) {
  if (typeof message !== "string") {
    socket.data.terminal?.write(message);
    return;
  }
  const value: unknown = JSON.parse(message);
  if (!value || typeof value !== "object" || !("type" in value)) return;
  if (
    value.type === "input" &&
    "data" in value &&
    typeof value.data === "string"
  )
    socket.data.terminal?.write(value.data);
  if (
    value.type === "resize" &&
    "cols" in value &&
    "rows" in value &&
    typeof value.cols === "number" &&
    typeof value.rows === "number" &&
    Number.isInteger(value.cols) &&
    Number.isInteger(value.rows) &&
    value.cols >= 2 &&
    value.cols <= 500 &&
    value.rows >= 1 &&
    value.rows <= 300
  )
    socket.data.terminal?.resize(value.cols, value.rows);
}
export function closeSocket(socket: ServerWebSocket<SocketData>) {
  socket.data.dispose?.();
  socket.data.process?.kill();
  socket.data.terminal?.close();
}
