import "@pane-system/upstream/layout.css";
import "../../ui/frame.css";
import "../../ui/panes.css";
import "../../ui/content.css";
import { createWorkbench } from "@pane-system/workbench";
import { createOutput } from "@pane-system/output";
import { inputPane, contextPane } from "../../features/demo";
const container = document.getElementById("workspace");
const status = document.getElementById("status");
if (!container || !status) throw new Error("Missing workspace.");
const workbench = createWorkbench({
  container,
  storageKey: "pane-layout-only-v1",
  storage: {
    read(key) {
      try {
        return JSON.parse(localStorage.getItem(key) ?? "null") as unknown;
      } catch {
        return null;
      }
    },
    write(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    },
  },
  status(message) {
    status.textContent = message;
  },
});
const outputs = new Set<ReturnType<typeof createOutput>>();
workbench.register({
  id: "input",
  title: "Input",
  create: ({ state }) =>
    inputPane({
      state,
      send(text) {
        for (const output of outputs) output.append(text);
      },
    }),
});
workbench.register({
  id: "output",
  title: "Output",
  create() {
    const output = createOutput();
    outputs.add(output);
    output.append("Connected to the Input pane.");
    return {
      ...output,
      dispose() {
        outputs.delete(output);
        output.dispose();
      },
    };
  },
});
workbench.register({
  id: "context",
  title: "Context",
  create: () => contextPane(workbench),
});
if (!(await workbench.restore())) {
  const input = workbench.active;
  await workbench.open("input", undefined, input);
  const output = workbench.split(input);
  await workbench.open("output", undefined, output);
  const context = workbench.split(input, true);
  await workbench.open("context", undefined, context);
}
for (const [id, title, run] of [
  ["split", "Split pane", () => workbench.split()],
  ["close", "Close pane", () => workbench.close(workbench.active)],
  [
    "balance",
    "Distribute sizes",
    () => workbench.layout?.engine.distributeViewSizes(),
  ],
] as const)
  workbench.commands.register({
    id,
    title,
    run: () => {
      run();
    },
  });
document
  .getElementById("commands")
  ?.addEventListener("click", () => workbench.commands.show());
document.getElementById("theme")?.addEventListener("click", () => {
  document.documentElement.dataset.theme =
    document.documentElement.dataset.theme === "light" ? "dark" : "light";
});
await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
status.textContent =
  "Layout ready · " +
  performance.now().toFixed(1) +
  " ms from navigation start";
performance.mark("pane-layout-ready");
