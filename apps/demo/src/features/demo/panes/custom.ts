import type { Content } from "@pane-system/contracts";
import type { Workbench } from "@pane-system/workbench";
export function inputPane(options: {
  state?: unknown;
  send(text: string): void;
}): Content {
  const element = document.createElement("div");
  element.className = "custom-content";
  const title = document.createElement("h2");
  title.textContent = "Input";
  const help = document.createElement("p");
  help.textContent =
    "Send text to the Output pane. This pane uses a custom content factory.";
  const input = document.createElement("textarea");
  input.placeholder = "Enter text";
  input.setAttribute("aria-label", "Input text");
  if (
    options.state &&
    typeof options.state === "object" &&
    "draft" in options.state &&
    typeof options.state.draft === "string"
  )
    input.value = options.state.draft;
  const send = document.createElement("button");
  send.className = "primary";
  send.textContent = "Send to Output";
  send.onclick = () => {
    if (!input.value.trim()) return;
    options.send(input.value);
    input.value = "";
  };
  element.append(title, help, input, send);
  return {
    element,
    focus() {
      input.focus();
    },
    serialize() {
      return { draft: input.value };
    },
    dispose() {},
  };
}
export function contextPane(workbench: Workbench): Content {
  const element = document.createElement("div");
  element.className = "custom-content";
  const title = document.createElement("h2");
  title.textContent = "Context";
  const text = document.createElement("p");
  text.textContent = "Open files in this workspace";
  const list = document.createElement("div");
  const refresh = document.createElement("button");
  refresh.textContent = "Refresh context";
  function update() {
    list.replaceChildren();
    const paths = new Set(
      [...workbench.panes.values()].flatMap((p) =>
        p.tabs.flatMap((t) => (t.resource ? [t.resource] : [])),
      ),
    );
    for (const path of paths) {
      const row = document.createElement("p");
      row.className = "context-path";
      row.textContent = path;
      list.append(row);
    }
    if (!paths.size) list.textContent = "No files are open.";
  }
  refresh.onclick = update;
  element.append(title, text, list, refresh);
  update();
  return { element, dispose() {} };
}
export function connectionsPane(options: {
  doctor(): Promise<{ ready: boolean; root: string }>;
}): Content {
  const element = document.createElement("div");
  element.className = "custom-content";
  const title = document.createElement("h2");
  title.textContent = "Connections";
  const state = document.createElement("p");
  state.className = "status";
  const root = document.createElement("p");
  root.className = "context-path";
  const refresh = document.createElement("button");
  refresh.textContent = "Check host";
  async function check() {
    try {
      const result = await options.doctor();
      state.textContent = result.ready
        ? "Connected to the local host"
        : "Host is not ready";
      root.textContent = result.root;
    } catch (error) {
      state.textContent = String(error);
      state.dataset.error = "true";
    }
  }
  refresh.onclick = () => void check();
  const help = document.createElement("p");
  help.textContent =
    "File access, Git, terminal, and file watching use separate host interfaces.";
  element.append(title, state, root, refresh, help);
  void check();
  return { element, dispose() {} };
}
