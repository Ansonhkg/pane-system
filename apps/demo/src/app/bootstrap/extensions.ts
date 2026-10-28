import { createTreeSettings } from "./tree-settings";
import { createWorkspaceExplorer } from "./workspace-explorer";
import { installResourceDrop, utilityPaneIds } from "./resource-drop";
import { createFolderSelector } from "./select-folder";
import { OPERATION } from "@pane-system/host/operations";
import { createProblems } from "@pane-system/output/problems";
import type { Workbench } from "@pane-system/workbench";
import { createFileOpener } from "./open-file";
import { createHostClient } from "@pane-system/host/client";
import { createExplorer } from "@pane-system/explorer";
import {
  createEditor,
  createDiff,
  createDocuments,
  languageFor,
  registerEditorNavigation,
} from "@pane-system/editor";
import { createTerminal } from "@pane-system/terminal";
import { registerHeadEditor, registerSourceControl } from "./source-control";
import { createOutput } from "@pane-system/output";
import {
  createMeasurements,
  inputPane,
  contextPane,
  connectionsPane,
  createSearch,
} from "../../features/demo";
export function registerExtensions(
  workbench: Workbench,
  client: ReturnType<typeof createHostClient>,
) {
  const treeSettings = createTreeSettings();
  const resourceDrop = installResourceDrop(
    workbench,
    document.getElementById("workspace")!,
  );
  const documents = createDocuments({
    files: client.files,
    changed: () => workbench.refresh(),
  });
  const logs = new Set<ReturnType<typeof createOutput>>();
  const history = [
    "Pane System host connected.",
    "Layout uses the VS Code SerializableGrid, GridView, SplitView, and Sash.",
  ];
  function log(text: string) {
    history.push(text);
    if (history.length > 1000) history.shift();
    for (const output of logs) output.append(text);
  }
  let targetId = "main";
  const targetChange = workbench.context.onDidChange((event) => {
    if (event.key !== "pane.id") return;
    const id = String(event.value);
    if (!utilityPaneIds.includes(id)) targetId = id;
  });
  function target() {
    return (
      workbench.panes.get(targetId) ??
      workbench.panes.get("main") ??
      workbench.active
    );
  }
  const open = createFileOpener(workbench, target, log);
  let explorer: ReturnType<typeof createExplorer> | undefined;
  const selectFolder = createFolderSelector(workbench, client);
  const definitionLeases = new Map<
    string,
    ReturnType<typeof documents.acquire>
  >();
  const registrations = [
    workbench.commands.register({
      id: "workspace.selectFolder",
      title: "Select folder",
      run: selectFolder,
    }),
    registerEditorNavigation({
      async open(path, line, column) {
        const tab = await workbench.open("editor", path, target());
        tab.content.reveal?.(line, column);
      },
    }),
    workbench.register({
      id: "benchmarks",
      title: "Measurements",
      create: () =>
        createMeasurements({
          workbench,
          record: async (report) => {
            await client.operation(OPERATION.MEASURE, { report });
          },
        }),
    }),
    workbench.register({
      id: "problems",
      title: "Problems",
      create: () =>
        createProblems({
          open(path, line, column) {
            void workbench
              .open("editor", path, target())
              .then((tab) => tab.content.reveal?.(line, column))
              .catch((error: unknown) => log(String(error)));
          },
        }),
    }),
    workbench.register({
      id: "welcome",
      title: "Welcome",
      create() {
        const element = document.createElement("div");
        element.className = "custom-content";
        const title = document.createElement("h2");
        title.textContent = "Your workspace";
        const help = document.createElement("p");
        help.textContent =
          "Select a file in Files to open it here. Use the pane controls to split or move content.";
        element.append(title, help);
        return { element, dispose() {} };
      },
    }),
    workbench.register({
      id: "diff",
      title: "Diff",
      async create({ resource, state }) {
        if (!resource) throw new Error("Select a file.");
        const staged =
          !!state &&
          typeof state === "object" &&
          "staged" in state &&
          state.staged === true;
        const diff = await client.git.diff(resource, staged);
        const content = createDiff({ path: resource, ...diff });
        return { ...content, serialize: () => ({ staged }) };
      },
    }),
    registerHeadEditor(workbench, client),
    workbench.register({
      id: "explorer",
      title: "Files",
      create: async () => {
        explorer = await createWorkspaceExplorer(
          client,
          treeSettings,
          open,
          selectFolder,
        );
        return explorer;
      },
    }),
    workbench.register({
      id: "editor",
      title: "Editor",
      async create({ resource, state }) {
        if (!resource) throw new Error("Select a file.");
        const text = await client.files.read(resource);
        log("Opened " + resource);
        return createEditor({
          path: resource,
          text,
          files: client.files,
          documents,
          state,
          changed: () => workbench.refresh(),
        });
      },
    }),
    registerSourceControl({
      workbench,
      client,
      treeSettings,
      target,
      open,
      revealFile: async (path) => {
        await explorer?.revealFile(path);
      },
      log,
    }),
    workbench.register({
      id: "terminal",
      title: "Terminal",
      create: () => createTerminal({ provider: client.terminal }),
    }),
    workbench.register({
      id: "output",
      title: "Output",
      create() {
        const output = createOutput();
        for (const line of history) output.append(line);
        logs.add(output);
        return {
          ...output,
          dispose() {
            logs.delete(output);
            output.dispose();
          },
        };
      },
    }),
    workbench.register({
      id: "input",
      title: "Input",
      create: ({ state }) => inputPane({ state, send: log }),
    }),
    workbench.register({
      id: "context",
      title: "Context",
      create: () => contextPane(workbench),
    }),
    workbench.register({
      id: "connections",
      title: "Connections",
      create: () => connectionsPane(client),
    }),
    workbench.register({
      id: "search",
      title: "Search",
      create: () => createSearch({ files: client.files, open }),
    }),
  ];
  return {
    log,
    resolveModel(path: string, text: string) {
      let lease = definitionLeases.get(path);
      if (!lease) {
        lease = documents.acquire(path, text, languageFor(path));
        definitionLeases.set(path, lease);
      }
      return lease.model;
    },
    dispose() {
      resourceDrop.dispose();
      targetChange.dispose();
      definitionLeases.forEach((lease) => lease.dispose());
      documents.dispose();
      registrations.forEach((r) => r.dispose());
    },
  };
}
