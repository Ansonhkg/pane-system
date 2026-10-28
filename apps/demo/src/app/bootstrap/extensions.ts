import * as editorModule from "@pane-system/editor";
import * as explorerFeatures from "./workspace-explorer";
import * as sourceControlFeatures from "./source-control";
import * as terminalFeatures from "@pane-system/terminal";
import * as outputFeatures from "@pane-system/output";
import * as problemFeatures from "@pane-system/output/problems";
import * as headEditorFeatures from "./head-editor";
import { registerBasePanes } from "./base-panes";
import type { MeasurementFlags } from "../../core/measurement-flags";
import { createTreeSettings } from "./tree-settings";
import { installResourceDrop, utilityPaneIds } from "./resource-drop";
import { createFolderSelector } from "./select-folder";
import type { Workbench } from "@pane-system/workbench";
import { createFileOpener } from "./open-file";
import { createHostClient } from "@pane-system/host/client";
import type { createExplorer } from "@pane-system/explorer";
import {
  inputPane,
  contextPane,
  connectionsPane,
  createSearch,
} from "../../features/demo";
export async function registerExtensions(
  workbench: Workbench,
  client: ReturnType<typeof createHostClient>,
  flags: MeasurementFlags,
) {
  const treeSettings = createTreeSettings();
  const resourceDrop = installResourceDrop(
    workbench,
    document.getElementById("workspace")!,
  );
  const editor = flags.enabled("editor") ? editorModule : undefined;
  const documents = editor?.createDocuments({
    files: client.files,
    changed: () => workbench.refresh(),
  });
  const explorerModule = flags.enabled("explorer")
    ? explorerFeatures
    : undefined;
  const sourceControl = flags.enabled("source-control")
    ? sourceControlFeatures
    : undefined;
  const terminal = flags.enabled("terminal") ? terminalFeatures : undefined;
  const outputModule = flags.enabled("auxiliary") ? outputFeatures : undefined;
  const problems =
    editor && flags.enabled("auxiliary") ? problemFeatures : undefined;
  const headEditor = editor ? headEditorFeatures : undefined;
  const logs = new Set<
    ReturnType<typeof import("@pane-system/output").createOutput>
  >();
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
    ReturnType<import("@pane-system/editor").Documents["acquire"]>
  >();
  const registrations = [
    workbench.commands.register({
      id: "workspace.selectFolder",
      title: "Select folder",
      run: selectFolder,
    }),
    ...registerBasePanes({ editor, problems, workbench, client, target, log }),
    ...(editor
      ? [
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
              const content = editor.createDiff({ path: resource, ...diff });
              return { ...content, serialize: () => ({ staged }) };
            },
          }),
          headEditor!.registerHeadEditor(workbench, client),
        ]
      : []),
    ...(explorerModule
      ? [
          workbench.register({
            id: "explorer",
            title: "Files",
            create: async () => {
              explorer = await explorerModule.createWorkspaceExplorer(
                client,
                treeSettings,
                open,
                selectFolder,
              );
              return explorer;
            },
          }),
        ]
      : []),
    ...(editor && documents
      ? [
          workbench.register({
            id: "editor",
            title: "Editor",
            async create({ resource, state }) {
              if (!resource) throw new Error("Select a file.");
              const text = await client.files.read(resource);
              log("Opened " + resource);
              return editor.createEditor({
                path: resource,
                text,
                files: client.files,
                documents,
                state,
                changed: () => workbench.refresh(),
              });
            },
          }),
        ]
      : []),
    ...(sourceControl
      ? [
          sourceControl.registerSourceControl({
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
        ]
      : []),
    ...(terminal
      ? [
          workbench.register({
            id: "terminal",
            title: "Terminal",
            create: () =>
              terminal.createTerminal({ provider: client.terminal }),
          }),
        ]
      : []),
    ...(outputModule
      ? [
          workbench.register({
            id: "output",
            title: "Output",
            create() {
              const output = outputModule.createOutput();
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
            create: ({ state }) =>
              createSearch({
                files: client.files,
                state,
                open: (match, behavior) => open(match.path, behavior, match),
              }),
          }),
        ]
      : []),
  ];
  return {
    log,
    resolveModel(path: string, text: string) {
      if (!documents || !editor) throw new Error("Editor is disabled.");
      let lease = definitionLeases.get(path);
      if (!lease) {
        lease = documents.acquire(path, text, editor.languageFor(path));
        definitionLeases.set(path, lease);
      }
      return lease.model;
    },
    dispose() {
      resourceDrop.dispose();
      targetChange.dispose();
      definitionLeases.forEach((lease) => lease.dispose());
      documents?.dispose();
      registrations.forEach((r) => r.dispose());
    },
  };
}
