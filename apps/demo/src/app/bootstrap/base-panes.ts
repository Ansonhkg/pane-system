import { OPERATION } from "@pane-system/host/operations";
import { createMeasurements } from "../../features/demo";
import type { Workbench } from "@pane-system/workbench";
import type { Pane } from "@pane-system/tabs";
import type { createHostClient } from "@pane-system/host/client";
export function registerBasePanes({
  editor,
  problems,
  workbench,
  client,
  target,
  log,
}: {
  editor?: typeof import("@pane-system/editor");
  problems?: typeof import("@pane-system/output/problems");
  workbench: Workbench;
  client: ReturnType<typeof createHostClient>;
  target(): Pane;
  log(value: string): void;
}) {
  return [
    ...(editor
      ? [
          editor.registerEditorNavigation({
            async open(path, line, column) {
              const tab = await workbench.open("editor", path, target());
              tab.content.reveal?.(line, column);
            },
          }),
        ]
      : []),
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
    ...(problems
      ? [
          workbench.register({
            id: "problems",
            title: "Problems",
            create: () =>
              problems.createProblems({
                open(path, line, column) {
                  void workbench
                    .open("editor", path, target())
                    .then((tab) => tab.content.reveal?.(line, column))
                    .catch((error: unknown) => log(String(error)));
                },
              }),
          }),
        ]
      : []),
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
  ];
}
