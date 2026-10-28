import { createAppearance } from "../bootstrap/appearance";
import { applyChromeIcons, mountPaneNavigation } from "../bootstrap/chrome";
import { initializeLanguages } from "../bootstrap/languages";
import "@pane-system/upstream/layout.css";
import "@pane-system/upstream/tree.css";
import "@pane-system/upstream/editor.css";
import "@xterm/xterm/css/xterm.css";
import "../../ui/frame.css";
import "../../ui/panes.css";
import "../../ui/content.css";
import "../../ui/reference.css";
import { createWorkbench } from "@pane-system/workbench";
import { createHostClient } from "@pane-system/host/client";
import { registerSyntax } from "@pane-system/syntax";
import { registerExtensions } from "../bootstrap/extensions";
import { initialLayout } from "../bootstrap/layout";
import { PATHS } from "../../core/paths";
function required<T extends HTMLElement>(id: string) {
  const element = document.getElementById(id);
  if (!element) throw new Error("Missing element: " + id);
  return element as T;
}
applyChromeIcons();
const token = document.querySelector<HTMLMetaElement>(
  'meta[name="pane-token"]',
)?.content;
if (!token) throw new Error("Missing host token.");
const global = globalThis as typeof globalThis & {
  MonacoEnvironment?: { getWorker(): Worker };
};
global.MonacoEnvironment = {
  getWorker: () => new Worker(PATHS.worker, { type: "module" }),
};
const container = required("workspace");
const status = required("status");
const storage = {
  read(key: string): unknown {
    try {
      return JSON.parse(localStorage.getItem(key) ?? "null");
    } catch {
      return null;
    }
  },
  write(key: string, value: unknown) {
    localStorage.setItem(key, JSON.stringify(value));
  },
};
const client = createHostClient({ token });
const metadata = await client.doctor();
const layoutKey = PATHS.layoutKey + ":" + metadata.root;
const workbench = createWorkbench({
  storageKey: layoutKey,
  container,
  storage,
  status(message) {
    status.textContent = message;
  },
});
const syntax = registerSyntax();

const extensions = registerExtensions(workbench, client);
const appearance = createAppearance(workbench, storage, PATHS.themeKey);
for (const button of document.querySelectorAll<HTMLButtonElement>(
  "[data-view]",
)) {
  button.onclick = () => {
    const kind = button.dataset.view;
    if (kind) {
      for (const pane of workbench.panes.values()) {
        const tab = pane.tabs.find((t) => t.kind === kind);
        if (tab) {
          pane.select(tab.id);
          tab.content.focus?.();
          return;
        }
      }
    }
    if (kind)
      void workbench.open(kind).catch((error: unknown) => {
        status.textContent = String(error);
      });
  };
}
required("split-editor").onclick = () => workbench.split();
required("commands").onclick = () => workbench.commands.show();
required("theme").onclick = () => appearance.show();
required("reset").onclick = () => {
  localStorage.removeItem(layoutKey);
  location.reload();
};
required("toggle-files").onclick = () => {
  const pane = workbench.panes.get("files");
  if (pane && workbench.layout) {
    const grid = workbench.layout.engine;
    grid.setViewVisible(pane, !grid.isViewVisible(pane));
    workbench.save();
  }
};
required("layout-export").onclick = async () => {
  const json = JSON.stringify(workbench.layout?.serialize(), null, 2);
  await navigator.clipboard.writeText(json);
  status.textContent = "Layout copied";
};
const registrations = [
  [
    "measure.layout",
    "Measure layout",
    "",
    () => {
      void workbench.open("benchmarks");
    },
  ],
  ["layout.split-right", "Split pane right", "⌘ \\", () => workbench.split()],
  [
    "layout.split-down",
    "Split pane down",
    "⌘ ⇧ \\",
    () => workbench.split(workbench.active, true),
  ],
  [
    "layout.close",
    "Close pane and keep tabs",
    "",
    () => workbench.close(workbench.active),
  ],
  [
    "layout.distribute",
    "Distribute pane sizes",
    "",
    () => workbench.layout?.engine.distributeViewSizes(),
  ],
  [
    "layout.maximize",
    "Maximize active pane",
    "",
    () => {
      if (workbench.panes.size > 1)
        workbench.layout?.engine.maximizeView(workbench.active);
    },
  ],
  [
    "layout.restore",
    "Restore all panes",
    "",
    () => workbench.layout?.engine.exitMaximizedView(),
  ],
  [
    "view.input",
    "Open Input pane",
    "",
    () => {
      void workbench.open("input");
    },
  ],
  [
    "view.output",
    "Open Output pane",
    "",
    () => {
      void workbench.open("output");
    },
  ],
  [
    "view.connections",
    "Open Connections pane",
    "",
    () => {
      void workbench.open("connections");
    },
  ],
  ["theme.toggle", "Change theme", "", () => appearance.show()],
] as const;
for (const [id, title, shortcut, run] of registrations)
  workbench.commands.register({
    id,
    title,
    shortcut,
    run: () => {
      run();
    },
  });
const keydown = (event: KeyboardEvent) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "b") {
    event.preventDefault();
    required("toggle-files").click();
  }
};
window.addEventListener("keydown", keydown);
window.addEventListener("pointerup", () => workbench.save());
window.addEventListener("beforeunload", (event) => {
  if (
    [...workbench.panes.values()].some((p) =>
      p.tabs.some((t) => t.content.dirty),
    )
  ) {
    event.preventDefault();
    event.returnValue = "";
  }
});
try {
  let sampleAvailable = false;
  try {
    await client.files.read(PATHS.sample);
    sampleAvailable = true;
  } catch {}
  await workbench.restore(
    initialLayout(
      container.clientWidth,
      container.clientHeight,
      sampleAvailable,
    ),
  );
  mountPaneNavigation(workbench);
  const doctor = await client.doctor();
  required("workspace-name").textContent =
    doctor.root.split("/").at(-1) ?? "workspace";
  status.textContent = "Connected · " + workbench.panes.size + " panes";
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  required("performance").textContent =
    performance.now().toFixed(0) + " ms ready";
  performance.mark("pane-ready");
  initializeLanguages(client, extensions, status);
  extensions.log(
    "Ready in " + performance.now().toFixed(1) + " ms from navigation start.",
  );
} catch (error) {
  status.textContent = String(error);
  console.error(error);
}
